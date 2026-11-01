import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * There's no staff-facing history endpoint on the backend, so "recently redeemed" and
 * "meals served today" are tracked on-device only, for this café's own staff sign-in.
 * They reset if the app is reinstalled or storage is cleared.
 */
const KEY = "mealseal_staff_redemptions";
const MAX_ENTRIES = 20;

export type RedemptionEntry = {
  voucherId: string;
  mealType: string;
  quantity: number;
  recipientRef: string;
  redeemedAt: number;
};

export async function recordRedemption(entry: RedemptionEntry): Promise<void> {
  try {
    const existing = await readRedemptions();
    const next = [entry, ...existing].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Non-fatal — the dashboard just won't show this entry.
  }
}

export async function readRedemptions(): Promise<RedemptionEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function mealsServedToday(entries: RedemptionEntry[]): number {
  const now = new Date();

  return entries
    .filter((entry) => {
      const date = new Date(entry.redeemedAt);
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    })
    .reduce((sum, entry) => sum + entry.quantity, 0);
}
