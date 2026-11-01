
import { useLocalSearchParams, useRouter } from "expo-router";
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

function getFirstParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function validateSignedVoucher(
  value: any
): value is SignedVoucher {
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

function parseSignedVoucher(
  raw: string | undefined
): SignedVoucher | null {
  if (!raw) {
    return null;
  }

  try {
    let parsed: any = JSON.parse(raw);

    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }

    if (parsed?.signedVoucher) {
      parsed = parsed.signedVoucher;
    }

    return validateSignedVoucher(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function formatDateTime(timestamp: number): string {
  if (!Number.isFinite(timestamp)) {
    return "Not available";
  }

  return new Date(timestamp).toLocaleString();
}

export default function VoucherQRScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [voucher, setVoucher] =
    useState<SignedVoucher | null>(null);

  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [qrReady, setQrReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Avoids the ref typing issue in your Expo setup.
  const voucherCaptureRef = useRef<any>(null);

  const signedVoucherParam = getFirstParam(
    params.signedVoucher as string | string[] | undefined
  );

  const voucherIdParam = getFirstParam(
    params.voucherId as string | string[] | undefined
  );

  useEffect(() => {
    let cancelled = false;

    const loadVoucher = async () => {
      setLoading(true);
      setQrReady(false);
      setErrorMessage("");

      try {
        const navigationVoucher =
          parseSignedVoucher(signedVoucherParam);

        if (navigationVoucher) {
          if (!cancelled) {
            setVoucher(navigationVoucher);
          }
          return;
        }

        if (!voucherIdParam) {
          throw new Error(
            "The Create Voucher page did not provide the signed voucher."
          );
        }

        const user = auth.currentUser;

        if (!user) {
          throw new Error("Please sign in again.");
        }

        const token = await user.getIdToken();

        const response = await fetch(
          `${API_BASE_URL}/vouchers/${encodeURIComponent(
            voucherIdParam
          )}/signed`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        const responseText = await response.text();

        let result: any;

        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error(
            `Backend returned an invalid response (HTTP ${response.status}).`
          );
        }

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to load voucher."
          );
        }

        if (!validateSignedVoucher(result.signedVoucher)) {
          throw new Error(
            "The backend returned incomplete voucher data."
          );
        }

        if (!cancelled) {
          setVoucher(result.signedVoucher);
        }
      } catch (error: any) {
        if (!cancelled) {
          setVoucher(null);
          setErrorMessage(
            error?.message || "Unable to load voucher."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadVoucher();

    return () => {
      cancelled = true;
    };
  }, [signedVoucherParam, voucherIdParam]);

  const handleShareJpg = async () => {
    if (sharing || !voucher || !qrReady) {
      return;
    }

    setSharing(true);

    try {
      if (!voucherCaptureRef.current) {
        throw new Error("Voucher image is not ready.");
      }

      const available = await Sharing.isAvailableAsync();

      if (!available) {
        throw new Error(
          "Sharing is not available on this device."
        );
      }

      const imageUri = await captureRef(
        voucherCaptureRef.current,
        {
          format: "jpg",
          quality: 1,
          result: "tmpfile",
        }
      );

      const fileUri = imageUri.startsWith("file://")
        ? imageUri
        : `file://${imageUri}`;

      await Sharing.shareAsync(fileUri, {
        mimeType: "image/jpeg",
        UTI: "public.jpeg",
        dialogTitle: "Share MealSeal Voucher",
      });
    } catch (error: any) {
      Alert.alert(
        "Sharing Failed",
        error?.message ||
          "Unable to generate or share the voucher JPG."
      );
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color="#155E49"
          />

          <Text style={styles.loadingText}>
            Loading your signed voucher...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!voucher) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>
            Voucher Not Available
          </Text>

          <Text style={styles.errorDescription}>
            {errorMessage ||
              "The signed voucher could not be loaded."}
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/admin")}
          >
            <Text style={styles.primaryButtonText}>
              Back to Admin Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const payload = voucher.payload;
  const qrData = JSON.stringify(voucher);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>✦ MealSeal</Text>

          <TouchableOpacity
            onPress={() => router.replace("/admin")}
          >
            <Text style={styles.dashboardLink}>
              Dashboard
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.successCard}>
          <Text style={styles.successLabel}>
            VOUCHER CREATED SUCCESSFULLY
          </Text>

          <Text style={styles.successTitle}>
            Your Voucher is Ready!
          </Text>

          <Text style={styles.successDescription}>
            Your voucher has been digitally signed
            using ECDSA P-256 and SHA-256.
            You can share it as a JPG image.
          </Text>
        </View>

        {/* This entire card is exported as a JPG */}
        <View
          ref={(instance) => {
            voucherCaptureRef.current = instance;
          }}
          collapsable={false}
          onLayout={() => setQrReady(true)}
          style={styles.voucherCard}
        >
          <Text style={styles.cardBrand}>
            ✦ MealSeal
          </Text>

          <Text style={styles.cardSubtitle}>
            SECURE MEAL VOUCHER
          </Text>

          <View style={styles.qrContainer}>
            <QRCode
              value={qrData}
              size={220}
              ecl="L"
              color="#000000"
              backgroundColor="#FFFFFF"
            />
          </View>

          <Text style={styles.mealType}>
            {payload.mealType}
          </Text>

          <View style={styles.detailsContainer}>
            <Text style={styles.detailText}>
              Recipient: {payload.recipientRef}
            </Text>

            <Text style={styles.detailText}>
              Restaurant: {payload.restaurantId}
            </Text>

            <Text style={styles.detailText}>
              Quantity: {payload.quantity}
            </Text>

            <Text style={styles.detailText}>
              Issued: {formatDateTime(payload.issuedAt)}
            </Text>

            <Text style={styles.detailText}>
              Expires: {formatDateTime(payload.expiresAt)}
            </Text>
          </View>

          <Text style={styles.voucherId}>
            Voucher ID: {payload.voucherId}
          </Text>

          <View style={styles.signatureBox}>
            <Text style={styles.signatureTitle}>
              DIGITALLY SIGNED
            </Text>

            <Text style={styles.signatureDescription}>
              ECDSA P-256 / SHA-256
            </Text>

            <Text style={styles.keyId}>
              Key ID: {voucher.keyId}
            </Text>
          </View>

          <Text style={styles.instructions}>
            Present this QR code at the assigned
            restaurant. Each voucher can only be
            redeemed once.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (sharing || !qrReady) &&
              styles.disabledButton,
          ]}
          disabled={sharing || !qrReady}
          onPress={() => void handleShareJpg()}
        >
          {sharing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              Share QR as JPG
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          disabled={sharing}
          onPress={() => router.replace("/admin")}
        >
          <Text style={styles.secondaryButtonText}>
            Back to Admin Dashboard
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          MEALSEAL • SECURE MEAL VOUCHER PLATFORM
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F1",
  },

  content: {
    padding: 22,
    paddingBottom: 45,
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    padding: 25,
  },

  loadingText: {
    color: "#74877B",
    marginTop: 16,
    textAlign: "center",
  },

  errorTitle: {
    color: "#183E32",
    fontSize: 24,
    fontWeight: "800",
  },

  errorDescription: {
    color: "#74877B",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 15,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },

  brand: {
    color: "#155E49",
    fontSize: 25,
    fontWeight: "800",
  },

  dashboardLink: {
    color: "#155E49",
    fontSize: 14,
    fontWeight: "700",
  },

  successCard: {
    backgroundColor: "#155E49",
    borderRadius: 21,
    padding: 23,
    marginBottom: 23,
  },

  successLabel: {
    color: "#B5D8C5",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  successTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 12,
  },

  successDescription: {
    color: "#D5E9DE",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 10,
  },

  voucherCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5ECE6",
  },

  cardBrand: {
    color: "#155E49",
    fontSize: 26,
    fontWeight: "800",
  },

  cardSubtitle: {
    color: "#74877B",
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 5,
  },

  qrContainer: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    marginVertical: 18,
  },

  mealType: {
    color: "#183E32",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
  },

  detailsContainer: {
    width: "100%",
    alignItems: "center",
  },

  detailText: {
    color: "#304E42",
    fontSize: 13,
    marginBottom: 8,
    textAlign: "center",
  },

  voucherId: {
    color: "#74877B",
    fontSize: 10,
    textAlign: "center",
    marginTop: 12,
  },

  signatureBox: {
    backgroundColor: "#E8F1EA",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 17,
  },

  signatureTitle: {
    color: "#155E49",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  signatureDescription: {
    color: "#155E49",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 5,
  },

  keyId: {
    color: "#587365",
    fontSize: 10,
    marginTop: 5,
  },

  instructions: {
    color: "#60786B",
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 17,
  },

  primaryButton: {
    backgroundColor: "#155E49",
    borderRadius: 15,
    padding: 18,
    alignItems: "center",
    marginTop: 22,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  disabledButton: {
    opacity: 0.5,
  },

  secondaryButton: {
    backgroundColor: "#E2EDE6",
    borderRadius: 15,
    padding: 17,
    alignItems: "center",
    marginTop: 12,
  },

  secondaryButtonText: {
    color: "#155E49",
    fontSize: 15,
    fontWeight: "700",
  },

  footer: {
    color: "#9BAC9F",
    fontSize: 10,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 30,
  },
});
