import {
  ARENA_SIZE,
  DRAFT_TIMER_SEC,
  FIXED_DT,
  FREE_REROLLS_PER_ROUND,
  MAX_ACCUM_DT,
  MODES,
  PHASES,
  SUDDEN_DEATH_START_SEC,
} from '../sim/constants.js';
import { BALL_DEFS, getBallDef } from '../sim/balls.js';
import { ArenaSimulation } from '../sim/physics.js';
import { chooseBotAimAngle, chooseBotBall, drawRandomBallChoices } from '../sim/ai.js';
import { renderBallPreview } from '../render/ballArt.js';
import { renderArena } from '../render/arenaRenderer.js';
import { soundEngine } from '../audio/soundEngine.js';
import { P2PRoomClient, sanitizeRoomCode } from '../net/p2p.js';
import { applySnapshot, encodeSnapshot, stepMirrorVisuals } from '../net/protocol.js';

const $ = (id) => document.getElementById(id);

const sim = new ArenaSimulation();
const p2p = new P2PRoomClient();

const online = {
  active: false,
  role: null, // 'host' | 'guest'
  mySeat: 0,
  myOwner: 1,
  mySlot: 0,
  teamSize: 1,
  totalPlayers: 2,
  myDraftPick: null,
  oppDraftPick: null,
  myDraftTeam: [],
  oppDraftTeam: [],
  seatPicks: {},
  myAimLocked: false,
  oppAimLocked: false,
  oppAimAngles: [],
  seatAngles: {},
  aimLockedCount: 0,
  myNextReady: false,
  oppNextReady: false,
  readySeats: new Set(),
  fxWatermark: { lastId: 0 },
  snapTick: 0,
  pendingEvents: [],
};

const ui = {
  view: 'lobby',
  teamSize: 1,
  draftTimerEnabled: true,
  draftPlayer: 1,
  draftSlot: 0,
  localTurn: 0,
  draftChoices: [],
  draftPicks: { 1: null, 2: null },
  draftTeams: { 1: [], 2: [] },
  draftRerollsLeft: FREE_REROLLS_PER_ROUND,
  draftCountdown: DRAFT_TIMER_SEC,
  draftIntervalId: null,
  aimingPlayer: 1,
  aimSlot: 0,
  aimLockedP1: false,
  isDraggingAim: false,
  paused: false,
  simSpeed: 1,
  sandboxP1: 'verity',
  sandboxP2: 'spider',
  sandboxTeams: { 1: ['verity', 'sword'], 2: ['spider', 'orbital'] },
  sandboxSlot: { 1: 0, 2: 0 },
  sandboxSearch: { 1: '', 2: '' },
  dexRarity: 'ALL',
  dexQuery: '',
  pendingShieldCallback: null,
};

let lastFrameMs = 0;
let accumSec = 0;

function getSeatMeta(seat, teamSize = sim.teamSize) {
  if (teamSize !== 2) {
    return seat === 0
      ? { seat: 0, owner: 1, slot: 0, label: 'Player 1 (Blue)' }
      : { seat: 1, owner: 2, slot: 0, label: 'Player 2 (Red)' };
  }
  const map = [
    { seat: 0, owner: 1, slot: 0, label: 'Player 1 (Blue #1)' },
    { seat: 1, owner: 1, slot: 1, label: 'Player 2 (Blue #2)' },
    { seat: 2, owner: 2, slot: 0, label: 'Player 3 (Red #1)' },
    { seat: 3, owner: 2, slot: 1, label: 'Player 4 (Red #2)' },
  ];
  return map[Math.max(0, Math.min(3, Number(seat) || 0))];
}

function isSingleSeatAim() {
  return sim.teamSize === 2 && (sim.mode === MODES.LOCAL_2P || sim.mode === MODES.ONLINE);
}

function renderOnlineRoster(container, data) {
  if (!container) return;
  if (!data || (data.total || 2) <= 2) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }
  const connected = new Set(data.connectedSeats || []);
  const teamSize = data.teamSize || 2;
  const total = data.total || 4;
  container.classList.remove('hidden');
  container.innerHTML = '';
  for (let s = 0; s < total; s++) {
    const meta = getSeatMeta(s, teamSize);
    const pill = document.createElement('span');
    const isJoined = connected.has(s);
    const isMe = data.mySeat === s;
    const sideCls = meta.owner === 1 ? 'is-blue' : 'is-red';
    pill.className = `roster-pill${isJoined ? ` is-ready ${sideCls}` : ''}`;
    pill.textContent = `${meta.label}${isMe ? ' • YOU' : isJoined ? ' ✓' : ' …'}`;
    container.appendChild(pill);
  }
}

function formatTeamNames(teamIds) {
  const list = (Array.isArray(teamIds) ? teamIds : [teamIds]).filter(Boolean);
  if (list.length <= 1) return getBallDef(list[0] || 'verity').name;
  return list.map((id) => getBallDef(id).name.replace(' Ball', '')).join(' + ');
}

function setTeamFormat(size) {
  const next = size === 2 ? 2 : 1;
  ui.teamSize = next;
  if (sim.phase === PHASES.LOBBY) {
    sim.setTeamSize(next);
    sim.resetRoundEntities();
  }
  document.querySelectorAll('[data-format-toggle] .fmt-btn').forEach((btn) => {
    btn.classList.toggle('is-active', Number(btn.dataset.teamSize) === next);
  });
  document.querySelectorAll('[data-mode-format-tag]').forEach((el) => {
    el.textContent = next === 2 ? '2v2' : '1v1';
  });
  const fightBtn = $('btn-sandbox-fight');
  if (fightBtn) {
    fightBtn.textContent = next === 2 ? 'Launch 2v2 Duel' : 'Launch 1v1 Duel';
  }
  $('view-arena').classList.toggle('is-2v2', next === 2);
  renderSandboxGrids();
  updateSandboxPreviews();
}

function resetOnlineState() {
  online.active = false;
  online.role = null;
  online.mySeat = 0;
  online.myOwner = 1;
  online.mySlot = 0;
  online.teamSize = 1;
  online.totalPlayers = 2;
  online.myDraftPick = null;
  online.oppDraftPick = null;
  online.myDraftTeam = [];
  online.oppDraftTeam = [];
  online.seatPicks = {};
  online.myAimLocked = false;
  online.oppAimLocked = false;
  online.oppAimAngles = [];
  online.seatAngles = {};
  online.aimLockedCount = 0;
  online.myNextReady = false;
  online.oppNextReady = false;
  online.readySeats = new Set();
  online.fxWatermark = { lastId: 0 };
  online.snapTick = 0;
  online.pendingEvents = [];
}

function init() {
  setTeamFormat(1);
  renderLobbyShowcases();
  renderSandboxGrids();
  updateSandboxPreviews();
  renderDexGrid();
  bindP2PHandlers();
  bindEvents();

  const params = new URLSearchParams(window.location.search);
  const roomParam = sanitizeRoomCode(params.get('room'));
  if (roomParam.length >= 3) {
    $('online-join-code').value = roomParam;
    showView('online');
  }

  requestAnimationFrame(loop);
}

function renderLobbyShowcases() {
  renderBallPreview($('showcase-verity'), getBallDef('verity'));
  renderBallPreview($('showcase-spider'), getBallDef('spider'));
}

function showView(name) {
  ui.view = name;
  $('view-lobby').classList.toggle('hidden', name !== 'lobby');
  $('view-online').classList.toggle('hidden', name !== 'online');
  $('view-sandbox').classList.toggle('hidden', name !== 'sandbox');
  $('view-arena').classList.toggle('hidden', name !== 'arena');
  $('btn-back-lobby').classList.toggle('hidden', name === 'lobby');

  if (name === 'lobby') {
    stopDraftTimer();
    p2p.close();
    resetOnlineState();
    setQuickmatchSearching(false);
    $('online-room-box').classList.add('hidden');
    $('online-seat-roster')?.classList.add('hidden');
    $('online-guest-roster')?.classList.add('hidden');
    if ($('online-seat-roster')) $('online-seat-roster').innerHTML = '';
    if ($('online-guest-roster')) $('online-guest-roster').innerHTML = '';
    $('online-status').textContent = 'Ready to host or join an Online duel.';
    $('modal-draft').classList.add('hidden');
    $('arena-banner').classList.add('hidden');
    $('pass-shield').classList.add('hidden');
    $('btn-shield-ready').classList.remove('hidden');
    $('btn-lock-aim').disabled = false;
    $('btn-banner-next').disabled = false;
    sim.phase = PHASES.LOBBY;
    sim.setTeamSize(ui.teamSize);
    $('view-arena').classList.toggle('is-2v2', ui.teamSize === 2);
  }
}

function setQuickmatchSearching(searching) {
  const btn = $('btn-online-quickmatch');
  if (!btn) return;
  btn.textContent = searching ? 'Cancel Search' : 'Find 1v1 Match';
  btn.classList.toggle('btn-gold', !searching);
  btn.classList.toggle('btn-ghost', searching);
}

function startQuickmatch() {
  if (p2p.isSearchingQuickmatch()) {
    p2p.close();
    resetOnlineState();
    setQuickmatchSearching(false);
    $('online-status').textContent = 'Quickmatch cancelled.';
    return;
  }
  setTeamFormat(1);
  showView('online');
  $('online-room-box').classList.add('hidden');
  $('online-seat-roster')?.classList.add('hidden');
  $('online-guest-roster')?.classList.add('hidden');
  setQuickmatchSearching(true);
  p2p.quickmatch();
}

