import { StyleSheet, Text, View } from "react-native";

import { StatusToken } from "@/constants/status";
import { FontFamily, Radius, Spacing } from "@/constants/theme";

import { Icon } from "./icon";
import { IconName } from "@/constants/icons";

type StatusChipProps = {
  token: StatusToken;
  label?: string;
  icon?: IconName;
  size?: "sm" | "md";
};

/** Icon + colour + label, always together — status is never colour alone. */
export function StatusChip({ token, label, icon, size = "md" }: StatusChipProps) {
  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: token.bg },
        isSmall ? styles.chipSmall : styles.chipMedium,
      ]}
    >
      <Icon name={icon ?? token.icon} size={isSmall ? 14 : 18} color={token.fg} />
      <Text style={[styles.label, { color: token.fg }, isSmall && styles.labelSmall]}>
        {label ?? token.example}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: Radius.chip,
    alignSelf: "flex-start",
  },
  chipMedium: {
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  chipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    fontFamily: FontFamily.bodyBold,
  },
  labelSmall: {
    fontSize: 12,
    lineHeight: 16,
  },
});
