/**
 * Arena Progression, Rank Ladder, Per-Ball Mastery (Lv 1-5), Rotating Bounties,
 * and Cosmetic Armory (6 Arena Themes & 6 Ball Trails).
 * Pure ES module with injectable storage adapter so it runs in browser localStorage and headless gjs tests.
 */

import { BALL_DEFS, getBallDef } from './balls.js';
import { MODES } from './constants.js';

export const PROFILE_STORAGE_KEY = 'ballwar_profile_v1';

export const RANK_TIERS = Object.freeze([
  { id: 'bronze', name: 'Bronze', minTrophies: 0, icon: '🥉', color: '#d97706' },
  { id: 'silver', name: 'Silver', minTrophies: 1150, icon: '🥈', color: '#cbd5e1' },
  { id: 'gold', name: 'Gold', minTrophies: 1350, icon: '🥇', color: '#facc15' },
  { id: 'diamond', name: 'Diamond', minTrophies: 1600, icon: '💎', color: '#38bdf8' },
  { id: 'master', name: 'Master', minTrophies: 1900, icon: '🔥', color: '#c084fc' },
  { id: 'omega', name: 'Omega', minTrophies: 2250, icon: 'Ω', color: '#2dd4bf' },
]);

export const MASTERY_TIERS = Object.freeze([
  { level: 0, label: 'Unranked', minXp: 0, color: '#94a3b8' },
  { level: 1, label: 'Bronze', minXp: 30, color: '#d97706' },
  { level: 2, label: 'Silver', minXp: 90, color: '#e2e8f0' },
  { level: 3, label: 'Gold Crown', minXp: 180, color: '#facc15' },
  { level: 4, label: 'Neon Halo', minXp: 320, color: '#e879f9' },
  { level: 5, label: 'Cosmic Ω', minXp: 500, color: '#2dd4bf' },
]);

export const ARENA_THEMES = Object.freeze([
  {
    id: 'classic',
    name: 'Classic Slate',
    cost: 0,
    desc: 'Crisp dark slate tactical court with subtle grid lines.',
    preview: ['#1e293b', '#0f172a', '#38bdf8'],
  },
  {
    id: 'neon_cyber',
    name: 'Neon Cyber Grid',
    cost: 150,
    desc: 'Synthwave deep indigo floor with glowing cyan & magenta neon grid.',
    preview: ['#1e1b4b', '#09071a', '#22d3ee'],
  },
  {
    id: 'volcano',
    name: 'Molten Magma Pit',
    cost: 250,
    desc: 'Charred volcanic basalt arena with glowing magma rim & embers.',
    preview: ['#451a03', '#1c0a00', '#f97316'],
  },
  {
    id: 'notebook',
    name: 'Graph Paper Sketch',
    cost: 300,
    desc: 'Bright cream engineering notebook with crisp blue graph squares.',
    preview: ['#fefce8', '#fef3c7', '#3b82f6'],
  },
  {
    id: 'matrix',
    name: 'Terminal Matrix',
    cost: 400,
    desc: 'Pitch-black CRT terminal floor with phosphor green radar grid.',
    preview: ['#022c22', '#010a06', '#22c55e'],
  },
  {
    id: 'cosmic_omega',
    name: 'Cosmic Void Ω',
    cost: 650,
    milestone: 'Free on Gauntlet Floor 10 Clear',
    desc: 'Deep starfield cosmos with golden celestial rings & stardust.',
    preview: ['#3b0764', '#090214', '#fbbf24'],
  },
]);

export const BALL_TRAILS = Object.freeze([
  {
    id: 'default',
    name: 'Team Glow',
    cost: 0,
    desc: 'Clean team-colored translucent motion ribbon.',
    preview: ['#38bdf8', '#0284c7'],
  },
  {
    id: 'flame',
    name: 'Blaze Comet',
    cost: 120,
    desc: 'Flickering molten orange and gold fire tail behind your ball.',
    preview: ['#f97316', '#facc15'],
  },
  {
    id: 'rainbow',
    name: 'Prismatic Rainbow',
    cost: 220,
    desc: 'Shifting full-spectrum rainbow comet ribbon.',
    preview: ['#ec4899', '#38bdf8'],
  },
  {
    id: 'glitch',
    name: 'Cyber Glitch',
    cost: 280,
    desc: 'Offset cyan & magenta digital pixel echoes.',
    preview: ['#22d3ee', '#e879f9'],
  },
  {
    id: 'gold_dust',
    name: 'Royal Gold Dust',
    cost: 360,
    desc: 'Glittering golden stardust trail worthy of a champion.',
    preview: ['#fbbf24', '#fef08a'],
  },
  {
    id: 'void_lightning',
    name: 'Omega Lightning',
    cost: 500,
    milestone: 'Free at Gold Rank (1350+)',
    desc: 'Crackling violet-cyan electric arcs trailing every bounce.',
    preview: ['#a855f7', '#2dd4bf'],
  },
]);

