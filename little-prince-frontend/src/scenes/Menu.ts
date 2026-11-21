
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

    // Starting planet background
    const planet = this.add.image(
      width / 2,
      height / 2,
      "startingPlanet"
    );

    const planetScale =
      Math.min(
        width / planet.width,
        height / planet.height
      ) * 0.8;

    planet.setScale(planetScale);

    // Scale the menu for smaller screens
    const menuScale = Math.min(
      1,
      width / 440,
      height / 650
    );

    // Container keeps menu elements aligned
    const menu = this.add.container(
      width / 2,
      height / 2
    );

    // Menu panel
    const panel = this.add.rectangle(
      0,
      0,
      380,
      400,
      0x101b32,
      0.88
    );

    panel.setStrokeStyle(2, 0xA1BB6E);
    menu.add(panel);

    // Game title
    const titleTop = this.add.text(
      0,
      -135,
      "THE",
      {
        fontSize: "35px",
        color: "#EBD247",
        fontFamily: "Over the Rainbow"
      }
    ).setOrigin(0.5);

    const titleMain = this.add.text(
      0,
      -77,
      "LITTLE PRINCE",
      {
        fontSize: "35px",
        color: "#EBD247",
        fontFamily: "Over the Rainbow"
      }
    ).setOrigin(0.5);

    menu.add([titleTop, titleMain]);

    // Divider
    const divider = this.add.text(
      0,
      -50,
      "___________________",
      {
        fontSize: "27px",
        color: "#4E737D",
        fontFamily: "Georgia"
      }
    ).setOrigin(0.5);

    menu.add(divider);

    // Subtitle
    const subtitle = this.add.text(
      0,
      -5,
      "Inspired by the book",
      {
        fontSize: "17px",
        color: "#DAD19D",
        fontFamily: "Indie Flower"
      }
    ).setOrigin(0.5);

    menu.add(subtitle);

    // Start button
    const startButton = this.add.text(
      0,
      125,
      "START JOURNEY",
      {
        fontFamily: "Indie Flower",
        fontStyle: "bold",
        fontSize: "22px",
        color: "#263B35",
        backgroundColor: "#A1BB6E",
        padding: {
          x: 20,
          y: 10
        }
      }
    )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    menu.add(startButton);

    // Hover effects
    startButton.on("pointerover", () => {
      startButton.setStyle({
        backgroundColor: "#C5D89A"
      });
    });

    startButton.on("pointerout", () => {
      startButton.setStyle({
        backgroundColor: "#A1BB6E"
      });
    });

    // Start journey
    startButton.on("pointerdown", () => {
      // Click sound
      if (this.cache.audio.exists("sfx_click")) {
        this.sound.play("sfx_click", {
          volume: 0.6
        });
      }

      // Background music: play once and loop
      if (
        this.cache.audio.exists("music_bg") &&
        !this.sound.get("music_bg")?.isPlaying
      ) {
        this.sound.play("music_bg", {
          loop: true,
          volume: 0.35
        });
      }

      // Show backend loading screen
      this.scene.start("BackendLoadingScene");
    });

    // Press M to mute/unmute
    this.input.keyboard?.on("keydown-M", () => {
      this.sound.setMute(!this.sound.mute);
    });

    // Apply responsive scaling
    menu.setScale(menuScale);

    // Prince above the menu
    const prince = this.add.image(
      width / 2,
      height / 2 - 200 * menuScale - 65 * menuScale,
      "prince",
      1
    );

    prince.setScale(0.8 * menuScale);
  }
}
