import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

import { Colors, Radius } from "@/constants/theme";

type TextFieldProps = TextInputProps & {
  label: string;
  helperText?: string;
  errorText?: string;
};

export function TextField({ label, helperText, errorText, style, ...rest }: TextFieldProps) {
  const hasError = Boolean(errorText);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, hasError && styles.inputError, style]}
        placeholderTextColor={Colors.light.inkTertiary}
        {...rest}
      />
      {errorText ? (
        <Text style={styles.error}>{errorText}</Text>
      ) : helperText ? (
        <Text style={styles.helper}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
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
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "500",
    color: Colors.light.ink,
  },
  inputError: {
    borderColor: Colors.light.danger,
    borderWidth: 2,
  },
  helper: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.inkSecondary,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.danger,
    fontWeight: "600",
  },
});
