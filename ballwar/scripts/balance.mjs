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
    matches: 4,
    sampleOpps: 24,
    iters: 1,
    nerfThreshold: 0.70,
    buffThreshold: 0.35,
    buffMatchWinFloor: 0.38,
    dryRun: false,
    reset: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--matches' && args[i + 1]) {
      opts.matches = Math.max(2, parseInt(args[++i], 10) || 4);
    } else if (a.startsWith('--matches=')) {
      opts.matches = Math.max(2, parseInt(a.split('=')[1], 10) || 4);
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
      opts.iters = 6;
    } else if (a === '--nerf-threshold' && args[i + 1]) {
      opts.nerfThreshold = parseFloat(args[++i]) || 0.70;
    } else if (a === '--buff-threshold' && args[i + 1]) {
      opts.buffThreshold = parseFloat(args[++i]) || 0.35;
    } else if (a === '--dry-run') {
      opts.dryRun = true;
    } else if (a === '--reset') {
      opts.reset = true;
    } else if (a === '--help' || a === '-h') {
      print(
        'Usage: gjs -m scripts/balance.mjs [options]\n' +
          '  --sample-opps N      Sampled opponents per ball (default: 24; 0 = all pairs)\n' +
          '  --all-pairs          Full round-robin all pairs (7,140 pairs x 10 matches)\n' +
          '  --matches N          Matches simulated per pair (default: 4)\n' +
          '  --iters N            Max balance iterations in this run (default: 1)\n' +
          '  --auto               Run up to 6 fast iterations (~90s total)\n' +
          '  --nerf-threshold F   Nerf balls winning > F share of opponents (default: 0.70)\n' +
          '  --buff-threshold F   Buff balls beating < F share of opponents (default: 0.35)\n' +
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
  // Symmetric ring graph: each ball i connects to k = sampleOpps/2 forward chords
  // spaced across the full 120-ball roster, giving every ball ~sampleOpps distinct opponents.
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
      // Alternate P1 (Blue) vs P2 (Red) halves so side bias cancels out cleanly
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
      } else if (sim.roundWinner === 2) {
        totalWins[p2Idx]++;
        totalLosses[p1Idx]++;
        pairWins[p2Idx][p1Idx]++;
      } else {
        totalDraws[p1Idx]++;
        totalDraws[p2Idx]++;
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
    rows.push({
      id: BALL_DEFS[i].id,
      beaten,
      opponents: oppCount,
      oppBeatShare,
      matchWinRate,
      wins: totalWins[i],
      losses: totalLosses[i],
      draws: totalDraws[i],
      avgTime: totalTime[i] / totalMatchesForBall,
    });
  }

  rows.sort((x, y) => y.oppBeatShare - x.oppBeatShare || y.matchWinRate - x.matchWinRate);
  return { rows, pairCount: pairs.length };
}

