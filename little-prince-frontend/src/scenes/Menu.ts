import Phaser from "phaser";
import GalaxyBackground from "../components/GalaxyBackground";

export default class Menu extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    const { width, height } = this.scale;

    // Galaxy background
    const galaxy = new GalaxyBackground(this);
    galaxy.create();

    // Starting planet background (slightly smaller)
    const planet = this.add.image(
      width / 2,
      height / 2,
      "startingPlanet"
    );

    const planetScale =
      Math.min(width / planet.width, height / planet.height) * 0.8;

    planet.setScale(planetScale);

    const prince = this.add.image(
    width / 2,
    height * 0.17,
    "prince",
    1 // Row 1, Column 2
    );

    prince.setScale(0.8);

    // Menu panel
    this.add.rectangle(
      width / 2,
      height / 2,
      380,
      400,
      0x101b32,
      0.88
    ).setStrokeStyle(2, 0xe8d5ad);

    // Game title
    this.add.text(
      width / 2,
      height / 2 - 140,
      "THE LITTLE PRINCE",
      {
        fontSize: "30px",
        color: "#f8e9c9",
        fontFamily: "Georgia"
      }
    ).setOrigin(0.5);

    // Start button
    const startButton = this.add.text(
      width / 2,
      height / 2 - 30,
      "START JOURNEY",
      {
        fontSize: "22px",
        color: "#ffffff",
        backgroundColor: "#526b83",
        padding: { x: 20, y: 12 }
      }
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startButton.on("pointerdown", () => {
      this.scene.start("GalaxyMapScene");
    });
  }
}