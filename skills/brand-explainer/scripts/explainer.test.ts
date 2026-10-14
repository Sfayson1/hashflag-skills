import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { loadBrand } from "../../../lib/brand.ts";
import { captionText, copyOfMarkdown, numerals, type Rule, rulesFrom, scan, visibleText } from "./check-copy.ts";
import { ctaPlate, frameMd, stage, textPairs } from "./stage.ts";
import { captionDiff, checkAudio, checkWords, setGround, spokenLines, wordBand } from "./verify.ts";

// Generic rules shaped like a real pack's, to exercise the gate engine.
const rules: Rule[] = rulesFrom({
  schema: "hashflag-brand/0",
  name: "t",
  colors: {},
  copy_rules: [
    { rule: "r", ban: "\\bboot ?camps?\\b", use: "accelerator" },
    { rule: "r", ban: "\\bget started\\b", use: "Apply" },
    { rule: "r", ban: "\\b(sign up|join now|enroll)\\b", use: "Apply" },
    { rule: "r", ban: "\\bregister (now|today|here)\\b", use: "Apply" },
    { rule: "r", ban: "\\bcharity cases?\\b", use: "stakeholders", allow: "stakeholders,?\\s+not\\s+charity\\s+cases" },
    { rule: "r", ban: "\\btutors?\\b", use: "mentors" },
    { rule: "r", ban: "#fff(?:fff)?\\b", use: "the canvas color" },
  ],
});
const hits = (s: string) => scan(s, rules).length;

test("copy gate: catches bans and honors allowlists", () => {
  assert.equal(hits("We run a bootcamp."), 1);
  assert.equal(hits("Get started today"), 1);
  assert.equal(hits("Veterans are stakeholders, not charity cases."), 0);
  assert.equal(hits("Mentors, not tutors."), 0);
  assert.equal(hits("Our tutors will help."), 1);
  assert.equal(hits("A bootcamp for stakeholders, not charity cases."), 1, "allow must scope to the match");
  assert.equal(hits("Ground: one register per frame."), 0);
  assert.equal(hits("Register now for the cohort."), 1);
  assert.equal(hits("Apply for the 2027 cohort."), 0);
  assert.equal(hits("Never use #FFFFFF; use cream."), 0);
  assert.equal(hits("Our bootcamp is great. Never soften the CTA."), 1);
  assert.equal(hits("We are not a bootcamp."), 0);
  assert.equal(hits("never: rounded corners,\nmascots, #FFFFFF, red on dark."), 0, "wrapped prohibition list");
  assert.equal(hits("never: rounded corners,\nmascots. Join our bootcamp."), 1);
});

test("copy gate: a prohibition no longer swallows the rest of the sentence", () => {
  assert.equal(hits("Do not wait — sign up today."), 1);
  assert.equal(hits("Do not wait, sign up today."), 1);
  assert.equal(hits("Never miss a cohort: enroll now"), 1);
});

test("copy gate: fixture packs enforce their own rules", () => {
  const pantry = rulesFrom(loadBrand("fixtures/nonprofit").brand);
  assert.equal(scan("We serve our clients every Saturday.", pantry).length, 1);
  assert.equal(scan("We serve our neighbors every Saturday.", pantry).length, 0);
  assert.equal(scan("Groceries — and more.", pantry).length, 1);
  const shop = rulesFrom(loadBrand("fixtures/small-business").brand);
  assert.equal(scan("A tune-up is $45.", shop).length, 1);
  assert.equal(scan("Call for a quote.", shop).length, 0);
});

test("copy gate: markdown headings are not copy", () => {
  const pantry = rulesFrom(loadBrand("fixtures/nonprofit").brand);
  assert.deepEqual(scan(copyOfMarkdown("## Line 1 — Hook (Frame 1)\n\n    Groceries — and more."), pantry).map((h) => h.line), [3]);
});

