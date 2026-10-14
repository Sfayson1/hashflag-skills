---
name: resume-market-scorer
description: Score a resume against in-demand skills using live O*NET and BLS data, pulled by script on every run, BEFORE any resume editing. Maps the target role to its O*NET occupation, weights the top Hot Technologies by their share of job postings and Transferable Skills/Knowledge by O*NET importance, grades the resume's evidence for each, and outputs a 0–100 market-fit score with ranked gaps, unproven claims, strengths and the BLS lane outlook. Use this whenever someone wants to score, grade, benchmark, audit, or "ground" a resume, check resume skills against the market, find skill gaps for a target role, or asks "how does my resume stack up," even if they don't say "score." Always run this before rewriting or tailoring a resume.
---

# Resume Market Scorer

Step 1 of the resume workflow: **ground the data, then edit.** This skill measures; it does not rewrite.

**No fetch, no score.** Every run pulls O*NET and BLS live with `fetch_market.py`. Never score from memory, from general judgment, or from hand-written or hand-edited data; `score.py` refuses it. If the fetch fails, report the error to the user and stop.

Scripts are in `${CLAUDE_SKILL_DIR}/scripts/` (call it `S`). Run them with `python3`.

## Inputs

1. **Resume:** a file or pasted text.
2. **Target role:** title and level. If there are several lanes, score each separately.

If the role is missing, ask one question for it. Nothing else is required.

**A resume is personal data.** Every resume and working file lives in `~/resume-scores/<person>/`. Never put one in a repo, a commit, an issue or a README. `score.py` refuses to run on files inside a git repo.

## Workflow

### 1. Map role → O*NET occupation

```bash
python3 "$S/fetch_market.py" --search "<role>"
```

Pick the closest code from the list and state it, with why, in one line. If two fit, score both.

### 2. Fetch live data

```bash
mkdir -p ~/resume-scores/<person> && cd ~/resume-scores/<person>
BLS_CONTACT_EMAIL=<contact email> python3 "$S/fetch_market.py" <CODE> --role "<role>" --out onet.json
```

`BLS_CONTACT_EMAIL` is required; BLS refuses requests without a contact address. It must be the email of the person running the skill. If it isn't set in their environment, ask them for it. Never invent an address, use a placeholder, or reuse someone else's. The script pulls O*NET's Hot Technologies (with their share of postings and In Demand flag), Transferable Skills, Essential Skills and Knowledge (importance 50 or more), the occupation title, and the BLS projection row. It writes every source URL into `onet.json`. On any error it exits; don't work around it.

### 3. Grade the resume → `resume.json`

```bash
python3 "$S/score.py" onet.json --checklist
```

Grade **every** checklist item in `resume.json`. One entry per item; also add any other skills the resume claims.

| Strength | Meaning | Value |
|---|---|---|
| `proven` | Experience bullet with a result or metric | 1.0 |
| `applied` | Experience bullet, no result | 0.7 |
| `listed` | Skills section or summary only | 0.4 |
| `stale` | Only in roles 5+ years old | 0.3 |
| `none` | Not on the resume | 0.0 |

```json
{"skills": [
  {"skill": "AWS", "onet_name": "Amazon Web Services AWS software", "strength": "proven",
   "evidence": "Migrated 40 services to AWS, cutting hosting cost 30%"},
  {"skill": "Programming", "strength": "proven", "evidence": "Built ETL pipeline cutting load time 60%"},
  {"skill": "Oracle Java", "strength": "none", "evidence": ""}
]}
```

- `onet_name` maps the resume's term to O*NET's exact name. Use it whenever they differ ("AWS" → "Amazon Web Services AWS software", "GCP" → "Google Cloud software").
- For an "any of" slot, grade the member(s) the person actually uses. Don't add entries for the rivals they don't use.
- `evidence` is a line quoted from the resume. No evidence on the page means `none`. Don't credit what the resume doesn't show.

### 4. Score

```bash
python3 "$S/score.py" onet.json resume.json --out report.json
```

The formula is fixed; it never changes per person:
- **Tech (70%):** the top 15 Hot Technologies by share of postings. Weight = posting share, ×1.25 if In Demand.
- **Alternatives are one slot, never a deduction.** Java or C#; AWS, Azure or Google Cloud; React, Angular or Vue; JavaScript or TypeScript. The best evidence among members counts, and the slot is worth its most-requested member. Python, SQL, C++ and the rest stay separate items, because jobs often want them alongside each other.
- **Core (30%):** Transferable Skills and Knowledge with importance 50 or more. Weight = importance. Essential Skills are excluded, because resumes don't evidence reading or listening.
- **BLS** is the lane outlook only. It never changes the score.
- **Bands:** 80+ Strong · 65–79 Competitive · 50–64 Gaps · under 50 Mismatch. The bands are **uncalibrated** until 3–5 real resumes have been run; say so in every report.
- Each item's `impact` is the points the score gains if it were proven. Gaps rank by impact.

### 5. Report

```
BLUF: [Role] market-fit score [XX]/100 ([band], bands uncalibrated). Biggest gap: [skill].

Basis: O*NET [code] [title], pulled [date].
Lane outlook (BLS [period]): [growth]% growth, median pay $[X], [N]K openings/yr.
Subscores: Tech [XX] · Core [XX]

Top gaps (max 5)
1. [Skill] — [flags], resume: [strength], +[impact] pts if proven, [resume-fixable | skill-building]

Unproven claims (listed only; move into a bullet with a result) (max 5)
1. [Skill] — [flags], +[impact] pts if proven

Strengths (max 5)
1. [Skill] — [flags]

Not scored for this occupation
- [Skill] — [alternate stack | not yet in O*NET | dead weight]

Sources: [every URL from onet.json "sources"]
```

A report without the O*NET code and title, the pull date, BLS growth, pay and openings with the period, both subscores, and the source links is invalid.

## Labels

- **resume-fixable:** the person has the skill but the resume doesn't show it. **skill-building:** they don't have it yet.
- **alternate stack:** the scorer already merges Java/C#, AWS/Azure/Google Cloud, React/Angular/Vue and JavaScript/TypeScript, so nobody loses points for a rival they don't use. Use the label for any other competing pair you spot, and don't push someone to add a stack they don't use.
- **not yet in O*NET:** a real, current tool O*NET hasn't added. It is neither credited nor called dead weight.
- **dead weight:** only for skills unrelated to the target role.
