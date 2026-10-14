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
const rgba = (hex: string, a: number) => `rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",")},${a})`;

export function frameMd(brand: Brand): string {
  const c = brand.colors;
  const fonts = brand.fonts ?? {};
  const heading = fonts.heading ?? fonts.display ?? fonts.body;
  const body = fonts.body ?? heading;
  const mono = fonts.mono ?? body;
  if (!heading || !body) throw new Error("The brand pack needs fonts.heading and fonts.body to make a video.");
  const files = (f?: { files?: string[] }) => f?.files ?? [];
  const top = Math.max(...files(heading).map(weightOf), 700);
  const upper = brand.video?.caption_case === "upper";
  const accent = c.accent ?? c.ink;
  const accent2 = c.accent2 ?? accent;
  const ground = c[brand.video?.ground ?? "canvas"];
  const legal = (fg: string, bg: string) => (contrast(c[fg] ?? fg, c[bg] ?? bg) >= 4.5 ? "text OK" : "NOT for text; marks, rules and fills only");
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
  body:    ${t(body.family, 1.25, 400, ", lineHeight: 1.6")}
  lead:    ${t(body.family, 1.7, 400, ", lineHeight: 1.5")}
  caption: ${t(body.family, 0.95, 400, ", lineHeight: 1.5")}
  label:   ${t(mono.family, 0.7, 400, ', tracking: "0.1em", upper: true')}
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
    fill: "{colors.accent} plate, text in whichever of ink or canvas passes 4.5:1 on it"
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
| accent | ${accent} | Rules, highlights, the CTA plate, one key word per frame |
| accent2 | ${accent2} | Secondary highlight; use sparingly |
${extra.map(([k, v]) => `| ${k} | ${v} | Supporting color from the brand pack; no text |`).join("\n")}

Contrast (WCAG, 4.5:1 for text):
- ink on canvas: ${contrast(c.ink, c.canvas).toFixed(2)}:1, ${legal("ink", "canvas")}.
- accent on canvas: ${contrast(accent, c.canvas).toFixed(2)}:1, ${legal(accent, "canvas")}.
- accent on ink: ${contrast(accent, c.ink).toFixed(2)}:1, ${legal(accent, "ink")}.
- accent2 on canvas: ${contrast(accent2, c.canvas).toFixed(2)}:1, ${legal(accent2, "canvas")}.

Accent colors cover at most about 10% of any frame. No gradients, no shadows, radius 0 unless the brand says otherwise.

## Story shape

${(brand.video?.story ?? DEFAULT_STORY).map((s, i) => `${i + 1}. ${s}`).join("\n")}

The video opens on the hook and always closes on the end card.

## Pre-render self-audit

- One display moment per frame; nothing competes with it.
- Only colors from this file. Text only in pairs marked "text OK" above.
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
  write(join(project, ".hyperframes/caption-skin.html"), readFileSync(skin, "utf8").replace(/text-transform: lowercase;/, `text-transform: ${casing};`));

  for (const f of Object.values(brand.fonts ?? {}))
    for (const p of f.files ?? []) copyFileSync(join(dir, p), join(project, "assets/fonts", basename(p)));
  if (!Object.values(brand.fonts ?? {}).some((f) => f.files?.length)) notes.push("The pack lists no font files. Run brand-pack's fetch-fonts.ts first, or frames will fall back to system fonts.");
  if (brand.logo) {
    mkdirSync(join(project, "public"), { recursive: true });
    copyFileSync(join(dir, brand.logo), join(project, "public", basename(brand.logo)));
  }
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
