import { StyleSheet, View, ViewProps } from "react-native";

import { Colors, Radius, Shadow } from "@/constants/theme";

type CardProps = ViewProps & {
  raised?: boolean;
  padded?: boolean;
};

export function Card({ raised = false, padded = true, style, ...rest }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        raised ? Shadow.raised : styles.bordered,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radius.lg,
  },
  padded: {
    padding: 16,
  },
  bordered: {
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
});
