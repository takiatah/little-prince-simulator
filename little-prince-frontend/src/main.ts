import Phaser from "phaser";

import BootScene from "./scenes/BootScene";
import BackendLoadingScene from "./LoadingScreen";
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
    BackendLoadingScene,
    Menu,
    DavisScene,
    SolarSystemScene,
    PlanetScene,
  ],

  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
};

// Create Phaser game
const game = new Phaser.Game(config);

// -----------------------------
// Sound button
// -----------------------------

const soundButton = document.createElement("button");

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
  cursor: "pointer",
});

// Track the player's mute preference separately
let isMuted = false;

const updateIcon = () => {
  soundButton.textContent = isMuted ? "🔇" : "🔊";
  soundButton.title = isMuted ? "Unmute sound" : "Mute sound";
  soundButton.setAttribute(
    "aria-label",
    isMuted ? "Unmute sound" : "Mute sound"
  );
};

// The button works immediately, even before music starts
soundButton.addEventListener("click", () => {
  isMuted = !isMuted;

  // Apply the preference to Phaser
  if (game.sound) {
    game.sound.setMute(isMuted);
  }

  updateIcon();

  console.log("Requested mute state:", isMuted);
  console.log("Phaser mute state:", game.sound?.mute);
});

// Apply the initial preference when Phaser is ready
game.events.once(Phaser.Core.Events.READY, () => {
  game.sound.setMute(isMuted);
  updateIcon();
});

soundButton.addEventListener("mousedown", (event) => {
  event.preventDefault();
});

updateIcon();
document.body.appendChild(soundButton);