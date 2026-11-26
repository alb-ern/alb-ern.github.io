#!/usr/bin/env gjs -m
import GLib from 'gi://GLib';
import { FIXED_DT, MODES, PHASES } from '../src/sim/constants.js';
import { ArenaSimulation } from '../src/sim/physics.js';
import { chooseBotAimAngle } from '../src/sim/ai.js';
import {
  CHALLENGE_LEVELS,
  GAUNTLET_RELICS,
  getChallengeDef,
  getGauntletFloor,
} from '../src/sim/gauntlet.js';

// 20 representative balls spanning all major archetypes, ranges & rarities
export const REP_20_BALLS = [
  'verity',       // Scaler (Legendary)
  'spider',       // Trapper (Rare)
  'vampire',      // Sustain (Rare)
  'blade',        // Brawler (Rare)
  'bow',          // Sniper (Rare)
  'axe',          // Berserker (Epic)
  'laser',        // Trapper/Beam (Epic)
  'cannon',       // Turret (Epic)
  'snake',        // Brawler/Tail (Epic)
  'shield',       // Defender (Epic)
  'orbital',      // Zone (Legendary)
  'nokia',        // Juggernaut (Legendary)
  'shackles',     // Control (Mythic)
  'cell',         // Swarm (Rare)
  'coughingbaby', // Bio-Hazard/Underdog (Rare)
  'mach',         // Speedster (Epic)
  'frost',        // Control (Rare)
  'hacker',       // Disruptor (Exclusive)
  'phoenix',      // Rebirth (Mythic)
  'pinata',       // Counter (Epic)
];

function simulateGauntletFight({
  playerTeam,
  bossTeam,
  teamSize,
  relics,
  bossHpScale,
  bossDmgScale,
  bossRateScale,
  suddenDeathSec,
  seed,
}) {
  const sim = new ArenaSimulation({
    mode: MODES.GAUNTLET,
    teamSize,
    hearts: 1,
    suddenDeathStart: suddenDeathSec,
    runRelics: relics,
    bossHpScale,
    bossDmgScale,
    bossRateScale,
    seed,
  });
  sim.startMatch({
    mode: MODES.GAUNTLET,
    teamSize,
    hearts: 1,
    suddenDeathStart: suddenDeathSec,
    runRelics: relics,
    bossHpScale,
    bossDmgScale,
    bossRateScale,
    skipDraft: true,
  });
  sim.setupAimPhase(
    teamSize === 2 ? playerTeam : playerTeam[0],
    teamSize === 2 ? bossTeam : bossTeam[0]
  );

  const pAngles = sim.balls
    .filter((b) => b.owner === 1)
    .map((b) => chooseBotAimAngle(b, sim.balls.find((e) => e.owner === 2) || b, sim.rng));
  const bAngles = sim.balls
    .filter((b) => b.owner === 2)
    .map((b) => chooseBotAimAngle(b, sim.balls.find((e) => e.owner === 1) || b, sim.rng));

  sim.launchRound(teamSize === 2 ? pAngles : pAngles[0], teamSize === 2 ? bAngles : bAngles[0]);

  const maxSteps = Math.round(52 / FIXED_DT);
  for (let s = 0; s < maxSteps && sim.phase === PHASES.FIGHT; s++) {
    sim.step(FIXED_DT);
  }
  if (sim.roundWinner === 1) return 1;
  if (sim.roundWinner === 2) return 0;
  return 0.5;
}

