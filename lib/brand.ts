// Brand pack loader and validator. The schema is in docs/contracts.md.
// Run directly to validate a pack: node lib/brand.ts <dir or brand.md>
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

export const SCHEMA = "hashflag-brand/0";

export type Brand = {
  schema: string;
  name: string;
  mission?: string;
  colors: Record<string, string>;
  fonts?: Record<string, { family: string; license: string; source?: string; files?: string[] }>;
  voice?: { adjectives?: string[]; examples?: string[] };
  copy_rules?: { rule: string; ban?: string; use?: string; allow?: string }[];
  ctas?: Record<string, { label: string; url?: string }>;
  logo?: string;
  image?: { style?: string; palette?: string[] };
  tts?: Record<string, Record<string, string>>;
  video?: Record<string, unknown>;
};

export function parseFrontMatter(text: string): { data: Record<string, any>; body: string; raw: string } {
  const m = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: text, raw: "" };
  return { data: parse(m[1]) ?? {}, body: text.slice(m[0].length), raw: m[1] };
}

export function validateBrand(b: any): string[] {
  const errors: string[] = [];
  if (b?.schema !== SCHEMA) errors.push(`schema must be "${SCHEMA}"`);
  if (typeof b?.name !== "string" || !b.name) errors.push("name is required");
  const colors = b?.colors ?? {};
  for (const role of ["ink", "canvas"]) if (!(role in colors)) errors.push(`colors.${role} is required`);
  for (const [role, hex] of Object.entries(colors)) {
    // An unquoted #hex parses as null in YAML, so this also catches missing quotes.
    if (typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex))
      errors.push(`colors.${role} must be a quoted "#rrggbb" string (got ${JSON.stringify(hex)})`);
  }
  for (const [role, f] of Object.entries<any>(b?.fonts ?? {})) {
    if (!f?.family) errors.push(`fonts.${role}.family is required`);
    if (!f?.license) errors.push(`fonts.${role}.license is required`);
  }
  for (const [i, r] of (b?.copy_rules ?? []).entries()) {
    if (!r?.rule) errors.push(`copy_rules[${i}].rule is required`);
    for (const key of ["ban", "allow"]) {
      if (r?.[key] === undefined) continue;
      try {
        new RegExp(r[key], "giu");
      } catch (e) {
        errors.push(`copy_rules[${i}].${key} is not a valid regex: ${(e as Error).message}`);
      }
    }
  }
  for (const [key, c] of Object.entries<any>(b?.ctas ?? {})) if (!c?.label) errors.push(`ctas.${key}.label is required`);
  for (const p of b?.image?.palette ?? []) if (!(p in colors)) errors.push(`image.palette names unknown color "${p}"`);
  return errors;
}

// Accepts a pack directory or a brand.md path. Throws with every problem listed.
export function loadBrand(path: string): { brand: Brand; body: string; dir: string } {
  const file = existsSync(path) && statSync(path).isDirectory() ? join(path, "brand.md") : path;
  if (!existsSync(file)) throw new Error(`No brand pack at ${file}`);
  const { data, body } = parseFrontMatter(readFileSync(file, "utf8"));
  const errors = validateBrand(data);
  if (errors.length) throw new Error(`Invalid brand pack ${file}:\n- ${errors.join("\n- ")}`);
  return { brand: data as Brand, body, dir: join(file, "..") };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { brand } = loadBrand(process.argv[2] ?? ".");
    console.log(`ok: ${brand.name}`);
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
}
