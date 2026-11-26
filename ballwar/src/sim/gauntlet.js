/**
 * Roguelike Gauntlet Towers (2 Themed 10-Floor Boss Towers x 5 Escalating Challenge Levels)
 * & 12 Stacking PvE Run Relics.
 * Relics & Boss Modifiers ONLY activate inside MODES.GAUNTLET — Online P2P, Quickmatch, Bot, Local, and Sandbox stay 100% untouched.
 */

export const CHALLENGE_LEVELS = Object.freeze([
  {
    level: 1,
    name: 'Standard',
    badge: 'LV 1',
    color: '#38bdf8',
    hearts: 3,
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    enemyRateMult: 1.0,
    suddenDeathSec: 30,
    rewardMult: 1.0,
    clearTrophies: 45,
    firstClearSparks: 100,
    summary: 'Base Tower • 3 ♥ • 30s SD • 1.0× Rewards',
  },
  {
    level: 2,
    name: 'Hardened',
    badge: 'LV 2',
    color: '#4ade80',
    hearts: 3,
    enemyHpMult: 1.15,
    enemyDmgMult: 1.12,
    enemyRateMult: 1.06,
    suddenDeathSec: 26,
    rewardMult: 1.4,
    clearTrophies: 65,
    firstClearSparks: 200,
    summary: '+15% Boss HP • +12% DMG • 26s SD • 1.4× Rewards',
  },
  {
    level: 3,
    name: 'Brutal',
    badge: 'LV 3',
    color: '#facc15',
    hearts: 2,
    enemyHpMult: 1.3,
    enemyDmgMult: 1.25,
    enemyRateMult: 1.12,
    suddenDeathSec: 22,
    rewardMult: 1.85,
    clearTrophies: 90,
    firstClearSparks: 300,
    summary: '+30% Boss HP • +25% DMG • 2 ♥ • 22s SD • 1.85× Rewards',
  },
  {
    level: 4,
    name: 'Nightmare',
    badge: 'LV 4',
    color: '#fb923c',
    hearts: 2,
    enemyHpMult: 1.48,
    enemyDmgMult: 1.4,
    enemyRateMult: 1.18,
    suddenDeathSec: 19,
    rewardMult: 2.4,
    clearTrophies: 120,
    firstClearSparks: 400,
    summary: '+48% Boss HP • +40% DMG • 2 ♥ • 19s SD • 2.4× Rewards',
  },
  {
    level: 5,
    name: 'Omega Ascension',
    badge: 'LV 5',
    color: '#e879f9',
    hearts: 1,
    enemyHpMult: 1.7,
    enemyDmgMult: 1.58,
    enemyRateMult: 1.25,
    suddenDeathSec: 16,
    rewardMult: 3.2,
    clearTrophies: 160,
    firstClearSparks: 500,
    summary: '+70% Boss HP • +58% DMG • 1 ♥ • 16s SD • 3.2× Rewards',
  },
]);

