
import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { API_BASE_URL } from "./config/api";
import { auth } from "./config/firebase";

export default function CreateVoucherScreen() {
  const router = useRouter();

  const [recipientRef, setRecipientRef] = useState("");
  const [restaurantId, setRestaurantId] = useState("CAFE-01");
  const [mealType, setMealType] = useState("Lunch");
  const [quantity, setQuantity] = useState("1");
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [creating, setCreating] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (event.type === "dismissed") return;

    if (selectedDate) {
      setExpiryDate(selectedDate);
    }
  };

  const handleContinue = async () => {
    if (creating) return;

    if (!recipientRef.trim()) {
      Alert.alert("Missing details", "Enter a recipient reference.");
      return;
    }

    if (!restaurantId.trim()) {
      Alert.alert("Missing details", "Enter a restaurant ID.");
      return;
    }

    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      Alert.alert(
        "Invalid quantity",
        "Enter a quantity between 1 and 20."
      );
      return;
    }

    if (!expiryDate) {
      Alert.alert("Missing expiry date", "Select an expiry date.");
      return;
    }

    const selectedDay = new Date(
      expiryDate.getFullYear(),
      expiryDate.getMonth(),
      expiryDate.getDate()
    );

    const currentDay = new Date();
    currentDay.setHours(0, 0, 0, 0);

    if (selectedDay < currentDay) {
      Alert.alert("Invalid date", "Select today or a future date.");
      return;
    }

    setCreating(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        Alert.alert("Session expired", "Please sign in again.");
        return;
      }

      const idToken = await user.getIdToken();

      const response = await fetch(
        `${API_BASE_URL}/vouchers/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            recipientRef: recipientRef.trim(),
            restaurantId: restaurantId.trim(),
            mealType,
            quantity: qty,
            expiryDate: formatDate(expiryDate),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to create voucher."
        );
      }

      if (
        !data.signedVoucher ||
        !data.signedVoucher.payload ||
        !data.signedVoucher.signature
      ) {
        throw new Error(
          "Voucher was created but signed QR data was not returned."
        );
      }

      // Navigate to the QR screen with the signed voucher.
      router.push({
        pathname: "./voucher-qr",
        params: {
          voucher: JSON.stringify(data.signedVoucher),
        },
      });

    } catch (error: any) {
      console.error("Voucher creation error:", error);

      Alert.alert(
        "Voucher creation failed",
        error?.message || "Please try again."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.brand}>✦ MealSeal</Text>
        </View>

        <Text style={styles.heading}>Create Meal Voucher</Text>
        <Text style={styles.subtitle}>
          Enter the voucher details to create a
          digitally signed meal voucher.
        </Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Recipient Details
          </Text>

          <Text style={styles.label}>
            Recipient Reference *
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. REC-001"
            placeholderTextColor="#9AA9A2"
            value={recipientRef}
            onChangeText={setRecipientRef}
            autoCapitalize="characters"
            editable={!creating}
          />

          <Text style={styles.sectionTitle}>Meal Details</Text>

          <Text style={styles.label}>Restaurant ID *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. CAFE-01"
            placeholderTextColor="#9AA9A2"
            value={restaurantId}
            onChangeText={setRestaurantId}
            autoCapitalize="characters"
            editable={!creating}
          />

          <Text style={styles.label}>Meal Type *</Text>
          <View style={styles.mealRow}>
            {["Breakfast", "Lunch", "Dinner"].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.mealOption,
                  mealType === type && styles.mealSelected,
                ]}
                onPress={() => setMealType(type)}
                disabled={creating}
              >
                <Text
                  style={[
                    styles.mealText,
                    mealType === type && styles.mealTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Number of Meals *</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            placeholder="1"
            placeholderTextColor="#9AA9A2"
            editable={!creating}
          />

          <Text style={styles.sectionTitle}>Voucher Validity</Text>
          <Text style={styles.label}>Expiry Date *</Text>

          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
            disabled={creating}
          >
            <Text
              style={[
                styles.dateText,
                !expiryDate && styles.placeholderText,
              ]}
            >
              {expiryDate
                ? formatDate(expiryDate)
                : "Select expiry date"}
            </Text>
            <Text style={styles.calendarIcon}>📅</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={expiryDate || new Date()}
                mode="date"
                display={
                  Platform.OS === "ios" ? "inline" : "calendar"
                }
                minimumDate={today}
                onChange={handleDateChange}
              />

              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={styles.helper}>
            Select today or a future date.
          </Text>
        </View>

        <View style={styles.securityCard}>
          <Text style={styles.securityTitle}>
            🔒 Digital Signature Protection
          </Text>
          <Text style={styles.securityDescription}>
            MealSeal uses ECDSA P-256 and SHA-256
            to protect voucher authenticity and integrity.
            Digital signing is performed by the trusted
            Node.js backend.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.createButton,
            creating && styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={creating}
        >
          {creating ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.createButtonText}>
                Creating & Signing...
              </Text>
            </View>
          ) : (
            <Text style={styles.createButtonText}>
              Create & Sign Voucher →
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footer}>
          MEALSEAL • SECURE VOUCHER PLATFORM
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  backButton: {
    backgroundColor: "#E3EEE6",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
  },
  backText: {
    color: "#155E49",
    fontWeight: "700",
  },
  brand: {
    fontSize: 21,
    fontWeight: "800",
    color: "#155E49",
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#183E32",
    marginBottom: 10,
  },
  subtitle: {
    color: "#73877B",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E4ECE5",
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#155E49",
    marginTop: 8,
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#304E42",
    marginBottom: 9,
  },
  input: {
    height: 54,
    borderRadius: 13,
    backgroundColor: "#F7F9F6",
    borderWidth: 1,
    borderColor: "#E1E9E1",
    paddingHorizontal: 15,
    color: "#193D32",
    fontSize: 15,
    marginBottom: 20,
  },
  mealRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 22,
  },
  mealOption: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#DDE8DF",
    alignItems: "center",
  },
  mealSelected: {
    backgroundColor: "#155E49",
    borderColor: "#155E49",
  },
  mealText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#587365",
  },
  mealTextSelected: {
    color: "#FFFFFF",
  },
  dateInput: {
    height: 54,
    borderRadius: 13,
    backgroundColor: "#F7F9F6",
    borderWidth: 1,
    borderColor: "#E1E9E1",
    paddingHorizontal: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dateText: {
    color: "#193D32",
    fontSize: 15,
  },
  placeholderText: {
    color: "#9AA9A2",
  },
  calendarIcon: {
    fontSize: 21,
  },
  pickerContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 15,
    overflow: "hidden",
  },
  doneButton: {
    alignSelf: "flex-end",
    backgroundColor: "#155E49",
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 10,
  },
  doneText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  helper: {
    color: "#839589",
    fontSize: 12,
    lineHeight: 18,
  },
  securityCard: {
    backgroundColor: "#E8F1EA",
    borderRadius: 17,
    padding: 20,
    marginBottom: 22,
  },
  securityTitle: {
    color: "#155E49",
    fontWeight: "800",
    fontSize: 15,
    marginBottom: 9,
  },
  securityDescription: {
    color: "#587365",
    fontSize: 13,
    lineHeight: 21,
  },
  createButton: {
    backgroundColor: "#155E49",
    borderRadius: 15,
    paddingVertical: 19,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
  },
  disabledButton: {
    opacity: 0.65,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  footer: {
    textAlign: "center",
    color: "#9BAC9F",
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 30,
  },
});
