import {
  ARENA_SIZE,
  DRAFT_TIMER_SEC,
  FIXED_DT,
  FREE_REROLLS_PER_ROUND,
  MAX_ACCUM_DT,
  MODES,
  PHASES,
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
  myOwner: 1,
  myDraftPick: null,
  oppDraftPick: null,
  myAimLocked: false,
  oppAimLocked: false,
  myNextReady: false,
  oppNextReady: false,
  fxWatermark: { lastId: 0 },
  snapTick: 0,
  pendingEvents: [],
};

const ui = {
  view: 'lobby',
  draftTimerEnabled: true,
  draftPlayer: 1,
  draftChoices: [],
  draftPicks: { 1: null, 2: null },
  draftRerollsLeft: FREE_REROLLS_PER_ROUND,
  draftCountdown: DRAFT_TIMER_SEC,
  draftIntervalId: null,
  aimingPlayer: 1,
  aimLockedP1: false,
  isDraggingAim: false,
  paused: false,
  simSpeed: 1,
  sandboxP1: 'verity',
  sandboxP2: 'spider',
  dexRarity: 'ALL',
  dexQuery: '',
  pendingShieldCallback: null,
};

let lastFrameMs = 0;
let accumSec = 0;

function resetOnlineState() {
  online.active = false;
  online.role = null;
  online.myOwner = 1;
  online.myDraftPick = null;
  online.oppDraftPick = null;
  online.myAimLocked = false;
  online.oppAimLocked = false;
  online.myNextReady = false;
  online.oppNextReady = false;
  online.fxWatermark = { lastId: 0 };
  online.snapTick = 0;
  online.pendingEvents = [];
}

function init() {
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
    $('online-room-box').classList.add('hidden');
    $('online-status').textContent = 'Ready to host or join an Online 1v1 duel.';
    $('modal-draft').classList.add('hidden');
    $('arena-banner').classList.add('hidden');
    $('pass-shield').classList.add('hidden');
    $('btn-shield-ready').classList.remove('hidden');
    $('btn-lock-aim').disabled = false;
    $('btn-banner-next').disabled = false;
    sim.phase = PHASES.LOBBY;
  }
}

