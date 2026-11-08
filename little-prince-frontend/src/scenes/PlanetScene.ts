import StoryChapterScene from "./StoryChapterScene";
import type { PlanetName } from "./StoryChapterScene";

export default class PlanetScene extends StoryChapterScene {
  constructor() {
    super("PlanetScene");
  }

  create(data: { planet: PlanetName }) {
    super.create(data);
  }
}