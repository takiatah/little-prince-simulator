import Phaser from "phaser";
import DialogueBox from "../components/DialogueBox";
import GalaxyBackground from "../components/GalaxyBackground";
import StoryManager from "../managers/StoryManager";
import type { StoryChoice, StoryData } from "../managers/StoryManager";

export default class StoryScene extends Phaser.Scene {
  private story!: StoryManager;
  private dialogue!: DialogueBox;
  private loadingText!: Phaser.GameObjects.Text;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;

  private planetImage?: Phaser.GameObjects.Image;
  private princeImage?: Phaser.GameObjects.Image;
  private kingImage?: Phaser.GameObjects.Sprite;
  private introPrompt?: Phaser.GameObjects.Text;

  private currentPlanetKey: string = "";
  private introComplete = false;

  private minigameButtons: Phaser.GameObjects.Text[] = [];

  constructor() {
    super("StoryScene");
  }

  create() {
    // Create galaxy background.
    const galaxy = new GalaxyBackground(this);
    galaxy.create();

    // Main camera renders the game world.
    const mainCamera = this.cameras.main;
    mainCamera.setZoom(1);

    // Second camera renders UI at normal size.
    this.uiCamera = this.cameras.add(
      0,
      0,
      this.scale.width,
      this.scale.height
    );

    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setZoom(1);

    // UI camera initially ignores all existing world objects.
    this.uiCamera.ignore(this.children.list);

    const { width, height } = this.scale;

    this.loadingText = this.add.text(
      width / 2,
      height / 2,
      "Loading story...",
      {
        fontSize: "24px",
        color: "#ffffff",
        fontFamily: "Georgia",
      }
    ).setOrigin(0.5);

    // Loading text should appear on the main camera.
    this.uiCamera.ignore(this.loadingText);

    this.loadStory();
  }

  async loadStory() {
    try {
      const response = await fetch("http://localhost:8000/story");

      if (!response.ok) {
        throw new Error("Could not load story JSON");
      }

      const data: StoryData = await response.json();

      this.story = new StoryManager(data);

      this.loadingText.destroy();

      this.updatePlanet();
      this.showPlanetIntro();

    } catch (error) {
      console.error("Story loading error:", error);

      this.loadingText.setText(
        "Could not load the story. Is the backend running?"
      );
    }
  }

  // Initial screen before the story begins.
  private showPlanetIntro() {
    const { width, height } = this.scale;

    this.introPrompt = this.add.text(
      width / 2,
      height - 100,
      "PRESS ENTER TO BEGIN",
      {
        fontSize: "22px",
        color: "#ffffff",
        fontFamily: "Georgia",
      }
    )
      .setOrigin(0.5)
      .setDepth(10);

    // Keep intro prompt on the main camera.
    this.uiCamera.ignore(this.introPrompt);

    const enterKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );

