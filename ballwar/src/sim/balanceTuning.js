/**
 * Auto-managed per-ball balance multipliers updated by `scripts/balance.mjs`.
 * Kept mutable so iterative CLI balance runs update in memory and persist cleanly.
 */
export const BALANCE_TUNING = {
  verity: { hpMult: 1.086, dmgMult: 1.108, rateMult: 1.096 },
  spider: { hpMult: 1, dmgMult: 1, rateMult: 1 },
  shackles: { hpMult: 1.06, dmgMult: 1.075, rateMult: 1.067 },
  vampire: { hpMult: 1, dmgMult: 1, rateMult: 1 },
  conductor: { hpMult: 1.217, dmgMult: 1.277, rateMult: 1.246 },
  orbital: { hpMult: 1.212, dmgMult: 1.268, rateMult: 1.24 },
  laser: { hpMult: 0.976, dmgMult: 0.977, rateMult: 0.981 },
  dice: { hpMult: 1.043, dmgMult: 1.055, rateMult: 1.05 },
  zone: { hpMult: 0.944, dmgMult: 0.941, rateMult: 0.948 },
  chess: { hpMult: 1.108, dmgMult: 1.137, rateMult: 1.122 },
  glass: { hpMult: 0.991, dmgMult: 0.993, rateMult: 0.995 },
  beam: { hpMult: 1.04, dmgMult: 1.051, rateMult: 1.047 },
  harpoon: { hpMult: 0.952, dmgMult: 0.951, rateMult: 0.958 },
  hive: { hpMult: 0.975, dmgMult: 0.976, rateMult: 0.981 },
  cannon: { hpMult: 0.909, dmgMult: 0.903, rateMult: 0.917 },
  fibonacci: { hpMult: 1.116, dmgMult: 1.146, rateMult: 1.13 },
  icecone: { hpMult: 1.184, dmgMult: 1.233, rateMult: 1.208 },
  blade: { hpMult: 1.151, dmgMult: 1.194, rateMult: 1.174 },
  machinegun: { hpMult: 1.058, dmgMult: 1.077, rateMult: 1.07 },
  poisonspike: { hpMult: 1.024, dmgMult: 1.03, rateMult: 1.027 },
  cell: { hpMult: 1, dmgMult: 1.066, rateMult: 1.059 },
  axe: { hpMult: 1.143, dmgMult: 1.181, rateMult: 1.161 },
  thief: { hpMult: 1.031, dmgMult: 1.039, rateMult: 1.035 },
  reforge: { hpMult: 0.976, dmgMult: 0.979, rateMult: 0.985 },
};

export function getBallTuning(ballId) {
  return BALANCE_TUNING[ballId] || { hpMult: 1, dmgMult: 1, rateMult: 1 };
}
