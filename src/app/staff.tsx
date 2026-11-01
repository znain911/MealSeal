import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomTabBar } from "@/components/ui/bottom-tab-bar";
import { Icon } from "@/components/ui/icon";
import { StatusTokens } from "@/constants/status";
import { Colors, Radius, Spacing, Type } from "@/constants/theme";
import { signOut as authSignOut, getCurrentUser } from "@/lib/auth-client";
import { mealsServedToday, readRedemptions, RedemptionEntry } from "@/lib/staff-activity";

export default function StaffDashboard() {
  const router = useRouter();
  const [recent, setRecent] = useState<RedemptionEntry[]>([]);
  const [staffName, setStaffName] = useState("there");

  useFocusEffect(
    useCallback(() => {
      void readRedemptions().then(setRecent);
      void getCurrentUser().then((user) => {
        if (user?.email) setStaffName(user.email.split("@")[0]);
      });
    }, [])
  );

  const handleSignOutPress = () => {
    void authSignOut().then(() => router.replace("/landing"));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.cafeLabel}>Café staff · {staffName}</Text>
          <Text style={styles.title}>Ready when you are</Text>
        </View>

        <TouchableOpacity style={styles.scanCard} onPress={() => router.push("/scan-voucher")}>
          <View style={styles.scanIcon}>
            <Icon name="cafe" size={34} color={Colors.light.primary} />
          </View>
          <View style={styles.scanText}>
            <Text style={styles.scanTitle}>Scan a voucher</Text>
            <Text style={styles.scanSubtitle}>
              We’ll check it’s genuine and meant for this café.
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.statRow}>
          <View style={styles.statIcon}>
            <Icon name="meals" size={22} color={StatusTokens.redeemed.fg} />
          </View>
          <View>
            <Text style={styles.statNumber}>{mealsServedToday(recent)} meals served today</Text>
            <Text style={styles.statHint}>Thank you for being part of this.</Text>
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Recently redeemed</Text>
          {recent.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Nothing redeemed yet this session.</Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {recent.slice(0, 3).map((entry, index) => (
                <View key={`${entry.voucherId}-${entry.redeemedAt}`} style={[styles.listRow, index > 0 && styles.listRowDivider]}>
                  <View style={styles.listRowText}>
                    <Text style={styles.listRowTitle}>
                      {entry.quantity} × {entry.mealType}
                    </Text>
                    <Text style={styles.listRowSubtitle}>
                      {entry.voucherId} · {new Date(entry.redeemedAt).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <View style={styles.redeemedTag}>
                    <Icon name="checks" size={14} color={StatusTokens.redeemed.fg} />
                    <Text style={styles.redeemedTagText}>Redeemed</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <BottomTabBar
        active="home"
        tabs={[
          { key: "home", label: "Home", icon: "home", route: "/staff" },
          { key: "scan", label: "Scan", icon: "cafe", route: "/scan-voucher" },
          { key: "signout", label: "Sign out", icon: "signOut", onPress: handleSignOutPress },
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
    gap: Spacing.xl,
  },
  cafeLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: Colors.light.inkSecondary,
  },
  title: {
    ...Type.title,
    color: Colors.light.ink,
    marginTop: 2,
  },
  scanCard: {
    backgroundColor: Colors.light.primary,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  scanIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.light.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  scanText: {
    gap: Spacing.xs,
  },
  scanTitle: {
    ...Type.title,
    color: "#FFFFFF",
  },
  scanSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
    color: Colors.light.primarySubtle,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Radius.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: StatusTokens.redeemed.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
    color: Colors.light.ink,
  },
  statHint: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: Colors.light.inkSecondary,
  },
  sectionTitle: {
    ...Type.heading,
    color: Colors.light.ink,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    color: Colors.light.inkSecondary,
    fontSize: 16,
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
  },
  listRowDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  listRowText: {
    flex: 1,
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
  redeemedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: StatusTokens.redeemed.bg,
  },
  redeemedTagText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: StatusTokens.redeemed.fg,
  },
});