/* ==================== SANDBOX ==================== */
function renderMiniBallGrid(container, selectedId, onPick) {
  container.innerHTML = '';
  for (const def of BALL_DEFS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `mini-ball-btn${def.id === selectedId ? ' is-selected' : ''}`;
    btn.dataset.ballId = def.id;
    btn.dataset.search = `${def.id} ${def.name} ${def.rarity} ${def.archetype} ${def.quote}`.toLowerCase();

    const c = document.createElement('canvas');
    c.width = 48;
    c.height = 48;
    renderBallPreview(c, def);

    const label = document.createElement('span');
    label.textContent = def.name.replace(' Ball', '');

    btn.append(c, label);
    btn.addEventListener('click', () => {
      soundEngine.unlock();
      onPick(def.id);
    });
    container.appendChild(btn);
  }
}

function syncGridSelection(container, selectedId) {
  for (const btn of container.querySelectorAll('.mini-ball-btn')) {
    btn.classList.toggle('is-selected', btn.dataset.ballId === selectedId);
  }
}

function filterSandboxGrid(container, query) {
  const q = (query || '').trim().toLowerCase();
  for (const btn of container.querySelectorAll('.mini-ball-btn')) {
    const hay = btn.dataset.search || '';
    btn.classList.toggle('hidden', Boolean(q) && !hay.includes(q));
  }
}

function renderSandboxGrids() {
  const g1 = $('sb-p1-grid');
  const g2 = $('sb-p2-grid');
  const sel1 = ui.sandboxTeams[1][ui.teamSize === 2 ? ui.sandboxSlot[1] : 0];
  const sel2 = ui.sandboxTeams[2][ui.teamSize === 2 ? ui.sandboxSlot[2] : 0];

  $('sb-p1-slots').classList.toggle('hidden', ui.teamSize !== 2);
  $('sb-p2-slots').classList.toggle('hidden', ui.teamSize !== 2);
  document.querySelectorAll('#sb-p1-slots .slot-tab').forEach((btn) => {
    const s = Number(btn.dataset.slot);
    btn.classList.toggle('is-active', s === ui.sandboxSlot[1]);
    btn.textContent = `Ball ${s + 1}: ${getBallDef(ui.sandboxTeams[1][s]).name.replace(' Ball', '')}`;
  });
  document.querySelectorAll('#sb-p2-slots .slot-tab').forEach((btn) => {
    const s = Number(btn.dataset.slot);
    btn.classList.toggle('is-active', s === ui.sandboxSlot[2]);
    btn.textContent = `Ball ${s + 1}: ${getBallDef(ui.sandboxTeams[2][s]).name.replace(' Ball', '')}`;
  });

  if (!g1.children.length) {
    renderMiniBallGrid(g1, sel1, (id) => {
      const slot = ui.teamSize === 2 ? ui.sandboxSlot[1] : 0;
      ui.sandboxTeams[1][slot] = id;
      ui.sandboxP1 = ui.sandboxTeams[1][0];
      renderSandboxGrids();
      updateSandboxPreviews();
    });
  } else {
    syncGridSelection(g1, sel1);
  }
  if (!g2.children.length) {
    renderMiniBallGrid(g2, sel2, (id) => {
      const slot = ui.teamSize === 2 ? ui.sandboxSlot[2] : 0;
      ui.sandboxTeams[2][slot] = id;
      ui.sandboxP2 = ui.sandboxTeams[2][0];
      renderSandboxGrids();
      updateSandboxPreviews();
    });
  } else {
    syncGridSelection(g2, sel2);
  }

  filterSandboxGrid(g1, ui.sandboxSearch[1]);
  filterSandboxGrid(g2, ui.sandboxSearch[2]);
}

function updateSandboxPreviews() {
  const is2v2 = ui.teamSize === 2;
  const d1a = getBallDef(ui.sandboxTeams[1][0]);
  const d1b = getBallDef(ui.sandboxTeams[1][1]);
  const d2a = getBallDef(ui.sandboxTeams[2][0]);
  const d2b = getBallDef(ui.sandboxTeams[2][1]);

  $('sb-canvas-1b').classList.toggle('hidden', !is2v2);
  $('sb-canvas-2b').classList.toggle('hidden', !is2v2);

  renderBallPreview($('sb-canvas-1'), d1a);
  renderBallPreview($('sb-canvas-2'), d2a);

  if (is2v2) {
    const n1 = formatTeamNames(ui.sandboxTeams[1]);
    const n2 = formatTeamNames(ui.sandboxTeams[2]);
    $('sb-p1-selected').textContent = n1;
    $('sb-p2-selected').textContent = n2;
    $('sb-name-1').textContent = n1;
    $('sb-name-2').textContent = n2;
    $('sb-desc-1').textContent = `${d1a.hp + d1b.hp} Team HP • ${d1a.rarity} & ${d1b.rarity}`;
    $('sb-desc-2').textContent = `${d2a.hp + d2b.hp} Team HP • ${d2a.rarity} & ${d2b.rarity}`;
    renderBallPreview($('sb-canvas-1b'), d1b);
    renderBallPreview($('sb-canvas-2b'), d2b);
  } else {
    $('sb-p1-selected').textContent = d1a.name;
    $('sb-p2-selected').textContent = d2a.name;
    $('sb-name-1').textContent = d1a.name;
    $('sb-name-2').textContent = d2a.name;
    $('sb-desc-1').textContent = `${d1a.rarity} • ${d1a.hp} HP — ${d1a.quote}`;
    $('sb-desc-2').textContent = `${d2a.rarity} • ${d2a.hp} HP — ${d2a.quote}`;
  }
}

function startSandboxDuel(p1Arg = null, p2Arg = null) {
  const is2v2 = Array.isArray(p1Arg) || Array.isArray(p2Arg) || ui.teamSize === 2;
  const t1 = Array.isArray(p1Arg)
    ? [...p1Arg]
    : p1Arg
    ? (is2v2 ? [p1Arg, ui.sandboxTeams[1][1] || 'sword'] : [p1Arg])
    : is2v2
    ? [...ui.sandboxTeams[1]]
    : [ui.sandboxTeams[1][0]];
  const t2 = Array.isArray(p2Arg)
    ? [...p2Arg]
    : p2Arg
    ? (is2v2 ? [p2Arg, ui.sandboxTeams[2][1] || 'orbital'] : [p2Arg])
    : is2v2
    ? [...ui.sandboxTeams[2]]
    : [ui.sandboxTeams[2][0]];

  ui.sandboxTeams[1][0] = t1[0];
  if (t1[1]) ui.sandboxTeams[1][1] = t1[1];
  ui.sandboxTeams[2][0] = t2[0];
  if (t2[1]) ui.sandboxTeams[2][1] = t2[1];
  ui.sandboxP1 = ui.sandboxTeams[1][0];
  ui.sandboxP2 = ui.sandboxTeams[2][0];

  const hearts = Number($('sb-hearts').value) || 3;
  const sd = Number($('sb-sd').value);

  sim.startMatch({
    mode: MODES.SANDBOX,
    teamSize: is2v2 ? 2 : 1,
    hearts,
    suddenDeathStart: Number.isFinite(sd) ? sd : SUDDEN_DEATH_START_SEC,
    skipDraft: true,
  });
  ui.paused = false;
  ui.simSpeed = 1;
  updateFightButtons();
  showView('arena');
  enterAimPhase(is2v2 ? t1 : t1[0], is2v2 ? t2 : t2[0]);
}

function runSandboxBatchSim(runs = 10) {
  const is2v2 = ui.teamSize === 2;
  const t1 = is2v2 ? [...ui.sandboxTeams[1]] : [ui.sandboxTeams[1][0]];
  const t2 = is2v2 ? [...ui.sandboxTeams[2]] : [ui.sandboxTeams[2][0]];
  const name1 = formatTeamNames(t1);
  const name2 = formatTeamNames(t2);
  const sdVal = Number($('sb-sd').value);
  const suddenDeathStart = Number.isFinite(sdVal) ? sdVal : SUDDEN_DEATH_START_SEC;

  let p1Wins = 0;
  let p2Wins = 0;
  let draws = 0;
  let totalTime = 0;

  for (let i = 0; i < runs; i++) {
    const testSim = new ArenaSimulation({
      mode: MODES.SANDBOX,
      teamSize: is2v2 ? 2 : 1,
      hearts: 1,
      suddenDeathStart,
      seed: (Date.now() + i * 7919) >>> 0,
    });
    testSim.startMatch({ skipDraft: true, teamSize: is2v2 ? 2 : 1 });
    testSim.setupAimPhase(is2v2 ? t1 : t1[0], is2v2 ? t2 : t2[0]);

    const pickAngles = (owner) => {
      const mine = testSim.balls.filter((b) => b.owner === owner);
      const foes = testSim.balls.filter((b) => b.owner !== owner);
      return mine.map((b, idx) => chooseBotAimAngle(b, foes[idx % foes.length] || foes[0], testSim.rng));
    };
    const angles1 = pickAngles(1);
    const angles2 = pickAngles(2);
    testSim.launchRound(is2v2 ? angles1 : angles1[0], is2v2 ? angles2 : angles2[0]);

    let ticks = 0;
    while (testSim.phase === PHASES.FIGHT && ticks < 3600) {
      testSim.step(FIXED_DT);
      ticks++;
    }
    totalTime += testSim.roundTime;
    if (testSim.roundWinner === 1) p1Wins++;
    else if (testSim.roundWinner === 2) p2Wins++;
    else draws++;
  }

  const avgSec = (totalTime / runs).toFixed(1);
  const box = $('sb-sim-results');
  box.classList.remove('hidden');
  box.innerHTML = `
    <strong>${runs}-Match ${is2v2 ? '2v2 ' : ''}Simulation (${name1} vs ${name2})</strong><br/>
    Blue (${name1}): <strong>${p1Wins}</strong> wins &nbsp;|&nbsp;
    Red (${name2}): <strong>${p2Wins}</strong> wins &nbsp;|&nbsp;
    Draws: <strong>${draws}</strong><br/>
    Average Round Time: <strong>${avgSec}s</strong>
  `;
}

