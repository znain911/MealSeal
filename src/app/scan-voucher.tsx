
import {
    CameraView,
    useCameraPermissions,
} from "expo-camera";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { API_BASE_URL } from "./config/api";
import { auth } from "./config/firebase";

type ScreenState =
  | "SCANNING"
  | "VERIFYING"
  | "VERIFIED"
  | "REDEEMING"
  | "REDEEMED"
  | "ERROR";

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
  voucherId?: string;
  recipientRef?: string;
  restaurantId?: string;
  mealType?: string;
  quantity?: number;
  expiresAt?: number;
};

type Rejection = {
  code: string;
  title: string;
  message: string;
  explanation: string;
};

const REJECTION_DETAILS: Record<
  string,
  Omit<Rejection, "code">
> = {
  INVALID_SIGNATURE: {
    title: "Invalid Digital Signature",
    message: "This voucher failed signature verification.",
    explanation:
      "The voucher may have been forged or its signed information may have been modified.",
  },
  BAD_SIGNATURE: {
    title: "Invalid Digital Signature",
    message: "The digital signature is not valid.",
    explanation:
      "ECDSA verification could not confirm that the voucher was issued by MealSeal.",
  },
  WRONG_RESTAURANT: {
    title: "Wrong Restaurant",
    message: "This voucher belongs to another restaurant.",
    explanation:
      "The restaurant assigned to the voucher does not match the authenticated staff account.",
  },
  ALREADY_REDEEMED: {
    title: "Voucher Already Redeemed",
    message: "This voucher has already been used.",
    explanation:
      "MealSeal prevents the same voucher from being redeemed more than once.",
  },
  EXPIRED: {
    title: "Voucher Expired",
    message: "This voucher has expired.",
    explanation:
      "The voucher expiry timestamp has passed.",
  },
  INVALID_QR: {
    title: "Invalid QR Code",
    message: "This is not a valid MealSeal voucher.",
    explanation:
      "The scanned QR code does not contain the required signed voucher data.",
  },
  INVALID_VOUCHER: {
    title: "Invalid Voucher",
    message: "The voucher data is invalid.",
    explanation:
      "The voucher failed validation and cannot be accepted.",
  },
  UNAUTHORIZED: {
    title: "Unauthorized Access",
    message: "You are not authorized to verify this voucher.",
    explanation:
      "A valid Restaurant Staff account is required.",
  },
  FORBIDDEN: {
    title: "Access Denied",
    message: "Your account does not have permission.",
    explanation:
      "The backend rejected this operation based on the authenticated user.",
  },
  NOT_FOUND: {
    title: "Voucher Not Found",
    message: "This voucher was not found.",
    explanation:
      "The voucher does not exist in the MealSeal database.",
  },
  REDEEMED: {
    title: "Voucher Already Redeemed",
    message: "This voucher has already been used.",
    explanation:
      "The database indicates that the voucher has been redeemed.",
  },
  REVOKED: {
    title: "Voucher Revoked",
    message: "This voucher has been revoked.",
    explanation:
      "The voucher is no longer active.",
  },
};

class VoucherApiError extends Error {
  code: string;
  status: number;

  constructor(
    code: string,
    message: string,
    status = 0
  ) {
    super(message);
    this.name = "VoucherApiError";
    this.code = code;
    this.status = status;
  }
}

function getRejection(error: unknown): Rejection {
  if (error instanceof VoucherApiError) {
    let code = error.code.toUpperCase();

    // Preserve useful backend error codes.
    if (!REJECTION_DETAILS[code]) {
      if (error.status === 401) {
        code = "UNAUTHORIZED";
      } else if (error.status === 403) {
        code = "FORBIDDEN";
      } else if (
        error.status === 409 &&
        /redeem|used/i.test(error.message)
      ) {
        code = "ALREADY_REDEEMED";
      }
    }

    const details = REJECTION_DETAILS[code];

    return {
      code,
      title: details?.title ?? "Verification Failed",
      message: error.message || details?.message ||
        "The voucher could not be verified.",
      explanation:
        details?.explanation ??
        "The backend rejected the voucher. Check the rejection code for details.",
    };
  }

  return {
    code: "NETWORK_OR_SERVER_ERROR",
    title: "Connection Error",
    message:
      error instanceof Error
        ? error.message
        : "Unable to contact the MealSeal backend.",
    explanation:
      "Check that the Node.js backend is running and your phone can reach the API.",
  };
}

