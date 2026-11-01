import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { BottomTabBar } from "@/components/ui/bottom-tab-bar";
import { Icon } from "@/components/ui/icon";
import { StatusChip } from "@/components/ui/status-chip";
import { voucherStatusToken } from "@/constants/status";
import { Colors, Radius, Spacing, Type } from "@/constants/theme";
import { fetchVouchers, Voucher } from "@/lib/vouchers";

type FilterKey = "All" | "Valid" | "Expiring" | "Redeemed" | "Revoked" | "Expired";

const FILTERS: FilterKey[] = ["All", "Valid", "Expiring", "Redeemed", "Revoked", "Expired"];

function dateGroup(issuedAt: number): string {
  const issued = new Date(issuedAt);
  const now = new Date();

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(issued, now)) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(issued, yesterday)) return "Yesterday";

  return issued.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function VoucherHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const initialFilter = (Array.isArray(params.filter) ? params.filter[0] : params.filter) as
    | FilterKey
    | undefined;

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>(
    FILTERS.includes(initialFilter as FilterKey) ? (initialFilter as FilterKey) : "All"
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setVouchers(await fetchVouchers());
    } catch (err: any) {
      setError(err?.message || "Unable to load vouchers.");
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = vouchers
      .map((voucher) => {
        const { token, label } = voucherStatusToken(voucher.status, voucher.expiresAt);
        return { voucher, token, label };
      })
      .filter(({ label }) => filter === "All" || label === filter)
      .filter(
        ({ voucher }) =>
          !query ||
          voucher.voucherId.toLowerCase().includes(query) ||
          voucher.recipientRef.toLowerCase().includes(query)
      )
      .sort((a, b) => b.voucher.issuedAt - a.voucher.issuedAt);

    return filtered.map((row, index) => {
      const group = dateGroup(row.voucher.issuedAt);
      const previousGroup = index > 0 ? dateGroup(filtered[index - 1].voucher.issuedAt) : null;
      return { ...row, group, showGroup: group !== previousGroup };
    });
  }, [vouchers, filter, search]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>Vouchers</Text>

        <View style={styles.searchField}>
          <Icon name="search" size={20} color={Colors.light.inkTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search reference"
            placeholderTextColor={Colors.light.inkTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((item) => {
            const selected = filter === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.filterChip, selected && styles.filterChipSelected]}
                onPress={() => setFilter(item)}
              >
                <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.light.primary} style={styles.spinner} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : rows.length === 0 ? (
          <Text style={styles.emptyText}>No vouchers match these filters.</Text>
        ) : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {rows.map(({ voucher, token, label, group, showGroup }) => (
              <View key={voucher.voucherId}>
                {showGroup ? <Text style={styles.groupLabel}>{group}</Text> : null}
                <TouchableOpacity
                  style={styles.row}
                  onPress={() =>
                    router.push(`/voucher-details?voucherId=${encodeURIComponent(voucher.voucherId)}`)
                  }
                >
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{voucher.voucherId}</Text>
                    <Text style={styles.rowSubtitle}>
                      {voucher.mealType} · {voucher.restaurantId}
                    </Text>
                  </View>
                  <StatusChip token={token} label={label} size="sm" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <BottomTabBar
        active="vouchers"
        tabs={[
          { key: "home", label: "Home", icon: "home", route: "/admin" },
          { key: "vouchers", label: "Vouchers", icon: "list", route: "/voucher-history" },
          { key: "account", label: "Account", icon: "account", route: "/admin" },
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
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    ...Type.title,
    color: Colors.light.ink,
  },
  searchField: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.light.borderStrong,
    backgroundColor: Colors.light.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.ink,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  filterChip: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.borderStrong,
  },
  filterChipSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.ink,
  },
  filterChipTextSelected: {
    color: "#FFFFFF",
  },
  spinner: {
    marginTop: Spacing.xl,
  },
  errorText: {
    color: "#A3312A",
    fontSize: 16,
    textAlign: "center",
    marginTop: Spacing.xl,
  },
  emptyText: {
    color: Colors.light.inkSecondary,
    fontSize: 16,
    textAlign: "center",
    marginTop: Spacing.xl,
  },
  list: {
    flex: 1,
  },
  groupLabel: {
    ...Type.caption,
    color: Colors.light.inkSecondary,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    minHeight: 48,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700",
    color: Colors.light.ink,
  },
  rowSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: Colors.light.inkSecondary,
  },
});