/* ==================== DRAFT FLOW ==================== */
function startArenaMode(mode, teamSize = ui.teamSize) {
  setTeamFormat(teamSize);
  sim.startMatch({ mode, teamSize: ui.teamSize, hearts: 3, suddenDeathStart: SUDDEN_DEATH_START_SEC });
  ui.paused = false;
  ui.simSpeed = 1;
  updateFightButtons();
  showView('arena');
  beginRoundDraft();
}

function beginRoundDraft() {
  ui.draftPicks = { 1: null, 2: null };
  ui.draftTeams = { 1: [], 2: [] };
  ui.localTurn = 0;
  openDraftForPlayer(1, 0);
}

function openDraftForPlayer(playerNum, slotIdx = 0) {
  ui.draftPlayer = playerNum;
  ui.draftSlot = slotIdx;
  ui.draftRerollsLeft = FREE_REROLLS_PER_ROUND;
  ui.draftChoices = drawRandomBallChoices(3);
  $('draft-all-panel').classList.add('hidden');
  $('draft-cards').classList.remove('hidden');

  const is2v2 = sim.teamSize === 2;
  const singlePeer2v2 = is2v2 && (sim.mode === MODES.LOCAL_2P || sim.mode === MODES.ONLINE);
  if (singlePeer2v2) {
    const seatIdx = sim.mode === MODES.ONLINE ? online.mySeat : ui.localTurn;
    const meta = getSeatMeta(seatIdx, 2);
    const modeTag = sim.mode === MODES.ONLINE ? 'ONLINE 2v2 (4P)' : '4P LOCAL';
    $('draft-player-kicker').textContent = `ROUND ${sim.roundNumber} • ${modeTag} • ${meta.label.toUpperCase()}`;
    $('draft-title').textContent = 'Choose Your Ball';
  } else {
    const label = playerNum === 1 ? 'PLAYER 1 (BLUE)' : 'PLAYER 2 (RED)';
    const firstNote =
      is2v2 && slotIdx === 1 && ui.draftTeams[playerNum][0]
        ? ` • PICKING WITH ${getBallDef(ui.draftTeams[playerNum][0]).name.replace(' Ball', '').toUpperCase()}`
        : '';
    $('draft-player-kicker').textContent = is2v2
      ? `ROUND ${sim.roundNumber} • ${label} • BALL ${slotIdx + 1}/2${firstNote}`
      : `ROUND ${sim.roundNumber} • ${label}`;
    $('draft-title').textContent = is2v2
      ? slotIdx === 0
        ? 'Choose 1st Ball'
        : 'Choose 2nd Teammate'
      : 'Choose Your Ball';
  }

  renderDraftCards();
  updateRerollButton();
  $('modal-draft').classList.remove('hidden');
  startDraftTimer();
}

function renderDraftCards() {
  const container = $('draft-cards');
  container.innerHTML = '';
  for (const def of ui.draftChoices) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `draft-card border-${def.rarity}`;

    const canvas = document.createElement('canvas');
    canvas.width = 76;
    canvas.height = 76;
    renderBallPreview(canvas, def);

    const title = document.createElement('h3');
    title.textContent = def.name;

    const pill = document.createElement('span');
    pill.className = `rarity-pill r-${def.rarity}`;
    pill.textContent = `${def.rarity} • ${def.archetype}`;

    const stats = document.createElement('div');
    stats.className = 'draft-stats';
    stats.innerHTML = `<span>${def.hp} HP</span><span>•</span><span>${def.contactDmg} Contact</span>`;

    const quote = document.createElement('p');
    quote.className = 'draft-quote';
    quote.textContent = `"${def.quote}"`;

    const details = document.createElement('p');
    details.className = 'draft-details';
    details.textContent = def.details;

    card.append(canvas, title, pill, stats, quote, details);
    card.addEventListener('click', () => {
      soundEngine.unlock();
      selectDraftBall(def.id);
    });
    container.appendChild(card);
  }
}

function updateRerollButton() {
  const btn = $('btn-reroll');
  btn.textContent = `Reroll (${ui.draftRerollsLeft} left)`;
  btn.disabled = ui.draftRerollsLeft <= 0;
}

function startDraftTimer() {
  stopDraftTimer();
  const badge = $('draft-timer');
  if (!ui.draftTimerEnabled) {
    badge.textContent = '∞';
    return;
  }
  ui.draftCountdown = DRAFT_TIMER_SEC;
  badge.textContent = `${ui.draftCountdown}s`;
  ui.draftIntervalId = setInterval(() => {
    ui.draftCountdown -= 1;
    badge.textContent = `${Math.max(0, ui.draftCountdown)}s`;
    if (ui.draftCountdown <= 0) {
      stopDraftTimer();
      if (ui.draftChoices.length > 0) {
        selectDraftBall(ui.draftChoices[0].id);
      }
    }
  }, 1000);
}

function stopDraftTimer() {
  if (ui.draftIntervalId) {
    clearInterval(ui.draftIntervalId);
    ui.draftIntervalId = null;
  }
}

function selectDraftBall(ballId) {
  stopDraftTimer();
  ui.draftTeams[ui.draftPlayer][ui.draftSlot] = ballId;
  if (ui.draftSlot === 0) ui.draftPicks[ui.draftPlayer] = ballId;

  if (sim.mode === MODES.BOT && ui.draftTeams[ui.draftPlayer].length < sim.teamSize) {
    openDraftForPlayer(ui.draftPlayer, ui.draftSlot + 1);
    return;
  }

  $('modal-draft').classList.add('hidden');
  const is2v2 = sim.teamSize === 2;

  if (sim.mode === MODES.ONLINE) {
    online.myDraftPick = ballId;
    online.seatPicks[online.mySeat] = ballId;
    if (!is2v2) online.myDraftTeam = [ballId];
    const modeTag = is2v2 ? 'ONLINE 2v2 (4P)' : 'ONLINE 1v1';
    if (online.role === 'host') {
      const count = Object.keys(online.seatPicks).length;
      if (count >= online.totalPlayers) {
        hostEnterOnlineAim();
      } else {
        p2p.send({ type: 'draft_progress', count, total: online.totalPlayers });
        showWaitingShield(
          modeTag,
          'Ball Locked In!',
          is2v2
            ? `Waiting for other players to draft (${count}/${online.totalPlayers} ready)...`
            : 'Waiting for Player 2 (Red) to pick their ball...'
        );
      }
    } else {
      p2p.send({ type: 'draft_pick', ballId, seat: online.mySeat, team: [ballId] });
      showWaitingShield(
        modeTag,
        'Ball Locked In!',
        is2v2 ? 'Waiting for other players to draft...' : 'Waiting for Player 1 (Blue) to pick their ball...'
      );
    }
    return;
  }

  if (sim.mode === MODES.BOT) {
    const botTeam = [];
    for (let s = 0; s < sim.teamSize; s++) {
      const botPool = drawRandomBallChoices(3);
      botTeam.push(chooseBotBall(botPool).id);
    }
    ui.draftTeams[2] = botTeam;
    ui.draftPicks[2] = botTeam[0];
    enterAimPhase(
      is2v2 ? ui.draftTeams[1] : ui.draftTeams[1][0],
      is2v2 ? ui.draftTeams[2] : ui.draftTeams[2][0]
    );
  } else if (sim.mode === MODES.LOCAL_2P) {
    if (!is2v2) {
      if (ui.draftPlayer === 1) {
        ui.localTurn = 1;
        showPassShield(
          'Pass to Player 2 (Red)',
          'Player 1 picked secretly. Hand over the device so Player 2 can draft.',
          () => openDraftForPlayer(2, 0)
        );
      } else {
        enterAimPhase(ui.draftTeams[1][0], ui.draftTeams[2][0]);
      }
      return;
    }

    if (ui.localTurn < 3) {
      const curMeta = getSeatMeta(ui.localTurn, 2);
      ui.localTurn += 1;
      const nextMeta = getSeatMeta(ui.localTurn, 2);
      showPassShield(
        `Pass to ${nextMeta.label}`,
        `${curMeta.label} picked secretly. Hand over the device so ${nextMeta.label} can draft.`,
        () => openDraftForPlayer(nextMeta.owner, nextMeta.slot),
        "I'm Ready",
        'LOCAL 4-PLAYER (2v2)'
      );
    } else {
      enterAimPhase([...ui.draftTeams[1]], [...ui.draftTeams[2]]);
      showPassShield(
        'Pass to Player 1 (Blue #1)',
        'All 4 players drafted secretly! Hand over the device so Player 1 (Blue #1) can Lock Aim.',
        () => {
          ui.localTurn = 0;
          ui.aimingPlayer = 1;
          ui.aimSlot = 0;
          syncAimSlotTabs();
          updateAimPrompt();
        },
        "I'm Ready",
        'LOCAL 4-PLAYER (2v2)'
      );
    }
  }
}

/* ==================== AIM & FIGHT FLOW ==================== */
function showPassShield(title, sub, onReady, btnText = "I'm Ready", kickerText = 'LOCAL 2-PLAYER') {
  $('pass-shield').querySelector('.banner-kicker').textContent = kickerText;
  $('shield-title').textContent = title;
  $('shield-sub').textContent = sub;
  const btn = $('btn-shield-ready');
  btn.textContent = btnText;
  btn.classList.remove('hidden');
  ui.pendingShieldCallback = onReady;
  $('pass-shield').classList.remove('hidden');
}

function showWaitingShield(kickerText, title, sub) {
  $('pass-shield').querySelector('.banner-kicker').textContent = kickerText;
  $('shield-title').textContent = title;
  $('shield-sub').textContent = sub;
  $('btn-shield-ready').classList.add('hidden');
  ui.pendingShieldCallback = null;
  $('pass-shield').classList.remove('hidden');
}

