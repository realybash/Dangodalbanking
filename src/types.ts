export interface ContriboSettings {
  profileName: string; // default "Bashar"
  profileInitials: string; // default "BN"
  orgName: string; // default "ContriboPay HQ"
  isLive: boolean; // default true
  dailyTargetSavings: number; // e.g. 100000000 (100M)
  profileEmail?: string;
  profilePhone?: string;
  profileRole?: string;
  profileLocation?: string;
  securityPin?: string;
  currencySymbol?: string;
  platformCommissionRate?: number; // e.g. 1.5%
  defaultSlotValue?: number; // e.g. 1000
  withdrawalHoldLimit?: number; // e.g. 50000
  minBalanceThreshold?: number; // threshold below which customer balance is highlighted in red
  profileImage?: string; // custom profile pic
  partnerBankName?: string; // e.g. "Sterling Bank", "Wema Bank", "Providus Bank"
  gatewayMode?: 'disabled' | 'monnify' | 'squad' | 'paystack' | 'flutterwave'; // Active integration setting
  gatewayApiKey?: string; // Securing key for transaction lookup
  gatewayWebhookSecret?: string; // Signature verification hash key
  smsApiKey?: string; // API key for SMS gateway provider
  smsSenderId?: string; // Custom SMS transmitter ID prefix
  smsNotificationsEnabled?: boolean; // alerts toggle
  treasuryBalance?: number;
  treasuryAccountName?: string;
  treasuryAccountNumber?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  managerId: string; // ID of the manager they report to
  initials: string;
  phoneNumber: string;
  email: string;
  status: 'active' | 'inactive';
  joinedDate: string;
  collectionsToday: number;
  role: 'Supervisor' | 'Collector' | 'Viewer';
  pinStatus: 'pending' | 'set';
  location: string;
  workingAddress?: string;
  code: string;
  accountNumber?: string; // 10-digit realistic bank NUBAN-style account number (starts with 2000000001)
  collectionsCount: number;
  totalCollectionsAmount: number;
  permissions?: string[];
  pin?: string;
  profileImage?: string; // custom profile pic
  walletBalance?: number; // wallet balance funded by Manager
}

export interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  balance: number;
  assignedStaffId: string; // staff responsible
  status: 'active' | 'inactive';
  joinedDate: string;
  approvalStatus?: 'pending' | 'approved';
  accountNumber?: string; // 10-digit realistic bank NUBAN-style account number (starts with 3000000001)
  contributionAccountNumber?: string; // starts with 4000000001
  location?: string;
  address?: string;
  contributionsCount?: number;
  profileImage?: string; // custom profile pic
  pin?: string; // 4-digit security PIN for customer gateway login
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  targetSavings?: number; // custom daily/monthly savings goals
  smsNotificationsEnabled?: boolean; // alerts toggle
  emailNotificationsEnabled?: boolean; // alerts toggle
  kycStatus?: 'unverified' | 'pending' | 'verified'; // identity verification status
  idDocumentType?: string; // e.g. NIN, BVN, Passport, National ID
  idDocumentNumber?: string; // document alphanumeric digits
  hideBalanceByDefault?: boolean; // hide savings count on entry
  themePreference?: 'teal' | 'amber' | 'rose' | 'indigo' | 'violet'; // customer personalization theme
  username?: string; // custom lowercase login name
  staffCustomerId?: string; // unique ID relative to the assigned staff member
  payoutBankName?: string; // payout bank name added by customer
  payoutAccountName?: string; // payout account name added by customer
  payoutAccountNumber?: string; // payout account number added by customer
  managerNotes?: string; // private internal notes about the customer set by manager/supervisor
}

export interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  staffId?: string; // which staff initiated
  staffName?: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  profitAmount?: number; // Profit amount paid to customer during withdrawal
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string; // ISO string
  reference: string; // e.g. CBP-129482
  withdrawalPhoto?: string; // base64 captured image of the customer
  cardPhoto?: string; // base64 card/document image
  payoutBankName?: string; // bank details designated for this payout
  payoutAccountName?: string; // account name designated for this payout
  payoutAccountNumber?: string; // account number designated for this payout
  receiptPhoto?: string; // Proof of transfer/receipt file image attached by staff/manager
}

export interface AlertLog {
  id: string;
  txId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  type: 'sms' | 'whatsapp';
  message: string;
  status: 'sent' | 'delivered' | 'pending' | 'failed' | 'queued';
  timestamp: string;
  deliveryTimestamp?: string;
  errorCode?: string;
  gatewayResponse?: string;
  retryCount?: number;
  nextRetryTime?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actionType: 'APPROVAL' | 'REJECTION' | 'SUBMISSION' | 'REGISTRATION' | 'ONBOARDING' | 'EDIT' | 'DEACTIVATION' | 'ACTIVATION' | 'CREATION' | 'PIN_RESET' | 'PIN_CHANGE' | 'BROADCAST_SENT' | 'BROADCAST_REQUEST';
  actor: string;
  title: string;
  description: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

export interface Announcement {
  id: string;
  senderId: string; // Staff ID or 'MANAGER'
  senderName: string;
  senderRole: string; // 'Manager' | 'Supervisor' | 'Collector'
  message: string;
  status: 'pending' | 'approved' | 'sent' | 'declined';
  timestamp: string;
  approvedBy?: string; // Manager Name
  approvedAt?: string;
  recipientsCount?: number;
  type: 'broadcast';
}

export interface DashboardState {
  settings: ContriboSettings;
  staff: StaffMember[];
  customers: Customer[];
  transactions: Transaction[];
  alerts?: AlertLog[];
  auditLogs?: AuditLog[];
  announcements?: Announcement[];
}
