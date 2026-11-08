# The Little Prince Simulator

A 2D decision game that teaches *The Little Prince* by letting you live it.

It's 3 a.m. in **Davis Hall at UB**, deep into a hackathon. A small boy with golden hair appears behind your chair and asks you to *code him a sheep*. As he tells his story, you travel with him through space: from his home asteroid **B-612**, to the **King's planet**, to the **Businessman's planet**, and back to Davis Hall. Every choice you make shapes how the story ends.

> Inspired by Antoine de Saint-Exupéry's *The Little Prince*. All dialogue in this game is our own original writing.

## Features

- **Choices that matter.** Each choice on each planet changes your *heart* score and story flags. Your choices lead to one of two endings: **The Tamed** or **The Grown-Up**.
- **Lessons journal.** Each chapter unlocks one of the book's ideas (responsibility, authority, owning vs. caring, what is essential is invisible to the eye), so the player learns the story while playing it.
- **Real space data.** The solar system map uses live planet positions from **NASA JPL Horizons**. If NASA can't be reached, the game calculates approximate positions from orbital data, so it never breaks.
- **"What did other players choose?"** Every decision is recorded, and the API reports what percentage of players picked each option.

## Tech stack

| Part | Tech |
|---|---|
| Frontend | TypeScript, [Phaser 4](https://phaser.io), Vite |
| Backend | Python, FastAPI, SQLite |
| Space data | NASA JPL Horizons API |
| Story | One JSON file (`backend/app/data/story.json`) |

## Project structure

```
little-prince-simulator/
├── backend/
│   ├── app/
│   │   ├── main.py              # API endpoints
│   │   ├── data/story.json      # the whole story: scenes, choices, lessons, endings
│   │   └── game/
│   │       ├── story_manager.py # reads the story
│   │       ├── game_manager.py  # game state (scenes, effects, endings)
│   │       ├── planet_service.py# NASA Horizons planet positions
│   │       └── distance_calc.py # distance between planets
│   ├── seed_stats.py            # adds demo players so stats have data
│   └── requirements.txt
└── little-prince-frontend/
    ├── src/
    │   ├── scenes/              # Menu, Davis Hall, solar system, planets
    │   ├── components/          # dialogue box, galaxy background
    │   └── managers/            # StoryManager (plays story.json in the browser)
    └── public/assets/           # sprites, planets, objects
```

## Running it locally

You need **Python 3.11+** and **Node.js 18+**. Use two terminals.

### 1. Backend (terminal 1)

```bash
cd backend
python -m venv .venv
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

pip install -r requirements.txt
python seed_stats.py          # optional: demo data for the stats
uvicorn app.main:app --reload
```

The API runs at **http://localhost:8000**. Interactive docs are at **http://localhost:8000/docs**.

### 2. Frontend (terminal 2)

```bash
cd little-prince-frontend
npm install
npm run dev
```

Open the link Vite prints (usually **http://localhost:5173**). Start the backend first, because the game loads the story from it.

## API

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/` | Health check |
| GET | `/story` | The full story (the frontend loads this once) |
| POST | `/choice` | Record a decision: `{"player_id", "scene_id", "choice_id"}` |
| GET | `/stats/{scene_id}` | Counts and percentages for one decision |
| GET | `/stats/summary` | Percentages for every decision in the game |
| POST | `/progress` | Save a game: `{"player_id", "scene_id", "variables", "lessons"}` |
| GET | `/progress/{player_id}` | Load a saved game |
| GET | `/planets` | Planets available: earth, mars, venus, jupiter |
| GET | `/planets/positions` | Positions of all planets (used by the solar system map) |
| GET | `/planets/{name}` | One planet's position |
| GET | `/planets/distance?from=earth&to=mars` | Distance in AU and km |

Each planet position includes `"source": "nasa"` (live data) or `"source": "approximate"` (calculated offline).

The API can also run the whole game on the server, one player at a time. This is optional, since the frontend plays the story in the browser:

| Method | Endpoint | What it does |
|---|---|---|
| POST | `/game/start` | New game: returns a `player_id` and the first scene |
| GET | `/game/{player_id}` | Current scene, stats, lessons, ending |
| POST | `/game/{player_id}/advance` | Continue past a dialogue scene |
| POST | `/game/{player_id}/choice` | `{"choice_id": "listen"}` |
| POST | `/game/{player_id}/minigame` | `{"outcome_id": "looked"}` |

### Example: record a choice and read the stats

```bash
curl -X POST http://localhost:8000/choice \
  -H "Content-Type: application/json" \
  -d '{"player_id": "p1", "scene_id": "king_02", "choice_id": "question"}'

curl http://localhost:8000/stats/king_02
# {"scene_id":"king_02","total":1,"counts":{"obey":0,"play_along":0,"question":1},
#  "percentages":{"obey":0,"play_along":0,"question":100}}
```

## How the story works

`story.json` is a graph of **scenes**. Each scene has a `type`:

| Type | What happens |
|---|---|
| `dialogue` | Show the `lines`, then go to `next` |
| `choice` | Show the `lines`, then the `choices`. The chosen option's `effects` are applied and the game goes to its `next` |
| `minigame` | The game reports an outcome key (for example `looked` or `kept_counting`) |
| `branch` | No screen. Picks the next scene from conditions (for example `heart >= 5`) |
| `ending` | Final lines, then the lessons journal |

`effects` can `add` to a number (like `heart`) or `set` a flag (like `roseBond`). A scene with `unlockLesson` adds a lesson to the journal.

## Demo data

```bash
python seed_stats.py               # add 60 demo players
python seed_stats.py --players 150 # add more
python seed_stats.py --reset       # remove all demo players
```

Demo players have ids that start with `demo-`, so real players' data is never touched.

## Team

| Role | Focus |
|---|---|
| Frontend | Scenes, dialogue UI, solar system map, sprites |
| Frontend | Planets, characters, art, fonts |
| Backend | Story (`story.json`), API (`main.py`), stats |
| Backend | Game logic (`game/`), NASA planet service |

## Credits

| Character Sprites | 
    "!$Lamplighter" from The Little Prince-The RPG Maker Game.CanFish.2024.Itch.Io
     https://canfish.itch.io/the-little-prince-rpg/devlog

    "Pixel art girl with computer on blue background. 8 bit illustration." by virtosmedia.123RF
    https://www.123rf.com/free-photo_199272461_pixel-art-girl-with-computer-on-blue-background-8-bit-illustration.html
    
    "!$Prince" from The Little Prince-The RPG Maker Game.CanFish.2024.Itch.Io
    https://canfish.itch.io/the-little-prince-rpg/devlog

    "Retro rpg pixel art character noble old king shown in multiple views, medieval stories, game animation, npc roles, side view sprite sheets, fantasy worlds, top down 8 bit" by Karolina Under Adobe Stock Standard License  

| Object Sprite |
    "Pixel Art Medieval Castle Fortress Illustration with Red Flags and Stone Towers for Video Games" by Hayyin Shalihah Under Adobe Stock Standard License

    "Set of pixel art office icons featuring a computer, desk, chair, laptop, printer, and other workspace equipment in a retro 8-bit video game style illustration" by Happy Carrot Under Adobe Stock Standard License

    "spray watering can game pixel art vector illustration Pro Vector" by Pavel Sevryukov Under Vecteezy Pro Standard License

    "Rocket" by Selina Lin 2026

    "RoseOUTLINED" from 12 Flower Pack!.JennPixel.2024.Itch.io
    https://jennpixel.itch.io/free-flower-pack-12-icons

  | planets assets |
    Planets by Kenny (Assets) Under License: CC0 1.0 Universal
    https://kenney-assets.itch.io/planets

| Audio |
