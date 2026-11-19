export const ARENA_SIZE = 600;
export const FIXED_DT = 1 / 60;
export const MAX_ACCUM_DT = 0.1;

export const DEFAULT_HEARTS = 3;
export const DRAFT_TIMER_SEC = 25;
export const FREE_REROLLS_PER_ROUND = 2;

export const SUDDEN_DEATH_START_SEC = 22;
export const SUDDEN_DEATH_SHRINK_RATE = 13; // px per second per side
export const MIN_ARENA_SIZE = 280;

export const BASE_BALL_RADIUS = 50;
export const MAX_TEAM_BALLS = 16;
export const BASE_CONTACT_DMG = 0;
export const CONTACT_COOLDOWN_SEC = 0.22;
export const MIN_BALL_SPEED = 240;
export const MAX_BALL_SPEED = 720;

export const MODES = Object.freeze({
  BOT: 'bot',
  LOCAL_2P: 'local2p',
  SANDBOX: 'sandbox',
  ONLINE: 'online',
});

export const PHASES = Object.freeze({
  LOBBY: 'lobby',
  DRAFT: 'draft',
  AIM: 'aim',
  FIGHT: 'fight',
  ROUND_END: 'round_end',
  MATCH_END: 'match_end',
});

export const RARITY_META = Object.freeze({
  Rare: {
    label: 'Rare',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.16)',
    border: '#0284c7',
    order: 1,
  },
  Epic: {
    label: 'Epic',
    color: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.16)',
    border: '#9333ea',
    order: 2,
  },
  Legendary: {
    label: 'Legendary',
    color: '#fbbf24',
    bg: 'rgba(251, 191, 36, 0.18)',
    border: '#d97706',
    order: 3,
  },
  Mythic: {
    label: 'Mythic',
    color: '#fb7185',
    bg: 'rgba(251, 113, 133, 0.20)',
    border: '#e11d48',
    order: 4,
  },
  Exclusive: {
    label: 'Exclusive',
    color: '#2dd4bf',
    bg: 'rgba(45, 212, 191, 0.18)',
    border: '#0d9488',
    order: 5,
  },
});
