// Mechanical gates for the explainer. Each exits 1 on failure.
//   node verify.ts words  --script SCRIPT.md --provider heygen|kokoro|elevenlabs|gemini [--min 60 --max 90]
//   node verify.ts audio  --script SCRIPT.md --meta audio_meta.json [--min 60 --max 90]
//   node verify.ts render --mp4 renders/video.mp4 [--min 60 --max 90]
//   node verify.ts ground --brand <pack> --index index.html
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadBrand } from "../../../lib/brand.ts";
import pacing from "../../../lib/pacing.json" with { type: "json" };

// The spoken text is the indented block under each "## Line" heading.
export function spokenLines(script: string): string[] {
  return script
    .split(/^## /m)
    .slice(1)
    .map((s) => s.split("\n").filter((l) => /^( {4}|\t)\S/.test(l)).map((l) => l.trim()).join(" "))
    .filter(Boolean);
}

// Budget at the provider's slow and fast rates, so the video lands inside the band either way.
export function wordBand(provider: string, min: number, max: number) {
  const p = (pacing as Record<string, { low: number; high: number }>)[provider];
  if (!p) throw new Error(`Unknown provider ${provider}. Known: ${Object.keys(pacing).filter((k) => k !== "_note").join(", ")}`);
  return { low: Math.ceil(min * p.high), high: Math.floor(max * p.low) };
}

export function checkWords(script: string, provider: string, min: number, max: number) {
  const words = spokenLines(script).join(" ").split(/\s+/).filter(Boolean).length;
  const band = wordBand(provider, min, max);
  const ok = words >= band.low && words <= band.high;
  return { ok, message: `${words} spoken words; ${min}-${max} s at ${provider} pace needs ${band.low}-${band.high}` };
}

// A partial TTS run exits 0 upstream, so count voices against lines and check the total.
export function checkAudio(script: string, meta: { voices?: { duration_s?: number }[] }, min: number, max: number) {
  const lines = spokenLines(script).length;
  const voices = meta.voices ?? [];
  const total = voices.reduce((a, v) => a + (v.duration_s ?? 0), 0);
  if (voices.length !== lines) return { ok: false, message: `${voices.length} voice clips for ${lines} script lines; re-run audio for the missing lines` };
  return { ok: total >= min && total <= max, message: `voice total ${total.toFixed(1)} s (want ${min}-${max} s)` };
}

export function mp4Seconds(file: string): number {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }).trim());
}

// assemble-index paints #root with the canvas color; brands whose ground is another color fix it here.
export function setGround(html: string, color: string): string {
  const re = /(#root\s*\{[^}]*?background(?:-color)?\s*:\s*)[^;}]+/;
  if (!re.test(html)) throw new Error("No #root background rule found in index.html");
  return html.replace(re, `$1${color}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values: o, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      script: { type: "string", default: "SCRIPT.md" },
      meta: { type: "string", default: "audio_meta.json" },
      mp4: { type: "string", default: "renders/video.mp4" },
      provider: { type: "string" },
      brand: { type: "string" },
      index: { type: "string", default: "index.html" },
      min: { type: "string", default: "60" },
      max: { type: "string", default: "90" },
    },
  });
  const [min, max] = [Number(o.min), Number(o.max)];
  let r: { ok: boolean; message: string };
  try {
    switch (positionals[0]) {
      case "words":
        r = checkWords(readFileSync(o.script!, "utf8"), o.provider ?? "kokoro", min, max);
        break;
      case "audio":
        r = checkAudio(readFileSync(o.script!, "utf8"), JSON.parse(readFileSync(o.meta!, "utf8")), min, max);
        break;
      case "render": {
        const s = mp4Seconds(o.mp4!);
        r = { ok: s >= min && s <= max, message: `${o.mp4} is ${s.toFixed(2)} s (want ${min}-${max} s)` };
        break;
      }
      case "ground": {
        const { brand } = loadBrand(o.brand!);
        const color = brand.colors[brand.video?.ground ?? "canvas"];
        writeFileSync(o.index!, setGround(readFileSync(o.index!, "utf8"), color));
        r = { ok: true, message: `#root background set to ${color}` };
        break;
      }
      default:
        throw new Error("Usage: verify.ts words|audio|render|ground [flags]");
    }
  } catch (e) {
    r = { ok: false, message: (e as Error).message };
  }
  (r.ok ? console.log : console.error)(`${r.ok ? "ok" : "✗"} ${r.message}`);
  if (!r.ok) process.exit(1);
}
