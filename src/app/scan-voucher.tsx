
import { useRouter } from "expo-router";
import { useRef, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    CameraView,
    useCameraPermissions,
    type BarcodeScanningResult,
} from "expo-camera";

import { SafeAreaView } from "react-native-safe-area-context";

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

type VerificationResponse = {
  success: boolean;
  valid?: boolean;
  verified?: boolean;
  status?: string;
  code?: string;
  message?: string;
  voucherId?: string;
  recipientRef?: string;
  restaurantId?: string;
  mealType?: string;
  quantity?: number;
  expiresAt?: number;
  algorithm?: string;
};

type RedeemResponse = {
  success: boolean;
  code?: string;
  message?: string;
  voucherId?: string;
  status?: string;
};

type ScreenState =
  | "SCANNING"
  | "VERIFYING"
  | "VERIFIED"
  | "REDEEMING"
  | "REDEEMED"
  | "ERROR";

function parseQRCode(raw: string): SignedVoucher | null {
  try {
    let parsed: any = JSON.parse(raw);

    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }

    if (parsed?.signedVoucher) {
      parsed = parsed.signedVoucher;
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.payload ||
      typeof parsed.payload.voucherId !== "string" ||
      typeof parsed.payload.recipientRef !== "string" ||
      typeof parsed.payload.restaurantId !== "string" ||
      typeof parsed.payload.mealType !== "string" ||
      typeof parsed.payload.quantity !== "number" ||
      typeof parsed.payload.expiresAt !== "number" ||
      typeof parsed.signature !== "string" ||
      parsed.algorithm !== "ES256" ||
      typeof parsed.keyId !== "string"
    ) {
      return null;
    }

    return parsed as SignedVoucher;
  } catch {
    return null;
  }
}

function formatDate(timestamp: number): string {
  if (!Number.isFinite(timestamp)) {
    return "Not available";
  }

  return new Date(timestamp).toLocaleString();
}

