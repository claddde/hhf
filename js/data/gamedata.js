/* ============================================================
   gamedata.js — Phase 3 content tables. Pure data + tiny helpers.
   Weapons, rarity, passives, loot, bosses, shop, achievements.
   ============================================================ */

// ---------------- RARITY ----------------
export const RARITY = {
  common:    { name: 'Common',    color: '#c8c8c8', stat: 1.00, weight: 46 },
  uncommon:  { name: 'Uncommon',  color: '#5fd06a', stat: 1.15, weight: 26 },
  rare:      { name: 'Rare',      color: '#4f9bff', stat: 1.35, weight: 15 },
  epic:      { name: 'Epic',      color: '#b98cff', stat: 1.65, weight: 8  },
  legendary: { name: 'Legendary', color: '#f2a83a', stat: 2.10, weight: 4  },
  mythic:    { name: 'Mythic',    color: '#ff5a8a', stat: 2.70, weight: 1  },
};
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

/** Weighted rarity roll; `luck` (0..) nudges toward higher tiers. */
export function rollRarity(luck = 0) {
  const entries = RARITY_ORDER.map((k, i) => {
    // luck shifts weight from low tiers to high tiers.
    const boost = 1 + luck * (i / RARITY_ORDER.length);
    return { k, w: RARITY[k].weight * boost };
  });
  let total = entries.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  for (const e of entries) { r -= e.w; if (r <= 0) return e.k; }
  return 'common';
}

// ---------------- WEAPONS ----------------
// pattern: how it fires. stats scale with level via growth.
export const WEAPONS = {
  rose_bolt: {
    id: 'rose_bolt', name: 'Rose Bolt', icon: '\u2740', texture: 'bolt', pattern: 'nearest',
    rarity: 'common', maxLevel: 8, starter: true,
    base: { damage: 12, cooldownMs: 620, projSpeed: 460, projSize: 1.0, count: 1, pierce: 0, knockback: 1, range: 460, critChance: 0.08, critMult: 2.0, life: 1100 },
  },
  magic_wand: {
    id: 'magic_wand', name: 'Magic Wand', icon: '\u2727', texture: 'w_wand', pattern: 'nearest',
    rarity: 'common', maxLevel: 8,
    base: { damage: 10, cooldownMs: 520, projSpeed: 520, projSize: 1.0, count: 1, pierce: 0, knockback: 1, range: 520, critChance: 0.1, critMult: 2.0, life: 1200 },
  },
  fire_orb: {
    id: 'fire_orb', name: 'Fire Orb', icon: '\u2609', texture: 'w_fire', pattern: 'orbit',
    rarity: 'uncommon', maxLevel: 8,
    base: { damage: 8, cooldownMs: 250, projSpeed: 0, projSize: 1.2, count: 2, pierce: 99, knockback: 1, range: 0, critChance: 0.06, critMult: 2.0, orbitR: 74, orbitSpeed: 2.6, tickMs: 250 },
  },
  dark_scythe: {
    id: 'dark_scythe', name: 'Dark Scythe', icon: '\u2694', texture: 'w_scythe', pattern: 'melee',
    rarity: 'rare', maxLevel: 8,
    base: { damage: 26, cooldownMs: 900, projSpeed: 0, projSize: 1.3, count: 1, pierce: 99, knockback: 3, range: 120, critChance: 0.12, critMult: 2.2, arc: 130, life: 220 },
  },
  bone_shot: {
    id: 'bone_shot', name: 'Bone Shot', icon: '\u2749', texture: 'w_bone', pattern: 'spread',
    rarity: 'uncommon', maxLevel: 8,
    base: { damage: 9, cooldownMs: 780, projSpeed: 430, projSize: 1.0, count: 3, pierce: 0, knockback: 2, range: 380, critChance: 0.08, critMult: 2.0, spread: 34, life: 800 },
  },
  shadow_blade: {
    id: 'shadow_blade', name: 'Shadow Blade', icon: '\u2020', texture: 'w_blade', pattern: 'nearest',
    rarity: 'epic', maxLevel: 8,
    base: { damage: 18, cooldownMs: 340, projSpeed: 700, projSize: 1.1, count: 1, pierce: 2, knockback: 1, range: 560, critChance: 0.2, critMult: 2.4, life: 900 },
  },
  pixel_laser: {
    id: 'pixel_laser', name: 'Pixel Laser', icon: '\u25AC', texture: 'w_laser', pattern: 'nearest',
    rarity: 'rare', maxLevel: 8,
    base: { damage: 14, cooldownMs: 700, projSpeed: 900, projSize: 1.0, count: 1, pierce: 99, knockback: 0, range: 700, critChance: 0.1, critMult: 2.0, life: 700 },
  },
  ghost_flame: {
    id: 'ghost_flame', name: 'Ghost Flame', icon: '\u2668', texture: 'w_ghost', pattern: 'aura',
    rarity: 'epic', maxLevel: 8,
    base: { damage: 6, cooldownMs: 300, projSpeed: 0, projSize: 1, count: 1, pierce: 99, knockback: 0, range: 0, critChance: 0.05, critMult: 2.0, radius: 96, tickMs: 300 },
  },
  ice_crystal: {
    id: 'ice_crystal', name: 'Ice Crystal', icon: '\u2744', texture: 'w_ice', pattern: 'nova',
    rarity: 'legendary', maxLevel: 8,
    base: { damage: 12, cooldownMs: 1100, projSpeed: 380, projSize: 1.1, count: 8, pierce: 1, knockback: 2, range: 999, critChance: 0.1, critMult: 2.0, life: 900 },
  },
};
export const WEAPON_IDS = Object.keys(WEAPONS);

