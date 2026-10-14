// Gemini REST calls. Model ids churn, so they live here and nowhere else.
import { pcmSeconds, toPcm } from "./audio.ts";

export const MODELS = {
  text: "gemini-3.1-pro-preview",
  image: "gemini-3-pro-image",
  tts: "gemini-2.5-flash-preview-tts",
};

// USD, from https://ai.google.dev/gemini-api/docs/pricing (read 2026-09-29).
export const PRICES = {
  text: { in: 2 / 1e6, out: 12 / 1e6 },
  image: 0.134, // per 1K image
  tts: { in: 0.5 / 1e6, out: 10 / 1e6 }, // 25 audio tokens per second
};

export const MAX_OUT = { text: 2048, vision: 1024 };
export const TTS_TOKEN_CAP = 16384;

type Fetch = typeof fetch;
type Part = { text?: string; thought?: boolean; inlineData?: { mimeType: string; data: string } };

export class Gemini {
  apiKey: string;
  fetchFn: Fetch;
  constructor(apiKey: string, fetchFn: Fetch = fetch) {
    this.apiKey = apiKey;
    this.fetchFn = fetchFn;
  }

  async generate(model: string, parts: Part[], generationConfig: object) {
    const res = await this.fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({ contents: [{ parts }], generationConfig }),
    });
    if (!res.ok) {
      const body = await res.text();
      const hint = res.status === 404 ? `\nModel "${model}" not found. Check https://ai.google.dev/gemini-api/docs/models and update MODELS in gemini.ts.` : "";
      throw new Error(`Gemini ${model} failed: HTTP ${res.status} ${body.slice(0, 500)}${hint}`);
    }
    const data: any = await res.json();
    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error(`Gemini ${model} returned no candidates: ${JSON.stringify(data).slice(0, 300)}`);
    return { parts: (candidate.content?.parts ?? []) as Part[], finishReason: candidate.finishReason as string, usage: data.usageMetadata ?? {} };
  }

  async json<T>(model: string, parts: Part[], schema: object, maxOutputTokens: number): Promise<T> {
    const { parts: out } = await this.generate(model, parts, {
      responseMimeType: "application/json",
      responseJsonSchema: schema,
      maxOutputTokens,
      thinkingConfig: { thinkingLevel: "LOW" },
    });
    const text = out.filter((p) => !p.thought && p.text).map((p) => p.text).join("");
    return JSON.parse(text);
  }

  scene(title: string, body: string) {
    return this.json<{ scene: string }>(
      MODELS.text,
      [
        {
          text: `Describe one concrete visual scene for the hero image of this blog post, in 2-4 sentences. Use a single visual metaphor from this post's own subject. Describe only what is seen: no text, signs, letters, numbers, logos or typography.\n\nTitle: ${title}\n\n${body}`,
        },
      ],
      { type: "object", properties: { scene: { type: "string" } }, required: ["scene"] },
      MAX_OUT.text,
    );
  }

  async image(prompt: string): Promise<{ data: Buffer; mimeType: string }> {
    const { parts } = await this.generate(MODELS.image, [{ text: prompt }], {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio: "16:9" },
    });
    const img = parts.filter((p) => !p.thought && p.inlineData).at(-1)?.inlineData;
    if (!img) throw new Error("Gemini returned no image");
    return { data: Buffer.from(img.data, "base64"), mimeType: img.mimeType };
  }

  // One call both checks for stray text and writes the alt text, so the alt describes
  // the image that was rendered, not the one that was asked for.
  inspect(image: { data: Buffer; mimeType: string }) {
    return this.json<{ hasText: boolean; detectedText?: string; altText: string }>(
      MODELS.text,
      [
        { inlineData: { mimeType: image.mimeType, data: image.data.toString("base64") } },
        {
          text: 'Does this image contain any text, letters, numbers, labels or typography? Be strict: one letter counts. Also write alt text: the most concise literal description of what is in the image, 120 characters or fewer, no "image of" or "picture of", no brand names, claims or numbers, no trailing period.',
        },
      ],
      {
        type: "object",
        properties: { hasText: { type: "boolean" }, detectedText: { type: "string" }, altText: { type: "string" } },
        required: ["hasText", "altText"],
      },
      MAX_OUT.vision,
    );
  }

  // Returns raw PCM and the checks that catch silent truncation.
  async speak(text: string, opts: { model: string; voice: string; style: string }) {
    // ponytail: 2.x models take the style as a spoken-text prefix; later models read the
    // text verbatim and take style as speechMetadata (per Google's docs, not yet tested live).
    const legacy = /gemini-2\./.test(opts.model);
    const part: any = legacy ? { text: `${opts.style}\n\n${text}` } : { text, speechMetadata: { style: opts.style } };
    const { parts, finishReason, usage } = await this.generate(opts.model, [part], {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: opts.voice } } },
    });
    const audio = parts.find((p) => p.inlineData)?.inlineData;
    if (!audio) throw new Error("Gemini TTS returned no audio");
    const pcm = toPcm(Buffer.from(audio.data, "base64"));
    const seconds = pcmSeconds(pcm);
    const words = text.split(/\s+/).filter(Boolean).length;
    const wpm = words / (seconds / 60);
    let problem = "";
    if (finishReason !== "STOP") problem = `finishReason ${finishReason}`;
    else if ((usage.candidatesTokenCount ?? 0) >= TTS_TOKEN_CAP || seconds >= 655) problem = "hit the audio token cap";
    else if (words >= 50 && wpm > 240) problem = `stopped early (${Math.round(wpm)} wpm)`;
    return { pcm, seconds, problem };
  }
}
