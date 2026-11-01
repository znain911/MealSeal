import { API_BASE_URL } from "@/app/config/api";
import { getAccessToken } from "@/lib/auth-client";
import { parseJsonResponse } from "@/lib/api";

export type Voucher = {
  voucherId: string;
  recipientRef: string;
  restaurantId: string;
  mealType: string;
  quantity: number;
  issuedAt: number;
  expiresAt: number;
  status: string;
  algorithm?: string;
  keyId?: string;
  redeemedAt?: string | null;
  revokedAt?: string | null;
};

export type SignedVoucher = {
  payload: {
    version: number;
    voucherId: string;
    recipientRef: string;
    restaurantId: string;
    mealType: string;
    quantity: number;
    issuedAt: number;
    expiresAt: number;
    issuerUid: string;
  };
  signature: string;
  algorithm: string;
  keyId: string;
};

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error("Please sign in again.");
  }

  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/** `GET /vouchers` — shared by the admin dashboard and voucher history so both read the same list. */
export async function fetchVouchers(): Promise<Voucher[]> {
  const response = await fetch(`${API_BASE_URL}/vouchers`, {
    method: "GET",
    headers: await authHeaders(),
  });

  const result = await parseJsonResponse<{ vouchers?: Voucher[] }>(response);

  if (!Array.isArray(result.vouchers)) {
    throw new Error("Unable to load vouchers.");
  }

  return result.vouchers;
}

export async function fetchVoucher(voucherId: string): Promise<Voucher> {
  const response = await fetch(
    `${API_BASE_URL}/vouchers/${encodeURIComponent(voucherId)}`,
    { method: "GET", headers: await authHeaders() }
  );

  const result = await parseJsonResponse<{ voucher?: Voucher }>(response);

  if (!result.voucher) {
    throw new Error("Unable to load this voucher.");
  }

  return result.voucher;
}

export async function fetchSignedVoucher(voucherId: string): Promise<SignedVoucher> {
  const response = await fetch(
    `${API_BASE_URL}/vouchers/${encodeURIComponent(voucherId)}/signed`,
    { method: "GET", headers: await authHeaders() }
  );

  const result = await parseJsonResponse<{ signedVoucher?: SignedVoucher }>(response);

  if (!result.signedVoucher) {
    throw new Error("Unable to retrieve the signed voucher.");
  }

  return result.signedVoucher;
}

export async function revokeVoucher(voucherId: string): Promise<void> {
  const headers = await authHeaders();

  const response = await fetch(
    `${API_BASE_URL}/vouchers/${encodeURIComponent(voucherId)}/revoke`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
    }
  );

  await parseJsonResponse(response);
}

export function formatDate(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "Not available";
  return new Date(value).toLocaleDateString();
}

export function formatDateTime(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "Not available";

  const date = typeof value === "number" ? new Date(value) : new Date(value);

  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}
