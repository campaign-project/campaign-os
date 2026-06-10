/**
 * LiveMovement — the live-activity primitives (overlaid on the map or a fallback gradient).
 *
 * The "it's alive" motion: circulator dots that blink/breathe (each on its OWN randomized timing,
 * never in lockstep) and signatures that land occasionally (~one ripple every ~6s). Every
 * animation is an Animated.loop on the NATIVE DRIVER — UI thread, no setState/timers.
 *
 * WHERE and HOW MANY dots appear is decided by `computeActivity` (see density.ts) from your real
 * location, so this is a pure renderer: `ActivityField` takes the dots/pings/beacon as props.
 * `LiveDot` is the small "live" pulse used in headers.
 */
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { C, MONO } from "../theme";

export interface DotSpec { x: number; y: number; delay: number; up: number; down: number; min: number }
export interface PingSpec { x: number; y: number; offset: number }

function TwinkleDot({ x, y, delay, up, down, min }: DotSpec) {
  const a = useRef(new Animated.Value(min)).current;
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: up, useNativeDriver: true }),
        Animated.timing(a, { toValue: min, duration: down, useNativeDriver: true }),
      ])),
    ]);
    anim.start();
    return () => anim.stop();
  }, [a, delay, up, down, min]);
  const scale = a.interpolate({ inputRange: [min, 1], outputRange: [0.9, 1.08] });
  return <Animated.View style={[styles.dot, { left: `${x}%`, top: `${y}%`, opacity: a, transform: [{ scale }] }]} />;
}

function Ping({
  x, y, offset = 0, rest = 9000, color = C.gold,
}: { x: number; y: number; offset?: number; rest?: number; color?: string }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(offset),
      Animated.loop(Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.delay(rest),
        Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true }), // reset so it can fire again
      ])),
    ]);
    anim.start();
    return () => anim.stop();
  }, [a, offset, rest]);
  const scale = a.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const opacity = a.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.5, 0] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ring, { left: `${x}%`, top: `${y}%`, borderColor: color, opacity, transform: [{ scale }] }]}
    />
  );
}

export function LiveDot() {
  const a = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 1100, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0.4, duration: 1300, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [a]);
  return <Animated.View style={[styles.liveDot, { opacity: a }]} />;
}

/** The activity overlay — absolute-positioned dots/rings/beacon; place over a relative parent. */
export function ActivityField({
  dots, pings, beacon = { x: 50, y: 38 },
}: { dots: DotSpec[]; pings: PingSpec[]; beacon?: { x: number; y: number } }) {
  return (
    <>
      {dots.map((d, i) => <TwinkleDot key={`d${i}`} {...d} />)}
      {pings.map((p, i) => <Ping key={`p${i}`} x={p.x} y={p.y} offset={p.offset} rest={9000} />)}

      {/* You — a steady, gentle "you are here" beacon pulse. */}
      <Ping x={beacon.x} y={beacon.y} offset={0} rest={1400} color={C.gold} />
      <View style={[styles.beacon, { left: `${beacon.x}%`, top: `${beacon.y}%` }]} />
      <Text style={[styles.youLabel, { left: `${beacon.x}%`, top: `${beacon.y}%` }]}>you</Text>
    </>
  );
}

const RING = 60;
const styles = StyleSheet.create({
  dot: { position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: C.mint, marginLeft: -4, marginTop: -4 },
  ring: {
    position: "absolute", width: RING, height: RING, borderRadius: RING / 2, borderWidth: 1.5,
    marginLeft: -RING / 2, marginTop: -RING / 2,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.mint },
  beacon: {
    position: "absolute", width: 14, height: 14, borderRadius: 7, backgroundColor: C.gold,
    marginLeft: -7, marginTop: -7, borderWidth: 2, borderColor: "#fff3d6",
  },
  youLabel: { position: "absolute", color: C.gold, fontFamily: MONO, fontSize: 9, fontWeight: "700", marginLeft: 11, marginTop: -5 },
});
