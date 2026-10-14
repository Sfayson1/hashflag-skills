---
name: hashflagify
description: Turn a GitHub profile repo (a user's <login>/<login> repo or an org's .github repo) into a self-updating, Vets Who Code–branded "Mission Brief" README built from SVG slices, refreshed daily by a GitHub Action. Use when asked to hashflagify a repo or build a VWC-style profile README.
user-invocable: true
---

# Hashflagify

Run from inside the target repo. The engine in `scripts/` is fixed; everything about the
account lives in one file, `tools/profile/brief.json`. Your job is to write a good brief.

## Step 1: Identify the target

`gh repo view --json nameWithOwner,owner,defaultBranchRef,viewerPermission`

| Repo | kind | readme | assets end up in |
|---|---|---|---|
| `<login>/<login>` | `user` | `README.md` | `assets/` |
| `<org>/.github` | `org` | `profile/README.md` | `profile/assets/` |

Anything else: stop. Only these two README locations show on a profile page.

## Step 2: Install the engine

```bash
E=~/.claude/skills/hashflagify/scripts   # wherever this skill is installed
mkdir -p tools/profile/data .github/workflows <assets dir>
cp -R $E/*.py $E/fonts $E/requirements.txt tools/profile/
cp $E/vwc.gif <assets dir>/
cp $E/workflow.yml .github/workflows/update-profile.yml
printf '.venv/\n__pycache__/\n.env\n' >> .gitignore   # skip lines already there
```

Never touch an existing workflow or README content outside the markers without asking.

## Step 3: Write `tools/profile/brief.json`

Start from `examples/user.brief.json` or `examples/org.brief.json`. Fill it from the existing
README, the account's GitHub data, and its website. **Show the draft to the user before
rendering.** Never invent stats, awards, or URLs. Check every link with `curl -sL -o /dev/null -w '%{http_code}'`.

Required: `login`, `kind`, `readme`, `tag` (1-4 dog-tag lines, first is the name),
`links` (1-5 `[LABEL, url]`), `title_line`, `bio`, `ops`, `motto`.
Optional sections (omit the key to drop the section): `unit`, `extra_ops`, `stack`,
`commendations` + `featured`, `reports`.

Rules the renderer enforces, so draft to them:
- **ops + extra_ops must total an even number** (cards render in pairs). 6–8 reads best.
- **Stencil text** (`tag`, `links`, `title_line`, card titles, `unit.line`) has no `#` or `·`. Use `|` as a separator.
- `ops[].repo` is `owner/name`. Add `title` + `url` to show a live site instead of the repo.
- `extra_ops` entries are `[TITLE, brief, META, url or null]`.
- Don't give the account credit for repos it didn't build. For a user, ask which repos to feature.
- No weapons, combat imagery, real insignia, or fake classification markings.

## Step 4: Fetch, render, verify

```bash
python3 -m venv .venv && .venv/bin/pip install -q -r tools/profile/requirements.txt
.venv/bin/python tools/profile/test_fetch.py
GITHUB_TOKEN=$(gh auth token) .venv/bin/python tools/profile/fetch.py
```

Add the markers to the README if it doesn't have them: `<!-- brief:start -->` and `<!-- brief:end -->`.
By default the whole README becomes the brief. Fold the old prose into `bio` / `unit` and confirm with the user.

```bash
.venv/bin/python tools/profile/render.py && .venv/bin/python tools/profile/readme.py
```

Verify before shipping:
- [ ] Run it twice, then `git add -A && render && readme && git diff --quiet`. Zero diff proves it's deterministic.
- [ ] The only URL in any SVG is the xmlns: `grep -ho 'https\?://[^"]*' <assets>/*.svg | sort -u`.
- [ ] Preview the README's `<div>` at 846px and 375px width. Links stay on one row, cards stay paired, no gaps between slices.

## Step 5: Token and ship

- **org:** the workflow's `GITHUB_TOKEN` is enough. The org fetch only uses public REST endpoints.
- **user:** add a classic PAT with `read:user` as repo secret `PROFILE_TOKEN`. Without it, the
  org contributions drop out of the calendar. The user creates the token; never handle it in chat.

Commit on a branch with Conventional Commits and open a PR, unless memory gives standing
permission to push that repo to main. After merge, run `gh workflow run Hashflagify` and watch it.
Check the live profile page loads every image.

## What the data means

- **user:** followers, stars on owned public repos, PRs, a contribution calendar spanning every year, streaks.
- **org:** public repos, stars, forks, merged PRs across the org, unique contributors across public
  repos, and the "city" of daily default-branch commits summed across public repos pushed in the
  last year (`/stats/commit_activity`, 52 weeks only). No streaks: those are personal.
- An org brief carries only org content: no personal motto, bio, or commendations.
  `★` in `motto` draws as a red star.
