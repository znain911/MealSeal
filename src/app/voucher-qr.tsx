import { useLocalSearchParams, useRouter } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Icon } from "@/components/ui/icon";
import { StatusChip } from "@/components/ui/status-chip";
import { StatusTokens } from "@/constants/status";
import { Colors, Radius, Spacing, Type } from "@/constants/theme";

import { API_BASE_URL } from "./config/api";
import { auth } from "./config/firebase";

type VoucherPayload = {
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

type SignedVoucher = {
  payload: VoucherPayload;
  signature: string;
  algorithm: string;
  keyId: string;
};

function getFirstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function validateSignedVoucher(value: any): value is SignedVoucher {
  return (
    value !== null &&
    typeof value === "object" &&
    value.payload !== null &&
    typeof value.payload === "object" &&
    value.payload.version === 1 &&
    typeof value.payload.voucherId === "string" &&
    typeof value.payload.recipientRef === "string" &&
    typeof value.payload.restaurantId === "string" &&
    typeof value.payload.mealType === "string" &&
    Number.isInteger(value.payload.quantity) &&
    typeof value.payload.issuedAt === "number" &&
    typeof value.payload.expiresAt === "number" &&
    typeof value.payload.issuerUid === "string" &&
    typeof value.signature === "string" &&
    value.signature.length > 0 &&
    value.algorithm === "ES256" &&
    typeof value.keyId === "string"
  );
}

function parseSignedVoucher(raw: string | undefined): SignedVoucher | null {
  if (!raw) return null;

  try {
    let parsed: any = JSON.parse(raw);
    if (typeof parsed === "string") parsed = JSON.parse(parsed);
    if (parsed?.signedVoucher) parsed = parsed.signedVoucher;
    return validateSignedVoucher(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function formatDate(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return "Not available";
  return new Date(timestamp).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function VoucherQRScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [voucher, setVoucher] = useState<SignedVoucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState<"image" | "pdf" | null>(null);
  const [qrReady, setQrReady] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const voucherCaptureRef = useRef<any>(null);
  const qrRef = useRef<any>(null);

  const signedVoucherParam = getFirstParam(params.signedVoucher as string | string[] | undefined);
  const voucherIdParam = getFirstParam(params.voucherId as string | string[] | undefined);

  useEffect(() => {
    let cancelled = false;

    const loadVoucher = async () => {
      setLoading(true);
      setQrReady(false);
      setErrorMessage("");

      try {
        const navigationVoucher = parseSignedVoucher(signedVoucherParam);

        if (navigationVoucher) {
          if (!cancelled) setVoucher(navigationVoucher);
          return;
        }

        if (!voucherIdParam) {
          throw new Error("The create voucher screen did not provide the signed voucher.");
        }

        const user = auth.currentUser;
        if (!user) throw new Error("Please sign in again.");

        const token = await user.getIdToken();

        const response = await fetch(
          `${API_BASE_URL}/vouchers/${encodeURIComponent(voucherIdParam)}/signed`,
          { method: "GET", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
        );

        const responseText = await response.text();
        let result: any;

        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error(`Backend returned an invalid response (HTTP ${response.status}).`);
        }

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load voucher.");
        }

        if (!validateSignedVoucher(result.signedVoucher)) {
          throw new Error("The backend returned incomplete voucher data.");
        }

        if (!cancelled) setVoucher(result.signedVoucher);
      } catch (error: any) {
        if (!cancelled) {
          setVoucher(null);
          setErrorMessage(error?.message || "Unable to load voucher.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadVoucher();

    return () => {
      cancelled = true;
    };
  }, [signedVoucherParam, voucherIdParam]);

  const handleShareImage = async () => {
    if (sharing || !voucher || !qrReady || !voucherCaptureRef.current) return;

    setSharing("image");

    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) throw new Error("Sharing is not available on this device.");

      const imageUri = await captureRef(voucherCaptureRef.current, {
        format: "jpg",
        quality: 1,
        result: "tmpfile",
      });

      const fileUri = imageUri.startsWith("file://") ? imageUri : `file://${imageUri}`;

      await Sharing.shareAsync(fileUri, {
        mimeType: "image/jpeg",
        UTI: "public.jpeg",
        dialogTitle: "Share MealSeal voucher",
      });

      setSheetVisible(false);
    } catch (error: any) {
      Alert.alert("Sharing failed", error?.message || "Unable to generate or share the image.");
    } finally {
      setSharing(null);
    }
  };

  const handleSharePdf = async () => {
    if (sharing || !voucher || !qrReady) return;

    setSharing("pdf");

    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) throw new Error("Sharing is not available on this device.");

      const qrDataUrl = await new Promise<string>((resolve, reject) => {
        if (!qrRef.current?.toDataURL) {
          reject(new Error("QR image is not ready."));
          return;
        }
        qrRef.current.toDataURL((data: string) => resolve(data));
      });

      const payload = voucher.payload;

      const html = `
        <html>
          <body style="font-family: -apple-system, Roboto, sans-serif; text-align: center; padding: 32px; color: #2B2622;">
            <h1 style="color: #1F5C46;">MealSeal</h1>
            <p style="color: #5E554B;">Secure meal voucher</p>
            <img src="data:image/png;base64,${qrDataUrl}" width="220" height="220" />
            <h2>${payload.voucherId}</h2>
            <p>${payload.quantity} × ${payload.mealType} · ${payload.restaurantId}</p>
            <p>Valid until ${formatDate(payload.expiresAt)}</p>
            <p style="color: #776D62; font-size: 12px; margin-top: 24px;">
              Present this QR code at the assigned café. Each voucher can only be redeemed once.
            </p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html, base64: false });

      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: "Share MealSeal voucher",
      });

      setSheetVisible(false);
    } catch (error: any) {
      Alert.alert("Sharing failed", error?.message || "Unable to generate or share the PDF.");
    } finally {
      setSharing(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading your signed voucher...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!voucher) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <StatusChip token={StatusTokens.stop} label="Voucher not available" />
          <Text style={styles.errorTitle}>We couldn’t load this voucher</Text>
          <Text style={styles.errorDescription}>
            {errorMessage || "The signed voucher could not be loaded."}
          </Text>
          <Button label="Back to dashboard" onPress={() => router.replace("/admin")} />
        </View>
      </SafeAreaView>
    );
  }

  const payload = voucher.payload;
  const qrData = JSON.stringify(voucher);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StatusChip token={StatusTokens.verified} label="Signed and ready" />

        <View
          ref={(instance) => {
            voucherCaptureRef.current = instance;
          }}
          collapsable={false}
          onLayout={() => setQrReady(true)}
          style={styles.voucherCard}
        >
          <QRCode
            getRef={(ref) => {
              qrRef.current = ref;
            }}
            value={qrData}
            size={200}
            ecl="L"
            color="#2B2622"
            backgroundColor="#FFFFFF"
          />

          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{payload.voucherId}</Text>
            <Text style={styles.cardSubtitle}>
              {payload.quantity} × {payload.mealType} · {payload.restaurantId}
            </Text>
            <Text style={styles.cardSubtitle}>Valid until {formatDate(payload.expiresAt)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.reopenSheet} onPress={() => setSheetVisible(true)}>
          <Icon name="shareImage" size={20} color={Colors.light.primary} />
          <Text style={styles.reopenSheetText}>Share voucher</Text>
        </TouchableOpacity>

        <Button
          label="Back to dashboard"
          variant="secondary"
          onPress={() => router.replace("/admin")}
        />
      </ScrollView>

      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Share voucher</Text>
          <Text style={styles.sheetSubtitle}>Send it only to the recipient. The code works once.</Text>
        </View>

        <TouchableOpacity
          style={styles.shareOption}
          onPress={() => void handleShareImage()}
          disabled={sharing !== null || !qrReady}
        >
          <View style={styles.shareOptionIcon}>
            {sharing === "image" ? (
              <ActivityIndicator color={Colors.light.primary} />
            ) : (
              <Icon name="shareImage" size={22} color={Colors.light.primary} />
            )}
          </View>
          <Text style={styles.shareOptionText}>Share as image</Text>
          <Icon name="chevronRight" size={20} color={Colors.light.inkSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shareOption}
          onPress={() => void handleSharePdf()}
          disabled={sharing !== null || !qrReady}
        >
          <View style={styles.shareOptionIcon}>
            {sharing === "pdf" ? (
              <ActivityIndicator color={Colors.light.primary} />
            ) : (
              <Icon name="sharePdf" size={22} color={Colors.light.primary} />
            )}
          </View>
          <Text style={styles.shareOptionText}>Share as PDF</Text>
          <Icon name="chevronRight" size={20} color={Colors.light.inkSecondary} />
        </TouchableOpacity>

        <Button label="Done" variant="secondary" onPress={() => setSheetVisible(false)} />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.canvas,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing["2xl"],
    alignItems: "center",
    gap: Spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.light.inkSecondary,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  errorTitle: {
    ...Type.title,
    color: Colors.light.ink,
    textAlign: "center",
  },
  errorDescription: {
    color: Colors.light.inkSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  voucherCard: {
    width: "100%",
    backgroundColor: Colors.light.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.lg,
    ...{ shadowColor: "#2B2622", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  },
  cardText: {
    alignItems: "center",
    gap: 2,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
    color: Colors.light.ink,
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: Colors.light.inkSecondary,
  },
  reopenSheet: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: 44,
  },
  reopenSheetText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.primary,
  },
  sheetHeader: {
    gap: Spacing.xs,
  },
  sheetTitle: {
    ...Type.heading,
    color: Colors.light.ink,
  },
  sheetSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: Colors.light.inkSecondary,
  },
  shareOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Radius.md,
  },
  shareOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.light.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  shareOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.ink,
  },
});
