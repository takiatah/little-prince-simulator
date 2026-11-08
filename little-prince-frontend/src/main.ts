import Phaser from "phaser";

import BootScene from "./scenes/BootScene";
import Menu from "./scenes/Menu";
import StoryScene from "./scenes/StoryScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,

  width: 1280,
  height: 720,

  parent: "game-container",

  backgroundColor: "#101b32",

  scene: [
    BootScene,
    Menu,
    StoryScene
  ],

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);