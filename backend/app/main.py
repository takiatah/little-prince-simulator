"""Little Prince Simulator - backend API.

Run from the backend/ folder:
    uvicorn app.main:app --reload
Then open http://localhost:8000/docs to try the endpoints.
"""
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
STORY_PATH = BASE_DIR / "data" / "story.json"
DB_PATH = BASE_DIR.parent / "game.db"

# TODO: when story.py is ready, replace this with:
#   from app.models.story import load_story
#   STORY = load_story().model_dump(by_alias=True)
with open(STORY_PATH, encoding="utf-8") as f:
    STORY: dict[str, Any] = json.load(f)


def valid_options(scene_id: str) -> set[str]:
    scene = STORY["scenes"].get(scene_id)
    if scene is None:
        raise HTTPException(404, f"Scene '{scene_id}' does not exist")
    options = {c["id"] for c in scene.get("choices", [])}
    if scene.get("minigame"):
        options |= set(scene["minigame"]["outcomes"])
    return options


@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with db() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS choices (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id  TEXT NOT NULL,
                scene_id   TEXT NOT NULL,
                choice_id  TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_choices_scene ON choices(scene_id);

            CREATE TABLE IF NOT EXISTS progress (
                player_id  TEXT PRIMARY KEY,
                scene_id   TEXT NOT NULL,
                variables  TEXT NOT NULL,
                lessons    TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )


init_db()

app = FastAPI(title="Little Prince Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ChoiceIn(BaseModel):
    player_id: str = Field(min_length=1, examples=["player-123"])
    scene_id: str = Field(examples=["king_02"])
    choice_id: str = Field(examples=["question"])


class ProgressIn(BaseModel):
    player_id: str = Field(min_length=1, examples=["player-123"])
    scene_id: str = Field(examples=["king_01"])
    variables: dict[str, Any] = Field(default_factory=dict, examples=[{"heart": 2, "roseBond": True}])
    lessons: list[str] = Field(default_factory=list, examples=[["busy_grownups", "responsibility"]])


@app.get("/")
def health():
    return {"status": "ok", "title": STORY["meta"]["title"], "version": STORY["meta"]["version"]}


@app.get("/story")
def get_story():
    return STORY


@app.post("/choice", status_code=201)
def record_choice(body: ChoiceIn):
    options = valid_options(body.scene_id)
    if body.choice_id not in options:
        raise HTTPException(
            400, f"'{body.choice_id}' is not a choice in '{body.scene_id}'. Options: {sorted(options)}"
        )
    with db() as conn:
        conn.execute(
            "INSERT INTO choices (player_id, scene_id, choice_id, created_at) VALUES (?, ?, ?, ?)",
            (body.player_id, body.scene_id, body.choice_id, now()),
        )
    return {"ok": True}


@app.get("/stats/{scene_id}")
def get_stats(scene_id: str):
    options = valid_options(scene_id)
    if not options:
        raise HTTPException(400, f"Scene '{scene_id}' has no choices")
    with db() as conn:
        rows = conn.execute(
            "SELECT choice_id, COUNT(*) AS n FROM choices WHERE scene_id = ? GROUP BY choice_id",
            (scene_id,),
        ).fetchall()
    counts = {opt: 0 for opt in sorted(options)}
    for r in rows:
        counts[r["choice_id"]] = r["n"]
    total = sum(counts.values())
    return {
        "scene_id": scene_id,
        "total": total,
        "counts": counts,
        "percentages": {k: round(100 * v / total) if total else 0 for k, v in counts.items()},
    }


@app.post("/progress")
def save_progress(body: ProgressIn):
    valid_options(body.scene_id)
    with db() as conn:
        conn.execute(
            """
            INSERT INTO progress (player_id, scene_id, variables, lessons, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(player_id) DO UPDATE SET
                scene_id = excluded.scene_id,
                variables = excluded.variables,
                lessons = excluded.lessons,
                updated_at = excluded.updated_at
            """,
            (body.player_id, body.scene_id, json.dumps(body.variables), json.dumps(body.lessons), now()),
        )
    return {"ok": True}


@app.get("/progress/{player_id}")
def load_progress(player_id: str):
    with db() as conn:
        row = conn.execute("SELECT * FROM progress WHERE player_id = ?", (player_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "No saved progress for this player")
    return {
        "player_id": row["player_id"],
        "scene_id": row["scene_id"],
        "variables": json.loads(row["variables"]),
        "lessons": json.loads(row["lessons"]),
        "updated_at": row["updated_at"],
    }
