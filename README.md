# MealSeal — Secure Digital Meal Voucher System

MealSeal is a React Native (Expo) app for issuing and redeeming secure charity meal vouchers. It uses **ECDSA P-256 with SHA-256** digital signatures, **Firebase Authentication**, and the deployed **ASP.NET Core/PostgreSQL** API.

## How MealSeal works

1. A **Charity Admin** signs in, chooses a recipient reference, restaurant, meal type, quantity, and expiry date.
2. The .NET backend creates a voucher, digitally signs its details, and saves it in PostgreSQL. The admin can display and share the voucher as a QR image.
3. **Restaurant Staff** sign in and scan the QR code. The backend checks its digital signature, expiry, assigned restaurant, and redemption status.
4. Staff review the voucher details and select **Redeem Voucher**. PostgreSQL records the atomic redemption, preventing the same voucher from being redeemed again.

## Requirements

- Node.js and npm
- Git
- iPhone or Android phone with **Expo Go**
- Firebase project with **Email/Password Authentication** enabled
- Internet access to the hosted MealSeal API

## Install on a laptop

### 1. Clone and install dependencies

```bash
git clone https://github.com/znain911/MealSeal.git
cd MealSeal
npm install
```

### 2. Configure Firebase

- Set your Firebase client configuration in `src/app/config/firebase.ts`.
- Create users in Firebase Authentication. Their UIDs must be configured as the backend's admin/staff seed values. Service-account credentials remain only on the Render backend and must never be added to this app.

### 3. Backend address

`src/app/config/api.ts` points to the deployed HTTPS API:

```typescript
export const API_BASE_URL = "https://mealseal-api.onrender.com";
```

### 4. Start the mobile app

```bash
npx expo start
```

Open **Expo Go** on your phone and scan the QR code shown in the terminal. If LAN discovery is unavailable, start Expo with `npx expo start --tunnel`.

To check the backend, open `https://mealseal-api.onrender.com/health` in your phone's browser. Render's free service can take about a minute to wake after inactivity.

## Security notes

- Never place Firebase service-account JSON, database credentials, signing private keys, or test passwords in this mobile repository.
- The signing private key stays on the backend; the app never signs vouchers itself.
- Scanning only verifies a voucher. Redemption requires a separate staff-authorized action.
- Local HTTP is for development; use HTTPS for production deployment.
