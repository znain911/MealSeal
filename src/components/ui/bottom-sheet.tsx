import { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { Colors } from "@/constants/theme";

type BottomSheetProps = {
  visible: boolean;
  onClose?: () => void;
  children: ReactNode;
};

/** Overlay + rounded sheet with a drag handle. Used for the share sheet and revoke confirmation. */
export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet} pointerEvents="box-none">
        <View style={styles.handle} />
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(43,38,34,0.45)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: Colors.light.borderStrong,
    alignSelf: "center",
  },
});