test("copy gate: frame HTML is scanned as visible text only", () => {
  const html = '<style>.customers{color:red}</style>\n<div class="customers">Hello riders</div>\n<p>Thanks, customers</p>';
  const shop = rulesFrom(loadBrand("fixtures/small-business").brand);
  assert.deepEqual(scan(visibleText(html), shop).map((h) => h.line), [3]);
});

test("numerals: spoken, voiceover, tab-indented, curly-quoted and HTML figures", () => {
  assert.equal(numerals("    97% placement in 2027.").length, 1);
  assert.equal(numerals("    Postings pay twenty-eight percent more.").length, 1);
  assert.equal(numerals('- voiceover: "Ten blocks, ninety minutes each."').length, 1);
  assert.equal(numerals("\tWe served 310 families.").length, 1);
  assert.equal(numerals("The card says “2027 Cohort”.").length, 1);
  assert.equal(numerals("Display 900 numeral at 5.5cqw, 48x1px rule").length, 0, "design prose is not copy");
  assert.equal(numerals(visibleText("<h1>2027 Cohort</h1>"), true).length, 1);
});

const fakeSkills = () => {
  const dir = mkdtempSync(join(tmpdir(), "skills-"));
  mkdirSync(join(dir, "hyperframes-creative/frame-presets/broadside"), { recursive: true });
  writeFileSync(join(dir, "hyperframes-creative/frame-presets/broadside/caption-skin.html"), "<style>.w{ text-transform: lowercase; }</style>");
  return dir;
};

test("stage: writes frame.md, caption skin and fonts, and refuses to overwrite edits", () => {
  const project = mkdtempSync(join(tmpdir(), "proj-"));
  const skills = fakeSkills();
  stage("brands/default", project, skills);
  const md = readFileSync(join(project, "frame.md"), "utf8");
  assert.match(md, /^ {2}ink: "#1B2430"$/m);
  assert.match(md, /^ {2}accent: "#B4501A"$/m);
  assert.match(md, /src: url\("assets\/fonts\/JetBrainsMono-700\.woff2"\)/);
  assert.ok(existsSync(join(project, "assets/fonts/Inter-700.woff2")));
  assert.match(readFileSync(join(project, ".hyperframes/caption-skin.html"), "utf8"), /text-transform: none;/);
  stage("brands/default", project, skills); // same output: allowed
  writeFileSync(join(project, "frame.md"), `${md}\nhand edit`);
  assert.throws(() => stage("brands/default", project, skills), /exists and differs/);
  stage("brands/default", project, skills, true);
});

test("stage: CTA plate falls back when the accent can't carry text", () => {
  // Wrenfield: pumpkin accent reads with neither ink (4.30) nor canvas (2.67)
  assert.deepEqual(ctaPlate(loadBrand("fixtures/nonprofit").brand.colors), { fill: "accent2", text: "canvas" });
  assert.deepEqual(ctaPlate(loadBrand("fixtures/small-business").brand.colors), { fill: "accent", text: "ink" });
  assert.equal(ctaPlate({ ink: "#777777", canvas: "#888888" }), undefined);
  assert.ok(textPairs({ ink: "#000000", canvas: "#ffffff" }).length === 2);
});

