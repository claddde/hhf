/* ============================================================
   maps.js — Phase 4 world content. Each map has its own palette,
   floor tile, decoration mix, lighting tint, weather set and
   ambient audio profile. Environment/Weather/Ambient read these.
   Gameplay values live in config.js and are NOT affected here.
   ============================================================ */

export const MAPS = {
  magic_forest: {
    id: 'magic_forest', name: 'Magic Forest', grass: 'grass_forest',
    floorColor: '#2e6b34',
    // day/light tint multiplied over the scene (warm sunlight).
    light: { color: 0xfff2c8, intensity: 0.16, flicker: 0.03 },
    ambientColor: '#7fd06a',
    trees: { tint: 0x6fae5a, count: 40 },
    decor: [
      { key: 'bush', count: 34, depth: true },
      { key: 'mushroom', count: 20, depth: true, glow: 0xff6a7a },
      { key: 'flower_pink', count: 26 }, { key: 'flower_purple', count: 22 },
      { key: 'flower_gold', count: 16 }, { key: 'crystal', count: 6, depth: true, glow: 0xb98cff },
    ],
    water: { patches: 3 },
    weathers: ['sunny', 'wind', 'fog'],
    creatures: ['butterfly', 'firefly', 'bird', 'cat'],
    music: { scale: [0, 2, 4, 7, 9], root: 330, tempo: 2.4, wave: 'triangle' },
  },
  enchanted_garden: {
    id: 'enchanted_garden', name: 'Enchanted Garden', grass: 'grass_garden',
    floorColor: '#4a9f3e',
    light: { color: 0xfff4d0, intensity: 0.14, flicker: 0.02 },
    ambientColor: '#9ff074',
    trees: { tint: 0x8fd06a, count: 26 },
    decor: [
      { key: 'flower_pink', count: 40 }, { key: 'flower_blue', count: 34 },
      { key: 'flower_gold', count: 30 }, { key: 'flower_purple', count: 26 },
      { key: 'bush', count: 24, depth: true }, { key: 'fence', count: 16, depth: true },
      { key: 'mushroom', count: 10, depth: true, glow: 0xff6a7a },
    ],
    water: { patches: 2, bridge: true },
    weathers: ['sunny', 'wind'],
    creatures: ['butterfly', 'butterfly', 'bird', 'cat'],
    music: { scale: [0, 2, 4, 5, 7, 9, 11], root: 392, tempo: 2.0, wave: 'sine' },
  },
  moonlight_graveyard: {
    id: 'moonlight_graveyard', name: 'Moonlight Graveyard', grass: 'grass_graveyard',
    floorColor: '#2f5647',
    light: { color: 0x9fb0ff, intensity: 0.20, flicker: 0.05 },
    ambientColor: '#8fd0c0',
    trees: { tint: 0x4f7a6a, count: 30 },
    decor: [
      { key: 'grave', count: 26, depth: true }, { key: 'bush', count: 20, depth: true },
      { key: 'flower_purple', count: 24 }, { key: 'flower_blue', count: 20 },
      { key: 'mushroom', count: 18, depth: true, glow: 0x8affc0 }, { key: 'fence', count: 14, depth: true },
      { key: 'crystal', count: 5, depth: true, glow: 0x7fd0f0 },
    ],
    water: { patches: 1 },
    weathers: ['moonlight', 'fog', 'wind'],
    creatures: ['firefly', 'firefly', 'ghostpet', 'ghostpet'],
    music: { scale: [0, 3, 5, 7, 10], root: 262, tempo: 3.0, wave: 'sine' },
  },
  crystal_valley: {
    id: 'crystal_valley', name: 'Crystal Valley', grass: 'grass_crystal',
    floorColor: '#2f6f9c',
    light: { color: 0xc8e8ff, intensity: 0.18, flicker: 0.04 },
    ambientColor: '#7fd0f0',
    trees: { tint: 0x5f9fd0, count: 20 },
    decor: [
      { key: 'crystal', count: 30, depth: true, glow: 0xb98cff },
      { key: 'crystal', count: 14, depth: true, glow: 0x7fd0f0 },
      { key: 'flower_blue', count: 30 }, { key: 'flower_purple', count: 24 },
      { key: 'mushroom', count: 12, depth: true, glow: 0x8affc0 }, { key: 'bush', count: 14, depth: true },
    ],
    water: { patches: 4 },
    weathers: ['moonlight', 'sunny', 'fog'],
    creatures: ['firefly', 'firefly', 'butterfly', 'ghostpet'],
    music: { scale: [0, 2, 3, 7, 8], root: 294, tempo: 2.6, wave: 'triangle' },
  },
  ancient_ruins: {
    id: 'ancient_ruins', name: 'Ancient Ruins', grass: 'grass_ruins',
    floorColor: '#6c8a40',
    light: { color: 0xffe0a0, intensity: 0.15, flicker: 0.03 },
    ambientColor: '#d0d072',
    trees: { tint: 0x9ab060, count: 22 },
    decor: [
      { key: 'rock', count: 34, depth: true }, { key: 'fence', count: 20, depth: true },
      { key: 'flower_gold', count: 28 }, { key: 'flower_pink', count: 20 },
      { key: 'bush', count: 20, depth: true }, { key: 'mushroom', count: 10, depth: true, glow: 0xff6a7a },
    ],
    water: { patches: 2, bridge: true },
    weathers: ['sunny', 'wind', 'fog'],
    creatures: ['butterfly', 'bird', 'bird', 'cat'],
    music: { scale: [0, 2, 4, 6, 7, 9], root: 349, tempo: 2.2, wave: 'square' },
  },
};
export const MAP_IDS = Object.keys(MAPS);

// ---------------- CHARACTERS ----------------
// The uploaded HoodLust NFT art is 'player'. New characters just add
// entries here with their own texture key + a tiny stat flavour that
// does NOT change core mechanics (small ±, purely cosmetic-tier).
export const CHARACTERS = [
  { id: 'lush_default', name: 'HoodLust', texture: 'player', desc: 'The original survivor.', mods: {}, unlocked: true },
  // Placeholders — ready for future NFT drops. They reuse the base art
  // (tinted) until real sprites are provided; swap `texture` when added.
  { id: 'rose', name: 'Rose Wraith', texture: 'player', tint: 0xff8ab0, desc: 'Blooms in battle. +5% Luck.', mods: { luck: 0.05 } },
  { id: 'frost', name: 'Frost Maiden', texture: 'player', tint: 0x9fd8ff, desc: 'Cold precision. +5% Crit.', mods: { critChanceAdd: 0.05 } },
  { id: 'ember', name: 'Ember Knight', texture: 'player', tint: 0xff9a5a, desc: 'Burning resolve. +6% Damage.', mods: { dmgMult: 1.06 } },
];
