
import Phaser from "phaser";
import type { StoryChoice, StoryLine } from "../managers/StoryManager";

export default class DialogueBox {
  private scene: Phaser.Scene;
  private panel: Phaser.GameObjects.Rectangle;
  private speakerText: Phaser.GameObjects.Text;
  private dialogueText: Phaser.GameObjects.Text;
  private continueButton: Phaser.GameObjects.Text;
  private choiceObjects: Phaser.GameObjects.Text[] = [];

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

    // Dialogue
    this.dialogueText = scene.add.text(
      80,
      height - 165,
      "",
      {
        fontSize: "18px",
        color: "#E0D3B7",
        fontFamily: "waiting for the sunrise",
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

    this.continueButton.on("pointerdown", () => {
      this.onContinue();
    });
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

  showLine(line: StoryLine, speakerName: string) {
    this.clearChoices();

    this.speakerText.setText(speakerName);
    this.dialogueText.setText(line.text);

    this.continueButton.setVisible(true);
  }

  showChoices(choices: StoryChoice[]) {
    this.clearChoices();
    this.continueButton.setVisible(false);

    const { width, height } = this.scene.scale;

    // More than 2 choices: display horizontally
    // 2 or fewer choices: keep the original vertical layout
    const horizontal = choices.length > 2;

    choices.forEach((choice, index) => {
      let x: number;
      let y: number;

      if (horizontal) {
        const buttonWidth = Math.min(
          220,
          (width - 180 - (choices.length - 1) * 12) / choices.length
        );

        const gap = 12;
        const totalWidth =
          choices.length * buttonWidth + (choices.length - 1) * gap;

        const startX = (width - totalWidth) / 2;

        x = startX + index * (buttonWidth + gap) + buttonWidth / 2;
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
              ? Math.min(200, (width - 180) / choices.length)
              : width - 180
          },
          align: "center"
        }
      )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .setDepth(103);

      // Keep this button off the zooming main camera
      this.scene.cameras.main.ignore(button);
              
      button.on("pointerdown", () => {
        this.clearChoices();
        this.onChoice(choice);
      });

      this.choiceObjects.push(button);
    });
    
  }

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
    this.choiceObjects.forEach(button => button.destroy());
    this.choiceObjects = [];
  }
}
