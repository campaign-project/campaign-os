/**
 * Gather — durable app preferences (key-value).
 *
 * A tiny SQLite-backed flag store for first-run / app-level state that must survive reloads —
 * starting with whether the circulator has seen onboarding. Separate from the capture session
 * store (different concern) but shares the same `gather.db` file. Same defensive contract: if
 * SQLite is unavailable, reads return the default and the app still runs (onboarding just shows
 * again — harmless).
 */
import * as SQLite from "expo-sqlite";

export const ONBOARDED = "onboarded";

let db: SQLite.SQLiteDatabase | null = null;
try {
  db = SQLite.openDatabaseSync("gather.db");
  db.execSync(`CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
} catch (e) {
  console.warn("[prefs] SQLite unavailable — flags non-durable this session:", e);
  db = null;
}

export function getFlag(key: string): boolean {
  if (!db) return false;
  try {
    const row = db.getFirstSync<{ value: string }>("SELECT value FROM app_meta WHERE key = ?", [key]);
    return row?.value === "1";
  } catch (e) {
    console.warn("[prefs] read failed:", e);
    return false;
  }
}

export function setFlag(key: string, on: boolean): void {
  if (!db) return;
  try {
    db.runSync(
      "INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, on ? "1" : "0"],
    );
  } catch (e) {
    console.warn("[prefs] write failed:", e);
  }
}