function syncAimSlotTabs() {
  const showTabs = sim.teamSize === 2 && !isSingleSeatAim();
  $('aim-slot-tabs').classList.toggle('hidden', !showTabs);
  if (!showTabs) return;
  const team = sim.selectedTeams?.[ui.aimingPlayer] || [sim.selectedBallIds[ui.aimingPlayer]];
  for (let idx = 0; idx < 2; idx++) {
    const btn = $(`btn-aim-slot-${idx}`);
    if (!btn) continue;
    const defName = team[idx] ? getBallDef(team[idx]).name.replace(' Ball', '') : `Ball ${idx + 1}`;
    btn.textContent = `#${idx + 1}: ${defName}`;
    btn.classList.toggle('is-active', ui.aimSlot === idx);
  }
}

function enterAimPhase(teamOrId1, teamOrId2) {
  sim.setupAimPhase(teamOrId1, teamOrId2);
  $('view-arena').classList.toggle('is-2v2', sim.teamSize === 2);
  ui.localTurn = 0;
  ui.aimingPlayer = online.active ? online.myOwner : 1;
  ui.aimSlot = online.active && sim.teamSize === 2 ? online.mySlot : 0;
  ui.aimLockedP1 = false;
  online.myAimLocked = false;
  online.oppAimLocked = false;
  online.seatAngles = {};
  online.aimLockedCount = 0;
  $('arena-banner').classList.add('hidden');
  $('pass-shield').classList.add('hidden');
  $('controls-aim').classList.remove('hidden');
  $('controls-fight').classList.add('hidden');
  $('btn-lock-aim').disabled = false;
  syncAimSlotTabs();
  updateAimPrompt();
  updateHud();
}

function updateAimPrompt() {
  const prompt = $('aim-prompt');
  const is2v2 = sim.teamSize === 2;
  const slotHint = is2v2 && !isSingleSeatAim() ? ` (Ball #${ui.aimSlot + 1} • click Ball 1/2 to switch)` : '';
  if (sim.mode === MODES.ONLINE) {
    if (is2v2) {
      if (online.myAimLocked) {
        prompt.textContent = `Aim locked! Waiting for players (${online.aimLockedCount || 1}/${online.totalPlayers})...`;
      } else {
        const meta = getSeatMeta(online.mySeat, 2);
        prompt.textContent = `${meta.label.toUpperCase()}: Drag inside the arena to aim your ball -> LOCK AIM`;
      }
      return;
    }
    if (online.myAimLocked) {
      const oppName = online.myOwner === 1 ? 'Player 2 (Red)' : 'Player 1 (Blue)';
      prompt.textContent = `Aim locked! Waiting for ${oppName}...`;
    } else {
      const team = online.myOwner === 1 ? 'YOU (BLUE)' : 'YOU (RED)';
      prompt.textContent = `${team}: Drag inside the arena to aim${slotHint} -> LOCK AIM`;
    }
  } else if (sim.mode === MODES.LOCAL_2P) {
    if (is2v2) {
      const meta = getSeatMeta(ui.localTurn, 2);
      prompt.textContent = `${meta.label.toUpperCase()}: Drag inside arena (or A / D) to aim your ball`;
    } else {
      const team = ui.aimingPlayer === 1 ? 'P1 (BLUE)' : 'P2 (RED)';
      prompt.textContent = `${team}: Drag inside arena (or A / D) to aim${slotHint}`;
    }
  } else if (sim.mode === MODES.SANDBOX) {
    prompt.textContent = `Sandbox: Aim Blue${slotHint} then press LOCK AIM`;
  } else {
    prompt.textContent = `Drag inside arena (or A / D) to aim${slotHint}!`;
  }
}

function adjustActiveAimAngle(delta) {
  if (sim.phase !== PHASES.AIM) return;
  const owner = ui.aimingPlayer;
  const slot = sim.teamSize === 2 ? ui.aimSlot : 0;
  if (!sim.teamAimAngles[owner]) sim.teamAimAngles[owner] = [sim.aimAngles[owner] || 0];
  const cur = sim.teamAimAngles[owner][slot] ?? sim.aimAngles[owner] ?? 0;
  const next = cur + delta;
  sim.teamAimAngles[owner][slot] = next;
  if (slot === 0) sim.aimAngles[owner] = next;
  const ball = sim.balls.find((b) => b.owner === owner && (b.slotIndex ?? 0) === slot) || sim.balls.find((b) => b.owner === owner);
  if (ball) ball.aimAngle = next;
}

function lockCurrentAim() {
  if (sim.phase !== PHASES.AIM) return;
  soundEngine.unlock();

  if (sim.mode === MODES.ONLINE) {
    if (online.myAimLocked) return;
    online.myAimLocked = true;
    $('btn-lock-aim').disabled = true;
    const mySlot = sim.teamSize === 2 ? online.mySlot : 0;
    const myAngle = sim.teamAimAngles[online.myOwner]?.[mySlot] ?? sim.aimAngles[online.myOwner] ?? 0;
    if (online.role === 'host') {
      online.seatAngles[0] = myAngle;
      online.aimLockedCount = Object.keys(online.seatAngles).length;
      updateAimPrompt();
      if (online.aimLockedCount >= online.totalPlayers) {
        hostLaunchOnlineFight();
      } else {
        p2p.send({ type: 'aim_progress', count: online.aimLockedCount, total: online.totalPlayers });
      }
    } else {
      updateAimPrompt();
      p2p.send({ type: 'aim_lock', seat: online.mySeat, angle: myAngle, angles: [myAngle] });
    }
    return;
  }

  if (sim.mode === MODES.LOCAL_2P) {
    if (sim.teamSize === 2) {
      if (ui.localTurn < 3) {
        const prevMeta = getSeatMeta(ui.localTurn, 2);
        ui.localTurn += 1;
        const nextMeta = getSeatMeta(ui.localTurn, 2);
        showPassShield(
          `Pass to ${nextMeta.label}`,
          `${prevMeta.label} aimed secretly. Ready for ${nextMeta.label} to Lock Aim?`,
          () => {
            ui.aimingPlayer = nextMeta.owner;
            ui.aimSlot = nextMeta.slot;
            syncAimSlotTabs();
            updateAimPrompt();
          },
          "I'm Ready",
          'LOCAL 4-PLAYER (2v2)'
        );
        return;
      }
    } else if (ui.aimingPlayer === 1) {
      ui.aimLockedP1 = true;
      showPassShield(
        'Pass to Player 2 (Red)',
        'Player 1 aimed secretly. Ready for Player 2 to Lock Aim?',
        () => {
          ui.aimingPlayer = 2;
          ui.aimSlot = 0;
          syncAimSlotTabs();
          updateAimPrompt();
        }
      );
      return;
    }
  }

  const angles1 = [...(sim.teamAimAngles[1] || [sim.aimAngles[1]])];
  let angles2 = [...(sim.teamAimAngles[2] || [sim.aimAngles[2]])];
  if (sim.mode !== MODES.LOCAL_2P) {
    const team1 = sim.balls.filter((b) => b.owner === 1);
    const team2 = sim.balls.filter((b) => b.owner === 2);
    if (team1.length && team2.length) {
      angles2 = team2.map((b2, idx) => chooseBotAimAngle(b2, team1[idx % team1.length] || team1[0], sim.rng));
    }
  }

  $('controls-aim').classList.add('hidden');
  $('controls-fight').classList.remove('hidden');
  ui.paused = false;
  updateFightButtons();
  sim.launchRound(sim.teamSize === 2 ? angles1 : angles1[0], sim.teamSize === 2 ? angles2 : angles2[0]);
  updateHud();
  soundEngine.handleSimEvents(sim.consumeEvents());
}

function updateFightButtons() {
  const isOnline = sim.mode === MODES.ONLINE;
  $('btn-speed').classList.toggle('hidden', isOnline);
  $('btn-pause').classList.toggle('hidden', isOnline);
  $('btn-restart-round').classList.toggle('hidden', isOnline);
  $('btn-speed').textContent = `Speed: ${ui.simSpeed}x`;
  $('btn-pause').textContent = ui.paused ? 'Resume' : 'Pause';
  const name1 = formatTeamNames(sim.selectedTeams?.[1] || [sim.selectedBallIds[1]]);
  const name2 = formatTeamNames(sim.selectedTeams?.[2] || [sim.selectedBallIds[2]]);
  $('fight-tip').textContent = `${name1} vs ${name2} — Abilities trigger automatically!`;
}

