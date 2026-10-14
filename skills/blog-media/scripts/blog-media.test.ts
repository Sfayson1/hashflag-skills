// End-to-end tests with every network call mocked. No keys, no spend.
import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main, readPost } from "./blog-media.ts";

const POST = "fixtures/nonprofit/blog-post.md";
const BRAND = "fixtures/nonprofit";
const env = { GEMINI_API_KEY: "test" };
const tmp = () => mkdtempSync(join(tmpdir(), "blog-media-"));
const reply = (parts: object[], finishReason = "STOP", usage = {}) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts }, finishReason }], usageMetadata: usage }));

// A fake Gemini. Options change one behavior per test.
function fakeFetch(opts: { textInImage?: boolean; ttsFinish?: string[]; ttsFails?: boolean; extra?: (url: string, init: any) => Response | undefined } = {}) {
  const calls: { url: string; body: any }[] = [];
  const ttsFinish = [...(opts.ttsFinish ?? [])];
  const fn = async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input.url;
    const body = init?.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ url, body });
    const other = opts.extra?.(url, init ?? input);
    if (other) return other;
    if (url.includes("-tts:")) {
      if (opts.ttsFails) return new Response("quota", { status: 429 });
      const words = body.contents[0].parts[0].text.split(/\s+/).length;
      const pcm = Buffer.alloc(Math.round((words / 3) * 48000)); // 3 words a second
      return reply([{ inlineData: { mimeType: "audio/L16;rate=24000", data: pcm.toString("base64") } }], ttsFinish.shift() ?? "STOP");
    }
    if (url.includes("-image:")) return reply([{ inlineData: { mimeType: "image/png", data: Buffer.from(`png${calls.length}`).toString("base64") } }]);
    if (body.contents[0].parts[0].inlineData)
      return reply([{ text: JSON.stringify({ hasText: !!opts.textInImage, detectedText: "OPEN", altText: "Volunteers sorting tomatoes into milk crates." }) }]);
    return reply([{ text: JSON.stringify({ scene: "Hands passing a crate of tomatoes across a folding table." }) }]);
  };
  return { fn: fn as typeof fetch, calls };
}

const run = async (args: string[], f = fakeFetch(), e: Record<string, string> = env) => {
  const lines: string[] = [];
  const code = await main(args, { fetch: f.fn, env: e, log: (s: string) => lines.push(s) });
  return { code, out: lines.join("\n"), calls: f.calls };
};

