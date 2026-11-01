import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";

import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StatusChip } from "@/components/ui/status-chip";
import { StatusTokens, voucherStatusToken } from "@/constants/status";
import { Colors, Radius, Spacing, Type } from "@/constants/theme";
import { fetchVoucher, formatDate, formatDateTime, revokeVoucher, Voucher } from "@/lib/vouchers";

const REVOKE_REASONS = ["Issued in error", "Lost or shared", "Needs changed"];

function getParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function VoucherDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const voucherId = getParam(params.voucherId as string | string[] | undefined);

  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sheetVisible, setSheetVisible] = useState(false);
  const [reason, setReason] = useState(REVOKE_REASONS[0]);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    if (!voucherId) {
      setError("No voucher was specified.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      setVoucher(await fetchVoucher(voucherId));
    } catch (err: any) {
      setError(err?.message || "Unable to load this voucher.");
      setVoucher(null);
    } finally {
      setLoading(false);
    }
  }, [voucherId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleRevoke = async () => {
    if (!voucherId || revoking) return;
    setRevoking(true);

    try {
      await revokeVoucher(voucherId);
      setSheetVisible(false);
      await load();
    } catch (err: any) {
      Alert.alert("Couldn't revoke voucher", err?.message || "Please try again.");
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!voucher) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error || "This voucher could not be found."}</Text>
          <Button label="Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const { token, label } = voucherStatusToken(voucher.status, voucher.expiresAt);
  const canRevoke = voucher.status === "ACTIVE";

  const activity: { title: string; when: string; done: boolean }[] = [
    { title: "Created and signed", when: formatDateTime(voucher.issuedAt), done: true },
  ];

  if (voucher.redeemedAt) {
    activity.push({ title: "Redeemed", when: formatDateTime(voucher.redeemedAt), done: true });
  } else if (voucher.revokedAt) {
    activity.push({ title: "Revoked", when: formatDateTime(voucher.revokedAt), done: true });
  } else {
    activity.push({ title: "Not redeemed yet", when: "", done: false });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <Icon name="chevronLeft" size={24} color={Colors.light.ink} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() =>
            router.push({ pathname: "/voucher-qr", params: { voucherId: voucher.voucherId } })
          }
          accessibilityLabel="Share this voucher's QR code again"
        >
          <Icon name="shareImage" size={22} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headBlock}>
          <StatusChip token={token} label={label} />
          <Text style={styles.voucherId}>{voucher.voucherId}</Text>
          <Text style={styles.voucherSubtitle}>
            {voucher.quantity} × {voucher.mealType} at {voucher.restaurantId}
          </Text>
        </View>

        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Recipient ref.</Text>
            <Text style={styles.metaValue}>{voucher.recipientRef}</Text>
          </View>
          <View style={[styles.metaRow, styles.metaRowDivider]}>
            <Text style={styles.metaKey}>Issued</Text>
            <Text style={styles.metaValue}>{formatDate(voucher.issuedAt)}</Text>
          </View>
          <View style={[styles.metaRow, styles.metaRowDivider]}>
            <Text style={styles.metaKey}>Expires</Text>
            <Text style={styles.metaValue}>{formatDate(voucher.expiresAt)}</Text>
          </View>
        </View>

        <View style={styles.activityBlock}>
          <Text style={styles.sectionTitle}>Activity</Text>
          {activity.map((event, index) => (
            <View key={index} style={styles.activityRow}>
              <View style={[styles.activityDot, !event.done && styles.activityDotEmpty]} />
              <View style={styles.activityText}>
                <Text style={event.done ? styles.activityTitle : styles.activityTitleMuted}>
                  {event.title}
                </Text>
                {event.when ? <Text style={styles.activityWhen}>{event.when}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {canRevoke ? (
        <View style={styles.footer}>
          <Button label="Revoke voucher" variant="destructive" icon={<Icon name="stop" size={20} color="#A3312A" />} onPress={() => setSheetVisible(true)} />
          <Text style={styles.footerHint}>Revoking stops this code working at any café straight away.</Text>
        </View>
      ) : null}

      <BottomSheet visible={sheetVisible} onClose={() => setSheetVisible(false)}>
        <View style={styles.sheetIcon}>
          <Icon name="stop" size={28} color="#A3312A" />
        </View>
        <Text style={styles.sheetTitle}>Revoke this voucher?</Text>
        <Text style={styles.sheetBody}>
          The QR code will be turned away at every café. This can’t be undone — you can create a new
          voucher any time.
        </Text>

        <View>
          <Text style={styles.reasonLabel}>Reason (optional)</Text>
          <View style={styles.reasonRow}>
            {REVOKE_REASONS.map((item) => {
              const selected = reason === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.reasonChip, selected && styles.reasonChipSelected]}
                  onPress={() => setReason(item)}
                >
                  <Text style={[styles.reasonChipText, selected && styles.reasonChipTextSelected]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Button
          label="Revoke voucher"
          variant="destructiveSolid"
          loading={revoking}
          onPress={() => void handleRevoke()}
        />
        <Button label="Keep voucher" variant="ghost" onPress={() => setSheetVisible(false)} disabled={revoking} />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.canvas,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.lg,
    padding: Spacing.xl,
  },
  errorText: {
    color: Colors.light.inkSecondary,
    fontSize: 16,
    textAlign: "center",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.sm,
    minHeight: 52,
    alignItems: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.xs,
    gap: Spacing.xl,
  },
  headBlock: {
    gap: Spacing.sm,
  },
  voucherId: {
    ...Type.display,
    color: Colors.light.ink,
  },
  voucherSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
    color: Colors.light.inkSecondary,
  },
  metaCard: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
  },
  metaRowDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  metaKey: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.inkSecondary,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.ink,
  },
  activityBlock: {
    gap: Spacing.md,
  },
  sectionTitle: {
    ...Type.heading,
    color: Colors.light.ink,
  },
  activityRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.light.primary,
    marginTop: 7,
  },
  activityDotEmpty: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: Colors.light.borderStrong,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    color: Colors.light.ink,
  },
  activityTitleMuted: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
    color: Colors.light.inkSecondary,
  },
  activityWhen: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    color: Colors.light.inkSecondary,
  },
  footer: {
    padding: Spacing.lg,
    paddingBottom: Spacing["2xl"],
    gap: Spacing.sm,
  },
  footerHint: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.inkSecondary,
  },
  sheetIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: StatusTokens.stop.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    ...Type.title,
    color: Colors.light.ink,
  },
  sheetBody: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
    color: Colors.light.inkSecondary,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.ink,
    marginBottom: Spacing.sm,
  },
  reasonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  reasonChip: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.borderStrong,
  },
  reasonChipSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  reasonChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.ink,
  },
  reasonChipTextSelected: {
    color: "#FFFFFF",
  },
});
