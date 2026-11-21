
import Phaser from "phaser";
import type { StoryChoice, StoryLine } from "../managers/StoryManager";

export default class DialogueBox {
  private scene: Phaser.Scene;
  private panel: Phaser.GameObjects.Rectangle;
  private speakerText: Phaser.GameObjects.Text;
  private dialogueText: Phaser.GameObjects.Text;
  private continueButton: Phaser.GameObjects.Text;

  private choiceObjects: Phaser.GameObjects.Text[] = [];
  private currentChoices: StoryChoice[] = [];
  private selectedChoiceIndex = 0;

  private onContinue: () => void;
  private onChoice: (choice: StoryChoice) => void;

  constructor(
    scene: Phaser.Scene,
    onContinue: () => void,
    onChoice: (choice: StoryChoice) => void
  ) {
    this.scene = scene;
    this.onContinue = onContinue;
    this.onChoice = onChoice;

    const { width, height } = scene.scale;

    // Dialogue panel
    this.panel = scene.add.rectangle(
      width / 2,
      height - 120,
      width - 80,
      190,
      0x101b32,
      0.94
    )
      .setStrokeStyle(2, 0xe8d5ad)
      .setScrollFactor(0)
      .setDepth(100);

    // Speaker name
    this.speakerText = scene.add.text(
      80,
      height - 200,
      "",
      {
        fontSize: "20px",
        color: "#CBA031",
        fontFamily: "Indie Flower",
        fontStyle: "bold"
      }
    )
      .setScrollFactor(0)
      .setDepth(101);

    // Dialogue text
    this.dialogueText = scene.add.text(
      80,
      height - 165,
      "",
      {
        fontSize: "18px",
        color: "#E0D3B7",
        fontFamily: "Georgia",
        wordWrap: {
          width: width - 180
        },
        lineSpacing: 8
      }
    )
      .setScrollFactor(0)
      .setDepth(101);

    // Continue button
    this.continueButton = scene.add.text(
      width - 110,
      height - 55,
      "CONTINUE →",
      {
        fontSize: "16px",
        color: "#E0D3B7",
        backgroundColor: "#4D6B66",
        padding: { x: 12, y: 8 }
      }
    )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .setDepth(102);

    // Mouse click to continue
    this.continueButton.on("pointerdown", () => {
      if (this.continueButton.visible) {
        this.onContinue();
      }
    });

    // Enter handles both dialogue and choices
    this.scene.input.keyboard?.on(
      "keydown-ENTER",
      this.handleEnter,
      this
    );

    // Clean up when leaving the scene
    this.scene.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      this.cleanup,
      this
    );
  }

  getGameObjects(): Phaser.GameObjects.GameObject[] {
    return [
      this.panel,
      this.speakerText,
      this.dialogueText,
      this.continueButton,
      ...this.choiceObjects
    ];
  }

  // --------------------------------
  // NORMAL DIALOGUE
  // --------------------------------

  showLine(line: StoryLine, speakerName: string) {
    this.clearChoices();

    this.speakerText.setText(speakerName);
    this.dialogueText.setText(line.text);

    this.continueButton.setVisible(true);
  }

  // --------------------------------
  // CHOICES
  // --------------------------------

  showChoices(choices: StoryChoice[]) {
    this.clearChoices();
    this.continueButton.setVisible(false);

    this.currentChoices = [...choices];
    this.selectedChoiceIndex = 0;

    const { width, height } = this.scene.scale;

    // More than 2 choices: horizontal
    // 2 or fewer choices: vertical
    const horizontal = choices.length > 2;

    choices.forEach((choice, index) => {
      let x: number;
      let y: number;

      if (horizontal) {
        const buttonWidth = Math.min(
          220,
          (width - 180 - (choices.length - 1) * 12) /
            choices.length
        );

        const gap = 12;

        const totalWidth =
          choices.length * buttonWidth +
          (choices.length - 1) * gap;

        const startX = (width - totalWidth) / 2;

        x =
          startX +
          index * (buttonWidth + gap) +
          buttonWidth / 2;

        y = height - 85;
      } else {
        x = width / 2;
        y = height - 65 - index * 48;
      }

      const button = this.scene.add.text(
        x,
        y,
        choice.text,
        {
          fontSize: "16px",
          color: "#E0D3B7",
          backgroundColor: "#4D6B66",
          padding: { x: 14, y: 10 },
          wordWrap: {
            width: horizontal
              ? Math.min(
                  200,
                  (width - 180) / choices.length
                )
              : width - 180
          },
          align: "center"
        }
      )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .setDepth(103);

      // Keep choice buttons off the zooming camera
      this.scene.cameras.main.ignore(button);

      // Mouse hover highlights choice
      button.on("pointerover", () => {
        this.highlightChoice(index);
      });

      // Mouse click selects choice
      button.on("pointerdown", () => {
        this.selectChoice(index);
      });

      this.choiceObjects.push(button);
    });

    // Highlight first choice
    this.highlightChoice(0);

    // Enable keyboard navigation
    const keyboard = this.scene.input.keyboard;

    keyboard?.on(
      "keydown-TAB",
      this.handleChoiceTab,
      this
    );

    keyboard?.on(
      "keydown-UP",
      this.handleChoiceArrow,
      this
    );

    keyboard?.on(
      "keydown-DOWN",
      this.handleChoiceArrow,
      this
    );

    keyboard?.on(
      "keydown-LEFT",
      this.handleChoiceArrow,
      this
    );

    keyboard?.on(
      "keydown-RIGHT",
      this.handleChoiceArrow,
      this
    );
  }

  // --------------------------------
  // KEYBOARD CONTROLS
  // --------------------------------

  // Enter continues dialogue or selects a choice
  private handleEnter = (event: KeyboardEvent) => {
    event.preventDefault();

    // Prevent holding Enter from skipping lines
    if (event.repeat) return;

    // Choices are visible: select highlighted choice
    if (this.choiceObjects.length > 0) {
      this.selectChoice(this.selectedChoiceIndex);
      return;
    }

    // Normal dialogue: continue
    if (this.continueButton.visible) {
      this.onContinue();
    }
  };

  // Tab / Shift + Tab navigation
  private handleChoiceTab = (event: KeyboardEvent) => {
    if (this.choiceObjects.length === 0) return;

    event.preventDefault();

    if (event.repeat) return;

    const direction = event.shiftKey ? -1 : 1;

    this.highlightChoice(
      this.selectedChoiceIndex + direction
    );
  };

  // Arrow key navigation
  private handleChoiceArrow = (event: KeyboardEvent) => {
    if (this.choiceObjects.length === 0) return;

    event.preventDefault();

    if (event.repeat) return;

    const next =
      event.key === "ArrowDown" ||
      event.key === "ArrowRight";

    const previous =
      event.key === "ArrowUp" ||
      event.key === "ArrowLeft";

    if (next) {
      this.highlightChoice(this.selectedChoiceIndex + 1);
    } else if (previous) {
      this.highlightChoice(this.selectedChoiceIndex - 1);
    }
  };

  // --------------------------------
  // HIGHLIGHT SELECTED CHOICE
  // --------------------------------

  private highlightChoice(index: number) {
    if (this.choiceObjects.length === 0) return;

    const count = this.choiceObjects.length;

    // Wrap around at first/last choice
    this.selectedChoiceIndex =
      ((index % count) + count) % count;

    this.choiceObjects.forEach((button, i) => {
      const selected = i === this.selectedChoiceIndex;

      button.setStyle({
        backgroundColor: selected
          ? "#A1BB6E"
          : "#4D6B66",
        color: selected
          ? "#263B35"
          : "#E0D3B7"
      });
    });
  }

  // --------------------------------
  // SELECT CHOICE
  // --------------------------------

  private selectChoice(index: number) {
    const choice = this.currentChoices[index];

    if (!choice) return;

    // Remove choice buttons and keyboard listeners
    this.clearChoices();

    // Notify StoryChapterScene
    this.onChoice(choice);
  }

  // --------------------------------
  // OTHER DIALOGUE METHODS
  // --------------------------------

  showMessage(message: string) {
    this.clearChoices();

    this.continueButton.setVisible(false);
    this.speakerText.setText("");
    this.dialogueText.setText(message);
  }

  showContinue() {
    this.continueButton.setVisible(true);
  }

  clearChoices() {
    const keyboard = this.scene.input.keyboard;

    // Remove keyboard navigation listeners
    keyboard?.off(
      "keydown-TAB",
      this.handleChoiceTab,
      this
    );

    keyboard?.off(
      "keydown-UP",
      this.handleChoiceArrow,
      this
    );

    keyboard?.off(
      "keydown-DOWN",
      this.handleChoiceArrow,
      this
    );

    keyboard?.off(
      "keydown-LEFT",
      this.handleChoiceArrow,
      this
    );

    keyboard?.off(
      "keydown-RIGHT",
      this.handleChoiceArrow,
      this
    );

    // Destroy choice buttons
    this.choiceObjects.forEach(button => {
      button.destroy();
    });

    this.choiceObjects = [];
    this.currentChoices = [];
    this.selectedChoiceIndex = 0;
  }

  // --------------------------------
  // CLEANUP
  // --------------------------------

  private cleanup() {
    this.scene.input.keyboard?.off(
      "keydown-ENTER",
      this.handleEnter,
      this
    );

    this.clearChoices();
  }
}
