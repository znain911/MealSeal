
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { useState } from "react";

import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "./config/firebase";

export default function StaffDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);

    try {
      await signOut(auth);
      router.replace("/");
    } catch {
      Alert.alert(
        "Error",
        "Unable to sign out."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>
              ✦ MealSeal
            </Text>

            <Text style={styles.subtitle}>
              Restaurant Staff
            </Text>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#155E49" />
            ) : (
              <Text style={styles.logoutText}>
                Sign Out
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeLabel}>
            RESTAURANT DASHBOARD
          </Text>

          <Text style={styles.welcomeTitle}>
            Welcome back!
          </Text>

          <Text style={styles.welcomeDescription}>
            Verify digitally signed meal vouchers
            before providing meals to recipients.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Voucher Verification
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            router.push("/scan-voucher")
          }
        >
          <Text style={styles.primaryButtonText}>
            Scan Voucher QR Code
          </Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Digital Signature Verification
          </Text>

          <Text style={styles.infoText}>
            Every voucher is protected using an
            ECDSA P-256 digital signature and SHA-256.
            MealSeal verifies the signature, restaurant,
            expiry and redemption status before a
            voucher can be redeemed.
          </Text>
        </View>

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
  },
  primaryButton: {
    backgroundColor: "#155E49",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 20,
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
  footer: {
    textAlign: "center",
    color: "#9BAC9F",
    fontSize: 10,
    marginTop: 30,
    letterSpacing: 1,
  },
});
