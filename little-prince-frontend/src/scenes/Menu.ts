import Phaser from "phaser";

export class Menu extends Phaser.Scene {
  constructor() {
    super("MainMenu");
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(
      0, 0, width, height, 0x10182b
    ).setOrigin(0);

    // Window showing the night sky
    this.add.rectangle(
      width * 0.72,
      height * 0.36,
      400,
      300,
      0x172b4a
    ).setStrokeStyle(5, 0x8b7890);

    // Stars outside the window
    for (let i = 0; i < 90; i++) {
      const x = Phaser.Math.Between(
        width * 0.52, width * 0.92
      );
      const y = Phaser.Math.Between(
        height * 0.13, height * 0.58
      );

      const star = this.add.circle(
        x, y,
        Phaser.Math.Between(1, 3),
        0xffedc2
      );

      this.tweens.add({
        targets: star,
        alpha: 0.2,
        duration: Phaser.Math.Between(800, 2200),
        yoyo: true,
        repeat: -1
      });
    }

    // Moon
    this.add.circle(
      width * 0.84,
      height * 0.25,
      27,
      0xf3dfb1
    );

    // Desk
    this.add.rectangle(
      width * 0.72,
      height * 0.83,
      550,
      28,
      0x795d4e
    );

    // Computer monitor
    this.add.rectangle(
      width * 0.72,
      height * 0.68,
      210,
      135,
      0x292d3c
    ).setStrokeStyle(5, 0x8c8491);

    // Screen
    this.add.rectangle(
      width * 0.72,
      height * 0.68,
      190,
      115,
      0x111c2b
    );

    // Code on screen
    this.add.text(
      width * 0.65,
      height * 0.64,
      "function journey() {\n  // TODO: fix this...\n}",
      {
        fontSize: "11px",
        color: "#a8d6b8",
        fontFamily: "monospace",
        lineSpacing: 5
      }
    );

    // Blinking cursor
    const cursor = this.add.rectangle(
      width * 0.65,
      height * 0.75,
      7,
      12,
      0xffffff
    );

    this.tweens.add({
      targets: cursor,
      alpha: 0,
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    // Game title
    this.add.text(
      width * 0.27,
      height * 0.25,
      "THE STARS\nWE KEEP",
      {
        fontSize: "54px",
        color: "#f5e8cb",
        fontFamily: "Georgia",
        fontStyle: "bold",
        align: "center",
        lineSpacing: 10
      }
    ).setOrigin(0.5);

    this.add.text(
      width * 0.27,
      height * 0.39,
      "Some things cannot be counted.",
      {
        fontSize: "17px",
        color: "#c9c5d4",
        fontFamily: "Georgia",
        fontStyle: "italic"
      }
    ).setOrigin(0.5);

    // Buttons
    this.createButton(
      width * 0.27,
      height * 0.57,
      "BEGIN JOURNEY",
      () => this.scene.start("Prologue")
    );

    this.createButton(
      width * 0.27,
      height * 0.67,
      "CONTINUE STORY",
      () => this.scene.start("Prologue")
    );

    this.createButton(
      width * 0.27,
      height * 0.77,
      "ABOUT",
      () => this.showAbout()
    );

    // Footer
    this.add.text(
      width / 2,
      height * 0.95,
      "A little journey through a universe of meaning.",
      {
        fontSize: "13px",
        color: "#aaaec1",
        fontFamily: "Georgia"
      }
    ).setOrigin(0.5);
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    callback: () => void
  ) {
    const background = this.add.rectangle(
      x, y, 245, 48, 0x55517d
    ).setStrokeStyle(1, 0xd8bd83);

    const text = this.add.text(x, y, label, {
      fontSize: "16px",
      color: "#ffffff",
      fontFamily: "Georgia"
    }).setOrigin(0.5);

    background.setInteractive({
      useHandCursor: true
    });

    background.on("pointerover", () => {
      background.setFillStyle(0x8175a8);
      text.setScale(1.05);
    });

    background.on("pointerout", () => {
      background.setFillStyle(0x55517d);
      text.setScale(1);
    });

    background.on("pointerdown", callback);
  }

  private showAbout() {
    const { width, height } = this.scale;

    const overlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.8
    ).setInteractive();

    const message = this.add.text(
      width / 2,
      height / 2,
      "THE STARS WE KEEP\n\nA story about connection,\nresponsibility, and the things\nthat truly matter.\n\nClick anywhere to return.",
      {
        fontSize: "22px",
        color: "#f5e8cb",
        fontFamily: "Georgia",
        align: "center",
        lineSpacing: 12
      }
    ).setOrigin(0.5);

    overlay.on("pointerdown", () => {
      overlay.destroy();
      message.destroy();
    });
  }
}


