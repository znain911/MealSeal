import { useRouter } from "expo-router";
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

import { Icon } from "@/components/ui/icon";
import { Colors, Radius, Spacing, Type } from "@/constants/theme";
import { signIn } from "@/lib/auth-client";

export default function SignInScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;

    const cleanedEmail = email.trim();

    if (!cleanedEmail || !password) {
      Alert.alert("Missing information", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      const user = await signIn(cleanedEmail, password);

      if (user.role === "CHARITY_ADMIN") {
        router.replace("/admin");
      } else if (user.role === "RESTAURANT_STAFF") {
        router.replace("/staff");
      } else {
        Alert.alert("Access denied", "Your account does not have a valid role.");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      Alert.alert("Sign in failed", error?.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Reset your password",
      "Ask your charity administrator to reset your password for you."
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
        >
          {router.canGoBack() ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityLabel="Back"
            >
              <Icon name="chevronLeft" size={24} color={Colors.light.ink} />
            </TouchableOpacity>
          ) : null}

          <View style={styles.seal}>
            <Icon name="seal" size={30} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in with the email your charity or café registered with MealSeal.
          </Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.org"
                placeholderTextColor={Colors.light.inkTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!loading}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.light.inkTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  <Icon name="eye" size={22} color={Colors.light.inkSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotLink}
              onPress={() => void handleForgotPassword()}
              disabled={loading}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabled]}
            disabled={loading}
            onPress={() => void handleLogin()}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <View style={styles.infoBanner}>
            <Icon name="info" size={20} color={Colors.light.inkSecondary} />
            <Text style={styles.infoText}>
              We’ll take you straight to your charity or café tools after you sign in.
            </Text>
          </View>
        </ScrollView>

        <Text style={styles.footer}>New organisation? Ask your MealSeal coordinator for an invite.</Text>
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
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing["2xl"],
    gap: Spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -Spacing.lg,
    marginBottom: -Spacing.md,
  },
  seal: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...Type.title,
    color: Colors.light.ink,
  },
  subtitle: {
    ...Type.body,
    color: Colors.light.inkSecondary,
    marginTop: -Spacing.md,
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
  input: {
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.light.borderStrong,
    backgroundColor: Colors.light.surface,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    fontWeight: "500",
    color: Colors.light.ink,
  },
  passwordRow: {
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 15,
    paddingRight: 4,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: Colors.light.ink,
    letterSpacing: 2,
  },
  eyeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  forgotLink: {
    alignSelf: "flex-end",
    minHeight: 44,
    justifyContent: "center",
  },
  forgotText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.primary,
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
  infoBanner: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.light.surfaceSunken,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: Colors.light.inkSecondary,
  },
  footer: {
    textAlign: "center",
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xl,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.inkSecondary,
    fontWeight: "500",
  },
});