export const BOUNTY_DEFS = Object.freeze([
  {
    id: 'win_rounds_3',
    title: 'Arena Striker',
    desc: 'Win 3 combat rounds in any non-Sandbox mode.',
    target: 3,
    sparks: 90,
    xp: 60,
  },
  {
    id: 'play_meme_2',
    title: 'Meme Lord',
    desc: 'Fight 2 rounds using a Meme ball (#101–#120).',
    target: 2,
    sparks: 80,
    xp: 55,
  },
  {
    id: 'underdog_win',
    title: 'Giant Slayer',
    desc: 'Win a round with Coughing Baby, Micro, or Cell.',
    target: 1,
    sparks: 140,
    xp: 90,
  },
  {
    id: 'sudden_death_survivor',
    title: 'Claustrophobia',
    desc: 'Reach 30s Sudden Death in 1 round.',
    target: 1,
    sparks: 85,
    xp: 55,
  },
  {
    id: 'gauntlet_floors_2',
    title: 'Tower Climber',
    desc: 'Clear 2 floors in Gauntlet Tower.',
    target: 2,
    sparks: 120,
    xp: 80,
  },
  {
    id: 'high_hp_win',
    title: 'Untouchable',
    desc: 'Win a round with at least 55 HP remaining.',
    target: 1,
    sparks: 110,
    xp: 75,
  },
  {
    id: 'win_2v2',
    title: 'Dynamic Duo',
    desc: 'Win a 2v2 match (Bot, Local, Gauntlet Boss, or Online).',
    target: 1,
    sparks: 130,
    xp: 85,
  },
  {
    id: 'deal_dmg_300',
    title: 'Heavy Artillery',
    desc: 'Deal 300 total damage across rounds.',
    target: 300,
    sparks: 100,
    xp: 70,
  },
  {
    id: 'exclusive_win',
    title: 'Exclusive Taste',
    desc: 'Win 2 rounds with an Exclusive rarity ball.',
    target: 2,
    sparks: 115,
    xp: 75,
  },
  {
    id: 'ai_trio_round',
    title: 'Model Benchmark',
    desc: 'Play 2 rounds with Claude, ChatGPT, or Gemini Ball.',
    target: 2,
    sparks: 95,
    xp: 65,
  },
  {
    id: 'wall_bounces_30',
    title: 'Pinball Wizard',
    desc: 'Land 30 wall bounces in combat.',
    target: 30,
    sparks: 85,
    xp: 55,
  },
  {
    id: 'win_match_1',
    title: 'Heartbreaker',
    desc: 'Win a full match (Bot, Online, or Gauntlet Floor 5+).',
    target: 1,
    sparks: 125,
    xp: 85,
  },
]);

const MEME_BALL_IDS = new Set(BALL_DEFS.slice(100).map((b) => b.id));
const UNDERDOG_IDS = new Set(['coughingbaby', 'micro', 'cell']);
const AI_TRIO_IDS = new Set(['claude', 'chatgpt', 'gemini']);

function getDefaultStorage() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (_) {}
  return null;
}

export function getBountyDef(id) {
  return BOUNTY_DEFS.find((b) => b.id === id) || BOUNTY_DEFS[0];
}

export function rollBounties(existingIds = [], count = 3, rng = Math.random) {
  const taken = new Set(existingIds);
  const pool = BOUNTY_DEFS.filter((b) => !taken.has(b.id));
  const picked = [];
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    const def = pool.splice(idx, 1)[0];
    picked.push({ id: def.id, progress: 0, target: def.target, claimed: false });
  }
  return picked;
}

