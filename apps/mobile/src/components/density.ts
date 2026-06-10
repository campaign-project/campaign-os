/**
 * density — adaptive zoom + activity from where you actually are.
 *
 * Circulator density is not uniform: in a metro there are people gathering signatures right around
 * you; in a rural area there aren't — the nearest activity is in the closest town. So we model
 * "where people circulate" as a set of population centers, and let the distance to the NEAREST one
 * drive everything: the map zoom (tight when close, zoomed-out when far so the nearest activity is
 * visible) and the dots (clustered around YOU when urban, clustered around the distant CITY when
 * rural — your beacon alone in your spot, which is the truth).
 *
 * Synthetic centers stand in for a real circulator-density layer the server would push down.
 */
import type { DotSpec, PingSpec } from "./LiveMovement";

// Must match LiveMap's region offset and the beacon's y (0.5 - UP = 0.38).
export const UP = 0.12;

interface Center { name: string; lat: number; lng: number }

// Stand-in activity centers (major US metros + the OH turf cities). The simulator's default
// location (≈ Apple HQ) lands near San Jose, so it reads as urban out of the box.
const CENTERS: Center[] = [
  { name: "Columbus", lat: 39.9612, lng: -82.9988 },
  { name: "Cleveland", lat: 41.4993, lng: -81.6944 },
  { name: "Cincinnati", lat: 39.1031, lng: -84.512 },
  { name: "New York", lat: 40.7128, lng: -74.006 },
  { name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
  { name: "Chicago", lat: 41.8781, lng: -87.6298 },
  { name: "Houston", lat: 29.7604, lng: -95.3698 },
  { name: "Phoenix", lat: 33.4484, lng: -112.074 },
  { name: "Philadelphia", lat: 39.9526, lng: -75.1652 },
  { name: "San Antonio", lat: 29.4241, lng: -98.4936 },
  { name: "Dallas", lat: 32.7767, lng: -96.797 },
  { name: "San Jose", lat: 37.3382, lng: -121.8863 },
  { name: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { name: "Austin", lat: 30.2672, lng: -97.7431 },
  { name: "Denver", lat: 39.7392, lng: -104.9903 },
  { name: "Seattle", lat: 47.6062, lng: -122.3321 },
  { name: "Boston", lat: 42.3601, lng: -71.0589 },
  { name: "Atlanta", lat: 33.749, lng: -84.388 },
  { name: "Miami", lat: 25.7617, lng: -80.1918 },
  { name: "Detroit", lat: 42.3314, lng: -83.0458 },
  { name: "Minneapolis", lat: 44.9778, lng: -93.265 },
  { name: "Portland", lat: 45.5152, lng: -122.6784 },
];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function dot(x: number, y: number): DotSpec {
  return { x, y, delay: rnd(0, 2400), up: rnd(700, 1500), down: rnd(1100, 2100), min: rnd(0.34, 0.6) };
}

export interface Activity {
  latDelta: number;
  dots: DotSpec[];
  pings: PingSpec[];
  beacon: { x: number; y: number };
  label: string; // local-density caption for the map
}

/** Decide zoom + dot density/placement from how close you are to the nearest activity center. */
export function computeActivity(lat: number, lng: number): Activity {
  let nearest = CENTERS[0];
  let dist = Infinity;
  for (const c of CENTERS) {
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < dist) { dist = d; nearest = c; }
  }
  const mi = Math.round(dist * 0.621);

  // Distance → zoom (latitudeDelta) and how many circulators are realistically nearby.
  let latDelta: number;
  let count: number;
  let urban: boolean;
  if (dist <= 8) { latDelta = 0.022; count = 9; urban = true; }        // in a metro
  else if (dist <= 35) { latDelta = 0.2; count = 5; urban = false; }   // metro edge / suburb
  else if (dist <= 120) { latDelta = clamp((2 * dist) / 111 * 1.25, 0.2, 1.4); count = 3; urban = false; }
  else { latDelta = clamp((2 * dist) / 111 * 1.2, 1.4, 5); count = 2; urban = false; } // rural — zoom way out

  // Where the nearest city lands on screen, given the offset region (lngDelta = latDelta).
  const centerLat = lat - UP * latDelta;
  const cityX = clamp(0.5 + (nearest.lng - lng) / latDelta, 0.12, 0.88) * 100;
  const cityY = clamp(0.5 - (nearest.lat - centerLat) / latDelta, 0.12, 0.6) * 100;

  const dots: DotSpec[] = [];
  for (let i = 0; i < count; i++) {
    if (urban) dots.push(dot(rnd(15, 85), rnd(15, 50)));                                  // around you
    else dots.push(dot(clamp(cityX + rnd(-12, 12), 8, 92), clamp(cityY + rnd(-10, 10), 10, 55))); // around the city
  }

  const pings: PingSpec[] =
    dots.length >= 2 ? [{ x: dots[0].x, y: dots[0].y, offset: 0 }, { x: dots[1].x, y: dots[1].y, offset: 6000 }]
    : dots.length === 1 ? [{ x: dots[0].x, y: dots[0].y, offset: 0 }]
    : [];

  const label = urban ? `${count} collecting nearby` : `nearest · ${nearest.name} ${mi} mi`;

  return { latDelta, dots, pings, beacon: { x: 50, y: 38 }, label };
}
