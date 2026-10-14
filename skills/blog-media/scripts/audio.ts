// Audio helpers ported from vets-who-code-app scripts/generate-single-blog-audio.ts.
// pcmToWav and cleanMarkdown are adapted from Brad Hankee's MIT-licensed code (see NOTICE).

export const SAMPLE_RATE = 24000; // Gemini TTS returns 24 kHz mono 16-bit PCM

export function pcmToWav(pcm: Buffer, sampleRate = SAMPLE_RATE, channels = 1): Buffer {
  const blockAlign = channels * 2;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

// Newer TTS models return a full WAV instead of raw PCM. Return the samples either way,
// so chunks can be joined and normalized before one header is written.
export function toPcm(bytes: Buffer): Buffer {
  if (bytes.subarray(0, 4).toString() !== "RIFF") return bytes;
  for (let i = 12; i + 8 <= bytes.length; ) {
    const id = bytes.toString("ascii", i, i + 4);
    const size = bytes.readUInt32LE(i + 4);
    if (id === "data") return bytes.subarray(i + 8, i + 8 + size);
    i += 8 + size + (size % 2);
  }
  throw new Error("WAV response has no data chunk");
}

export const pcmSeconds = (pcm: Buffer) => pcm.length / (SAMPLE_RATE * 2);

export function cleanMarkdown(markdown: string): string {
  return markdown
    .replace(/^(import|export)\s.*$/gm, "") // MDX module lines
    .replace(/```[\s\S]*?```/g, "") // code blocks are not narration
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "") // images (alt text is not narration)
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// The TTS model stops at 16,384 audio tokens (~655 s) and still reports STOP, so long
// text goes out in pieces. 1,500 words fits that cap down to 137 wpm.
export const WORDS_PER_CHUNK = 1500;

const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length;

export function chunkForTts(text: string, budget = WORDS_PER_CHUNK): string[] {
  const pieces = text
    .split(/\n\s*\n/)
    .filter((p) => p.trim())
    // A single paragraph over budget is split at sentence ends.
    .flatMap((p) => (countWords(p) <= budget ? [p] : p.match(/[^.!?]+[.!?]*\s*/g)!.map((s) => s.trim())));
  const chunks: string[] = [];
  let current: string[] = [];
  let words = 0;
  for (const piece of pieces) {
    const count = countWords(piece);
    if (words + count > budget && current.length) {
      chunks.push(current.join("\n\n"));
      current = [];
      words = 0;
    }
    current.push(piece);
    words += count;
  }
  if (current.length) chunks.push(current.join("\n\n"));
  return chunks;
}

// Levels drift within and between chunks and raw output clips at 0 dBFS. Ride the gain
// toward a target RMS slowly enough not to pump, then leave a decibel of headroom.
export function normalizeLoudness(pcm: Buffer, sampleRate = SAMPLE_RATE): Buffer {
  const TARGET_RMS = 0.158; // -16 dBFS
  const PEAK_CEILING = 0.891; // -1 dBFS
  const SILENCE_RMS = 0.00316; // -50 dBFS
  const MAX_GAIN = 4;
  const MIN_GAIN = 0.25;

  const samples = new Float32Array(pcm.length / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = pcm.readInt16LE(i * 2) / 32768;

  const hop = Math.round(sampleRate * 0.1);
  const smoothing = Math.exp(-0.1 / 1.5); // one-pole, ~1.5 s time constant
  const gains: number[] = [];
  let gain = 1;
  for (let start = 0; start < samples.length; start += hop) {
    const end = Math.min(start + hop, samples.length);
    let sum = 0;
    for (let i = start; i < end; i++) sum += samples[i] * samples[i];
    const rms = Math.sqrt(sum / (end - start));
    if (rms > SILENCE_RMS) {
      const wanted = Math.min(MAX_GAIN, Math.max(MIN_GAIN, TARGET_RMS / rms));
      gain = smoothing * gain + (1 - smoothing) * wanted;
    }
    gains.push(gain);
  }

  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const frame = Math.min(gains.length - 1, Math.floor(i / hop));
    const next = Math.min(gains.length - 1, frame + 1);
    const blend = (i % hop) / hop;
    samples[i] *= gains[frame] * (1 - blend) + gains[next] * blend;
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  const limiter = peak > PEAK_CEILING ? PEAK_CEILING / peak : 1;

  const out = Buffer.alloc(pcm.length);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.round(samples[i] * limiter * 32767);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, v)), i * 2);
  }
  return out;
}
