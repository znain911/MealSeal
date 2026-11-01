
import {
  DefaultTheme,
  Stack,
  ThemeProvider,
} from "expo-router";

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="create-voucher" />
        <Stack.Screen name="voucher-qr" />
        <Stack.Screen name="staff" />
        <Stack.Screen name="scan-voucher" />
      </Stack>
    </ThemeProvider>
  );
}
