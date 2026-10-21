---
title: "Trail Counter: one JSON file and a CSV for the parks board"
date: 2026-10-16
author: "Mara Quill"
description: "How a two-file Node CLI records trailhead counts for Alder Bay Parks, and what it still doesn't do."
tags: ["case-study", "node", "cli"]
repo: "fixtures/project"
---

## The problem

Alder Bay Parks volunteers count hikers at trailheads, and the town wants those numbers in its spreadsheet (`README.md:5`). Before this tool there was no shared place to put a reading, and no way to get them out again in one file.

## What was built

- An `add` command that records a trail, a count and a date, with the date defaulting to today (`src/cli.js:20-24`).
- A `list` command that shows readings newest first, for one trail or for all of them (`src/cli.js:25-26`, `src/store.js:17-21`).
- A `csv` command that prints the readings as CSV with quoted fields (`src/cli.js:12-15`, `src/cli.js:27-28`).
- Storage in one JSON file, `readings.json` by default, with `TRAIL_COUNTER_FILE` to put it elsewhere (`src/store.js:4-14`).

Claimed in the README but not in the code: the monthly PDF report (`README.md:12`). The `report` command is in the help text (`src/cli.js:10`) but has no handler; it falls through to the usage message (`src/cli.js:29-30`). The `pdfPageSize` setting (`package.json:13`) is read by nothing.

## Key decisions and trade-offs

- Readings live in one JSON file instead of SQLite: one dependency fewer, and volunteers can open the file in a text editor. The ceiling is a few thousand readings per file (commit "Record and list readings", Mara Quill).
- Dates are stored as ISO strings and sorted as text, so there is no date library and no time zone handling (`src/store.js:20`).

## What's next

- The monthly report for the parks board, as a PDF or a printable page (`ROADMAP.md:3`).
- Importing the paper tally sheets from before the tool existed, once they are typed up (`ROADMAP.md:4`).
- A `remove` command for mistaken readings (`ROADMAP.md:5`).

## How to run it

Node 22 (`.github/workflows/ci.yml:9`). There are no dependencies to install.

```sh
node src/cli.js add Ridge 12 2026-05-03
node src/cli.js csv
```

Those two lines are the CI smoke test (`package.json:9`).
