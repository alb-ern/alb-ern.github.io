#!/usr/bin/env gjs -m
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import System from 'system';
import { BALL_DEFS } from '../src/sim/balls.js';
import { BALANCE_TUNING, getBallTuning } from '../src/sim/balanceTuning.js';
import { FIXED_DT, PHASES, SUDDEN_DEATH_START_SEC } from '../src/sim/constants.js';
import { ArenaSimulation } from '../src/sim/physics.js';
import { chooseBotAimAngle } from '../src/sim/ai.js';

function resolveTuningFilePath() {
  const scriptFile = Gio.File.new_for_uri(import.meta.url);
  return scriptFile
    .get_parent()
    .get_parent()
    .get_child('src')
    .get_child('sim')
    .get_child('balanceTuning.js')
    .get_path();
}

function parseArgs(args) {
  const opts = {
    matches: 6,
    sampleOpps: 24,
    iters: 1,
    nerfThreshold: 0.68,
    buffThreshold: 0.32,
    buffMatchWinFloor: 0.32,
    targetStdDev: 0.36,
    varianceMode: true,
    dryRun: false,
    reset: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--matches' && args[i + 1]) {
      opts.matches = Math.max(2, parseInt(args[++i], 10) || 6);
    } else if (a.startsWith('--matches=')) {
      opts.matches = Math.max(2, parseInt(a.split('=')[1], 10) || 6);
    } else if (a === '--sample-opps' && args[i + 1]) {
      opts.sampleOpps = Math.max(4, parseInt(args[++i], 10) || 24);
    } else if (a === '--all-pairs') {
      opts.sampleOpps = 0;
      opts.matches = 10;
    } else if (a === '--iters' && args[i + 1]) {
      opts.iters = Math.max(1, parseInt(args[++i], 10) || 1);
    } else if (a.startsWith('--iters=')) {
      opts.iters = Math.max(1, parseInt(a.split('=')[1], 10) || 1);
    } else if (a === '--auto') {
      opts.iters = 5;
    } else if (a === '--nerf-threshold' && args[i + 1]) {
      opts.nerfThreshold = parseFloat(args[++i]) || 0.68;
    } else if (a === '--buff-threshold' && args[i + 1]) {
      opts.buffThreshold = parseFloat(args[++i]) || 0.32;
    } else if (a === '--no-variance') {
      opts.varianceMode = false;
    } else if (a === '--dry-run') {
      opts.dryRun = true;
    } else if (a === '--reset') {
      opts.reset = true;
    } else if (a === '--help' || a === '-h') {
      print(
        'Usage: gjs -m scripts/balance.mjs [options]\n' +
          '  --sample-opps N      Sampled opponents per ball (default: 24; 0 = all pairs)\n' +
          '  --all-pairs          Full round-robin all pairs (7,140 pairs x 10 matches)\n' +
          '  --matches N          Matches simulated per pair (default: 6)\n' +
          '  --iters N            Max balance iterations in this run (default: 1)\n' +
          '  --auto               Run up to 5 fast variance+bounds iterations\n' +
          '  --nerf-threshold F   Nerf balls above F mean/oppShare (default: 0.68)\n' +
          '  --buff-threshold F   Buff balls below F mean/oppShare (default: 0.32)\n' +
          '  --no-variance        Disable pairwise variance polarization\n' +
          '  --dry-run            Simulate and print report without writing balanceTuning.js\n' +
          '  --reset              Reset all ball multipliers back to 1.0'
      );
      System.exit(0);
    }
  }
  return opts;
}

function clamp(val, lo, hi) {
  return Math.max(lo, Math.min(hi, val));
}

function round3(val) {
  return Math.round(val * 1000) / 1000;
}

function writeTuningFile(tuningPath) {
  const lines = [
    '/**',
    ' * Auto-managed per-ball balance multipliers updated by `scripts/balance.mjs`.',
    ' * Kept mutable so iterative CLI balance runs update in memory and persist cleanly.',
    ' */',
    'export const BALANCE_TUNING = {',
  ];
  for (const def of BALL_DEFS) {
    const t = getBallTuning(def.id);
    lines.push(
      `  ${def.id}: { hpMult: ${round3(t.hpMult)}, dmgMult: ${round3(t.dmgMult)}, rateMult: ${round3(t.rateMult)} },`
    );
  }
  lines.push('};', '', 'export function getBallTuning(ballId) {', '  return BALANCE_TUNING[ballId] || { hpMult: 1, dmgMult: 1, rateMult: 1 };', '}', '');
  GLib.file_set_contents(tuningPath, lines.join('\n'));
}

