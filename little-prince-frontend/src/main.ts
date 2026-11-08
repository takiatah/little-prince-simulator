import Phaser from "phaser";

import BootScene from "./scenes/BootScene";
import Menu from "./scenes/Menu";
import DavisScene from "./scenes/DavisScene";
import SolarSystemScene from "./scenes/SolarSystemScene";
import PlanetScene from "./scenes/PlanetScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,

  parent: "game-container",

  backgroundColor: "#101b32",

  scene: [
    BootScene,
    Menu,
    DavisScene,
    SolarSystemScene,
    PlanetScene
  ],

  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  }
};

new Phaser.Game(config);