function measureFloorWinrate(towerId, floorNum, chLevel, relics, matchesPerBall = 2) {
  const f = getGauntletFloor(floorNum, towerId);
  const ch = getChallengeDef(chLevel);
  const bossHpScale = f.bossHpScale * ch.enemyHpMult;
  const bossDmgScale = (f.bossDmgScale ?? 1) * ch.enemyDmgMult;
  const bossRateScale = (f.bossRateScale ?? 1) * ch.enemyRateMult;

  let wins = 0;
  let total = 0;
  for (let i = 0; i < REP_20_BALLS.length; i++) {
    const b1 = REP_20_BALLS[i];
    const b2 = REP_20_BALLS[(i + 7) % REP_20_BALLS.length];
    const pTeam = f.teamSize === 2 ? [b1, b2] : [b1];
    for (let m = 0; m < matchesPerBall; m++) {
      wins += simulateGauntletFight({
        playerTeam: pTeam,
        bossTeam: f.bossTeam,
        teamSize: f.teamSize,
        relics,
        bossHpScale,
        bossDmgScale,
        bossRateScale,
        suddenDeathSec: ch.suddenDeathSec,
        seed: 10000 + floorNum * 500 + chLevel * 97 + i * 19 + m,
      });
      total += 1;
    }
  }
  return wins / total;
}

function measureRelicDeltas() {
  // Test each relic 1v1 against standard 100 HP opponent balls (nokia, laser, blade, shield, sniper)
  const testOpps = ['nokia', 'laser', 'blade', 'shield', 'sniper'];
  const simPair = (relics) => {
    let w = 0;
    let n = 0;
    for (let i = 0; i < REP_20_BALLS.length; i++) {
      const opp = testOpps[i % testOpps.length];
      for (let m = 0; m < 2; m++) {
        w += simulateGauntletFight({
          playerTeam: [REP_20_BALLS[i]],
          bossTeam: [opp],
          teamSize: 1,
          relics,
          bossHpScale: 1.0,
          bossDmgScale: 1.0,
          bossRateScale: 1.0,
          suddenDeathSec: 30,
          seed: 7000 + i * 31 + m,
        });
        n += 1;
      }
    }
    return w / n;
  };

  const base = simPair([]);
  print(`\n=== SINGLE-RELIC DELTA CHECK (20 Rep Balls x 2 vs mid-tier foes; Baseline ${(base * 100).toFixed(1)}%) ===`);
  const rows = [];
  for (const r of GAUNTLET_RELICS) {
    const wr = simPair([r.id]);
    rows.push({ id: r.id, cat: r.category || 'Other', wr, delta: wr - base });
  }
  rows.sort((a, b) => b.delta - a.delta);
  for (const r of rows) {
    const sign = r.delta >= 0 ? '+' : '';
    print(`  ${r.id.padEnd(20)} [${r.cat.padEnd(7)}] WR=${(r.wr * 100).toFixed(1)}% (${sign}${(r.delta * 100).toFixed(1)}%)`);
  }
}

const t0 = GLib.get_monotonic_time();
// Typical 9-relic late-run loadout picked across a 9-clear climb (mostly utility/defense/skill + 1-2 offense)
const LATE_RUN_RELICS = [
  'vampiric_walls',
  'overclocked',
  'titan_plating',
  'sonic_bounce',
  'gyro_stabilizer',
  'bumper_shield',
  'cleanse_orb',
  'siphon_surge',
  'parry_plating',
];

for (const towerId of ['citadel', 'spire']) {
  print(`\n=== TOWER: ${towerId.toUpperCase()} ===`);
  for (const ch of CHALLENGE_LEVELS) {
    const f1 = measureFloorWinrate(towerId, 1, ch.level, [], 2);
    const f5 = measureFloorWinrate(towerId, 5, ch.level, LATE_RUN_RELICS.slice(0, 4), 2);
    const f10 = measureFloorWinrate(towerId, 10, ch.level, LATE_RUN_RELICS, 2);
    print(
      `  Lv.${ch.level} ${ch.name.padEnd(16)} | Floor 1 (0 rel): ${(f1 * 100).toFixed(1)}% | Floor 5 (4 rel): ${(f5 * 100).toFixed(1)}% | Floor 10 Boss (9 rel): ${(f10 * 100).toFixed(1)}%`
    );
  }
}

measureRelicDeltas();
const elapsed = ((GLib.get_monotonic_time() - t0) / 1e6).toFixed(2);
print(`\nCompleted in ${elapsed}s`);
