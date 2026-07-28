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

  // ==========================================================
  // PHASE 7.5 — NEW WORLD EXPANSION (brand-new biomes).
  // The five maps above are now the STARTING areas; these extend
  // the universe outward with new terrain, decor, enemies + bosses.
  // ==========================================================
  sky_kingdom: {
    id: 'sky_kingdom', name: 'Floating Sky Kingdom', grass: 'floor_sky', floorColor: '#8fbfe8',
    light: { color: 0xffffff, intensity: 0.10, flicker: 0.02 }, ambientColor: '#bfe4ff',
    trees: { count: 0 },
    props: [{ key: 'sky_pillar', count: 26, bw: 12, bh: 10, off: 0.8 }],
    decor: [
      { key: 'sky_shard', count: 30, depth: true, glow: 0x7fd0f0 }, { key: 'sky_cloud2', count: 22 },
      { key: 'sky_pillar', count: 10, depth: true },
    ],
    water: { patches: 0 },
    weathers: ['sunny', 'wind'], creatures: ['bird', 'bird', 'butterfly'],
    music: { scale: [0, 4, 7, 11, 14], root: 523, tempo: 2.2, wave: 'sine' },
  },
  volcanic_empire: {
    id: 'volcanic_empire', name: 'Volcanic Empire', grass: 'floor_volcano', floorColor: '#3a1e1a',
    light: { color: 0xff7a3a, intensity: 0.22, flicker: 0.08 }, ambientColor: '#ff6a3a',
    trees: { count: 0 },
    props: [{ key: 'obsidian', count: 30, bw: 12, bh: 12, off: 0.7 }],
    decor: [
      { key: 'lava_rock', count: 30, depth: true, glow: 0xff6a2a }, { key: 'ember_vent', count: 18, depth: true, glow: 0xff8a3a },
      { key: 'obsidian', count: 12, depth: true },
    ],
    water: { patches: 0 },
    weathers: ['wind', 'fog'], creatures: ['firefly', 'firefly'],
    music: { scale: [0, 1, 5, 7, 8], root: 196, tempo: 3.2, wave: 'sawtooth' },
  },
  frozen_wasteland: {
    id: 'frozen_wasteland', name: 'Frozen Wasteland', grass: 'floor_frost', floorColor: '#cfe4f0',
    light: { color: 0xdff0ff, intensity: 0.14, flicker: 0.03 }, ambientColor: '#e0f4ff',
    trees: { count: 0 },
    props: [{ key: 'snow_pine', count: 26, bw: 10, bh: 10, off: 0.8 }],
    decor: [
      { key: 'ice_spike', count: 34, depth: true, glow: 0x9fe0ff }, { key: 'frozen_rock', count: 22, depth: true },
      { key: 'snow_pine', count: 14, depth: true },
    ],
    water: { patches: 2 },
    weathers: ['fog', 'moonlight', 'wind'], creatures: ['bird', 'ghostpet'],
    music: { scale: [0, 2, 3, 7, 10], root: 233, tempo: 2.8, wave: 'sine' },
  },
  corrupted_jungle: {
    id: 'corrupted_jungle', name: 'Corrupted Jungle', grass: 'floor_jungle', floorColor: '#2f4a1e',
    light: { color: 0x9fff6a, intensity: 0.16, flicker: 0.05 }, ambientColor: '#8fd04a',
    trees: { count: 0 },
    props: [{ key: 'twisted_tree', count: 28, bw: 12, bh: 14, off: 0.7 }],
    decor: [
      { key: 'toxic_flower', count: 30, depth: true, glow: 0xc8ff6a }, { key: 'corrupt_vine', count: 26, depth: true },
      { key: 'twisted_tree', count: 12, depth: true },
    ],
    water: { patches: 3 },
    weathers: ['fog', 'wind'], creatures: ['firefly', 'butterfly', 'butterfly'],
    music: { scale: [0, 3, 5, 6, 10], root: 220, tempo: 2.6, wave: 'triangle' },
  },
  mushroom_forest: {
    id: 'mushroom_forest', name: 'Dark Mushroom Forest', grass: 'floor_mush', floorColor: '#2a1f3a',
    light: { color: 0xb98cff, intensity: 0.20, flicker: 0.06 }, ambientColor: '#c8a0ff',
    trees: { count: 0 },
    props: [{ key: 'giant_mushroom', count: 24, bw: 12, bh: 12, off: 0.8 }],
    decor: [
      { key: 'glow_cap', count: 34, depth: true, glow: 0xa86fe0 }, { key: 'spore_pod', count: 26, depth: true, glow: 0xc8ff8a },
      { key: 'giant_mushroom', count: 12, depth: true, glow: 0xc8a0ff },
    ],
    water: { patches: 1 },
    weathers: ['fog', 'moonlight'], creatures: ['firefly', 'firefly', 'ghostpet'],
    music: { scale: [0, 2, 3, 7, 9], root: 262, tempo: 2.4, wave: 'sine' },
  },
  sandstorm_desert: {
    id: 'sandstorm_desert', name: 'Sandstorm Desert', grass: 'floor_desert', floorColor: '#d8bf7a',
    light: { color: 0xffe0a0, intensity: 0.16, flicker: 0.04 }, ambientColor: '#f0dc9a',
    trees: { count: 0 },
    props: [{ key: 'cactus', count: 26, bw: 10, bh: 12, off: 0.75 }],
    decor: [
      { key: 'dune_rock', count: 30, depth: true }, { key: 'bone_pile', count: 22, depth: true },
      { key: 'cactus', count: 14, depth: true },
    ],
    water: { patches: 0 },
    weathers: ['wind', 'sunny', 'fog'], creatures: ['bird'],
    music: { scale: [0, 2, 4, 5, 9], root: 294, tempo: 2.0, wave: 'square' },
  },
  hoodlust_haven: {
    id: 'hoodlust_haven', name: 'HoodLust Haven', grass: 'town_floor', floorColor: '#8a8f98',
    light: { color: 0xffedc8, intensity: 0.10, flicker: 0.01 }, ambientColor: '#ffe4a0',
    trees: { count: 0 },
    props: [{ key: 'town_house', count: 10, bw: 30, bh: 16, off: 0.8 }],
    decor: [
      { key: 'town_house', count: 6, depth: true }, { key: 'flower_pink', count: 20 },
      { key: 'flower_gold', count: 16 }, { key: 'bush', count: 14, depth: true }, { key: 'fence', count: 18, depth: true },
    ],
    water: { patches: 1 },
    weathers: ['sunny'], creatures: ['bird', 'bird', 'cat', 'butterfly'],
    music: { scale: [0, 2, 4, 5, 7, 9, 11], root: 440, tempo: 1.7, wave: 'sine' },
  },
};
export const MAP_IDS = Object.keys(MAPS);

