# #8 [Agent]: Repurpose one post into a full content kit: context

**Snapshot 2026-09-29.** Source keys used below:
- `app/` is the vets-who-code-app repository, at `b7c19088`. It is 20 commits behind `origin/master` (`badc2951`). Among the media files, the only master change is one line in `src/lib/blog.ts`. Separately, master moved `@google/genai` from 1.40.0 to 2.24.0 in #1460, but the scripts were not changed for it (`git diff --stat HEAD origin/master -- scripts/ src/lib/blog.ts`; research on package.json at master).
- `sk/` is `~/.claude/skills/`. `brag/` is `~/.claude/plugins/cache/brag/brag/0.2.2/`. `FE` is `sk/faceless-explainer/`. `MU` is `sk/media-use/`.
- `hf#N` is an issue in Vets-Who-Code/hashflag-skills. `#N` is a vets-who-code-app PR or issue.
- "#N dossier" and "#N decision M" refer to the sibling context doc for hf#N, docs/context/issue-N.md (e.g. [issue-2.md](issue-2.md)), and decision M in it. Re-check decision numbers before quoting them in an issue.

**The issue:** one post goes in. Out come a hero image, an audio overview, an explainer video, a LinkedIn post, a newsletter blurb, and alt text for every image. It orchestrates hf#2 (blog media) and hf#3 (brand-pack explainer) and adds the short-form text. It says "Build this last" (hf#8 body). It has 0 comments and the label `enhancement`, and was created 2026-09-27 (`gh issue view 8`). The repo is private and empty, with no license and no branch (`gh api repos/Vets-Who-Code/hashflag-skills`).

**Inference:** the kit list has no separate social image, so v1 needs no new image renderer. "Every image" means the hero, any inline graphics in the post, and the video poster if one is made.

---

## What exists today

