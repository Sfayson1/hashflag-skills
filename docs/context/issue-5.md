# #5 [Skill]: Impact story video, audio and social images for nonprofits: context

Path shorthand used below:
- `APP/` = the vets-who-code-app repository (`vets-who-code-app`). It was read at `b7c19088`, which is 20 commits behind `origin/master`. On master the blog-media scripts are unchanged; the one difference is that app#1460 bumps `@google/genai` to 2.24.0 (git diff --stat HEAD origin/master).
- `SK/` = `~/.claude/skills`.
- `HS#n` = an issue in Vets-Who-Code/hashflag-skills. `app#n` = an issue or PR in Vets-Who-Code/vets-who-code-app.

What the issue asks for, verbatim (gh issue view 5 -R Vets-Who-Code/hashflag-skills):
- Turn "an impact report, annual summary or grant narrative into a short video, an audio version, and social images for donors and funders."
- It "builds on the blog-media skill (audio and images) and the brand-pack explainer (video)."
- The rule comes from VWC's site, "where outcome stats drifted across pages without a source."

The issue has 0 comments, the `enhancement` label, and no assignee (gh issue view 5).

## What exists today

HS#5 has no code of its own. The hashflag-skills repo is private, has no commits, no license and no default branch (`gh api repos/Vets-Who-Code/hashflag-skills`: isEmpty, defaultBranchRef ""). Everything below is prior art that lives somewhere else.

