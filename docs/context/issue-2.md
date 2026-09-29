# #2 [Skill]: Blog to image and audio: context

As of 2026-09-29. Unless a line says otherwise, paths are in `Vets-Who-Code/vets-who-code-app` at local HEAD `b7c19088`, branch `docs/readme-contributor-gaps`. `origin/master` is `badc2951`, 20 commits ahead (`git log HEAD..origin/master`). None of the pipeline scripts or tests differ between the two (`git diff HEAD origin/master -- scripts __tests__/scripts` is empty). `package.json` does differ: `@google/genai` is `2.24.0` on master (`git show origin/master:package.json` line 48; commit 5b798e4c, #1460, 2026-09-28). The target repo `Vets-Who-Code/hashflag-skills` is private and empty. It has no commits, no branch and no license (`gh api repos/Vets-Who-Code/hashflag-skills`; `/commits` returns 409 "Git Repository is empty", 2026-09-29).

"#N dK" below means decision K in the context doc for hashflag-skills issue #N, docs/context/issue-N.md (for example [issue-1.md](issue-1.md), [issue-3.md](issue-3.md)). Re-check a decision number before relying on it.

---

## What exists today

### Four statements in issue #2's "What exists today" are wrong
1. The issue says Gemini "writes image-prompt variants." It doesn't. Gemini returns a 5-key theme JSON, and three fixed templates are filled in from it (scripts/generate-blog-image.ts:41-63; scripts/image-prompts.ts:9-69).
2. The issue says the audio script "writes a narration script." It doesn't. It narrates a hand-written script at `src/data/blog-audio/<slug>.md` when one exists, and otherwise the post body. No code anywhere generates a script, and only one hand-written script exists (scripts/generate-single-blog-audio.ts:193-208; `ls src/data/blog-audio`).
3. The issue says the audio script "writes `audio:` into the post's front matter." No script writes front matter at all. The site builds the audio URL from the slug (src/lib/blog.ts:55-59), and no post has an `audio:` key (grep `^audio:` src/data/blogs/*.md → 0 hits). The first version of the script printed an `audioUrl:` front-matter hint (git show 4243651d, #948), and 7b0f4aef removed it. My inference is that this is where the claim came from.
4. The issue says chunking exists "because TTS rejects long inputs." It exists because TTS output is cut off at 16,384 audio tokens without any warning: the response still reports `finishReason STOP`. The input limit is 8,192 tokens, far more than a 1,700-word chunk needs (scripts/generate-single-blog-audio.ts:235-237; commit daf251d1; ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-preview-tts, read 2026-09-29).

Because of this, several pieces are new work rather than ports: front-matter wiring, alt text, narration-script writing, a `--dry` cost mode, pluggable storage, URL input, and running on a non-VWC post (issue #2 AC compared with the code above).

### Code to reuse (vets-who-code-app)

| Path | What it does | Port value and provenance |
|---|---|---|
| `scripts/generate-blog-image.ts` (250 lines) | The whole hero-image pipeline: `readBlogPost`, the theme prompt, the `gemini-3-pro-image` call, the text-detection vision call, the retry loop, and the Cloudinary upload with invalidate. Exports `main`, `readBlogPost` and `buildImagenPrompt` (file; wc -l) | High. Brad Hankee wrote 237/250 lines (git blame --line-porcelain) |
| `scripts/image-prompts.ts` (69) | The `Theme` type (5 string fields) and 3 VWC-styled templates (image-prompts.ts:1-69) | Seed for the brand style file. Brad Hankee wrote 69/69 lines (git blame) |
| `scripts/generate-single-blog-audio.ts` (344) | Exported pure helpers: `pcmToWav` (:6-39), `NARRATION_STYLE` (:240-242), `normalizeLoudness` (:244-296), `chunkForTts` (:298-325) and `cleanMarkdownToText` (:327-337). A raw-fetch TTS call (:59-121) and an awaited `upload_stream` (:123-152) | High. Authorship by range (git blame -L): `pcmToWav` Brad 33/34, the TTS fetch Brad 52/63 with Stephen Clark 10, the upload Brad 25/30, `cleanMarkdownToText` Brad 10/11. Jerome wrote `NARRATION_STYLE`, `normalizeLoudness` and `chunkForTts` (all but 1 line). File totals: Brad 177, Jerome 141, Stephen 26 |
| `scripts/generate-blog-media.ts` (92) | `validateSlug`, and `generateMedia(slug, generateImage, generateAudio)`, which takes the generators as arguments and wraps each step in its own try/catch (:7-65) | The pattern for the skill CLI and for #8. Jerome wrote 92/92 (git blame) |
| `scripts/generate-blog-graphic.ts` (142) | HTML-artboard graphics. Its `--dry` renders locally and skips the upload. Its `--draft` has Gemini write a file and refuses to overwrite an existing one (:75-135) | Precedent for flag handling only. Its `--dry` means something different from #2's (:91-98,123-126) |
| `scripts/lib/cloudinary.ts` (11) | A standalone Cloudinary config with no `@/` alias. Nothing imports it (file; grep for importers) | The portable config shape |
| `src/lib/blog.ts` | The consumer side. `processImageField` calls `getImageUrl` (:32-45), the audio URL is built from the slug (:55-59), and front matter is parsed with gray-matter (:5,51) | Shows what a VWC adapter has to produce |
| `src/lib/cloudinary-helpers.ts` | `getImageUrl` passes full http(s) URLs through untouched and turns anything else into `q_auto,f_auto,g_auto/<public_id>` (:17,25-86,203-215) | Delivery-URL reference for the Cloudinary adapter |
| `src/containers/blog-details/index.tsx` | Header `<img width="770">` whose alt falls back to the title (:14-22). `<audio preload="metadata"><source type="audio/mpeg">` renders whenever `audioUrl` is truthy (:39-51) | What the front-matter wiring feeds |
| `src/data/blog-audio/labor-day-sprint-10-days-to-proof-of-work.md` | The only spoken script: 55 lines, 1,212 words, numbers spelled out, acronyms dotted ("A.I.", "M.O.S.") (file) | Style reference for `--script` input |
| `src/data/blogs/high-success-low-adoption.md` | The newest post run end to end (#1436). `image.src: "blog-images/high-success-low-adoption.png"` plus a hand-written 75-character alt (:6-8) | Shape reference for the VWC front-matter preset. Copy its shape, not its text (decision 3) |
| `src/data/blogs/ai-as-infrastructure-audio-pipeline.md` | VWC's public write-up of the January pipeline. It predates chunking, normalization and invalidate, and line 47 is missing a word (:33-51) | Source for README copy, after an update |

Do not port these legacy scripts. `scripts/generate-blog-audio-overviews.ts` is what `npm run generate:blog-audio` runs. It has no chunking, no directive and no normalization, and it never uploads (package.json:27; scripts/generate-blog-audio-overviews.ts:123-170). `scripts/upload-blog-audio.js` and `scripts/upload-audio-to-cloudinary.ts` upload without `invalidate` (upload-blog-audio.js:30-36; upload-audio-to-cloudinary.ts:15-22).

### Tests to port

| File | Tests | Covers | Author (git blame) |
|---|---|---|---|
| `__tests__/scripts/tts-chunking.test.ts` (84) | 8 | 3× `chunkForTts`, 2× `cleanMarkdownToText` (image alt dropped, link text kept), 3× `normalizeLoudness` using synthetic `tone()`/`rms()` helpers (:43-61). The stale bound `1500+400` at :15-21 passes only because 4×400 ≤ 1,900 | Jerome 84/84 |
| `__tests__/scripts/generate-single-blog-audio.test.ts` (149) | 12 | 5× `cleanMarkdownToText`, 7× `pcmToWav` header offsets (mono and stereo, 44.1k and 48k) | Brad 149/149 |
| `__tests__/scripts/generate-blog-image.test.ts` (154) | 8 | 6× `readBlogPost`, 2× `buildImagenPrompt` (variant 0 only). Writes fixtures into the real `src/data/blogs` (:9-20) | Brad 154/154 |
| `__tests__/scripts/generate-blog-media.test.ts` (112) | 10 | 4× `validateSlug` (writes `src/data/blogs/test-media-post.md`), 6× `generateMedia` using `vi.fn` generators (:11-112) | Jerome 112/112 |
| `__tests__/scripts/generate-blog-graphic.test.ts` (25) | 4 | `stripFences` only. Out of scope (decision 14) | not blamed |

The tts-chunking, single-blog-audio and blog-media files pass: 30 tests under vitest 4.1.11 (`npx vitest run`, 2026-09-29). No existing test mocks Gemini, fetch or Cloudinary (grep of the test files).

### Prior art outside the app
- **HyperFrames TTS engine.** `~/.claude/skills/media-use/audio/scripts/audio.mjs` (HyperFrames, Apache-2.0) is a provider-neutral TTS engine. Upstream `main` added a Gemini provider (default `gemini-3.8-flash-tts`, voice Kore, a `style` field) in commit 01601d1105 (#4377, 2026-09-24). The local install doesn't have it. The faceless adapter hard-codes `provider: "auto"`, which never picks Gemini (upstream skills/media-use/audio/references/tts.md; upstream faceless-explainer/scripts/audio.mjs:165-177; both read via gh api 2026-09-29). This matters only if #2 and #3 are to share one narration backend.
- **Mocking TTS.** `~/.claude/skills/media-use/audio/scripts/lib/tts.mjs:295-304` injects `fetch`/`transcodeToWav` as dependencies and tests with `node:test`.
- **Output location.** `~/.claude/skills/pr-to-video/scripts/project-dir.mjs:8-53` writes output outside the caller's repo and supports an env override.
- **Frontmatter.** `~/.claude/skills/hashflag-pr-prep/SKILL.md:1-5` is the owner's SKILL.md frontmatter pattern (`name`, `description`, `user-invocable: true`). `user-invocable` is not one of the portable spec keys (decision 16).

---

## How it works now

### Entry points
- `npm run generate:blog-media <slug>` runs `tsx -r dotenv/config scripts/generate-blog-media.ts` (package.json:31).
- `npm run generate:blog-image <slug>` (package.json:30).
- Single-post audio has no npm script. The retry hint printed for it is `npx tsx scripts/generate-single-blog-audio.ts <slug>` (generate-blog-media.ts:54). That command doesn't load `.env`, because the script never imports dotenv (generate-single-blog-audio.ts:1-3).
- The only input is a slug, resolved to `src/data/blogs/<slug>.md` relative to cwd (generate-blog-image.ts:9,17-22; generate-single-blog-audio.ts:176). None of the three scripts takes any flags (grep for `--dry`, 2026-09-29).

### Hero image, step by step
1. **Read the post.**
   - The title comes from `/^title:\s*["']?(.+?)["']?\s*$/m`, falling back to the slug.
   - The body is `raw.replace(/^---[\s\S]*?---\n?/, "")` and is sent untruncated.
   - Description, tags and summary are ignored (generate-blog-image.ts:24-30). The README says a summary is used, and it isn't (README.md:202).
2. **Theme call.**
   - `ai.models.generateContent({ model: "gemini-3.1-pro-preview", contents })`, with no `responseSchema`, temperature or thinking config.
   - The prompt hard-codes "1950s propaganda-style poster" and "positive and empowering".
   - It asks for `mainSubject`, `keyMessage`, `visualMetaphor`, `symbolicElements` and `fullThemeDescription` (:41-63).
3. **Parse.** Code fences are stripped, then the result goes through `JSON.parse`. The keys are never validated, so a missing key reaches the prompt as the literal string `undefined` (:65-80). `keyMessage` is requested, but no template uses it (image-prompts.ts:9-69).
4. **Attempt loop.**
   - `MAX_RETRIES = 3`, and attempt N uses `imagenPromptVariants[N-1]`: [0] linocut, [1] WPA mural, [2] geometric mural (:10,222-225; image-prompts.ts:10-68).
   - All three write the palette as hex (Navy #091f40, Red #c5203e, White #ffffff), next to "No text or hex codes" (image-prompts.ts:14,17,42,55,58).
   - Raising `MAX_RETRIES` without adding a variant would crash on `undefined` (inference from :84,225).
5. **Generate.**
   - `gemini-3-pro-image` via `generateContent`, with `config.imageConfig.aspectRatio: "16:9"`.
   - No `imageSize` is set, so it defaults to 1K (:87-98; node_modules/@google/genai/dist/genai.d.ts:5510-5527 @1.40.0, unchanged at :8546-8565 @2.24.0).
   - It takes the first part that has `inlineData.data` and ignores `mimeType`, `finishReason` and any `thought` flag (:100-105).
6. **Text check.** A second `gemini-3.1-pro-preview` call receives the image labelled `mimeType: "image/png"`, although the bytes are JPEG. It is told "Be VERY strict… `{ "hasText", "detectedText" }`". A parse failure returns `{ hasText: false }`, so the check fails open (:178-220).
7. **Retry semantics.**
   - Each attempt is a fresh image from the next template.
   - `detectedText` is logged but never fed back into the prompt.
   - After 3 text-positive attempts, the script uploads the last image and exits 0 ("manual review recommended") (:222-246).
   - API errors (429/5xx/safety) are not retried (inference from :222-247).
8. **Upload.** `data:image/png;base64,…` goes to `uploader.upload` with `{ resource_type: "image", public_id: slug, folder: "blog-images", overwrite: true, invalidate: true }`. The script prints `secure_url` (:110-138,163-167).
9. **Wiring is manual.** An author types `image.src: "blog-images/<slug>.png"` (README.md:197). One run makes 3 to 7 sequential paid calls (:159-161,222-247).

### Audio overview, step by step
1. **Read the post.** Read `src/data/blogs/<slug>.md` and split off the front matter with `/---\n[\s\S]*?\n---\n([\s\S]*)/`. The regex is LF-only and unanchored (generate-single-blog-audio.ts:176-191).
2. **Prefer a hand-written script.** If `src/data/blog-audio/<slug>.md` exists, narrate it instead of the body (:193-208).
3. **Clean.** `cleanMarkdownToText` strips, in this order: images, headers, `**`, every `*`, links (keeping the text), HTML tags and list markers, then trims (:327-337). There are no rules for code fences, tables, blockquotes, numbered lists, `_emphasis_`, MDX import/export or `{jsx}`.
4. **Chunk.** `chunkForTts` uses `WORDS_PER_CHUNK = 1700`. It splits on `/\n\s*\n/` and packs paragraphs greedily. A single paragraph over 1,700 words is never split (:298-325).
5. **Call TTS.**
   - Each chunk is sent in sequence with raw `fetch` to `…/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`.
   - The request uses header `x-goog-api-key`, `responseModalities: ["AUDIO"]` and `prebuiltVoiceConfig.voiceName: "Kore"`.
   - The body is `${NARRATION_STYLE}\n\n${chunk}` (:59-93,214-227). `NARRATION_STYLE` is "Read the following blog post aloud in a single, steady, clear narration voice. Keep an even pace and consistent volume throughout. Do not add commentary." (:240-242).
6. **Decode.** `candidates[0].content.parts.find(p => p.inlineData).inlineData.data` is decoded as raw PCM. `finishReason`, `usageMetadata` and `mimeType` are never read (:95-121; the only "finishReason" in the file is the comment at :236).
7. **Pause.** 350 ms of silence (`Buffer.alloc(24000*2*0.35)` = 16,800 bytes) goes before every chunk after the first (:214).
8. **Normalize.**
   - `normalizeLoudness` uses `TARGET_RMS 0.158` (−16 dBFS), `PEAK_CEILING 0.891` (−1 dBFS), `SILENCE_RMS 0.00316`, `MAX_GAIN 4` and `MIN_GAIN 0.25`.
   - It works in 100 ms hops with one-pole smoothing `exp(-0.1/1.5)`, then applies one global scale if the peak exceeds the ceiling (:244-296).
   - This is sample RMS, not LUFS, and the final scale isn't a true limiter (inference from :279-294).
9. **Wrap.** `pcmToWav(pcm, 24000, 1)` writes 16-bit audio with a 44-byte RIFF header, applied once after concatenation (:6-39,229).
10. **Upload.** `upload_stream` is awaited, with `{ resource_type: "video", public_id: slug, folder: "blog-audio", format: "wav", overwrite: true, invalidate: true }`. The WAV is never written to disk (:123-152,229-231).
11. **Serve.** The site builds `https://res.cloudinary.com/${NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME||"vetswhocode"}/video/upload/f_mp3/blog-audio/${slug}.wav` for every post and ignores any front-matter `audioUrl` (src/lib/blog.ts:55-59,81,125-127).

### Orchestrator
- `generate-blog-media.ts` checks the slug, dynamically imports both `main()` functions, and passes the slug by reassigning `process.argv[2]` (:67-85, :75).
- It runs the image step and then the audio step, each in its own try/catch.
- It prints retry hints and a ✅/❌ summary, returns `{ imageOk, audioOk }`, and exits 1 if either step failed (:25-65,82-84).

### What is actually delivered (measured)
- **Header images.** The two headers generated after #1266 are JPEG, 1376×768, at 1,060,743 B and 1,220,196 B. The March 2026 header is PNG 1408×768, which I infer came from Imagen 4 (`curl … | file -`, 2026-09-29).
- **Optimized delivery.** `q_auto,f_auto,g_auto/blog-images/high-success-low-adoption.png` returns 200 image/webp at 333,560 B, or JPEG at 314,088 B (curl -I, 2026-09-29).
- **Audio size.** The labor-day WAV is 17,223,004 B, which is 358.8 s at 48,000 B/s. Its `f_mp3` derivative is 3,463,172 B (about 77 kbps), about 5× smaller (curl -I, 2026-09-29).
- **Audio coverage.** All 39 posts return 200 for `blog-audio/<slug>.wav`, about 10,729 s of narration in total. The longest is intelligence-layer-decade at 35,164,010 B (732.6 s) (HEAD per slug, 2026-09-29).
- **Narration rate.** Against the words `cleanMarkdownToText` actually produces, the 39 WAVs read at 155.4 to 212.6 wpm: median 177.8, pooled 180.2. The slowest is a code-heavy post, two-pointers-…, which has 16 fence lines (my measurement: HEAD content-length, duration = (bytes−44)/48,000 minus 0.35 s per extra chunk, 2026-09-29).
- **OG image.** The OG image is the 16:9 header, declared as 1200×630, with `og:image:alt` set to the title. The 1200×630 crop helper never runs, because `image.src` is already a full URL by the time it's called (src/pages/blogs/[slug].tsx:33,100; src/lib/cloudinary-helpers.ts:120-128; src/components/seo/page-seo.tsx:59-70).

### Env and runtime
- **Gemini keys.**
  - The image script reads only `GEMINI_API_KEY` (generate-blog-image.ts:147-150). `.env.example` says the scripts fall back to other keys, and this one doesn't (.env.example:46-51).
  - The audio script reads `GOOGLE_GENERATIVE_AI_API_KEY || GEMINI_API_KEY || GOOGLE_PRIVATE_KEY` (generate-single-blog-audio.ts:163-166).
  - `GOOGLE_PRIVATE_KEY` is labelled "script-only, third fallback" (.env.example:44-51). My inference is that it's a service-account key, not a Gemini key.
- **Cloudinary.** Config reads `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` at import time, through the app alias `@/lib/cloudinary` (src/lib/cloudinary.ts:4-9; generate-blog-image.ts:5; generate-single-blog-audio.ts:3). The SDK also reads `CLOUDINARY_URL` natively (node_modules/cloudinary/lib/config.js:105-110).
- **dotenv.** dotenv loads `.env`, but the README's setup step creates `.env.local` (README.md:103,188).
- **Module format.** The scripts are CommonJS (no `"type"` in package.json) with a `require.main === module` guard (generate-blog-image.ts:170; generate-single-blog-audio.ts:339-344). The image script's `ai` client is a module-level `let` that is set only inside `main()` (:8,153).
- **Lint and types.** Biome ignores `scripts/` (biome.json:339), and tsconfig doesn't include it (tsconfig.json:86-108).
- **Pinned versions.** `@google/genai` 1.40.0 locally (package.json:49), and 2.24.0 on master (5b798e4c, #1460). Both declare `engines.node >=20.0.0` (their package.json). Also `cloudinary` 2.9.0 (:66), `gray-matter` 4.0.3 and `dotenv` 18.0.0, on Node 20 (.nvmrc).

---

## Lessons already paid for

1. **Model ids get retired without warning.** `gemini-3-pro-preview` and `imagen-4.0-generate-001` both disappeared, and the API key listed no Imagen models at all. The 404 body named the replacement, which is how #1266 found the fix (PR #1266 body; commit 1fa1bfa7). Imagen 4 shut down on 2026-08-17 and `gemini-3-pro-preview` on 2026-03-09 (ai.google.dev/gemini-api/docs/deprecations). Keep model ids in one config, and report a 404 together with the model name.
2. **An unawaited upload reports success.** 7b0f4aef (#959) dropped the `await`. The run printed "Audio: ✅ Success" while the URL returned 404, until 8443c807 put it back (PR #1266 body). `my-journey…` had no audio at all until 2026-08-22 (curl -I Last-Modified).
3. **TTS truncates silently.** The 16,384-token output cap is about 655 s. 8 of 38 posts were broken: 3 at exactly 655.13 s, 3 that stopped well short, and 1 missing. For example, 10-day-sprint (4,303 words) ran 655 s before the fix and 1,234 s after (commit daf251d1; PR #1266 audit table). 3.8 Flash TTS has the same 16,384-token output limit (ai.google.dev/gemini-api/docs/models/gemini-3.8-flash-tts, read 2026-09-29).
4. **TTS also stops early, well below the cap, and "187 wpm" isn't the real rate.**
   - combat-to-code came out at 245 s instead of 365 s, and using-ai-to-create-a-login-feature at 31 s instead of 89 s, with the text unchanged (PR #1266 table; git ls-tree -l 48d1ad46^ sizes vs curl -I).
   - PR #1266's yardstick was "audio far shorter than words ÷ 187 is truncated", and it reported fixed posts in a 158–213 wpm band (PR #1266 body).
   - Measured on all 39 current WAVs, the rate runs 155.4 to 212.6 wpm, with a median of 177.8 and a pooled rate of 180.2 (see "What is actually delivered"). 187 is neither the median nor a bound, and the code comment's "170-213 wpm" (generate-single-blog-audio.ts:299-301) is also too narrow.
   - Count cleaned words, not raw Markdown. high-success-low-adoption has 1,297 raw body words (about 210 wpm) but 1,231 cleaned words (199.7 wpm) (my measurement).
   - The current code has no automatic guard (decision 22).
5. **Versionless URLs serve stale copies.**
   - After re-uploads, all eight regenerated posts still served truncated audio. The sprint MP3 came back at 6.1 MB instead of 11.6 MB until `invalidate: true` was added (commit 1f77237b; PR #1266).
   - Existing assets were purged by hand with `uploader.explicit` (PR #1266).
   - Cloudinary's `invalidate` defaults to false, and propagation "usually takes between a few seconds and a few minutes" (cloudinary.com/documentation/image_upload_api_reference_upload, read 2026-09-29).
6. **Each chunk can come back in a different voice.** Without a fixed directive, the model picks a new delivery for each request, so the chunks sound like different readers. The fix was to send `NARRATION_STYLE` with every chunk (commit d97b2ce8; generate-single-blog-audio.ts:238-242).
7. **Loudness varied and clipped.** `normalizeLoudness` cut the level spread within one post from 6.8 dB to 3.2 dB and removed 0 dBFS clipping (commit d97b2ce8).
8. **Image alt text got narrated.** The link rule turned `![alt](url)` into spoken alt text, so images are now stripped first (commit daf251d1).
9. **One WAV header, not one per chunk.** Wrapping each response in its own header was replaced with raw PCM plus a single header after concatenation (commit daf251d1 diff).
10. **Anything in `src/data/blogs` is published.** `getSlugs` is a bare `readdirSync`. An `audio/` subdirectory broke the Vercel build, which is why the scripts moved to `src/data/blog-audio` (commit d7157a61; src/lib/util.ts:18-20). The current tests still write fixtures there (generate-blog-image.test.ts:9-20; generate-blog-media.test.ts:9-38).
11. **Image models garble labels.** That's why the text gate exists, and why graphics that need words are HTML artboards (commit 66ca0790; the 1fa1bfa7 message says "the first pyramid drew its 2026 heading twice").
12. **The text gate fails open.** Unparseable JSON counts as "no text", and a third text-positive image still ships with exit 0 (generate-blog-image.ts:214-219,239-246).
13. **The bytes are JPEG but labelled PNG.** The upload URI and the vision call both hard-code `image/png` (:115,191). Cloudinary stores whatever the bytes actually are (CDN checks, 2026-09-29). Read `inlineData.mimeType` instead.
14. **A full URL in front matter defeats optimization.** `getImageUrl` returns it untouched, so readers download about 1.06 MB instead of about 330 KB (cloudinary-helpers.ts:208-211; CDN sizes 2026-09-29). The house convention is the bare public id.
15. **`process.exit` inside a generator kills the orchestrator.** The audio `main()` exits on bad input, so the summary never prints (generate-single-blog-audio.ts:157-191 vs generate-blog-media.ts:49-62; inference from code).
16. **The printed retry hint doesn't work.** It omits `-r dotenv/config` (generate-blog-media.ts:54). My inference is that, run as printed, it fails on missing keys.
17. **The legacy entry point is a trap.**
    - `npm run generate:blog-audio` runs the batch script. On a fresh clone, `public/audio/blogs` is gitignored and absent, so the script would regenerate every post (about $2.7) with no chunking (package.json:27; generate-blog-audio-overviews.ts:143-150; commit 48d1ad46).
    - AGENTS.md:46-47 still says "Gemini → Imagen" and says that `generate:blog-audio` uploads. Both are wrong.
18. **Audio playback setup.** `f_mp3` delivery, a CSP `media-src` entry for res.cloudinary.com, and the removal of `flags: 'streaming_attachment'` (which forced downloads) all landed in d6bd0f55 (next.config.js:97).
19. **Large WAVs broke deploys.** 363.73 MB of committed WAVs exceeded Vercel's 250 MB function limit (.vercelignore since 39de29f0). 36 WAVs (409 MB) were untracked in 48d1ad46 (#1352).
20. **Review comments from #959 were never acted on.** All three are in the PR #959 Copilot review:
    - The slug is never validated, so `../x` can escape the blog directory and produce odd public ids (generate-blog-image.ts:18,122).
    - Server scripts use `NEXT_PUBLIC_` names.
    - The prompt gives hex codes and then says "No text or hex codes". The reviewer's suggested fix is to name the colors or to say "do not render any hex codes as visible text" (image-prompts.ts:14,17,55,58).
21. **Cloudinary dynamic folder mode changes what `folder` does.** On accounts in dynamic folder mode, `folder` is legacy and may not prefix `public_id`. `asset_folder` doesn't change the id unless `use_asset_folder_as_public_id_prefix` is set (Cloudinary upload API reference, read 2026-09-29). VWC's account evidently uses fixed folders, since its URLs resolve (inference).
22. **The CLI guard must come after `NARRATION_STYLE`.** d97b2ce8 moved it to the end of the file. My inference is that `main()` reads the const before its first `await`, so calling it any earlier would hit the TDZ (d97b2ce8 diff).
23. **The SDK major bump (1.40.0 → 2.24.0) has been checked statically, not live.** #1460 changed no scripts. What I checked:
    - The 2.0.0 changelog says "The breaking changes are only in interactions. `GenerateContent` usage in unaffected" [sic] (js-genai CHANGELOG.md, 2.0.0, 2026-05-07).
    - The unmodified image and graphic scripts typecheck against both versions. The only error is the missing `playwright` types in the graphic script (tsc in a scratch install with `@/lib/cloudinary` stubbed, 2026-09-29).
    - With a fake `fetch` (`httpOptions.fetch`, added in 2.23.0 per the changelog), 2.24.0 sends `generationConfig.imageConfig.aspectRatio: "16:9"` to `v1beta/models/gemini-3-pro-image:generateContent`. `response.text` and `candidates[0].content.parts[].inlineData` read as they did before, and the existing `.find` skips a leading `thought: true` text part (offline probe, 2026-09-29).
    - `ImageConfig.aspectRatio`/`imageSize` are unchanged, and the REST schema now also lists `imageSize` `"512"` (genai.d.ts:8546-8565 @2.24.0 vs :5510-5527 @1.40.0; v1beta discovery doc).
    - 2.24.0 adds opt-in retries on 408/429/5xx, active only when `httpOptions.retryOptions` is set (dist/node/index.cjs:13837-13878 @2.24.0).
    - The audio script uses raw `fetch`, so the SDK doesn't touch it (generate-single-blog-audio.ts:59-93).
    - Not done: any live call on 2.x.
24. **Dead Cloudinary helper.** `getBlogHeaderUrl` has no callers. Per #1266's reviewer notes, its `gravity: "auto"` with `crop: "limit"` makes Cloudinary return 400. I didn't re-verify this (cloudinary-helpers.ts:93; PR #1266 body).
25. **1,700-word chunks have no headroom at the slowest measured rate.**
    - At 155.4 wpm, the 655.36 s cap holds 1,697 words (arithmetic from the measured band).
    - The code comment assumes a 170 wpm floor (generate-single-blog-audio.ts:299-302). The PR #1266 body describes 1,500-word chunks, but the code shipped 1,700, and the test still asserts `1500+400` (PR #1266 body; tts-chunking.test.ts:15-21).
    - Code-heavy posts, which is what URL input from tech blogs brings, read slowest (my measurement).
26. **A wpm band alone misses truncation at the cap.**
    - system-requirements (1,890 words) was cut at 655 s, which reads as a normal-looking 173 wpm. intelligence-layer-decade (2,342 words) was cut at 655 s, which reads as 214.5 wpm, just outside the band.
    - The six known bad outputs implied 173–453 wpm (PR #1266 table; arithmetic).
    - Only a check on `candidatesTokenCount`, or on a duration at the cap, catches the first case (decision 22).

---

## Dependencies

### Issues
- **Upstream:** none stated (issue #2 body).
- **Downstream:** #4, #5, #6, #7 and #8 build on #2 (issue bodies #4–#8). #8 needs three things from #2: a `--dry` cost estimate, a way to generate without uploading (for its review step), and machine-readable status for each output (#8 body; inference).
- **Epic AC that applies to #2:** "Every skill has tests or evals that run in CI, and a README with a before-and-after example" (issue #1 body).
- **#9 fixtures** are what make the "non-VWC post" criterion testable. The fixture's front matter is `title, date, author, description, tags`, with no `image`. VWC posts use `postedAt` and `image: {src, alt}` (#9 body; grep of front-matter keys in src/data/blogs).

**Cross-issue decisions this doc has to agree with:**

| Topic | #2 default here | Sibling defaults | Status |
|---|---|---|---|
| Repo license | Follow #1 d1 (decision 2) | #1 d1: AGPL-3.0 code, CC0 fixtures. #3 d11: Apache-2.0 | **Conflict.** The owner picks once, before bootstrap |
| Brand file format | #9's headings, plus two optional #2 headings (decision 3) | #9 d6: `##` headings, `role: #hex`, no YAML. #3 d1: YAML front matter in brand.md. #1 d5: brand.md plus a machine-readable brand.json | **Conflict.** Decide before #2 merges (#3 d2) |
| Hero alt text | From the vision call, ≤120 chars (decision 6) | #8 d12: same call, ≤120 chars | Aligned |
| SKILL.md frontmatter | The six spec keys only (decision 16) | #1 d3: spec-only keys except where #8 needs one | Aligned |
| TTS model | Chosen after build step 3 (decision 4) | #1 d9: test with a fresh key first. #6 d10: inherit #2's choice | Aligned |
| `--dry` output | `--dry --json` in #1 d14's shape (decision 13) | #1 d14: `{calls:[{model, est_tokens_in, est_tokens_out}], est_usd_low, est_usd_high}` | Aligned |
| Storage order | local, then Cloudinary, then S3 (decision 9) | #1 d7: same order | Aligned |
| Output location | #1 d12's external cache dir | #1 d12: `~/.cache/hashflag/<skill>/<project>/` with an env override | Aligned |
| Free-tier data use | Warn (decision 21) | #6 d9: warn when input has names. #1 d20: warn and confirm for #6 | Aligned. #6 adds the confirmation |

### Repo and process
- hashflag-skills has no branch, so no PR can land until someone pushes a first commit to `main` (gh api).
- The owner's rules:
  - branch off the default branch;
  - Conventional Commits (commitlint.config.js in the app);
  - No AI attribution in commits, PRs or docs (owner rule).
  - one independent PR per issue (owner decision).

  Sources: ~/.claude/CLAUDE.md; owner decision.

### Tools and system
- **Node and packaging.** Node ≥22, to match HyperFrames' engines for #3 (its package.json) and jsdom 30's engines (below). Plus npm, `tsx`, `@google/genai` (2.24.0 declares Node ≥20), `cloudinary`, and `gray-matter` 4.0.3 (MIT, already an app dependency, src/lib/blog.ts:5).
- **URL input candidates** (npm registry, read 2026-09-29):
  - `@mozilla/readability` 0.6.0: Apache-2.0, Node ≥14.
  - `jsdom` 30.1.1: MIT. `engines.node` is `^22.22.2 || ^24.15.0 || >=26.0.0`, so it can't run on the app's Node 20.
  - `turndown` 7.2.4: MIT, Node ≥18.
  - `linkedom` 0.18.13: ISC, Node ≥16. Readability's README doesn't mention it.
  - `dompurify` 3.4.16: MPL-2.0 or Apache-2.0.
- **S3 candidates** (npm registry, read 2026-09-29):
  - `aws4fetch` 1.0.20: MIT, zero dependencies, 65.5 KB unpacked.
  - `@aws-sdk/client-s3` 3.1142.0: Apache-2.0, Node ≥20, 3.3 MB unpacked, 11 direct dependencies.
- **MP3 without Cloudinary** needs a local encoder, because the VWC MP3 comes entirely from the Cloudinary `f_mp3` transform (src/lib/blog.ts:59).
  - FFmpeg "is licensed under the GNU Lesser General Public License (LGPL) version 2.1 or later", and `--enable-gpl` makes "the GPL appl[y] to all of FFmpeg". Its distribution checklist says to compile without `--enable-gpl` and `--enable-nonfree` and to ship the matching source (ffmpeg.org/legal.html, read 2026-09-29).
  - `ffmpeg-static` 5.3.0 is published as GPL-3.0-or-later and downloads a static binary whose "use and distribution… are covered by their respective license" (npm metadata and README).
  - The pure-JS `lamejs` 1.2.1 and `@breezystack/lamejs` 1.2.7 are LGPL-3.0 (npm).
  - Invoking a user-installed `ffmpeg` distributes nothing, so the checklist doesn't reach this repo (inference, not legal advice). See decision 11.
- **Playwright** only if the inline-graphic script comes into scope (generate-blog-graphic.ts:100-121).

### Accounts and keys
- **Gemini, image half.** It needs an API key on a **billed** project, because `gemini-3-pro-image` and `gemini-3.1-pro-preview` have no free tier (ai.google.dev/gemini-api/docs/pricing, read 2026-09-29).
- **Gemini, TTS.** TTS runs on the free tier ("Free of charge"; pricing page).
  - For Unpaid Services, "Google uses the content you submit to the Services and any generated responses to provide, improve, and develop Google products and services", "human reviewers may read, annotate, and process your API input and output", and "Do not submit sensitive, confidential, or personal information to the Unpaid Services".
  - Access is Paid "only when accessing the API through a Cloud Project associated with an active billing account" (ai.google.dev/gemini-api/terms, last updated 2026-04-28).
  - The response doesn't reveal the tier. `usageMetadata.serviceTier` is `standard`/`flex`/`priority` (v1beta discovery doc).
  - This matters for unpublished drafts and for #6 (decision 21).
- **Cloudinary.** The Free plan has 25 credits/month (cloudinary.com/pricing, read 2026-09-29). Credentials go in as the three vars or as `CLOUDINARY_URL`.
- **S3-compatible providers.**
  - Any bucket plus a public base URL. R2's endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, with region `auto`, and PutObject accepts `Content-Type` and `Cache-Control` (developers.cloudflare.com/r2/api/s3/api, read 2026-09-29).
  - R2 `r2.dev` URLs are "rate-limited and should only be used for development purposes". A custom domain gets Cloudflare Cache (developers.cloudflare.com/r2/buckets/public-buckets, read 2026-09-29).
  - Not researched: B2, Wasabi and MinIO quirks, and Cloudflare's cache-purge API.

### Service limits
- **TTS.** Both `gemini-2.5-flash-preview-tts` and `gemini-3.8-flash-tts` take 8,192 input and 16,384 output tokens, at 25 audio tokens/s (model pages; pricing page). 3.8 does not support structured outputs or thinking (3.8 model page).
- **Gemini rate and spend limits.**
  - Rate limits are per project, and RPD resets at midnight Pacific. No per-model RPM/RPD is published; the docs point to AI Studio.
  - Spend limits per rolling 10 minutes are Tier 1 $10, Tier 2 $50, Tier 3 $200, and going over returns 429 (ai.google.dev/gemini-api/docs/rate-limits, read 2026-09-29).
- **Cloudinary Free.**
  - 10 MB per image, 100 MB per video/audio upload (about 34.7 min of 24 kHz mono WAV), and 500 Admin API requests/hour.
  - The limits are soft: going over triggers an upgrade request rather than a refusal (cloudinary.com/pricing/compare-plans, read 2026-09-29).
- **Cloudinary on-the-fly video transforms.** Cloudinary's docs cap them at "40MB for Free plans, 300MB for paid plans". Above that, requests fail with "Video is too large to process synchronously, please use an eager transformation with eager_async=true" (cloudinary.com/documentation/ts_troubleshooting_video_transformation_errors, read 2026-09-29).
  - The page names video only. That it covers a WAV uploaded as `resource_type: "video"` and delivered with `f_mp3` is my inference.
  - 40 MB of WAV is about 833 s, or roughly 2,160–2,950 words across the measured rate band (arithmetic). VWC's longest WAV is 35.2 MB (HEAD). See decision 9.

---

## Cost

### Unit prices (Gemini Developer API, Standard tier; the page was updated 2026-09-24 and read 2026-09-29)

| Model | Free tier | Input | Output | Status |
|---|---|---|---|---|
| `gemini-3.1-pro-preview` | none | $2.00/1M (≤200k) | $12.00/1M, including thinking | Preview, released 2026-02-19, no shutdown date |
| `gemini-3-pro-image` | none | $2.00/1M | $120/1M image tokens: $0.134 per 1K or 2K image (1,120 tok), $0.24 per 4K (2,000 tok). Text/thinking $12/1M | GA 2026-05-28 |
| `gemini-2.5-flash-preview-tts` | free | $0.50/1M text | $10.00/1M audio | "Legacy", no shutdown date, replacement 3.8 |
| `gemini-3.8-flash-tts` | free | $0.50 (from 2027-01-01: $1.00) | $9.00 (then $18.00) | GA 2026-09-22 |
| `gemini-3.8-flash-lite-tts` | free | $0.50 (then $1.00) | $6.00 (then $12.00) | GA 2026-09-22 |

Sources: ai.google.dev/gemini-api/docs/pricing, /deprecations, /models and /changelog (read 2026-09-29). Batch is 50% off, but only through `generateContent`, and it's asynchronous (/interactions). My inference is that it doesn't suit an interactive skill.

### Audio
The formula is `usd ≈ cleaned_words ÷ wpm × 60 × 25 × price_out/1e6`, plus input at about 1.5 tokens per word. The 1.5 is inferred from 6.02 chars/word ÷ 4 chars/token (/tokens page), which gives about 2,150 input tokens for 1,400 words including the directive. For the rate, use the measured band (155.4–212.6 wpm), not the 187 in the code comment (Lesson 4).

- **1,400 cleaned words on 2.5 Flash:**

  | Rate | Duration | Audio tokens | Cost |
  |---|---|---|---|
  | 155.4 wpm (slowest) | 540.5 s | 13,514 | $0.1362 |
  | 180.2 wpm (pooled) | 466.1 s | 11,654 | $0.1176 |
  | 212.6 wpm (fastest) | 395.1 s | 9,878 | $0.0999 |

  Input adds $0.0011 in every case. It's $0 on the free tier (arithmetic from the table above).
- **The same post on 3.8 Flash** is $0.0900–$0.1227 through 2026-12-31, then $0.1799–$0.2454. On 3.8 Flash-Lite it's $0.0603–$0.0822 (arithmetic). 3.8's own wpm hasn't been measured, so its range is borrowed from 2.5 (inference).
- **Measured post.** high-success-low-adoption runs 369.8 s, which is 9,245 audio tokens, about $0.094 (HEAD duration; my arithmetic).
- **Longest post.** 732.6 s over 2 chunks, about $0.18. The whole blog is about 10,729 s, about **$2.68** to re-voice (HEAD sum; my arithmetic). The original January estimate was about 4¢ per post (commit 39de29f0).

### Image (current script, 1K, 16:9)
- **Theme call.** About 2,350 input tokens × $2/1M = $0.0047, plus about 200 output × $12/1M = $0.0024, so $0.0071 before thinking.
- **Per attempt.** Generation costs $0.0007 (prompt) plus $0.1344 (image). The text check costs $0.0024 (1,120 image tokens plus about 80 prompt tokens) plus $0.0005. That makes **$0.1380 per attempt**.
- **Totals.** One attempt: **$0.1451**. Three attempts: **$0.4211**.
- **With thinking.** Thinking is unmeasured, so this is an assumption: 2,000 thinking tokens per 3.1 Pro call and 1,000 per image call give $0.2051 for one attempt and $0.5531 for three.
- **What can't be changed.** Thinking can't be turned off on Gemini 3 image models; "This feature is enabled by default and cannot be disabled in the API", and the interim thought images are "not charged" (ai.google.dev/gemini-api/docs/image-generation, read 2026-09-29). 3.1 Pro defaults to "high" and has no "off" level (/thinking). 2K costs the same as 1K (pricing page).

### Per-post total (1,400 cleaned words, paid tier, 2.5 Flash TTS)
- **Minimums** (sums of the above across the 212.6–155.4 wpm band):

  | Case | Total |
  |---|---|
  | 1 image attempt | **$0.25–$0.28** |
  | 3 image attempts | **$0.52–$0.56** |
  | 3 image attempts, illustrative thinking | **$0.65–$0.69** |

- **Hard ceiling: about $4.87.** The scripts set neither `maxOutputTokens` nor a thinking level (generate-blog-image.ts:60-63,92-98,183-209). The output limits come from the model pages, and the arithmetic is mine:
  - The theme call can reach $0.0047 + 65,536 × $12/1M = $0.79.
  - Each attempt can reach $0.51 for the image (32,768 output limit) plus $0.79 for the check, so $1.30, or $3.91 for three.
  - A TTS chunk can reach 8,192 × $0.50/1M + 16,384 × $10/1M = $0.17.
  - The total is $4.87. The image-call ceiling assumes one billed image, with the rest of the output limit spent on text or thinking (inference).

### Cloudinary (Free, $0 within 25 credits/month)
- **Transformations per post.** Two uploads, plus `f_mp3` at 0.1 tx/s × about 466 s = about 47, plus at least 1 image format derivation, plus N responsive variants. That's about 50+N transformations, about 0.05 credits. Overwriting counts again (cloudinary.com/documentation/transformation_counts, read 2026-09-29).
- **Storage.** WAV about 22.4 MB, plus MP3 about 4.5 MB (at the measured 9,694 B/s), plus about 3 MB of images (original plus derived). That's about 30 MB, or about 0.03 credits/month while kept.
- **Bandwidth.** About 220 full listens per bandwidth credit (compare-plans; HEAD sizes; my arithmetic).
- **Paid plan.** Plus is $99/month for 225 credits, about $0.44/credit. No overage price is published (pricing page).

### What `--dry` can know, and what it can't
- **Exact:** cleaned word count, chunk count, prompt text, the number of possible image attempts (1–3), and list prices with an as-of date.
- **Unknown:** thinking tokens and whether retries fire. Report a range (1 vs 3 attempts; 155–213 wpm) in #1 d14's `est_usd_low`/`est_usd_high` shape, not a single number. No run logs `usageMetadata` today, so there's no history to calibrate from (grep for usageMetadata/thoughtsTokenCount).
- **Not researched:** free and Tier 1 RPM/RPD for these models, and non-Google TTS vendors for this issue.

---

## Acceptance criteria, mapped

**1. Input is a Markdown/MDX file or a URL. Output is a hero image, audio (WAV or MP3), and alt text.**
- **Exists:** `.md` input by slug from a fixed directory. Image and WAV generation work, and MP3 comes via Cloudinary `f_mp3` (generate-blog-image.ts:17-31; generate-single-blog-audio.ts:176-231; src/lib/blog.ts:59).
- **Missing:**
  - file-path input;
  - MDX handling, since import/export and JSX lines would be narrated (cleanMarkdownToText:327-337);
  - URL fetch and extraction (plan in decision 15);
  - alt text, since 37 of 39 posts have no `alt:` (`grep -L 'alt:'`; plan in decision 6).
- **Risks:**
  - Regex front-matter parsing breaks on CRLF, on YAML block scalars (`title: >` yields `>`) and on TOML (generate-blog-image.ts:26; generate-single-blog-audio.ts:186).
  - Scraped text without blank lines becomes one chunk over the limit and is truncated at the cap (chunkForTts:298-325; Lesson 25). Converting the extracted HTML to Markdown keeps paragraph breaks (decision 15; inference).
  - Not researched: JS-rendered pages, paywalls and bot blocking.

**2. A brand style file controls the image look and the narration voice.**
- **Exists:** the style is hard-coded in two places, the theme prompt ("1950s propaganda-style poster", :41,52,57) and all 3 templates. The voice `Kore` and `NARRATION_STYLE` ("blog post") are also hard-coded (generate-single-blog-audio.ts:87,240-242).
- **Missing:** the file itself, a loader, and a neutral non-VWC default.
- **Risks:**
  - Three sibling context docs propose three formats (Dependencies table; decision 3).
  - White is handled inconsistently. The image prompts require #ffffff, while the video frame.md and check-copy ban it (image-prompts.ts:14,55; ~/.claude/skills/vwc-faceless-explainer/brand/frame.md:187-188; scripts/check-copy.mjs:36-37). A pack shared by #2 and #3 therefore needs per-medium palettes (inference).
  - "Voice" means both a TTS speaker id and a writing tone across #2, #3, #8 and #9 (issue bodies). #9 d8 leaves the speaker id out of the fixture.

**3. Pluggable storage (Cloudinary, S3-compatible, local). A re-render always replaces the asset; purge or version URLs.**
- **Exists:** Cloudinary only, with `overwrite: true, invalidate: true` on both uploads (generate-blog-image.ts:118-126; generate-single-blog-audio.ts:128-138).
- **Missing:**
  - a storage interface and the local and S3 adapters (plan in decision 9);
  - a credential pre-flight before any paid call, since Cloudinary is checked only at upload, after 3–7 Gemini calls (src/lib/cloudinary.ts:4-9);
  - a portable env contract instead of the `@/lib` alias and `NEXT_PUBLIC_*` names.
- **Risks:**
  - Dynamic-folder accounts produce different public ids (Lesson 21).
  - Invalidate propagation can take minutes (Lesson 5).
  - CloudFront gives 1,000 free invalidation paths a month and then bills per path. AWS recommends versioned file names instead, because invalidation doesn't reach users' local or proxy caches (docs.aws.amazon.com CloudFront Invalidation and PayingForInvalidation, read 2026-09-29).
  - Versioned keys only work if the new URL is written back each render (decision 10).
  - Local and S3 have no MP3 transcoder (decision 11).
  - A WAV over 40 MB may fail Cloudinary's on-the-fly `f_mp3` on Free (Service limits; inference).

**4. Optional front-matter wiring that works for common static-site formats.**
- **Exists:** nothing writes front matter (grep, scripts/*). The VWC convention is `image: {src: "<public id>", alt}`, in block or flow YAML with 2- or 4-space indents. The audio URL comes from the slug (src/data/blogs/*.md; src/lib/blog.ts:55-59).
- **Missing:** all of it.
- **Risks:**
  - gray-matter/js-yaml 3 turns unquoted dates into `Date` objects, and a round-trip rewrites quoting, indentation and flow maps, so edit only the target key (src/data/blogs/two-pointers-…md:3,6,15; introducing-the-new-and-improved-vets-who-code-app.md:6-9).
  - On VWC, front-matter audio is ignored, so wiring audio there needs an app change (src/lib/blog.ts:125-127).
  - The Hugo, Jekyll, Astro, Eleventy, Ghost and WordPress conventions in the research come only from a researcher's own knowledge. **Not researched** against their docs.

**5. `--dry` shows prompts, script and estimated cost without paid calls.**
- **Exists:** the image, audio and media scripts have no dry mode (grep). `generate-blog-graphic --dry` renders locally and skips the upload, which is not a cost mode (:91-98,123-126).
- **Missing:** prompt preview, chunk plan, cost range and price table, plus the `--dry --json` shape from #1 d14. The theme prompt can be built offline, but the image prompts depend on the paid theme JSON, so dry mode can show only the template with placeholders (inference).
- **Risks:** the name collides with the graphic script's `--dry`, and thinking tokens are unpredictable (Cost section).

**6. Port the TTS chunking tests, plus one end-to-end test with model calls mocked.**
- **Exists:** 8 + 12 pure-function tests ready to port (tests table).
- **Missing:** any network mock. The image code can't be tested without restructuring, because of the module-global `ai` and the `@/lib/cloudinary` import (generate-blog-image.ts:5,8,153). SDK 2.24.0's `httpOptions.fetch` gives a clean seam for mocks (Lesson 23).
- **Risks:**
  - The stale `1500+400` assertion (tts-chunking.test.ts:15-21).
  - The `pcmToWav` tests stop describing reality if the port moves to 3.8 TTS, which returns RIFF WAV by default (speech-generation guide).
  - Tests must use temp directories (Lesson 10).

**7. Works on a sample post from an org other than VWC.**
- **Exists:** nothing. Paths, folders, the cloud-name fallback, palette, style and directive are all VWC-specific (generate-blog-image.ts:9,41; image-prompts.ts; src/lib/blog.ts:58; generate-single-blog-audio.ts:176,196-200,240-242).
- **Missing:** a #9 fictional post, or an inline fictional fixture if #9 hasn't landed.
- **Risks:**
  - #9 uses `date`, not `postedAt`, and has no image field (#9 body).
  - A new user's key can't run the image half on the free tier (pricing page).
  - Access to `gemini-2.5-*` may be limited for new projects. The deprecations page says so for 2.5 Pro and 2.5 Flash, and doesn't say whether that covers TTS (deprecations, read 2026-09-29).

**Implementation note: the user supplies their own Gemini key; document the models and per-post cost.** The Cost section covers this. The models to document are `gemini-3.1-pro-preview`, `gemini-3-pro-image`, and the TTS model chosen under decision 4.

**Implementation note: keep long-script chunking.** Keep it, but the reason is output truncation, not input rejection (see the first subsection above). Also resize the chunks (decision 22).

---

## Open decisions for the owner

1. **Correct issue #2's text before building.**
   - *Default:* the owner edits the four statements listed at the top.
   - *Why:* a builder working from the issue will try to port behavior that doesn't exist: the front-matter write, the script writing and the prompt variants.
   - #1 d16 lists three; the fourth is the chunking rationale.
2. **Repo license: decided once, in #1, not here.**
   - *Conflict:* #1 d1 defaults to AGPL-3.0 for code and CC0 for fixtures. #3 d11 defaults to Apache-2.0.
   - *Default for #2:* follow #1 d1 (AGPL-3.0).
   - *Why:* the code #2 ports is AGPL-3.0 in the app today (LICENSE since 47165207, #1437), so porting it unchanged adds no new question for Jerome's own lines. My inference, not legal advice: Apache-2.0 code from HyperFrames (#3) can go into an AGPL-3.0 repo, but the reverse needs relicensing.
   - *Provenance #2 brings to the decision* (git blame by range):
     - Brad Hankee: the image pipeline (237/250), `image-prompts.ts` (69/69), `pcmToWav` (33/34), the TTS fetch (52/63), the upload (25/30), `cleanMarkdownToText` (10/11), and both of his test files (149/149, 154/154).
     - Stephen Clark: 26 lines of the audio script (imports and part of the TTS fetch).
     - Jerome: `normalizeLoudness`, `chunkForTts`, `NARRATION_STYLE`, `tts-chunking.test.ts` (84/84) and the orchestrator (92/92).
   - *License history:* Brad's and Stephen's lines landed while the repo had no LICENSE file and the README said MIT (git show 7b0f4aef:README.md:4-5,129-131; the LICENSE was deleted in a070b3bf, #477). GPL-3.0 followed (b56970fb, #1027, 2026-04-05), then AGPL-3.0 (47165207, #1437, 2026-09-27).
   - *If the owner picks anything but AGPL, or wants certainty:* get a one-line written OK from Brad and Stephen, or rewrite their parts. The RIFF header, the fetch call and the Markdown cleaner are small, and the cleaner needs rewriting for MDX anyway (AC 1).
   - Not researched: whether #1437's relicense had their consent (the same gap as #1 d1).
3. **Brand style file format, shared with #3 and #9.**
   - *Conflict:* #9 d6 uses fixed `##` headings with `role: #hex` lines (`ink`, `canvas`, `accent`, `accent-2`) and no YAML. #3 d1 puts YAML front matter in brand.md. #1 d5 wants brand.md plus a machine-readable brand.json.
   - *Default:* #2 reads #9's heading format directly. One parser splits on `^## ` and reads `key: value` lines.
     - From #9's headings, #2 uses Name and Colors.
     - It adds two optional headings that #9's fixture doesn't need. `## Image style` holds one paragraph, or `### <variant>` subsections that successive attempts cycle through (the VWC shape, image-prompts.ts:10-68). `## Narration` holds provider-keyed lines such as `gemini: Kore`, plus `model:` and `style:`, so #3's `kokoro:`/`heygen:` lines fit alongside them (#3 d5).
     - Missing headings fall back to neutral defaults, so #9's fixture runs unchanged.
     - Hex goes into the prompt together with "do not render any hex codes as visible text" (the PR #959 review's fix), so #9's hex-only colors need no names.
     - No VWC pack is committed. The epic says "No VWC branding, keys or hosting baked in" (issue #1). The owner keeps VWC's pack locally and checks parity with today's prompts once, by hand.
   - *Why:* #9's newcomer is writing this format now, and it will be the only non-VWC brand file that exists when #2 is tested (#9 AC). It's one file, one parser and human-editable. If the owner picks #3's YAML or #1's brand.json instead, only the loader changes, since gray-matter already parses YAML front matter.
   - Needs one owner call before #2 merges (#3 d2).
4. **TTS model default.**
   - *Default:* the model id is a config value, and the shipped default isn't picked until the smoke test in build step 3 passes. #1 d9 says the same, and #6 d10 inherits #2's choice. Prefer `gemini-3.8-flash-tts` with Kore if the test passes. Otherwise use `gemini-2.5-flash-preview-tts`, which is known to work.
   - *Code handles both:* read `inlineData.mimeType`, strip a RIFF header before concatenating, send the style as `parts[].speechMetadata.style` on 3.8, and keep the text prefix on 2.5.
   - *Confirmed so far, without a live call:*
     - The v1beta REST discovery doc (revision 20260928) defines `Part.speechMetadata {speaker, style}`.
     - It defines `VoiceConfig.voice` ("Speaker name for prebuilt voices (for example, `Orus` or `Kore`)") next to `prebuiltVoiceConfig.voiceName`.
     - It defines `GenerationConfig.responseFormat.audio.mimeType` with `AUDIO_WAV`, `AUDIO_L16`, `AUDIO_MP3` and `AUDIO_OGG_OPUS`.
     - SDK 2.24.0 exposes `SpeechMetadata` and `VoiceConfig.voice` (changelog 2.24.0) and serializes `speechMetadata` into a `…/gemini-3.8-flash-tts:generateContent` body (offline probe).
     - The speech guide lists Kore among the 30 prebuilt voices for 3.8 and says 3.8 "treats the `text` field strictly as a verbatim transcript".
   - *Not confirmed:*
     - Every 3.8 example in the speech guide uses the Interactions endpoint, not `generateContent`, and its format table lists only WAV, L16, mu-law and A-law.
     - So it's unconfirmed that the server accepts these fields on `generateContent`, that Kore works there, that the style isn't spoken, and that MP3 is honored (ai.google.dev/gemini-api/docs/speech-generation, read 2026-09-29).
   - *Why prefer 3.8:* 2.5 is Legacy and missing from the guide's supported-models table, and 3.8 costs $9 vs $10 per 1M output tokens through 2026-12-31 (pricing page).
   - *Risks:*
     - From 2027-01-01, 3.8 costs $18, more than 2.5's $10, so revisit the default then. 3.8 Flash-Lite is $6, then $12.
     - If `generateContent` rejects the 3.8 fields, the fallback is the Interactions endpoint with `store: false`. It stores by default, for 55 days on paid and 1 day on free (ai.google.dev/gemini-api/docs/interactions).
     - `<tag>` markup would be stripped by `cleanMarkdownToText`'s `/<[^>]+>/g` (generate-single-blog-audio.ts:334).
5. **Narration script.**
   - *Default:* v1 narrates the cleaned body, or a user-supplied `--script <path>`. No LLM rewriting in v1.
   - *Why:* VWC has never generated a script, and a rewrite step is a new paid stage that can add facts, which #5 and #6 forbid (issue bodies).
6. **Where alt text comes from, and its limit.**
   - *Default:* extend the existing vision text-check call to return `{hasText, detectedText, altText}`, with `altText` at 120 characters or fewer, matching #8 d12.
   - *Prompt rules:*
     - describe what is literally in the rendered image;
     - no "image of" or "picture of";
     - no brand name, claims or numbers;
     - no trailing period.
   - *Enforced in code:* an alt over 120 characters, or an empty one, sets `needsReview` and is never silently truncated. An existing hand-written `image.alt` is kept unless `--force` is passed.
   - *Why:* no extra call, and it describes the image that was actually rendered, where `fullThemeDescription` describes what was intended.
     - W3C WAI says alt text "should be the most concise description possible of the image's purpose" and that there's usually "no need to include words like 'image', 'icon', or 'picture'" (w3.org/WAI/tutorials/images/tips, read 2026-09-29).
     - The two existing VWC hero alts are 75 and 47 characters, with no trailing period (high-success-low-adoption.md:8; two-pointers-…md:6).
     - 120 also fits the unverified LinkedIn limits #8 worries about (#8 d12).
7. **Text-gate result.**
   - *Default:* treat a vision parse failure as `needsReview`, not as clean. After the last attempt, keep the image, mark it `status: "warn", needsReview: true` in a JSON manifest, and exit with a code distinct from failure.
   - *Why:* #8 needs a signal a machine can read, and exit 0 currently hides text-bearing images (generate-blog-image.ts:214-219,239-246).
8. **`--dry` versus `--no-upload`.**
   - *Default:* `--dry` means no model calls and no uploads; it shows prompts, the chunk plan and a cost range. `--no-upload` means generate into a local folder and skip storage.
   - *Why:* the graphic script's `--dry` already means render-without-upload (generate-blog-graphic.ts:91-98), and #8's review step needs the second mode.
9. **Storage adapters and cache-busting** (aligned with #1 d7).
   - **Local (default):** content-hashed file names in #1 d12's output folder.
   - **Cloudinary:**
     - keep `overwrite` + `invalidate`;
     - set `public_id` explicitly with its folder prefix;
     - return the adapter's `public_id`, `version` and `secure_url` (the versioned URL);
     - when the WAV is over 40 MB, request `f_mp3` as an eager transform with `eager_async: true` at upload (Cloudinary troubleshooting doc; application to audio is my inference).
   - **S3-compatible:**
     - sign one PUT with `aws4fetch`;
     - version the key by content hash (`<prefix>/<slug>/<sha12>.<ext>`);
     - set `Content-Type` and `Cache-Control: public, max-age=31536000, immutable`;
     - build the public URL from a configured base URL;
     - no purge.
   - *Why:*
     - Local needs no account, and hashed names can't go stale. Explicit ids avoid the dynamic-folder difference (Lesson 21).
     - AWS recommends "file versioning" over invalidation because versioning is cheaper and a viewer's cached old copy otherwise survives until it expires (docs.aws.amazon.com CloudFront Invalidation page).
     - `aws4fetch` has zero dependencies and Cloudflare documents it for R2. Use `@aws-sdk/client-s3` only if a provider needs multipart uploads or credential chains (npm registry; developers.cloudflare.com/r2/examples/aws/aws4fetch).
     - `immutable` and the key layout are my suggestions.
     - Old versions accumulate, and cleanup is out of scope for v1 (inference).
10. **Front-matter wiring.**
    - *Default:* always print a snippet. `--write` does a surgical insert or replace of the configured keys, and only in YAML `---` front matter.
      - The VWC preset writes `image.src` (the bare public id) and `image.alt`, and no audio key.
      - For local and S3, write the new versioned URL on every render.
      - TOML, JSON, Astro, Ghost and WordPress stay print-only in v1, as does URL input, which has no file to write.
    - *Why:* this is the largest piece of new work, round-tripping YAML corrupts formatting, and VWC ignores front-matter audio (src/lib/blog.ts:125-127).
11. **MP3 outside Cloudinary.**
    - *Default:* WAV for local and S3. MP3 only when `--mp3` is passed and `ffmpeg` is on PATH. It's invoked as an external program and never bundled or vendored, and `ffmpeg-static` is not added.
    - The smoke test (step 3) also tries the API's own `AUDIO_MP3`. Even if that works, multi-chunk posts must be concatenated and normalized as PCM, so a local encoder is still needed for them (inference).
    - *Licensing:* FFmpeg is LGPL-2.1-or-later by default and GPL when built with `--enable-gpl`, and its distribution checklist applies to whoever ships binaries (ffmpeg.org/legal.html). `ffmpeg-static` is GPL-3.0-or-later, and the lamejs encoders are LGPL-3.0 (npm). Documenting ffmpeg as a prerequisite the user installs ships no binary (inference, not legal advice).
    - *Why:* the AC allows "WAV or MP3", this keeps copyleft binaries out of a repo whose license is still open (decision 2), and #3's HyperFrames renders already need ffmpeg (#1 d13).
12. **Image size.**
    - *Default:* keep 1K (1376×768) and make it configurable.
    - *Why:* it covers the 770 px column at about 1.8× and a 1200×630 OG crop. 2K costs the same at Google, but its bigger originals weigh more against Cloudinary Free's 10 MB limit (pricing page; compare-plans; the size risk is my inference).
13. **Cost bounds and structured output.**
    - *Default:*
      - set `maxOutputTokens` on every call, and `thinkingConfig.thinkingLevel: "LOW"` on the 3.1 Pro calls (the REST enum is MINIMAL/LOW/MEDIUM/HIGH; discovery doc);
      - move the theme call to `responseMimeType: "application/json"` plus `responseJsonSchema`, and drop `keyMessage`;
      - pass `httpOptions.retryOptions: { attempts: 2 }` explicitly;
      - emit `--dry --json` in #1 d14's shape and stop above `--max-usd`.
    - *Why these fields:*
      - The REST discovery doc marks `responseSchema` "Deprecated. Use `response_format` instead".
      - SDK 2.24.0's `GenerateContentConfig` has no `responseFormat` field yet but does have `responseJsonSchema` (genai.d.ts:6098-6250 @2.24.0).
      - 2.24.0 retries only when `retryOptions` is set (Lesson 23).
    - *Why at all:* the per-post ceiling drops from about $4.87 to a bound #8 can enforce, the fence-stripping parse path goes away, and the schema doubles as the test contract.
    - This changes behavior relative to VWC, so it needs your OK.
14. **Are inline graphics (`generate-blog-graphic`) in scope?**
    - *Default:* no. They belong to #3 and #8.
    - *Why:* they aren't in #2's AC, they bring in Playwright, and the artboards reference licensed fonts (src/data/blog-graphics/_brand.css:3-22).
15. **URL input.**
    - *Default:* build it after file input.
      - Fetch with Node's global `fetch`.
      - Extract with `@mozilla/readability` over `jsdom`, passing the page URL to `JSDOM` so relative links resolve.
      - Convert `article.content` to Markdown with `turndown`, so paragraph breaks reach `chunkForTts`.
      - Take the title from `article.title`, the description from `article.excerpt`, and the date from `article.publishedTime`.
      - Gate on `isProbablyReaderable` plus a minimum word count, and fail with "save the post as a file and pass the path" rather than narrating a nav bar.
      - Tests inject `fetch` and use a saved fictional HTML fixture.
    - *Why:* Readability's README documents exactly this Readability + JSDOM pattern and lists `title`, `content`, `textContent`, `excerpt` and `publishedTime` among the `parse()` fields (github.com/mozilla/readability README, read 2026-09-29).
      - `textContent` would drop paragraph structure and produce one oversize chunk (inference; Lesson 25).
      - The README "strongly" recommends DOMPurify when you *use the output* as HTML. #2 never renders it, so no sanitizer is needed (inference).
      - All three packages are permissive (Apache-2.0, MIT, MIT) and fit any repo license (inference).
      - jsdom 30 needs Node ≥22.22.2, which decision 16 already sets.
    - Not researched: whether Readability works over `linkedom`, and extraction quality on JS-rendered, paywalled or bot-blocking sites. The gate is the mitigation.
16. **Runtime, language, packaging and frontmatter.**
    - *Default:* TypeScript + Vitest, which ports the existing tests directly, with Node ≥22. Package as `skills/blog-media/` in the plugin (#1 d2).
    - SKILL.md uses only the six spec keys, `name`, `description`, `license`, `compatibility`, `metadata` and `allowed-tools` (#1 d3). No `disable-model-invocation` and no `user-invocable`.
    - Paid-call safety lives in the CLI instead: every paid run first prints the `--dry` estimate and stops above `--max-usd` (decision 13). SKILL.md tells Claude to show the estimate and wait for a yes.
    - *Why* (code.claude.com/docs/en/skills, read 2026-09-29):
      - claude.ai uploads and the Skills API fail with a hard "Unexpected key(s) in SKILL.md frontmatter" error on any other key.
      - `disable-model-invocation: true` would break #8. It stops Claude from loading the skill, "also prevents the skill from being preloaded into subagents", and if Claude tries anyway, Claude Code "blocks the call and instructs it not to reproduce the deploy steps another way".
      - A user who wants the skill manual-only in their own Claude Code can set it to `"user-invocable-only"` in `skillOverrides` without editing the file.
17. **CI without keys.**
    - *Default:* CI runs only mocked tests, with `contents: read` and no secrets. Live smoke runs are manual.
    - *Why:* the repo will be public and receive fork PRs. The VWC workflow is a template (.github/workflows/vitest.yml).
18. **Repo bootstrap.**
    - *Default:* the owner pushes one initial commit straight to `main` with LICENSE (decision 2), a README stub, a `.gitignore` covering render output, `.nvmrc` 22, commitlint + husky, and CI (#1 d15). After that, everything goes through branches.
    - *Why:* no branch exists yet, so no PR can land, not even #9's (gh api).
19. **Env names.**
    - *Default:* `GEMINI_API_KEY` only, plus `CLOUDINARY_URL` for Cloudinary. For S3: `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION` (default `auto`), `S3_PUBLIC_BASE_URL`, `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. The S3 names are my suggestion.
    - *Why:*
      - The SDK reads `CLOUDINARY_URL` natively (config.js:105-110).
      - `NEXT_PUBLIC_*` is wrong for server scripts (PR #959 review).
      - `GOOGLE_PRIVATE_KEY` isn't a Gemini key (Env section).
      - R2 aliases an empty region and `us-east-1` to `auto` (R2 S3 API page).
20. **VWC-side follow-ups (outside #2's scope).**
    - *Default:* file these after #2 ships, and don't block on them:
      - remove or rewire the legacy audio scripts and `generate:blog-audio`;
      - fix AGENTS.md:46-47;
      - fix the OG image metadata;
      - delete the dead `getBlogHeaderUrl`;
      - add the missing hero alts;
      - add the cap check or a smaller chunk to VWC's own script (Lessons 25–26).
    - *Why:* each of these trips anyone who uses VWC as the reference implementation.
21. **Free-tier data-use notice.**
    - *Default:* before the first model call of any non-`--dry` run, print one notice unless config sets `gemini.tier: paid`. The notice quotes the terms: on an unbilled project Google uses submitted content "to provide, improve, and develop Google products and services", "human reviewers may read" it, and "Do not submit sensitive, confidential, or personal information to the Unpaid Services" (ai.google.dev/gemini-api/terms, updated 2026-04-28).
    - Warn, don't block: blog posts are headed for publication. #6 adds a confirmation for private donor notes (#6 d9, #1 d20) and reuses the same helper.
    - *Why:* the tier can't be read from the key or the response (`serviceTier` is standard/flex/priority; discovery doc). The image half needs a billed project (pricing page), so in practice the notice matters for audio-only runs (inference).
22. **Chunk budget and truncation guard.**
    - *Default:* `WORDS_PER_CHUNK = 1500`, plus three checks on each chunk:
      - (a) a `finishReason` other than `STOP` fails the chunk;
      - (b) `usageMetadata.candidatesTokenCount ≥ 16,384`, or a duration of 655 s or more, counts as truncated at the cap;
      - (c) an implied rate above 240 wpm counts as an early stop.
    - Each failure retries once, then marks the chunk `needsReview`.
    - *Why:*
      - 1,500 words holds down to 137 wpm, where 1,700 has no headroom at the measured 155.4 (Lesson 25; arithmetic).
      - Check (b) catches the system-requirements case that no wpm band can (Lesson 26).
      - The good outputs read at 155–213 wpm and the early stops at 270–453, so 240 sits in the gap. It's calibrated on 2.5 only, so re-measure on 3.8 in step 3 (inference).
    - *Cost:* posts of 1,500–1,700 words gain one seam. No current VWC post falls in that range (my measurement).

---

## Suggested build plan

Step 0 needs the owner, and step 3 needs your approval for a live call. Everything else happens in hashflag-skills on a branch off `main`.

0. **Bootstrap and license** (decisions 2 and 18; #1 d1, d15).
   *Verify:* `gh api repos/Vets-Who-Code/hashflag-skills/commits` returns at least one commit, and `gh repo view --json licenseInfo` isn't null.
1. **Correct issue #2's text** (decision 1).
   *Verify:* `gh issue view 2` no longer says "writes `audio:`", "writes a narration script", "writes image-prompt variants" or "TTS rejects long inputs".
2. **Scaffold `skills/blog-media/`** with package.json (`engines.node >=22`), tsconfig, Vitest config, `.nvmrc`, and a SKILL.md stub using only spec keys (decision 16).
   *Verify:* `npx vitest run` and `npx tsc --noEmit` exit 0, and a test asserts that the SKILL.md frontmatter keys are a subset of the six spec keys.
3. **TTS smoke test (manual; live; needs your approval).** Use about 100 words of fictional text and a fresh non-VWC key (#1 d9). Costs: $0 on the free tier, or about $0.03 for four calls on a billed key (833 audio tokens × $9/1M per call; arithmetic). Call `…/gemini-3.8-flash-tts:generateContent` four ways:
   - `prebuiltVoiceConfig.voiceName: "Kore"`;
   - `voiceConfig.voice: "Kore"`;
   - with `parts[].speechMetadata.style`;
   - with `responseFormat.audio.mimeType: "AUDIO_MP3"`.

   Then run the same text once on 2.5.
   *Verify:* a saved JSON log records, for each call, the HTTP status, `inlineData.mimeType`, whether the bytes start with `RIFF`, `finishReason`, `candidatesTokenCount`, duration and wpm. Listening confirms that the style text isn't spoken. The owner then fixes decision 4's default, and decision 11's MP3 note if needed.
4. **Port the pure audio helpers and their 20 tests.** Set `WORDS_PER_CHUNK` per decision 22 and import it in place of the stale bound. Add a test in which one paragraph over the budget is split at a sentence boundary.
   *Verify:* the 20 ported tests pass. The oversize test fails against the ported code before the fix and passes after it.
5. **File input loader.** Take a file path and parse it with gray-matter (CRLF, TOML `+++`). Strip MDX import/export and JSX, and extract the title, description and body. All fixtures go in temp dirs.
   *Verify:* tests pass for a block-scalar title, a CRLF file, a TOML file, an MDX file, and a fictional post with `date` in place of `postedAt`.
6. **Brand loader** (decision 3).
   *Verify:*
   - #9's `brand.md` parses, or an inline copy of its heading format if #9 hasn't landed.
   - Missing `## Image style` or `## Narration` headings yield neutral defaults.
   - A repo-wide test greps committed files for VWC's hex values, "Vets Who Code" and "1950s" and finds none.
7. **Model layer with an injected client** (`httpOptions.fetch` for the SDK, an injected `fetch` for REST).
   - Theme call with `responseJsonSchema`.
   - Image: take the last non-thought `inlineData` part and keep its `mimeType`.
   - Vision check returns `altText` (120 characters or fewer; decision 6).
   - TTS: detect RIFF, read `finishReason`/`usageMetadata`, and apply decision 22's guard.
   - Set `retryOptions` and `maxOutputTokens`.

   *Verify:* mocked tests cover:
   - RIFF-headed and raw PCM responses, which both end with one header;
   - three text-positive images (→ `needsReview`);
   - a 130-character alt (→ `needsReview`, text unchanged);
   - a chunk at 16,384 tokens (→ retried, then flagged);
   - a chunk implying 300 wpm (→ retried, then flagged);
   - a vision parse failure (→ `needsReview`).
8. **Free-tier notice** (decision 21).
   *Verify:* tests show the notice prints once, before the first model call, when `tier` is unset. It never prints with `tier: paid` or under `--dry`.
9. **Storage interface and adapters** (decision 9): local first, then Cloudinary, then S3 via `aws4fetch`. Pre-flight credentials before any model call.
   *Verify:* mocked tests show that:
   - Cloudinary gets `overwrite`, `invalidate` and an explicit `public_id`, and the returned `secure_url` is used;
   - a 41 MB WAV requests eager `f_mp3` with `eager_async`;
   - the S3 PUT carries a SigV4 `Authorization`, `Content-Type` and `Cache-Control`;
   - two renders of different bytes yield two different URLs;
   - missing storage credentials cause zero Gemini calls.
10. **`--dry --json` with a versioned price table** (as of 2026-09-29, with source URLs; #1 d14 shape).
    *Verify:* the test asserts zero fetch/SDK calls. For a 1,400-word fixture, the audio range is $0.0999–$0.1362 on 2.5 Flash (212.6–155.4 wpm), or $0.0900–$0.1227 on 3.8 Flash through 2026.
11. **Front-matter output** (decision 10). Use fictional fixtures that reproduce VWC's three shapes: block `image:` with a 2-space indent, a 4-space indent, and a flow map.
    *Verify:* `--write` changes only the target lines (diff test), an existing `alt` survives without `--force`, and without `--write` the file is byte-identical.
12. **CLI and JSON manifest.** Per output, `image` and `audio` record `status`, `path`, `url`, `alt`, `needsReview`, `seconds`, `words` and `estCostUsd`. Steps throw, and only the CLI sets the exit code.
    *Verify:* a test in which audio fails still writes the image and the manifest and exits non-zero. The end-to-end mocked test (AC 6) runs the whole CLI.
13. **URL input** (decision 15).
    *Verify:* a saved fictional HTML fixture produces the same body text as its Markdown twin, within a whitespace-normalized diff. A nav-only page fails the readerable gate with the "save as a file" message. CI makes zero network calls (injected `fetch`).
14. **Optional MP3** (decision 11).
    *Verify:* with `ffmpeg` absent, `--mp3` exits with an install hint before any model call. With it present, the output starts with an MP3 frame or ID3 header, and its duration matches the WAV within 0.2 s (tolerance is my inference).
15. **Live smoke run (manual, paid, needs your approval).** One VWC post and one fictional-org post, each rendered twice.
    *Verify:* audio falls within the 155–213 wpm band, alt text is 120 characters or fewer, and after the second render the CDN `content-length`/`etag` changes within minutes, or the URL itself changes for local and S3 (curl -I).
16. **README and SKILL.md.** Cover the models, env vars, cost table, the free-tier notice, ffmpeg's license note, a before-and-after example (#1 AC), and the known failure modes (Lessons 1–5, 12–14, 25–26).
    *Verify:* every model id in the code appears in the README (grep), and `claude plugin validate` passes if the plugin packaging is chosen.

---

## Sources

**vets-who-code-app files (at b7c19088 unless noted):**
- Scripts: scripts/generate-blog-image.ts; scripts/image-prompts.ts; scripts/generate-single-blog-audio.ts; scripts/generate-blog-media.ts; scripts/generate-blog-graphic.ts; scripts/generate-blog-audio-overviews.ts; scripts/upload-blog-audio.js; scripts/upload-audio-to-cloudinary.ts; scripts/lib/cloudinary.ts.
- Tests: __tests__/scripts/tts-chunking.test.ts; __tests__/scripts/generate-single-blog-audio.test.ts; __tests__/scripts/generate-blog-image.test.ts; __tests__/scripts/generate-blog-media.test.ts; __tests__/scripts/generate-blog-graphic.test.ts.
- Site code: src/lib/blog.ts; src/lib/util.ts; src/lib/cloudinary.ts; src/lib/cloudinary-helpers.ts; src/lib/api-helpers/classify-contact.ts; src/containers/blog-details/index.tsx; src/pages/blogs/[slug].tsx; src/components/seo/page-seo.tsx.
- Content: src/data/blogs/*.md (all 39, for word counts), in particular high-success-low-adoption.md, labor-day-sprint-10-days-to-proof-of-work.md, two-pointers-a-practical-technique-for-code-challenges.md, introducing-the-new-and-improved-vets-who-code-app.md and ai-as-infrastructure-audio-pipeline.md; src/data/blog-audio/labor-day-sprint-10-days-to-proof-of-work.md; src/data/blog-graphics/_brand.css.
- Config and docs: package.json (and origin/master:package.json, origin/master:package-lock.json); .env.example; .nvmrc; .vercelignore; .gitignore; biome.json; tsconfig.json; next.config.js; README.md (and 7b0f4aef:README.md); AGENTS.md; LICENSE (and b56970fb:LICENSE); commitlint.config.js; .github/workflows/vitest.yml.
- Dependencies: node_modules/@google/genai/dist/genai.d.ts @1.40.0; node_modules/cloudinary/lib/config.js.

**@google/genai 2.24.0 (npm pack and a scratch install, 2026-09-29):** package.json; dist/genai.d.ts (ImageConfig, Part, SpeechConfig, SpeechMetadata, VoiceConfig, GenerateContentConfig, GenerationConfig, ResponseFormat, AudioResponseFormat, ThinkingConfig, HttpOptions, HttpRetryOptions); dist/node/index.cjs:13460,13837-13878. Also offline probes with a fake `fetch`, and a tsc run of the unmodified scripts against 1.40.0 and 2.24.0.

**Local skills and notes:** ~/.claude/skills/media-use/audio/scripts/audio.mjs; ~/.claude/skills/media-use/audio/scripts/lib/tts.mjs; ~/.claude/skills/pr-to-video/scripts/project-dir.mjs; ~/.claude/skills/hashflag-pr-prep/SKILL.md; ~/.claude/skills/vwc-faceless-explainer/brand/frame.md; ~/.claude/skills/vwc-faceless-explainer/scripts/check-copy.mjs; ~/.claude/CLAUDE.md.

**Sibling context docs (docs/context/, 2026-09-29):** hashflag-skills #1 [issue-1.md](issue-1.md) (d1, d2, d3, d5, d7, d9, d12, d13, d14, d15, d16, d20), #3 [issue-3.md](issue-3.md) (d1, d2, d5, d11), #6 [issue-6.md](issue-6.md) (d9, d10), #8 [issue-8.md](issue-8.md) (d12), #9 [issue-9.md](issue-9.md) (d6, d8).

**Commits (vets-who-code-app):** 39de29f0 (#858); d6bd0f55; a070b3bf (#477); b56970fb (#1027); b0bdc8a0 (#939); 4a78b2e0 (#941); 4243651d (#948); 9abfecfd (#954); 7b0f4aef (#959); caef1b5e (#974); c290a2fc (#1007); 1fa1bfa7 (#1266, squashing 8443c807, daf251d1, 1f77237b, d97b2ce8, d7157a61, 5bd9d552, 68b7d2eb and 66ca0790); 48d1ad46 (#1352); 62c92a01 (#1436); 47165207 (#1437); 5b798e4c (#1460); badc2951 (origin/master).

**PRs (vets-who-code-app):** #477, #858, #948, #959 (including Copilot review comments), #974, #1007, #1027, #1266, #1267, #1352, #1436, #1437, #1449, #1460.

**Issues:** Vets-Who-Code/hashflag-skills #1, #2, #3, #4, #5, #6, #7, #8 and #9; Vets-Who-Code/vets-who-code-app #946.

**Upstream:** github.com/heygen-com/hyperframes skills/media-use/audio/references/tts.md and skills/faceless-explainer/scripts/audio.mjs (main, read 2026-09-29), and its commit 01601d1105 (#4377). github.com/googleapis/js-genai CHANGELOG.md (read via gh api, 2026-09-29). github.com/mozilla/readability README.md (read 2026-09-29).

**npm registry metadata (npm view, 2026-09-29):** @mozilla/readability, jsdom, linkedom, turndown, dompurify, @aws-sdk/client-s3, aws4fetch, gray-matter, ffmpeg-static (and its README), @ffmpeg-installer/ffmpeg, lamejs, @breezystack/lamejs.

**URLs (read 2026-09-29):**
- Gemini docs:
  - https://ai.google.dev/gemini-api/docs/pricing
  - https://ai.google.dev/gemini-api/docs/models
  - https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-preview-tts
  - https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash-tts
  - https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image
  - https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview
  - https://ai.google.dev/gemini-api/docs/deprecations
  - https://ai.google.dev/gemini-api/docs/changelog
  - https://ai.google.dev/gemini-api/docs/speech-generation
  - https://ai.google.dev/gemini-api/docs/image-generation
  - https://ai.google.dev/gemini-api/docs/rate-limits
  - https://ai.google.dev/gemini-api/docs/tokens
  - https://ai.google.dev/gemini-api/docs/thinking
  - https://ai.google.dev/gemini-api/docs/interactions
  - https://ai.google.dev/gemini-api/terms
  - https://ai.google.dev/api/generate-content (truncated when fetched; the discovery doc was used instead)
- Gemini REST discovery doc: https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta (revision 20260928)
- Other Google: https://cloud.google.com/text-to-speech/pricing
- Cloudinary:
  - https://cloudinary.com/documentation/image_upload_api_reference_upload
  - https://cloudinary.com/documentation/invalidate_cached_media_assets_on_the_cdn
  - https://cloudinary.com/documentation/transformation_counts
  - https://cloudinary.com/documentation/ts_troubleshooting_video_transformation_errors
  - https://cloudinary.com/pricing
  - https://cloudinary.com/pricing/compare-plans
- AWS CloudFront:
  - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html
  - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PayingForInvalidation.html
- Cloudflare R2:
  - https://developers.cloudflare.com/r2/api/s3/api/
  - https://developers.cloudflare.com/r2/buckets/public-buckets/
  - https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/
  - https://developers.cloudflare.com/r2/examples/aws/aws4fetch/
- FFmpeg: https://ffmpeg.org/legal.html
- W3C WAI: https://www.w3.org/WAI/tutorials/images/tips/
- Claude Code docs:
  - https://code.claude.com/docs/en/skills
  - https://code.claude.com/docs/en/sub-agents
- Measurements: https://res.cloudinary.com/vetswhocode/ (HEAD/GET of blog-images/* and all 39 blog-audio/*.wav)
