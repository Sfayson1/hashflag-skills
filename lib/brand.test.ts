import { test } from "node:test";
import assert from "node:assert/strict";
import { contrast, loadBrand, parseFrontMatter, validateBrand } from "./brand.ts";

const pack = (yaml: string) => parseFrontMatter(`---\n${yaml}\n---\n`).data;
const base = `schema: hashflag-brand/0\nname: "X"\ncolors:\n  ink: "#111111"\n  canvas: "#ffffff"`;

test("both fixture packs validate", () => {
  assert.equal(loadBrand("fixtures/nonprofit").brand.name, "Wrenfield Community Pantry");
  assert.equal(loadBrand("fixtures/small-business/brand.md").brand.colors.accent, "#FFC93C");
});

test("a minimal pack is valid", () => assert.deepEqual(validateBrand(pack(base)), []));

test("an unquoted hex parses as null and fails", () => {
  const errors = validateBrand(pack(base.replace('"#111111"', "#111111")));
  assert.match(errors.join(), /colors\.ink must be a quoted/);
});

test("ink and canvas are required", () => {
  const errors = validateBrand(pack(`schema: hashflag-brand/0\nname: "X"\ncolors:\n  accent: "#123456"`));
  assert.deepEqual(errors, ["colors.ink is required", "colors.canvas is required"]);
});

test("a font without a license fails", () => {
  const errors = validateBrand(pack(`${base}\nfonts:\n  body: { family: "Inter" }`));
  assert.deepEqual(errors, ["fonts.body.license is required"]);
});

test("a bad regex in copy_rules fails", () => {
  const errors = validateBrand(pack(`${base}\ncopy_rules:\n  - { rule: "r", ban: "(" }`));
  assert.match(errors.join(), /copy_rules\[0\]\.ban is not a valid regex/);
});

test("a missing pack names the path", () => assert.throws(() => loadBrand("nope"), /No brand pack at nope/));

test("ink on canvas below 4.5:1 fails", () => {
  const errors = validateBrand(pack(base.replace('"#111111"', '"#999999"')));
  assert.match(errors.join(), /ink on canvas is 2\.85:1/);
});

test("contrast matches WCAG", () => {
  assert.equal(contrast("#000000", "#ffffff").toFixed(1), "21.0");
  assert.equal(contrast("#c5203e", "#091f40").toFixed(2), "2.85");
});