**Video (the base HS#3 will generalize)**
- `SK/faceless-explainer/`: the upstream HyperFrames pipeline that turns text into an explainer (Apache-2.0, HeyGen Inc.).
  - Steps: 0 setup, 1 brief, 2 frame.md, 3 storyboard and script, 3.1 audio, 4 visual design, 5 per-frame sub-agent build and assemble, 6 transitions/lint/check/snapshot/render (SK/faceless-explainer/SKILL.md).
  - Its scripts are `build-frame`, `audio`, `captions`, `transitions` and `assemble-index` (SKILL.md:214).
  - Its narration guidance is "1-2 sentences per spoken frame; usually 6-20 words" (SK/faceless-explainer/references/story-design.md:195).
- `SK/vwc-faceless-explainer/`: VWC's local wrapper.
  - It is not under git (`git rev-parse` fails there).
  - Its description already lists "impact pieces" as a use (SKILL.md:3).
  - It overrides Steps 1, 2, 3 and 6.
  - It ships `brand/frame.md` (439 lines), `brand/caption-skin.html`, `brand/fonts/` (contains licensed Gilroy and GothamPro) and `scripts/check-copy.mjs` (201 lines) (ls/wc of the skill folder, checked during research, 2026-09-29).
  - It documents a music-only path: deleting `SCRIPT.md` is not enough, because three caches hold the old narration. You must also remove `audio_meta.json`, `audio_engine_meta.json`, `caption_groups.json`, `compositions/captions.html` and `assets/voice`, and then check that `voices` is 0 (SKILL.md:199-218). "A silent cut is a rebuild, not a toggle" (SKILL.md:220-229).
- `SK/vwc-faceless-explainer/SKILL.md:136-148`: a 7-frame story shape.
  - Frame 4 is "**Stat grid** — navy, sourced numbers only".
  - The end card is "the literal CTA word … **Mandatory.**"
  - In the one real run, the Pull quote frame was dropped because the source had no alum quote (videos/labor-day-sprint-proof-of-work/BRIEF.md). That is a precedent for dropping a frame rather than inventing its content.
- `SK/motion-graphics/categories/stat/module.md:5-21`: a seek-safe count-up for a single stat. It takes `{value, prefix, suffix, label, ring}`, runs a proxy tween of about 1.2–1.6 s, then holds.
- `SK/hyperframes-creative/frame-presets/*/FRAME.md`: every preset has a "Numerals & Claims (hard rule)" section. For example, blue-professional/FRAME.md:286-300 says: "Never invent figures … Render slots as `— figure —`, `{metric}` … until the script supplies them" and "Fabrication — every numeral traces to the script, else placeholder."
- `SK/hyperframes-creative/references/story-spine.md:43`: "the product's own numbers over invented ones", and each frame's key visual should be "traceable to a specific line of the source."
- Narration pace guidance:
  - "TTS runs at **~2.2 words/second**". The estimate rule is `duration ≈ ceil(word_count / 2.2)`, and the whole-film sweet spot is "~30–90 s (≤ ~155 words)" (SK/pr-to-video/references/story-design.md:175,182,184).
  - "**2.5 words per second** is natural speaking pace", with a worked example of "~140 words for 62 seconds — that's 2.3 words/sec" (SK/hyperframes-creative/references/narration.md:7,92).

**Number-integrity prior art (the origin of this issue's rule)**
- `APP/src/data/outcomes.ts:19-122` is the single source for public stats.
  - `OutcomeStat` holds `value`, `display`, `label`, `qualifier`, plus optional `source`, `asOf`, `windowMonths`, `denominator` and `derivation`, with the comment "Unset rather than guessed".
  - `placementMethodology()` returns `null` until the window and the denominator are both set (:111-114).
  - `formatAsOf` splits the ISO string by hand to avoid a UTC month rollback (:118-122).
  - It was created in app#1418 (merge 24a9ae4b).
- `APP/__tests__/data/outcomes.test.ts:47-152` has two parts.
  - Pin tests force prose copies to carry the module's `display` string.
  - A stray-claim scanner uses number regexes plus a 40-character keyword window (for example `\b\d{2,3}%` near `placement|success rate`, and `\$\d+…M` near `alumni|earning`), with an allowlist for 2030 targets. app#1418 admits the 40-character window is a heuristic.
- `SK/vwc-faceless-explainer/scripts/check-copy.mjs` is the copy gate.
  - `numerals()` (:91-115) lists figures (digits, `%`, `$`, years, and spelled-out `WORD_NUM`), but only from 4-space spoken lines, `- voiceover|vo|narration|voice_over:` lines and quoted strings.
  - `--numerals` runs only over `.md` targets (:183-192).
  - It exports `RULES`, `scan` and `numerals`, and has `--self-check`.
  - It has no dependencies and is Node ESM.
- `APP/src/data/accelerator.ts:78-94`: PROOF tiles `{stat,label,gloss}`, a sourced-stat card shape that fits social cards.

**Audio (the base HS#2 will package)**
- `APP/scripts/generate-single-blog-audio.ts` exports:
  - `pcmToWav` (6-39)
  - `NARRATION_STYLE` (240-242)
  - `normalizeLoudness` (247-296)
  - `chunkForTts` (298-325; `WORDS_PER_CHUNK = 1700` at :303)
  - `cleanMarkdownToText` (327-337)
  - It also contains the raw-fetch TTS call (59-121) and the awaited upload with `invalidate` (123-152).
- `APP/src/data/blog-audio/labor-day-sprint-10-days-to-proof-of-work.md` is the only spoken-script example. Acronyms are dotted and numbers are spelled out ("twenty-eight percent" where the post has 28%) (post lines 31, 67).
- HyperFrames video narration is already on disk per line.
  - The shared engine writes one file per SCRIPT line to `assets/voice/<id>.wav`, where `<id>` is the zero-padded frame number (SK/media-use/audio/scripts/audio.mjs:148; SK/faceless-explainer/scripts/audio.mjs:94-99).
  - HeyGen and ElevenLabs output is transcoded to 44.1 kHz mono (SK/media-use/audio/scripts/lib/tts.mjs:212-224).
  - These files are the raw material for an "audio version" export (see decision 1).

**Social images**
- `APP/scripts/generate-blog-graphic.ts` renders HTML artboards to PNG.
  - The `.artboard` size is set in CSS (`width: 1400px` at APP/src/data/blog-graphics/_brand.css:51-52; the prompt restates 1400x760 at generate-blog-graphic.ts:63). Playwright chromium screenshots the element at `deviceScaleFactor: 2` (:109, loop :100-121).
  - `--dry` renders locally with no upload (:77, 123-126).
  - `--draft <name> "<brief>"` asks `gemini-3.1-pro-preview` for the HTML (:48-49) and refuses to overwrite an existing file (:32-73).
  - Uploads go to folder `blog-graphics` (:14).
  - The prompt hard-codes "Vets Who Code blog graphic" (:50) and "GothamPro/Gilroy" (:65).
- `APP/src/data/blog-graphics/_brand.css` (84 lines): brand tokens as CSS custom properties for artboards (app#1266). Its `@font-face` rules load the licensed Gilroy and GothamPro files from `public/fonts/` by relative path (:3-20), so it cannot be ported as-is.
- `APP/src/pages/api/og.tsx`: a deterministic 1200x630 branded text card built with next/og (:14 edge runtime, :202-203 size, :39 fonts fetched over HTTP).
- `APP/scripts/generate-blog-image.ts` generates a text-free hero with `gemini-3-pro-image` at 16:9 (:92-96), with a no-text retry loop (:223-246). It is fail-open (see Lessons).
- No hashflag issue owns a social-card renderer (see Dependencies and decision 3).

**Document input**
- `APP/src/pages/api/jobs/parse-resume.ts:90-102` extracts text from:
  - DOCX with `mammoth` (1.11.0, BSD-2-Clause)
  - PDF with `pdf-parse` v2 (2.4.5, Apache-2.0), via `new PDFParse({ data: new Uint8Array(buffer) }); await parser.getText()`.
  - It caps input at 5 MB decoded (:13) and text at 500 KB (:15).
  - Versions and licenses come from node_modules/*/package.json.
- `SK/product-launch-video/` does URL capture with `hyperframes capture --json`. faceless-explainer explicitly says "Do **not** run `npx hyperframes capture` (there is no URL)" (SK/faceless-explainer/SKILL.md:58).

**Output hygiene**
- `SK/pr-to-video/scripts/project-dir.mjs:8-53` writes the project directory outside the caller's repo (`~/.cache/hyperframes/<workflow>/…`). An env var overrides the location, and path segments are sanitized.

## How it works now

HS#5 has to chain three pipelines that exist today. None of them is wired to the others.

**A. Video: faceless-explainer plus the VWC wrapper.** This is what HS#3 generalizes.
1. Runtime. HyperFrames needs Node ≥22, and the app pins Node 20. The VWC skill puts `~/.nvm/versions/node/v24.14.1/bin` on PATH for HyperFrames commands only (vwc SKILL.md:40-45; APP/.nvmrc).
2. Setup. Run `npx hyperframes init "videos/<project>" --non-interactive --example=blank --skill=faceless-explainer`, then `npx hyperframes auth status`. The status command exits 1 when signed out, which is normal (vwc SKILL.md:38-54; product-launch-video/SKILL.md:38).
3. Step 1 captures nothing. It hand-writes `capture/extracted/visible-text.txt` (the source, verbatim) and `tokens.json` with empty colors and fonts (faceless SKILL.md:51-60).
4. Step 3 writes `STORYBOARD.md` and `SCRIPT.md`. The frontmatter `duration:` comes from the brief's length and is "a rough expectation; assembly reports where the cut lands against it" (faceless SKILL.md:86).
5. Step 3.1 audio (media-use/audio):
   - TTS order is HeyGen Starfish (word timestamps, default voice Marcia `05f19352…`), then ElevenLabs `eleven_multilingual_v2`, then local Kokoro. The faceless default voice on Kokoro is `am_michael` (faceless SKILL.md:102; SK/media-use/audio/references/tts.md:39-81).
   - Each SCRIPT line becomes `assets/voice/<id>.wav`. A line whose TTS fails is "omitted" and recorded only as an anomaly (media-use audio.mjs:148-160).
   - When a provider returns no word timestamps, Whisper small.en supplies them.
   - BGM uses HeyGen retrieve mode only, so there is no music without a HeyGen credential (faceless audio.mjs:164-174).
   - VWC's chosen voice is Orson `00e3d285aba44b27a83c47c02c9c2d9c`. It is recorded in the project's SCRIPT, not in the skill (owner decision; videos/labor-day-sprint-proof-of-work/SCRIPT.md.bak:3).
   - `sync-durations` rule: "real voice duration wins; silent frames keep estimates" (faceless SKILL.md:142-146). So the video's length follows the spoken word count, not the `duration:` field.
6. VWC copy gate, first pass. Before the approval ask, run `node SK/vwc-faceless-explainer/scripts/check-copy.mjs --project . --numerals` (vwc SKILL.md:155-168).
7. Steps 4–5. Sub-agents build the frames in `compositions/frames/*.html`.
   - Captions are karaoke groups of 2–4 words, split on 0.18 s gaps, and placed in the bottom 16.67% band (180 px at 1080). Frame content stays in the top ~83% (faceless scripts/lib/dimensions.mjs:8-45; hyperframes/references/frame-worker-core.md:49).
   - Formats are 1920x1080 (default), 1080x1920 and 1080x1080 (dimensions.mjs).
8. Assemble.
   - Each frame's voice is an `<audio>` on track 10 that starts at that frame's start (faceless assemble-index.mjs:392-406).
   - `assemble-index.mjs` paints `#root` from frame.md's `canvas` role. VWC patches it by hand to `#root { background: #091f40; }` (vwc SKILL.md:266-272).
   - GSAP 3.14.2 loads from jsDelivr (assemble-index.mjs:581).
9. Step 6. Run check-copy again without `--numerals`, then `hyperframes lint`, `check`, snapshots, and a user-gated render (vwc SKILL.md:275-293; faceless SKILL.md:204).
   - The three VWC renders are H.264 1920x1080 at 30 fps with AAC 48 kHz stereo. They run 75.07 s, 73.1 s and 77.5 s, and weigh 9.6, 9.6 and 9.2 MB (ffprobe and stat on APP/videos/labor-day-sprint-proof-of-work/renders/*.mp4).
   - The last VWC cut is music-only. `index.html` (16:58) has 0 voice `<audio>` elements and 1 BGM reference. `audio_meta.json` has `voices: []`. `SCRIPT.md` was renamed `SCRIPT.md.bak` at 16:15, before the 16:59 render (grep, cat and stat in that project). Why is not recorded (inference).
   - The planned narration was 184 spoken words over 0–86 s of `**Time:**` windows, about 2.14 words/s (SCRIPT.md.bak, counted by grep and wc).
   - The project pins `hyperframes@0.8.66` (videos/labor-day-sprint-proof-of-work/package.json). Upstream was at 0.8.91 on 2026-09-29 (`npm view hyperframes`).

**B. Audio: generate-single-blog-audio.ts.** This is what HS#2 packages.
- Input is `src/data/blogs/<slug>.md`, or a hand-written `src/data/blog-audio/<slug>.md` if one exists. `cleanMarkdownToText` strips it, and `chunkForTts` splits it on blank lines only, into chunks of at most 1,700 words (:298-325).
- Each chunk is sent as `POST …/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`, with header `x-goog-api-key`, `responseModalities:["AUDIO"]` and voice `Kore`. Every chunk is prefixed with `NARRATION_STYLE` (:59-93, 219-222, 240-242).
- The PCM chunks are joined with 350 ms silences (:214) and passed through `normalizeLoudness`:
  - TARGET_RMS 0.158 (-16 dBFS), PEAK_CEILING 0.891, SILENCE_RMS 0.00316, gain clamped to 0.25–4x, 100 ms hops, a ~1.5 s smoother, then one global peak scale (:247-296).
  - Output is a single WAV file, 24 kHz mono 16-bit.
- The file streams to Cloudinary with `resource_type: video`, folder `blog-audio`, `overwrite` and `invalidate`. The site derives `…/video/upload/f_mp3/blog-audio/<slug>.wav` from the slug (src/lib/blog.ts:59).
- Key precedence is `GOOGLE_GENERATIVE_AI_API_KEY || GEMINI_API_KEY || GOOGLE_PRIVATE_KEY` (:163-166). Bad input calls `process.exit(1)` (:160-190, :342).
- The model caps a response at 16,384 audio tokens (about 655 s) and returns `finishReason STOP` with no warning (:235-237).
- Measured rates were 170–213 wpm, which is 2.8–3.6 words/s (:299-300). That is faster than the HyperFrames guidance.

**C. Social images, deterministic: generate-blog-graphic.ts**
- `--draft` sends only the brief, `_brand.css` and the first `.html` in the folder to `gemini-3.1-pro-preview`. The post body is not sent. The result is written to `<dir>/<name>.html` (:32-73).
- Playwright renders each `.artboard` after `document.fonts.ready` to `out/<name>.png`. Output is 2800x1520 physical pixels (1400x760 CSS at 2x) (:100-121).
- `--dry` stops before upload. Otherwise the script uploads with `public_id <slug>-<name>`, `overwrite` and `invalidate` (:10-21).

**D. Social images, generative: generate-blog-image.ts**
- `gemini-3.1-pro-preview` produces a 5-key theme JSON (:60-61), which fills one of 3 fixed templates (scripts/image-prompts.ts).
- `gemini-3-pro-image` renders via `generateContent` with `imageConfig.aspectRatio "16:9"` and no `imageSize`, so it defaults to 1K (1376x768) (:92-96; @google/genai 1.40.0 genai.d.ts:5510-5527).
- A vision call to `gemini-3.1-pro-preview` checks the image for text (:178-220). Up to 3 attempts are made (:223-246). The image then goes to Cloudinary with `public_id = slug`, folder `blog-images`.
- The script reads only `GEMINI_API_KEY` (:147-153).

## Lessons already paid for

**Number drift and claims (the reason this issue exists)**
- Before app#1418, outcome numbers were hard-coded on at least nine surfaces and disagreed with each other (app#1205):
  - placement: 97% vs 90% vs "90%+ 90-day"
  - earnings: described as "first-year", "annual" and "to date"
  - troops: 300+ vs "over 500", plus $50M+
  - an unsourced 4.9/5.0 rating, 40%/80% donate tiles, and "<1% acceptance".
  - app#1418 removed the rating box and the donate tiles rather than guess sources for them (app#1418 body).
- Unsourced numbers are "weaker than smaller sourced ones … a 97% with no methodology reads as marketing next to a competitor's audited 72%" (app#1329, OPEN).
- The bracketed values in the placement methodology sentence "must not be guessed". The sentence is still blocked on the owner (app#1332, OPEN; outcomes.ts has no windowMonths or denominator).
- VWC's only citation for 97%, $20M+ and 300+ is the string "Internal cohort data · Reported by Diginomica", asOf `2025-12-18` (outcomes.ts:44-45). In a VWC dogfood run, all three have a named source but incomplete methodology (inference).
- Unsourced claims still on VWC's site, useful as real negative test cases:
  - the `$72K–$85K` salary target (faq.json:222; llms-full.txt:35)
  - the employer list (faq.json:222)
  - the `$50/$100/$500/$1000` impact tiers (src/components/forms/donate-form.tsx:122-151).
- The mechanical scanner is a heuristic. Its 40-character keyword window misses reworded claims (app#1418 Follow-ups).
- Count-up tiles once shipped a literal `0` in the SSR HTML (app#1330). In video, a count-up must be timeline-driven and seek-safe, so that snapshots and the final frame show the exact source value (motion-graphics stat module.md:5-21; applying this to video is inference).
- Posts contain hypothetical example numbers that must never be lifted as facts, such as `$40M`, `98%` and `22%` in example resume lines (src/data/blogs/labor-day-sprint-10-days-to-proof-of-work.md:31,67,74).
- Wording drifts between a post and its own graphic: "a fraction of a percent" in the text vs "under 1%" in the alt text (src/data/blogs/high-success-low-adoption.md:79,81).
- Graphics have shipped wrong copy: a footer read "Sept 7" where the post said Sept 8, and a heading was drawn twice (commit 1fa1bfa7 message).
- "X years" copy goes stale. "Ten years. One way of doing this." sits against a 2014 founding (src/data/homepages/index.json:105). Any tenure figure needs a source and an as-of date.

**Copy gate gaps (check-copy.mjs, probed 2026-09-29)**
- The prohibition cue `/\b(never|not|avoid|instead of|rather than|no longer)\b[^.;|]*/i` exempts the rest of its sentence, so "Do not wait — sign up today." passes (check-copy.mjs:50).
- The "curly quote" class on :106 is plain ASCII 0x22 (checked with `od`), so on-screen strings in curly quotes are never listed.
- `--numerals` scans only `.md` (:185).
  - In the real run, "2027 Cohort" in compositions/frames/08-end-card.html:80 was never listed.
  - Design prose leaked into the list: STORYBOARD.md:152 gave "1920, 6, 700".
- The spoken-line test is exactly 4 spaces (`/^ {4}\S/`). `audio.mjs parseScript` also accepts tabs and 5 or more spaces, so tab-indented narration escapes the list.
- Some copy-law items have no rule: "pipeline", "hand-holding", "learners", "users". Also missed: 8-digit hex and `background: white`.
- Soft-CTA gaps:
  - The `support us` regex misses "Support Our Mission". On the donate page that phrase is also split across JSX, as `Support Our <span…>Mission</span>` (APP/src/containers/donate-form/layout-01/index.tsx:30), which a line-based regex can never catch.
  - 35 of the 39 blog posts close with the same donate paragraph. It contains both "make a significant impact" and "support our mission", next to a literal `[Donate](…)` link.
  - In all 35 posts, the paragraph sits within the last 5 lines. 31 posts end with it followed by `---`, 3 end on the paragraph itself, and 1 has a YouTube iframe after it (grep -rli, tail -5 and tail -1 over src/data/blogs, 2026-09-29).
  - So soft phrasing and a literal CTA coexist in one sentence, and a gate has to judge each phrase on its own, not the paragraph (inference).
- Quotes: testimonials use banned words in the speaker's own voice ("frontend developer", "signed up"; homepages/index.json:149,160). Rewriting a quote falsifies it, so the gate needs to flag quotes, not rewrite them (inference).

**Images**
- The generative gate fails open. A JSON parse failure counts as `hasText:false` (generate-blog-image.ts:214-219). After 3 text-positive attempts, the last image ships anyway with "manual review recommended" (:239-246).
- Image models "garble labels" (commit 1fa1bfa7). Google markets `gemini-3-pro-image` for "Advanced text rendering", so it tends to draw text (ai.google.dev/gemini-api/docs/image-generation, read 2026-09-29).
- Any card that carries a number must be rendered from HTML, never generated by an image model (inference from the above).
- The script takes the first `inlineData` part and ignores `thought`. The model makes up to 2 interim images, so the script may be uploading a draft. Unverified (generate-blog-image.ts:87-108; image-generation docs).
- The vision check sends `mimeType: "image/png"` while the bytes are JPEG (:178-220).
- Model IDs churn.
  - `gemini-3-pro-preview` and `imagen-4.0-generate-001` both retired within six months, which forced app#1266.
  - Imagen 4 shut down on 2026-08-17, and `gemini-2.5-flash-image` shuts down on 2026-10-02 (app#1266 body; ai.google.dev/gemini-api/docs/deprecations, read 2026-09-29).
- Platform image specs churn too. Instagram's live help page now allows up to 3:4 (1080x1440), while the search-engine snippet of the same page still reads 4:5 (1080x1350) (facebook.com/help/instagram/1631821640426723 fetched 2026-09-29, vs the WebSearch extract the same day). Pin a read date on any size rule (inference).

**Audio**
- TTS truncation is silent. 8 of 38 posts were broken, some stopping well below the cap. The audit method is to compare duration against word count at about 187 wpm (app#1266). A 60–90 s narration is far under the cap, but a full-report read is not.
- An un-awaited upload came in with 7b0f4aef and was fixed in app#1266. Versionless URLs served stale CDN copies until `invalidate: true` was added (app#1266).
- Without a fixed directive, chunks sounded like different readers. The fix was `NARRATION_STYLE` (commit d97b2ce8), and normalization also cut the level spread from 6.8 dB to 3.2 dB.
- The replacement model `gemini-3.8-flash-tts` reads its input as a verbatim transcript, so the directive may be spoken aloud. It also returns WAV with a RIFF header, so `pcmToWav` would add a second header (ai.google.dev/gemini-api/docs/speech-generation, read 2026-09-29).
- `chunkForTts` never splits a paragraph. Text scraped from a URL with no blank lines becomes one oversized chunk, which is silently truncated (generate-single-blog-audio.ts:298-325).
- Narration spells numbers out ("twenty-eight percent"), so a claims check has to normalize words to numbers before matching (blog-audio script example; check-copy.mjs WORD_NUM).
- The TTS directive says "blog post" (:240-242), which is wrong for impact reports.
- Pace differs by engine.
  - HyperFrames guidance is 2.2–2.5 words/s (pr-to-video story-design.md:175; narration.md:7). VWC's own plan was about 2.14 (SCRIPT.md.bak).
  - Gemini Kore measured 2.8–3.6 words/s (generate-single-blog-audio.ts:299-300).
  - The same text runs noticeably shorter through the #2 path than through the video (inference).

**Video pipeline**
- `audio.mjs` can report `✓ audio generate: 5 voice` and exit 0 "with **three lines silently missing**". Always check the voice count against the script's line count (vwc SKILL.md:236-241). The cause is that a failed line is "omitted" into `anomalies`, not raised (media-use audio.mjs:159-160).
- Switching to music-only takes clearing three caches. A silent cut is a rebuild whose frames run longer, not a toggle (vwc SKILL.md:199-229). The only real VWC run ended music-only (see How it works A.9). A music-only cut has no narration track to export.
- The `#root` ground comes from frame.md's `canvas` role, and the hand fix is lost on any rebuild (vwc SKILL.md:266-272).
- `npx hyperframes init` refreshes the global skills from GitHub and ignores `--skip-skills`. The only opt-out is `HYPERFRAMES_SKIP_SKILLS=1` (SK/hyperframes/references/skill-lifecycle.md:5-33). Upstream shipped 25 CLI releases in 6 days (`npm view hyperframes time`).
- `npx hyperframes doctor --json` always exits 0, so gate on `.ok` (SK/hyperframes-cli/references/doctor-browser.md:5-57).
- Chrome can die at startup inside macOS agent sandboxes. The documented fallbacks are `--docker`, cloud render, or rendering outside the sandbox (doctor-browser.md:34-45).
- The credential loader walks up to 5 parent directories looking for a `.env`. Running inside an org's app repo could bill that repo's key (SK/media-use/audio/scripts/lib/heygen.mjs:20-47; applying it to this layout is inference).
- Telemetry is on by default; `HYPERFRAMES_NO_TELEMETRY=1` or `DO_NOT_TRACK=1` turns it off. The CLI skill tells agents to post `npx hyperframes feedback` to a public channel after every render (SK/hyperframes-cli/SKILL.md:116-126; SK/media-use/references/meta.md:36-46). That is unacceptable for donor or beneficiary content (inference).

**Licensing and hygiene**
- The VWC skill's Gilroy and GothamPro woff2 files are byte-identical to files tracked in the public AGPL app repo's `public/fonts/`, with no license file. HS#3 forbids committing them (sha1 comparison, checked during research, 2026-09-29; gh issue view 3).
- Third-party media licenses:
  - MusicGen weights are CC-BY-NC 4.0 (huggingface.co/facebook/musicgen-small).
  - Pixabay SFX cannot be redistributed standalone (pixabay.com/service/license-summary).
  - GSAP uses the GSAP Standard License, which is not OSI-approved (heygen-com/hyperframes CREDITS.md; gsap.com/standard-license).
- URL capture downloads the target site's web fonts; a VWC capture pulled Gilroy (videos/vets-who-code-reel/capture/extracted/asset-descriptions.md). A real nonprofit's fonts are almost certainly licensed (inference).
- Render output has been committed, or nearly: `brag-output*/` went into .gitignore in app#1390, while `videos/` is excluded only by the local `.git/info/exclude:19-21` (APP/.gitignore:105-106; `git check-ignore -v videos/` → `.git/info/exclude:21`).
- Free-tier Gemini is unsafe for beneficiary data:
  - The pricing page marks free-tier traffic "Used to improve our products: Yes" (ai.google.dev/gemini-api/docs/pricing, read 2026-09-29).
  - The terms say, for Unpaid Services: "human reviewers may read, annotate, and process your API input and output" and "Do not submit sensitive, confidential, or personal information to the Unpaid Services."
  - Paid Services: "Google doesn't use your prompts … or responses to improve our products."
  - Users in the EEA, Switzerland and the UK get the paid-service data terms on unpaid quota too (ai.google.dev/gemini-api/terms, last updated 2026-04-28, read 2026-09-29).
  - Impact reports can name beneficiaries.

## Dependencies

**Issues**
- HS#2 (blog media), for the audio path, image path, pluggable storage and `--dry` cost estimate. HS#5's body states this dependency.
  - HS#2's acceptance criteria cover a hero image, an audio overview and image alt text only. `generate-blog-graphic.ts` appears in its "What exists today" list but in no criterion (gh issue view 2).
- HS#3 (brand pack and explainer), for the video, the brand-pack schema and a copy gate driven by each pack's own rules. Also stated in HS#5's body. Its criteria cover no image cards (gh issue view 3).
- HS#8 lists no image cards either. Its kit is a hero image, audio, video, a LinkedIn post, a newsletter blurb and alt text (gh issue view 8).
- HS#6 needs "an image per story" and takes photos as input (gh issue view 6), so the card renderer and the consent handling are shared concerns with #6 (inference).
- **No issue owns the social-card renderer.** The HS#2 dossier ([issue-2.md](issue-2.md)) defers the port to #3 and #8, but neither issue's criteria include it. See decision 3.
- HS#9 (fixtures), which must provide:
  - `fixtures/nonprofit/impact-report.md`: a one-year report with at least 6 numbers, each naming an in-org source ("from our intake log"). Exactly one has **no** source, and "#5 must flag it and must not repeat it as fact".
  - `fixtures/nonprofit/brand.md`: 3–5 hex colors, open-licensed fonts, and 3–5 copy rules such as literal CTAs.
  - A CC0 license for the folder.
  - HS#9 has no named-beneficiary or consent trap (gh issue view 9).
- HS#1 epic principles: "Bring your own brand and keys", "No licensed assets in the repo", "nothing committed here may depend on private services", and "Skills never invent numbers or claims, and they flag stats that have no source". Each skill also needs CI tests or evals, and a README with a before-and-after example (gh issue view 1).
- HS#8 does not depend on HS#5. HS#5 and HS#8 would share the claims gate (inference).

**Repo prerequisites (not yet done)**
- An initial commit on `main`, a LICENSE, commitlint and husky, CI, and an ignore rule for render output. No PR can land until `main` exists (checked during research, 2026-09-29).
- The license choice matters. Ported check-copy code is the owner's own, but the app's blog-media code was co-written by Brad Hankee and Stephen Clark under a README that said MIT (git blame; app#1437).

**Consent and data handling (the org's responsibility, not code)**
- Bond (UK NGO network), "Putting the people in the pictures first", 2024 update:
  - Informed consent covers "How and where it will be communicated (through what channels/mediums and to whom)".
  - "an expiry on consent must be provided … in perpetuity consent is not supported by GDPR", and contributors have "a right to withdraw consent for further use, at any time" (p. 21).
  - For children: never more than one of "recognisable face, real full name, or exact location" in a story (pp. 16-17). "retire images of children or renew the informed consent … after three years … or when they turn 18" (p. 22).
  - "AI imagery is also not a way of solving problems of representation (or to avoid consent issues)". If it is used, "include, 'this image is AI-generated' within the caption" (pp. 37-38).
  - (bond.org.uk/wp-content/uploads/2024/11/Digital_Ethical-Guidelines_FINAL.pdf, text extracted with pdftotext, 2026-09-29.)
- What this means for #5 (inference from Bond p. 21): consent a beneficiary gave for a printed or PDF report may not cover a new video or social cards. The skill cannot check consent. It can only list every named person, and make the user confirm before a name goes into an output.
- Third parties see the source text: Gemini (terms above), HeyGen and ElevenLabs if used for TTS, and the Claude session itself. Kokoro is the only fully local TTS path (tts.md).
- Not researched: US law on beneficiary names and photos (Bond's guidance is GDPR-based), HeyGen and ElevenLabs data-use terms, and Anthropic's data terms for the session.

**System**
- Node ≥22, FFmpeg/FFprobe (local ffmpeg 9.0.2 has `concat`, `apad` and `loudnorm` per `ffmpeg -filters`), and chrome-headless-shell (~193 MB in `~/.cache/hyperframes/chrome`) (hyperframes package.json engines; doctor-browser.md).
- Playwright chromium for the artboards. The app declares `@playwright/test ^1.49.0`, but not `playwright` itself (APP/package.json:110).
- Optional: Python 3.8+ with `kokoro-onnx soundfile` (~311 MB model plus ~27 MB voices), and whisper.cpp (SK/media-use/audio/references/requirements.md:9-28).

**Keys and accounts (all bring-your-own)**
- `GEMINI_API_KEY`. `gemini-3-pro-image` and `gemini-3.1-pro-preview` have no free tier; the TTS models do (pricing page). See the free-tier data terms above.
- HeyGen, optional: `HEYGEN_API_KEY`, `HYPERFRAMES_API_KEY`, or `~/.heygen/credentials` (tts.md).
- ElevenLabs, optional.
- A storage backend, optional. Cloudinary Free is 25 credits a month (cloudinary.com/pricing).

**Network at render time**: GSAP from jsDelivr, and any fonts that aren't bundled (assemble-index.mjs:581; SK/hyperframes-creative/references/typography.md:3).

## Cost

Prices were read from the official pages on 2026-09-29. Thinking tokens are unpredictable, so every total is a range.

| Component | Choice | Math | Per run |
|---|---|---|---|
| Narration, 60–90 s | Kokoro (local) | none | $0 |
| | HeyGen Starfish, Enterprise rate | 0.000333 credits/s × $0.50/credit = $0.0001665/s → 60 s $0.0100, 90 s $0.0150 (developers.heygen.com/docs/enterprise-pricing.md) | $0.010–0.015 |
| | HeyGen self-serve | the USD rate is behind a login-gated dashboard | **unknown** |
| | Gemini 2.5 Flash TTS, paid | 25 audio tok/s → 1,500–2,250 tok × $10/1M (pricing page) | $0.015–0.023 |
| | Gemini 3.8 Flash TTS, intro price to 2026-12-31 | 2,250 × $9/1M; doubles to $18/1M on 2027-01-01 | $0.020 (then $0.041) |
| Audio version | Concatenate the approved `assets/voice/*.wav` with local ffmpeg | none | $0 |
| | Separate full-report read (the #2 path), 1,500-word example | 1,500 ÷ 187 wpm = 8.02 min = 481 s × 25 = 12,032 tok × $10/1M; text-in ≈ $0.001 (assumes ~1.3 tok/word) | ≈ $0.12 |
| Social cards, 3–5, HTML | Hand-written or edited artboards | Playwright, local | $0 |
| | `--draft` via gemini-3.1-pro-preview | $2/1M in, $12/1M out. Tokens **not measured**; an illustrative 10K in + 5K out (incl. thinking) = $0.08/card | ≈ $0.24–0.40 (assumption) |
| Social images, generative (not recommended for cards with numbers) | gemini-3-pro-image, 1K/2K | $0.134 × 3–5 = $0.40–0.67; worst case 3 attempts each = $1.21–2.01, plus vision checks (560 input tok/image ≈ $0.0011 each) | $0.40–2.01 |
| | gemini-3.1-flash-image, 1K | $0.067 × 3–5 | $0.20–0.34 |
| Render | Local | none | $0 |
| | HeyGen cloud render | credits; 4k billed 1.5x | **unknown** |
| Storage | Cloudinary, if used | Uploads 1 tx each (1 video + 1 audio + 5 images = 7 tx), `f_mp3` 0.1 tx/s × 90 s = 9 tx, an HD video transform 4 tx/s × 90 s = 360 tx (only if requested) → 0.016–0.376 credits of 25/month. Storage about 0.02 GB/month (inference from 9.6 MB per 75 s render and a 48,000 B/s WAV) (cloudinary.com/documentation/transformation_counts) | $0 on Free |

Totals:
- Floor (Kokoro, hand-edited cards, local render and storage): **$0 API spend**.
- Likely default (HeyGen narration at the Enterprise rate, narration concatenated as the audio version, 5 drafted cards): **about $0.25–0.42**.
- A full-report Gemini read adds about $0.12.
- Generative art on 5 cards adds up to $2.01.

**Not researched:**
- The Claude session's own tokens for the script, storyboard and per-frame sub-agents. This is probably the largest cost (inference).
- ElevenLabs pricing.
- HeyGen self-serve and cloud-render USD rates.

## Acceptance criteria, mapped

**AC1: "The input is a document or URL. The outputs are a 60 to 90 second explainer video, an audio version, and 3 to 5 social images with captions."**
- Already covers it:
  - Text-in video comes from faceless-explainer and the VWC wrapper (above).
  - The app extracts PDF and DOCX text (parse-resume.ts:90-102).
  - URL capture exists only in product-launch-video (`hyperframes capture`).
  - Per-line narration WAVs already land in `assets/voice/<id>.wav` (media-use audio.mjs:148). The blog-audio script is an alternative audio path.
  - Card rendering exists in generate-blog-graphic.ts (Playwright loop :100-121) and og.tsx.
- Missing:
  - An ingest step that freezes the source (a URL, PDF or Markdown) into one line-numbered text file that everything else cites.
  - An impact story shape. The VWC 7-frame shape is VWC's page rhythm (vwc SKILL.md:136-148).
  - Enforcing the 60–90 s window through a word budget. Upstream treats duration as "a rough expectation", and real voice duration wins (faceless SKILL.md:86,146).
  - An audio-version export step and a transcript file (decision 1).
  - An owner for the card renderer (decision 3), a card size (decision 4), and a definition of "captions".
  - A non-VWC artboard prompt and CSS. Today they hard-code VWC, GothamPro and Gilroy (generate-blog-graphic.ts:50,65; _brand.css:3-20).
- Risk:
  - PDF impact reports often put numbers inside chart images, which `getText()` cannot see (inference).
  - URL text without blank lines breaks `chunkForTts` if the #2 path is used for a long read.
  - The mandatory end card eats into a 60 s budget. VWC's end-card line had a 75–86 s window (SCRIPT.md.bak).
  - Word budget:
    - At 2.2–2.5 words/s (pr-to-video story-design.md:175; narration.md:7), 60–90 s holds 132–225 spoken words.
    - Only 150–198 words lands inside 60–90 s at any rate in that range: at least 150 so that 2.5 words/s still reaches 60 s, and at most 198 so that 2.2 words/s stays under 90 s.
    - Silent frames and holds add time, so aim for 150–180 (inference). VWC's plan was 184 words for 86 s (SCRIPT.md.bak).
    - A 280-word script would run about 112–127 s.
  - A music-only cut (the VWC precedent) leaves no narration to export as audio.

**AC2: "Every number and claim in the output traces to the source document. Unsourced stats are flagged for the user, never invented or rounded up."**
- Already covers it:
  - The `outcomes.ts` ledger shape and its "unset rather than guessed" `null` pattern (outcomes.ts:19-40,111-114).
  - The stray-claim scanner and pin tests (outcomes.test.ts:47-152).
  - `check-copy.mjs numerals()` for listing figures.
  - The preset "Numerals & Claims (hard rule)" placeholders (FRAME.md:286-300).
  - Source-traceable visuals (story-spine.md:43).
- Missing:
  - A claims ledger of every figure in the source, each with its line and its in-document attribution, or `null`.
  - A gate that checks every output surface against the ledger: SCRIPT spoken lines, STORYBOARD voiceover, frame HTML, captions.html, card HTML, caption text, alt text and transcript.
  - Normalizing spelled-out narration numbers.
  - Detecting rounding and hedge words ("nearly", "over", "~", "+").
  - A two-level rule: (a) every output figure must appear in the source; (b) a source figure without an in-document source is flagged and kept out of the outputs. Rule (b) is the HS#9 trap.
  - A `REVIEW.md` flag report for the human.
- Risk:
  - check-copy's known false negatives (frame HTML, curly quotes, tab-indented lines).
  - The LLM paraphrasing numbers in the narration.
  - Image models drawing digits.
  - Derived figures, such as a percentage computed from two sourced counts, would pass a naive "numbers appear in source" check that only looks at components (inference).

**AC3: "Calls to action use literal action words (Donate, Volunteer, Apply) and are configurable."**
- Already covers it:
  - The copy law "CTAs like Apply and Donate are literal action words. Do not soften them" (APP/AGENTS.md:262-268).
  - check-copy's soft-CTA RULES: `get started`, `support us`, `(learn|find out) more`, `(sign up|join now|enroll)`, `register (now|today|here)` (check-copy.mjs:20-38).
  - The mandatory end card (vwc SKILL.md:146).
  - The HS#9 brand.md copy rules, for example "calls to action are one literal verb".
- Missing:
  - A brand-pack CTA field (verb plus URL), and an allowlist check on the end card, captions and social copy.
  - A rule for "Support Our Mission", "make a significant impact" and similar phrases.
- Risk:
  - "configurable" conflicts with "literal" if free text is allowed (checked during research, 2026-09-29).
  - VWC's donate page, and the closing paragraph of 35 of its 39 posts, already put soft phrases next to a literal Donate link (see Lessons).

**AC4: "It works on an impact report from a nonprofit other than VWC."**
- Already covers it: nothing. The HS#9 fixture and the HS#3 brand pack are both unbuilt.
- Missing:
  - The fixture impact report and a fictional brand pack.
  - Removing VWC-isms: the `NARRATION_STYLE` "blog post" wording, the artboard prompt and `_brand.css`, check-copy's VWC RULES and ALLOW, the `#root` hex, and the 7-frame shape named after navy and cream registers (checked during research, 2026-09-29).
- Risk:
  - A fictional fixture may not count as "a nonprofit other than VWC" to a reviewer.
  - A real org's report raises rights, impersonation and consent questions:
    - HS#9 bans real org names in fixtures (HS#9 hard rules).
    - Beneficiary names in a real report would be carried into a new channel (Bond p. 21).
    - With a free-tier Gemini key, they would be sent to a service whose terms say not to submit personal information (ai.google.dev/gemini-api/terms).

**Epic HS#1 criteria that also bind #5**
- CI tests or evals. CI has no keys, so only deterministic gates and mocked calls can run (inference).
- A README with a before-and-after example.
- No licensed fonts or assets committed.

## Open decisions for the owner

1. **What is the "audio version"?**
   - Default: the narration-only track. Concatenate the approved `assets/voice/<id>.wav` files in SCRIPT line order with ffmpeg (resample every line to 44.1 kHz mono), normalize once, and ship it with a **required** `transcript.txt`. The transcript holds the SCRIPT spoken lines verbatim, plus the on-screen text of any silent frame.
   - Why the concatenation:
     - One script means one claims ledger and one gate, with no extra TTS cost.
     - Leaving out BGM and SFX avoids the question of reusing third-party music or Pixabay SFX as standalone audio (Pixabay license summary; HeyGen BGM terms not researched).
     - Voices sit at frame starts (assemble-index.mjs:392-406), and synced frames equal their voice lengths (faceless SKILL.md:146). The concatenation is therefore the video's narration minus the silent frames (inference).
   - Why the transcript is required, not optional:
     - WCAG 2.2 exempts audio from 1.2.1 only when it is "a media alternative for text and is clearly labeled as such", meaning "media that presents no more information than is already presented in text".
     - This script is a rewrite, with a hook and a CTA line and URL that the report doesn't have, so the exemption can't be relied on (inference).
     - The audio then needs a text alternative, and the Understanding page's examples are verbatim transcripts (w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded; w3.org/TR/WCAG22 definition).
   - Alternatives:
     - `ffmpeg -i renders/video.mp4 -vn -c:a copy audio.m4a`. This keeps the video's exact timing and its AAC 48 kHz stereo mix, including BGM, SFX and silent-frame gaps.
     - Or, if "builds on #2" is read literally, run #2's TTS on the same approved spoken text, never on the raw report. It will run shorter: about 42–64 s for 150–180 words at 2.8–3.6 words/s (inference).
   - Precondition: the cut must be narrated. If the owner allows music-only cuts (the VWC precedent), only the #2 path yields audio.
2. **Social-card renderer technique.**
   - Default: HTML artboards rendered with Playwright (the generate-blog-graphic pattern) for every card. Generative art is off.
   - Why: the no-text gate fails open, and models garble labels (generate-blog-image.ts:214-246; 1fa1bfa7). Bond also says to label any AI image "this image is AI-generated" and not to use AI imagery to avoid consent (Bond pp. 37-38).
3. **Who owns the social-card renderer?** No issue owns it today (gh issue view 2, 3, 8).
   - Default: #5 owns it. Build it inside the #5 skill folder from three pieces: the Playwright loop from generate-blog-graphic.ts:100-121, a `.artboard` rule sized to decision 4, and the brand pack's color and font tokens. Move it into a shared module only when #6 ("an image per story") or #8 actually calls it.
   - Why: #5 has the only acceptance criterion that requires social images, and one caller doesn't earn a shared abstraction (owner rule).
   - Sequencing: it depends on #3's brand-pack schema for tokens, so build it after #3 freezes that schema.
   - Owner action: record the ownership on #5 (or amend #2's criteria) so that #6 doesn't rebuild it.
4. **Card size and what "captions" means.**
   - Default: one size, 1080x1080 PNG (1:1). Render 1080 CSS px at `deviceScaleFactor: 1`, and keep each file ≤5 MB.
     - On-card text: one sourced figure, a label, and a source line.
     - `caption.txt`: the post text.
     - `alt.txt`: the card text verbatim, per the W3C rule for images of text (w3.org/WAI/tutorials/images/decision-tree).
   - Why 1:1 at 1080, per the platform specs read 2026-09-29:
     - LinkedIn, organic posts: at least 552x276, "we recommend 1080 (w) pixels", aspect ratio "3:1 to 4:5", 5 MB, with an ALT button (linkedin.com/help/linkedin/answer/a527229). The 1200x1200 1:1 figure used earlier comes from LinkedIn's **Sponsored Content ad** spec (1:1 1200x1200, 1.91:1 1200x628, 4:5 720x900, 5 MB, JPG/PNG/GIF), not organic guidance (linkedin.com/help/lms/answer/a426534).
     - Instagram feed: widths of 320–1080 are kept, wider images are downsized to 1080, the ratio range is "1.91:1 and 3:4" (1080x566–1440), and other ratios are cropped (facebook.com/help/instagram/1631821640426723).
     - Facebook: no first-party organic photo-post spec was found. The link-share `og:image` spec is at least 1200x630, "as close to 1.91:1", ≤8 MB (developers.facebook.com/documentation/sharing/webmasters/images). The Feed image-ad spec is 1440x1800, 4:5, JPG or PNG, 30 MB (facebook.com/business/ads-guide/update/image/facebook-feed).
     - X: the API accepts images up to 5 MB as JPG, PNG, GIF or WEBP (docs.x.com/x-api/media/introduction). According to the help page, single photos "between 2:1 and 3:4" display in full; that comes from a search-result extract of help.x.com/en/using-x/posting-gifs-and-pictures, because a direct fetch returned 403.
     - 1:1 falls inside every organic range listed. 1080 px is Instagram's largest kept width and LinkedIn's recommendation, and 5 MB is the tightest file limit (LinkedIn, X). 4:5 (1080x1350) would also fit every range; a second size is flexibility nobody asked for.
   - Not researched: alt-text support and limits on Instagram, Facebook and X; a first-party Facebook organic spec.
5. **How strict is "traces"?**
   - Default: an output figure must equal a ledger entry's display string after normalization. No derived numbers, and no rounding in either direction. Hedge words are flagged unless the source uses them.
   - Why: the issue says "never invented or rounded up". This mirrors the `display` field in outcomes.ts.
6. **What happens to unsourced source numbers?**
   - Default: keep them out of every output and list them in `REVIEW.md`. Do not offer a "the report states…" hedge.
   - Why: the HS#9 trap says "must not repeat it as fact".
7. **Who decides what counts as an in-document source?**
   - Default: the model proposes an attribution span for each figure, and the human confirms it at the existing Step 3 approval gate, before any paid TTS or render.
   - Why: attribution is a judgment call, and the pipeline already has a human gate there (vwc SKILL.md:155-168).
8. **CTA configuration.**
   - Default: a brand-pack field `cta: {verb, url}`. The verb comes from `[Donate, Volunteer, Apply]`, and only the pack's copy rules can extend that list. Any other CTA on the end card or in a caption fails the gate.
   - Why: "configurable" means which verb and which link, not free text.
9. **Input formats for v1.**
   - Default: `.md`/`.txt`, PDF (pdf-parse v2) and URL (fetch, convert to text, freeze to a file). DOCX is deferred.
   - Why: the AC says "document or URL", and prior art for extraction exists (parse-resume.ts:90-102).
   - Not researched: an HTML-to-text library for URL input, and how well pdf-parse handles tables.
10. **Story shape and length.**
    - Default: #5 owns a short impact shape: hook, need, what we did (sourced stats only), one story, CTA end card. The brand pack supplies colors and type. A frame whose content the source lacks is dropped. The spoken total is 150–180 words (AC1 math).
    - Why: the 7-frame shape is VWC's page rhythm, and the real run dropped the Pull quote for lack of a source (vwc SKILL.md:136-148; BRIEF.md). The word count is what sets the length, since real voice duration wins (faceless SKILL.md:146).
11. **Narration TTS default.**
    - Default: keep the upstream preflight choice, and document Kokoro (local, $0, no data leaves the machine) as the no-key path.
    - Why: bring-your-own keys, plus beneficiary privacy.
    - Upstream has since added Gemini TTS (heygen-com/hyperframes commit 01601d1105), which could match #2's Kore voice. It is not in the local install.
12. **Privacy and licensing defaults.**
    - Default: set `HYPERFRAMES_NO_TELEMETRY=1` and `DO_NOT_TRACK=1`, and never call `hyperframes feedback`.
    - Print the Gemini unpaid-service data warning before any Gemini call that carries source text (how to detect a free-tier key: not researched).
    - Never enable MusicGen, and ship no music offline.
    - Why: the telemetry and public-feedback defaults, the free-tier terms, and the CC-BY-NC weights (see Lessons).
13. **People named or pictured in the source.**
    - Default:
      - v1 takes no photos of people and generates no images of people.
      - The model lists every person named in the source, and `REVIEW.md` shows them under "People named", each with a box labelled "consent covers video and social". The human ticks the boxes at the Step 3 gate.
      - Unticked names are removed from the script, cards, captions and transcript. The claims gate fails if one appears.
      - For children, allow at most one of face, full name and location in any output.
    - Why:
      - Consent is scoped to channels and has an expiry (Bond p. 21).
      - For children, Bond's "triangle of risk" allows at most one of the three (Bond pp. 16-17).
      - AI images don't solve consent (Bond pp. 37-38).
      - Gemini's unpaid terms say not to send personal information.
      - #6 takes photos as input, so it will need the same rule (gh issue view 6).
    - Owner action: either add a "named beneficiary, no consent note" trap to HS#9, or keep that case in #5's own test fixtures. HS#9 has no such trap today.
14. **Evidence for "non-VWC".**
    - Default: the HS#9 fixture for CI, plus one manual run on a real public report whose outputs are neither committed nor published, with every personal name removed.
    - Why: HS#9's fictional-only rule, and the fact that a real report's consent covers its own channel, not a new video (Bond p. 21; inference).
15. **Output location.**
    - Default: outside the caller's repo (the pr-to-video `project-dir.mjs` pattern), with a `--out` override.
    - Why: today `videos/` is ignored only by a local exclude (APP/.git/info/exclude:19-21).
16. **VWC dogfood numbers.** Can a VWC run show 97%, $20M+ and 300+ while app#1329 and app#1332 are open?
    - Default: yes, but only with the exact attribution "Internal cohort data · Reported by Diginomica (Dec 2025)", and flagged "no window/denominator" in `REVIEW.md`.
    - Why: outcomes.ts:44-45, and the owner has not confirmed the methodology.

## Suggested build plan

Use one branch per issue off `main` and Conventional Commits (owner rule). No AI attribution in commits, PRs or docs (owner rule).

1. **Confirm prerequisites.**
   - Needed: `main` exists with a LICENSE. HS#3's brand-pack schema and HS#2's audio and storage interfaces are merged or frozen. The HS#9 `nonprofit/impact-report.md` and `brand.md` exist. The owner has recorded who owns the card renderer (decision 3).
   - Verify:
     - `gh api repos/Vets-Who-Code/hashflag-skills` shows isEmpty=false.
     - `fixtures/nonprofit/impact-report.md` has at least 6 figures with exactly one unsourced. Read it by hand and record the line numbers.
2. **Ingest: freeze the source.** Turn a `.md`/`.txt`, PDF or URL into `source.txt` (UTF-8, line-numbered) plus `source.meta.json` (origin, fetchedAt, sha256).
   - Verify with `node --test`:
     - the fixture produces the same sha256 on every run;
     - a small PDF extracts its known text;
     - URL fetching is mocked, with no network.
3. **Claims ledger.** A deterministic extractor finds every figure and its line: digits, `%`, `$`, years, and spelled-out numbers normalized to digits. The model attaches an attribution span or `null`. Output is `claims.json` with fields `{id, display, value, line, sourceSpan|null}`.
   - Verify:
     - on the fixture, the ledger has at least 6 entries and exactly one `sourceSpan: null`, at the planted line;
     - unit tests cover "twenty-eight percent" → 28%, "1,200" → 1200, and "$1.2 million" → 1200000.
4. **Claims gate** (port check-copy's `numerals` and fix its gaps). It scans:
   - SCRIPT spoken lines (any indent), voiceover lines, `compositions/frames/*.html`, `captions.html`;
   - card HTML, `caption.txt`, `alt.txt` and `transcript.txt`.

   It fails on:
   - a figure not in the ledger
   - a ledger figure with a `null` source
   - rounding or hedge words the source doesn't use
   - a derived figure.
   - Verify: `node --test` with planted cases: an invented number, 1,187 shown as "nearly 1,200", the unsourced fixture figure, a curly-quoted figure, a figure only in frame HTML, and a tab-indented spoken line. Each must exit 1, and the clean fixture outputs must exit 0.
5. **CTA gate.** Read `cta.verb` and `cta.url` from the brand pack. The end card, captions and social copy must use exactly the configured verb. Soft CTAs fail, judged phrase by phrase.
   - Verify with tests:
     - "Support Our Mission", "Learn more" and "Get started" fail;
     - "Donate" passes;
     - VWC's closing paragraph fails on its soft phrases even though it contains a literal Donate link;
     - a pack configured with "Volunteer" passes "Volunteer" and fails "Donate".
6. **Script, storyboard and review.** Write the impact shape into `STORYBOARD.md` and `SCRIPT.md`, with 150–180 spoken words in total, end card included. Run both gates before the Step 3 approval ask. Then write `REVIEW.md` listing:
   - every ledger entry and where it is used;
   - every flag;
   - every person named in the source, each with a consent box (decision 13).
   - Verify:
     - the spoken word count (`grep` the SCRIPT spoken lines, then `wc -w`) is 150–180;
     - both gates exit 0 on the fixture;
     - `REVIEW.md` lists the unsourced figure under "Flagged — not used";
     - a test source with one unticked name fails the gate when that name appears in SCRIPT.
7. **Video.** Use HS#3's wrapper with the org's brand pack, with telemetry off and `HYPERFRAMES_SKIP_SKILLS=1`.
   - Verify:
     - `npx hyperframes lint` and `check` pass;
     - both gates pass again before render;
     - the count of `assets/voice/*.wav` equals the SCRIPT spoken-line count and `audio_meta.json` `voices.length` (the partial-audio lesson);
     - `ffprobe -show_entries format=duration renders/video.mp4` gives 60 to 90 s.
8. **Audio version.** Concatenate `assets/voice/<id>.wav` in SCRIPT line order with the ffmpeg `concat` filter, resampled to 44.1 kHz mono. Normalize with ffmpeg `loudnorm` (or the ported `normalizeLoudness`). Write `audio.wav` or `audio.mp3`, plus `transcript.txt` (the SCRIPT spoken lines verbatim, then the on-screen text of any silent frame). If decision 1 goes the other way, use `ffmpeg -vn` on the render, or run #2 on the same spoken text.
   - Verify:
     - the input file count equals `voices.length`;
     - the output's ffprobe duration equals the sum of `voices[].duration_s` within 0.2 s;
     - `diff` between `transcript.txt` and the extracted SCRIPT spoken lines is empty;
     - the claims gate passes over `transcript.txt`.
     - For the #2 path, check duration against words at about 187 wpm (the truncation audit from app#1266).
9. **Social cards.** Produce 3–5 HTML artboards, each holding one sourced ledger entry, a label and a source line. Style them from the pack's CSS tokens with open-licensed fonts only, and render through Playwright at 1080x1080 CSS px with `deviceScaleFactor: 1`. Write `caption.txt` and `alt.txt` for each card.
   - Verify:
     - there are 3–5 PNGs, each 1080x1080 (`sips -g pixelWidth -g pixelHeight`) and ≤5 MB;
     - the claims gate passes over the card HTML, captions and alt text;
     - `alt.txt` equals the card's visible text;
     - computed WCAG contrast is at least 4.5:1 between text tokens and the ground, or 3:1 for large text (w3.org/WAI/WCAG22/Understanding/contrast-minimum).
10. **`--dry` cost mode.** List the planned paid calls and print a cost range at the Cost table rates, with no network calls.
    - Verify: a test with `fetch` mocked to throw shows that `--dry` exits 0 and prints a min and max estimate.
11. **Non-VWC end-to-end and README.** Run the whole skill on the HS#9 fixture with the fictional brand pack. Run it once by hand on a real public report, with names removed and outputs neither committed nor published. Write a README with a before-and-after example.
    - Verify:
      - all outputs exist;
      - `grep` finds the unsourced fixture figure in `REVIEW.md` only;
      - CI runs steps 2–6, 8 (with fixture WAVs) and 10 with no keys;
      - `git status` shows no render output tracked.

## Sources

**hashflag-skills**
- Issues HS#1, HS#2, HS#3, HS#5, HS#6, HS#7, HS#8, HS#9 (gh issue view -R Vets-Who-Code/hashflag-skills, read 2026-09-29).
- `gh api repos/Vets-Who-Code/hashflag-skills` (read 2026-09-29).

**vets-who-code-app files, at b7c19088**
- `APP/scripts/generate-single-blog-audio.ts` (6-39, 59-152, 160-190, 214-242, 247-337, 342)
- `APP/scripts/generate-blog-image.ts` (17, 60-61, 83, 87-108, 140-153, 178-246)
- `APP/scripts/image-prompts.ts`
- `APP/scripts/generate-blog-graphic.ts` (8-21, 32-73, 77-135)
- `APP/scripts/generate-blog-media.ts`
- `APP/src/data/blog-graphics/_brand.css` (3-20, 51-52)
- `APP/src/data/blog-audio/labor-day-sprint-10-days-to-proof-of-work.md`
- `APP/src/data/blogs/labor-day-sprint-10-days-to-proof-of-work.md` (31, 67, 74)
- `APP/src/data/blogs/high-success-low-adoption.md` (79, 81)
- `APP/src/data/blogs/*.md` (the closing donate paragraph in 35 of 39, all within the last 5 lines; grep -rli, tail)
- `APP/src/lib/blog.ts:59`
- `APP/src/data/outcomes.ts` (19-122)
- `APP/__tests__/data/outcomes.test.ts` (47-152)
- `APP/src/data/accelerator.ts` (78-94)
- `APP/src/data/homepages/index.json` (105, 149, 160)
- `APP/src/data/innerpages/faq.json:222`
- `APP/public/llms-full.txt:35`
- `APP/src/components/forms/donate-form.tsx` (122-151)
- `APP/src/containers/donate-form/layout-01/index.tsx:30`
- `APP/src/pages/api/og.tsx` (14, 39, 202-203)
- `APP/src/pages/api/jobs/parse-resume.ts` (13, 15, 90-102)
- `APP/package.json` (75, 88, 110)
- `APP/node_modules/pdf-parse/package.json`, `APP/node_modules/mammoth/package.json`
- `APP/node_modules/@google/genai/dist/genai.d.ts` (5510-5527)
- `APP/AGENTS.md` (262-268)
- `APP/.nvmrc`
- `APP/.gitignore` (105-106)
- `APP/.git/info/exclude` (19-21)
- `APP/videos/labor-day-sprint-proof-of-work/`: BRIEF.md, package.json, SCRIPT.md.bak (3, Time windows, 184 spoken words), audio_meta.json (`voices: []`), index.html (0 voice clips), renders/*.mp4 (ffprobe, stat), compositions/frames/08-end-card.html:80, STORYBOARD.md:152
- `APP/videos/vets-who-code-reel/capture/extracted/asset-descriptions.md`

**vets-who-code-app commits, PRs and issues**
- Commits: 1fa1bfa7, d97b2ce8, 7b0f4aef, 24a9ae4b
- PRs: app#1266, app#1418, app#1437, app#1390, app#1460
- Issues: app#1205, app#1329, app#1330, app#1332

**Skills**
- `SK/faceless-explainer/SKILL.md` (51-60, 58, 86, 102-106, 142-146, 156, 204, 214)
- `SK/faceless-explainer/references/story-design.md:195`
- `SK/faceless-explainer/scripts/lib/dimensions.mjs` (8-45)
- `SK/faceless-explainer/scripts/audio.mjs` (94-99, 146-174)
- `SK/faceless-explainer/scripts/assemble-index.mjs` (392-406, 581)
- `SK/vwc-faceless-explainer/SKILL.md` (3, 38-54, 136-148, 155-168, 199-241, 266-293)
- `SK/vwc-faceless-explainer/scripts/check-copy.mjs` (20-51, 91-115, 175-199)
- `SK/hyperframes-creative/frame-presets/blue-professional/FRAME.md` (286-300)
- `SK/hyperframes-creative/references/story-spine.md:43`
- `SK/hyperframes-creative/references/narration.md` (7, 92)
- `SK/hyperframes-creative/references/typography.md:3`
- `SK/pr-to-video/references/story-design.md` (175, 182, 184)
- `SK/pr-to-video/scripts/project-dir.mjs` (8-53)
- `SK/hyperframes/references/frame-worker-core.md:49`
- `SK/hyperframes/references/skill-lifecycle.md` (5-33)
- `SK/hyperframes-cli/SKILL.md` (116-126)
- `SK/hyperframes-cli/references/doctor-browser.md` (5-57)
- `SK/media-use/audio/scripts/audio.mjs` (148-160)
- `SK/media-use/audio/scripts/lib/tts.mjs` (212-224)
- `SK/media-use/audio/references/tts.md`
- `SK/media-use/audio/references/requirements.md` (9-28)
- `SK/media-use/audio/scripts/lib/heygen.mjs` (20-47)
- `SK/media-use/references/meta.md` (36-46)
- `SK/motion-graphics/categories/stat/module.md` (5-21)
- `SK/product-launch-video/SKILL.md:38`

**Local tools**
- `ffmpeg -filters` (ffmpeg 9.0.2: concat, apad, loudnorm)

**URLs, all read 2026-09-29**
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/terms (last updated 2026-04-28)
- https://ai.google.dev/gemini-api/docs/deprecations
- https://ai.google.dev/gemini-api/docs/image-generation
- https://ai.google.dev/gemini-api/docs/speech-generation
- https://developers.heygen.com/docs/enterprise-pricing.md
- https://cloudinary.com/pricing
- https://cloudinary.com/documentation/transformation_counts
- https://www.linkedin.com/help/linkedin/answer/a527229 (organic photo posts)
- https://www.linkedin.com/help/lms/answer/a426534 (Sponsored Content single-image ads)
- https://www.facebook.com/help/instagram/1631821640426723 (Instagram photo resolution)
- https://developers.facebook.com/documentation/sharing/webmasters/images
- https://www.facebook.com/business/ads-guide/update/image/facebook-feed
- https://docs.x.com/x-api/media/introduction
- https://help.x.com/en/using-x/posting-gifs-and-pictures (search-result extract only; direct fetch 403)
- https://www.bond.org.uk/wp-content/uploads/2024/11/Digital_Ethical-Guidelines_FINAL.pdf (pp. 16-17, 21, 22, 37-38)
- https://www.w3.org/WAI/tutorials/images/decision-tree/
- https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html
- https://www.w3.org/TR/WCAG22/#dfn-media-alternative-for-text
- https://huggingface.co/facebook/musicgen-small
- https://pixabay.com/service/license-summary/
- https://gsap.com/standard-license
- https://github.com/heygen-com/hyperframes (LICENSE, CREDITS.md, commit 01601d1105)

**Not researched:**
- A first-party Facebook spec for organic photo posts. Only the link-share and ad specs were found.
- The X help page itself: its aspect-ratio rule comes from a search extract.
- Alt-text support and limits on Instagram, Facebook and X.
- US law on beneficiary names and photos. Bond's guidance is GDPR-based.
- HeyGen and ElevenLabs data-use terms, and Anthropic's for the session.
- How to detect a free-tier Gemini key programmatically.
- Kokoro's output sample rate.
- Whether HeyGen-retrieved BGM may be redistributed as standalone audio.
- An HTML-to-text library for URL input.
- pdf-parse accuracy on tables and charts.
- ElevenLabs pricing.
- HeyGen self-serve and cloud-render USD rates.
- Whether faceless-explainer accepts externally generated narration audio.
- HeyGen Starfish's measured speaking rate, and how it reads digits.
- Whether burned-in captions satisfy WCAG 1.2.2, and exporting SRT/VTT alongside them.
- The Claude session's token cost per run.
