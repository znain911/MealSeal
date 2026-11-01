/**
 * MealSeal design tokens.
 *
 * Source of truth for the mobile UI kit. Every screen should pull colors, type, spacing and
 * radius from here instead of hard-coding hex values or numbers.
 *
 * Palette + type pulled from the warm terracotta/cream redesign (Claude Design artifact,
 * Nov 2026): Bricolage Grotesque for headings, DM Sans for body text, a single warm amber/ink
 * status language instead of green/red — see FontFamily below and `constants/status.ts`.
 */

import { Platform } from "react-native";

export const Colors = {
  light: {
    canvas: "#FFF7E8",
    surface: "#FFFFFF",
    surfaceSunken: "#FFF1DD",
    ink: "#3A2212",
    inkSecondary: "#6B4A33",
    inkTertiary: "#8A6F56",
    border: "#F0DCC0",
    borderStrong: "#E3C193",
    primary: "#C2410C",
    primaryPressed: "#9A330A",
    primarySubtle: "#FFE9B8",
    accentClay: "#D9531E",
    onPrimary: "#FFFFFF",
    danger: "#9B1C1C",
    // Legacy aliases kept only for the unrouted Expo-starter demo screen (src/app/explore.tsx)
    // and its components — not used by any real MealSeal screen.
    text: "#3A2212",
    background: "#FFF7E8",
    backgroundElement: "#FFF1DD",
    backgroundSelected: "#F0DCC0",
    textSecondary: "#6B4A33",
  },
  // Defined for a future dark-mode pass; not wired up to useColorScheme yet.
  dark: {
    canvas: "#1A1714",
    surface: "#241F1A",
    surfaceSunken: "#2B251F",
    ink: "#F4EFE6",
    inkSecondary: "#B5AC9F",
    inkTertiary: "#8C8174",
    border: "rgba(244,239,230,0.1)",
    borderStrong: "#4A4138",
    primary: "#F2A413",
    primaryPressed: "#D98A0A",
    primarySubtle: "#3B2C1A",
    accentClay: "#E9744A",
    onPrimary: "#1A1714",
    danger: "#E06B6B",
    text: "#F4EFE6",
    background: "#1A1714",
    backgroundElement: "#2B251F",
    backgroundSelected: "#4A4138",
    textSecondary: "#B5AC9F",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

/** Loaded via @expo-google-fonts in src/app/_layout.tsx; falls back to the system font until ready. */
export const FontFamily = {
  heading: "BricolageGrotesque_800ExtraBold",
  headingSemibold: "BricolageGrotesque_700Bold",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodyBold: "DMSans_700Bold",
} as const;

export const Type = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: "800" as const, fontFamily: FontFamily.heading },
  title: { fontSize: 24, lineHeight: 32, fontWeight: "800" as const, fontFamily: FontFamily.heading },
  heading: { fontSize: 18, lineHeight: 26, fontWeight: "700" as const, fontFamily: FontFamily.headingSemibold },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "500" as const, fontFamily: FontFamily.bodyMedium },
  bodySecondary: { fontSize: 14, lineHeight: 20, fontWeight: "500" as const, fontFamily: FontFamily.bodyMedium },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
    fontFamily: FontFamily.bodyBold,
  },
  button: { fontSize: 16, lineHeight: 24, fontWeight: "700" as const, fontFamily: FontFamily.bodyBold },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
  // Legacy aliases kept only for the unrouted Expo-starter demo screen — not used elsewhere.
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  chip: 14,
  md: 16,
  lg: 20,
  full: 999,
} as const;

export const Shadow = {
  raised: {
    shadowColor: "#3A2212",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
} as const;

export const Motion = {
  redeemPop: 320,
  stateChange: 200,
  reducedFade: 100,
} as const;

// --- Legacy exports below, kept only for the unrouted Expo-starter demo screen
// (src/app/explore.tsx and its components) — not used by any real MealSeal screen. ---

export const Fonts = Platform.select({
  ios: { sans: "system-ui", serif: "ui-serif", rounded: "ui-rounded", mono: "ui-monospace" },
  default: { sans: "normal", serif: "serif", rounded: "normal", mono: "monospace" },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
