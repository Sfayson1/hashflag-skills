---
name: resume-market-scorer
description: Score a resume's skills against what live job postings ask for, for civilian Software, Data, ML and AI Engineer roles. Pulls live data by script on every run: current postings from keyless job-board APIs (Greenhouse, Lever, Ashby), plus O*NET in-demand skills and the BLS outlook for the matching occupation. Grades the resume's evidence for each skill and outputs one 0–100 composite score for where the resume stands in the market for the target role, with the BLS outlook as context and the exact skills to add, prove, or cut, ranked by points gained. Use this whenever someone wants to score, grade, benchmark, or audit a resume's skills, find skill gaps for a target role, asks "how does my resume stack up," or before editing or tailoring a resume, even if they don't say "score."
---

# Resume Market Scorer

Step 1 of the resume workflow: **measure, then edit.** This skill scores; it does not rewrite.

**Scope:** civilian Software, Data, ML and AI Engineer resumes. For any other kind of resume, say this skill doesn't cover it.

## Rules

- **No fetch, no score.** Every run pulls live postings with `fetch_postings.py` and live O*NET and BLS data with `fetch_market.py`. If a fetch fails, report the error and stop.
- **Never score from memory.** The scorer refuses market data the scripts didn't write, that was edited, or that is stale (postings 14 days, O*NET 30).
- **Never write resumes in a repo.** The working dir is `~/resume-scores/<person>/`. The scorer refuses files inside a git repo.
- **Every number in the report comes from the scripts.** Don't estimate, round differently, or add your own.
- **Label VWC definitions.** The score formula, family rollup and rival-stack slots are Vets Who Code definitions, not industry standards; say so where they appear.

Scripts are in `${CLAUDE_SKILL_DIR}/scripts/` (call it `S`). Run them with `python3`.

## Workflow

1. **Lane.** One of `software`, `data`, `ml`, `ai`; if it's missing, ask one question for it. The lane fixes the O*NET occupation (`LANE_ONET` in `fetch_postings.py`): software and ai → 15-1252.00 Software Developers, data → 15-1243.00 Database Architects, ml → 15-2051.00 Data Scientists. AI and ML engineers have no O*NET occupation of their own; say so in the report.
2. **Fetch both sources:**
   ```bash
   mkdir -p ~/resume-scores/<person> && cd ~/resume-scores/<person>
   python3 "$S/fetch_postings.py" <lane> --out postings.json
   BLS_CONTACT_EMAIL=<their email> python3 "$S/fetch_market.py" <lane> --out onet.json
   ```
   Report any `SOURCE FAILED` lines. postings.json stays valid for 14 days. BLS refuses requests without a contact email: use the email of the person running the skill; if it isn't set, ask for it. Never invent or reuse one.
