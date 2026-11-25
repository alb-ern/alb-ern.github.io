/**
 * Roguelike Gauntlet Tower (10 Escalating Boss Floors) & 12 Stacking PvE Run Relics.
 * Relics ONLY activate inside MODES.GAUNTLET — Online P2P, Quickmatch, Bot, Local, and Sandbox stay 100% untouched.
 */

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
    subtitle: '2v2 Grand Finale! Defeat Omega & Aura to unlock Cosmic Void Ω.',
    teamSize: 2,
    bossTeam: ['omega', 'aura'],
    bossHpScale: 1.2,
    isBoss: true,
    sparksReward: 200,
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

export function getGauntletFloor(floorNum) {
  const idx = Math.max(0, Math.min(GAUNTLET_FLOORS.length - 1, (floorNum || 1) - 1));
  return GAUNTLET_FLOORS[idx];
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