export const GAUNTLET_FLOORS = Object.freeze([
  {
    floor: 1,
    title: 'Warmup Street',
    subtitle: 'Watch your step on the slippery opener.',
    teamSize: 1,
    bossTeam: ['banana'],
    bossHpScale: 0.88,
    sparksReward: 30,
  },
  {
    floor: 2,
    title: 'Street Food Duel',
    subtitle: 'Dodge the sizzling rotary Doner blades.',
    teamSize: 1,
    bossTeam: ['kebab'],
    bossHpScale: 0.94,
    sparksReward: 35,
  },
  {
    floor: 3,
    title: 'Prompt Injection',
    subtitle: 'Hallucinated clones flood the court.',
    teamSize: 1,
    bossTeam: ['chatgpt'],
    bossHpScale: 1.0,
    sparksReward: 40,
  },
  {
    floor: 4,
    title: 'Indestructible Brick',
    subtitle: 'Heavy armor and wall-cracking ringtones.',
    teamSize: 1,
    bossTeam: ['nokia'],
    bossHpScale: 1.0,
    sparksReward: 45,
  },
  {
    floor: 5,
    title: 'MID-BOSS: The Meme Classic',
    subtitle: '2v2 Boss Arena! Draft a teammate vs Hydrogen Bomb & Coughing Baby.',
    teamSize: 2,
    bossTeam: ['hydrogenbomb', 'coughingbaby'],
    bossHpScale: 1.04,
    isBoss: true,
    sparksReward: 80,
  },
  {
    floor: 6,
    title: 'Air Defense Grid',
    subtitle: 'Active radar shoots down projectiles mid-flight.',
    teamSize: 1,
    bossTeam: ['israel'],
    bossHpScale: 1.05,
    sparksReward: 55,
  },
  {
    floor: 7,
    title: 'Top 20% Standards',
    subtitle: 'Avoid the swinging Hypergamy Chart pole.',
    teamSize: 1,
    bossTeam: ['hypergamy'],
    bossHpScale: 1.08,
    sparksReward: 60,
  },
  {
    floor: 8,
    title: 'ELITE DUO: AI Alignment',
    subtitle: '2v2 Boss Arena! Claude & Gemini team up with refusal shields & beams.',
    teamSize: 2,
    bossTeam: ['claude', 'gemini'],
    bossHpScale: 1.1,
    isBoss: true,
    sparksReward: 100,
  },
  {
    floor: 9,
    title: 'Absolute Brainrot',
    subtitle: 'Fanum Tax, Ohio chaos orbs, and 67 split-beams.',
    teamSize: 1,
    bossTeam: ['brainrot'],
    bossHpScale: 1.15,
    sparksReward: 75,
  },
  {
    floor: 10,
    title: 'FINAL BOSS: Omega Singularity',
    subtitle: '2v2 Grand Finale! Defeat Omega & Aura to unlock Cosmic Void Ω & Tower II.',
    teamSize: 2,
    bossTeam: ['omega', 'aura'],
    bossHpScale: 1.2,
    isBoss: true,
    sparksReward: 200,
  },
]);

export const SPIRE_FLOORS = Object.freeze([
  {
    floor: 1,
    title: 'Webbed Catacombs',
    subtitle: 'Crimson silk tripwires lace the obsidian entrance.',
    teamSize: 1,
    bossTeam: ['blackspider'],
    bossHpScale: 0.96,
    sparksReward: 40,
  },
  {
    floor: 2,
    title: 'Alchemical Vault',
    subtitle: 'Volatile brews splash toxic & healing zones across the floor.',
    teamSize: 1,
    bossTeam: ['alchemist'],
    bossHpScale: 1.0,
    sparksReward: 45,
  },
  {
    floor: 3,
    title: 'Sus Emergency',
    subtitle: 'Vent ambushes and sabotage strikes from the shadows.',
    teamSize: 1,
    bossTeam: ['impostor'],
    bossHpScale: 1.04,
    sparksReward: 50,
  },
  {
    floor: 4,
    title: 'Chrono Fracture',
    subtitle: 'Time-dilation freezes projectiles and bends arena tempo.',
    teamSize: 1,
    bossTeam: ['chronos'],
    bossHpScale: 1.08,
    sparksReward: 55,
  },
  {
    floor: 5,
    title: 'MID-BOSS: Twin Apocalypse',
    subtitle: '2v2 Boss Arena! Overwhelm Duplicator swarms & regenerating Hydra.',
    teamSize: 2,
    bossTeam: ['duplicator', 'hydra'],
    bossHpScale: 1.1,
    isBoss: true,
    sparksReward: 105,
  },
  {
    floor: 6,
    title: 'Event Horizon',
    subtitle: 'Gravity wells crush everything toward the abyssal core.',
    teamSize: 1,
    bossTeam: ['gravity'],
    bossHpScale: 1.12,
    sparksReward: 65,
  },
  {
    floor: 7,
    title: 'Blood Covenant',
    subtitle: 'Risen skeletons swarm while soul siphons drain your vitality.',
    teamSize: 1,
    bossTeam: ['necromancer'],
    bossHpScale: 1.14,
    sparksReward: 70,
  },
  {
    floor: 8,
    title: 'ELITE DUO: Solar Pantheon',
    subtitle: '2v2 Boss Arena! Blazing Solar flares paired with immortal Phoenix rebirth.',
    teamSize: 2,
    bossTeam: ['solar', 'phoenix'],
    bossHpScale: 1.16,
    isBoss: true,
    sparksReward: 130,
  },
  {
    floor: 9,
    title: 'High-Roller Anomaly',
    subtitle: 'Rigged jackpots and wild crit spikes decide every bounce.',
    teamSize: 1,
    bossTeam: ['gambler'],
    bossHpScale: 1.2,
    sparksReward: 85,
  },
  {
    floor: 10,
    title: 'FINAL BOSS: Void Sovereign',
    subtitle: '2v2 Grand Finale! Mirror mimics your kit while Hacker corrupts the arena!',
    teamSize: 2,
    bossTeam: ['mirror', 'hacker'],
    bossHpScale: 1.26,
    isBoss: true,
    sparksReward: 260,
  },
]);

