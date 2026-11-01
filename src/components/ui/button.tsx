import { ReactNode } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from "react-native";

import { Colors, Radius, Type } from "@/constants/theme";

type ButtonVariant = "primary" | "secondary" | "destructive" | "destructiveSolid" | "ghost";

type ButtonProps = TouchableOpacityProps & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  label,
  variant = "primary",
  loading = false,
  icon,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      disabled={isDisabled}
      style={[
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor[variant]} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: Radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  label: {
    ...Type.button,
  },
  disabled: {
    opacity: 0.5,
  },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: Colors.light.primary },
  secondary: { backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.borderStrong },
  destructive: { backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.danger },
  destructiveSolid: { backgroundColor: Colors.light.danger },
  ghost: { backgroundColor: "transparent" },
});

const labelStyles = StyleSheet.create({
  primary: { color: "#FFFFFF" },
  secondary: { color: Colors.light.primary },
  destructive: { color: Colors.light.danger },
  destructiveSolid: { color: "#FFFFFF" },
  ghost: { color: Colors.light.primary },
});

const spinnerColor: Record<ButtonVariant, string> = {
  primary: "#FFFFFF",
  secondary: Colors.light.primary,
  destructive: Colors.light.danger,
  destructiveSolid: "#FFFFFF",
  ghost: Colors.light.primary,
};
