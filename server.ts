import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import fs from "fs";

// Initialize Firebase Admin lazily
let db: Firestore | null = null;
function getDb() {
  if (!db) {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      admin.initializeApp({
        projectId: config.projectId,
      });
      db = getFirestore();
      // Use the specific database ID if provided
      if (config.firestoreDatabaseId) {
        db = getFirestore(config.firestoreDatabaseId);
      }
    } else {
      admin.initializeApp();
      db = getFirestore();
    }
  }
  return db;
}

interface PendingCredit {
  id: string;
  accountNumber: string;
  amount: number;
  bank: string;
  timestamp: string;
  reference: string;
}

const app = express();
const PORT = 3000;

// Middleware for parsing JSON and urlencoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Server-authoritative transit buffer for incoming bank transfers
// Front-end background-polling reads from and purges this buffer.
let pendingCredits: PendingCredit[] = [];

// Helper for robust API calls
async function fetchWithRetry(url: string, options: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        // Client errors (except rate limits) shouldn't be retried
        return response;
      }
    } catch (err) {
      if (i === maxRetries - 1) throw err;
    }
    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
  }
  throw new Error("Max retries reached");
}

// API health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// POST endpoint to send SMS via Termii Gateway
app.post("/api/send-sms", async (req, res) => {
  const { to, message, apiKey, senderId } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: "Phone number (to) and message are required." });
  }

  let TERMII_API_KEY = apiKey || process.env.TERMII_API_KEY?.trim();
  let TERMII_SENDER_ID = senderId || process.env.TERMII_SENDER_ID?.trim() || "TERMII";

  // If not in env, check Firestore
  if (!TERMII_API_KEY) {
    try {
      const firestore = getDb();
      const settingsDoc = await firestore.collection("settings").doc("global").get();
      if (settingsDoc.exists) {
        const data = settingsDoc.data();
        if (data?.smsApiKey) TERMII_API_KEY = (data.smsApiKey as string).trim();
        if (data?.smsSenderId) TERMII_SENDER_ID = (data.smsSenderId as string).trim();
      }
    } catch (e) {
      console.error("[SMS CONFIG ERROR] Failed to fetch settings from Firestore:", e);
    }
  }

  if (!TERMII_API_KEY) {
    console.error("[SMS ERROR] TERMII_API_KEY is not configured.");
    return res.status(500).json({ error: "SMS Gateway not configured. Please set API Key in Settings." });
  }

  // Clean the phone number (remove +, spaces, ensure it has 234 prefix)
  let cleanTo = to.replace(/\D/g, "");
  if (cleanTo.startsWith("0")) {
    cleanTo = "234" + cleanTo.substring(1);
  } else if (!cleanTo.startsWith("234")) {
    cleanTo = "234" + cleanTo;
  }

  console.log(`[SMS] Attempting to send message to ${cleanTo} via Termii...`);

  try {
    const response = await fetchWithRetry("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: cleanTo,
        from: TERMII_SENDER_ID,
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: TERMII_API_KEY,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`[SMS SUCCESS] Message sent to ${cleanTo}:`, data);
      res.json({ status: "success", data });
    } else {
      console.error(`[SMS FAILED] Gateway responded with error:`, data);
      res.status(response.status).json({ status: "error", error: data });
    }
  } catch (error: any) {
    console.error(`[SMS EXCEPTION] Failed to connect to Termii:`, error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// POST endpoint for bulk broadcast
app.post("/api/broadcast-sms", async (req, res) => {
  const { recipients, message, apiKey, senderId } = req.body;

  if (!recipients || !Array.isArray(recipients) || !message) {
    return res.status(400).json({ error: "Recipients array and message are required." });
  }

  let TERMII_API_KEY = apiKey || process.env.TERMII_API_KEY?.trim();
  let TERMII_SENDER_ID = senderId || process.env.TERMII_SENDER_ID?.trim() || "TERMII";

  if (!TERMII_API_KEY) {
    try {
      const firestore = getDb();
      const settingsDoc = await firestore.collection("settings").doc("global").get();
      if (settingsDoc.exists) {
        const data = settingsDoc.data();
        if (data?.smsApiKey) TERMII_API_KEY = (data.smsApiKey as string).trim();
        if (data?.smsSenderId) TERMII_SENDER_ID = (data.smsSenderId as string).trim();
      }
    } catch (e) {
      console.error("[SMS CONFIG ERROR] Failed to fetch settings from Firestore:", e);
    }
  }

  if (!TERMII_API_KEY) {
    return res.status(500).json({ error: "SMS Gateway not configured." });
  }

  console.log(`[BROADCAST] Starting dispatch to ${recipients.length} recipients...`);

  const results = { success: 0, failed: 0 };

  // Loop through recipients
  // Note: For production with thousands of users, this should be a background job
  for (const to of recipients) {
    try {
      let cleanTo = to.replace(/\D/g, "");
      if (cleanTo.startsWith("0")) {
        cleanTo = "234" + cleanTo.substring(1);
      } else if (!cleanTo.startsWith("234")) {
        cleanTo = "234" + cleanTo;
      }

      const response = await fetchWithRetry("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: cleanTo,
          from: TERMII_SENDER_ID,
          sms: message,
          type: "plain",
          channel: "generic",
          api_key: TERMII_API_KEY,
        }),
      });

      if (response.ok) {
        results.success++;
      } else {
        results.failed++;
      }
    } catch (err) {
      results.failed++;
    }
    // Small delay to prevent hitting rate limits too hard
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`[BROADCAST COMPLETE] Success: ${results.success}, Failed: ${results.failed}`);
  res.json({ status: "success", results });
});

