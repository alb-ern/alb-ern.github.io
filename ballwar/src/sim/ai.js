import { RARITY_META } from './constants.js';
import { BALL_DEFS, getBallDef } from './balls.js';

/**
 * Draw N distinct random ball definitions from the full 24-ball pool.
 */
export function drawRandomBallChoices(count = 3, rng = Math.random, excludeIds = []) {
  const pool = BALL_DEFS.filter((b) => !excludeIds.includes(b.id));
  const source = pool.length >= count ? [...pool] : [...BALL_DEFS];
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
  spider: 95,
  shackles: 94,
  orbital: 92,
  conductor: 90,
  laser: 89,
  vampire: 88,
  dice: 86,
  zone: 84,
  harpoon: 83,
  chess: 82,
  beam: 81,
  hive: 80,
  cannon: 79,
  fibonacci: 78,
  icecone: 77,
  blade: 76,
  machinegun: 75,
  poisonspike: 74,
  cell: 73,
  axe: 72,
  glass: 71,
  thief: 70,
  reforge: 68,
  verity: 66,
  snake: 86,
  blackspider: 93,
  bomb: 85,
  electric: 80,
  electroking: 82,
  bow: 77,
  virus: 84,
  hook: 78,
  charge: 71,
  burst: 75,
  bigspike: 79,
  ray: 83,
  range: 76,
  acid: 73,
  slime: 78,
  potion: 87,
  robux: 90,
  medic: 74,
  candybox: 88,
  cactus: 81,
  spear: 80,
  apple: 76,
  shuriken: 83,
  poisongas: 74,
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
