/**
 * LiveMap — the real map background for the briefing hero.
 *
 * Dark Apple Maps tiles centered on YOUR location (device GPS, falling back to the assignment turf
 * if permission is denied/unavailable). The ZOOM and the activity ADAPT to where you are
 * (computeActivity): tight with circulators around you in a metro; zoomed-out with a couple of dots
 * over the nearest town when you're rural — your beacon alone in your spot. The map is
 * gesture-disabled and pointer-transparent so the page scrolls and the fixed overlay stays aligned.
 *
 * react-native-maps is bundled in Expo Go (iOS → Apple Maps, no key); if the native module is
 * absent the ErrorBoundary swaps in a gradient field so the hero still looks alive — never a crash.
 */
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useActiveCampaign } from "../store/campaign";
import { C, MONO } from "../theme";
import { ActivityField } from "./LiveMovement";
import { computeActivity, UP } from "./density";

let Maps: typeof import("react-native-maps") | null = null;
try {
  Maps = require("react-native-maps");
} catch {
  Maps = null;
}
const MapView: any = Maps?.default ?? null;

function regionFor(lat: number, lng: number, latDelta: number) {
  // Offset center south by UP·latΔ so the real point renders ~38% from top (above the scrim).
  return { latitude: lat - UP * latDelta, longitude: lng, latitudeDelta: latDelta, longitudeDelta: latDelta };
}

function FallbackBg() {
  return (
    <LinearGradient colors={["#101a30", "#0a1120", "#070d18"]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
  );
}

/** If the native map view fails to mount, fall back to the gradient field instead of crashing. */
class MapBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <FallbackBg /> : this.props.children; }
}

export default function LiveMap() {
  const { lat, lng } = useActiveCampaign().destination;
  const mapRef = useRef<any>(null);
  const [act, setAct] = useState(() => computeActivity(lat, lng));

  // Pan to the device's real location once granted, adapting zoom + density to it.
  useEffect(() => {
    if (!MapView) return;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled || status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const next = computeActivity(pos.coords.latitude, pos.coords.longitude);
        setAct(next);
        mapRef.current?.animateToRegion(regionFor(pos.coords.latitude, pos.coords.longitude, next.latDelta), 900);
      } catch {
        /* denied, timed out, or no fix — stay on the assignment turf */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      {MapView ? (
        <MapBoundary>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            userInterfaceStyle="dark"
            initialRegion={regionFor(lat, lng, act.latDelta)}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
            pointerEvents="none"
          />
        </MapBoundary>
      ) : (
        <FallbackBg />
      )}
      <View style={styles.dim} pointerEvents="none" />
      <ActivityField dots={act.dots} pings={act.pings} beacon={act.beacon} />
      <View style={styles.localTag} pointerEvents="none">
        <Text style={styles.localTagText}>{act.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(7,13,24,0.30)" },
  localTag: {
    position: "absolute", top: 58, right: 22,
    backgroundColor: "rgba(10,15,28,0.66)", borderRadius: 20, paddingVertical: 6, paddingHorizontal: 11,
    borderWidth: 1, borderColor: "rgba(120,140,170,0.25)",
  },
  localTagText: { color: C.inkDim, fontFamily: MONO, fontSize: 11 },
});