function resetTuningInMemory() {
  for (const def of BALL_DEFS) {
    BALANCE_TUNING[def.id] = { hpMult: 1, dmgMult: 1, rateMult: 1 };
  }
}

function buildPairs(n, sampleOpps, iterIndex) {
  if (!sampleOpps || sampleOpps >= n - 1) {
    const pairs = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) pairs.push([i, j]);
    }
    return pairs;
  }
  const halfK = Math.max(2, Math.floor(sampleOpps / 2));
  const seen = new Set();
  const pairs = [];
  const stride = Math.max(1, Math.floor(n / (halfK + 1)));
  const rot = iterIndex % Math.max(1, stride);
  for (let i = 0; i < n; i++) {
    for (let s = 1; s <= halfK; s++) {
      const offset = ((s * stride + rot + s) % (n - 1)) + 1;
      const j = (i + offset) % n;
      const a = Math.min(i, j);
      const b = Math.max(i, j);
      const key = a * n + b;
      if (a !== b && !seen.has(key)) {
        seen.add(key);
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
}

function simulateAllPairs(matchesPerPair, iterIndex, sampleOpps = 0) {
  const n = BALL_DEFS.length;
  const pairWins = Array.from({ length: n }, () => new Float64Array(n));
  const pairScores = Array.from({ length: n }, () => new Float64Array(n));
  const playedMask = Array.from({ length: n }, () => new Uint8Array(n));
  const totalWins = new Float64Array(n);
  const totalLosses = new Float64Array(n);
  const totalDraws = new Float64Array(n);
  const totalTime = new Float64Array(n);

  const maxTicks = 60 * 45;
  const pairs = buildPairs(n, sampleOpps, iterIndex);
  let pairNum = 0;

  for (const [i, j] of pairs) {
    pairNum++;
    playedMask[i][j] = 1;
    playedMask[j][i] = 1;

    for (let m = 0; m < matchesPerPair; m++) {
      const swap = m >= Math.floor(matchesPerPair / 2);
      const p1Idx = swap ? j : i;
      const p2Idx = swap ? i : j;
      const seed = ((iterIndex + 1) * 100003 + pairNum * 997 + m * 131) >>> 0;

      const sim = new ArenaSimulation({
        hearts: 1,
        suddenDeathStart: SUDDEN_DEATH_START_SEC,
        seed,
        headless: true,
      });
      sim.startMatch({ skipDraft: true });
      sim.setupAimPhase(BALL_DEFS[p1Idx].id, BALL_DEFS[p2Idx].id);
      sim.launchRound(
        chooseBotAimAngle(sim.balls[0], sim.balls[1], sim.rng),
        chooseBotAimAngle(sim.balls[1], sim.balls[0], sim.rng)
      );

      for (let tick = 0; tick < maxTicks && sim.phase === PHASES.FIGHT; tick++) {
        sim.step(FIXED_DT);
      }

      totalTime[p1Idx] += sim.roundTime;
      totalTime[p2Idx] += sim.roundTime;

      if (sim.roundWinner === 1) {
        totalWins[p1Idx]++;
        totalLosses[p2Idx]++;
        pairWins[p1Idx][p2Idx]++;
        pairScores[p1Idx][p2Idx] += 1;
      } else if (sim.roundWinner === 2) {
        totalWins[p2Idx]++;
        totalLosses[p1Idx]++;
        pairWins[p2Idx][p1Idx]++;
        pairScores[p2Idx][p1Idx] += 1;
      } else {
        totalDraws[p1Idx]++;
        totalDraws[p2Idx]++;
        pairScores[p1Idx][p2Idx] += 0.5;
        pairScores[p2Idx][p1Idx] += 0.5;
      }
    }
  }

  const rows = [];
  for (let i = 0; i < n; i++) {
    let beaten = 0;
    let oppCount = 0;
    for (let j = 0; j < n; j++) {
      if (i === j || !playedMask[i][j]) continue;
      oppCount++;
      if (pairWins[i][j] > pairWins[j][i]) beaten += 1;
      else if (pairWins[i][j] === pairWins[j][i]) beaten += 0.5;
    }
    const totalMatchesForBall = Math.max(1, oppCount * matchesPerPair);
    const oppBeatShare = beaten / Math.max(1, oppCount);
    const matchWinRate = (totalWins[i] + 0.5 * totalDraws[i]) / totalMatchesForBall;

    // Pairwise matchup variance / stdDev across opponents
    let sumSq = 0;
    for (let j = 0; j < n; j++) {
      if (i === j || !playedMask[i][j]) continue;
      const pij = pairScores[i][j] / matchesPerPair;
      sumSq += (pij - matchWinRate) ** 2;
    }
    const matchupStdDev = Math.sqrt(sumSq / Math.max(1, oppCount));

    rows.push({
      id: BALL_DEFS[i].id,
      archetype: BALL_DEFS[i].archetype,
      beaten,
      opponents: oppCount,
      oppBeatShare,
      matchWinRate,
      matchupStdDev,
      wins: totalWins[i],
      losses: totalLosses[i],
      draws: totalDraws[i],
      avgTime: totalTime[i] / totalMatchesForBall,
    });
  }

  rows.sort((x, y) => y.matchWinRate - x.matchWinRate || y.oppBeatShare - x.oppBeatShare);
  return { rows, pairCount: pairs.length };
}

const SPIKE_ARCHETYPES = new Set(['Brawler', 'Berserker', 'Juggernaut', 'Sniper', 'Bombard', 'Counter', 'Titan', 'Assassin']);

function applyAdjustments(rows, opts, prevActionMap) {
  let nerfed = 0;
  let buffed = 0;
  let polarized = 0;
  const actions = new Map();

  for (const r of rows) {
    const t = getBallTuning(r.id);
    if (!BALANCE_TUNING[r.id]) {
      BALANCE_TUNING[r.id] = { ...t };
    }
    const entry = BALANCE_TUNING[r.id];
    // Preserve 100-HP base invariant while polarizing DMG vs Rate for RPS matchup variance
    entry.hpMult = 1;

    const isOverpowered = r.matchWinRate > opts.nerfThreshold || r.oppBeatShare > opts.nerfThreshold + 0.04;
    const isUnderpowered = r.matchWinRate < opts.buffMatchWinFloor || r.oppBeatShare < opts.buffThreshold;
    const prevAct = prevActionMap.get(r.id);
    const minDmg = r.id === 'vampire' ? 1 : 0.45;

    if (isOverpowered) {
      const damp = prevAct === 'BUFF' ? 0.6 : 1.0;
      const excess = clamp(Math.max(r.matchWinRate, r.oppBeatShare) - 0.56, 0.05, 0.45) * damp;
      entry.dmgMult = round3(clamp(entry.dmgMult * (1 - 0.42 * excess), minDmg, 2.5));
      entry.rateMult = round3(clamp(entry.rateMult * (1 - 0.2 * excess), 0.72, 1.38));
      nerfed++;
      actions.set(r.id, 'NERF');
    } else if (isUnderpowered) {
      const damp = prevAct === 'NERF' ? 0.6 : 1.0;
      const deficit = clamp(0.48 - Math.min(r.matchWinRate, r.oppBeatShare), 0.05, 0.45) * damp;
      entry.dmgMult = round3(clamp(entry.dmgMult * (1 + 0.48 * deficit), minDmg, 2.5));
      entry.rateMult = round3(clamp(entry.rateMult * (1 + 0.16 * deficit), 0.72, 1.38));
      buffed++;
      actions.set(r.id, 'BUFF');
    } else if (
      opts.varianceMode &&
      r.matchupStdDev < opts.targetStdDev &&
      r.matchWinRate >= 0.4 &&
      r.matchWinRate <= 0.6
    ) {
      // Polarize safe-mid low-variance balls inversely within bounded [0.76, 1.35] cadence range
      const spikeBias = SPIKE_ARCHETYPES.has(r.archetype);
      if (spikeBias && entry.rateMult > 0.78) {
        entry.dmgMult = round3(clamp(entry.dmgMult * 1.08, minDmg, 2.4));
        entry.rateMult = round3(clamp(entry.rateMult * 0.92, 0.76, 1.35));
        polarized++;
        actions.set(r.id, 'POLARIZE');
      } else if (!spikeBias && entry.rateMult < 1.32) {
        entry.dmgMult = round3(clamp(entry.dmgMult * 0.92, minDmg, 2.4));
        entry.rateMult = round3(clamp(entry.rateMult * 1.08, 0.76, 1.35));
        polarized++;
        actions.set(r.id, 'POLARIZE');
      } else {
        actions.set(r.id, 'OK');
      }
    } else {
      actions.set(r.id, 'OK');
    }
  }

  return { nerfed, buffed, polarized, actions };
}

function main() {
  const opts = parseArgs(ARGV);
  const tuningPath = resolveTuningFilePath();

  if (opts.reset) {
    resetTuningInMemory();
    if (!opts.dryRun) {
      writeTuningFile(tuningPath);
    }
    print(`Reset all ${BALL_DEFS.length} ball multipliers to 1.0 in ${tuningPath}`);
    if (opts.iters === 1 && !ARGV.includes('--iters') && !ARGV.includes('--auto')) {
      return;
    }
  }

  let balanced = false;
  let prevActionMap = new Map();

  for (let iter = 0; iter < opts.iters; iter++) {
    const { rows, pairCount } = simulateAllPairs(opts.matches, iter, opts.sampleOpps);
    const { nerfed, buffed, polarized, actions } = opts.dryRun
      ? {
          nerfed: rows.filter((r) => r.matchWinRate > opts.nerfThreshold || r.oppBeatShare > opts.nerfThreshold + 0.04).length,
          buffed: rows.filter((r) => r.matchWinRate < opts.buffMatchWinFloor || r.oppBeatShare < opts.buffThreshold).length,
          polarized: 0,
          actions: new Map(),
        }
      : applyAdjustments(rows, opts, prevActionMap);
    prevActionMap = actions;

    const avgStd = rows.reduce((s, r) => s + r.matchupStdDev, 0) / Math.max(1, rows.length);
    print(
      `\n=== Balance Iteration ${iter + 1} (${pairCount} pairs x ${opts.matches} matches = ${
        pairCount * opts.matches
      } fights; mean StdDev=${avgStd.toFixed(3)}) ===`
    );
    print(
      'Ball'.padEnd(13),
      'Win%'.padStart(7),
      'OppBeat%'.padStart(8),
      'StdDev'.padStart(7),
      'W-L-D'.padStart(11),
      'DMGx'.padStart(6),
      'Ratex'.padStart(6),
      'Status'
    );

    for (const r of rows) {
      const t = getBallTuning(r.id);
      const tag = opts.dryRun ? (r.matchWinRate > opts.nerfThreshold ? 'OVER' : r.matchWinRate < opts.buffMatchWinFloor ? 'WEAK' : 'OK') : actions.get(r.id);
      const rec = `${r.wins}-${r.losses}-${r.draws}`;
      print(
        r.id.padEnd(13),
        `${(r.matchWinRate * 100).toFixed(1)}%`.padStart(7),
        `${(r.oppBeatShare * 100).toFixed(1)}%`.padStart(8),
        r.matchupStdDev.toFixed(2).padStart(7),
        rec.padStart(11),
        t.dmgMult.toFixed(2).padStart(6),
        t.rateMult.toFixed(2).padStart(6),
        tag
      );
    }

    if (!opts.dryRun) {
      writeTuningFile(tuningPath);
    }

    print(
      `\nSummary: nerfed=${nerfed} (>${(opts.nerfThreshold * 100).toFixed(0)}%), buffed=${buffed} (<${(
        opts.buffMatchWinFloor * 100
      ).toFixed(0)}%), polarized=${polarized} | mean StdDev=${avgStd.toFixed(3)}`
    );

    if (nerfed === 0 && buffed === 0 && polarized <= 8) {
      balanced = true;
      print('ALL BALLS IN 30-70% WINDOW WITH HIGH MATCHUP VARIANCE!');
      break;
    }
  }

  if (!balanced && !opts.dryRun) {
    print('Updated src/sim/balanceTuning.js — re-run `gjs -m scripts/balance.mjs` (or add `--auto`) for the next pass.');
  }
}

main();
