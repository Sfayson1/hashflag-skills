# #7 [Skill]: Product explainer video for small businesses: context

Issue text (`gh issue view 7 -R Vets-Who-Code/hashflag-skills`, read 2026-09-29): "turn a service page, product sheet or FAQ into an on-brand explainer video and an audio version. It builds on the brand-pack explainer and the blog-media skill." It has 4 acceptance criteria, 0 comments and the label `enhancement`, and was created 2026-09-27. The owner's build order is #2, #3, #4, #8. #7 is one of the three skills that "can follow in any order after steps 1 and 2" (epic #1 body, line 30).

Abbreviations:
- **HF 0.8.91** means the `hyperframes@0.8.91` npm tarball (dist.shasum `35c5162884cd010762979cfca4f516949af3b8a0`, which matches `npm view hyperframes@0.8.91 dist.shasum`). Paths are under `package/dist/`, and anyone can reproduce them with `npm pack hyperframes@0.8.91`.
- **Probe** means a local experiment run on 2026-09-29. Its inputs are given inline so it can be re-run.

## What exists today

**hashflag-skills itself:**
- The repo is private and empty: size 0, license null, pushed_at 2026-09-26, REST default_branch "main", and `/commits` returns HTTP 409 "Git Repository is empty" (`gh api repos/Vets-Who-Code/hashflag-skills`, 2026-09-29).
- All of #1 to #9 are OPEN (`gh issue list --state all`, 2026-09-29).
- None of the issues #7 depends on (#2, #3, #9) has landed.

**Upstream pipeline to wrap (HeyGen HyperFrames, Apache-2.0, HF 0.8.91 package.json):**
- `~/.claude/skills/product-launch-video/`: the closest match to #7.
  - Scripts: `build-frame`, `audio`, `captions`, `frame-packets`, `stage-assets`, `transitions` and `assemble-index`, plus node:test suites including `capture-skill-guardrails.test.mjs`.
  - References: `cut-catalog`, `motion-language`, `story-design`, `visual-design` (`ls scripts references`).
  - It takes a URL (capture) or a pasted script or brief (the no-capture path) (SKILL.md:53, :76).
- `~/.claude/skills/faceless-explainer/`: the same `capture/extracted/{visible-text.txt,tokens.json}` contract, text-only, with no capture step (faceless-explainer/SKILL.md:47-60). Its route says it is not for websites (hyperframes/references/routes/faceless-explainer.md:3). #3 generalizes this one.
- `~/.claude/skills/media-use/audio/scripts/audio.mjs`: the shared TTS/BGM/SFX engine.
  - It writes one WAV per script line to `assets/voice/<id>.wav` (:148).
  - A failed line becomes an anomaly ("TTS failed — omitted", :160) and is printed under "anomalies (non-fatal)" (:291-294).
  - Its Kokoro route shells out to `npx hyperframes tts` (lib/tts.mjs:11, :283).
- `~/.claude/skills/media-use/audio/scripts/heygen-tts.mjs`: a standalone HeyGen Starfish client with `--voice`, `--speed`, `--lang`, `--list` and `--words` (media-use/audio/references/tts.md:47-81).
- `~/.claude/skills/hyperframes-creative/frame-presets/`: 13 presets, and all 13 carry a "Numerals & Claims (hard rule)" section (`grep -l` 13/13). blue-professional/FRAME.md:286-300 says "Never invent figures, financials, percentages, or dates" and that every numeral traces to the script, otherwise a placeholder is used.
- `~/.claude/skills/hyperframes-creative/references/story-spine.md:43`: "the product's own numbers over invented ones".
- `~/.claude/skills/hyperframes/references/routes/product-launch-video.md:9-10`: the "sell or show?" question and the destination-to-aspect map (16:9 embed, 1:1 feed, 9:16 Shorts/TikTok).
- `~/.claude/skills/motion-graphics/grounding/PROTOCOL.md` and `categories/webpage/module.md`: grid-loop localization, which highlights a real region of a captured page (for example an FAQ answer) instead of retyping it (research: PROTOCOL.md:7-40; module.md:9-16).
- `~/.claude/skills/pr-to-video/scripts/project-dir.mjs:34-53`: a project-dir resolver.
  - An explicit `--project-dir` wins (:40).
  - Otherwise it uses `$XDG_CACHE_HOME`, or `~/.cache`, plus `hyperframes/pr-to-video/<owner>/<repo>/<repo>-pr-<n>` (:42-52).
  - This is the pattern to copy for #7's output dir.
- `~/.claude/skills/pr-to-video/scripts/preflight.mjs:12-27`: runs `npx hyperframes --help` and fails if a required command (default `check`) is missing. It is a **capability check, not a version check**.

