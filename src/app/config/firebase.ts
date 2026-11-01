
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
    getAuth,
    initializeAuth,
} from "firebase/auth";

// Firebase 13 React Native persistence export
// @ts-expect-error React Native export is not exposed in the default TypeScript declarations
import { getReactNativePersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBadhaWQ5XP96b0VIaOCwjvb4sXHApNGDM",
  authDomain: "mealseal-c49a9.firebaseapp.com",
  projectId: "mealseal-c49a9",
  storageBucket: "mealseal-c49a9.firebasestorage.app",
  messagingSenderId: "457280059917",
  appId: "1:457280059917:web:db5621db6ba5f3b1d93344",
};

const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

let authInstance;

try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error: any) {
  if (error.code === "auth/already-initialized") {
    authInstance = getAuth(app);
  } else {
    throw error;
  }
}

export const auth = authInstance;

export default app;
