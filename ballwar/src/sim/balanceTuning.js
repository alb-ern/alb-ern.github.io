/**
 * Auto-managed per-ball balance multipliers updated by `scripts/balance.mjs`.
 * Kept mutable so iterative CLI balance runs update in memory and persist cleanly.
 */
export const BALANCE_TUNING = {
  verity: { hpMult: 1.112, dmgMult: 1.142, rateMult: 1.126 },
  spider: { hpMult: 1.038, dmgMult: 1.048, rateMult: 1.043 },
  shackles: { hpMult: 1.06, dmgMult: 1.075, rateMult: 1.067 },
  vampire: { hpMult: 1.028, dmgMult: 1.035, rateMult: 1.031 },
  conductor: { hpMult: 1.226, dmgMult: 1.291, rateMult: 1.26 },
  orbital: { hpMult: 1.212, dmgMult: 1.268, rateMult: 1.24 },
  laser: { hpMult: 1.001, dmgMult: 1.01, rateMult: 1.011 },
  dice: { hpMult: 1.052, dmgMult: 1.072, rateMult: 1.067 },
  zone: { hpMult: 0.97, dmgMult: 0.974, rateMult: 0.978 },
  chess: { hpMult: 1.108, dmgMult: 1.137, rateMult: 1.122 },
  glass: { hpMult: 1.016, dmgMult: 1.025, rateMult: 1.025 },
  beam: { hpMult: 1.04, dmgMult: 1.051, rateMult: 1.047 },
  harpoon: { hpMult: 0.952, dmgMult: 0.951, rateMult: 0.958 },
  hive: { hpMult: 0.975, dmgMult: 0.976, rateMult: 0.981 },
  cannon: { hpMult: 0.909, dmgMult: 0.903, rateMult: 0.917 },
  fibonacci: { hpMult: 1.143, dmgMult: 1.181, rateMult: 1.161 },
  icecone: { hpMult: 1.229, dmgMult: 1.292, rateMult: 1.26 },
  blade: { hpMult: 1.151, dmgMult: 1.194, rateMult: 1.174 },
  machinegun: { hpMult: 1.058, dmgMult: 1.077, rateMult: 1.07 },
  poisonspike: { hpMult: 1.056, dmgMult: 1.07, rateMult: 1.063 },
  cell: { hpMult: 1, dmgMult: 1.098, rateMult: 1.088 },
  axe: { hpMult: 1.143, dmgMult: 1.181, rateMult: 1.161 },
  thief: { hpMult: 1.056, dmgMult: 1.074, rateMult: 1.066 },
  reforge: { hpMult: 0.961, dmgMult: 0.967, rateMult: 0.977 },
};

export function getBallTuning(ballId) {
  return BALANCE_TUNING[ballId] || { hpMult: 1, dmgMult: 1, rateMult: 1 };
}
