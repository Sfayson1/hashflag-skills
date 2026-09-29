# hashflag-skills

Skills and agents built at Vets Who Code that help nonprofits, job seekers and small businesses create and operate straight from the terminal.

**Status:** planning. Nothing is built yet. The work is tracked in [issues](https://github.com/Vets-Who-Code/hashflag-skills/issues).

## What's planned

The first set is content engines: one piece of writing in, images, audio and video out.

| Issue | What | Context |
| --- | --- | --- |
| [#1](https://github.com/Vets-Who-Code/hashflag-skills/issues/1) | Epic: content engine skills | [issue-1.md](docs/context/issue-1.md) |
| [#2](https://github.com/Vets-Who-Code/hashflag-skills/issues/2) | Blog to image and audio | [issue-2.md](docs/context/issue-2.md) |
| [#3](https://github.com/Vets-Who-Code/hashflag-skills/issues/3) | Brand pack and brand-locked explainer video | [issue-3.md](docs/context/issue-3.md) |
| [#4](https://github.com/Vets-Who-Code/hashflag-skills/issues/4) | Project to demo video and case study for job seekers | [issue-4.md](docs/context/issue-4.md) |
| [#5](https://github.com/Vets-Who-Code/hashflag-skills/issues/5) | Impact story video, audio and social images for nonprofits | [issue-5.md](docs/context/issue-5.md) |
| [#6](https://github.com/Vets-Who-Code/hashflag-skills/issues/6) | Donor update email with audio and images | [issue-6.md](docs/context/issue-6.md) |
| [#7](https://github.com/Vets-Who-Code/hashflag-skills/issues/7) | Product explainer video for small businesses | [issue-7.md](docs/context/issue-7.md) |
| [#8](https://github.com/Vets-Who-Code/hashflag-skills/issues/8) | Agent: repurpose one post into a full content kit | [issue-8.md](docs/context/issue-8.md) |
| [#9](https://github.com/Vets-Who-Code/hashflag-skills/issues/9) | Fictional sample content for testing every skill | [issue-9.md](docs/context/issue-9.md) |

Build order: #2, #3, #4, then #8. #5–#7 follow #2 and #3. #9 has no dependencies.

## Context docs

`docs/context/` holds one context doc per issue. Each one covers what already exists (mostly in [vets-who-code-app](https://github.com/Vets-Who-Code/vets-who-code-app) and the HyperFrames video pipeline), lessons already learned, costs, how each acceptance criterion maps to existing work, open decisions with recommended defaults, and a suggested build plan.

Start with [issue-1.md](docs/context/issue-1.md) for repo-wide decisions: layout, packaging, licensing and shared configuration.

These docs were written on 2026-09-29. Code moves, so check a file and line against the current source before relying on it.

## Contributing

New here? Start with [#9](https://github.com/Vets-Who-Code/hashflag-skills/issues/9). It needs no code.

- Branch off `main` and open a pull request. Don't commit to `main` directly.
- Use [Conventional Commits](https://www.conventionalcommits.org/): `<type>(scope): Sentence-case subject`.
- Never commit licensed fonts (for example Gilroy or Gotham Pro), API keys, or rendered media output.

## License

Not chosen yet. The options and a recommended default are in [issue-1.md](docs/context/issue-1.md#open-decisions-for-the-owner), decision 1.