export const GAUNTLET_TOWERS = Object.freeze([
  {
    id: 'citadel',
    order: 1,
    name: 'Meme Apex Citadel',
    badge: 'TOWER I • MEME & AI LEGENDS',
    icon: '🗼',
    accent: '#a855f7',
    desc: '10 escalating floors of viral icons, AI juggernauts (Claude & Gemini), and the Omega Singularity finale.',
    bossSummary: 'Bosses: H-Bomb & Baby (F5) • Claude & Gemini (F8) • Omega & Aura (F10)',
    clearRewardHint: 'First Clear unlocks Cosmic Void Ω Theme + Tower II!',
    towerRewardMult: 1.0,
    requiresTowerId: null,
    floors: GAUNTLET_FLOORS,
  },
  {
    id: 'spire',
    order: 2,
    name: 'Abyssal Void Spire',
    badge: 'TOWER II • MYTHIC & EXCLUSIVE',
    icon: '🌑',
    accent: '#22d3ee',
    desc: 'A darker, higher-stakes 10-floor crucible starring Mythic & Exclusive titans — +25% bonus Sparks & XP on every floor!',
    bossSummary: 'Bosses: Duplicator & Hydra (F5) • Solar & Phoenix (F8) • Mirror & Hacker (F10)',
    clearRewardHint: 'First Clear auto-unlocks Cyber Glitch Trail (+250 ✨ if owned)!',
    towerRewardMult: 1.25,
    requiresTowerId: 'citadel',
    floors: SPIRE_FLOORS,
  },
]);

export const GAUNTLET_RELICS = Object.freeze([
  {
    id: 'vampiric_walls',
    name: 'Vampiric Walls',
    icon: '🩸',
    rarity: 'Rare',
    desc: 'Heal +3 HP on every wall bounce (0.6s cooldown).',
  },
  {
    id: 'overclocked',
    name: 'Overclocked Core',
    icon: '⚡',
    rarity: 'Epic',
    desc: '+18% faster ability trigger speed on all your balls.',
  },
  {
    id: 'glass_cannon',
    name: 'Glass Cannon',
    icon: '💥',
    rarity: 'Legendary',
    desc: '+30% damage dealt, but -15 starting HP.',
  },
  {
    id: 'titan_plating',
    name: 'Titan Plating',
    icon: '🛡️',
    rarity: 'Rare',
    desc: '+25 Max HP and +0.35x knockback mass.',
  },
  {
    id: 'sonic_bounce',
    name: 'Sonic Ricochet',
    icon: '🔊',
    rarity: 'Epic',
    desc: 'Every 3rd wall bounce emits a 6-DMG expanding shockwave ring.',
  },
  {
    id: 'second_wind',
    name: 'Second Wind',
    icon: '🔥',
    rarity: 'Mythic',
    desc: 'Once per floor, survive a fatal hit at 25 HP with 0.7s phase invulnerability.',
  },
  {
    id: 'frost_touch',
    name: 'Frost Aura',
    icon: '❄️',
    rarity: 'Rare',
    desc: 'Ball-to-ball collisions apply +2 Chill stacks to enemies.',
  },
  {
    id: 'thorns_shell',
    name: 'Spiked Shell',
    icon: '🌵',
    rarity: 'Epic',
    desc: 'Reflect 22% of incoming damage back at the closest enemy.',
  },
  {
    id: 'turbo_boost',
    name: 'Nitro Bearings',
    icon: '🚀',
    rarity: 'Rare',
    desc: '+18% movement speed and +100 max speed cap.',
  },
  {
    id: 'poison_trail',
    name: 'Bio-Leak',
    icon: '☣️',
    rarity: 'Epic',
    desc: 'Drop a drifting toxic puddle behind your ball every 2.4s.',
  },
  {
    id: 'aegis_start',
    name: 'Aegis Start',
    icon: '✨',
    rarity: 'Legendary',
    desc: 'Block the first 2 incoming hits each floor completely.',
  },
  {
    id: 'golden_magnet',
    name: 'Golden Magnet',
    icon: '🧲',
    rarity: 'Epic',
    desc: '+40% bonus Sparks & Mastery XP this run, plus +10 Max HP.',
  },
]);

