
import { useRouter } from "expo-router";
import {
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useState } from "react";
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
import { auth, db } from "./config/firebase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();
 // const navigatingRef = useRef(false);

  



  
const handleLogin = async () => {
  if (!email.trim() || !password) {
    Alert.alert("Missing details", "Enter your email and password.");
    return;
  }

  setLoading(true);

  try {
    const result = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    const userDoc = await getDoc(
      doc(db, "users", result.user.uid)
    );

    const userData = userDoc.data();

    if (
      !userDoc.exists() ||
      userData?.active !== true ||
      !["CHARITY_ADMIN", "RESTAURANT_STAFF"].includes(userData.role)
    ) {
      await signOut(auth);
      Alert.alert("Access denied", "Your account is not authorised.");
      return;
    }

    if (userData.role === "CHARITY_ADMIN") {
      router.replace("/admin");
    } else {
      setRole("RESTAURANT_STAFF");
    }

  } catch (error: any) {
    console.error("Login error:", error);

    Alert.alert(
      "Sign in failed",
      error?.message || "Please try again."
    );
  } finally {
    setLoading(false);
  }
};


  if (role) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.welcomeContainer}>
          <Text style={styles.logo}>✦ MealSeal</Text>
          <Text style={styles.welcomeTitle}>
            Welcome!
          </Text>
          <Text style={styles.welcomeSubtitle}>
            {role === "CHARITY_ADMIN"
              ? "Charity Admin Dashboard"
              : "Restaurant Staff Dashboard"}
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={async () => {
              await signOut(auth);
              setRole(null);
              setPassword("");
            }}
          >
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoSymbol}>✦</Text>
            </View>
            <Text style={styles.brandName}>MealSeal</Text>
            <Text style={styles.tagline}>
              Secure meals. Trusted giving.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.description}>
              Sign in to manage and redeem secure meal vouchers.
            </Text>

            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9AA9A2"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordBox}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#9AA9A2"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.showText}>
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Sign In  →</Text>
              )}
            </TouchableOpacity>

            <View style={styles.secureRow}>
              <Text style={styles.secureText}>
                🔒 Protected with Firebase Authentication
              </Text>
            </View>
          </View>

          <Text style={styles.footer}>
            MEALSEAL  •  SECURE VOUCHER PLATFORM
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
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  brand: {
    alignItems: "center",
    marginBottom: 35,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: "#155E49",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  logoSymbol: {
    fontSize: 42,
    color: "#FFFFFF",
  },
  brandName: {
    fontSize: 34,
    fontWeight: "800",
    color: "#153E32",
    letterSpacing: -1,
  },
  tagline: {
    marginTop: 7,
    fontSize: 14,
    color: "#74877B",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 25,
    borderWidth: 1,
    borderColor: "#E8EEE8",
    elevation: 3,
  },
  heading: {
    fontSize: 25,
    fontWeight: "800",
    color: "#183E32",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: "#7B8D82",
    marginBottom: 28,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#304E42",
    marginBottom: 9,
  },
  input: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#F7F9F6",
    borderWidth: 1,
    borderColor: "#E1E9E1",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#193D32",
    marginBottom: 20,
  },
  passwordBox: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#F7F9F6",
    borderWidth: 1,
    borderColor: "#E1E9E1",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 26,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: "#193D32",
  },
  showText: {
    color: "#17765B",
    fontWeight: "700",
    fontSize: 13,
  },
  button: {
    backgroundColor: "#155E49",
    height: 55,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secureRow: {
    alignItems: "center",
    marginTop: 22,
  },
  secureText: {
    fontSize: 11,
    color: "#8A9B91",
  },
  footer: {
    textAlign: "center",
    marginTop: 35,
    fontSize: 10,
    letterSpacing: 1.5,
    color: "#A2B1A6",
    fontWeight: "700",
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 28,
  },
  logo: {
    fontSize: 24,
    fontWeight: "800",
    color: "#155E49",
  },
  welcomeTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#183E32",
    marginTop: 25,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: "#60786B",
    marginVertical: 20,
  },
});
