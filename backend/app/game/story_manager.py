#helps access story in scenes,parts and dialogues here.
#just a helper class to access story in scenes, parts and dialogues here.

import json
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent.parent
STORY_PATH = BASE_DIR / "data" / "story.json"


class StoryManager:
    def __init__(self):
        with open(STORY_PATH, encoding="utf-8") as file:
            self.story: dict[str, Any] = json.load(file)

    def get_story(self) -> dict[str, Any]:
        return self.story

    def get_start_scene(self) -> str:
        return self.story["meta"]["startScene"]

    def get_chapters(self) -> list[dict[str, Any]]:
        return self.story["chapters"]

    def get_chapter(self, chapter_id: str) -> dict[str, Any]:
        for chapter in self.story["chapters"]:
            if chapter["id"] == chapter_id:
                return chapter

        raise KeyError(f"Chapter '{chapter_id}' does not exist")

    def get_scene(self, scene_id: str) -> dict[str, Any]:
        scene = self.story["scenes"].get(scene_id)

        if scene is None:
            raise KeyError(f"Scene '{scene_id}' does not exist")

        return scene

    def get_scenes_for_chapter(
        self, chapter_id: str
    ) -> dict[str, dict[str, Any]]:
        self.get_chapter(chapter_id)

        scenes = {}

        for scene_id, scene in self.story["scenes"].items():
            if scene["chapter"] == chapter_id:
                scenes[scene_id] = scene

        return scenes

    def get_choice(
        self, scene_id: str, choice_id: str
    ) -> dict[str, Any]:
        scene = self.get_scene(scene_id)

        for choice in scene.get("choices", []):
            if choice["id"] == choice_id:
                return choice

        raise KeyError(
            f"Choice '{choice_id}' does not exist in scene '{scene_id}'"
        )

    def get_minigame_outcome(
        self, scene_id: str, outcome_id: str
    ) -> dict[str, Any]:
        scene = self.get_scene(scene_id)
        minigame = scene.get("minigame")

        if minigame is None:
            raise KeyError(f"Scene '{scene_id}' has no minigame")

        outcome = minigame.get("outcomes", {}).get(outcome_id)

        if outcome is None:
            raise KeyError(
                f"Outcome '{outcome_id}' does not exist in scene '{scene_id}'"
            )

        return outcome

    def get_lesson(self, lesson_id: str) -> dict[str, Any]:
        lesson = self.story["lessons"].get(lesson_id)

        if lesson is None:
            raise KeyError(f"Lesson '{lesson_id}' does not exist")

        return lesson