**VWC-authored pieces (local, unversioned):**
- `~/.claude/skills/vwc-faceless-explainer/`: the override pattern #3 generalizes. It skips upstream Step 2 and stages a hand-written `frame.md`, a caption skin, fonts and a logo fetched before render (SKILL.md:60-74). It carries the copy law and several lessons below.
- `~/.claude/skills/vwc-faceless-explainer/scripts/check-copy.mjs` (201 lines): a dependency-free copy gate.
  - It exports `RULES`, `scan()` and `numerals()`, and has `--self-check`.
  - It scans SCRIPT.md, STORYBOARD.md, captions.html and frames/*.html (:149-199).
  - `--numerals` lists figures but never compares them against a source (:183-192).
  - It is the seed for #7's claims gate.

**vets-who-code-app prior art:**
- `src/pages/api/jobs/parse-resume.ts:90-102`: document-to-text using `mammoth.extractRawText` (mammoth 1.11.0, BSD-2-Clause) and `new PDFParse(...).getText()` (pdf-parse 2.4.5, Apache-2.0) (`node_modules/{mammoth,pdf-parse}/package.json`). It is the only in-house PDF/DOCX reader.
- `src/data/outcomes.ts:1-40`: a provenance model (`value`, `display`, `qualifier`, and `source`/`asOf`, "Unset rather than guessed"). `__tests__/data/outcomes.test.ts` scans for stray copies. It is a template for a per-run facts ledger.
- `scripts/generate-single-blog-audio.ts`: exports `pcmToWav` (:6), `NARRATION_STYLE` (:240), `normalizeLoudness` (:247), `chunkForTts` (:298) and `cleanMarkdownToText` (:327). Loudness and WAV are the pieces the audio version needs once #2 ports them.
- `videos/vets-who-code-reel/`: the one real product-launch-video run, on vetswhocode.io.
  - BRIEF.md: `workflow: product-launch-video`, 90 s, `voice: none`.
  - Output `renders/video.mp4` is H.264 1920x1080 at 30 fps with AAC 48 kHz stereo, 90.000 s, 24,862,071 bytes (ffprobe, 2026-09-29).
  - It pins `hyperframes@0.8.61` (package.json:6-8).
  - It is local only, excluded by `.git/info/exclude:21` (`videos/`) and not by `.gitignore` (`grep` finds no match).

**Test input (spec only, not written):** #9 defines `fixtures/small-business/service-page.md` ("services, hours, and an FAQ of 5 or more questions") and `brand.md` (gh issue view 9, body lines 20-29). The planted trap is: "`service-page.md` has **no prices anywhere**, and one FAQ answer says 'call for a quote'. #7 must not invent pricing" (body line 32).

**Borrow-only references (no provenance in `~/.agents/.skill-lock.json`):**
- `copywriting`'s "Honest over sensational" (SKILL.md:72) and its "Now you can… keep only if compelling AND true" test (copy-frameworks.md:353-366) (research).
- Do not borrow its CTA advice ("Start Free Trial") (SKILL.md:153-170, research).

## How it works now

This is the product-launch-video order, with commands as they appear in `~/.claude/skills/product-launch-video/SKILL.md`.

0. **Setup.**
   - `npx hyperframes init "videos/<project>" --non-interactive --example=blank --skill=product-launch-video` (:32). `init` refreshes installed skills from GitHub, and `HYPERFRAMES_SKIP_SKILLS=1` is the only opt-out (hyperframes/references/skill-lifecycle.md:12-14).
   - BRIEF.md is written after init (:36).
   - The output of `npx hyperframes auth status` is relayed verbatim (:38).
   - "Rendering remains user-gated in both modes" (hyperframes/references/brief-contract.md:13-48, research).
1. **Capture.** `npx hyperframes capture "<URL>" -o ./capture --json` (:55).
   - Hard stops: a non-zero exit, `ok:false` or `capture/BLOCKED.md`, with no synthetic fallback (:60-65). Upstream says to use `--skip-vision` "only when optional image captioning is intentionally disabled" (:58).
   - Vision captions run automatically when a vision key exists; without one the pipeline uses DOM context and continues (:74).
   - The no-capture path hand-writes `tokens.json`, `visible-text.txt`, `asset-descriptions.md` and `capture/assets/` (:76). The gate is at :78-83.
   - **URL validation** (HF 0.8.91): the command only checks that `new URL(url)` parses (`capture-ZMZFCHW4.js:132-137`). Navigation calls `page.goto(url)` with no host filter (`capture-QM2JRH7T.js:730-760`, bundled from `src/capture/navigateForCapture.ts`).
     - Probe: `http://127.0.0.1:8765/` (python `http.server`) and `file:///…/index.html` both returned `ok:true, httpStatus:200` and a full `visible-text.txt`.
     - **Sub-resources on private hosts are never downloaded.** `isPrivateUrl` treats every non-http(s) URL, `localhost`, `*.local`, `*.internal` and loopback or RFC1918 ranges as private (`chunk-Z6Z7KGEU.js:759-767`; `chunk-S6YCUTNM.js:9636-9676`), and it guards asset, stylesheet and video fetches (`chunk-Z6Z7KGEU.js:772`; `capture-QM2JRH7T.js:1422, :2767`).
     - In the probe, the page's `<img src="/shop.png">` gave `assets: 0, dropped.unavailable: 1` on loopback, and `assets: 0` on file://.
     - On file://, `meta.json` gets `"id": "-video"` because the hostname is empty (`capture-QM2JRH7T.js:661`, probe).
   - **Text extraction** (HF 0.8.91 `capture-QM2JRH7T.js`, from `src/capture/contentExtractor.ts`):
     - It uses a TreeWalker over text nodes and drops text shorter than 3 chars (:991).
     - It drops nav/footer text shorter than 8 chars (:1001) and cookie phrases (:985).
     - It checks only the text node's direct parent for `display:none|visibility:hidden|opacity:0` (:995).
     - Output is capped at 30,000 chars with `[...truncated]` (:1008-1009).
   - **Vision:**
     - Provider priority is OpenRouter, then Vertex, then Gemini (:1043).
     - Models: `HYPERFRAMES_OPENROUTER_MODEL || "google/gemini-3.1-flash-lite"`, `HYPERFRAMES_VERTEX_MODEL || "gemini-2.5-flash"`, `HYPERFRAMES_GEMINI_MODEL || "gemini-3.1-flash-lite-preview"` (:1045-1049). The same defaults ship in 0.8.60, 0.8.61, 0.8.66 and 0.8.67 (grep of `~/.npm/_npx/*/node_modules/hyperframes/dist`).
     - Requests use `thinkingBudget: 0` (:1140), with `maxOutputTokens` 500 for raster images (:1195) and 300 for SVGs (:1283), in batches of 20 (:1153).
     - Failed requests are counted, not fatal (:1015-1030).
   - **`.env` loading:**
     - The CLI loads `./.env` from the cwd (`cli.js:165-190`).
     - Capture separately walks up to 5 directories from the **output dir** and loads the first `.env` it finds (`capture-QM2JRH7T.js:631-653`, called at :3831).
     - The shell environment wins in both cases.
2. **Design system.** `node <SKILL_DIR>/scripts/build-frame.mjs --preset <name> --hyperframes .` remixes `tokens.json` onto a preset and copies the caption skin (:94-97). It gives display and body the same non-mono brand family (`build-frame.mjs:335-336`) and overwrites `frame.md` (`:515`).
3. **Storyboard and script.**
   - It reads `visible-text.txt` as "product facts, page copy, positioning, proof, CTA" (story-design.md:24).
   - It extracts audience, pain, promise, product role, proof and CTA (:32-41), then picks an arc: PAS, Future Pacing, Demo Loop, BAB or Feature-Benefit Cascade (:45-55).
   - `VO_MODE` is verbatim or restructure (:419-430).
   - `duration:` comes from the brief's `length`, and assembly "reports where the cut lands" (SKILL.md:109).
   - The plan is presented as a proposal and loops until approved (:113).
3.1. **Audio.** `node <SKILL_DIR>/scripts/audio.mjs --script ./SCRIPT.md --storyboard ./STORYBOARD.md --hyperframes . --out ./audio_meta.json --provider <p> --voice <id> &` (:127).
   - Provider order: HeyGen Starfish (word timestamps), then ElevenLabs, then local Kokoro (tts.md:40-43). The HeyGen default voice is Marcia `05f19352…` (tts.md:79). `am_michael` and `af_sky` are the promo picks for Kokoro (tts.md:109).
   - BGM is HeyGen retrieval only, with strict "retrieve", so there is no music without a HeyGen credential (product-launch-video/scripts/audio.mjs:11-14).
   - `sync-durations` then writes real voice durations into STORYBOARD.md, and "real voice duration wins" (SKILL.md:171-175).
   - The silent marker is `music: none` plus no SCRIPT.md (:133).
   - Kokoro via the CLI needs `pip install kokoro-onnx soundfile`, or `HYPERFRAMES_PYTHON` pointing at a venv that has them (HF 0.8.91 `synthesize-K62TIZWI.js:120-134`). The model and voices download from `github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/` (`chunk-XZABUQTX.js:20-22`).
4. **Visual design.** A time-coded shot sequence is written per frame, then `stage-assets.mjs` runs (:151-159).
5. **Frames.**
   - One sub-agent per frame via `frame-packets.mjs` (:181-185), then `captions.mjs build` and `assemble-index.mjs` (:193-195).
   - The index `#root` ground is painted from `frame.md`'s `canvas` role (`assemble-index.mjs:683-690`).
   - Every assembled index loads GSAP from `cdn.jsdelivr.net/npm/gsap@3.14.2` (`assemble-index.mjs:729`).
   - The caption band is the bottom 16.67% (180 px at 1080) (faceless-explainer/scripts/lib/dimensions.mjs:8-45, research).
