# Sources

## Postings (scripts/fetch_postings.py, keyless)
- Greenhouse: https://boards-api.greenhouse.io/v1/boards/<company>/jobs?content=true
- Lever: https://api.lever.co/v0/postings/<company>?mode=json
- Ashby: https://api.ashbyhq.com/posting-api/job-board/<company>
- Remotive: https://remotive.com/api/remote-jobs?search=<lane term>
  Terms (https://github.com/remotive-com/remote-jobs-api): at most 4 calls a day, jobs are delayed 24 hours,
  and any use must link to each Remotive job URL and name Remotive as a source.

Companies are in `companies.json`, verified live on the date in its `_note`. When a source fails, check the
slug at the endpoint above and drop or fix it.

**Bias:** Workday hosts many large-employer and government postings and has no keyless API, so they're absent.
The sample leans tech and startup. Every report says so.

## O*NET and BLS (scripts/fetch_market.py, scored by scripts/score.py)
O*NET Hot Technologies, skills and knowledge, and BLS projections for one occupation. Full URL list in `market-sources.md`.
```bash
python3 fetch_market.py --search "software developer"
BLS_CONTACT_EMAIL=<your email> python3 fetch_market.py 15-1252.00 --role "Software Engineer" --out onet.json
```
BLS refuses requests without a contact email in the User-Agent; use the email of the person running it.
Codes: 15-1252.00 Software Developers · 15-1254.00 Web Developers · 15-1243.00 Database Architects ·
15-2051.00 Data Scientists. AI and ML engineer roles have no O*NET occupation of their own.