export function createDefaultProfile(rng = Math.random) {
  return {
    version: 1,
    sparks: 100,
    xp: 0,
    trophies: 1000,
    bestGauntletFloor: 0,
    gauntletClears: 0,
    equippedTheme: 'classic',
    equippedTrail: 'default',
    unlockedThemes: ['classic'],
    unlockedTrails: ['default'],
    ballMastery: {},
    bounties: rollBounties([], 3, rng),
    stats: {
      wins: 0,
      losses: 0,
      roundsWon: 0,
      onlineWins: 0,
      streak: 0,
      bestStreak: 0,
      totalDamage: 0,
    },
  };
}

export function sanitizeProfile(raw) {
  const base = createDefaultProfile();
  if (!raw || typeof raw !== 'object') return base;
  const p = {
    version: 1,
    sparks: Math.max(0, Math.floor(Number(raw.sparks) || 0)),
    xp: Math.max(0, Math.floor(Number(raw.xp) || 0)),
    trophies: Math.max(0, Math.floor(Number(raw.trophies ?? 1000))),
    bestGauntletFloor: Math.max(0, Math.min(10, Math.floor(Number(raw.bestGauntletFloor) || 0))),
    gauntletClears: Math.max(0, Math.floor(Number(raw.gauntletClears) || 0)),
    equippedTheme: ARENA_THEMES.some((t) => t.id === raw.equippedTheme) ? raw.equippedTheme : 'classic',
    equippedTrail: BALL_TRAILS.some((t) => t.id === raw.equippedTrail) ? raw.equippedTrail : 'default',
    unlockedThemes: Array.from(
      new Set(['classic', ...(Array.isArray(raw.unlockedThemes) ? raw.unlockedThemes : [])])
    ).filter((id) => ARENA_THEMES.some((t) => t.id === id)),
    unlockedTrails: Array.from(
      new Set(['default', ...(Array.isArray(raw.unlockedTrails) ? raw.unlockedTrails : [])])
    ).filter((id) => BALL_TRAILS.some((t) => t.id === id)),
    ballMastery: {},
    bounties: [],
    stats: {
      wins: Math.max(0, Math.floor(Number(raw.stats?.wins) || 0)),
      losses: Math.max(0, Math.floor(Number(raw.stats?.losses) || 0)),
      roundsWon: Math.max(0, Math.floor(Number(raw.stats?.roundsWon) || 0)),
      onlineWins: Math.max(0, Math.floor(Number(raw.stats?.onlineWins) || 0)),
      streak: Math.max(0, Math.floor(Number(raw.stats?.streak) || 0)),
      bestStreak: Math.max(0, Math.floor(Number(raw.stats?.bestStreak) || 0)),
      totalDamage: Math.max(0, Math.floor(Number(raw.stats?.totalDamage) || 0)),
    },
  };
  if (!p.unlockedThemes.includes(p.equippedTheme)) p.equippedTheme = 'classic';
  if (!p.unlockedTrails.includes(p.equippedTrail)) p.equippedTrail = 'default';

  if (raw.ballMastery && typeof raw.ballMastery === 'object') {
    for (const [k, v] of Object.entries(raw.ballMastery)) {
      if (!v || typeof v !== 'object') continue;
      p.ballMastery[k] = {
        xp: Math.max(0, Math.floor(Number(v.xp) || 0)),
        games: Math.max(0, Math.floor(Number(v.games) || 0)),
        wins: Math.max(0, Math.floor(Number(v.wins) || 0)),
      };
    }
  }

  if (Array.isArray(raw.bounties) && raw.bounties.length > 0) {
    for (const b of raw.bounties.slice(0, 3)) {
      const def = BOUNTY_DEFS.find((d) => d.id === b?.id);
      if (!def) continue;
      p.bounties.push({
        id: def.id,
        progress: Math.max(0, Math.min(def.target, Math.floor(Number(b.progress) || 0))),
        target: def.target,
        claimed: Boolean(b.claimed),
      });
    }
  }
  if (p.bounties.length < 3) {
    const extra = rollBounties(
      p.bounties.map((b) => b.id),
      3 - p.bounties.length
    );
    p.bounties.push(...extra);
  }
  return p;
}

