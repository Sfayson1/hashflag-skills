// One JSON file. Fine for a few thousand readings; swap for SQLite if a trail ever gets busier than that.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const DATA_FILE = process.env.TRAIL_COUNTER_FILE ?? "readings.json";

export function load() {
  return existsSync(DATA_FILE) ? JSON.parse(readFileSync(DATA_FILE, "utf8")) : [];
}

export function addReading(reading) {
  const all = load();
  all.push(reading);
  writeFileSync(DATA_FILE, JSON.stringify(all, null, 2));
  return reading;
}

export function listReadings(trail) {
  return load()
    .filter((r) => !trail || r.trail === trail)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
