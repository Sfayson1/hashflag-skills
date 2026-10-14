# blog-media

Turn a blog post into a hero image, alt text and a narrated audio overview, in your own brand. Upload is optional and can go to Cloudinary, any S3-compatible bucket, or stay on disk.

## Before and after

**Before:** [`fixtures/nonprofit/blog-post.md`](../../fixtures/nonprofit/blog-post.md), 806 words from the fictional Wrenfield Community Pantry, with its brand pack at [`fixtures/nonprofit/brand.md`](../../fixtures/nonprofit/brand.md).

```sh
node skills/blog-media/scripts/blog-media.ts fixtures/nonprofit/blog-post.md --brand fixtures/nonprofit --dry
```

```
What a Saturday at the Pantry Looks Like
806 words in 1 TTS chunk(s)
Estimated cost: $0.2002-$0.6173

Image prompt:
Warm hand-painted gouache illustration, soft paper texture, friendly and calm. <scene written by the text model>
Use only these colors: #2F5D3A, #E07A2E, #F6F1E7, #A3B86C. Do not render the color codes, or any text, letters, numbers, signs, labels or logos. Wide 16:9 composition.
```

**After** a real run (drop `--dry`), the output folder holds:

```
~/.cache/hashflag/blog-media/blog-post/
  hero-<hash>.png      1376x768 hero image
  audio-<hash>.wav     about 4 minutes, 24 kHz mono
  manifest.json        status, path, URL and alt text for each output
```

and it prints a front-matter snippet:

```yaml
image: "/…/hero-1a2b3c4d.png"
image_alt: "…"
audio: "/…/audio-5e6f7a8b.wav"
```

## Requirements

- Node 22.18 or later.
- `GEMINI_API_KEY`. The image models have no free tier, so the image half needs a billed Google AI project. On the free tier, Google may use what you send to improve its products.
- For upload: `CLOUDINARY_URL`, or `S3_ENDPOINT`, `S3_BUCKET`, `S3_PUBLIC_BASE_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (and optional `S3_REGION`).

## Models and cost

| Step | Model | Price (2026-09-29) |
| --- | --- | --- |
| Scene description | `gemini-3.1-pro-preview` | $2 / 1M in, $12 / 1M out |
| Hero image | `gemini-3-pro-image` | $0.134 per image, up to 3 tries |
| Text check and alt text | `gemini-3.1-pro-preview` | as above |
| Narration | `gemini-2.5-flash-preview-tts`, voice Kore | $10 / 1M audio tokens (25 per second) |

A typical 800-word post costs about $0.20 to $0.62. `--dry` prints the range for your post. Model ids live in `scripts/gemini.ts`; when Google retires one, the error names the file to change. Set `tts.gemini.model` in the brand pack to try a newer TTS model.

## How it avoids known failures

- **Silent TTS truncation.** The TTS model stops at about 655 seconds and still reports success. Text is sent in chunks of up to 1,500 words, and each chunk is checked for a non-`STOP` finish, the token cap, and an implausible speaking rate. A failing chunk is retried once, then flagged.
- **Stale CDN copies.** Cloudinary uploads overwrite, invalidate, and return the versioned URL. S3 keys include a content hash. Local files are content-hashed too.
- **Text in images.** A vision check looks for any text. After 3 tries the last image is kept and flagged for review, never passed silently.
- **Overspend.** `--max-usd` stops before the first paid call.
