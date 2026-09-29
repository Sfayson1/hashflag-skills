# #6 [Skill]: Donor update email with audio and images: context

The issue text, verbatim (gh issue view 6 -R Vets-Who-Code/hashflag-skills, read 2026-09-29): "For nonprofits: turn a month's news (notes, links, photos) into a donor update email, an audio version, and one image per story. It builds on the blog-media skill." It is open, labeled `enhancement`, and has no comments and no assignee. Owner build order: #2, then #3, then #4, then #8. #6 comes "after steps 1 and 2" (#1 body).

Summary: nothing in VWC builds or sends HTML email today. The real pieces are the #2 TTS and image pipelines, the check-copy gate, and some MIT email-HTML techniques inside a deprecated React Email package. #6 is mostly new code: story extraction, a facts ledger, a Markdown-to-email renderer, a plain-text pass, photo handling, and alt-text, consent and CTA checks. It calls #2's CLI for audio and for publishing. This document picks libraries for the open pieces: sharp for photos and html-to-text for plain text. Mailchimp's ZIP import can host the images, so the Mailchimp path needs no storage account for images. VWC's Mailchimp plan and where its donors live are still unknown, and only the owner can answer.

Path prefixes: `app/` is the vets-who-code-app repository at b7c19088. Sibling context docs for other issues live next to this file as docs/context/issue-N.md and are linked as [issue-N.md](issue-N.md).

---

## What exists today

