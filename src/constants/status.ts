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
    bg: "#E3F1E7",
    fg: "#1D6B47",
    icon: "check",
    example: "Voucher verified",
  },
  redeemed: {
    key: "redeemed",
    name: "Redeemed / Used",
    bg: "#ECEBF6",
    fg: "#4A4A8A",
    icon: "checks",
    example: "Meal redeemed",
  },
  caution: {
    key: "caution",
    name: "Caution / Pending",
    bg: "#FCEFD6",
    fg: "#8A5300",
    icon: "clock",
    example: "Expiring soon",
  },
  stop: {
    key: "stop",
    name: "Stop / Invalid",
    bg: "#FBE7E3",
    fg: "#A3312A",
    icon: "stop",
    example: "No longer valid",
  },
  info: {
    key: "info",
    name: "Info / Neutral",
    bg: "#E6EFF5",
    fg: "#2F5A7A",
    icon: "info",
    example: "Connection problem",
  },
};

/** Backend voucher status (+ a computed "expiring soon" window) -> status token + short label. */
export function voucherStatusToken(
  status: string,
  expiresAt: number
): { token: StatusToken; label: string } {
  const normalized = status?.toUpperCase();
  const now = Date.now();
  const soon = 1000 * 60 * 60 * 24 * 2; // 2 days

  if (normalized === "REDEEMED") {
    return { token: StatusTokens.redeemed, label: "Redeemed" };
  }

  if (normalized === "REVOKED") {
    return { token: StatusTokens.stop, label: "Revoked" };
  }

  if (normalized === "EXPIRED" || (normalized === "ACTIVE" && expiresAt <= now)) {
    return { token: StatusTokens.stop, label: "Expired" };
  }

  if (normalized === "ACTIVE" && expiresAt - now <= soon) {
    return { token: StatusTokens.caution, label: "Expiring soon" };
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
