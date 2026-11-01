/**
 * MealSeal design tokens.
 *
 * Source of truth for the mobile UI kit (`mobile-app-project-setup/project/MealSeal UI Kit.dc.html`)
 * and `design-system.md`. Every screen should pull colors, type, spacing and radius from here
 * instead of hard-coding hex values or numbers.
 */

import { Platform } from "react-native";

export const Colors = {
  light: {
    canvas: "#FBF7F0",
    surface: "#FFFFFF",
    surfaceSunken: "#F3ECE1",
    ink: "#2B2622",
    inkSecondary: "#5E554B",
    inkTertiary: "#776D62",
    border: "#E4DCCC",
    borderStrong: "#C9BFB1",
    primary: "#1F5C46",
    primaryPressed: "#153F30",
    primarySubtle: "#E3F1E7",
    accentClay: "#B4532A",
    onPrimary: "#FFFFFF",
    // Legacy aliases kept only for the unrouted Expo-starter demo screen (src/app/explore.tsx)
    // and its components — not used by any real MealSeal screen.
    text: "#2B2622",
    background: "#FBF7F0",
    backgroundElement: "#F3ECE1",
    backgroundSelected: "#E4DCCC",
    textSecondary: "#5E554B",
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
    primary: "#8FD1AE",
    primaryPressed: "#6FB890",
    primarySubtle: "#2B3B32",
    accentClay: "#D98A5E",
    onPrimary: "#1A1714",
    text: "#F4EFE6",
    background: "#1A1714",
    backgroundElement: "#2B251F",
    backgroundSelected: "#4A4138",
    textSecondary: "#B5AC9F",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Type = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: "700" as const },
  title: { fontSize: 24, lineHeight: 32, fontWeight: "700" as const },
  heading: { fontSize: 18, lineHeight: 26, fontWeight: "600" as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "500" as const },
  bodySecondary: { fontSize: 14, lineHeight: 20, fontWeight: "500" as const },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.4,
  },
  button: { fontSize: 16, lineHeight: 24, fontWeight: "700" as const },
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
  md: 16,
  lg: 20,
  full: 999,
} as const;

export const Shadow = {
  raised: {
    shadowColor: "#2B2622",
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
