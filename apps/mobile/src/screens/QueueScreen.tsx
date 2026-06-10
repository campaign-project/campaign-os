/**
 * Queue — the capture log with visible sync state.
 *
 * Every logged signature sits here as `pending` until flushed to the server, then `synced`. Sync is
 * a REAL round-trip: pressing Sync POSTs the pending queue, the server dedups across all volunteers,
 * and captures flip to synced ONLY on its ack (a duplicate it caught is labelled here). Offline, the
 * queue stays pending — nothing is lost. The device is a cache; the server is the source of truth.
 */
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useActiveCampaign } from "../store/campaign";
import { deriveStats, syncPending, useSession, type Capture } from "../store/session";
import { C, MONO, DISPLAY, VERDICT_COLOR, VERDICT_TAG } from "../theme";

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function Row({ c }: { c: Capture }) {
  const color = VERDICT_COLOR[c.result.verdict];
  return (
    <View style={styles.row}>
      <View style={[styles.tick, { backgroundColor: color }]} />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>{c.signer.name}</Text>
          <Text style={[styles.rowTag, { color }]}>{VERDICT_TAG[c.result.verdict]}</Text>
        </View>
        <Text style={styles.rowAddr} numberOfLines={1}>{c.signer.address}</Text>
        <View style={styles.rowMeta}>
          <Text style={[styles.syncDot, c.sync === "synced" ? styles.synced : styles.pending]}>
            {c.sync === "synced" ? "● synced" : "○ pending"}
          </Text>
          <Text style={styles.rowTime}>{timeAgo(c.capturedAt)}</Text>
        </View>
        {c.serverNote ? <Text style={styles.serverNote}>↳ {c.serverNote}</Text> : null}
      </View>
    </View>
  );
}

export default function QueueScreen() {
  const session = useSession();
  const stats = deriveStats(session);
  const campaign = useActiveCampaign();
  const [syncing, setSyncing] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function doSync() {
    setSyncing(true);
    setNote(null);
    const r = await syncPending(campaign.id);
    setSyncing(false);
    if (r.offline) setNote("⚠ Offline — captures stay queued and sync when you reconnect.");
    else if (r.synced > 0) setNote(`✓ Synced ${r.synced}${r.duplicates ? ` · server dropped ${r.duplicates} duplicate${r.duplicates > 1 ? "s" : ""}` : ""}.`);
  }

  const canSync = stats.pending > 0 && !syncing;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.kicker}>CAPTURE QUEUE</Text>
        <Text style={styles.h1}>{stats.total} captured</Text>
        <View style={styles.statRow}>
          <Stat n={stats.valid} label="count" color={C.mint} />
          <Stat n={stats.review} label="review" color={C.amber} />
          <Stat n={stats.invalid} label="won't" color={C.rose} />
          <Stat n={stats.pending} label="pending" color={C.accent} />
        </View>
      </View>

      <Pressable
        style={[styles.syncBtn, !canSync && styles.syncBtnOff]}
        disabled={!canSync}
        onPress={doSync}
      >
        <Text style={[styles.syncBtnText, !canSync && styles.syncBtnTextOff]}>
          {syncing ? "Syncing…" : stats.pending > 0 ? `Sync ${stats.pending} pending` : "All synced"}
        </Text>
      </Pressable>
      {note ? <Text style={styles.note}>{note}</Text> : null}

      {session.captures.length === 0 ? (
        <Text style={styles.empty}>No captures yet. Log signatures on the Collect tab.</Text>
      ) : (
        session.captures.map((c) => <Row key={c.seq} c={c} />)
      )}

      {session.captures.length > 0 ? (
        <Text style={styles.foot}>
          Server reconciles at sync — duplicate signers across volunteers are dropped there, so the
          accepted total can be below this local count.
        </Text>
      ) : null}
    </ScrollView>
  );
}

function Stat({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statNum, { color }]}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { padding: 18, paddingBottom: 40, gap: 10 },
  head: { backgroundColor: C.bgElev, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 16 },
  kicker: { color: C.accent, fontFamily: MONO, fontSize: 10, letterSpacing: 2 },
  h1: { color: C.ink, fontFamily: DISPLAY, fontSize: 28, letterSpacing: -0.4, marginTop: 2, marginBottom: 12 },
  statRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "center", flex: 1 },
  statNum: { fontFamily: MONO, fontSize: 22, fontWeight: "800" },
  statLabel: { color: C.inkGhost, fontFamily: MONO, fontSize: 10, marginTop: 2 },

  syncBtn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 2 },
  syncBtnOff: { backgroundColor: C.bgElev2 },
  syncBtnText: { color: "#04161d", fontSize: 15, fontWeight: "800", letterSpacing: 0.2 },
  syncBtnTextOff: { color: C.inkGhost },
  note: { color: C.inkDim, fontFamily: MONO, fontSize: 11, textAlign: "center", lineHeight: 16 },

  row: { flexDirection: "row", backgroundColor: C.bgElev, borderRadius: 12, borderWidth: 1, borderColor: C.lineSoft, overflow: "hidden" },
  tick: { width: 4 },
  rowBody: { flex: 1, padding: 12, gap: 3 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  rowName: { color: C.ink, fontSize: 15, fontWeight: "600", flex: 1, marginRight: 8 },
  rowTag: { fontFamily: MONO, fontSize: 11, fontWeight: "700" },
  rowAddr: { color: C.inkFaint, fontSize: 12 },
  rowMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  syncDot: { fontFamily: MONO, fontSize: 10 },
  pending: { color: C.accent },
  synced: { color: C.inkGhost },
  rowTime: { color: C.inkGhost, fontFamily: MONO, fontSize: 10 },
  serverNote: { color: C.amber, fontFamily: MONO, fontSize: 10, marginTop: 1 },

  empty: { color: C.inkGhost, fontSize: 13, textAlign: "center", marginTop: 28 },
  foot: { color: C.inkGhost, fontFamily: MONO, fontSize: 10, lineHeight: 16, marginTop: 8 },
});
