# Deployment Guide (Hackathon Demo)

Follow these steps to deploy the IceBreaker application to Firebase Hosting.

## 1. Prerequisites
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase Project created in the console.
- `.env.local` populated with project credentials (see `.env.example`).

## 2. Environment Variables
The application uses `NEXT_PUBLIC_` variables which must be available at **build time**.
Before deploying, ensure your local environment or CI/CD pipeline has these set.

## 3. Build & Deploy
Run the following commands:
```bash
npm run build
firebase deploy --only hosting,firestore
```

## 4. Enable Firestore TTL (Critical for Demo)
To prevent the database from filling up during the demo, enable the Time-To-Live (TTL) policy:
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Firestore Database** > **Indexes** > **TTL**.
3. Click **Create Policy**.
4. Collection Group: `rooms`
5. Field: `expiresAt`
6. Click **Create**.
7. Repeat for Collection Group: `participants` with Field: `expiresAt`.

*Note: Firestore TTL can take up to 72 hours to start deleting, but our frontend already filters expired items for immediate effect.*

## 5. Security Rules
The `firestore.rules` are already configured for basic hackathon use. They allow guest joining while preventing unauthorized modification of room creation metadata.
