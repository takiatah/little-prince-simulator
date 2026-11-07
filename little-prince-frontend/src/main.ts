import Phaser from "phaser";

import BootScene from "./scenes/BootScene";
import Menu from "./scenes/Menu";
import GalaxyMapScene from "./scenes/GalaxyMapScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,

  width: 1280,
  height: 720,

  parent: "game-container",

  backgroundColor: "#101b32",

  scene: [
    BootScene,
    Menu,
    GalaxyMapScene
  ],

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);