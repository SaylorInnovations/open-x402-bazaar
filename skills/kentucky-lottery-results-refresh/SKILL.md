---
name: kentucky-lottery-results-refresh
description: Refresh Kentucky Lottery winning-number CSVs from the official public results feed, preserve separate draw types, and report real per-game coverage and source limits.
---

# Kentucky Lottery results refresh

Use the included `scripts/fetch_ky_lottery.py` to download public results from the Kentucky Lottery feed and write one CSV per game plus a combined CSV. The feed does not require credentials. Review the script and its current source URL before running it; public endpoints can change.

Run:

```sh
python3 scripts/fetch_ky_lottery.py /path/to/output-directory
```

The output includes the game, draw date, draw identifier, session, status, draw type, primary numbers, special number, multiplier, and estimated jackpot. Numbers use hyphens within a field. Secondary results such as Powerball Double Play remain separate rows, identified by `draw_type`.

After a run, report the actual oldest and newest date for each game from the script output or generated CSVs. The official feed is mixed across games and has a finite recent-history window; frequent-draw games may cover only a few days. Do not describe the files as complete historical archives, assume a newest result is current without checking its date, or silently reuse stale rows. Deeper history requires a separate source and validation.
