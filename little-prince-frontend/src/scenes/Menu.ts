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
    ).setStrokeStyle(2, 0xFFA1BB6E);

    // Game title
    this.add.text(
      width / 2,
      height / 2 - 135,
      "THE",
      {
        fontSize: "35px",
        color: "#EBD247",
        fontFamily: "Over the Rainbow"
      }
    ).setOrigin(0.5);
    this.add.text(
      width / 2,
      height / 2 - 77,
      "LITTLE PRINCE",
      {
        fontSize: "35px",
        color: "#EBD247",
        fontFamily: "Over the Rainbow"
      }
    ).setOrigin(0.5);

    //UB HACKING PROJECT
    this.add.text(
      width / 2,
      height / 2 - 5,
      "Inspired by the book",
      {
        fontSize: "17px",
        color: "#dad19d",
        fontFamily: "Indie Flower"
      }
    ).setOrigin(0.5);

    //divider
        this.add.text(
      width / 2,
      height / 2-50,
      "___________________",
      {
        fontSize: "27px",
        color: "#4e737d ",
        fontFamily: "Georgia"
      }
    ).setOrigin(0.5);

    // Start button
    const startButton = this.add.text(
      width / 2,
      height / 1 -220,
      "START JOURNEY",
      {
        fontFamily: "Indie Flower",
        fontStyle: "bold",
        fontSize: "22px",
        color: "#B94126",
        backgroundColor: "#a1bb6e",
        padding: { x: 20, y: 10 }
      }
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startButton.on("pointerdown", () => {
      // Click sound (only if it loaded)
      if (this.cache.audio.exists("sfx_click")) {
        this.sound.play("sfx_click", { volume: 0.6 });
      }

      // Background music: loops for the whole game, never starts twice
      if (this.cache.audio.exists("music_bg") && !this.sound.get("music_bg")?.isPlaying) {
        this.sound.play("music_bg", { loop: true, volume: 0.35 });
      }

      this.scene.start("DavisScene");
    });

    // Press M to mute/unmute
    this.input.keyboard?.on("keydown-M", () => {
      this.sound.mute = !this.sound.mute;
    });
  }
}