async function postSignedVoucher<T>(
  endpoint: string,
  signedVoucher: SignedVoucher
): Promise<T> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in again.");
  }

  const token = await user.getIdToken();

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        signedVoucher,
      }),
    }
  );

  const responseText = await response.text();

  let result: any;

  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Server returned an invalid response (HTTP ${response.status}).`
    );
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.message ||
        `Request failed (HTTP ${response.status}).`
    );
  }

  return result as T;
}

export default function ScanVoucherScreen() {
  const router = useRouter();

  const [permission, requestPermission] =
    useCameraPermissions();

  const [screenState, setScreenState] =
    useState<ScreenState>("SCANNING");

  const [signedVoucher, setSignedVoucher] =
    useState<SignedVoucher | null>(null);

  const [verification, setVerification] =
    useState<VerificationResponse | null>(null);

  const [errorMessage, setErrorMessage] = useState("");

  // Prevent repeated scan events while processing.
  const scanLocked = useRef(false);

  const resetScanner = () => {
    scanLocked.current = false;
    setSignedVoucher(null);
    setVerification(null);
    setErrorMessage("");
    setScreenState("SCANNING");
  };

  const handleQRCodeScanned = async (
    result: BarcodeScanningResult
  ) => {
    if (scanLocked.current) {
      return;
    }

    scanLocked.current = true;
    setScreenState("VERIFYING");
    setErrorMessage("");

    const parsedVoucher = parseQRCode(result.data);

    if (!parsedVoucher) {
      setErrorMessage(
        "Invalid QR code. This is not a valid MealSeal signed voucher."
      );
      setScreenState("ERROR");
      return;
    }

    setSignedVoucher(parsedVoucher);

    try {
      const response =
        await postSignedVoucher<VerificationResponse>(
          "/vouchers/verify",
          parsedVoucher
        );

      if (
        !response.valid ||
        !response.verified ||
        response.status !== "ACTIVE"
      ) {
        throw new Error(
          response.message ||
            "Voucher verification was unsuccessful."
        );
      }

      setVerification(response);
      setScreenState("VERIFIED");
    } catch (error: any) {
      setErrorMessage(
        error?.message || "Unable to verify voucher."
      );
      setScreenState("ERROR");
    }
  };

  const redeemVoucher = async () => {
    if (
      !signedVoucher ||
      screenState !== "VERIFIED"
    ) {
      return;
    }

    setScreenState("REDEEMING");

    try {
      const response =
        await postSignedVoucher<RedeemResponse>(
          "/vouchers/redeem",
          signedVoucher
        );

      if (
        response.status !== "REDEEMED" ||
        !response.success
      ) {
        throw new Error(
          response.message || "Redemption failed."
        );
      }

      setScreenState("REDEEMED");
    } catch (error: any) {
      setErrorMessage(
        error?.message || "Unable to redeem voucher."
      );
      setScreenState("ERROR");
    }
  };

  const confirmRedemption = () => {
    if (!signedVoucher) {
      return;
    }

    Alert.alert(
      "Confirm Redemption",
      `Redeem ${signedVoucher.payload.quantity} ${signedVoucher.payload.mealType} meal(s) for ${signedVoucher.payload.recipientRef}?\n\nThis voucher cannot be redeemed again.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Redeem Voucher",
          onPress: () => {
            void redeemVoucher();
          },
        },
      ]
    );
  };

  const showCamera = screenState === "SCANNING";

  const isBusy =
    screenState === "VERIFYING" ||
    screenState === "REDEEMING";

  const payload = signedVoucher?.payload;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.brand}>✦ MealSeal</Text>

          <TouchableOpacity
            disabled={isBusy}
            onPress={() => router.replace("/staff")}
          >
            <Text style={styles.backLink}>Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.pageTitle}>
          Scan Meal Voucher
        </Text>

        <Text style={styles.pageDescription}>
          Scan the QR code to verify its digital
          signature, expiry date and redemption status.
        </Text>

        {/* CAMERA */}
        {showCamera && (
          <View style={styles.cameraCard}>
            {!permission ? (
              <ActivityIndicator
                size="large"
                color="#155E49"
              />
            ) : !permission.granted ? (
              <View style={styles.permissionContainer}>
                <Text style={styles.permissionTitle}>
                  Camera Permission Required
                </Text>

                <Text style={styles.permissionText}>
                  MealSeal needs camera access to scan
                  voucher QR codes.
                </Text>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => {
                    void requestPermission();
                  }}
                >
                  <Text style={styles.primaryButtonText}>
                    Allow Camera
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.cameraContainer}>
                  <CameraView
                    style={styles.camera}
                    facing="back"
                    barcodeScannerSettings={{
                      barcodeTypes: ["qr"],
                    }}
                    onBarcodeScanned={
                      handleQRCodeScanned
                    }
                  />
                </View>

                <Text style={styles.cameraInstruction}>
                  Position the MealSeal QR code
                  inside the camera frame.
                </Text>
              </>
            )}
          </View>
        )}

        {/* LOADING */}
        {isBusy && (
          <View style={styles.resultCard}>
            <ActivityIndicator
              size="large"
              color="#155E49"
            />

            <Text style={styles.processingTitle}>
              {screenState === "VERIFYING"
                ? "Verifying Voucher..."
                : "Redeeming Voucher..."}
            </Text>

            <Text style={styles.processingText}>
              {screenState === "VERIFYING"
                ? "Checking ECDSA signature, expiry and Firebase status."
                : "Updating the voucher status securely in Firebase."}
            </Text>
          </View>
        )}

        {/* VERIFIED VOUCHER DETAILS */}
        {screenState === "VERIFIED" &&
          payload &&
          verification && (
            <View style={styles.resultCard}>
              <View style={styles.statusBox}>
                <Text style={styles.statusIcon}>
                  ✓
                </Text>

                <Text style={styles.validTitle}>
                  Voucher Valid
                </Text>

                <Text style={styles.validDescription}>
                  Digital signature verified successfully.
                </Text>
              </View>

              <Text style={styles.sectionTitle}>
                Voucher Details
              </Text>

              <View style={styles.detailsBox}>
                <DetailRow
                  label="Voucher ID"
                  value={payload.voucherId}
                />

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
                  label="Issued"
                  value={formatDate(payload.issuedAt)}
                />

                <DetailRow
                  label="Expires"
                  value={formatDate(payload.expiresAt)}
                />

                <DetailRow
                  label="Status"
                  value={verification.status || "ACTIVE"}
                />
              </View>

              <View style={styles.signatureCard}>
                <Text style={styles.signatureTitle}>
                  ✓ Digital Signature Verified
                </Text>

                <Text style={styles.signatureText}>
                  Algorithm: {signedVoucher?.algorithm}
                </Text>

                <Text style={styles.signatureText}>
                  Key ID: {signedVoucher?.keyId}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.redeemButton}
                onPress={confirmRedemption}
              >
                <Text style={styles.redeemButtonText}>
                  Redeem Voucher
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={resetScanner}
              >
                <Text style={styles.secondaryButtonText}>
                  Scan Another Voucher
                </Text>
              </TouchableOpacity>
            </View>
          )}

        {/* REDEEMED */}
        {screenState === "REDEEMED" && payload && (
          <View style={styles.resultCard}>
            <View style={styles.statusBox}>
              <Text style={styles.statusIcon}>✓</Text>

              <Text style={styles.validTitle}>
                Voucher Redeemed!
              </Text>

              <Text style={styles.validDescription}>
                This voucher has been successfully
                redeemed and updated in Firebase.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>
              Redemption Details
            </Text>

            <View style={styles.detailsBox}>
              <DetailRow
                label="Recipient"
                value={payload.recipientRef}
              />

              <DetailRow
                label="Restaurant"
                value={payload.restaurantId}
              />

              <DetailRow
                label="Meal"
                value={payload.mealType}
              />

              <DetailRow
                label="Quantity"
                value={String(payload.quantity)}
              />

              <DetailRow
                label="Status"
                value="REDEEMED"
              />

              <DetailRow
                label="Voucher ID"
                value={payload.voucherId}
              />
            </View>

            <Text style={styles.redeemedNotice}>
              This voucher cannot be redeemed again.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={resetScanner}
            >
              <Text style={styles.primaryButtonText}>
                Scan Another Voucher
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* VERIFICATION / REDEMPTION ERROR */}
        {screenState === "ERROR" && (
          <View style={styles.resultCard}>
            <Text style={styles.errorTitle}>
              Verification / Redemption Failed
            </Text>

            <Text style={styles.errorDescription}>
              {errorMessage}
            </Text>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={resetScanner}
            >
              <Text style={styles.secondaryButtonText}>
                Scan Another Voucher
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SECURITY INFO */}
        <View style={styles.securityCard}>
          <Text style={styles.securityTitle}>
            Secure Verification
          </Text>

          <Text style={styles.securityText}>
            MealSeal verifies ECDSA P-256/SHA-256
            signatures on the backend and uses a
            Firestore transaction to prevent
            duplicate redemption.
          </Text>
        </View>

        <Text style={styles.footer}>
          MEALSEAL • SECURE MEAL VOUCHER PLATFORM
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
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text style={styles.detailValue}>
        {value}
      </Text>
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

  backLink: {
    color: "#155E49",
    fontSize: 15,
    fontWeight: "700",
  },

  pageTitle: {
    color: "#183E32",
    fontSize: 27,
    fontWeight: "800",
    marginBottom: 12,
  },

  pageDescription: {
    color: "#74877B",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },

  cameraCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 22,
  },

  cameraContainer: {
    height: 340,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#000000",
  },

  camera: {
    flex: 1,
  },

  cameraInstruction: {
    color: "#74877B",
    textAlign: "center",
    fontSize: 13,
    marginTop: 14,
    lineHeight: 20,
  },

  permissionContainer: {
    padding: 20,
    alignItems: "center",
  },

  permissionTitle: {
    color: "#183E32",
    fontSize: 18,
    fontWeight: "800",
  },

  permissionText: {
    color: "#74877B",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 21,
  },

  resultCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 22,
  },

  statusBox: {
    backgroundColor: "#E8F4EC",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 22,
  },

  statusIcon: {
    fontSize: 40,
    color: "#155E49",
    fontWeight: "800",
  },

  validTitle: {
    color: "#155E49",
    fontSize: 23,
    fontWeight: "800",
    marginTop: 5,
  },

  validDescription: {
    color: "#587365",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  sectionTitle: {
    color: "#183E32",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 15,
  },

  detailsBox: {
    borderWidth: 1,
    borderColor: "#E4EBE5",
    borderRadius: 13,
    overflow: "hidden",
  },

  detailRow: {
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2EE",
  },

  detailLabel: {
    color: "#82978A",
    fontSize: 11,
    marginBottom: 5,
  },

  detailValue: {
    color: "#183E32",
    fontSize: 13,
    fontWeight: "700",
  },

  signatureCard: {
    backgroundColor: "#E8F1EA",
    padding: 17,
    borderRadius: 13,
    marginTop: 19,
  },

  signatureTitle: {
    color: "#155E49",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 10,
  },

  signatureText: {
    color: "#587365",
    fontSize: 12,
    marginBottom: 5,
  },

  redeemButton: {
    backgroundColor: "#155E49",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 22,
  },

  redeemButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  primaryButton: {
    backgroundColor: "#155E49",
    padding: 17,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 18,
    width: "100%",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  secondaryButton: {
    backgroundColor: "#E2EDE6",
    padding: 17,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },

  secondaryButtonText: {
    color: "#155E49",
    fontSize: 14,
    fontWeight: "800",
  },

  processingTitle: {
    color: "#183E32",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 18,
  },

  processingText: {
    color: "#74877B",
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 21,
  },

  errorTitle: {
    color: "#B42318",
    fontSize: 20,
    fontWeight: "800",
  },

  errorDescription: {
    color: "#74877B",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 13,
  },

  redeemedNotice: {
    color: "#155E49",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 20,
  },

  securityCard: {
    backgroundColor: "#E8F1EA",
    borderRadius: 17,
    padding: 20,
    marginTop: 2,
  },

  securityTitle: {
    color: "#155E49",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 10,
  },

  securityText: {
    color: "#587365",
    fontSize: 13,
    lineHeight: 22,
  },

  footer: {
    color: "#9BAC9F",
    textAlign: "center",
    fontSize: 10,
    marginTop: 28,
  },
});
