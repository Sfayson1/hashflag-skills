// Stage a brand pack into a HyperFrames project: frame.md, caption skin, fonts, logo.
// Replaces faceless-explainer Step 2, whose generated spec can't hold a two-font brand.
// Usage: node stage.ts --brand <pack> --project <dir> [--skills-dir ~/.claude/skills] [--force]
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { type Brand, contrast, loadBrand } from "../../../lib/brand.ts";

const DEFAULT_STORY = [
  "Hook: the question or tension, in one line",
  "Claim: the one thing to remember",
  "Mechanism: how it works",
  "Proof: sourced numbers only",
  "End card: the literal call to action and the name or logo",
];

const weightOf = (file: string) => Number(file.match(/-(\d{3})\.\w+$/)?.[1] ?? 400);
const chroma = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return Math.max(r, g, b) - Math.min(r, g, b);
};
// The CTA plate: the accent if any pack color reads on it, else the first color that has a
// readable partner. Returns undefined only when no pair in the pack reaches 4.5:1.
export function ctaPlate(c: Record<string, string>) {
  const order = ["accent", "accent2", ...Object.keys(c).filter((k) => !["accent", "accent2", "ink", "canvas"].includes(k)), "ink", "canvas"].filter((k) => k in c);
  for (const fill of order) {
    const text = Object.keys(c).filter((k) => k !== fill).sort((a, b) => contrast(c[b], c[fill]) - contrast(c[a], c[fill]))[0];
    if (text && contrast(c[text], c[fill]) >= 4.5) return { fill, text };
  }
}

// Every ordered pair of pack colors that passes WCAG AA for text.
export function textPairs(c: Record<string, string>) {
  return Object.keys(c).flatMap((fg) => Object.keys(c).filter((bg) => bg !== fg && contrast(c[fg], c[bg]) >= 4.5).map((bg) => ({ fg, bg, ratio: contrast(c[fg], c[bg]) })));
}

const rgba = (hex: string, a: number) => `rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",")},${a})`;

