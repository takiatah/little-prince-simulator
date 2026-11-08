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
    this.load.spritesheet(
    "girl",
    "/assets/characters/girl.png",
    {
        frameWidth: 200/4, 
        frameHeight: 280/4 
    }
    );
    this.load.image(
    "laptop",
    "/assets/objects/laptop.png"
    );
    this.load.spritesheet(
    "businessman",
    "/assets/characters/!$Lamplighter.png",
    {
        frameWidth: 128, 
        frameHeight: 220/2 
    }
    );
    this.load.image(
    "castle",
    "/assets/objects/castle.png"
    );
    this.load.audio("sfx_click", "/assets/audio/click.mp3"
    );
    this.load.image(
    "girlWithLaptop",
    "/assets/characters/girl (2).png"
    );
    this.load.image(
    "davisHall",
    "/assets/objects/davis-hall.png"
    );
    this.load.image(
    "wateringCan",
    "/assets/objects/watering-can.png"
    );

    this.load.audio("music_bg", "/assets/audio/background.mp3"
    );
  }

  create() {
    this.scene.start("MenuScene");
  }
}