/**
 * Global address autocomplete — the connected-venue fallback (RFC-002-A1).
 *
 * When a signer is in NO local turf tile but the device has connectivity (the connected-venue case),
 * this completes the ADDRESS via an external geocoder so entry stays fast. It does NOT confirm voter
 * registration — the engine still does that (Tier 1b membership filter offline / Tier 2 /verify
 * online). Offline (the no-signal ballpark) it simply returns nothing and the circulator types
 * manually; the membership filter still gives the verdict.
 *
 * Provider-agnostic: one adapter, swappable via EXPO_PUBLIC_PLACES_URL. Default = Photon (OpenStreetMap;
 * free, keyless). For production prefer a self-hosted Photon (so signer addresses never leave your
 * infra) or a CASS-clean US provider (Smarty); the response mapping is the only thing to change.
 */
const PROVIDER_URL = process.env.EXPO_PUBLIC_PLACES_URL ?? "https://photon.komoot.io/api/";
const TIMEOUT_MS = 5000;

// Photon returns the full state name; the voter file + petitions use the 2-letter abbreviation.
const STATE_ABBR: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO",
  Connecticut: "CT", Delaware: "DE", "District of Columbia": "DC", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY",
  Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
  Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH",
  "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND",
  Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA",
  Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
};

interface PhotonProps {
  housenumber?: string; street?: string; name?: string; city?: string; town?: string; village?: string;
  county?: string; state?: string; postcode?: string; countrycode?: string;
}

/** Ranked address completions for a free-text query, US-only, house-numbered (a usable signer address).
 *  `bias` (the turf's lat/lon) ranks nearby results first, so a NC circulator isn't shown PA streets.
 *  Null on offline/timeout/error → the caller falls back to manual entry. */
export async function getAddressSuggest(query: string, bias?: { lat: number; lon: number }, limit = 5): Promise<string[] | null> {
  const q = query.trim();
  if (q.length < 4) return [];
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const near = bias ? `&lat=${bias.lat}&lon=${bias.lon}` : "";
  try {
    const r = await fetch(`${PROVIDER_URL}?q=${encodeURIComponent(q)}&limit=${limit * 2}&lang=en${near}`, { signal: ctrl.signal });
    if (!r.ok) return null;
    const data = (await r.json()) as { features?: Array<{ properties?: PhotonProps }> };
    const seen = new Set<string>();
    const out: string[] = [];
    for (const f of data.features ?? []) {
      const p = f.properties ?? {};
      if (p.countrycode && p.countrycode !== "US") continue;
      if (!p.housenumber || !p.street) continue; // need a real street address to be a usable signer line
      const city = p.city ?? p.town ?? p.village ?? p.county ?? "";
      const st = (p.state && STATE_ABBR[p.state]) ?? p.state ?? "";
      const line = `${p.housenumber} ${p.street}, ${city} ${st} ${p.postcode ?? ""}`.replace(/\s+/g, " ").replace(/ ,/g, ",").trim();
      if (seen.has(line)) continue;
      seen.add(line);
      out.push(line);
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return null; // offline / timeout — no global suggestions; manual entry + the membership filter still work
  } finally {
    clearTimeout(t);
  }
}
