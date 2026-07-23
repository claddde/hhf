/* ============================================================
   config.js — Central, tunable game constants.
   Change values here to rebalance movement, camera, world, etc.
   ============================================================ */

export const CONFIG = {
  // --- Player movement (all speeds in px/sec) ---
  player: {
    walkSpeed: 130,        // max speed while walking
    runSpeed:  230,        // max speed while running (Shift / RUN)
    accel:     14,         // higher = snappier acceleration
    decel:     16,         // higher = quicker stop
    displaySize: 76,       // rendered size in px (source art is scaled down, never up)
    // Collision body (as a fraction of the source frame). Keeps feet-area hitbox.
    bodyScaleX: 0.42,
    bodyScaleY: 0.32,
    bodyOffsetY: 0.30,     // push hitbox toward the lower half
  },

  // --- World / map ---
  world: {
    width:  2600,
    height: 2200,
    floorColor: '#0d120c',
  },

  // --- Camera ---
  camera: {
    lerp: 0.10,            // follow smoothing (0..1); lower = smoother/lazier
    deadzoneW: 120,        // px band around centre where the cam does not move
    deadzoneH: 90,
  },

  // --- Rendering / debug ---
  debug: false,            // set true to draw physics bodies

  // ==========================================================
  // PHASE 2 — COMBAT (additive; Phase 1 sections untouched)
  // ==========================================================

  // Player survival stats (base values; upgrades multiply/add on top).
  survival: {
    maxHP: 100,
    invulnMs: 600,         // i-frames after taking a hit
    baseMagnet: 78,        // px radius that pulls XP gems in
    pickupRadius: 26,      // touch radius that always collects gems
  },

  // Auto-attack weapon (rose bolt).
  weapon: {
    damage: 12,
    cooldownMs: 620,       // time between shots (attack speed)
    range: 460,            // max target-acquire distance
    critChance: 0.08,      // 0..1
    critMult: 2.0,         // crit damage multiplier
    projSpeed: 460,
    projSize: 1.0,         // scale multiplier on the bolt
    projCount: 1,          // number of bolts per volley
    projLifeMs: 1100,
    pierce: 0,             // extra enemies a bolt can pass through
    spreadDeg: 12,         // fan spread when firing multiple bolts
  },

  // Enemy roster — placeholder pixel sprites. hp/speed/dmg/xp per type.
  enemies: {
    types: {
      bat:        { key: 'bat',         hp: 8,   speed: 118, dmg: 4,  xp: 1, scale: 1.0, radius: 9,  weight: 26 },
      spider:     { key: 'spider',      hp: 12,  speed: 96,  dmg: 6,  xp: 1, scale: 1.0, radius: 10, weight: 22 },
      ghost:      { key: 'ghost',       hp: 18,  speed: 74,  dmg: 8,  xp: 2, scale: 1.0, radius: 11, weight: 20 },
      skeleton:   { key: 'skeleton',    hp: 26,  speed: 68,  dmg: 9,  xp: 2, scale: 1.0, radius: 10, weight: 16 },
      zombie_girl:{ key: 'zombie_girl', hp: 44,  speed: 52,  dmg: 14, xp: 4, scale: 1.05,radius: 11, weight: 11 },
      shadow:     { key: 'shadow',      hp: 90,  speed: 60,  dmg: 18, xp: 8, scale: 1.15,radius: 13, weight: 5, elite: true },
    },
    separation: 26,        // push-apart radius so they don't stack/stick
    knockback: 160,        // impulse applied when hit
  },

  // Spawner — never on-screen, never beside the player, ramps over time.
  spawn: {
    baseIntervalMs: 1150,  // starting gap between spawns
    minIntervalMs: 260,    // hardest cap
    rampSeconds: 300,      // time to reach hardest interval
    ringMin: 80,           // spawn just outside the visible area (px past edge)
    ringMax: 260,
    maxAlive: 220,         // performance cap
    hpGrowthPerMin: 0.28,  // +28% enemy HP each minute
    eliteAfterSec: 75,     // shadow creatures start appearing after this
  },

  // Leveling curve.
  level: {
    baseXP: 5,             // XP needed for level 2
    growth: 1.32,          // each level needs this much more
  },

  // ==========================================================
  // PHASE 3 — progression / bosses / loot (additive)
  // ==========================================================
  phase3: {
    maxWeaponSlots: 6,
    bossFirstSec: 90,      // first boss appears
    bossIntervalSec: 140,  // gap between bosses
    bossWarnSec: 4,        // warning dialog lead time
    bossHpGrowth: 0.85,    // +85% boss HP per boss spawned
    bossDmgGrowth: 0.45,
    bossHazardSpeed: 210,
    chestXP: 40,           // "large XP" from a chest
    chestCoins: [30, 70],  // coin range from a chest
    coinValue: 1,
    healAmount: 25,        // heart pickup
    buffDefaultDur: 8,
    magnetClearAll: true,  // magnet item pulls every gem on screen
  },
};

// Depth layers keep sorting predictable across systems.
export const DEPTH = {
  FLOOR: 0,
  PROP:  10,   // props & player share the y-sorted band (depth = y)
  PLAYER: 10,
  GEM:    5,
  ENEMY:  10,
  PROJ:   90000,
  FX:    100000,
  HUD:   200000,
};

// Upgrade catalogue (Phase 2). Each `apply(stats)` mutates the live stats.
export const UPGRADES = [
  { id: 'damage',    name: 'Sharper Thorns',   desc: '+25% Attack Damage',      apply: s => s.damage *= 1.25 },
  { id: 'atkspeed',  name: 'Quick Draw',       desc: '+18% Attack Speed',       apply: s => s.cooldownMs *= 0.82 },
  { id: 'movespeed', name: 'Light Feet',       desc: '+12% Movement Speed',     apply: s => s.moveMult *= 1.12 },
  { id: 'critchance',name: 'Keen Eye',         desc: '+8% Critical Chance',     apply: s => s.critChance = Math.min(1, s.critChance + 0.08) },
  { id: 'critdmg',   name: 'Cruel Strike',     desc: '+40% Critical Damage',    apply: s => s.critMult += 0.40 },
  { id: 'projspeed', name: 'Swift Bolts',      desc: '+22% Projectile Speed',   apply: s => s.projSpeed *= 1.22 },
  { id: 'projsize',  name: 'Big Blooms',       desc: '+30% Projectile Size',    apply: s => s.projSize *= 1.30 },
  { id: 'multishot', name: 'Extra Bolt',       desc: '+1 Projectile',           apply: s => s.projCount += 1 },
  { id: 'magnet',    name: 'Soul Magnet',      desc: '+40% Magnet Radius',      apply: s => s.magnet *= 1.40 },
  { id: 'maxhp',     name: 'Vital Bloom',      desc: '+25 Max Health (heal 25)',apply: s => { s.maxHP += 25; s.healQueued = (s.healQueued||0) + 25; } },
  { id: 'pierce',    name: 'Piercing Rose',    desc: '+1 Pierce',               apply: s => s.pierce += 1 },
  { id: 'regen',     name: 'Blood Ritual',     desc: 'Regenerate 1 HP / sec',   apply: s => s.regen += 1 },
];
