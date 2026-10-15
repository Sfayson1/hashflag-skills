#!/usr/bin/env python3
"""Re-check every slug in references/companies.json. Run before a release and drop what it says to drop."""
from fetch_postings import fetch_all

results = sorted(fetch_all(), key=lambda r: (not r[3], r[0], r[1]))
for b, c, ps, e in results:
    print(f"{'DROP' if e else 'ok  '} {b}/{c}: {e or f'{len(ps)} jobs'}")
print(f"{sum(1 for r in results if r[3])} of {len(results)} to drop")
