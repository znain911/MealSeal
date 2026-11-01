import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StatusChip } from "@/components/ui/status-chip";
import { cafeName } from "@/constants/cafes";
import { IconName } from "@/constants/icons";
import { NetworkRejection, RejectionDetail, RejectionDetails, StatusTokens } from "@/constants/status";
import { Colors, Radius, Spacing, Type } from "@/constants/theme";
import { getAccessToken, getCurrentUser } from "@/lib/auth-client";
import { recordRedemption } from "@/lib/staff-activity";

import { API_BASE_URL } from "./config/api";

type ScreenState = "SCANNING" | "VERIFYING" | "VERIFIED" | "REDEEMING" | "REDEEMED" | "ERROR";

type SignedVoucher = {
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

type VoucherResponse = {
  success?: boolean;
  valid?: boolean;
  verified?: boolean;
  status?: string;
  code?: string;
  error?: string;
  message?: string;
};

class VoucherApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 0) {
    super(message);
    this.name = "VoucherApiError";
    this.code = code;
    this.status = status;
  }
}

function resolveRejection(error: unknown): RejectionDetail {
  if (error instanceof VoucherApiError) {
    let code = error.code.toUpperCase();

    if (!RejectionDetails[code]) {
      if (error.status === 401) code = "UNAUTHORIZED";
      else if (error.status === 403) code = "FORBIDDEN";
      else if (error.status === 409 && /redeem|used/i.test(error.message)) code = "ALREADY_REDEEMED";
    }

    const detail = RejectionDetails[code];

    return (
      detail ?? {
        token: StatusTokens.stop,
        title: "We couldn't verify this voucher",
        message: error.message || "The voucher could not be verified.",
        explanation: "Please don't hand over a meal for this code.",
      }
    );
  }

  return NetworkRejection;
}

function parseQRCode(data: string): SignedVoucher {
  let parsed: any;

  try {
    parsed = JSON.parse(data);
  } catch {
    throw new VoucherApiError("INVALID_QR", "The scanned QR code is not valid JSON.");
  }

  const voucher = parsed?.signedVoucher ?? parsed;

  if (
    !voucher ||
    typeof voucher !== "object" ||
    !voucher.payload ||
    typeof voucher.payload !== "object" ||
    typeof voucher.signature !== "string" ||
    !voucher.signature ||
    typeof voucher.algorithm !== "string" ||
    typeof voucher.keyId !== "string"
  ) {
    throw new VoucherApiError(
      "INVALID_QR",
      "The QR code does not contain a complete signed MealSeal voucher."
    );
  }

  return voucher as SignedVoucher;
}

function formatDate(value?: number): string {
  if (typeof value !== "number") return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function SuccessPop() {
  const [scale] = useState(() => new Animated.Value(0.8));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;

      if (reduced) {
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }).start();
        scale.setValue(1);
        return;
      }

      opacity.setValue(1);
      Animated.spring(scale, {
        toValue: 1,
        damping: 9,
        stiffness: 160,
        mass: 0.7,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      cancelled = true;
    };
  }, [opacity, scale]);

  return (
    <Animated.View style={[styles.resultIconCircle, { backgroundColor: StatusTokens.redeemed.bg, opacity, transform: [{ scale }] }]}>
      <Icon name="checks" size={48} color={StatusTokens.redeemed.fg} />
    </Animated.View>
  );
}

