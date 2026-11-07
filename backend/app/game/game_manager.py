#maintain and track the states of the game and manage 
#and pass ahead the game state to the front end for rendering and display



class GameManager:
    def __init__(self, story_manager):
        self.story_manager = story_manager

        self.current_scene = None
        self.current_chapter = None

        # initialize variables from story.json
        self.player_stats = dict(
            self.story_manager.get_story()["variables"]
        )

        self.choice_history = []
        self.minigame_results = {}
        self.unlocked_lessons = []

        self.game_started = False
        self.game_completed = False
        self.ending = None

    def start_game(self):
        # get the starting scene
        start_scene_id = self.story_manager.get_start_scene()

        self.game_started = True
        self._enter_scene(start_scene_id)

        return self.get_game_state()

    def get_current_scene(self):
        if not self.game_started:
            raise RuntimeError("The game has not started")

        return self.story_manager.get_scene(self.current_scene)

    def get_game_state(self):
        if not self.game_started:
            raise RuntimeError("The game has not started")

        scene = self.get_current_scene()

        return {
            "currentScene": self.current_scene,
            "currentChapter": self.current_chapter,
            "scene": scene,
            "playerStats": self.player_stats,
            "choiceHistory": self.choice_history,
            "minigameResults": self.minigame_results,
            "unlockedLessons": self.unlocked_lessons,
            "gameStarted": self.game_started,
            "gameCompleted": self.game_completed,
            "ending": self.ending
        }

    def _apply_effects(self, effects):
        # apply numerical changes
        for variable, amount in effects.get("add", {}).items():
            if variable not in self.player_stats:
                raise ValueError(f"Unknown variable: {variable}")

            self.player_stats[variable] += amount

        # update boolean or other values
        for variable, value in effects.get("set", {}).items():
            if variable not in self.player_stats:
                raise ValueError(f"Unknown variable: {variable}")

            self.player_stats[variable] = value

    def _enter_scene(self, scene_id):
        # update the current scene
        self.current_scene = scene_id
        scene = self.story_manager.get_scene(scene_id)
        self.current_chapter = scene["chapter"]

        # unlock the scene's lesson
        lesson_id = scene.get("unlockLesson")

        if lesson_id and lesson_id not in self.unlocked_lessons:
            self.story_manager.get_lesson(lesson_id)
            self.unlocked_lessons.append(lesson_id)

        # resolve story branches
        if scene["type"] == "branch":
            next_scene = scene.get("default")

            for branch in scene.get("branches", []):
                condition = branch["if"]
                variable = condition["var"]
                operator = condition["op"]
                value = condition["value"]

                player_value = self.player_stats[variable]

                if operator == ">=" and player_value >= value:
                    next_scene = branch["next"]
                    break
                elif operator == "==" and player_value == value:
                    next_scene = branch["next"]
                    break
                elif operator == ">" and player_value > value:
                    next_scene = branch["next"]
                    break
                elif operator == "<=" and player_value <= value:
                    next_scene = branch["next"]
                    break
                elif operator == "<" and player_value < value:
                    next_scene = branch["next"]
                    break
                elif operator == "!=" and player_value != value:
                    next_scene = branch["next"]
                    break

            if next_scene is None:
                raise ValueError("Branch has no matching destination")

            self._enter_scene(next_scene)

        # check whether the game has ended
        if scene["type"] == "ending":
            self.game_completed = True
            self.ending = scene.get("ending")

    def process_choice(self, choice_id):
        if not self.game_started:
            raise RuntimeError("The game has not started")

        if self.game_completed:
            raise RuntimeError("The game has already ended")

        scene = self.get_current_scene()

        if scene["type"] != "choice":
            raise ValueError("The current scene does not contain choices")

        # retrieve the selected choice
        choice = self.story_manager.get_choice(
            self.current_scene,
            choice_id
        )

        # apply choice effects
        effects = choice.get("effects", {})
        self._apply_effects(effects)

        # record the player's decision
        self.choice_history.append({
            "scene_id": self.current_scene,
            "choice_id": choice_id
        })

        # move to the next scene
        self._enter_scene(choice["next"])

        return self.get_game_state()
