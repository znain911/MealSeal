import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { Colors, Radius, Spacing, Type } from "@/constants/theme";
import { CAFE_OPTIONS } from "@/constants/cafes";
import { getAccessToken } from "@/lib/auth-client";
import { parseJsonResponse } from "@/lib/api";

import { API_BASE_URL } from "./config/api";

type MealType = "Breakfast" | "Lunch" | "Dinner";
type Step = "form" | "review";

const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner"];

// Computed once at module load, not during render — a sensible default expiry (today + 7 days).
const DEFAULT_EXPIRY_DATE = formatLocalDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

function generateRecipientRef(): string {
  const digits = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return `R-${digits}`;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function CreateVoucherScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");
  // Auto-generated once on mount, not user-typed — see generateRecipientRef().
  const [recipientRef, setRecipientRef] = useState(generateRecipientRef);
  const [restaurantId, setRestaurantId] = useState(CAFE_OPTIONS[0].id);
  const [mealType, setMealType] = useState<MealType>("Lunch");
  const [quantity, setQuantity] = useState(1);
  const [expiryDate, setExpiryDate] = useState(DEFAULT_EXPIRY_DATE);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const goToReview = () => setStep("review");

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Please sign in again.");

      const response = await fetch(`${API_BASE_URL}/vouchers/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientRef: recipientRef.trim(),
          restaurantId: restaurantId.trim(),
          mealType,
          quantity,
          expiryDate,
        }),
      });

      const result = await parseJsonResponse<{ signedVoucher?: any }>(response);

      if (!result.signedVoucher) {
        throw new Error("Unable to create voucher.");
      }

      const signedVoucher = result.signedVoucher;

      router.replace({
        pathname: "/voucher-qr",
        params: {
          signedVoucher: JSON.stringify(signedVoucher),
          voucherId: signedVoucher.payload.voucherId,
        },
      });
    } catch (error: any) {
      console.error("Create voucher error:", error);
      Alert.alert("Voucher creation", error?.message || "Unable to create voucher.");
    } finally {
      setLoading(false);
    }
  };

  const selectedCafe = CAFE_OPTIONS.find((c) => c.id === restaurantId) ?? CAFE_OPTIONS[0];

  const reviewRows = [
    { k: "Recipient reference", v: recipientRef },
    { k: "Café", v: `${selectedCafe.name} (${selectedCafe.id})` },
    { k: "Meal", v: mealType },
    { k: "Quantity", v: String(quantity) },
    { k: "Issued", v: "Today" },
    { k: "Expires", v: formatDisplayDate(expiryDate) },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => (step === "review" ? setStep("form") : router.back())}
            disabled={loading}
          >
            <Icon
              name={step === "review" ? "chevronLeft" : "close"}
              size={24}
              color={Colors.light.ink}
            />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>
            {step === "review" ? "Check the details" : "New voucher"}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === "form" ? (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Recipient reference</Text>
                <View style={styles.autoField}>
                  <Text style={styles.autoFieldText}>{recipientRef}</Text>
                  <View style={styles.autoRow}>
                    <TouchableOpacity
                      style={styles.regenerateButton}
                      onPress={() => setRecipientRef(generateRecipientRef())}
                      disabled={loading}
                      accessibilityLabel="Generate a new reference"
                    >
                      <Icon name="refresh" size={16} color={Colors.light.primary} />
                    </TouchableOpacity>
                    <Text style={styles.autoBadge}>AUTO</Text>
                  </View>
                </View>
                <Text style={styles.helper}>Your internal reference — no names needed.</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Assigned café</Text>
                <View style={styles.chipRow}>
                  {CAFE_OPTIONS.map((cafe) => {
                    const selected = restaurantId === cafe.id;
                    return (
                      <TouchableOpacity
                        key={cafe.id}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => setRestaurantId(cafe.id)}
                        disabled={loading}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {cafe.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Meal type</Text>
                <View style={styles.chipRow}>
                  {MEAL_TYPES.map((meal) => {
                    const selected = mealType === meal;
                    return (
                      <TouchableOpacity
                        key={meal}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => setMealType(meal)}
                        disabled={loading}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {meal}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Quantity</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepperButton}
                    onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={loading}
                  >
                    <Icon name="minus" size={20} color={Colors.light.ink} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.stepperButton}
                    onPress={() => setQuantity((q) => Math.min(20, q + 1))}
                    disabled={loading}
                  >
                    <Icon name="plus" size={20} color={Colors.light.ink} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Expiry date</Text>
                <TouchableOpacity
                  style={styles.dateField}
                  onPress={() => setShowDatePicker(true)}
                  disabled={loading}
                >
                  <Icon name="calendar" size={20} color={Colors.light.inkSecondary} />
                  <Text style={styles.dateFieldText}>{formatDisplayDate(expiryDate)}</Text>
                </TouchableOpacity>
                {showDatePicker ? (
                  <DateTimePicker
                    value={new Date(expiryDate)}
                    mode="date"
                    minimumDate={new Date()}
                    onChange={(_, selected) => {
                      setShowDatePicker(Platform.OS === "ios");
                      if (selected) setExpiryDate(formatLocalDate(selected));
                    }}
                  />
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.reviewBlock}>
              <View style={styles.reviewCard}>
                {reviewRows.map((row, index) => (
                  <View key={row.k} style={[styles.reviewRow, index > 0 && styles.reviewRowDivider]}>
                    <Text style={styles.reviewKey}>{row.k}</Text>
                    <Text style={styles.reviewValue}>{row.v}</Text>
                  </View>
                ))}
                <TouchableOpacity style={styles.editLink} onPress={() => setStep("form")}>
                  <Text style={styles.editLinkText}>Edit details</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.trustBanner}>
                <Icon name="seal" size={22} color={Colors.light.primaryPressed} />
                <Text style={styles.trustBannerText}>
                  When you confirm, MealSeal digitally signs this voucher. It can be redeemed once,
                  only at {selectedCafe.name}, until {formatDisplayDate(expiryDate)}.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabled]}
            disabled={loading}
            onPress={() => (step === "form" ? goToReview() : void handleConfirm())}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {step === "form" ? "Review voucher" : "Confirm and create QR"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.canvas,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    minHeight: 52,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    ...Type.heading,
    color: Colors.light.ink,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xl,
  },
  form: {
    gap: Spacing.md,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: Colors.light.ink,
  },
  helper: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.inkSecondary,
  },
  autoField: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.light.surfaceSunken,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
  },
  autoFieldText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.ink,
  },
  autoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  regenerateButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  autoBadge: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: Colors.light.inkSecondary,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.borderStrong,
  },
  chipSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.ink,
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  stepper: {
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.light.borderStrong,
    backgroundColor: Colors.light.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.light.surfaceSunken,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.ink,
  },
  dateField: {
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.light.borderStrong,
    backgroundColor: Colors.light.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  dateFieldText: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.light.ink,
  },
  reviewBlock: {
    gap: Spacing.xl,
  },
  reviewCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  reviewRowDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  reviewKey: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: Colors.light.inkSecondary,
  },
  reviewValue: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700",
    color: Colors.light.ink,
    textAlign: "right",
  },
  editLink: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    marginTop: Spacing.xs,
  },
  editLinkText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.primary,
  },
  trustBanner: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.light.primarySubtle,
  },
  trustBannerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: Colors.light.primaryPressed,
  },
  footer: {
    padding: Spacing.lg,
    paddingBottom: Spacing["2xl"],
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.canvas,
  },
  primaryButton: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    ...Type.button,
    color: "#FFFFFF",
  },
  disabled: {
    opacity: 0.5,
  },
});