function showRoundOrMatchBanner() {
  $('controls-fight').classList.add('hidden');
  const banner = $('arena-banner');
  const kicker = $('banner-kicker');
  const title = $('banner-title');
  const sub = $('banner-sub');
  const nextBtn = $('btn-banner-next');
  const lobbyBtn = $('btn-banner-lobby');
  nextBtn.disabled = false;

  const name1 = formatTeamNames(sim.selectedTeams?.[1] || [sim.selectedBallIds[1]]);
  const name2 = formatTeamNames(sim.selectedTeams?.[2] || [sim.selectedBallIds[2]]);

  if (sim.phase === PHASES.ROUND_END) {
    kicker.textContent = `ROUND ${sim.roundNumber} COMPLETE`;
    if (sim.roundWinner === 0) {
      title.textContent = 'DOUBLE KO — DRAW!';
      sub.textContent = 'Both sides fell at the exact same moment. No hearts lost!';
    } else if (sim.roundWinner === 1) {
      title.textContent = `${name1} (Blue) Wins Round!`;
      sub.textContent = `Red loses 1 Heart (${sim.hearts[2]} remaining).`;
    } else {
      title.textContent = `${name2} (Red) Wins Round!`;
      sub.textContent = `Blue loses 1 Heart (${sim.hearts[1]} remaining).`;
    }
    nextBtn.textContent = 'Next Round';
    lobbyBtn.classList.add('hidden');
  } else {
    kicker.textContent = 'MATCH OVER';
    const winnerTeam =
      sim.mode === MODES.ONLINE
        ? sim.teamSize === 2
          ? sim.roundWinner === online.myOwner
            ? online.myOwner === 1
              ? 'YOUR TEAM (BLUE)'
              : 'YOUR TEAM (RED)'
            : sim.roundWinner === 1
            ? 'BLUE TEAM'
            : 'RED TEAM'
          : sim.roundWinner === online.myOwner
          ? online.myOwner === 1
            ? 'YOU (BLUE)'
            : 'YOU (RED)'
          : sim.roundWinner === 1
          ? 'BLUE (OPPONENT)'
          : 'RED (OPPONENT)'
        : sim.mode === MODES.LOCAL_2P && sim.teamSize === 2
        ? sim.roundWinner === 1
          ? 'BLUE TEAM (P1 & P2)'
          : 'RED TEAM (P3 & P4)'
        : sim.roundWinner === 1
        ? 'BLUE (PLAYER 1)'
        : sim.mode === MODES.BOT
        ? 'RED (AI BOT)'
        : 'RED (PLAYER 2)';
    title.textContent = `${winnerTeam} WINS!`;
    sub.textContent = `Final Hearts — Blue: ${sim.hearts[1]} ♥  |  Red: ${sim.hearts[2]} ♥`;
    nextBtn.textContent = sim.mode === MODES.SANDBOX ? 'Rematch' : 'Play Again';
    lobbyBtn.classList.remove('hidden');
  }

  banner.classList.remove('hidden');
}

function handleBannerNext() {
  soundEngine.unlock();

  if (sim.mode === MODES.ONLINE) {
    if (online.myNextReady) return;
    online.myNextReady = true;
    $('btn-banner-next').disabled = true;
    if (online.role === 'host') {
      online.readySeats.add(0);
      const count = online.readySeats.size;
      $('btn-banner-next').textContent =
        online.totalPlayers > 2
          ? `Waiting for players (${count}/${online.totalPlayers})...`
          : 'Waiting for opponent...';
      p2p.send({ type: 'ready_progress', count, total: online.totalPlayers });
      if (count >= online.totalPlayers) {
        hostAdvanceOnlineRound();
      }
    } else {
      $('btn-banner-next').textContent =
        online.totalPlayers > 2 ? 'Waiting for players...' : 'Waiting for opponent...';
      p2p.send({ type: 'next_ready', seat: online.mySeat });
    }
    return;
  }

  $('arena-banner').classList.add('hidden');

  if (sim.phase === PHASES.MATCH_END) {
    if (sim.mode === MODES.SANDBOX) {
      startSandboxDuel();
    } else {
      startArenaMode(sim.mode);
    }
    return;
  }

  sim.roundNumber += 1;
  if (sim.mode === MODES.SANDBOX) {
    const is2v2 = ui.teamSize === 2;
    enterAimPhase(
      is2v2 ? [...ui.sandboxTeams[1]] : ui.sandboxTeams[1][0],
      is2v2 ? [...ui.sandboxTeams[2]] : ui.sandboxTeams[2][0]
    );
  } else {
    beginRoundDraft();
  }
}

/* ==================== ONLINE P2P MULTIPLAYER ==================== */
function bindP2PHandlers() {
  p2p.setHandlers({
    onStatus(text) {
      $('online-status').textContent = text;
    },
    onRoster(data) {
      if (p2p.isHost) {
        renderOnlineRoster($('online-seat-roster'), data);
      } else {
        renderOnlineRoster($('online-guest-roster'), data);
      }
    },
    onError(msg) {
      if (!p2p.isSearchingQuickmatch()) setQuickmatchSearching(false);
      $('online-status').textContent = `Error: ${msg}`;
    },
    onDisconnected(msg) {
      if (!online.active) {
        setQuickmatchSearching(false);
        if (msg) $('online-status').textContent = msg;
        return;
      }
      setQuickmatchSearching(false);
      stopDraftTimer();
      $('modal-draft').classList.add('hidden');
      $('controls-aim').classList.add('hidden');
      $('controls-fight').classList.add('hidden');
      showPassShield('Connection Lost', msg, () => showView('lobby'), 'Back to Lobby', 'ONLINE P2P');
      resetOnlineState();
    },
    onConnected({ role, seat = 0, teamSize, totalPlayers }) {
      setQuickmatchSearching(false);
      const sz = teamSize === 2 || (!teamSize && role === 'host' && ui.teamSize === 2) ? 2 : 1;
      const seatIdx = Number.isInteger(seat) ? seat : role === 'host' ? 0 : 1;
      const meta = getSeatMeta(seatIdx, sz);
      online.active = true;
      online.role = role;
      online.mySeat = seatIdx;
      online.myOwner = meta.owner;
      online.mySlot = meta.slot;
      online.teamSize = sz;
      online.totalPlayers = totalPlayers || (sz === 2 ? 4 : 2);
      online.fxWatermark = { lastId: 0 };
      online.snapTick = 0;
      online.pendingEvents = [];

      if (role === 'host') {
        setTeamFormat(sz);
        sim.startMatch({ mode: MODES.ONLINE, teamSize: sz, hearts: 3, suddenDeathStart: SUDDEN_DEATH_START_SEC });
        ui.paused = false;
        ui.simSpeed = 1;
        online.myDraftPick = null;
        online.oppDraftPick = null;
        online.myDraftTeam = [];
        online.oppDraftTeam = [];
        online.seatPicks = {};
        online.oppAimAngles = [];
        online.seatAngles = {};
        online.aimLockedCount = 0;
        online.myNextReady = false;
        online.oppNextReady = false;
        online.readySeats = new Set();
        ui.draftTeams = { 1: [], 2: [] };
        $('view-arena').classList.toggle('is-2v2', sz === 2);
        p2p.send({
          type: 'start_round',
          teamSize: sz,
          totalPlayers: online.totalPlayers,
          roundNumber: sim.roundNumber,
          hearts: { ...sim.hearts },
          heartsToWin: sim.heartsToWin,
        });
        showView('arena');
        openDraftForPlayer(1, 0);
      }
    },
    onMessage(msg, { seat } = {}) {
      if (!msg || !msg.type) return;

      if (online.role === 'host') {
        const senderSeat = Number.isInteger(seat) ? seat : Number.isInteger(msg.seat) ? msg.seat : 1;
        if (msg.type === 'draft_pick') {
          const pickId = msg.ballId || (Array.isArray(msg.team) ? msg.team[0] : null);
          if (!pickId) return;
          online.seatPicks[senderSeat] = pickId;
          if (sim.teamSize === 1) {
            online.oppDraftPick = pickId;
            online.oppDraftTeam = [pickId];
          }
          const count = Object.keys(online.seatPicks).length;
          if (count >= online.totalPlayers) {
            hostEnterOnlineAim();
          } else {
            p2p.send({ type: 'draft_progress', count, total: online.totalPlayers });
            if (online.seatPicks[0] && !$('pass-shield').classList.contains('hidden')) {
              $('shield-sub').textContent =
                sim.teamSize === 2
                  ? `Waiting for other players to draft (${count}/${online.totalPlayers} ready)...`
                  : 'Waiting for Player 2 (Red) to pick their ball...';
            }
          }
        } else if (msg.type === 'aim_lock') {
          const meta = getSeatMeta(senderSeat, sim.teamSize);
          const angle = typeof msg.angle === 'number' ? msg.angle : Array.isArray(msg.angles) ? msg.angles[0] : 0;
          online.seatAngles[senderSeat] = angle;
          if (!sim.teamAimAngles[meta.owner]) sim.teamAimAngles[meta.owner] = [];
          sim.teamAimAngles[meta.owner][meta.slot] = angle;
          if (meta.slot === 0) sim.aimAngles[meta.owner] = angle;
          const ball =
            sim.balls.find((b) => b.owner === meta.owner && (b.slotIndex ?? 0) === meta.slot) ||
            sim.balls.find((b) => b.owner === meta.owner);
          if (ball) ball.aimAngle = angle;
          online.aimLockedCount = Object.keys(online.seatAngles).length;
          if (online.aimLockedCount >= online.totalPlayers) {
            hostLaunchOnlineFight();
          } else {
            p2p.send({ type: 'aim_progress', count: online.aimLockedCount, total: online.totalPlayers });
            if (online.myAimLocked) updateAimPrompt();
          }
        } else if (msg.type === 'next_ready') {
          online.readySeats.add(senderSeat);
          const count = online.readySeats.size;
          if (count >= online.totalPlayers) {
            hostAdvanceOnlineRound();
          } else {
            p2p.send({ type: 'ready_progress', count, total: online.totalPlayers });
            if (online.myNextReady && online.totalPlayers > 2) {
              $('btn-banner-next').textContent = `Waiting for players (${count}/${online.totalPlayers})...`;
            }
          }
        }
        return;
      }

      // Guest message handling
      if (msg.type === 'start_round') {
        const sz = msg.teamSize === 2 ? 2 : 1;
        online.teamSize = sz;
        online.totalPlayers = msg.totalPlayers || (sz === 2 ? 4 : 2);
        const meta = getSeatMeta(online.mySeat, sz);
        online.myOwner = meta.owner;
        online.mySlot = meta.slot;
        sim.mode = MODES.ONLINE;
        sim.setTeamSize(sz);
        sim.roundNumber = msg.roundNumber;
        sim.hearts = { ...msg.hearts };
        sim.heartsToWin = msg.heartsToWin || 3;
        sim.resetRoundEntities();
        sim.phase = PHASES.DRAFT;
        online.myDraftPick = null;
        online.myDraftTeam = [];
        online.myAimLocked = false;
        online.aimLockedCount = 0;
        online.myNextReady = false;
        ui.draftTeams = { 1: [], 2: [] };
        ui.paused = false;
        ui.simSpeed = 1;
        $('view-arena').classList.toggle('is-2v2', sz === 2);
        $('arena-banner').classList.add('hidden');
        $('pass-shield').classList.add('hidden');
        showView('arena');
        updateHud();
        openDraftForPlayer(online.myOwner, sz === 2 ? online.mySlot : 0);
      } else if (msg.type === 'draft_progress') {
        if (online.myDraftPick && !$('pass-shield').classList.contains('hidden')) {
          $('shield-sub').textContent = `Waiting for other players to draft (${msg.count}/${msg.total} ready)...`;
        }
      } else if (msg.type === 'aim_progress') {
        online.aimLockedCount = msg.count || 0;
        if (online.myAimLocked) updateAimPrompt();
      } else if (msg.type === 'ready_progress') {
        if (online.myNextReady && (msg.total || 2) > 2) {
          $('btn-banner-next').textContent = `Waiting for players (${msg.count}/${msg.total})...`;
        }
      } else if (msg.type === 'snap') {
        const prevPhase = sim.phase;
        applySnapshot(sim, msg);
        $('view-arena').classList.toggle('is-2v2', sim.teamSize === 2);
        if (msg.events && msg.events.length) {
          soundEngine.handleSimEvents(msg.events);
        }
        if (prevPhase !== sim.phase && sim.phase === PHASES.AIM) {
          ui.aimingPlayer = online.myOwner;
          ui.aimSlot = sim.teamSize === 2 ? online.mySlot : 0;
          online.myAimLocked = false;
          online.aimLockedCount = 0;
          $('arena-banner').classList.add('hidden');
          $('pass-shield').classList.add('hidden');
          $('controls-aim').classList.remove('hidden');
          $('controls-fight').classList.add('hidden');
          $('btn-lock-aim').disabled = false;
          syncAimSlotTabs();
          updateAimPrompt();
        } else if (prevPhase !== sim.phase && sim.phase === PHASES.FIGHT) {
          $('controls-aim').classList.add('hidden');
          $('controls-fight').classList.remove('hidden');
          updateFightButtons();
        } else if (
          prevPhase === PHASES.FIGHT &&
          (sim.phase === PHASES.ROUND_END || sim.phase === PHASES.MATCH_END)
        ) {
          showRoundOrMatchBanner();
        }
        updateHud();
      }
    },
  });
}