### Orchestration prior art
- **`app/scripts/generate-blog-media.ts`** (92 lines, all 92 by Jerome Hardaway per `git blame`, so porting it needs no third-party sign-off whatever the license):
  - Loads `dotenv/config` (:1). `BLOG_DIR` is hard-coded (:5).
  - `validateSlug` (7-18) throws on a missing slug or file.
  - `generateMedia(slug, generateImage, generateAudio)` (25-65) runs image, then audio, each in its own try/catch. It prints a retry hint on failure and a ✅/❌ summary, and returns `{ imageOk, audioOk }` (20-23).
  - `main()` dynamic-imports both scripts' `main` (72-73), sets `process.argv[2] = slug` (75), and exits 1 if either step failed (82-84).
  - Added in `caef1b5e` (#974). **Reuse the shape; replace the booleans.**
- **`app/__tests__/scripts/generate-blog-media.test.ts`** (112 lines, all by Jerome Hardaway per `git blame`):
  - 4 `validateSlug` tests (:21-39) and 6 `generateMedia` tests (:42-110): order, both ok, audio still runs after an image throw, the reverse, both fail, and each generator called once.
  - The existing-slug test writes a real file into `src/data/blogs` (:9, :36). Port the tests to a temp dir.
- **`sk/hyperframes/references/subagent-dispatch.md:9`**: "WAIT" means the expected artifact exists on disk, never the harness notification. Re-dispatch a missing one once.
- **`sk/hyperframes/references/brief-contract.md`**:
  - `flow: automation` plus `storyboard: no` derives `mode: autonomous` (:15-27).
  - Gate table (:41-47): preference gates are decided and stated, checkpoints are posted and continued, and quality gates still stop on errors. On sign-in, autonomous runs "Show status and continue through an available offline provider" (:47).
  - "Rendering remains user-gated in both modes … Autonomous runs ask 'preview first, or render?' Render only after the answer" (:51).
  - "Autonomous is not silent" (:57).

### Media generators #8 reaches through hf#2
- **`app/scripts/generate-blog-image.ts`** (250 lines; 237 of them by Brad Hankee per `git blame`) builds the hero. **`app/scripts/image-prompts.ts`** holds the 3 fixed templates (research).
- **`app/scripts/generate-single-blog-audio.ts`** exports these pure helpers (research):
  - `pcmToWav` (6-39)
  - `NARRATION_STYLE` (240-242), an inline "Read the following blog post aloud…" directive
  - `normalizeLoudness` (247-296)
  - `chunkForTts` (298-325)
  - `cleanMarkdownToText` (327-337)
- **`app/scripts/generate-blog-graphic.ts`** makes inline graphics as HTML artboards, with `--draft` and `--dry` (75-135). It is **not** part of generate-blog-media (research).
- **`app/src/data/blog-audio/labor-day-sprint-10-days-to-proof-of-work.md`** is the only hand-written spoken script (1,212 words). It spells out numbers and dots acronyms, e.g. "A.I." (research).

### Video leg (the source for hf#3)
- **`sk/vwc-faceless-explainer/`**: SKILL.md (304 lines), brand/frame.md, brand/caption-skin.html, brand/fonts/ (licensed Gilroy and GothamPro plus OFL JetBrains Mono), and scripts/check-copy.mjs. It is not under git, so this machine holds the only copy (`wc -l`; research: `git rev-parse` fails). Its SKILL.md has no `disable-model-invocation` key (:1-5).
- **`FE`** is the upstream HyperFrames pipeline, Apache-2.0 (research: SKILL.md:16-18; `gh api repos/heygen-com/hyperframes`).
- **`FE/scripts/audio.mjs`** is the adapter that Step 3.1 runs. It writes an engine request with `provider: "auto"` (:167-175) and calls the engine without `--provider` (:70-89).
- **`MU/audio/scripts/audio.mjs`** is the shared TTS, BGM and SFX engine. It accepts `--provider` (:94, :129-131). `MU/audio/scripts/lib/tts.mjs` `pickProvider` validates an explicit choice and throws when its credential is missing (:38-49). Otherwise it picks HeyGen, then ElevenLabs, then Kokoro (:50).
- **`app/videos/labor-day-sprint-proof-of-work/`** is the one real blog-post-to-explainer run: BRIEF.md:1-22 ("Turn the Labor Day Sprint blog post into a VWC-branded explainer") and 3 renders. It is local only, excluded by `videos/` at `.git/info/exclude:21`, and it contains the licensed fonts (research; `grep .git/info/exclude`).

### Short-form text prior art (no code generates any of it today)
- **`app/brag-output-2026-09-22-134936/share-copy.txt`**: one file with LinkedIn, X/Threads, short caption, thank-you tag line and alt text sections. It is gitignored (`.gitignore:105-106`, #1390). It is the closest real example of the #8 format (read 2026-09-29).
- **`brag/skills/brag/references/step-4-deliver.md`**:
  - Share-copy rules: "one canonical 1-3 sentence caption, no 'excited to share'" (75-136).
  - The poster-extract and bake-into-frame-0 ffmpeg recipe (31-71).
  - brag is MIT (`brag/.claude-plugin/plugin.json`).
- **`sk/emails/SKILL.md`**:
  - One email, one CTA. Subject 40-60 chars; preview 90-140 chars. Structure: Hook, Context, Value, CTA, Sign-off (44-47, 90-108, 215-244).
  - Newsletter roundup: `references/email-types.md:384-401`.
  - It has **no provenance** (it's absent from `~/.agents/.skill-lock.json`), so borrow ideas only.
- **`sk/product-marketing/SKILL.md`** keeps an `.agents/product-marketing.md` org-context doc with a changelog (12-243). That is one possible shape for org config.
- **`sk/copywriting`**: don't use it for CTAs. It recommends "Start Free Trial"-style CTAs (SKILL.md:153-170), and its own stats are unsourced (references/copy-frameworks.md:422-431).
- No installed skill writes LinkedIn posts. `social-content`, `copy-editing` and `seo-audit` are referenced but missing (research: `find` over the skill roots).
- **`app/src/data/outcomes.ts`** is VWC's single source of truth for public numbers (`value`, `display`, `qualifier`, `source`, `asOf`; #1418). It is the pattern for a facts ledger.

### Gates
- **`sk/vwc-faceless-explainer/scripts/check-copy.mjs`** is the only wording gate in the stack:
  - `RULES` export: hard-coded VWC copy law (20-38).
  - `ALLOW` spans (43-51), `scan(text)` (64), and `--self-check`.
  - `numerals(text)` (98-115) reads only 4-space-indented spoken lines, `voiceover:` lines and quoted strings.
  - `hyperframes lint` and `check` look at structure and layout only (check-copy.mjs:1-4).
- **`app/AGENTS.md:262-268`**: Apply and Donate are literal. VWC is an "accelerator, not a bootcamp", and graduates are "software engineers".

### Deterministic image renderers (only if an image must carry words)
- **`app/src/pages/api/og.tsx`**: a `next/og` ImageResponse at 1200x630 (202-203) in navy #091f40, red #c5203e, cream #EEEDE9 and gold #FDB330 (16-19).
- **`generate-blog-graphic.ts:100-135`** screenshots a Playwright `.artboard` element at 1400x760 and deviceScaleFactor 2, after `document.fonts.ready`.

### Sample inputs
- **`app/src/data/blogs/high-success-low-adoption.md`**: 1,297 body words, a good hero alt (:8), and two graphics whose alt text carries their numbers (:49, :81). It is evergreen (research).
- **`app/src/data/blogs/labor-day-sprint-10-days-to-proof-of-work.md`** is full of traps (research):
  - `postedAt` 2026-08-22 and no hero alt (:2, :6-7)
  - hypothetical resume numbers (31, 67, 74)
  - a named but unlinked source (Lightcast 28%)
  - a passed deadline, "September 8th" (3, 117)
- **`app/src/data/blogs/ai-as-infrastructure-audio-pipeline.md`** (798 words) is VWC's own public write-up of the audio pipeline (research).
- **hf#9 fixtures** are not written yet. The spec calls for `nonprofit/blog-post.md`: about 800 words, front matter `title, date, author, description, tags`, no binaries, "Used by #2 and #8". Its planted traps are only for #5, #6 and #7 (`gh issue view 9`, updated 2026-09-29T14:25Z).
  - [issue-9.md](issue-9.md) (decision 12) explicitly defers #8 traps to a follow-up.
  - Its build step 7 has the post "draw only on numbers the report sources, or use none", which makes it a clean negative control for #8 ([issue-9.md](issue-9.md)).

### Claude Code packaging mechanics (code.claude.com docs, read 2026-09-29)
- **Subagent tools.** Subagents always lose `AskUserQuestion`, `Workflow`, `EnterPlanMode` and a few others. A subagent that omits `tools` "Inherits every tool available to subagents", MCP included (docs/sub-agents, "Tools subagents cannot use").
- **Plugin subagents** "don't support the `hooks`, `mcpServers`, or `permissionMode` frontmatter fields" (docs/sub-agents).
- **`disable-model-invocation: true`** means only the user can invoke the skill. "If Claude tries anyway, Claude Code blocks the call and instructs it not to reproduce the … steps another way." It also can't be preloaded into subagents (docs/skills, "Control who invokes a skill"; docs/sub-agents).
- **Hook lifetimes by location** (docs/hooks, "Hook locations"):

  | Location | Scope |
  |---|---|
  | Plugin `hooks/hooks.json` | "When plugin is enabled" |
  | Skill frontmatter | "The rest of the session once the skill is invoked" |
  | Subagent frontmatter | "While that subagent is running" |

  `once: true` is honored only in skill frontmatter (docs/hooks, "Common fields").
- **Hooks inside subagents.** "Hooks from settings files, managed policy settings, and plugins also run inside subagents. When a subagent calls a tool, tool events such as `PreToolUse` … fire the same configured hooks", and the input carries `agent_id` and `agent_type` (docs/hooks). **Skill-frontmatter hooks are not in that list, and no page says whether they fire inside subagents** (docs/hooks; docs/sub-agents; docs/skills, all read for this).
- **Skill `disallowed-tools`** removes tools "while this skill is active", and "The restriction clears when you send your next message" (docs/skills frontmatter table).
- **MCP matchers need `.*`.** "`mcp__memory` … is compared as an exact string and matches no tool" (docs/hooks). A PreToolUse deny is `hookSpecificOutput.permissionDecision: "deny"`, or exit 2, which blocks even over a JSON "allow" (docs/hooks).
- **Hook inputs and variables.** Hook commands get `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` and `${CLAUDE_PROJECT_DIR}`. The input JSON carries `session_id` (docs/hooks).
- Workflow scripts take no input mid-run (docs/workflows, via research).
- Sensitive `userConfig` values are not exported to Bash (docs/plugins/manifest-reference, via research).
- Neither `~/.claude/agents/` nor `app/.claude/agents/` exists (`ls`).
- The owner's existing skills (`sk/hashflag-{pr-prep,protocol,stack}/SKILL.md`) are single SKILL.md files with `user-invocable: true` (research).

---

## How it works now

### A. Blog media: `npm run generate:blog-media <slug>` (package.json:31, `tsx -r dotenv/config scripts/generate-blog-media.ts`)
1. `validateSlug`: `src/data/blogs/<slug>.md` must exist (generate-blog-media.ts:7-18).
2. **Image** (`generate-blog-image.ts main`):
   1. It needs only `GEMINI_API_KEY`. If that's missing it throws "Missing GEMINI_API_KEY." (147-150).
   2. It reads the post with regexes, not gray-matter (research).
   3. **Theme call:** `gemini-3.1-pro-preview` gets the title and full body and returns a 5-key theme JSON (60-63).
   4. **Loop**, `MAX_RETRIES = 3` (10, 222-250):
      - Each attempt uses the next template (`buildImagenPrompt(theme, attempt-1)`).
      - `gemini-3-pro-image` runs through `generateContent` with `aspectRatio "16:9"` (92-98). No `imageSize` is set, so it defaults to 1K; the live assets are 1376x768 JPEG (research: CDN HEAD).
      - A `gemini-3.1-pro-preview` vision check follows (183-219). It **fails open** on unparseable JSON (214-219).
      - After 3 detections it logs "Max retries reached. Proceeding with last image" and returns that image (239-246).
   5. **Upload:** a `data:image/png` URI with `public_id=slug`, `folder=blog-images`, `overwrite` and `invalidate`. It prints the URL only (110-138, 163-167).
   6. The post file is never edited. The author hand-writes `image.src: "blog-images/<slug>.png"` (README.md:196).
   7. That is 3 to 7 paid calls, in sequence, with no retry on 429 or 5xx (research).
3. **Audio** (`generate-single-blog-audio.ts main`):
   1. Key: `GOOGLE_GENERATIVE_AI_API_KEY || GEMINI_API_KEY || GOOGLE_PRIVATE_KEY` (163-166). The file has **no dotenv import** (1-3).
   2. Input is `src/data/blog-audio/<slug>.md` if it exists, otherwise the post body (193-208), then `cleanMarkdownToText`.
   3. `chunkForTts` splits on paragraph boundaries with `WORDS_PER_CHUNK = 1700` (303).
   4. Each chunk goes by raw `fetch` to `.../models/gemini-2.5-flash-preview-tts:generateContent` with voice `Kore` (59-93) and the `NARRATION_STYLE` prefix. The base64 PCM is decoded. `finishReason` and `usageMetadata` are never read (research: grep).
   5. Chunks are joined with 350 ms of silence. `normalizeLoudness` targets -16 dBFS RMS, limits gain to 0.25-4x and caps peaks at -1 dBFS. `pcmToWav` writes 24 kHz mono 16-bit (248-252, 299-303 per research).
   6. `upload_stream` is awaited, with `resource_type video`, folder `blog-audio`, `overwrite` and `invalidate` (123-152).
   7. The site derives the URL `https://res.cloudinary.com/<cloud>/video/upload/f_mp3/blog-audio/<slug>.wav` from the slug (src/lib/blog.ts:55-59), so the player renders on every post (src/containers/blog-details/index.tsx:39-50).
4. It prints the summary and exits 1 if either step failed (generate-blog-media.ts:57-62, 82-84).

### B. Inline graphics: `npm run generate:blog-graphic <folder> [--dry | --draft <name> "<brief>"]` (generate-blog-graphic.ts:75-98)
- **`--draft`:** `gemini-3.1-pro-preview` writes `<dir>/<name>.html`. It refuses to overwrite ("already exists. Edit it, or delete it to redraft.") (32-73).
- **Render:** Playwright turns every `*.html` in the folder into `<dir>/out/<name>.png` (100-121). `--dry` stops here.
- **Upload:** `blog-graphics/<folder>-<name>` with `invalidate` (10-21, 129-131). The image is embedded by hand as `![alt](blog-graphics/<id>)` (README.md:217).

### C. Explainer video: vwc-faceless-explainer over faceless-explainer
| Step | What happens | Gate (collaborative / autonomous) |
|---|---|---|
| 0 | Put Node ≥22 on PATH (`~/.nvm/versions/node/v24.14.1/bin`, specific to this machine). Run `npx hyperframes init "videos/<project>" --non-interactive --example=blank --skill=faceless-explainer`. If `BRIEF.md` exists, the skill "ask[s] nothing" (FE/SKILL.md:26, :30). `npx hyperframes auth status` exits 1 when signed out (sk/vwc-faceless-explainer/SKILL.md:38-54; sk/product-launch-video/SKILL.md:38) | Sign-in: wait / "state the status and continue through the available local engines" (FE/SKILL.md:36-39) |
| 1 | Brief plus brand staging: frame.md, caption skin, fonts, and a logo fetched by `curl` (vwc SKILL.md:56-92) | none |
| 2 | Skipped, because frame.md is hand-written and build-frame.mjs would overwrite it (vwc SKILL.md:25-35) | none |
| 3 | STORYBOARD.md and SCRIPT.md, then `check-copy.mjs --project . --numerals` (vwc SKILL.md:155-168) | Plan: ask / post as a heads-up and proceed (FE/SKILL.md:90-92) |
| 3.1 | **Paid TTS happens here:** `node <SKILL_DIR>/scripts/audio.mjs --script ./SCRIPT.md --storyboard ./STORYBOARD.md --hyperframes . --out ./audio_meta.json --voice <id>` (FE/SKILL.md:104). The provider is always `auto`: HeyGen Starfish, then ElevenLabs, then local Kokoro (FE/scripts/audio.mjs:168; tts.mjs:50). BGM mode is hard-coded `retrieve`, which is HeyGen only (FE/scripts/audio.mjs:164-174) | none (background job) |
| 4-5 | Visual design with one sub-agent per frame. `audio.mjs sync-durations` and `fetch-sfx`. Assemble index.html. Manual `#root` background fix (vwc SKILL.md:142-146) | Sketches: collaborative only (FE/SKILL.md:120) |
| 6 | Copy gate again, then transitions, `lint`, `check`, a `snapshot` contact sheet and preview. Render: `npx hyperframes render --skill=faceless-explainer --quality high --output renders/video.mp4` (FE/SKILL.md:186-204) | "render now, or what changes?" / "preview first, or render?" (FE/SKILL.md:194-198; review-loop.md:35) |

**Real output:** H.264 1920x1080 30fps plus AAC 48 kHz stereo, 73.1-77.5 s, 9.2-9.6 MB. A 90 s render took about 51 s of wall time (research: ffprobe; `videos/vets-who-code-reel/renders/*.meta.json`).

### D. Short-form text
- Nothing generates LinkedIn posts, newsletter blurbs or alt text (research: grep and skill inventory).
- **Only 2 of 39 posts set `image.alt`** (verified):
  - `grep -L 'alt:' src/data/blogs/*.md` gives 37 of 39.
  - Both hits are front-matter `image.alt`: high-success-low-adoption.md:8, and the flow map at two-pointers-a-practical-technique-for-code-challenges.md:6.
  - The UI falls back to the title (`src/containers/blog-details/index.tsx:19`).
- The newsletter destination is a Mailchimp list on `us4`. The site only subscribes emails and never sends campaigns (`src/pages/api/newsletter.ts:3-5`).

### Constants a cost guard or verifier needs
- **TTS output cap:** 16,384 audio tokens, about 655.36 s at 25 tokens/s (generate-single-blog-audio.ts:235-237; ai.google.dev/gemini-api/docs/pricing). For 3.8 the cap is "16,384 (Gemini API serving limit)" (models/gemini-3.8-flash-tts).
- **TTS input limit:** 8,192 tokens, for both 2.5 and 3.8 (models/gemini-2.5-flash-preview-tts; models/gemini-3.8-flash-tts).
- **Kore pace:** about 187 wpm; measured rates run 157-213 wpm (PR #1266; research on Cloudinary HEAD sizes).
- **WAV size:** 48,000 B/s, so duration = (bytes − 44) / 48,000. The f_mp3 derivative is about 9,693 B/s (research).
- **HyperFrames word budget:** 2.2 words/s in pr-to-video (story-design.md:175-184), 2.5 words/s in hyperframes-creative (narration.md:7). A 60-90 s video is therefore 132-225 words.
- **LinkedIn:**
  - The post limit is 3,000 chars (linkedin.com/help/linkedin/answer/a528176).
  - Keep the hook to 150 chars or fewer to avoid truncation (ads spec, linkedin.com/help/lms/answer/a426534).
  - A third-party source puts the fold at about 140 chars on mobile and 210 on desktop (authoredup.com).

---

## Lessons already paid for

**Media pipeline**
1. **An un-awaited upload reported success.** `7b0f4aef` (#959) dropped the `await`. Runs printed "Audio: ✅ Success" while the URL returned 404. It was fixed in `8443c807`, which was squashed into `1fa1bfa7` (PR #1266). **Rule: success means the artifact was verified, not that nothing threw.**
2. **TTS truncation is silent.** Output stops at 16,384 tokens with `finishReason STOP`, and 8 of 38 posts were broken (PR #1266; `daf251d1`).
   - Early STOPs also happen **well below the cap** on unchanged text: combat-to-code 245 s vs 365 s, using-ai-login 31 s vs 89 s (research: `git ls-tree -l 48d1ad46^` vs Cloudinary HEAD).
   - The current code has no guard (generate-single-blog-audio.ts:41-57).
   - The manual audit rule was "audio far shorter than words ÷ 187 is truncated" (PR #1266).
3. **Versionless URLs plus re-upload leave stale CDN copies,** including the f_mp3 derivative. `invalidate: true` is now on every upload path (`1f77237b`, PR #1266). Cloudinary's default is `false`, and propagation takes "a few seconds to a few minutes" (cloudinary.com/documentation/image_upload_api_reference_upload).
4. **Model ids churn.**
   - `gemini-3-pro-preview` and `imagen-4.0-generate-001` were both retired, and Imagen disappeared from the key's model list (PR #1266).
   - The deprecations page names `gemini-3.8-flash-tts` or `gemini-3.8-flash-lite-tts` as replacements for `gemini-2.5-flash-preview-tts`, with "No shutdown date announced" for 2.5 (ai.google.dev/gemini-api/docs/deprecations). The 3.8 model page gives the launch as "September 2026".
   - **Documented, not inferred:** "Gemini 3.8 TTS treats input text strictly as a verbatim transcript. Inline text directions like `"Say cheerfully: Hello!"` … may be spoken aloud" (models/gemini-3.8-flash-tts; speech-generation). `NARRATION_STYLE` is exactly that kind of inline direction (generate-single-blog-audio.ts:240-242), so on 3.8 it goes into `speech_metadata.style`.
   - 3.8 unary responses are "WAV (`audio/wav`) audio with a standard RIFF header", which would double-wrap under `pcmToWav` (speech-generation). Kore is in 3.8's prebuilt voice list (same page).
   - This matches [issue-1.md](issue-1.md) and [issue-2.md](issue-2.md).
5. **The image text gate is advisory.** It fails open on parse errors, and after 3 detections it uploads the last image and exits 0 (generate-blog-image.ts:214-219, 239-246). **#8 needs a tri-state status (ok / warn / failed).**
6. **`process.exit(1)` inside the audio `main`** (generate-single-blog-audio.ts:160, 173, 180, 190) kills generate-blog-media before its catch or summary runs (inferred from generate-blog-media.ts:49-62).
7. **The printed retry hint doesn't work as printed.** `npx tsx scripts/generate-single-blog-audio.ts <slug>` (generate-blog-media.ts:54) skips dotenv, and the audio script has no dotenv import. Only the orchestrator loads it (generate-blog-media.ts:1).
8. **Env drift.**
   - The image script reads only `GEMINI_API_KEY`. The audio script also accepts `GOOGLE_PRIVATE_KEY`, which is a service-account key, not a Gemini key (research).
   - dotenv loads `.env`, but the README's setup copies to `.env.local` (README.md:103 vs :188).
9. **Storage creds are checked only at upload,** after 3-7 paid Gemini calls (src/lib/cloudinary.ts:4-9; generate-blog-image.ts:147-163).
10. **Every retry is billed in full.** Each overwrite re-upload also counts as a Cloudinary transformation again (cloudinary.com/documentation/transformation_counts).
11. **hf#2's body is wrong in four places**, so #8 can't assume hf#2 wires anything into the post:
    1. Gemini doesn't write "image-prompt variants"; it returns a theme JSON that fills 3 fixed templates.
    2. The audio script doesn't write a narration script.
    3. Nothing writes `audio:` into front matter.
    4. TTS doesn't "reject long inputs"; the *output* is capped.

    ([issue-2.md](issue-2.md), "Four statements"; generate-blog-image.ts:41-63; src/lib/blog.ts:55-59; `gh issue view 2`.)

**Images with words**

12. **Image models garble labels,** so VWC moved text-bearing graphics to HTML artboards (`66ca0790`, `8eae66a0`, PR #1267). Nothing checks artboard overflow, and `.artboard` has no `overflow:hidden` (src/data/blog-graphics/_brand.css:51-58; PR #1267 "Follow-up").
13. **Wording drifts between a post and its own graphic:** "a fraction of a percent" in the text vs "under 1%" in the alt (high-success-low-adoption.md:79, 81). Graphics have also shipped with wrong copy, such as "Sept 7" vs "Sept 8" (`1fa1bfa7` message).

**Video (HyperFrames)**

14. **Partial TTS exits 0.** Failed lines become "non-fatal anomalies" (MU/audio/scripts/audio.mjs:158-176), and the adapter prints only `voices.length` (FE/scripts/audio.mjs:182-184).
    - Check the voice count against the line count, and the duration against the word estimate (sk/vwc-faceless-explainer/SKILL.md:236-240).
    - There is no per-line cache, so a re-run re-bills every line (research, inferred).
15. **Deleting SCRIPT.md doesn't make a video silent.** Fully silent needs `music: none` plus no SCRIPT.md (FE/SKILL.md:110). The music query must be a short mood phrase, otherwise "no music match … skipped" (vwc SKILL.md:199-218; videos/labor-day-sprint-proof-of-work/audio.log).
16. **Nothing reads voice-direction prose.** HeyGen's request body is only `{text, voice_id, speed}`, so punctuation is the only prosody control (MU/audio/scripts/lib/tts.mjs:299-311; vwc SKILL.md:174-197).
17. **Orson (`00e3d285aba44b27a83c47c02c9c2d9c`) isn't pinned anywhere.** A run without `--voice` gets Marcia, a female voice (`05f19352…`) (vwc SKILL.md:242; `~/.media/preferences.json` is empty; tts.mjs:67; tts.md:79).
18. **`#root` paints with the frame.md canvas color (cream).** The manual fix to `#091f40` is lost whenever index.html is rebuilt (research: assemble-index.mjs).
19. **Pass `--output` explicitly.** The real run produced timestamped files, not `renders/video.mp4` (research: `ls renders`).
20. **HyperFrames needs Node ≥22.** The app pins Node 20 (`.nvmrc`; hyperframes package.json engines).
21. **`init` auto-updates the installed skills.** The only opt-out is `HYPERFRAMES_SKIP_SKILLS=1`. There were 25 CLI releases (0.8.66 to 0.8.91) in 6 days (sk/hyperframes/references/skill-lifecycle.md:12-14; `npm view hyperframes time`).
22. **The HeyGen credential resolver walks up to 5 directories looking for `.env`.** Inferred: a run inside an org's repo can bill that repo's key (MU/audio/scripts/lib/heygen.mjs:20-47; tts.md:57-59).
23. **Some commands post outward.** The CLI skill tells agents to send `npx hyperframes feedback` to a public channel after every render. `npx hyperframes publish` uploads the project. Telemetry is on by default (sk/hyperframes-cli/SKILL.md:116-126; references/preview-render.md:178-193; references/upgrade-info-misc.md:100-113).

**Output hygiene**

24. **Render folders nearly got committed.** `brag-output*/` is now in `.gitignore:105-106` (#1390). `videos/` is excluded only in the local `.git/info/exclude:21`, so a fresh clone could commit renders. pr-to-video writes outside the repo instead (sk/pr-to-video/scripts/project-dir.mjs:8-53).

**Copy and facts**

25. **The copy gate flags legitimate source text.** "modern web development" (high-success-low-adoption.md:42) trips the web-developer rule. Never "fix" a quote or a fact to pass the gate (research: `scan()` run).
26. **`numerals()` returns `[]` on LinkedIn or newsletter text,** because it reads only spoken, voiceover and quoted lines (check-copy.mjs:98-115; research ran it on a draft).
27. **Posts mix kinds of numbers** (high-success-low-adoption.md:59, 79; labor-day…md:31, 67, 74):
    - first-person data (79 applications)
    - unsourced general stats ("Referrals convert around 30%")
    - named but unlinked sources (Lightcast 28%)
    - hypothetical examples ($40M, 98%, 22%)
    - incomplete figures (about $20, with no time period)
28. **Passed deadlines:** labor-day tells readers to "be legible by September 8th" (labor-day…md:3, 117).
29. **The site's og:image is misdeclared.** It declares 1200x630 but serves 1376x768, and `og:image:alt` is the page title (curl of the live page; src/lib/cloudinary-helpers.ts:120-128; src/components/seo/page-seo.tsx:59-70). LinkedIn link cards come from this, not from the kit.

**Accounts**

30. **Free-tier Gemini traffic is "Used to improve our products: Yes"; paid is "No".** `gemini-3-pro-image` and `gemini-3.1-pro-preview` have no free tier (ai.google.dev/gemini-api/docs/pricing).
31. **Tier 1 has a spend limit of $10 per rolling 10 minutes** (429 `RESOURCE_EXHAUSTED`) and a $250 cap, both per project (ai.google.dev/gemini-api/docs/rate-limits).

**Video, found in code**

32. **The explainer can't be told which TTS provider to use.** The FE adapter hard-codes `provider: "auto"` (FE/scripts/audio.mjs:168), has no `--provider` flag, and passes none to the engine (:124-134, :70-89), even though the engine supports one (MU/audio/scripts/audio.mjs:94, 129-131).
    - `auto` means HeyGen whenever any HeyGen credential resolves (tts.mjs:25-27, :50), including through the `.env` walk-up (lesson 22).
    - This machine has `~/.heygen/credentials` (`ls`), so an `auto` run here bills HeyGen even when a brand pack names Kokoro.
    - **Inference:** a Kokoro voice id then goes to HeyGen and fails, because HeyGen accepts only Starfish ids (tts.md:79).
33. **Upstream docs disagree about stopping for sign-in.**
    - The media-use TTS reference says "STOP for the user's choice … This applies to a one-off … request just as much as inside a full workflow" (MU/audio/references/tts.md:7).
    - faceless-explainer and the brief contract say autonomous runs state the status and continue (FE/SKILL.md:39; brief-contract.md:47).
    - Even autonomous mode keeps one question before render (review-loop.md:3, 35; FE/SKILL.md:194-198).
    - So "no interactive stops" isn't something upstream promises today. hf#3 has to define it.

---

## Dependencies

**Issues**
- **hf#2 (hard).** #8 needs hf#2 to expose the following. Flag names follow #1 decision 14 and #2 decision 8; #1 hasn't adopted `--no-upload` yet, so #1 should pin all flag names in one place.
  1. **`--dry --json`**, which returns `{calls:[{model, est_tokens_in, est_tokens_out}], est_usd_low, est_usd_high}` with zero network calls (#1 decision 14). `--dry` is an hf#2 AC; `--json` and the shape are not.
  2. **`--no-upload`** plus an output directory: generate locally, then publish as a separate step (#2 decision 8). This is not an hf#2 AC and is needed for #8 AC2.
  3. **Alt text for the hero** (an hf#2 AC; #2 decision 6).
  4. **A JSON manifest per output** (`status`, `path`, `url`, `alt`, `needsReview`, `seconds`, `words`, `estCostUsd`), with steps that throw and only the CLI setting the exit code (#2 build step 10). This is not an hf#2 AC.
  5. **A front-matter reader that accepts hf#9's `date`** (#2 build step 4).
  6. **Token caps (#2 decision 13): `maxOutputTokens` and a low thinking level on every 3.1 Pro call.** This is a **hard dependency for #8 AC3**. [issue-2.md](issue-2.md) marks it as awaiting owner approval, and without it the per-post ceiling is about $4.87 (see Cost).
- **hf#3 (hard). A non-interactive contract that is in neither hf#3's AC (`gh issue view 3`) nor the decisions or plan in [issue-3.md](issue-3.md).** [issue-3.md](issue-3.md) covers only `verify-audio.mjs` (decision 8) and a provider-keyed `voice` field (decision 5). These items need to go into hf#3's AC or build plan before hf#3 is built:
  1. **Model-invocable.** The explainer skill must not set `disable-model-invocation`, so #8 can call it through the Skill tool. Otherwise Claude Code blocks the call (docs/skills).
  2. **Runs from a caller-written `BRIEF.md`** with `flow: automation` and `storyboard: no` (autonomous, brief-contract.md:21-27), a brand-pack path and the source text. It asks nothing, as FE/SKILL.md:26 already does when a BRIEF.md exists.
  3. **The pack's `tts.provider` is passed explicitly to the engine** (`--provider`), and a missing credential fails the run instead of falling back. That needs an adapter change or wrapper (lesson 32). It also settles the tts.md:7 stop with a recorded choice (inference; lesson 33).
  4. **A caller-recorded render answer** that satisfies the one question autonomous mode keeps (review-loop.md:35). Without it, #8 gains a third touchpoint (Open decision 4).
  5. **`--dry --json`** in #1 decision 14's shape: narration seconds × the provider rate, and BGM. The estimate comes from target length or word count, because SCRIPT.md doesn't exist before Step 3.
  6. **Mechanical checks** that exit non-zero: `verify-audio.mjs` (#3 decision 8) and `post-assemble.mjs` (#3 decision 8).
  7. **An explicit output path** (`--output <kitdir>/video.mp4`; lesson 19).
- **hf#9 (test input).** It supplies the clean non-VWC post. #9 decision 12 defers #8 traps, so #8 provides its own trap variant (Open decision 14). **Inference:** if both context docs keep their current text, #8's fact and staleness checks otherwise have no non-VWC positive case.
- **Brand-pack schema (unresolved, blocks Open decision 7).** #2 decision 3 and #3 decision 1 want YAML front matter in `brand.md`. #9 decision 6 wants fixed `##` headings and no YAML. [issue-1.md](issue-1.md) assigns the decision to the epic.
- **hf#1.** Its principles apply: bring your own brand and keys, no licensed assets, CI tests or evals, and a README with a before-and-after (`gh issue view 1`). The repo license is unresolved across context docs (#1 decision 1 AGPL, #2 decision 2 MIT/Apache, #3 decision 11 Apache). #8's own ported code is 100% the owner's (`git blame` above), so the license choice doesn't block #8.
- **hf#4 isn't a dependency.** The hf#8 body names only blog-media and the brand-pack explainer.
- **Repo bootstrap.** Nothing can land until `main` has an initial commit (research: `defaultBranchRef ""`).

**Tools and system**
- Node ≥22 for HyperFrames (hyperframes package.json engines).
- `tsx` if hf#2 stays TypeScript (package.json).
- FFmpeg and FFprobe.
- chrome-headless-shell, about 193 MB, installed with `npx hyperframes browser ensure` (sk/hyperframes-cli/references/doctor-browser.md:5-57).
- `npx hyperframes doctor --json` always exits 0, so gate on `.ok` (same file).
- Playwright chromium, only if artboards are used (generate-blog-graphic.ts:100-121).
- For offline TTS: Python 3.8+ with `kokoro-onnx` and `soundfile` (about a 311 MB model), plus whisper.cpp or Parakeet for word timings (MU/audio/references/requirements.md:9-28).
- Chrome can die inside macOS sandboxed agent runs. The documented response is to render with `--docker`, in the cloud, or outside the sandbox (doctor-browser.md:34-45).
- #8 packaged as a Claude Code plugin (#1 decision 2), because the no-post hook has to live in plugin `hooks/hooks.json` (Open decision 13).

**Keys and accounts (bring your own)**
- **`GEMINI_API_KEY`** on a **billed** project for the hero. Audio can run on the free tier (pricing page).
- **Storage:** Cloudinary (`CLOUDINARY_URL` is native to SDK 2.9.0, node_modules/cloudinary/lib/config.js:105-110), S3-compatible, or local. This is an hf#2 AC. #8 v1 needs none (Open decision 1).
- **Video TTS**, per tts.md:39-43:
  - **HeyGen**, via `npx hyperframes auth login` (OAuth) or `HEYGEN_API_KEY`. The skill doc says OAuth users "can consume the web-plan free allowance (10 min/month)" (tts.md:62-63). **That is unverified:** no official HeyGen page states it (developers.heygen.com cli.md, usage-limits.md and for-ai-agents.md checked 2026-09-29). A third-party review says OAuth bills an "eligible web plan" and API keys draw from a separate prepaid wallet with a $5 minimum top-up (therundown.ai/tools/heygen-cli).
  - **ElevenLabs** (`ELEVENLABS_API_KEY`).
  - **Kokoro**, local and free.
  - BGM needs a HeyGen credential; without one it is skipped (FE/SKILL.md:106; FE/scripts/audio.mjs:164-174).

**Owner rules that bind the build** (~/.claude/CLAUDE.md; owner decision)
- Branch off `main`, with one independent PR per issue.
- Conventional Commits.
- No AI attribution in commits, PRs or docs (owner rule).
- No `--no-verify`.
- Never commit render output or Gilroy/Gotham Pro.

---

## Cost

Prices are for the Standard paid tier, read 2026-09-29 from ai.google.dev/gemini-api/docs/pricing ("Last updated 2026-09-24"). Token constants: 4 chars ≈ 1 token; an input image at default resolution ≈ 1,120 tokens; TTS output = 25 tokens/s (ai.google.dev/gemini-api/docs/tokens, /media-resolution). Thought tokens are billed as output ("response pricing is the sum of output tokens and thinking tokens"). 3.1 Pro thinking "cannot be disabled" and defaults to high (ai.google.dev/gemini-api/docs/thinking).

| Line item | Math | Per kit |
|---|---|---|
| Hero theme call (3.1 Pro), no thinking | ~2,350 in × $2/1M + ~200 out × $12/1M | $0.0071 |
| Each image attempt, no thinking | prompt ~340 × $2/1M ($0.0007) + 1K image 1,120 × $120/1M ($0.1344) + vision check 1,200 in × $2/1M ($0.0024) + ~40 out × $12/1M ($0.0005) | $0.1380 |
| **Hero, 1 attempt / 3 attempts, no thinking** | $0.0071 + n × $0.1380 | **$0.1451 / $0.4211** |
| Hero with thinking. **Assumption, never measured:** 2,000 thought tokens per 3.1 Pro call and 1,000 per image call. The scripts never read `usageMetadata` (research: grep) | +$0.024 per 3.1 Pro call, +$0.036 per attempt | $0.205 / $0.553 |
| Hero alt text | $0 if the vision-check call also returns it (#2 decision 6); ~$0.003 as a separate 3.1 Pro call (1,200 in + ~60 out); inferred | $0-0.003 |
| **Audio, 1,400-word post** (2.5 Flash TTS) | 1,400 ÷ 187 wpm = 449.2 s × 25 = 11,230 tokens × $10/1M + ~2,150 in × $0.50/1M | **$0.1134** ($0.101 at 210 wpm to $0.125 at 170 wpm; $0 on the free tier; Batch $0.057) |
| Audio, high-success-low-adoption (measured 369.8 s) | 9,245 tokens × $10/1M + ~2,000 × $0.50/1M | ≈$0.093 |
| Audio, hf#9 fixture (~800 words) | 256.7-282.4 s → 6,417-7,059 tokens | ≈$0.065-0.071 |
| Video narration, 60-90 s | **HeyGen Enterprise (verified):** 0.000333 credits/s × $0.50/credit = $0.0001665/s (developers.heygen.com/docs/enterprise-pricing.md). **HeyGen self-serve (third-party, unverified):** $0.000667/s (therundown.ai/tools/heygen-cli). **Kokoro:** $0. **Gemini 2.5 TTS:** 90 s × 25 × $10/1M | $0.010-0.015 (Enterprise) / **$0.040-0.060 (self-serve, unverified)** / $0 (Kokoro) / $0.015-0.0225 (Gemini) |
| Video BGM / SFX | HeyGen catalog search is free on OAuth; SFX are bundled (MU/references/setup-providers.md:9-12) | $0 |
| Video render | local `hyperframes render` | $0 (~51 s for 90 s of video) |
| LinkedIn post, newsletter blurb | written by the agent in the Claude session with no Gemini call (inferred design) | $0 API; Claude usage not researched |
| Cloudinary (if a human publishes later) | 2 uploads + f_mp3 at 0.1 tx/s × 450 s = 45 tx + image derivations ≈ 0.05 credits; storage ≈ 29 MB ≈ 0.03 credits/month. The Free plan is 25 credits/month (cloudinary.com/pricing; /documentation/transformation_counts) | $0 within Free |

**Illustrative per-kit range. It rests on the unmeasured thinking assumption above.**
- **Floor, $0.246:** one image attempt, zero thinking, audio at 210 wpm, Kokoro narration: $0.1451 + $0.1011. Zero thinking can't happen on 3.1 Pro, so this is a lower bound, not an expectation.
- **Illustrative high, $0.741:** 3 attempts with the assumed thinking, a separate alt call, audio at 170 wpm, and self-serve HeyGen at 90 s: $0.5531 + $0.003 + $0.1246 + $0.060.

**Uncapped ceiling.** The scripts set no `maxOutputTokens` and no thinking level (generate-blog-image.ts:60-63, 92-98, 183-209).
- Theme call: $0.0047 + 65,536 × $12/1M = $0.791.
- Each attempt: $0.515 (image) + $0.789 (vision check) = $1.304. Three attempts = $3.911.
- Each TTS chunk: 8,192 × $0.50/1M + 16,384 × $10/1M = $0.168.
- Total: about **$4.87 per post** before video, or about $4.93 with self-serve HeyGen narration. A 2-chunk post comes to about $5.10.

**Bounded worst case. This is an assumption, not a measurement, and it holds only if the owner approves #2 decision 13.** It assumes hf#2 sets `maxOutputTokens` 2,048 on each 3.1 Pro call and 4,096 on the image call. The thinking doc says `max_output_tokens` includes thought tokens; I assume `generateContent`'s `maxOutputTokens` behaves the same (the quote is from the Interactions API page, so this is unverified). I also assume image tokens count toward the cap; if they don't, add about $0.013 per attempt.
- Theme ≤ $0.0047 + 2,048 × $12/1M = **$0.029**.
- Image call ≤ $0.0007 + $0.1344 + (4,096 − 1,120) × $12/1M = $0.171. Vision check ≤ $0.0024 + 2,048 × $12/1M = $0.027. That is ≤ **$0.198 per attempt**, and three attempts ≈ **$0.594**.
- TTS is already capped by the model, at $0.168 per chunk, with ceil(words ÷ 1,700) chunks.
- Narration ≤ $0.060 (self-serve HeyGen, third-party rate).
- **Total ≈ $0.85** for a post of 1,700 words or fewer, and **≈ $1.02** with 2 chunks.

**Price drift.**
- `gemini-3.8-flash-tts`: $9.00/1M audio out and $0.50/1M text in through 2026-12-31, then **$18.00 and $1.00 from 2027-01-01**.
- Flash-Lite TTS: $6.00, then $12.00.
- The 1,400-word audio would cost $0.102 on 3.8 now and $0.204 from 2027 (pricing page).

**Implicit paid calls the guard must count.**
- A retried TTS chunk or image attempt is billed again (research).
- `audio.mjs` re-synthesizes every line on a re-run (lesson 14).
- An `auto` provider run bills HeyGen whenever a credential resolves (lesson 32).
- HyperFrames capture auto-captions assets whenever a `GEMINI_API_KEY` is present. That applies to product-launch-video capture, not faceless-explainer; it's noted for completeness (sk/product-launch-video/SKILL.md:74).

**Not researched:**
- An official HeyGen self-serve USD rate per second of TTS. The pricing modal at app.heygen.com/developers/api?modal=pricing requires login.
- HeyGen cloud-render credit cost.
- Real `thoughtsTokenCount` volumes for these calls.
- The Claude usage cost of writing the text outputs.

---

## Acceptance criteria, mapped

**1. One command runs the whole kit from a post; each output can also run alone.**
- *Satisfies today:*
  - `generate:blog-media` runs image plus audio in one command, and `generate:blog-image` runs alone (package.json:30-31).
  - The audio script runs alone only with env exported (lesson 7).
  - The video runs as a skill conversation, `/vwc-faceless-explainer`.
- *Missing:*
  - The video leg is a multi-step agent workflow with per-frame sub-agents, not a CLI (FE/SKILL.md). So #8 has to invoke it as a skill, which needs hf#3 contract item 1.
  - No generator exists for the LinkedIn post, newsletter blurb or alt text.
  - There is no `--only <output>`.
  - Results carry no artifact path, error or cost (generate-blog-media.ts:20-23).
- *Risk:*
  - Upstream still stops for sign-in in one doc (tts.md:7) and keeps one render question in autonomous mode (review-loop.md:35). "One command" holds only if hf#3 defines contract items 2-4 (lesson 33).
  - A `process.exit` inside a step kills the run (lesson 6).
  - Passing the slug mutates `process.argv[2]` (generate-blog-media.ts:75).

**2. A review step shows all drafts together before anything is uploaded or published.**
- *Satisfies today:*
  - `generate-blog-graphic --dry` renders locally and skips upload (generate-blog-graphic.ts:123-126).
  - HyperFrames has a storyboard proposal table (sk/hyperframes-creative/references/story-spine.md:26-33), a `snapshot` contact sheet, and an "Autonomous is not silent" delivery with a contact sheet (brief-contract.md:57).
  - brag puts all short-form formats in one file (share-copy.txt).
- *Missing:*
  - hf#2's source scripts upload inside the same call (generate-blog-image.ts:163-167; generate-single-blog-audio.ts:123-152). `--no-upload` is only a proposal in [issue-2.md](issue-2.md) (decision 8).
  - There is no manifest and no combined review surface.
- *Risk:* if hf#2 ships without a generate/publish split, #8 can't meet this criterion without rework. The rendered MP4 exists at review only if render comes before review (Open decision 4).

**3. A cost guard shows the estimated API cost before running, with a configurable ceiling.**
- *Satisfies today:* nothing estimates cost (research: no script has a cost mode). media-use rule X4 says "the agent confirms before an agent-initiated paid call" (MU/references/setup-providers.md:40).
- *Missing:*
  - hf#2's `--dry --json` (an hf#2 AC, not built).
  - hf#3's `--dry --json` (not in hf#3's AC or [issue-3.md](issue-3.md)).
  - An aggregator and the ceiling config.
  - **Token caps (#2 decision 13), not approved.**
- *Risk:*
  - Without caps, hf#2's honest `est_usd_high` is about $4.87, and a $1.50 ceiling blocks every paid run (Open decision 6).
  - Thinking volume is unmeasured.
  - HeyGen's self-serve rate is unverified.
  - The 2027-01-01 TTS price doubling.
  - The Tier 1 $10/10-min spend limit (lesson 31).

**4. Brand pack, voice and calls to action come from the organization's configuration.**
- *Satisfies today:*
  - VWC copy law exists but is hard-coded (AGENTS.md:262-268; check-copy.mjs:20-38).
  - The VWC brand folder is VWC-only (sk/vwc-faceless-explainer/brand/).
  - hf#9 specifies these `brand.md` fields: name, mission, 3-5 hex colors, heading and body font, voice (3-5 adjectives plus 2 sentences), and 3-5 copy rules (`gh issue view 9`).
- *Missing:*
  - hf#3's pack schema doesn't exist, and its file format is unresolved (YAML vs headings, see Dependencies).
  - It lacks the fields #8 needs: CTA verbs plus URLs, social voice (author or org), hashtags, link policy, newsletter sign-off, TTS provider plus speaker id, and the cost ceiling.
- *Risk:*
  - "Voice" means two things: a TTS speaker id (Kore, Orson, am_michael; tts.md:39-43) and a writing tone (#3 decision 5 splits these into `voice` and `tone`).
  - A pack's provider is ignored today (lesson 32).
  - Orson isn't pinned (lesson 17).
  - The audio overview (Gemini Kore) and the video (HeyGen or Kokoro) will sound like different people. tts.md:29-33 warns that a fallback voice "sounds wrong beside the others".

**5. Nothing is posted to social platforms; the agent only writes files.**
- *Satisfies today:* no VWC script posts anywhere. The only upload target is Cloudinary (research: grep of scripts/).
- *Missing:* enforcement.
  - A Claude Code session with the owner's connectors exposes Gmail `send_message`, Mailchimp `save_to_mailchimp` and `edit_campaign`, Canva, and Descript `publish_project` (checked during research, 2026-09-29).
  - HyperFrames `publish` and `feedback` post outward (lesson 23).
- *Risk:*
  - The video leg spawns per-frame subagents, and a subagent that omits `tools` inherits all of these (docs/sub-agents).
  - Only settings, managed-policy and plugin hooks are documented to fire inside subagents (docs/hooks). Skill-frontmatter hooks aren't, and skill `disallowed-tools` clears at the next user message (docs/skills).
  - **Ambiguity:** AC2 implies an upload happens after review, while AC5 says "only writes files" (Open decision 1).

**6. It runs end to end on a post from an organization other than VWC.**
- *Satisfies today:* nothing yet. The hf#9 fixture is specified but not written.
- *Missing:* hf#2 and hf#3 generalization. VWC coupling today:
  - `BLOG_DIR` is hard-coded (generate-blog-media.ts:5).
  - The `@/lib/cloudinary` alias (generate-blog-image.ts:5).
  - `NEXT_PUBLIC_*` env names (src/lib/cloudinary.ts:4-9).
  - "Vets Who Code" is hard-coded in the graphic prompt (generate-blog-graphic.ts:50).
- *Risk:*
  - The fixture uses `date` while VWC uses `postedAt`, so testing only one leaves the other untested (research: front-matter key count).
  - The fixture has no #8 traps (#9 decision 12), which Open decision 14 resolves.
  - A free-tier key fails the image step (lesson 30).

---

## Open decisions for the owner

1. **What "uploaded" means under "only writes files."**
   - (a) #8 never uploads; a human runs hf#2's publish step afterward.
   - (b) #8 may upload to storage after review approval, but never to social or email.
   - **Default: (a).** Why: it satisfies AC2 and AC5 literally, keeps #8 free of storage credentials, and publishing becomes one documented hf#2 command.

2. **Form factor and how #8 calls each leg.**
   - **Default:**
     - #8 is a user-invoked skill (`disable-model-invocation: true`) in the hashflag plugin, running in the main conversation.
     - hf#2 runs as a **CLI subprocess**. #2 decision 16 makes blog-media `disable-model-invocation`, so its CLI is the interface.
     - hf#3 is invoked through the **Skill tool** in the same conversation, which needs hf#3 contract item 1.
   - Why:
     - The cost and review gates need `AskUserQuestion`, which subagents lose, and workflows can't pause (docs/sub-agents; docs/workflows).
     - The video leg is an agent workflow, not a CLI (FE/SKILL.md).
     - Claude Code blocks Claude from invoking a `disable-model-invocation` skill (docs/skills).
     - Subprocesses also contain a stray `process.exit` (lesson 6).
   - Rejected alternative: a headless `claude -p` subprocess for hf#3. It has no user to answer the render question (inference).

3. **The flags and results hf#2 and hf#3 must expose.**
   - **Default:**
     - `--dry --json` on both, in #1 decision 14's shape (`{calls:[{model, est_tokens_in, est_tokens_out}], est_usd_low, est_usd_high}`, zero network).
     - `--no-upload` plus an output dir on hf#2 (#2 decision 8).
     - hf#2's per-output manifest (#2 step 10).
     - #8 wraps each result as `{kind, status: ok|warn|failed|skipped, artifact, error, retry, estCostUsd, usage}`.
   - Why: it matches #1 decision 14 instead of a conflicting `--estimate --json` variant. The flag names should be pinned once in #1 before hf#2 is built, because retrofitting after merge means rework.

4. **Where the video sits relative to review.**
   - **Default:**
     - Run hf#3 autonomously from a caller-written BRIEF.md (`flow: automation`, `storyboard: no`).
     - Collect render consent in #8's single up-front cost prompt, and pass it as the caller-recorded render answer (hf#3 contract item 4).
     - Render locally, then show the MP4 plus the contact sheet in review.
   - If hf#3 doesn't adopt item 4, accept three touchpoints: the estimate, hf#3's "preview first, or render?" (review-loop.md:35), then the review.
   - Why:
     - A local render costs $0 and takes about 51 s.
     - A review without the actual video isn't a review.
     - Upstream says "Render only after the answer" (brief-contract.md:51), so recording the answer earlier stays inside the rule only if hf#3 says so.
   - Cost of being wrong: one wasted local render.

5. **TTS provider and speaker for the video.**
   - **Default:**
     - Read `tts.{provider, speaker}` from the pack, and have hf#3 pass `--provider` to the engine. Today's adapter can't (lesson 32).
     - A missing credential for the named provider fails the run instead of falling back, which `pickProvider` already does for an explicit choice (tts.mjs:38-49).
     - v1 accepts that the overview (Gemini Kore) and the video voice differ, and flags it in review.
   - Why:
     - A recorded provider is the "user's choice" tts.md:7 asks for (inference).
     - Silent `auto` would bill HeyGen on any machine with a credential (lesson 32).
     - Unifying on Gemini needs upstream's Gemini TTS path (`01601d1105`, #4377), which isn't in the local install, plus hf#3's provider decision (#3 decision 5).

6. **Cost ceiling.**
   - **Default:** $1.50 per kit, compared against the `est_usd_high` sum from the legs' `--dry --json`. Over the ceiling, stop before any paid call and offer only the text outputs.
   - **This default depends on #2 decision 13 (token caps) being approved.** If hf#2 ships uncapped, its honest `est_usd_high` is about $4.87 and the guard blocks every paid run. The fallback is a ceiling of about $5.10 or more, which then only guards against runaway multi-post mistakes.
   - Why $1.50: the **assumed** bounded worst case is about $0.85-1.02 (see Cost; the caps are hypothetical and the HeyGen rate is third-party). That leaves room for one re-billed TTS chunk ($0.168) or a third chunk. The illustrative high of $0.74 rests on unmeasured thinking volumes.

7. **One org config.**
   - **Default:** extend hf#3's pack with a `kit` section (CTA verbs and URLs, `social.voice`, hashtags ≤3, link policy, newsletter sign-off, `tts.{provider, speaker}`, `cost_ceiling_usd`) rather than a second file.
   - Why: AC4, and one home stops the skills drifting apart.
   - **Blocked** until the brand.md format (YAML vs headings) is settled across #1/#2/#3/#9.

8. **Facts policy for short-form.**
   - **Default:**
     - LinkedIn and the newsletter restate only numbers that appear in the post as first-person or sourced facts.
     - Unsourced general stats, hypothetical examples and unlinked named sources are left out and listed as flags in the review.
     - Quotes are never rewritten to pass the copy gate.
   - Why: the epic principle "flag stats that have no source" (hf#1), #1 decision 19, and there's no room for footnotes (lessons 25-27).

9. **LinkedIn voice and links.**
   - **Default:** match the post's grammatical person (a first-person post gets author voice), with a `social.voice` override. Put the link in the body. No unicode bold.
   - Why:
     - Moving "I sent 79 applications" to org voice misattributes it.
     - LinkedIn hasn't confirmed a link penalty (tryordinal.com study).
     - Unicode bold hurts screen readers (knowledge-based, unverified).

10. **Output location.**
    - **Default:** `${XDG_CACHE_HOME:-~/.cache}/hashflag/content-kit/<slug>/`, with `--out` to override, and the path printed at start and end.
    - Why: it's #1 decision 12's `~/.cache/hashflag/<skill>/` with XDG honored, following the pr-to-video pattern (project-dir.mjs:35-53). In-repo render folders have already needed ignore rules, and `videos/` is excluded only locally (lesson 24).

11. **Stale sources.**
    - **Default:** warn in the review, but don't block, when the post has a past explicit deadline or is more than 90 days old. The 90 is an arbitrary starting value.
    - Why: labor-day's "September 8th" (lesson 28). Blocking would stop legitimate evergreen reposts.

12. **Hero alt text source (shared with #2 decision 6).**
    - **Default:** have the existing vision-check call also return a description of 120 chars or fewer.
    - Why: it adds $0. LinkedIn's alt limit is unverified: third parties claim 120 or 300, and linkedin.com/help/linkedin/answer/a519856 states none. 120 satisfies every claim. #2 decision 6 sets no length, so the two need aligning.

13. **Enforcing "never posts."**
    - **Default:** a `PreToolUse` hook in the plugin's `hooks/hooks.json`, not in skill frontmatter. It matches `mcp__.*` and Bash commands containing `hyperframes (publish|feedback|cloud)` and returns `permissionDecision: "deny"`.
    - Because plugin hooks run whenever the plugin is enabled, the hook script stays inert unless a run marker exists: `${CLAUDE_PLUGIN_DATA}/runs/<session_id>`, written by #8's first step, removed at the end, with a TTL so a crash can't leave it on (design is inference). Also prefix every HyperFrames command with `HYPERFRAMES_NO_TELEMETRY=1`.
    - Why:
      - Plugin hooks are **documented** to fire on subagent tool calls (docs/hooks; docs/sub-agents), and the video leg spawns per-frame subagents.
      - Skill-frontmatter hooks persist for the rest of the session and are **not documented** to reach subagents.
      - Skill `disallowed-tools` clears at the next user message, which would be the cost-prompt reply (docs/skills).
      - Plugin agents ignore `hooks` (docs/sub-agents).
      - MCP tool names vary per user, so a list of names is brittle, and a bare `mcp__x` matcher matches nothing (docs/hooks).

14. **Test input for the facts and staleness checks (resolves #9 decision 12).**
    - **Default:**
      - #8 owns a trap variant in its own PR: a copy of hf#9's `nonprofit/blog-post.md` (CC0) with one hypothetical example number, one unsourced general stat, one past explicit deadline and an old `date`, placed beside #8's tests.
      - The unmodified hf#9 post is the negative control and should produce zero flags.
      - The VWC labor-day post is read from an app checkout in manual evals, never copied in.
    - Why: #9 defers #8 traps to keep a good first issue within 3-4 hours (#9 decision 12). The traps sit next to the tests that assert on them, and nothing waits on a follow-up issue.
    - Alternative: file a follow-up fixture issue under #1.

---

## Suggested build plan

Preconditions: the contracts in step 0 have landed in hf#2 and hf#3 before those skills are built, hf#2 and hf#3 are merged, and the repo is bootstrapped.

0. **Get the contracts into the sibling issues.** Record hf#2's caps (#2 decision 13), `--dry --json`, `--no-upload` and the manifest; hf#3's contract items 1-7; and #1's single flag table.
   *Verify:* `gh issue view 2` and `gh issue view 3` list these items in AC or implementation notes. `gh issue view 1` names the flags once.
1. **Check the contract.**
   *Verify:* with the network blocked, `<blog-media> --dry --json <fixture>` and `<explainer> --dry --json <fixture>` each print JSON in #1 decision 14's shape and exit 0. For the 1,400-word fixture, blog-media's `est_usd_high` is $1.02 or less, which is only true if caps exist.
2. **Write the result and manifest schema, plus an N-step orchestrator that runs hf#2 outputs as subprocesses with tri-state status.**
   *Verify:* unit tests pass. They are ports of the 10 generate-blog-media cases, plus:
   - a "warn" step isn't reported as ok;
   - a step that calls `process.exit(1)` is recorded as failed while later steps still run;
   - nothing is written into the content dir (use a temp dir).
3. **Free preflight.** Check the Gemini key, the pack's named TTS provider and its credential, `npx hyperframes doctor --json | jq -e .ok`, ffmpeg, and the output dir.
   *Verify:* a test with a missing key, or a pack naming HeyGen with no credential, fails before any generator mock is called (0 calls). A pack naming Kokoro on a machine with `~/.heygen/credentials` still resolves to Kokoro.
4. **Cost guard.** Sum the `est_usd_high` and `est_usd_low` values, print a line-item table, compare to `cost_ceiling_usd`, and ask once, including render consent (Open decision 4).
   *Verify:*
   - an estimator stub returning $4.87 (uncapped) invokes zero paid generators and prints the text-only offer;
   - under the ceiling, the prompt lists every line item.
5. **Text outputs.**
   - SKILL.md templates for `linkedin.md`, `newsletter.md` and `alt-text.md`.
   - A facts ledger with its own numeral extractor. Don't use `numerals()` (lesson 26).
   - A generalized copy gate driven by the pack's rules.
   - The #8 trap variant (Open decision 14).

   *Verify:* on high-success-low-adoption, the clean hf#9 post and the trap variant:
   - every figure in the outputs appears in the post body;
   - the copy gate is clean;
   - LinkedIn is 3,000 chars or fewer, with a hook of 140 or fewer;
   - the newsletter has one link and one CTA;
   - the trap variant yields exactly 3 fact or staleness flags, and none of the flagged figures appear in the outputs;
   - the clean hf#9 post yields 0 flags.

   Golden target: an illustrative, unpublished draft from research. It is 1,120 chars with a 107-char hook, passed `check-copy scan()`, and its claims map to post lines 20-24, 42-48, 53, 77-83 and 101.
   ```
   I sent 79 applications in a 60-day job hunt. Four turned into wins. None came from cold applications alone.
   …
   My two full-time offers came through recruiters who reached out to me. My two contracts came through my network. That inbound came from years of building in public.
   …
   Full post: https://vetswhocode.io/blogs/high-success-low-adoption
   #VetsWhoCode #SoftwareEngineering #BuildInPublic
   ```
6. **Media legs.** hf#2 runs with `--no-upload` into the kit dir. hf#3 runs through the Skill tool from a caller-written BRIEF.md and renders with `--output <kitdir>/video.mp4`. After each leg, check:
   - the artifact exists;
   - audio duration falls between words ÷ 213 and words ÷ 158 minutes (lesson 2);
   - hf#3's `verify-audio.mjs` exits 0 (lesson 14);
   - the image status isn't `warn`.

   *Verify:* in a mocked end-to-end run, the kit dir holds a hero image, WAV, MP4 and manifest, and no storage or publish function is called. A short-audio fixture is flagged `warn`.
7. **Review.** Write `REVIEW.md` plus `manifest.json` with every draft, every flag (unsourced stats, deadline, text-gate warn, voice mismatch, the VWC og:image note), and estimated vs actual cost from `usageMetadata`. Then stop.
   *Verify:* the end-to-end run exits after printing the review path. `REVIEW.md` lists all 6 outputs with status, and the upload mock count is 0.
8. **`--only <output>`.**
   *Verify:* `--only linkedin` makes zero paid calls, and `--only audio` invokes only hf#2 audio.
9. **The no-post hook in `hooks/hooks.json`, plus telemetry off** (Open decision 13).
   *Verify:* run a manual session with the plugin loaded (`--plugin-dir`) during an active kit run:
   - a main-thread call to a send or publish MCP tool is denied;
   - the same call from a subagent spawned during the run is denied, and the hook input carries `agent_id`;
   - with no run marker, the tool isn't denied;
   - a grep of the skill dir for platform post endpoints is empty.

   Also run once with the hook in skill frontmatter instead and record whether it fires inside the subagent. The docs are silent on this.
10. **Live evals, run manually and not in CI:** the trap variant, the clean hf#9 post and one VWC post, with real keys.
    *Verify:* all three complete, actual cost falls inside the estimated range, and the README gets the before-and-after excerpt (hf#1 AC). CI runs only the mocked tests. Research recommends not exposing paid keys to fork PRs.

**Not researched:**
- Whether skill-frontmatter hooks fire inside subagents. The docs don't say; step 9 tests it live.
- Whether answering an `AskUserQuestion` prompt counts as "your next message" for clearing skill `disallowed-tools` (docs/skills doesn't say).
- Whether local `hyperframes render` needs network. GSAP loads from jsDelivr (FE/scripts/assemble-index.mjs:581), and the hyperframes 0.8.91 dist references the jsDelivr runtime URL (npm hyperframes 0.8.91 tarball, grep). vwc SKILL.md:69 asserts "The render machine has no network", which hasn't been reconciled with that.
- Free-tier and Tier 1 RPM/RPD for the three Gemini models (the rate-limits page defers to AI Studio).
- Whether VWC sends a recurring Mailchimp newsletter, and what its template looks like.
- LinkedIn's real alt-text limit.
- An official source for HeyGen's OAuth "10 min/month" allowance and its self-serve TTS rate.

---

## Sources

**hashflag-skills:**
- Issues hf#1, hf#2, hf#3, hf#8 and hf#9 (`gh issue view -R Vets-Who-Code/hashflag-skills`, 2026-09-29); `gh api repos/Vets-Who-Code/hashflag-skills`.
- Sibling context docs [issue-1.md](issue-1.md), [issue-2.md](issue-2.md), [issue-3.md](issue-3.md), [issue-7.md](issue-7.md) and [issue-9.md](issue-9.md) (2026-09-29). Cited decisions: #1 decisions 1, 2, 3, 12, 14 and 19; #2 decisions 2, 3, 6, 8, 13 and 16, and steps 4 and 10; #3 decisions 1, 5, 8 and 11; #9 decisions 4, 6 and 12, and step 7.

**vets-who-code-app files (at b7c19088):**
- Media scripts: scripts/generate-blog-media.ts; scripts/generate-blog-image.ts; scripts/image-prompts.ts; scripts/generate-single-blog-audio.ts; scripts/generate-blog-graphic.ts; scripts/generate-blog-audio-overviews.ts; scripts/lib/cloudinary.ts.
- Tests: __tests__/scripts/generate-blog-media.test.ts; __tests__/scripts/generate-blog-graphic.test.ts.
- Site code: src/lib/blog.ts; src/lib/cloudinary.ts; src/lib/cloudinary-helpers.ts; src/containers/blog-details/index.tsx; src/components/seo/page-seo.tsx; src/pages/blogs/[slug].tsx; src/pages/api/og.tsx; src/pages/api/newsletter.ts.
- Content and data: src/data/outcomes.ts; src/data/blogs/high-success-low-adoption.md; src/data/blogs/labor-day-sprint-10-days-to-proof-of-work.md; src/data/blogs/two-pointers-a-practical-technique-for-code-challenges.md; src/data/blogs/ai-as-infrastructure-audio-pipeline.md; src/data/blog-audio/labor-day-sprint-10-days-to-proof-of-work.md; src/data/blog-graphics/_brand.css.
- Config and docs: package.json; .nvmrc; .gitignore; .git/info/exclude; .env.example; README.md; AGENTS.md.
- Local output: videos/labor-day-sprint-proof-of-work/; videos/vets-who-code-reel/renders/; brag-output-2026-09-22-134936/share-copy.txt.
- `git blame --line-porcelain` on scripts/generate-blog-media.ts and __tests__/scripts/generate-blog-media.test.ts.

**vets-who-code-app commits and PRs:** caef1b5e (#974); 7b0f4aef (#959); 8443c807; 1fa1bfa7 / PR #1266; daf251d1; 1f77237b; 66ca0790; 8eae66a0; PR #1267; 48d1ad46 (#1352); 62c92a01 (#1436); 47165207 (#1437); #1390; #1418; #1460.

**Local skills:**
- vwc-faceless-explainer: sk/vwc-faceless-explainer/SKILL.md; scripts/check-copy.mjs; brand/.
- faceless-explainer: FE/SKILL.md (:22-43, 90-112, 120, 186-204); FE/scripts/audio.mjs (:25-89, 124-185); FE/scripts/assemble-index.mjs.
- media-use: MU/SKILL.md; MU/audio/scripts/audio.mjs (:18, 94, 120-136, 158-176); MU/audio/scripts/lib/tts.mjs (:25-51, 67, 299-311); MU/audio/scripts/lib/heygen.mjs; MU/audio/references/tts.md (:7, 29-43, 57-79); MU/audio/references/requirements.md; MU/references/setup-providers.md.
- hyperframes: sk/hyperframes/references/brief-contract.md (:11-57); review-loop.md (:3, 13, 25, 35); subagent-dispatch.md; skill-lifecycle.md.
- hyperframes-cli: sk/hyperframes-cli/SKILL.md; references/preview-render.md; doctor-browser.md; upgrade-info-misc.md.
- Other video skills: sk/hyperframes-creative/references/story-spine.md; narration.md; sk/pr-to-video/scripts/project-dir.mjs; references/story-design.md; sk/product-launch-video/SKILL.md.
- Marketing skills: sk/emails/SKILL.md; references/email-types.md; sk/product-marketing/SKILL.md; sk/copywriting/SKILL.md; references/copy-frameworks.md.
- Owner skills: sk/hashflag-*/SKILL.md.
- brag: brag/skills/brag/SKILL.md; references/step-4-deliver.md; .claude-plugin/plugin.json.
- Config: ~/.agents/.skill-lock.json; ~/.media/preferences.json; ~/.heygen/ (existence only; `ls`).

**URLs (read 2026-09-29):**
- Gemini:
  - ai.google.dev/gemini-api/docs/pricing
  - /deprecations
  - /speech-generation
  - /models/gemini-2.5-flash-preview-tts
  - /models/gemini-3.8-flash-tts
  - /rate-limits
  - /tokens
  - /media-resolution
  - /thinking
  - /interactions
- Cloudinary:
  - cloudinary.com/pricing
  - /pricing/compare-plans
  - /documentation/transformation_counts
  - /documentation/image_upload_api_reference_upload
- HeyGen:
  - developers.heygen.com/docs/enterprise-pricing.md
  - /docs/usage-limits.md
  - /cli.md
  - /docs/for-ai-agents.md
  - /llms.txt
  - www.heygen.com/pricing
  - Third-party: www.therundown.ai/tools/heygen-cli
- LinkedIn:
  - linkedin.com/help/linkedin/answer/a528176
  - /a519856
  - linkedin.com/help/lms/answer/a426534
  - authoredup.com/blog/linkedin-character-limit
  - tryordinal.com/blog/linkedin-link-penalty-study
- Claude Code:
  - code.claude.com/docs/en/hooks ("Hook locations", "Hooks in skills and agents", "Common fields", MCP matchers, decision control)
  - /sub-agents
  - /skills
  - /workflows
  - /plugins/components
  - /plugins/manifest-reference
- Accessibility:
  - w3.org/WAI/tutorials/images/decision-tree
  - w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- HyperFrames: github.com/heygen-com/hyperframes (commit 01601d1105, #4377); npm hyperframes 0.8.91 tarball.

**Research side effects:**
- No repo, GitHub-write or paid-API calls were made during research. All `gh` use was read-only.