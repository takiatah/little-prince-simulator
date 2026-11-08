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
    this.load.spritesheet(
    "king",
    "/assets/characters/king.png",
    {
        frameWidth: 323/4,
        frameHeight: 360/4
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
        "rose",
        "/assets/objects/RoseOUTLINED.png"
    );
    this.load.image(
        "planetBusinessman",
        "/assets/planets/Planets/planet01.png"
    );
    this.load.image(
        "rocket",
        "/assets/objects/Rocket.png"
    );
  }

  create() {
    this.scene.start("MenuScene");
  }
}