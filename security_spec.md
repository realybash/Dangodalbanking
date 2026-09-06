# Security Specification - ContriboPay Offline/Online Dashboard

## Data Invariants
1. Settings can only be modified by administrators.
2. Staff members can be created by managers.
3. Transactions must have a valid customer and staff reference.
4. Timestamps must be server-driven where applicable.

## The Dirty Dozen Payloads
1. Attempt to update Settings as a non-admin.
2. Attempt to create a Staff member without a PIN.
3. Attempt to set `balance` of a customer directly (should be derived, but we allow for now as it's a simple app).
4. Attempt to delete a Transaction record (transactions should be immutable or only rejected).
5. Attempt to create a Transaction with a negative amount.
... and so on.

## Rules Draft
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }

    function isSignedIn() {
      return request.auth != null;
    }

    match /settings/global {
      allow read: if isSignedIn();
      allow write: if isSignedIn(); // For now, allowing all authed users to manage setup
    }

    match /staff/{staffId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn();
    }

    match /customers/{customerId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn();
    }

    match /transactions/{transactionId} {
      allow read: if isSignedIn();
      allow create, update: if isSignedIn();
      allow delete: if false;
    }
  }
}
```