6. **Finalize.**
   - `transitions.mjs inject/verify`, `npx hyperframes lint`, `check`, a `snapshot` contact sheet, then preview (:209-225).
   - Render happens only after approval: `npx hyperframes render --skill=product-launch-video --quality high --output renders/video.mp4` (:229).
   - The final reply states the MP4 path and duration (:233).

**Formats and pacing:**
- Formats: 1920x1080, 1080x1920 and 1080x1080 (SKILL.md:239).
- The upstream estimate is ~2.2 words/s, with `duration ≈ ceil(words/2.2)` (pr-to-video/references/story-design.md:175, :184). At that rate #7's 45-90 s window is **99-198 words** (arithmetic).
- Real voices differ: Gemini's Kore voice reads at 187 wpm, about 3.1 words/s (generate-single-blog-audio.ts:235-236). At that pace 45-90 s is **140-280 words** (arithmetic).
- Kokoro and HeyGen words per minute: Not researched.
- The route's sweet spot is 30-90 s, with a hard cap of about 3 min (routes/product-launch-video.md:4).

**Wording gate:** nothing upstream checks wording or claims. `hyperframes lint` and `check` read structure and layout only (check-copy.mjs:2-4).

## Lessons already paid for

**Brand and assembly (from the VWC wrapper):**
- **The auto design spec cannot hold a two-font brand.** `build-frame.mjs:335-336` gives display and body the same family, and `:515` overwrites `frame.md`. In VWC's test, navy `#091f40` landed in 0 of 13 remixes (owner decision). #7 must take `frame.md` from #3's brand pack.
- **`#root` ground comes from the canvas role.** Transition gaps flash the canvas color, and the hand CSS fix in index.html is lost on reassembly (vwc SKILL.md:266-272; assemble-index.mjs:683-690).
- **Registry blocks are not brand-safe.** `grain-overlay`'s infinite CSS animation is non-deterministic under seek rendering (vwc SKILL.md:246-262).

**Audio:**
- **Partial TTS looks like success.** A run reported "✓ 5 voice" and exited 0 with 3 lines missing (vwc SKILL.md:238-240), and the engine calls the failures "non-fatal" (audio.mjs:160, :291-294). Compare the voice count with the line count before exporting.
- **Switching to music-only needs 3 caches cleared** (vwc SKILL.md:199-218).
- **A silent cut is a rebuild.** `pad-frame-duration.mjs` silently no-ops when `data-composition-id` and `data-duration` sit on different elements (vwc SKILL.md:220-235).
- **On HeyGen TTS, the skill's client exposes only `--voice`, `--speed` and `--lang`, so punctuation is the prosody control** (vwc SKILL.md:174-197). HeyGen's API accepts "plain text and SSML", with `<break time="0.35s"/>` in seconds only (developers.heygen.com/reference/generate-speech.md, read 2026-09-29). Whether `heygen-tts.mjs` passes SSML through is untested.
- **Script length must be sized to the voice.** A 99-198-word script sized at 2.2 w/s would run about 32-64 s at Kore's 187 wpm (arithmetic from the figures above), which is under 45 s. The length gate must read durations after `sync-durations` (SKILL.md:171-175).

**Capture and source fidelity (directly relevant to "claims only from the source"):**

Capture probe on 2026-09-29: hyperframes@0.8.91, Node 24.14.1, `--json --skip-vision`, vision keys unset. The target was a fictional "Ridgeline Bike Repair" page. The results are below.

