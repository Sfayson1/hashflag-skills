---
name: resume-market-scorer
description: Score a resume against in-demand skills using O*NET and BLS — the official scoring basis — BEFORE any resume editing. Maps the target role to its O*NET occupation, weights Technology Skills by O*NET's Hot Technology and In Demand flags and Skills/Knowledge by O*NET importance, grades the resume's evidence for each, and outputs a 0–100 market-fit score with ranked gaps, unproven claims, strengths, dead weight, and the BLS lane outlook. Use this whenever someone wants to score, grade, benchmark, audit, or "ground" a resume, check resume skills against the market, find skill gaps for a target role, run a resume scorer, or asks "how does my resume stack up," even if they don't say "score." Always run this before rewriting or tailoring a resume.
---

# Resume Market Scorer

Step 1 of the resume workflow: **ground the data, then edit.** This skill measures; it does not rewrite.

**Scoring basis: O*NET + BLS.** Every resume gets scored against the same government data so scores are consistent, repeatable, and comparable across people. Do not substitute another framework or score from general judgment.

## Inputs

1. **Resume** — file or pasted text.
2. **Target role** — title + level. If several lanes, score each separately.

If the role is missing, ask one question for it. Nothing else is required.

**A resume is personal data.** Write `onet.json`, `resume.json` and `report.json` to `~/.cache/hashflag/resume-market-scorer/<role-slug>/`, never inside a git repo, and never upload the resume anywhere.

## Workflow

### 1. Map role → O*NET occupation

Search O*NET OnLine: https://www.onetonline.org/find/
Pick the closest occupation code (e.g., 15-1252.00 Software Developers, 15-2051.00 Data Scientists, 15-1299.08 Computer Systems Engineers/Architects). State the code and why in one line. If two fit, score both.

### 2. Pull O*NET data → `onet.json`

From the occupation's page (https://www.onetonline.org/link/summary/[CODE]), pull:

- **Technology Skills** (full list via "Technology Skills" section/details). Record each tool's **Hot Technology** and **In Demand** flags.
- **Skills** and **Knowledge** with their **importance** scores (0–100) from the Details page: https://www.onetonline.org/link/details/[CODE]

Optional API (free key): https://services.onetcenter.org/

### 3. Pull BLS outlook

BLS Occupational Outlook Handbook: https://www.bls.gov/ooh/ — record 10-year growth %, median pay, annual openings for the matching occupation.

```json
{
  "role": "Senior Software Engineer",
  "onet_code": "15-1252.00",
  "onet_title": "Software Developers",
  "pulled_on": "YYYY-MM-DD",
  "bls": {"growth_pct": 15, "median_pay": 133080, "annual_openings": 129200, "source": "https://www.bls.gov/ooh/..."},
  "tech_skills": [
    {"skill": "Python", "hot": true, "in_demand": true, "aliases": ["py"]},
    {"skill": "Kubernetes", "hot": true, "in_demand": false, "aliases": ["k8s"]}
  ],
  "core_skills": [
    {"skill": "Programming", "importance": 75},
    {"skill": "Complex Problem Solving", "importance": 72}
  ]
}
```

Use real values from the pages only. Never fill from memory.

### 4. Extract resume evidence → `resume.json`

| Strength | Meaning | Value |
|---|---|---|
| `proven` | Experience bullet with a result/metric | 1.0 |
| `applied` | Experience bullet, no result | 0.7 |
| `listed` | Skills section / summary only | 0.4 |
| `stale` | Only in roles 5+ years old | 0.3 |
| `none` | Not on the resume | 0.0 |

```json
{"skills": [
  {"skill": "Python", "strength": "proven", "evidence": "Built ETL pipeline cutting load time 60%"},
  {"skill": "Programming", "strength": "proven", "evidence": "Same bullet"}
]}
```

Grade core skills (Programming, Systems Analysis, etc.) from what bullets demonstrate. Don't credit what the resume doesn't show.

### 5. Score

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/score.py" onet.json resume.json --out report.json
```

It exits with a clear error if `onet_code` is missing or a strength isn't one of the five values above.

Scoring (fixed — don't change per person):
- **Technology Skills (70%)** — weight: Hot + In Demand = 3, Hot or In Demand = 2, neither = 1.
- **Core Skills/Knowledge (30%)** — weight = O*NET importance. Only items with importance ≥ 50 count.
- **Score** = weighted evidence coverage, 0–100.
- **BLS** is reported as lane outlook; it does not change the resume score.
- Each item gets an **impact**: the points the score would gain if it were proven. Gaps and unproven claims are ranked by impact, so the top gap is the one that costs the most.

### 6. Report

```
BLUF: [Role] market-fit score [XX]/100 ([band]). Biggest gap: [skill] ([Hot/In Demand]).

Basis: O*NET [code] [title], pulled [date].
Lane outlook (BLS): [growth]% growth (10-yr), median pay $[X], [N] openings/yr.
Subscores: Tech [XX] · Core [XX]

Top gaps
1. [Skill] — [Hot Tech / In Demand], resume: [strength], +[impact] pts if proven  (max 5)

Unproven claims (listed only — move into a bullet with a result)
1. [Skill] — [flags]  (max 5)

Strengths
1. [Skill] — [flags]  (max 5)

Dead weight (on resume, not in O*NET for this occupation)
- [Skill], [Skill]

Listed in O*NET but below the importance cutoff (not scored): [Skill], [Skill]

Sources: [O*NET link] · [BLS link]
```

Bands: 80–100 Strong · 65–79 Competitive · 50–64 Gaps · <50 Mismatch.

## Guardrails

- Date-stamp every report; O*NET and BLS update periodically.
- Tag each gap "resume-fixable" (skill exists, not shown) or "skill-building."
- Brand-new tools may not be in O*NET yet. Note them under dead weight as "not yet in O*NET" rather than penalizing or crediting them.
