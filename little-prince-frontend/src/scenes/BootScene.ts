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
        frameWidth: 50,
        frameHeight: 100
    }
    );
  }

  create() {
    this.scene.start("MenuScene");
  }
}