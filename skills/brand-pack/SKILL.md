---
name: brand-pack
description: Capture an organization's brand once (colors, fonts, logo, writing voice, copy rules, calls to action) into a brand pack that every hashflag skill reads. Use when someone wants to set up their brand, make a brand pack, or when another skill needs a pack that doesn't exist yet. Also validates an existing pack.
license: Apache-2.0
compatibility: Node 22.18+. Run in the main conversation; capture asks the user questions.
---

# brand-pack

A brand pack is a folder with a `brand.md` whose YAML front matter follows the schema in `docs/contracts.md` at the plugin root (`${CLAUDE_SKILL_DIR}/../../docs/contracts.md`). Packs live on the user's machine at `~/.config/hashflag/brands/<slug>/` (or `$XDG_CONFIG_HOME/hashflag/brands/<slug>/`), never in a git repo.

## Validate only

If the user already has a pack, or another skill asks for a check, just run:

```sh
node "${CLAUDE_SKILL_DIR}/../../lib/brand.ts" <pack dir>
```

Exit 0 means valid. Otherwise it lists every problem; fix them with the user.

## Capture

**Only in the main conversation.** If you are a subagent, running headless, or in CI, don't ask anything: report which fields are missing and stop.

1. **Start from what exists.** Ask whether there's a brand guide, style doc, or website. If so, read it and pre-fill every field you can. Never guess a value the source doesn't state; ask instead.
2. **Ask for each missing field, one question at a time.** Use the native question tool when there is one (AskUserQuestion in Claude Code); otherwise ask one plain question with a short numbered list. The fields, in order:
   - **Name** and **mission** (one sentence).
   - **Colors** by role: `ink` (body text), `canvas` (background), `accent` (calls to action), and optional `accent2` plus any others by name. Every hex value is quoted. `ink` on `canvas` must reach 4.5:1 contrast; the validator checks this.
   - **Fonts**: a heading font and a body font, optionally a mono font. For each, the family name, its license, and its source (a Google Fonts URL, a local file path, or a URL). If the license is commercial or unknown, say so plainly. The files stay on this machine and must never be committed to a public repo.
   - **Logo**: a file path (SVG preferred). Copy it into the pack folder. Optional; without one, videos set the name in the heading font.
   - **Voice**: 3 to 5 adjectives for the writing tone, and 1 or 2 example sentences in the brand's voice. This is writing tone, not a TTS speaker.
   - **Copy rules**: 3 to 5 rules. For each rule that a regex can catch, add `ban` (a case-insensitive regex) and `use` (the replacement). Rules a regex can't check keep only `rule`.
   - **Calls to action**: the literal action words (Donate, Book, Apply) and their links.
   - **Video** (optional): `ground` (which color the video background is; default `canvas`), `caption_case` (`upper`, `lower` or `none`), `story` (the frame order).
   - **Narration** (optional): voice ids under `tts.heygen.voice`, `tts.kokoro.voice` or `tts.gemini.voice`.
3. **Write the pack.** Slug the name, create `~/.config/hashflag/brands/<slug>/brand.md`, and put a short human description in the Markdown body. Start from `${CLAUDE_SKILL_DIR}/../../brands/default/brand.md` as a template.
4. **Fetch fonts.** For Google Fonts, run:
   ```sh
   node "${CLAUDE_SKILL_DIR}/scripts/fetch-fonts.ts" <pack dir>
   ```
   It downloads the files into `<pack>/fonts/` and lists them in `brand.md`. For other fonts, copy the files the user provides into `<pack>/fonts/` and add them to `files:` yourself. Name files `<Family>-<weight>.woff2` so the weight can be read.
5. **Validate** with the command above, fix anything it reports, and show the user the finished front matter.

## Rules

- Don't invent brand values. Unknown means ask.
- Don't download fonts from anywhere other than the source the user gave.
- Don't write the pack inside a repo. If the user insists, remind them that `brand/` is git-ignored here for a reason: licensed fonts and logos must not be published.
