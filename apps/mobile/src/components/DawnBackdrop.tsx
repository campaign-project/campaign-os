/**
 * DawnBackdrop — the atmosphere.
 *
 * A deep-midnight ground with a warm dawn glow bleeding down from the top: democracy at first
 * light. Two layered gradients (base + a low-opacity gold horizon) give depth without literal
 * sun/flag kitsch. Absolute-fill, pointer-transparent — drop it behind the inspiring moments
 * (briefing, onboarding); working screens stay solid so capture is all signal.
 */
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function DawnBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={["#141b30", "#0c1220", "#0a0f1c"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(255,200,120,0.13)", "rgba(255,200,120,0.0)"]}
        locations={[0, 1]}
        style={styles.glow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: "absolute", top: 0, left: 0, right: 0, height: 300 },
});
