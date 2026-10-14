// blog-media: one post in, a hero image, alt text and a narrated audio overview out.
// Usage: node blog-media.ts <post.md | post.mdx | URL> [flags]   (see ../SKILL.md)
//        node blog-media.ts publish <manifest.json> --storage cloudinary|s3
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parseDocument } from "yaml";
import { type Brand, loadBrand, parseFrontMatter } from "../../../lib/brand.ts";
import pacing from "../../../lib/pacing.json" with { type: "json" };
import { outDir, slugify } from "../../../lib/paths.ts";
import { chunkForTts, cleanMarkdown, normalizeLoudness, pcmToWav, SAMPLE_RATE } from "./audio.ts";
import { Gemini, MAX_OUT, MODELS, PRICES } from "./gemini.ts";
import { makeStorage, sha } from "./storage.ts";

type Fetch = typeof fetch;
type Post = { slug: string; title: string; body: string; file?: string };
type Result = { kind: "image" | "audio"; status: "ok" | "warn" | "failed" | "skipped"; path?: string; url?: string; alt?: string; error?: string; est_usd?: number };

const DEFAULT_STYLE =
  "Read the following blog post aloud in a single, steady, clear narration voice. Keep an even pace and consistent volume throughout. Do not add commentary.";
const IMAGE_ATTEMPTS = 3;
const ALT_MAX = 120;