export function loadProfile(storage = getDefaultStorage()) {
  if (!storage) return createDefaultProfile();
  try {
    const raw = storage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return createDefaultProfile();
    return sanitizeProfile(JSON.parse(raw));
  } catch (_) {
    return createDefaultProfile();
  }
}

export function saveProfile(profile, storage = getDefaultStorage()) {
  if (!storage) return false;
  try {
    storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch (_) {
    return false;
  }
}

export function getRankInfo(trophies) {
  let current = RANK_TIERS[0];
  let next = RANK_TIERS[1] || null;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (trophies >= RANK_TIERS[i].minTrophies) {
      current = RANK_TIERS[i];
      next = RANK_TIERS[i + 1] || null;
    }
  }
  const progress = next
    ? Math.max(0, Math.min(1, (trophies - current.minTrophies) / (next.minTrophies - current.minTrophies)))
    : 1;
  return { current, next, progress };
}

export function getPlayerLevelInfo(xp) {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  let level = 1;
  let rem = safeXp;
  while (true) {
    const needed = 100 + (level - 1) * 45;
    if (rem < needed) {
      return { level, currentXp: rem, nextXp: needed, progress: rem / needed };
    }
    rem -= needed;
    level++;
    if (level >= 100) return { level: 100, currentXp: needed, nextXp: needed, progress: 1 };
  }
}

export function getBallMasteryInfo(profile, ballId) {
  const rec = profile?.ballMastery?.[ballId] || { xp: 0, games: 0, wins: 0 };
  let tier = MASTERY_TIERS[0];
  let next = MASTERY_TIERS[1];
  for (let i = 0; i < MASTERY_TIERS.length; i++) {
    if (rec.xp >= MASTERY_TIERS[i].minXp) {
      tier = MASTERY_TIERS[i];
      next = MASTERY_TIERS[i + 1] || null;
    }
  }
  const progress = next
    ? Math.max(0, Math.min(1, (rec.xp - tier.minXp) / (next.minXp - tier.minXp)))
    : 1;
  return {
    ballId,
    xp: rec.xp,
    games: rec.games,
    wins: rec.wins,
    level: tier.level,
    label: tier.label,
    color: tier.color,
    nextTier: next,
    progress,
  };
}

export function getBallMasteryLevelMap(profile) {
  const map = {};
  if (!profile?.ballMastery) return map;
  for (const ballId of Object.keys(profile.ballMastery)) {
    const info = getBallMasteryInfo(profile, ballId);
    if (info.level > 0) map[ballId] = info.level;
  }
  return map;
}

export function getClaimableBountyCount(profile) {
  if (!Array.isArray(profile?.bounties)) return 0;
  return profile.bounties.filter((b) => !b.claimed && b.progress >= b.target).length;
}

function advanceBounties(profile, ctx) {
  const newlyCompleted = [];
  for (const b of profile.bounties) {
    if (b.claimed || b.progress >= b.target) continue;
    let delta = 0;
    const usedBalls = ctx.usedBalls || [];
    switch (b.id) {
      case 'win_rounds_3':
        if (ctx.wonRound && ctx.mode !== MODES.SANDBOX) delta = 1;
        break;
      case 'play_meme_2':
        if (usedBalls.some((id) => MEME_BALL_IDS.has(id))) delta = 1;
        break;
      case 'underdog_win':
        if (ctx.wonRound && usedBalls.some((id) => UNDERDOG_IDS.has(id))) delta = 1;
        break;
      case 'sudden_death_survivor':
        if (ctx.suddenDeathActive) delta = 1;
        break;
      case 'gauntlet_floors_2':
        if (ctx.mode === MODES.GAUNTLET && ctx.wonRound) delta = 1;
        break;
      case 'high_hp_win':
        if (ctx.wonRound && (ctx.remainingHp || 0) >= 55) delta = 1;
        break;
      case 'win_2v2':
        if (ctx.wonMatch && ctx.teamSize === 2) delta = 1;
        break;
      case 'deal_dmg_300':
        delta = Math.max(0, Math.round(ctx.dmgDealt || 0));
        break;
      case 'exclusive_win':
        if (ctx.wonRound && usedBalls.some((id) => getBallDef(id).rarity === 'Exclusive')) delta = 1;
        break;
      case 'ai_trio_round':
        if (usedBalls.some((id) => AI_TRIO_IDS.has(id))) delta = 1;
        break;
      case 'wall_bounces_30':
        delta = Math.max(0, Math.round(ctx.wallHits || 0));
        break;
      case 'win_match_1':
        if (ctx.wonMatch && ctx.mode !== MODES.SANDBOX && ctx.mode !== MODES.LOCAL_2P) delta = 1;
        break;
      default:
        break;
    }
    if (delta > 0) {
      b.progress = Math.min(b.target, b.progress + delta);
      if (b.progress >= b.target) {
        newlyCompleted.push(getBountyDef(b.id));
      }
    }
  }
  return newlyCompleted;
}

