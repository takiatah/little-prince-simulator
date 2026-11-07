import Phaser from "phaser";
import { Menu } from "./scenes/Menu";


const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,

  width: 1280,
  height: 720,

  parent: "game",

  backgroundColor: "#10182b",

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },

  scene: [
    Menu,
  ]
};

new Phaser.Game(config);
