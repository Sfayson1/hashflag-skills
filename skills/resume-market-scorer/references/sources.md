# Sources

## Postings (scripts/fetch_postings.py, keyless)
- Greenhouse: https://boards-api.greenhouse.io/v1/boards/<company>/jobs?content=true
- Lever: https://api.lever.co/v0/postings/<company>?mode=json
- Ashby: https://api.ashbyhq.com/posting-api/job-board/<company>

Companies are in `companies.json`, verified live on the date in its `_note`. When a source fails, check the
slug at the endpoint above and drop or fix it.

**Bias:** Workday hosts many large-employer and government postings and has no keyless API, so they're absent.
The sample leans tech and startup. Every report says so.

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