// GET endpoint to poll for incoming credits
app.get("/api/pending-credits", (req, res) => {
  res.json({ credits: pendingCredits });
});

// POST endpoint to clear processed credits once merged with frontend database/state
app.post("/api/pending-credits/clear", (req, res) => {
  const { ids } = req.body;
  if (Array.isArray(ids)) {
    pendingCredits = pendingCredits.filter(c => !ids.includes(c.id));
    console.log(`[LEDGER] Cleared processed credits:`, ids);
  }
  res.json({ status: "success" });
});

// POST Webhook endpoint supporting Nigeria's major payment gateways: Squad, Monnify, Paystack, Flutterwave
app.post("/api/webhook/bank-transfer", (req, res) => {
  const payload = req.body;
  console.log(`[WEBHOOK] Incoming alert payload registered:`, JSON.stringify(payload, null, 2));

  let accountNumber = "";
  let amount = 0;
  let bank = "Unknown Bank";
  let reference = "";

  try {
    // 1. Detect and parse Squad Co (by GTBank) webhook
    // Docs: Squad sends bank_transfer event notification body
    if (payload.event === "charge.success" && payload.data && payload.data.virtual_account_number) {
      accountNumber = String(payload.data.virtual_account_number).trim();
      amount = Number(payload.data.amount) / 100; // Squad values are in kobo, convert to naira
      bank = payload.data.sender_bank || "Squad GTBank";
      reference = payload.data.transaction_reference || `SQD-${Date.now()}`;
    }
    // 2. Detect and parse Monnify webhook
    // Docs: Monnify sends notification with transactionReference/eventData
    else if (payload.eventType === "SUCCESSFUL_TRANSACTION" && payload.eventData) {
      accountNumber = String(payload.eventData.destinationAccountNumber || "").trim();
      amount = Number(payload.eventData.amountPaid);
      bank = payload.eventData.paymentSourceInformation?.[0]?.bankName || "Monnify Virtual Source";
      reference = payload.eventData.transactionReference || `MNF-${Date.now()}`;
    }
    // 3. Detect and parse Paystack hook
    // Docs: charge.success for dedicated virtual accounts
    else if (payload.event === "charge.success" && payload.data && payload.data.dedicated_account) {
      accountNumber = String(payload.data.dedicated_account.account_number || "").trim();
      amount = Number(payload.data.amount) / 100; // Paystack sends kobo
      bank = payload.data.dedicated_account.bank?.name || "Paystack settlement bank";
      reference = payload.data.reference || `PST-${Date.now()}`;
    }
    // 4. Detect and parse Flutterwave webhook
    // Docs: flutterwave sends charge successful trigger
    else if (payload.event === "charge.completed" && payload.data && payload.data.account_number) {
      accountNumber = String(payload.data.account_number).trim();
      amount = Number(payload.data.amount);
      bank = payload.data.bank_name || "Flutterwave Transfer";
      reference = payload.data.tx_ref || `FLW-${Date.now()}`;
    }
    // 5. Test suite / Webhook Simulator fallback
    else if (payload.event === "transfer.success" && payload.virtual_account_number) {
      accountNumber = String(payload.virtual_account_number).trim();
      amount = Number(payload.amount);
      bank = payload.sender_bank || "Simulated Bank";
      reference = payload.transaction_reference || `SIM-${Date.now()}`;
    }
    else {
      // Fallback fallback generic parsing
      accountNumber = String(payload.virtual_account_name || payload.accountNumber || payload.destination_account || "").trim();
      amount = Number(payload.amount || payload.amountPaid || 0);
      bank = payload.bank || payload.senderBank || "Direct Transfer Gateway";
      reference = payload.reference || payload.txRef || payload.transactionReference || `GEN-${Date.now()}`;
    }

    // Clean account number of formatting spaces/hyphens
    accountNumber = accountNumber.replace(/\s+/g, "");

    if (!accountNumber || amount <= 0) {
      console.warn(`[WEBHOOK WARNING] Failed to resolve target account or non-zero amount in payload.`);
      return res.status(400).json({ 
        status: "error", 
        message: "Unrecognized request structure or zero transfer threshold." 
      });
    }

    // Push credit notice to poll stack
    const newCredit: PendingCredit = {
      id: `cr-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      accountNumber,
      amount,
      bank,
      timestamp: new Date().toISOString(),
      reference
    };

    pendingCredits.push(newCredit);
    console.log(`[LEDGER SUCCESS] Credit registered for NUBAN Account [${accountNumber}]: +₦${amount.toLocaleString()} via ${bank}. Ref: ${reference}`);

    return res.status(200).json({ 
      status: "ok", 
      message: "Webhook processed and buffered successfully",
      credit: newCredit
    });

  } catch (error: any) {
    console.error(`[WEBHOOK ERROR] Failed to process webhook notification:`, error);
    return res.status(500).json({ 
      status: "error", 
      message: error.message || "Internal transaction compilation error." 
    });
  }
});

async function startServer() {
  // Vite dev middleware for asset compilation and live previews
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log(`[Vite] Development middleware mounted.`);
  } else {
    // Production static handlers
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`===============================================`);
    console.log(`🚀 SERENE LEDGER METRICS ROUTER ONLINE`);
    console.log(`🔗 Webhook Port: ${PORT} (Ingress Route ready)`);
    console.log(`🛡️ Live endpoint: http://0.0.0.0:${PORT}`);
    console.log(`===============================================`);
  });
}

startServer();