export function getGauntletTower(towerId = 'citadel') {
  return GAUNTLET_TOWERS.find((t) => t.id === towerId) || GAUNTLET_TOWERS[0];
}

export function getChallengeDef(level = 1) {
  const lv = Math.max(1, Math.min(CHALLENGE_LEVELS.length, Math.floor(Number(level) || 1)));
  return CHALLENGE_LEVELS[lv - 1];
}

export function getGauntletFloor(floorNum, towerId = 'citadel') {
  const tower = getGauntletTower(towerId);
  const idx = Math.max(0, Math.min(tower.floors.length - 1, (floorNum || 1) - 1));
  return tower.floors[idx];
}

export function getRelicDef(id) {
  return GAUNTLET_RELICS.find((r) => r.id === id) || GAUNTLET_RELICS[0];
}

export function drawRelicChoices(ownedIds = [], count = 3, rng = Math.random) {
  const owned = new Set(ownedIds);
  // Prefer unowned relics first; allow stacking copies if almost all are owned
  let pool = GAUNTLET_RELICS.filter((r) => !owned.has(r.id));
  if (pool.length < count) pool = [...GAUNTLET_RELICS];
  const copy = [...pool];
  const out = [];
  while (out.length < count && copy.length > 0) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function countRelic(relicIds, id) {
  let c = 0;
  for (const r of relicIds) if (r === id) c++;
  return c;
}

export function getRelicRewardMult(relicIds = []) {
  return 1 + countRelic(relicIds, 'golden_magnet') * 0.4;
}

export function getRelicDmgMult(relicIds = []) {
  return 1 + countRelic(relicIds, 'glass_cannon') * 0.3;
}

export function applyRelicsOnInit(sim, ball, relicIds = []) {
  if (!relicIds || relicIds.length === 0 || ball.owner !== 1) return;
  ball._relicState = {
    vampCd: 0,
    wallCount: 0,
    poisonCd: 1.4,
    aegisLeft: countRelic(relicIds, 'aegis_start') * 2,
    secondWindLeft: countRelic(relicIds, 'second_wind'),
  };

  const hpBonus =
    countRelic(relicIds, 'titan_plating') * 25 +
    countRelic(relicIds, 'golden_magnet') * 10 -
    countRelic(relicIds, 'glass_cannon') * 15;
  if (hpBonus !== 0) {
    ball.maxHp = Math.max(25, ball.maxHp + hpBonus);
    ball.hp = Math.max(25, Math.min(ball.maxHp, ball.hp + hpBonus));
  }

  const massBonus = countRelic(relicIds, 'titan_plating') * 0.35;
  if (massBonus > 0) ball.mass = (ball.mass || 1) + massBonus;

  const overclock = countRelic(relicIds, 'overclocked');
  if (overclock > 0) ball.rateMult = (ball.rateMult || 1) * Math.pow(1.18, overclock);

  const turbo = countRelic(relicIds, 'turbo_boost');
  if (turbo > 0) {
    ball.customSpeedCap = Math.max(ball.customSpeedCap || 720, 720 + turbo * 100);
    sim.scaleBallSpeed(ball, Math.pow(1.18, turbo));
  }
}

export function applyRelicsOnUpdate(sim, ball, dt, relicIds = []) {
  if (!ball._relicState || ball.owner !== 1) return;
  const rs = ball._relicState;
  if (rs.vampCd > 0) rs.vampCd = Math.max(0, rs.vampCd - dt);

  const poisonCount = countRelic(relicIds, 'poison_trail');
  if (poisonCount > 0) {
    rs.poisonCd -= dt;
    if (rs.poisonCd <= 0) {
      rs.poisonCd = 2.4;
      sim.addHazard(
        {
          kind: 'red_zone',
          variant: 'cough_cloud',
          owner: ball.owner,
          x: ball.x,
          y: ball.y,
          radius: 44 + poisonCount * 8,
          dmg: 1.5 * poisonCount,
          poisonTicks: 2,
          tickRate: 0.55,
          ttl: 4.2,
          tickTimers: {},
        },
        4
      );
    }
  }
}

export function applyRelicsOnWallHit(sim, ball, relicIds = []) {
  if (!ball._relicState || ball.owner !== 1) return;
  const rs = ball._relicState;

  const vampCount = countRelic(relicIds, 'vampiric_walls');
  if (vampCount > 0 && rs.vampCd <= 0) {
    rs.vampCd = 0.6;
    sim.healBall(ball, 3 * vampCount);
  }

  const sonicCount = countRelic(relicIds, 'sonic_bounce');
  if (sonicCount > 0) {
    rs.wallCount += 1;
    if (rs.wallCount % 3 === 0) {
      sim.addHazard(
        {
          kind: 'ring_wave',
          variant: 'dome',
          owner: ball.owner,
          x: ball.x,
          y: ball.y,
          currentRadius: ball.radius,
          expandSpeed: 330,
          dmg: 6 * sonicCount,
          knockback: 200,
          ttl: 0.55,
        },
        3
      );
      sim.emitText(ball.x, ball.y - ball.radius - 10, 'SONIC!', '#38bdf8');
    }
  }
}

export function applyRelicsOnBallHit(sim, ball, enemy, relicIds = []) {
  if (ball.owner !== 1 || !relicIds || relicIds.length === 0) return;
  const frostCount = countRelic(relicIds, 'frost_touch');
  if (frostCount > 0) {
    sim.applyChill(enemy, 2 * frostCount, ball.owner, ball.ballId);
  }
}

export function applyRelicsOnDamagePrevent(sim, ball, amount) {
  if (!ball._relicState || ball.owner !== 1) return amount;
  if (ball._relicState.aegisLeft > 0 && amount >= 1) {
    ball._relicState.aegisLeft -= 1;
    sim.emitText(ball.x, ball.y - ball.radius - 12, 'AEGIS!', '#fef08a');
    sim.addParticleBurst(ball.x, ball.y, '#fde047', 8);
    return 0;
  }
  return amount;
}

export function applyRelicsOnTakeDamage(sim, ball, dmg, sourceOwner, relicIds = [], reason = 'hit') {
  if (ball.owner !== 1 || sourceOwner === 1 || reason === 'relic_thorns') return;
  const thornsCount = countRelic(relicIds, 'thorns_shell');
  if (thornsCount > 0 && dmg >= 2) {
    const enemy = sim.getClosestEnemy(ball);
    if (enemy) {
      const refl = Math.max(1, Math.round(dmg * 0.22 * thornsCount));
      sim.dealDamage(enemy, refl, 1, 'relic_thorns', ball.ballId);
    }
  }
}

export function applyRelicsOnBeforeDeath(sim, ball) {
  if (!ball._relicState || ball.owner !== 1) return false;
  if (ball._relicState.secondWindLeft > 0) {
    ball._relicState.secondWindLeft -= 1;
    ball.hp = Math.min(ball.maxHp, 25);
    ball.phaseTimer = Math.max(ball.phaseTimer, 0.7);
    sim.emitText(ball.x, ball.y - ball.radius - 14, 'SECOND WIND!', '#f97316');
    sim.addParticleBurst(ball.x, ball.y, '#fb923c', 16);
    sim.triggerShake(8, 0.2);
    return true;
  }
  return false;
}
