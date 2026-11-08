import Phaser from "phaser";
import DialogueBox from "../components/DialogueBox";
import GalaxyBackground from "../components/GalaxyBackground";
import StoryManager from "../managers/StoryManager";
import type { StoryChoice, StoryData } from "../managers/StoryManager";

export default class StoryScene extends Phaser.Scene {
  private story!: StoryManager;
  private dialogue!: DialogueBox;
  private loadingText!: Phaser.GameObjects.Text;
  private planetImage?: Phaser.GameObjects.Image;
  private princeImage?: Phaser.GameObjects.Image;
  private currentPlanetKey: string = "";

  constructor() {
    super("StoryScene");
  }

  create() {
    const { width, height } = this.scale;

    // Galaxy background
    const galaxy = new GalaxyBackground(this);
    galaxy.create();

    this.loadingText = this.add.text(
      width / 2,
      height / 2,
      "Loading story...",
      {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Georgia"
      }
    ).setOrigin(0.5);

    // Load story from FastAPI
    this.loadStory();
  }

  async loadStory() {
    try {
      const response = await fetch(
        "http://localhost:8000/story"
      );

      if (!response.ok) {
        throw new Error("Could not load story JSON");
      }

      const data: StoryData = await response.json();

      this.story = new StoryManager(data);

      this.loadingText.destroy();

      // Create dialogue interface
      this.dialogue = new DialogueBox(
        this,
        () => this.advanceDialogue(),
        (choice) => this.makeChoice(choice)
      );

      this.showCurrentNode();

    } catch (error) {
      console.error("Story loading error:", error);
      this.loadingText.setText(
        "Could not load the story. Is the backend running?"
      );
    }
  }

  showCurrentNode() {
    const node = this.story.getCurrentNode();

    // Display first line
    const line = this.story.getCurrentLine();
    this.updatePlanet();

    if (line) {
      const speaker = this.story.getSpeaker(line.speaker);

      this.dialogue.showLine(
        line,
        speaker?.name || line.speaker
      );
    } else {
      this.finishNode();
    }
  }

  advanceDialogue() {
    const node = this.story.getCurrentNode();

    if (!this.story.isLastLine()) {
        const line = this.story.nextLine()!;
        const speaker = this.story.getSpeaker(line.speaker);

        this.dialogue.showLine(
        line,
        speaker?.name || line.speaker
        );

        return;
    }

    // The final line of an ending has been reached
    if (node.type === "ending") {
        this.dialogue.showMessage(
        `THE END\n\nHeart score: ${this.story.getHeartScore()} / 8`
        );
        return;
    }

    if (node.type === "choice" && node.choices) {
        this.dialogue.showChoices(node.choices);
        return;
    }

    if (node.type === "minigame") {
        this.startMinigamePlaceholder();
        return;
    }

    this.finishNode();
    }

  makeChoice(choice: StoryChoice) {
    this.story.choose(choice);
    this.showCurrentNode();
  }

  finishNode() {
    const nextNode = this.story.completeDialogue();

    if (nextNode) {
      this.showCurrentNode();
    } else {
      this.dialogue.showMessage(
        "The story has ended. Thank you for playing!"
      );
    }
  }

  // Temporary placeholder until actual minigames are implemented
  startMinigamePlaceholder() {
    const node = this.story.getCurrentNode();
    const outcomes = Object.keys(
      node.minigame?.outcomes ?? {}
    );

    this.dialogue.showMessage(
      `Minigame: ${node.minigame?.id}\n\nChoose an outcome to test the story progression.`
    );

    const choices: StoryChoice[] = outcomes.map(outcome => ({
      id: outcome,
      text: outcome.replaceAll("_", " "),
      next: ""
    }));

    this.dialogue.showChoices(choices);

    // The placeholder buttons use the minigame outcome IDs.
    // Handle these separately from regular story choices.
    this.dialogue.clearChoices();

    outcomes.forEach((outcome, index) => {
      const { width, height } = this.scale;

      const button = this.add.text(
        width / 2,
        height - 65 - index * 48,
        outcome.replaceAll("_", " ").toUpperCase(),
        {
          fontSize: "16px",
          color: "#ffffff",
          backgroundColor: "#526b83",
          padding: { x: 14, y: 10 }
        }
      )
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(110);

      button.on("pointerdown", () => {
        button.destroy();

        this.children.list
          .filter(child =>
            child instanceof Phaser.GameObjects.Text &&
            child.depth === 110
          )
          .forEach(child => child.destroy());

        this.story.resolveMinigame(outcome);
        this.showCurrentNode();
      });
    });
  }

  private updatePlanet() {
    if (!this.story) return;

    const sceneId = this.story.getCurrentSceneId();

    let planetKey = "";

    if (sceneId.startsWith("b612")) {
        planetKey = "planetB612";
    } else if (sceneId.startsWith("king")) {
        planetKey = "planetKing";
    } else if (sceneId.startsWith("businessman") || sceneId.startsWith("biz")) {
        planetKey = "planetBusinessman";
    } else {
        planetKey = "startingPlanet";
    }

    // Don't recreate the planet if we're still on the same one
    if (planetKey === this.currentPlanetKey) return;

    this.currentPlanetKey = planetKey;

    if (this.planetImage) {
        this.planetImage.destroy();
    }

    const { width, height } = this.scale;

    this.planetImage = this.add.image(
        width * 0.72,
        height * 0.43,
        planetKey
    );

    // Adjust planet size
    const scale = Math.min(
        (width * 0.55) / this.planetImage.width,
        (height * 0.75) / this.planetImage.height
    );

    this.planetImage.setScale(scale);
    this.planetImage.setDepth(-5);

    // Add the Little Prince placeholder
    if (!this.princeImage) {
        this.princeImage = this.add.image(
        width * 0.25,
        height * 0.62,
        "prince",
        1
        );

        this.princeImage.setScale(1.2);
        this.princeImage.setDepth(1);
    }
    }
}
