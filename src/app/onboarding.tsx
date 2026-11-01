import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { IconName } from "@/constants/icons";
import { Colors, Radius, Spacing, Type } from "@/constants/theme";

const ONBOARDED_KEY = "mealseal_onboarded";

type Step = {
  title: string;
  body: string;
  icon: IconName;
  tint: string;
  ink: string;
};

const STEPS: Step[] = [
  {
    title: "A charity creates a voucher",
    body: "Charity staff choose the meal, the café and how long it lasts. It takes under a minute.",
    icon: "heart",
    tint: Colors.light.surfaceSunken,
    ink: Colors.light.accentClay,
  },
  {
    title: "A secure QR code is shared",
    body: "MealSeal digitally signs each voucher and turns it into a QR code, sent to the recipient as an image or PDF.",
    icon: "qr",
    tint: Colors.light.primarySubtle,
    ink: Colors.light.primary,
  },
  {
    title: "The café checks it first",
    body: "Café staff scan the code. Our secure system confirms it's genuine and meant for their café before the meal is handed over.",
    icon: "scan",
    tint: Colors.light.primarySubtle,
    ink: Colors.light.primary,
  },
  {
    title: "Protected, every time",
    body: "Each voucher works once. Changed, expired or cancelled codes are turned away automatically.",
    icon: "seal",
    tint: Colors.light.surfaceSunken,
    ink: Colors.light.primary,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const finish = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDED_KEY, "true");
    } catch {
      // Non-fatal — worst case onboarding shows again next launch.
    }

    router.replace("/landing");
  };

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => void finish()}
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.illustration, { backgroundColor: current.tint }]}>
        <View style={styles.illustrationCircle}>
          <Icon name={current.icon} size={72} color={current.ink} />
        </View>
      </View>

      <View style={styles.textBlock}>
        <Text style={styles.stepLabel}>Step {step + 1} of {STEPS.length}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>
      </View>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === step ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            if (isLast) {
              void finish();
            } else {
              setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
            }
          }}
        >
          <Text style={styles.primaryButtonText}>{isLast ? "Get started" : "Next"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.canvas,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 8,
    minHeight: 48,
    alignItems: "center",
  },
  skipButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.primary,
  },
  illustration: {
    marginHorizontal: Spacing.lg,
    height: 340,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  illustrationCircle: {
    width: 144,
    height: 144,
    borderRadius: Radius.full,
    backgroundColor: Colors.light.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing["2xl"],
    gap: Spacing.md,
    flex: 1,
  },
  stepLabel: {
    ...Type.caption,
    color: Colors.light.inkSecondary,
  },
  title: {
    ...Type.title,
    color: Colors.light.ink,
  },
  body: {
    ...Type.body,
    color: Colors.light.inkSecondary,
  },
  bottom: {
    padding: Spacing.lg,
    paddingBottom: Spacing["3xl"] - Spacing.sm,
    gap: Spacing.xl,
  },
  dots: {
    flexDirection: "row",
    gap: Spacing.sm,
    justifyContent: "center",
  },
  dot: {
    height: 8,
    borderRadius: Radius.full,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.light.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Colors.light.borderStrong,
  },
  primaryButton: {
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    ...Type.button,
    color: "#FFFFFF",
  },
});
