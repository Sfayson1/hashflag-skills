import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkFonts } from "./check-fonts.ts";

test("every committed font in this repo is in fonts.lock", () => {
  const files = ["brands/default/fonts/Inter-400.woff2", "brands/default/fonts/JetBrainsMono-700.woff2", "README.md"];
  assert.deepEqual(checkFonts(".", files), []);
});

test("an unlisted font fails whatever its name", () => {
  const root = mkdtempSync(join(tmpdir(), "fonts-"));
  copyFileSync("fonts.lock", join(root, "fonts.lock"));
  writeFileSync(join(root, "logo.bin"), Buffer.concat([Buffer.from("wOF2"), Buffer.alloc(64)]));
  writeFileSync(join(root, "notes.txt"), "plain text");
  assert.deepEqual(checkFonts(root, ["logo.bin", "notes.txt"]), ["logo.bin is a font that is not in fonts.lock"]);
});

test("a listed font whose license file is missing fails", () => {
  const root = mkdtempSync(join(tmpdir(), "fonts-"));
  copyFileSync("fonts.lock", join(root, "fonts.lock"));
  copyFileSync("brands/default/fonts/Inter-400.woff2", join(root, "Inter-400.woff2"));
  assert.match(checkFonts(root, ["Inter-400.woff2"])[0], /license file .* is missing/);
});