    enterKey?.once("down", () => {
      this.introPrompt?.destroy();
      this.zoomIntoPlanet();
    });
  }

  // Camera zooms toward the top of the planet.
  // Sprites stay in their original world positions.
  private zoomIntoPlanet() {
    if (!this.planetImage) return;

    const camera = this.cameras.main;

    const targetX = this.planetImage.x;
    const targetY =
      this.planetImage.y - this.planetImage.displayHeight * 0.35;

    camera.pan(
      targetX,
      targetY,
      1200,
      "Sine.easeInOut"
    );

    camera.once("camerapancomplete", () => {
      camera.zoomTo(
        1.6,
        1000,
        "Sine.easeInOut"
      );

      camera.once("camerazoomcomplete", () => {
        this.introComplete = true;
        this.startDialogue();
      });
    });
  }

  private startDialogue() {
    this.dialogue = new DialogueBox(
      this,
      () => this.advanceDialogue(),
      (choice) => this.makeChoice(choice)
    );

    // Main camera must not render dialogue objects.
    this.cameras.main.ignore(
      this.dialogue.getGameObjects()
    );

    // UI camera renders the dialogue objects.
    // World objects have already been excluded from it.

    this.showCurrentNode();
  }

  showCurrentNode() {
    if (!this.introComplete) return;

    const node = this.story.getCurrentNode();
    const line = this.story.getCurrentLine();

    this.updatePlanet();

    // Automatically process branch nodes.
    if (node.type === "branch") {
      this.finishNode();
      return;
    }

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

  // Temporary minigame outcome selection.
  startMinigamePlaceholder() {
    this.clearMinigameButtons();

    const node = this.story.getCurrentNode();

    const outcomes = Object.keys(
      node.minigame?.outcomes ?? {}
    );

    this.dialogue.showMessage(
      `Minigame: ${node.minigame?.id}\n\nChoose an outcome to test the story progression.`
    );

    const { width, height } = this.scale;

    outcomes.forEach((outcome, index) => {
      const button = this.add.text(
        width / 2,
        height - 65 - index * 48,
        outcome.replaceAll("_", " ").toUpperCase(),
        {
          fontSize: "16px",
          color: "#ffffff",
          backgroundColor: "#526b83",
          padding: { x: 14, y: 10 },
        }
      )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .setDepth(110);

      // Main camera ignores UI button.
      this.cameras.main.ignore(button);

      // UI camera can render this button.
      // It is not in the UI camera's ignore list.

      button.on("pointerdown", () => {
        this.clearMinigameButtons();

        this.story.resolveMinigame(outcome);

        this.showCurrentNode();
      });

      this.minigameButtons.push(button);
    });
  }

  private clearMinigameButtons() {
    this.minigameButtons.forEach(button => button.destroy());
    this.minigameButtons = [];
  }

  // Change the planet based on the current story chapter.
  private updatePlanet() {
    if (!this.story) return;

    const sceneId = this.story.getCurrentSceneId();

    let planetKey = "";

    if (sceneId.startsWith("b612")) {
      planetKey = "planetB612";
    } else if (sceneId.startsWith("king")) {
      planetKey = "planetKing";
    } else if (
      sceneId.startsWith("businessman") ||
      sceneId.startsWith("biz")
    ) {
      planetKey = "planetBusinessman";
    } else {
      planetKey = "startingPlanet";
    }

    if (planetKey === this.currentPlanetKey) return;

    this.currentPlanetKey = planetKey;

    // Remove previous planet and characters.
    this.planetImage?.destroy();
    this.princeImage?.destroy();
    this.kingImage?.destroy();

    const { width, height } = this.scale;

    // Create planet.
    this.planetImage = this.add.image(
      width / 2,
      height / 2 - 40,
      planetKey
    );

    const planetScale = Math.min(
      (width * 0.65) / this.planetImage.width,
      (height * 0.85) / this.planetImage.height
    );

    this.planetImage.setScale(planetScale);
    this.planetImage.setDepth(-5);

    // Exclude planet from UI camera.
    this.uiCamera.ignore(this.planetImage);

    // Estimate planet radius for character positioning.
    const radius = this.planetImage.displayWidth / 2;

    // Create Little Prince (second sprite in first row).
    this.princeImage = this.add.image(
      width / 2 - radius * 0.18,
      height / 2 - 40 - radius * 0.55,
      "prince",
      1
    );

    this.princeImage.setOrigin(0.5, 1);
    this.princeImage.setScale(1.2);
    this.princeImage.setDepth(2);

    // Exclude Prince from UI camera.
    this.uiCamera.ignore(this.princeImage);

    // Create King (second sprite in first row).
    this.kingImage = this.add.sprite(
      width / 2 + radius * 0.18,
      height / 2 - 40 - radius * 0.55,
      "king",
      1
    );

    this.kingImage.setOrigin(0.5, 1);
    this.kingImage.setScale(0.8);
    this.kingImage.setDepth(2);

    // Exclude King from UI camera.
    this.uiCamera.ignore(this.kingImage);
  }
}