export function frameMd(brand: Brand): string {
  const c = brand.colors;
  const fonts = brand.fonts ?? {};
  const heading = fonts.heading ?? fonts.display ?? fonts.body;
  const body = fonts.body ?? heading;
  const mono = fonts.mono ?? body;
  if (!heading || !body) throw new Error("The brand pack needs fonts.heading and fonts.body to make a video.");
  const files = (f?: { files?: string[] }) => f?.files ?? [];
  // The heaviest weight that ships; asking for more makes the browser fake a bold.
  const top = files(heading).length ? Math.max(...files(heading).map(weightOf)) : 700;
  const upper = brand.video?.caption_case === "upper";
  const accent = c.accent ?? c.ink;
  const accent2 = c.accent2 ?? accent;
  const ground = c[brand.video?.ground ?? "canvas"];
  const pairs = textPairs(c);
  const plate = ctaPlate(c);
  const extra = Object.entries(c).filter(([k]) => !["ink", "canvas", "accent", "accent2"].includes(k));
  const faces = Object.values(fonts)
    .flatMap((f) => files(f).map((p) => ({ family: f.family, file: basename(p), weight: weightOf(p), ext: extname(p).slice(1) })))
    .filter((f, i, all) => all.findIndex((g) => g.family === f.family && g.file === f.file) === i);
  const t = (family: string, cqw: number, weight: number, rest = "") => `{ fontFamily: "${family}", cqw: ${cqw}, weight: ${weight}${rest} }`;
  const up = upper ? ", upper: true" : "";

  return `---
version: 1
name: ${JSON.stringify(`${brand.name} — Frame`)}
description: >
  Generated from the ${brand.name} brand pack by hashflag brand-explainer. Edit this file by hand
  if you need to; stage.ts refuses to overwrite it without --force.
unit: the frame — 1920×1080 primary; 9:16 and 1:1 documented
principle: atoms are sacred · composition is free · numbers come from the script

colors:
  ink: "${c.ink}"
  canvas: "${c.canvas}"
  accent: "${accent}"
  accent2: "${accent2}"
  ink-muted: "${rgba(c.ink, 0.72)}"
  canvas-muted: "${rgba(c.canvas, 0.72)}"
  ink-hairline: "${rgba(c.ink, 0.12)}"
  canvas-hairline: "${rgba(c.canvas, 0.16)}"

typography:
  body:    ${t(body.family, 1.6, 400, ", lineHeight: 1.5")}
  lead:    ${t(body.family, 2.1, 400, ", lineHeight: 1.4")}
  caption: ${t(body.family, 1.35, 400, ", lineHeight: 1.4")}
  label:   ${t(mono.family, 1.25, 400, ', tracking: "0.08em", upper: true')}
  h3:      ${t(heading.family, 2.6, top, `, lineHeight: 1.25${up}`)}
  h2:      ${t(heading.family, 4.2, top, `, lineHeight: 1.1, tracking: "-0.01em"${up}`)}
  stat-value: ${t(heading.family, 5.5, top, ', lineHeight: 1.0, tracking: "-0.02em"')}
  h1:      ${t(heading.family, 6.5, top, `, lineHeight: 1.02, tracking: "-0.02em"${up}`)}
  display: ${t(heading.family, 10.0, top, `, lineHeight: 0.95, tracking: "-0.03em"${up}`)}

spacing:
  pad-x: "6cqw"
  pad-y: "6cqw"
  gap-lg: "3.2cqw"
  gap-md: "1.8cqw"
  gap-sm: "0.9cqw"

components:
  registers:
    light: "ground {colors.canvas}, text {colors.ink}, accent {colors.accent}"
    dark: "ground {colors.ink}, text {colors.canvas}, accent {colors.accent}"
    description: "Two registers. One register per frame. The video ground is ${ground}."
  kicker:
    typography: "{typography.label}"
    color: "{colors.ink-muted} (light) / {colors.canvas-muted} (dark)"
  rule:
    backgroundColor: "{colors.accent}"
    size: "48×2px"
    description: "The one ornament."
  stat-card:
    borderTop: "1px solid {colors.ink-hairline} (light) / {colors.canvas-hairline} (dark)"
    typography: "{typography.stat-value} + {typography.body} + {typography.label}"
  bullet:
    marker: "{colors.accent} square, 0.5em"
    typography: "{typography.lead}"
    description: "Capped at three items."
  cta-plate:
    fill: "${plate ? `{colors.${plate.fill}} plate, text {colors.${plate.text}}` : "no pack color pair reaches 4.5:1; set the CTA as large heading text instead of a plate"}"
    description: "The literal action word only."
  end-card:
    ground: "{colors.${brand.video?.ground ?? "canvas"}}"
    description: "Call to action plus ${brand.logo ? "the logo at public/" + basename(brand.logo) : "the organization name set in the heading font"}. Always the last frame."
---

# ${brand.name} — Frame

## Overview

${brand.mission ? `${brand.mission}\n\n` : ""}A flat, typographic system. **${heading.family}** carries display and headings${heading.family === body.family ? " and body" : `; **${body.family}** carries reading text`}; **${mono.family}** is chrome only (labels, kickers, axis ticks)${upper ? "; display text is UPPERCASE via CSS, authored in sentence case" : ""}. Hierarchy comes from size, weight and space, not from effects.

## Color

| Role | Hex | Use |
| --- | --- | --- |
| ink | ${c.ink} | Text on light ground; dark-register ground |
| canvas | ${c.canvas} | Light ground; text on dark register |
| accent | ${accent} | Rules, highlights, one key word per frame |
| accent2 | ${accent2} | Second brand color; see brand.md for its role |
${extra.map(([k, v]) => `| ${k} | ${v} | Supporting color from the brand pack |`).join("\n")}

Text may only use these color pairs (WCAG AA, 4.5:1 or better). Any other pair is for marks, rules and fills only:
${pairs.map((p) => `- ${p.fg} on ${p.bg}: ${p.ratio.toFixed(2)}:1`).join("\n")}

CTA plate: ${plate ? `${plate.fill} fill with ${plate.text} text (${contrast(c[plate.text], c[plate.fill]).toFixed(2)}:1).` : "no pair reaches 4.5:1, so set the call to action as large heading text."}

Accent colors cover at most about 10% of any frame. No gradients, no shadows, radius 0 unless the brand says otherwise.

## Story shape

${(brand.video?.story ?? DEFAULT_STORY).map((s, i) => `${i + 1}. ${s}`).join("\n")}

The video opens on the hook and always closes on the end card.

## Pre-render self-audit

- One display moment per frame; nothing competes with it.
- Only colors from this file. Text only in the pairs listed under Color.
- Chrome text (labels, kickers, source tags) is never smaller than {typography.label}.
- The end card is fully on screen and still for at least 2 seconds before the video ends.
- Only the families below, from shipped files.
- Bullets capped at three.
- Every number on screen comes from the script. No invented figures.
- The last frame is the end card with the literal call to action.

## Font loading

\`\`\`html
<style>
${faces.map((f) => `@font-face { font-family: "${f.family}"; src: url("assets/fonts/${f.file}") format("${f.ext}"); font-weight: ${f.weight}; font-style: normal; font-display: block; }`).join("\n")}
</style>
\`\`\`
`;
}

