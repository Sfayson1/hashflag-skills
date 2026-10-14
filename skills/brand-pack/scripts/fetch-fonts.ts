// Download a pack's Google Fonts into <pack>/fonts/ and record the files in brand.md.
// Only fonts whose source is fonts.google.com are fetched; everything there is open-licensed.
// Commercial fonts are never fetched: put their files in <pack>/fonts/ yourself.
// Usage: node fetch-fonts.ts <pack dir> [--weights 400,700]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parseDocument } from "yaml";

type Fetch = typeof fetch;
// Google serves woff2 only to browsers it recognizes.
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export async function fetchFonts(pack: string, weights = [400, 700], fetchFn: Fetch = fetch): Promise<string[]> {
  const file = join(pack, "brand.md");
  const text = readFileSync(file, "utf8");
  const m = text.match(/^(---\r?\n)([\s\S]*?\r?\n)(---)/);
  if (!m) throw new Error(`${file} has no front matter`);
  const doc = parseDocument(m[2]);
  const fonts = (doc.toJS().fonts ?? {}) as Record<string, { family: string; source?: string }>;
  mkdirSync(join(pack, "fonts"), { recursive: true });
  const written: string[] = [];
  const cache = new Map<string, string[]>(); // family -> files, when two roles share a family
  for (const [role, f] of Object.entries(fonts)) {
    if (!/fonts\.google\.com/.test(f.source ?? "")) continue;
    if (!cache.has(f.family)) {
      const css = await (await fetchFn(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family)}:wght@${weights.join(";")}&display=swap`, { headers: { "user-agent": UA } })).text();
      // Keep the latin subset of each weight.
      const blocks = [...css.matchAll(/\/\* latin \*\/\s*@font-face\s*\{([^}]*)\}/g)].map((b) => b[1]);
      if (!blocks.length) throw new Error(`Google Fonts has no "${f.family}". Check the spelling in brand.md.`);
      const files: string[] = [];
      for (const b of blocks) {
        const weight = b.match(/font-weight:\s*(\d+)/)![1];
        const url = b.match(/url\((https:[^)]+\.woff2)\)/)![1];
        const name = `fonts/${f.family.replace(/\s+/g, "")}-${weight}.woff2`;
        writeFileSync(join(pack, name), Buffer.from(await (await fetchFn(url)).arrayBuffer()));
        files.push(name);
        written.push(name);
      }
      cache.set(f.family, files);
    }
    doc.setIn(["fonts", role, "files"], cache.get(f.family));
  }
  writeFileSync(file, m[1] + doc.toString({ lineWidth: 0, flowCollectionPadding: false }) + text.slice(m[1].length + m[2].length));
  return written;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values: o, positionals } = parseArgs({ allowPositionals: true, options: { weights: { type: "string", default: "400,700" } } });
  fetchFonts(positionals[0] ?? ".", o.weights!.split(",").map(Number)).then(
    (files) => console.log(files.length ? files.join("\n") : "No Google Fonts sources in this pack; nothing fetched."),
    (e) => {
      console.error(e.message);
      process.exit(1);
    },
  );
}
