# Shared contracts

Every skill in this repo follows these contracts. They settle the shared decisions in [issue-1.md](context/issue-1.md#open-decisions-for-the-owner) (Decisions 6, 8, 9, 10, 13).

## Brand pack

A brand pack is a folder with a `brand.md`. The YAML front matter is the only part that code reads. The Markdown body is free prose for people. Validate a pack with:

```sh
node lib/brand.ts <pack dir or brand.md>
```

```yaml
---
schema: hashflag-brand/0          # required
name: "Example Food Bank"         # required
mission: "One sentence."
colors:                           # role -> quoted "#rrggbb". ink and canvas are required.
  ink: "#1b1b1b"                  # body text
  canvas: "#faf7f2"               # background
  accent: "#2f6f4e"               # calls to action
  accent2: "#e0a100"              # optional; any other role name is allowed too
fonts:                            # every font names its license
  heading: { family: "Inter", license: "OFL-1.1", source: "<path or URL>" }
  body: { family: "JetBrains Mono", license: "OFL-1.1", source: "<path or URL>" }
voice:                            # writing tone, not a TTS speaker
  adjectives: ["warm", "plain", "direct"]
  examples: ["…"]
copy_rules:                       # ban is a case-insensitive regex; allow exempts matching spans
  - { rule: "Calls to action are one literal verb", ban: "\\bsupport us\\b", use: "Donate" }
  - { rule: "Every number names its source" }    # rules without ban are guidance for the writer
ctas:
  primary: { label: "Donate", url: "https://example.org/donate" }
logo: "logo.svg"                  # optional, relative to the pack folder
# Optional sections, each owned by one skill:
image: { style: "…", palette: ["ink", "accent"] }   # blog-media
tts:                                                # blog-media, brand-explainer
  gemini: { model: "…", voice: "Kore", style: "…" }
  heygen: { voice: "<starfish voice id>" }
  kokoro: { voice: "am_michael" }
video: { }                                          # brand-explainer
---
```

**Quote every scalar.** An unquoted `ink: #1b1b1b` parses as `null` because `#` starts a YAML comment. The validator rejects it.

## Paths

| What | Default | Override |
| --- | --- | --- |
| Run output | `${XDG_CACHE_HOME:-~/.cache}/hashflag/<skill>/<slug>/` | `--out <dir>` |
| Brand packs | `${XDG_CONFIG_HOME:-~/.config}/hashflag/brands/<slug>/` | `--brand <dir>` |

Output is written outside the caller's repo so renders never land in git. Skills print the output path at start and end.

## CLI flags for paid skills

| Flag | Meaning |
| --- | --- |
| `--dry` | No network calls, no spend, no uploads. Prints prompts, the script or chunk plan, and a cost range |
| `--json` | With `--dry`: `{calls:[{model, est_tokens_in, est_tokens_out}], est_usd_low, est_usd_high}`. With a run: `{results:[{kind, status, path, url, alt, error, est_usd}]}` where `status` is `ok`, `warn`, `failed` or `skipped` |
| `--out <dir>` | Output folder |
| `--brand <dir>` | Brand pack |
| `--storage local\|cloudinary\|s3` | Where finished files go. Default `local` (files plus `manifest.json`, no upload) |
| `--max-usd <n>` | Exit non-zero before the first paid call if the high estimate is over `n` |
| `publish <manifest>` | Upload a finished local run without regenerating it |

Every paid model call sets `maxOutputTokens`. Step functions return results and never call `process.exit`; only the CLI sets the exit code.

## Keys

One environment variable per provider, read from the shell. Nothing walks up the directory tree looking for a `.env`.

| Provider | Variable |
| --- | --- |
| Gemini | `GEMINI_API_KEY` |
| Cloudinary | `CLOUDINARY_URL` (`cloudinary://<key>:<secret>@<cloud>`) |
| S3-compatible | `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION` (default `auto`), `S3_PUBLIC_BASE_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| HeyGen | `HEYGEN_API_KEY` |
| ElevenLabs | `ELEVENLABS_API_KEY` |

## Pacing

[`lib/pacing.json`](../lib/pacing.json) holds narration words per second by TTS provider. Word budgets use the provider the pack selects and its `low` rate, so a script never runs long. Skills measure real duration after TTS and fail when a length gate is missed.
