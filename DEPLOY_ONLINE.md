# Deploy Online With Firebase (Any Phone)

This project can run online across devices after:

1. Frontend hosting (Vercel).
2. Shared customer storage (Firebase Firestore).
3. OTP email delivery (Resend).

## 1) Firebase Setup

1. Create a Firebase project in console.
2. Enable Firestore Database (production or test mode).
3. Create collection: `customer_accounts`.
4. From project settings, copy web app config values.

## 2) Environment Variables

Create `.env` from `.env.example`:

```bash
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
```

Without these vars, the app falls back to localStorage (single device only).

## 3) Resend Setup (OTP by Email)

1. Create account at Resend and verify a sender domain (or use test sender for initial checks).
2. Create API key in Resend dashboard.
3. Add server variables in Vercel project:

```bash
RESEND_API_KEY=YOUR_RESEND_API_KEY
OTP_FROM_EMAIL=Pluto Store <no-reply@yourdomain.com>
```

## 4) Firestore Rules (Starter)

Use temporary starter rules during initial setup:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /customer_accounts/{document=**} {
      allow read, write: if true;
    }
  }
}
```

After testing, tighten these rules for security.

## 5) Local Test

```bash
npm install
npm run dev
```

Open two different devices/browsers and verify customer login/accounts sync.

## 6) Deploy to Vercel

1. Push repo to GitHub.
2. Import project in Vercel.
3. Build settings:
   - Framework: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add these variables in Vercel:
   - `VITE_FIREBASE_*`
   - `RESEND_API_KEY`
   - `OTP_FROM_EMAIL`
5. Deploy.

After deployment, open your Vercel URL from any phone.

## Current Scope

In this migration, customer accounts/auth flow are cloud-backed.
Other modules still use localStorage and can be migrated next.
