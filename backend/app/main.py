"""Little Prince Simulator - backend API.

Run from the backend/ folder:
    uvicorn app.main:app --reload
Then open http://localhost:8000/docs to try the endpoints.
"""
import json
import sqlite3
import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.game.distance_calc import DistanceCalculator
from app.game.game_manager import GameManager
from app.game.planet_service import PLANETS, PlanetService
from app.game.story_manager import StoryManager

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR.parent / "game.db"

story_manager = StoryManager()
STORY: dict[str, Any] = story_manager.get_story()

# One GameManager per player, kept in memory.
games: dict[str, GameManager] = {}

planet_service = PlanetService()
distance_calculator = DistanceCalculator()

# NASA calls are slow, so remember each planet's position for 10 minutes.
PLANET_CACHE_SECONDS = 600
_planet_cache: dict[str, tuple[float, dict[str, Any]]] = {}


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


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def save_choice_row(player_id: str, scene_id: str, choice_id: str) -> None:
    with db() as conn:
        conn.execute(
            "INSERT INTO choices (player_id, scene_id, choice_id, created_at) VALUES (?, ?, ?, ?)",
            (player_id, scene_id, choice_id, now()),
        )


app = FastAPI(title="Little Prince Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChoiceIn(BaseModel):
    player_id: str = Field(min_length=1, examples=["player-123"])
    scene_id: str = Field(examples=["king_02"])
    choice_id: str = Field(examples=["question"])


class ProgressIn(BaseModel):
    player_id: str = Field(min_length=1, examples=["player-123"])
    scene_id: str = Field(examples=["king_01"])
    variables: dict[str, Any] = Field(default_factory=dict, examples=[{"heart": 2, "roseBond": True}])
    lessons: list[str] = Field(default_factory=list, examples=[["busy_grownups", "responsibility"]])


class StartGameIn(BaseModel):
    player_id: Optional[str] = Field(default=None, examples=[None])


class GameChoiceIn(BaseModel):
    choice_id: str = Field(examples=["listen"])


class MinigameIn(BaseModel):
    outcome_id: str = Field(examples=["complete"])


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
    save_choice_row(body.player_id, body.scene_id, body.choice_id)
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


def get_game(player_id: str) -> GameManager:
    game = games.get(player_id)
    if game is None:
        raise HTTPException(404, f"No game for player '{player_id}'. Call POST /game/start first.")
    return game


def run_game_action(action):
    try:
        return action()
    except KeyError as e:
        raise HTTPException(400, str(e.args[0]) if e.args else "Not found")
    except ValueError as e:
        raise HTTPException(400, str(e))
    except RuntimeError as e:
        raise HTTPException(409, str(e))


def advance_game(game: GameManager) -> dict[str, Any]:
    # Uses GameManager.advance() once it exists; until then, does the same thing here.
    if hasattr(game, "advance"):
        return game.advance()
    if game.game_completed:
        raise RuntimeError("The game has already ended")
    scene = game.get_current_scene()
    if scene["type"] != "dialogue":
        raise ValueError(f"The current scene is a '{scene['type']}' scene, not dialogue")
    game._enter_scene(scene["next"])
    return game.get_game_state()


def finish_minigame(game: GameManager, outcome_id: str) -> dict[str, Any]:
    # Uses GameManager.process_minigame() once it exists; until then, does the same thing here.
    if hasattr(game, "process_minigame"):
        return game.process_minigame(outcome_id)
    if game.game_completed:
        raise RuntimeError("The game has already ended")
    scene = game.get_current_scene()
    if scene["type"] != "minigame":
        raise ValueError(f"The current scene is a '{scene['type']}' scene, not a minigame")
    outcome = story_manager.get_minigame_outcome(game.current_scene, outcome_id)
    game._apply_effects(outcome.get("effects", {}))
    game.minigame_results[game.current_scene] = outcome_id
    game._enter_scene(outcome["next"])
    return game.get_game_state()


@app.post("/game/start", status_code=201)
def start_game(body: Optional[StartGameIn] = None):
    player_id = (body.player_id if body and body.player_id else None) or uuid.uuid4().hex[:12]
    game = GameManager(story_manager)
    state = run_game_action(game.start_game)
    games[player_id] = game
    return {"player_id": player_id, **state}


@app.get("/game/{player_id}")
def get_game_state(player_id: str):
    game = get_game(player_id)
    return {"player_id": player_id, **run_game_action(game.get_game_state)}


@app.post("/game/{player_id}/advance")
def advance(player_id: str):
    game = get_game(player_id)
    return {"player_id": player_id, **run_game_action(lambda: advance_game(game))}


@app.post("/game/{player_id}/choice")
def make_choice(player_id: str, body: GameChoiceIn):
    game = get_game(player_id)
    scene_id = game.current_scene
    state = run_game_action(lambda: game.process_choice(body.choice_id))
    save_choice_row(player_id, scene_id, body.choice_id)
    return {"player_id": player_id, **state}


@app.post("/game/{player_id}/minigame")
def complete_minigame(player_id: str, body: MinigameIn):
    game = get_game(player_id)
    scene_id = game.current_scene
    state = run_game_action(lambda: finish_minigame(game, body.outcome_id))
    save_choice_row(player_id, scene_id, body.outcome_id)
    return {"player_id": player_id, **state}


def cached_position(name: str) -> dict[str, Any]:
    name = name.lower()
    if name not in PLANETS:
        raise HTTPException(404, f"Unknown planet '{name}'. Options: {sorted(PLANETS)}")
    hit = _planet_cache.get(name)
    if hit and time.time() - hit[0] < PLANET_CACHE_SECONDS:
        return hit[1]
    try:
        position = planet_service.get_planet_position(name)
    except Exception as e:
        raise HTTPException(502, f"Could not get {name}'s position from NASA: {e}")
    _planet_cache[name] = (time.time(), position)
    return position


@app.get("/planets")
def list_planets():
    return {"planets": sorted(PLANETS)}


@app.get("/planets/distance")
def planet_distance(
    from_planet: str = Query(alias="from", examples=["earth"]),
    to_planet: str = Query(alias="to", examples=["mars"]),
):
    a = cached_position(from_planet)
    b = cached_position(to_planet)
    return {"from": a["planet"], "to": b["planet"], **distance_calculator.calculate_distance(a, b)}

@app.get("/planets/positions")
def all_planet_positions():
    positions = [
        cached_position(name)
        for name in ["earth", "mars", "venus", "jupiter"]
    ]

    return {
        "planets": positions
    }

@app.get("/planets/{name}")
def planet_position(name: str):
    return cached_position(name)