export function stage(brandPath: string, project: string, skillsDir: string, force = false): string[] {
  const { brand, dir } = loadBrand(brandPath);
  const notes: string[] = [];
  const heading = brand.fonts?.heading ?? brand.fonts?.display ?? brand.fonts?.body;
  if (!heading?.files?.length) throw new Error("The pack lists no font files for its heading font. Run brand-pack's fetch-fonts.ts first, or frames fall back to system fonts.");
  const write = (path: string, text: string) => {
    if (existsSync(path) && !force && readFileSync(path, "utf8") !== text) throw new Error(`${path} exists and differs. Re-run with --force to overwrite it.`);
    writeFileSync(path, text);
  };
  mkdirSync(join(project, ".hyperframes"), { recursive: true });
  mkdirSync(join(project, "assets/fonts"), { recursive: true });
  write(join(project, "frame.md"), frameMd(brand));

  const skin = join(skillsDir, "hyperframes-creative/frame-presets/broadside/caption-skin.html");
  if (!existsSync(skin)) throw new Error(`Caption skin not found at ${skin}. Install HyperFrames skills (npx hyperframes skills update) or pass --skills-dir.`);
  // The skin takes colors and fonts from frame.md at caption build time; only casing is set here.
  const casing = brand.video?.caption_case === "upper" ? "uppercase" : brand.video?.caption_case === "lower" ? "lowercase" : "none";
  const weight = Math.max(...heading.files.map(weightOf));
  write(
    join(project, ".hyperframes/caption-skin.html"),
    readFileSync(skin, "utf8").replace(/text-transform: lowercase;/, `text-transform: ${casing};`).replace(/font-weight: 900;/, `font-weight: ${weight};`),
  );

  for (const f of Object.values(brand.fonts ?? {}))
    for (const p of f.files ?? []) copyFileSync(join(dir, p), join(project, "assets/fonts", basename(p)));
  if (brand.logo) {
    mkdirSync(join(project, "public"), { recursive: true });
    copyFileSync(join(dir, brand.logo), join(project, "public", basename(brand.logo)));
  } else notes.push("The pack has no logo, so the end card sets the organization name in the heading font.");
  if (!ctaPlate(brand.colors)) notes.push("No color pair in the pack reaches 4.5:1, so there is no readable CTA plate. Fix the palette with brand-pack.");
  if (brand.colors.accent2 && brand.colors.accent && chroma(brand.colors.accent2) > chroma(brand.colors.accent))
    notes.push("accent2 is more saturated than accent, so captions will highlight in accent2. Swap them in brand.md if that's wrong.");
  if ((brand.video?.ground ?? "canvas") !== "canvas") notes.push(`After assembly, run: node verify.ts ground --brand <pack> --index index.html`);
  return notes;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values: o } = parseArgs({
    options: { brand: { type: "string" }, project: { type: "string", default: "." }, "skills-dir": { type: "string" }, force: { type: "boolean" } },
  });
  try {
    if (!o.brand) throw new Error("--brand <pack> is required");
    const notes = stage(o.brand, o.project!, o["skills-dir"] ?? join(homedir(), ".claude/skills"), o.force);
    console.log(`staged ${o.brand} into ${o.project}`);
    for (const n of notes) console.log(`note: ${n}`);
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
}