/** Effective stats of a weapon at a given level (level 1 = base). */
export function weaponStats(def, level) {
  const b = def.base, L = level - 1;
  const s = { ...b };
  s.damage = b.damage * (1 + 0.22 * L);
  s.cooldownMs = b.cooldownMs * Math.pow(0.94, L);
  if (b.tickMs) s.tickMs = b.tickMs * Math.pow(0.94, L);
  s.projSize = b.projSize * (1 + 0.06 * L);
  // +1 projectile every 2 levels for count-based weapons.
  s.count = b.count + Math.floor(L / 2);
  s.pierce = b.pierce + (b.pierce < 90 ? Math.floor(L / 3) : 0);
  if (b.radius) s.radius = b.radius * (1 + 0.08 * L);
  if (b.orbitR) s.orbitR = b.orbitR * (1 + 0.05 * L);
  s.level = level;
  return s;
}

// ---------------- PASSIVE ABILITIES ----------------
// apply(p) mutates the Progression instance: p.stats (Phase-2 bag, also
// feeds the Rose Bolt) and/or p.mods (Phase-3 global modifiers).
export const PASSIVES = {
  lifesteal:  { id: 'lifesteal',  name: 'Life Steal',        icon: '\u2764', desc: '+2% Life Steal',          apply: p => { p.mods.lifeSteal += 0.02; } },
  atkspeed:   { id: 'atkspeed',   name: 'Attack Speed',      icon: '\u26A1', desc: '+10% Attack Speed',       apply: p => { p.mods.cdMult *= 0.90; p.stats.cooldownMs *= 0.90; } },
  critdmg:    { id: 'critdmg',    name: 'Critical Damage',   icon: '\u2721', desc: '+25% Critical Damage',    apply: p => { p.mods.critDmgAdd += 0.25; p.stats.critMult += 0.25; } },
  movespeed:  { id: 'movespeed',  name: 'Movement Speed',    icon: '\u27A4', desc: '+8% Movement Speed',      apply: p => { p.stats.moveMult *= 1.08; } },
  regen:      { id: 'regen',      name: 'Health Regen',      icon: '\u271A', desc: '+1 HP / sec',             apply: p => { p.stats.regen += 1; } },
  projcount:  { id: 'projcount',  name: 'Projectile Count',  icon: '\u273B', desc: '+1 Projectile (all)',     apply: p => { p.mods.projCountAdd += 1; p.stats.projCount += 1; } },
  magnet:     { id: 'magnet',     name: 'Magnet Radius',     icon: '\u25CE', desc: '+30% Magnet Radius',      apply: p => { p.mods.magnetMult *= 1.30; } },
  luck:       { id: 'luck',       name: 'Luck',              icon: '\u2618', desc: '+15% Luck',               apply: p => { p.mods.luck += 0.15; } },
  cooldown:   { id: 'cooldown',   name: 'Cooldown Reduction',icon: '\u21BB', desc: '-8% Cooldown',            apply: p => { p.mods.cdMult *= 0.92; p.stats.cooldownMs *= 0.92; } },
  power:      { id: 'power',      name: 'Empower',           icon: '\u2739', desc: '+12% All Damage',         apply: p => { p.mods.dmgMult *= 1.12; p.stats.damage *= 1.12; } },
  maxhp:      { id: 'maxhp',      name: 'Max Health',        icon: '\u2695', desc: '+25 Max HP (heal 25)',    apply: p => { p.stats.maxHP += 25; p.stats.healQueued += 25; } },
};
export const PASSIVE_IDS = Object.keys(PASSIVES);