/* ==================== SANDBOX ==================== */
function renderMiniBallGrid(container, selectedId, onPick) {
  container.innerHTML = '';
  for (const def of BALL_DEFS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `mini-ball-btn${def.id === selectedId ? ' is-selected' : ''}`;
    btn.dataset.ballId = def.id;

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

function renderSandboxGrids() {
  renderMiniBallGrid($('sb-p1-grid'), ui.sandboxP1, (id) => {
    ui.sandboxP1 = id;
    renderSandboxGrids();
    updateSandboxPreviews();
  });
  renderMiniBallGrid($('sb-p2-grid'), ui.sandboxP2, (id) => {
    ui.sandboxP2 = id;
    renderSandboxGrids();
    updateSandboxPreviews();
  });
}

function updateSandboxPreviews() {
  const d1 = getBallDef(ui.sandboxP1);
  const d2 = getBallDef(ui.sandboxP2);
  $('sb-p1-selected').textContent = d1.name;
  $('sb-p2-selected').textContent = d2.name;
  $('sb-name-1').textContent = d1.name;
  $('sb-name-2').textContent = d2.name;
  $('sb-desc-1').textContent = `${d1.rarity} • ${d1.hp} HP — ${d1.quote}`;
  $('sb-desc-2').textContent = `${d2.rarity} • ${d2.hp} HP — ${d2.quote}`;
  renderBallPreview($('sb-canvas-1'), d1);
  renderBallPreview($('sb-canvas-2'), d2);
}

function startSandboxDuel(p1Id = ui.sandboxP1, p2Id = ui.sandboxP2) {
  ui.sandboxP1 = p1Id;
  ui.sandboxP2 = p2Id;
  const hearts = Number($('sb-hearts').value) || 3;
  const sd = Number($('sb-sd').value);

  sim.startMatch({
    mode: MODES.SANDBOX,
    hearts,
    suddenDeathStart: Number.isFinite(sd) ? sd : 22,
    skipDraft: true,
  });
  ui.paused = false;
  ui.simSpeed = 1;
  updateFightButtons();
  showView('arena');
  enterAimPhase(p1Id, p2Id);
}

function runSandboxBatchSim(runs = 10) {
  const p1Def = getBallDef(ui.sandboxP1);
  const p2Def = getBallDef(ui.sandboxP2);
  const sdVal = Number($('sb-sd').value);
  const suddenDeathStart = Number.isFinite(sdVal) ? sdVal : 22;

  let p1Wins = 0;
  let p2Wins = 0;
  let draws = 0;
  let totalTime = 0;

  for (let i = 0; i < runs; i++) {
    const testSim = new ArenaSimulation({
      mode: MODES.SANDBOX,
      hearts: 1,
      suddenDeathStart,
      seed: (Date.now() + i * 7919) >>> 0,
    });
    testSim.startMatch({ skipDraft: true });
    testSim.setupAimPhase(p1Def.id, p2Def.id);
    const a1 = chooseBotAimAngle(testSim.balls[0], testSim.balls[1], testSim.rng);
    const a2 = chooseBotAimAngle(testSim.balls[1], testSim.balls[0], testSim.rng);
    testSim.launchRound(a1, a2);

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
    <strong>${runs}-Match Simulation (${p1Def.name} vs ${p2Def.name})</strong><br/>
    Blue (${p1Def.name}): <strong>${p1Wins}</strong> wins &nbsp;|&nbsp;
    Red (${p2Def.name}): <strong>${p2Wins}</strong> wins &nbsp;|&nbsp;
    Draws: <strong>${draws}</strong><br/>
    Average Round Time: <strong>${avgSec}s</strong>
  `;
}

/* ==================== DRAFT FLOW ==================== */
function startArenaMode(mode) {
  sim.startMatch({ mode, hearts: 3, suddenDeathStart: 22 });
  ui.paused = false;
  ui.simSpeed = 1;
  updateFightButtons();
  showView('arena');
  beginRoundDraft();
}

function beginRoundDraft() {
  ui.draftPicks = { 1: null, 2: null };
  ui.draftPlayer = 1;
  openDraftForPlayer(1);
}

function openDraftForPlayer(playerNum) {
  ui.draftPlayer = playerNum;
  ui.draftRerollsLeft = FREE_REROLLS_PER_ROUND;
  ui.draftChoices = drawRandomBallChoices(3);
  $('draft-all-panel').classList.add('hidden');
  $('draft-cards').classList.remove('hidden');

  const label = playerNum === 1 ? 'PLAYER 1 (BLUE)' : 'PLAYER 2 (RED)';
  $('draft-player-kicker').textContent = `ROUND ${sim.roundNumber} • ${label}`;
  $('draft-title').textContent = 'Choose Your Ball';

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
  ui.draftPicks[ui.draftPlayer] = ballId;
  $('modal-draft').classList.add('hidden');

  if (sim.mode === MODES.ONLINE) {
    online.myDraftPick = ballId;
    if (online.role === 'host') {
      if (online.oppDraftPick) {
        hostEnterOnlineAim();
      } else {
        showWaitingShield(
          'ONLINE 1v1',
          'Ball Locked In!',
          'Waiting for Player 2 (Red) to pick their ball...'
        );
      }
    } else {
      p2p.send({ type: 'draft_pick', ballId });
      showWaitingShield(
        'ONLINE 1v1',
        'Ball Locked In!',
        'Waiting for Player 1 (Blue) to pick their ball...'
      );
    }
    return;
  }

  if (sim.mode === MODES.BOT) {
    const botPool = drawRandomBallChoices(3);
    const botPick = chooseBotBall(botPool);
    ui.draftPicks[2] = botPick.id;
    enterAimPhase(ui.draftPicks[1], ui.draftPicks[2]);
  } else if (sim.mode === MODES.LOCAL_2P) {
    if (ui.draftPlayer === 1) {
      showPassShield(
        'Pass to Player 2 (Red)',
        'Player 1 picked secretly. Hand over the device so Player 2 can draft.',
        () => openDraftForPlayer(2)
      );
    } else {
      enterAimPhase(ui.draftPicks[1], ui.draftPicks[2]);
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

function enterAimPhase(ballId1, ballId2) {
  sim.setupAimPhase(ballId1, ballId2);
  ui.aimingPlayer = online.active ? online.myOwner : 1;
  ui.aimLockedP1 = false;
  online.myAimLocked = false;
  online.oppAimLocked = false;
  $('arena-banner').classList.add('hidden');
  $('pass-shield').classList.add('hidden');
  $('controls-aim').classList.remove('hidden');
  $('controls-fight').classList.add('hidden');
  $('btn-lock-aim').disabled = false;
  updateAimPrompt();
  updateHud();
}

function updateAimPrompt() {
  const prompt = $('aim-prompt');
  if (sim.mode === MODES.ONLINE) {
    if (online.myAimLocked) {
      const oppName = online.myOwner === 1 ? 'Player 2 (Red)' : 'Player 1 (Blue)';
      prompt.textContent = `Aim locked! Waiting for ${oppName}...`;
    } else {
      const team = online.myOwner === 1 ? 'YOU (BLUE)' : 'YOU (RED)';
      prompt.textContent = `${team}: Drag inside the arena (or A / D) to aim -> LOCK AIM`;
    }
  } else if (sim.mode === MODES.LOCAL_2P) {
    const team = ui.aimingPlayer === 1 ? 'P1 (BLUE)' : 'P2 (RED)';
    prompt.textContent = `${team}: Drag inside the arena (or A / D) to set your launch angle`;
  } else if (sim.mode === MODES.SANDBOX) {
    prompt.textContent = 'Sandbox: Aim Blue ball (or A / D) then press LOCK AIM';
  } else {
    prompt.textContent = 'Drag inside the arena (or A / D) to aim your ball!';
  }
}

function lockCurrentAim() {
  if (sim.phase !== PHASES.AIM) return;
  soundEngine.unlock();

  if (sim.mode === MODES.ONLINE) {
    if (online.myAimLocked) return;
    online.myAimLocked = true;
    $('btn-lock-aim').disabled = true;
    updateAimPrompt();
    if (online.role === 'guest') {
      p2p.send({ type: 'aim_lock', angle: sim.aimAngles[2] });
    } else if (online.oppAimLocked) {
      hostLaunchOnlineFight();
    }
    return;
  }

  if (sim.mode === MODES.LOCAL_2P && ui.aimingPlayer === 1) {
    ui.aimLockedP1 = true;
    showPassShield(
      'Pass to Player 2 (Red)',
      'Player 1 aimed secretly. Ready for Player 2 to Lock Aim?',
      () => {
        ui.aimingPlayer = 2;
        updateAimPrompt();
      }
    );
    return;
  }

  let angle1 = sim.aimAngles[1];
  let angle2 = sim.aimAngles[2];
  if (sim.mode !== MODES.LOCAL_2P) {
    const b1 = sim.balls.find((b) => b.owner === 1);
    const b2 = sim.balls.find((b) => b.owner === 2);
    if (b1 && b2) {
      angle2 = chooseBotAimAngle(b2, b1, sim.rng);
    }
  }

  $('controls-aim').classList.add('hidden');
  $('controls-fight').classList.remove('hidden');
  ui.paused = false;
  updateFightButtons();
  sim.launchRound(angle1, angle2);
  soundEngine.handleSimEvents(sim.consumeEvents());
}

function updateFightButtons() {
  const isOnline = sim.mode === MODES.ONLINE;
  $('btn-speed').classList.toggle('hidden', isOnline);
  $('btn-pause').classList.toggle('hidden', isOnline);
  $('btn-restart-round').classList.toggle('hidden', isOnline);
  $('btn-speed').textContent = `Speed: ${ui.simSpeed}x`;
  $('btn-pause').textContent = ui.paused ? 'Resume' : 'Pause';
  const b1 = getBallDef(sim.selectedBallIds[1]);
  const b2 = getBallDef(sim.selectedBallIds[2]);
  $('fight-tip').textContent = `${b1.name} vs ${b2.name} — Abilities trigger automatically!`;
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

  const d1 = getBallDef(sim.selectedBallIds[1]);
  const d2 = getBallDef(sim.selectedBallIds[2]);

  if (sim.phase === PHASES.ROUND_END) {
    kicker.textContent = `ROUND ${sim.roundNumber} COMPLETE`;
    if (sim.roundWinner === 0) {
      title.textContent = 'DOUBLE KO — DRAW!';
      sub.textContent = 'Both balls fell at the exact same moment. No hearts lost!';
    } else if (sim.roundWinner === 1) {
      title.textContent = `${d1.name} (Blue) Wins Round!`;
      sub.textContent = `Red loses 1 Heart (${sim.hearts[2]} remaining).`;
    } else {
      title.textContent = `${d2.name} (Red) Wins Round!`;
      sub.textContent = `Blue loses 1 Heart (${sim.hearts[1]} remaining).`;
    }
    nextBtn.textContent = 'Next Round';
    lobbyBtn.classList.add('hidden');
  } else {
    kicker.textContent = 'MATCH OVER';
    const winnerTeam =
      sim.mode === MODES.ONLINE
        ? sim.roundWinner === online.myOwner
          ? online.myOwner === 1
            ? 'YOU (BLUE)'
            : 'YOU (RED)'
          : sim.roundWinner === 1
          ? 'BLUE (OPPONENT)'
          : 'RED (OPPONENT)'
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
    $('btn-banner-next').textContent = 'Waiting for opponent...';
    p2p.send({ type: 'next_ready' });
    if (online.role === 'host' && online.oppNextReady) {
      hostAdvanceOnlineRound();
    }
    return;
  }

  $('arena-banner').classList.add('hidden');

  if (sim.phase === PHASES.MATCH_END) {
    if (sim.mode === MODES.SANDBOX) {
      startSandboxDuel(ui.sandboxP1, ui.sandboxP2);
    } else {
      startArenaMode(sim.mode);
    }
    return;
  }

  sim.roundNumber += 1;
  if (sim.mode === MODES.SANDBOX) {
    enterAimPhase(ui.sandboxP1, ui.sandboxP2);
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
    onError(msg) {
      $('online-status').textContent = `Error: ${msg}`;
    },
    onDisconnected(msg) {
      if (!online.active) return;
      stopDraftTimer();
      $('modal-draft').classList.add('hidden');
      $('controls-aim').classList.add('hidden');
      $('controls-fight').classList.add('hidden');
      showPassShield('Connection Lost', msg, () => showView('lobby'), 'Back to Lobby', 'ONLINE 1v1');
      resetOnlineState();
    },
    onConnected({ role }) {
      online.active = true;
      online.role = role;
      online.myOwner = role === 'host' ? 1 : 2;
      online.fxWatermark = { lastId: 0 };
      online.snapTick = 0;
      online.pendingEvents = [];

      if (role === 'host') {
        sim.startMatch({ mode: MODES.ONLINE, hearts: 3, suddenDeathStart: 22 });
        ui.paused = false;
        ui.simSpeed = 1;
        online.myDraftPick = null;
        online.oppDraftPick = null;
        online.myNextReady = false;
        online.oppNextReady = false;
        p2p.send({
          type: 'start_round',
          roundNumber: sim.roundNumber,
          hearts: { ...sim.hearts },
          heartsToWin: sim.heartsToWin,
        });
        showView('arena');
        openDraftForPlayer(1);
      }
    },
    onMessage(msg) {
      if (!msg || !msg.type) return;

      if (online.role === 'host') {
        if (msg.type === 'draft_pick') {
          online.oppDraftPick = msg.ballId;
          if (online.myDraftPick) hostEnterOnlineAim();
        } else if (msg.type === 'aim_lock') {
          sim.aimAngles[2] = msg.angle;
          online.oppAimLocked = true;
          if (online.myAimLocked) hostLaunchOnlineFight();
        } else if (msg.type === 'next_ready') {
          online.oppNextReady = true;
          if (online.myNextReady) hostAdvanceOnlineRound();
        }
        return;
      }

      // Guest message handling
      if (msg.type === 'start_round') {
        sim.mode = MODES.ONLINE;
        sim.roundNumber = msg.roundNumber;
        sim.hearts = { ...msg.hearts };
        sim.heartsToWin = msg.heartsToWin || 3;
        sim.resetRoundEntities();
        sim.phase = PHASES.DRAFT;
        online.myDraftPick = null;
        online.myAimLocked = false;
        online.myNextReady = false;
        ui.paused = false;
        ui.simSpeed = 1;
        $('arena-banner').classList.add('hidden');
        $('pass-shield').classList.add('hidden');
        showView('arena');
        updateHud();
        openDraftForPlayer(2);
      } else if (msg.type === 'snap') {
        const prevPhase = sim.phase;
        applySnapshot(sim, msg);
        if (msg.events && msg.events.length) {
          soundEngine.handleSimEvents(msg.events);
        }
        if (prevPhase !== sim.phase && sim.phase === PHASES.AIM) {
          ui.aimingPlayer = 2;
          online.myAimLocked = false;
          $('arena-banner').classList.add('hidden');
          $('pass-shield').classList.add('hidden');
          $('controls-aim').classList.remove('hidden');
          $('controls-fight').classList.add('hidden');
          $('btn-lock-aim').disabled = false;
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
  enterAimPhase(online.myDraftPick, online.oppDraftPick);
  p2p.send(encodeSnapshot(sim, [], online.fxWatermark));
}

function hostLaunchOnlineFight() {
  $('controls-aim').classList.add('hidden');
  $('controls-fight').classList.remove('hidden');
  ui.paused = false;
  updateFightButtons();
  sim.launchRound(sim.aimAngles[1], sim.aimAngles[2]);
  const events = sim.consumeEvents();
  soundEngine.handleSimEvents(events);
  p2p.send(encodeSnapshot(sim, events, online.fxWatermark));
}

function hostAdvanceOnlineRound() {
  $('arena-banner').classList.add('hidden');
  if (sim.phase === PHASES.MATCH_END) {
    sim.startMatch({ mode: MODES.ONLINE, hearts: 3, suddenDeathStart: 22 });
  } else {
    sim.roundNumber += 1;
    sim.resetRoundEntities();
    sim.phase = PHASES.DRAFT;
  }
  online.myDraftPick = null;
  online.oppDraftPick = null;
  online.myNextReady = false;
  online.oppNextReady = false;
  p2p.send({
    type: 'start_round',
    roundNumber: sim.roundNumber,
    hearts: { ...sim.hearts },
    heartsToWin: sim.heartsToWin,
  });
  openDraftForPlayer(1);
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

function updateHud() {
  if (sim.mode === MODES.ONLINE) {
    $('hud-p1-label').textContent = online.myOwner === 1 ? 'YOU (BLUE)' : 'P1 (BLUE)';
    $('hud-p2-label').textContent = online.myOwner === 2 ? 'YOU (RED)' : 'P2 (RED)';
  } else {
    const p2Name = sim.mode === MODES.BOT ? 'BOT' : 'P2 RED';
    $('hud-p1-label').textContent = sim.mode === MODES.LOCAL_2P ? 'P1 BLUE' : 'YOU (BLUE)';
    $('hud-p2-label').textContent = p2Name;
  }

  renderHearts($('hud-p1-hearts'), sim.hearts[1], sim.heartsToWin);
  renderHearts($('hud-p2-hearts'), sim.hearts[2], sim.heartsToWin);

  const d1 = getBallDef(sim.selectedBallIds[1]);
  const d2 = getBallDef(sim.selectedBallIds[2]);
  $('hud-p1-ball').textContent = d1.name;
  $('hud-p1-rarity').textContent = d1.rarity;
  $('hud-p1-rarity').className = `rarity-pill r-${d1.rarity}`;
  $('hud-p2-ball').textContent = d2.name;
  $('hud-p2-rarity').textContent = d2.rarity;
  $('hud-p2-rarity').className = `rarity-pill r-${d2.rarity}`;

  const p1Balls = sim.balls.filter((b) => b.owner === 1 && b.hp > 0);
  const p2Balls = sim.balls.filter((b) => b.owner === 2 && b.hp > 0);
  const hp1 = p1Balls.reduce((sum, b) => sum + b.hp, 0);
  const max1 = Math.max(1, p1Balls.reduce((sum, b) => sum + b.maxHp, 0) || d1.hp);
  const hp2 = p2Balls.reduce((sum, b) => sum + b.hp, 0);
  const max2 = Math.max(1, p2Balls.reduce((sum, b) => sum + b.maxHp, 0) || d2.hp);

  $('hud-p1-hpbar').style.width = `${Math.max(0, Math.min(100, (hp1 / max1) * 100))}%`;
  $('hud-p1-hptext').textContent = `${Math.ceil(hp1)} / ${Math.ceil(max1)}`;
  $('hud-p2-hpbar').style.width = `${Math.max(0, Math.min(100, (hp2 / max2) * 100))}%`;
  $('hud-p2-hptext').textContent = `${Math.ceil(hp2)} / ${Math.ceil(max2)}`;

  $('hud-round').textContent = `ROUND ${sim.roundNumber}`;

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
    renderArena(ctx, sim, { aimingPlayer: online.myAimLocked ? 0 : 2 });
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
  renderArena(ctx, sim, { aimingPlayer: online.active && online.myAimLocked ? 0 : ui.aimingPlayer });
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
      ui.sandboxP1 = def.id;
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
function aimFromPointerEvent(e) {
  if (sim.phase !== PHASES.AIM || !$('pass-shield').classList.contains('hidden')) return;
  if (online.active && online.myAimLocked) return;
  const canvas = $('arena-canvas');
  const rect = canvas.getBoundingClientRect();
  const scaleX = ARENA_SIZE / rect.width;
  const scaleY = ARENA_SIZE / rect.height;
  const px = (e.clientX - rect.left) * scaleX;
  const py = (e.clientY - rect.top) * scaleY;
  const ball = sim.balls.find((b) => b.owner === ui.aimingPlayer);
  if (!ball) return;
  const angle = Math.atan2(py - ball.y, px - ball.x);
  sim.aimAngles[ui.aimingPlayer] = angle;
}

function bindEvents() {
  $('btn-home').addEventListener('click', () => showView('lobby'));
  $('btn-back-lobby').addEventListener('click', () => showView('lobby'));

  $('btn-quick-bot').addEventListener('click', () => {
    soundEngine.unlock();
    startArenaMode(MODES.BOT);
  });
  $('btn-quick-online').addEventListener('click', () => {
    soundEngine.unlock();
    showView('online');
  });
  $('btn-mode-online').addEventListener('click', () => {
    soundEngine.unlock();
    showView('online');
  });
  $('btn-mode-bot').addEventListener('click', () => {
    soundEngine.unlock();
    startArenaMode(MODES.BOT);
  });
  $('btn-mode-2p').addEventListener('click', () => {
    soundEngine.unlock();
    startArenaMode(MODES.LOCAL_2P);
  });
  $('btn-mode-sandbox').addEventListener('click', () => {
    soundEngine.unlock();
    showView('sandbox');
  });
  $('btn-verity-spider').addEventListener('click', () => {
    soundEngine.unlock();
    startSandboxDuel('verity', 'spider');
  });

  // Online lobby buttons
  $('btn-online-host').addEventListener('click', () => {
    soundEngine.unlock();
    const code = p2p.hostRoom();
    $('online-room-code').textContent = code;
    $('online-room-box').classList.remove('hidden');
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
    p2p.joinRoom($('online-join-code').value);
  });
  $('online-join-code').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      soundEngine.unlock();
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
  document.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [p1, p2] = btn.dataset.preset.split(',');
      ui.sandboxP1 = p1;
      ui.sandboxP2 = p2;
      renderSandboxGrids();
      updateSandboxPreviews();
    });
  });
  $('btn-sandbox-random').addEventListener('click', () => {
    const pair = drawRandomBallChoices(2);
    ui.sandboxP1 = pair[0].id;
    ui.sandboxP2 = pair[1].id;
    renderSandboxGrids();
    updateSandboxPreviews();
  });
  $('btn-sandbox-fight').addEventListener('click', () => {
    soundEngine.unlock();
    startSandboxDuel(ui.sandboxP1, ui.sandboxP2);
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
    aimFromPointerEvent(e);
  });
  window.addEventListener('pointermove', (e) => {
    if (ui.isDraggingAim) aimFromPointerEvent(e);
  });
  window.addEventListener('pointerup', () => {
    ui.isDraggingAim = false;
  });

  $('btn-aim-ccw').addEventListener('click', () => {
    sim.aimAngles[ui.aimingPlayer] -= (10 * Math.PI) / 180;
  });
  $('btn-aim-cw').addEventListener('click', () => {
    sim.aimAngles[ui.aimingPlayer] += (10 * Math.PI) / 180;
  });
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
    enterAimPhase(sim.selectedBallIds[1], sim.selectedBallIds[2]);
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
      sim.aimAngles[ui.aimingPlayer] -= 0.14;
    } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
      sim.aimAngles[ui.aimingPlayer] += 0.14;
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      lockCurrentAim();
    }
  });
}

init();
