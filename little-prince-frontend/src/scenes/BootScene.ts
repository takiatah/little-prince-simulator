import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.image(
      "startingPlanet",
      "/assets/planets/Planets/planet05.png"
    );
    this.load.spritesheet(
    "prince",
    "/assets/characters/!$Prince.png",
    {
        frameWidth: 168/3,
        frameHeight: 304/4
    }
    );
    this.load.image(
        "planetB612",
        "/assets/planets/Planets/planet04.png"
    );

    this.load.image(
        "planetKing",
        "/assets/planets/Planets/planet08.png"
    );

    this.load.image(
        "planetBusinessman",
        "/assets/planets/Planets/planet01.png"
    );
  }

  create() {
    this.scene.start("MenuScene");
  }
}