export default function ScanVoucherScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();

  const [screenState, setScreenState] = useState<ScreenState>("SCANNING");
  const [signedVoucher, setSignedVoucher] = useState<SignedVoucher | null>(null);
  const [rejection, setRejection] = useState<RejectionDetail | null>(null);
  const [redeemedAt, setRedeemedAt] = useState<number | null>(null);
  const [manualSheetVisible, setManualSheetVisible] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [staffEmail, setStaffEmail] = useState<string | null>(null);

  const scanLocked = useRef(false);

  useEffect(() => {
    void getCurrentUser().then((user) => setStaffEmail(user?.email ?? null));
  }, []);

  async function postVoucher(endpoint: string, voucher: SignedVoucher): Promise<VoucherResponse> {
    const token = await getAccessToken();
    if (!token) throw new VoucherApiError("UNAUTHORIZED", "Please sign in as café staff.");

    let response: Response;

    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ signedVoucher: voucher }),
      });
    } catch {
      throw new Error("Cannot connect to the MealSeal backend. Check your connection.");
    }

    const rawText = await response.text();
    let result: VoucherResponse = {};

    try {
      result = JSON.parse(rawText);
    } catch {
      throw new VoucherApiError("INVALID_SERVER_RESPONSE", "The backend returned an invalid response.", response.status);
    }

    if (!response.ok || result.success === false) {
      const code =
        result.code ||
        result.error ||
        (response.status === 401 ? "UNAUTHORIZED" : response.status === 403 ? "FORBIDDEN" : `HTTP_${response.status}`);

      throw new VoucherApiError(String(code), result.message || "The backend rejected this voucher.", response.status);
    }

    return result;
  }

  async function verifyVoucher(voucher: SignedVoucher) {
    setScreenState("VERIFYING");
    setRejection(null);

    try {
      const result = await postVoucher("/vouchers/verify", voucher);

      if (result.valid !== true || result.verified !== true || result.status !== "ACTIVE") {
        throw new VoucherApiError(result.code || "VERIFICATION_FAILED", result.message || "The voucher could not be verified.");
      }

      setScreenState("VERIFIED");
    } catch (error) {
      setRejection(resolveRejection(error));
      setScreenState("ERROR");
    }
  }

  async function handleQRCodeScanned({ data }: { data: string }) {
    if (scanLocked.current) return;
    scanLocked.current = true;

    try {
      const voucher = parseQRCode(data);
      setSignedVoucher(voucher);
      await verifyVoucher(voucher);
    } catch (error) {
      setRejection(resolveRejection(error));
      setScreenState("ERROR");
    }
  }

  async function redeemVoucher() {
    if (!signedVoucher) return;
    setScreenState("REDEEMING");

    try {
      const result = await postVoucher("/vouchers/redeem", signedVoucher);

      if (result.success !== true || result.status !== "REDEEMED") {
        throw new VoucherApiError(result.code || "REDEMPTION_FAILED", result.message || "The voucher was not redeemed.");
      }

      const now = Date.now();
      setRedeemedAt(now);

      void recordRedemption({
        voucherId: signedVoucher.payload.voucherId,
        mealType: signedVoucher.payload.mealType,
        quantity: signedVoucher.payload.quantity,
        recipientRef: signedVoucher.payload.recipientRef,
        redeemedAt: now,
      });

      setScreenState("REDEEMED");
    } catch (error) {
      setRejection(resolveRejection(error));
      setScreenState("ERROR");
    }
  }

  function scanAnotherVoucher() {
    scanLocked.current = false;
    setSignedVoucher(null);
    setRejection(null);
    setRedeemedAt(null);
    setScreenState("SCANNING");
  }

  function submitManualEntry() {
    const raw = manualInput.trim();
    if (!raw) return;

    setManualSheetVisible(false);
    setManualInput("");
    scanLocked.current = true;

    (async () => {
      try {
        const voucher = parseQRCode(raw);
        setSignedVoucher(voucher);
        await verifyVoucher(voucher);
      } catch (error) {
        setRejection(resolveRejection(error));
        setScreenState("ERROR");
      }
    })();
  }

  if (!permission) {
    return <SafeAreaView style={styles.darkContainer} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionCenter}>
          <Text style={styles.heading}>Camera access needed</Text>
          <Text style={styles.bodyText}>MealSeal needs camera access to scan meal vouchers.</Text>
          <Button label="Allow camera" onPress={requestPermission} />
          <Button label="Back" variant="ghost" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  if (screenState === "SCANNING") {
    return (
      <SafeAreaView style={styles.darkContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleQRCodeScanned}
        />

        <View style={styles.scanTopBar}>
          <TouchableOpacity style={styles.roundButton} onPress={() => router.back()}>
            <Icon name="close" size={22} color="#F4EFE6" />
          </TouchableOpacity>
          <Text style={styles.scanTitle}>Scan voucher</Text>
          <View style={styles.roundButton} />
        </View>

        <View style={styles.frameWrap}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.framePill}>
            <Text style={styles.framePillText}>Hold the QR code inside the frame</Text>
          </View>
        </View>

        <View style={styles.scanBottomBar}>
          <View style={styles.cafeRow}>
            <Icon name="building" size={18} color="#B5AC9F" />
            <Text style={styles.cafeRowText}>
              Checking vouchers for {staffEmail ?? "your café"}
            </Text>
          </View>
          <Button
            label="Enter code manually"
            variant="secondary"
            style={styles.manualButton}
            onPress={() => setManualSheetVisible(true)}
          />
        </View>

        <BottomSheet visible={manualSheetVisible} onClose={() => setManualSheetVisible(false)}>
          <Text style={styles.sheetTitle}>Paste voucher data</Text>
          <Text style={styles.sheetBody}>
            For a damaged screen — paste the voucher’s signed data exactly as shared.
          </Text>
          <TextInput
            style={styles.manualInputBox}
            value={manualInput}
            onChangeText={setManualInput}
            placeholder="Paste the voucher JSON here"
            placeholderTextColor={Colors.light.inkTertiary}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button label="Check voucher" onPress={submitManualEntry} disabled={!manualInput.trim()} />
        </BottomSheet>
      </SafeAreaView>
    );
  }

  const isBusy = screenState === "VERIFYING" || screenState === "REDEEMING";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.roundButtonLight} onPress={() => router.back()}>
          <Icon name="close" size={22} color={Colors.light.ink} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Voucher check</Text>
      </View>

      <View style={styles.resultBody}>
        {isBusy ? (
          <View style={styles.center}>
            <Text style={styles.busyText}>
              {screenState === "VERIFYING" ? "Checking the voucher…" : "Redeeming…"}
            </Text>
          </View>
        ) : screenState === "VERIFIED" && signedVoucher ? (
          <ResultCard
            iconName={StatusTokens.verified.icon}
            iconColor={StatusTokens.verified.fg}
            iconBg={StatusTokens.verified.bg}
            chipToken={StatusTokens.verified}
            chipLabel="Voucher verified"
            title="Ready to redeem"
            body={`This voucher is genuine, unused and assigned to ${cafeName(signedVoucher.payload.restaurantId)}.`}
            details={[
              { k: "Voucher", v: signedVoucher.payload.voucherId },
              { k: "Meal", v: `${signedVoucher.payload.quantity} × ${signedVoucher.payload.mealType}` },
              { k: "Valid until", v: formatDate(signedVoucher.payload.expiresAt) },
            ]}
            primary={{ label: `Redeem ${signedVoucher.payload.quantity} ${signedVoucher.payload.mealType}`, onPress: () => void redeemVoucher() }}
            secondary={{ label: "Cancel", onPress: scanAnotherVoucher }}
          />
        ) : screenState === "REDEEMED" && signedVoucher ? (
          <ResultCard
            animated
            chipToken={StatusTokens.redeemed}
            chipLabel="Meal redeemed"
            title="Enjoy the meal"
            body="All done — this voucher has now been used and can't be used again."
            details={[
              { k: "Voucher", v: signedVoucher.payload.voucherId },
              { k: "Redeemed", v: redeemedAt ? new Date(redeemedAt).toLocaleString() : "Just now" },
            ]}
            primary={{ label: "Scan next voucher", onPress: scanAnotherVoucher }}
            secondary={{ label: "Back to home", onPress: () => router.replace("/staff") }}
          />
        ) : screenState === "ERROR" && rejection ? (
          <ResultCard
            iconName={rejection.icon ?? rejection.token.icon}
            iconColor={rejection.token.fg}
            iconBg={rejection.token.bg}
            chipToken={rejection.token}
            chipLabel={rejection.message}
            title={rejection.title}
            body={rejection.explanation}
            details={
              signedVoucher
                ? [
                    { k: "Voucher", v: signedVoucher.payload.voucherId },
                    { k: "Assigned café", v: cafeName(signedVoucher.payload.restaurantId) },
                  ]
                : undefined
            }
            primary={{ label: "Scan another voucher", onPress: scanAnotherVoucher }}
            secondary={
              rejection === NetworkRejection
                ? { label: "Try again", onPress: () => signedVoucher && void verifyVoucher(signedVoucher) }
                : { label: "Back to home", onPress: () => router.replace("/staff") }
            }
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function ResultCard({
  iconName,
  iconColor,
  iconBg,
  animated,
  chipToken,
  chipLabel,
  title,
  body,
  details,
  primary,
  secondary,
}: {
  iconName?: IconName;
  iconColor?: string;
  iconBg?: string;
  animated?: boolean;
  chipToken: (typeof StatusTokens)["verified"];
  chipLabel: string;
  title: string;
  body: string;
  details?: { k: string; v: string }[];
  primary: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.resultContent}>
      <View style={styles.resultHead}>
        {animated ? (
          <SuccessPop />
        ) : (
          <View style={[styles.resultIconCircle, { backgroundColor: iconBg }]}>
            {iconName ? <Icon name={iconName} size={48} color={iconColor} /> : null}
          </View>
        )}
        <StatusChip token={chipToken} label={chipLabel} />
        <View style={styles.resultTextBlock}>
          <Text style={styles.resultTitle}>{title}</Text>
          <Text style={styles.resultBodyText}>{body}</Text>
        </View>
      </View>

      {details ? (
        <View style={styles.detailsCard}>
          {details.map((row, index) => (
            <View key={row.k} style={[styles.detailRow, index > 0 && styles.detailRowDivider]}>
              <Text style={styles.detailKey}>{row.k}</Text>
              <Text style={styles.detailValue}>{row.v}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.resultFooter}>
        <Button label={primary.label} onPress={primary.onPress} />
        {secondary ? <Button label={secondary.label} variant="ghost" onPress={secondary.onPress} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.canvas,
  },
  darkContainer: {
    flex: 1,
    backgroundColor: "#1A1714",
  },
  permissionCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    padding: Spacing.xl,
  },
  heading: {
    ...Type.title,
    color: Colors.light.ink,
    textAlign: "center",
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.light.inkSecondary,
    textAlign: "center",
  },
  scanTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.sm,
    minHeight: 52,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: "rgba(26,23,20,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  roundButtonLight: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F4EFE6",
  },
  frameWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xl,
  },
  frame: {
    width: 250,
    height: 250,
  },
  corner: {
    position: "absolute",
    width: 48,
    height: 48,
    borderColor: "#F2A413",
  },
  cornerTL: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 20 },
  cornerTR: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 20 },
  cornerBL: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 20 },
  cornerBR: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 20 },
  framePill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: "rgba(26,23,20,0.75)",
  },
  framePillText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    color: "#F4EFE6",
  },
  scanBottomBar: {
    backgroundColor: "#241F1A",
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing["2xl"],
    gap: Spacing.md,
  },
  cafeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cafeRowText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: "#B5AC9F",
    flexShrink: 1,
  },
  manualButton: {
    borderColor: "#B5AC9F",
    backgroundColor: "transparent",
  },
  sheetTitle: {
    ...Type.heading,
    color: Colors.light.ink,
  },
  sheetBody: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: Colors.light.inkSecondary,
  },
  manualInputBox: {
    minHeight: 80,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.light.borderStrong,
    padding: Spacing.md,
  },
  manualInputText: {
    fontSize: 14,
    color: Colors.light.inkTertiary,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    minHeight: 52,
  },
  topBarTitle: {
    ...Type.heading,
    color: Colors.light.ink,
  },
  resultBody: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  busyText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.ink,
  },
  resultContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: Spacing.lg,
    paddingBottom: Spacing["2xl"],
    gap: Spacing.xl,
  },
  resultHead: {
    alignItems: "center",
    gap: Spacing.lg,
  },
  resultIconCircle: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTextBlock: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  resultTitle: {
    ...Type.title,
    color: Colors.light.ink,
    textAlign: "center",
  },
  resultBodyText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
    color: Colors.light.inkSecondary,
    textAlign: "center",
  },
  detailsCard: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  detailRowDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  detailKey: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.inkSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.ink,
    textAlign: "right",
  },
  resultFooter: {
    gap: Spacing.sm,
  },
});