function applyAdjustments(rows, opts, prevActionMap) {
  let nerfed = 0;
  let buffed = 0;
  const actions = new Map();

  for (const r of rows) {
    const t = getBallTuning(r.id);
    if (!BALANCE_TUNING[r.id]) {
      BALANCE_TUNING[r.id] = { ...t };
    }
    const entry = BALANCE_TUNING[r.id];
    // Keep all base HPs at 100 (Cell at 15) and cooldown rates intact; balance via damage only
    entry.hpMult = 1;
    entry.rateMult = 1;

    const isOverpowered = r.oppBeatShare > opts.nerfThreshold;
    const isUnderpowered =
      r.oppBeatShare < opts.buffThreshold || r.matchWinRate < opts.buffMatchWinFloor;

    const prevAct = prevActionMap.get(r.id);
    const minDmg = r.id === 'vampire' ? 1 : 0.45;

    if (isOverpowered) {
      const damp = prevAct === 'BUFF' ? 0.55 : 1.0;
      const excess = clamp(r.oppBeatShare - 0.55, 0.04, 0.45) * damp;
      const dmgNext = clamp(entry.dmgMult * (1 - 0.34 * excess), minDmg, 2.25);

      entry.dmgMult = round3(dmgNext);
      nerfed++;
      actions.set(r.id, 'NERF');
    } else if (isUnderpowered) {
      const damp = prevAct === 'NERF' ? 0.55 : 1.0;
      const floorGap = 0.50 - Math.min(r.oppBeatShare, r.matchWinRate);
      const deficit = clamp(floorGap, 0.05, 0.45) * damp;
      const dmgNext = clamp(entry.dmgMult * (1 + 0.38 * deficit), minDmg, 2.25);

      entry.dmgMult = round3(dmgNext);
      buffed++;
      actions.set(r.id, 'BUFF');
    } else {
      actions.set(r.id, 'OK');
    }
  }

  return { nerfed, buffed, actions };
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

  const totalPairs = (BALL_DEFS.length * (BALL_DEFS.length - 1)) / 2;
  let balanced = false;
  let prevActionMap = new Map();

  for (let iter = 0; iter < opts.iters; iter++) {
    const { rows, pairCount } = simulateAllPairs(opts.matches, iter, opts.sampleOpps);
    const { nerfed, buffed, actions } = opts.dryRun
      ? {
          nerfed: rows.filter((r) => r.oppBeatShare > opts.nerfThreshold).length,
          buffed: rows.filter(
            (r) => r.oppBeatShare < opts.buffThreshold || r.matchWinRate < opts.buffMatchWinFloor
          ).length,
          actions: new Map(),
        }
      : applyAdjustments(rows, opts, prevActionMap);
    prevActionMap = actions;

    print(
      `\n=== Balance Iteration ${iter + 1} (${pairCount} pairs x ${opts.matches} matches = ${
        pairCount * opts.matches
      } fights) ===`
    );
    print(
      'Ball'.padEnd(13),
      'OppBeat%'.padStart(8),
      'Win%'.padStart(7),
      'W-L-D'.padStart(11),
      'AvgT'.padStart(6),
      'HPx'.padStart(6),
      'DMGx'.padStart(6),
      'Ratex'.padStart(6),
      'Status'
    );

    for (const r of rows) {
      const t = getBallTuning(r.id);
      const tag = opts.dryRun
        ? r.oppBeatShare > opts.nerfThreshold
          ? 'OVER(>70%)'
          : r.oppBeatShare < opts.buffThreshold || r.matchWinRate < opts.buffMatchWinFloor
          ? 'WEAK'
          : 'OK'
        : actions.get(r.id);
      const rec = `${r.wins}-${r.losses}-${r.draws}`;
      print(
        r.id.padEnd(13),
        `${(r.oppBeatShare * 100).toFixed(1)}%`.padStart(8),
        `${(r.matchWinRate * 100).toFixed(1)}%`.padStart(7),
        rec.padStart(11),
        `${r.avgTime.toFixed(1)}s`.padStart(6),
        t.hpMult.toFixed(2).padStart(6),
        t.dmgMult.toFixed(2).padStart(6),
        t.rateMult.toFixed(2).padStart(6),
        tag
      );
    }

    if (!opts.dryRun) {
      writeTuningFile(tuningPath);
    }

    print(`\nSummary: nerfed=${nerfed} (>${(opts.nerfThreshold * 100).toFixed(0)}%), buffed=${buffed} (<${(opts.buffThreshold * 100).toFixed(0)}% opp or <${(opts.buffMatchWinFloor * 100).toFixed(0)}% win)`);

    if (nerfed === 0 && buffed === 0) {
      balanced = true;
      print('ALL BALLS BALANCED! Zero balls win against >70% of opponents and no weak outliers remain.');
      break;
    }
  }

  if (!balanced && !opts.dryRun) {
    print('Updated src/sim/balanceTuning.js — re-run `gjs -m scripts/balance.mjs` (or add `--auto`) for the next balance pass.');
  }
}

main();
