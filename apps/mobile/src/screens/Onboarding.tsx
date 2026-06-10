/**
 * Onboarding — the first-run sequence.
 *
 * Teaches the four things a circulator must internalize before their first capture: what the app
 * does (predict validity offline), what the three verdicts mean (only green counts), that it's
 * paper-assist (wet ink is still the binding artifact), how pay works (quality, not volume), and
 * that it works offline. Shown once, then a durable flag retires it (see store/prefs).
 *
 * Zero-dependency carousel: a horizontal paging ScrollView + dots + a Next/Get-started CTA. No
 * navigation library — onboarding is a single self-contained screen App swaps in before the tabs.
 */
import { useRef, useState } from "react";
import {
  Dimensions, type NativeScrollEvent, type NativeSyntheticEvent,
  Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import DawnBackdrop from "../components/DawnBackdrop";
import { C, MONO, DISPLAY } from "../theme";

const { width } = Dimensions.get("window");

interface Bullet { color: string; text: string }
interface Slide { tag: string; glyph: string; accent: string; title: string; body?: string; bullets?: Bullet[] }

// Campaign-agnostic (onboarding runs before a campaign is picked): every compensation basis
// — per-valid-signature, hourly, or volunteer — keys off VALID, so the message is the same.
const paySlide: Slide = {
  tag: "QUALITY IS WHAT COUNTS",
  glyph: "$",
  accent: C.gold,
  title: "Only valid signatures count",
  body: "Toward the goal — and, where a campaign pays, toward your pay. Review and duplicate lines don't count and don't pay, so a quick check saves wasted effort.",
};

const SLIDES: Slide[] = [
  {
    tag: "GATHER", glyph: "⚡", accent: C.mint,
    title: "Know before you collect",
    body: "Enter a signer's name and address and the app checks them against the voter file instantly — offline, before you collect the wet-ink signature. No more wasted effort on signatures that won't count.",
  },
  {
    tag: "THE THREE VERDICTS", glyph: "✓", accent: C.mint,
    title: "Only green counts",
    bullets: [
      { color: C.mint, text: "✓ Counts — a confident match to an active registered voter." },
      { color: C.amber, text: "⚠ Needs review — a probable match. Logged, but not counted as safe." },
      { color: C.rose, text: "✗ Won't count — not on the file, or not active." },
    ],
    body: "Only ✓ moves your goal and your pay.",
  },
  {
    tag: "PAPER-ASSIST", glyph: "✎", accent: C.accent,
    title: "You still collect the signature",
    body: "The wet-ink signature on paper is what's legally binding. The app validates the name + address and logs it — it speeds you up, it doesn't replace the paper.",
  },
  paySlide,
  {
    tag: "WORKS ANYWHERE", glyph: "⟳", accent: C.accent,
    title: "No signal needed",
    body: "Everything you capture is saved on your phone and syncs when you're back online. Your shift total is always safe.",
  },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState(0);
  const ref = useRef<ScrollView>(null);
  const last = page === SLIDES.length - 1;

  function onMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    if (p !== page) setPage(p);
  }
  function next() {
    if (last) return onDone();
    const p = page + 1;
    setPage(p);
    ref.current?.scrollTo({ x: p * width, animated: true });
  }

  return (
    <View style={styles.root}>
      <DawnBackdrop />
      <Pressable style={styles.skip} onPress={onDone} hitSlop={12}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
      >
        {SLIDES.map((s) => (
          <View key={s.tag} style={[styles.slide, { width }]}>
            <Text style={[styles.glyph, { color: s.accent }]}>{s.glyph}</Text>
            <Text style={[styles.tag, { color: s.accent }]}>{s.tag}</Text>
            <Text style={styles.title}>{s.title}</Text>
            {s.bullets ? (
              <View style={styles.bullets}>
                {s.bullets.map((b) => (
                  <Text key={b.text} style={[styles.bullet, { color: b.color }]}>{b.text}</Text>
                ))}
              </View>
            ) : null}
            {s.body ? <Text style={styles.body}>{s.body}</Text> : null}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => <View key={i} style={[styles.dot, i === page && styles.dotOn]} />)}
        </View>
        <Pressable style={styles.cta} onPress={next}>
          <Text style={styles.ctaText}>{last ? "Get started" : "Next"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  skip: { position: "absolute", top: 60, right: 22, zIndex: 2 },
  skipText: { color: C.inkFaint, fontFamily: MONO, fontSize: 13 },

  slide: { flex: 1, justifyContent: "center", paddingHorizontal: 34 },
  glyph: { fontSize: 60, fontWeight: "900", marginBottom: 20 },
  tag: { fontFamily: MONO, fontSize: 11, letterSpacing: 2.5, marginBottom: 10 },
  title: { color: C.ink, fontFamily: DISPLAY, fontSize: 34, letterSpacing: -0.4, lineHeight: 40, marginBottom: 16 },
  bullets: { gap: 12, marginBottom: 16 },
  bullet: { fontSize: 15, lineHeight: 21, fontWeight: "600" },
  body: { color: C.inkDim, fontSize: 16, lineHeight: 24 },

  footer: { paddingHorizontal: 24, paddingBottom: 46, gap: 18 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.line },
  dotOn: { backgroundColor: C.gold, width: 22 },
  cta: { backgroundColor: C.gold, borderRadius: 13, paddingVertical: 16, alignItems: "center" },
  ctaText: { color: C.ctaInk, fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
});
