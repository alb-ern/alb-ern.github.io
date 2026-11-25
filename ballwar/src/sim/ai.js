import { RARITY_META } from './constants.js';
import { BALL_DEFS, getBallDef } from './balls.js';

/**
 * Draw N distinct random ball definitions from the full 120-ball pool (or an optional allowedIds subset).
 */
export function drawRandomBallChoices(count = 3, rng = Math.random, excludeIds = [], allowedIds = null) {
  const allowedSet = Array.isArray(allowedIds) && allowedIds.length > 0 ? new Set(allowedIds) : null;
  const basePool = allowedSet ? BALL_DEFS.filter((b) => allowedSet.has(b.id)) : BALL_DEFS;
  const effectiveBase = basePool.length >= count ? basePool : BALL_DEFS;
  const pool = effectiveBase.filter((b) => !excludeIds.includes(b.id));
  const source = pool.length >= count ? [...pool] : [...effectiveBase];
  for (let i = source.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = source[i];
    source[i] = source[j];
    source[j] = tmp;
  }
  return source.slice(0, count);
}

/**
 * Heuristic bot draft choice favoring strong meta balls with light variety.
 */
const BOT_TIER_WEIGHTS = {
  spider: 95, shackles: 94, orbital: 92, conductor: 90, laser: 89, vampire: 88, dice: 86,
  zone: 84, harpoon: 83, chess: 82, beam: 81, hive: 80, cannon: 79, fibonacci: 78,
  icecone: 77, blade: 76, machinegun: 75, poisonspike: 74, cell: 73, axe: 72, glass: 71,
  thief: 70, reforge: 68, verity: 66, snake: 86, blackspider: 93, bomb: 85, electric: 80,
  electroking: 82, bow: 77, virus: 84, hook: 78, charge: 71, burst: 75, bigspike: 79,
  ray: 83, range: 76, acid: 73, slime: 78, potion: 87, robux: 90, medic: 74, candybox: 88,
  cactus: 81, spear: 80, apple: 76, shuriken: 83, poisongas: 74,
  duplicator: 94, doubler: 89, mach: 84, titan: 87, hydra: 91, micro: 76, gravity: 90,
  repulsor: 82, portal: 86, chronos: 90, shield: 84, mirror: 92, boomerang: 79, chainsaw: 83,
  sniper: 86, shotgun: 77, hammer: 82, anchor: 85, ricochet: 76, tornado: 81, ninja: 87,
  vortex: 78, magma: 81, frost: 80, quake: 82, tsunami: 87, solar: 89, eclipse: 85,
  cloud: 81, crystal: 78, sandstorm: 75, plasma: 82, berserker: 83, phoenix: 91,
  gambler: 90, hacker: 88, banker: 85, necromancer: 89, mimicchest: 77, leech: 80,
  thorn: 79, alchemist: 85, ghost: 82, rocket: 86, meteor: 83, drill: 78, ufo: 89,
  drum: 78, pacman: 85, turret: 82, knight: 86, omega: 95,
};

export function chooseBotBall(choices, rng = Math.random) {
  if (!choices || choices.length === 0) return BALL_DEFS[0];
  let best = choices[0];
  let bestScore = -Infinity;
  for (const c of choices) {
    const base = BOT_TIER_WEIGHTS[c.id] ?? (60 + (RARITY_META[c.rarity]?.order || 1) * 5);
    const jitter = (rng() - 0.5) * 14;
    const score = base + jitter;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

/**
 * Pick a tactical Lock Aim launch angle for the Bot.
 * Bank/wall-trigger balls angle sharply off top/bottom walls to build hazards early;
 * direct brawlers launch toward the opponent with slight angular offset.
 */
export function chooseBotAimAngle(botBall, enemyBall, rng = Math.random) {
  const def = getBallDef(botBall.ballId);
  const dx = enemyBall.x - botBall.x;
  const dy = enemyBall.y - botBall.y;
  const directAngle = Math.atan2(dy, dx);

  if (def.aimHint === 'bank') {
    const sign = rng() < 0.5 ? 1 : -1;
    return directAngle + sign * (0.48 + rng() * 0.45);
  }
  return directAngle + (rng() - 0.5) * 0.34;
}
