/**
 * CampaignPicker — the self-serve entry (PLG).
 *
 * No partner routes you here: you open the app and pick an active campaign that's gathering near
 * you, of your own free will. Picking one sets it active and drops you into that campaign's
 * briefing. This is the bottom-up wedge — the validator helps the individual circulator, so they
 * adopt without org buy-in; partnerships follow the usage (see GATHER_SELF_SERVE_GTM.md).
 */
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import DawnBackdrop from "../components/DawnBackdrop";
import { LiveDot } from "../components/LiveMovement";
import { CAMPAIGNS, type Campaign } from "../data/campaigns";
import { setActiveCampaign } from "../store/campaign";
import { useMovement } from "../store/movement";
import { C, MONO, DISPLAY, DISPLAY_BLACK } from "../theme";

const DAY = 86_400_000;
function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - new Date().getTime()) / DAY));
}
function payLabel(c: Campaign): string {
  const b = c.compensation.basis;
  if (b === "hourly") return `$${c.compensation.rate.toFixed(0)}/hr`;
  if (b === "volunteer") return "Volunteer";
  return `$${c.compensation.rate.toFixed(2)}/sig`;
}

export default function CampaignPicker({ onPick }: { onPick: () => void }) {
  const movement = useMovement();
  function pick(id: string) {
    setActiveCampaign(id);
    onPick();
  }
  return (
    <View style={styles.root}>
      <DawnBackdrop />
      <ScrollView style={styles.flex} contentContainerStyle={styles.wrap}>
        <Text style={styles.brand}>Gather</Text>
        <Text style={styles.kicker}>CAMPAIGNS GATHERING NEAR YOU</Text>
        <Text style={styles.h1}>Pick one and start</Text>
        <View style={styles.movement}>
          <LiveDot />
          <Text style={styles.movementText}>
            Join <Text style={styles.movementNum}>{movement.circulators.toLocaleString()}</Text> circulators collecting right now
          </Text>
        </View>

        {CAMPAIGNS.map((c) => {
          const d = daysLeft(c.deadline);
          return (
            <Pressable
              key={c.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => pick(c.id)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.status}>● {c.status}</Text>
                <Text style={[styles.deadline, d <= 30 && styles.deadlineHot]}>{d}d left</Text>
              </View>
              <Text style={styles.title}>{c.title}</Text>
              <Text style={styles.org}>{c.org} · {c.jurisdiction}</Text>
              <Text style={styles.petition}>{c.petition}</Text>
              <View style={styles.meta}>
                <Text style={styles.metaItem}>{c.statewideRequired.toLocaleString()} needed</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaItem}>{payLabel(c)}</Text>
                {c.freeFile ? <Text style={styles.badge}>free-file</Text> : null}
                <Text style={styles.go}>Start →</Text>
              </View>
            </Pressable>
          );
        })}

        <Text style={styles.foot}>
          Open to any volunteer — no sign-up to start. Your captures stay on your phone until you sync.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  wrap: { padding: 22, paddingTop: 64, paddingBottom: 44 },

  brand: { color: C.ink, fontFamily: DISPLAY, fontSize: 22, marginBottom: 22 },
  kicker: { color: C.gold, fontFamily: MONO, fontSize: 11, letterSpacing: 2.5 },
  h1: { color: C.ink, fontFamily: DISPLAY_BLACK, fontSize: 34, letterSpacing: -0.6, marginTop: 4 },
  movement: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, marginBottom: 18 },
  movementText: { color: C.inkDim, fontFamily: MONO, fontSize: 12 },
  movementNum: { color: C.mint, fontWeight: "800" },

  card: {
    backgroundColor: C.bgElev, borderRadius: 16, borderWidth: 1, borderColor: C.line,
    padding: 16, marginBottom: 12,
  },
  cardPressed: { backgroundColor: C.bgElev2, borderColor: C.gold },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  status: { color: C.mint, fontFamily: MONO, fontSize: 10, letterSpacing: 0.5 },
  deadline: { color: C.inkFaint, fontFamily: MONO, fontSize: 10 },
  deadlineHot: { color: C.gold },
  title: { color: C.ink, fontFamily: DISPLAY, fontSize: 21, letterSpacing: -0.3, lineHeight: 26 },
  org: { color: C.inkDim, fontSize: 13, marginTop: 3 },
  petition: { color: C.inkFaint, fontSize: 12, marginTop: 1 },
  meta: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12 },
  metaItem: { color: C.inkFaint, fontFamily: MONO, fontSize: 11 },
  metaDot: { color: C.inkGhost, fontSize: 11 },
  badge: {
    color: C.mint, fontFamily: MONO, fontSize: 9, letterSpacing: 0.5,
    borderWidth: 1, borderColor: "#1f4a3a", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, overflow: "hidden",
  },
  go: { color: C.gold, fontFamily: MONO, fontSize: 12, fontWeight: "700", marginLeft: "auto" },

  foot: { color: C.inkGhost, fontFamily: MONO, fontSize: 10, lineHeight: 16, marginTop: 8 },
});
