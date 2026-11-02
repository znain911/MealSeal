import { IconName } from "./icons";

export type StatusKey = "verified" | "redeemed" | "caution" | "stop" | "info";

export type StatusToken = {
  key: StatusKey;
  name: string;
  bg: string;
  fg: string;
  icon: IconName;
  example: string;
};

/** The five statuses in the product — one color pair per meaning, never color alone. */
export const StatusTokens: Record<StatusKey, StatusToken> = {
  verified: {
    key: "verified",
    name: "Verified / Valid",
    bg: "#FFE29A",
    fg: "#5A3400",
    icon: "check",
    example: "Voucher verified",
  },
  redeemed: {
    key: "redeemed",
    name: "Redeemed / Used",
    bg: "#3A2212",
    fg: "#FFF3DC",
    icon: "checks",
    example: "Meal redeemed",
  },
  caution: {
    key: "caution",
    name: "Caution / Pending",
    bg: "#FFE29A",
    fg: "#6B3A00",
    icon: "clock",
    example: "Expiring soon",
  },
  stop: {
    key: "stop",
    name: "Stop / Invalid",
    bg: "#FAD9CF",
    fg: "#7F1D1D",
    icon: "stop",
    example: "No longer valid",
  },
  info: {
    key: "info",
    name: "Info / Neutral",
    bg: "#FFF1DD",
    fg: "#6B4A33",
    icon: "info",
    example: "Connection problem",
  },
};

// Cafés and charities using MealSeal today are NZ-based — "Expiring soon" is judged against the
// NZ calendar day and clock, not the device's own timezone or a raw UTC offset.
const BUSINESS_TIME_ZONE = "Pacific/Auckland";
const SOON_WINDOW_MS = 1000 * 60 * 60 * 24 * 2; // 2 days, for vouchers expiring on a later day
const SAME_DAY_CAUTION_HOUR = 16; // a voucher expiring today only turns "Expiring soon" from 4pm

function isSameLocalDay(aMs: number, bMs: number, timeZone: string): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt.format(new Date(aMs)) === fmt.format(new Date(bMs));
}

function localHour(ms: number, timeZone: string): number {
  return Number(new Intl.DateTimeFormat("en-NZ", { timeZone, hour: "numeric", hourCycle: "h23" }).format(new Date(ms)));
}

/** Backend voucher status (+ a computed "expiring soon" window) -> status token + short label. */
export function voucherStatusToken(
  status: string,
  expiresAt: number
): { token: StatusToken; label: string } {
  const normalized = status?.toUpperCase();
  const now = Date.now();

  if (normalized === "REDEEMED") {
    return { token: StatusTokens.redeemed, label: "Redeemed" };
  }

  if (normalized === "REVOKED") {
    return { token: StatusTokens.stop, label: "Revoked" };
  }

  if (normalized === "EXPIRED" || (normalized === "ACTIVE" && expiresAt <= now)) {
    return { token: StatusTokens.stop, label: "Expired" };
  }

  if (normalized === "ACTIVE") {
    // A voucher that expires later today is freshly issued and still fine for most of the day —
    // only flag it once there's a real chance of missing it (from 4pm, NZ time). A voucher expiring
    // on a later calendar day instead uses the usual "within 2 days" early warning.
    const expiringToday = isSameLocalDay(expiresAt, now, BUSINESS_TIME_ZONE);
    const isSoon = expiringToday
      ? localHour(now, BUSINESS_TIME_ZONE) >= SAME_DAY_CAUTION_HOUR
      : expiresAt - now <= SOON_WINDOW_MS;

    if (isSoon) {
      return { token: StatusTokens.caution, label: "Expiring soon" };
    }
  }

  return { token: StatusTokens.verified, label: "Valid" };
}

/** Scan/verify/redeem rejection codes from the backend -> status token, title, message, explanation. */
export type RejectionDetail = {
  token: StatusToken;
  icon?: IconName;
  title: string;
  message: string;
  explanation: string;
};

export const RejectionDetails: Record<string, RejectionDetail> = {
  INVALID_SIGNATURE: {
    token: StatusTokens.stop,
    icon: "alert",
    title: "We can't verify this code",
    message: "The digital signature is not valid.",
    explanation:
      "It may have been changed, or it isn't a MealSeal voucher. Please don't hand over a meal for it.",
  },
  BAD_SIGNATURE: {
    token: StatusTokens.stop,
    icon: "alert",
    title: "We can't verify this code",
    message: "The digital signature is not valid.",
    explanation:
      "It may have been changed, or it isn't a MealSeal voucher. Please don't hand over a meal for it.",
  },
  WRONG_RESTAURANT: {
    token: StatusTokens.caution,
    icon: "pin",
    title: "This voucher is for another café",
    message: "This voucher belongs to a different café.",
    explanation: "The assigned café is checked before redemption is offered.",
  },
  ALREADY_REDEEMED: {
    token: StatusTokens.redeemed,
    icon: "checks",
    title: "This voucher has already been used",
    message: "Each voucher works once.",
    explanation: "Please don't hand over a meal for this code.",
  },
  REDEEMED: {
    token: StatusTokens.redeemed,
    icon: "checks",
    title: "This voucher has already been used",
    message: "Each voucher works once.",
    explanation: "Please don't hand over a meal for this code.",
  },
  EXPIRED: {
    token: StatusTokens.stop,
    title: "This voucher can't be used",
    message: "This voucher has expired.",
    explanation: "The person can ask their charity for a new one.",
  },
  REVOKED: {
    token: StatusTokens.stop,
    title: "This voucher can't be used",
    message: "This voucher has been cancelled by the charity.",
    explanation: "The person can ask their charity for a new one.",
  },
  INVALID_QR: {
    token: StatusTokens.stop,
    icon: "alert",
    title: "We can't verify this code",
    message: "This isn't a valid MealSeal voucher.",
    explanation: "Please don't hand over a meal for it.",
  },
  INVALID_VOUCHER: {
    token: StatusTokens.stop,
    icon: "alert",
    title: "We can't verify this code",
    message: "The voucher data is invalid.",
    explanation: "Please don't hand over a meal for it.",
  },
  UNAUTHORIZED: {
    token: StatusTokens.stop,
    title: "Unauthorized",
    message: "You are not authorized to verify this voucher.",
    explanation: "A valid café staff account is required.",
  },
  FORBIDDEN: {
    token: StatusTokens.stop,
    title: "Access denied",
    message: "Your account does not have permission.",
    explanation: "Please contact your MealSeal coordinator.",
  },
  NOT_FOUND: {
    token: StatusTokens.stop,
    title: "Voucher not found",
    message: "This voucher was not found.",
    explanation: "The voucher does not exist in the MealSeal database.",
  },
};

export const NetworkRejection: RejectionDetail = {
  token: StatusTokens.info,
  icon: "wifi",
  title: "We couldn't check this voucher",
  message: "Connection problem — please try again in a moment.",
  explanation: "Nothing has been redeemed.",
};
