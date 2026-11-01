
import { useFocusEffect, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { signOut } from "firebase/auth";
import { useCallback, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
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

type Voucher = {
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
};

type VoucherSummary = {
  total: number;
  active: number;
  redeemed: number;
  expired: number;
};

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

const emptySummary: VoucherSummary = {
  total: 0,
  active: 0,
  redeemed: 0,
  expired: 0,
};

function formatDate(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "Not available";
  }

  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "Not available";
  }

  return new Date(value).toLocaleString();
}

function getVoucherStatus(voucher: Voucher): string {
  if (
    voucher.status === "ACTIVE" &&
    voucher.expiresAt <= Date.now()
  ) {
    return "EXPIRED";
  }

  return voucher.status;
}

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [summary, setSummary] =
    useState<VoucherSummary>(emptySummary);

  const [recentVouchers, setRecentVouchers] =
    useState<Voucher[]>([]);

  const [error, setError] = useState("");

  const [sharingId, setSharingId] =
    useState<string | null>(null);

  const [shareVoucher, setShareVoucher] =
    useState<SignedVoucher | null>(null);

  const [qrReady, setQrReady] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Compatible with the React Native ref types in your project.
  const qrCaptureRef = useRef<any>(null);

  const loadDashboard = useCallback(
    async (refresh: boolean = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const user = auth.currentUser;

        if (!user) {
          throw new Error("Please sign in again.");
        }

        const token = await user.getIdToken();

        const response = await fetch(
          `${API_BASE_URL}/vouchers`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const result = await response.json();

        if (
          !response.ok ||
          !result.success ||
          !Array.isArray(result.vouchers)
        ) {
          throw new Error(
            result.message ||
              "Unable to load vouchers."
          );
        }

        const vouchers: Voucher[] = result.vouchers;

        const now = Date.now();

        const counts: VoucherSummary = {
          total: vouchers.length,
          active: 0,
          redeemed: 0,
          expired: 0,
        };

        vouchers.forEach((voucher) => {
          const status = voucher.status?.toUpperCase();

          if (status === "REDEEMED") {
            counts.redeemed += 1;
          } else if (
            status === "EXPIRED" ||
            (status === "ACTIVE" &&
              voucher.expiresAt <= now)
          ) {
            counts.expired += 1;
          } else if (status === "ACTIVE") {
            counts.active += 1;
          }
        });

        setSummary(counts);

        const sortedVouchers = [...vouchers].sort(
          (a, b) => b.issuedAt - a.issuedAt
        );

        setRecentVouchers(sortedVouchers.slice(0, 5));
      } catch (err: any) {
        console.error(
          "Dashboard loading error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load dashboard."
        );

        setSummary(emptySummary);
        setRecentVouchers([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await signOut(auth);
      router.replace("/");
    } catch (err) {
      console.error("Sign out error:", err);

      Alert.alert(
        "Sign Out Failed",
        "Unable to sign out. Please try again."
      );
    } finally {
      setLoggingOut(false);
    }
  };

  const closeSharePreview = () => {
    if (exporting) {
      return;
    }

    setShareVoucher(null);
    setSharingId(null);
    setQrReady(false);
    qrCaptureRef.current = null;
  };

  const handleShare = async (voucher: Voucher) => {
    if (sharingId !== null) {
      return;
    }

    setSharingId(voucher.voucherId);
    setShareVoucher(null);
    setQrReady(false);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please sign in again.");
      }

      const available = await Sharing.isAvailableAsync();

      if (!available) {
        throw new Error(
          "Sharing is not available on this device."
        );
      }

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_BASE_URL}/vouchers/${encodeURIComponent(
          voucher.voucherId
        )}/signed`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (
        !response.ok ||
        !result.success ||
        !result.signedVoucher
      ) {
        throw new Error(
          result.message ||
            "Unable to retrieve the signed voucher."
        );
      }

      const signedVoucher: SignedVoucher =
        result.signedVoucher;

      if (
        !signedVoucher.payload ||
        !signedVoucher.signature ||
        !signedVoucher.algorithm ||
        !signedVoucher.keyId
      ) {
        throw new Error(
          "The signed voucher data is incomplete."
        );
      }

      setShareVoucher(signedVoucher);
    } catch (err: any) {
      console.error("Load share voucher error:", err);

      Alert.alert(
        "Sharing Failed",
        err?.message ||
          "Unable to prepare the voucher."
      );

      setSharingId(null);
      setShareVoucher(null);
      setQrReady(false);
    }
  };

  const shareJpg = async () => {
    if (
      !shareVoucher ||
      !qrReady ||
      !qrCaptureRef.current ||
      exporting
    ) {
      return;
    }

    setExporting(true);

    try {
      const imageUri = await captureRef(
        qrCaptureRef.current,
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

      setShareVoucher(null);
      setSharingId(null);
      setQrReady(false);
      qrCaptureRef.current = null;
    } catch (err: any) {
      console.error("JPG sharing error:", err);

      Alert.alert(
        "Sharing Failed",
        err?.message ||
          "Unable to generate or share the JPG image."
      );
    } finally {
      setExporting(false);
    }
  };

  const renderStat = (
    value: number,
    label: string
  ) => {
    return (
      <View style={styles.statCard}>
        {loading ? (
          <ActivityIndicator color="#155E49" />
        ) : (
          <Text style={styles.statNumber}>
            {value}
          </Text>
        )}

        <Text style={styles.statLabel}>
          {label}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void loadDashboard(true);
            }}
            colors={["#155E49"]}
            tintColor="#155E49"
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>
              ✦ MealSeal
            </Text>

            <Text style={styles.subtitle}>
              Charity Administration
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              void handleLogout();
            }}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator
                color="#155E49"
                size="small"
              />
            ) : (
              <Text style={styles.logoutText}>
                Sign Out
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* WELCOME CARD */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeLabel}>
            ADMIN DASHBOARD
          </Text>

          <Text style={styles.welcomeTitle}>
            Welcome back!
          </Text>

          <Text style={styles.welcomeDescription}>
            Create, manage and share digitally signed
            meal vouchers securely.
          </Text>
        </View>

        {/* OVERVIEW */}
        <Text style={styles.sectionTitle}>
          Voucher Overview
        </Text>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              {error}
            </Text>

            <TouchableOpacity
              onPress={() => {
                void loadDashboard();
              }}
            >
              <Text style={styles.retryText}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          {renderStat(
            summary.total,
            "Total Vouchers"
          )}

          {renderStat(
            summary.active,
            "Active Vouchers"
          )}
        </View>

        <View style={styles.statsRow}>
          {renderStat(
            summary.redeemed,
            "Redeemed"
          )}

          {renderStat(
            summary.expired,
            "Expired"
          )}
        </View>

        {/* VOUCHER MANAGEMENT */}
        <Text style={styles.sectionTitle}>
          Voucher Management
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            router.push("/create-voucher")
          }
        >
          <Text style={styles.primaryButtonText}>
            + Create New Voucher
          </Text>
        </TouchableOpacity>

        {/* SECURITY INFORMATION */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Digital Signature Security
          </Text>

          <Text style={styles.infoText}>
            MealSeal uses ECDSA P-256 with SHA-256
            to protect voucher authenticity and
            integrity. Signed QR codes can be shared
            and verified by restaurant staff.
          </Text>
        </View>

        {/* RECENT VOUCHERS */}
        <Text style={styles.sectionTitle}>
          Recent Vouchers
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#155E49"
          />
        ) : recentVouchers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {error
                ? "Voucher information is unavailable."
                : "No vouchers have been created yet."}
            </Text>
          </View>
        ) : (
          recentVouchers.map((voucher) => {
            const status =
              getVoucherStatus(voucher);

            const isSharing =
              sharingId === voucher.voucherId;

            return (
              <View
                key={voucher.voucherId}
                style={styles.voucherCard}
              >
                <View style={styles.voucherHeader}>
                  <Text style={styles.voucherTitle}>
                    {voucher.mealType}
                  </Text>

                  <Text
                    style={[
                      styles.voucherStatus,
                      status === "ACTIVE"
                        ? styles.activeStatus
                        : status === "REDEEMED"
                        ? styles.redeemedStatus
                        : styles.expiredStatus,
                    ]}
                  >
                    {status}
                  </Text>
                </View>

                <Text style={styles.voucherDetail}>
                  Recipient:{" "}
                  {voucher.recipientRef}
                </Text>

                <Text style={styles.voucherDetail}>
                  Restaurant:{" "}
                  {voucher.restaurantId}
                </Text>

                <Text style={styles.voucherDetail}>
                  Quantity:{" "}
                  {voucher.quantity}
                </Text>

                <Text style={styles.voucherDetail}>
                  Issued:{" "}
                  {formatDate(voucher.issuedAt)}
                </Text>

                <Text style={styles.voucherDetail}>
                  Expires:{" "}
                  {formatDateTime(
                    voucher.expiresAt
                  )}
                </Text>

                <Text style={styles.voucherId}>
                  ID: {voucher.voucherId}
                </Text>

                {/* SHARE BUTTON */}
                <TouchableOpacity
                  style={[
                    styles.shareButton,
                    sharingId !== null &&
                      styles.disabledButton,
                  ]}
                  disabled={sharingId !== null}
                  onPress={() => {
                    void handleShare(voucher);
                  }}
                >
                  {isSharing &&
                  shareVoucher === null ? (
                    <ActivityIndicator
                      color="#FFFFFF"
                      size="small"
                    />
                  ) : (
                    <Text style={styles.shareButtonText}>
                      Share QR as JPG
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <Text style={styles.footer}>
          MEALSEAL • SECURE MEAL VOUCHER PLATFORM
        </Text>
      </ScrollView>

      {/* SHARE PREVIEW */}
      {shareVoucher ? (
        <View style={styles.overlay}>
          <View style={styles.previewPanel}>
            <Text style={styles.previewHeading}>
              Share Meal Voucher
            </Text>

            <Text style={styles.previewDescription}>
              Preview the digitally signed voucher
              before sharing it as a JPG image.
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                styles.previewScrollContent
              }
            >
              {/* CAPTURE THIS VIEW AS JPG */}
              <View
                ref={(instance) => {
                  qrCaptureRef.current = instance;
                }}
                collapsable={false}
                style={styles.captureCard}
                onLayout={() => {
                  setQrReady(true);
                }}
              >
                <Text style={styles.captureBrand}>
                  ✦ MealSeal
                </Text>

                <Text style={styles.captureSubtitle}>
                  SECURE MEAL VOUCHER
                </Text>

                <View style={styles.qrWhite}>
                  <QRCode
                    value={JSON.stringify(
                      shareVoucher
                    )}
                    size={220}
                    ecl="L"
                    backgroundColor="#FFFFFF"
                    color="#000000"
                  />
                </View>

                <Text style={styles.captureMeal}>
                  {
                    shareVoucher.payload
                      .mealType
                  }
                </Text>

                <Text style={styles.captureDetail}>
                  Recipient:{" "}
                  {
                    shareVoucher.payload
                      .recipientRef
                  }
                </Text>

                <Text style={styles.captureDetail}>
                  Restaurant:{" "}
                  {
                    shareVoucher.payload
                      .restaurantId
                  }
                </Text>

                <Text style={styles.captureDetail}>
                  Quantity:{" "}
                  {
                    shareVoucher.payload
                      .quantity
                  }
                </Text>

                <Text style={styles.captureDetail}>
                  Expires:{" "}
                  {formatDateTime(
                    shareVoucher.payload
                      .expiresAt
                  )}
                </Text>

                <Text style={styles.captureSmall}>
                  Voucher ID:{" "}
                  {
                    shareVoucher.payload
                      .voucherId
                  }
                </Text>

                <View style={styles.signatureBadge}>
                  <Text style={styles.signatureText}>
                    Digitally Signed • ECDSA P-256 / SHA-256
                  </Text>
                </View>

                <Text style={styles.captureNotice}>
                  Present this QR code at the
                  assigned restaurant. Each voucher
                  can only be redeemed once.
                </Text>
              </View>
            </ScrollView>

            {/* EXPORT AND SHARE */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!qrReady || exporting) &&
                  styles.disabledButton,
              ]}
              disabled={!qrReady || exporting}
              onPress={() => {
                void shareJpg();
              }}
            >
              {exporting ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Share JPG
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={closeSharePreview}
              disabled={exporting}
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
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
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 26,
  },

  brand: {
    fontSize: 25,
    fontWeight: "800",
    color: "#155E49",
  },

  subtitle: {
    color: "#73877B",
    marginTop: 4,
    fontSize: 12,
  },

  logoutButton: {
    backgroundColor: "#E2EDE6",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
  },

  logoutText: {
    color: "#155E49",
    fontWeight: "700",
  },

  welcomeCard: {
    backgroundColor: "#155E49",
    padding: 24,
    borderRadius: 22,
    marginBottom: 28,
  },

  welcomeLabel: {
    color: "#B5D8C5",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  welcomeTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
    marginTop: 12,
  },

  welcomeDescription: {
    color: "#D5E9DE",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 9,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#183E32",
    marginBottom: 16,
    marginTop: 22,
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5ECE6",
    minHeight: 110,
    justifyContent: "center",
  },

  statNumber: {
    fontSize: 30,
    fontWeight: "800",
    color: "#155E49",
  },

  statLabel: {
    fontSize: 12,
    color: "#74877B",
    marginTop: 7,
  },

  primaryButton: {
    backgroundColor: "#155E49",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 16,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  infoCard: {
    backgroundColor: "#E8F1EA",
    borderRadius: 17,
    padding: 20,
  },

  infoTitle: {
    color: "#155E49",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 9,
  },

  infoText: {
    color: "#587365",
    fontSize: 13,
    lineHeight: 21,
  },

  errorCard: {
    backgroundColor: "#FCE8E6",
    padding: 15,
    borderRadius: 12,
    marginBottom: 16,
  },

  errorText: {
    color: "#9B2C2C",
    fontSize: 13,
  },

  retryText: {
    color: "#155E49",
    fontWeight: "800",
    marginTop: 10,
  },

  voucherCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5ECE6",
  },

  voucherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  voucherTitle: {
    color: "#183E32",
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },

  voucherStatus: {
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: "hidden",
  },

  activeStatus: {
    backgroundColor: "#E2F3E8",
    color: "#167B4B",
  },

  redeemedStatus: {
    backgroundColor: "#E5EDFF",
    color: "#2563EB",
  },

  expiredStatus: {
    backgroundColor: "#FFF0D8",
    color: "#A45C00",
  },

  voucherDetail: {
    color: "#587365",
    fontSize: 13,
    marginBottom: 6,
  },

  voucherId: {
    color: "#9BAC9F",
    fontSize: 11,
    marginTop: 8,
  },

  shareButton: {
    backgroundColor: "#17765B",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },

  shareButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  disabledButton: {
    opacity: 0.5,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    padding: 22,
    borderRadius: 15,
    alignItems: "center",
  },

  emptyText: {
    color: "#74877B",
    fontSize: 13,
    textAlign: "center",
  },

  footer: {
    textAlign: "center",
    color: "#9BAC9F",
    fontSize: 10,
    marginTop: 30,
    letterSpacing: 1,
  },

  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },

  previewPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    width: "100%",
    maxWidth: 380,
    maxHeight: "95%",
  },

  previewHeading: {
    fontSize: 19,
    fontWeight: "800",
    color: "#183E32",
    textAlign: "center",
  },

  previewDescription: {
    color: "#74877B",
    textAlign: "center",
    fontSize: 12,
    marginVertical: 10,
  },

  previewScrollContent: {
    alignItems: "center",
    paddingBottom: 12,
  },

  captureCard: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5ECE6",
    borderRadius: 12,
    width: "100%",
  },

  captureBrand: {
    fontSize: 23,
    fontWeight: "800",
    color: "#155E49",
  },

  captureSubtitle: {
    color: "#74877B",
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 3,
  },

  qrWhite: {
    padding: 10,
    backgroundColor: "#FFFFFF",
    marginVertical: 12,
  },

  captureMeal: {
    fontSize: 19,
    fontWeight: "800",
    color: "#183E32",
    marginBottom: 6,
  },

  captureDetail: {
    fontSize: 12,
    color: "#304E42",
    marginBottom: 3,
  },

  captureSmall: {
    fontSize: 9,
    color: "#74877B",
    marginTop: 8,
    textAlign: "center",
  },

  signatureBadge: {
    backgroundColor: "#E8F1EA",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 12,
  },

  signatureText: {
    color: "#155E49",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },

  captureNotice: {
    fontSize: 10,
    color: "#60786B",
    textAlign: "center",
    marginTop: 12,
  },

  cancelButton: {
    padding: 12,
    alignItems: "center",
  },

  cancelText: {
    color: "#155E49",
    fontWeight: "700",
  },
});
