import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";

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

import { SafeAreaView } from "react-native-safe-area-context";

import { BottomTabBar } from "@/components/ui/bottom-tab-bar";
import { Icon } from "@/components/ui/icon";
import { StatusChip } from "@/components/ui/status-chip";
import { StatusTokens, voucherStatusToken } from "@/constants/status";
import { Colors, Radius, Spacing, Type } from "@/constants/theme";
import { signOut as authSignOut, getCurrentUser } from "@/lib/auth-client";
import { fetchVouchers, Voucher } from "@/lib/vouchers";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function isWithinLastWeek(value: string | null | undefined): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= 1000 * 60 * 60 * 24 * 7;
}

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [summary, setSummary] = useState({ activeCount: 0, expiringCount: 0, mealsThisWeek: 0 });
  const [error, setError] = useState("");
  const [emailName, setEmailName] = useState("there");

  const load = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const fetched = await fetchVouchers();
      setVouchers(fetched);

      const now = Date.now();
      setSummary({
        activeCount: fetched.filter((v) => v.status === "ACTIVE" && v.expiresAt > now).length,
        expiringCount: fetched.filter(
          (v) => voucherStatusToken(v.status, v.expiresAt).label === "Expiring soon"
        ).length,
        mealsThisWeek: fetched
          .filter((v) => v.status === "REDEEMED" && isWithinLastWeek(v.redeemedAt))
          .reduce((sum, v) => sum + v.quantity, 0),
      });
    } catch (err: any) {
      console.error("Dashboard loading error:", err);
      setError(err?.message || "Unable to load dashboard.");
      setVouchers([]);
      setSummary({ activeCount: 0, expiringCount: 0, mealsThisWeek: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      void getCurrentUser().then((user) => {
        if (user?.email) setEmailName(user.email.split("@")[0]);
      });
    }, [load])
  );

  const handleSignOutPress = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          void authSignOut().then(() => router.replace("/sign-in"));
        },
      },
    ]);
  };

  const { activeCount, expiringCount, mealsThisWeek } = summary;

  const recent = [...vouchers]
    .sort((a, b) => b.issuedAt - a.issuedAt)
    .slice(0, 4);

  const initial = emailName.charAt(0).toUpperCase() || "?";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            colors={[Colors.light.primary]}
            tintColor={Colors.light.primary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.orgLabel}>Charity administration</Text>
            <Text style={styles.greeting}>{greeting()}, {emailName}</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => void load()}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            {loading ? (
              <ActivityIndicator color={Colors.light.primary} />
            ) : (
              <Text style={styles.statNumber}>{activeCount}</Text>
            )}
            <Text style={styles.statLabel}>Active</Text>
          </View>

          <View style={styles.statCard}>
            {loading ? (
              <ActivityIndicator color={Colors.light.primary} />
            ) : (
              <Text style={styles.statNumber}>{mealsThisWeek}</Text>
            )}
            <Text style={styles.statLabel}>Meals this week</Text>
          </View>

          <TouchableOpacity
            style={[styles.statCard, styles.statCardCaution]}
            onPress={() => router.push("/voucher-history?filter=Expiring")}
          >
            {loading ? (
              <ActivityIndicator color={StatusTokens.caution.fg} />
            ) : (
              <Text style={[styles.statNumber, { color: StatusTokens.caution.fg }]}>
                {expiringCount}
              </Text>
            )}
            <View style={styles.statLabelRow}>
              <Icon name="clock" size={16} color={StatusTokens.caution.fg} />
              <Text style={[styles.statLabel, styles.statLabelBold, { color: StatusTokens.caution.fg }]}>
                Expiring
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push("/create-voucher")}>
          <Icon name="plus" size={22} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Create voucher</Text>
        </TouchableOpacity>

        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent vouchers</Text>
          <TouchableOpacity onPress={() => router.push("/voucher-history")}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.light.primary} />
        ) : recent.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {error ? "Voucher information is unavailable." : "No vouchers have been created yet."}
            </Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {recent.map((voucher, index) => {
              const { token, label } = voucherStatusToken(voucher.status, voucher.expiresAt);

              return (
                <TouchableOpacity
                  key={voucher.voucherId}
                  style={[styles.listRow, index > 0 && styles.listRowDivider]}
                  onPress={() => router.push(`/voucher-details?voucherId=${encodeURIComponent(voucher.voucherId)}`)}
                >
                  <View style={styles.listRowText}>
                    <Text style={styles.listRowTitle}>{voucher.voucherId}</Text>
                    <Text style={styles.listRowSubtitle}>
                      {voucher.mealType} · {voucher.restaurantId}
                    </Text>
                  </View>
                  <StatusChip token={token} label={label} size="sm" />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BottomTabBar
        active="home"
        tabs={[
          { key: "home", label: "Home", icon: "home", route: "/admin" },
          { key: "vouchers", label: "Vouchers", icon: "list", route: "/voucher-history" },
          { key: "account", label: "Account", icon: "account", onPress: handleSignOutPress },
        ]}
      />
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
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orgLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: Colors.light.inkSecondary,
  },
  greeting: {
    ...Type.title,
    color: Colors.light.ink,
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.light.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: Colors.light.primary,
    fontWeight: "700",
    fontSize: 16,
  },
  errorCard: {
    backgroundColor: StatusTokens.stop.bg,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  errorText: {
    color: StatusTokens.stop.fg,
    fontSize: 14,
  },
  retryText: {
    color: Colors.light.primary,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  statCardCaution: {
    backgroundColor: StatusTokens.caution.bg,
    borderWidth: 0,
  },
  statNumber: {
    ...Type.title,
    color: Colors.light.ink,
  },
  statLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: Colors.light.inkSecondary,
  },
  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statLabelBold: {
    fontWeight: "700",
  },
  primaryButton: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.light.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  primaryButtonText: {
    ...Type.button,
    color: "#FFFFFF",
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    ...Type.heading,
    color: Colors.light.ink,
  },
  seeAll: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.primary,
    minHeight: 44,
    textAlignVertical: "center",
  },
  listCard: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  listRowDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  listRowText: {
    flex: 1,
    minWidth: 0,
  },
  listRowTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700",
    color: Colors.light.ink,
  },
  listRowSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: Colors.light.inkSecondary,
  },
  emptyCard: {
    backgroundColor: Colors.light.surface,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    alignItems: "center",
  },
  emptyText: {
    color: Colors.light.inkSecondary,
    fontSize: 16,
    textAlign: "center",
  },
});
