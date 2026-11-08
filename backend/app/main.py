
"""
Little Prince Simulator - backend API.

Run from the backend/ folder:
    uvicorn app.main:app --reload

Then open:
    http://localhost:8000/docs
"""

import json
import math
import sqlite3
import threading
import time
import uuid

from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.game.distance_calc import DistanceCalculator
from app.game.game_manager import GameManager
from app.game.planet_service import PLANETS, PlanetService
from app.game.story_manager import StoryManager
from app.game.traj_planner import TrajectoryPlanner
from app.game.traj_gen import TrajectoryGenerator


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR.parent / "game.db"


# ================================================================
# STORY AND GAME LOGIC
# ================================================================

story_manager = StoryManager()
STORY: dict[str, Any] = story_manager.get_story()

games: dict[str, GameManager] = {}

planet_service = PlanetService()
distance_calculator = DistanceCalculator()

trajectory_planner = TrajectoryPlanner()
trajectory_generator = TrajectoryGenerator()


def valid_options(scene_id: str) -> set[str]:
    """Choice IDs or minigame outcomes available in a scene."""

    scene = STORY["scenes"].get(scene_id)

    if scene is None:
        raise HTTPException(
            404,
            f"Scene '{scene_id}' does not exist"
        )

    options = {
        choice["id"]
        for choice in scene.get("choices", [])
    }

    if scene.get("minigame"):
        options |= set(scene["minigame"]["outcomes"])

    return options


# ================================================================
# DATABASE
# ================================================================

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
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id TEXT NOT NULL,
                scene_id TEXT NOT NULL,
                choice_id TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_choices_scene
            ON choices(scene_id);

            CREATE TABLE IF NOT EXISTS progress (
                player_id TEXT PRIMARY KEY,
                scene_id TEXT NOT NULL,
                variables TEXT NOT NULL,
                lessons TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )


