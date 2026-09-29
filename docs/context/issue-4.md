# #4 [Skill]: Project to demo video and case study for job seekers: context

**State.** The issue is open and labeled `enhancement`. It was created 2026-09-27T01:32:17Z and has no comments and no assignee (`gh issue view 4 -R Vets-Who-Code/hashflag-skills`, 2026-09-29). `Vets-Who-Code/hashflag-skills` is private and empty: `size 0`, no license, and `/commits` returns HTTP 409 "Git Repository is empty" (`gh api repos/Vets-Who-Code/hashflag-skills`, 2026-09-29). The owner's build order is #2, #3, #4, then #8 (#1 body, "Build order").

**What the issue asks for.** "Point the skill at a portfolio repo and get a 60-second demo video plus a case-study blog post, with its own hero image and audio overview." It "builds on the blog-media and brand-pack explainer skills" (#4 body).

**Cross-document reconciliation.** The context docs for #1, #2, #3 and #9 disagreed on four points. Each is argued under Open decisions.
- **Test repos.** The #4 doc's test-repo choice replaces decision 17 in [issue-1.md](issue-1.md) ("VetsAI plus the fictional fixture"). A fixture is not a catalog repo, and AC 5 asks for two catalog repos. #1's J0dI3 gate is kept (decision 2).
- **Fixture owner.** #4 owns it. That matches [issue-9.md](issue-9.md) decision 12, which keeps it out of #9. [issue-1.md](issue-1.md) decision 16 should name #4 (decision 4).
- **#3 handoff.** #3's AC defines no input contract. One is proposed here (decision 1; plan step 1).
- **#2's wrong issue text.** [issue-2.md](issue-2.md) lists four wrong statements and [issue-1.md](issue-1.md) counts three. Two of them matter to #4 (Lessons, Blog media).

---

## What exists today

No VWC script and no installed skill turns a whole repository into a case study or a demo video. Three installed skills each cover part of the job:
- **pr-to-video** ingests through `gh`, but only for a single PR.
- **brag** reads a project's code, but caps videos at 15-25 s and uses hype tones.
- **faceless-explainer** takes text and invents its visuals.

#4 combines pieces of these with #2 and #3. Everything below is prior art to port or wrap. None of it can be called as-is on a whole repo.

### Repo and code ingest (pr-to-video, Apache-2.0, heygen-com/hyperframes)
- **`~/.claude/skills/pr-to-video/scripts/fetch-pr.mjs`** (234 lines)
  - Dies with "gh is not authenticated" whenever `gh auth status` exits non-zero (fetch-pr.mjs:61-63). On this machine that check fails even though the active account works (Lessons, Repo reading).
  - Pulls `gh pr view --json …` and paginates files through `gh api --paginate …/pulls/<n>/files`, because `pr view` truncates at about 100 files (fetch-pr.mjs:101-138).
  - Writes `capture/pr.json` and `capture/diff.patch`.
  - Resolves `shipped_version` from the first non-draft release after the merge. Failing that, it uses the default branch's `package.json`, labeled "unreleased". Otherwise it is null (fetch-pr.mjs:143-205).
  - This is the template for a repo ingest.
- **`…/scripts/ingest.mjs`** (561 lines)
  - Offline and budget-bounded: MAX_BODY_CHARS 2600, MAX_DIFF_CHARS 4800, MAX_HUNK_LINES 22, MAX_COMMITS 12, MAX_FILES_LISTED 40.
  - `NOISE_RX` drops lockfiles, `*.min.*`, `*.map`, `*.snap` and dist/build/out/vendor/node_modules/.next/coverage.
  - Filters out bots (ingest.mjs:63-72, 114-153).
- **`…/scripts/project-dir.mjs`** (92 lines)
  - Puts output outside the caller repo, at `$XDG_CACHE_HOME|~/.cache/hyperframes/pr-to-video/<owner>/<repo>/<repo>-pr-<N>`.
  - `--project-dir` or `PR_TO_VIDEO_PROJECT_DIR` override it, and path traversal is sanitized (project-dir.mjs:8-53, 69; workflow-guardrails.test.mjs:16-67).
- **`…/scripts/preflight.mjs`** (51 lines). Fails if `npx hyperframes --help` does not list `check` (preflight.mjs:12-27).
- **`…/scripts/fetch-people-avatars.mjs`** (157 lines). Always exits 0. A missing avatar only means no credits close (pr-to-video/SKILL.md:86).
- **`…/references/story-design.md`**. Covers the word budget, "never invent a version", name-not-handle credits, and value before evidence (story-design.md:26-39, 126-132, 156-184).
- **Source-excerpt enforcement**
  - `…/scripts/frame-packets.mjs:16-24` throws "code frame requires an upstream-selected Source excerpt" when a frame's `focal` names a `code-*` block and has no `### Source excerpt` of 12 lines or fewer (pr-to-video/SKILL.md:156, 186).
  - `workflow-guardrails.test.mjs` (198 lines, `node:test`) covers that check (:79-148).
  - **faceless-explainer's `scripts/frame-packets.mjs` (27 lines) has no such check** (grep "excerpt": no hits). #3 inherits the faceless version.

### Project inspection method (brag 0.2.2, MIT, latent-spaces/brag)
- **`~/.claude/plugins/cache/brag/brag/0.2.2/skills/brag/references/step-1-inspect.md`** (125 lines). The read order is:
  1. `index.html`, then styles, README, `package.json` and route/component files.
  2. The user flow ("entry → key action → result").
  3. `public/`.

  It ends with a 9-question rubric (step-1-inspect.md:7-28, 30-85).
- **`…/references/step-3-compose.md`**. The `composition-brief.md` template has "Primary files read" and "Copy that must appear verbatim" sections. Together they work as a lightweight provenance contract (step-3-compose.md:19-27).
- **`…/references/step-4-deliver.md`**. Extracts a poster with `ffmpeg -ss <t> … -frames:v 1`, then bakes it into frame 0 (`overlay enable='eq(n,0)'`, libx264 crf 18, `+faststart`) so thumbnails show on Slack, X and LinkedIn (step-4-deliver.md:31-71).
- **VWC brag runs on this machine**
  - `brag-output-2026-09-22-110928/ref/capture.js` is a Playwright capture at 1440x900 @2x. It was added because reading code alone was not enough on a Next.js app.
  - `brag-output-2026-09-20-164238/composition-brief.md:15-35, 55` substitutes Montserrat for GothamPro ("GothamPro is proprietary").
  - Both folders are ignored (.gitignore:104-105; .git/info/exclude:18-20).

### Video engines
- **`~/.claude/skills/faceless-explainer/`** (upstream). Seven steps from text to MP4, with visuals invented per scene (faceless-explainer/SKILL.md:16-18, 212).
- **Upstream input surface that #4 can hand to #3 without a new API** (faceless-explainer/SKILL.md:26, 51-58, 212; references/story-design.md:9-14, 205-211):
  - If `BRIEF.md` exists, the skill will "read it and ask nothing". If `hyperframes.json` or `STORYBOARD.md` exists, it will "resume from the storyboard's frontmatter … never re-interrogate a half-built project" (SKILL.md:26).
  - `capture/extracted/visible-text.txt` holds the source verbatim, as "the source of **information**, not a story template" (SKILL.md:53).
  - `user_script.txt` with `VO_MODE = verbatim`: "Do not rewrite the user's words … Final duration follows the provided script" (story-design.md:209-211; SKILL.md:56).
  - A user-supplied `public/<basename>` image "is the only real asset path" (SKILL.md:58, 212).
  - File shapes: `hyperframes/references/storyboard-format.md` (frontmatter, then `## Frame N` sections) and `script-format.md`. SCRIPT.md is free-form, and "the TTS step extracts the indented spoken lines" (script-format.md:7).
- **`~/.claude/skills/vwc-faceless-explainer/`** (local, not in git). This is what #3 generalizes.
  - SKILL.md is 304 lines. It ships with `brand/frame.md`, `brand/caption-skin.html`, `brand/fonts/` (commercial Gilroy and GothamPro) and `scripts/check-copy.mjs` (201 lines, `--numerals`, `--self-check`) (check-copy.mjs:7-8, 98-146).
  - Its story shape has 7 frames with a mandatory end card (vwc SKILL.md:136-148).
  - It documents no resume path and no verbatim-script path (grep for resume/VO_MODE/user_script: no hits).
- **`~/.claude/skills/product-launch-video/`** plus `npx hyperframes capture <url> --json`.
  - Captures a live URL into layered scenes. Treat `ok:false` as a stop (hyperframes-cli/references/init-and-scaffold.md:35-55).
  - This is the only installed path to real UI for a repo that has a `live_url`.
- **`~/.claude/skills/general-video/`**. The host for custom multi-scene work: "Borrow its story shape and taste, not its private scripts" (general-video/SKILL.md:1-9, 122-147).
- **`~/.claude/skills/hyperframes-creative/frame-presets/`**. 13 presets under Apache-2.0 (ls). `code-editorial/fonts/` ships OFL JetBrains Mono, Inter and EB Garamond with their license texts. This is the likeliest base for a neutral default pack ([issue-3.md](issue-3.md), AC 3).

### Blog media (#2's source, used for the case study's hero image and audio)
Paths are in `vets-who-code-app`.
- **`scripts/generate-blog-image.ts`**
  - A `gemini-3.1-pro-preview` call returns a 5-key theme (generate-blog-image.ts:40-63).
  - One of 3 templates is picked by `variantIndex` (:84; image-prompts.ts:9).
  - The image comes from `gemini-3-pro-image` at 16:9, followed by a text-detect check, with `MAX_RETRIES = 3`.
  - Uploads to Cloudinary with `invalidate:true`.
  - It only reads `src/data/blogs/<slug>.md` (:9-30).
- **`scripts/generate-single-blog-audio.ts`**
  - Model `gemini-2.5-flash-preview-tts`, voice `Kore`, `WORDS_PER_CHUNK = 1700`, upload to `blog-audio`.
  - It only reads `src/data/blogs/<slug>.md` (:64, 87, 132, 176, 303).
- **`scripts/generate-blog-media.ts`** runs both. `src/lib/blog.ts:55-59` derives the audio URL from the slug.
- **Tests in `__tests__/scripts/`**: generate-blog-graphic, generate-blog-image, generate-blog-media, generate-single-blog-audio, generated-at, tts-chunking (ls).

### VWC content to test against
- `src/data/projects/*.json` holds 7 records (ls). The schema is `VWCProjectDetails` (src/utils/types.ts:197-225). The loader degrades a repo to `repo:null` on a 403 or 404 (src/lib/project.ts:25-44).
- Catalog repos, from the GitHub API on 2026-09-29. Commit counts come from the `Link` header with `per_page=1`. `size` is the stored repo size, history included. Measured default-branch trees are listed below the table.

| Catalog file | Repo | License | Default branch | Commits | API size KB | What is in it |
|---|---|---|---|---|---|---|
| vets-who-code-app.json | vets-who-code-app | AGPL-3.0 | master | 1,437 | 461,270 | Next.js/TS app, `live_url` https://vetswhocode.io/ (:45) |
| vets-ai.json | VetsAI | Apache-2.0 | main | 59 | 19,623 | Python/Streamlit app (app.py 556 lines), no live_url |
| api-list.json | api-list | NONE | master | 41 | 42 | README.md only |
| prework.json | Prework | NONE | master | 88 | 1,273 | Markdown modules |
| windows-dev-setup-guide.json | windows-dev-guide | NONE | main | 42 | 19,777 | README.md, README_cn.md, images |
| vscode-extension-pack.json | vetswhocode-extension-pack | NONE | main | 33 | 30 | package.json, README, vwc.jpg |
| vscode-theme.json | vetswhocode-vs-code-theme | NONE | master | 42 | 1,506 | `vwc-colors/` (package.json, 3+ theme JSONs, CHANGELOG), `images/ScreenShot.png` |

- **What a `--depth 1` clone actually reads** (measured 2026-09-29):
  - **vets-who-code-app @ `badc295`:** 1,932 blobs and 87,756,432 bytes (about 84 MiB). 70.75 MB of that is `src/data` and 7.1 MB is `public/fonts`. The clone took 5 s and used 110.5 MB on disk, 19.9 MB of it `.git`.
  - **VetsAI @ `cd3f1c8`:** 4,481 blobs and 27.4 MB. 4,455 of those files (10.96 MB) are job-code JSON under `data/employment_transitions/job_codes`, and 16.4 MB is 8 PDF/DOCX files in `tests/resources`. The clone took 2 s and used 58.3 MB on disk.
  - Sources: `gh api …/git/trees/<branch>?recursive=1`; `git clone --depth 1`; `du -sk`.
- **VetsAI history** (gh api commits/pulls/issues, 2026-09-29)
  - 59 commits and 13 PRs. There are no releases or tags.
  - Contributors: jeromehardaway 55 commits, jonulak 3, Sfayson1 1 (`…/contributors`). The catalog lists the same three (vets-ai.json:21-32).
  - Most commit subjects are a few words ("add new color", "fix styling"). Only 5 of 59 messages run past 130 characters (`gh api …/commits`).
- **vets-who-code-app scale** (gh api, 2026-09-29): 845 PRs, 51 contributors, no releases or tags. `package.json` says `"version": "0.1.0"` on both master and local (package.json:3).
- **Catalog screenshot for VetsAI** (vets-ai.json:39, Cloudinary `projects/VetsAI_ie8v4u.png`, viewed 2026-09-29). It shows the chat UI with `/mos`, `/afsc`, `/rate`, `/frontend`, `/backend` and `/ai`, and no upload widget. That makes it a real UI image usable without running the app.
- **Case-study-shaped post:** `src/data/blogs/introducing-the-vets-who-code-projects-page-design-and-implementation-journey.md`.
  - By Jon Onulak, 753 words (`wc -w`).
  - Written as a build journal in phases, not in #4's five-section shape (headings).
- **VWC-only closing section.** `docs/blog-template.md:19-21` mandates a closing `### Support Vets Who Code`. That is VWC-specific and must not become the skill's default ("No VWC branding … baked in", #1 body).
- **Tone reference:** "Vets Who Code troops ship software to production … This catalog is the evidence" (src/pages/projects.tsx:18-28).

### Real output on disk (videos/labor-day-sprint-proof-of-work/)
- **Three renders**, all H.264 1920x1080 at 30 fps with AAC 48 kHz (ffprobe `format=duration`, 2026-09-29):
  - `…15-56-29.mp4` is **75.07 s** (narration run 1).
  - `…16-18-17.mp4` is **73.10 s** (narration run 2, after the prosody rewrite).
  - `…16-59-37.mp4` is **77.50 s**. This is the **silent** cut: the current `audio_meta.json` has `"voices": []`, and STORYBOARD.md:3 says `duration: 77.5s`.
- **Targets:** the brief asked for `length: 90s` (BRIEF.md:9), and the narrated storyboard set `duration: 75s` (.narrated-backup/STORYBOARD.md:3).
- The voice run is pinned to `npx --yes hyperframes@0.8.66` (package.json).
- **`videos/vets-who-code-reel/renders/`**: a 90.0 s product-launch-video render. Its `…18-14-10.meta.json` records `durationMs 51289`, about 51 s of wall time (files present).

---

## How it works now

### pr-to-video, the closest ingest-to-video pipeline
1. **Step 0: setup.** Resolves a project dir outside the caller repo, then runs `preflight.mjs` (pr-to-video/SKILL.md:12, 16, 18).
2. **Step 1: ingest.**
   - `fetch-pr.mjs` writes `capture/pr.json` and `diff.patch`.
   - `ingest.mjs` writes `capture/extracted/` (visible-text.txt, people.json).
   - Avatars go to `assets/<login>.png`.
   - On a fetch failure: "report its stderr and stop — do not fabricate PR contents" (SKILL.md:86).
3. **Step 2:** `frame.md`.
4. **Step 3:** `STORYBOARD.md` and `SCRIPT.md` (user-gated).
5. **Step 3.1:** audio, written to `audio_meta.json`.
6. **Step 4:** the enriched storyboard. Every code frame gets a `### Source excerpt` of 12 lines or fewer, taken from `diff.patch`.
7. **Step 5:** one sub-agent per frame, at most three workers.
8. **Step 6:**
   - `transitions.mjs inject/verify`
   - `npx hyperframes lint`, then `check`
   - `snapshot --at <midpoints>`
   - `preview --background`
   - After approval only: `render --quality high --output renders/video.mp4`

   (SKILL.md:18, 156, 186, 212-240)

**Budget and story rules**
- **Word budget.** "TTS runs at ~2.2 words/second."
  - Each frame gets 19 words or fewer (9 s). Two frames may go to 26 words (12 s).
  - `duration ≈ ceil(words/2.2)` (story-design.md:175-184).
- **Length tiers** by additions plus deletions:
  - about 50 lines or fewer: 20-40 s
  - about 50-200: 40-70 s
  - about 200-600: 70-110 s
  - about 600 or more: 110-180 s
  - "The tier is a **ceiling** … never a floor" (hyperframes/references/routes/pr-to-video.md:10-25).
- **Credits.** Committers are ranked by commit count, and names come from `gh api users/<login> --jq .name`. The voiceover uses names, never `@login` (SKILL.md:88; story-design.md:156-162).
- **Mechanism beats** are "mostly invented" animated diagrams (sub-agents/frame-worker.md:15-17).

### brag
1. **Inspect the project.** Gate: the 9-question rubric.
2. **Write `brag-plan.md`.** Gate: the scenes sum to 15-25 s.
3. **Write `composition-brief.md` and `composition/`.** Gate: `npx hyperframes check` reports zero errors.
4. **Deliver.** Render `brag.mp4`, pick the `brag.jpg` poster, bake it into frame 0, and write `share-copy.txt`.

(brag SKILL.md:88-130; the length cap is at :44, 106, 158.) brag bypasses the hyperframes entry interview on purpose (SKILL.md:112). Voice is off by default, and when it is on it uses Kokoro `af_heart` only (step-3-compose.md:111-126).

### faceless-explainer, and #3 as a wrapper of it
- **Steps:** 0 setup, 1 brief, 2 frame.md, 3 storyboard and script (user-gated), 3.1 audio, 4 visual design, 5 per-frame build, 6 lint/check/snapshot/preview/render (faceless-explainer/SKILL.md:16-18).
- **Length:** the sweet spot is 30-90 s, with a hard cap of about 3 min. The body is usually 3-6 frames (routes/faceless-explainer.md:4; faceless-explainer/references/story-design.md, "The body is a sequence").
- **Canvas:** 1920x1080 by default. The caption band is the bottom 16.67% (faceless-explainer/scripts/lib/dimensions.mjs:8-45).
- **TTS order:** HeyGen Starfish, then ElevenLabs, then local Kokoro (media-use/audio/references/tts.md:39-43).
  - HeyGen defaults to Marcia (`05f19352…`) when `--voice` is omitted (tts.md:79).
  - VWC uses Orson `00e3d285aba44b27a83c47c02c9c2d9c` (Labor Day audio.log:1).
- **Render:** `--quality high`, 30 fps by default (hyperframes-cli/references/preview-render.md:104-143).
- **VWC overrides in the wrapper** (vwc-faceless-explainer/SKILL.md:25-35, 266-272):
  - Skip Step 2 and ship a hand-written frame.md.
  - Gate copy with check-copy.mjs.
  - Patch `#root` to the brand ground after assembly.

**Measured narration pace (the input to any 60 s word target)**

| Voice | Words | Voice seconds | Words/s | Source |
|---|---|---|---|---|
| HeyGen Orson, run 1 (SCRIPT.md.bak) | 184 (engine count, 8 lines) | 75.049 | **2.45** (per line 1.80-2.95) | videos/labor-day-sprint-proof-of-work/audio.log:1-13 |
| HeyGen Orson, run 2 (.narrated-backup) | 189 (word-timestamp entries) | 73.091 | **2.59** | .narrated-backup/audio_meta.json `voices[].words` and `duration_s` |
| Gemini 2.5 Flash TTS, Kore | 187 wpm | n/a | **3.12** | generate-single-blog-audio.ts:236 (#1266). Measured on blog-length audio, not a 60 s script (inference) |
| ElevenLabs River (docs house voice) | 145-155 wpm target | n/a | 2.42-2.58 | tts.md:20 |
| Kokoro | Not measured | | | `kokoro_onnx` is not installed here (`python3 -c "import kokoro_onnx"`: ModuleNotFoundError) |
| Guidance constants | | | 2.2 / 2.5 (2.3 in its own example) | pr-to-video story-design.md:175; hyperframes-creative/references/narration.md:7-8, 92 |

- Rendered length tracked the summed voice duration within 0.02 s on both narrated Labor Day runs: 75.049 s became 75.07 s, and 73.091 s became 73.10 s (ffprobe; audio_meta). The audio step's `sync-durations` sets frame lengths from the voice (faceless-explainer/SKILL.md:142).
- The two word counts use different counters: the engine's count and the timestamp entries (inference). Treat the gap between 2.45 and 2.59 as noise within one voice.

### Blog media, as #4 would consume it through #2
- **Image.**
  1. `gemini-3.1-pro-preview` turns the title and full body into the 5-key theme.
  2. The theme fills one of 3 templates.
  3. `gemini-3-pro-image` renders it via `generateContent` with `imageConfig.aspectRatio "16:9"` and no `imageSize`. That gives 1K output, 1376x768, and live assets are JPEG.
  4. A 3.1 Pro vision call checks for text. It retries up to 3 times and fails open.
  5. Cloudinary upload with `public_id=<slug>`, `folder=blog-images`, `overwrite` and `invalidate`.

  Nothing writes front matter. Authors type `image.src` by hand (generate-blog-image.ts:9-30, 40-63, 84-138, 183-249; [issue-2.md](issue-2.md)).
- **Audio.**
  1. Read the post, or a hand-written `src/data/blog-audio/<slug>.md` if one exists (generate-single-blog-audio.ts:193-208).
  2. Clean it with `cleanMarkdownToText`.
  3. Split it with `chunkForTts` into chunks of at most 1,700 words on paragraph boundaries.
  4. Voice each chunk with `gemini-2.5-flash-preview-tts` (Kore) over raw fetch, with the `NARRATION_STYLE` prefix.
  5. Join the PCM with 350 ms of silence.
  6. `normalizeLoudness`: -16 dBFS RMS, gain limited to 0.25x-4x, -1 dBFS peak.
  7. The result is a 24 kHz mono 16-bit WAV.
  8. Upload to `blog-audio` as `resource_type video`, with overwrite and invalidate.

  The site serves `…/video/upload/f_mp3/blog-audio/<slug>.wav`, derived from the slug (generate-single-blog-audio.ts:6-39, 59-152, 240-337; src/lib/blog.ts:55-59).
- **Keys.**
  - Image: `GEMINI_API_KEY` only.
  - Audio: `GOOGLE_GENERATIVE_AI_API_KEY || GEMINI_API_KEY || GOOGLE_PRIVATE_KEY`.
  - Cloudinary: reads `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` at import time.

  (generate-blog-image.ts:147; generate-single-blog-audio.ts:163-166; src/lib/cloudinary.ts:4-9)

---

## Lessons already paid for

### Facts and invention (the core risk for #4)
- **VetsAI's README and the VWC catalog describe a feature the code no longer has.**
  - **The claims.** vets-ai.json:5, 8, 12 and README:3, 9, 66 say it reads uploaded PDF or DOCX resumes. README:83-84 lists `PyPDF2` and `python-docx`.
  - **The code.** At HEAD `cd3f1c8a` (2024-11-30), `app.py` has no `upload`, `pdf`, `docx` or `file_uploader`, and `requirements.txt` has neither library (`gh api …/contents`, 2026-09-29).
  - **The history.** The upload feature lived in `streamlit_app.py`. jonulak hardened it in PR #4 (merged 2024-10-17) and tested it in PR #7. PR #11 (merged 2024-10-28) removed the file, "handling file uploads" included. The README and catalog were never updated (PR #4, #7, #11 bodies; commit d79136d2: `streamlit_app.py -253`).
- **In-repo residue looks like evidence for the removed feature.**
  - `.streamlit/config.toml` still sets `maxUploadSize = 20` under "# Limit uploads to 20 MB".
  - `tests/resources/` still holds 8 PDF/DOCX fixtures (16.4 MB), even though no test uses extraction any more. `tests/test_streamlit_app.py` imports from `app` (config.toml; git tree; test file :12).
  - A grep-based claims ledger would "confirm" the upload feature. The ledger must require a code path that runs, not a matching string (inference).
- **Commands advertised in code copy that have no handler.**
  - The welcome text lists `/frontend`, `/backend` and `/ai` (app.py:392-394).
  - `handle_command` only handles `/mos`, `/afsc` and `/rate` (app.py:351) and returns `None` otherwise (:372). Those prompts fall through to the GPT-4 call (app.py:468-478).
  - "Has a /frontend command" is therefore overstated. The accurate wording is "a chat prompt the model answers".
  - The catalog screenshot shows the same list (vets-ai.json:39).
- **Setup drift.** README:44-48 says to put `OPENAI_API_KEY` in `.env`. app.py:101 calls `load_dotenv()`, but app.py:104 reads `st.secrets["openai"]["OPENAI_API_KEY"]`.
  - The correct steps are in code: `run.sh` and `streamlit.sh` run `pip install -r requirements.txt` and then `streamlit run app.py --server.port 8000 --server.address 0.0.0.0`.
  - CI uses Python 3.10.15, installs `pytest pytest-cov` separately, writes `~/.streamlit/secrets.toml` with `[openai] OPENAI_API_KEY`, and runs `pytest --cov` with `TESTING=true` (.github/workflows/unit-test.yml).
- **A committed "feedback" record is not user research.** `feedback/feedback_20241023_212458.json` is one record (`rating: 3`, "A little slow"). Nothing may turn it into "users said…" (file contents).
- **More catalog drift.**
  - vets-who-code-app.json:19 lists "Jest", but the repo uses `vitest ^4.0.18` (package.json:147).
  - PR #1420 says every `summary` and `serves` was written from READMEs and flags them for the owner to rewrite (PR #1420 body).
- **"Open source" is not backed for most of the catalog.** Only 2 of 7 catalog repos carry a license (table above), yet `public/llms.txt:42` calls the catalog "Open-source work".
- **Never invent a version.**
  - Neither target has a release or tag (gh api releases/tags).
  - vets-who-code-app's `package.json` version is `0.1.0`. The honest label is "0.1.0 (package.json, unreleased)", or no version at all (pr-to-video story-design.md:168-171; fetch-pr.mjs:143-205).
- **Neither `hyperframes lint` nor `check` looks at wording.** The only copy gate on disk is VWC's check-copy.mjs (check-copy.mjs:2-4; brag step-4-deliver.md:10).
- **Invented mechanism diagrams can misstate the code** (pr-to-video/sub-agents/frame-worker.md:15-17). Faceless visuals are invented by design (faceless-explainer/SKILL.md:212).
- **brag's defaults contradict #4.**
  - The 15-25 s cap.
  - "Big motion, bigger claims" (brag SKILL.md:147).
  - "The product is real (even when it's not)" (tones.md:203).
  - "Funniest or most impressive claim" (step-1-inspect.md:38-39).
- **brag assumes a static site.** The VWC runs needed a hand read of `src/data` plus a Playwright capture (step-1-inspect.md:9-17; brag-output-2026-09-22-110928/ref/capture.js).
- **An unsourced figure has already shipped.**
  - The first VWC `share-copy.txt` says "300+ trained, 97% placed".
  - Those numbers come from `src/data/outcomes.ts`, whose window and denominator are still unset (#1332) (brag-output/share-copy.txt; src/data/outcomes.ts:1-17, 42-94).

### Video pipeline
- **Node split.**
  - HyperFrames needs Node 22 or newer, and vets-who-code-app pins Node 20 (.nvmrc).
  - The VWC skill hard-codes `~/.nvm/versions/node/v24.14.1/bin` (vwc SKILL.md:40-45).
  - Gate on `npx hyperframes doctor --json` `.ok`, because `doctor` always exits 0 (hyperframes-cli/references/doctor-browser.md:5-57).
- **Upstream drifts.**
  - `npx hyperframes init` auto-updates skills, and `--skip-skills` is ignored. Set `HYPERFRAMES_SKIP_SKILLS=1` (hyperframes/references/skill-lifecycle.md:12-14).
  - The CLI went from 0.8.66 to 0.8.91 in 6 days (`npm view hyperframes time`).
  - The local faceless-explainer is behind upstream, including `01601d1105` (Gemini TTS) ([issue-3.md](issue-3.md), Dependencies).
- **Partial audio looks complete.** `audio.mjs` can print "✓ audio generate: 5 voice" and exit 0 with lines missing. Compare the voice count with the script's line count (vwc SKILL.md:238-239).
- **A silent cut is a rebuild.** It needs `music: none` and no SCRIPT.md (faceless-explainer/SKILL.md:110). VWC's silent cut ran 77.5 s against 73.1 s narrated (ffprobe; vwc SKILL.md:202, 220-229).
- **The ground color is lost on rebuild.** The `#root` fix is a hand CSS edit that disappears when index.html is rebuilt (vwc SKILL.md:266-272).
- **Pace depends on the voice, and 2.2 w/s under-fills 60 s.**
  - Orson measured 2.45-2.59 w/s and Kore 3.12 w/s (pace table).
  - A 132-word script (60 s at 2.2 w/s) would run about 51-54 s on Orson, and about 42 s on Kore (arithmetic).
  - Per-line pace varied from 1.80 to 2.95 w/s within one run (audio.log), so per-frame word budgets are only accurate to about ±25% (arithmetic against the 2.45 mean).
  - The Labor Day narrated cuts landed at 73.1 s and 75.07 s against a 75 s storyboard target, so **they did not overshoot** (ffprobe; .narrated-backup/STORYBOARD.md:3).
- **Known false positive.** `hyperframes check` can report 1-4 px `text_box_overflow` on `#caption-word-*`. Act only on `#el-NN-*` (pr-to-video/SKILL.md:226).
- **`npx hyperframes auth status` exits 1 when signed out.** Don't chain it with `&&` or run it under `set -e` (product-launch-video/SKILL.md:38).
- **Captures pull fonts.** The VWC reel capture downloaded Gilroy. Never commit `capture/assets/fonts` (videos/vets-who-code-reel/capture/extracted/asset-descriptions.md).
- **Licensed music and SFX.**
  - brag's ende.app music has no verified license (brag assets/music/README.md:11-20).
  - Pixabay SFX may not be redistributed as standalone files (pixabay.com/service/license-summary).
  - VWC's fonts are commercial (#3 AC 3).

### Secrets, telemetry and output hygiene (sharper for #4, which runs inside someone else's repo)
- **Stray keys get loaded and billed.**
  - `loadEnvFromDir` walks up to 5 directories and loads the **first** `.env` it finds.
  - It sets **every** key not already in the environment, not just the HeyGen key (media-use/audio/scripts/lib/heygen.mjs:20-45, :39).
  - tts.md:58-59 documents the walk-up.
  - A project created inside or below the job seeker's repo would import that repo's `GEMINI_API_KEY`, `OPENAI_API_KEY` and others (inference).
- **Telemetry and public feedback.**
  - The CLI sends telemetry that includes `authoringSkill`.
  - The CLI skill tells agents to run `npx hyperframes feedback` after renders, and that posts publicly. `--file-issue` publishes a repro (hyperframes-cli/SKILL.md:116-126; upgrade-info-misc.md:100-113).
  - Set `HYPERFRAMES_NO_TELEMETRY=1` and skip feedback (inference).
- **Free-tier Gemini traffic is marked "Used to improve our products: Yes"** (ai.google.dev/gemini-api/docs/pricing, 2026-09-29). Warn when a private repo is involved, or require a paid key (inference).
- **Output inside the repo gets committed.** VWC excludes `videos/` only in the local `.git/info/exclude`, and `brag-output*/` reached `.gitignore` only after an incident (PR #1390) (.gitignore:104-105; .git/info/exclude:18-20).

### Blog media (inherited through #2)
- **Store the bare public id, not the secure_url.** A full URL skips `q_auto,f_auto`, which means about 1.06 MB served instead of about 330 KB (src/lib/cloudinary-helpers.ts:208-211; [issue-2.md](issue-2.md)).
- **Model ids churn.**
  - `gemini-3-pro-preview` and `imagen-4.0-generate-001` were retired, which forced PR #1266 (commit 1fa1bfa7).
  - `gemini-2.5-flash-preview-tts` has a named replacement, `gemini-3.8-flash-tts`. The replacement returns RIFF WAV and reads its input as a verbatim transcript (ai.google.dev/gemini-api/docs/deprecations; [issue-2.md](issue-2.md)).
- **TTS truncates silently** at 16,384 output audio tokens (about 655 s) and still returns `finishReason STOP`. The 1,700-word chunker stays under that limit (generate-single-blog-audio.ts:235-237; PR #1266).
- **Three bugs from #1266:**
  - an un-awaited upload (from 7b0f4aef)
  - blog-wide truncation (8 of 38 posts)
  - stale CDN copies

  (PR #1266 body)
- **The orchestrator dies before its summary.** The audio `main()` calls `process.exit(1)` (generate-single-blog-audio.ts:186-191). An image that still has text after 3 tries is reported as a success ([issue-8.md](issue-8.md)).
- **#2's issue text is wrong in ways #4 must not inherit.** [issue-2.md](issue-2.md) lists four wrong statements. [issue-1.md](issue-1.md) counts three and raises the chunking rationale separately ([issue-2.md](issue-2.md), "Four statements…"; [issue-1.md](issue-1.md), Lessons 31 and line 139). Re-verified 2026-09-29:
  1. **No script writes `audio:` into front matter.** 0 of 39 posts have an `audio:` key (grep), and the URL comes from the slug (src/lib/blog.ts:55-59). *Matters to #4.*
  2. **No script writes a narration script.** The audio step narrates the hand-written `src/data/blog-audio/<slug>.md` when one exists, and the post body otherwise (generate-single-blog-audio.ts:193-208). *Matters to #4.*
  3. **The chunking reason is wrong.** Chunking guards against silent output truncation, not rejected input (:235-237).
  4. **"Image-prompt variants" is loose rather than false.** Gemini writes a theme, and the code's own array of 3 templates is called `imagenPromptVariants` (image-prompts.ts:9; generate-blog-image.ts:84).
- **Front-matter regex breaks** on YAML block scalars and CRLF line endings. Use gray-matter with an explicit path (generate-blog-image.ts:26-28; generate-single-blog-audio.ts:186).
- **dotenv loads `.env`, not `.env.local`** (README.md:103, 188; package.json:27-31).
- **The local branch is behind master.**
  - `docs/readme-contributor-gaps` is 20 commits behind `origin/master` (`git rev-list --count HEAD..origin/master`).
  - On master, #1460 bumped `@google/genai` to 2.24.0. Locally it is still 1.40.0 ([issue-2.md](issue-2.md)).

### Repo reading
- **Scale is the default-branch tree, not the API `size`.**
  - vets-who-code-app's API size is 461,270 KB, but the tree a shallow clone reads is 87.8 MB across 1,932 files. 70.75 MB of that is `src/data` (tree API; measured clone).
  - VetsAI's 4,455 job-code JSON files (10.96 MB) are app data read at runtime from `data/employment_transitions/job_codes` (app.py:157). They must be excluded from reading, not summarized (inference).
- **GitHub API limits** (docs.github.com, read 2026-09-29):
  - **REST rate limits.** Unauthenticated requests get 60 per hour per originating IP. A personal access token gets 5,000 per hour. Secondary limits: 100 concurrent requests and 900 points per minute (rate-limits page).
  - **Recursive tree reads.** Capped at 100,000 entries and 7 MB. Above that, `truncated: true` is returned, and the fix is to fetch "one sub-tree at a time" (git/trees page).
    - Both targets returned `truncated=false`: VetsAI 4,497 entries, vets-who-code-app 2,323 (`gh api …/git/trees/<branch>?recursive=1`, 2026-09-29).
  - **Contents API.** Files of 1 MB or less get full support, 1-100 MB get raw media type only, and files over 100 MB are unsupported. A directory listing is capped at 1,000 files (repos/contents page).
    - VetsAI's `job_codes` directory (4,455 files) exceeds that cap, and `pdf_unicode_sample.pdf` (16.2 MB) is raw-only (tree API).
  - **Clone instead of API reads.** A clone avoids all of this. Inference: git transport is not a REST request.
- **REST calls per run** (arithmetic from the counts above):
  - VetsAI needs about 10 calls: repo, 1 page of commits, 1 of PRs, 1 of issues, releases, contributors, 3 user lookups and the README. That fits in the unauthenticated 60 per hour for a single run, but not for an eval loop.
  - Uncapped, vets-who-code-app would need 15 pages of commits (1,437) and 9 pages of PRs (845). Budget caps like `MAX_COMMITS 12` are required (ingest.mjs:63-72).
- **`gh auth status` is the wrong gate.**
  - On this machine it exits **1**, because a secondary keyring account (`jerome-hardaway_mcgraw`) fails. The active account `jeromehardaway` works and shows 5,000/5,000 remaining.
  - `gh auth status --active` exits **0** (gh 2.89.0; `gh api rate_limit`).
  - `gh auth status --help`: "If an account on any host … has authentication issues, the command will exit with 1."
  - pr-to-video's check (fetch-pr.mjs:61-63) would wrongly die here.
- **J0dI3 in vets-who-code-app.**
  - 104 tracked paths match `j0di3` on both local and `origin/master`, including `src/lib/j0di3-client.ts`, `src/lib/j0di3-proxy.ts` and `src/lib/ensure-troop.ts` (git ls-files; tree API).
  - **142 files on `origin/master` mention it in their contents**, README.md:138 among them (`git grep -il j0di3 origin/master`). A path-glob exclude alone does not keep it out of a case study.
  - Owner decision: content about the private backend must not appear in public outputs.
  - None of the first 20 `gh search issues --repo Vets-Who-Code/vets-who-code-app j0di3` results tracks work on that code (2026-09-29).
- **`gh pr view` truncates at about 100 files**, so paginate (fetch-pr.mjs:101-138).

---

## Dependencies

**Issues**
- **#2 (hard).** Supplies the hero image, audio overview and alt text.
  - Today's VWC scripts only accept a slug under `src/data/blogs`.
  - #4 needs #2's "Markdown/MDX file or a URL" input and `--dry` (#2 AC 1, 5), plus a machine-readable result: paths or URLs and alt text (inference; decision 14 in [issue-1.md](issue-1.md) proposes `--dry --json`).
- **#3 (hard).** Supplies the brand pack, the explainer engine and the copy gate.
  - #3's AC defines **no input contract** for an externally written script or storyboard, and no neutral default pack (#3 AC, verified 2026-09-29).
  - Evidence that #3 will need an external script anyway: its AC 5 requires "the same script rendered in two different brand packs" (#3 AC 5; [issue-3.md](issue-3.md) plan step 10).
  - **Proposed contract, to add to #3's AC** (decision 1). #4 creates the project dir. #3 must accept it without rewriting it:
    1. `BRIEF.md` in brief-contract fields: `workflow`, `flow`, `storyboard`, `destination`, `aspect: 1920x1080`, `length: 60s`, `angle`, `message`, `language`, `audience`, `narration` (hyperframes/references/brief-contract.md §1-2).
    2. `capture/extracted/visible-text.txt`, holding the case study verbatim (faceless SKILL.md:51-53).
    3. `STORYBOARD.md` and `SCRIPT.md` in storyboard-format and script-format shapes. #3 resumes at Step 3.1 audio (faceless SKILL.md:26 rule 2).
       - The minimal fallback is `user_script.txt` with `VO_MODE: verbatim`. That fixes the words, but #3 still writes the scenes (story-design.md:209-211).
    4. `public/<basename>` real images, such as README screenshots or the catalog screenshot (SKILL.md:58, 212).
    5. `--brand <dir>` ([issue-3.md](issue-3.md) decision 3).
    6. #3 runs its copy gate on the supplied files, and it keeps or ports the `### Source excerpt` hard-fail from `pr-to-video/scripts/frame-packets.mjs:16-24`, because faceless lacks it.
- **#9 (none for #4).** Its fixtures are "Test input for #2, #3, #5, #6, #7 and #8" (#9 body). Decision 12 in [issue-9.md](issue-9.md) keeps a #4 fixture out of #9's scope. #1 requires every skill to run "for an organization other than VWC" (#1 AC 2). So #4 ships its own fixture (decision 4).
- **#1.** Principles: bring your own brand and keys, no licensed assets, no dependency on private services, and facts from the source (#1 body).
- **#8 (downstream, inferred).** A content kit for a project post would reuse #4's claims ledger.
- **vets-who-code-app private-backend code (soft, untracked).** If the private-backend code is still present in vets-who-code-app, it gates vets-who-code-app as a target (decision 2). No open issue tracks it (gh search).

**Tools and system**
- Node 22 or newer, FFmpeg and ffprobe, and chrome-headless-shell in `~/.cache/hyperframes/chrome` (193 MB here). Docker only for `--docker` (doctor-browser.md; [issue-3.md](issue-3.md)).
- **`gh` authenticated with `gh auth status --active` at exit 0**, required for URL input and for PR/issue/contributor metadata.
  - A bare `gh auth status` false-fails on multi-account keyrings (Lessons, Repo reading).
  - A local repo with no GitHub remote runs in git-only mode, and its decisions and roadmap come from the builder (inference).
- `git` for `--depth 1` clones: 2-5 s for the targets (measured).
- Optional: Python 3.8+ with `kokoro-onnx` (about 311 MB model) for keyless narration (media-use/audio/references/requirements.md:9-28). It is not installed here.
- A HyperFrames CLI pin. VWC uses `npx --yes hyperframes@0.8.66` (videos/labor-day-sprint-proof-of-work/package.json).

**Accounts and keys (the user brings their own)**
- `GEMINI_API_KEY` on a **billed** project. `gemini-3-pro-image` and `gemini-3.1-pro-preview` have no free tier; 2.5 Flash TTS does (pricing page, 2026-09-29).
- Storage through #2: Cloudinary or local files. The Cloudinary free plan has 25 credits/month, 10 MB images and 100 MB video uploads (cloudinary.com/pricing/compare-plans).
- Narration, any one of:
  - a HeyGen sign-in or `HEYGEN_API_KEY`
  - `ELEVENLABS_API_KEY`
  - Kokoro, with no key

  (tts.md:39-43)
- A GitHub token is only needed via `gh`. No other GitHub account is needed for public repos.
- Not needed, because the skill never runs the target: VetsAI's own OpenAI `gpt-4` key (app.py:104, 313). OpenAI must also not be presented as a partner (owner decision).

---

## Cost

Prices were read from official pages on 2026-09-29. Thinking tokens are unpredictable, so these are ranges.

**Hero image** ([issue-2.md](issue-2.md) worked estimate)
- **One attempt: $0.1451.**
  - Theme call: 2,350 input tokens × $2/1M plus 200 output tokens × $12/1M = $0.0071.
  - Generation: $0.0007 input plus a 1K image at 1,120 tokens × $120/1M = $0.1344.
  - Text check: $0.0024 plus $0.0005.
- **Three attempts: $0.4211.**
- **With assumed thinking** (2,000 tokens per 3.1 Pro call, 1,000 per image call): $0.2051 for one attempt, $0.5531 for three.
- A 1,000-word case study changes the theme input by about $0.0013.

(ai.google.dev/gemini-api/docs/pricing; generate-blog-image.ts)

**Audio overview** (a 1,000-word case study; the existing VWC case-study post is 753 words)
- Audio out: 1,000 words ÷ 187 wpm = 320.9 s. At 25 tokens/s that is 8,021 tokens × $10/1M = **$0.0802**.
- Text in: about 1,300 tokens × $0.50/1M = $0.0007.
- **Total about $0.081 on the paid tier, $0 on the free tier.** For 800-1,200 words: $0.064-$0.096.

(pricing page; generate-single-blog-audio.ts:236)

**Video narration, 60 s**
- **HeyGen Starfish** at the Enterprise rate: 0.000333 credits/s × 60 s × $0.50 per credit = **about $0.01**. The self-serve rate is **Not verified**, because it sits behind a login (developers.heygen.com/docs/enterprise-pricing.md).
  - OAuth users reportedly get a 10 min/month web-plan allowance first. That claim comes from the skill (tts.md:60-62), not from an official page.
- **Kokoro:** $0.
- **Gemini 2.5 Flash TTS:** 1,500 tokens × $10/1M = $0.015.
- **Recalibration pass:** one re-synthesis after trimming to the measured pace doubles the narration cost, which is still about $0.02 on HeyGen (arithmetic).
- **Not researched:** ElevenLabs pricing and the cost of the HeyGen BGM catalog.

**Render**
- **Local:** $0 marginal. A 90 s render took about 51 s of wall time, and output is about 9.2-9.6 MB per 73-77 s (reel meta.json; ls).
- **HeyGen cloud render:** credits per second **Not researched**. 4K is billed at 1.5x (hyperframes-cli/references/cloud.md:3-8).

**Cloudinary**, if #2 uses it
- Transformations: 2 uploads (1 tx each), plus the f_mp3 derivative at 0.1 tx/s × 321 s = 32 tx, plus a few f_auto image derivatives. That is about 35-40 tx, or 0.035-0.04 credits.
- Storage: about 1.06 MB of image plus a 15.4 MB WAV (321 s × 48,000 B/s) comes to about 0.017 credits/month.
- If the MP4 is delivered with a transformation at 1080p: 4 tx/s × 60 s = 0.24 credits.

(cloudinary.com/documentation/transformation_counts)

**GitHub:** $0. An authenticated run uses about 10-30 of the 5,000 hourly requests (Lessons, Repo reading).

**Totals (paid APIs only)**
- Minimum about **$0.24**: image $0.145, audio $0.081, narration $0.01.
- About **$0.30** typical with thinking, and about **$0.65** with three image attempts plus thinking.
- #2's research put the whole-post worst case at **about $4.87**, because the scripts set no `maxOutputTokens`.

**Not researched:** the coding agent's own token cost to read the repo, write the case study and author 5-7 frames. With budgeted reads, the input is bounded by the ingest caps rather than by the 84 MiB tree (inference). This is probably the largest real cost (inference).

---

## Acceptance criteria, mapped

**1. "The input is a local repo or a public GitHub URL. The skill reads the code and README; it does not invent features."**
- *Already exists:*
  - pr-to-video's gh ingest, noise filter, budget constants and the rule to stop rather than fabricate (fetch-pr.mjs, ingest.mjs, SKILL.md:86).
  - brag's code-first read order and its "Primary files read" section (step-1-inspect.md; step-3-compose.md:19-27).
  - Measured clone and tree sizes for both targets.
- *Missing:*
  - A repo ingest for a local path or a URL: shallow clone, recorded HEAD sha, `gh auth status --active`, and an inventory of README, manifests, entry points, tests, commits, PRs, issues and contributors.
  - Noise and data excludes, such as `data/**` JSON and binary fixtures.
  - A **claims ledger** that maps each feature to `path:line` of **executing** code, not to a string match.
  - A pass that checks README and catalog claims against the code.
  - A gate that rejects any feature sentence without a ledger entry.
- *Risk:*
  - VetsAI's three verified traps: README-only upload, config and fixture residue, and advertised commands with no handler.
  - J0dI3 content in 142 vets-who-code-app files.
  - Picking up the target's `.env`.
  - Telemetry or feedback leaking details of a private repo.
  - The API limits, if the ingest uses the contents API instead of a clone.

**2. "The case study covers the problem, what was built, key decisions and trade-offs, what's next, and how to run it."**
- *Already exists:*
  - One VWC build-journal post in phases (the Onulak post).
  - Front-matter conventions: VWC's (src/lib/blog.ts:17-152) and #9's (`title`, `date`, `author`, `description`, `tags`).
- *Where each section can be sourced for VetsAI (verified):*
  - **Problem:** README:3 and the repo description. Issue #12 adds a stated access problem ("only want people who are a part of Vets Who Code … cut cost").
  - **What was built:** the ledger. That means `/mos`, `/afsc` and `/rate` translation (app.py:344-372), GPT-4 chat (:313), chat-history download (:537) and feedback saving (:332).
  - **Decisions and trade-offs:**
    - PR #4's body has a real trade-off, written by jonulak: a 20 MB upload cap, and rejecting `msoffcrypto` because python-docx can't detect password-protected files ("the benefit of adding another dependency … seems minimal").
    - But it concerns the removed feature, and PR #11 removed it **without saying why** (PR #4, #11 bodies).
    - Beyond that, commit subjects carry no decision text. Only 5 of 59 messages exceed 130 characters (`gh api …/commits`).
    - So the "why" of the current design must come from the builder.
  - **What's next:**
    - Open PR #23 (data loading into `data/data_loader.py`, resolves #20).
    - Open issues #12 (GitHub OAuth), #13 (Black), #15 (Pylint), #16 (CSS extraction) and #18 (feedback module).
    - Issue #26, "Refactor and Migrate VetsAI to Next.js", was closed as COMPLETED on 2026-05-23. Inference: VetsAI may be superseded, so "what's next" needs the builder's confirmation.
  - **How to run:** `run.sh`, `streamlit.sh` and the CI workflow (see Lessons), not the README.
- *Missing:*
  - A five-section template.
  - A per-section source rule: README, ledger, PRs/commits/ADRs, issues/TODOs, manifests/scripts/CI.
  - A builder questionnaire, with a printed "not stated in the repo" fallback.
- *Risk:*
  - The decisions section is the one most likely to be invented (inference).
  - Crediting jonulak's trade-off to someone else.
  - VetsAI's `.env` run steps.
  - A "Support Vets Who Code" close leaking into the generic template (docs/blog-template.md:19-21).

**3. "The video is 60 seconds, generated from the case study, using the builder's own brand pack or a neutral default."**
- *Already exists:*
  - The faceless engine, with its BRIEF, visible-text, resume and verbatim input surface (faceless SKILL.md:26, 51-58).
  - Measured pace for HeyGen Orson (2.45-2.59 w/s) and Kore (3.12 w/s).
  - Voice-to-render length tracking within 0.02 s on two runs.
  - 13 Apache-2.0 presets, including code-editorial with OFL fonts.
  - Real 1080p30 renders.
- *Missing:*
  - #3 itself, and the handoff contract above.
  - A neutral default pack, which is not in #3's AC.
  - A demo-shaped story. VWC's 7-frame shape ends in a mandatory CTA end card (vwc SKILL.md:136-148).
  - Code frames with real `### Source excerpt` blocks, and their enforcement, which faceless lacks.
  - A pre-render gate on the summed `audio_meta.json` voice duration, plus an ffprobe gate after render.
  - Real UI:
    - `hyperframes capture <live_url>` works for vets-who-code-app only.
    - For VetsAI, the catalog screenshot (vets-ai.json:39) can serve as a `public/<basename>` image.
- *Risk:*
  - Using 2.2 w/s under-fills: 132 words is about 51-54 s on Orson.
  - Invented mechanism diagrams.
  - Captured commercial fonts.
  - A faceless video with only invented visuals is a weak "demo" (inference).

**4. "The case study gets a hero image and an audio overview from the blog-media skill."**
- *Already exists:* the VWC image and audio scripts and their tests.
- *Missing:* #2 accepting an arbitrary file path and returning a result #4 can read.
- *Risk:*
  - Blocked until #2 lands.
  - #2's issue text mis-describes front-matter wiring and script writing.
  - Model churn.
  - The text check fails open.
  - Open question: whether `gemini-3-pro-image` returns interim "thought" images first. The script takes the **first** `inlineData` part (generate-blog-image.ts:87-108). Not researched.

**5. "It works on at least two public repos from the Vets Who Code projects catalog."**
- *Already exists:*
  - 7 public catalog repos.
  - Only VetsAI and vets-who-code-app have application code and a license. vetswhocode-vs-code-theme has theme JSON, a CHANGELOG and a screenshot, but no license (table).
- *Missing:*
  - Pinned targets.
  - Golden `expected.json` files that include the traps.
  - An eval harness.
  - The #4-owned fictional fixture, for #1's non-VWC AC. It does **not** count toward AC 5.
- *Risk:*
  - vets-who-code-app is gated while the private-backend code is still present in it, which no issue tracks.
  - Fixing VetsAI's drift upstream would remove its signal, so pin the sha.
  - The theme repo fallback has thin "decisions" material and no license (inference).

---

## Open decisions for the owner

1. **The video route and the #3 contract.**
   - **Default:** #4 writes the case study, then a demo-shaped `STORYBOARD.md` plus `SCRIPT.md` that pass #4's ledger gate. It hands #3 the project dir defined in Dependencies, and #3 resumes at Step 3.1.
     - #4 borrows pr-to-video's code-frame rules (source excerpt, word budget, names not handles) and brag's inspect order and poster bake. It uses neither brag's tones nor its length cap.
     - Add the contract to #3's AC before #3 merges. Editing the issue is visible to others, so confirm first.
   - **Why:**
     - The issue says the video is "generated from the case study" and "builds on" #3.
     - Upstream already supports resume and verbatim inputs (faceless SKILL.md:26, 56).
     - Pre-writing the storyboard lets #4 control the `scene` and `focal` fields that faceless otherwise invents (SKILL.md:212).
     - #3's own AC 5 already needs an external script.
2. **Which two catalog repos. The #4 doc's test-repo choice replaces decision 17 in [issue-1.md](issue-1.md).**
   - **Default:** VetsAI @ `cd3f1c8a` plus vets-who-code-app @ a pinned sha, **only if** its private-backend code is no longer present. If the private-backend code is still present in vets-who-code-app when #4 reaches evals, the second target is vetswhocode-vs-code-theme. The fictional fixture runs in addition.
   - **Why:**
     - AC 5 needs two **catalog** repos, so "VetsAI plus the fixture" does not meet it as written.
     - #1's J0dI3 gate is kept, because 142 files mention J0dI3 in their contents and path excludes miss prose (git grep).
     - VetsAI carries three verified traps.
     - vets-who-code-app tests scale (1,437 commits, 845 PRs) and URL capture.
   - Also: update [issue-1.md](issue-1.md) and file a vets-who-code-app issue to track the private-backend code.
3. **Keep or fix the VetsAI drift.** **Default:** keep it as the eval case. Pin the sha, and file the README and catalog fix separately. **Why:** a quiet fix removes the only real trap, and pinning keeps the eval stable either way.
4. **Who owns the non-VWC repo fixture. The answer is #4.**
   - **Default:** #4 ships `fixtures/project/` (CC0, under #9's hard rules: fictional, `example.com`, OFL-only, no binaries) plus a test helper that runs `git init` in a temp dir and replays scripted commits. The replay needs history so the "decisions" and "what's next" sources exist.
   - Planted traps mirror VetsAI's:
     - a README-only feature
     - a vestigial config key
     - a command advertised in UI copy with no handler
     - one commit body with a real trade-off
     - a `ROADMAP.md` for "what's next"
   - **Why:**
     - #9 excludes #4 (#9 body; [issue-9.md](issue-9.md) decision 12), and [issue-1.md](issue-1.md) decision 16 names no owner.
     - A nested `.git` can't be committed and #9 bans binaries such as a git bundle, so history has to be generated (inference).
     - CI needs a keyless input.
   - Also: amend [issue-1.md](issue-1.md) decision 16 to say "#4 owns it".
5. **Duration tolerance and word target.**
   - **Default:**
     - A hard gate of 55-65 s. Check it first on the summed `audio_meta.json` voice duration, before rendering, then with ffprobe on the MP4.
     - Set the script target from the chosen provider's measured pace: about 147-155 words for HeyGen Orson (2.45-2.59 w/s) and about 187 for Gemini Kore (3.12 w/s). Kokoro needs a calibration run first, since it is unmeasured.
     - If the first TTS pass lands outside the gate, trim or extend once and re-synthesize.
   - **Why:**
     - Voices differ by about 27% (2.45 against 3.12).
     - Per-line pace varies from 1.80 to 2.95 w/s.
     - The render tracked voice length within 0.02 s, so the voice total is a cheap, early gate (audio.log; audio_meta; ffprobe).
6. **Where demo visuals come from.**
   - **Default:** code excerpts with `path:line`, README images, the catalog screenshot when one exists, and diagrams tied to cited files.
     - Use `hyperframes capture <live_url>` only when a live URL exists and the user agrees.
     - **Never run the target repo's code.**
   - **Why:** running untrusted code is a risk, it would need the target's own keys (VetsAI needs GPT-4), and it isn't reproducible.
7. **Sections the repo can't source.**
   - **Default:** a short builder questionnaire covering "why this design", "why was X removed" and "is this still active".
     - Answers are logged in the ledger as "from the builder", and missing answers print "not stated in the repo".
     - PR bodies are quoted with their author credited, e.g. jonulak for PR #4.
   - **Why:**
     - VetsAI's commits carry almost no rationale, and PR #11 removed a feature without one.
     - Issue #26 suggests the project may be superseded.
     - The job seeker is present to answer.
8. **Output location.**
   - **Default:** `~/.cache/hashflag/project-demo/<owner>/<repo>/<sha>/`, with an `--out` override, following project-dir.mjs.
   - **Why:**
     - The brag-output incident (PR #1390).
     - A location 5 or more levels away from the target also keeps `loadEnvFromDir` from importing the target's `.env` (heygen.mjs:20-45).
     - The walk-up depth relative to `~/.cache` is an inference to test.
9. **Who ships the neutral default brand pack.** **Default:** #3, built from the code-editorial preset with OFL JetBrains Mono and Inter. **Why:** #3 owns the pack format, #4 and #7 both need a default, and it avoids licensed fonts.
10. **One narrator voice or two.**
    - **Default:** the pack names one voice per provider.
      - v1 accepts that the audio overview (Gemini Kore via #2) and the video (#3's provider) may differ, and the README says so.
      - Converge on Gemini TTS once upstream `01601d1105` is pinned.
    - **Why:** "falling back to local Kokoro … produces a film that sounds wrong … had to be re-voiced" (tts.md:29-32).
11. **Privacy defaults.** **Default:**
    - `HYPERFRAMES_NO_TELEMETRY=1`
    - never run `hyperframes feedback` or `--file-issue`
    - send only case-study text to paid APIs, never source files
    - warn on a free-tier Gemini key

    **Why:** feedback is public, and free-tier data is used for training.
12. **J0dI3 when the target is vets-who-code-app.**
    - **Default:** don't run on it while the private-backend code is still present in vets-who-code-app (decision 2).
    - If the owner overrides that, the fallback is a path exclude (`**/*j0di3*`, `src/lib/ensure-troop.ts`) **plus** a content filter that drops any file or paragraph matching `/j0di3/i`, and a gate that fails on the word in any output.
    - **Why:** a path exclude alone misses 142 content hits.
13. **Credits.**
    - **Default:** the job seeker is the author. Co-builders come from `gh api repos/<o>/<r>/contributors`, and their names from `gh api users/<login> --jq .name`. The voiceover says names, not handles.
    - Each decision is credited to its PR author.
    - **Why:** VetsAI has three contributors (55/3/1 commits), and the only written trade-off is jonulak's.
14. **Case-study front matter.**
    - **Default:** neutral fields matching #9 (`title`, `date`, `author`, `description`, `tags`, plus `image.src` and `image.alt`), with a VWC adapter that maps `date` to `postedAt` and adds `category`.
    - **Why:** VWC uses `postedAt`, and `tags` is effectively required (src/lib/blog.ts; [issue-2.md](issue-2.md)).

---

## Suggested build plan

Preconditions: #2 and #3 are merged, and the repo has a default branch.

1. **Pin the contracts #4 consumes.**
   - #2: file-path input, `--dry`, and a JSON result with paths or URLs and alt text.
   - #3: the project-dir contract in Dependencies. That means BRIEF.md, visible-text.txt, STORYBOARD.md and SCRIPT.md resumed at Step 3.1, `public/` images, `--brand`, the copy gate on the supplied files, and a Source-excerpt hard-fail. Propose the AC text on #3, after the owner confirms.

   *Verify:* #2 `--dry` on a fixture post makes zero network calls (fetch spy). #3 renders a stub STORYBOARD.md and SCRIPT.md with the neutral pack without modifying either file (`sha256sum` before and after). A code frame with no excerpt exits non-zero.
2. **Fixture repo and goldens.**
   - Write `fixtures/project/` and the history-replay helper.
   - Write `evals/<target>/expected.json` for VetsAI @ `cd3f1c8a`, the second catalog target @ its sha, and the fixture. Each holds:
     - real features with `path:line`
     - known false or overstated claims (upload, `/frontend`/`/backend`/`/ai`, `.env`)
     - correct run steps (run.sh, CI secrets.toml)
     - decision sources (PR #4, credited to jonulak)
     - excluded paths

   *Verify:* owner review. A script greps every cited line at the pinned sha, and the helper produces the same commit count on each run.
3. **Repo ingest** (Node, `node:test`, ported from fetch-pr and ingest).
   - Local path or URL.
   - `gh auth status --active` for GitHub metadata, git-only otherwise.
   - `git clone --depth 1` into the cache dir, recording the sha.
   - Noise, data and binary excludes.
   - Budgeted reads of README, manifests, entry points, tests, run scripts, CI, the last N commits, PR bodies, open issues and contributors.
   - Writes `capture/repo.json` and `source-brief.md`.

   *Verify:* fixture unit tests pass. The VetsAI brief records the absence of `file_uploader`, the presence of `handle_command` for only three commands, and no `data/employment_transitions` contents. A multi-account keyring where bare `gh auth status` exits 1 still ingests. The REST call count for VetsAI is ≤ 15.
4. **Claims ledger and conflict pass.** Each candidate feature from the README, the description or catalog prose gets code evidence on an executing path, or one of two statuses: "claimed, not found in code" or "in UI copy, no handler".

   *Verify:* the VetsAI upload is flagged despite `maxUploadSize` and the PDF fixtures, `/frontend`/`/backend`/`/ai` are flagged as "no handler", the fixture's traps are flagged, and every real feature has `path:line`.
5. **Case-study writer** (SKILL.md steps plus a template). Five sections, per-section source rules, the builder questionnaire, PR-author credit, and "how to run" derived from scripts, CI and manifests.

   *Verify:* a lint checks the five headings, a ledger id on every feature sentence, and a source or "from the builder" tag on every decision. It also checks that there is no "Support Vets Who Code" in generic output, that front matter parses with gray-matter, and that the VetsAI run steps mention `secrets.toml`, not `.env`.
6. **Claims and copy gate.** Reuse #3's check-copy engine with `--numerals`, and add ledger enforcement: no feature without a ledger id, no figure without a source, and no version unless it comes from a release or manifest, labeled as such.

   *Verify:* `--self-check` passes, the planted-trap drafts fail, and the clean drafts pass.
7. **Hero image and audio through #2.** Run `--dry`, then the real run.

   *Verify:* the dry-run cost prints before any paid call. The real run returns alt text and paths or URLs. The audio duration is within ±15% of words ÷ 3.12 w/s, the #1266 truncation audit.
8. **Demo storyboard and script.**
   - Write 5-7 frames at the provider's measured pace.
   - Every code frame gets a `### Source excerpt` of 12 lines or fewer, citing `path:line`.
   - Real images go under `public/`, and credits use names.
   - Hand off to #3.

   *Verify:* the word count is within the provider target. The frame-packet validator rejects a code frame without an excerpt. check-copy passes.
9. **Audio gate, render and hygiene.**
   - Pin the CLI and set `HYPERFRAMES_SKIP_SKILLS=1` and `HYPERFRAMES_NO_TELEMETRY=1`.
   - After TTS, sum `audio_meta.json` `voices[].duration_s`.
   - Then run lint, check and snapshot, and render after approval.

   *Verify:*
   - The voice total and the ffprobe duration are both within 55-65 s.
   - The voice count equals the SCRIPT line count.
   - The contact sheet has been reviewed.
   - `git status --porcelain` in the target is empty.
   - No key from the target's `.env` appears in the child process environment (test with a canary `.env`).
10. **Whole-skill cost guard.** `--dry` sums the #2 estimate, the narration estimate and the render mode into a range, and a ceiling flag aborts before any paid call.

    *Verify:* a test shows zero network calls in `--dry`, and a ceiling below the estimate exits non-zero before any fetch.
11. **Evals and CI.** CI runs the fixture end to end with the models mocked and no keys. A manual job with keys runs VetsAI and the second catalog target.

    *Verify:* CI is green. The eval shows zero features outside the ledger, all VetsAI traps flagged, correct run steps for both targets, and zero `/j0di3/i` matches in any output.
12. **README.** Show before and after (repo, then case-study excerpt, then video poster and link) for the fixture and one catalog repo. Document keys, costs, measured pace per provider, and privacy defaults.

    *Verify:* #1's "a README with a before-and-after example" is met. `git ls-files | grep -E '\.(woff2?|otf|ttf)$'` lists only OFL files that have a license file beside them.

---

## Sources

**hashflag-skills issues, repo and sibling context docs**
- `gh issue view 1, 2, 3, 4, 9 -R Vets-Who-Code/hashflag-skills` (2026-09-29); `gh api repos/Vets-Who-Code/hashflag-skills` and `/commits` (HTTP 409)
- Sibling context docs in `docs/context/`:
  - [issue-1.md](issue-1.md) (Lessons 31, line 139, decisions 16-17)
  - [issue-2.md](issue-2.md) ("Four statements…")
  - [issue-3.md](issue-3.md) (Dependencies, decisions 3 and 7, plan steps 8 and 10)
  - [issue-9.md](issue-9.md) (line 26, decision 12)

**VetsAI (github.com/Vets-Who-Code/VetsAI, gh api, 2026-09-29)**
- Files at `cd3f1c8a`: app.py (:6, 101, 104, 157, 313, 332, 344-372, 392-394, 468-478, 537), README.md, requirements.txt, `.streamlit/config.toml`, run.sh, streamlit.sh, `.github/workflows/unit-test.yml`, `tests/test_streamlit_app.py`, `feedback/feedback_20241023_212458.json`, the recursive git tree
- Commits: cd3f1c8a, 9d0fd563, d79136d2, a35748bc, e4aaafd8, 772eacd9, b5ec7247, 3edffeaa, 6c426b40, 29b0922d; `/commits` (59), `/contributors`, `/releases`, `/tags`
- PRs #4, #7, #8, #11, #22, #23, #24, #25; issues #12, #13, #15, #16, #18, #20, #26
- Catalog screenshot: res.cloudinary.com/vetswhocode/…/projects/VetsAI_ie8v4u.png (vets-ai.json:39)

**Other catalog repos (gh api, 2026-09-29):** repos/Vets-Who-Code/{vets-who-code-app, api-list, Prework, windows-dev-guide, vetswhocode-extension-pack, vetswhocode-vs-code-theme}: metadata, commit counts, trees; `gh search issues/prs --repo Vets-Who-Code/vets-who-code-app j0di3`

**vets-who-code-app PRs and commits:** #959, #1266, #1332, #1390, #1418, #1420, #1437, #1460; 1fa1bfa7, 7b0f4aef, 47165207; local HEAD b7c19088, origin/master badc2951

**vets-who-code-app files** (`vets-who-code-app/`)
- scripts/generate-blog-image.ts; scripts/image-prompts.ts; scripts/generate-single-blog-audio.ts; scripts/generate-blog-media.ts; `__tests__/scripts/`
- src/lib/blog.ts; src/lib/cloudinary.ts; src/lib/cloudinary-helpers.ts; src/lib/project.ts; src/utils/types.ts
- src/data/projects/*.json; src/data/outcomes.ts; src/data/blogs/introducing-the-vets-who-code-projects-page-design-and-implementation-journey.md
- src/pages/projects.tsx; docs/blog-template.md; public/llms.txt; package.json; .nvmrc; .gitignore; .git/info/exclude; README.md
- brag-output/share-copy.txt; brag-output-2026-09-20-164238/composition-brief.md; brag-output-2026-09-22-110928/ref/capture.js
- videos/labor-day-sprint-proof-of-work/: BRIEF.md, STORYBOARD.md, SCRIPT.md.bak, `.narrated-backup/{SCRIPT.md, STORYBOARD.md, audio_meta.json}`, audio.log, audio_meta.json, package.json, renders/*.mp4 (ffprobe)
- videos/vets-who-code-reel/: renders/*.meta.json, capture/extracted/

**Installed skills and plugins**
- ~/.claude/skills/pr-to-video/: SKILL.md; scripts/fetch-pr.mjs, ingest.mjs, project-dir.mjs, preflight.mjs, fetch-people-avatars.mjs, frame-packets.mjs, workflow-guardrails.test.mjs; references/story-design.md; sub-agents/frame-worker.md
- ~/.claude/skills/faceless-explainer/: SKILL.md; scripts/frame-packets.mjs; scripts/lib/dimensions.mjs; references/story-design.md
- ~/.claude/skills/hyperframes/references/: brief-contract.md, storyboard-format.md, script-format.md, routes/pr-to-video.md, routes/faceless-explainer.md, skill-lifecycle.md
- ~/.claude/skills/hyperframes-cli/: SKILL.md; references/init-and-scaffold.md, preview-render.md, doctor-browser.md, cloud.md, upgrade-info-misc.md
- ~/.claude/skills/hyperframes-creative/: frame-presets/; references/narration.md
- ~/.claude/skills/vwc-faceless-explainer/: SKILL.md; scripts/check-copy.mjs; brand/
- ~/.claude/skills/media-use/audio/: scripts/lib/heygen.mjs; references/tts.md, requirements.md
- ~/.claude/skills/product-launch-video/SKILL.md; ~/.claude/skills/general-video/SKILL.md
- ~/.claude/plugins/cache/brag/brag/0.2.2/skills/brag/: SKILL.md; references/step-1-inspect.md, step-3-compose.md, step-4-deliver.md, tones.md; assets/music/README.md

**Local commands (2026-09-29)**
- `gh auth status` (exit 1), `gh auth status --active` (exit 0), `gh auth status --help`, `gh api rate_limit`, `gh --version`
- `git clone --depth 1` and `du -sk` for VetsAI and vets-who-code-app
- `git ls-files`, `git grep -il j0di3 origin/master`, `git rev-list --count HEAD..origin/master`
- `python3 -c "import kokoro_onnx"`

**External (read 2026-09-29)**
- https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- https://docs.github.com/en/rest/git/trees
- https://docs.github.com/en/rest/repos/contents
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/deprecations
- https://cloudinary.com/pricing/compare-plans
- https://cloudinary.com/documentation/transformation_counts
- https://developers.heygen.com/docs/enterprise-pricing.md
- https://pixabay.com/service/license-summary/
- https://github.com/heygen-com/hyperframes (LICENSE)

**Not researched**
- The coding agent's token cost per run.
- HeyGen's self-serve and cloud-render rates.
- ElevenLabs pricing.
- The cost of the HeyGen BGM catalog.
- Kokoro's words per second (not installed here).
- Whether `gemini-3-pro-image` returns interim thought images as the first `inlineData` part.
- Why VetsAI's upload feature was removed (PR #11 gives no reason).
- Whether the private-backend code will stay in vets-who-code-app.
- Whether the `loadEnvFromDir` walk-up from `~/.cache/hashflag/…` can reach a `.env` in practice.