function hostEnterOnlineAim() {
  online.fxWatermark = { lastId: 0 };
  online.snapTick = 0;
  online.pendingEvents = [];
  const team1 = sim.teamSize === 2 ? [online.seatPicks[0], online.seatPicks[1]] : online.seatPicks[0] || online.myDraftPick;
  const team2 = sim.teamSize === 2 ? [online.seatPicks[2], online.seatPicks[3]] : online.seatPicks[1] || online.oppDraftPick;
  enterAimPhase(team1, team2);
  p2p.send(encodeSnapshot(sim, [], online.fxWatermark));
}

function hostLaunchOnlineFight() {
  $('controls-aim').classList.add('hidden');
  $('controls-fight').classList.remove('hidden');
  ui.paused = false;
  updateFightButtons();
  sim.launchRound(
    sim.teamSize === 2 ? sim.teamAimAngles[1] : sim.aimAngles[1],
    sim.teamSize === 2 ? sim.teamAimAngles[2] : sim.aimAngles[2]
  );
  const events = sim.consumeEvents();
  soundEngine.handleSimEvents(events);
  p2p.send(encodeSnapshot(sim, events, online.fxWatermark));
}

function hostAdvanceOnlineRound() {
  $('arena-banner').classList.add('hidden');
  if (sim.phase === PHASES.MATCH_END) {
    sim.startMatch({ mode: MODES.ONLINE, teamSize: sim.teamSize, hearts: 3, suddenDeathStart: SUDDEN_DEATH_START_SEC });
  } else {
    sim.roundNumber += 1;
    sim.resetRoundEntities();
    sim.phase = PHASES.DRAFT;
  }
  online.myDraftPick = null;
  online.oppDraftPick = null;
  online.myDraftTeam = [];
  online.oppDraftTeam = [];
  online.seatPicks = {};
  online.oppAimAngles = [];
  online.seatAngles = {};
  online.aimLockedCount = 0;
  online.myNextReady = false;
  online.oppNextReady = false;
  online.readySeats = new Set();
  ui.draftTeams = { 1: [], 2: [] };
  p2p.send({
    type: 'start_round',
    teamSize: sim.teamSize,
    totalPlayers: online.totalPlayers,
    roundNumber: sim.roundNumber,
    hearts: { ...sim.hearts },
    heartsToWin: sim.heartsToWin,
  });
  openDraftForPlayer(1, 0);
}

/* ==================== HUD & CANVAS LOOP ==================== */
function renderHearts(el, current, max) {
  el.innerHTML = '';
  for (let i = 0; i < max; i++) {
    const span = document.createElement('span');
    span.className = `heart-icon ${i < current ? 'alive' : 'lost'}`;
    span.textContent = i < current ? '♥' : '♡';
    el.appendChild(span);
  }
}

function renderTeamRows(container, owner, teamIds, colorClass) {
  const is2v2 = sim.teamSize === 2 && teamIds.length >= 2;
  container.classList.toggle('hidden', !is2v2);
  if (!is2v2) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = '';
  teamIds.forEach((ballId, idx) => {
    const def = getBallDef(ballId);
    const liveBalls = sim.balls.filter((b) => b.owner === owner && (b.slotIndex ?? 0) === idx && b.hp > 0);
    const hp = liveBalls.reduce((sum, b) => sum + b.hp, 0);
    const maxHp = Math.max(1, liveBalls.reduce((sum, b) => sum + b.maxHp, 0) || def.hp);
    const pct = liveBalls.length ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;

    const row = document.createElement('div');
    row.className = `hud-member-row${liveBalls.length ? '' : ' is-ko'}`;
    const countTag = liveBalls.length > 1 ? ` ×${liveBalls.length}` : '';
    const hpLabel = liveBalls.length ? `${Math.ceil(hp)}` : 'K.O.';
    row.innerHTML = `
      <div class="hud-member-top">
        <span>#${idx + 1} ${def.name.replace(' Ball', '')}${countTag}</span>
        <span>${hpLabel}</span>
      </div>
      <div class="hud-member-bar">
        <div class="hud-member-fill ${colorClass}" style="width:${pct}%"></div>
      </div>
    `;
    container.appendChild(row);
  });
}

function updateHud() {
  if (sim.mode === MODES.ONLINE) {
    if (sim.teamSize === 2) {
      $('hud-p1-label').textContent = online.myOwner === 1 ? `BLUE (YOU: #${online.mySlot + 1})` : 'BLUE TEAM';
      $('hud-p2-label').textContent = online.myOwner === 2 ? `RED (YOU: #${online.mySlot + 1})` : 'RED TEAM';
    } else {
      $('hud-p1-label').textContent = online.myOwner === 1 ? 'YOU (BLUE)' : 'P1 (BLUE)';
      $('hud-p2-label').textContent = online.myOwner === 2 ? 'YOU (RED)' : 'P2 (RED)';
    }
  } else if (sim.mode === MODES.LOCAL_2P && sim.teamSize === 2) {
    $('hud-p1-label').textContent = 'BLUE (P1 & P2)';
    $('hud-p2-label').textContent = 'RED (P3 & P4)';
  } else {
    const p2Name = sim.mode === MODES.BOT ? 'BOT' : 'P2 RED';
    $('hud-p1-label').textContent = sim.mode === MODES.LOCAL_2P ? 'P1 BLUE' : 'YOU (BLUE)';
    $('hud-p2-label').textContent = p2Name;
  }

  renderHearts($('hud-p1-hearts'), sim.hearts[1], sim.heartsToWin);
  renderHearts($('hud-p2-hearts'), sim.hearts[2], sim.heartsToWin);

  const team1 = sim.selectedTeams?.[1]?.length ? sim.selectedTeams[1] : [sim.selectedBallIds[1]];
  const team2 = sim.selectedTeams?.[2]?.length ? sim.selectedTeams[2] : [sim.selectedBallIds[2]];
  const d1 = getBallDef(team1[0]);
  const d2 = getBallDef(team2[0]);
  const is2v2 = sim.teamSize === 2;

  $('hud-p1-ball').textContent = is2v2 ? formatTeamNames(team1) : d1.name;
  $('hud-p1-rarity').textContent = is2v2 ? '2v2 Duo' : d1.rarity;
  $('hud-p1-rarity').className = is2v2 ? 'rarity-pill r-Epic' : `rarity-pill r-${d1.rarity}`;
  $('hud-p2-ball').textContent = is2v2 ? formatTeamNames(team2) : d2.name;
  $('hud-p2-rarity').textContent = is2v2 ? '2v2 Duo' : d2.rarity;
  $('hud-p2-rarity').className = is2v2 ? 'rarity-pill r-Epic' : `rarity-pill r-${d2.rarity}`;

  const p1Balls = sim.balls.filter((b) => b.owner === 1 && b.hp > 0);
  const p2Balls = sim.balls.filter((b) => b.owner === 2 && b.hp > 0);
  const fallbackMax1 = team1.reduce((sum, id) => sum + getBallDef(id).hp, 0);
  const fallbackMax2 = team2.reduce((sum, id) => sum + getBallDef(id).hp, 0);
  const hp1 = p1Balls.reduce((sum, b) => sum + b.hp, 0);
  const max1 = Math.max(1, p1Balls.reduce((sum, b) => sum + b.maxHp, 0) || fallbackMax1);
  const hp2 = p2Balls.reduce((sum, b) => sum + b.hp, 0);
  const max2 = Math.max(1, p2Balls.reduce((sum, b) => sum + b.maxHp, 0) || fallbackMax2);

  $('hud-p1-hpbar').style.width = `${Math.max(0, Math.min(100, (hp1 / max1) * 100))}%`;
  $('hud-p1-hptext').textContent = `${Math.ceil(hp1)} / ${Math.ceil(max1)}`;
  $('hud-p2-hpbar').style.width = `${Math.max(0, Math.min(100, (hp2 / max2) * 100))}%`;
  $('hud-p2-hptext').textContent = `${Math.ceil(hp2)} / ${Math.ceil(max2)}`;

  renderTeamRows($('hud-p1-rows'), 1, team1, 'blue');
  renderTeamRows($('hud-p2-rows'), 2, team2, 'red');

  $('hud-round').textContent = is2v2 ? `2v2 • ROUND ${sim.roundNumber}` : `ROUND ${sim.roundNumber}`;

  const timerEl = $('hud-timer');
  if (sim.suddenDeathActive) {
    timerEl.textContent = 'SUDDEN DEATH!';
    timerEl.classList.add('is-sd');
  } else if (sim.suddenDeathStart > 0 && sim.phase === PHASES.FIGHT) {
    const left = Math.max(0, Math.ceil(sim.suddenDeathStart - sim.roundTime));
    timerEl.textContent = `SD in ${left}s`;
    timerEl.classList.remove('is-sd');
  } else {
    const sec = Math.floor(sim.roundTime);
    timerEl.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    timerEl.classList.remove('is-sd');
  }
}

