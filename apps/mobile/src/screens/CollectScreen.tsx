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
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { makeContext, validateSigner, suggestVoters, isMember, type SignerVerdict, type VoterRecord } from "@campaign-os/engine";
import { getExamples } from "../data/voterIndex";
import { useCampaignIndex, getVoterList } from "../store/voterIndexStore";
import { useMembershipFilter } from "../store/membershipStore";
import { getVerify, type VerifyResult } from "../net/sync";
import { useActiveCampaign } from "../store/campaign";
import { useActiveAssignment } from "../store/assignment";
import { addCapture } from "../store/session";
import ShiftImpact from "../components/ShiftImpact";
import { C, MONO, VERDICT_COLOR, VERDICT_LABEL } from "../theme";

const TODAY = new Date().toISOString().slice(0, 10);

// Voter files store names/addresses in shouty all-caps with ragged spacing; show them like a person.
const pretty = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

interface Toast { text: string; color: string }

export default function CollectScreen() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [suggestions, setSuggestions] = useState<VoterRecord[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  const anim = useRef(new Animated.Value(0)).current;
  const seqRef = useRef<Animated.CompositeAnimation | null>(null);

  // Engine context + voter index both follow the picked campaign (jurisdiction drives the
  // verification mode; the index is that campaign's bounded, minimized per-geography slice).
  const campaign = useActiveCampaign();
  const assignment = useActiveAssignment(); // the optimizer's turf — labels the loaded index
  const ctx = useMemo(() => makeContext(campaign.jurisdiction), [campaign.jurisdiction]);
  const { index, voterCount, origin, builtAt } = useCampaignIndex(campaign.id); // bundled now → synced when the server pull lands
  const examples = getExamples(campaign.id);

  const ready = name.trim().length > 1 && address.trim().length > 3;

  // Live verdict — recomputed on every keystroke once there's enough to match against.
  const live: SignerVerdict | null = useMemo(
    () => (ready ? validateSigner({ id: "live", name, address, signedOn: TODAY, capture: "wet" }, index, ctx) : null),
    [name, address, ready, ctx, index],
  );

  // Tier 1b (RFC-002-A1, "the ballpark case"): for a venue assignment, a signer who's in NO loaded
  // turf tile (band NO_MATCH) can still be confirmed offline against the campaign's eligible-set
  // membership filter — "appears registered, confirm on sync." Tier 3 reconcile resolves it for real.
  const membership = useMembershipFilter(campaign.id, !!campaign.venue);
  const appearsRegistered = useMemo(
    () => !!(ready && live && live.band === "NO_MATCH" && membership && isMember(membership, name, address)),
    [ready, live, membership, name, address],
  );

  // Tier 2 (RFC-002-A1 §5): when a signer isn't in any loaded tile AND we have connectivity, ask the
  // server to match the full roll authoritatively — the upgrade over Tier 1b's "appears registered."
  // Debounced (it's a network call); offline → no-op and we fall back to Tier 1b / local.
  useEffect(() => {
    setVerifyResult(null);
    if (!(ready && live && live.band === "NO_MATCH")) return;
    let alive = true;
    const t = setTimeout(() => { void getVerify(campaign.id, name, address).then((r) => { if (alive && r) setVerifyResult(r); }); }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [name, address, ready, live?.band, campaign.id]);

  // Compose the verdict card across the ladder: Tier 1a (local tile) → Tier 2 (online /verify, when it
  // confirms VALID) → Tier 1b (membership filter) → local NO_MATCH.
  const card = useMemo(() => {
    if (!live) return null;
    if (live.band !== "NO_MATCH")
      return { color: VERDICT_COLOR[live.verdict], label: VERDICT_LABEL[live.verdict], score: live.score, voterId: live.voter?.id, voterName: live.voter?.name, voterStatus: live.voter?.status, reason: live.reasons[0], tag: undefined as string | undefined };
    if (verifyResult?.verdict === "VALID")
      return { color: C.mint, label: VERDICT_LABEL.VALID, score: verifyResult.score, voterId: verifyResult.matchedVoterId ?? undefined, voterName: undefined, voterStatus: undefined, reason: "Confirmed against the full voter roll online — we'll log it for reconcile.", tag: "verified online" };
    if (appearsRegistered)
      return { color: C.accent, label: "◇ APPEARS REGISTERED", score: 0, voterId: undefined, voterName: undefined, voterStatus: undefined, reason: "Not in your turf, but on the statewide voter roll — collect it; we'll confirm on sync.", tag: "statewide roll" };
    return { color: VERDICT_COLOR[live.verdict], label: VERDICT_LABEL[live.verdict], score: live.score, voterId: undefined, voterName: undefined, voterStatus: undefined, reason: live.reasons[0], tag: undefined as string | undefined };
  }, [live, verifyResult, appearsRegistered]);

  // Typeahead: as you type — or dictate — surface the registered voters in the synced turf so a tap
  // fills name+address AND pre-resolves the match (the live verdict below then reads VALID instantly).
  // Debounced; queries name+address together, so it narrows as you add either. Same engine
  // normalization as the matcher → tolerant of the messy, unpunctuated text voice dictation produces.
  useEffect(() => {
    if (!showSuggest) { setSuggestions([]); return; }
    const q = `${name} ${address}`.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(() => setSuggestions(suggestVoters(q, getVoterList(campaign.id), 6)), 130);
    return () => clearTimeout(t);
  }, [name, address, showSuggest, campaign.id]);

  function pick(v: VoterRecord) {
    setName(pretty(v.name));
    setAddress(pretty(v.address));
    setShowSuggest(false);
  }

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
    setShowSuggest(false);
  }

  const toastTranslate = anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  return (
    <View style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Text style={styles.formLabel}>RECORD A PAPER SIGNATURE</Text>
          <Text style={styles.indexNote}>
            matching {voterCount} voters · {assignment?.areaShort ?? campaign.areaShort} ·{" "}
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
            onChangeText={(t) => { setName(t); setShowSuggest(true); }}
          />
          <TextInput
            style={styles.input}
            placeholder="Street address, city ZIP"
            placeholderTextColor={C.inkGhost}
            autoCapitalize="words"
            autoCorrect={false}
            value={address}
            onChangeText={(t) => { setAddress(t); setShowSuggest(true); }}
          />

          {/* Typeahead suggestions from the synced turf — tap to fill + pre-resolve the match */}
          {showSuggest && suggestions.length > 0 ? (
            <View style={styles.suggestBox}>
              <Text style={styles.suggestHead}>REGISTERED VOTERS IN YOUR TURF</Text>
              {suggestions.map((v, i) => (
                <Pressable key={v.id} style={[styles.suggestRow, i > 0 && styles.suggestRowDiv]} onPress={() => pick(v)}>
                  <Text style={styles.suggestName} numberOfLines={1}>{pretty(v.name)}</Text>
                  <Text style={styles.suggestAddr} numberOfLines={1}>{pretty(v.address)}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* Verdict — composed across the ladder: Tier 1a (tile) → Tier 2 (online /verify) → Tier 1b (filter) → local */}
          {card ? (
            <View style={[styles.verdictCard, { borderColor: card.color }]}>
              <View style={styles.verdictTop}>
                <Text style={[styles.verdictText, { color: card.color }]}>{card.label}</Text>
                <Text style={styles.score}>{card.tag ?? (card.score > 0 ? card.score.toFixed(2) : "—")}</Text>
              </View>
              {card.voterId ? (
                <Text style={styles.matchLine}>
                  matched {card.voterId}{card.voterName ? ` · ${card.voterName}` : ""}{card.voterStatus ? ` · ${card.voterStatus}` : ""}
                </Text>
              ) : null}
              <Text style={styles.reason}>{card.reason}</Text>
            </View>
          ) : (
            <Text style={styles.idleHint}>Type or 🎤 dictate a name + address — we'll match it to your turf. Or tap an example.</Text>
          )}

          {/* Quick-fill examples */}
          <View style={styles.chips}>
            {examples.map((e) => (
              <Pressable key={e.label} style={styles.chip} onPress={() => { setName(e.name); setAddress(e.address); setShowSuggest(false); }}>
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

  suggestBox: { borderWidth: 1, borderColor: C.line, borderRadius: 11, backgroundColor: C.bgElev, overflow: "hidden", marginTop: -4 },
  suggestHead: { color: C.inkFaint, fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, paddingHorizontal: 13, paddingTop: 10, paddingBottom: 6 },
  suggestRow: { paddingHorizontal: 13, paddingVertical: 10, gap: 2 },
  suggestRowDiv: { borderTopWidth: 1, borderTopColor: C.line },
  suggestName: { color: C.ink, fontSize: 15, fontWeight: "600" },
  suggestAddr: { color: C.inkDim, fontFamily: MONO, fontSize: 11 },

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
