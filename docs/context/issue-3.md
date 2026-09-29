# #3 [Skill]: Brand pack and brand-locked explainer video: context

Read on 2026-09-29. Path shorthands used below:
- `VFE/` = `~/.claude/skills/vwc-faceless-explainer/`
- `FE/` = `~/.claude/skills/faceless-explainer/`
- `MU/` = `~/.claude/skills/media-use/`
- `HC/` = `~/.claude/skills/hyperframes-creative/`
- `HF/` = `~/.claude/skills/hyperframes/`
- `APP/` = the vets-who-code-app repository (HEAD b7c19088)
- `RUN/` = `APP/videos/labor-day-sprint-proof-of-work/`
- `[issue-N.md](issue-N.md) dK` = decision K in the context doc for hashflag-skills #N (docs/context/issue-N.md). This doc is docs/context/issue-3.md.

**Issue text.** The goal is to generalize `vwc-faceless-explainer` so any org can make a faceless explainer in its own brand. The issue records one lesson: the auto-generated frame spec "could not express VWC's brand", so `brand/frame.md` is hand-written. There are five acceptance criteria (ACs), mapped below. The issue is open, labelled `enhancement`, and has no comments (gh issue view 3 -R Vets-Who-Code/hashflag-skills).

**Target repo.** hashflag-skills is private, size 0, has no license, and was last pushed 2026-09-26. `default_branch` is set to `main` but no branch exists (gh api repos/Vets-Who-Code/hashflag-skills). Epic #1's sub-issues are #2 through #8. **#9 is not linked**, even though it supplies #3's fictional brands (gh api …/issues/1/sub_issues → `2 3 4 5 6 7 8`).

## What exists today

### The wrapper to generalize (local only, not in git)