/* ============================================================
   PHASE 7.5 — CONNECTED WORLD
   Regions wrap the existing maps into one universe. Each has a
   position on the world map, a recommended level band, a danger
   tier, and connections (neighbouring region + travel method).
   Fast-travel is disabled until a region is DISCOVERED (reached
   physically through a portal/gate). New maps just add a REGION.
   ============================================================ */
export const REGIONS = {
  magic_forest: {
    id: 'magic_forest', map: 'magic_forest', name: 'Magic Forest',
    pos: { x: 1, y: 3 }, danger: 'Easy', tier: 0, rec: [1, 10], color: '#3f9438',
    lore: 'Where the HoodLust tale begins — quiet groves hiding old magic.',
    start: true,
    features: { merchant: true, dungeon: true },
    links: [{ to: 'enchanted_garden', via: 'Ancient Gate' }, { to: 'moonlight_graveyard', via: 'Broken Bridge' }],
  },
  enchanted_garden: {
    id: 'enchanted_garden', map: 'enchanted_garden', name: 'Enchanted Garden',
    pos: { x: 2, y: 2 }, danger: 'Normal', tier: 2, rec: [10, 20], color: '#6fca5c',
    lore: 'A blooming sanctuary tended by spirits who no longer remember why.',
    features: { merchant: true, dungeon: true, secret: true },
    links: [{ to: 'magic_forest', via: 'Ancient Gate' }, { to: 'ancient_ruins', via: 'Mystic Circle' }],
  },
  moonlight_graveyard: {
    id: 'moonlight_graveyard', map: 'moonlight_graveyard', name: 'Moonlight Graveyard',
    pos: { x: 1, y: 1 }, danger: 'Hard', tier: 4, rec: [20, 35], color: '#4f8a6e',
    lore: 'The dead walk beneath a moon that never sets. Some bosses wake only at night.',
    features: { boss: true, dungeon: true, secret: true, night: true },
    links: [{ to: 'magic_forest', via: 'Broken Bridge' }, { to: 'crystal_valley', via: 'Underground Tunnel' }],
  },
  crystal_valley: {
    id: 'crystal_valley', map: 'crystal_valley', name: 'Crystal Valley',
    pos: { x: 2, y: 0 }, danger: 'Elite', tier: 6, rec: [35, 55], color: '#4f9fd0',
    lore: 'Humming caverns of living crystal that bend light — and fate.',
    features: { boss: true, merchant: true, dungeon: true },
    links: [{ to: 'moonlight_graveyard', via: 'Underground Tunnel' }, { to: 'ancient_ruins', via: 'Mountain Pass' }],
  },
  ancient_ruins: {
    id: 'ancient_ruins', map: 'ancient_ruins', name: 'Ancient Ruins',
    pos: { x: 3, y: 1 }, danger: 'Nightmare', tier: 9, rec: [55, 80], color: '#b0d072',
    lore: 'The bones of a lost civilization, and the throne of something patient.',
    features: { boss: true, dungeon: true, secret: true },
    links: [{ to: 'enchanted_garden', via: 'Mystic Circle' }, { to: 'crystal_valley', via: 'Mountain Pass' }],
  },

  // ---------- NEW EXPANSION REGIONS ----------
  corrupted_jungle: {
    id: 'corrupted_jungle', map: 'corrupted_jungle', name: 'Corrupted Jungle',
    pos: { x: 0, y: 3 }, danger: 'Nightmare', tier: 11, rec: [70, 95], color: '#8fd04a',
    lore: 'A rainforest devoured by a green rot that thinks, spreads — and hungers.',
    features: { boss: true, dungeon: true, secret: true },
    enemies: ['corrupt_spore', 'j_stalker', 'j_spitter'], boss: 'rot_mother',
    links: [{ to: 'magic_forest', via: 'Old Boat' }, { to: 'mushroom_forest', via: 'Underground Tunnel' }],
  },
  mushroom_forest: {
    id: 'mushroom_forest', map: 'mushroom_forest', name: 'Dark Mushroom Forest',
    pos: { x: 0, y: 1 }, danger: 'Chaos', tier: 13, rec: [90, 120], color: '#c8a0ff',
    lore: 'A glowing fungal night where the spores whisper and the ground breathes.',
    features: { boss: true, dungeon: true, secret: true, night: true },
    enemies: ['myco_crawler', 'm_spore', 'm_sporeling'], boss: 'myconid_king',
    links: [{ to: 'corrupted_jungle', via: 'Underground Tunnel' }, { to: 'moonlight_graveyard', via: 'Cave' }],
  },
  frozen_wasteland: {
    id: 'frozen_wasteland', map: 'frozen_wasteland', name: 'Frozen Wasteland',
    pos: { x: 4, y: 3 }, danger: 'Chaos', tier: 15, rec: [110, 140], color: '#bfe4f4',
    lore: 'An endless white grave where the cold itself has learned to hunt.',
    features: { boss: true, dungeon: true, night: true },
    enemies: ['ice_shard', 'f_hunter', 'f_howler'], boss: 'frost_titan',
    links: [{ to: 'enchanted_garden', via: 'Mountain Pass' }, { to: 'volcanic_empire', via: 'Abandoned Railway' }],
  },
  volcanic_empire: {
    id: 'volcanic_empire', map: 'volcanic_empire', name: 'Volcanic Empire',
    pos: { x: 5, y: 2 }, danger: 'Inferno', tier: 18, rec: [130, 170], color: '#ff6a3a',
    lore: 'A kingdom of fire ruled from a throne of molten obsidian.',
    features: { boss: true, dungeon: true, merchant: true },
    enemies: ['magma_imp', 'v_hound', 'v_bomber'], boss: 'magma_sovereign',
    links: [{ to: 'ancient_ruins', via: 'Abandoned Railway' }, { to: 'sandstorm_desert', via: 'Old Boat' }],
  },
  sandstorm_desert: {
    id: 'sandstorm_desert', map: 'sandstorm_desert', name: 'Sandstorm Desert',
    pos: { x: 5, y: 0 }, danger: 'Inferno', tier: 21, rec: [150, 190], color: '#f0dc9a',
    lore: 'Buried empires and starving things wait beneath a sky of grinding sand.',
    features: { boss: true, dungeon: true, secret: true },
    enemies: ['sand_lurker', 'd_reaver', 'd_burrower'], boss: 'dune_colossus',
    links: [{ to: 'volcanic_empire', via: 'Old Boat' }, { to: 'sky_kingdom', via: 'Airship' }],
  },
  sky_kingdom: {
    id: 'sky_kingdom', map: 'sky_kingdom', name: 'Floating Sky Kingdom',
    pos: { x: 4, y: 0 }, danger: 'Celestial', tier: 25, rec: [180, 999], color: '#bfe4ff',
    lore: 'Above the clouds, the first HoodLust throne still waits for a worthy heir.',
    features: { boss: true, dungeon: true, secret: true, merchant: true },
    enemies: ['sky_wisp', 's_seraph', 's_sentinel'], boss: 'sky_sovereign',
    links: [{ to: 'crystal_valley', via: 'Airship' }, { to: 'sandstorm_desert', via: 'Airship' }],
  },

  // ---------- SAFE TOWN (no enemies; prepare between runs) ----------
  hoodlust_haven: {
    id: 'hoodlust_haven', map: 'hoodlust_haven', name: 'HoodLust Haven',
    pos: { x: 1, y: 4 }, danger: 'Safe', tier: 0, rec: [1, 999], color: '#c8b088',
    lore: 'A walled sanctuary where survivors rest, trade, and gear up for the world beyond.',
    town: true, safe: true,
    features: { merchant: true },
    links: [{ to: 'magic_forest', via: 'Town Gate' }],
  },
};