function checkMilestoneUnlocks(profile) {
  const unlocked = [];
  if (profile.gauntletClears >= 1 && !profile.unlockedThemes.includes('cosmic_omega')) {
    profile.unlockedThemes.push('cosmic_omega');
    unlocked.push('Arena Theme: Cosmic Void Ω');
  }
  if (profile.trophies >= 1350 && !profile.unlockedTrails.includes('void_lightning')) {
    profile.unlockedTrails.push('void_lightning');
    unlocked.push('Ball Trail: Omega Lightning');
  }
  return unlocked;
}

/**
 * Records a completed round (and optional match end / gauntlet floor clear) into the player profile.
 * Returns a structured reward summary for the Arena Banner UI.
 */
export function recordCombatProgress(profile, opts = {}) {
  const {
    mode = MODES.BOT,
    teamSize = 1,
    usedBalls = [],
    wonRound = false,
    isDraw = false,
    matchEnded = false,
    wonMatch = false,
    suddenDeathActive = false,
    remainingHp = 0,
    dmgDealt = 0,
    wallHits = 0,
    gauntletFloor = 0,
    gauntletCleared = false,
    rewardMult = 1,
  } = opts;

  const isSandbox = mode === MODES.SANDBOX;
  const isLocal = mode === MODES.LOCAL_2P;
  const prevLevel = getPlayerLevelInfo(profile.xp).level;
  const prevRank = getRankInfo(profile.trophies).current.id;

  let sparksEarned = 0;
  let xpEarned = 0;
  let trophiesDelta = 0;
  const masteryUps = [];

  if (isSandbox) {
    // Light practice Mastery XP only (no currency/rank farming in Sandbox)
    xpEarned = 5;
  } else {
    sparksEarned = wonRound ? 22 : isDraw ? 10 : 8;
    xpEarned = wonRound ? 25 : 12;

    if (mode === MODES.GAUNTLET && wonRound) {
      sparksEarned += 20 + gauntletFloor * 5;
      xpEarned += 20 + gauntletFloor * 4;
      if (gauntletFloor > profile.bestGauntletFloor) {
        profile.bestGauntletFloor = gauntletFloor;
      }
      if (gauntletCleared) {
        profile.gauntletClears += 1;
        sparksEarned += 200;
        xpEarned += 150;
        trophiesDelta += 45;
      }
    }

    if (matchEnded) {
      if (wonMatch) {
        profile.stats.wins += 1;
        profile.stats.streak += 1;
        profile.stats.bestStreak = Math.max(profile.stats.bestStreak, profile.stats.streak);
        sparksEarned += mode === MODES.ONLINE ? 65 : isLocal ? 25 : 40;
        xpEarned += mode === MODES.ONLINE ? 55 : 35;
        if (mode === MODES.ONLINE) {
          profile.stats.onlineWins += 1;
          trophiesDelta += 32;
        } else if (mode === MODES.BOT) {
          trophiesDelta += 18;
        }
      } else if (!isLocal) {
        profile.stats.losses += 1;
        profile.stats.streak = 0;
        if (mode === MODES.ONLINE) trophiesDelta -= 14;
        else if (mode === MODES.BOT) trophiesDelta -= 8;
      }
    }

    if (wonRound) profile.stats.roundsWon += 1;
  }

  profile.stats.totalDamage += Math.max(0, Math.round(dmgDealt));
  sparksEarned = Math.round(sparksEarned * rewardMult);
  xpEarned = Math.round(xpEarned * rewardMult);

  profile.sparks += sparksEarned;
  profile.xp += xpEarned;
  profile.trophies = Math.max(0, profile.trophies + trophiesDelta);

  // Per-ball Mastery XP
  const uniqueBalls = Array.from(new Set(usedBalls.filter(Boolean)));
  const ballXpGain = Math.round((isSandbox ? 5 : wonRound ? 28 : 14) * rewardMult);
  for (const ballId of uniqueBalls) {
    const beforeLv = getBallMasteryInfo(profile, ballId).level;
    if (!profile.ballMastery[ballId]) {
      profile.ballMastery[ballId] = { xp: 0, games: 0, wins: 0 };
    }
    const rec = profile.ballMastery[ballId];
    rec.xp += ballXpGain;
    rec.games += 1;
    if (wonRound) rec.wins += 1;
    const afterInfo = getBallMasteryInfo(profile, ballId);
    if (afterInfo.level > beforeLv) {
      masteryUps.push({ ballId, name: getBallDef(ballId).name, level: afterInfo.level, label: afterInfo.label });
    }
  }

  const completedBounties = isSandbox
    ? []
    : advanceBounties(profile, {
        mode,
        teamSize,
        usedBalls: uniqueBalls,
        wonRound,
        wonMatch: matchEnded && wonMatch,
        suddenDeathActive,
        remainingHp,
        dmgDealt,
        wallHits,
      });

  const milestoneUnlocks = checkMilestoneUnlocks(profile);
  const nextLevel = getPlayerLevelInfo(profile.xp).level;
  const nextRank = getRankInfo(profile.trophies).current;

  return {
    sparksEarned,
    xpEarned,
    trophiesDelta,
    ballXpGain,
    leveledUp: nextLevel > prevLevel ? nextLevel : 0,
    rankedUp: nextRank.id !== prevRank && trophiesDelta > 0 ? nextRank : null,
    masteryUps,
    completedBounties,
    milestoneUnlocks,
  };
}

