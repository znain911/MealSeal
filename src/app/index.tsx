import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Colors, Radius, Spacing, Type } from "@/constants/theme";

const ONBOARDED_KEY = "mealseal_onboarded";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const redirect = async () => {
      let onboarded = false;

      try {
        onboarded = (await AsyncStorage.getItem(ONBOARDED_KEY)) === "true";
      } catch {
        onboarded = false;
      }

      if (cancelled) return;

      router.replace(onboarded ? "/landing" : "/onboarding");
    };

    const timer = setTimeout(() => {
      void redirect();
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.seal}>
        <Icon name="seal" size={60} color={Colors.light.primary} />
      </View>

      <View style={styles.brandBlock}>
        <Text style={styles.brand}>MealSeal</Text>
        <Text style={styles.tagline}>Meals shared with care</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xl,
  },
  seal: {
    width: 112,
    height: 112,
    borderRadius: Radius.full,
    backgroundColor: Colors.light.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  brandBlock: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  brand: {
    ...Type.display,
    color: "#FFFFFF",
  },
  tagline: {
    ...Type.body,
    color: Colors.light.primarySubtle,
  },
});