// ---------------- LOOT ----------------
export const LOOT = {
  // base drop chances per normal enemy (scaled by luck). gem handled separately.
  drops: [
    { type: 'coin',   chance: 0.35, min: 1, max: 3 },
    { type: 'heart',  chance: 0.03 },
    { type: 'magnet', chance: 0.012 },
    { type: 'buff',   chance: 0.02 },
    { type: 'key',    chance: 0.02 },
    { type: 'chest',  chance: 0.006 },
  ],
  buffs: [
    { id: 'frenzy',  name: 'Frenzy',   desc: '2x Attack Speed', dur: 8, apply: s => s.buffCd = 0.5 },
    { id: 'might',   name: 'Might',    desc: '2x Damage',       dur: 8, apply: s => s.buffDmg = 2.0 },
    { id: 'haste',   name: 'Haste',    desc: '+50% Move Speed', dur: 8, apply: s => s.buffMove = 1.5 },
    { id: 'vacuum',  name: 'Vacuum',   desc: 'Pull all XP',     dur: 0, apply: null },
  ],
};

// ---------------- BOSSES ----------------
export const BOSSES = [
  { id: 'shadow_lord', name: 'The Shadow Lord', texture: 'boss', hp: 1600, speed: 46, dmg: 24, scale: 1.0,
    phases: [
      { at: 1.0, attacks: ['charge'] },
      { at: 0.6, attacks: ['charge', 'nova'] },
      { at: 0.3, attacks: ['charge', 'nova', 'summon'] },
    ] },
  { id: 'bone_tyrant', name: 'Bone Tyrant', texture: 'boss', hp: 2600, speed: 52, dmg: 30, scale: 1.1, tint: 0xd8d0b0,
    phases: [
      { at: 1.0, attacks: ['charge', 'spiral'] },
      { at: 0.5, attacks: ['charge', 'spiral', 'nova'] },
      { at: 0.25, attacks: ['spiral', 'nova', 'summon'] },
    ] },
  { id: 'crimson_bride', name: 'Crimson Bride', texture: 'boss', hp: 4200, speed: 60, dmg: 38, scale: 1.2, tint: 0xff5a8a,
    phases: [
      { at: 1.0, attacks: ['charge', 'nova'] },
      { at: 0.6, attacks: ['charge', 'spiral', 'nova'] },
      { at: 0.3, attacks: ['charge', 'spiral', 'nova', 'summon'] },
    ] },
];

// ---------------- SHOP (permanent, coin-bought) ----------------
export const SHOP = [
  { id: 'hp',     name: 'Vitality',      icon: '\u2695', desc: '+15 Max HP',        max: 8,  cost: l => 40 + l * 35,  effect: 'permHP' },
  { id: 'dmg',    name: 'Power Core',    icon: '\u2739', desc: '+6% Damage',        max: 10, cost: l => 55 + l * 45,  effect: 'permDmg' },
  { id: 'speed',  name: 'Swift Boots',   icon: '\u27A4', desc: '+4% Move Speed',    max: 6,  cost: l => 50 + l * 40,  effect: 'permMove' },
  { id: 'luck',   name: 'Lucky Charm',   icon: '\u2618', desc: '+10% Luck',         max: 6,  cost: l => 70 + l * 60,  effect: 'permLuck' },
  { id: 'magnet', name: 'Soul Lodestone',icon: '\u25CE', desc: '+12% Magnet',       max: 6,  cost: l => 45 + l * 40,  effect: 'permMagnet' },
  { id: 'greed',  name: 'Greed',         icon: '\u2666', desc: '+10% Coin Gain',    max: 8,  cost: l => 60 + l * 55,  effect: 'permGreed' },
  { id: 'revive', name: 'Ankh',          icon: '\u2625', desc: 'Revive once/run',  max: 1,  cost: () => 500,         effect: 'permRevive' },
];

// ---------------- ACHIEVEMENTS ----------------
export const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'First Blood',      icon: '\u2694', test: st => st.kills >= 1 },
  { id: 'slayer',      name: 'Slayer (100)',     icon: '\u2620', test: st => st.kills >= 100 },
  { id: 'reaper',      name: 'Reaper (500)',     icon: '\u2620', test: st => st.kills >= 500 },
  { id: 'level10',     name: 'Ascendant (Lv10)', icon: '\u2B50', test: st => st.level >= 10 },
  { id: 'boss1',       name: 'Boss Slayer',      icon: '\u265A', test: st => st.bosses >= 1 },
  { id: 'chest1',      name: 'Treasure Hunter',  icon: '\u2666', test: st => st.chests >= 1 },
  { id: 'rich',        name: 'Coin Baron (1000)',icon: '\u2666', test: st => st.coinsRun >= 1000 },
  { id: 'survivor',    name: 'Survivor (10min)', icon: '\u23F1', test: st => st.time >= 600 },
];
