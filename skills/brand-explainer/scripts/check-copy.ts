// Copy gate driven by the brand pack's copy_rules. Nothing in HyperFrames checks wording,
// so without this a banned phrase reaches the MP4 ungated.
// Generalized from Vets Who Code's check-copy.mjs.
// Usage: node check-copy.ts --brand <pack> [--project .] [--numerals]
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { type Brand, loadBrand } from "../../../lib/brand.ts";

export type Rule = { re: RegExp; fix: string; allow?: RegExp };

export function rulesFrom(brand: Brand): Rule[] {
  return (brand.copy_rules ?? [])
    .filter((r) => r.ban)
    .map((r) => ({ re: new RegExp(r.ban!, "iu"), fix: r.use ?? r.rule, allow: r.allow ? new RegExp(r.allow, "giu") : undefined }));
}

// A prohibition naming the banned thing is not a use of it ("we are not a bootcamp").
// The span ends at the next clause break, so "Do not wait, sign up today" still fires.
// "never: a, b, c" lists run to the sentence end.
const PROHIBITION = /\b(never|not|avoid|instead of|rather than|no longer)\b(?::[^.;|!?]*|[^.;:|!?,—–]*)/giu;

// Allowlists resolve across the whole wrapped paragraph, since a list often hard-wraps.
function paragraphOf(lines: string[], i: number) {
  let a = i;
  while (a > 0 && lines[a - 1].trim() !== "") a--;
  let b = i;
  while (b < lines.length - 1 && lines[b + 1].trim() !== "") b++;
  return { text: lines.slice(a, b + 1).join(" "), offset: lines.slice(a, i).join(" ").length + (i > a ? 1 : 0) };
}

const inside = (re: RegExp, text: string, s: number, e: number) => {
  for (const m of text.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`)))
    if (s >= m.index! && e <= m.index! + m[0].length) return true;
  return false;
};

export function scan(text: string, rules: Rule[]) {
  const hits: { line: number; found: string; fix: string }[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const { re, fix, allow } of rules) {
      const m = re.exec(line);
      if (!m) continue;
      const para = paragraphOf(lines, i);
      const s = para.offset + m.index;
      const e = s + m[0].length;
      if (inside(PROHIBITION, para.text, s, e) || (allow && inside(allow, para.text, s, e))) continue;
      hits.push({ line: i + 1, found: m[0], fix });
    }
  });
  return hits;
}

// Markdown headings are structure ("## Line 1 — Hook"), not copy the viewer sees.
export const copyOfMarkdown = (md: string) => md.replace(/^#.*$/gm, "");

// Visible text of an HTML frame, line numbers kept. Styles, scripts and tags are not copy.
export const visibleText = (html: string) =>
  html.replace(/<(style|script)[\s\S]*?<\/\1>/gi, (m) => m.replace(/[^\n]/g, "")).replace(/<[^>]*>/g, " ");

const WORD_NUM =
  /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?\b/gi;
const DIGITS = /\b\d[\d,.]*\s*%|\$\s?\d[\d,.]*|\b\d[\d,.]*\b/g;

// Every figure the viewer hears or reads is a publishing act; list them for sign-off.
export function numerals(text: string, html = false) {
  const out: { line: number; figures: string[] }[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const spoken = /^( {4}|\t)\S/.test(line);
    const vo = /^\s*-\s*(voiceover|vo|narration|voice_over):/i.test(line);
    const quoted = /["“][^"”]*\d[^"”]*["”]/.test(line);
    if (!html && !spoken && !vo && !quoted) return;
    const all = [...(line.match(DIGITS) ?? []), ...(spoken || vo ? (line.match(WORD_NUM) ?? []) : [])];
    if (all.length) out.push({ line: i + 1, figures: [...new Set(all)] });
  });
  return out;
}

export function targets(root: string): string[] {
  const files = ["SCRIPT.md", "STORYBOARD.md", "compositions/captions.html"].map((f) => join(root, f)).filter((f) => existsSync(f));
  const frames = join(root, "compositions/frames");
  if (existsSync(frames)) for (const f of readdirSync(frames).filter((n) => n.endsWith(".html"))) files.push(join(frames, f));
  return files;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values: o } = parseArgs({ options: { brand: { type: "string" }, project: { type: "string", default: "." }, numerals: { type: "boolean" } } });
  if (!o.brand) {
    console.error("--brand <pack> is required");
    process.exit(1);
  }
  const rules = rulesFrom(loadBrand(o.brand).brand);
  const root = resolve(o.project!);
  const files = targets(root);
  if (!files.length) {
    console.error(`check-copy: nothing to scan under ${root} (no SCRIPT.md or STORYBOARD.md)`);
    process.exit(1);
  }
  let total = 0;
  for (const file of files) {
    const rel = file.slice(root.length + 1);
    const raw = readFileSync(file, "utf8");
    const text = file.endsWith(".html") ? visibleText(raw) : copyOfMarkdown(raw);
    for (const h of scan(text, rules)) {
      total++;
      console.error(`✗ ${rel}:${h.line}  "${h.found}" → use ${h.fix}`);
    }
  }
  if (o.numerals) {
    console.log("\nFigures to verify against the source:");
    for (const file of files) {
      const html = file.endsWith(".html");
      for (const n of numerals(html ? visibleText(readFileSync(file, "utf8")) : readFileSync(file, "utf8"), html))
        console.log(`  ${file.slice(root.length + 1)}:${n.line}  ${n.figures.join(", ")}`);
    }
    console.log("Every figure above must trace to the source document or a user-supplied fact.");
  }
  if (total) {
    console.error(`\ncheck-copy: ${total} violation(s). Fix before rendering.`);
    process.exit(1);
  }
  console.log(`check-copy: ${files.length} file(s) clean`);
}