function loop(nowMs) {
  requestAnimationFrame(loop);
  if (!lastFrameMs) lastFrameMs = nowMs;
  const rawDt = Math.min(MAX_ACCUM_DT, (nowMs - lastFrameMs) / 1000);
  lastFrameMs = nowMs;

  if (ui.view !== 'arena') return;

  if (online.active && online.role === 'guest') {
    stepMirrorVisuals(sim, rawDt);
    updateHud();
    const canvas = $('arena-canvas');
    const ctx = canvas.getContext('2d');
    renderArena(ctx, sim, {
      aimingPlayer: online.myAimLocked ? 0 : online.myOwner,
      aimSlot: sim.teamSize === 2 ? online.mySlot : ui.aimSlot,
      aimOnlySingleSlot: isSingleSeatAim(),
    });
    return;
  }

  if (!ui.paused && (sim.phase === PHASES.FIGHT || sim.phase === PHASES.ROUND_END || sim.phase === PHASES.MATCH_END)) {
    const prevPhase = sim.phase;
    accumSec += rawDt * (sim.phase === PHASES.FIGHT ? ui.simSpeed : 1);
    while (accumSec >= FIXED_DT) {
      sim.step(FIXED_DT);
      accumSec -= FIXED_DT;
      if (online.active && online.role === 'host') {
        online.snapTick += 1;
      }
    }
    const events = sim.consumeEvents();
    soundEngine.handleSimEvents(events);

    if (online.active && online.role === 'host') {
      online.pendingEvents.push(...events);
      const ended = prevPhase === PHASES.FIGHT && (sim.phase === PHASES.ROUND_END || sim.phase === PHASES.MATCH_END);
      if (ended || (sim.phase === PHASES.FIGHT && online.snapTick >= 2)) {
        online.snapTick = 0;
        p2p.send(encodeSnapshot(sim, online.pendingEvents, online.fxWatermark));
        online.pendingEvents = [];
      }
    }

    if (prevPhase === PHASES.FIGHT && (sim.phase === PHASES.ROUND_END || sim.phase === PHASES.MATCH_END)) {
      showRoundOrMatchBanner();
    }
    updateHud();
  }

  const canvas = $('arena-canvas');
  const ctx = canvas.getContext('2d');
  renderArena(ctx, sim, {
    aimingPlayer: online.active && online.myAimLocked ? 0 : ui.aimingPlayer,
    aimSlot: ui.aimSlot,
    aimOnlySingleSlot: isSingleSeatAim(),
  });
}

/* ==================== BALL DEX ==================== */
function renderDexGrid() {
  const grid = $('dex-grid');
  grid.innerHTML = '';
  const q = ui.dexQuery.trim().toLowerCase();
  const filtered = BALL_DEFS.filter((b) => {
    if (ui.dexRarity !== 'ALL' && b.rarity !== ui.dexRarity) return false;
    if (!q) return true;
    return (
      b.name.toLowerCase().includes(q) ||
      b.quote.toLowerCase().includes(q) ||
      b.details.toLowerCase().includes(q) ||
      b.archetype.toLowerCase().includes(q)
    );
  });

  for (const def of filtered) {
    const card = document.createElement('article');
    card.className = 'dex-card';

    const top = document.createElement('div');
    top.className = 'dex-card-top';
    const c = document.createElement('canvas');
    c.width = 56;
    c.height = 56;
    renderBallPreview(c, def);

    const meta = document.createElement('div');
    meta.innerHTML = `
      <h3>${def.name}</h3>
      <span class="rarity-pill r-${def.rarity}">${def.rarity}</span>
      <span class="muted" style="font-size:0.75rem; margin-left:6px;">${def.hp} HP</span>
    `;
    top.append(c, meta);

    const desc = document.createElement('p');
    desc.textContent = def.details;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-ghost btn-sm';
    btn.textContent = 'Test in Sandbox';
    btn.addEventListener('click', () => {
      ui.sandboxTeams[1][ui.teamSize === 2 ? ui.sandboxSlot[1] : 0] = def.id;
      ui.sandboxP1 = ui.sandboxTeams[1][0];
      $('modal-dex').classList.add('hidden');
      renderSandboxGrids();
      updateSandboxPreviews();
      showView('sandbox');
    });

    card.append(top, desc, btn);
    grid.appendChild(card);
  }
}

/* ==================== POINTER & KEYBOARD INPUT ==================== */
function aimFromPointerEvent(e, allowSwitch = false) {
  if (sim.phase !== PHASES.AIM || !$('pass-shield').classList.contains('hidden')) return;
  if (online.active && online.myAimLocked) return;
  const canvas = $('arena-canvas');
  const rect = canvas.getBoundingClientRect();
  const arenaSz = sim.arenaSize || ARENA_SIZE;
  const scaleX = arenaSz / rect.width;
  const scaleY = arenaSz / rect.height;
  const px = (e.clientX - rect.left) * scaleX;
  const py = (e.clientY - rect.top) * scaleY;

  const owner = ui.aimingPlayer;
  if (allowSwitch && sim.teamSize === 2 && !isSingleSeatAim()) {
    const clickedBall = sim.balls.find(
      (b) => b.owner === owner && Math.hypot(px - b.x, py - b.y) <= b.radius * 1.65
    );
    if (clickedBall && (clickedBall.slotIndex ?? 0) !== ui.aimSlot) {
      ui.aimSlot = clickedBall.slotIndex ?? 0;
      syncAimSlotTabs();
      updateAimPrompt();
    }
  }

  const slot = sim.teamSize === 2 ? ui.aimSlot : 0;
  const ball =
    sim.balls.find((b) => b.owner === owner && (b.slotIndex ?? 0) === slot) ||
    sim.balls.find((b) => b.owner === owner);
  if (!ball) return;
  const angle = Math.atan2(py - ball.y, px - ball.x);
  ball.aimAngle = angle;
  if (!sim.teamAimAngles[owner]) sim.teamAimAngles[owner] = [angle];
  sim.teamAimAngles[owner][slot] = angle;
  if (slot === 0) sim.aimAngles[owner] = angle;
}

