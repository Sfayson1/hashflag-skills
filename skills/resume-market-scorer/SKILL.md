---
name: resume-market-scorer
description: Score a software engineering resume against in-demand skills using live O*NET and BLS data, pulled by script on every run, and optionally against a specific job posting, BEFORE any resume editing. Maps the target role to its O*NET computer occupation (15-xxxx), weights the top Hot Technologies by their share of job postings and Transferable Skills/Knowledge by O*NET importance, grades the resume's evidence for each, and outputs a 0–100 market-fit score (plus a job-match score when a posting is given) with ranked gaps, unproven claims, strengths, ATS wording fixes and the BLS lane outlook. Use this whenever someone wants to score, grade, benchmark, audit, or "ground" a software engineering resume, check resume skills against the market, find skill gaps for a target role, or asks "how does my resume stack up," even if they don't say "score." Always run this before rewriting or tailoring a resume.
---

# Resume Market Scorer

Step 1 of the resume workflow: **ground the data, then edit.** This skill measures; it does not rewrite.

**Scope: software engineering resumes only.** The scripts accept O*NET computer and mathematical occupations (15-xxxx) and refuse anything else. For any other kind of resume, say this skill doesn't cover it.

**No fetch, no score.** Every run pulls O*NET and BLS live with `fetch_market.py`. Never score from memory, from general judgment, or from hand-written or hand-edited data; `score.py` refuses it. If the fetch fails, report the error to the user and stop.

Scripts are in `${CLAUDE_SKILL_DIR}/scripts/` (call it `S`). Run them with `python3`.

## Inputs

1. **Resume:** a file or pasted text.
2. **Target role:** title and level. If there are several lanes, score each separately.
3. **Job posting (optional, recommended):** the posting they're applying to. This is what an employer's ATS actually filters on.

If the role is missing, ask one question for it. Ask once whether they have a posting; don't require one.

**A resume is personal data.** Every resume and working file lives in `~/resume-scores/<person>/`. Never put one in a repo, a commit, an issue or a README. `score.py` refuses to run on files inside a git repo.

## Workflow

### 1. Map role → O*NET occupation

```bash
python3 "$S/fetch_market.py" --search "<role>"
```

Pick the closest code from the list and state it, with why, in one line. If two fit, score both.

**Emerging roles have no O*NET occupation.** AI engineer, ML engineer, LLM or prompt engineer, platform engineer and similar roles map only to a broader occupation (usually 15-1252.00 Software Developers), and their newest tools (LangChain, RAG, vector databases) are "not yet in O*NET". Say so at the top of the report, and ask for a job posting: the job-match score is the accurate measure for these roles.

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
- `evidence` is a line quoted from the resume, exactly; use `...` for skipped words. `score.py --text` refuses any quote it can't find on the resume. No evidence on the page means `none`. Don't credit what the resume doesn't show.

### 3b. With a posting: list its skills → `jd.json`

Save the posting as plain text in `~/resume-scores/<person>/jd.txt`. List **every** skill it asks for:

```json
{"title": "Senior AI Engineer", "company": "Example Co", "skills": [
  {"skill": "Python", "level": "required", "quote": "5+ years of Python"},
  {"skill": "Cloud", "level": "required", "quote": "experience with AWS or Azure", "any_of": ["AWS", "Azure"]},
  {"skill": "Retrieval-Augmented Generation", "level": "preferred", "quote": "Retrieval-Augmented Generation (RAG)"}
]}
```

- `level` is `required` or `preferred`, as the posting says. If it doesn't distinguish, use `required`.
- `quote` is copied verbatim from the posting. `score.py` refuses any quote not in `jd.txt`.
- `skill` uses the posting's own wording, since that's what its ATS matches. Use `any_of` when the posting offers alternatives.
- Then grade every posting skill in `resume.json` too, under the same skill name (`--checklist --jd jd.json --jd-text jd.txt` lists them all).

### 4. Score

Save the resume as plain text in `~/resume-scores/<person>/resume.txt`, then:

```bash
python3 "$S/score.py" onet.json resume.json --text resume.txt --out report.json
# with a posting:
python3 "$S/score.py" onet.json resume.json --text resume.txt --jd jd.json --jd-text jd.txt --out report.json
```

The formula is fixed; it never changes per person:
- **Tech (70%):** the top 15 Hot Technologies by share of postings. Weight = posting share, ×1.25 if In Demand.
- **Alternatives are one slot, never a deduction.** Java or C#; AWS, Azure or Google Cloud; React, Angular or Vue; JavaScript or TypeScript. The best evidence among members counts, and the slot is worth its most-requested member. Python, SQL, C++ and the rest stay separate items, because jobs often want them alongside each other.
- **Core (30%):** Transferable Skills and Knowledge with importance 50 or more. Weight = importance. Essential Skills are excluded, because resumes don't evidence reading or listening.
- **BLS** is the lane outlook only. It never changes the score.
- **Bands:** 80+ Strong · 65–79 Competitive · 50–64 Gaps · under 50 Mismatch. The bands are **uncalibrated** until 3–5 real resumes have been run; say so in every report.
- Each item's `impact` is the points the score gains if it were proven. Gaps rank by impact.
- **Job match (with a posting):** a separate score, never blended with market fit. Each posting skill is weighted 2 if required, 1 if preferred, and graded with the same strengths. Its ATS check uses the posting's exact terms: if the posting says "Retrieval-Augmented Generation" and the resume only says "RAG", that's a fix.
- **ATS wording is a separate check; it never changes the score.** The score asks "does this person have the skill?" `onet_name` mappings answer that, but no ATS can be trusted to make the same mapping ("GCP" for "Google Cloud", "JS" for "JavaScript"). So for every scored tool the person has, `--text` checks that the resume text literally carries each standard form (full name and abbreviation) and prints the exact wording to add.

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

ATS wording: [N] of [M] tools written in every standard form
1. [Skill] — missing [form]; write "[fix]"

Not scored for this occupation
- [Skill] — [alternate stack | not yet in O*NET | dead weight]

Job match (only with a posting): [XX]/100 ([band], bands uncalibrated). [Title] at [Company]
Required skills shown: [N] of [M]
1. [Skill] — [required | preferred], resume: [strength], +[impact] pts if proven
ATS wording (posting's terms): [N] of [M] present
1. [Skill] — the posting says "[term]"; use that exact term

Sources: [every URL from onet.json "sources"]
```

A report without the O*NET code and title, the pull date, BLS growth, pay and openings with the period, both subscores, the ATS wording check, and the source links is invalid. ATS fixes are always "resume-fixable".

## Labels

- **resume-fixable:** the person has the skill but the resume doesn't show it. **skill-building:** they don't have it yet.
- **alternate stack:** the scorer already merges Java/C#, AWS/Azure/Google Cloud, React/Angular/Vue and JavaScript/TypeScript, so nobody loses points for a rival they don't use. Use the label for any other competing pair you spot, and don't push someone to add a stack they don't use.
- **not yet in O*NET:** a real, current tool O*NET hasn't added. It is neither credited nor called dead weight.
- **dead weight:** only for skills unrelated to the target role.
