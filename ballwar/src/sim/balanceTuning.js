/**
 * Auto-managed per-ball balance multipliers updated by `scripts/balance.mjs`.
 * Kept mutable so iterative CLI balance runs update in memory and persist cleanly.
 */
export const BALANCE_TUNING = {
  verity: { hpMult: 1, dmgMult: 1.05, rateMult: 1 },
  spider: { hpMult: 1, dmgMult: 0.926, rateMult: 1 },
  shackles: { hpMult: 1, dmgMult: 1.058, rateMult: 1 },
  vampire: { hpMult: 1, dmgMult: 1, rateMult: 1 },
  conductor: { hpMult: 1, dmgMult: 1.543, rateMult: 1 },
  orbital: { hpMult: 1, dmgMult: 1.437, rateMult: 1 },
  laser: { hpMult: 1, dmgMult: 0.908, rateMult: 1 },
  dice: { hpMult: 1, dmgMult: 1.058, rateMult: 1 },
  zone: { hpMult: 1, dmgMult: 0.875, rateMult: 1 },
  chess: { hpMult: 1, dmgMult: 1.244, rateMult: 1 },
  glass: { hpMult: 1, dmgMult: 1.011, rateMult: 1 },
  beam: { hpMult: 1, dmgMult: 1.083, rateMult: 1 },
  harpoon: { hpMult: 1, dmgMult: 0.808, rateMult: 1 },
  hive: { hpMult: 1, dmgMult: 0.876, rateMult: 1 },
  cannon: { hpMult: 1, dmgMult: 0.702, rateMult: 1 },
  fibonacci: { hpMult: 1, dmgMult: 1.934, rateMult: 1 },
  icecone: { hpMult: 1, dmgMult: 1.735, rateMult: 1 },
  blade: { hpMult: 1, dmgMult: 1.395, rateMult: 1 },
  machinegun: { hpMult: 1, dmgMult: 1.128, rateMult: 1 },
  poisonspike: { hpMult: 1, dmgMult: 1, rateMult: 1 },
  cell: { hpMult: 1, dmgMult: 1.128, rateMult: 1 },
  axe: { hpMult: 1, dmgMult: 1.24, rateMult: 1 },
  thief: { hpMult: 1, dmgMult: 1, rateMult: 1 },
  reforge: { hpMult: 1, dmgMult: 0.852, rateMult: 1 },
};

export function getBallTuning(ballId) {
  return BALANCE_TUNING[ballId] || { hpMult: 1, dmgMult: 1, rateMult: 1 };
}