function parseQRCode(data: string): SignedVoucher {
  let parsed: any;

  try {
    parsed = JSON.parse(data);
  } catch {
    throw new VoucherApiError(
      "INVALID_QR",
      "The scanned QR code is not valid JSON."
    );
  }

  const voucher =
    parsed?.signedVoucher ?? parsed;

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
  if (typeof value !== "number") {
    return "Not available";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : date.toLocaleString();
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
    useState<VoucherResponse | null>(null);

  const [rejection, setRejection] =
    useState<Rejection | null>(null);

  const scanLocked = useRef(false);

  async function postVoucher(
    endpoint: string,
    voucher: SignedVoucher
  ): Promise<VoucherResponse> {
    const user = auth.currentUser;

    if (!user) {
      throw new VoucherApiError(
        "UNAUTHORIZED",
        "Please sign in as Restaurant Staff."
      );
    }

    const token = await user.getIdToken();

    let response: Response;

    try {
      response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            signedVoucher: voucher,
          }),
        }
      );
    } catch {
      throw new Error(
        "Cannot connect to the MealSeal backend. Check your server and network."
      );
    }

    const rawText = await response.text();

    let result: VoucherResponse = {};

    try {
      result = JSON.parse(rawText);
    } catch {
      throw new VoucherApiError(
        "INVALID_SERVER_RESPONSE",
        "The backend returned an invalid response.",
        response.status
      );
    }

    if (!response.ok || result.success === false) {
      const code =
        result.code ||
        result.error ||
        (response.status === 401
          ? "UNAUTHORIZED"
          : response.status === 403
          ? "FORBIDDEN"
          : `HTTP_${response.status}`);

      throw new VoucherApiError(
        String(code),
        result.message ||
          "The backend rejected this voucher.",
        response.status
      );
    }

    return result;
  }

  async function handleQRCodeScanned({
    data,
  }: {
    data: string;
  }) {
    if (scanLocked.current) {
      return;
    }

    scanLocked.current = true;
    setScreenState("VERIFYING");
    setRejection(null);
    setVerification(null);

    try {
      const voucher = parseQRCode(data);

      setSignedVoucher(voucher);

      const result = await postVoucher(
        "/vouchers/verify",
        voucher
      );

      if (
        result.valid !== true ||
        result.verified !== true ||
        result.status !== "ACTIVE"
      ) {
        throw new VoucherApiError(
          result.code || "VERIFICATION_FAILED",
          result.message ||
            "The voucher could not be verified."
        );
      }

      setVerification(result);
      setScreenState("VERIFIED");
    } catch (error) {
      setRejection(getRejection(error));
      setScreenState("ERROR");
    }
  }

  async function redeemVoucher() {
    if (!signedVoucher) {
      return;
    }

    setScreenState("REDEEMING");

    try {
      const result = await postVoucher(
        "/vouchers/redeem",
        signedVoucher
      );

      if (
        result.success !== true ||
        result.status !== "REDEEMED"
      ) {
        throw new VoucherApiError(
          result.code || "REDEMPTION_FAILED",
          result.message ||
            "The voucher was not redeemed."
        );
      }

      setVerification(result);
      setScreenState("REDEEMED");
    } catch (error) {
      setRejection(getRejection(error));
      setScreenState("ERROR");
    }
  }

  function confirmRedemption() {
    Alert.alert(
      "Redeem Voucher",
      "Are you sure you want to redeem this meal voucher? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Redeem",
          onPress: redeemVoucher,
        },
      ]
    );
  }

  function scanAnotherVoucher() {
    scanLocked.current = false;
    setSignedVoucher(null);
    setVerification(null);
    setRejection(null);
    setScreenState("SCANNING");
  }

  function DetailRow({
    label,
    value,
  }: {
    label: string;
    value: string | number;
  }) {
    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>
          {String(value)}
        </Text>
      </View>
    );
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#155E49"
          />
          <Text style={styles.infoText}>
            Checking camera permission...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.heading}>
            Camera Permission Required
          </Text>

          <Text style={styles.infoText}>
            MealSeal needs camera access to scan meal
            vouchers.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={requestPermission}
          >
            <Text style={styles.primaryButtonText}>
              Allow Camera
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.brand}>
            ✦ MealSeal
          </Text>
        </View>

        <Text style={styles.heading}>
          Scan Meal Voucher
        </Text>

        {screenState === "SCANNING" && (
          <View style={styles.card}>
            <Text style={styles.subtitle}>
              Scan the QR code to verify its digital
              signature and voucher status.
            </Text>

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

            <Text style={styles.helper}>
              Position the voucher QR code inside
              the camera view.
            </Text>
          </View>
        )}

        {(screenState === "VERIFYING" ||
          screenState === "REDEEMING") && (
          <View style={styles.card}>
            <View style={styles.center}>
              <ActivityIndicator
                size="large"
                color="#155E49"
              />

              <Text style={styles.statusTitle}>
                {screenState === "VERIFYING"
                  ? "Verifying Voucher..."
                  : "Redeeming Voucher..."}
              </Text>

              <Text style={styles.infoText}>
                {screenState === "VERIFYING"
                  ? "Checking the digital signature, restaurant, expiry and database status."
                  : "Updating the voucher status securely."}
              </Text>
            </View>
          </View>
        )}

        {screenState === "ERROR" && rejection && (
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>✕</Text>

            <Text style={styles.errorTitle}>
              {rejection.title}
            </Text>

            <View style={styles.errorCodeBox}>
              <Text style={styles.errorCodeLabel}>
                REJECTION CODE
              </Text>

              <Text style={styles.errorCode}>
                {rejection.code}
              </Text>
            </View>

            <Text style={styles.errorMessage}>
              {rejection.message}
            </Text>

            <Text style={styles.errorExplanation}>
              {rejection.explanation}
            </Text>

            {signedVoucher && (
              <View style={styles.errorDetails}>
                <DetailRow
                  label="Voucher ID"
                  value={
                    signedVoucher.payload.voucherId ||
                    "Unknown"
                  }
                />

                <DetailRow
                  label="Assigned Restaurant"
                  value={
                    signedVoucher.payload.restaurantId ||
                    "Unknown"
                  }
                />

                <DetailRow
                  label="Meal Type"
                  value={
                    signedVoucher.payload.mealType ||
                    "Unknown"
                  }
                />
              </View>
            )}

            <Text style={styles.rejectedLabel}>
              VOUCHER REJECTED
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={scanAnotherVoucher}
            >
              <Text style={styles.primaryButtonText}>
                Scan Another Voucher
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {screenState === "VERIFIED" &&
          signedVoucher && (
            <View style={styles.card}>
              <View style={styles.successBanner}>
                <Text style={styles.successIcon}>
                  ✓
                </Text>

                <Text style={styles.successTitle}>
                  Voucher Verified
                </Text>

                <Text style={styles.successDescription}>
                  Digital signature verified successfully.
                  This voucher is active.
                </Text>
              </View>

              <Text style={styles.sectionTitle}>
                Voucher Details
              </Text>

              <DetailRow
                label="Voucher ID"
                value={
                  signedVoucher.payload.voucherId
                }
              />

              <DetailRow
                label="Recipient"
                value={
                  signedVoucher.payload.recipientRef
                }
              />

              <DetailRow
                label="Restaurant"
                value={
                  signedVoucher.payload.restaurantId
                }
              />

              <DetailRow
                label="Meal Type"
                value={
                  signedVoucher.payload.mealType
                }
              />

              <DetailRow
                label="Quantity"
                value={
                  signedVoucher.payload.quantity
                }
              />

              <DetailRow
                label="Issued At"
                value={formatDate(
                  signedVoucher.payload.issuedAt
                )}
              />

              <DetailRow
                label="Expires At"
                value={formatDate(
                  signedVoucher.payload.expiresAt
                )}
              />

              <DetailRow
                label="Status"
                value={
                  verification?.status || "ACTIVE"
                }
              />

              <DetailRow
                label="Algorithm"
                value={signedVoucher.algorithm}
              />

              <DetailRow
                label="Key ID"
                value={signedVoucher.keyId}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={confirmRedemption}
              >
                <Text style={styles.primaryButtonText}>
                  Redeem Voucher
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={scanAnotherVoucher}
              >
                <Text style={styles.secondaryButtonText}>
                  Scan Another Voucher
                </Text>
              </TouchableOpacity>
            </View>
          )}

        {screenState === "REDEEMED" &&
          signedVoucher && (
            <View style={styles.card}>
              <View style={styles.successBanner}>
                <Text style={styles.successIcon}>
                  ✓
                </Text>

                <Text style={styles.successTitle}>
                  Voucher Redeemed Successfully
                </Text>

                <Text style={styles.successDescription}>
                  The voucher has been marked as
                  REDEEMED in Firestore.
                </Text>
              </View>

              <Text style={styles.sectionTitle}>
                Redemption Details
              </Text>

              <DetailRow
                label="Voucher ID"
                value={
                  signedVoucher.payload.voucherId
                }
              />

              <DetailRow
                label="Recipient"
                value={
                  signedVoucher.payload.recipientRef
                }
              />

              <DetailRow
                label="Restaurant"
                value={
                  signedVoucher.payload.restaurantId
                }
              />

              <DetailRow
                label="Meal Type"
                value={
                  signedVoucher.payload.mealType
                }
              />

              <DetailRow
                label="Quantity"
                value={
                  signedVoucher.payload.quantity
                }
              />

              <DetailRow
                label="Status"
                value="REDEEMED"
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={scanAnotherVoucher}
              >
                <Text style={styles.primaryButtonText}>
                  Scan Another Voucher
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
    paddingBottom: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  backButton: {
    backgroundColor: "#E3EEE6",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backText: {
    color: "#155E49",
    fontWeight: "700",
  },
  brand: {
    color: "#155E49",
    fontWeight: "800",
    fontSize: 21,
  },
  heading: {
    color: "#183E32",
    fontSize: 27,
    fontWeight: "800",
    marginBottom: 15,
  },
  subtitle: {
    color: "#667D71",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E1EAE2",
    marginBottom: 20,
  },
  cameraContainer: {
    height: 340,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  camera: {
    flex: 1,
  },
  helper: {
    color: "#73877B",
    fontSize: 13,
    textAlign: "center",
    marginTop: 18,
    lineHeight: 20,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },
  infoText: {
    color: "#6E8276",
    fontSize: 14,
    textAlign: "center",
    marginTop: 15,
    lineHeight: 22,
  },
  statusTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#183E32",
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: "#155E49",
    paddingVertical: 17,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 22,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryButton: {
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryButtonText: {
    color: "#155E49",
    fontWeight: "700",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1EE",
    paddingVertical: 13,
  },
  detailLabel: {
    color: "#75877D",
    fontSize: 13,
    flex: 1,
  },
  detailValue: {
    color: "#183E32",
    fontSize: 13,
    fontWeight: "700",
    flex: 1.5,
    textAlign: "right",
  },
  sectionTitle: {
    color: "#183E32",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 12,
  },
  successBanner: {
    backgroundColor: "#E7F5EC",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 40,
    color: "#16804C",
    fontWeight: "800",
  },
  successTitle: {
    color: "#12683D",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 8,
  },
  successDescription: {
    color: "#387957",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
  errorCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0CACA",
    borderRadius: 20,
    padding: 20,
    alignItems: "stretch",
  },
  errorIcon: {
    fontSize: 45,
    color: "#C93434",
    fontWeight: "800",
    textAlign: "center",
  },
  errorTitle: {
    color: "#A82424",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 8,
  },
  errorCodeBox: {
    backgroundColor: "#FFF0F0",
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
  },
  errorCodeLabel: {
    color: "#9A6666",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  errorCode: {
    color: "#B22222",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 6,
    textAlign: "center",
  },
  errorMessage: {
    color: "#A82424",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 20,
    lineHeight: 23,
  },
  errorExplanation: {
    color: "#765E5E",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 21,
  },
  errorDetails: {
    marginTop: 20,
    padding: 14,
    backgroundColor: "#FAF7F7",
    borderRadius: 12,
  },
  rejectedLabel: {
    color: "#B22222",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1,
    marginTop: 22,
  },
});
