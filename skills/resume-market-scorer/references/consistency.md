# Grading consistency

The scripts are deterministic; the grading step (resume.txt → resume.json) is not. This records how much the
composite score moves between independent grading sessions on the same resume and market data, and which rules
in SKILL.md were tightened as a result. Re-run it after any change to the grading rules:

```bash
python3 scripts/compare_grades.py g1/report.json g2/report.json g3/report.json   # per-skill splits and score spread
```

**Target: ±2 points** (max − min across sessions ≤ 4). The lift numbers in a report are 1–6 points each, so a
spread wider than that would make the ADD and PROVE IT rankings mean less than they look.

## Method

Three resumes, three lanes, each graded by three fresh Claude Code sessions with no shared context, each given only
SKILL.md, the checklist, resume.txt and the fetched market data. Every session ran score_skills.py itself and
fixed validation errors until it passed, as a real session would. Sessions could not ask the person anything.
"Different graders" here means different sessions of the same model; no human graders yet.

| Lane | Resume | Postings | O*NET |
|---|---|---|---|
| ai | a real resume, with the person's okay | 268, fetched 2026-10-18 | 15-1252.00 |
| software | `fixtures/resumes/marcus-oyelaran-software.txt` (fictional) | 1647, fetched 2026-10-18 | 15-1252.00 |
| data | `fixtures/resumes/priya-lindqvist-data.txt` (fictional) | 138, fetched 2026-10-18 | 15-1243.00 |

The fictional resumes plant the cases a grader has to decide: a role that ended just over five years ago, a skill
in both an old role and the Skills line, bullets with a count but no outcome, work in Projects and volunteer
sections, and a tool that is only "learning".

## Round 1: rules as of PR #33

| Lane | Scores | Spread | Unanimous skills | Pairwise agreement |
|---|---|---|---|---|
| ai | 72.3 / 73.0 / 70.5 | 2.5 | 33 of 38 | 91% |
| software | 70.9 / 69.2 / 72.0 | 2.8 | 29 of 33 | 92% |
| data | 87.9 / 82.8 / 83.9 | **5.1** | 32 of 38 | 89% |

Every split, with its cause:

| Cause | Splits |
|---|---|
| Inferred a skill the resume never names | Distributed systems (all three lanes), SQL from "Fixed N+1 queries" and Redshift key tuning, AWS from "on ECS", Lakehouse from "Iceberg tables on S3", AI agents from an LLM app |
| Count vs result: is "40 dashboards" or "300 stars" a metric? | Tableau, GitHub, Data modeling |
| Which section counts as experience | Flink (meetup demo in Projects), Linux ("Learned ... Linux"), GitHub (open-source stars) |
| Core O*NET items: which bullet, and must the number be about that skill | Mathematics, Operations Analysis, Technology Design |
| Several bullets name the skill; one has a number but it isn't about the skill | Observability ("observable REST APIs ... ~50%"), Data pipelines |
| Vendor-hosted variant | "Azure OpenAI" as OpenAI API (two of three said yes; hidden by the Gemini member carrying the slot) |

Also found: the ai postings.json on disk predated a vocabulary rename (`Agents` → `AI agents`) and crashed the
scorer with a KeyError. score_skills.py now refuses such a file with a re-fetch message.

## Rules added to SKILL.md step 4

1. The quote must name the skill (name, checklist member, or vocabulary alias). Doing the work without naming it
   is `listed` or `none` + `fixable`.
2. Best named bullet wins; any number makes it proven, counts included. Numbers in words don't count.
3. Experience = any bullet under a dated role or a project; skills, summary, education, certifications = `listed`;
   "learning" = `listed`.
4. Stale only when the skill appears nowhere newer.
5. All transferable core items and Computers and Electronics take the resume's single best engineering bullet;
   Mathematics needs a bullet naming statistics, a model or numerical work, or a degree (`listed`).