test("writes an image, alt text, audio and a manifest for a non-VWC post", async () => {
  const out = tmp();
  const { code, calls } = await run([POST, "--brand", BRAND, "--out", out]);
  assert.equal(code, 0);
  const m = JSON.parse(readFileSync(join(out, "manifest.json"), "utf8"));
  const [image, audio] = m.results;
  assert.equal(image.status, "ok");
  assert.equal(image.alt, "Volunteers sorting tomatoes into milk crates");
  assert.ok(existsSync(image.path) && existsSync(audio.path));
  assert.equal(readFileSync(audio.path).subarray(0, 4).toString(), "RIFF");
  // The brand drives the image: its palette and style are in the prompt.
  const prompt = calls.find((c) => c.url.includes("-image:"))!.body.contents[0].parts[0].text;
  assert.match(prompt, /#2F5D3A/);
  assert.match(prompt, /gouache/);
});

test("--dry --json makes zero network calls and prices the run", async () => {
  const { code, out, calls } = await run([POST, "--brand", BRAND, "--dry", "--json"]);
  assert.equal(code, 0);
  assert.equal(calls.length, 0);
  const plan = JSON.parse(out);
  assert.ok(plan.est_usd_low > 0.15 && plan.est_usd_high < 2, `${plan.est_usd_low}-${plan.est_usd_high}`);
  assert.equal(plan.chunks, 1);
});

test("--max-usd stops before any paid call", async () => {
  const { code, calls } = await run([POST, "--brand", BRAND, "--max-usd", "0.01", "--out", tmp()]);
  assert.equal(code, 1);
  assert.equal(calls.length, 0);
});

test("text in every image attempt keeps the last image and flags it", async () => {
  const f = fakeFetch({ textInImage: true });
  const { code } = await run([POST, "--brand", BRAND, "--out", tmp(), "--only", "image"], f);
  assert.equal(code, 2);
  assert.equal(f.calls.filter((c) => c.url.includes("-image:")).length, 3);
});

test("a truncated TTS chunk is retried once, then flagged", async () => {
  const out = tmp();
  const { code, calls } = await run([POST, "--brand", BRAND, "--out", out, "--only", "audio"], fakeFetch({ ttsFinish: ["MAX_TOKENS", "MAX_TOKENS"] }));
  assert.equal(code, 2);
  assert.equal(calls.length, 2);
  assert.match(JSON.parse(readFileSync(join(out, "manifest.json"), "utf8")).results[0].error, /finishReason MAX_TOKENS/);
});

test("a failed audio step still writes the image and manifest, and exits 1", async () => {
  const out = tmp();
  const { code } = await run([POST, "--brand", BRAND, "--out", out], fakeFetch({ ttsFails: true }));
  assert.equal(code, 1);
  const [image, audio] = JSON.parse(readFileSync(join(out, "manifest.json"), "utf8")).results;
  assert.equal(image.status, "ok");
  assert.equal(audio.status, "failed");
});

test("missing storage credentials stop the run before any Gemini call", async () => {
  await assert.rejects(run([POST, "--brand", BRAND, "--out", tmp(), "--storage", "cloudinary"]), /CLOUDINARY_URL/);
});

test("Cloudinary uploads overwrite, invalidate and use the versioned URL", async () => {
  const forms: FormData[] = [];
  const f = fakeFetch({
    extra: (url, init) => {
      if (!url.includes("cloudinary.com")) return;
      forms.push(init.body);
      return new Response(JSON.stringify({ secure_url: `https://res.cloudinary.com/demo/v${forms.length}/hashflag/x` }));
    },
  });
  const { code, out } = await run([POST, "--brand", BRAND, "--out", tmp(), "--storage", "cloudinary"], f, { ...env, CLOUDINARY_URL: "cloudinary://k:s@demo" });
  assert.equal(code, 0);
  assert.equal(forms[0].get("overwrite"), "true");
  assert.equal(forms[0].get("invalidate"), "true");
  assert.equal(forms[0].get("public_id"), "hashflag/blog-post/hero");
  assert.match(out, /res\.cloudinary\.com\/demo\/v1\//);
});

test("S3 uploads are signed and content-addressed", async () => {
  const puts: Request[] = [];
  const f = fakeFetch({
    extra: (url, req) => {
      if (!url.startsWith("https://s3.example")) return;
      puts.push(req);
      return new Response("");
    },
  });
  const s3env = { ...env, S3_ENDPOINT: "https://s3.example", S3_BUCKET: "b", S3_PUBLIC_BASE_URL: "https://cdn.example", AWS_ACCESS_KEY_ID: "a", AWS_SECRET_ACCESS_KEY: "s" };
  const out = tmp();
  await run([POST, "--brand", BRAND, "--out", out, "--storage", "s3"], f, s3env);
  assert.equal(puts.length, 2);
  assert.match(puts[0].headers.get("authorization")!, /^AWS4-HMAC-SHA256/);
  assert.match(puts[0].headers.get("cache-control")!, /immutable/);
  const urls = JSON.parse(readFileSync(join(out, "manifest.json"), "utf8")).results.map((r: any) => r.url);
  assert.notEqual(urls[0], urls[1]);
  assert.match(urls[0], /^https:\/\/cdn\.example\/blog-post\/hero-[0-9a-f]{12}\.png$/);
});

test("publish uploads a finished local run without regenerating it", async () => {
  const out = tmp();
  await run([POST, "--brand", BRAND, "--out", out]);
  let uploads = 0;
  const f = fakeFetch({ extra: (url) => (url.includes("cloudinary.com") ? new Response(JSON.stringify({ secure_url: `https://res.cloudinary.com/demo/v${++uploads}/x` })) : undefined) });
  const { code, calls } = await run(["publish", join(out, "manifest.json"), "--storage", "cloudinary"], f, { CLOUDINARY_URL: "cloudinary://k:s@demo" });
  assert.equal(code, 0);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((c) => c.url.includes("cloudinary.com")));
});

test("--write edits only the target front matter keys", async () => {
  const dir = tmp();
  const post = join(dir, "post.md");
  copyFileSync(POST, post);
  const before = readFileSync(post, "utf8");
  await run([post, "--brand", BRAND, "--out", dir, "--write"]);
  const after = readFileSync(post, "utf8");
  const added = after.split("\n").filter((l) => !before.split("\n").includes(l));
  assert.equal(added.length, 3);
  assert.match(added.join("\n"), /^image: .*hero-.*\.png\nimage_alt: Volunteers.*\naudio: .*\.wav$/);
  assert.equal(after.replace(/^(image|image_alt|audio):.*\n/gm, ""), before);
});

test("--write keeps an existing alt and refuses to overwrite a map", async () => {
  const dir = tmp();
  const post = join(dir, "post.md");
  copyFileSync(POST, post);
  await run([post, "--brand", BRAND, "--out", dir, "--write", "--keys", "image=image.src,alt=image.alt,audio=audio", "--only", "image"]);
  assert.match(readFileSync(post, "utf8"), /image:\n {2}src: .*\n {2}alt: Volunteers/);
  await assert.rejects(run([post, "--brand", BRAND, "--out", dir, "--write", "--only", "image"]), /is a map/);
});

test("reads a post from a URL", async () => {
  const article = `<p>${"Saturday at the pantry starts early. ".repeat(40)}</p><p>Second paragraph.</p>`;
  const html = `<html><head><title>Saturday</title></head><body><nav>Home About</nav><article><h1>Saturday</h1>${article}</article></body></html>`;
  const fn = (async () => new Response(html, { headers: { "content-type": "text/html" } })) as typeof fetch;
  const post = await readPost("https://example.org/blog/saturday", fn);
  assert.equal(post.slug, "saturday");
  assert.equal(post.title, "Saturday");
  assert.ok(!post.body.includes("Home About"));
  assert.match(post.body, /\n\nSecond paragraph\.$/);
  const nav = (async () => new Response("<html><body><nav>Home</nav></body></html>", { headers: { "content-type": "text/html" } })) as typeof fetch;
  await assert.rejects(readPost("https://example.org/", nav), /Save the post as a Markdown file/);
});