3. **Checklist:** `python3 "$S/score_skills.py" postings.json --onet onet.json --checklist` lists every postings skill and every O*NET item.
4. **Grade the resume → `resume.json`.** Save it as plain text in `resume.txt` first. One entry per skill covers both sources. Grade **every** checklist item, plus every other skill on the resume:

   | Strength | Meaning | Value |
   |---|---|---|
   | `proven` | Experience bullet with a result or metric; the quote must carry a number, % or $ | 1.0 |
   | `applied` | Experience bullet, no result | 0.7 |
   | `listed` | Skills section or summary only | 0.4 |
   | `stale` | Only in roles 5+ years old | 0.3 |
   | `none` | Not on the resume | 0.0 |

   ```json
   {"skills": [
     {"skill": "Python", "strength": "proven", "section": "experience",
      "evidence": "Built ETL pipeline in Python cutting load time 60%"},
     {"skill": "AWS", "onet_name": "Amazon Web Services AWS software", "strength": "listed",
      "section": "skills", "evidence": "Platforms: AWS"},
     {"skill": "Programming", "strength": "proven", "evidence": "Built ETL pipeline in Python cutting load time 60%"},
     {"skill": "LangChain", "strength": "none", "evidence": "", "fixable": true}
   ]}
   ```
   - `evidence` is quoted from the resume exactly; `...` may stand for skipped words. No quote means `none`. `--text` refuses any quote not on the resume.
   - Use the checklist's names. `onet_name` maps the resume's term to O*NET's exact name when they differ ("AWS" → "Amazon Web Services AWS software", "GCP" → "Google Cloud software").
   - For an O*NET "any of" slot (Java or C#; AWS, Azure or Google Cloud; React, Angular or Vue; JavaScript or TypeScript), grade only the member(s) the person uses. Nobody loses points for a rival stack.
   - `fixable: true` on a `none` skill means the person has it but the resume doesn't show it (ask if unsure). It tags the ADD item resume-fixable instead of skill-building.
5. **Score:**
   ```bash
   python3 "$S/score_skills.py" postings.json resume.json --onet onet.json --text resume.txt --out report.json
   ```
6. **Report** (below).

## Composite Score (VWC definition, fixed)

One score for where the resume stands in the market for the target lane:

- **Composite = 50% live postings + 50% O*NET market fit.** O*NET market fit is 70% tech, 30% core, so overall: postings 50 · O*NET tech 35 · O*NET core 15.
- **Live postings:** the top 25 skills by share of postings in the lane. Weight = share. The required/preferred split in the checklist is context only (VWC heuristic: text under a header like "Preferred", "Nice to have" or "Bonus" is preferred); most postings have no such header, so it never changes the weight.
- **O*NET tech:** the top 15 Hot Technologies by share of postings, ×1.25 if In Demand. **O*NET core:** Transferable Skills and Knowledge with importance 50+, minus items no bullet can evidence (English Language, Time Management, Coordination...; the list is `CORE_EXCLUDE` in `score.py`).
- **The market prevails.** When the lane's live postings track an O*NET tool, the live share replaces O*NET's before the top 15 is picked (Java for the ai lane: O*NET 25% → market 5%). An O*NET tool the market doesn't measure isn't scored. O*NET still decides which tools and core skills count; the market decides what each tool weighs. A tool maps only when its O*NET name is that skill plus vendor filler ("Oracle Java"), so "Microsoft SQL Server" doesn't borrow SQL's share. The report prints every override.
- **Family rollup:** a resume skill in a family credits its parent at 0.7 of its grade (LangGraph proven → LangChain 0.7).
- **Lift** = composite points gained if that skill moved to proven. A skill in both sources gets both lifts, weighted. Every recommendation is sorted by lift.
- **Bands are percentiles of a reference pool, not fixed cutoffs.** `references/pool.json` holds real composite scores per lane (scores only, no names or text). Strong = top quarter · Competitive = above the lane median · Gaps = below it · Mismatch = bottom quarter. The median line is the one NYC Local Law 144 bias audits draw (6 RCNY 5-301): a scoring tool is audited on who lands above the applicant pool's median. Under 20 scored resumes in a lane, no band is given, only "above N of M", marked provisional.
- **Growing the pool:** after scoring a real resume, ask once whether to record the score; if yes, re-run with `--add-to-pool`. One entry per person per lane, latest version only. Never add what-ifs, synthetic resumes, or test runs.
- **BLS is context, not points.** It has no skill data, only the lane's growth, pay and openings, so it frames where the lane is headed and never changes the score.
- **Pedigree** is a separate line that never changes the score: the share of postings that ask for employer pedigree outright ("experience at FAANG", "big tech", "top-tier"). Recruiters weight employer names when reading a resume even when the posting doesn't say so; the line shows what this lane's postings put in writing.
- **ATS wording** is a separate check that never changes the score: tools the resume doesn't write in every standard form ("Google Cloud (GCP)"). Its fixes are always resume-fixable.

## Report

BLUF first, warm and encouraging, showing the path to a higher score:

```
Composite Score XX/100 for [lane] ([band]: above N of M scored [lane] resumes | pool too small for a band, above N of M, need 20). Biggest lift: [skill] (+N pts).
Built from: live postings XX · O*NET market fit XX (tech XX, core XX).
Lane outlook (BLS [period]): [growth]% growth, median pay $[X], [N]K openings/yr.

Sample: N postings, X companies, [boards], fetched [date], confidence [OK | LOW]. O*NET [code] [title], pulled [date].
No Workday-hosted postings (no keyless API); sample leans tech/startup.

STRONG (proven, high demand)
1. [Skill] — X% of postings, O*NET [flags]
PROVE IT (on the resume, not yet proven; lift if moved into a result bullet)
1. [Skill] — resume: [grade], +N pts if proven
ADD (missing)
1. [Skill] — +N pts, [resume-fixable | skill-building]
CUT (on the resume, under 2% of postings, and not a common O*NET tool like Git)
1. [Skill] — X% of postings
Pedigree (not scored): X% of postings ask for employer pedigree outright.
ATS wording: [N] of [M] tools written in every standard form
1. [Skill] — write "[term]"
NEW — review (frequent in postings, in neither source's scoring)
1. [Term] — X% of postings

Sources: [boards and companies sampled; every URL in onet.json "sources"]
```

- Each list max 5. Copy numbers from the script output.
- Always print the bias line. If confidence is LOW (under 30 postings), say so next to the score. If the pool is under 20, say the standing is provisional.
- The score is a VWC definition, not a hiring prediction; say so once.
- A skill neither source knows is reported, never scored. Suggest adding a real tool to `references/skills_vocab.json`.
