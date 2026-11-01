# MealSeal — Secure Digital Meal Voucher System

MealSeal is a React Native (Expo) app for issuing and redeeming secure charity meal vouchers. It uses **ECDSA P-256 with SHA-256** digital signatures, **Firebase Authentication**, **Cloud Firestore**, and a **Node.js/Express** backend.

## How MealSeal works

1. A **Charity Admin** signs in, chooses a recipient reference, restaurant, meal type, quantity, and expiry date.
2. The backend creates a voucher, digitally signs its details, and saves it in Firestore. The admin can display and share the voucher as a QR image.
3. **Restaurant Staff** sign in and scan the QR code. The backend checks its digital signature, expiry, assigned restaurant, and redemption status.
4. Staff review the voucher details and select **Redeem Voucher**. Firestore records the redemption, preventing the same voucher from being redeemed again.

## Requirements

- Node.js and npm
- Git
- Android phone with **Expo Go**
- Firebase project with **Email/Password Authentication** and **Cloud Firestore** enabled
- Laptop and phone on the same Wi-Fi network

## Install on a laptop

### 1. Clone and install dependencies

```bash
git clone https://github.com/znain911/MealSeal.git
cd MealSeal
npm install
cd backend
npm install
```

### 2. Configure Firebase

- Set your Firebase client configuration in `src/app/config/firebase.ts`.
- In Firebase Console, create a service account key under **Project Settings → Service Accounts** and save it as `backend/serviceAccountKey.json`.
- Create users in Firebase Authentication and matching Firestore documents at `users/{uid}`. Set `active: true` and a role of `CHARITY_ADMIN` or `RESTAURANT_STAFF`. Staff accounts also need a matching `restaurantId` (for example, `CAFE-01`).

### 3. Configure signing keys

From the `backend` folder, run:

```bash
node generateKeys.js
```

This creates `keys/private.pem` for signing and `keys/public.pem` for verification. **If connecting to an existing backend, retain its original keys** so existing vouchers remain verifiable.

### 4. Set the backend address

On Windows, find your laptop's IPv4 address:

```powershell
ipconfig
```

Edit `src/app/config/api.ts`:

```typescript
export const API_BASE_URL = "http://YOUR_LAPTOP_IP:3000";
```

### 5. Start both servers

Open two terminals from the project folder.

**Terminal 1 — Backend:**

```bash
cd backend
node server.js
```

**Terminal 2 — Mobile app:**

```bash
npx expo start
```

Open **Expo Go** on your Android phone and scan the QR code shown in the terminal. Ensure the phone and laptop are on the same Wi-Fi network.

To check the backend, open `http://YOUR_LAPTOP_IP:3000/health` in your phone's browser.

## Security notes

- Never commit `backend/serviceAccountKey.json`, `backend/keys/private.pem`, or `.env` files to GitHub.
- The signing private key stays on the backend; the app never signs vouchers itself.
- Scanning only verifies a voucher. Redemption requires a separate staff-authorized action.
- Local HTTP is for development; use HTTPS for production deployment.
