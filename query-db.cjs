const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf-8'));
initializeApp({ projectId: config.projectId });
const db = getFirestore(config.firestoreDatabaseId);

db.collection('settings').doc('global').get().then(doc => {
  console.log(doc.data());
}).catch(console.error);
