/**
 * Roguelike Gauntlet Towers (2 Themed 10-Floor Boss Towers x 5 Escalating Challenge Levels)
 * & 24 Unlockable Stacking PvE Run Relics.
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
    enemyHpMult: 1.03,
    enemyDmgMult: 1.02,
    enemyRateMult: 1.01,
    suddenDeathSec: 29,
    rewardMult: 1.35,
    clearTrophies: 65,
    firstClearSparks: 175,
    summary: '+3% Boss HP • +2% DMG • 3 ♥ • 29s SD • 1.35× Rewards',
  },
  {
    level: 3,
    name: 'Brutal',
    badge: 'LV 3',
    color: '#facc15',
    hearts: 3,
    enemyHpMult: 1.07,
    enemyDmgMult: 1.05,
    enemyRateMult: 1.03,
    suddenDeathSec: 27,
    rewardMult: 1.75,
    clearTrophies: 90,
    firstClearSparks: 260,
    summary: '+7% Boss HP • +5% DMG • 3 ♥ • 27s SD • 1.75× Rewards',
  },
  {
    level: 4,
    name: 'Nightmare',
    badge: 'LV 4',
    color: '#fb923c',
    hearts: 2,
    enemyHpMult: 1.11,
    enemyDmgMult: 1.08,
    enemyRateMult: 1.05,
    suddenDeathSec: 25,
    rewardMult: 2.3,
    clearTrophies: 120,
    firstClearSparks: 375,
    summary: '+11% Boss HP • +8% DMG • 2 ♥ • 25s SD • 2.3× Rewards',
  },
  {
    level: 5,
    name: 'Omega Ascension',
    badge: 'LV 5',
    color: '#e879f9',
    hearts: 2,
    enemyHpMult: 1.16,
    enemyDmgMult: 1.12,
    enemyRateMult: 1.07,
    suddenDeathSec: 22,
    rewardMult: 3.1,
    clearTrophies: 160,
    firstClearSparks: 500,
    summary: '+16% Boss HP • +12% DMG • 2 ♥ • 22s SD • 3.1× Rewards',
  },
]);

export const GAUNTLET_FLOORS = Object.freeze([
  {
    floor: 1,
    title: 'Warmup Street',
    subtitle: 'Watch your step on the slippery opener.',
    teamSize: 1,
    bossTeam: ['banana'],
    bossHpScale: 0.72,
    bossDmgScale: 0.85,
    bossRateScale: 0.9,
    sparksReward: 30,
  },
  {
    floor: 2,
    title: 'Street Food Duel',
    subtitle: 'Dodge the sizzling rotary Doner blades.',
    teamSize: 1,
    bossTeam: ['kebab'],
    bossHpScale: 0.86,
    bossDmgScale: 0.92,
    bossRateScale: 0.94,
    sparksReward: 35,
  },
  {
    floor: 3,
    title: 'Prompt Injection',
    subtitle: 'Hallucinated clones flood the court.',
    teamSize: 1,
    bossTeam: ['chatgpt'],
    bossHpScale: 0.92,
    bossDmgScale: 0.95,
    bossRateScale: 0.96,
    sparksReward: 40,
  },
  {
    floor: 4,
    title: 'Indestructible Brick',
    subtitle: 'Heavy armor and wall-cracking ringtones.',
    teamSize: 1,
    bossTeam: ['nokia'],
    bossHpScale: 0.95,
    bossDmgScale: 0.97,
    bossRateScale: 0.98,
    sparksReward: 45,
  },
  {
    floor: 5,
    title: 'MID-BOSS: The Meme Classic',
    subtitle: '2v2 Boss Arena! Draft a teammate vs Hydrogen Bomb & Coughing Baby.',
    teamSize: 2,
    bossTeam: ['hydrogenbomb', 'coughingbaby'],
    bossHpScale: 0.82,
    bossDmgScale: 0.86,
    bossRateScale: 0.92,
    isBoss: true,
    sparksReward: 80,
  },
  {
    floor: 6,
    title: 'Air Defense Grid',
    subtitle: 'Active radar shoots down projectiles mid-flight.',
    teamSize: 1,
    bossTeam: ['israel'],
    bossHpScale: 1.0,
    bossDmgScale: 1.0,
    bossRateScale: 1.0,
    sparksReward: 55,
  },
  {
    floor: 7,
    title: 'Top 20% Standards',
    subtitle: 'Avoid the swinging Hypergamy Chart pole.',
    teamSize: 1,
    bossTeam: ['hypergamy'],
    bossHpScale: 1.04,
    bossDmgScale: 1.02,
    bossRateScale: 1.01,
    sparksReward: 60,
  },
  {
    floor: 8,
    title: 'ELITE DUO: AI Alignment',
    subtitle: '2v2 Boss Arena! Claude & Gemini team up with refusal shields & beams.',
    teamSize: 2,
    bossTeam: ['claude', 'gemini'],
    bossHpScale: 1.08,
    bossDmgScale: 1.02,
    bossRateScale: 1.02,
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
    bossDmgScale: 1.05,
    bossRateScale: 1.03,
    sparksReward: 75,
  },
  {
    floor: 10,
    title: 'FINAL BOSS: Omega Singularity',
    subtitle: '2v2 Grand Finale! Defeat Omega & Aura to unlock Cosmic Void Ω & Tower II.',
    teamSize: 2,
    bossTeam: ['omega', 'aura'],
    bossHpScale: 1.32,
    bossDmgScale: 1.06,
    bossRateScale: 1.04,
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
    bossHpScale: 0.66,
    bossDmgScale: 0.82,
    bossRateScale: 0.88,
    sparksReward: 40,
  },
  {
    floor: 2,
    title: 'Alchemical Vault',
    subtitle: 'Volatile brews splash toxic & healing zones across the floor.',
    teamSize: 1,
    bossTeam: ['alchemist'],
    bossHpScale: 0.88,
    bossDmgScale: 0.92,
    bossRateScale: 0.94,
    sparksReward: 45,
  },
  {
    floor: 3,
    title: 'Sus Emergency',
    subtitle: 'Vent ambushes and sabotage strikes from the shadows.',
    teamSize: 1,
    bossTeam: ['impostor'],
    bossHpScale: 0.95,
    bossDmgScale: 0.96,
    bossRateScale: 0.97,
    sparksReward: 50,
  },
  {
    floor: 4,
    title: 'Chrono Fracture',
    subtitle: 'Time-dilation freezes projectiles and bends arena tempo.',
    teamSize: 1,
    bossTeam: ['chronos'],
    bossHpScale: 1.0,
    bossDmgScale: 0.99,
    bossRateScale: 0.99,
    sparksReward: 55,
  },
  {
    floor: 5,
    title: 'MID-BOSS: Twin Apocalypse',
    subtitle: '2v2 Boss Arena! Overwhelm Duplicator swarms & regenerating Hydra.',
    teamSize: 2,
    bossTeam: ['duplicator', 'hydra'],
    bossHpScale: 1.22,
    bossDmgScale: 1.06,
    bossRateScale: 1.04,
    isBoss: true,
    sparksReward: 105,
  },
  {
    floor: 6,
    title: 'Event Horizon',
    subtitle: 'Gravity wells crush everything toward the abyssal core.',
    teamSize: 1,
    bossTeam: ['gravity'],
    bossHpScale: 1.08,
    bossDmgScale: 1.02,
    bossRateScale: 1.01,
    sparksReward: 65,
  },
  {
    floor: 7,
    title: 'Blood Covenant',
    subtitle: 'Risen skeletons swarm while soul siphons drain your vitality.',
    teamSize: 1,
    bossTeam: ['necromancer'],
    bossHpScale: 1.12,
    bossDmgScale: 1.04,
    bossRateScale: 1.02,
    sparksReward: 70,
  },
  {
    floor: 8,
    title: 'ELITE DUO: Solar Pantheon',
    subtitle: '2v2 Boss Arena! Blazing Solar flares paired with immortal Phoenix rebirth.',
    teamSize: 2,
    bossTeam: ['solar', 'phoenix'],
    bossHpScale: 1.24,
    bossDmgScale: 1.06,
    bossRateScale: 1.04,
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
    bossDmgScale: 1.08,
    bossRateScale: 1.04,
    sparksReward: 85,
  },
  {
    floor: 10,
    title: 'FINAL BOSS: Void Sovereign',
    subtitle: '2v2 Grand Finale! Mirror mimics your kit while Hacker corrupts the arena!',
    teamSize: 2,
    bossTeam: ['mirror', 'hacker'],
    bossHpScale: 1.38,
    bossDmgScale: 1.1,
    bossRateScale: 1.05,
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
  // Starter 8 + 16 Unlockable = 24 Run Modifiers (Utility & Skill slightly favored over pure damage)
  {
    id: 'vampiric_walls',
    name: 'Vampiric Walls',
    icon: '🩸',
    rarity: 'Rare',
    category: 'Defense',
    desc: 'Heal +1 HP on wall bounces (1.8s cooldown).',
  },
  {
    id: 'overclocked',
    name: 'Overclocked Core',
    icon: '⚡',
    rarity: 'Epic',
    category: 'Utility',
    desc: '+25% faster ability trigger cadence.',
  },
  {
    id: 'glass_cannon',
    name: 'Glass Cannon',
    icon: '💥',
    rarity: 'Legendary',
    category: 'Offense',
    desc: '+14% damage dealt, but -12 starting Max HP.',
  },
  {
    id: 'titan_plating',
    name: 'Titan Plating',
    icon: '🛡️',
    rarity: 'Rare',
    category: 'Defense',
    desc: '+10 Max HP and +0.18x knockback mass.',
  },
  {
    id: 'sonic_bounce',
    name: 'Sonic Ricochet',
    icon: '🔊',
    rarity: 'Epic',
    category: 'Skill',
    desc: 'Every 4th wall bounce emits a 4-DMG expanding shockwave pulse.',
  },
  {
    id: 'second_wind',
    name: 'Second Wind',
    icon: '🔥',
    rarity: 'Mythic',
    category: 'Defense',
    desc: 'Once per floor, survive a fatal hit at 10 HP with 0.45s phase immunity.',
  },
  {
    id: 'frost_touch',
    name: 'Frost Aura',
    icon: '❄️',
    rarity: 'Rare',
    category: 'Skill',
    desc: 'Ball-to-ball clashes apply +2 Chill stacks (+Freeze buildup).',
  },
  {
    id: 'thorns_shell',
    name: 'Spiked Shell',
    icon: '🌵',
    rarity: 'Epic',
    category: 'Defense',
    desc: 'Reflect 11% of incoming damage back at the closest attacker.',
  },
  {
    id: 'turbo_boost',
    name: 'Nitro Bearings',
    icon: '🚀',
    rarity: 'Rare',
    category: 'Utility',
    desc: '+18% movement speed & +100 max speed cap.',
  },
  {
    id: 'poison_trail',
    name: 'Bio-Leak',
    icon: '☣️',
    rarity: 'Epic',
    category: 'Offense',
    desc: 'Drop a drifting toxic puddle behind your ball every 3.4s.',
  },
  {
    id: 'aegis_start',
    name: 'Aegis Ward',
    icon: '✨',
    rarity: 'Legendary',
    category: 'Defense',
    desc: 'Absorb up to 10 DMG from your first hit taken each floor.',
  },
  {
    id: 'golden_magnet',
    name: 'Golden Magnet',
    icon: '🧲',
    rarity: 'Epic',
    category: 'Utility',
    desc: '+45% bonus Sparks & Mastery XP this run, plus +10% ability cadence.',
  },
  // 12 Utility, Skill & Tactical Modifiers
  {
    id: 'gyro_stabilizer',
    name: 'Gyro Stabilizer',
    icon: '🧭',
    rarity: 'Rare',
    category: 'Utility',
    desc: '+14% speed, +10% ability rate & self-stabilizing bounce angles.',
  },
  {
    id: 'kinetic_cushion',
    name: 'Kinetic Cushion',
    icon: '🧽',
    rarity: 'Rare',
    category: 'Defense',
    desc: 'Reduce Wall Slam, Sudden Death & hazard damage by 35% and absorb -1 DMG on heavy hits.',
  },
  {
    id: 'tempo_shift',
    name: 'Tempo Shift',
    icon: '⏱️',
    rarity: 'Rare',
    category: 'Utility',
    desc: 'Every 4th wall bounce grants +24% ability rate for 2.2s and heals +2 HP.',
  },
  {
    id: 'cleanse_orb',
    name: 'Purity Core',
    icon: '💠',
    rarity: 'Epic',
    category: 'Utility',
    desc: 'Purges Poison & Chill every 2.8s and heals +2 HP.',
  },
  {
    id: 'bumper_shield',
    name: 'Bumper Barrier',
    icon: '🫧',
    rarity: 'Epic',
    category: 'Defense',
    desc: 'Generates a 4 HP replenishing shield barrier every 9.5s.',
  },
  {
    id: 'siphon_surge',
    name: 'Siphon Surge',
    icon: '🦇',
    rarity: 'Epic',
    category: 'Skill',
    desc: 'Ball-to-ball clashes drain +2 HP heal (1.5s cooldown) + +6% speed.',
  },
  {
    id: 'featherweight_dash',
    name: 'Compact Thruster',
    icon: '🪶',
    rarity: 'Epic',
    category: 'Utility',
    desc: '-15% hitbox radius (dodge projectiles!) & +15% movement speed.',
  },
  {
    id: 'magnetic_core',
    name: 'Magnetic Disruptor',
    icon: '🌀',
    rarity: 'Epic',
    category: 'Utility',
    desc: 'Every 3.2s chill & slow nearby enemies with disruptive pulses.',
  },
  {
    id: 'twin_spark',
    name: 'Spark Capacitor',
    icon: '🪙',
    rarity: 'Rare',
    category: 'Utility',
    desc: '+30% run Sparks, +1 free Draft Reroll next floor, & +10% ability cadence.',
  },
  {
    id: 'parry_plating',
    name: 'Counter Reflex',
    icon: '⚔️',
    rarity: 'Legendary',
    category: 'Skill',
    desc: 'Taking a heavy hit (>=7 DMG) fires a 6-DMG repulsor shockwave + knockback.',
  },
  {
    id: 'chrono_dampener',
    name: 'Chrono Dampener',
    icon: '⏳',
    rarity: 'Legendary',
    category: 'Utility',
    desc: 'Slow enemy projectiles by 26% & reduce enemy ability rate by 14%.',
  },
  {
    id: 'stasis_failsafe',
    name: 'Emergency Blink',
    icon: '⚡',
    rarity: 'Mythic',
    category: 'Skill',
    desc: 'Dropping below 30% HP once per round triggers a 0.5s phase dash & +5 HP.',
  },
  // 12 Complex Chaos, Physics & Arena Modifiers
  {
    id: 'titan_growth',
    name: 'Growth Core',
    icon: '🪐',
    rarity: 'Epic',
    category: 'Chaos',
    desc: 'Steadily grow +3% larger, +2% heavier & gain +1 contact DMG every 2.2s.',
  },
  {
    id: 'homing_ricochet',
    name: 'Ricochet Guide',
    icon: '📐',
    rarity: 'Rare',
    category: 'Physics',
    desc: 'Wall bounces subtly tilt your trajectory ~5° toward the nearest opponent.',
  },
  {
    id: 'sudden_crush',
    name: 'Collapse Engine',
    icon: '🧱',
    rarity: 'Epic',
    category: 'Arena',
    desc: 'Sudden Death starts 8s earlier and arena walls shrink 2.2× faster!',
  },
  {
    id: 'ricochet_accel',
    name: 'Momentum Engine',
    icon: '💨',
    rarity: 'Rare',
    category: 'Physics',
    desc: 'Each wall bounce grants a +7% speed burst (stacking up to +45%).',
  },
  {
    id: 'split_shot',
    name: 'Prism Splitter',
    icon: '🔱',
    rarity: 'Legendary',
    category: 'Chaos',
    desc: 'Every 3rd projectile fired splits an extra twin bolt angled ±11°.',
  },
  {
    id: 'execute_protocol',
    name: 'Executioner Edge',
    icon: '🗡️',
    rarity: 'Legendary',
    category: 'Offense',
    desc: 'Deal +35% bonus damage against enemies below 40% Max HP.',
  },
  {
    id: 'nova_reactor',
    name: 'Supernova Core',
    icon: '🌟',
    rarity: 'Mythic',
    category: 'Chaos',
    desc: 'Once per round at <50% HP, erupt for 12 AoE DMG & a +35% speed surge.',
  },
  {
    id: 'pinball_frenzy',
    name: 'Pinball Bumper',
    icon: '🪀',
    rarity: 'Rare',
    category: 'Physics',
    desc: '1.22× bouncier ball-to-ball collisions & +10% faster cooldown recovery on wall hits.',
  },
  {
    id: 'blizzard_aura',
    name: 'Blizzard Domain',
    icon: '🌨️',
    rarity: 'Epic',
    category: 'Arena',
    desc: 'Every 3.5s summon a freezing frost zone beneath your closest opponent.',
  },
  {
    id: 'wall_curse',
    name: 'Phantom Hex',
    icon: '👻',
    rarity: 'Epic',
    category: 'Chaos',
    desc: 'Cursed walls: opponents take 1.5 hex damage every time they hit an arena wall.',
  },
  {
    id: 'echo_strike',
    name: 'Echo Dash',
    icon: '🌠',
    rarity: 'Legendary',
    category: 'Skill',
    desc: 'Every 4.5s fire a fast piercing 5-DMG echo bolt toward the closest foe.',
  },
  {
    id: 'gravity_anchor',
    name: 'Gravity Well',
    icon: '🕳️',
    rarity: 'Mythic',
    category: 'Arena',
    desc: 'Every 2.6s emits a gravitational pulse that deflects incoming enemy projectiles.',
  },
]);

export const MODIFIER_CATEGORIES = Object.freeze([
  'Utility',
  'Skill',
  'Defense',
  'Offense',
  'Physics',
  'Chaos',
  'Arena',
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

export function drawRelicChoices(ownedIds = [], count = 3, rng = Math.random, allowedRelicIds = null) {
  const owned = new Set(ownedIds);
  const allowedSet = Array.isArray(allowedRelicIds) && allowedRelicIds.length > 0 ? new Set(allowedRelicIds) : null;
  const eligible = allowedSet ? GAUNTLET_RELICS.filter((r) => allowedSet.has(r.id)) : [...GAUNTLET_RELICS];
  const basePool = eligible.length >= count ? eligible : [...GAUNTLET_RELICS];
  let pool = basePool.filter((r) => !owned.has(r.id));
  if (pool.length < count) pool = [...basePool];
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
  for (const r of relicIds || []) if (r === id) c++;
  return c;
}

export function getRelicRewardMult(relicIds = []) {
  return 1 + countRelic(relicIds, 'golden_magnet') * 0.45 + countRelic(relicIds, 'twin_spark') * 0.3;
}

export function getRelicExtraRerolls(relicIds = []) {
  return countRelic(relicIds, 'twin_spark');
}

export function getRelicDmgMult(relicIds = []) {
  return 1 + countRelic(relicIds, 'glass_cannon') * 0.14;
}

export function getRelicExecuteMult(relicIds = [], targetBall = null) {
  const ex = countRelic(relicIds, 'execute_protocol');
  if (ex <= 0 || !targetBall || targetBall.maxHp <= 0) return 1;
  return targetBall.hp <= targetBall.maxHp * 0.4 ? 1 + 0.35 * ex : 1;
}

export function getRelicRadiusMult(relicIds = []) {
  const f = countRelic(relicIds, 'featherweight_dash');
  return f > 0 ? Math.max(0.68, Math.pow(0.85, f)) : 1;
}

export function getRelicEnemyProjSpeedMult(relicIds = []) {
  const c = countRelic(relicIds, 'chrono_dampener');
  return c > 0 ? Math.max(0.55, Math.pow(0.74, c)) : 1;
}

export function getRelicShrinkConfig(relicIds1 = [], relicIds2 = []) {
  const crush = countRelic(relicIds1, 'sudden_crush') + countRelic(relicIds2, 'sudden_crush');
  return {
    earlierSec: Math.min(18, crush * 8),
    rateMult: crush > 0 ? Math.min(4.0, Math.pow(2.2, crush)) : 1,
  };
}

export function getRelicCollisionImpulseMult(relicIds = []) {
  const p = countRelic(relicIds, 'pinball_frenzy');
  return p > 0 ? Math.min(1.6, Math.pow(1.22, p)) : 1;
}

export function hasSplitShotRelic(relicIds = []) {
  return countRelic(relicIds, 'split_shot') > 0;
}

export function applyRelicsOnInit(sim, ball, relicIds = []) {
  if (!relicIds || relicIds.length === 0) return;
  const bumperCount = countRelic(relicIds, 'bumper_shield');
  ball._baseRadius = ball.radius;
  ball._relicState = {
    vampCd: 0,
    siphonCd: 0,
    wallCount: 0,
    tempoWallCount: 0,
    tempoTimer: 0,
    pinballCdTimer: 0,
    poisonCd: 1.8,
    cleanseCd: 2.8,
    magnetCd: 3.2,
    growthCd: 2.2,
    blizzardCd: 3.5,
    echoCd: 4.2,
    gravityCd: 2.6,
    parryCd: 0,
    projCount: 0,
    ricochetStacks: 0,
    wardHp: bumperCount * 4,
    wardMax: bumperCount * 4,
    wardCd: 9.5,
    aegisLeft: countRelic(relicIds, 'aegis_start'),
    secondWindLeft: countRelic(relicIds, 'second_wind'),
    stasisLeft: countRelic(relicIds, 'stasis_failsafe'),
    novaLeft: countRelic(relicIds, 'nova_reactor'),
  };

  // Only Titan Plating (armor) and Glass Cannon (fragility trade-off) alter Max HP
  const hpBonus = countRelic(relicIds, 'titan_plating') * 10 - countRelic(relicIds, 'glass_cannon') * 12;
  if (hpBonus !== 0) {
    ball.maxHp = Math.max(25, ball.maxHp + hpBonus);
    ball.hp = Math.max(25, Math.min(ball.maxHp, ball.hp + hpBonus));
  }

  const massBonus = countRelic(relicIds, 'titan_plating') * 0.18;
  if (massBonus > 0) ball.mass = (ball.mass || 1) + massBonus;

  const overclock = countRelic(relicIds, 'overclocked');
  const gyro = countRelic(relicIds, 'gyro_stabilizer');
  const goldMagnet = countRelic(relicIds, 'golden_magnet');
  const twinSpark = countRelic(relicIds, 'twin_spark');
  if (overclock > 0 || gyro > 0 || goldMagnet > 0 || twinSpark > 0) {
    ball.rateMult =
      (ball.rateMult || 1) *
      Math.pow(1.25, overclock) *
      Math.pow(1.1, gyro) *
      Math.pow(1.1, goldMagnet) *
      Math.pow(1.1, twinSpark);
  }

  const turbo = countRelic(relicIds, 'turbo_boost');
  const feather = countRelic(relicIds, 'featherweight_dash');
  const siphon = countRelic(relicIds, 'siphon_surge');
  const speedMult =
    Math.pow(1.18, turbo) *
    Math.pow(1.14, gyro) *
    Math.pow(1.15, feather) *
    Math.pow(1.06, siphon);
  if (speedMult > 1.001) {
    ball.customSpeedCap = Math.max(ball.customSpeedCap || 720, 720 + turbo * 100 + feather * 55 + gyro * 35);
    sim.scaleBallSpeed(ball, speedMult);
  }
}

export function applyRelicsOnUpdate(sim, ball, dt, relicIds = []) {
  if (!ball._relicState || !relicIds || relicIds.length === 0) return;
  const rs = ball._relicState;
  if (rs.vampCd > 0) rs.vampCd = Math.max(0, rs.vampCd - dt);
  if (rs.siphonCd > 0) rs.siphonCd = Math.max(0, rs.siphonCd - dt);
  if (rs.parryCd > 0) rs.parryCd = Math.max(0, rs.parryCd - dt);

  if (rs.tempoTimer > 0) {
    rs.tempoTimer = Math.max(0, rs.tempoTimer - dt);
    if (rs.tempoTimer === 0 && rs.tempoActive) {
      rs.tempoActive = false;
      ball.rateMult = (ball.rateMult || 1) / 1.24;
    }
  }

  if (rs.pinballCdTimer > 0) {
    rs.pinballCdTimer = Math.max(0, rs.pinballCdTimer - dt);
    if (rs.pinballCdTimer === 0 && rs.pinballRateActive) {
      rs.pinballRateActive = false;
      ball.rateMult = (ball.rateMult || 1) / 1.12;
    }
  }

  // Growth Core: steadily grow bigger, heavier & hit harder as the round goes on
  const growthCount = countRelic(relicIds, 'titan_growth');
  if (growthCount > 0) {
    rs.growthCd -= dt;
    if (rs.growthCd <= 0) {
      rs.growthCd = 2.2;
      const baseR = ball._baseRadius || 26;
      const capR = Math.round(baseR * 1.85);
      if (ball.radius < capR) {
        ball.radius = Math.min(capR, Math.round((ball.radius * (1 + 0.03 * growthCount) + 0.5) * 10) / 10);
      }
      ball.mass = (ball.mass || 1) + 0.02 * growthCount;
      ball.contactDmg = (ball.contactDmg || 0) + 1 * growthCount;
      sim.emitText(ball.x, ball.y - ball.radius - 8, 'GROW+', '#c084fc');
    }
  }

  // Bumper Barrier replenishing 4 HP ward shield
  const bumperCount = countRelic(relicIds, 'bumper_shield');
  if (bumperCount > 0 && rs.wardHp < rs.wardMax) {
    rs.wardCd -= dt;
    if (rs.wardCd <= 0) {
      rs.wardCd = 9.5;
      rs.wardHp = rs.wardMax;
      sim.emitText(ball.x, ball.y - ball.radius - 10, 'WARD UP', '#38bdf8');
    }
  }

  // Purity Core periodic debuff cleanse + heal
  const cleanseCount = countRelic(relicIds, 'cleanse_orb');
  if (cleanseCount > 0) {
    rs.cleanseCd -= dt;
    if (rs.cleanseCd <= 0) {
      rs.cleanseCd = Math.max(1.8, 2.8 - (cleanseCount - 1) * 0.4);
      const hadDebuff = ball.poisonTimer > 0 || ball.chillStacks > 0 || ball.slowTimer > 0;
      ball.poisonTimer = 0;
      ball.poisonDmg = 0;
      ball.chillStacks = 0;
      ball.slowTimer = 0;
      sim.healBall(ball, 2 * cleanseCount);
      if (hadDebuff) {
        sim.emitText(ball.x, ball.y - ball.radius - 10, 'CLEANSE!', '#67e8f9');
      }
    }
  }

  // Magnetic Disruptor periodic enemy slow/chill pulse
  const magnetCount = countRelic(relicIds, 'magnetic_core');
  if (magnetCount > 0) {
    rs.magnetCd -= dt;
    if (rs.magnetCd <= 0) {
      rs.magnetCd = 3.2;
      for (const enemy of sim.getEnemyBalls(ball.owner)) {
        sim.applyChill(enemy, 1 * magnetCount, ball.owner, ball.ballId);
        enemy.slowTimer = Math.max(enemy.slowTimer, 1.0);
      }
      sim.addParticleBurst(ball.x, ball.y, '#818cf8', 6);
    }
  }

  // Blizzard Domain periodic frost zone under nearest enemy
  const blizCount = countRelic(relicIds, 'blizzard_aura');
  if (blizCount > 0) {
    rs.blizzardCd -= dt;
    if (rs.blizzardCd <= 0) {
      rs.blizzardCd = 3.5;
      const enemy = sim.getClosestEnemy(ball);
      if (enemy) {
        sim.addHazard(
          {
            kind: 'freeze_zone',
            owner: ball.owner,
            x: enemy.x,
            y: enemy.y,
            radius: 36 + blizCount * 6,
            ttl: 2.2,
          },
          4
        );
        sim.emitText(enemy.x, enemy.y - enemy.radius - 10, 'BLIZZARD!', '#7dd3fc');
      }
    }
  }

  // Echo Dash periodic piercing echo bolt toward closest opponent
  const echoCount = countRelic(relicIds, 'echo_strike');
  if (echoCount > 0) {
    rs.echoCd -= dt;
    if (rs.echoCd <= 0) {
      rs.echoCd = 4.5;
      const enemy = sim.getClosestEnemy(ball);
      if (enemy) {
        const ang = Math.atan2(enemy.y - ball.y, enemy.x - ball.x);
        sim.addProjectile({
          kind: 'echo_bolt',
          owner: ball.owner,
          parentId: ball.id,
          x: ball.x + Math.cos(ang) * (ball.radius + 6),
          y: ball.y + Math.sin(ang) * (ball.radius + 6),
          vx: Math.cos(ang) * 510,
          vy: Math.sin(ang) * 510,
          radius: 7,
          dmg: 5 * echoCount,
          bouncesLeft: 1,
          ttl: 1.5,
          color: '#38bdf8',
        });
      }
    }
  }

  // Gravity Well projectile deflector pulse
  const gravCount = countRelic(relicIds, 'gravity_anchor');
  if (gravCount > 0) {
    rs.gravityCd -= dt;
    if (rs.gravityCd <= 0) {
      rs.gravityCd = 2.6;
      let deflected = 0;
      for (const p of sim.projectiles) {
        if (p.owner === ball.owner) continue;
        const d = Math.hypot(p.x - ball.x, p.y - ball.y);
        if (d < 130 + gravCount * 20) {
          const ang = Math.atan2(p.y - ball.y, p.x - ball.x);
          const sp = Math.hypot(p.vx, p.vy) || 320;
          p.vx = Math.cos(ang) * sp;
          p.vy = Math.sin(ang) * sp;
          deflected += 1;
        }
      }
      sim.addParticleBurst(ball.x, ball.y, '#a855f7', deflected > 0 ? 10 : 5);
    }
  }

  // Chrono Dampener enemy rate slow (applied once per enemy entity)
  const chronoCount = countRelic(relicIds, 'chrono_dampener');
  if (chronoCount > 0) {
    const key = `_chrono_${ball.owner}`;
    for (const enemy of sim.getEnemyBalls(ball.owner)) {
      if (!enemy[key]) {
        enemy[key] = true;
        enemy.rateMult = Math.max(0.58, (enemy.rateMult || 1) * Math.pow(0.86, chronoCount));
      }
    }
  }

  // Bio-Leak toxic trail
  const poisonCount = countRelic(relicIds, 'poison_trail');
  if (poisonCount > 0) {
    rs.poisonCd -= dt;
    if (rs.poisonCd <= 0) {
      rs.poisonCd = 3.4;
      sim.addHazard(
        {
          kind: 'red_zone',
          variant: 'cough_cloud',
          owner: ball.owner,
          x: ball.x,
          y: ball.y,
          radius: 38 + poisonCount * 5,
          dmg: 1.0 * poisonCount,
          poisonTicks: 2,
          tickRate: 0.65,
          ttl: 3.0,
          tickTimers: {},
        },
        4
      );
    }
  }
}

export function applyRelicsOnWallHit(sim, ball, relicIds = [], enemyRelicIds = []) {
  // Opponents cursed by Phantom Hex take wall bounce damage even if this ball has no relics of its own
  const hexCount = countRelic(enemyRelicIds, 'wall_curse');
  if (hexCount > 0 && ball.hp > 0) {
    const enemyOwner = ball.owner === 1 ? 2 : 1;
    sim.dealDamage(ball, 1.5 * hexCount, enemyOwner, 'relic_hex', ball.ballId);
    sim.emitText(ball.x, ball.y - ball.radius - 8, 'HEX!', '#e879f9');
  }

  if (!ball._relicState || !relicIds || relicIds.length === 0) return;
  const rs = ball._relicState;

  const vampCount = countRelic(relicIds, 'vampiric_walls');
  if (vampCount > 0 && rs.vampCd <= 0) {
    rs.vampCd = 1.8;
    sim.healBall(ball, 1 * vampCount);
  }

  // Ricochet Guide: ~5 degree (0.087 rad) bias toward closest opponent on every wall bounce
  const homingCount = countRelic(relicIds, 'homing_ricochet');
  if (homingCount > 0) {
    const enemy = sim.getClosestEnemy(ball);
    const sp = Math.hypot(ball.vx, ball.vy);
    if (enemy && sp > 20) {
      const cur = Math.atan2(ball.vy, ball.vx);
      const desired = Math.atan2(enemy.y - ball.y, enemy.x - ball.x);
      let diff = desired - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const maxTilt = 0.0873 * homingCount; // 5 deg * stack
      const tilt = Math.max(-maxTilt, Math.min(maxTilt, diff));
      const nextAngle = cur + tilt;
      ball.vx = Math.cos(nextAngle) * sp;
      ball.vy = Math.sin(nextAngle) * sp;
    }
  }

  // Momentum Engine: +7% speed burst per wall bounce up to +45% cap
  const accelCount = countRelic(relicIds, 'ricochet_accel');
  if (accelCount > 0 && rs.ricochetStacks < 6 * accelCount) {
    rs.ricochetStacks += 1;
    ball.customSpeedCap = Math.max(ball.customSpeedCap || 720, Math.round((ball.baseSpeed || 320) * 1.45));
    sim.scaleBallSpeed(ball, 1.07);
  }

  // Pinball Bumper temporary cadence surge on bounce
  const pinballCount = countRelic(relicIds, 'pinball_frenzy');
  if (pinballCount > 0 && !rs.pinballRateActive) {
    rs.pinballRateActive = true;
    rs.pinballCdTimer = 1.4;
    ball.rateMult = (ball.rateMult || 1) * 1.12;
  }

  // Gyro Stabilizer stabilizes bounce away from shallow wall-hugging angles
  const gyroCount = countRelic(relicIds, 'gyro_stabilizer');
  if (gyroCount > 0) {
    const sp = Math.hypot(ball.vx, ball.vy);
    if (sp > 20) {
      const b = sim.bounds;
      const cx = (b.left + b.right) * 0.5;
      const cy = (b.top + b.bottom) * 0.5;
      const cur = Math.atan2(ball.vy, ball.vx);
      const toCenter = Math.atan2(cy - ball.y, cx - ball.x);
      let diff = toCenter - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = Math.max(-0.14 * gyroCount, Math.min(0.14 * gyroCount, diff * 0.25));
      const nextAngle = cur + steer;
      ball.vx = Math.cos(nextAngle) * sp;
      ball.vy = Math.sin(nextAngle) * sp;
    }
  }

  // Tempo Shift periodic ability rate surge + tiny heal
  const tempoCount = countRelic(relicIds, 'tempo_shift');
  if (tempoCount > 0) {
    rs.tempoWallCount += 1;
    if (rs.tempoWallCount % 4 === 0) {
      sim.healBall(ball, 2 * tempoCount);
      if (!rs.tempoActive) {
        rs.tempoActive = true;
        rs.tempoTimer = 2.2 + (tempoCount - 1) * 0.5;
        ball.rateMult = (ball.rateMult || 1) * 1.24;
        sim.emitText(ball.x, ball.y - ball.radius - 10, 'TEMPO!', '#22d3ee');
      }
    }
  }

  const sonicCount = countRelic(relicIds, 'sonic_bounce');
  if (sonicCount > 0) {
    rs.wallCount += 1;
    if (rs.wallCount % 4 === 0) {
      sim.addHazard(
        {
          kind: 'ring_wave',
          variant: 'dome',
          owner: ball.owner,
          x: ball.x,
          y: ball.y,
          currentRadius: ball.radius,
          expandSpeed: 330,
          dmg: 4 * sonicCount,
          knockback: 210,
          ttl: 0.55,
        },
        3
      );
      sim.emitText(ball.x, ball.y - ball.radius - 10, 'SONIC!', '#38bdf8');
    }
  }
}

export function applyRelicsOnBallHit(sim, ball, enemy, relicIds = []) {
  if (!relicIds || relicIds.length === 0) return;
  const frostCount = countRelic(relicIds, 'frost_touch');
  if (frostCount > 0) {
    sim.applyChill(enemy, 2 * frostCount, ball.owner, ball.ballId);
  }
  const siphonCount = countRelic(relicIds, 'siphon_surge');
  if (siphonCount > 0 && ball._relicState && ball._relicState.siphonCd <= 0) {
    ball._relicState.siphonCd = 1.5;
    sim.healBall(ball, 2 * siphonCount);
  }
}

export function applyRelicsOnDamagePrevent(sim, ball, amount, relicIds = [], reason = 'hit') {
  if (!ball._relicState || !relicIds || relicIds.length === 0) return amount;
  let rem = amount;

  // Kinetic Cushion trims Wall Slam, Sudden Death & hazard damage by 35% and absorbs -1 DMG on heavy hits
  const cushionCount = countRelic(relicIds, 'kinetic_cushion');
  if (cushionCount > 0) {
    if (reason === 'wallslam' || reason === 'suddendeath' || reason === 'zone' || reason === 'acid' || reason === 'poison' || reason === 'drop') {
      rem = Math.max(1, rem * Math.max(0.4, Math.pow(0.65, cushionCount)));
    } else if (rem >= 4) {
      rem = Math.max(1, rem - cushionCount);
    }
  }

  if (ball._relicState.aegisLeft > 0 && rem >= 1) {
    ball._relicState.aegisLeft -= 1;
    const cap = 10;
    const blocked = Math.min(cap, rem);
    rem -= blocked;
    sim.emitText(ball.x, ball.y - ball.radius - 12, 'AEGIS!', '#fef08a');
    sim.addParticleBurst(ball.x, ball.y, '#fde047', 8);
    if (rem <= 0) return 0;
  }

  // Bumper Barrier ward absorption
  if (ball._relicState.wardHp > 0 && rem > 0) {
    const absorbed = Math.min(ball._relicState.wardHp, rem);
    ball._relicState.wardHp -= absorbed;
    rem -= absorbed;
    if (rem <= 0) {
      sim.emitText(ball.x, ball.y - ball.radius - 10, 'WARDED!', '#38bdf8');
      sim.addParticleBurst(ball.x, ball.y, '#38bdf8', 6);
      return 0;
    }
  }
  return rem;
}

export function applyRelicsOnTakeDamage(sim, ball, dmg, sourceOwner, relicIds = [], reason = 'hit') {
  if (!relicIds || relicIds.length === 0 || sourceOwner === ball.owner || reason === 'relic_thorns' || reason === 'relic_parry' || reason === 'relic_nova' || reason === 'relic_hex') return;
  const rs = ball._relicState;

  const thornsCount = countRelic(relicIds, 'thorns_shell');
  if (thornsCount > 0 && dmg >= 2) {
    const enemy = sim.getClosestEnemy(ball);
    if (enemy) {
      const refl = Math.max(1, Math.round(dmg * 0.11 * thornsCount));
      sim.dealDamage(enemy, refl, ball.owner, 'relic_thorns', ball.ballId);
    }
  }

  // Counter Reflex parry pulse on heavy hit
  const parryCount = countRelic(relicIds, 'parry_plating');
  if (parryCount > 0 && rs && rs.parryCd <= 0 && dmg >= 7) {
    rs.parryCd = 1.6;
    sim.addHazard(
      {
        kind: 'ring_wave',
        variant: 'dome',
        owner: ball.owner,
        x: ball.x,
        y: ball.y,
        currentRadius: ball.radius,
        expandSpeed: 360,
        dmg: 6 * parryCount,
        knockback: 260,
        ttl: 0.45,
      },
      3
    );
    sim.emitText(ball.x, ball.y - ball.radius - 12, 'PARRY!', '#facc15');
  }

  // Supernova Core triggers once below 50% HP
  if (rs && rs.novaLeft > 0 && ball.hp > 0 && ball.hp <= ball.maxHp * 0.5) {
    rs.novaLeft -= 1;
    sim.addHazard(
      {
        kind: 'ring_wave',
        variant: 'dome',
        owner: ball.owner,
        x: ball.x,
        y: ball.y,
        currentRadius: ball.radius,
        expandSpeed: 420,
        dmg: 12,
        knockback: 320,
        ttl: 0.6,
      },
      3
    );
    sim.scaleBallSpeed(ball, 1.35);
    sim.emitText(ball.x, ball.y - ball.radius - 14, 'SUPERNOVA!', '#facc15');
    sim.triggerShake(7, 0.18);
  }

  // Emergency Blink stasis below 30% HP once per round
  if (rs && rs.stasisLeft > 0 && ball.hp > 0 && ball.hp <= ball.maxHp * 0.3) {
    rs.stasisLeft -= 1;
    ball.phaseTimer = Math.max(ball.phaseTimer, 0.5);
    sim.healBall(ball, 5);
    for (const enemy of sim.getEnemyBalls(ball.owner)) {
      const dx = enemy.x - ball.x;
      const dy = enemy.y - ball.y;
      const dist = Math.hypot(dx, dy) || 1;
      enemy.vx += (dx / dist) * 230;
      enemy.vy += (dy / dist) * 230;
    }
    sim.emitText(ball.x, ball.y - ball.radius - 14, 'BLINK!', '#2dd4bf');
    sim.addParticleBurst(ball.x, ball.y, '#2dd4bf', 14);
  }
}

export function applyRelicsOnBeforeDeath(sim, ball) {
  if (!ball._relicState) return false;
  if (ball._relicState.secondWindLeft > 0) {
    ball._relicState.secondWindLeft -= 1;
    ball.hp = Math.min(ball.maxHp, 10);
    ball.phaseTimer = Math.max(ball.phaseTimer, 0.45);
    sim.emitText(ball.x, ball.y - ball.radius - 14, 'SECOND WIND!', '#f97316');
    sim.addParticleBurst(ball.x, ball.y, '#fb923c', 16);
    sim.triggerShake(8, 0.2);
    return true;
  }
  return false;
}
