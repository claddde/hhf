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

  // Enemy roster — placeholder pixel sprites (reused across behaviours with
  // tints). Each type has a `behavior` that drives its AI. `after` gates the
  // type behind a difficulty index so variety unlocks as pressure ramps.
  enemies: {
    types: {
      // --- baseline chasers (always available) ---
      bat:        { key: 'bat',         hp: 6,   speed: 112, dmg: 3,  xp: 1, scale: 1.0, radius: 9,  weight: 24, behavior: 'chase' },
      spider:     { key: 'spider',      hp: 10,  speed: 92,  dmg: 4,  xp: 1, scale: 1.0, radius: 10, weight: 20, behavior: 'chase' },
      ghost:      { key: 'ghost',       hp: 15,  speed: 72,  dmg: 5,  xp: 2, scale: 1.0, radius: 11, weight: 18, behavior: 'chase' },
      skeleton:   { key: 'skeleton',    hp: 22,  speed: 66,  dmg: 6,  xp: 2, scale: 1.0, radius: 10, weight: 14, behavior: 'chase' },
      zombie_girl:{ key: 'zombie_girl', hp: 38,  speed: 50,  dmg: 9,  xp: 4, scale: 1.05,radius: 11, weight: 10, behavior: 'chase' },
      // --- behaviour variety (unlock as difficulty grows) ---
      swift:      { key: 'bat',         hp: 10,  speed: 205, dmg: 6,  xp: 2, scale: 0.9, radius: 8,  weight: 12, behavior: 'chase', tint: 0x8ff0ff, after: 1 },
      tank:       { key: 'zombie_girl', hp: 150, speed: 40,  dmg: 20, xp: 7, scale: 1.35,radius: 15, weight: 8,  behavior: 'chase', tint: 0x7a6a9a, after: 2 },
      exploder:   { key: 'spider',      hp: 22,  speed: 108, dmg: 8,  xp: 3, scale: 1.1, radius: 10, weight: 9,  behavior: 'exploder', tint: 0xff6a3a, after: 2, explodeR: 92, explodeDmg: 26 },
      archer:     { key: 'skeleton',    hp: 24,  speed: 46,  dmg: 7,  xp: 3, scale: 1.0, radius: 10, weight: 10, behavior: 'ranged', tint: 0xd0c060, after: 2, shootCd: 1.7, keepDist: 240, bulletSpd: 240, bulletDmg: 10 },
      phantom:    { key: 'ghost',       hp: 20,  speed: 92,  dmg: 10, xp: 3, scale: 1.0, radius: 11, weight: 8,  behavior: 'invisible', tint: 0x9fb0ff, after: 3, revealDist: 150 },
      blinker:    { key: 'ghost',       hp: 26,  speed: 66,  dmg: 11, xp: 4, scale: 1.0, radius: 11, weight: 7,  behavior: 'teleport', tint: 0xc07aff, after: 3, blinkCd: 3.2, blinkRange: 220 },
      mender:     { key: 'zombie_girl', hp: 60,  speed: 58,  dmg: 8,  xp: 5, scale: 1.05,radius: 11, weight: 6,  behavior: 'healer', tint: 0x6fe08a, after: 4, healR: 150, healRate: 10 },
      warlock:    { key: 'shadow',      hp: 70,  speed: 62,  dmg: 12, xp: 6, scale: 1.1, radius: 12, weight: 5,  behavior: 'buffer', tint: 0x5f9fff, after: 4, buffR: 170 },
      summoner:   { key: 'shadow',      hp: 80,  speed: 50,  dmg: 12, xp: 7, scale: 1.1, radius: 12, weight: 5,  behavior: 'summoner', tint: 0xff8ad0, after: 5, summonCd: 4.5, summonKey: 'spider', summonN: 2 },
      brute:      { key: 'skeleton',    hp: 55,  speed: 64,  dmg: 12, xp: 5, scale: 1.15,radius: 12, weight: 6,  behavior: 'shielded', tint: 0x8ff0d0, after: 4, shieldHits: 4 },
      // --- elite baseline (rare, tough) ---
      shadow:     { key: 'shadow',      hp: 90,  speed: 60,  dmg: 18, xp: 8, scale: 1.15,radius: 13, weight: 4, behavior: 'chase', elite: true, after: 3 },

      // ===== PHASE 7.5 — biome-exclusive enemies (spawn only in their region) =====
      // Corrupted Jungle
      corrupt_spore: { key: 'corrupt_spore', hp: 70,  speed: 104, dmg: 16, xp: 6, scale: 1.0, radius: 11, weight: 1, behavior: 'exploder', explodeR: 100, explodeDmg: 30 },
      j_stalker:     { key: 'corrupt_spore', hp: 90,  speed: 120, dmg: 18, xp: 7, scale: 1.05,radius: 11, weight: 1, behavior: 'invisible', tint: 0x4f8f2a, revealDist: 150 },
      j_spitter:     { key: 'corrupt_spore', hp: 80,  speed: 54,  dmg: 12, xp: 7, scale: 1.0, radius: 11, weight: 1, behavior: 'ranged', tint: 0xc8ff6a, shootCd: 1.5, keepDist: 250, bulletSpd: 250, bulletDmg: 16 },
      // Dark Mushroom Forest
      myco_crawler:  { key: 'myco_crawler', hp: 130, speed: 70,  dmg: 20, xp: 9, scale: 1.1, radius: 12, weight: 1, behavior: 'chase' },
      m_spore:       { key: 'myco_crawler', hp: 90,  speed: 96,  dmg: 16, xp: 8, scale: 0.95,radius: 11, weight: 1, behavior: 'exploder', tint: 0xc8ff8a, explodeR: 96, explodeDmg: 28 },
      m_sporeling:   { key: 'myco_crawler', hp: 150, speed: 52,  dmg: 16, xp: 10,scale: 1.15,radius: 13, weight: 1, behavior: 'summoner', tint: 0xa86fe0, summonCd: 4, summonKey: 'corrupt_spore', summonN: 2 },
      // Frozen Wasteland
      ice_shard:     { key: 'ice_shard',    hp: 200, speed: 46,  dmg: 24, xp: 11,scale: 1.25,radius: 15, weight: 1, behavior: 'chase' },
      f_hunter:      { key: 'ice_shard',    hp: 110, speed: 210, dmg: 20, xp: 9, scale: 0.95,radius: 11, weight: 1, behavior: 'chase', tint: 0x9fd8ff },
      f_howler:      { key: 'ice_shard',    hp: 150, speed: 60,  dmg: 16, xp: 12,scale: 1.15,radius: 13, weight: 1, behavior: 'buffer', tint: 0xd0f4ff, buffR: 190 },
      // Volcanic Empire
      magma_imp:     { key: 'magma_imp',    hp: 150, speed: 92,  dmg: 26, xp: 12,scale: 1.05,radius: 12, weight: 1, behavior: 'chase' },
      v_hound:       { key: 'magma_imp',    hp: 120, speed: 220, dmg: 22, xp: 11,scale: 0.95,radius: 11, weight: 1, behavior: 'chase', tint: 0xffb04a },
      v_bomber:      { key: 'magma_imp',    hp: 100, speed: 108, dmg: 20, xp: 11,scale: 1.0, radius: 11, weight: 1, behavior: 'exploder', tint: 0xff3a1a, explodeR: 120, explodeDmg: 40 },
      // Sandstorm Desert
      sand_lurker:   { key: 'sand_lurker',  hp: 190, speed: 78,  dmg: 28, xp: 13,scale: 1.1, radius: 13, weight: 1, behavior: 'chase' },
      d_reaver:      { key: 'sand_lurker',  hp: 140, speed: 60,  dmg: 18, xp: 12,scale: 1.0, radius: 12, weight: 1, behavior: 'ranged', tint: 0xe0c078, shootCd: 1.4, keepDist: 260, bulletSpd: 280, bulletDmg: 22 },
      d_burrower:    { key: 'sand_lurker',  hp: 170, speed: 70,  dmg: 24, xp: 13,scale: 1.05,radius: 13, weight: 1, behavior: 'teleport', tint: 0xa07830, blinkCd: 2.8, blinkRange: 240 },
      // Floating Sky Kingdom
      sky_wisp:      { key: 'sky_wisp',     hp: 160, speed: 150, dmg: 30, xp: 15,scale: 1.0, radius: 11, weight: 1, behavior: 'chase' },
      s_seraph:      { key: 'sky_wisp',     hp: 150, speed: 70,  dmg: 22, xp: 15,scale: 1.05,radius: 12, weight: 1, behavior: 'ranged', tint: 0xffe08a, shootCd: 1.2, keepDist: 280, bulletSpd: 320, bulletDmg: 26 },
      s_sentinel:    { key: 'sky_wisp',     hp: 260, speed: 60,  dmg: 26, xp: 18,scale: 1.25,radius: 14, weight: 1, behavior: 'shielded', tint: 0xbfe4ff, shieldHits: 6 },
    },
    separation: 26,        // push-apart radius so they don't stack/stick
    knockback: 160,        // impulse applied when hit
    // Random ELITE promotion: any spawn can roll into a buffed elite.
    elite: {
      baseChance: 0.0,     // starting chance (grows with difficulty)
      maxChance: 0.16,     // hard cap (lowered for the demo — fewer elites)
      hpMult: 2.6, dmgMult: 1.4, speedMult: 1.1, xpMult: 4, scaleMult: 1.3,
      tints: [0xffd24f, 0xff5a8a, 0x9f7aff, 0x5fe0c0],  // gold/rose/violet/teal
    },
  },

  // ==========================================================
  // PHASE 7.5 — DYNAMIC DIFFICULTY  (softened for the 7.6 public demo)
  // A single difficulty index grows over time (and with boss kills).
  // Everything dangerous scales off it, gradually and fairly.
  // ==========================================================
  difficulty: {
    perMinute: 0.7,        // index gained each minute survived (was 1.0)
    perBossKill: 0.5,      // extra index per boss defeated
    // Scaling vs. index (index 0 = start). Gentle to keep the early demo fun.
    hpPerIndex: 0.16,      // +16% enemy HP per index point (was 0.22)
    speedPerIndex: 0.022,  // +2.2% enemy speed per index (capped)
    speedCap: 1.4,         // never faster than +40%
    dmgPerIndex: 0.045,    // +4.5% contact damage per index (was 0.06)
    dmgCap: 2.0,
    intelAt: 4,            // predictive-aim "smarter" AI kicks in later (was 3)
    elitePerIndex: 0.014,  // elite chance added per index (was 0.02)
    miniBossEvery: 75,     // seconds between mini-boss waves (was 55 — less frequent)
    miniBossAfterIndex: 3, // no mini-boss waves early (was 2)
    // PHASE 7.5 — regional + world-level baseline scaling (eased for the demo).
    regionTierWeight: 0.4,   // each region tier point adds this to the base index (was 0.5)
    worldLevelWeight: 0.12,  // each world level adds this to the base index (was 0.15)
    lootPerWorldLevel: 0.03, // loot/rare-drop bonus per world level
  },

  // Spawner — never on-screen, never beside the player, ramps over time.
  spawn: {
    baseIntervalMs: 1550,  // starting gap between spawns (was 1150 — calmer early game)
    minIntervalMs: 340,    // hardest cap (was 260)
    rampSeconds: 390,      // time to reach hardest interval (was 300 — slower ramp)
    ringMin: 80,           // spawn just outside the visible area (px past edge)
    ringMax: 260,
    maxAlive: 200,         // performance cap
    hpGrowthPerMin: 0.28,  // (legacy; live scaling is via Difficulty)
    eliteAfterSec: 110,    // baseline elite type starts later (was 75)
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
    bossFirstSec: 120,     // first boss appears later (was 90 — easier early demo)
    bossIntervalSec: 160,  // gap between bosses (was 140)
    bossWarnSec: 5,        // warning dialog lead time
    bossHpGrowth: 0.6,     // +60% boss HP per boss spawned (was 0.85)
    bossDmgGrowth: 0.32,   // (was 0.45)
    bossHazardSpeed: 195,  // (was 210 — easier to dodge)
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
