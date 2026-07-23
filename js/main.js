/* ============================================================
   main.js — entry point. Creates the Phaser game (pixel-perfect,
   responsive, gamepad-ready), the virtual joystick, and the
   Windows 95 menu controller.
   ============================================================ */

import { CONFIG } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { Joystick } from './ui/Joystick.js';
import { Menu } from './ui/Menu.js';
import { HUD } from './ui/HUD.js';
import { Dialogs } from './ui/Dialogs.js';
import { Windows } from './ui/Windows.js';
import { SelectScreen } from './ui/SelectScreen.js';
import { Web3UI } from './ui/Web3UI.js';
import { EcosystemUI } from './ui/EcosystemUI.js';
import { SaveSystem } from './systems/SaveSystem.js';
import { SFX } from './audio/SFX.js';
import { AmbientAudio } from './audio/AmbientAudio.js';

const joystick = new Joystick();
const save = new SaveSystem();
const sfx = new SFX();
const ambientAudio = new AmbientAudio(sfx);

const config = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: CONFIG.world.floorColor,

  // Pixel-perfect: nearest-neighbour, no anti-aliasing, round pixels.
  pixelArt: true,
  antialias: false,
  roundPixels: true,

  // Responsive: canvas fills the window; camera handles the world view.
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },

  // Arcade physics for movement + collisions.
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: CONFIG.debug },
  },

  // Gamepad support ready.
  input: { gamepad: true },

  // Target 60 FPS.
  fps: { target: 60, min: 30, forceSetTimeOut: false },

  scene: [BootScene, GameScene],
};

const game = new Phaser.Game(config);

// DOM Windows 95 menu drives scene start/pause/resume.
const menu = new Menu(game, joystick);

// Phase 2/3/4/5 in-game UI singletons (created once; reused across restarts).
const ui = { hud: new HUD(), dialogs: new Dialogs(), windows: new Windows(save), select: new SelectScreen(save), web3: new Web3UI(save), eco: new EcosystemUI(save) };

// Expose for debugging / future phases.
window.HOODLUST = { game, menu, joystick, ui, save, sfx, ambientAudio, CONFIG };
