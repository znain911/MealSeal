import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { IconName } from "@/constants/icons";
import { Colors } from "@/constants/theme";

import { Icon } from "./icon";

type Tab = {
  key: string;
  label: string;
  icon: IconName;
  route?: string;
  onPress?: () => void;
};

type BottomTabBarProps = {
  tabs: Tab[];
  active: string;
};

/** Simple shared bottom tab bar — screens render it and navigate on tap. */
export function BottomTabBar({ tabs, active }: BottomTabBarProps) {
  const router = useRouter();

  return (
    <View style={styles.bar}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;

        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.item}
            onPress={tab.onPress ?? (() => router.push(tab.route as never))}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Icon
              name={tab.icon}
              size={24}
              color={isActive ? Colors.light.primary : Colors.light.inkSecondary}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 24,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minHeight: 48,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    color: Colors.light.inkSecondary,
  },
  labelActive: {
    fontWeight: "700",
    color: Colors.light.primary,
  },
});
