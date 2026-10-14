import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkForTts, cleanMarkdown, normalizeLoudness, pcmToWav, toPcm, WORDS_PER_CHUNK } from "./audio.ts";

const paragraph = (words: number) => Array(words).fill("word").join(" ");
const count = (s: string) => s.split(/\s+/).length;

test("short text stays in one chunk", () => {
  assert.equal(chunkForTts(`${paragraph(100)}\n\n${paragraph(100)}`).length, 1);
});

test("splits past the per-request word budget", () => {
  const chunks = chunkForTts(Array(6).fill(paragraph(400)).join("\n\n"));
  assert.ok(chunks.length > 1);
  for (const c of chunks) assert.ok(count(c) <= WORDS_PER_CHUNK);
});

test("loses no words when splitting", () => {
  const text = Array(6).fill(paragraph(400)).join("\n\n");
  assert.equal(count(chunkForTts(text).join(" ")), count(text));
});

test("one paragraph over budget splits at sentence ends", () => {
  const sentence = `${paragraph(99)}.`;
  const text = Array(20).fill(sentence).join(" "); // 2,000 words, no blank lines
  const chunks = chunkForTts(text);
  assert.ok(chunks.length > 1);
  for (const c of chunks) assert.ok(count(c) <= WORDS_PER_CHUNK && c.trim().endsWith("."));
});

test("drops images instead of narrating their alt text", () => {
  const clean = cleanMarkdown("Intro.\n\n![A chart of the job market](v123/chart.jpg)\n\nOutro.");
  assert.ok(!clean.includes("chart") && clean.includes("Intro.") && clean.includes("Outro."));
});

test("keeps link text", () => assert.equal(cleanMarkdown("See [the guide](https://example.com)."), "See the guide."));

test("strips MDX imports, JSX and code blocks", () => {
  const clean = cleanMarkdown('import Chart from "./c"\n\nHello.\n\n<Chart data={x} />\n\n```js\nconst a = 1\n```\n\nBye.');
  assert.equal(clean, "Hello.\n\nBye.");
});

test("a WAV response yields the same PCM as a raw one", () => {
  const pcm = Buffer.from([1, 0, 2, 0, 3, 0]);
  assert.deepEqual(toPcm(pcmToWav(pcm)), pcm);
  assert.deepEqual(toPcm(pcm), pcm);
});

const tone = (seconds: number, amplitude: number) => {
  const n = Math.round(24000 * seconds);
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.sin((i / 24000) * 2 * Math.PI * 220) * amplitude * 32767), i * 2);
  return pcm;
};

const rms = (pcm: Buffer, from: number, to: number) => {
  let sum = 0;
  let n = 0;
  for (let i = from * 24000; i < to * 24000; i++, n++) sum += (pcm.readInt16LE(i * 2) / 32768) ** 2;
  return 20 * Math.log10(Math.sqrt(sum / n));
};

test("pulls a quiet half and a loud half toward each other", () => {
  const input = Buffer.concat([tone(8, 0.05), tone(8, 0.7)]);
  const before = Math.abs(rms(input, 1, 7) - rms(input, 9, 15));
  const after = normalizeLoudness(input);
  assert.ok(Math.abs(rms(after, 1, 7) - rms(after, 9, 15)) < before / 2);
});

test("leaves headroom instead of clipping", () => {
  const out = normalizeLoudness(tone(4, 0.99));
  let peak = 0;
  for (let i = 0; i < out.length / 2; i++) peak = Math.max(peak, Math.abs(out.readInt16LE(i * 2) / 32768));
  assert.ok(peak <= 0.892);
});

test("does not amplify silence into noise", () => {
  assert.ok(normalizeLoudness(Buffer.alloc(24000 * 2 * 2)).every((b) => b === 0));
});
