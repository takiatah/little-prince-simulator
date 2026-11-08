"""Fill game.db with demo playthroughs so /stats shows real-looking percentages.

Run from the backend/ folder (the server can be running or not):
    python seed_stats.py              # add 60 demo players
    python seed_stats.py --players 150
    python seed_stats.py --reset      # remove all demo players again

Demo players have ids starting with "demo-", so real players are never touched.
Each demo player plays a full path through story.json, so the numbers are consistent.
"""
import argparse
import json
import random
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
STORY_PATH = BACKEND_DIR / "app" / "data" / "story.json"
DB_PATH = BACKEND_DIR / "game.db"
DEMO_PREFIX = "demo-"

# How likely a demo player is to pick each option (anything not listed = weight 1).
# Most players lean toward the "caring" choices, like a real audience would.
WEIGHTS = {
    "listen": 3, "ignore": 1,
    "stay": 2, "leave": 1,
    "question": 3, "obey": 1, "play_along": 1.5,
    "accept_title": 1, "help_count": 1, "what_for": 2,
    "looked": 3, "kept_counting": 1,
    "accept_stars": 1, "refuse_stars": 2.5,
    "code_alone": 1, "find_team": 3,
}


def ensure_tables(conn: sqlite3.Connection) -> None:
    # Same table as app/main.py, so this works even before the server has run once.
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS choices (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id  TEXT NOT NULL,
            scene_id   TEXT NOT NULL,
            choice_id  TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )


def pick(options: list[str], rng: random.Random) -> str:
    return rng.choices(options, weights=[WEIGHTS.get(o, 1) for o in options])[0]


def play_once(story: dict, rng: random.Random) -> list[tuple[str, str]]:
    """Walk one path through the story and return (scene_id, choice_id) pairs."""
    picks = []
    scene_id = story["meta"]["startScene"]
    heart = 0
    for _ in range(500):  # safety limit
        scene = story["scenes"][scene_id]
        kind = scene["type"]
        if kind == "ending":
            break
        if kind == "dialogue":
            scene_id = scene["next"]
        elif kind == "choice":
            choices = {c["id"]: c for c in scene["choices"]}
            chosen = pick(list(choices), rng)
            picks.append((scene_id, chosen))
            heart += choices[chosen].get("effects", {}).get("add", {}).get("heart", 0)
            scene_id = choices[chosen]["next"]
        elif kind == "minigame":
            outcomes = scene["minigame"]["outcomes"]
            chosen = pick(list(outcomes), rng)
            picks.append((scene_id, chosen))
            heart += outcomes[chosen].get("effects", {}).get("add", {}).get("heart", 0)
            scene_id = outcomes[chosen]["next"]
        elif kind == "branch":
            scene_id = scene["default"]
            for b in scene["branches"]:
                if b["if"]["var"] == "heart" and b["if"]["op"] == ">=" and heart >= b["if"]["value"]:
                    scene_id = b["next"]
                    break
    return picks


def main() -> None:
    parser = argparse.ArgumentParser(description="Add demo players to game.db")
    parser.add_argument("--players", type=int, default=60, help="how many demo players to add (default 60)")
    parser.add_argument("--reset", action="store_true", help="delete all demo players and stop")
    parser.add_argument("--seed", type=int, default=None, help="random seed, for repeatable numbers")
    args = parser.parse_args()

    conn = sqlite3.connect(DB_PATH)
    ensure_tables(conn)

    if args.reset:
        deleted = conn.execute("DELETE FROM choices WHERE player_id LIKE ?", (DEMO_PREFIX + "%",)).rowcount
        conn.commit()
        print(f"Removed {deleted} demo choices.")
        return

    with open(STORY_PATH, encoding="utf-8") as f:
        story = json.load(f)

    rng = random.Random(args.seed)
    start = datetime.now(timezone.utc) - timedelta(hours=12)
    rows = []
    for _ in range(args.players):
        player_id = f"{DEMO_PREFIX}{rng.getrandbits(40):010x}"
        played_at = start + timedelta(minutes=rng.randint(0, 12 * 60))
        for step, (scene_id, choice_id) in enumerate(play_once(story, rng)):
            rows.append((player_id, scene_id, choice_id, (played_at + timedelta(seconds=40 * step)).isoformat()))

    conn.executemany(
        "INSERT INTO choices (player_id, scene_id, choice_id, created_at) VALUES (?, ?, ?, ?)", rows
    )
    conn.commit()
    total_demo = conn.execute(
        "SELECT COUNT(DISTINCT player_id) FROM choices WHERE player_id LIKE ?", (DEMO_PREFIX + "%",)
    ).fetchone()[0]
    print(f"Added {args.players} demo players ({len(rows)} choices). Demo players in database: {total_demo}.")
    print("Check them at http://localhost:8000/stats/summary")


if __name__ == "__main__":
    main()
