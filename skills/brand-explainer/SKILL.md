---
name: brand-explainer
description: Turn an article, notes or a brief into a 60-90 second faceless explainer video in the organization's own brand, using its brand pack for design, captions and a copy gate. Wraps the HyperFrames faceless-explainer pipeline. Use for branded explainers, program breakdowns or impact pieces.
license: Apache-2.0
compatibility: Node 22.18+, ffmpeg, and the HyperFrames skills (faceless-explainer, hyperframes, hyperframes-creative, media-use) installed side by side. Run in the main conversation.
---

# brand-explainer

This skill runs the installed `faceless-explainer` pipeline and **overrides the steps where generic output drifts off brand.** Everything else (audio, frame building, captions, transitions, render) is upstream and runs exactly as `faceless-explainer` documents. Read its SKILL.md first and follow it, except where this file says otherwise.

Scripts are in `${CLAUDE_SKILL_DIR}/scripts/`; run them with `node`. Below, `S` means that folder.

## Before you start

- **A valid brand pack is required.** Look in `~/.config/hashflag/brands/`. If there's none, offer the `brand-pack` skill or the neutral pack at `${CLAUDE_SKILL_DIR}/../../brands/default`. Never start capture from here.
- **Environment.** Set these for every `npx hyperframes` and upstream script call:
  ```sh
  export HYPERFRAMES_SKIP_SKILLS=1 HYPERFRAMES_NO_TELEMETRY=1
  ```
  Use `npx --yes hyperframes@0.8.91` (the version this skill was tested against). Never send `hyperframes feedback`; it posts publicly.
- **Keys bill whoever owns them.** The HeyGen engine reads `HEYGEN_API_KEY`, then a `.env` up to 5 folders up, then `~/.heygen/credentials`. If the video is for an organization other than the signed-in account's owner, confirm with the user which account pays, or force the offline voice (below).
- **Length.** Default 60-90 s. Other skills pass their own `--min`/`--max`.

## What overrides what

| Upstream step | Here |
| --- | --- |
| 0 Setup | Unchanged, but work in `${XDG_CACHE_HOME:-~/.cache}/hashflag/brand-explainer/<project>/`, not inside a repo. |
| 1 Brief | Unchanged. Leave `tokens.json` colors and fonts as `[]`. |
| 2 Design system | **Replaced** by `stage.ts`. Never run `build-frame.mjs`; it overwrites frame.md and merges the brand's two fonts into one. |
| 3 Storyboard and script | **Constrained** by the pack's voice, copy rules, story shape and CTAs, then **gated** by `check-copy.ts` and the word budget. |
| 3.1 Audio | Voice comes from the pack. **Verified** by `verify.ts audio` before any frame is built. |
| 4-5 Visual design, frames | Unchanged; workers read the staged frame.md. After assembly, fix the ground if the pack's isn't `canvas`. |
| 6 Finalize | **Gated again** by `check-copy.ts` over built frames and captions, and by `verify.ts render` after render. |

## Step 2: stage the brand

```sh
node "$S/stage.ts" --brand <pack> --project .
```

This writes `frame.md` (generated from the pack, with explicit ink/canvas/accent roles and an @font-face block), `.hyperframes/caption-skin.html` (upstream's skin with the pack's casing; colors and fonts flow in from frame.md), the font files in `assets/fonts/`, and the logo in `public/`. It refuses to overwrite a hand-edited frame.md unless you pass `--force`. Relay any `note:` lines to the user.

## Step 3: write within the pack, then gate

Read the pack's `brand.md` in full: `voice`, `copy_rules` (including rules without a regex), `ctas` and `video.story`.

- Follow the story shape in frame.md. It always ends on the end card with the pack's literal CTA label.
- Write sentences in sentence case. Casing is applied by CSS.
- **Facts come from the source only.** Every number in the script must be in the source text. If the source states a number without saying where it came from, don't use it; tell the user.
- Punctuation is the only prosody control for HeyGen and Kokoro: a full stop drops pitch, a question mark rises, a dash carries a clause across.

Then run both gates and fix until they pass, **before** asking for approval:

```sh
node "$S/check-copy.ts" --brand <pack> --project . --numerals
node "$S/verify.ts" words --script SCRIPT.md --provider <heygen|kokoro|elevenlabs|gemini> --min 60 --max 90
```

Show the user the `--numerals` list and say where each figure comes from in the source.

## Step 3.1: voice

Pass `--voice` from the pack: `tts.heygen.voice` when HeyGen is signed in, `tts.kokoro.voice` offline. Say which voice you used.

**Offline or other-org voice.** To force Kokoro even when a HeyGen credential exists, run the audio step with the credentials blanked:

```sh
HEYGEN_API_KEY= HYPERFRAMES_API_KEY= ELEVENLABS_API_KEY= HEYGEN_CONFIG_DIR="$(mktemp -d)" node <faceless-explainer>/scripts/audio.mjs …
```

Use `music: none` in the storyboard unless the user has cleared the music's license; HeyGen's catalog music has no stated license.

When audio finishes, before building any frame:

```sh
node "$S/verify.ts" audio --script SCRIPT.md --meta audio_meta.json --min 60 --max 90
```

A missing clip means re-run audio. A total outside the band means edit the script and re-run; don't build frames on a bad length.

## Steps 4-5

Unchanged. Tell frame workers: only colors and fonts from frame.md, and text only in the contrast pairs it marks "text OK". After `assemble-index.mjs`, if the pack's `video.ground` isn't `canvas`:

```sh
node "$S/verify.ts" ground --brand <pack> --index index.html
```

Re-run it after any re-assemble.

## Step 6

Before preview:

```sh
node "$S/check-copy.ts" --brand <pack> --project .
```

This pass also covers built frames and burned-in captions. Then run upstream Step 6. Render to `renders/video.mp4` (pass `--output`), then:

```sh
node "$S/verify.ts" render --mp4 renders/video.mp4 --min 60 --max 90
```

Deliver the MP4 path, its duration, the contact sheet, and the voice used.
