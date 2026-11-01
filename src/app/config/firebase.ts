// Firebase Authentication was removed in favour of MealSeal's own backend-issued access tokens.
// See src/lib/auth-client.ts for sign-in/sign-out and src/lib/vouchers.ts for authenticated requests.
//
// This file is kept (empty) only because this environment could not delete it — safe to
// remove by hand (`rm src/app/config/firebase.ts`) once nothing imports it.
export {};