**Audio (reuse through #2)**
- `app/scripts/generate-single-blog-audio.ts` exports:
  - `pcmToWav` (:6)
  - `main` (:154)
  - `NARRATION_STYLE` (:240)
  - `normalizeLoudness` (:247)
  - `chunkForTts` (:298)
  - `cleanMarkdownToText` (:327)
  - The Gemini TTS call is a raw fetch (:59-121), and `uploadToCloudinary` is at :123-152.
  - It imports `@/lib/cloudinary` (:3), so a port has to replace that with a storage interface.
  - (file, confirmed 2026-09-29)
- `cleanMarkdownToText` (:327-337) removes images and headers, **drops link URLs but keeps their text**, and deletes every `*` and every HTML tag. It is usable as narration prep. It cannot produce the plain-text email, which needs its URLs (file, read 2026-09-29).
- `app/src/data/blog-audio/labor-day-sprint-10-days-to-proof-of-work.md` is the only hand-written spoken script (1,212 words). It dots acronyms (A.I., M.O.S.), spells out numbers ("twenty-eight percent"), turns headers into sentences, and has no front matter. It is the style reference for a narration script. (file; wc -w)
- `app/src/lib/blog.ts:55-59` builds a playable MP3 link from a stored WAV: `https://res.cloudinary.com/${cloudName}/video/upload/f_mp3/blog-audio/${realSlug}.wav`. `cloudName` falls back to `"vetswhocode"`. This is the pattern for the email's "Listen" link. (file)
- `app/src/containers/blog-details/index.tsx:45-49` is the site's `<audio controls preload="metadata">` player. It ships an empty `<track kind="captions" src="">`, which a donor-audio landing page should not copy. (file)

**Images (reuse through #2, or instead of it)**
- `app/scripts/generate-blog-image.ts`:
  - Theme JSON comes from `gemini-3.1-pro-preview` (:61).
  - The image comes from `gemini-3-pro-image` with `imageConfig: { aspectRatio: "16:9" }` (:93-96).
  - A text check runs on `gemini-3.1-pro-preview` (:184). It fails open (:217), and after 3 attempts the script ships the last image anyway (:243).
  - It exports `readBlogPost` (:17), `buildImagenPrompt` (:83) and `main` (:140). (file)
- `app/scripts/generate-blog-graphic.ts`:
  - It renders HTML `.artboard` files (1400x760) with Playwright at `deviceScaleFactor: 2` (:109, :121).
  - `--dry` renders only and uploads nothing (:77).
  - `--draft <name> "<brief>"` has Gemini write the artboard once and refuses to overwrite it (:32-73).
  - Uploads go to `folder: "blog-graphics"` with `invalidate: true` (:13-18).
  - The prompt hard-codes "Vets Who Code blog graphic" (:50) and GothamPro/Gilroy (:65).
  - This is the deterministic path for story cards that carry text. (file)
  - Existing renders are 2800x1520 PNGs of 141-227 KB. Resized to 1200 px wide they are 40-54 KB as JPEG (q80, mozjpeg) or 108-151 KB as PNG. (measured with sharp 2026-09-29 on `app/src/data/blog-graphics/{high-success-low-adoption,10-day-sprint}/out/*.png`)
- `app/scripts/lib/cloudinary.ts` is a standalone Cloudinary config with no `@/` alias and zero importers. It is the portable starting point for a storage adapter. (grep 2026-09-29)

**Photo processing (not used by any VWC script; present only transitively)**
- `sharp` 0.35.4 is installed in the app only as a dependency of `next@15.5.25` (`npm ls sharp`).
  - Its license is Apache-2.0, and it needs Node `>=20.9.0` (app/node_modules/sharp/package.json). The latest is 0.35.5 (`npm view sharp`).
  - Its prebuilt libvips binary ships as a separate npm package, `@img/sharp-libvips-darwin-arm64` 1.3.3, licensed **LGPL-3.0-or-later** (its package.json).
  - The WASM build is "Apache-2.0 AND LGPL-3.0-or-later AND MIT" (app/node_modules/@img/sharp-wasm32/package.json).

**Email: VWC prior art (almost none)**
- `app/src/pages/api/newsletter.ts` only subscribes.
  - The server is hard-coded as `https://us4.api.mailchimp.com/3.0/lists` (:3).
  - Env is `MAILCHIMP_LIST_ID`/`MAILCHIMP_API_KEY`, defaulting to `""` (:4-5).
  - It POSTs `{email_address, status: "subscribed"}`, which is single opt-in (:62-75).
  - No code creates campaigns, and there is no donor segment. (file, confirmed)
- Donations go through Donorbox. The embed is at `app/src/components/forms/donate-form.tsx:73` and the direct link at :85. Nothing in `src/`, `scripts/`, `docs/` or `.env.example` references a donor CRM or a Donorbox–Mailchimp sync. The only CRM names that appear are job-market text in `military-systems-map.json`. (grep 2026-09-29)
- `app/src/lib/email.ts` is a Resend wrapper (`sendEmail`, `isEmailConfigured`) with zero callers (.env.example:115-119).
  - `src/emails/` does not exist, even though AGENTS.md describes it (`ls`, confirmed).
  - vets-who-code-app #1377 (open) proposes deleting `resend`, `react-email`, `@react-email/render` and `@react-email/components`. It also says to decide first whether transactional email should run from the repo at all. (gh issue view 1377)
- Installed but unused: `react-email` 5.1.1, `@react-email/components` 1.0.3 and `@react-email/render` 2.0.1 (package.json:58,59,92). They are MIT and useful as **reference code**:
  - `node_modules/@react-email/markdown/dist/index.js` is a marked@15 renderer that puts inline `style=` on every element. It does not override the raw `html` token, and `![](x)` gives `alt=""`.
  - `node_modules/@react-email/button/dist/index.js` is a bulletproof padding button with Outlook `mso-font-width`/`mso-text-raise` hair-space spacers.
  - `node_modules/@react-email/preview/dist/index.js` is a hidden preheader padded to `PREVIEW_MAX_LENGTH = 150` with `\xA0` and zero-width characters.
  - `node_modules/@react-email/{container,section,body,head,html}` supply `role=presentation` tables, `max-width:37.5em` (600px), `lang="en" dir="ltr"`, and `x-apple-disable-message-reformatting`.
  - (checked during research, 2026-09-29)
  - `node_modules/@react-email/render/dist/node/index.js:90-115` is the plain-text step. It is `html-to-text`'s `convert()` with these selectors: `img` → skip; `[data-skip-in-text=true]` → skip, which is how the preheader is kept out; `a` → `linkBrackets: false, hideLinkHrefIfSameAsText: true`. It also sets `wordwrap: false`. (file, read 2026-09-29)
  - The installed `html-to-text` is 9.0.5 (MIT), pulled in only by `@react-email/render` (`npm ls html-to-text`; its package.json). The latest is 10.0.1 (MIT, Node `>=20.19.0`, modified 2026-08-19) (`npm view html-to-text`).
- `git show 9a3a138c^:src/emails/CertificateEmail.tsx` is VWC's only past branded email: navy #1C263F header, red #C21C21 button, system sans stack. It was removed with the LMS in #1281. It has an emoji badge and no unsubscribe or address footer, so neither should carry over. (checked during research, 2026-09-29)
- `app/docs/EMAIL_SETUP.md` is stale. It documents the LMS certificate flow and was last updated January 2024. (checked during research, 2026-09-29)

**Copy and facts gates**
- `~/.claude/skills/vwc-faceless-explainer/scripts/check-copy.mjs` is dependency-free ESM.
  - It exports `RULES` (:20), `scan` (:64) and `numerals` (:98), and runs `--self-check` (passed 2026-09-29).
  - The only CTA rule that matters for #6 is `/\bsupport us\b/i → "Donate"` (:24). (file, confirmed)
- `app/src/data/outcomes.ts` and `app/__tests__/data/outcomes.test.ts:83-152` show a working pattern: a typed `{value, display, qualifier, source, asOf}` claim ledger plus a stray-number scanner. This is the model for a facts ledger. (checked during research, 2026-09-29)

**VWC-specific content (for a VWC brand pack or config only, never skill defaults)**
- Newsletter brand "Get the SITREP": "One email a month: what our troops shipped, who got hired, and what's open right now." (src/data/homepages/index.json:338-341, confirmed)
- Donate targets:
  - https://vetswhocode.io/donate (src/pages/donate.tsx)
  - The Donorbox embed (src/components/forms/donate-form.tsx:73) and the direct link https://donorbox.org/vetswhocode-donation (:85)
  - GitHub Sponsors, PayPal Giving Fund, Benevity and Brightfunds (src/data/innerpages/donate.json:20-67)
- Org facts: 501(c)(3), EIN 86-2122804, hello@vetswhocode.io (src/pages/press-kit.tsx:101-109; public/llms.txt). No postal mailing address was found in research.
- Brand colors for a button:
  - Red `#c5203e` (tailwind.config.js:95) with white text is 5.75:1.
  - Navy `#091f40` (:85) with white is 16.39:1.
  - Gold `#FDB330` (:104) with white is **1.80:1 and fails**. With navy text it is 9.10:1.
  - (WCAG relative-luminance formula, computed with node 2026-09-29. The house rule is 4.5:1, docs/brand-style-guide.md:141.)

**Email reference material (external)**
- goodemailcode.com accessible base template (https://www.goodemailcode.com/email-code/template)
- caniemail raw dataset (https://www.caniemail.com/api/data.json, dataset updated 2026-09-16; local copy read 2026-09-29)
- Mailchimp Marketing API OpenAPI spec (https://raw.githubusercontent.com/mailchimp/mailchimp-client-lib-codegen/main/spec/marketing.json)
- `~/.claude/skills/emails/SKILL.md` has copy rules only: subject 40-60 chars, preview 90-140, one CTA (:90-108, :215-244). It has no provenance in `~/.agents/.skill-lock.json`, so borrow ideas and do not depend on it. (checked during research, 2026-09-29)
- Bond, *Putting the people in the pictures first* (2024 update) is the NGO sector's consent and ethical-imagery guideline (https://www.bond.org.uk/wp-content/uploads/2024/11/Digital_Ethical-Guidelines_FINAL.pdf, read 2026-09-29; details in Lessons 26-27).

---

## How it works now

There is no donor-update pipeline. The steps below are the pieces #6 would chain, as they run today.

**TTS** (scripts/generate-single-blog-audio.ts)
1. Input is `src/data/blogs/<slug>.md`, or a hand-written override `src/data/blog-audio/<slug>.md` (:176, :196-200).
2. `cleanMarkdownToText` runs, then `chunkForTts` with `WORDS_PER_CHUNK = 1700`, split on paragraph boundaries (:303).
3. Each chunk is sent as `${NARRATION_STYLE}\n\n${chunk}`. The directive reads "Read the following blog post aloud in a single, steady, clear narration voice. Keep an even pace and consistent volume throughout. Do not add commentary." (:240-242). "blog post" is the wrong wording for a donor email.
4. It POSTs to `.../v1beta/models/gemini-2.5-flash-preview-tts:generateContent` (:64) with `responseModalities:["AUDIO"]`, voice `Kore` (:87), and header `x-goog-api-key`.
5. The response is raw 24 kHz mono 16-bit PCM.
   - Chunks are joined with 350 ms of silence and run through `normalizeLoudness`: TARGET_RMS 0.158 (-16 dBFS), PEAK_CEILING 0.891 (-1 dBFS), MAX_GAIN 4, MIN_GAIN 0.25, 100 ms frames, about 1.5 s smoothing (:247-296).
   - Then `pcmToWav` wraps the result.
6. Upload uses `resource_type: "video"`, `folder: "blog-audio"`, `overwrite` and `invalidate: true` (:128-137).
7. Key precedence is `GOOGLE_GENERATIVE_AI_API_KEY || GEMINI_API_KEY || GOOGLE_PRIVATE_KEY` (:163-166).
8. Nothing writes front matter. The site derives the URL from the slug (src/lib/blog.ts:59). #2's issue text claims otherwise and is wrong. (checked during research, 2026-09-29)

**Image** (scripts/generate-blog-image.ts)
1. `gemini-3.1-pro-preview` returns a 5-key theme JSON.
2. The theme fills one of 3 fixed 1950s linocut/WPA templates.
3. `gemini-3-pro-image` renders it through `generateContent`. No `imageSize` is set, so it defaults to 1K (1376x768 at 16:9).
4. A vision text check follows. There are 3 attempts, and the check fails open.
5. Upload uses `public_id=<slug>`, `folder=blog-images` and `invalidate:true`. The stored asset is JPEG despite the `.png` naming. (checked during research, 2026-09-29)

**HTML card** (scripts/generate-blog-graphic.ts)
- A hand-edited or Gemini-drafted `.artboard` HTML file, styled with `_brand.css` tokens, is screenshotted at 2x to a 2800x1520 PNG. `--dry` renders only. (file)

**Orchestration** (scripts/generate-blog-media.ts)
- It runs image, then audio, each wrapped in try/catch, and returns `{imageOk, audioOk}` (:21-64). It exits 1 if either failed (:82-83).
- The audio `main()` calls `process.exit(1)` on bad input (generate-single-blog-audio.ts:160,173,180,190,342), which kills the orchestrator before its summary prints. (file)

**The #2 interface #6 will actually call (planned, not built)**
- #2's dossier makes the **CLI plus a JSON manifest** the stable interface, not a library:
  - "have #8 call the skill's CLI scripts … the script CLI is the stable interface" ([issue-2.md](issue-2.md), decision 16).
  - "Steps throw, and only the CLI sets the exit code" ([issue-2.md](issue-2.md), plan step 10).
  - Narration of a user-supplied `--script <path>` is decision 5 ([issue-2.md](issue-2.md)).
  - `--no-upload` is decision 8 ([issue-2.md](issue-2.md)).
- #8's dossier asks #2 for `--dry --json`, `--out <dir>`, a separate `publish`, and a JSON result per output `{kind, status, artifact, error, retry, estCostUsd, usage}` ([issue-8.md](issue-8.md)).
- Neither dossier gives `publish` a way to upload files that #2 didn't generate, such as #6's photos and cards (read 2026-09-29).

**Env**
- npm scripts run under `tsx -r dotenv/config`, which loads `.env`, not the `.env.local` that AGENTS.md tells contributors to create (package.json:27-31; README.md:188).
- SDK pins (file):
  - `@google/genai` 1.40.0 (package.json:49; #1460 on master bumps it to 2.24.0)
  - `cloudinary` 2.9.0 (:66)
  - `marked` ^4.0.18, with 4.3.0 installed (:76)
  - `@playwright/test` ^1.49.0 (:110)

**Email-client constraints that fix the output format** (caniemail, Mailchimp and Litmus pages read 2026-09-29)
- **Layout:** `role="presentation"` tables at a max width of 600px, with inline CSS. Gmail limits `<style>` to 16 KB and supports it only partly.
- **Fonts:**
  - `@font-face` is not supported in Gmail (any platform), Yahoo, Outlook.com, or new Outlook for Windows. Apple Mail supports it.
  - In classic Outlook for Windows 2007-2016, "Elements using a font declared with `@font-face` ignore the font stack and fall back to Times New Roman. Use `mso-generic-font-family` and `mso-font-alt` to control the fallback." (caniemail.json `css-at-font-face`, note 5, last tested 2023-12-19)
  - Use web-safe stacks.
- **Images:** JPG or PNG only. Gmail converts WebP and rasterizes SVG. Gmail and Outlook don't support `<picture>`/`srcset`.
- **Size:** keep the HTML under 102 KB, or Gmail clips it and the footer is lost first.
- **Audio:** `<audio>` is supported only in Apple Mail (macOS, iOS). Gmail, Outlook and Yahoo all return `n` (caniemail.json `html-audio`, last tested 2020-04-21). Link to a hosted MP3 or a landing page instead.
- **CTA button:** use live HTML text, not an image. Classic Outlook blocks images by default and is supported until at least 2029.
- **Gmail image proxy:** "Gmail uses Google's secure proxy servers to serve images" (Google Workspace Admin Help, image URL proxy allowlist). Google's page says nothing about caching. See Lesson 3.
- **Mailchimp hand-off:**
  - Custom HTML, whether pasted, uploaded as a file or imported as a ZIP, is "available for users with a Standard plan or higher" (paste-in-html page).
  - It runs in the legacy builder: new-builder users "will be prompted to continue with the legacy builder" (same page).
  - It must contain `*|UNSUB|*`, or Mailchimp appends a second footer. A postal address is required.
  - A ZIP import must be "less than 1MB and contain only 1 HTML file", with images in "JPG, JPEG, PNG, or GIF".
  - "Place all images and files in the root directory of the ZIP file and not in subfolders. We'll upload all your images and files to the content studio and create absolute paths for you" (import-a-custom-html-template page).
  - "Mailchimp automatically creates a plain-text version of a campaign" (about-html-email page).

---

## Lessons already paid for

1. **TTS truncates silently.**
   - Output stops at 16,384 audio tokens (about 655 s, about 2,040 words at 187 wpm) with `finishReason STOP` and no warning (generate-single-blog-audio.ts:235-237; PR #1266).
   - A short donor audio fits in one chunk, but the current code never reads `finishReason` or `usageMetadata`.
   - PR #1266 found posts that stopped early, well below the cap, so #6 should compare the duration against the word count. (checked during research, 2026-09-29)
2. **Un-awaited upload.** It was introduced in 7b0f4aef and fixed in #1266. Always await the storage write before reporting success. (checked during research, 2026-09-29)
3. **Stale copies come from reused URLs.**
   - #1266 added `invalidate: true` (generate-single-blog-audio.ts:137; generate-blog-image.ts upload). Cloudinary invalidation "usually takes between a few seconds and a few minutes" (Cloudinary upload API reference, https://cloudinary.com/documentation/image_upload_api_reference_upload).
   - For email there is a stronger reason to use unique URLs: a sent email can't be edited. If a later run overwrites the same public id, every past send that points at it changes (inference from how email HTML references remote images).
   - Gmail proxies images (Workspace Admin Help). **Whether the proxy caches is contested, and #6 should not rely on it either way:**
     - Litmus says "images are viewed only once on the original server while successive views will originate from the cached image on Google's proxy servers" (litmus.com, 2013-12-09).
     - An independent test three days later found "no caching is performed server-side, every time I downloaded that URL, a request showed up on my server" (words.filippo.io, 2013-12-12).
     - Both are 13 years old, and neither is a Google statement.
4. **One voice across chunks** needs a fixed directive on every chunk (d97b2ce8; :238-242).
   - Level spread dropped from 6.8 dB to 3.2 dB after normalization (d97b2ce8).
   - The "limiter" is one global scale, not a real peak limiter. (checked during research, 2026-09-29)
5. **Model churn.**
   - `gemini-3-pro-preview` and `imagen-4.0-generate-001` were retired within 6 months (#1266). Imagen 4 shut down 2026-08-17.
   - `gemini-2.5-flash-preview-tts` is now Legacy. Its GA successors are `gemini-3.8-flash-tts` and `-lite-tts`, released 2026-09-22.
   - The successors return WAV with a RIFF header, so `pcmToWav` would double-wrap it. They also read input as a verbatim transcript, so `NARRATION_STYLE` may be spoken aloud.
   - Keep model ids in one config.
   - (https://ai.google.dev/gemini-api/docs/deprecations, /pricing, /speech-generation, read 2026-09-29)
6. **Image models garble text.** That is why the image script rejects text and why HTML artboards exist (1fa1bfa7 message; 66ca0790).
   - The text check fails open (generate-blog-image.ts:217, :243).
   - Any story card that carries words should use the artboard renderer.
7. **Gemini 3 image models "generate up to two interim images".**
   - The script takes the first `inlineData` part and ignores `thought` (generate-blog-image.ts:87-108).
   - Not verified whether a draft could be returned instead of the final image.
   - Pick the last non-thought image part. (https://ai.google.dev/gemini-api/docs/image-generation)
8. **Env drift.**
   - dotenv loads `.env`, not `.env.local`.
   - The image script reads only `GEMINI_API_KEY`, despite the fallbacks .env.example promises.
   - `GOOGLE_PRIVATE_KEY` is a service-account key, not a Gemini key, so keep it out of the skill's env contract.
   - Cloudinary config is read at import time with no pre-flight check, so paid Gemini calls run before a missing credential is found.
   - (generate-blog-image.ts:1,147-153; .env.example:46-51; src/lib/cloudinary.ts:4-9)
9. **An unvalidated slug** reaches `path.join` and `public_id`, so path traversal is possible. This was flagged in the PR #959 review and never fixed (generate-blog-image.ts:18,122). #6 takes a notes path and photo paths, so validate them.
10. **`process.exit` inside library code** kills callers (generate-single-blog-audio.ts:160-190; generate-blog-media.ts). Port as throwing functions. #6 calls #2 as a subprocess, which also contains any stray exit ([issue-8.md](issue-8.md)).
11. **No alt text anywhere.**
    - The pipeline generates none.
    - Only 1 of 3 generated-header posts has hand-written alt, and the UI falls back to the title (src/containers/blog-details/index.tsx:19).
    - The marked and React Email image renderers emit `alt=""` for `![](x)`. (checked during research, 2026-09-29)
12. **Copy-gate false negatives** (check-copy.mjs):
    - The prohibition cue `not|never|...` exempts the rest of the sentence (:50), so "Do not wait — sign up today." passes.
    - `--numerals` reads only spoken lines, voiceover lines and quoted lines in `.md` files (:95-115, :185). It returns `[]` for social or email copy.
    - The "curly" quote class is plain ASCII (:106).
    - Only the exact phrase "support us" is caught (:24). These all pass:
      - "Support Our Mission" (src/containers/donate-form/layout-01/index.tsx:30)
      - "Support veterans transitioning into tech" (src/pages/donate.tsx:36)
      - the blog template closer "### Support Vets Who Code … consider supporting" (docs/blog-template.md:21-23)
    - (checked during research, 2026-09-29; files confirmed)
13. **Unsourced dollar-impact tiers are live on VWC's own donate page:** "$50 … $100 … $500 covers AI compute for a month for one veteran … $1000 Supports a veteran for an entire year" (src/components/forms/donate-form.tsx:122-151).
    - The $72K-$85K salary target and the employer list are also unsourced (PR #1418 follow-ups).
    - Do not seed a VWC config, fixtures or example output from the live site. They work only as negative test cases.
14. **Quoted testimonials break the copy law in the speaker's own words** ("frontend developer", "signed up"; src/data/homepages/index.json:149,160). A gate that rewrites quotes falsifies them, so flag them instead. (checked during research, 2026-09-29; the handling is inference)
15. **WebFetch summaries got caniemail wrong.** A summarizer listed `<audio>` as supported in Gmail and Yahoo, but the raw JSON says no. Cite `data.json`, not LLM summaries. (checked during research, 2026-09-29; re-checked against the local caniemail.json 2026-09-29)
16. **`@react-email/components` and every per-component package are deprecated on npm.**
    - React Email v6 moved everything into `react-email`, and v6.5.0 had an ~80 MB bundling bug (resend/react-email#3556, fixed).
    - Don't depend on it, and don't depend on VWC's node_modules, which #1377 may delete. That includes the transitive `html-to-text` 9.0.5. Declare what #6 uses directly. (checked during research, 2026-09-29; npm ls)
17. **marked passes raw HTML through unsanitized** (https://marked.js.org/). Staff-pasted notes may contain HTML or tracking snippets, so escape the `html` token.
18. **Mailchimp double footer.** A missing or malformed `*|UNSUB|*`, for example inside an unclosed comment, makes Mailchimp append its own footer (https://mailchimp.com/help/about-campaign-footers/). In any other ESP the literal tokens show up verbatim.
19. **Free-tier Gemini traffic is marked "Used to improve our products: Yes".**
    - Donor notes can contain donor or beneficiary names (https://ai.google.dev/gemini-api/docs/pricing, read 2026-09-29).
    - The Interactions API also stores requests by default, so stay on `generateContent` or set `store=false` (https://ai.google.dev/gemini-api/docs/interactions).
20. **"Nothing is sent" can't rest on skill frontmatter.**
    - A Claude Code environment can have send and publish tools: Gmail `send_message`, Mailchimp `save_to_mailchimp`/`edit_campaign`, Descript `publish_project`, and Canva (checked during research, 2026-09-29). A subagent that omits `tools` inherits them all (https://code.claude.com/docs/en/sub-agents).
    - The skill `disallowed-tools` field removes tools only "while this skill is active", and "The restriction clears when you send your next message".
    - `disallowed-tools` is also not one of the six fields claude.ai uploads accept: "packaging or upload fails with a hard error" (https://code.claude.com/docs/en/skills, read 2026-09-29).
    - Durable blocking is "deny rules in your permission settings" (same page).
    - #6 has a multi-turn review loop, so per-turn frontmatter doesn't cover it (inference).
21. **Artboard sources are gitignored** (`src/data/blog-graphics/*/`, .gitignore:74-75, from #1436). The high-success-low-adoption graphics can't be re-rendered from a clone. Decide where #6's card sources live. (checked during research, 2026-09-29)
22. **Stale mentor figures:** older mentor figures (4-5 hrs/month, cohorts of 10-15) are out of date on master since #1434 ("2+ hrs / week", up to three troops). Don't seed VWC donor copy from them. (checked during research, 2026-09-29)
23. **Prebuilt sharp cannot decode iPhone HEIC.**
    - sharp 0.35.4 read a macOS system `.heic` as `heif`/`hevc` 6016x6016. Decoding then failed with "heif: Decoder plugin generated an error: Unspecified (7.0)" (node test 2026-09-29 on `/System/Library/Desktop Pictures/Mac Blue.heic`).
    - sharp's docs say HEVC "requires the use of a globally-installed libvips compiled with support for libheif, libde265 and x265" (app/node_modules/sharp/dist/output.cjs:1235-1236).
    - Apple recommends HEIF capture, and iCloud Photos "preserve[s] … original format" (https://support.apple.com/en-us/116944). Staff photos may therefore arrive as `.heic` (inference).
    - ffmpeg 9.0.2 (Homebrew) decoded the same file. A one-pass `-vf scale` failed with "Simple and complex filtering cannot be used together" on the tiled HEIC. Decoding to JPEG first and then scaling worked. (test 2026-09-29)
24. **sharp strips metadata by default, including orientation.**
    - "By default all metadata will be removed, which includes EXIF-based orientation" (app/node_modules/sharp/dist/output.cjs:45). Stripping GPS is what Bond asks for (Lesson 26).
    - Without `autoOrient: true` (constructor.cjs:167), portrait phone photos may come out sideways (inference from the docs; orientation not tested).
    - A test JPEG with GPS EXIF came out with no EXIF after `resize().jpeg()` (node test 2026-09-29).
25. **Plain text from HTML must skip the preheader.**
    - React Email marks its preheader `data-skip-in-text=true` and skips it and every `img` (render/dist/node/index.js:90-115).
    - A converter without that rule would put the 150-character `\xA0`/zero-width padding into the text part (inference from preview/dist/index.js).
    - `cleanMarkdownToText` can't stand in, because it drops URLs and every `*`. It would also turn `*|UNSUB|*` into `|UNSUB|` if the footer ever reached narration (generate-single-blog-audio.ts:327-337).
26. **Consent needs a record, not a promise** (Bond 2024):
    - "If it isn't informed, it isn't consent!" The evidence ("a signed form, video recording of verbal consent, or using a consent app") "must demonstrate that the information above has been shared" (p.21).
    - Under GDPR, "an expiry on consent must be provided … in perpetuity consent is not supported", and contributors can withdraw "at any time" (p.21).
    - "No GPS": images must not contain "retrievable information on the exact location of contributors" (p.15).
    - For children, some NGOs use "the triangle of risk": never more than one of "recognisable face, real full name, or exact location" (p.17). Bond suggests retiring or re-consenting children's images "after three years … or when they turn 18" (p.22).
    - In the US, New York Civil Rights Law §50 makes it a misdemeanor to use "the name, portrait, picture, likeness, or voice of any living person" "for advertising purposes, or for the purposes of trade" without written consent (https://www.nysenate.gov/legislation/laws/CVR/50). Whether a donor update is "advertising" was not researched as legal advice.
    - HIPAA-covered nonprofits have separate fundraising rules (45 CFR 164.514(f), https://www.law.cornell.edu/cfr/text/45/164.514). These include "a clear and conspicuous opportunity to elect not to receive any further fundraising communications" in each one.
27. **AI images don't solve consent.**
    - "AI imagery is also not a way of solving problems of representation (or to avoid consent issues)."
    - When used, "include, 'this image is AI-generated' within the caption" (Bond 2024, pp.37-38).
    - This replaces an earlier "Illustration" label for generated images in decision 2.
28. **The #9 fixtures will contain no binaries:** "No images, logos or other binary files in this version" (gh issue view 9). Photo tests must generate their images at test time.
29. **The HeyGen credential loader walks up 5 directories for a `.env`** (~/.claude/skills/media-use/audio/scripts/lib/heygen.mjs:20-47, read 2026-09-29). #6 never loads it as long as it stays off HyperFrames and media-use. That is the one concrete benefit of having no video leg.

---

## Dependencies

**Issues**
- **#2 (stated: "builds on the blog-media skill").** #6 needs:
  - the ported TTS path, run as `--script <file>` so it narrates text that isn't a post ([issue-2.md](issue-2.md))
  - `--no-upload`/`--out` generate-only ([issue-2.md](issue-2.md))
  - `--dry --json` cost reporting ([issue-8.md](issue-8.md))
  - a separate `publish`, **extended to accept arbitrary files**. #6's photos and cards aren't #2 outputs, and neither sibling dossier covers this (see decision 13)
  - the pluggable storage adapter behind `publish`
  - a per-brand narration style, because the current directive says "blog post" (generate-single-blog-audio.ts:240-242)
- **#3 (inferred, not stated in #6).**
  - The shared brand pack supplies colors, fonts, copy rules, CTA verbs and the org name. The generalized copy gate is also a #3 deliverable. (#3 body; checked during research, 2026-09-29)
  - #3's planned schema adds video ground, story shape, casing, voice, logo variants and CTA verbs. Its validator checks "WCAG 4.5:1 for every declared text/ground pair" ([issue-3.md](issue-3.md)).
  - **It has no email-safe font stack and no declared CTA button pair.** #6 needs both (decision 16).
- **#9.**
  - Supplies `fixtures/nonprofit/donor-notes.md`: 3-5 messy stories plus links, with one thin story that has no link and no photo, which "#6 must not fill in".
  - Supplies `brand.md`: 3-5 hex colors, "one heading font and one body font" from open-licensed sources such as Google Fonts, and the copy-rule example "calls to action are one literal verb: Donate, Volunteer".
  - Ships no binaries (gh issue view 9).
  - #9 is not linked as a sub-issue of #1 (checked during research, 2026-09-29).
- **#8 (overlap, inference).** #8's newsletter blurb and alt-text outputs share rules with #6, so reuse one alt-text check and one CTA check. #8 uses the same #2 CLI contract ([issue-8.md](issue-8.md)).
- **#1 epic principles:** bring your own brand and keys; no licensed assets; nothing may depend on private services; facts come from the source; CI tests or evals plus a README with a before-and-after example (gh issue view 1).
- **Repo bootstrap.** hashflag-skills is private and empty (`isEmpty=true`), with no license and no branch. No PR can land until `main` exists (gh api repos/Vets-Who-Code/hashflag-skills, 2026-09-29).

**Tools and system**
- Node plus tsx, if the #2 port stays TS.
  - vets-who-code-app pins Node 20 (.nvmrc).
  - The #1 and #2 dossiers recommend pinning Node 22+ repo-wide so one runtime covers HyperFrames ([issue-1.md](issue-1.md), marked there as inference; [issue-2.md](issue-2.md)). **So #6 gets no runtime advantage from skipping video.**
  - Every #6 dependency runs on 22: sharp `>=20.9.0`, marked `>= 20`, html-to-text `>=20.19.0` (npm view).
- No HyperFrames, chrome-headless-shell or HeyGen loader, unless someone adds video later (Lesson 29).
- Playwright chromium, if story cards are HTML-rendered (generate-blog-graphic.ts:109).
- **sharp** ^0.35 for photos (decision 14):
  - Apache-2.0 JS. The prebuilt libvips is LGPL-3.0-or-later and arrives as a separate npm package at install time (package.json files above).
  - It can't read HEVC HEIC (Lesson 23).
- **ffmpeg** is optional:
  - It converts HEIC.
  - It makes a local MP3. VWC relies on Cloudinary `f_mp3` instead (src/lib/blog.ts:59).
  - The local Homebrew build is configured `--enable-gpl --enable-version3` (`ffmpeg -version`, 2026-09-29), so its license depends on who built it. It is never bundled.
- **html-to-text** ^10 (MIT) for the plain-text part (decision 15).
- `marked` (MIT). VWC uses the v4 API (src/components/markdown-renderer/index.tsx:17). v15+ changed renderer signatures, and the latest is 18.0.14 (npm view).

**Keys and accounts**
- `GEMINI_API_KEY`:
  - The TTS model is free on the free tier, with the data-use caveat.
  - `gemini-3-pro-image` and `gemini-3.1-pro-preview` have **no free tier** (pricing page, read 2026-09-29).
- Storage credentials (Cloudinary or S3-compatible), only for `publish`.
  - For `esp: mailchimp` they are needed only for the audio: Mailchimp's ZIP import uploads the images to its content studio and rewrites the paths (import page).
  - The ZIP accepts only JPG/JPEG/PNG/GIF (same page), so the WAV or MP3 must be hosted elsewhere.
  - Whether Mailchimp's content studio hosts audio files: Not researched.
- **ESP (human side).**
  - Custom HTML in Mailchimp needs Standard or higher (paste-in-html and import pages).
  - The Standard price was not researched: Mailchimp's pricing-plans page could not be fetched on 2026-09-29.
- **Where VWC's donors live: unknown.**
  - Evidence: the SITREP signup writes to a Mailchimp audience on the us4 datacenter (newsletter.ts:3-5, :62-75), and donations go through Donorbox (donate-form.tsx:73,85).
  - Donorbox offers a Mailchimp integration at "$8 a month". It exports "First Name, Last Name and Email of the donor" to a chosen list "every time a donation is received", subject to the campaign's consent setting (https://donorbox.org/nonprofit-blog/mailchimp-integration, read 2026-09-29).
  - Whether VWC has it enabled, and which Mailchimp plan VWC is on, could not be determined.
  - The Mailchimp connector's read-only `get_capabilities` (called 2026-09-29) returned only session metadata, with no plan or audience fields. Its own description puts "contacts, segments, or audience management" outside the integration. No other Mailchimp tool was called.
  - **Owner question** (decision 18).

**License**
- The hashflag-skills license is undecided.
- Ported #2 code includes lines by Brad Hankee and Stephen Clark, written while the vets-who-code-app README said MIT. That repo has been AGPL-3.0 since 47165207 (#1437). (checked during research, 2026-09-29)
- The React Email reference code, including the plain-text selector config, is MIT, so keep its notice if copied.
- sharp is Apache-2.0 and ships a LGPL-3.0-or-later libvips binary as a separate, dynamically loaded npm package that is never committed. That appears compatible with an MIT or Apache repo (inference, not legal advice).

---

## Cost

All Gemini prices are from https://ai.google.dev/gemini-api/docs/pricing (page last updated 2026-09-24, read 2026-09-29). The example is one update with 4 stories and a 400-500-word email.

**Audio** (`gemini-2.5-flash-preview-tts`, paid tier $10 per 1M audio tokens out, 25 tokens/s)
- 400 words ÷ 187 wpm = 2.14 min = 128 s → 3,208 tokens → **$0.032**.
- 500 words = 160 s → 4,011 tokens → **$0.040**.
- Text in ($0.50 per 1M) is under $0.001.
- The free tier is $0, but Google may use the data to improve its products.
- `gemini-3.8-flash-tts` costs $9 per 1M until 2026-12-31 and $18 from 2027-01-01, so 500 words = $0.036, then $0.072.
- Caveat: 187 wpm is the code comment's figure (generate-single-blog-audio.ts:236). The one real script measured about 203 wpm (checked during research, 2026-09-29).

**Email drafting and story extraction** (`gemini-3.1-pro-preview`, $2 in / $12 out per 1M, up to 200K tokens)
- Assuming 3,000 tokens in and 1,500 out: $0.006 + $0.018 = **$0.024 per call**, before thinking tokens.
- The token counts are inference. Thinking tokens are unbounded unless `maxOutputTokens` is set, and VWC scripts don't set it.

**Images, per story, one of three paths**
- **Provided photo:** $0 API cost. It is resized locally with sharp, and it is never sent to a model (decision 17).
- **HTML card** (Playwright): $0 to render. An optional Gemini draft adds about one drafting call.
- **Generative, through #2's path:**
  - At least **$0.1451** with one attempt and **$0.4211** with three, before thinking tokens (checked during research, 2026-09-29).
  - For 4 stories that is **$0.58-$1.68**.
  - `gemini-3-pro-image` alone is $0.134 per 1K/2K image.
  - `gemini-3.1-flash-image` is $0.067 per 1K. The full pipeline cost with the flash model was not computed.

**Totals for 4 stories**
- Photos or cards path: about **$0.06-$0.10** plus thinking tokens.
- All-generative images: about **$0.64-$1.78** plus thinking tokens.

**Bytes (sets the Mailchimp ZIP budget of 1 MB)**
- Cards at 1200 px wide: 40-54 KB as JPEG q80 or 108-151 KB as PNG (measured 2026-09-29, What exists today). 5 JPEG cards come to about 0.27 MB.
- Photos at 1200 px wide: Not measured on real photos.

**Cloudinary** (Free plan: 25 credits a month; 1 credit = 1,000 transformations, 1 GB storage or 1 GB bandwidth; audio is 0.1 transformations per second)
- 160 s of audio = 16 transformations (0.016 credits).
- The WAV is 48,000 B/s × 160 = 7.7 MB of storage.
- Negligible.
- (https://cloudinary.com/pricing, read 2026-09-29)

**Fixed monthly, not per run**
- The Donorbox–Mailchimp integration is $8/month, and only if an org uses it to sync donors (Donorbox blog, above).

**Not researched:**
- the Mailchimp Standard price (the pricing page could not be fetched)
- real thinking-token usage per call (use `usageMetadata` from real runs to calibrate `--dry`)
- S3 costs

---

## Acceptance criteria, mapped

**1. Input is notes plus optional links and photos. Outputs are an email as Markdown and HTML, a short audio version, and an image per story.**
- *Exists:*
  - TTS chunk, normalize and WAV code (generate-single-blog-audio.ts), reached through #2's CLI
  - image and card renderers (generate-blog-image.ts, generate-blog-graphic.ts)
  - marked in the app
  - MIT email-HTML and plain-text techniques in @react-email/* (render/dist/node/index.js:90-115)
  - the `f_mp3` link pattern (blog.ts:59)
  - sharp is proven to install on the owner's stack (transitive via next; npm ls)
- *Missing:*
  - a notes parser that splits stories and attaches links and photos to them
  - the email writer
  - a Markdown-to-email-HTML renderer (table shell, inline styles, preheader, footer)
  - the plain-text part, via html-to-text (decision 15)
  - photo resize and compress, via sharp (decision 14), plus a HEIC path
  - a "Listen" link block
  - the Mailchimp ZIP packer (flat root, under 1 MB)
  - a review-folder layout and manifest
- *Risk:*
  - "Image per story" collides with the #9 thin-story trap: a generated image can invent people and places.
  - HEIC photos fail in sharp (Lesson 23).
  - The ZIP limit is 1 MB total (Cost, Bytes).
  - HTML paste and ZIP both need Mailchimp Standard, and VWC's plan is unknown.
  - Audio always needs hosting outside the ZIP.

**2. Only facts provided in the input appear.**
- *Exists:*
  - the `outcomes.ts` ledger shape and the stray-number scanner (`__tests__/data/outcomes.test.ts:83-152`)
  - check-copy `numerals()`, limited to spoken or quoted lines
  - the HyperFrames preset rule "never invent figures … every numeral traces to the script" (hyperframes-creative/frame-presets/blue-professional/FRAME.md:286-300), as prior art
- *Missing:*
  - a deterministic check that every number, date, proper noun and URL in the email, the plain text, the narration text, the alt text and the image prompts appears in the input
  - number normalization ("twenty-eight percent" = "28%")
  - a rule that the audio narrates only the email body, never the footer
- *Risk:*
  - LLM embellishment, such as adjectives or implied outcomes.
  - Visual invention by image models.
  - The thin story gets padded.
  - Numbers spelled out in the narration slip past a digit-only check.

**3. Every image has alt text.**
- *Exists:* nothing generates alt text today.
- *Missing:*
  - Alt text for provided photos, taken from a human-written caption in `photos.yaml` (decision 17).
  - Alt text for cards, taken from the card's own ledger text. It is not written by describing a generated image, because the description could include invented content (inference).
  - A check after rendering that every `<img>` has a non-empty `alt`, unless it is marked decorative.
  - Descriptive alt on any linked play-button image ("Listen to the audio version of this update (3 min)").
  - The W3C decision tree covers these cases (https://www.w3.org/WAI/tutorials/images/decision-tree/).
- *Risk:*
  - `![](x)` silently yields `alt=""`.
  - Classic Outlook shows alt text because it blocks images by default, so alt text carries the message.
  - Captioning a beneficiary photo with a vision model would send the photo to Google (Lesson 19).

**4. Ends with a literal "Donate" CTA whose link is configurable.**
- *Exists:*
  - check-copy's `support us → Donate` (:24)
  - the bulletproof-button reference (@react-email/button)
  - VWC donate URLs (donate-form.tsx:73,85; donate.json:20-67)
- *Missing:*
  - a strict structural check: the last CTA's link text is exactly `Donate` and its `href` equals the configured URL, in both the HTML and the plain text
  - a required `donate_url` config with no default
  - rejection of softened variants
  - a button color pair that passes 4.5:1 (decision 16)
- *Risk:*
  - "Support Our Mission" and "consider supporting" pass today's gate, and VWC's own donate page uses softened wording.
  - An image button fails when images are blocked.
  - A brand whose accent is gold fails contrast with white text (1.80:1, computed).

**5. Nothing is sent; the skill only writes files.**
- *Exists:* VWC has no send path (newsletter.ts subscribes only; email.ts has no callers).
- *Missing:*
  - structural enforcement: no ESP or Gmail client code or credentials in the skill (a grep test)
  - README guidance to add permission **deny rules** for the send and publish MCP tools
  - a test that a default run makes no storage or ESP network calls
  - a clear rule for whether uploading assets counts as "sending"
- *Risk:*
  - `disallowed-tools` lasts only for the invoking turn and breaks claude.ai upload (Lesson 20), so it can't be the guarantee.
  - Uploading donor photos to a public CDN before review is effectively publishing (inference).
  - Creating a Mailchimp or Gmail draft is ambiguous (decision 7).

---

## Open decisions for the owner

1. **Is "Donate" hard-coded, or a brand-pack CTA verb?**
   - Default: hard-code `Donate` as the issue says, and make only the link configurable.
   - Why: the criterion says "literal 'Donate'", and #9's brand example lists Donate as the nonprofit verb. Letting the verb vary reopens the softening problem.
2. **Which image goes with each story?**
   - Default:
     - Use the provided photo if it has a consent record (decision 17).
     - Otherwise, render a deterministic HTML card through Playwright. Its text comes only from ledger fields (story headline, org name), in brand tokens.
     - Generative images are opt-in and captioned "This image is AI-generated".
   - Why:
     - This satisfies "image per story" without inventing visual facts (the #9 trap).
     - It is cheap: $0, against $0.15-0.42 per generated image.
     - Image models garble text (1fa1bfa7).
     - Bond asks for that exact caption and says AI is not a consent workaround (pp.37-38).
3. **What does the audio say?**
   - Default: narrate the final email body verbatim, with no footer, cleaned and with numbers spelled out. Cap it at about 500 words so one TTS request is enough. Label it "Audio version of this email".
   - Why: one fact source feeds both outputs. Under WCAG 1.2.1 it counts as a "media alternative for text", so the email body is its transcript (https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html).
4. **Which HTML renderer?**
   - Default:
     - `marked` with a custom renderer that emits inline styles and escapes raw HTML.
     - One static table shell, adapted from goodemailcode and the React Email defaults, with MIT notices kept.
     - The preheader is marked `data-skip-in-text="true"`.
   - Why:
     - It is the smallest dependency set.
     - React Email is deprecated and changing, and #1377 may remove it from VWC.
     - MJML stays the fallback if multi-column layouts are ever needed.
5. **Which ESP footer tokens?**
   - Default:
     - `esp: generic` emits clearly marked placeholders (`{{UNSUBSCRIBE_URL}}`, `{{MAILING_ADDRESS}}`) plus a README note for each ESP.
     - A `mailchimp` preset emits `*|UNSUB|*`, `*|HTML:LIST_ADDRESS_HTML|*` and `*|MC_PREVIEW_TEXT|*`.
   - Why:
     - Wrong tokens mean a double footer or literal `*|UNSUB|*` text.
     - VWC's dogfood run would use the Mailchimp preset (newsletter.ts:3), pending decision 18.
6. **Mailing address.**
   - Default: a required config field unless `esp: mailchimp`, which uses the list-address merge tag. It is never inferred.
   - Why:
     - CAN-SPAM and Mailchimp both require a postal address, and inventing one breaks "only provided facts" (https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business).
     - Whether CAN-SPAM covers a nonprofit donor update is a legal question that was not researched as legal advice.
7. **Where does "sending" start?**
   - Default:
     - The skill writes only local files: `email.md`, `email.html`, `email.txt`, `mailchimp.zip` when `esp: mailchimp`, `audio.wav`, `images/*` and `manifest.json`.
     - It never calls ESP APIs, including draft creation, and never calls Gmail.
     - A separate, explicit `publish` step uploads through #2's CLI after review and rewrites URLs in `email.html`, `email.md` and `email.txt`. For the Mailchimp ZIP path, `publish` uploads only the audio, because Mailchimp hosts the ZIP's images.
   - Why:
     - This matches "a human reviews and sends".
     - It keeps donor photos private until approved, and it matches #8's review-before-upload design ([issue-8.md](issue-8.md)).
8. **Asset URLs.**
   - Default: unique, versioned URLs per run, with a content hash in the public id. Never overwrite a public id that a sent email may reference.
   - Why:
     - Sent emails can't be changed, so overwriting an id rewrites past sends (inference).
     - #1266's stale-CDN bug came from versionless URLs, and Cloudinary invalidation takes seconds to minutes (Lesson 3).
     - Gmail's proxy caching is contested (Lesson 3), and this default is safe either way.
9. **Free-tier key with private notes.**
   - Default: warn before any call when input contains names, and document that free-tier prompts may be used by Google. Photos are never sent to a model.
   - Not researched: whether the tier can be detected from the key.
   - Why: the donor notes may hold donor or beneficiary personal data (pricing page).
10. **TTS model.**
    - Default: inherit whatever #2 ships. Do not fork.
    - Why: moving to `gemini-3.8-flash-tts` changes WAV and directive handling (Lesson 5). #2's dossier already proposes 3.8 with `speech_metadata.style` ([issue-2.md](issue-2.md)). That is #2's decision and should be made once.
11. **Verbatim quotes in notes.**
    - Default: pass quoted speech through unchanged, and have the copy gate flag banned terms inside quotes rather than rewrite them.
    - Why: rewriting would falsify a person's words (Lesson 14).
12. **Dark mode.**
    - Default: out of scope. Use a palette that survives inversion, a transparent PNG logo with an outline, no text baked into photos, and no `color-scheme` meta.
    - Why: Gmail ignores `prefers-color-scheme`, and a meta tag without dark styles can cause partial inversion in Apple Mail (https://www.litmus.com/blog/the-ultimate-guide-to-dark-mode-for-email-marketers).
13. **Shape of #2's interface, and how #6 calls it. Agree this with #2 before #2 merges.**
    - Default: CLI plus JSON manifest only, with no library export in v1. #6 runs #2 as a subprocess, the same way #8 does. On top of #8's contract (`--dry --json`, `--out`, `publish`, JSON result; [issue-8.md](issue-8.md)), #6 needs:
      - (a) `audio --script <file>` narrating a given text file with the brand pack's style, with no post or slug required (#2's decision 5 already plans `--script`; [issue-2.md](issue-2.md))
      - (b) `publish` accepting **arbitrary local files** (photos, cards, audio) and returning `{path, url, public_id, version}` for each
      - (c) failures reported in JSON with a non-zero exit, never a mid-run `process.exit`
    - Why:
      - #2's dossier already names the CLI as the stable interface ([issue-2.md](issue-2.md)).
      - A library export would be a second API for one caller.
      - A subprocess also contains stray exits (Lesson 10).
      - If a shared in-process library is ever needed, plugin skills can share files through `${CLAUDE_PLUGIN_ROOT}` (https://code.claude.com/docs/en/skills).
    - Risk: if #2 merges without (b), #6 has to carry its own storage code, which duplicates the adapter.
    - Separate-skill packaging stays as before: `skills/donor-update/` under the one plugin ([issue-1.md](issue-1.md)).
14. **Photo resize library.**
    - Default: `sharp` ^0.35, used as `sharp(file, { autoOrient: true }).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true })`. Leave metadata stripping on (the default).
    - HEIC: stop with "export as JPEG (Settings → Camera → Formats → Most Compatible) or install ffmpeg". When ffmpeg is on PATH, decode HEIC to JPEG with it first, in two passes (Lesson 23).
    - If the ZIP is over 1 MB, fail with a per-file size table. Don't silently degrade quality.
    - Why:
      - It installs from npm with no system packages, so it fits CI.
      - It strips GPS by default, as Bond asks (p.15; Lesson 24).
      - The owner's stack already installs it (npm ls).
      - Its license is Apache-2.0, with the LGPL libvips as a separate binary package.
    - Alternatives:
      - ffmpeg is a system dependency whose license depends on the build, and its metadata stripping was not verified.
      - `sips` is macOS-only.
      - jimp (MIT, pure JS) was not researched.
15. **Plain-text generator.**
    - Default: `html-to-text` ^10 (MIT), declared directly, run over the final `email.html` with React Email's selector config: skip `img`, skip `[data-skip-in-text=true]`, links as "text url", `wordwrap: false` (render/dist/node/index.js:90-115). Keep the MIT notice.
    - Why:
      - The text comes from the exact HTML that ships, so the footer tokens and the Donate href match by construction.
      - The fact and CTA checks can then run on both parts.
      - `cleanMarkdownToText` drops URLs (Lesson 25).
      - Don't rely on VWC's transitive 9.0.5, which #1377 may delete.
    - For `esp: mailchimp`, Mailchimp auto-generates a text part anyway (about-html-email page), so `email.txt` serves review and other ESPs.
    - Alternative: walk marked's lexer tokens from `email.md`. It needs no dependency but is new code (about 40 lines, inference).
16. **Brand-pack email fields (shared schema with #2 and #3).**
    - Default:
      - Add `email.fonts.heading` and `email.fonts.body` as web-safe stacks.
      - Add `email.cta.bg` and `email.cta.text`, validated by #3's 4.5:1 text/ground check ([issue-3.md](issue-3.md)).
      - When the fields are absent, derive them:
        - the stack is `Arial, Helvetica, sans-serif`, or `Georgia, 'Times New Roman', serif` when the pack marks the heading serif
        - the button uses the first pack color that reaches 4.5:1 with white or near-black text
        - the build fails if no color qualifies
      - Emit no `@font-face` in v1.
    - Why:
      - #9's fonts are open-licensed web fonts (gh issue view 9), which Gmail, Yahoo and Outlook.com never load.
      - Outlook 2007-2016 turns any `@font-face` element into Times New Roman (caniemail note 5).
      - A gold accent with white text fails at 1.80:1, while VWC red passes at 5.75:1 (computed).
17. **Consent for photos and named people.**
    - Default:
      - Photos are used only when `photos.yaml` gives `file`, `story`, `caption` and `consent: yes`. The caption is the alt-text source.
      - Any other photo is **held**: left out of the email and ZIP, with its story falling back to a card, and listed in `REVIEW.md`.
      - Every named private individual in the ledger is listed in `REVIEW.md` as "consent to name?". Stories that mention a minor get a "triangle of risk" warning.
      - The skill never judges consent itself, never sends photos to a model, and never anonymizes on its own, because that would change the facts.
    - Why:
      - Bond requires evidence of informed consent (p.21) and treats children's names and locations as high risk (p.17).
      - NY CVR §50 requires written consent for advertising or trade use (Lesson 26).
      - One YAML line per photo is the smallest record a human can assert.
    - Not researched: whether any US state law applies to nonprofit donor emails specifically (legal question).
18. **VWC's Mailchimp plan and donor audience (owner answer needed before the Mailchimp preset).**
    - Default: ask before building the preset. Meanwhile, emit all three hand-offs:
      - `email.html` (paste; Standard+)
      - `mailchimp.zip` (Standard+; Mailchimp hosts the images)
      - `email.md` laid out as one block per story (heading, image, paragraph, link), so it can be rebuilt in any builder on any plan
    - Why:
      - The plan couldn't be read from the connector or the pricing page (Dependencies).
      - Donors may sit in the SITREP audience, in a Donorbox-synced list, or only in Donorbox (Dependencies).
      - The ZIP path removes the storage-account requirement for images.
    - Not researched: whether the new Mailchimp builder has an HTML content block for lower plans.
19. **Audio link under the ZIP path.**
    - Default: the "Listen" link is `{{AUDIO_URL}}` until `publish` runs. The manifest marks the email `ready: false` while any placeholder remains, and the README says so.
    - Why: the ZIP accepts images only (import page), and a dead link in a sent donor email is worse than no link.

---

## Suggested build plan

0. **Preconditions.**
   - `main` exists in hashflag-skills.
   - #2 is merged with the decision 13 contract: `audio --script`, `--out`, `--dry --json`, and a `publish` that takes arbitrary files.
   - #9's `donor-notes.md` exists, or an interim fixture with the thin-story trap is written.
   - The owner has answered decision 18.
   - *Verify:*
     - `gh api repos/Vets-Who-Code/hashflag-skills` shows `isEmpty=false`.
     - With TTS mocked, `blog-media audio --script fixture.txt --out <tmp> --json` writes a WAV and a JSON result.
     - With a mocked adapter, `blog-media publish --json a.jpg b.wav` returns one `url` per file.
1. **Input contract.**
   - Accept:
     - `notes.md` (free-form)
     - an optional `photos/` folder with `photos.yaml` (`file`, `story`, `caption`, `consent`)
     - `config` with `org_name`, `donate_url` (required), `mailing_address` or `esp`, and a brand pack path
   - Validate paths (no `..`), and fail before any paid call when the config is incomplete.
   - *Verify:* unit tests show zero HTTP calls (mocked fetch not called) for all three cases:
     - a missing `donate_url` is rejected
     - a `../` photo path is rejected
     - a photo with no `photos.yaml` entry is held and listed in the manifest
2. **Story extraction into a facts ledger.**
   - One `gemini-3.1-pro-preview` call returns JSON stories. Every field carries the verbatim input span it came from.
   - A deterministic check confirms each span exists in the input.
   - *Verify:* on the #9 fixture, the thin story's ledger entry has no field without a span. A mocked response with an invented span fails.
3. **Email Markdown from the ledger only.**
   - Draft it, then run a deterministic fact check: every number (after normalization), date, capitalized name and URL in the draft must appear in the input.
   - *Verify:* a test with an injected invented number or name fails, and the fixture draft passes.
4. **HTML and plain-text render.**
   - Build:
     - marked renderer: inline styles, escaped raw HTML, explicit image `width`
     - table shell and preheader (`data-skip-in-text`)
     - brand `email.fonts`/`email.cta` with the contrast check (decision 16)
     - ESP footer preset
     - bulletproof Donate button as the last CTA
     - `email.txt` via html-to-text (decision 15)
   - *Verify:* lint tests assert:
     - `lang`/`dir` present
     - every table `role=presentation`
     - exactly one `h1`
     - every `img` has non-empty `alt`
     - HTML under 102 KB (target under 80 KB)
     - no `audio`/`video`/`script`/`form`/`iframe`/`@font-face`
     - the last link text is exactly `Donate` and its `href` equals config, in both the HTML and `email.txt`
     - `email.txt` contains no run of `\xA0` or zero-width characters
     - the CTA pair is 4.5:1 or better, and a gold-on-white pack fails the build
     - `*|UNSUB|*` is present when `esp=mailchimp`
5. **Image per story.**
   - A consented photo goes through sharp (decision 14). Otherwise, render an HTML card through Playwright at 1200 px wide from ledger text only.
   - Alt text comes from the `photos.yaml` caption or the card text.
   - For `esp: mailchimp`, pack `mailchimp.zip` with the HTML and flat-root images.
   - *Verify:* using images generated in the test (#9 has none, Lesson 28):
     - a JPEG written with GPS EXIF comes out with no EXIF
     - a `.heic` input without ffmpeg fails with the export message
     - the file count equals the story count, and each image has alt text
     - the thin story's card text is a subset of its ledger fields
     - a 5-story ZIP is under 1 MB and has no subfolders
6. **Audio.**
   - Email body (no footer) → `cleanMarkdownToText` → spell out numbers → write `narration.txt` → `blog-media audio --script narration.txt --out <dir> --json`, with a donor-appropriate style, not "blog post".
   - Add a guard that compares duration against word count to catch early stops.
   - *Verify:*
     - an end-to-end test with #2's CLI stubbed
     - the word count is at or below the cap
     - `narration.txt` contains no `UNSUB`
     - the guard trips on a stubbed short result
7. **Copy gate.**
   - Load the brand pack rules (#3), and add the strict CTA rule: reject "support", "give" and "contribute" as the final CTA.
   - Flag banned terms inside quotes rather than rewriting them.
   - *Verify:* "Support Our Mission" as the closer fails, and a quoted testimonial with "signed up" is flagged, not changed.
8. **Review folder and no-send enforcement.**
   - Write `out/<date>/` containing:
     - `email.md`, `email.html`, `email.txt`, `mailchimp.zip` (Mailchimp only)
     - `narration.txt`, `audio.wav`, `images/*`
     - `manifest.json` (facts ledger, costs, pending placeholders, held photos)
     - `REVIEW.md` (consent checklist, flags)
   - Enforce structurally: no ESP or Gmail client and no credentials in the skill.
   - The README gives permission deny rules for the send and publish MCP tools.
   - `disallowed-tools` is used only if the owner accepts losing claude.ai upload (Lesson 20).
   - *Verify:*
     - grep finds no ESP or Gmail calls in the skill
     - a default-run test makes zero storage or ESP requests
     - the manifest says `ready: false` while `{{AUDIO_URL}}` remains
9. **`publish` step (separate command).**
   - Call `blog-media publish` with versioned ids: every asset for generic ESPs, audio only for the Mailchimp ZIP path.
   - Rewrite URLs in `email.html`, `email.md` and `email.txt`.
   - *Verify:* with the adapter mocked, every placeholder is replaced, a re-run produces new ids, and held photos are never uploaded.
10. **`--dry`.**
    - Print the ledger prompt, the draft prompt, the narration text and a cost range (Lesson 19 wording plus the Cost section math). Make no paid calls.
    - *Verify:* the dry-run test asserts fetch and the #2 subprocess are never called, and the output includes a min-max USD range.
11. **README and CI.**
    - Add:
      - a before-and-after using the #9 fictional nonprofit
      - a Mailchimp guide covering the Standard-plan requirement, the legacy builder, and ZIP images at the root
      - the builder-rebuild path for lower plans
      - the permission deny-rule snippet
      - CI running the mocked tests without keys
    - *Verify:* CI is green on a fork PR with no secrets.

---

## Sources

**Issues and PRs**
- hashflag-skills #1, #2, #3, #6, #8, #9 (`gh issue view -R Vets-Who-Code/hashflag-skills`, read 2026-09-29)
- hashflag-skills repo metadata (`gh api repos/Vets-Who-Code/hashflag-skills`)
- vets-who-code-app PRs #959, #1266, #1267, #1281, #1418, #1434, #1436, #1437, #1449, #1460
- vets-who-code-app issue #1377 (`gh issue view 1377`, read 2026-09-29)

**Sibling context docs**
- [issue-1.md](issue-1.md)
- [issue-2.md](issue-2.md)
- [issue-3.md](issue-3.md)
- [issue-8.md](issue-8.md)

**Commits (vets-who-code-app)**
- 7b0f4aef, d97b2ce8, 1fa1bfa7, 66ca0790, 5bd9d552, 9a3a138c, dab1b813, 47165207, bedf76aa, 62c92a01
- HEAD b7c19088; origin/master badc2951

**Files (vets-who-code-app)**
- Scripts:
  - scripts/generate-single-blog-audio.ts:3,6,59-121,123-152,154-200,235-242,247-296,298-337
  - scripts/generate-blog-image.ts:1,17,61,83,87-108,140-153,184,217,243
  - scripts/generate-blog-graphic.ts:13-18,32-73,77,100-130
  - scripts/generate-blog-media.ts:21-64,82-90
  - scripts/lib/cloudinary.ts
- Lib and API:
  - src/lib/blog.ts:55-59
  - src/lib/email.ts
  - src/lib/cloudinary.ts:1-9
  - src/pages/api/newsletter.ts:3-5,62-75
- Pages, components and containers:
  - src/containers/blog-details/index.tsx:19,45-49
  - src/containers/donate-form/layout-01/index.tsx:30
  - src/components/forms/donate-form.tsx:72-90,122-151
  - src/components/markdown-renderer/index.tsx:17
  - src/pages/donate.tsx:36
  - src/pages/press-kit.tsx:101-109
- Data:
  - src/data/homepages/index.json:149,160,338-341
  - src/data/innerpages/donate.json:20-67
  - src/data/blog-audio/labor-day-sprint-10-days-to-proof-of-work.md
  - src/data/blog-graphics/high-success-low-adoption/out/*.png
  - src/data/blog-graphics/10-day-sprint/out/*.png
  - src/data/outcomes.ts
  - __tests__/data/outcomes.test.ts:83-152
  - __tests__/scripts/*
- Docs and config:
  - docs/blog-template.md:21-23
  - docs/EMAIL_SETUP.md
  - docs/brand-style-guide.md:141
  - tailwind.config.js:85,95,104
  - package.json:27-31,49,58,59,66,76,92,110
  - .env.example:46-51,115-119
  - .gitignore:74-75
  - .nvmrc
  - README.md:184-221
  - AGENTS.md:262-268
- node_modules:
  - @react-email/{markdown,button,preview,container,section,body,head,html}/dist/*
  - @react-email/render/dist/node/index.js:90-115
  - html-to-text/package.json
  - sharp/package.json
  - sharp/dist/output.cjs:45,596,601,1235-1236
  - sharp/dist/constructor.cjs:167
  - @img/sharp-libvips-darwin-arm64/package.json
  - @img/sharp-wasm32/package.json

**Local skills**
- ~/.claude/skills/vwc-faceless-explainer/scripts/check-copy.mjs:20,24,43-51,64,95-115,183-192 (self-check run 2026-09-29)
- ~/.claude/skills/hyperframes-creative/frame-presets/blue-professional/FRAME.md:286-300
- ~/.claude/skills/media-use/audio/scripts/lib/heygen.mjs:20-47
- ~/.claude/skills/emails/SKILL.md:90-108,215-244
- ~/.agents/.skill-lock.json

**Commands run 2026-09-29**
- `npm ls sharp html-to-text`
- `npm view sharp|html-to-text|marked version license engines`
- `ffmpeg -version`
- sharp decode test on `/System/Library/Desktop Pictures/Mac Blue.heic`
- ffmpeg and sips HEIC conversion
- sharp EXIF-strip test
- sharp resize of the blog-graphic PNGs
- node WCAG contrast computation
- a caniemail.json query for `css-at-font-face` and `html-audio`
- grep of app `src/ scripts/ docs/` for CRM and ESP names
- Mailchimp connector `get_capabilities` (read-only; returned session metadata only)

**URLs (read 2026-09-29)**
- Gemini: https://ai.google.dev/gemini-api/docs/pricing · /deprecations · /speech-generation · /image-generation · /interactions · /changelog
- Cloudinary: https://cloudinary.com/pricing · https://cloudinary.com/documentation/image_upload_api_reference_upload
- caniemail: https://www.caniemail.com/api/data.json · https://www.caniemail.com/features/html-audio/ · https://www.caniemail.com/features/css-at-font-face/
- Mailchimp:
  - https://mailchimp.com/help/import-a-custom-html-template/
  - https://mailchimp.com/help/paste-in-html-to-create-an-email/
  - https://mailchimp.com/help/about-html-email/
  - https://mailchimp.com/help/about-campaign-footers/
  - https://mailchimp.com/help/the-unsubscribe-merge-tag/
  - https://mailchimp.com/help/all-the-merge-tags-cheat-sheet/
  - https://mailchimp.com/help/limitations-of-html-email/
  - https://mailchimp.com/help/gmail-is-clipping-my-email/
  - https://mailchimp.com/help/accessibility-in-email-marketing/
  - https://raw.githubusercontent.com/mailchimp/mailchimp-client-lib-codegen/main/spec/marketing.json
  - https://mailchimp.com/help/about-mailchimp-pricing-plans/ (fetch denied; not read)
- Donorbox: https://donorbox.org/nonprofit-blog/mailchimp-integration
- Gmail image proxy:
  - https://knowledge.workspace.google.com/admin/gmail/advanced/set-up-an-image-url-proxy-allowlist (redirect target of https://support.google.com/a/answer/3299041)
  - https://www.litmus.com/blog/gmail-adds-image-caching-what-you-need-to-know
  - https://words.filippo.io/how-the-new-gmail-image-proxy-works-and-what-this-means-for-you/
- Litmus and email rendering:
  - https://www.litmus.com/blog/a-guide-to-bulletproof-buttons-in-email-design
  - https://www.litmus.com/blog/the-ultimate-guide-to-email-image-blocking
  - https://www.litmus.com/blog/the-ultimate-guide-to-dark-mode-for-email-marketers
  - https://www.goodemailcode.com/email-code/template
  - https://emailmarkup.org/en/reports/accessibility/2026/
  - https://reallygoodemails.com/school/blog/classic-vs-new-outlook-rendering-changes
- W3C: https://www.w3.org/WAI/tutorials/images/decision-tree/ · https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html · https://www.w3.org/TR/wcag2ict-22/
- Consent and privacy:
  - https://www.bond.org.uk/wp-content/uploads/2024/11/Digital_Ethical-Guidelines_FINAL.pdf (pp.15, 17, 21, 22, 26, 37-38)
  - https://www.nysenate.gov/legislation/laws/CVR/50
  - https://www.law.cornell.edu/cfr/text/45/164.514
  - https://support.apple.com/en-us/116944
- Legal and sender rules: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business · https://support.google.com/a/answer/81126
- Libraries: https://marked.js.org/ · https://sharp.pixelplumbing.com · https://resend.com/blog/react-email-6 · https://github.com/resend/react-email/issues/3556
- Claude Code: https://code.claude.com/docs/en/sub-agents · https://code.claude.com/docs/en/skills

**Not researched**
- VWC's Mailchimp plan (connector exposes no plan data; pricing fetch denied) and whether donors are in the SITREP audience, a Donorbox-synced list, or only Donorbox
- whether VWC has the Donorbox–Mailchimp integration enabled
- VWC's postal mailing address
- the Mailchimp Standard price
- whether Mailchimp's content studio hosts audio, and whether the new builder has an HTML block on lower plans
- real-photo JPEG sizes at 1200 px, and jimp as a pure-JS alternative
- whether ffmpeg strips EXIF and GPS on JPEG output
- whether US state publicity laws, CAN-SPAM or GDPR apply to a given org's donor update (legal questions, not legal advice)
- whether the Gemini key tier can be detected
- real thinking-token usage
- whether `gemini-3-pro-image` returns interim thought images to the caller
- non-English orgs and the literal "Donate" rule
