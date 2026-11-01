import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FoodShareAnimation } from "@/components/ui/food-share-animation";
import { Icon } from "@/components/ui/icon";
import { IconName } from "@/constants/icons";
import { Colors, Radius, Spacing, Type } from "@/constants/theme";
import { signIn } from "@/lib/auth-client";

type Category = "ADMIN" | "CAFE";

/**
 * Demo-build quick sign-in. MealSeal is an assignment prototype, not a production deployment —
 * these credentials match the backend's own seeded demo accounts (DatabaseSeeder.cs) and are
 * deliberately shipped in the client so the app is easy to hand to someone else to try, without
 * needing to share real login details out of band. A "Sign in manually" option is kept alongside
 * it for anyone who'd rather type an email/password.
 */
const DEMO_ACCOUNTS: {
  category: Category;
  label: string;
  subtitle: string;
  email: string;
  password: string;
  icon: IconName;
}[] = [
  {
    category: "ADMIN",
    label: "Charity admin",
    subtitle: "Create and manage vouchers",
    email: "admin@mealseal.local",
    password: "ChangeMe123!",
    icon: "seal",
  },
  {
    category: "CAFE",
    label: "Hillside Café staff",
    subtitle: "Scan and redeem vouchers",
    email: "hillside@mealseal.local",
    password: "ChangeMe123!",
    icon: "cafe",
  },
  {
    category: "CAFE",
    label: "Riverside Kitchen staff",
    subtitle: "Scan and redeem vouchers",
    email: "riverside@mealseal.local",
    password: "ChangeMe123!",
    icon: "cafe",
  },
  {
    category: "CAFE",
    label: "The Corner Cup staff",
    subtitle: "Scan and redeem vouchers",
    email: "corner@mealseal.local",
    password: "ChangeMe123!",
    icon: "cafe",
  },
];

const CATEGORIES: { key: Category; label: string; icon: IconName }[] = [
  { key: "ADMIN", label: "Charity admin", icon: "seal" },
  { key: "CAFE", label: "Café staff", icon: "cafe" },
];

export default function LandingScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<Category>("ADMIN");
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);

  const handleQuickLogin = async (email: string, password: string) => {
    if (loadingEmail) return;
    setLoadingEmail(email);

    try {
      const user = await signIn(email, password);
      router.replace(user.role === "CHARITY_ADMIN" ? "/admin" : "/staff");
    } catch {
      // A demo account failing to sign in almost always means the backend hasn't been redeployed
      // with these seeded accounts yet — manual sign-in is right there as a fallback.
      setLoadingEmail(null);
    }
  };

  const visibleAccounts = DEMO_ACCOUNTS.filter((account) => account.category === category);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.brandRow}>
            <View style={styles.brandSeal}>
              <Icon name="seal" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.brandText}>MealSeal</Text>
          </View>
          <FoodShareAnimation />
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>Meals shared with care</Text>
          <Text style={styles.subtitle}>
            MealSeal connects charities and cafés so a meal can move from someone who can give to
            someone who needs it — safely, and with dignity.
          </Text>
        </View>

        <View style={styles.quickLogin}>
          <Text style={styles.sectionLabel}>Who's signing in?</Text>

          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const selected = cat.key === category;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.categoryPill, selected && styles.categoryPillActive]}
                  onPress={() => setCategory(cat.key)}
                  disabled={loadingEmail !== null}
                >
                  <Icon name={cat.icon} size={16} color={selected ? "#FFFFFF" : Colors.light.inkSecondary} />
                  <Text style={[styles.categoryPillText, selected && styles.categoryPillTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {visibleAccounts.map((account) => {
            const isLoading = loadingEmail === account.email;
            return (
              <TouchableOpacity
                key={account.email}
                style={styles.accountRow}
                onPress={() => void handleQuickLogin(account.email, account.password)}
                disabled={loadingEmail !== null}
              >
                <View style={styles.accountIcon}>
                  <Icon name={account.icon} size={20} color={Colors.light.primary} />
                </View>
                <View style={styles.accountText}>
                  <Text style={styles.accountLabel}>{account.label}</Text>
                  <Text style={styles.accountSubtitle}>{account.subtitle}</Text>
                </View>
                {isLoading ? (
                  <ActivityIndicator color={Colors.light.primary} />
                ) : (
                  <Icon name="chevronRight" size={20} color={Colors.light.inkTertiary} />
                )}
              </TouchableOpacity>
            );
          })}
          <Text style={styles.demoNote}>
            Demo build — these buttons sign in with published test accounts, not real credentials.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.manualButton}
          onPress={() => router.push("/sign-in")}
          disabled={loadingEmail !== null}
        >
          <Text style={styles.manualButtonText}>Sign in manually</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.canvas,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing["2xl"],
    gap: Spacing.lg,
  },
  heroCard: {
    backgroundColor: "#F9BB4C",
    borderRadius: Radius.lg,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
    overflow: "hidden",
  },
  brandRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: -Spacing.sm,
  },
  brandSeal: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    ...Type.heading,
    color: Colors.light.ink,
  },
  hero: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    ...Type.title,
    color: Colors.light.ink,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    color: Colors.light.inkSecondary,
    textAlign: "center",
    maxWidth: 320,
  },
  quickLogin: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    ...Type.heading,
    color: Colors.light.ink,
  },
  categoryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  categoryPillActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.inkSecondary,
  },
  categoryPillTextActive: {
    color: "#FFFFFF",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Radius.md,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.light.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  accountText: {
    flex: 1,
  },
  accountLabel: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700",
    color: Colors.light.ink,
  },
  accountSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: Colors.light.inkSecondary,
  },
  demoNote: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.inkTertiary,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  manualButton: {
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.light.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  manualButtonText: {
    ...Type.button,
    color: Colors.light.primary,
  },
});
