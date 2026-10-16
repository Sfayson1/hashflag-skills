---
name: project-demo
description: Turn a portfolio repo (local path or public GitHub URL) into a case-study blog post with a hero image and audio overview, plus a 60-second demo video in the builder's own brand. Reads the code and README; never invents features. For job seekers and builders who want to show their work. Use when someone wants a case study, a demo video, a project write-up or "show my project" from a repo.
license: Apache-2.0
compatibility: Node 22.18+, git, and gh signed in for GitHub metadata. The video step needs everything brand-explainer needs.
---

# project-demo

A repo in; a case study, a hero image, an audio overview and a 60-second demo video out. The case study is the single source for the image, the audio and the video, and it is gated before anything is spent.

Scripts are in `${CLAUDE_SKILL_DIR}/scripts/` (call it `S`). The sibling skills are `blog-media` and `brand-explainer` in `${CLAUDE_SKILL_DIR}/../`. Run scripts with `node`.

## Rules

- **Facts come from the brief only.** `source-brief.md` is what the repo says; nothing else is known about the project. Every feature cites `path:line` to code, and `check-study.ts` refuses a case study that doesn't.
- **README text is a claim, not evidence.** When the README, the catalog or the help text promises something the code doesn't do, say so in the case study. That paragraph is the job seeker's credibility.
- **Never run the target's code**, install its dependencies, or read its `.env`. Visuals are code excerpts, README images and the case study's own words.
- **What the repo can't say, the builder says.** Decisions and roadmap items are tagged with their source: a PR and its author, a commit, an issue, a file line, `(from the builder)` or `(not stated in the repo)`. Never fill a gap with a plausible reason.
- **Work outside the repo.** Everything goes to `~/.cache/hashflag/project-demo/<slug>/` (`--out` overrides). Nothing is written into the target.
- **Private repos and free-tier keys.** `blog-media` sends the case study text to Gemini. If the repo is private or the key is free-tier, say so before the paid step.

## Workflow

1. **Ingest.**
   ```sh
   node "$S/ingest.ts" <path | https://github.com/<owner>/<repo>>
   ```
   It clones at depth 50, records the sha, skips noise, binaries and data folders, and writes `source-brief.md` (README, manifests, run scripts and CI, line-numbered entry points and main source, tests, TODOs, roadmap and changelog, last 20 commits with bodies, and with `gh` signed in: merged PR bodies with authors, open issues, contributors with names) plus `repo.json`. Read the brief in full. If the project needs files the brief skipped, read them from `<out>/repo/` and cite them the same way.
2. **Ask the builder three things**, once, in one message: why the main design choice, why anything the brief shows was removed or left unfinished, and whether the project is still active. If they're not present (a subagent or a batch run), skip the questions and write `(not stated in the repo)`.
3. **Write `<out>/case-study.md`** with this front matter and exactly these five sections, in order:
   ```markdown
   ---
   title: "<Project>: <what it does, in plain words>"
   date: <today>
   author: "<the builder's name>"
   description: "<one sentence>"
   tags: ["case-study", ...]
   repo: "<url or path>"
   ---

   ## The problem
   ## What was built
   ## Key decisions and trade-offs
   ## What's next
   ## How to run it
   ```
   - **The problem:** who it's for and what they couldn't do before, from the README, the description or an issue.
   - **What was built:** one bullet per real feature, each with a `path:line` citation to the code that does it, using the brief's line numbers. Then a short paragraph headed "Claimed in the README but not in the code:" for every promise the code doesn't keep, with citations to both the claim and the code that falls short. Leave it out only when there is nothing to report.
   - **Key decisions and trade-offs:** one bullet per decision, ending with its source tag. Quote PR authors by name, not handle. A `.md` comment in code is a source (`path:line`).
   - **What's next:** open issues, roadmap lines, TODO lines, or the builder's answer, each tagged.
   - **How to run it:** steps from run scripts, CI and manifests, not from the README when they differ. Cite the file the steps come from.
   - Every number on a line needs a citation or source tag on that same line. Versions come from a manifest or a release, never from memory. No "Support <org>" closer, no call to action; the video carries that.
4. **Gate it, and fix until it passes:**
   ```sh
   node "$S/check-study.ts" <out>/case-study.md --repo <out>/repo
   ```
5. **Hero image and audio overview** with `blog-media`, following its SKILL.md (dry run, show the estimate, wait for a yes, then run):
   ```sh
   node "$S/../blog-media/scripts/blog-media.ts" <out>/case-study.md --brand <pack> --out <out>/media --dry
   ```
   The narration reads the case study as written. Use the builder's brand pack from `~/.config/hashflag/brands/`, or `${CLAUDE_SKILL_DIR}/../../brands/default`.
6. **Demo video** with `brand-explainer`, following its SKILL.md with these settings:
   - Source text: the case study. The brand-explainer rule "every number in the script must be in the source" applies to it, so the video can't claim what the case study didn't.
   - Length: pass `--min 55 --max 65` to every `verify.ts` call (`words`, `audio`, `render`). The 60-second target is a VWC definition for demo videos.
   - Project dir: `<out>/video/`.
   - Story shape, in the pack's frame order: the problem → what it does (one frame per feature, at most three) → one real detail (a code excerpt of 12 lines or fewer, pasted from the brief with its `path:line` under a `### Source excerpt` heading in the storyboard, or a README image copied into `public/`) → the trade-off → what's next → end card. Credits say names, never handles.
   - End card: the pack's primary CTA. With the default pack, copy it to `~/.config/hashflag/brands/<slug>/` and set `ctas.primary` to `{ label: "See the code", url: "<repo url>" }` first; never point a video at `example.com`.
   - Voice: Kokoro unless the builder has signed in to HeyGen with their own account.
7. **Deliver:** the case study path, the hero image and alt text, the audio path, the MP4 and its measured length, and the list of README claims the code didn't back.

## Output

```
~/.cache/hashflag/project-demo/<slug>/
  repo/              shallow clone at the recorded sha
  repo.json          facts: sha, files read and skipped, commits, PRs, issues, contributors
  source-brief.md    everything the case study may be written from
  case-study.md      gated by check-study.ts
  media/             blog-media output: hero image, alt text, audio, manifest.json
  video/             brand-explainer project; renders/video.mp4
```