init_db()


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def save_choice_row(
    player_id: str,
    scene_id: str,
    choice_id: str
) -> None:

    with db() as conn:
        conn.execute(
            """
            INSERT INTO choices
            (player_id, scene_id, choice_id, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (player_id, scene_id, choice_id, now()),
        )


def count_choices(scene_id: str) -> dict[str, Any]:
    """Count player choices for a scene."""

    options = valid_options(scene_id)

    with db() as conn:
        rows = conn.execute(
            """
            SELECT choice_id, COUNT(*) AS n
            FROM choices
            WHERE scene_id = ?
            GROUP BY choice_id
            """,
            (scene_id,)
        ).fetchall()

    counts = {
        option: 0
        for option in sorted(options)
    }

    for row in rows:
        if row["choice_id"] in counts:
            counts[row["choice_id"]] = row["n"]

    total = sum(counts.values())

    return {
        "total": total,
        "counts": counts,
        "percentages": {
            key: round(100 * value / total) if total else 0
            for key, value in counts.items()
        }
    }


# ================================================================
# PLANETS: NASA + OFFLINE FALLBACK
# ================================================================

PLANET_CACHE_SECONDS = 600
PLANET_RETRY_SECONDS = 60
NASA_TIMEOUT_SECONDS = 8

_planet_cache: dict[
    str,
    tuple[float, dict[str, Any]]
] = {}

_nasa_pool = ThreadPoolExecutor(max_workers=4)

_ORBITS = {
    "venus": {
        "a": 0.72333,
        "L0": 181.97980,
        "n": 1.6021302
    },
    "earth": {
        "a": 1.00000,
        "L0": 100.46457,
        "n": 0.9856091
    },
    "mars": {
        "a": 1.52371,
        "L0": -4.55343,
        "n": 0.5240329
    },
    "jupiter": {
        "a": 5.20289,
        "L0": 34.39644,
        "n": 0.0830853
    }
}

_J2000 = datetime(
    2000,
    1,
    1,
    12,
    tzinfo=timezone.utc
)


def approximate_position(name: str) -> dict[str, Any]:
    """Calculate an approximate heliocentric position."""

    when = datetime.now(timezone.utc)
    orbit = _ORBITS[name]

    days = (
        when - _J2000
    ).total_seconds() / 86400

    angle = math.radians(
        (orbit["L0"] + orbit["n"] * days) % 360
    )

    return {
        "planet": name,
        "x": orbit["a"] * math.cos(angle),
        "y": orbit["a"] * math.sin(angle),
        "z": 0.0,
        "unit": "AU",
        "date": when.isoformat(),
        "source": "approximate"
    }


def get_position(name: str) -> dict[str, Any]:
    """Get a planet position using NASA or a local fallback."""

    name = name.lower()

    if name not in PLANETS:
        raise HTTPException(
            404,
            f"Unknown planet '{name}'. Options: {sorted(PLANETS)}"
        )

    cached = _planet_cache.get(name)

    if cached and time.time() < cached[0]:
        return cached[1]

    try:
        future = _nasa_pool.submit(
            planet_service.get_planet_position,
            name
        )

        position = dict(
            future.result(timeout=NASA_TIMEOUT_SECONDS)
        )

        position["source"] = "nasa"

        _planet_cache[name] = (
            time.time() + PLANET_CACHE_SECONDS,
            position
        )

        return position

    except Exception as error:
        print(
            f"[planets] NASA failed for {name}: {error!r}. "
            "Using fallback."
        )

        position = (
            cached[1]
            if cached
            else approximate_position(name)
        )

        _planet_cache[name] = (
            time.time() + PLANET_RETRY_SECONDS,
            position
        )

        return position


def warm_planet_cache() -> None:
    """Warm the NASA position cache at startup."""

    for name in PLANETS:
        _nasa_pool.submit(get_position, name)


# ================================================================
# FASTAPI APP
# ================================================================

app = FastAPI(
    title="Little Prince Simulator API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.on_event("startup")
def startup_event():
    """Warm planetary positions when the API starts."""

    threading.Thread(
        target=warm_planet_cache,
        daemon=True
    ).start()


# ================================================================
# REQUEST BODIES
# ================================================================

class ChoiceIn(BaseModel):
    player_id: str = Field(
        min_length=1,
        examples=["player-123"]
    )

    scene_id: str = Field(
        examples=["king_02"]
    )

    choice_id: str = Field(
        examples=["question"]
    )


class ProgressIn(BaseModel):
    player_id: str = Field(
        min_length=1,
        examples=["player-123"]
    )

    scene_id: str = Field(
        examples=["king_01"]
    )

    variables: dict[str, Any] = Field(
        default_factory=dict,
        examples=[{"heart": 2, "roseBond": True}]
    )

    lessons: list[str] = Field(
        default_factory=list,
        examples=[["busy_grownups", "responsibility"]]
    )


class StartGameIn(BaseModel):
    player_id: Optional[str] = Field(
        default=None,
        examples=[None],
        description="Leave empty to get a new ID"
    )


class GameChoiceIn(BaseModel):
    choice_id: str = Field(
        examples=["listen"]
    )


class MinigameIn(BaseModel):
    outcome_id: str = Field(
        examples=["complete"]
    )


class TrajectoryRequest(BaseModel):
    from_planet: str = Field(
        examples=["earth"]
    )

    to_planet: str = Field(
        examples=["mars"]
    )

    departure_start: datetime
    departure_end: datetime

    flight_duration_min: float = 150
    flight_duration_max: float = 200

    departure_step_days: float = 5
    duration_step_days: float = 10


# ================================================================
# STORY, CHOICES AND STATS
# ================================================================

@app.get("/")
def health():
    return {
        "status": "ok",
        "title": STORY["meta"]["title"],
        "version": STORY["meta"]["version"]
    }


@app.get("/story")
def get_story():
    """Return the full story."""

    return STORY


@app.post("/choice", status_code=201)
def record_choice(body: ChoiceIn):
    """Record a player choice."""

    options = valid_options(body.scene_id)

    if body.choice_id not in options:
        raise HTTPException(
            400,
            f"'{body.choice_id}' is not a choice in "
            f"'{body.scene_id}'. Options: {sorted(options)}"
        )

    save_choice_row(
        body.player_id,
        body.scene_id,
        body.choice_id
    )

    return {"ok": True}


@app.get("/stats/summary")
def get_stats_summary():
    """Return choice statistics for every decision."""

    decisions = []

    for scene_id, scene in STORY["scenes"].items():

        if scene["type"] == "choice":
            labels = {
                choice["id"]: choice["text"]
                for choice in scene["choices"]
            }

        elif (
            scene["type"] == "minigame"
            and len(scene["minigame"]["outcomes"]) > 1
        ):
            labels = {
                key: key.replace("_", " ")
                for key in scene["minigame"]["outcomes"]
            }

        else:
            continue

        stats = count_choices(scene_id)

        decisions.append({
            "scene_id": scene_id,
            "chapter": scene["chapter"],
            "total": stats["total"],
            "options": [
                {
                    "choice_id": choice_id,
                    "text": labels[choice_id],
                    "count": stats["counts"][choice_id],
                    "percent": stats["percentages"][choice_id]
                }
                for choice_id in labels
            ]
        })

    return {"decisions": decisions}


@app.get("/stats/{scene_id}")
def get_stats(scene_id: str):
    """Return choice statistics for one scene."""

    if not valid_options(scene_id):
        raise HTTPException(
            400,
            f"Scene '{scene_id}' has no choices"
        )

    return {
        "scene_id": scene_id,
        **count_choices(scene_id)
    }


@app.post("/progress")
def save_progress(body: ProgressIn):
    """Save a player's game progress."""

    valid_options(body.scene_id)

    with db() as conn:
        conn.execute(
            """
            INSERT INTO progress
            (player_id, scene_id, variables, lessons, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(player_id) DO UPDATE SET
                scene_id = excluded.scene_id,
                variables = excluded.variables,
                lessons = excluded.lessons,
                updated_at = excluded.updated_at
            """,
            (
                body.player_id,
                body.scene_id,
                json.dumps(body.variables),
                json.dumps(body.lessons),
                now()
            )
        )

    return {"ok": True}


@app.get("/progress/{player_id}")
def load_progress(player_id: str):
    """Load a player's saved progress."""

    with db() as conn:
        row = conn.execute(
            "SELECT * FROM progress WHERE player_id = ?",
            (player_id,)
        ).fetchone()

    if row is None:
        raise HTTPException(
            404,
            "No saved progress for this player"
        )

    return {
        "player_id": row["player_id"],
        "scene_id": row["scene_id"],
        "variables": json.loads(row["variables"]),
        "lessons": json.loads(row["lessons"]),
        "updated_at": row["updated_at"]
    }


# ================================================================
# GAME ENDPOINTS
# ================================================================

def get_game(player_id: str) -> GameManager:
    game = games.get(player_id)

    if game is None:
        raise HTTPException(
            404,
            f"No game for player '{player_id}'. "
            "Call POST /game/start first."
        )

    return game


def run_game_action(action):
    """Convert game errors into HTTP errors."""

    try:
        return action()

    except KeyError as error:
        raise HTTPException(
            400,
            str(error.args[0]) if error.args else "Not found"
        )

    except ValueError as error:
        raise HTTPException(400, str(error))

    except RuntimeError as error:
        raise HTTPException(409, str(error))


def advance_game(game: GameManager) -> dict[str, Any]:
    """Advance past a dialogue scene."""

    if hasattr(game, "advance"):
        return game.advance()

    if game.game_completed:
        raise RuntimeError("The game has already ended")

    scene = game.get_current_scene()

    if scene["type"] != "dialogue":
        raise ValueError(
            f"The current scene is a '{scene['type']}' scene, "
            "not dialogue"
        )

    game._enter_scene(scene["next"])

    return game.get_game_state()


def finish_minigame(
    game: GameManager,
    outcome_id: str
) -> dict[str, Any]:

    """Apply a minigame outcome."""

    if hasattr(game, "process_minigame"):
        return game.process_minigame(outcome_id)

    if game.game_completed:
        raise RuntimeError("The game has already ended")

    scene = game.get_current_scene()

    if scene["type"] != "minigame":
        raise ValueError(
            f"The current scene is a '{scene['type']}' scene, "
            "not a minigame"
        )

    outcome = story_manager.get_minigame_outcome(
        game.current_scene,
        outcome_id
    )

    game._apply_effects(
        outcome.get("effects", {})
    )

    game.minigame_results[game.current_scene] = outcome_id

    game._enter_scene(outcome["next"])

    return game.get_game_state()


@app.post("/game/start", status_code=201)
def start_game(body: Optional[StartGameIn] = None):
    """Start a new game."""

    player_id = (
        body.player_id
        if body and body.player_id
        else None
    ) or uuid.uuid4().hex[:12]

    game = GameManager(story_manager)

    state = run_game_action(game.start_game)

    games[player_id] = game

    return {
        "player_id": player_id,
        **state
    }


@app.get("/game/{player_id}")
def get_game_state(player_id: str):
    """Get the player's current game state."""

    game = get_game(player_id)

    return {
        "player_id": player_id,
        **run_game_action(game.get_game_state)
    }


@app.post("/game/{player_id}/advance")
def advance(player_id: str):
    """Continue past a dialogue scene."""

    game = get_game(player_id)

    return {
        "player_id": player_id,
        **run_game_action(
            lambda: advance_game(game)
        )
    }


@app.post("/game/{player_id}/choice")
def make_choice(
    player_id: str,
    body: GameChoiceIn
):
    """Process a choice."""

    game = get_game(player_id)
    scene_id = game.current_scene

    state = run_game_action(
        lambda: game.process_choice(body.choice_id)
    )

    save_choice_row(
        player_id,
        scene_id,
        body.choice_id
    )

    return {
        "player_id": player_id,
        **state
    }


@app.post("/game/{player_id}/minigame")
def complete_minigame(
    player_id: str,
    body: MinigameIn
):
    """Process a minigame result."""

    game = get_game(player_id)
    scene_id = game.current_scene

    state = run_game_action(
        lambda: finish_minigame(game, body.outcome_id)
    )

    save_choice_row(
        player_id,
        scene_id,
        body.outcome_id
    )

    return {
        "player_id": player_id,
        **state
    }


# ================================================================
# PLANET ENDPOINTS
# ================================================================

@app.get("/planets")
def list_planets():
    """List supported planets."""

    return {
        "planets": sorted(PLANETS)
    }


@app.get("/planets/positions")
def all_planet_positions():
    """Return the positions of all four planets."""

    names = [
        "earth",
        "mars",
        "venus",
        "jupiter"
    ]

    positions = list(
        _nasa_pool.map(get_position, names)
    )

    return {
        "planets": positions
    }


@app.get("/planets/distance")
def planet_distance(
    from_planet: str = Query(
        alias="from",
        examples=["earth"]
    ),
    to_planet: str = Query(
        alias="to",
        examples=["mars"]
    )
):
    """Calculate the current distance between two planets."""

    a = get_position(from_planet)
    b = get_position(to_planet)

    return {
        "from": a["planet"],
        "to": b["planet"],
        "source": (
            "nasa"
            if a["source"] == b["source"] == "nasa"
            else "approximate"
        ),
        **distance_calculator.calculate_distance(a, b)
    }


@app.get("/planets/{name}")
def planet_position(name: str):
    """Get one planet's current position."""

    return get_position(name)


# ================================================================
# POST TRAJECTORY ENDPOINT
# ================================================================

@app.post("/trajectory")
def calculate_trajectory(body: TrajectoryRequest):
    """
    Explicitly calculate a trajectory using supplied dates
    and transfer search settings.
    """

    from_planet = body.from_planet.lower()
    to_planet = body.to_planet.lower()

    if from_planet not in PLANETS:
        raise HTTPException(
            400,
            f"Unknown departure planet: {from_planet}"
        )

    if to_planet not in PLANETS:
        raise HTTPException(
            400,
            f"Unknown arrival planet: {to_planet}"
        )

    if from_planet == to_planet:
        raise HTTPException(
            400,
            "Departure and arrival planets must be different"
        )

    if body.departure_end < body.departure_start:
        raise HTTPException(
            400,
            "departure_end must be after departure_start"
        )

    try:
        transfer = trajectory_planner.find_best_transfer(
            from_planet=from_planet,
            to_planet=to_planet,
            departure_start=body.departure_start,
            departure_end=body.departure_end,
            flight_duration_min=body.flight_duration_min,
            flight_duration_max=body.flight_duration_max,
            departure_step_days=body.departure_step_days,
            duration_step_days=body.duration_step_days
        )

        departure_date = datetime.fromisoformat(
            transfer["departure_date"]
        )

        arrival_date = datetime.fromisoformat(
            transfer["arrival_date"]
        )

        departure_state = planet_service.get_planet_position(
            from_planet,
            departure_date
        )

        arrival_state = planet_service.get_planet_position(
            to_planet,
            arrival_date
        )

        trajectory = trajectory_generator.generate_trajectory(
            departure_state=departure_state,
            arrival_state=arrival_state,
            transfer=transfer,
            num_points=201
        )

        return {
            "transfer": transfer,
            "trajectory": trajectory,
            "departure_state": departure_state,
            "arrival_state": arrival_state
        }

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(400, str(error))

    except Exception as error:
        raise HTTPException(
            502,
            f"Transfer planning failed: {error}"
        )


# ================================================================
# GET TRAJECTORY + LIVE PROGRESS
# ================================================================

trajectory_cache: dict[
    tuple[str, str],
    dict[str, Any]
] = {}

trajectory_progress: dict[
    tuple[str, str],
    dict[str, Any]
] = {}

cached_simulations: set[
    tuple[str, str]
] = set()

simulation_lock = threading.Lock()


def simulate_cached_progress(
    cache_key: tuple[str, str],
    cached_result: dict[str, Any]
) -> None:
    """
    Replay progress for a cached trajectory.

    This does not perform new orbital calculations.
    """

    transfer = cached_result["transfer"]
    total_steps = 21

    print(
        f"Replaying cached trajectory: "
        f"{cache_key[0]} -> {cache_key[1]}"
    )

    try:
        for step in range(total_steps + 1):

            trajectory_progress[cache_key] = {
                "stage": "searching",
                "completed": step,
                "total": total_steps,
                "departure_date": transfer["departure_date"],
                "flight_duration_days": transfer["flight_duration_days"],
                "best_delta_v": (
                    transfer["total_delta_v"]
                    if step > 0 else None
                ),
                "departure_delta_v": (
                    transfer["departure_delta_v"]
                    if step > 0 else None
                ),
                "arrival_delta_v": (
                    transfer["arrival_delta_v"]
                    if step > 0 else None
                ),
                "cached": True
            }

            time.sleep(0.15)

        trajectory_progress[cache_key] = {
            "stage": "generating",
            "completed": total_steps,
            "total": total_steps,
            "departure_date": transfer["departure_date"],
            "flight_duration_days": transfer["flight_duration_days"],
            "best_delta_v": transfer["total_delta_v"],
            "departure_delta_v": transfer["departure_delta_v"],
            "arrival_delta_v": transfer["arrival_delta_v"],
            "cached": True
        }

        time.sleep(0.15)

        trajectory_progress[cache_key] = {
            "stage": "complete",
            "completed": total_steps,
            "total": total_steps,
            "departure_date": transfer["departure_date"],
            "flight_duration_days": transfer["flight_duration_days"],
            "best_delta_v": transfer["total_delta_v"],
            "departure_delta_v": transfer["departure_delta_v"],
            "arrival_delta_v": transfer["arrival_delta_v"],
            "cached": True
        }

        print("Cached trajectory replay complete!")

    except Exception as error:
        print(
            f"Cached progress replay failed: {error}"
        )

        trajectory_progress[cache_key] = {
            "stage": "error",
            "message": str(error),
            "cached": True
        }

    finally:
        with simulation_lock:
            cached_simulations.discard(cache_key)


@app.get("/trajectory")
def get_trajectory(
    from_planet: str,
    to_planet: str
):
    """
    Return a trajectory for the frontend.

    Cached routes are returned immediately.
    New routes are calculated with real progress updates.
    """

    from_planet = from_planet.lower()
    to_planet = to_planet.lower()

    valid_planets = {
        "earth",
        "mars",
        "venus",
        "jupiter"
    }

    if from_planet not in valid_planets:
        raise HTTPException(
            400,
            f"Invalid departure planet: {from_planet}"
        )

    if to_planet not in valid_planets:
        raise HTTPException(
            400,
            f"Invalid destination planet: {to_planet}"
        )

    if from_planet == to_planet:
        raise HTTPException(
            400,
            "Departure and destination planets must be different"
        )

    cache_key = (from_planet, to_planet)

    # --------------------------------------------------
    # CHECK CACHE
    # --------------------------------------------------

    if cache_key in trajectory_cache:

        print(
            f"Using cached trajectory: "
            f"{from_planet} -> {to_planet}"
        )

        cached_result = trajectory_cache[cache_key]

        with simulation_lock:

            if cache_key not in cached_simulations:

                cached_simulations.add(cache_key)

                trajectory_progress[cache_key] = {
                    "stage": "starting",
                    "completed": 0,
                    "total": 21,
                    "departure_date": cached_result["transfer"]["departure_date"],
                    "flight_duration_days": cached_result["transfer"]["flight_duration_days"],
                    "best_delta_v": None,
                    "departure_delta_v": None,
                    "arrival_delta_v": None,
                    "cached": True
                }

                thread = threading.Thread(
                    target=simulate_cached_progress,
                    args=(cache_key, cached_result),
                    daemon=True
                )

                thread.start()

        return cached_result

    # --------------------------------------------------
    # CALCULATE NEW TRAJECTORY
    # --------------------------------------------------

    print(
        f"Calculating new trajectory: "
        f"{from_planet} -> {to_planet}"
    )

    trajectory_progress[cache_key] = {
        "stage": "starting",
        "completed": 0,
        "total": 0,
        "departure_date": None,
        "flight_duration_days": None,
        "best_delta_v": None,
        "departure_delta_v": None,
        "arrival_delta_v": None,
        "cached": False
    }

    try:
        departure_start = datetime.now(timezone.utc)
        departure_end = departure_start + timedelta(days=30)

        transfer = trajectory_planner.find_best_transfer(
            from_planet=from_planet,
            to_planet=to_planet,
            departure_start=departure_start,
            departure_end=departure_end,
            flight_duration_min=100,
            flight_duration_max=400,
            departure_step_days=15,
            duration_step_days=50,

            progress_callback=lambda update: trajectory_progress.update({
                cache_key: {
                    **update,
                    "cached": False
                }
            })
        )

        print("Best transfer found!")

        departure_date = datetime.fromisoformat(
            transfer["departure_date"]
        )

        arrival_date = datetime.fromisoformat(
            transfer["arrival_date"]
        )

        departure_state = planet_service.get_planet_position(
            from_planet,
            departure_date
        )

        arrival_state = planet_service.get_planet_position(
            to_planet,
            arrival_date
        )

        trajectory_progress[cache_key] = {
            **trajectory_progress[cache_key],
            "stage": "generating"
        }

        trajectory = trajectory_generator.generate_trajectory(
            departure_state=departure_state,
            arrival_state=arrival_state,
            transfer=transfer,
            num_points=201
        )

        print("Trajectory generated!")

        print(
            f"Number of points: "
            f"{trajectory['num_points']}"
        )

        print(
            f"Arrival error: "
            f"{trajectory['arrival_error_au']} AU"
        )

        result = {
            "transfer": transfer,
            "trajectory": trajectory
        }

        trajectory_cache[cache_key] = result

        trajectory_progress[cache_key] = {
            "stage": "complete",
            "completed": 1,
            "total": 1,
            "departure_date": transfer["departure_date"],
            "flight_duration_days": transfer["flight_duration_days"],
            "best_delta_v": transfer["total_delta_v"],
            "departure_delta_v": transfer["departure_delta_v"],
            "arrival_delta_v": transfer["arrival_delta_v"],
            "cached": False
        }

        return result

    except Exception as error:

        print(
            f"Trajectory calculation failed: {error}"
        )

        trajectory_progress[cache_key] = {
            "stage": "error",
            "message": str(error),
            "cached": False
        }

        if isinstance(error, HTTPException):
            raise

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# ================================================================
# TRAJECTORY PROGRESS ENDPOINT
# ================================================================

@app.get("/trajectory/progress")
def get_trajectory_progress(
    from_planet: str,
    to_planet: str
):
    """Return the current progress for a route."""

    cache_key = (
        from_planet.lower(),
        to_planet.lower()
    )

    return trajectory_progress.get(
        cache_key,
        {"stage": "waiting"}
    )
