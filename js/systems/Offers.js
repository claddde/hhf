/* ============================================================
   Offers.js — builds the choice sets for the Level-Up dialog and
   the reward for a Treasure Chest. Choices mix new weapons,
   weapon upgrades and passive abilities, coloured by rarity.
   ============================================================ */

import { WEAPONS, PASSIVES, PASSIVE_IDS, RARITY, rollRarity } from '../data/gamedata.js';

/** Up to 3 level-up choices. Each: {kind,id,name,desc,icon,rarityKey,apply}. */
export function buildLevelUpOffers(scene) {
  const wm = scene.weaponMgr, prog = scene.progression, save = scene.save;
  const pool = [];

  // Weapon upgrades (Rose Bolt + owned extras).
  if (prog.roseLevel < WEAPONS.rose_bolt.maxLevel) {
    pool.push(weaponUp('rose_bolt', prog.roseLevel, () => scene.upgradeRose()));
  }
  wm.owned.forEach((e) => {
    if (e.level < e.def.maxLevel) pool.push(weaponUp(e.def.id, e.level, () => wm.levelUp(e.def.id)));
  });

  // New weapons (unlocked, not owned, slot available).
  if (wm.hasSlot()) {
    for (const id of save.data.unlockedWeapons) {
      if (id === 'rose_bolt' || wm.has(id)) continue;
      const d = WEAPONS[id];
      pool.push({ kind: 'newweapon', id, name: d.name, desc: 'New Weapon', icon: d.icon, rarityKey: d.rarity, color: RARITY[d.rarity].color, apply: () => wm.add(id) });
    }
  }

  // Passives.
  for (const id of PASSIVE_IDS) {
    const p = PASSIVES[id];
    pool.push({ kind: 'passive', id, name: p.name, desc: p.desc, icon: p.icon, rarityKey: 'uncommon', color: RARITY.uncommon.color, apply: () => { p.apply(prog); prog.passivesTaken[id] = (prog.passivesTaken[id] || 0) + 1; scene.syncStats(); } });
  }

  return Phaser.Utils.Array.Shuffle(pool).slice(0, 3);
}

function weaponUp(id, level, apply) {
  const d = WEAPONS[id];
  return { kind: 'weaponup', id, name: d.name, desc: `Upgrade \u2192 Lv ${level + 1}`, icon: d.icon, rarityKey: d.rarity, color: RARITY[d.rarity].color, apply };
}

/** One chest reward: {title, rarityKey, icon, lines[], apply}. */
export function buildChestReward(scene) {
  const wm = scene.weaponMgr, prog = scene.progression, save = scene.save;
  const luck = prog.totalLuck();
  const rarityKey = rollRarity(luck);
  const roll = Math.random();

  // Try to grant a new weapon on higher rarities.
  const availWeapons = save.data.unlockedWeapons.filter(id => id !== 'rose_bolt' && !wm.has(id));
  if (wm.hasSlot() && availWeapons.length && roll < 0.35) {
    const id = Phaser.Utils.Array.GetRandom(availWeapons);
    const d = WEAPONS[id];
    return { title: 'New Weapon!', rarityKey: d.rarity, icon: d.icon,
      lines: [d.name, RARITY[d.rarity].name], apply: () => wm.add(id) };
  }

  // Weapon evolution (+2 levels to a random owned weapon).
  const owned = [...wm.owned.values()].filter(e => e.level < e.def.maxLevel);
  if (owned.length && roll < 0.55) {
    const e = Phaser.Utils.Array.GetRandom(owned);
    return { title: 'Weapon Evolution!', rarityKey: 'epic', icon: e.def.icon,
      lines: [e.def.name, '+2 Levels'], apply: () => wm.levelUp(e.def.id, 2) };
  }

  // Rare / legendary passive.
  if (roll < 0.8) {
    const id = Phaser.Utils.Array.GetRandom(PASSIVE_IDS);
    const p = PASSIVES[id];
    const times = rarityKey === 'legendary' || rarityKey === 'mythic' ? 2 : 1;
    return { title: (times > 1 ? 'Legendary Upgrade!' : 'Rare Upgrade!'), rarityKey, icon: p.icon,
      lines: [p.name + (times > 1 ? ' x2' : ''), p.desc], apply: () => { for (let i = 0; i < times; i++) { p.apply(prog); prog.passivesTaken[id] = (prog.passivesTaken[id] || 0) + 1; } scene.syncStats(); } };
  }

  // Coins + large XP.
  const coins = Phaser.Math.Between(30, 80);
  return { title: 'Treasure!', rarityKey: 'rare', icon: '\u2666',
    lines: [`+${coins} Coins`, '+40 XP'], apply: () => { prog.addCoins(coins); scene.gainXP(40); } };
}
