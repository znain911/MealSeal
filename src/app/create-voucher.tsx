
import { useRouter } from "expo-router";
import { useState } from "react";
import { API_BASE_URL } from "./config/api";
import { auth } from "./config/firebase";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

type MealType = "Breakfast" | "Lunch" | "Dinner";

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

type CreateVoucherResponse = {
  success: boolean;
  message?: string;
  voucherId?: string;
  signedVoucher?: SignedVoucher;
};

const MEAL_TYPES: MealType[] = [
  "Breakfast",
  "Lunch",
  "Dinner",
];

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export default function CreateVoucherScreen() {
  const router = useRouter();

  const [recipientRef, setRecipientRef] = useState("");
  const [restaurantId, setRestaurantId] = useState("CAFE-01");

  const [mealType, setMealType] =
    useState<MealType>("Lunch");

  const [quantity, setQuantity] = useState("1");

  const [expiryDate, setExpiryDate] = useState(
    formatLocalDate(
      new Date(Date.now() + 24 * 60 * 60 * 1000)
    )
  );

  const [loading, setLoading] = useState(false);

  const handleCreateVoucher = async () => {
    if (loading) {
      return;
    }

    const recipient = recipientRef.trim();
    const restaurant = restaurantId.trim();
    const numericQuantity = Number(quantity);

    if (!recipient) {
      Alert.alert(
        "Missing Information",
        "Please enter the recipient reference."
      );
      return;
    }

    if (!restaurant) {
      Alert.alert(
        "Missing Information",
        "Please enter the restaurant ID."
      );
      return;
    }

    if (
      !Number.isInteger(numericQuantity) ||
      numericQuantity < 1 ||
      numericQuantity > 20
    ) {
      Alert.alert(
        "Invalid Quantity",
        "Quantity must be a whole number between 1 and 20."
      );
      return;
    }

    if (!isValidDate(expiryDate.trim())) {
      Alert.alert(
        "Invalid Date",
        "Please enter the expiry date in YYYY-MM-DD format."
      );
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Please sign in again.");
      }

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_BASE_URL}/vouchers/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            recipientRef: recipient,
            restaurantId: restaurant,
            mealType,
            quantity: numericQuantity,
            expiryDate: expiryDate.trim(),
          }),
        }
      );

      const responseText = await response.text();

      let result: CreateVoucherResponse;

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Backend returned an invalid response (HTTP ${response.status}).`
        );
      }

      if (
        !response.ok ||
        !result.success ||
        !result.signedVoucher
      ) {
        throw new Error(
          result.message || "Unable to create voucher."
        );
      }

      const signedVoucher = result.signedVoucher;

      if (
        !signedVoucher.payload?.voucherId ||
        !signedVoucher.signature ||
        !signedVoucher.algorithm ||
        !signedVoucher.keyId
      ) {
        throw new Error(
          "The backend created the voucher but returned incomplete signed data. Check the Admin Dashboard before trying again."
        );
      }

      // IMPORTANT:
      // Pass the complete signed voucher to the QR page.
      router.replace({
        pathname: "/voucher-qr",
        params: {
          signedVoucher: JSON.stringify(signedVoucher),
          voucherId: signedVoucher.payload.voucherId,
        },
      });
    } catch (error: any) {
      console.error("Create voucher error:", error);

      Alert.alert(
        "Voucher Creation",
        error?.message || "Unable to create voucher."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios" ? "padding" : "height"
        }
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.brand}>✦ MealSeal</Text>

            <TouchableOpacity
              onPress={() => router.replace("/admin")}
              disabled={loading}
            >
              <Text style={styles.backLink}>Dashboard</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.pageLabel}>
              CHARITY ADMINISTRATION
            </Text>

            <Text style={styles.pageTitle}>
              Create Meal Voucher
            </Text>

            <Text style={styles.pageDescription}>
              Enter the recipient and meal information.
              MealSeal will generate a digitally signed
              voucher and a shareable QR code.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>
              Recipient Reference
            </Text>

            <TextInput
              style={styles.input}
              value={recipientRef}
              onChangeText={setRecipientRef}
              placeholder="e.g. REC-001"
              placeholderTextColor="#9BAC9F"
              autoCapitalize="characters"
              editable={!loading}
            />

            <Text style={styles.fieldLabel}>
              Restaurant ID
            </Text>

            <TextInput
              style={styles.input}
              value={restaurantId}
              onChangeText={setRestaurantId}
              placeholder="e.g. CAFE-01"
              placeholderTextColor="#9BAC9F"
              autoCapitalize="characters"
              editable={!loading}
            />

            <Text style={styles.fieldLabel}>
              Meal Type
            </Text>

            <View style={styles.mealRow}>
              {MEAL_TYPES.map((meal) => (
                <TouchableOpacity
                  key={meal}
                  style={[
                    styles.mealOption,
                    mealType === meal &&
                      styles.mealOptionSelected,
                  ]}
                  onPress={() => setMealType(meal)}
                  disabled={loading}
                >
                  <Text
                    style={[
                      styles.mealOptionText,
                      mealType === meal &&
                        styles.mealOptionTextSelected,
                    ]}
                  >
                    {meal}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>
              Quantity
            </Text>

            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor="#9BAC9F"
              editable={!loading}
            />

            <Text style={styles.fieldLabel}>
              Expiry Date
            </Text>

            <TextInput
              style={styles.input}
              value={expiryDate}
              onChangeText={setExpiryDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9BAC9F"
              keyboardType="numbers-and-punctuation"
              editable={!loading}
            />

            <Text style={styles.helperText}>
              Format: YYYY-MM-DD. The backend uses
              midnight UTC after the selected date
              as the expiry time.
            </Text>

            <TouchableOpacity
              style={[
                styles.createButton,
                loading && styles.disabledButton,
              ]}
              disabled={loading}
              onPress={() => void handleCreateVoucher()}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>
                  Generate Signed Voucher
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.securityCard}>
            <Text style={styles.securityTitle}>
              Digital Signature Protection
            </Text>

            <Text style={styles.securityText}>
              Vouchers are signed by the MealSeal
              backend using ECDSA P-256 with SHA-256.
              The private signing key stays on the
              server and is never included in the QR.
            </Text>
          </View>

          <Text style={styles.footer}>
            MEALSEAL • SECURE MEAL VOUCHER PLATFORM
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F1",
  },

  keyboardContainer: {
    flex: 1,
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
    fontSize: 14,
    fontWeight: "700",
  },

  titleSection: {
    marginBottom: 24,
  },

  pageLabel: {
    fontSize: 11,
    color: "#638675",
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  pageTitle: {
    color: "#183E32",
    fontSize: 27,
    fontWeight: "800",
    marginTop: 10,
  },

  pageDescription: {
    color: "#74877B",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 10,
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5ECE6",
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#304E42",
    marginBottom: 9,
  },

  input: {
    borderWidth: 1,
    borderColor: "#DDE7DF",
    backgroundColor: "#FAFCFA",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    fontSize: 15,
    color: "#183E32",
    marginBottom: 20,
  },

  mealRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 22,
  },

  mealOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DDE7DF",
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: "center",
  },

  mealOptionSelected: {
    backgroundColor: "#155E49",
    borderColor: "#155E49",
  },

  mealOptionText: {
    fontSize: 12,
    color: "#587365",
    fontWeight: "700",
  },

  mealOptionTextSelected: {
    color: "#FFFFFF",
  },

  helperText: {
    color: "#87998D",
    fontSize: 11,
    lineHeight: 17,
    marginTop: -10,
    marginBottom: 20,
  },

  createButton: {
    backgroundColor: "#155E49",
    borderRadius: 14,
    padding: 17,
    alignItems: "center",
  },

  createButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  disabledButton: {
    opacity: 0.5,
  },

  securityCard: {
    backgroundColor: "#E8F1EA",
    borderRadius: 15,
    padding: 19,
    marginTop: 22,
  },

  securityTitle: {
    color: "#155E49",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 9,
  },

  securityText: {
    color: "#587365",
    fontSize: 12,
    lineHeight: 20,
  },

  footer: {
    color: "#9BAC9F",
    textAlign: "center",
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 30,
  },
});
