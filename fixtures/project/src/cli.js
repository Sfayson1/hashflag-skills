#!/usr/bin/env node
// Trail Counter: record and export trailhead counts. Fictional example input for the project-demo skill.
import { pathToFileURL } from "node:url";
import { addReading, listReadings } from "./store.js";

const HELP = `Usage: trail-counter <command>
  add <trail> <count> [date]   record a reading (date defaults to today)
  list [trail]                 show readings, newest first
  csv [trail]                  print readings as CSV
  report <month>               monthly report for the parks board`;

export function toCsv(rows) {
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v));
  return ["trail,count,date", ...rows.map((r) => [r.trail, r.count, r.date].map(esc).join(","))].join("\n");
}

export function run(argv) {
  const [cmd, ...args] = argv;
  switch (cmd) {
    case "add": {
      const [trail, count, date] = args;
      if (!trail || !/^\d+$/.test(count ?? "")) return { code: 1, out: HELP };
      return { code: 0, out: JSON.stringify(addReading({ trail, count: Number(count), date: date ?? new Date().toISOString().slice(0, 10) })) };
    }
    case "list":
      return { code: 0, out: listReadings(args[0]).map((r) => `${r.date}  ${r.trail}  ${r.count}`).join("\n") };
    case "csv":
      return { code: 0, out: toCsv(listReadings(args[0])) };
    default:
      return { code: 1, out: HELP };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { code, out } = run(process.argv.slice(2));
  console.log(out);
  process.exit(code);
}
