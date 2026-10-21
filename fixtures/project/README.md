# Trail Counter

> Fictional. Example input for the project-demo skill. Alder Bay is the fictional town from the other fixtures in this folder.

A command-line tool for the Alder Bay Parks volunteers who count hikers at trailheads. Readings go into one JSON file, and `csv` exports them for the town's spreadsheet.

## Features

- Record a reading with the trail name, the count and the date.
- List readings for one trail or for all of them, newest first.
- Export readings to CSV.
- Export a monthly PDF report for the parks board.

## Install

    npm install
    node src/cli.js --help

## Commands

    add <trail> <count> [date]
    list [trail]
    csv [trail]
    report <month>

Set `TRAIL_COUNTER_FILE` to keep the readings somewhere other than `readings.json`.
