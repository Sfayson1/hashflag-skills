// Fails when a font binary is committed without a fonts.lock entry. Files are found by
// magic bytes, not names, because renamed commercial fonts have slipped through before.
// Usage: node lib/check-fonts.ts [repo root]
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MAGIC = ["wOF2", "wOFF", "OTTO", "ttcf", "true", "\x00\x01\x00\x00"];

export function checkFonts(root: string, files: string[]): string[] {
  const lock = JSON.parse(readFileSync(join(root, "fonts.lock"), "utf8")) as Record<string, { path: string; license: string; source: string }>;
  const errors: string[] = [];
  for (const f of files) {
    const data = readFileSync(join(root, f));
    if (!MAGIC.includes(data.subarray(0, 4).toString("latin1"))) continue;
    const entry = lock[createHash("sha256").update(data).digest("hex")];
    if (!entry) errors.push(`${f} is a font that is not in fonts.lock`);
    else if (!existsSync(join(root, entry.license))) errors.push(`${f}: license file ${entry.license} is missing`);
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ?? ".";
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  const errors = checkFonts(root, files);
  for (const e of errors) console.error(e);
  if (errors.length) process.exit(1);
  console.log("fonts ok");
}