// Make every link bidirectional so portals appear on both ends.
for (const id of Object.keys(REGIONS)) {
  for (const l of (REGIONS[id].links || [])) {
    const other = REGIONS[l.to]; if (!other) continue;
    other.links = other.links || [];
    if (!other.links.some(x => x.to === id)) other.links.push({ to: id, via: l.via });
  }
}
export const REGION_IDS = Object.keys(REGIONS);
export const START_REGION = REGION_IDS.find(id => REGIONS[id].start) || REGION_IDS[0];

// PHASE 7.6 DEMO — sequential map-progression chain. A region unlocks only
// after the previous one's boss is defeated. Safe town is excluded (always open).
export const PROGRESSION_ORDER = [
  'magic_forest', 'enchanted_garden', 'moonlight_graveyard', 'crystal_valley', 'ancient_ruins',
  'corrupted_jungle', 'mushroom_forest', 'frozen_wasteland', 'volcanic_empire', 'sandstorm_desert', 'sky_kingdom',
].filter(id => REGIONS[id]);

// Travel-method → visual flavour used by the transition animation + icon.
export const TRAVEL = {
  'Ancient Gate':       { icon: '\u26E9', tint: 0xffd24f, fx: 'gate' },
  'Broken Bridge':      { icon: '\u{1F309}', tint: 0x9c6a34, fx: 'walk' },
  'Underground Tunnel': { icon: '\u26CF', tint: 0x8f7a48, fx: 'tunnel' },
  'Mountain Pass':      { icon: '\u26F0', tint: 0xc8e8ff, fx: 'walk' },
  'Mystic Circle':      { icon: '\u2727', tint: 0xc07aff, fx: 'portal' },
  'Old Boat':           { icon: '\u26F5', tint: 0x5fa0d0, fx: 'boat' },
  'Cave':               { icon: '\u{1F573}', tint: 0x6a5a7a, fx: 'tunnel' },
  'Abandoned Railway':  { icon: '\u{1F683}', tint: 0xb0a070, fx: 'rail' },
  'Airship':            { icon: '\u2708', tint: 0xbfe4ff, fx: 'airship' },
  'Town Gate':          { icon: '\u{1F3E0}', tint: 0xc8b088, fx: 'gate' },
};

