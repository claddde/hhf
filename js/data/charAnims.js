/* ============================================================
   charAnims.js — animation manifests for the four extra playable
   characters, sliced from their master sheets. Each entry maps an
   animation to its packed strip's [frameWidth, frameHeight, count].
   BootScene loads `<id>_<anim>.png` as a spritesheet with these
   frame sizes and registers the anim key `<id>-<anim>`.
   ============================================================ */

export const CHAR_ANIMS = {
  onyx: {
    idle: [46, 82, 9], walk: [57, 75, 9], run: [59, 71, 9], attack: [150, 78, 7],
    dash: [77, 70, 7], jump: [47, 72, 9], hurt: [71, 66, 9], death: [62, 38, 8],
  },
  scarlet: {
    idle: [52, 90, 10], walk: [61, 88, 10], run: [59, 79, 10],
    dash: [80, 65, 4], jump: [47, 64, 10], hurt: [72, 64, 9], death: [80, 57, 8],
  },
  aoi: {
    idle: [45, 89, 11], walk: [59, 86, 11], run: [60, 88, 11],
    dash: [91, 73, 6], jump: [60, 81, 9], hurt: [69, 80, 8], death: [78, 76, 9],
  },
  lily: {
    idle: [43, 96, 12], walk: [53, 92, 12], run: [61, 89, 12], death: [77, 76, 10],
  },
};

// Per-animation playback config (fps, loop) shared by all characters.
export const ANIM_PLAY = {
  idle: { fps: 8, repeat: -1 }, walk: { fps: 12, repeat: -1 }, run: { fps: 15, repeat: -1 },
  attack: { fps: 16, repeat: 0 }, dash: { fps: 14, repeat: 0 }, jump: { fps: 12, repeat: 0 },
  hurt: { fps: 14, repeat: 0 }, death: { fps: 10, repeat: 0 },
};