export function claimBounty(profile, bountyId, rng = Math.random) {
  const idx = profile.bounties.findIndex((b) => b.id === bountyId);
  if (idx === -1) return null;
  const b = profile.bounties[idx];
  if (b.claimed || b.progress < b.target) return null;
  const def = getBountyDef(b.id);
  profile.sparks += def.sparks;
  profile.xp += def.xp;
  // Immediately cycle a fresh replacement bounty so players always have 3 active goals
  const otherIds = profile.bounties.map((x) => x.id);
  const replacement = rollBounties(otherIds, 1, rng)[0] || { id: def.id, progress: 0, target: def.target, claimed: false };
  profile.bounties[idx] = replacement;
  return { sparks: def.sparks, xp: def.xp, title: def.title };
}

export function unlockCosmetic(profile, kind, id) {
  const catalog = kind === 'theme' ? ARENA_THEMES : BALL_TRAILS;
  const list = kind === 'theme' ? profile.unlockedThemes : profile.unlockedTrails;
  const item = catalog.find((c) => c.id === id);
  if (!item) return { ok: false, reason: 'Invalid cosmetic' };
  if (list.includes(id)) return { ok: true, alreadyUnlocked: true };
  if (profile.sparks < item.cost) return { ok: false, reason: `Need ${item.cost} Sparks` };
  profile.sparks -= item.cost;
  list.push(id);
  if (kind === 'theme') profile.equippedTheme = id;
  else profile.equippedTrail = id;
  return { ok: true, item };
}

export function equipCosmetic(profile, kind, id) {
  const list = kind === 'theme' ? profile.unlockedThemes : profile.unlockedTrails;
  if (!list.includes(id)) return false;
  if (kind === 'theme') profile.equippedTheme = id;
  else profile.equippedTrail = id;
  return true;
}

export function exportProfileCode(profile) {
  const json = JSON.stringify(profile);
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(json)));
  }
  return json;
}

export function importProfileCode(code) {
  if (!code || typeof code !== 'string') return null;
  const trimmed = code.trim();
  try {
    const json =
      trimmed.startsWith('{')
        ? trimmed
        : typeof atob === 'function'
        ? decodeURIComponent(escape(atob(trimmed)))
        : trimmed;
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    return sanitizeProfile(parsed);
  } catch (_) {
    return null;
  }
}
