/**
 * TurfYield — Moat B, surfaced.
 *
 * Validity-by-location, aggregated across ALL volunteers (the server's yield store), Beta-Binomial
 * smoothed so a tiny sample doesn't read as 100%. This is the proprietary signal that makes the
 * briefing's "highest valid-per-hour" directive true: it shows WHICH turf actually yields valid
 * signatures. Fetched live; falls back to the campaign's model prior until signatures have synced.
 */
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useActiveCampaign } from "../store/campaign";
import { getYield, type YieldResult } from "../net/sync";
import { C, MONO } from "../theme";

const pct = (r: number) => `${Math.round(r * 100)}%`;
const rateColor = (r: number) => (r >= 0.75 ? C.mint : r >= 0.5 ? C.amber : C.rose);

export default function TurfYield() {
  const campaign = useActiveCampaign();
  const [data, setData] = useState<YieldResult | null>(null);
  useEffect(() => { getYield(campaign.id).then(setData); }, [campaign.id]);

  const hasData = !!data && data.overall.total > 0;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.kicker}>TURF YIELD · LIVE</Text>
        <Text style={[styles.overall, { color: hasData ? rateColor(data!.overall.rate) : C.inkFaint }]}>
          {hasData ? pct(data!.overall.rate) : pct(campaign.expectedValidity)}
        </Text>
      </View>

      {hasData ? (
        <>
          {data!.byZip.map((z) => (
            <View key={z.zip} style={styles.row}>
              <Text style={styles.zip}>{z.zip}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round(z.rate * 100)}%`, backgroundColor: rateColor(z.rate) }]} />
              </View>
              <Text style={[styles.rate, { color: rateColor(z.rate) }]}>{pct(z.rate)}</Text>
              <Text style={styles.n}>n={z.total}</Text>
            </View>
          ))}
          <Text style={styles.foot}>validity by zip · all volunteers · smoothed · updates as signatures sync</Text>
        </>
      ) : (
        <Text style={styles.empty}>
          No signatures synced yet — showing the model's prior. This fills with observed validity by
          zip (across all volunteers) as captures sync.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 14, backgroundColor: C.bgElev, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 14 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
  kicker: { color: C.inkFaint, fontFamily: MONO, fontSize: 10, letterSpacing: 2 },
  overall: { fontFamily: MONO, fontSize: 20, fontWeight: "800" },

  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 },
  zip: { color: C.inkDim, fontFamily: MONO, fontSize: 11, width: 42 },
  track: { flex: 1, height: 7, borderRadius: 4, backgroundColor: C.bgElev2, overflow: "hidden" },
  fill: { height: 7, borderRadius: 4 },
  rate: { fontFamily: MONO, fontSize: 11, fontWeight: "700", width: 36, textAlign: "right" },
  n: { color: C.inkGhost, fontFamily: MONO, fontSize: 10, width: 40, textAlign: "right" },

  foot: { color: C.inkGhost, fontFamily: MONO, fontSize: 9, marginTop: 4, lineHeight: 14 },
  empty: { color: C.inkFaint, fontSize: 12, lineHeight: 17 },
});
