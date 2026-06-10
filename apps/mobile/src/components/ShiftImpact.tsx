/**
 * ShiftImpact — the motivating feedback panel.
 *
 * Turns the dry capture count into momentum: money earned (count-up), pace, distance to the shift
 * goal, and the mission-level stat — your sliver of the statewide signatures needed to make the
 * ballot. Everything keys off VALID only: review/invalid lines are shown but explicitly DON'T earn
 * and DON'T move the bar. That keeps the dopamine aligned with the product thesis (quality, not
 * raw volume) and with the legal bright line (NEEDS_REVIEW is never counted as safe).
 *
 * Earnings render by the assignment's `compensation.basis`, so a state that bans per-signature pay
 * shows hourly instead — the compliance rule is data, not a code path per state.
 */
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useActiveCampaign } from "../store/campaign";
import { deriveStats, useSession, type Capture } from "../store/session";
import { C, MONO } from "../theme";

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

function elapsedHours(caps: Capture[]): number {
  if (caps.length === 0) return 0;
  const earliest = caps.reduce((m, c) => Math.min(m, c.capturedAt), Infinity);
  return (Date.now() - earliest) / 3_600_000;
}

export default function ShiftImpact() {
  const campaign = useActiveCampaign();
  const COMP = campaign.compensation;
  const session = useSession();
  const stats = deriveStats(session);
  const valid = stats.valid;

  const hrs = elapsedHours(session.captures);
  const perHour = hrs > 0.05 ? valid / hrs : 0;

  // Earnings basis (compliance-driven): per-valid-signature, hourly, or volunteer "value created".
  const earned =
    COMP.basis === "hourly" ? hrs * COMP.rate : valid * COMP.rate; // volunteer uses valid * notional
  const earnedLabel = COMP.basis === "volunteer" ? "VALUE CREATED" : "EARNED THIS SHIFT";
  const basisLine =
    COMP.basis === "hourly"
      ? `${money(COMP.rate)} / hr · per-signature pay not allowed here`
      : COMP.basis === "volunteer"
        ? `${money(COMP.rate)} / valid signature donated`
        : `${money(COMP.rate)} / valid signature`;

  // Count-up on the money hero (JS value → must use useNativeDriver: false).
  const animVal = useRef(new Animated.Value(0)).current;
  const prevEarned = useRef(0);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const from = prevEarned.current;
    prevEarned.current = earned;
    if (from === earned) { setShown(earned); return; }
    animVal.setValue(from);
    const id = animVal.addListener(({ value }) => setShown(value));
    const a = Animated.timing(animVal, { toValue: earned, duration: 650, useNativeDriver: false });
    a.start(() => { animVal.removeListener(id); setShown(earned); });
    return () => animVal.removeListener(id);
  }, [earned, animVal]);

  // Pulse the hero when a valid signature lands.
  const scale = useRef(new Animated.Value(1)).current;
  const prevValid = useRef(valid);
  useEffect(() => {
    if (valid === prevValid.current) return;
    prevValid.current = valid;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.08, useNativeDriver: true, speed: 50, bounciness: 14 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }),
    ]).start();
  }, [valid, scale]);

  const toGoal = Math.max(0, campaign.shiftTargetValid - valid);
  const ballotPct = (valid / campaign.statewideRequired) * 100;
  const notEarning = stats.review + stats.invalid;

  return (
    <View style={styles.card}>
      <Text style={styles.heroLabel}>{earnedLabel}</Text>
      <Animated.Text style={[styles.hero, { transform: [{ scale }] }]}>{money(shown)}</Animated.Text>
      <Text style={styles.basis}>{basisLine}</Text>

      <View style={styles.statRow}>
        <Stat n={`${valid}`} label="valid" />
        <Stat n={perHour > 0 ? perHour.toFixed(1) : "—"} label="per hour" />
        <Stat n={`${toGoal}`} label="to goal" />
      </View>

      <View style={styles.ballot}>
        <Text style={styles.ballotText}>
          <Text style={styles.ballotNum}>{valid.toLocaleString()}</Text> of{" "}
          {campaign.statewideRequired.toLocaleString()} toward {campaign.jurisdiction}'s ballot line
        </Text>
        <Text style={styles.ballotPct}>{ballotPct < 0.01 && valid > 0 ? "<0.01" : ballotPct.toFixed(2)}%</Text>
      </View>

      {notEarning > 0 ? (
        <Text style={styles.foot}>
          {stats.review} need review · {stats.invalid} won't count — these don't earn
        </Text>
      ) : null}
    </View>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statNum}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.goldDeep, borderRadius: 16, borderWidth: 1, borderColor: C.gold,
    padding: 16, marginTop: 8, alignItems: "center",
  },
  heroLabel: { color: C.gold, fontFamily: MONO, fontSize: 10, letterSpacing: 2 },
  hero: { color: C.gold, fontSize: 48, fontWeight: "900", letterSpacing: -1.5, marginTop: 2 },
  basis: { color: C.inkDim, fontFamily: MONO, fontSize: 11, marginTop: 1 },

  statRow: {
    flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch",
    marginTop: 14, borderTopWidth: 1, borderTopColor: "#4a3a1c", paddingTop: 12,
  },
  stat: { alignItems: "center", flex: 1 },
  statNum: { color: C.ink, fontFamily: MONO, fontSize: 20, fontWeight: "800" },
  statLabel: { color: C.inkFaint, fontFamily: MONO, fontSize: 10, marginTop: 2 },

  ballot: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch",
    marginTop: 12, backgroundColor: "#08231c", borderRadius: 9, paddingVertical: 9, paddingHorizontal: 11,
  },
  ballotText: { color: C.inkDim, fontSize: 12, flex: 1, marginRight: 8, lineHeight: 16 },
  ballotNum: { color: C.mint, fontWeight: "800" },
  ballotPct: { color: C.mint, fontFamily: MONO, fontSize: 13, fontWeight: "700" },

  foot: { color: C.inkFaint, fontFamily: MONO, fontSize: 10, marginTop: 11, textAlign: "center" },
});
