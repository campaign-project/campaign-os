/**
 * AssignmentScreen — the briefing for the campaign you picked.
 *
 * The map IS the hero: real dark tiles centered on your location, the movement alive on top, and
 * the campaign identity floating over a scrim. Prep actions (directions, print forms) + a pinned
 * Start/Resume CTA. Reads the active campaign from the store (set in CampaignPicker); a "‹ Campaigns"
 * back returns to the directory.
 */
import { useEffect, useRef } from "react";
import { Animated, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import DawnBackdrop from "../components/DawnBackdrop";
import LiveMap from "../components/LiveMap";
import { LiveDot } from "../components/LiveMovement";
import TurfYield from "../components/TurfYield";
import { type Destination, type PetitionForm } from "../data/synced";
import { useActiveCampaign } from "../store/campaign";
import { useActiveAssignment, ensureAssignment } from "../store/assignment";
import { useMovement } from "../store/movement";
import { deriveStats, useSession } from "../store/session";
import { C, MONO, DISPLAY, DISPLAY_BLACK, DISPLAY_SEMI } from "../theme";

const money = (n: number) => `$${n.toFixed(2)}`;

function openDirections(dest: Destination) {
  const q = `${dest.lat},${dest.lng}`;
  const web = `https://www.google.com/maps/dir/?api=1&destination=${q}`;
  const url = Platform.select({ ios: `maps://?daddr=${q}`, android: `google.navigation:q=${q}`, default: web })!;
  Linking.openURL(url).catch(() => Linking.openURL(web));
}

function openForm(form: PetitionForm) {
  Linking.openURL(form.url).catch(() => { /* no handler — nothing to open */ });
}

export default function AssignmentScreen({ onStart, onBack }: { onStart: () => void; onBack: () => void }) {
  const campaign = useActiveCampaign();
  // The optimizer's turf allocation for this circulator — drives which tiles the device loads.
  const assignment = useActiveAssignment();
  useEffect(() => { ensureAssignment(campaign.id); }, [campaign.id]);
  const movement = useMovement();
  const comp = campaign.compensation;
  const payNum = comp.basis === "volunteer" ? "★" : money(comp.rate);
  const paySub = comp.basis === "hourly" ? "/ hour" : comp.basis === "volunteer" ? "volunteer" : "/ valid sig";

  const stats = deriveStats(useSession());
  const started = stats.total > 0;

  const intro = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(
      90,
      intro.map((v) => Animated.timing(v, { toValue: 1, duration: 440, useNativeDriver: true })),
    ).start();
  }, [intro]);
  const group = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  });

  return (
    <View style={styles.root}>
      <DawnBackdrop />
      <ScrollView style={styles.flex} contentContainerStyle={styles.wrap}>
        {/* Hero — the living map */}
        <Animated.View style={group(intro[0])}>
          <View style={styles.hero}>
            <LiveMap />
            <LinearGradient
              colors={["transparent", "rgba(8,12,22,0.55)", "#0a0f1c"]}
              locations={[0, 0.55, 1]}
              style={styles.heroScrim}
              pointerEvents="none"
            />
            <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
              <Text style={styles.backText}>‹ Campaigns</Text>
            </Pressable>
            <View style={styles.heroBottom}>
              <Text style={styles.kicker}>GATHERING NOW</Text>
              <Text style={styles.jx}>{campaign.jurisdiction}</Text>
              <Text style={styles.title}>{campaign.title}</Text>
              <Text style={styles.petition}>{campaign.petition}</Text>
              <Text style={styles.tagline}>{movement.tagline}</Text>
              <View style={styles.liveLine}>
                <LiveDot />
                <Text style={styles.liveText}>
                  {movement.circulators.toLocaleString()} collecting now · {movement.validThisWeek.toLocaleString()} valid this week
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={styles.below}>
          <Animated.View style={group(intro[1])}>
            {assignment ? <Text style={styles.turfLine}>YOUR TURF · {assignment.label}</Text> : null}
            <View style={styles.directive}>
              <Text style={styles.directiveText}>→ {assignment?.directive ?? campaign.directive}</Text>
            </View>

            <View style={styles.facts}>
              <Fact n={`${campaign.shiftTargetValid}`} label="shift goal" />
              <Fact n={`${Math.round(campaign.expectedValidity * 100)}%`} label="expected valid" />
              <Fact n={payNum} label={paySub} />
            </View>

            {started ? (
              <View style={styles.resume}>
                <Text style={styles.resumeText}>
                  <Text style={styles.resumeNum}>{stats.valid}</Text> / {campaign.shiftTargetValid} valid so far this shift
                </Text>
              </View>
            ) : null}

            <TurfYield />
          </Animated.View>

          <Animated.View style={group(intro[2])}>
            <Text style={styles.section}>BEFORE YOU GO</Text>

            <Pressable
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
              onPress={() => openDirections(campaign.destination)}
            >
              <Text style={styles.actionIcon}>📍</Text>
              <View style={styles.actionBody}>
                <Text style={styles.actionTitle}>Get directions</Text>
                <Text style={styles.actionSub} numberOfLines={1}>{campaign.destination.label}</Text>
              </View>
              <Text style={styles.actionArrow}>↗</Text>
            </Pressable>

            {campaign.forms.map((f) => (
              <Pressable
                key={f.name}
                style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
                onPress={() => openForm(f)}
              >
                <Text style={styles.actionIcon}>🖨</Text>
                <View style={styles.actionBody}>
                  <Text style={styles.actionTitle}>{f.name}</Text>
                  {f.note ? <Text style={styles.actionSub} numberOfLines={1}>{f.note}</Text> : null}
                </View>
                <Text style={styles.actionArrow}>↗</Text>
              </Pressable>
            ))}
            <Text style={styles.formsHint}>Opens the official sheet — print or share from there.</Text>
          </Animated.View>

          <Animated.View style={group(intro[3])}>
            <Text style={styles.freshness}>
              index synced {campaign.indexAsOf} · {campaign.zips.length} zips · {campaign.areaShort}
            </Text>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Persistent action bar — primary CTA always reachable without scrolling */}
      <View style={styles.ctaBar}>
        <Pressable style={styles.cta} onPress={onStart}>
          <Text style={styles.ctaText}>{started ? "Resume collecting" : "Start collecting"} →</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Fact({ n, label }: { n: string; label: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factNum}>{n}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

const shadow = { textShadowColor: "rgba(0,0,0,0.65)", textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  wrap: { paddingBottom: 24 },

  hero: { height: 360, position: "relative", overflow: "hidden", backgroundColor: C.bg },
  heroScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: 185 },
  backBtn: {
    position: "absolute", top: 58, left: 18,
    backgroundColor: "rgba(10,15,28,0.66)", borderRadius: 20, paddingVertical: 6, paddingHorizontal: 11,
    borderWidth: 1, borderColor: "rgba(120,140,170,0.25)",
  },
  backText: { color: C.inkDim, fontFamily: MONO, fontSize: 12 },

  heroBottom: { position: "absolute", left: 22, right: 22, bottom: 20 },
  kicker: { color: C.gold, fontFamily: MONO, fontSize: 11, letterSpacing: 2.5 },
  jx: { color: C.ink, fontFamily: DISPLAY_BLACK, fontSize: 38, letterSpacing: -0.8, lineHeight: 42, marginTop: 4, ...shadow },
  title: { color: C.ink, fontFamily: DISPLAY_SEMI, fontSize: 18, marginTop: 4, ...shadow },
  petition: { color: C.inkDim, fontSize: 13, marginTop: 2, ...shadow },
  tagline: { color: C.gold, fontFamily: DISPLAY_SEMI, fontSize: 15, marginTop: 10, ...shadow },
  liveLine: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8 },
  liveText: { color: C.inkFaint, fontFamily: MONO, fontSize: 11 },

  below: { paddingHorizontal: 22, paddingTop: 22 },

  turfLine: { color: C.inkFaint, fontFamily: MONO, fontSize: 10, letterSpacing: 1.5, marginBottom: 8 },
  directive: { backgroundColor: C.mintDeep, borderRadius: 11, paddingVertical: 12, paddingHorizontal: 13 },
  directiveText: { color: C.mint, fontSize: 14, fontWeight: "600", lineHeight: 20 },

  facts: {
    flexDirection: "row", justifyContent: "space-between", marginTop: 14,
    backgroundColor: C.bgElev, borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingVertical: 16,
  },
  fact: { flex: 1, alignItems: "center" },
  factNum: { color: C.ink, fontFamily: MONO, fontSize: 24, fontWeight: "800" },
  factLabel: { color: C.inkFaint, fontFamily: MONO, fontSize: 10, marginTop: 3 },

  resume: { marginTop: 12, backgroundColor: "#08231c", borderRadius: 10, paddingVertical: 11, paddingHorizontal: 13 },
  resumeText: { color: C.inkDim, fontSize: 13 },
  resumeNum: { color: C.mint, fontWeight: "800" },

  section: { color: C.inkFaint, fontFamily: MONO, fontSize: 10, letterSpacing: 2.5, marginTop: 26, marginBottom: 10 },

  action: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.bgElev, borderWidth: 1, borderColor: C.line, borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 14, marginBottom: 9,
  },
  actionPressed: { backgroundColor: C.bgElev2 },
  actionIcon: { fontSize: 18 },
  actionBody: { flex: 1 },
  actionTitle: { color: C.ink, fontSize: 15, fontWeight: "600" },
  actionSub: { color: C.inkFaint, fontSize: 12, marginTop: 1 },
  actionArrow: { color: C.inkFaint, fontSize: 15, fontWeight: "700" },
  formsHint: { color: C.inkGhost, fontFamily: MONO, fontSize: 10, marginTop: 2, marginBottom: 8 },

  ctaBar: {
    paddingHorizontal: 22, paddingTop: 12, paddingBottom: 30,
    borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg,
  },
  cta: { backgroundColor: C.gold, borderRadius: 13, paddingVertical: 17, alignItems: "center" },
  ctaText: { color: C.ctaInk, fontSize: 17, fontWeight: "800", letterSpacing: 0.2 },

  freshness: { color: C.inkGhost, fontFamily: MONO, fontSize: 10, textAlign: "center", marginTop: 18, marginBottom: 8 },
});
