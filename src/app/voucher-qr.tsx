
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

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

export default function VoucherQRScreen() {
  const router = useRouter();
  const { voucher } = useLocalSearchParams<{
    voucher?: string;
  }>();

  const signedVoucher = useMemo<SignedVoucher | null>(() => {
    if (typeof voucher !== "string") return null;

    try {
      const parsed = JSON.parse(voucher);

      if (
        !parsed ||
        typeof parsed !== "object" ||
        !parsed.payload ||
        typeof parsed.payload.voucherId !== "string" ||
        typeof parsed.signature !== "string" ||
        parsed.algorithm !== "ES256"
      ) {
        return null;
      }

      return parsed as SignedVoucher;
    } catch {
      return null;
    }
  }, [voucher]);

  const qrValue = signedVoucher
    ? JSON.stringify(signedVoucher)
    : "";

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-NZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  if (!signedVoucher) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>
            Voucher Not Available
          </Text>

          <Text style={styles.errorText}>
            The signed voucher data is missing or invalid.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/admin")}
          >
            <Text style={styles.primaryButtonText}>
              Back to Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { payload } = signedVoucher;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <Text style={styles.brand}>✦ MealSeal</Text>

        <View style={styles.successIcon}>
          <Text style={styles.successIconText}>✓</Text>
        </View>

        <Text style={styles.heading}>
          Voucher Created!
        </Text>

        <Text style={styles.subtitle}>
          Your meal voucher has been digitally signed
          and saved successfully.
        </Text>

        <View style={styles.qrCard}>
          <Text style={styles.qrHeading}>
            Secure Meal Voucher
          </Text>

          <Text style={styles.qrSubtitle}>
            Present this QR code at the restaurant
          </Text>

          <View style={styles.qrContainer}>
            <QRCode
              value={qrValue}
              size={230}
              backgroundColor="#FFFFFF"
              color="#155E49"
              ecl="L"
            />
          </View>

          <View style={styles.signatureBadge}>
            <Text style={styles.signatureText}>
              ✓ ECDSA P-256 / SHA-256 Signed
            </Text>
          </View>

          <Text style={styles.voucherLabel}>
            VOUCHER ID
          </Text>

          <Text selectable style={styles.voucherId}>
            {payload.voucherId}
          </Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>
            Voucher Details
          </Text>

          <DetailRow
            label="Recipient"
            value={payload.recipientRef}
          />

          <DetailRow
            label="Restaurant"
            value={payload.restaurantId}
          />

          <DetailRow
            label="Meal Type"
            value={payload.mealType}
          />

          <DetailRow
            label="Quantity"
            value={String(payload.quantity)}
          />

          <DetailRow
            label="Expiry Date (UTC)"
            value={formatDate(payload.expiresAt - 1)}
          />

          <DetailRow
            label="Status"
            value="ACTIVE"
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            🔒 Cryptographic Protection
          </Text>

          <Text style={styles.infoText}>
            This QR code contains the voucher payload
            and its ECDSA digital signature. The
            restaurant will verify the signature
            and voucher status before redemption.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace("/admin")}
        >
          <Text style={styles.primaryButtonText}>
            Back to Dashboard
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          MEALSEAL • SECURE VOUCHER PLATFORM
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
    alignItems: "center",
  },
  brand: {
    fontSize: 23,
    fontWeight: "800",
    color: "#155E49",
    marginBottom: 22,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0F0E5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  successIconText: {
    color: "#155E49",
    fontSize: 32,
    fontWeight: "800",
  },
  heading: {
    fontSize: 27,
    fontWeight: "800",
    color: "#183E32",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#73877B",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 22,
  },
  qrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#E4ECE5",
    marginBottom: 18,
  },
  qrHeading: {
    fontSize: 19,
    fontWeight: "800",
    color: "#155E49",
    marginBottom: 6,
  },
  qrSubtitle: {
    color: "#839589",
    fontSize: 12,
    marginBottom: 20,
  },
  qrContainer: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 18,
  },
  signatureBadge: {
    backgroundColor: "#E7F2E9",
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 19,
  },
  signatureText: {
    color: "#155E49",
    fontWeight: "700",
    fontSize: 12,
  },
  voucherLabel: {
    color: "#839589",
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: 7,
  },
  voucherId: {
    color: "#304E42",
    fontSize: 12,
    textAlign: "center",
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    width: "100%",
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#155E49",
    marginBottom: 13,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2ED",
    gap: 12,
  },
  detailLabel: {
    color: "#7C8E82",
    fontSize: 13,
  },
  detailValue: {
    color: "#244B3A",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 1,
  },
  infoCard: {
    backgroundColor: "#E8F1EA",
    borderRadius: 16,
    padding: 18,
    width: "100%",
    marginBottom: 20,
  },
  infoTitle: {
    color: "#155E49",
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 8,
  },
  infoText: {
    color: "#587365",
    fontSize: 13,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: "#155E49",
    borderRadius: 15,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: "center",
    width: "100%",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  errorContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#183E32",
  },
  errorText: {
    textAlign: "center",
    color: "#73877B",
  },
  footer: {
    textAlign: "center",
    color: "#9BAC9F",
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 28,
  },
});