- **Split prices lose their digits (confirmed).** `<p>Tune-up from $<span>9</span></p>` became `[p] Tune-up from $` (probe). The `< 3` char filter applies per text node (capture-QM2JRH7T.js:991).
  - The same thing happened on the live VWC site. On 2026-09-22 the four count-up tiles came through as "Alumni Earnings" with no number, "300" without "+", no 97% and "128" (videos/vets-who-code-reel/capture/extracted/visible-text.txt:71-80). Those tiles also shipped a literal `0` in HTML (PR #1418 body).
  - The reel's BRIEF took its numbers from `src/data/homepages/index.json` instead (BRIEF.md "Assets").
- **Hidden text counts as source (confirmed).** `<div class="hidden"><div><p>Old price: $120 flat rate, satisfaction guaranteed</p></div></div>`, with `display:none` on the grandparent, came through verbatim (probe). `<p style="display:none">Direct hidden: $55 special</p>` was dropped, because only the direct parent is checked (:995). A stale hidden price or guarantee therefore passes any gate that matches against raw `visible-text.txt`.
- **Short nav and footer text is dropped.** "Home" (4 chars, nav) and "Hi" (footer) were dropped, while "Services" (8 chars) was kept (probe; :1001).
- **The source page carries its own unsourced claims.** The capture recorded "4.9/5.0 Average Rating By Our Troops" (visible-text.txt:119-120), which #1418 later removed as unsourced (PR #1418 body). "Only from the source" gives fidelity to the page, not truth.
- **Capture copies the target site's fonts.** The VWC reel pulled 30 font files into `capture/assets/fonts/`: Gilroy-UltraLight, Font Awesome brands, duotone, light, regular and solid, and Playfair Display (`ls`). Duotone and light are Pro styles (inference). Never commit `capture/`, and never put captured fonts in fixtures.
- **Loopback and file:// captures bring no images or logo** (see How it works). For the #9 fixture, the logo and images must come from #3's brand pack.
- **Bot walls are a hard stop.** A blocked capture forbids a synthetic fallback (SKILL.md:60-70; capture-skill-guardrails.test.mjs). The blocked-page message says "The site may reject automated or data-center traffic" (capture-QM2JRH7T.js:722). A document path the user picks explicitly is needed.
- **`logo-<hash>.svg` is a structural hint, not a content claim** (reel asset-descriptions.md header; vwc SKILL.md:73-74).

**Where invention creeps into the script:**
- **The script bank models invented claims.** Examples: "Try it free. No credit card. relay.app." (story-design.md:365); "Get started for free now — no credit card required." (:381); "Twelve thousand teams. 4.9 stars. 99.98% uptime." (:349); "Response time, down 40%…" (:285).
- The persuasion menu includes "Risk reversal" and "Scarcity/urgency" (:493). No rule ties a claim to `visible-text.txt`, and the final checklist has none either (:497-508).
- **The preset claims rule traces to the script, not the source**, so an invented price in SCRIPT.md is faithfully rendered (FRAME.md:286-300).

**The existing copy gate.** `check-copy` misses #7's failure class. Re-probed on 2026-09-29 by importing `scan()` and `numerals()` from check-copy.mjs:
- "Try it free. No credit card required.", "Satisfaction guaranteed, or your money back.", "Call for a quote." and "Best bike shop in town. Fully insured." produce no scan hit and no numerals.
- "$49." is listed with its trailing period. "forty-nine dollars" is listed as `forty-nine`. A tab-indented "$79 flat rate" is not listed at all (the spoken-line test is `^ {4}\S`, :183).
- `--numerals` reads `.md` only (:185). Its "curly" quote class is ASCII `[""]` (:106).
- The prohibition exemption `\b(never|not|avoid|…)\b[^.;|]*` (:50) runs to the next `.`/`;`/`|`. So "Do not wait — sign up today." and "Never settle — get started now." pass, while "Sign up today." and "Get started now." are flagged.

**TTS reading of CTAs, URLs and numbers (Kokoro, tested):**

Kokoro probe on 2026-09-29: kokoro-onnx 0.6.1 with phonemizer 3.4.0 and espeakng-loader 0.2.4. The probe calls `Tokenizer().phonemize(text, "en-us")`, which is the same path `npx hyperframes tts` takes through `kokoro_onnx.Kokoro(...).create` (HF 0.8.91 `synthesize-K62TIZWI.js:39-42`; kokoro_onnx `tokenizer.py:77-90`, `preserve_punctuation=True`). The model sees only these phonemes:

| Input | Phonemes | Heard as |
|---|---|---|
| "ridgelinebikes.example/book" | `ɹˈɪdʒlaɪnbˌaɪks.ɛɡzˈæmpəl slˈæʃ bˈʊk` | "ridgelinebikes [.] example slash book". The dot is **kept as a punctuation mark, not spoken "dot"**. That it renders as a pause or fall is an inference. |
| "vetswhocode.io/apply" | `vˈɛtshəkˌoʊd.ˈiːoʊ slˈæʃ ɐplˈaɪ` | "vets-huh-code [.] ee-oh slash apply" |
| "https://www.…" | `ˌeɪtʃtˌiːtˈiːpˌiːˈɛs:slˈæʃslæʃ dˌʌbəljˌuː…` | spelled out, letter by letter |
| "555-0134" | "five hundred fifty five dash zero one three four" | wrong for a phone number |
| "$49" | "dollar forty nine" | wrong word order |
| "24/7" | "twenty four slash seven" | wrong |
| "ridgeline bikes dot example slash book" | `…bˈaɪks dˈɑːt ɛɡzˈæmpəl slˈæʃ bˈʊk` | correct |

So the audio script needs a hand-checked **spoken form** of the CTA URL, phone number and any prices, while the literal URL goes on screen. HeyGen, ElevenLabs and Gemini TTS were not tested, because they are paid calls.

**Upstream and runtime:**
- **The vision default model is documented as shut down but is still served.**
  - Google's changelog says `gemini-3.1-flash-lite-preview` "has been shut down. Use `gemini-3.1-flash-lite` instead" (May 25, 2026). The deprecations table lists shutdown on May 25, 2026 with replacement `gemini-3.1-flash-lite`, whose own shutdown date is May 7, 2027 (ai.google.dev/gemini-api/docs/changelog and /deprecations, read 2026-09-29).
  - Yet on 2026-09-29, `GET v1beta/models/gemini-3.1-flash-lite-preview` returned version `3.1-flash-lite-preview-03-2026` with `generateContent` supported, and `:countTokens` returned HTTP 200 (free metadata calls with the vets-who-code-app `.env` key; generateContent not called).
  - The reel's 59 captions on 2026-09-22 (asset-descriptions.md, 59 entries, 7 of them SVG) came from this id through the Gemini provider. This is an inference with strong support: no vision key was set in the shell (checked by name, 2026-09-29), `vets-who-code-app/.env` defines `GEMINI_API_KEY`, and `@google/genai@1.52.0` was installed into `~/.cache/hyperframes/optional/` at 14:20 on 2026-09-22, the same minute `asset-descriptions.md` was written (`ls -la`).
  - Conclusion: the id works today but can disappear without notice. `--skip-vision` is a precaution, not a necessity.
- **Capture silently uses the caller's `.env`.** `videos/vets-who-code-reel/capture` is 3 levels below `vets-who-code-app/.env`, inside capture's 5-level walk-up (capture-QM2JRH7T.js:631-653). The HeyGen loader walks up too (media-use/audio/scripts/lib/heygen.mjs:20-47), and the CLI loads the cwd `.env` (cli.js:165-190).
  - Inference: run inside a client's repo, #7 would send the client's page images to Gemini on the client's key, and bill HeyGen to their key.
- **Model ids churn.** Two Gemini/Imagen retirements broke VWC's image script within 6 months (PR #1266; `git log --follow scripts/generate-blog-image.ts`, research).
- **Upstream moves fast.** There were 30 CLI releases between 0.8.61 (2026-09-22 15:54, the reel's pin) and 0.8.91 (2026-09-29 06:58) (`npm view hyperframes time`). `HYPERFRAMES_NO_UPDATE_CHECK=1` and `HYPERFRAMES_NO_AUTO_INSTALL=1` turn off the update check and auto-install (HF 0.8.91 `autoUpdate-HPWJQCEJ.js:40, :238`).
- **Node split.** HyperFrames needs Node ≥22 and the VWC app pins 20. The VWC skill hard-codes `~/.nvm/versions/node/v24.14.1` (vwc SKILL.md:40-45).
- **espeak-ng path length (inference on the cause).** In a venv under a 215-char path, phonemizer failed with `Error processing file '…/kvenv/lib/phontab'` until a short relative data path was forced (Kokoro probe). Keep any skill-managed Python venv on a short path.

**Privacy and leakage:**
- **Public feedback.** The CLI skill tells agents to send `npx hyperframes feedback` after each render "unless telemetry is disabled or the user opted out", and says "feedback is submitted to a public channel". `--file-issue` "publishes a minimal reproduction to a public URL" (hyperframes-cli/SKILL.md:120-126). The telemetry opt-out is `HYPERFRAMES_NO_TELEMETRY=1` (hyperframes-cli/references/upgrade-info-misc.md:100-106).
- **Free-tier Gemini data** is marked "Used to improve our products: Yes"; paid tier says "No" (ai.google.dev/gemini-api/docs/pricing, read 2026-09-29).
- **HeyGen takes a training license.** Paid plans grant HeyGen "a license to … use … Your Content … including to train or otherwise improve … our artificial intelligence and machine learning models", and no opt-out appears in §3 (heygen.com/terms, last updated 2026-07-23, read 2026-09-29). A client's product-sheet text sent for TTS falls under this.

**Output and licensing:**
- **HeyGen Free Plan output is non-commercial.** §4 grants a license "solely for personal, non-commercial, and internal evaluation purposes". §3 (Creator, Pro and Business plans) says HeyGen "does not restrict your ability to use User Output for your own purposes (including for commercial purposes)" (heygen.com/terms, read 2026-09-29).
  - A small-business explainer is commercial use. Inference: HeyGen voice or music is safe only on a paid plan.
  - The ToS does not name API-wallet or pay-as-you-go keys, and has no clause on stock or catalog music (read 2026-09-29).
  - The music search API reference states no license either (developers.heygen.com/reference/search-audio-music-or-sound-effects.md, read 2026-09-29).
- **The "10 min/month OAuth allowance" is unverified.** Its only source is tts.md:63. HeyGen's docs index lists no free monthly allowance (developers.heygen.com/llms.txt, read 2026-09-29), and the MCP overview says OAuth usage draws "the credits included in your existing HeyGen plan" (developers.heygen.com/mcp/overview.md). [issue-8.md](issue-8.md) states the allowance as fact and should be corrected to match. Even if it exists, a Free Plan allowance would be non-commercial under §4.
- **Output lands inside the caller repo by default.** `videos/` is excluded only in VWC's local `.git/info/exclude:21`.
- **MusicGen weights are CC-BY-NC 4.0** (hf.co/facebook/musicgen-small, license tag), which is unsafe for commercial use.

## Dependencies

**Issues:**
- **#3** is a hard dependency. It provides the brand pack (`brand/` with colors, fonts, logo, voice and copy rules) and a copy gate that "enforces the pack's own rules" (gh issue view 3, body lines 16-17). #7's claims gate should extend that engine, not fork it. #3 also supplies the logo, which loopback and file:// captures cannot download.
- **#9** is a hard dependency for criterion 4 and for CI fixtures (gh issue view 9).
- **#2** is a soft dependency ("builds on"). It supplies loudness and WAV helpers, the storage adapter if outputs are hosted, and the `--dry` conventions (gh issue view 2).
- **[issue-1.md](issue-1.md), decision 12:** output goes to `~/.cache/hashflag/<skill>/`.
- **Repo bootstrap:** an initial commit on `main`, a LICENSE and CI (`gh api …/commits` returns 409).

**Tools:**
- Node ≥22.
- FFmpeg and FFprobe.
- chrome-headless-shell in `~/.cache/hyperframes/chrome`. `npx hyperframes doctor --json` always exits 0, so gate on `.ok` (hyperframes-cli/references/doctor-browser.md:5-57, research).
- Kokoro: Python 3.10+ (the CLI message says 3.10+, synthesize-K62TIZWI.js:124) with `kokoro-onnx soundfile`, plus about 338 MB of model files (media-use/audio/references/requirements.md:9-28, research). Licenses:
  - Kokoro-82M weights: Apache-2.0 (hf.co/hexgrad/Kokoro-82M).
  - kokoro-onnx: MIT (`gh api repos/thewh1teagle/kokoro-onnx`).
  - espeak-ng: GPL-3.0 (`gh api repos/espeak-ng/espeak-ng`), loaded at runtime as a shared library via espeakng-loader. Inference: don't vendor it into the repo without a license review.
- Whisper or Parakeet for word timings when the provider gives none (research).
- For document input: pdf-parse and mammoth, or equivalents (parse-resume.ts:90-102).

**Accounts and keys (all optional; an offline run needs none):**
- `HEYGEN_API_KEY` or `~/.heygen/credentials`: a paid plan is needed for commercial output (ToS §3/§4).
- `ELEVENLABS_API_KEY`.
- `OPENROUTER_API_KEY`, `GEMINI_API_KEY`/`GOOGLE_API_KEY`, or the Vertex pair. These trigger capture vision automatically, including from a walked-up `.env`, unless `--skip-vision` is passed (capture-QM2JRH7T.js:1034-1043, :631-653).
- Cloudinary, only if hosting.

**Third-party terms:**
- GSAP 3.14.2 from jsDelivr in every index.html (assemble-index.mjs:729), under the GSAP Standard License, which is not OSI (hyperframes CREDITS.md, research).
- Bundled SFX are under the Pixabay Content License (media-use/audio/assets/sfx/CREDITS.md:3-31).
- HeyGen catalog music license: not stated in any public HeyGen page checked (see Lessons).

## Cost

| Item | Per 45-90 s run | Math and source |
|---|---|---|
| Narration, HeyGen Starfish (Enterprise rate) | $0.0075-$0.015 | 0.000333 credits/s × $0.50/credit × 45-90 s (developers.heygen.com/docs/enterprise-pricing.md, read 2026-09-29). Self-serve "bills in USD" (same page), but the rate sits at app.heygen.com/developers/api?modal=pricing behind a login: **not researched**. The free-allowance claim is unverified (see Lessons). |
| Narration, Kokoro local | $0 | Local model (tts.md:43) |
| Audio version via Gemini 2.5 Flash Preview TTS (#2's model), paid tier | ≈$0.011-$0.023 | 25 audio tokens/s, derived from "16,384 audio tokens (~655s)" (generate-single-blog-audio.ts:235). 1,125-2,250 tokens × $10/1M. Text in: ≈265 tokens × $0.50/1M ≈ $0.0001 (the 1.33 tokens/word ratio is an assumption). Free tier $0, but its data is used for training (pricing page, 2026-09-29). |
| Same via `gemini-3.8-flash-tts` | ≈$0.010-$0.020 through 2026-12-31, then ≈$0.020-$0.041 | $9/1M, then $18/1M audio out (pricing page). This assumes the same 25 tokens/s, which Google's speech page does not document (ai.google.dev/gemini-api/docs/speech-generation). |
| Same via `gemini-3.8-flash-lite-tts` | ≈$0.007-$0.014, then ≈$0.014-$0.027 | $6/1M, then $12/1M (pricing page); same assumption |
| Capture vision captions (59 images, as in the reel) | ≈$0.018; upper bound ≈$0.06 | Input: `countTokens` gave 1,137 tokens for a 1920x1080 JPEG plus the caption prompt (1,100 image + 37 text), and 1,101 for 400x300. So ≈59 × 1,137 = 67,083 tokens × $0.25/1M = $0.017. Output: the reel's captions average 12.9 words (764 words ≈ 1,016 tokens at the assumed 1.33) × $1.50/1M ≈ $0.0015, with no thinking tokens (`thinkingBudget: 0`, :1140). Upper bound if every call hit the 500-token cap: 59 × 500 × $1.50/1M = $0.044 more. The price is the GA flash-lite price; that the preview id bills the same is an assumption. $0 with `--skip-vision`. |
| BGM retrieval (HeyGen) | Unknown | The API reference states no cost (search-audio-…md, read 2026-09-29) |
| Render | $0 local. HeyGen cloud at the Enterprise rate: $0.0375-$0.075 | 0.1 credits/min at 1080p/30 fps × 0.75-1.5 min × $0.50 (enterprise-pricing.md, "HyperFrames" table) |
| Claude tokens (orchestrator plus one sub-agent per frame) | Unknown, likely the largest cost (inference) | Not researched |
| Optional Cloudinary hosting | Audio ≈10 transformations. Video: 1 upload tx, and each HD derived version is 4 tx/s × 90 s = 360 tx = 0.36 credit. | cloudinary.com/documentation/transformation_counts; the Free plan is 25 credits/month (read 2026-09-29) |

Known API spend per run:
- Offline (Kokoro, `music: none`, `--skip-vision`, local render): **$0**.
- Typical paid (HeyGen voice plus vision, local render): about **$0.03**.
- Every paid option at 90 s, Enterprise rates, including the ≈$0.06 vision upper bound: up to about **$0.17**.
- All three exclude self-serve USD rates, BGM and Claude tokens.

## Acceptance criteria, mapped

1. **"The input is a URL or a document. The outputs are a 45 to 90 second explainer video and an audio version."**
   - *Already satisfies:*
     - URL capture, including `http://127.0.0.1` and `file://` URLs (probe), and the no-capture text path (SKILL.md:53-83).
     - The MP4 carries AAC narration (ffprobe of the reel).
     - Per-line WAVs at `assets/voice/<id>.wav` (audio.mjs:148).
     - Duration follows the brief, and real voice duration wins after sync (SKILL.md:109, :171-175).
   - *Missing:*
     - PDF, DOCX or MD to `visible-text.txt`.
     - A hard 45-90 s check. Assembly only "reports where the cut lands" (:109).
     - An audio-version export: concatenate the WAVs in order, or `ffmpeg -vn` from the MP4.
     - A voice-count check.
     - A word budget per voice (132 vs 187 wpm, see Formats and pacing).
   - *Risks:*
     - Bot walls hard-stop capture.
     - Short or split text is dropped (probe).
     - Target-site fonts are imported.
     - A partial TTS failure exits 0.
     - Loopback and file:// captures bring no images (probe).
2. **"Claims about the product come only from the source; pricing and guarantees are never invented."**
   - *Already satisfies:* soft doctrine (story-spine.md:43), the preset numerals rule (FRAME.md:286-300) and check-copy's `--numerals` list (:91-115).
   - *Missing:*
     - A hard gate that matches every numeral and every price, guarantee or free-offer term in SCRIPT.md, the STORYBOARD.md voiceover and on-screen text, frames/*.html and captions.html against a confirmed facts ledger, after normalizing spelled-out numbers ("forty-nine" ↔ "49").
     - Example terms (my proposal): `$`, "free", "no credit card", "guarantee", "money-back", "warranty", "risk-free", "% off", "starting at", "same-day", "licensed", "insured", "best", "#1".
   - *Risks:*
     - The script bank and persuasion menu push toward exactly these lines (story-design.md:285, 349, 365, 381, 493).
     - Split prices vanish, and **hidden stale prices or guarantees enter `visible-text.txt`** (probe). Matching against raw capture would pass "satisfaction guaranteed" from a hidden block.
     - The page's own unsourced claims pass a fidelity gate (the 4.9/5.0 lesson).
3. **"The call to action text and link are configurable."**
   - *Already satisfies:* end-card copy is free text in STORYBOARD.md. VWC's CTA-verb rules exist in check-copy (:23-27).
   - *Missing:*
     - `cta_text`, `cta_url` and `cta_spoken` fields: a brand-pack default plus a per-run override.
     - A verb check against the pack.
     - The literal URL on the end card, with the spoken form in SCRIPT.md.
     - A claims-gate allowlist for these values.
     - A video link cannot be clicked, so "link" means printed plus spoken (inference).
   - *Risks:*
     - Kokoro turns "." inside a URL into punctuation, spells out `https://www`, and misreads "$49" and phone numbers (Kokoro probe).
     - Other engines are untested.
     - A long URL can overflow the end card.
4. **"It works on a real small-business page, with permission, or on a realistic public sample."**
   - *Already satisfies:*
     - #9's spec for `small-business/service-page.md` with the no-prices and "call for a quote" trap.
     - The reel, as proof that a real-site capture runs end to end.
     - `file://` capture of static HTML works (probe).
   - *Missing:*
     - The fixture (#9 not done).
     - An HTML render of the `.md` fixture for the URL path.
     - An eval asserting that no unsourced price or guarantee term appears.
     - A written-permission record, kept out of the repo, if a real business is used.
   - *Risks:*
     - A real business's page or logo in a public README without permission.
     - Captured fonts and images are licensed.
     - HeyGen Free Plan output is non-commercial (ToS §4).
     - The HeyGen music license is unstated.

## Open decisions for the owner

1. **Base pipeline.** Recommended: wrap **product-launch-video**, with #3's brand-pack override replacing its Step 2, the way vwc-faceless-explainer overrides faceless-explainer. Why:
   - It already has URL capture, the no-capture path and "sell or show".
   - Both pipelines share the `capture/extracted` contract.
   - build-frame cannot express a two-font brand.
2. **What "audio version" means.** Recommended: narration only, built from the approved `assets/voice/*.wav` in frame order, loudness-normalized, as MP3. A music mix via `ffmpeg -vn` can be a flag. Why:
   - It is the reviewed script.
   - It needs no extra API call.
   - It doesn't wait on #2.
3. **Claims-gate strictness.** Recommended: **hard fail** on any numeral, price, guarantee or free-offer term that is not in the confirmed facts ledger, and a **sign-off list** for superlatives, ratings and capabilities. Why:
   - The issue says "never invented".
   - A sign-off-only list is what let "2027 Cohort" through in #3's run (research).
4. **Source of truth.** Recommended: a `facts.md` ledger (claim → source line), seeded from `visible-text.txt` or the document and confirmed at the storyboard gate. Every seeded price, guarantee or rating is shown for confirmation. Why: capture drops split figures and keeps hidden nested text (both confirmed by probe).
5. **Unsourced claims on the source page itself.** Recommended: allow them, since they are in the source, but list ratings, stats and superlatives for owner sign-off, and share this list with #5. Why: #1418 showed that live pages carry unsourced numbers.
6. **CTA configuration.** Recommended:
   - The brand pack sets the default `cta_text`, `cta_url` and `cta_spoken`, and `--cta-text`, `--cta-url` and `--cta-spoken` override them per run.
   - `cta_spoken` defaults to a derived form ("dot", "slash", no scheme or `www`, phone digits grouped), shown at the storyboard gate for editing.
   - `cta_text` is checked against the pack's copy rules, and bypassing needs an explicit flag.

   Why:
   - Kokoro reads raw URLs, phone numbers and prices wrongly (probe).
   - #3's gate already owns CTA verbs.
7. **Default TTS provider.** Recommended: **Kokoro by default**. Use HeyGen only when the user confirms a paid HeyGen plan (Creator, Pro or Business), and record that in BRIEF.md. Why:
   - Free Plan output is "non-commercial" (ToS §4).
   - HeyGen takes a training license on content (§3).
   - The 10 min/month allowance is unverified.
   - CI can't hold paid keys.
8. **Music.** Recommended: `music: none` by default. Otherwise use a user-supplied track with a stated license, or HeyGen retrieval only on a confirmed paid plan with the catalog-license gap disclosed. Never MusicGen. Why:
   - MusicGen is CC-BY-NC 4.0.
   - HeyGen publishes no music license (see Lessons).
9. **Sample for criterion 4.** Recommended: #9's fixture, rendered to static HTML and captured through `file://` for the URL path (no port or server to manage; tested), and read as `.md` for the document path. The logo and images come from the fictional brand pack. Use a real business only with written permission, kept out of the repo. Why:
   - There is no licensing or consent exposure.
   - Loopback and file:// fetch no assets anyway (probe).
10. **Output location.** Recommended: `~/.cache/hashflag/product-explainer/<slug>/`, XDG-aware like pr-to-video's resolver (project-dir.mjs:34-53), with a `--project-dir` override. Run every `npx hyperframes` command with the cwd set to the project dir. Why:
    - It matches [issue-1.md](issue-1.md) decision 12.
    - `videos/` is ignored only locally in VWC.
    - From `<project>/capture`, capture's 5-level `.env` walk-up covers capture, `<slug>`, product-explainer, hashflag and `.cache`, and never reaches the caller's repo (arithmetic from capture-QM2JRH7T.js:631-653). That keeps a client's keys out.
11. **Default aspect.** Recommended: 16:9, with a `--format 1080x1920` option. Why: the route maps website embeds to 16:9 (routes/product-launch-video.md:9-10), and small-business social use is likely 9:16 (inference).
12. **Pin and harden HyperFrames.** Recommended:
    - Pin one version (0.8.91 at the time of writing).
    - Set `HYPERFRAMES_SKIP_SKILLS=1`, `HYPERFRAMES_NO_UPDATE_CHECK=1`, `HYPERFRAMES_NO_AUTO_INSTALL=1` and `HYPERFRAMES_NO_TELEMETRY=1`.
    - Never run `feedback` or `--file-issue` on client material.
    - Default to `--skip-vision`. When the user opts in, set `HYPERFRAMES_GEMINI_MODEL=gemini-3.1-flash-lite`.

    Why:
    - There were 30 releases in 7 days.
    - Feedback goes to a public channel.
    - Vision sends client images to a third party, on a walked-up key.
    - The preview id is documented as shut down but still served as of 2026-09-29, so skipping vision is a precaution, not a fix.
    - This deliberately departs from SKILL.md:58's "only when intentionally disabled" and must be stated in the wrapper.
    - Coordinate with #3.

## Suggested build plan

Owner rules apply to every step: a branch per change off `main`, one PR per issue, and Conventional Commits (owner decision). No AI attribution in commits, PRs or docs (owner rule).

1. **Preconditions.** Bootstrap the repo, then merge #3's brand-pack schema and gate engine and #9's small-business fixture. *Verify:* `gh api repos/Vets-Who-Code/hashflag-skills/commits` returns commits, and `fixtures/small-business/service-page.md` exists with no `$`.
2. **Write failing claims-gate tests** (node:test, as upstream does).
   - A SCRIPT.md containing "$49", "forty-nine dollars", "free estimate", "satisfaction guaranteed" or "No credit card" must fail against the fixture ledger.
   - Verbatim fixture phrases, including "call for a quote", must pass.
   - Also cover a tab-indented line, a frames/*.html figure, and "Do not wait — sign up today."
   - *Verify:* `node --test` shows the tests red.
3. **Implement `check-claims`** on #3's engine: normalized digits, spelled-out numbers and the term list, across all viewer-facing targets, matched against `facts.md`, with an allowlist for `cta_*`. *Verify:* step 2 goes green and `--self-check` passes. Against `videos/vets-who-code-reel` it lists "4.9/5.0".
4. **Input adapter.**
   - URL: `hyperframes capture --json --skip-vision -o <fresh dir>`, honoring the hard stops.
   - `.md`/`.txt`/`.pdf`/`.docx`: the no-capture path.
   - Seed `facts.md` from the result and flag every price, guarantee or rating for confirmation.

   *Verify:*
   - The fixture captured via `file://` gives `ok:true` and every FAQ answer appears in `visible-text.txt`.
   - A planted hidden `<div style="display:none"><p>$120, satisfaction guaranteed</p></div>` appears in `visible-text.txt` (this documents the hazard) and is flagged in `facts.md`.
   - An unreachable URL exits non-zero with the reason.
5. **SKILL.md wrapper.**
   - Step 0: check Node ≥22 via `doctor --json` `.ok`, set the pin and env flags, and set the cwd to the project dir under `~/.cache/hashflag/product-explainer/`.
   - Step 2: stage #3's brand pack.
   - Step 3: build the facts ledger, set the word budget from the chosen voice's pace, set the CTA from config, and run the copy and claims gates before approval.
   - Step 6: rerun both gates before render.

   *Verify:*
   - A fixture run stops at the storyboard gate with both gates green and the CTA taken from config.
   - With a dummy `.env` holding `GEMINI_API_KEY` in the caller's cwd, the capture phase log shows `"phase":"vision","status":"degraded","reason":"disabled"` (the observed probe output with `--skip-vision`).
6. **CTA spoken form.** Derive `cta_spoken` from `cta_url` and phone numbers, and show it at the gate. *Verify:* run the Kokoro phonemizer (kokoro-onnx `Tokenizer().phonemize`, no model download) on the SCRIPT.md CTA line. It contains `dˈɑːt` and `slˈæʃ` where expected, and no `eɪtʃtˌiːtˈiːpˌiː` (the spelled-out "https").
7. **Audio-version export.** Assert voices == SCRIPT.md lines, concatenate `assets/voice/*.wav`, normalize loudness, and write `renders/audio.mp3`. *Verify:* the ffprobe duration is within about 1 s of `total_duration_s`, and the voice count equals the line count.
8. **Length gate.** Run it after `sync-durations`: the render must be within [45, 90] s. *Verify:* ffprobe on `renders/video.mp4`.
9. **`--dry`.** Print word count, estimated seconds per voice, per-provider TTS cost, whether vision will run, and the gate results, with no paid calls. *Verify:* it exits 0 with all keys unset, run with the network blocked.
10. **End to end on the fixture.** Run the document path and the `file://` URL path, offline with Kokoro, `music: none`. *Verify:*
    - 2 MP4s of 45-90 s and 2 audio files.
    - The claims gate is green.
    - `grep -iE '\$|free|guarantee'` over SCRIPT.md, STORYBOARD.md and frames matches nothing that is absent from `facts.md`.
    - "call for a quote" is kept as the pricing answer.
11. **CI and README.** CI runs the gate and phonemizer tests on fixtures, with no keys and no render. The README shows a before and after using fixture excerpts and the contact sheet. *Verify:* CI is green on the PR, and the README renders.

Not researched:
- ElevenLabs pricing and URL reading.
- HeyGen self-serve USD rates, BGM cost and the catalog-music license.
- Whether HeyGen API-wallet usage counts as a "paid plan" under ToS §3.
- How HeyGen and Gemini TTS read URLs.
- Words per minute for Kokoro and HeyGen voices.
- Whether `generateContent` on `gemini-3.1-flash-lite-preview` still succeeds (only metadata and countTokens were tested).
- Claude token cost per run.
- Capture behavior on Wix, Squarespace and Shopify pages.
- The legal permission or ToS picture for capturing a real business site.

## Sources

**hashflag-skills:**
- Issues #1, #2, #3, #7 and #9 (`gh issue view … -R Vets-Who-Code/hashflag-skills`), `gh issue list --state all`, `gh api repos/Vets-Who-Code/hashflag-skills` and `…/commits` (all 2026-09-29).
- [issue-1.md](issue-1.md), decision 12.

**Local skills:**
- `~/.claude/skills/product-launch-video/`:
  - `SKILL.md` (:32-239)
  - `references/story-design.md` (:24, :32-55, :285, :349, :365, :381, :419-430, :493-508)
  - `scripts/build-frame.mjs:335-336, 515`
  - `scripts/assemble-index.mjs:683-690, 729`
  - `scripts/audio.mjs:11-14`
  - `scripts/capture-skill-guardrails.test.mjs`
- `~/.claude/skills/faceless-explainer/SKILL.md:47-60`; `scripts/lib/dimensions.mjs`.
- `~/.claude/skills/hyperframes/references/`: `routes/{product-launch-video,faceless-explainer}.md`, `brief-contract.md` and `skill-lifecycle.md:12-14`.
- `~/.claude/skills/hyperframes-creative/`: `frame-presets/*/FRAME.md` (blue-professional :286-300), `references/story-spine.md:43` and `references/narration.md:7`.
- `~/.claude/skills/hyperframes-cli/SKILL.md:120-126`; `references/upgrade-info-misc.md:100-106`, `init-and-scaffold.md:42-55` and `doctor-browser.md`.
- `~/.claude/skills/media-use/audio/`:
  - `scripts/audio.mjs:148, 160, 291-294`
  - `scripts/lib/tts.mjs:11, 283`
  - `scripts/lib/heygen.mjs:20-47`
  - `references/tts.md:40-43, 47-81, 109`
  - `references/requirements.md`
  - `assets/sfx/CREDITS.md`
- `~/.claude/skills/pr-to-video/`: `scripts/project-dir.mjs:34-53`, `scripts/preflight.mjs:12-27` and `references/story-design.md:175-184`.
- `~/.claude/skills/motion-graphics/grounding/PROTOCOL.md` and `categories/webpage/module.md`.
- `~/.claude/skills/vwc-faceless-explainer/SKILL.md:40-74, 174-272`; `scripts/check-copy.mjs:2-4, 23-27, 50, 91-115, 149-199`.
- `~/.claude/skills/copywriting/SKILL.md` and `references/copy-frameworks.md` (via research).

**vets-who-code-app:**
- `src/pages/api/jobs/parse-resume.ts:90-102`
- `node_modules/{mammoth,pdf-parse}/package.json`
- `src/data/outcomes.ts:1-40`
- `scripts/generate-single-blog-audio.ts:6, 235-247, 298, 327`
- `.git/info/exclude:21` and `.gitignore`
- `.env` (key names only)
- `videos/vets-who-code-reel/`: `BRIEF.md`, `package.json:6-8`, `capture/extracted/visible-text.txt:69-120`, `capture/extracted/asset-descriptions.md`, `capture/assets/fonts/` and `renders/video.mp4`
- `~/.cache/hyperframes/optional/@google__genai@1.52.0` (`ls -la`)

**PRs:** vets-who-code-app #1418 (outcomes single source, merged 2026-09-26) and #1266 (model migration; `git log`, research).

**HF 0.8.91 npm tarball** (`npm pack hyperframes@0.8.91`, shasum `35c5162884cd010762979cfca4f516949af3b8a0`):
- `dist/capture-ZMZFCHW4.js:132-137, 259`
- `dist/capture-QM2JRH7T.js:631-661, 722, 730-760, 985-1009, 1034-1049, 1140, 1153, 1195, 1283, 1422, 2767, 3831`
- `dist/chunk-Z6Z7KGEU.js:759-772`
- `dist/chunk-S6YCUTNM.js:9636-9676`
- `dist/cli.js:165-190`
- `dist/autoUpdate-HPWJQCEJ.js:40, 238`
- `dist/synthesize-K62TIZWI.js:39-42, 95, 120-134`
- `dist/chunk-XZABUQTX.js:20-22`

Older versions in `~/.npm/_npx/*/node_modules/hyperframes` (0.8.60, 0.8.61, 0.8.66, 0.8.67). `npm view hyperframes time` and `version`.

**kokoro-onnx 0.6.1:** `kokoro_onnx/tokenizer.py:64-90`. Also phonemizer 3.4.0 `backend/espeak/{wrapper,api}.py` and espeakng-loader 0.2.4 (pip, 2026-09-29).

**Web** (all read 2026-09-29):
- https://ai.google.dev/gemini-api/docs/pricing, /changelog, /deprecations, /speech-generation, /audio
- Gemini API `v1beta/models/{gemini-3.1-flash-lite-preview,gemini-3.1-flash-lite}` (GET) and `:countTokens` (POST)
- https://www.heygen.com/terms (§3, §4; last updated 2026-07-23)
- https://developers.heygen.com/llms.txt, /docs/enterprise-pricing.md, /mcp/overview.md, /reference/generate-speech.md, /reference/search-audio-music-or-sound-effects.md
- https://help.heygen.com/en/articles/15001510-hyperframes-x-heygen (no billing content)
- https://hf.co/hexgrad/Kokoro-82M and https://hf.co/facebook/musicgen-small (license tags)
- `gh api repos/thewh1teagle/kokoro-onnx` and `repos/espeak-ng/espeak-ng` (licenses)
- https://cloudinary.com/pricing and https://cloudinary.com/documentation/transformation_counts; https://pixabay.com/service/license-summary/; https://gsap.com/standard-license (via research)

**Research side effects:**
- `hyperframes@0.8.91` was added to the `~/.npm/_npx` cache.
- A local `http.server` on 127.0.0.1:8765 was started and stopped.
- Free Gemini `models.get` and `countTokens` calls were made with the vets-who-code-app key. No generation calls were made.
- No repo, GitHub or paid-API writes.