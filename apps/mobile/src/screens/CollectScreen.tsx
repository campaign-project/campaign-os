/**
 * Collect — the lean capture screen (working mode).
 *
 * You already accepted the assignment on the briefing, so this screen is all signal: enter a
 * signer's name + address and the SAME engine the server runs predicts — offline, against the
 * synced index — whether the signature will count, BEFORE you collect the wet-ink signature.
 * Assignment context lives in the top bar; progress + earnings live in ShiftImpact below.
 *
 * Capture mode is paper-assist (wet ink is the binding artifact for all 51 indep-presidential
 * jurisdictions). The app validates and logs; it does not replace the paper signature.
 */
import { useMemo, useRef, useState } from "react";
import {
  Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { makeContext, validateSigner, type SignerVerdict } from "@campaign-os/engine";
import { getExamples } from "../data/voterIndex";
import { useCampaignIndex } from "../store/voterIndexStore";
import { useActiveCampaign } from "../store/campaign";
import { addCapture } from "../store/session";
import ShiftImpact from "../components/ShiftImpact";
import { C, MONO, VERDICT_COLOR, VERDICT_LABEL } from "../theme";

const TODAY = new Date().toISOString().slice(0, 10);

interface Toast { text: string; color: string }

export default function CollectScreen() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const anim = useRef(new Animated.Value(0)).current;
  const seqRef = useRef<Animated.CompositeAnimation | null>(null);

  // Engine context + voter index both follow the picked campaign (jurisdiction drives the
  // verification mode; the index is that campaign's bounded, minimized per-geography slice).
  const campaign = useActiveCampaign();
  const ctx = useMemo(() => makeContext(campaign.jurisdiction), [campaign.jurisdiction]);
  const { index, voterCount, origin, builtAt } = useCampaignIndex(campaign.id); // bundled now → synced when the server pull lands
  const examples = getExamples(campaign.id);

  const ready = name.trim().length > 1 && address.trim().length > 3;

  // Live verdict — recomputed on every keystroke once there's enough to match against.
  const live: SignerVerdict | null = useMemo(
    () => (ready ? validateSigner({ id: "live", name, address, signedOn: TODAY, capture: "wet" }, index, ctx) : null),
    [name, address, ready, ctx, index],
  );

  function flashToast(verdict: SignerVerdict["verdict"], who: string) {
    setToast({ text: `${who} · ${VERDICT_LABEL[verdict]}`, color: VERDICT_COLOR[verdict] });
    seqRef.current?.stop();
    anim.setValue(0);
    seqRef.current = Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(anim, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]);
    seqRef.current.start();
  }

  function log() {
    if (!ready || !live) return;
    const who = name.trim();
    addCapture({ id: "live", name: who, address: address.trim(), signedOn: TODAY, capture: "wet" }, live);
    flashToast(live.verdict, who);
    setName("");
    setAddress("");
  }

  const toastTranslate = anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <View style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={styles.formLabel}>RECORD A PAPER SIGNATURE</Text>
          <Text style={styles.indexNote}>
            matching {voterCount} voters · {campaign.areaShort} ·{" "}
            <Text style={{ color: origin === "synced" ? C.mint : C.inkGhost }}>
              {origin === "synced" ? `synced ✓ ${builtAt}` : "bundled"}
            </Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Signer's full name"
            placeholderTextColor={C.inkGhost}
            autoCapitalize="words"
            autoCorrect={false}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Street address, city ZIP"
            placeholderTextColor={C.inkGhost}
            autoCapitalize="words"
            autoCorrect={false}
            value={address}
            onChangeText={setAddress}
          />

          {/* Live verdict */}
          {live ? (
            <View style={[styles.verdictCard, { borderColor: VERDICT_COLOR[live.verdict] }]}>
              <View style={styles.verdictTop}>
                <Text style={[styles.verdictText, { color: VERDICT_COLOR[live.verdict] }]}>
                  {VERDICT_LABEL[live.verdict]}
                </Text>
                <Text style={styles.score}>{live.score > 0 ? live.score.toFixed(2) : "—"}</Text>
              </View>
              {live.voter ? (
                <Text style={styles.matchLine}>
                  matched {live.voter.id} · {live.voter.name} · {live.voter.status}
                </Text>
              ) : null}
              <Text style={styles.reason}>{live.reasons[0]}</Text>
            </View>
          ) : (
            <Text style={styles.idleHint}>Type a name + address, or tap an example below to try it.</Text>
          )}

          {/* Quick-fill examples */}
          <View style={styles.chips}>
            {examples.map((e) => (
              <Pressable key={e.label} style={styles.chip} onPress={() => { setName(e.name); setAddress(e.address); }}>
                <Text style={styles.chipText}>{e.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Log */}
          <Pressable style={[styles.logBtn, !ready && styles.logBtnOff]} disabled={!ready} onPress={log}>
            <Text style={[styles.logBtnText, !ready && styles.logBtnTextOff]}>Log paper signature</Text>
          </Pressable>

          <ShiftImpact />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Confirmation toast — floats above the content, auto-dismisses */}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, { borderColor: toast.color, opacity: anim, transform: [{ translateY: toastTranslate }] }]}
        >
          <View style={[styles.toastBar, { backgroundColor: toast.color }]} />
          <View style={styles.toastBody}>
            <Text style={styles.toastTitle}>Signature logged</Text>
            <Text style={[styles.toastSub, { color: toast.color }]}>{toast.text}</Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { padding: 18, paddingBottom: 40, gap: 12 },

  formLabel: { color: C.inkFaint, fontFamily: MONO, fontSize: 10, letterSpacing: 2, marginTop: 4 },
  indexNote: { color: C.inkGhost, fontFamily: MONO, fontSize: 10, marginTop: 5 },
  input: {
    backgroundColor: C.bgElev, borderWidth: 1, borderColor: C.line, borderRadius: 11,
    paddingHorizontal: 14, paddingVertical: 13, color: C.ink, fontSize: 16,
  },

  verdictCard: { borderWidth: 1.5, borderRadius: 13, padding: 14, backgroundColor: C.bgElev, gap: 5 },
  verdictTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  verdictText: { fontFamily: MONO, fontSize: 15, fontWeight: "800", letterSpacing: 0.3 },
  score: { color: C.inkFaint, fontFamily: MONO, fontSize: 14 },
  matchLine: { color: C.inkDim, fontFamily: MONO, fontSize: 11 },
  reason: { color: C.inkFaint, fontSize: 12, lineHeight: 17 },

  idleHint: { color: C.inkGhost, fontSize: 12, lineHeight: 17, paddingVertical: 4 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 2 },
  chip: { borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: C.bgElev },
  chipText: { color: C.inkDim, fontFamily: MONO, fontSize: 11 },

  logBtn: { backgroundColor: C.gold, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  logBtnOff: { backgroundColor: C.bgElev2 },
  logBtnText: { color: C.ctaInk, fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
  logBtnTextOff: { color: C.inkGhost },

  toast: {
    position: "absolute", left: 16, right: 16, bottom: 18,
    flexDirection: "row", alignItems: "stretch", overflow: "hidden",
    backgroundColor: C.bgElev2, borderWidth: 1.5, borderRadius: 13,
    shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  toastBar: { width: 5 },
  toastBody: { paddingVertical: 12, paddingHorizontal: 14, gap: 2, flex: 1 },
  toastTitle: { color: C.ink, fontSize: 14, fontWeight: "700" },
  toastSub: { fontFamily: MONO, fontSize: 12 },
});