test("stage: frame.md keeps distinct display and body families", () => {
  const md = frameMd(loadBrand("brands/default").brand);
  assert.match(md, /display: \{ fontFamily: "Inter", cqw: 10, weight: 700/);
  // a heading that only ships at 400 is not asked for 700
  const one = loadBrand("brands/default").brand;
  const md400 = frameMd({ ...one, fonts: { ...one.fonts, heading: { family: "Archivo Black", license: "OFL-1.1", files: ["fonts/ArchivoBlack-400.woff2"] } } });
  assert.match(md400, /h1: {6}\{ fontFamily: "Archivo Black", cqw: 6.5, weight: 400/);
  assert.match(md, /label: {3}\{ fontFamily: "JetBrains Mono"/);
});

// When the upstream skills are installed, check that their parser reads our frame.md as intended.
const upstream = join(homedir(), ".claude/skills/faceless-explainer/scripts/lib/tokens.mjs");
test("stage: upstream token mapping picks the pack's roles", { skip: !existsSync(upstream) && "HyperFrames skills not installed" }, async () => {
  const { parseColors, semanticColors, parseFonts } = await import(upstream);
  for (const pack of ["brands/default", "fixtures/nonprofit", "fixtures/small-business"]) {
    const { brand } = loadBrand(pack);
    const md = frameMd({ ...brand, fonts: brand.fonts ?? {} });
    const roles = semanticColors(parseColors(md));
    assert.equal(roles.ink, brand.colors.ink, pack);
    assert.equal(roles.canvas, brand.colors.canvas, pack);
    assert.equal(roles.accent, brand.colors.accent, pack);
    const fonts = parseFonts(md);
    assert.equal(fonts.display, `"${(brand.fonts!.heading ?? brand.fonts!.body).family}"`, pack);
  }
});

const SCRIPT = `# SCRIPT\n\n## Line 1 — Hook (Frame 1)\n\n    One two three four.\n\n## Line 2 — End (Frame 2)\n\n\tFive six.\n`;

test("copy gate: caption words are scanned", () => {
  const html = `<template><script>var GROUPS = [{"id":"g0","text":"Thank our clients","words":[]},{"id":"g1","text":"today","words":[]}];</script></template>`;
  const pantry = rulesFrom(loadBrand("fixtures/nonprofit").brand);
  assert.equal(visibleText(html).trim(), "");
  assert.deepEqual(scan(captionText(html), pantry).map((h) => h.line), [1]);
});

test("numerals: ordinals, scene lines, and no count-up zeros", () => {
  assert.deepEqual(numerals("    On September twelfth, the second Saturday.")[0].figures, ["twelfth", "second"]);
  assert.equal(numerals("- scene: A grid of 64 people and 91 items").length, 1);
  assert.deepEqual(numerals("    Opens on the 12th.")[0].figures, ["12th"]);
  assert.deepEqual(numerals(visibleText('<span class="n">0</span> people'), true), []);
});

test("verify: spoken lines and word band", () => {
  assert.deepEqual(spokenLines(SCRIPT), ["One two three four.", "Five six."]);
  assert.deepEqual(wordBand("kokoro", 60, 90), { low: 180, high: 243 });
  assert.equal(checkWords(SCRIPT, "kokoro", 60, 90).ok, false);
});

test("verify: missing voice clips and short totals fail", () => {
  assert.match(checkAudio(SCRIPT, { voices: [{ duration_s: 70 }] }, 60, 90).message, /1 voice clips for 2 script lines/);
  assert.equal(checkAudio(SCRIPT, { voices: [{ duration_s: 29 }, { duration_s: 29 }] }, 60, 90).ok, false);
  assert.equal(checkAudio(SCRIPT, { voices: [{ duration_s: 40 }, { duration_s: 33.091 }] }, 60, 90).ok, true);
});

test("verify: ground replaces the #root background and is idempotent", () => {
  const html = "<style>\n      #root {\n        position: relative;\n        background: #F2F4F1;\n      }\n</style>";
  const once = setGround(html, "#091f40");
  assert.match(once, /background: #091f40;/);
  assert.equal(setGround(once, "#091f40"), once);
});

test("verify: captions must match the script, number forms aside", () => {
  const script = "## Line 1\n\n    The library's sign-in sheet says sixty-four people came on the twelfth.\n";
  const words = (t: string) => ({ voices: [{ words: t.split(" ").map((text) => ({ text })) }] });
  assert.deepEqual(captionDiff(script, words("The library's sign in sheet says 64 people came on the 12th.")), []);
  assert.deepEqual(captionDiff(script, words("The library's sign and sheet says 64 people came on the 12th.")), ['line 1: script has "in", captions have "and"']);
});