| Path | What it does | Source |
|---|---|---|
| `VFE/SKILL.md` (304 lines) | Runs upstream `faceless-explainer` and overrides Steps 1, 2, 3 and 6. It holds the copy-law table, voice rules, the 7-frame story shape, the casing rule, prosody rules, the music-only switch, the silent-cut rebuild, the registry audit and the `#root` fix. | VFE/SKILL.md:20-34,106-153,170-273 |
| `VFE/brand/frame.md` (439 lines) | Hand-written, normative VWC video spec. YAML frontmatter has 18 `colors` keys, 15 typography roles in cqw, spacing and components. Prose covers registers, 7 treatments, a self-audit, Known Gaps and an `@font-face` block. The file says its "Structural bones [are] adapted from the broadside preset". | VFE/brand/frame.md:1-32,400-439; 18 = awk count of the `colors:` block, 2026-09-29 |
| `VFE/brand/caption-skin.html` (225 lines) | Token-strict caption skin that stays readable wherever the playhead is seeked. It differs from broadside's skin only in two font fallbacks (`"GothamPro"` :82, `"JetBrains Mono"` :117) and `text-transform: uppercase` (:87). The color fallbacks are still broadside's `#111111`/`#e85d26`/`#f0ece5`. | VFE/brand/caption-skin.html:73-127; diff vs HC/frame-presets/broadside/caption-skin.html (research) |
| `VFE/brand/fonts/` | Gilroy-Regular and Semibold, GothamPro-Bold and Black, JetBrainsMono-400 and 700 as woff2, plus `OFL-jetbrains-mono.txt`. The four Gilroy/Gotham files are byte-identical to `APP/public/fonts/{gilroy,gotham}/`. The JetBrains Mono files and the OFL text are byte-identical to upstream `HC/frame-presets/code-editorial/fonts/`, so their provenance is clean. | `shasum` 2026-09-29: Gilroy-Regular `b815919dfef0eea7ce3bd8bdd920faacd1f9e2c4`, Gilroy-Semibold `ca3de899356c1a3cebe50de5045ce456c788da4e`, GothamPro-Black `027684bb643a9f2d9f8fb2153601481c00c9b9a6`, GothamPro-Bold `e0d7f063e8c2d6b420c4a3216b08b304b833b711`; JBM-400 `3ae62151…`, JBM-700 `e67f8fef…`, OFL `4d9569f1…` on both sides |
| `VFE/scripts/check-copy.mjs` (201 lines, no dependencies, no license header) | Copy gate. `RULES` holds 15 regex/fix pairs (:20-38) and `ALLOW` holds span allowlists plus a prohibition cue (:43-51). It exports `scan()` (:64) and `numerals()` (:98). `selfCheck()` has 23 assertions (:117-147). It scans SCRIPT.md, STORYBOARD.md, compositions/captions.html and compositions/frames/*.html, and exits 1 on any hit. `--self-check` passes today. | check-copy.mjs:1-10; 23 = count of `a(` calls in :117-147, 2026-09-29; `node check-copy.mjs --self-check` → exit 0 |

**Provenance of VFE.** `~/.claude/skills` is not a git repo, so this folder is the only copy (research: `git rev-parse` fails there). The owner's Claude Code session transcript `d983056c-6624-4202-bb84-fcb6dc0ed6e9.jsonl` shows how the files were made. It holds `Write` calls for `brand/frame.md` (2026-09-23T18:14:45Z), `scripts/check-copy.mjs` (18:15:08Z, rewritten 18:37:56Z) and `SKILL.md` (18:15:51Z), followed by `Edit` calls through 20:59:49Z. The last check-copy edit (19:35:22Z) matches the file's mtime (15:35:30 local). No other author appears (node scan of the transcript's tool_use blocks; `stat`). The transcript supports "no outside contributors", but there is no VCS history, so the owner should confirm it himself.

### Upstream machinery it delegates to (HyperFrames, Apache-2.0, `heygen-com/hyperframes`)

| Path | What it does | Source |
|---|---|---|
| `FE/scripts/build-frame.mjs` | Step 2. Copies a preset's FRAME.md to frame.md, remaps colors and fontFamily onto tokens.json, copies caption-skin.html, then validates. Flags: `--preset`, `--tokens`, `--preset-dir`. | FE/scripts/build-frame.mjs:1-20,58 |
| `FE/scripts/lib/tokens.mjs` | `parseColors`/`semanticColors`/`parseFonts`. These decide which colors become ink, canvas, accent and accent2 for captions and `#root`. | tokens.mjs:7,142,172 (exports); :28-60,140-170 |
| `FE/scripts/captions.mjs` | Karaoke caption builder. Takes `--skin`, `--frame`, `--storyboard`, `--audio-meta`, `--out`. Fills the skin's reserved holes and injects tokens. | captions.mjs:67-79,229-281,402-421 |
| `FE/scripts/assemble-index.mjs` | Builds `index.html` and paints `#root` from the frame.md `canvas` role. | assemble-index.mjs:535-567,606 |
| `FE/scripts/audio.mjs` | Faceless adapter over the shared engine. Flags: `--voice`, `--speed`, plus the `sync-durations` and `fetch-sfx` subcommands. It hard-codes `provider: "auto"`. `music: none` in the storyboard YAML sets BGM mode `none`; any other value sets `retrieve`. | FE/scripts/audio.mjs:129-134,145-175; FE/SKILL.md:104,142 |
| `FE/scripts/frame-packets.mjs`, `transitions.mjs` | Per-frame sub-agent packets; transition injection and verification. | FE/SKILL.md:148-200 |
| `MU/audio/scripts/audio.mjs`, `lib/tts.mjs`, `lib/heygen.mjs`, `heygen-tts.mjs` | Shared TTS/BGM/SFX engine. The engine takes `--provider` (auto, heygen, elevenlabs or kokoro), but the faceless adapter never passes it. `heygen-tts.mjs --list` lists Starfish voices. | MU/audio/scripts/audio.mjs:18,130; lib/tts.mjs:37-76,299-345; heygen-tts.mjs:14-16,74-80 |
| `HC/frame-presets/` | 13 presets (FRAME.md + caption-skin.html + frame-showcase.html). Only `code-editorial/fonts/` ships files: EB Garamond, Inter and JetBrains Mono woff2 at 400 and 700, each with its OFL text. | ls 2026-09-29 |
| `HC/templates/design-picker.html` | Two-phase visual chooser (mood boards, palettes, type pairings). It proposes new directions. It does not record an existing brand. | HC/references/design-picker.md:1-40 |
| `MU/scripts/recipe.mjs` | `freeze`/`use` a named look (frame.md plus skeletons). **It does not capture caption-skin.html or fonts.** | MU/scripts/lib/recipe-store.mjs:205-250,325-360 |
| `HF/references/brief-contract.md` | The upstream question protocol: ask one field per message, use native question UI when available, otherwise one plain-text question with one numbered list. Rendering stays user-gated in both modes. | brief-contract.md:51,92-103 |
| `HF/references/subagent-dispatch.md` | Harness-neutral dispatch: "never rely on the child seeing your conversation"; maps to Codex/OpenClaw; fallback is headless CLI workers, then inline execution. | subagent-dispatch.md:7,18-31 |

### VWC brand content (source for VWC's own pack only, never for the public repo)
- Palette scales are at `APP/tailwind.config.js:84-137` and fonts at `:218-223`. Token summary: `APP/docs/DESIGN_DOC.md:305-324`. Signature brand details: `:279-291`.
- The copy law lives at `APP/AGENTS.md:262-268`. It makes Apply and Donate literal and uses "software engineering accelerator".
- Logo variants and rules: `APP/src/pages/press-kit.tsx:14-43`. The cream-reverse transform `e_colorize:100,co_rgb:EEEDE9` is at `APP/src/pages/api/og.tsx:34`.
- Cohort facts are in `APP/src/data/site-config.ts:3-27`, and frame.md says to use them rather than memory (research: frame.md:383).
- The voice pick (Orson) is an owner decision.

### The one real run (regression reference, git-excluded)
- `RUN/` contains:
  - BRIEF.md;
  - STORYBOARD.md (the silent cut);
  - SCRIPT.md.bak (before the prosody lesson);
  - `.narrated-backup/` (narrated SCRIPT, STORYBOARD, audio_meta, caption_groups, frames);
  - `samples/` (5 numbered voice auditions plus A/B takes);
  - audio.log;
  - `index.html` with the `#root` fix;
  - 3 renders.

  (ls 2026-09-29)
- Renders, in timestamp order (ffprobe 2026-09-29):
  - `…15-56-29.mp4`: 75.07 s, 9.61 MB, narrated take 1;
  - `…16-18-17.mp4`: 73.10 s, 9.60 MB, narrated take 2;
  - `…16-59-37.mp4`: 77.50 s, 9.20 MB, silent cut.

  All are H.264 1920x1080 30 fps with AAC 48 kHz stereo (research ffprobe).
- The project pins `npx --yes hyperframes@0.8.66` (RUN/package.json). `videos/` is excluded only through `APP/.git/info/exclude:21`.
- The run holds the licensed fonts under `assets/fonts` (shasum matches above), so it must not be copied as-is.

## How it works now

Step order as run by `vwc-faceless-explainer`:

1. **Step 0, setup.**
   - Run `export PATH=~/.nvm/versions/node/v24.14.1/bin:$PATH`. HyperFrames needs Node >=22 and APP pins 20 (VFE/SKILL.md:40-45; `npm view hyperframes engines.node` → `>=22`).
   - Then run `npx hyperframes init "videos/<project>" --non-interactive --example=blank --skill=faceless-explainer`, write BRIEF.md, and show `npx hyperframes auth status` verbatim (FE/SKILL.md:28-43).
2. **Step 1, overridden.** Write `capture/extracted/visible-text.txt` (the source, verbatim) and `tokens.json` with `colors: []` and `fonts: []` (VFE/SKILL.md:84-92). Then stage the brand (VFE/SKILL.md:60-72):
   - `cp brand/fonts/*.woff2 assets/fonts/`
   - `cp brand/frame.md ./frame.md`
   - `cp brand/caption-skin.html .hyperframes/caption-skin.html`
   - `curl` the cream logotype from VWC's Cloudinary into `public/vwc-logotype.png`
3. **Step 2 is skipped.** `build-frame.mjs` is never run (VFE/SKILL.md:94-99).
4. **Step 3, storyboard and script.** Written under the copy law and the story shape (VFE/SKILL.md:106-153). Then `node VFE/scripts/check-copy.mjs --project . --numerals` must exit 0 before the approval ask (VFE/SKILL.md:155-168).
5. **Step 3.1, audio.** Upstream runs unchanged: `node FE/scripts/audio.mjs --script ./SCRIPT.md --storyboard ./STORYBOARD.md --hyperframes . --out ./audio_meta.json --voice <id> &` (FE/SKILL.md:104).
   - TTS order is HeyGen Starfish, then ElevenLabs, then Kokoro (MU/audio/scripts/lib/tts.mjs:37-50).
   - The HeyGen body is `{text, voice_id, speed, language?}` (tts.mjs:299-311).
   - BGM is `none` when the storyboard says `music: none`, otherwise `retrieve`. An explicit `retrieve` with no HeyGen credential becomes `none` and adds an anomaly. The MusicGen `generate` path is never chosen (FE/scripts/audio.mjs:145-174; MU/audio/scripts/audio.mjs:195-207).
6. **Steps 4-5, visual design and frames.**
   - Upstream runs `audio.mjs sync-durations`, then `fetch-sfx`, then `frame-packets.mjs`, then one sub-agent per frame writes `compositions/frames/NN-*.html`.
   - After that come `captions.mjs build … &` and `assemble-index.mjs` (FE/SKILL.md:142-166).
   - Finally, `#root { background: #091f40; }` is edited into `index.html` by hand (VFE/SKILL.md:266-273).
7. **Step 6, gate and render.**
   - `check-copy.mjs --project .` runs again.
   - Then `transitions.mjs inject`, `transitions.mjs verify`, `npx hyperframes lint`, `check`, `snapshot --at <midpoints>` and `preview --background`.
   - After approval: `render --skill=faceless-explainer --quality high --output renders/video.mp4` (VFE/SKILL.md:275-293; FE/SKILL.md:178-200).

**Constants and formats**
- The default canvas is 1920x1080. Portrait 1080x1920 and square 1080x1080 are also supported (FE/scripts/lib/dimensions.mjs:8-45).
- The caption band is the bottom 16.67%, which is 180 px at 1080, so frame content stays above y=880 (dimensions.mjs; VFE/SKILL.md:225-226).
- Caption groups: `SILENCE_GAP` 0.18 s, `TAIL_PAD` 0.12 s, 2-4 words depending on density (captions.mjs:48-55,121-141).
- The faceless sweet spot is 30-90 s, with a hard cap near 3 min (HF/references/routes/faceless-explainer.md:4).
- The BGM bed sits at 0.12 linear under narration and 0.9 in a silent film (MU/audio/scripts/lib/bgm.mjs:23-28).
- Every `index.html` loads GSAP 3.14.2 from jsDelivr (assemble-index.mjs:581).
- The HeyGen Starfish endpoint is `POST /v3/voices/speech`. It takes `text` of 1-5,000 characters, `voice_id`, `speed` 0.5-2.0, `language`/`locale` and `input_type` ("keep at its default `text`"). "`<break>` is the only markup to include" (developers.heygen.com/docs/voices/speech).

**The voice sets the video length (the basis for a word budget)**
- `sync-durations` writes each frame's duration from its voice line. In the run, the 8 narrated frame durations (7.445 … 7.236 s) equal the 8 `duration_s` values in `.narrated-backup/audio_meta.json`, which sum to 73.091 s. The render is 73.10 s (RUN/.narrated-backup/STORYBOARD.md:40-258; audio_meta.json; ffprobe). **So in a narrated film, duration ≈ the sum of voice durations.**
- In a silent cut, duration is the sum of the storyboard `duration:` values: about 0.4 s per supporting word after it settles, plus a hold of at least 1.2 s (VFE/SKILL.md:227-228; RUN/STORYBOARD.md:3 `duration: 77.5s`).
- Published and measured paces, with what 60-90 s means in words:

| Pace (words/s) | Source | Words for 60 s | Words for 90 s |
|---|---|---|---|
| 2.2 | pr-to-video/references/story-design.md:175,184 ("duration ≈ ceil(words/2.2)") | 132 | 198 |
| 2.3 | HC/references/narration.md:92 (worked example, 140 words in 62 s) | 138 | 207 |
| 2.45 | Orson, take 1: 184 words / 75.049 s (RUN/audio.log) | 147 | 221 |
| 2.5 | HC/references/narration.md:7 | 150 | 225 |
| 2.59 | Orson, take 2: 189 words / 73.091 s (RUN/.narrated-backup/audio_meta.json word arrays) | 155 | 233 |

- The band that lands inside 60-90 s at every pace above is **156-198 words** (60×2.59 and 90×2.2; arithmetic).
- Pace differs between voices. The five numbered auditions in `RUN/samples/` run 8.07-10.16 s (ffprobe). If they share one text, that is about a 26% spread (inference: `samples/list.txt` only concatenates them and does not show the text).
- Kokoro's pace was never measured.

**The hidden brand contract (role mapping)**
- `ink` is the first key matching `/(?:^|[-_])ink(?:[-_]|$)|black|charcoal|^text(?:-dark)?$|outline|noir/i`.
- `canvas` is the first key matching `/cream|paper|canvas|white|bg|ground|surface|base|sand|parchment|off-?white|bone/i`. **`ground` is in the canvas pattern.**
- Accents are the remaining colors ranked by chroma, excluding status keys (tokens.mjs:140-167).
- For VWC's frame.md this gives `{ink #1A1823, canvas #EEEDE9, accent #FDB330, accent2 #c5203e}` and fonts `{display "GothamPro", body "Gilroy", mono null}` (node run of tokens.mjs, 2026-09-29).
- Chroma values are gold 205, red 165 and navy 55, so navy can never be an accent (arithmetic on the hex values).
- The same `canvas` feeds `#root` and `--cap-canvas`, the color of spoken caption text (assemble-index.mjs:537-545; captions.mjs:411, per research).

**Caption skin contract**
- The skin must contain exactly one each of `<style data-brand-tokens></style>`, `var GROUPS = [];`, `var DURATION = 0;`, `data-duration="0"`, `data-width="0"` and `data-height="0"` (captions.mjs:17-31).
- It receives `--cap-ink`, `--cap-canvas`, `--cap-accent`, `--cap-accent-2`, `--font-display`, `--font-body`, `--cap-band-top` and `--cap-band-height` (captions.mjs:402-421).
- Hooks keep their names: `.caption-group`, `.caption-word`, `.is-active`, `.is-spoken`. State changes use `gsap.set({className})`, never `tl.call()` (research: captions.mjs:398-419).

**Copy gate mechanics**
- ALLOW suppresses a rule only when the match sits inside an allowed span. Spans are resolved across the whole wrapped paragraph (check-copy.mjs:40-62).
- `numerals()` looks only at lines with exactly 4 leading spaces, at `- voiceover|vo|narration:` bullets, and at quoted strings (check-copy.mjs:98-115).
- `--numerals` reports on `.md` targets only (check-copy.mjs:183-192).

**Question handling today**
- Upstream intent capture asks in the main conversation, one field per message. It uses native question UI when available and otherwise sends plain text with one numbered list (HF/references/brief-contract.md:92-103).
- In Claude Code, `AskUserQuestion` "is removed from every subagent, even when listed in the `tools` field" (code.claude.com/docs/en/sub-agents).
- Frame workers are sub-agents that get only a packet and a role file (FE/SKILL.md:148-152; subagent-dispatch.md:7), so nothing below the orchestrator can ask the user anything.

## Lessons already paid for

**Generating the frame spec**
- `build-frame.mjs` gives display and body the same font: `bDisplay = bBody = nonMono[0]` (build-frame.mjs:337-338).
- It overwrites frame.md wholesale with `writeFileSync(framePath, md)` (build-frame.mjs:517).
- It has only 4 color roles ranked by chroma, which is why navy never lands (tokens.mjs:142-167; VFE/SKILL.md:30-34).
- Keep `tokens.json` colors and fonts as `[]` so nobody is tempted to run Step 2 (VFE/SKILL.md:84-86).
- Inference, from the build-frame header comment ("Empty brand colors → the preset palette is kept … Empty brand fonts → kept"): with empty tokens, `build-frame.mjs --preset-dir <dir> --preset <name>` copies a FRAME.md verbatim. A pack laid out as a preset directory could be installed without being overwritten. This is untried.
- Key names and key order decide caption colors and the video ground. A key named `ground-navy`, or `charcoal` placed above `ink`, silently repoints them (tokens.mjs:140-167). A generator must never emit a key named `ground`/`bg`/`base` for the video field (inference from the regex).

**Ground and captions**
- `#root` renders cream between navy frames. The hand fix is lost on every re-assemble because index.html is rewritten wholesale (assemble-index.mjs:537-545,606). `transitions.mjs inject` preserves it (research: transitions.mjs:274-300).
- Renaming a color to force navy would make captions unreadable (VFE/SKILL.md:268-269).
- VFE/SKILL.md:269 says "`captions.mjs` has no override flag". That is wrong: `--skin` and `--frame` exist (captions.mjs:73-79). Feeding captions their own frame file is an untried alternative fix (inference).
- If the skin is missing, captions fall back to a built-in Roboto black pill (research: captions.mjs:30,468; VFE/SKILL.md:78-80).
- Don't trust the caption-skin comments. The fallbacks are broadside orange, not VWC colors (caption-skin.html:73-127). `.cap-cta` resolves to red and `.cap-num` to Gilroy, and no code applies either class (research grep).

**Copy gate**
- A false positive is already fixed: "register", because "NAVY register" is frame.md's own vocabulary. The rule was narrowed to `register (now|today|here)` (check-copy.mjs:17-19,26).
- Allowlists already added: "not tutors" and wrapped `never:` lists (check-copy.mjs:43-51; self-check).
- False negatives probed on 2026-09-29 all return `[]` (node probe of `scan`/`numerals`):
  - `"Do not wait — sign up today."` and `"Never miss a cohort: enroll now"`, because the prohibition cue at :50 swallows the rest of the sentence;
  - `"Join our pipeline"`, `"No hand-holding here"`, `"learners and users"`, `"background: white"`, `"#ffffffcc"`, `"Support Our Mission"` and `"APPLY FOR 2027"`;
  - a tab-indented spoken figure, which `numerals()` never lists.
- The docs and the gate have drifted. SKILL.md bans "pipeline" and "hand-holding" (VFE/SKILL.md:115,118), but RULES doesn't (check-copy.mjs:20-38).
- The "curly" quote class in `numerals()` is plain ASCII, so curly-quoted figures are missed (research: `od -c` on :106).
- Frame HTML is never scanned for figures. In the real run, "2027 Cohort" on the end card was never listed (research: RUN/compositions/frames/08-end-card.html:80).
- Casing is written in sentence case and uppercased by CSS. The gate doesn't enforce this (VFE/SKILL.md:150-153; probe).

**Length and word budget**
- The brief asked for 90 s (RUN/BRIEF.md:9, `length: 90s`). The narrated storyboard then set `duration: 75s` (RUN/.narrated-backup/STORYBOARD.md:3), and the silent storyboard set 77.5 s (RUN/STORYBOARD.md:3).
- Measured against those targets:
  - take 1 was 75.07 s (+0.07 s against 75);
  - take 2 was 73.10 s (−1.90 s against 75);
  - the silent cut was 77.50 s, on its own 77.5 s target.

  Against the 90 s brief, every render came in **12.5-16.9 s short** (ffprobe; arithmetic).
- [issue-4.md](issue-4.md) d5 says the run "overshot by 13-17 s". That doesn't match the measurements. The only render over 75 s is the silent cut, which had its own target. The real lesson is that **nothing checks measured length against the brief**. Nothing parses `length:` after Step 0, and the voice, not the storyboard, sets the final duration (see "How it works now").

**Narration and audio**
- The faceless adapter passes only `--voice` and `--speed`, and the engine body is `{text, voice_id, speed, language?}`. Punctuation is the only prosody control the wrapper uses, and a `**Voice settings:**` line is read by nothing (VFE/SKILL.md:174-197; tts.mjs:299-311).
- HeyGen's docs say `<break>` markup is accepted in `text` (developers.heygen.com/docs/voices/speech). It is untested whether `<break>` survives `parseScript`, shows up in captions, or breaks the Kokoro fallback.
- Write the direction for conviction, not calm. The before/after evidence is `RUN/SCRIPT.md.bak` against `RUN/.narrated-backup/SCRIPT.md` (research diff).
- A partial TTS run exits 0. Failed lines become "non-fatal" anomalies and `voices = results.filter(Boolean)` (MU/audio/scripts/audio.mjs:159-173). The adapter prints only `meta.voices.length` (FE/scripts/audio.mjs:181-184). A code comment cites "7/8 lines fail on first run" at concurrency 4 (research: audio.mjs:73-80). Concurrency is `HYPERFRAMES_TTS_CONCURRENCY`, default 4 (MU/audio/scripts/audio.mjs:80).
- Re-runs re-synthesize every line and pay again. Inference from `synthLine`, which overwrites `assets/voice/<id>.wav`.
- The voice isn't pinned. Orson (`00e3d285aba44b27a83c47c02c9c2d9c`) is recorded only as an owner decision, not in VFE (grep) and not in `~/.media/preferences.json` (`"preferences": {}`). With no voice, HeyGen English defaults to Marcia `05f19352e8f74b0392a8f411eba40de1` (tts.mjs:57-66).
- **Forcing Kokoro is not possible through the adapter.** With any HeyGen credential visible, `auto` picks HeyGen (tts.mjs:50). Credentials come from:
  - `HEYGEN_API_KEY` or `HYPERFRAMES_API_KEY`;
  - the first `.env` found up to 5 parent directories up;
  - `${HEYGEN_CONFIG_DIR:-~/.heygen}/credentials`.

  (heygen.mjs:20-60) Inference, untested: setting `HEYGEN_API_KEY=`, `HYPERFRAMES_API_KEY=`, `ELEVENLABS_API_KEY=` (empty) and `HEYGEN_CONFIG_DIR=<empty dir>` falls through to Kokoro, because `.env` loading skips keys already in `process.env` (heygen.mjs:39) and empty strings are falsy (:51).
- Voice ids must be Starfish ids; v2 ids return HTTP 400 (MU/audio/references/tts.md:79, per research).
- The Kokoro default is documented inconsistently: `am_michael` in code, `af_heart` in docs (tts.mjs:61 vs tts.md:103).
- Switching to music-only needs `rm -f SCRIPT.md audio_meta.json audio_engine_meta.json caption_groups.json compositions/captions.html; rm -rf assets/voice` (VFE/SKILL.md:199-213).
- Storyboard `music:` must be a short mood phrase. A long message returned "no music match" (RUN/audio.log; VFE/SKILL.md:215-218).
- A silent cut is a rebuild. `pad-frame-duration` silently does nothing unless a single tag carries both `data-composition-id` and `data-duration` (VFE/SKILL.md:220-234; FE/scripts/lib/pad-frame-duration.mjs:16-35).

**Frames and render**
- Registry `grain-overlay` uses an infinite CSS animation, which is non-deterministic under seek. `comparison-split` ships a 999cqw radius, shadows and color-mix. Use a static fractalNoise data-URI instead (VFE/SKILL.md:255-264).
- The storyboard parser accepts Frame, Beat or Scene at H2 or H3, but frame-packets splits only on `^## Frame` (FE/scripts/lib/storyboard.mjs:17; HF/scripts/lib/frame-packets-core.mjs:35-45).
- The real run produced timestamped renders, not `renders/video.mp4`. Inference: `--output` was omitted (RUN/renders ls; hyperframes-cli/references/preview-render.md:104-143).
- `check` reports 1-4 px `text_box_overflow` on `#caption-word-*`, a known false positive (FE/SKILL.md:192).
- Brand-correct tokens can still fail as text. cream-hint on navy is 3.84:1 and slate on cream 4.0:1, while `hyperframes check` enforces 4.5:1 (frame.md:190-201). Red on navy is 2.85:1 (research WCAG calc).
- frame.md has drifted: the project copy lacks `charcoal` and the WCAG section the skill copy has (research diff of RUN/frame.md vs VFE/brand/frame.md).

**Fonts and licensing**
- Every named family needs an `@font-face` pointing at a shipped file (`font_family_without_font_face`). Webfont CDNs are forbidden (HF/references/frame-worker-core.md:79; frame.md:406-414).
- `document.fonts.ready` resolves even when a font URL 404s, so a missing file falls back silently. This was seen in the blog-graphic renderer (research: APP/scripts/generate-blog-graphic.ts:119). Not researched: whether `hyperframes check` catches a missing font file.
- URL capture downloads the site's fonts: the VWC reel capture pulled Gilroy and Font Awesome Pro files (ls APP/videos/vets-who-code-reel/capture/assets/fonts/).
- **Font file names lie.** `APP/videos/vets-who-code-reel/assets/fonts/Gilroy-ExtraBold.woff2` is byte-identical to `APP/public/fonts/gilroy/Gilroy-UltraLight.woff2` (sha1 `1d2b2e9381e39512fa194f32bb3170ce48489765`). The `.woff` pair matches too (sha1 `1bf99f3c…`) (shasum 2026-09-29). A guard keyed on file names or on a sibling OFL file would miss a renamed commercial file.
- The commercial or restricted font files tracked in APP `public/fonts/` are: Gilroy 30, Gotham 56, Font Awesome Pro 10, Rossela Demo 2. That makes 98 files, not the 4 in VFE. There are also HashFlag (8) and Linea (14) files, whose licenses were not researched (`git ls-files public/fonts`).
- GothamPro weights in the pack are 700 and 900, and frame.md says never to request 600 or 800 (frame.md:226-227). Its claim that GothamPro "ships no true italic" is wrong: APP tracks GothamPro italic files (git ls-files public/fonts/gotham).
- Parts of the pipeline are not open-licensed:
  - GSAP uses the "GSAP Standard License", which is not OSI (upstream CREDITS.md);
  - MusicGen weights are CC-BY-NC (huggingface.co/facebook/musicgen-small);
  - Pixabay SFX can't be redistributed standalone (pixabay license summary).
- Kokoro-82M weights are Apache-2.0 ("can be deployed anywhere from production environments to personal projects") (huggingface.co/hexgrad/Kokoro-82M).
- **HeyGen output rights depend on the plan.** On Creator/Pro/Business plans "you own all rights in your … User Output" and HeyGen "does not restrict … commercial purposes" (heygen.com/terms §3). Free Plan output is licensed "solely for personal, non-commercial, and internal evaluation purposes" and "may not be sold, sublicensed, redistributed, monetized…" (§4). The terms were last updated 2026-07-23.
  - The terms don't say whether API or OAuth-allowance usage counts as the "Free Plan".
  - Neither the terms nor the background-music API page (`/v3/audio/sounds`) says anything about music licensing (heygen.com/terms; developers.heygen.com/background-music).
  - So a README render voiced through a free allowance, or scored with catalog BGM, is not cleared for a public repo (inference).
- **The obvious neutral base looks like another org's brand.** `HC/frame-presets/code-editorial/FRAME.md` uses ink `#141413` and cream `#FAF9F5`. Those are exactly Dark `#141413` and Light `#faf9f5` in the installed Anthropic brand-guidelines skill (…/skills/synced/…/brand-guidelines/SKILL.md:21-22), and the preset adds a coral accent and a "✱ coral spike mark" (code-editorial/FRAME.md:4-8). Shipping it unchanged as the neutral default risks reading as another company's identity, and VWC keeps vendors off its brand surfaces (owner decision). The fonts are safe to reuse; the palette is not (inference).

**Environment and upstream drift**
- hyperframes went from 0.8.66 to 0.8.91 in 6 days (npm view, research). `init` refreshes installed skills unless `HYPERFRAMES_SKIP_SKILLS=1` (HF/references/skill-lifecycle.md:12-14).
- Faceless scripts import from sibling skills by relative path, and upstream #4356 is changing that (research: assemble-index.mjs:60; commit 29fc95395d).
- The HeyGen resolver loads the first `.env` it finds, up to 5 parent directories up. Inference: a run inside a host repo bills that repo's key, and a run under `~/.cache/hashflag/<skill>/<project>/` reaches `~/.env` in 5 steps (MU/audio/scripts/lib/heygen.mjs:20-47).
- The CLI sends telemetry, and its skill tells agents to post feedback publicly after each render. Opt out with `HYPERFRAMES_NO_TELEMETRY=1` (hyperframes-cli/SKILL.md:116,120-126; references/upgrade-info-misc.md:100-113).
- `npx hyperframes auth status` exits 1 when you're signed out, which is normal. Don't chain it with `&&` (product-launch-video/SKILL.md:38).
- Chrome can die at startup inside macOS agent sandboxes (hyperframes-cli/references/doctor-browser.md:34-45). `doctor --json` always exits 0, so gate on `.ok` (same file :5-57).

**Brand sources contradict each other (this matters when capture ingests docs)**
- White is banned in video (frame.md:187-188; check-copy.mjs:36-37), required in image prompts (APP/scripts/image-prompts.ts:14,42,55), and used for the white logo (APP/src/pages/press-kit.tsx:31-33).
- The brand docs break the copy law themselves: "students" (APP/docs/brand-style-guide.md:12), "START YOUR JOURNEY" (APP/docs/DESIGN_DOC.md:20) and "pipeline" (APP/public/llms.txt:36).
- Verbatim testimonials say "frontend developer" and "signed up" (APP/src/data/homepages/index.json:149,160). A gate that rewrites copy would change real people's words (inference).

## Dependencies

- **Issues, and conflicts between their dossiers that must be settled first**
  - **#9 (fixtures).** It defines the minimum `brand.md` fields and wants two clearly different brands "so #3 can show the same script rendered in both". It bans binaries and isn't linked to the epic (gh issue view 9; sub_issues API).
  - **brand.md format: three dossiers disagree.** The newcomer on #9 will pick one unless the owner decides first.
    - [issue-9.md](issue-9.md) d6: fixed `##` headings (Name, Mission, Colors, Fonts, Voice (writing tone), Copy rules, Logo), color lines `ink: #hex` using `ink`/`canvas`/`accent`/`accent-2`, no YAML.
    - [issue-2.md](issue-2.md) d3: YAML front matter with `image.*` and `voice.tts.{provider, model, voice, style}`.
    - [issue-1.md](issue-1.md) d5: brand.md in #9's fields plus a machine-readable `brand.json`, plus a generated frame.md and caption skin.
  - **#2.** Its AC says "A brand style file controls the image look and the narration voice", and #2 is built first (gh issue view 2; owner build order).
  - **Consumers of the pack.**
    - #4 needs "the builder's own brand pack or a neutral default", and [issue-4.md](issue-4.md) d9 assigns the neutral pack to #3.
    - #5 wants 60-90 s videos and #7 wants 45-90 s.
    - #8 wants brand, voice and CTAs "from the organization's configuration", and [issue-8.md](issue-8.md) d7 adds a `kit` section to #3's pack.
    - #1 says "the repo ships only open-licensed defaults" (gh issue view 1, 4, 5, 7, 8).
  - **License: two dossiers disagree.** [issue-1.md](issue-1.md) d1 recommends AGPL-3.0 (code), CC0 (fixtures) and an Apache NOTICE. [issue-2.md](issue-2.md) d2 recommends MIT or Apache-2.0 with written OK from two APP contributors.
- **Repo bootstrap (blocking).** No branch exists. LICENSE, .gitignore and CI must land before any PR (gh api; owner decision).
- **Runtime**
  - Node >=22 (hyperframes engines). v22.6.0 and v24.14.1 are installed here (ls ~/.nvm/versions/node).
  - FFmpeg/ffprobe.
  - chrome-headless-shell in `~/.cache/hyperframes/chrome`, 193 MB here (hyperframes-cli/references/doctor-browser.md).
  - The hyperframes CLI: 0.8.91 is latest, and 0.8.66 was used in the real run. [issue-7.md](issue-7.md) d12 asks to coordinate the pin with #3.
  - Upstream skills `faceless-explainer`, `hyperframes`, `hyperframes-core`, `hyperframes-creative` and `media-use`, installed side by side (cross-skill imports).
- **Harness.**
  - Guided capture needs the main conversation, because Claude Code subagents have no `AskUserQuestion` (code.claude.com/docs/en/sub-agents). [issue-8.md](issue-8.md) d2 runs #8 in the main conversation for the same reason.
  - Other harnesses ([issue-1.md](issue-1.md) d2 plans `.agents/` and `.opencode/` symlinks) have no `AskUserQuestion`, so capture must also work as plain text (HF/references/brief-contract.md:103).
  - Not researched: whether `AskUserQuestion` works in headless `claude -p`.
- **Offline narration.** Python 3.8+ with `kokoro-onnx soundfile`: about 311 MB of model plus 27 MB of voices, with Apache-2.0 weights. Word timings come from whisper.cpp through `npx hyperframes transcribe` (MU/audio/references/requirements.md:12,23,26; tts.mjs:278-284; huggingface.co/hexgrad/Kokoro-82M). Not researched: the licenses of kokoro-onnx and the Whisper model files.
- **Accounts and keys (bring your own)**
  - HeyGen (`HEYGEN_API_KEY`, or OAuth through `npx hyperframes auth`): TTS with native word timestamps, plus BGM retrieval. Output is redistributable only on a paid plan (heygen.com/terms §3-4).
  - Optional `ELEVENLABS_API_KEY`. Its output terms were not researched.
  - Gemini TTS exists upstream only on main (commit 01601d1105, #4377), and only by calling the engine directly, because the faceless adapter hard-codes `provider: "auto"` (research: upstream FE/scripts/audio.mjs:165-177).
  - #3 needs no Cloudinary, but VWC's logo URL has to become a file in the pack.
- **Licensing.**
  - The frame.md structure and the caption skin derive from the Apache-2.0 broadside preset (frame.md:5-6; research diff). Porting them brings Apache-2.0 §4 duties: the license text, the HeyGen copyright and a change notice (inference, legal reading).
  - Apache-2.0 code "can … be included in GPLv3 projects", one way only (apache.org/licenses/GPL-compatibility.html). Inference: the same holds for AGPL-3.0, which that page doesn't mention.
  - #3's own inputs (VFE, written in the owner's session; see Provenance) add no third-party consent requirement under any license.

## Cost

| Item | Per run (60-90 s video) | Math and source |
|---|---|---|
| HeyGen Starfish TTS | about $0.010-$0.015 | 60-90 s × 0.000333 credits/s × $0.50/credit, the Enterprise rate (developers.heygen.com/docs/enterprise-pricing.md). **The self-serve USD rate is unverified** because it sits behind a login (app.heygen.com/developers/api?modal=pricing). OAuth users can use a "10 min/month" web-plan allowance (MU/audio/references/requirements.md:15), but Free Plan output is non-commercial and can't be redistributed (heygen.com/terms §4). |
| Gemini 2.5 Flash TTS (alternative) | $0.015-$0.0225 paid; $0 free tier | 1,500-2,250 audio tokens (25 tokens/s) × $10/1M. Text input at $0.50/1M is negligible (ai.google.dev/gemini-api/docs/pricing). Free-tier traffic is "used to improve our products". |
| Gemini 3.8 Flash TTS (alternative) | $0.0135-$0.020 until 2026-12-31, then double | Same tokens × $9/1M, rising to $18/1M on 2027-01-01 (pricing page). |
| Kokoro (offline) | $0, Apache-2.0 output | Local model (tts.md:39-43; huggingface.co/hexgrad/Kokoro-82M). |
| Re-run after a partial TTS failure | the full TTS cost again | No per-line cache (inference from synthLine). |
| BGM retrieval (HeyGen catalog) | Price and license not documented | The `/v3/audio/sounds` page gives no price or license, and the terms don't mention music (developers.heygen.com/background-music; heygen.com/terms). |
| Local render | $0 API | For scale, a 90 s product-launch reel rendered in about 51 s of wall time (APP/videos/vets-who-code-reel/renders/…meta.json, durationMs 51289). The explainer's render time wasn't measured. |
| HeyGen cloud render | credits; 4k billed 1.5x; price Not researched | hyperframes-cli/references/cloud.md:3-8 |
| Agent tokens (one sub-agent per frame, 7-8 frames) | Not researched | Probably the largest cost per run (inference). |
| Brand-pack capture | $0 if done by hand; URL capture Not researched | `hyperframes capture` wrote Gemini Vision captions (asset-descriptions.md), and that cost is unknown. |

## Acceptance criteria, mapped

**1. A guided brand-pack step captures colors, fonts (by name or URL), logo files, voice and copy rules, and writes a `brand/` folder that stays on the user's machine.**
- *Already satisfies:* nothing is guided.
  - VWC's pack is hand-written (frame.md, caption skin, fonts).
  - Its copy rules live inside `check-copy.mjs`.
  - The logo is fetched from VWC's Cloudinary at Step 1.
  - The voice exists only as an owner decision, in no file (VFE/).
- *Partial prior art:*
  - `hyperframes capture` pulled CSS color variables from a live site (APP/videos/vets-who-code-reel/capture/extracted/tokens.json:1-30).
  - The upstream question protocol already covers native UI and a plain-text fallback (brief-contract.md:92-103).
  - design-picker proposes directions rather than recording a brand.
  - recipe.mjs omits skins and fonts.
- *Missing:*
  - One schema agreed across #2, #8 and #9 (Dependencies).
  - The question flow, with a mode that asks nothing and only validates a hand-written file (for subagents, #8 and CI).
  - A validator: role prediction via tokens.mjs, WCAG pairs, font files present with a license, logo present.
  - A default location outside any repo.
- *Risk:*
  - "Voice" means both the TTS speaker id and the writing tone (#9 "3-5 adjectives"; [issue-9.md](issue-9.md) d6 already heads it "Voice (writing tone)").
  - A font "by URL" is usually a licensed webfont, and names lie (the reel's renamed Gilroy).
  - Key naming silently changes caption colors.
  - Capture started inside a subagent cannot ask anything.

**2. The explainer reads the pack for design, captions and copy gating, and the gate enforces the pack's own rules.**
- *Already satisfies:* the staging architecture (VFE/SKILL.md:56-92), captions deriving their tokens from frame.md (captions.mjs:402-421), and the gate engine (check-copy.mjs).
- *Missing:*
  - frame.md and the caption skin generated or filled from the pack.
  - RULES and ALLOW loaded from the pack.
  - `--voice` taken from the pack.
  - An automated `#root` ground fix.
  - A partial-audio and duration check.
  - Figures in frame HTML included in `--numerals`.
- *Risk:*
  - The false negatives above.
  - A brand's design vocabulary colliding with its own rules (the `register` precedent), so a per-pack ALLOW is needed.
  - Rules drifting from the docs (pipeline, hand-holding).

**3. No licensed fonts ship in the repo; only open-licensed defaults such as JetBrains Mono (OFL).**
- *Already satisfies:* OFL JetBrains Mono with its license text (VFE/brand/fonts/, byte-identical to upstream). OFL Inter, EB Garamond and JetBrains Mono are in `HC/frame-presets/code-editorial/fonts/`.
- *Missing:*
  - `.gitignore` rules for `brand/`, `videos/`, `renders/` and `assets/fonts/`.
  - A CI guard that doesn't trust file names. A "license file beside it" rule fails on a renamed Gilroy placed next to a copied OFL text, and APP already contains such a rename (shasum).
- *Risk:*
  - Copying VFE or RUN as-is commits Gilroy and Gotham.
  - Captures pull Font Awesome Pro too.
  - The same files are public in AGPL APP `public/fonts/`, and gotham.md points to a third-party gist (research). That's outside #3, but VWC's pack loads fonts from there.

**4. An example brand pack for a fictional org renders a 60-90 s video end to end.**
- *Already satisfies:* a VWC run of 73.1-77.5 s shows the pipeline works (ffprobe).
- *Missing:*
  - The fictional pack. #9 hasn't started, and its fixtures ban binaries, so the font files and any logo file have to live in #3's example.
  - A narration path that needs no account (Kokoro) and a BGM decision (`music: none`).
  - A way to force Kokoro when a HeyGen credential is visible.
  - **A word budget and a measured duration gate.** Target 156-198 words across the measured paces, then gate on the voice total and the ffprobe duration (How it works now). Nothing checks length today.
- *Risk:*
  - Kokoro's pace is unmeasured.
  - Needs Node >=22, ffmpeg, Chrome and a TTS engine.
  - Upstream drift between the render and the README.
  - Can't run in CI without keys or a heavy Kokoro setup (inference).

**5. The README shows the same script rendered in two different brand packs.**
- *Already satisfies:* nothing.
- *Missing:*
  - A second pack.
  - A brand-neutral SCRIPT.md that passes both packs' gates and fits the word band.
  - Media hosting.
  - Renders whose voice and music are cleared for a public repo.
- *Risk:*
  - The script has to be written in sentence case so each pack's casing applies (VFE/SKILL.md:150-153).
  - Each MP4 is about 9.6 MB (ffprobe), which bloats the repo if committed.
  - HeyGen Free Plan voice output or uncleared catalog BGM would put redistribution-restricted media in the README (heygen.com/terms §4; inference).

## Open decisions for the owner

1. **brand.md format. Decide before #9 is assigned.** *Default:* follow [issue-9.md](issue-9.md) d6.
   - `brand.md` uses fixed `##` headings in #9's order (Name, Mission, Colors, Fonts, Voice (writing tone), Copy rules, Logo) with `key: value` lines, and no YAML.
   - Colors use role names: `ink`, `canvas`, `accent`, `accent-2`, plus an optional `ground` for the video field, which defaults to `canvas`.
   - #3 adds optional sections: `## Narration` (one voice id per provider), `## Video` (casing, story shape), `## Calls to action` (verb and URL), `## Copy gate` (ban/fix and allow lines). #2 adds `## Image style`, and #8 adds `## Kit`.
   - The validator compiles brand.md into a derived `brand.json` that scripts read. It is never hand-edited, which satisfies [issue-1.md](issue-1.md) d5's machine-readable file without a second source of truth.
   - frame.md and caption-skin.html are generated once and then owned by the user: overwrite only with `--force` and a diff, like the refuse-overwrite pattern in APP/scripts/generate-blog-graphic.ts:39-41.
   - *Why:*
     - #9 is written first, by a newcomer, with no code, and headings are easier to write correctly than YAML.
     - Explicit roles remove tokens.mjs's key-name guessing.
     - [issue-2.md](issue-2.md) d3's YAML fields map one-to-one onto sections.
   - *Alternative:* YAML front matter ([issue-2.md](issue-2.md) d3), but then #9 must be told before it starts.
   - The owner posts the choice on #9.
2. **Field ownership across skills.** *Default:*
   - #3 owns `Colors`, `Fonts`, `Logo`, `Narration`, `Video`, `Calls to action` and `Copy gate`.
   - #2 owns `Image style`.
   - #8 owns `Kit`.
   - `Narration` is keyed by provider (`heygen:`, `kokoro:`, `gemini:`), and #9's fixtures leave it out ([issue-9.md](issue-9.md) d8; [issue-4.md](issue-4.md) d10; [issue-8.md](issue-8.md) d5).
   - *Why:* #2 is built first, #8 reads everything, and one file stops the skills drifting apart.
3. **Where packs and projects live.** *Default:*
   - Packs in `${XDG_CONFIG_HOME:-~/.config}/hashflag/brands/<slug>/`, with a `--brand <dir>` override.
   - Projects in `${XDG_CACHE_HOME:-~/.cache}/hashflag/brand-explainer/<project>/`, with `--out`.
   - *Why:*
     - Projects follow pr-to-video's resolver (pr-to-video/scripts/project-dir.mjs:34-53) and match [issue-1.md](issue-1.md) d12 and [issue-8.md](issue-8.md) d10.
     - Packs are user data, not cache, so they shouldn't live where caches get cleared (inference).
     - The AC says packs stay on the user's machine, and VWC's `videos/` is ignored only through a local exclude.
4. **Depend on or vendor HyperFrames.** *Default:* depend on it.
   - Pin the CLI (`npx --yes hyperframes@<ver>`), set `HYPERFRAMES_SKIP_SKILLS=1` and `HYPERFRAMES_NO_TELEMETRY=1`, and record the tested upstream commit.
   - Use one pin for #3 and #7 ([issue-7.md](issue-7.md) d12), and match [issue-1.md](issue-1.md) d10.
   - *Why:* 25 releases in 6 days, cross-skill imports are in flux, and vendoring adds Apache duties on top of the ones the template already carries.
5. **TTS and music for the example and README renders.** *Default:*
   - Both README renders use Kokoro and `music: none`.
   - Force Kokoro by blanking the HeyGen/ElevenLabs env and pointing `HEYGEN_CONFIG_DIR` at an empty dir (untested inference). If that fails, call the engine with `--provider kokoro`.
   - VWC's own pack records Orson under `heygen:`.
   - *Why:*
     - Free Plan HeyGen output can't be redistributed (heygen.com/terms §4).
     - Catalog BGM has no stated license (developers.heygen.com/background-music).
     - Kokoro weights are Apache-2.0.
     - No account is needed.
6. **The copy gate.** *Default:* port the engine and load rules from the pack.
   - Limit the prohibition cue to design prose (frame.md and storyboard design bullets).
   - Add frame HTML to `--numerals`, and accept tab-indented spoken lines and curly quotes.
   - Keep all 23 assertions.
   - Add a verbatim-quote marker that flags quotes instead of blocking them.
   - *Why:* #5, #6 and #7 rely on the figure list, and a real CTA violation passes today.
7. **Story shape.** *Default:* a pack field. The neutral default is hook, claim, mechanism, proof (sourced numbers only), then a mandatory CTA end card. VWC's pack keeps its 7. *Why:* VWC's shape is named after its own registers, and #4 and #7 run to different lengths.
8. **Automate the silent failures.** *Default:* ship two scripts.
   - `post-assemble.mjs` sets `#root` to the pack's ground and is safe to re-run.
   - `verify-audio.mjs` exits 1 in either case:
     - `voices.length` ≠ the number of SCRIPT lines;
     - the voice total is outside the duration band (decision 9).
   - *Why:* both depend on the agent remembering them today, and #8 needs mechanical checks.
9. **Duration gate and word budget.** *Default:* the gate applies the same idea as [issue-4.md](issue-4.md) d5 (measured, not estimated), with #3's bounds, in three checks:
   - (a) At the Step 3 gate, warn when the spoken words fall outside **156-198** (60-90 s at 2.2-2.59 words/s).
   - (b) After TTS, fail unless the sum of `voices[].duration_s` is within 60-90 s. This runs before any frame sub-agent is paid for.
   - (c) After render, fail unless the ffprobe `format=duration` is within 60-90 s.
   - Bounds come from `--min/--max`, so #4 can use 55-65 and #7 45-90.
   - The first time a pack's voice is used, measure its pace from one sample line and store it in `## Narration`.
   - *Why:* video length equals the voice total (RUN evidence), pace varies by voice and Kokoro's is unknown, and nothing checked the brief's 90 s on VWC's run.
10. **Neutral default pack.** *Default:* #3 ships `packs/neutral/`, as [issue-4.md](issue-4.md) d9 proposes and #7 needs.
    - Fonts: Inter 400/700 for display and body, and JetBrains Mono 400/700 for mono. Copy them byte-for-byte from code-editorial with their OFL texts.
    - Palette: a new, validated one (dark ground, light canvas, one accent). **Not** code-editorial's ink/cream, which match Anthropic's brand hexes.
    - Story shape: the neutral one from decision 7.
    - *Why:* #1 says the repo ships only open-licensed defaults, and #4 and #7 need a pack for users who have none.
11. **How guided capture asks questions.** *Default:*
    - Capture runs only in the main conversation, one field per message.
    - Use native question UI (`AskUserQuestion` in Claude Code) when present. Otherwise send one plain-text question with one numbered list for factual fields, and an open question for tone (brief-contract.md:97-98,103).
    - Every field can instead be written straight into brand.md, followed by `brand-pack validate`.
    - In a subagent, a headless run, CI or #8, capture never starts. The caller gets exit 1 with the list of missing fields.
    - The explainer requires a valid pack and never starts capture itself.
    - *Why:* subagents have no `AskUserQuestion` (code.claude.com/docs/en/sub-agents), #8 already keeps its gates in the main conversation ([issue-8.md](issue-8.md) d2), and other harnesses lack the tool.
12. **Logo in the example pack.** *Default:* the logo is optional. The fictional pack ships an SVG wordmark (a text file). With no logo, the end card typesets the name in the heading font. That matches [issue-9.md](issue-9.md) d7's text wordmark description. *Why:* #9 bans binaries, and frame workers refuse to improvise a mark (VFE/SKILL.md:74-76).
13. **Fonts by name or URL, and the CI guard.** *Default:*
    - Resolve names to downloadable OFL files, and accept local paths and URLs. Every font in brand.md records `license:` and `source:`.
    - CI runs `fonts.lock`: every committed file whose magic bytes are `wOF2`, `wOFF`, `OTTO`, `ttcf`, `true` or `0x00010000` (whatever its extension) must appear by sha256 with a license-file path and source URL. Anything unlisted fails.
    - A local-only test (never in CI, because the files can't be committed) runs the guard against VFE's Gilroy renamed to `Inter-400.woff2` beside a copied OFL text, and against the 98 APP commercial files.
    - *Why:* a sibling-license rule and a four-hash denylist both miss renamed, re-encoded or other commercial files, and APP already holds a renamed Gilroy. An allowlist fails closed.
14. **Repo license (blocks bootstrap).** *Default:* follow [issue-1.md](issue-1.md) d1: AGPL-3.0 for code, CC0 for `fixtures/`, and Apache-2.0 notices kept on broadside-derived files. [issue-2.md](issue-2.md) d2 (MIT or Apache-2.0 with contributor OK) is the alternative.
    - *Why:* #3 doesn't constrain the choice. Its template and skin are Apache-2.0-derived, and Apache-2.0 flows one way into GPLv3 (apache.org) and, by inference, into AGPL.
    - check-copy.mjs, SKILL.md and frame.md were written in the owner's own Claude Code session (transcript d983056c). "No outside contributors" is the owner's assertion, backed by that transcript, not by VCS history.
    - One repo-wide decision.
15. **README media.** *Default:* commit one `snapshots/contact-sheet.jpg` per brand, and attach the MP4s to a GitHub release (as in [issue-1.md](issue-1.md) d18). *Why:* the pipeline already makes contact sheets, and each MP4 is about 9.6 MB.
16. **Naming and packaging.** *Default:* two skills, `brand-pack` (capture and validate) and `brand-explainer` (video), under `skills/<name>/SKILL.md` in the single plugin from [issue-1.md](issue-1.md) d2/d4. *Why:* five other issues read the pack, and names can't use `vwc-*` or upstream's `faceless-explainer`.
17. **The VWC fonts already public in APP.** *Default:* raise a separate vets-who-code-app issue and keep it out of #3. *Why:* it's a licensing exposure outside this epic (98 files; git ls-files), but VWC's pack points at those files. The owner files it.

## Suggested build plan

0. **Owner decisions before #9 is assigned:** the license (decision 14) and the brand.md format (decision 1), posted on #9 by the owner.
   *Verify:* #9 has a comment or body edit that names the format and the heading list.
1. **Bootstrap `main`** (outside #3, blocking): LICENSE, README stub, `.gitignore` (`brand/`, `videos/`, `renders/`, `.hyperframes/`, `brag-output*/`, `assets/fonts/`), commitlint.
   *Verify:* `gh api repos/Vets-Who-Code/hashflag-skills/commits` returns 200, and `git check-ignore -v brand/fonts/Gilroy-Regular.woff2` prints a rule.
2. **Font guard first** (`scripts/check-fonts.mjs` + `fonts.lock`), before any font file lands.
   *Verify:*
   - node:test shows an unlisted `wOF2` blob named `logo.bin` fails and the listed JetBrains Mono passes.
   - Locally, VFE's Gilroy-Regular copied as `Inter-400.woff2` next to `OFL-inter.txt` fails.
3. **Back up VFE to a private, versioned place** (it isn't in git), leaving out Gilroy and Gotham. Record the hyperframes version.
   *Verify:* `diff -r` against VFE shows only the excluded fonts, and `node check-copy.mjs --self-check` exits 0 from the copy.
4. **brand.md parser and `validate.mjs`.** It checks required fields, fonts present and in `fonts.lock` or local-only, and role prediction through upstream `tokens.mjs` on the generated frame.md. It enforces WCAG 4.5:1 for every declared text/ground pair and writes `brand.json`.
   *Verify:* node:test shows:
   - a VWC-shaped brand.md predicts `{ink #1A1823, canvas #EEEDE9, accent #FDB330, accent2 #c5203e}` with ground `#091f40`;
   - red-on-navy text fails at 2.85:1;
   - a missing font fails;
   - #9's heading format parses.
5. **Generators:** a frame.md template (structure from VFE/brand/frame.md with the broadside Apache notice, and no ground key that matches the canvas pattern) and a caption-skin template (casing, display and mono fallbacks, neutral color fallbacks). Both refuse to overwrite.
   *Verify:* the generated VWC frame.md gives the same `semanticColors`/`parseFonts` as the hand-written file, and a second run without `--force` exits non-zero.
6. **Port check-copy** to read rules from the pack, with the fixes from decision 6.
   *Verify:*
   - All 23 original assertions pass with VWC rules loaded from brand.md.
   - `"Do not wait — sign up today."` gives 1 hit.
   - A tab-indented spoken figure, a curly-quoted figure and a figure in frame HTML are all listed.
7. **`post-assemble.mjs` and `verify-audio.mjs`** (count check plus duration band, with `--min/--max` and `--render <mp4>` for the ffprobe check).
   *Verify:* node:test shows:
   - a cream `#root` becomes the pack ground and is unchanged on a second run;
   - `audio_meta` with 5 voices for 8 lines exits 1;
   - voices totalling 58 s exit 1 with `--min 60`;
   - RUN's take-2 meta (73.091 s) passes 60-90.
8. **Neutral default pack** (decision 10).
   *Verify:* the validator exits 0, every font is in `fonts.lock`, and the accent and ground hexes don't match code-editorial's or VWC's.
9. **`brand-pack` SKILL.md.** Guided capture in the main conversation, a plain-text fallback, a validate-only mode, and a subagent refusal (decision 11).
   *Verify:*
   - Capturing a #9-style fictional brand ends with the validator at exit 0, and `git status --porcelain` in the host repo is empty.
   - Run from a subagent, it asks nothing and exits 1 listing the missing fields.
10. **`brand-explainer` SKILL.md.** The generalized override table: staging from the pack, the gate at Steps 3 and 6, `--voice` from the pack, the word-band warning, both new scripts, and `render --output`.
    *Verify:* re-running the Labor Day script with the VWC pack gives:
    - check-copy exit 0;
    - a clean `hyperframes check` except the caption-word false positive;
    - a contact sheet that opens on navy;
    - a navy `#root`;
    - `verify-audio --render` passing.
11. **Fictional pack A** (from #9's nonprofit brand.md, OFL fonts, SVG wordmark), rendered with Kokoro and `music: none`. Measure Kokoro's pace first.
    *Verify:* ffprobe duration is 60-90 s, the gate exits 0, `audio_engine_meta.json` shows `tts_provider` `kokoro` and no BGM, and `check-fonts` passes.
12. **Pack B** (#9's small-business brand), the same SCRIPT.md, and the README.
    *Verify:* both renders come from the identical SCRIPT.md (same sha), both gates pass, both durations are 60-90 s, and the README shows both contact sheets with release links.
13. **CI with no keys:** node:test for the parser, validator, generators, gate, scripts and font guard.
    *Verify:* CI is green, and a test PR that adds an unlisted font blob under any extension fails.

**Not researched:**
- whether `AskUserQuestion` works in headless `claude -p`;
- whether HeyGen API or OAuth-allowance usage counts as the "Free Plan";
- the license of HeyGen catalog music (the terms and API docs are silent);
- ElevenLabs output terms;
- kokoro-onnx and Whisper model licenses;
- Kokoro's speaking pace;
- whether blanking env forces Kokoro;
- whether `<break>` passes through parseScript and captions;
- whether `hyperframes check` catches a missing font file;
- whether `render` fetches GSAP and fonts at render time (VFE/SKILL.md:69's "render machine has no network" is unverified);
- HeyGen self-serve prices;
- agent token cost per run;
- faceless-explainer render time;
- HashFlag and Linea font licenses.

## Sources

- **gh** (read 2026-09-29): `gh issue view 1,2,3,4,5,6,7,8,9 -R Vets-Who-Code/hashflag-skills`; `gh api repos/Vets-Who-Code/hashflag-skills`; `gh api repos/Vets-Who-Code/hashflag-skills/issues/1/sub_issues`.
- **Sibling context docs:** [issue-1.md](issue-1.md), [issue-2.md](issue-2.md), [issue-4.md](issue-4.md), [issue-7.md](issue-7.md), [issue-8.md](issue-8.md) and [issue-9.md](issue-9.md) (#1 d1, d2, d4, d5, d10, d12, d18; #2 d2, d3; #4 d5, d9, d10; #7 d8, d12; #8 d2, d5, d7, d10; #9 d6, d7, d8).
- **VFE:** `VFE/SKILL.md`, `VFE/brand/frame.md`, `VFE/brand/caption-skin.html`, `VFE/brand/fonts/`, `VFE/scripts/check-copy.mjs`.
- **FE:** `FE/SKILL.md`; `FE/scripts/build-frame.mjs`, `audio.mjs`, `captions.mjs`, `assemble-index.mjs`, `transitions.mjs`, `frame-packets.mjs`; `FE/scripts/lib/tokens.mjs`, `dimensions.mjs`, `pad-frame-duration.mjs`, `storyboard.mjs`.
- **MU:** `MU/audio/scripts/audio.mjs`, `lib/tts.mjs`, `lib/heygen.mjs`, `lib/bgm.mjs`, `heygen-tts.mjs`; `MU/audio/references/tts.md`, `requirements.md`; `MU/scripts/recipe.mjs`, `lib/recipe-store.mjs`.
- **HC:** `HC/frame-presets/` (broadside, code-editorial/FRAME.md, code-editorial/fonts), `HC/references/design-picker.md`, `narration.md`, `typography.md`.
- **HF and other upstream skills:** `HF/references/brief-contract.md`, `subagent-dispatch.md`, `frame-worker-core.md`, `skill-lifecycle.md`, `routes/faceless-explainer.md`; `HF/scripts/lib/frame-packets-core.mjs`; `~/.claude/skills/hyperframes-cli/SKILL.md`, `references/preview-render.md`, `cloud.md`, `doctor-browser.md`, `upgrade-info-misc.md`; `~/.claude/skills/product-launch-video/SKILL.md`; `~/.claude/skills/pr-to-video/scripts/project-dir.mjs`, `references/story-design.md`.
- **Brand-guidelines skill:** `~/.claude/skills/synced/bec712ab-35d6-4816-b44c-bf1b8563fa29_cc083925-4097-4287-80ae-c73bdf7e76d8/brand-guidelines/SKILL.md`.
- **RUN and reel:** `RUN/` (BRIEF.md, STORYBOARD.md, SCRIPT.md.bak, .narrated-backup/{SCRIPT.md,STORYBOARD.md,audio_meta.json}, audio.log, audio_engine_meta.json, samples/, index.html, package.json, frame.md, renders/, assets/fonts/); `APP/videos/vets-who-code-reel/` (assets/fonts/, capture/assets/fonts/, capture/extracted/tokens.json, asset-descriptions.md, renders meta.json).
- **APP:** `APP/tailwind.config.js`, `APP/docs/DESIGN_DOC.md`, `APP/docs/brand-style-guide.md`, `APP/AGENTS.md`, `APP/src/pages/press-kit.tsx`, `APP/src/pages/api/og.tsx`, `APP/src/data/site-config.ts`, `APP/src/data/homepages/index.json`, `APP/public/llms.txt`, `APP/scripts/image-prompts.ts`, `APP/scripts/generate-blog-graphic.ts`, `APP/public/fonts/`, `APP/LICENSE` (AGPL-3.0), `APP/.git/info/exclude`; commit 47165207 (#1437).
- **Preferences:** `~/.media/preferences.json`.
- **Commands run 2026-09-29:**
  - `node check-copy.mjs --self-check`; node probes of `scan`/`numerals`; a count of `a(` in check-copy.mjs:117-147;
  - an awk count of frame.md colors; a node run of `tokens.mjs` on frame.md;
  - `shasum` across VFE, APP `public/fonts`, RUN and the reel; `git ls-files public/fonts`;
  - `ffprobe` of the renders and samples; a node sum of `.narrated-backup/audio_meta.json`;
  - `npm view hyperframes version engines.node`; `stat` of VFE files.
- **URLs** (read 2026-09-29):
  - https://code.claude.com/docs/en/sub-agents
  - https://www.heygen.com/terms (§3, §4, §10; Last Updated 2026-07-23)
  - https://developers.heygen.com/docs/voices/speech
  - https://developers.heygen.com/background-music
  - https://developers.heygen.com/docs/enterprise-pricing.md
  - https://developers.heygen.com/docs/usage-limits.md
  - https://huggingface.co/hexgrad/Kokoro-82M
  - https://www.apache.org/licenses/GPL-compatibility.html
  - https://ai.google.dev/gemini-api/docs/pricing
  - https://github.com/heygen-com/hyperframes (LICENSE, CREDITS.md, commits 01601d1105, 29fc95395d)
  - https://huggingface.co/facebook/musicgen-small
  - https://pixabay.com/service/license-summary/
  - https://gsap.com/standard-license
