---
name: blog-media
description: Turn a blog post (Markdown, MDX or URL) into a hero image, alt text and a narrated audio overview in the organization's own brand, then optionally upload them and wire them into the post's front matter. Use when someone wants a hero image, an audio version or "blog media" for a post.
license: Apache-2.0
compatibility: Node 22.18+. Needs GEMINI_API_KEY on a billed Google AI project for images.
---

# blog-media

One post in; a hero image, its alt text, and a narrated WAV out. The script is `${CLAUDE_SKILL_DIR}/scripts/blog-media.ts`. Run it with `node`.

## Steps

1. **Find the post and the brand pack.** The post is a `.md`/`.mdx` path or a URL. The brand pack is a folder with a `brand.md` (format: `docs/contracts.md` at the plugin root). Look in `~/.config/hashflag/brands/` first. If there's no pack, stop and ask for one; never invent brand colors.
2. **Show the estimate and wait for a yes.** Run:
   ```sh
   node "${CLAUDE_SKILL_DIR}/scripts/blog-media.ts" <post> --brand <pack> --dry
   ```
   Show the user the cost range and the image prompt. Nothing is spent until they agree.
3. **Run it.** Add `--max-usd` set to the high estimate, so a surprise can't overspend:
   ```sh
   node "${CLAUDE_SKILL_DIR}/scripts/blog-media.ts" <post> --brand <pack> --max-usd <high>
   ```
   Output goes to `~/.cache/hashflag/blog-media/<slug>/` unless `--out` is given. Files and `manifest.json` are written locally; nothing is uploaded.
4. **Review.** Exit code 0 means all good. Exit code 2 means something needs a human look (text in the image, alt text too long, a TTS chunk that looks truncated). Exit code 1 means a step failed. Read `error` in `manifest.json` and tell the user plainly. Show them the image and the alt text.
5. **Publish, only when the user asks.**
   ```sh
   node "${CLAUDE_SKILL_DIR}/scripts/blog-media.ts" publish <out>/manifest.json --storage cloudinary   # or s3
   ```
6. **Wire into the post, only when asked.** Re-run with `--write` to set front matter keys, or paste the printed snippet. Keys default to `image`, `image_alt` and `audio`; change them with `--keys image=image.src,alt=image.alt,audio=audio`. An existing alt is never overwritten.

## Flags

`--dry`, `--json`, `--out <dir>`, `--brand <dir>`, `--storage local|cloudinary|s3`, `--max-usd <n>`, `--script <file>` (narrate this file instead of the post body), `--only image|audio`, `--write`, `--keys`.

## Brand pack fields used

- `colors` and `image.palette`/`image.style` shape the image.
- `tts.gemini.voice`, `tts.gemini.model` and `tts.gemini.style` shape the narration (default voice Kore).

## Rules

- Narration reads the post as written. It never adds facts.
- Never put API keys in files. Keys come from the shell: `GEMINI_API_KEY`, `CLOUDINARY_URL`, or the `S3_*`/`AWS_*` names in `docs/contracts.md`.
- If a free-tier key is in use, warn before sending unpublished or private text.