// ---------------- CHARACTERS ----------------
// The uploaded HoodLust NFT art is 'player'. New characters just add
// entries here with their own texture key + a tiny stat flavour that
// does NOT change core mechanics (small ±, purely cosmetic-tier).
export const CHARACTERS = [
  { id: 'lush_default', name: 'HoodLust', texture: 'idle', anim: null, portrait: 'portrait',
    desc: 'The original survivor — balanced and dependable.', style: 'Balanced Fighter', weapon: 'Rose Bolts', difficulty: 1,
    mods: {}, unlocked: true },
  { id: 'onyx', name: 'Onyx', texture: 'onyx_idle', anim: 'onyx', portrait: 'onyx_portrait',
    desc: 'Soot-and-steel brawler with a burning blade. Tanky and heavy-hitting.', style: 'Heavy Melee', weapon: 'Ember Odachi', difficulty: 2,
    mods: { dmgMult: 1.12, moveMult: 0.92, maxHP: 40 } },
  { id: 'scarlet', name: 'Scarlet', texture: 'scarlet_idle', anim: 'scarlet', portrait: 'scarlet_portrait',
    desc: 'An arcane duelist whose blade sings with pink light. Sharp crits.', style: 'Magic Specialist', weapon: 'Arcane Sword', difficulty: 4,
    mods: { critChanceAdd: 0.06, dmgMult: 1.06 } },
  { id: 'aoi', name: 'Aoi', texture: 'aoi_idle', anim: 'aoi', portrait: 'aoi_portrait',
    desc: 'A blue-haired blade dancer — fast, agile, and lucky.', style: 'Fast Assassin', weapon: 'Phantom Katana', difficulty: 3,
    mods: { moveMult: 1.12, luck: 0.05 } },
  { id: 'lily', name: 'Lily', texture: 'lily_idle', anim: 'lily', portrait: 'lily_portrait',
    desc: 'A cheerful all-rounder blessed with luck and quick feet.', style: 'Hybrid Fighter', weapon: 'Blossom Blade', difficulty: 1,
    mods: { luck: 0.06, moveMult: 1.05 } },
];