function bindEvents() {
  $('btn-home').addEventListener('click', () => showView('lobby'));
  $('btn-back-lobby').addEventListener('click', () => showView('lobby'));

  document.querySelectorAll('[data-format-toggle] .fmt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      soundEngine.unlock();
      setTeamFormat(Number(btn.dataset.teamSize));
    });
  });

  $('btn-quick-bot').addEventListener('click', () => {
    soundEngine.unlock();
    startArenaMode(MODES.BOT, 1);
  });
  $('btn-quick-bot-2v2').addEventListener('click', () => {
    soundEngine.unlock();
    startArenaMode(MODES.BOT, 2);
  });
  $('btn-quick-sandbox-2v2').addEventListener('click', () => {
    soundEngine.unlock();
    setTeamFormat(2);
    showView('sandbox');
  });
  $('btn-quick-online').addEventListener('click', () => {
    soundEngine.unlock();
    showView('online');
  });
  $('btn-mode-quickmatch').addEventListener('click', () => {
    soundEngine.unlock();
    startQuickmatch();
  });
  $('btn-mode-online').addEventListener('click', () => {
    soundEngine.unlock();
    setTeamFormat(1);
    showView('online');
  });
  $('btn-mode-online-2v2').addEventListener('click', () => {
    soundEngine.unlock();
    setTeamFormat(2);
    showView('online');
  });
  $('btn-mode-bot').addEventListener('click', () => {
    soundEngine.unlock();
    startArenaMode(MODES.BOT, 1);
  });
  $('btn-mode-bot-2v2').addEventListener('click', () => {
    soundEngine.unlock();
    startArenaMode(MODES.BOT, 2);
  });
  $('btn-mode-2p').addEventListener('click', () => {
    soundEngine.unlock();
    startArenaMode(MODES.LOCAL_2P, 1);
  });
  $('btn-mode-2p-2v2').addEventListener('click', () => {
    soundEngine.unlock();
    startArenaMode(MODES.LOCAL_2P, 2);
  });
  $('btn-mode-sandbox').addEventListener('click', () => {
    soundEngine.unlock();
    setTeamFormat(1);
    showView('sandbox');
  });
  $('btn-mode-sandbox-2v2').addEventListener('click', () => {
    soundEngine.unlock();
    setTeamFormat(2);
    showView('sandbox');
  });
  $('btn-verity-spider').addEventListener('click', () => {
    soundEngine.unlock();
    setTeamFormat(1);
    startSandboxDuel('verity', 'spider');
  });

  // Online lobby buttons
  $('btn-online-quickmatch').addEventListener('click', () => {
    soundEngine.unlock();
    startQuickmatch();
  });
  $('btn-online-host').addEventListener('click', () => {
    soundEngine.unlock();
    setQuickmatchSearching(false);
    const maxGuests = ui.teamSize === 2 ? 3 : 1;
    const code = p2p.hostRoom(null, { maxGuests, teamSize: ui.teamSize });
    $('online-room-code').textContent = code;
    $('online-room-box').classList.remove('hidden');
    renderOnlineRoster($('online-seat-roster'), {
      connectedSeats: [0],
      total: maxGuests + 1,
      teamSize: ui.teamSize,
      mySeat: 0,
    });
  });
  $('btn-copy-code').addEventListener('click', async () => {
    const code = $('online-room-code').textContent;
    if (navigator.clipboard && code) {
      await navigator.clipboard.writeText(code).catch(() => {});
      $('btn-copy-code').textContent = 'Copied!';
      setTimeout(() => { $('btn-copy-code').textContent = 'Copy Code'; }, 1400);
    }
  });
  $('btn-copy-link').addEventListener('click', async () => {
    const code = $('online-room-code').textContent;
    const link = `${window.location.origin}${window.location.pathname}?room=${code}`;
    if (navigator.clipboard && code) {
      await navigator.clipboard.writeText(link).catch(() => {});
      $('btn-copy-link').textContent = 'Link Copied!';
      setTimeout(() => { $('btn-copy-link').textContent = 'Copy Invite Link'; }, 1400);
    }
  });
  $('btn-online-join').addEventListener('click', () => {
    soundEngine.unlock();
    setQuickmatchSearching(false);
    renderOnlineRoster($('online-guest-roster'), null);
    p2p.joinRoom($('online-join-code').value);
  });
  $('online-join-code').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      soundEngine.unlock();
      setQuickmatchSearching(false);
      renderOnlineRoster($('online-guest-roster'), null);
      p2p.joinRoom($('online-join-code').value);
    }
  });

  // Topbar toggles
  $('btn-toggle-mute').addEventListener('click', () => {
    soundEngine.unlock();
    soundEngine.setMuted(!soundEngine.muted);
    $('btn-toggle-mute').textContent = soundEngine.muted ? 'SFX: OFF' : 'SFX: ON';
  });
  $('btn-toggle-timer').addEventListener('click', () => {
    ui.draftTimerEnabled = !ui.draftTimerEnabled;
    $('btn-toggle-timer').textContent = ui.draftTimerEnabled ? 'Timer: ON' : 'Timer: OFF';
  });

  // Sandbox
  $('sb-p1-search').addEventListener('input', (e) => {
    ui.sandboxSearch[1] = e.target.value;
    filterSandboxGrid($('sb-p1-grid'), ui.sandboxSearch[1]);
  });
  $('sb-p2-search').addEventListener('input', (e) => {
    ui.sandboxSearch[2] = e.target.value;
    filterSandboxGrid($('sb-p2-grid'), ui.sandboxSearch[2]);
  });
  document.querySelectorAll('#sb-p1-slots .slot-tab, #sb-p2-slots .slot-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const side = Number(btn.dataset.side);
      const slot = Number(btn.dataset.slot);
      ui.sandboxSlot[side] = slot;
      renderSandboxGrids();
    });
  });
  document.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [p1, p2] = btn.dataset.preset.split(',');
      ui.sandboxTeams[1][ui.teamSize === 2 ? ui.sandboxSlot[1] : 0] = p1;
      ui.sandboxTeams[2][ui.teamSize === 2 ? ui.sandboxSlot[2] : 0] = p2;
      ui.sandboxP1 = ui.sandboxTeams[1][0];
      ui.sandboxP2 = ui.sandboxTeams[2][0];
      renderSandboxGrids();
      updateSandboxPreviews();
    });
  });
  $('btn-sandbox-random').addEventListener('click', () => {
    const count = ui.teamSize === 2 ? 4 : 2;
    const picks = drawRandomBallChoices(count);
    ui.sandboxTeams[1][0] = picks[0].id;
    ui.sandboxTeams[2][0] = picks[1].id;
    if (ui.teamSize === 2 && picks.length >= 4) {
      ui.sandboxTeams[1][1] = picks[2].id;
      ui.sandboxTeams[2][1] = picks[3].id;
    }
    ui.sandboxP1 = ui.sandboxTeams[1][0];
    ui.sandboxP2 = ui.sandboxTeams[2][0];
    renderSandboxGrids();
    updateSandboxPreviews();
  });
  $('btn-sandbox-fight').addEventListener('click', () => {
    soundEngine.unlock();
    startSandboxDuel();
  });
  $('btn-sandbox-sim10').addEventListener('click', () => {
    soundEngine.unlock();
    runSandboxBatchSim(10);
  });

  // Draft controls
  $('btn-reroll').addEventListener('click', () => {
    if (ui.draftRerollsLeft <= 0) return;
    soundEngine.unlock();
    ui.draftRerollsLeft -= 1;
    const prevIds = ui.draftChoices.map((c) => c.id);
    ui.draftChoices = drawRandomBallChoices(3, Math.random, prevIds);
    renderDraftCards();
    updateRerollButton();
  });

  $('btn-all-balls').addEventListener('click', () => {
    $('draft-cards').classList.add('hidden');
    $('draft-all-panel').classList.remove('hidden');
    renderMiniBallGrid($('draft-all-grid'), null, (id) => selectDraftBall(id));
  });
  $('btn-close-all-balls').addEventListener('click', () => {
    $('draft-all-panel').classList.add('hidden');
    $('draft-cards').classList.remove('hidden');
  });

  // Pass shield
  $('btn-shield-ready').addEventListener('click', () => {
    soundEngine.unlock();
    $('pass-shield').classList.add('hidden');
    if (ui.pendingShieldCallback) {
      const cb = ui.pendingShieldCallback;
      ui.pendingShieldCallback = null;
      cb();
    }
  });

  // Aiming & Battle controls
  const canvas = $('arena-canvas');
  canvas.addEventListener('pointerdown', (e) => {
    soundEngine.unlock();
    ui.isDraggingAim = true;
    aimFromPointerEvent(e, true);
  });
  window.addEventListener('pointermove', (e) => {
    if (ui.isDraggingAim) aimFromPointerEvent(e, false);
  });
  window.addEventListener('pointerup', () => {
    ui.isDraggingAim = false;
  });

  $('btn-aim-slot-0').addEventListener('click', () => {
    ui.aimSlot = 0;
    syncAimSlotTabs();
    updateAimPrompt();
  });
  $('btn-aim-slot-1').addEventListener('click', () => {
    ui.aimSlot = 1;
    syncAimSlotTabs();
    updateAimPrompt();
  });

  $('btn-aim-ccw').addEventListener('click', () => adjustActiveAimAngle((-10 * Math.PI) / 180));
  $('btn-aim-cw').addEventListener('click', () => adjustActiveAimAngle((10 * Math.PI) / 180));
  $('btn-lock-aim').addEventListener('click', lockCurrentAim);

  $('btn-speed').addEventListener('click', () => {
    ui.simSpeed = ui.simSpeed === 1 ? 2 : 1;
    updateFightButtons();
  });
  $('btn-pause').addEventListener('click', () => {
    ui.paused = !ui.paused;
    updateFightButtons();
  });
  $('btn-restart-round').addEventListener('click', () => {
    const is2v2 = sim.teamSize === 2;
    enterAimPhase(
      is2v2 ? [...(sim.selectedTeams?.[1] || [sim.selectedBallIds[1]])] : sim.selectedBallIds[1],
      is2v2 ? [...(sim.selectedTeams?.[2] || [sim.selectedBallIds[2]])] : sim.selectedBallIds[2]
    );
  });

  $('btn-banner-next').addEventListener('click', handleBannerNext);
  $('btn-banner-lobby').addEventListener('click', () => showView('lobby'));

  // Dex
  $('btn-open-dex').addEventListener('click', () => {
    $('modal-dex').classList.remove('hidden');
  });
  $('btn-close-dex').addEventListener('click', () => {
    $('modal-dex').classList.add('hidden');
  });
  $('dex-rarity-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#dex-rarity-chips .chip').forEach((c) => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    ui.dexRarity = chip.dataset.rarity;
    renderDexGrid();
  });
  $('dex-search').addEventListener('input', (e) => {
    ui.dexQuery = e.target.value;
    renderDexGrid();
  });

  // Keyboard shortcuts during Aim
  window.addEventListener('keydown', (e) => {
    if (ui.view !== 'arena' || sim.phase !== PHASES.AIM) return;
    if (!$('pass-shield').classList.contains('hidden')) return;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
      adjustActiveAimAngle(-0.14);
    } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
      adjustActiveAimAngle(0.14);
    } else if (sim.teamSize === 2 && !isSingleSeatAim() && (e.key === '1' || e.key === '2' || e.key === 'Tab')) {
      e.preventDefault();
      ui.aimSlot = e.key === '1' ? 0 : e.key === '2' ? 1 : (ui.aimSlot === 0 ? 1 : 0);
      syncAimSlotTabs();
      updateAimPrompt();
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      lockCurrentAim();
    }
  });
}

init();
