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


## Little Prince Simulator – Setup & Running Instructions

1. Project Overview
The Little Prince Simulator is a 2D story-based decision game built with:
- Frontend: Phaser 3, TypeScript, and Vite
- Backend: Python and FastAPI
- Database: SQLite
- Story Data: JSON (backend/app/data/story.json)
The frontend communicates with the backend to retrieve story data, record player choices, and save player progress.

2. Prerequisites
- Before running the project, make sure you have
- installed:
- Node.js (includes npm)
- Python 3.10 or later
- Git
- A code editor such as Visual Studio Code
You should also have access to the team's GitHub repository.

3. Clone the Repository
Open a terminal and navigate to the folder where you want to store the project.
Run:
```
git clone YOUR_REPOSITORY_URL
```

Navigate into the project:
```
cd YOUR_PROJECT_FOLDER
```

Open the project in VS Code:
```
code .
```

4. Set Up the Backend
The backend uses FastAPI to serve the story data and manage player information.
**Step 1: Navigate to the backend folder**
```
cd backend
```

**Step 2: Create a Python virtual environment**
*Windows:*
```
python -m venv .venv
.venv\Scripts\activate
```

*macOS/Linux:*
```
python3 -m venv .venv
source .venv/bin/activate
```

*Step 3: Install dependencies*
```
pip install -r requirements.txt
```

*Step 4: Start the backend server*
Run:
```
uvicorn app.main:app --reload
```
The backend should now be running at:
http://localhost:8000

*Step 5: Verify the backend*
Open these URLs in your browser:
- http://localhost:8000/ – Backend health check
- http://localhost:8000/story – Retrieves the story JSON
- http://localhost:8000/docs – FastAPI interactive API documentation
Keep this terminal open while playing the game.

5. Set Up the Frontend
The frontend uses Phaser and TypeScript to display the game, characters, planets, dialogue, and player choices.
**Step 1: Open a second terminal**
Keep the backend terminal running. Open another terminal in VS Code.
Navigate to the frontend folder:
```
cd frontend
```
If your folder is named little-prince-frontend, use that folder name instead.
**Step 2: Install dependencies**
Run:
```
npm install
```
This installs the packages listed in package.json, including Phaser and Vite.
**Step 3: Start the frontend**
Run:
```
npm run dev
```
Vite will display a local development URL, usually:
http://localhost:5173
Open that URL in your browser to play the game.
Keep this terminal open as well.

6. Running the Game
You need two terminals running simultaneously:
| **Terminal** | **Directory** | **Command** |
| --- | --- | --- |
| Terminal 1 | backend/ | uvicorn app.main:app --reload |
| --- | --- | --- |
| Terminal 2 | frontend/ | npm run dev |

Once both servers are running:
    1. Open http://localhost:5173.
    2. Start the game from the main menu.
    3. The frontend retrieves the story from the FastAPI backend.
    4. Play through the dialogue and make choices.
**Important:** Start the backend before launching the game so the frontend can successfully retrieve the story.

7. Common Issues
**Backend: uvicorn is not recognized**
Make sure your Python virtual environment is activated and dependencies are installed.
You can also run:
```
python -m uvicorn app.main:app --reload
```

**Backend: ModuleNotFoundError**
Make sure you are running the backend command from the backend/ directory and have installed the dependencies:
```
pip install -r requirements.txt
```

**Frontend: npm is not recognized**
Make sure Node.js is installed. Restart your terminal after installation.

**Frontend: Could not load story**
Check that:
    1. The backend is running.
    2. http://localhost:8000/story opens successfully.
    3. The frontend fetch URL points to:
```
fetch("http://localhost:8000/story");
```

**Frontend: Images or assets are missing**
Make sure the assets are located in the frontend's public/assets/ directory and that the paths used in Phaser match the actual filenames.
#### Quick Start (After Initial Setup)
Every time you want to run the game:
**Terminal 1 – Backend:**
```
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload
```

**Terminal 2 – Frontend:**
```
cd frontend
npm run dev
```
Then open http://localhost:5173 in your browser.
*Note: The frontend directory name and repository URL in these instructions should match the actual names used in the team's GitHub repository.*


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
Text
    Saint-Exupéry,Antoine de.The Little Prince.Translated by Richard Howard,Harcourt,2000.

Character Sprites
    "Buildings collection" by macrovector Under magnific License: Free

    "!$Lamplighter" from The Little Prince-The RPG Maker Game.CanFish.2024.Itch.Io
     https://canfish.itch.io/the-little-prince-rpg/devlog

    "Pixel art girl with computer on blue background. 8 bit illustration." by virtosmedia.123RF
    https://www.123rf.com/free-photo_199272461_pixel-art-girl-with-computer-on-blue-background-8-bit-illustration.html
    
    "!$Prince" from The Little Prince-The RPG Maker Game.CanFish.2024.Itch.Io
    https://canfish.itch.io/the-little-prince-rpg/devlog

    "Retro rpg pixel art character noble old king shown in multiple views, medieval stories, game animation, npc roles, side view sprite sheets, fantasy worlds, top down 8 bit" by Karolina Under Adobe Stock Standard License  

Object Sprite
    "Pixel Art, Pixel Desk, Pixel Table, Pixel Furniture, Wooden Desk, Antique Desk, Retro Style, 8-bit Desk, Pixel Wood, Office Object, png" PNGEGG
    https://www.pngegg.com/en/png-vfgyp
    
    "Pixel Art Medieval Castle Fortress Illustration with Red Flags and Stone Towers for Video Games" by Hayyin Shalihah Under Adobe Stock Standard License

    "Set of pixel art office icons featuring a computer, desk, chair, laptop, printer, and other workspace equipment in a retro 8-bit video game style illustration" by Happy Carrot Under Adobe Stock Standard License

    "spray watering can game pixel art vector illustration Pro Vector" by Pavel Sevryukov Under Vecteezy Pro Standard License

    "Rocket" by Selina Lin 2026

    "RoseOUTLINED" from 12 Flower Pack!.JennPixel.2024.Itch.io
    https://jennpixel.itch.io/free-flower-pack-12-icons

planets assets
    Planets by Kenny (Assets) Under License: CC0 1.0 Universal
    https://kenney-assets.itch.io/planets

Audio
    Marmixer."Deep SPace Journey".pixabay.Nov 8 2026
    https://pixabay.com/music/search/game%20background%20stars/

    "click.mp3".pixabay.Nov 8 2026
    https://pixabay.com/music/search/game%20background%20stars/

NASA JPL API
     NASA JPL.Horizon API.Version 1.3.NASA JPL
     https://ssd-api.jpl.nasa.gov/doc/horizons.html