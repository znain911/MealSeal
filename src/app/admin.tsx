
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

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);

    try {
      await signOut(auth);
      router.replace("/");
    } catch (error) {
      Alert.alert("Error", "Unable to sign out.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>✦ MealSeal</Text>
            <Text style={styles.subtitle}>Charity Administration</Text>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#155E49" />
            ) : (
              <Text style={styles.logoutText}>Sign Out</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeLabel}>ADMIN DASHBOARD</Text>
          <Text style={styles.welcomeTitle}>Welcome back!</Text>
          <Text style={styles.welcomeDescription}>
            Create and manage digitally signed meal vouchers securely.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Voucher Overview</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Total Vouchers</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Active Vouchers</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Redeemed</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Expired</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Voucher Management</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/create-voucher")}
        >
          <Text style={styles.primaryButtonText}>
            + Create New Voucher
          </Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Digital Signature Security</Text>
          <Text style={styles.infoText}>
            MealSeal will use ECDSA P-256 with SHA-256 to digitally
            sign vouchers and verify their authenticity.
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
