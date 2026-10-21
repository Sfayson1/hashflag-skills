# Sources

## Postings (scripts/fetch_postings.py, keyless)
- Greenhouse: https://boards-api.greenhouse.io/v1/boards/<company>/jobs?content=true
- Lever: https://api.lever.co/v0/postings/<company>?mode=json
- Ashby: https://api.ashbyhq.com/posting-api/job-board/<company>
- SmartRecruiters: https://api.smartrecruiters.com/v1/companies/<id>/postings?limit=100 (ids are case-sensitive, often with a
  numeric suffix like `Ubisoft2`; the body is one more call per posting at `/postings/<postingId>`)
- Workable: https://apply.workable.com/api/v1/widget/accounts/<slug>?details=true

Companies are in `companies.json`, verified live on the date in its `_note`. A source that fails or returns no
jobs is reported as `SOURCE FAILED`. Before a release run `python3 scripts/verify_companies.py` and drop every
slug it marks DROP. Each board gives one date per job (Greenhouse `first_published`, Lever `createdAt`, Ashby
`publishedAt`; none exposes an update date), and postings older than 60 days are left out.

**Bias:** Workday hosts many large-employer and government postings and has no keyless API, so they're absent.
SmartRecruiters and Workable add enterprise and contractor employers, but the sample still leans tech and
startup, and there is no country filter. Every report says so. Dice was rejected: no public API, only scrapers.

## O*NET and BLS (scripts/fetch_market.py, scored by scripts/score.py)
O*NET Hot Technologies, skills and knowledge, and BLS projections for one occupation. Full URL list in `market-sources.md`.
```bash
BLS_CONTACT_EMAIL=<your email> python3 fetch_market.py ai --out onet.json
python3 fetch_market.py --search "software developer"   # any other 15-xxxx code
```
BLS refuses requests without a contact email in the User-Agent; use the email of the person running it.

Lane → occupation (`LANE_ONET` in `fetch_postings.py`, verified with `--search` on 2026-10-15):
software 15-1252.00 Software Developers · data 15-1243.00 Database Architects · ml 15-2051.00 Data Scientists ·
ai 15-1252.00 Software Developers. AI and ML engineer roles have no O*NET occupation of their own.

## Reference pool (references/pool.json)
Real composite scores per lane, nothing else: no names, no resume text, no what-ifs or test runs. Each entry is
keyed by a hash of the person's `~/resume-scores/<person>` folder name, so `--add-to-pool` replaces that person's
earlier score instead of appending. Bands are percentiles of the lane's pool: Competitive is above the median,
the line NYC Local Law 144 bias audits draw (6 RCNY 5-301). Under 20 scores a lane reports rank only ("above N
of M"), and the skill works the same either way.

## Grading consistency (references/consistency.md)
The grading step is the only non-deterministic part. `consistency.md` records the score spread between independent
grading sessions on the same resume, the rules added to close it, and the ±2 point target. Re-measure with
`scripts/compare_grades.py` after any change to the grading rules.
