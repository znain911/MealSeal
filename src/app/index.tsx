
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Keyboard,
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
import { API_BASE_URL } from "./config/api";
import { auth } from "./config/firebase";

type ApiProfile = {
  success?: boolean;
  role?: string;
  restaurantId?: string | null;
  message?: string;
};

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;

    const cleanedEmail = email.trim();

    if (!cleanedEmail || !password) {
      Alert.alert(
        "Missing Information",
        "Please enter your email and password."
      );
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        cleanedEmail,
        password
      );

      const token = await credential.user.getIdToken();
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const responseText = await response.text();
      let profile: ApiProfile = {};

      if (responseText) {
        try {
          profile = JSON.parse(responseText);
        } catch {
          throw Object.assign(
            new Error(
              `Backend returned an invalid response (HTTP ${response.status}).`
            ),
            { code: "api/invalid-response" }
          );
        }
      }

      if (!response.ok || profile.success !== true) {
        await signOut(auth);
        throw Object.assign(
          new Error(
            profile.message ||
              "Your account does not have an active MealSeal API profile."
          ),
          { code: "api/profile-unavailable" }
        );
      }

      if (profile.role === "CHARITY_ADMIN") {
        router.replace("/admin");
      } else if (profile.role === "RESTAURANT_STAFF") {
        router.replace("/staff");
      } else {
        await signOut(auth);

        Alert.alert(
          "Access Denied",
          "Your account does not have a valid role."
        );
      }
    } catch (error: any) {
      console.error("Login error:", error);

      let message =
        "Unable to sign in. Please try again.";

      if (
        error?.code === "auth/invalid-credential" ||
        error?.code === "auth/wrong-password" ||
        error?.code === "auth/user-not-found"
      ) {
        message = "Incorrect email or password.";
      } else if (error?.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (error?.code === "auth/too-many-requests") {
        message =
          "Too many attempts. Please try again later.";
      } else if (error?.code === "auth/network-request-failed") {
        message =
          "Network error. Please check your internet connection.";
      } else if (error?.code?.startsWith("api/")) {
        message = error.message;
      } else if (error?.message === "Network request failed") {
        message =
          "Cannot connect to the MealSeal API. Please try again shortly.";
      }

      Alert.alert("Login Failed", message);
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
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios"
              ? "interactive"
              : "on-drag"
          }
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={
            Platform.OS === "ios"
          }
        >
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>✦</Text>
            </View>

            <Text style={styles.brand}>MealSeal</Text>

            <Text style={styles.tagline}>
              Secure Digital Meal Vouchers
            </Text>
          </View>

          <View style={styles.loginCard}>
            <Text style={styles.welcomeTitle}>
              Welcome Back
            </Text>

            <Text style={styles.welcomeDescription}>
              Sign in to securely manage or verify
              digitally signed meal vouchers.
            </Text>

            <Text style={styles.label}>
              Email Address
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#9AA99E"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              editable={!loading}
              returnKeyType="next"
            />

            <Text style={styles.label}>
              Password
            </Text>

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#9AA99E"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={() => {
                  void handleLogin();
                }}
              />

              <TouchableOpacity
                onPress={() =>
                  setShowPassword((previous) => !previous)
                }
                disabled={loading}
                style={styles.showPasswordButton}
              >
                <Text style={styles.showPasswordText}>
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                loading && styles.disabledButton,
              ]}
              disabled={loading}
              onPress={() => {
                void handleLogin();
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>
                  Sign In
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.securityBox}>
              <Text style={styles.securityTitle}>
                Secure Authentication
              </Text>

              <Text style={styles.securityDescription}>
                Access is protected by Firebase
                Authentication and role-based
                authorization.
              </Text>
            </View>
          </View>

          <View style={styles.footerSection}>
            <Text style={styles.footerText}>
              MEALSEAL • SECURE MEAL VOUCHER PLATFORM
            </Text>

            <Text style={styles.footerSubtext}>
              ECDSA P-256 • SHA-256
            </Text>
          </View>
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

  scrollView: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 40,
    justifyContent: "center",
  },

  logoSection: {
    alignItems: "center",
    marginBottom: 30,
  },

  logoCircle: {
    width: 75,
    height: 75,
    borderRadius: 25,
    backgroundColor: "#155E49",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  logoIcon: {
    fontSize: 38,
    color: "#FFFFFF",
  },

  brand: {
    fontSize: 34,
    fontWeight: "800",
    color: "#155E49",
  },

  tagline: {
    fontSize: 14,
    color: "#74877B",
    marginTop: 7,
    textAlign: "center",
  },

  loginCard: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5ECE6",
  },

  welcomeTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#183E32",
    marginBottom: 8,
  },

  welcomeDescription: {
    fontSize: 13,
    color: "#74877B",
    lineHeight: 21,
    marginBottom: 25,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#304E42",
    marginBottom: 9,
  },

  input: {
    height: 54,
    borderWidth: 1,
    borderColor: "#DDE7DF",
    borderRadius: 13,
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#183E32",
    backgroundColor: "#FAFCFA",
    marginBottom: 20,
  },

  passwordContainer: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDE7DF",
    borderRadius: 13,
    backgroundColor: "#FAFCFA",
    marginBottom: 25,
  },

  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#183E32",
  },

  showPasswordButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
  },

  showPasswordText: {
    color: "#155E49",
    fontSize: 13,
    fontWeight: "700",
  },

  loginButton: {
    backgroundColor: "#155E49",
    height: 55,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  disabledButton: {
    opacity: 0.6,
  },

  securityBox: {
    backgroundColor: "#E8F1EA",
    padding: 16,
    borderRadius: 13,
    marginTop: 23,
  },

  securityTitle: {
    color: "#155E49",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6,
  },

  securityDescription: {
    color: "#587365",
    fontSize: 12,
    lineHeight: 19,
  },

  footerSection: {
    alignItems: "center",
    marginTop: 30,
  },

  footerText: {
    color: "#9BAC9F",
    fontSize: 10,
    letterSpacing: 0.8,
    textAlign: "center",
  },

  footerSubtext: {
    color: "#9BAC9F",
    fontSize: 11,
    marginTop: 8,
  },
});