6. A vendor-hosted variant counts for the member it hosts and the cloud it runs on.

## Round 2: with rules 1–6

| Lane | Scores | Spread | Unanimous skills | Pairwise agreement |
|---|---|---|---|---|
| ai | 69.2 / 69.2 / 69.2 | 0.0 | 38 of 38 | 100% |
| software | 60.7 / 60.0 / 65.0 | **5.0** | 30 of 33 | 94% |
| data | 76.5 / 78.2 / 76.8 | 1.7 | 35 of 38 | 95% |

Scores dropped 3–10 points from round 1 because rule 1 stops crediting unnamed skills (CI/CD from a GitHub
Actions bullet, Generative AI from an OpenAI API bullet, Data pipelines from "streaming pipelines"). That credit
now shows up as resume-fixable ADD items, which is the advice the person needs anyway. The one pool entry
(ai, 2026-10-14) was graded under the round-1 rules and is 3–5 points high by the new ones.

The six remaining splits had two causes the new rules had not covered:

| Cause | Splits |
|---|---|
| A year or a digit in a product name passed "any number": "in 2019", "(talk, 2025)", "tables on S3" | Java, Flink, Iceberg, Kafka |
| A partial or inflected name: "CI" for CI/CD, "unit tests" for Automated testing | CI/CD, Automated testing |

Graders also asked whether "observable" names Observability, whether "data model" names Data modeling, how a
year-only end date ("2014 – 2021") meets the five-year line, and whether `fixable` may be inferred from the stack.

## Rules patched after round 2

- Rule 1: the name or alias must appear as whole words with the same spelling, in every section; variants and
  partial names don't count. Widen `skills_vocab.json` aliases when natural wording keeps missing.
- Rule 2: a number is a count, amount, percentage or dollar figure; a year, date, version or digit in a product
  name is not.
- Rule 4: a year-only end date ends in December of that year.
- New rule 7: `fixable: true` only when an experience bullet shows the work under another name; never from the
  stack alone.

## Round 3: with the patched rules

| Lane | Scores | Spread | Unanimous skills | Pairwise agreement |
|---|---|---|---|---|
| ai | 69.2 / 69.2 / 69.2 | 0.0 | 38 of 38 | 100% |
| software | 62.4 / 62.4 / 62.4 | 0.0 | 33 of 33 | 100% |
| data | 75.4 / 74.2 / 74.2 | 1.2 | 37 of 38 | 98% |

**Target met in every lane.** The one split (Mathematics: is a "dimensional data model" the "model" the rule
names?) is now closed in the rule text: only a statistical or machine-learning model counts. Three more
clarifications went in after this round without a re-measure, each codifying what all three graders already did:
a hyphen or dot is a word boundary ("LLM-powered" names LLM), a Skills-section header names the skill, and
"Learning X" stays `listed` even with a number. One example in rule 1 that contradicted the vocabulary ("unit
tests" is an Automated testing alias) was removed.

## What the rules cost

Round 3 scores sit 3–10 points under round 1 for the same resumes. The difference is credit that round-1 graders
gave to work the resume does without naming the skill. Under the final rules that credit is withheld and the skill
appears in ADD as resume-fixable, so the report's advice is "write the word", which an ATS needs too. The lever
for a wording the vocabulary should accept (e.g. "streaming pipelines" → Data pipelines) is an alias in
`skills_vocab.json`, followed by a re-fetch, not a looser rule.

## Open

- No human graders yet. The next real scoring sessions with a volunteer second grader go in this table.
- The ai pool entry from 2026-10-14 predates these rules and reads 3–5 points high; it is replaced the next time
  that person is scored with `--add-to-pool`.

## Open

- No human graders yet. The next real scoring sessions with a volunteer second grader go in this table.
- Rule 1 moves some credit from PROVE IT to ADD (resume-fixable). That is the intended reading: the report tells
  the person to write the skill's name, which is also what an ATS needs.
