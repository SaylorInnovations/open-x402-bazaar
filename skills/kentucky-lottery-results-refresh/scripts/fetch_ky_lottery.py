#!/usr/bin/env python3
"""
Fetch KY Lottery draw results from the public front-end API kylottery.com's own
site uses (kys-v2.p1.awc.lotteryservices.net) and write one CSV per game plus a
combined CSV into the Obsidian vault.

The API has no per-game filter and no true deep-history endpoint: it returns a
single feed mixing every game's draws together, paginated 100-at-a-time, oldest
reachable by paging further back. High-frequency games (Keno draws roughly every
4 minutes, Cash Pop several times/day) dominate each page, so deep backfill is
only realistic for the weekly/near-weekly games. This script pages a bounded
number of times and reports, per game, exactly how far back it actually reached
so nothing is silently truncated without saying so.
"""
import csv
import json
import sys
import time
import urllib.request
from collections import defaultdict
from datetime import datetime
from zoneinfo import ZoneInfo

API_KEY = "2Sizlki7TWFuQf8vG2NPy5wVDOjCXl6PW"  # public key embedded in kylottery.com's own page JS
BASE = "https://kys-v2.p1.awc.lotteryservices.net/api/v2/draw-games/draws"
PAGE_SIZE = 100
MAX_PAGES = 20          # safety cap on requests -- the feed plateaus around page ~10 in practice
MAX_DRAWS_TOTAL = 6000  # safety cap on combined items paged through
REQUEST_DELAY_S = 0.3   # be polite
ET = ZoneInfo("America/New_York")


def fetch_page(start_item):
    url = f"{BASE}?previous-draws={MAX_DRAWS_TOTAL}&next-draws=0&size={PAGE_SIZE}&start-item={start_item}"
    req = urllib.request.Request(url, headers={"X-Esa-Api-Key": API_KEY, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def ms_to_local(ms):
    return datetime.fromtimestamp(ms / 1000, tz=ET).strftime("%Y-%m-%d %H:%M ET")


def main():
    by_game = defaultdict(list)
    seen_ids = set()
    start_item = 1
    pages = 0
    total_seen = 0

    while True:
        pages += 1
        page = fetch_page(start_item)
        draws = page.get("draws", [])
        if not draws:
            break
        for d in draws:
            key = (d["gameName"], d["id"])
            if key in seen_ids:
                continue
            seen_ids.add(key)
            total_seen += 1
            for r in d.get("results", []):
                by_game[d["gameName"]].append({
                    "draw_date_et": ms_to_local(d["drawTime"]) if d.get("drawTime") else "",
                    "draw_time_ms": d.get("drawTime", ""),
                    "draw_id": d.get("id", ""),
                    "draw_cdc": d.get("drawCdc", ""),
                    "session": d.get("name", ""),          # e.g. MIDDAY/EVENING for Pick 3/4
                    "status": d.get("status", ""),
                    "draw_type": r.get("drawType", "Regular"),
                    "primary_numbers": "-".join(r.get("primary", [])),
                    "special_number": "-".join(r.get("secondary", [])),
                    "multiplier": r.get("multiplier", ""),
                    "estimated_jackpot": d.get("estimatedJackpot", ""),
                })
        next_url = page.get("nextPageUrl")
        print(f"page {pages}: +{len(draws)} draws (total {total_seen})", file=sys.stderr)
        if not next_url or pages >= MAX_PAGES or total_seen >= MAX_DRAWS_TOTAL:
            break
        start_item += PAGE_SIZE
        time.sleep(REQUEST_DELAY_S)

    return by_game, pages, total_seen


if __name__ == "__main__":
    import os
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out_dir, exist_ok=True)

    by_game, pages, total_seen = main()

    fieldnames = ["game", "draw_date_et", "draw_id", "draw_cdc", "session", "status",
                  "draw_type", "primary_numbers", "special_number", "multiplier", "estimated_jackpot"]

    combined_path = os.path.join(out_dir, "ky-lottery-all-games.csv")
    with open(combined_path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        summary = []
        for game, rows in sorted(by_game.items()):
            rows.sort(key=lambda r: r["draw_time_ms"], reverse=True)
            game_slug = game.lower().replace(" ", "-")
            game_path = os.path.join(out_dir, f"ky-lottery-{game_slug}.csv")
            with open(game_path, "w", newline="") as gf:
                gw = csv.DictWriter(gf, fieldnames=fieldnames)
                gw.writeheader()
                for row in rows:
                    out_row = {"game": game, **{k: v for k, v in row.items() if k != "draw_time_ms"}}
                    gw.writerow(out_row)
                    w.writerow(out_row)
            oldest = rows[-1]["draw_date_et"]
            newest = rows[0]["draw_date_et"]
            summary.append((game, len(rows), oldest, newest))

    print(f"\nDone. {pages} pages, {total_seen} unique draws seen.\n", file=sys.stderr)
    print(f"{'Game':<16} {'Rows':>6}  {'Oldest':<18} {'Newest':<18}", file=sys.stderr)
    for game, n, oldest, newest in sorted(summary, key=lambda x: -x[1]):
        print(f"{game:<16} {n:>6}  {oldest:<18} {newest:<18}", file=sys.stderr)
