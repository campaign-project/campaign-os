/**
 * Gather — CampaignOS field app (v1.0).
 *
 * Three states over the shared on-device engine (@campaign-os/engine — the SAME validator the
 * server runs, resolved through Metro + the pnpm monorepo, executed offline):
 *   onboarding (first run) → assignment briefing (each open) → working (Collect + Queue tabs).
 * In working mode the assignment collapses to a tappable top-bar strip (tap → back to briefing),
 * so the capture screen is all signal. A hand-rolled tab bar keeps the dependency surface minimal.
 */
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts, Fraunces_600SemiBold, Fraunces_700Bold, Fraunces_900Black } from "@expo-google-fonts/fraunces";
import { getMovement } from "./src/net/sync";
import { setMovement } from "./src/store/movement";
import CollectScreen from "./src/screens/CollectScreen";
import QueueScreen from "./src/screens/QueueScreen";
import Onboarding from "./src/screens/Onboarding";
import AssignmentScreen from "./src/screens/AssignmentScreen";
import CampaignPicker from "./src/screens/CampaignPicker";
import { useActiveCampaign } from "./src/store/campaign";
import { useActiveAssignment } from "./src/store/assignment";
import { deriveStats, useSession } from "./src/store/session";
import { getFlag, setFlag, ONBOARDED } from "./src/store/prefs";
import { C, MONO } from "./src/theme";

type Tab = "collect" | "queue";
type Phase = "picker" | "briefing" | "working";

export default function App() {
  const [tab, setTab] = useState<Tab>("collect");
  const [phase, setPhase] = useState<Phase>("picker");
  const [onboarded, setOnboarded] = useState(() => getFlag(ONBOARDED));
  const stats = deriveStats(useSession());
  const campaign = useActiveCampaign();
  const assignment = useActiveAssignment(); // the optimizer's turf — labels the working top bar

  // Pull the live movement rollup once on launch (falls back to static defaults if offline).
  useEffect(() => { getMovement().then((m) => { if (m) setMovement(m); }); }, []);

  // Hold the splash until Fraunces is ready; proceed (fallback fonts) if it errors — never strand.
  const [fontsLoaded, fontError] = useFonts({ Fraunces_600SemiBold, Fraunces_700Bold, Fraunces_900Black });
  if (!fontsLoaded && !fontError) return null;

  if (!onboarded) {
    return (
      <View style={styles.app}>
        <StatusBar style="light" />
        <Onboarding onDone={() => { setFlag(ONBOARDED, true); setOnboarded(true); }} />
      </View>
    );
  }

  if (phase === "picker") {
    return (
      <View style={styles.app}>
        <StatusBar style="light" />
        <CampaignPicker onPick={() => setPhase("briefing")} />
      </View>
    );
  }

  if (phase === "briefing") {
    return (
      <View style={styles.app}>
        <StatusBar style="light" />
        <AssignmentScreen onStart={() => setPhase("working")} onBack={() => setPhase("picker")} />
      </View>
    );
  }

  return (
    <View style={styles.app}>
      <StatusBar style="light" />

      {/* Working top bar: assignment context collapsed to one tappable line + live progress. */}
      <View style={styles.topbar}>
        <Pressable style={styles.assignChip} onPress={() => setPhase("briefing")} hitSlop={8}>
          <Text style={styles.assignChipText}>‹ {assignment?.areaShort ?? campaign.areaShort}</Text>
        </Pressable>
        <Text style={styles.progress}>
          <Text style={styles.progressNum}>{stats.valid}</Text>
          <Text style={styles.progressDen}>/{campaign.shiftTargetValid} valid</Text>
        </Text>
      </View>

      <View style={styles.body}>{tab === "collect" ? <CollectScreen /> : <QueueScreen />}</View>

      <View style={styles.tabs}>
        <TabButton label="Collect" active={tab === "collect"} onPress={() => setTab("collect")} />
        <TabButton
          label="Queue"
          active={tab === "queue"}
          badge={stats.pending > 0 ? stats.pending : undefined}
          onPress={() => setTab("queue")}
        />
      </View>
    </View>
  );
}

function TabButton({
  label, active, badge, onPress,
}: { label: string; active: boolean; badge?: number; onPress: () => void }) {
  return (
    <Pressable style={styles.tab} onPress={onPress}>
      <View style={styles.tabInner}>
        <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
        {badge !== undefined ? (
          <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
        ) : null}
      </View>
      <View style={[styles.tabMark, active && styles.tabMarkActive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.bg },
  topbar: {
    paddingTop: 58, paddingBottom: 12, paddingHorizontal: 18,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.bg,
  },
  assignChip: { flex: 1, marginRight: 12 },
  assignChipText: { color: C.ink, fontSize: 15, fontWeight: "700", letterSpacing: -0.2 },
  progress: { },
  progressNum: { color: C.mint, fontFamily: MONO, fontSize: 15, fontWeight: "800" },
  progressDen: { color: C.inkFaint, fontFamily: MONO, fontSize: 12 },

  body: { flex: 1 },

  tabs: {
    flexDirection: "row", borderTopWidth: 1, borderTopColor: C.line,
    backgroundColor: C.bgElev, paddingBottom: 26, paddingTop: 4,
  },
  tab: { flex: 1, alignItems: "center" },
  tabInner: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10 },
  tabText: { color: C.inkFaint, fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: C.ink },
  tabMark: { height: 2, width: 26, borderRadius: 2, backgroundColor: "transparent" },
  tabMarkActive: { backgroundColor: C.mint },
  badge: { backgroundColor: C.accent, borderRadius: 9, minWidth: 18, paddingHorizontal: 5, paddingVertical: 1, alignItems: "center" },
  badgeText: { color: "#04161d", fontFamily: MONO, fontSize: 10, fontWeight: "800" },
});
