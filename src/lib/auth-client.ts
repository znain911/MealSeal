import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_BASE_URL } from "@/app/config/api";

const TOKEN_KEY = "mealseal_access_token";
const USER_KEY = "mealseal_user";

export type AuthUser = {
  email: string;
  role: "CHARITY_ADMIN" | "RESTAURANT_STAFF" | string;
  restaurantId: string | null;
};

let cachedToken: string | null | undefined;
let cachedUser: AuthUser | null | undefined;

export class AuthError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

/** Sign in against MealSeal's own backend and cache the access token + profile on-device. */
export async function signIn(email: string, password: string): Promise<AuthUser> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new AuthError(
      "NETWORK_ERROR",
      "Cannot connect to the MealSeal API. Please try again shortly."
    );
  }

  const responseText = await response.text();
  let result: any = {};

  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new AuthError(
      "INVALID_RESPONSE",
      `Backend returned an invalid response (HTTP ${response.status}).`
    );
  }

  if (!response.ok || !result.success || !result.accessToken) {
    throw new AuthError(
      result.code || "LOGIN_FAILED",
      result.message || "That email and password don't match — please try again."
    );
  }

  const user: AuthUser = {
    email: result.email ?? email,
    role: result.role,
    restaurantId: result.restaurantId ?? null,
  };

  cachedToken = result.accessToken;
  cachedUser = user;

  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, result.accessToken),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
  ]);

  return user;
}

export async function signOut(): Promise<void> {
  cachedToken = null;
  cachedUser = null;
  await Promise.all([AsyncStorage.removeItem(TOKEN_KEY), AsyncStorage.removeItem(USER_KEY)]);
}

export async function getAccessToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  return cachedToken;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (cachedUser !== undefined) return cachedUser;

  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) {
    cachedUser = null;
    return null;
  }

  try {
    cachedUser = JSON.parse(raw) as AuthUser;
  } catch {
    cachedUser = null;
  }

  return cachedUser;
}