export async function readPost(input: string, fetchFn: Fetch = fetch): Promise<Post> {
  if (!/^https?:\/\//.test(input)) {
    const { data, body } = parseFrontMatter(readFileSync(input, "utf8"));
    const title = data.title ?? body.match(/^#\s+(.+)$/m)?.[1] ?? basename(input, extname(input));
    return { slug: slugify(basename(input, extname(input))), title: String(title), body, file: input };
  }
  const res = await fetchFn(input);
  if (!res.ok) throw new Error(`Fetching ${input} failed: HTTP ${res.status}`);
  const text = await res.text();
  const slug = slugify(new URL(input).pathname.split("/").filter(Boolean).at(-1)?.replace(/\.\w+$/, "") || new URL(input).hostname);
  if (!/html/.test(res.headers.get("content-type") ?? "")) {
    const { data, body } = parseFrontMatter(text);
    return { slug, title: String(data.title ?? body.match(/^#\s+(.+)$/m)?.[1] ?? slug), body };
  }
  // ponytail: regex extraction of <article>/<main>; swap in @mozilla/readability if real sites need it.
  const title = (text.match(/<meta[^>]+property="og:title"[^>]+content="([^"]*)"/i) ?? text.match(/<title[^>]*>([^<]*)<\/title>/i))?.[1] ?? slug;
  const main = (text.match(/<article[\s\S]*?<\/article>/i) ?? text.match(/<main[\s\S]*?<\/main>/i) ?? text.match(/<body[\s\S]*?<\/body>/i))?.[0] ?? text;
  const body = main
    .replace(/<(script|style|nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/(p|h[1-6]|li|blockquote|div)>|<br\s*\/?>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*/g, "\n\n").trim();
  if (body.split(/\s+/).length < 150) throw new Error(`Could not find an article at ${input}. Save the post as a Markdown file and pass the path.`);
  return { slug, title: title.trim(), body };
}

function imagePrompt(brand: Brand, scene: string) {
  const palette = (brand.image?.palette ?? Object.keys(brand.colors)).map((r) => brand.colors[r]).join(", ");
  const style = brand.image?.style ?? "Clean editorial illustration with simple shapes and soft light";
  return `${style}. ${scene}\nUse only these colors: ${palette}. Do not render the color codes, or any text, letters, numbers, signs, labels or logos. Wide 16:9 composition.`;
}

export function ttsSettings(brand: Brand) {
  const g = brand.tts?.gemini ?? {};
  return { model: g.model ?? MODELS.tts, voice: g.voice ?? "Kore", style: g.style ?? DEFAULT_STYLE };
}

export function estimate(post: Post, narration: string, brand: Brand) {
  const inTokens = Math.round(post.body.split(/\s+/).length * 1.4) + 400;
  const words = narration.split(/\s+/).filter(Boolean).length;
  const tts = ttsSettings(brand);
  const audioTokens = (wps: number) => Math.round((words / wps) * 25);
  const textCall = (inT: number, outT: number) => inT * PRICES.text.in + outT * PRICES.text.out;
  const calls = [
    { model: MODELS.text, est_tokens_in: inTokens, est_tokens_out: MAX_OUT.text },
    { model: MODELS.image, est_tokens_in: 300, est_tokens_out: 1120, attempts: `1-${IMAGE_ATTEMPTS}` },
    { model: MODELS.text, est_tokens_in: 1400, est_tokens_out: MAX_OUT.vision, attempts: `1-${IMAGE_ATTEMPTS}` },
    { model: tts.model, est_tokens_in: Math.round(words * 1.4), est_tokens_out: audioTokens(pacing.gemini.low) },
  ];
  const low = textCall(inTokens, 200) + PRICES.image + textCall(1400, 100) + audioTokens(pacing.gemini.high) * PRICES.tts.out;
  const high = textCall(inTokens, MAX_OUT.text) + IMAGE_ATTEMPTS * (PRICES.image + textCall(1400, MAX_OUT.vision)) + audioTokens(pacing.gemini.low) * PRICES.tts.out * 2; // x2: a flagged chunk retries once
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return { calls, words, chunks: chunkForTts(narration).length, est_usd_low: round(low), est_usd_high: round(high) };
}

async function makeImage(gemini: Gemini, post: Post, brand: Brand, dir: string): Promise<Result> {
  const { scene } = await gemini.scene(post.title, cleanMarkdown(post.body));
  const prompt = imagePrompt(brand, scene);
  let last: { data: Buffer; mimeType: string } | undefined;
  let alt = "";
  let issue = "";
  for (let attempt = 1; attempt <= IMAGE_ATTEMPTS; attempt++) {
    last = await gemini.image(prompt);
    try {
      const check = await gemini.inspect(last);
      alt = check.altText.trim().replace(/\.$/, "");
      issue = check.hasText ? `image contains text: ${check.detectedText ?? "unknown"}` : "";
    } catch (e) {
      issue = `could not check the image: ${(e as Error).message}`;
    }
    if (!issue) break;
  }
  if (!issue && (!alt || alt.length > ALT_MAX)) issue = `alt text needs review (${alt.length} chars, max ${ALT_MAX})`;
  const ext = last!.mimeType.split("/")[1].replace("jpeg", "jpg");
  const path = join(dir, `hero-${sha(last!.data, 8)}.${ext}`);
  writeFileSync(path, last!.data);
  return { kind: "image", status: issue ? "warn" : "ok", path, alt, error: issue || undefined };
}

async function makeAudio(gemini: Gemini, narration: string, brand: Brand, dir: string): Promise<Result> {
  const tts = ttsSettings(brand);
  const pause = Buffer.alloc(Math.round(SAMPLE_RATE * 0.35) * 2);
  const parts: Buffer[] = [];
  const problems: string[] = [];
  for (const [i, chunk] of chunkForTts(narration).entries()) {
    let r = await gemini.speak(chunk, tts);
    if (r.problem) r = await gemini.speak(chunk, tts); // one retry, then flag
    if (r.problem) problems.push(`chunk ${i + 1}: ${r.problem}`);
    if (i) parts.push(pause);
    parts.push(r.pcm);
  }
  const wav = pcmToWav(normalizeLoudness(Buffer.concat(parts)));
  const path = join(dir, `audio-${sha(wav, 8)}.wav`);
  writeFileSync(path, wav);
  return { kind: "audio", status: problems.length ? "warn" : "ok", path, error: problems.join("; ") || undefined };
}

export async function upload(results: Result[], slug: string, storageName: string, fetchFn: Fetch = fetch, env = process.env) {
  const storage = makeStorage(storageName, env, fetchFn);
  for (const r of results) {
    if (!r.path || r.status === "failed") continue;
    if (storage.name === "local") {
      r.url = r.path;
      continue;
    }
    try {
      const type = r.kind === "audio" ? "audio/wav" : `image/${extname(r.path).slice(1).replace("jpg", "jpeg")}`;
      r.url = await storage.put(slug, r.kind === "image" ? "hero" : "audio", readFileSync(r.path), type);
    } catch (e) {
      r.status = "failed";
      r.error = (e as Error).message;
    }
  }
}

// Sets keys only inside YAML front matter, editing just those nodes. An existing alt is kept.
export function writeFrontMatter(file: string, values: Record<string, string | undefined>, keys: Record<string, string>) {
  const text = readFileSync(file, "utf8");
  const m = text.match(/^(﻿?---\r?\n)([\s\S]*?\r?\n)(---)/);
  if (!m) throw new Error(`${file} has no YAML front matter; copy the snippet above by hand.`);
  const doc = parseDocument(m[2]);
  for (const [name, value] of Object.entries(values)) {
    const path = keys[name].split(".");
    const current = doc.getIn(path);
    if (current && typeof current === "object") throw new Error(`Front matter key ${keys[name]} is a map; point --keys at a field inside it, like ${keys[name]}.src`);
    if (!value || (name === "alt" && current)) continue;
    doc.setIn(path, value);
  }
  writeFileSync(file, m[1] + doc.toString({ lineWidth: 0, flowCollectionPadding: false }) + text.slice(m[1].length + m[2].length));
}

const exitCode = (results: Result[]) => (results.some((r) => r.status === "failed") ? 1 : results.some((r) => r.status === "warn") ? 2 : 0);

export async function main(argv = process.argv.slice(2), { fetch: fetchFn = fetch, env = process.env, log = console.log } = {}): Promise<number> {
  const { values: o, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      dry: { type: "boolean" },
      json: { type: "boolean" },
      out: { type: "string" },
      brand: { type: "string" },
      storage: { type: "string", default: "local" },
      "max-usd": { type: "string" },
      script: { type: "string" },
      only: { type: "string" },
      write: { type: "boolean" },
      keys: { type: "string", default: "image=image,alt=image_alt,audio=audio" },
    },
  });

  if (positionals[0] === "publish") {
    const file = positionals[1];
    if (!file) throw new Error("Usage: blog-media.ts publish <manifest.json> --storage cloudinary|s3");
    const manifest = JSON.parse(readFileSync(file, "utf8"));
    await upload(manifest.results, manifest.slug, o.storage!, fetchFn, env);
    writeFileSync(file, JSON.stringify(manifest, null, 2));
    log(o.json ? JSON.stringify(manifest, null, 2) : manifest.results.map((r: Result) => `${r.kind}: ${r.status} ${r.url ?? r.error ?? ""}`).join("\n"));
    return exitCode(manifest.results);
  }

  const input = positionals[0];
  if (!input) throw new Error("Usage: blog-media.ts <post.md | URL> --brand <pack> [--dry] [--json] [--out dir] [--storage local|cloudinary|s3] [--max-usd n] [--script narration.md] [--only image|audio] [--write]");
  if (!o.brand) throw new Error("--brand <pack dir> is required. See docs/contracts.md for the brand pack format.");
  const { brand } = loadBrand(o.brand);
  const post = await readPost(input, fetchFn);
  const narration = cleanMarkdown(o.script ? readFileSync(o.script, "utf8") : post.body);
  const est = estimate(post, narration, brand);
  const kinds = o.only ? [o.only] : ["image", "audio"];

  if (o.dry) {
    const plan = { ...est, image_prompt: imagePrompt(brand, "<scene written by the text model>"), tts: ttsSettings(brand), narration_chunks: chunkForTts(narration) };
    log(o.json ? JSON.stringify(plan, null, 2) : `${post.title}\n${est.words} words in ${est.chunks} TTS chunk(s)\nEstimated cost: $${est.est_usd_low}-$${est.est_usd_high}\n\nImage prompt:\n${plan.image_prompt}`);
    return 0;
  }
  if (o["max-usd"] && est.est_usd_high > Number(o["max-usd"])) {
    log(`Estimated cost up to $${est.est_usd_high} is over --max-usd ${o["max-usd"]}. Nothing was run.`);
    return 1;
  }
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set.");
  makeStorage(o.storage!, env, fetchFn); // check credentials before spending anything

  const dir = o.out ?? outDir("blog-media", post.slug);
  mkdirSync(dir, { recursive: true });
  log(`Output: ${dir}`);
  log("Note: on an unbilled Gemini project, Google may use what you send to improve its products. Don't send private content on a free key.");
  const gemini = new Gemini(env.GEMINI_API_KEY, fetchFn);
  const results: Result[] = [];
  for (const kind of kinds) {
    try {
      results.push(kind === "image" ? await makeImage(gemini, post, brand, dir) : await makeAudio(gemini, narration, brand, dir));
    } catch (e) {
      results.push({ kind: kind as Result["kind"], status: "failed", error: (e as Error).message });
    }
  }
  await upload(results, post.slug, o.storage!, fetchFn, env);

  const manifest = { source: input, slug: post.slug, title: post.title, est_usd_high: est.est_usd_high, results };
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  const image = results.find((r) => r.kind === "image");
  const audio = results.find((r) => r.kind === "audio");
  const keys = Object.fromEntries(o.keys!.split(",").map((kv) => kv.split("=")));
  const values = { image: image?.url, alt: image?.alt, audio: audio?.url };
  if (o.write && post.file) writeFrontMatter(post.file, values, keys);

  if (o.json) log(JSON.stringify(manifest, null, 2));
  else {
    for (const r of results) log(`${r.kind}: ${r.status}${r.url ? ` ${r.url}` : ""}${r.error ? ` (${r.error})` : ""}`);
    if (image?.alt) log(`alt: ${image.alt}`);
    log(`\nFront matter:\n${Object.entries(values).filter(([, v]) => v).map(([k, v]) => `${keys[k]}: ${JSON.stringify(v)}`).join("\n")}`);
    log(`\nManifest: ${join(dir, "manifest.json")}`);
  }
  return exitCode(results);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(e.message);
      process.exit(1);
    },
  );
}
