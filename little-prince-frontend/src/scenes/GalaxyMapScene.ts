import Phaser from "phaser";

export default class GalaxyMapScene extends Phaser.Scene {
  constructor() {
    super("GalaxyMapScene");
  }

  create() {
    this.add.text(
      640,
      360,
      "GALAXY MAP - COMING SOON",
      {
        fontSize: "32px",
        color: "#ffffff"
      }
    ).setOrigin(0.5);
  }
}