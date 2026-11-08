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

const game = new Phaser.Game(config);

const soundButton = document.createElement("button");
soundButton.title = "Mute / unmute";

Object.assign(soundButton.style, {
    position: "fixed",
    top: "16px",
    left: "16px",
    zIndex: "10",
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    border: "2px solid #a1bb6e",
    background: "rgba(16, 27, 50, 0.85)",
    color: "#E0D3B7",
    fontSize: "22px",
    lineHeight: "1",
    cursor: "pointer"
});

const updateIcon = () => {
    soundButton.textContent = game.sound?.mute ? "🔇" : "🔊";
};

soundButton.addEventListener("mousedown", (event) => event.preventDefault());

soundButton.addEventListener("click", () => {
    if (!game.sound) return;
    game.sound.mute = !game.sound.mute;
    updateIcon();
});

game.events.once("ready", () => {
    game.sound.on("mute", updateIcon);
    updateIcon();
});

updateIcon();
document.body.appendChild(soundButton);

new Phaser.Game(config);
