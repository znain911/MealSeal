# MealSeal — Secure Digital Meal Voucher System

MealSeal is a React Native application that creates digitally signed meal vouchers using **ECDSA P-256 and SHA-256**. It uses Firebase for authentication and Firestore storage, with a Node.js backend for secure voucher signing.

## Requirements

- Node.js and npm
- Git
- Expo Go (Android)
- Firebase project with Authentication and Firestore enabled

## 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/MealSeal.git
cd MealSeal
npm install
```

Install backend dependencies:

```bash
cd backend
npm install
```

## 2. Firebase Setup

1. Enable Email/Password Authentication and Cloud Firestore in Firebase.
2. Configure the Firebase project in `src/app/config/firebase.ts`.
3. Download the Firebase Admin SDK service account key from **Firebase Console → Project Settings → Service Accounts**.
4. Save the key as `backend/serviceAccountKey.json`.

The backend and mobile app must use the same Firebase project.

**Important:** Never upload the service account key to GitHub.

## 3. Generate Signing Keys

Inside the `backend` folder, run:

```bash
node generateKeys.js
```

This creates:

- `keys/private.pem` — used to sign vouchers.
- `keys/public.pem` — used to verify signatures.

If using an existing shared backend, use its existing keys rather than generating new ones.

## 4. Configure Backend URL

Find your computer's IPv4 address:

```powershell
ipconfig
```

Update `src/app/config/api.ts`:

```typescript
export const API_BASE_URL = "http://YOUR_COMPUTER_IP:3000";
```

Replace `YOUR_COMPUTER_IP` with your computer's actual IPv4 address.

## 5. Run the Project

**Both servers must run simultaneously.**

**Terminal 1 — Backend**

```bash
cd backend
node server.js
```

**Terminal 2 — Expo**

From the main `MealSeal` folder:

```bash
npx expo start
```

Scan the Expo QR code using Expo Go on your Android phone.

Make sure your phone and computer are connected to the same Wi-Fi network.

## 6. Test Backend Connection

Open this URL on your phone:

```text
http://YOUR_COMPUTER_IP:3000/health
```

Expected response:

```json
{
  "success": true,
  "application": "MealSeal",
  "backend": "running",
  "firebase": "connected",
  "firestore": "connected"
}
```

## Important Notes

- Keep the Node.js backend and Expo running together.
- Firebase user accounts and corresponding Firestore `users/{uid}` role documents must exist before login.
- Never upload `serviceAccountKey.json` or `keys/private.pem` to GitHub.
- The private signing key must remain on the backend.
- The current application supports voucher creation, digital signing, and QR generation. Restaurant scanning and redemption are still under development.
- Local HTTP is for development only; production use requires HTTPS.
