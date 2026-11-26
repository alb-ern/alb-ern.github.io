import { BALL_DEFS } from '../src/sim/balls.js';
import { ABILITY_HANDLERS } from '../src/sim/abilities.js';
import {
  ARENA_SIZE,
  ARENA_SIZE_2V2,
  FIXED_DT,
  MIN_ARENA_SIZE,
  MIN_ARENA_SIZE_2V2,
  MODES,
  PHASES,
  RARITY_META,
  SUDDEN_DEATH_START_SEC,
} from '../src/sim/constants.js';
import { ArenaSimulation, createSeededRng } from '../src/sim/physics.js';
import { chooseBotAimAngle, chooseBotBall, drawRandomBallChoices } from '../src/sim/ai.js';
import { encodeSnapshot, applySnapshot, stepMirrorVisuals } from '../src/net/protocol.js';
import { generateRoomCode, quickmatchRoomCode, QUICKMATCH_SLOTS, sanitizeRoomCode } from '../src/net/p2p.js';
import {
  ARENA_THEMES,
  BALL_TRAILS,
  CAPSULE_DEFS,
  RELIC_CAPSULE_DEFS,
  RELIC_POD_DEF,
  STARTER_BALL_IDS,
  STARTER_RELIC_IDS,
  claimBounty,
  createDefaultProfile,
  equipCosmetic,
  exportProfileCode,
  getBallMasteryInfo,
  getMaxUnlockedChallenge,
  getRankInfo,
  getRelicUnlockCost,
  getTowerProgress,
  getUnlockedBallIds,
  getUnlockedRelicIds,
  importProfileCode,
  isBallUnlocked,
  isRelicUnlocked,
  isTowerUnlocked,
  loadProfile,
  openBallCapsule,
  openRelicCapsule,
  openRelicPod,
  recordCombatProgress,
  saveProfile,
  unlockBallDirect,
  unlockCosmetic,
  unlockRelicDirect,
} from '../src/sim/progression.js';
import {
  CHALLENGE_LEVELS,
  GAUNTLET_FLOORS,
  GAUNTLET_RELICS,
  GAUNTLET_TOWERS,
  SPIRE_FLOORS,
  drawRelicChoices,
  getChallengeDef,
  getGauntletFloor,
  getGauntletTower,
  getRelicExtraRerolls,
} from '../src/sim/gauntlet.js';

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  print(`PASS: ${name}`);
}

const log = typeof print === 'function' ? print : console.log;

test('Roster contains 120 unique balls with valid rarities, handlers, and 100-HP standard', () => {
  assert(SUDDEN_DEATH_START_SEC === 30, `Expected SUDDEN_DEATH_START_SEC === 30, got ${SUDDEN_DEATH_START_SEC}`);
  assert(BALL_DEFS.length === 120, `Expected 120 balls, got ${BALL_DEFS.length}`);
  const seen = new Set();
  const expectedHp = { cell: 15, berserker: 135, micro: 70, coughingbaby: 55 };
  const contactIds = new Set([
    'verity', 'cell', 'fibonacci', 'duplicator', 'doubler', 'mach',
    'titan', 'hydra', 'berserker', 'rocket', 'pacman', 'nokia', 'sigma',
  ]);
  for (const def of BALL_DEFS) {
    assert(!seen.has(def.id), `Duplicate ball id: ${def.id}`);
    seen.add(def.id);
    assert(RARITY_META[def.rarity], `Invalid rarity on ${def.id}: ${def.rarity}`);
    assert(def.hp > 0 && def.speed > 0 && def.radius > 0, `Invalid stats on ${def.id}`);
    const wantHp = expectedHp[def.id] ?? 100;
    assert(def.hp === wantHp, `${def.id} HP must be ${wantHp}, got ${def.hp}`);
    assert(ABILITY_HANDLERS[def.id], `Missing ability handler for ${def.id}`);
    if (contactIds.has(def.id)) {
      assert(def.contactDmg > 0, `${def.id} should deal contact damage`);
    } else {
      assert(def.contactDmg === 0, `${def.id} should have 0 passive contact damage`);
    }
  }
});

test('Draft and AI selection return valid choices', () => {
  const rng = createSeededRng(42);
  const picks = drawRandomBallChoices(3, rng);
  assert(picks.length === 3, 'Should draw 3 choices');
  assert(new Set(picks.map((p) => p.id)).size === 3, 'Choices must be distinct');
  const botChoice = chooseBotBall(picks, rng);
  assert(picks.some((p) => p.id === botChoice.id), 'Bot must pick from choices');
});

test('Spider Ball anchors web_line tripwires across wall hits', () => {
  const sim = new ArenaSimulation({ mode: MODES.SANDBOX, hearts: 1, seed: 101 });
  sim.startMatch({ skipDraft: true });
  sim.setupAimPhase('spider', 'verity');
  sim.launchRound(Math.PI + 0.35, 0);

  let sawWeb = false;
  for (let i = 0; i < 600; i++) {
    sim.step(FIXED_DT);
    if (sim.hazards.some((h) => h.kind === 'web_line' && h.owner === 1)) {
      sawWeb = true;
      break;
    }
  }
  assert(sawWeb, 'Spider Ball should create web_line tripwires on wall hits');
});

test('Verity Ball transforms Stage 1 (5) -> Stage 2 (10) -> Stage 3 Monster (40) on damage', () => {
  const sim = new ArenaSimulation({ mode: MODES.SANDBOX, hearts: 1, seed: 7 });
  sim.startMatch({ skipDraft: true });
  sim.setupAimPhase('verity', 'machinegun');
  sim.launchRound(0, Math.PI);

  const verity = sim.balls[0];
  assert(verity.state.stage === 1 && verity.contactDmg === 5, 'Verity starts Stage 1 with 5 DMG');

  for (let k = 0; k < 120 && verity.state.stage < 3; k++) {
    verity.state.procCd = 0;
    verity.hp = verity.maxHp;
    sim.dealDamage(verity, 2, 2, 'test');
  }
  assert(verity.state.stage === 3, `Expected Stage 3 Monster, got stage ${verity.state.stage}`);
  assert(verity.contactDmg === 40, `Expected 40 contactDmg at Stage 3, got ${verity.contactDmg}`);
});

test('Vampire Ball physically latches onto enemy for 3 drain/heal ticks of 4', () => {
  const sim = new ArenaSimulation({ mode: MODES.SANDBOX, hearts: 1, seed: 22 });
  sim.startMatch({ skipDraft: true });
  sim.setupAimPhase('vampire', 'laser');
  sim.launchRound(0, Math.PI);

  const vamp = sim.balls[0];
  const enemy = sim.balls[1];
  vamp.hp = 80;
  // Trigger ball-to-ball collision
  for (let i = 0; i < 120 && !vamp.state.latchTargetId; i++) {
    sim.step(FIXED_DT);
  }
  assert(vamp.state.latchTargetId === enemy.id, 'Vampire should latch onto enemy on collision');
  // Run through 3 ticks (~1.2s)
  for (let i = 0; i < 90; i++) {
    sim.step(FIXED_DT);
  }
  assert(enemy.hp <= 88, `Enemy should take 12 drain damage, got hp=${enemy.hp}`);
  assert(vamp.hp >= 90, `Vampire should heal +12 HP from 80, got hp=${vamp.hp}`);
});

test('Shackles Ball spawns 3 ring cages that trap enemy and deal 3 damage on inner bounce', () => {
  const sim = new ArenaSimulation({ mode: MODES.SANDBOX, hearts: 1, seed: 33 });
  sim.startMatch({ skipDraft: true });
  sim.setupAimPhase('shackles', 'verity');
  sim.launchRound(0, Math.PI);

  for (let i = 0; i < 120; i++) sim.step(FIXED_DT);
  const cages = sim.hazards.filter((h) => h.kind === 'shackle_cage' && h.owner === 1);
  assert(cages.length === 3, `Shackles should spawn 3 interconnected cages, got ${cages.length}`);

  const enemy = sim.balls[1];
  enemy.x = cages[0].x;
  enemy.y = cages[0].y;
  const hpBefore = enemy.hp;
  for (let i = 0; i < 90; i++) sim.step(FIXED_DT);
  assert(enemy.trappedCageId === cages[0].id || enemy.hp < hpBefore, 'Enemy inside cage should be trapped and damaged on inner bounces');
});

test('Cell Ball starts at 15 HP, matures after 3s, and splits into 3 new 15-HP cells', () => {
  // Kill before 3s maturity -> NO split
  const simImmature = new ArenaSimulation({ mode: MODES.SANDBOX, hearts: 1, seed: 88 });
  simImmature.startMatch({ skipDraft: true });
  simImmature.setupAimPhase('cell', 'spider');
  simImmature.launchRound(0, Math.PI);
  const c1 = simImmature.balls[0];
  assert(c1.hp === 15 && c1.contactDmg === 5, 'Cell starts at 15 HP and 5 contactDmg');
  simImmature.dealDamage(c1, 20, 2, 'burst');
  simImmature.step(FIXED_DT);
  assert(simImmature.phase === PHASES.MATCH_END, 'Immature Cell should die without splitting');

  // Mature for 3.1s then kill -> splits into 3 cells!
  const simMature = new ArenaSimulation({ mode: MODES.SANDBOX, hearts: 1, seed: 89 });
  simMature.startMatch({ skipDraft: true });
  simMature.setupAimPhase('cell', 'spider');
  simMature.launchRound(Math.PI, 0);
  for (let i = 0; i < 60 * 3.1; i++) {
    simMature.balls[0].hp = 15;
    simMature.step(FIXED_DT);
  }
  const matureCell = simMature.balls.find((b) => b.owner === 1);
  assert(matureCell && matureCell.state.mature, 'Cell should mature after 3s');
  simMature.dealDamage(matureCell, 99, 2, 'burst');
  simMature.step(FIXED_DT);
  const splitCells = simMature.balls.filter((b) => b.owner === 1 && b.hp > 0);
  assert(splitCells.length === 3, `Mature Cell should split into 3 cells, got ${splitCells.length}`);
});

test('Sudden Death shrinks arena bounds cleanly down to MIN_ARENA_SIZE', () => {
  const sim = new ArenaSimulation({ mode: MODES.SANDBOX, hearts: 1, suddenDeathStart: 2, seed: 55 });
  sim.startMatch({ skipDraft: true });
  sim.setupAimPhase('verity', 'orbital');
  sim.launchRound(0.4, -2.5);

  for (let i = 0; i < 60 * 35; i++) {
    if (sim.phase !== PHASES.FIGHT) {
      for (const b of sim.balls) b.hp = b.maxHp;
    }
    sim.step(FIXED_DT);
  }
  assert(sim.suddenDeathActive, 'Sudden death should activate after suddenDeathStart');
  const width = sim.bounds.right - sim.bounds.left;
  assert(width < ARENA_SIZE && width >= MIN_ARENA_SIZE - 0.1, `Unexpected shrunk width: ${width}`);
});

test('All 120 balls simulate 25s duels without NaN or exceptions', () => {
  for (let i = 0; i < BALL_DEFS.length; i++) {
    const a = BALL_DEFS[i];
    const b = BALL_DEFS[(i + 7) % BALL_DEFS.length];
    const sim = new ArenaSimulation({ mode: MODES.SANDBOX, hearts: 1, seed: 1000 + i });
    sim.startMatch({ skipDraft: true });
    sim.setupAimPhase(a.id, b.id);
    sim.launchRound(
      chooseBotAimAngle(sim.balls[0], sim.balls[1], sim.rng),
      chooseBotAimAngle(sim.balls[1], sim.balls[0], sim.rng)
    );

    for (let tick = 0; tick < 60 * 25 && sim.phase === PHASES.FIGHT; tick++) {
      sim.step(FIXED_DT);
    }
    for (const ball of sim.balls) {
      assert(Number.isFinite(ball.x) && Number.isFinite(ball.y), `NaN pos in ${a.id} vs ${b.id}`);
      assert(Number.isFinite(ball.vx) && Number.isFinite(ball.vy), `NaN vel in ${a.id} vs ${b.id}`);
    }
  }
});

test('Duplicator multiplies exponentially with halved HP (<= 16 cap) and Doubler stacks x2 per bounce', () => {
  const sim = new ArenaSimulation({ mode: MODES.SANDBOX, hearts: 1, seed: 1201 });
  sim.startMatch({ skipDraft: true });
  sim.setupAimPhase('duplicator', 'doubler');
  sim.launchRound(0.4, Math.PI - 0.4);
  const doubler = sim.balls.find((b) => b.ballId === 'doubler');
  let sawMult2 = false;
  for (let i = 0; i < 60 * 7; i++) {
    for (const b of sim.balls) b.hp = Math.max(30, b.hp);
    sim.step(FIXED_DT);
    if (doubler.state.mult >= 2) sawMult2 = true;
  }
  const dupes = sim.balls.filter((b) => b.ballId === 'duplicator' && b.owner === 1 && b.hp > 0);
  assert(dupes.length >= 4 && dupes.length <= 16, `Expected 4..16 Duplicators, got ${dupes.length}`);
  assert(dupes.every((d) => d.radius < 50), 'Split Duplicators should shrink cleanly');
  assert(sawMult2, 'Doubler should double multiplier on wall bounces');
});

test('Phoenix rebirths once at 35 HP and Shield reflects enemy projectiles', () => {
  const sim = new ArenaSimulation({ mode: MODES.SANDBOX, hearts: 1, seed: 1202 });
  sim.startMatch({ skipDraft: true });
  sim.setupAimPhase('phoenix', 'shield');
  sim.launchRound(0, Math.PI);
  const ph = sim.balls[0];
  sim.dealDamage(ph, 200, 2, 'test');
  assert(ph.hp === 35 && ph.state.reborn === true, `Expected Phoenix rebirth at 35 HP, got hp=${ph.hp}`);
  sim.dealDamage(ph, 200, 2, 'test');
  assert(ph.hp === 0, 'Phoenix should only rebirth once per round');

  const sh = sim.balls[1];
  sh.shieldAngle = 0;
  sim.addProjectile({
    kind: 'bullet',
    owner: 1,
    x: sh.x + sh.radius + 2,
    y: sh.y,
    vx: -400,
    vy: 0,
    radius: 8,
    dmg: 8,
    bouncesLeft: 1,
    ttl: 2,
  });
  sim.updateProjectiles(FIXED_DT);
  const refl = sim.projectiles.find((p) => p.kind === 'bullet');
  assert(refl && refl.owner === 2 && refl.vx > 0, 'Shield should reflect enemy projectile back toward P1');
});

test('Verity evolves physically larger (48 -> 60 -> 76) and Axe swings 2-ball reach (170px)', () => {
  const simV = new ArenaSimulation({ mode: MODES.SANDBOX, hearts: 1, seed: 901 });
  simV.startMatch({ skipDraft: true });
  simV.setupAimPhase('verity', 'axe');
  simV.launchRound(0, Math.PI);
  const verity = simV.balls[0];
  assert(verity.radius === 48, `Expected initial Verity radius 48, got ${verity.radius}`);
  for (let k = 0; k < 120 && verity.state.stage < 2; k++) {
    verity.state.procCd = 0;
    verity.hp = verity.maxHp;
    simV.dealDamage(verity, 2, 2, 'test');
  }
  assert(verity.state.stage === 2 && verity.radius === 60, `Expected Stage 2 radius 60, got ${verity.radius} (stage ${verity.state.stage})`);
  for (let k = 0; k < 120 && verity.state.stage < 3; k++) {
    verity.state.procCd = 0;
    verity.hp = verity.maxHp;
    simV.dealDamage(verity, 2, 2, 'test');
  }
  assert(verity.state.stage === 3 && verity.radius === 76, `Expected Stage 3 radius 76, got ${verity.radius} (stage ${verity.state.stage})`);

  const axeHelper = simV.helpers.find((h) => h.kind === 'axe');
  assert(axeHelper && axeHelper.orbitRadius === 170, `Expected Axe orbitRadius 170, got ${axeHelper?.orbitRadius}`);
});

test('Snake builds thick tail segments and Slime splits into mini slimes on defeat', () => {
  const simS = new ArenaSimulation({ mode: MODES.SANDBOX, hearts: 1, seed: 902 });
  simS.startMatch({ skipDraft: true });
  simS.setupAimPhase('snake', 'slime');
  simS.launchRound(0.4, Math.PI - 0.4);
  for (let i = 0; i < 90; i++) simS.step(FIXED_DT);
  const snake = simS.balls.find((b) => b.ballId === 'snake');
  assert(snake && Array.isArray(snake.tail) && snake.tail.length >= 5, 'Snake should trail thick tail segments');

  const slime = simS.balls.find((b) => b.ballId === 'slime');
  assert(slime, 'Slime should exist');
  simS.dealDamage(slime, slime.hp + 5, 1, 'test');
  const miniSlimes = simS.balls.filter((b) => b.ballId === 'slime' && b.owner === 2 && b.hp > 0);
  assert(miniSlimes.length === 2, `Expected Slime to split into 2 mini slimes, got ${miniSlimes.length}`);
});

test('P2P snapshot protocol roundtrips fight state, incremental FX watermark, and guest dead-reckoning', () => {
  assert(MODES.ONLINE === 'online', 'MODES.ONLINE should equal online');
  const host = new ArenaSimulation({ mode: MODES.ONLINE, hearts: 3, seed: 777 });
  host.startMatch();
  host.setupAimPhase('spider', 'vampire');
  host.launchRound(0.5, -2.1);

  for (let i = 0; i < 45; i++) {
    host.step(FIXED_DT);
  }
  host.emitText(100, 120, 'WEB!', '#ffffff');
  host.addParticleBurst(100, 120, '#ffffff', 4);
  const events = host.consumeEvents();

  const watermark = { lastId: 0 };
  const snap1 = encodeSnapshot(host, events, watermark);
  assert(snap1.type === 'snap', 'Snapshot type should be snap');
  assert(snap1.phase === host.phase, 'Snapshot phase should match host');
  assert(snap1.balls.length === host.balls.length, 'Snapshot should include all host balls');
  assert(snap1.texts.length >= 1, 'First snapshot should include new floating texts');
  assert(snap1.particles.length >= 4, 'First snapshot should include new particles');
  assert(watermark.lastId > 0, 'FX watermark should advance after encoding FX');

  const snap2 = encodeSnapshot(host, [], watermark);
  assert(snap2.texts.length === 0 && snap2.particles.length === 0, 'Subsequent snapshot without new FX should not resend old FX');

  const guest = new ArenaSimulation({ mode: MODES.ONLINE, hearts: 3 });
  applySnapshot(guest, snap1);
  assert(guest.balls.length === host.balls.length, 'Guest should mirror ball count');
  assert(guest.selectedBallIds[1] === 'spider' && guest.selectedBallIds[2] === 'vampire', 'Guest should mirror selected balls');
  assert(guest.hazards.length === snap1.hazards.length, 'Guest should mirror hazards');

  stepMirrorVisuals(guest, FIXED_DT);
  for (const ball of guest.balls) {
    assert(Number.isFinite(ball.x) && Number.isFinite(ball.y), 'Guest dead-reckoning must keep finite coordinates');
  }
});

test('Room code helpers generate and sanitize codes consistently', () => {
  const code = generateRoomCode(4);
  assert(/^[A-Z0-9]{4}$/.test(code), `Generated room code should be 4 uppercase alphanumerics, got ${code}`);
  assert(sanitizeRoomCode(' ab-12$xy78 ') === 'AB12XY', 'sanitizeRoomCode should strip invalid chars, uppercase, and cap at 6');
  assert(sanitizeRoomCode('') === '', 'sanitizeRoomCode should handle empty string');
});

test('2v2 spawns 4 balls on a 740px arena and shrinks Sudden Death down to MIN_ARENA_SIZE_2V2', () => {
  const sim = new ArenaSimulation({ mode: MODES.SANDBOX, teamSize: 2, hearts: 1, suddenDeathStart: 2, seed: 1301 });
  sim.startMatch({ skipDraft: true, teamSize: 2 });
  sim.setupAimPhase(['verity', 'sword'], ['spider', 'orbital']);
  assert(sim.teamSize === 2, 'Should stay in 2v2 mode');
  assert(sim.arenaSize === ARENA_SIZE_2V2 && ARENA_SIZE_2V2 === 740, `Expected 740 arenaSize, got ${sim.arenaSize}`);
  assert(sim.bounds.right === 740 && sim.bounds.bottom === 740, 'Arena bounds should be 740x740');
  assert(sim.balls.length === 4, `Expected 4 balls in 2v2, got ${sim.balls.length}`);
  assert(sim.balls[0].y !== sim.balls[1].y, 'Blue teammates should spawn vertically staggered');
  sim.launchRound([0.2, -0.2], [Math.PI - 0.2, Math.PI + 0.2]);

  for (let i = 0; i < 60 * 40; i++) {
    if (sim.phase !== PHASES.FIGHT) {
      for (const b of sim.balls) b.hp = b.maxHp;
    }
    sim.step(FIXED_DT);
  }
  assert(sim.suddenDeathActive, 'Sudden Death should activate in 2v2');
  const width = sim.bounds.right - sim.bounds.left;
  assert(width < ARENA_SIZE_2V2 && width >= MIN_ARENA_SIZE_2V2 - 0.1, `Unexpected 2v2 shrunk width: ${width}`);
});

test('2v2 prevents friendly fire, preserves surviving teammate, and tags per-ball sourceBallId', () => {
  const sim = new ArenaSimulation({ mode: MODES.SANDBOX, teamSize: 2, hearts: 2, seed: 1302 });
  sim.startMatch({ skipDraft: true, teamSize: 2 });
  sim.setupAimPhase(['verity', 'cannon'], ['spider', 'mirror']);
  sim.launchRound([0.1, -0.1], [Math.PI, Math.PI]);

  // Colliding teammates bounce elastically with zero damage
  const t1a = sim.balls[0];
  const t1b = sim.balls[1];
  const hpA = t1a.hp;
  const hpB = t1b.hp;
  t1a.x = 220;
  t1a.y = 300;
  t1b.x = 240;
  t1b.y = 300;
  sim.resolveBallCollisions();
  assert(t1a.hp === hpA && t1b.hp === hpB, 'Teammates colliding must deal 0 friendly-fire damage');

  // Verify Cannon turret hazard spawned by slot 1 gets sourceBallId === 'cannon' (not slot 0 'verity')
  for (let i = 0; i < 60 * 3; i++) sim.step(FIXED_DT);
  const turret = sim.hazards.find((h) => h.kind === 'turret' && h.owner === 1);
  assert(!turret || turret.sourceBallId === 'cannon', `Expected turret sourceBallId='cannon', got ${turret?.sourceBallId}`);

  // Knock out 1 teammate -> round must continue until BOTH teammates fall
  const soloVictim = sim.balls.find((b) => b.owner === 1);
  sim.dealDamage(soloVictim, 999, 2, 'test');
  sim.step(FIXED_DT);
  assert(sim.phase === PHASES.FIGHT && sim.hearts[1] === 2, 'Team 1 must keep fighting while 1 teammate survives');

  for (const rem of [...sim.balls.filter((b) => b.owner === 1)]) {
    sim.dealDamage(rem, 999, 2, 'test');
  }
  sim.step(FIXED_DT);
  assert(sim.phase === PHASES.ROUND_END && sim.hearts[1] === 1 && sim.roundWinner === 2, 'Round ends and 1 heart lost once both teammates fall');
});

test('P2P 2v2 snapshot protocol preserves teamSize, arenaSize=740, selectedTeams, and slotIndex', () => {
  const host = new ArenaSimulation({ mode: MODES.ONLINE, teamSize: 2, hearts: 3, seed: 1303 });
  host.startMatch({ teamSize: 2 });
  host.setupAimPhase(['mach', 'gravity'], ['titan', 'shield']);
  host.launchRound([0.15, -0.15], [Math.PI - 0.15, Math.PI + 0.15]);
  for (let i = 0; i < 20; i++) host.step(FIXED_DT);

  const snap = encodeSnapshot(host, [], { lastId: 0 });
  assert(snap.teamSize === 2 && snap.arenaSize === ARENA_SIZE_2V2, 'Snapshot must carry 2v2 teamSize and 740 arenaSize');
  assert(snap.selectedTeams[1][1] === 'gravity' && snap.selectedTeams[2][0] === 'titan', 'Snapshot must carry full selectedTeams');

  const guest = new ArenaSimulation({ mode: MODES.ONLINE, hearts: 3 });
  applySnapshot(guest, snap);
  assert(guest.teamSize === 2 && guest.arenaSize === ARENA_SIZE_2V2, 'Guest mirror must resize to 2v2 740 arena');
  assert(guest.balls.length === 4, `Expected 4 mirrored balls, got ${guest.balls.length}`);
  assert(guest.balls.some((b) => b.owner === 1 && b.slotIndex === 1 && b.ballId === 'gravity'), 'Guest mirror must preserve slotIndex and teammate ballId');
});

test('Quickmatch queue slot codes are valid and never collide with private room codes', () => {
  assert(QUICKMATCH_SLOTS === 12, `Expected 12 quickmatch slots, got ${QUICKMATCH_SLOTS}`);
  assert(quickmatchRoomCode(0) === 'QM01' && quickmatchRoomCode(11) === 'QM12', 'Unexpected QM slot codes');
  for (let i = 0; i < 200; i++) {
    const code = generateRoomCode(4);
    assert(!code.includes('0') && !code.includes('1'), `Private code should never overlap QM01-QM12: ${code}`);
  }
});

test('Hydrogen Bomb detonates nuke shockwave + fallout while Coughing Baby spreads cough clouds', () => {
  const sim = new ArenaSimulation({ mode: MODES.SANDBOX, hearts: 1, seed: 2026 });
  sim.startMatch({ skipDraft: true });
  sim.setupAimPhase('hydrogenbomb', 'coughingbaby');
  const baby = sim.balls.find((b) => b.ballId === 'coughingbaby');
  assert(baby && baby.hp === 55, 'Coughing Baby must start at 55 HP');
  sim.launchRound(0.25, Math.PI - 0.25);

  let sawNuke = false;
  let sawFallout = false;
  let sawCough = false;
  for (let i = 0; i < 60 * 6 && sim.phase === PHASES.FIGHT; i++) {
    sim.step(FIXED_DT);
    if (sim.hazards.some((h) => h.kind === 'ring_wave' && h.variant === 'nuke')) sawNuke = true;
    if (sim.hazards.some((h) => h.kind === 'red_zone' && h.variant === 'fallout')) sawFallout = true;
    if (sim.hazards.some((h) => h.kind === 'red_zone' && h.variant === 'cough_cloud')) sawCough = true;
  }
  assert(sawNuke && sawFallout, 'Hydrogen Bomb should detonate nuke wave and leave fallout');
  assert(sawCough, 'Coughing Baby should emit toxic cough_cloud hazards');
});

test('Claude refusal shield blocks hits, Israel Ball intercepts projectiles, and Hypergamy swings symbol', () => {
  const sim = new ArenaSimulation({ mode: MODES.SANDBOX, hearts: 1, seed: 2027 });
  sim.startMatch({ skipDraft: true });
  sim.setupAimPhase('claude', 'israel');
  sim.launchRound(0, Math.PI);
  const claude = sim.balls.find((b) => b.ballId === 'claude');
  const israel = sim.balls.find((b) => b.ballId === 'israel');

  // Claude's initial Refusal Shield should block a direct hit cleanly
  const hpBefore = claude.hp;
  const blocked = sim.dealDamage(claude, 12, 2, 'test_hit');
  assert(blocked === 0 && claude.hp === hpBefore, 'Claude Refusal Shield must block first hit');
  assert(!claude.state.shieldReady, 'Claude Refusal Shield should enter cooldown after blocking');

  // Place an enemy projectile inside Israel Ball radar radius and step once
  sim.addProjectile({
    kind: 'orb',
    owner: 1,
    x: israel.x - 60,
    y: israel.y,
    vx: 300,
    vy: 0,
    radius: 10,
    dmg: 8,
    bouncesLeft: 0,
    ttl: 2,
  });
  const projCountBefore = sim.projectiles.length;
  sim.step(FIXED_DT);
  assert(
    sim.projectiles.some((p) => p.owner === 2 && p.kind === 'sniper_round'),
    'Israel Ball should intercept projectile and fire counter sniper_round'
  );
  assert(
    !sim.projectiles.some((p) => p.owner === 1 && p.kind === 'orb'),
    `Israel Ball should destroy incoming enemy orb (before=${projCountBefore})`
  );

  // Verify Hypergamy spawns its long-reach swinging hypergamy_symbol weapon
  const sim2 = new ArenaSimulation({ mode: MODES.SANDBOX, hearts: 1, seed: 2028 });
  sim2.startMatch({ skipDraft: true });
  sim2.setupAimPhase('hypergamy', 'dondurma');
  sim2.launchRound(0, Math.PI);
  const sym = sim2.helpers.find((h) => h.kind === 'hypergamy_symbol');
  const pad = sim2.helpers.find((h) => h.kind === 'dondurma_paddle');
  assert(sym && sym.orbitRadius >= 160, 'Hypergamy must spawn 162px-reach hypergamy_symbol helper');
  assert(pad && pad.orbitRadius >= 145, 'Dondurma must spawn 148px-reach dondurma_paddle helper');
});

test('Progression awards Sparks, Mastery Lv 1-5, Bounties, Armory unlocks, milestones, and Save Code roundtrip', () => {
  const rng = createSeededRng(777);
  const store = new Map();
  const memStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
  };
  const prof = createDefaultProfile(rng);
  assert(prof.sparks === 100 && prof.bounties.length === 3, 'Default profile must start with 100 Sparks & 3 bounties');
  assert(ARENA_THEMES.length === 6 && BALL_TRAILS.length === 6, 'Armory must contain 6 themes and 6 trails');

  // Record 7 Gauntlet floor wins with hydrogenbomb including Floor 10 clear
  let lastRes = null;
  for (let i = 1; i <= 7; i++) {
    lastRes = recordCombatProgress(prof, {
      mode: MODES.GAUNTLET,
      teamSize: i === 7 ? 2 : 1,
      usedBalls: ['hydrogenbomb'],
      wonRound: true,
      matchEnded: i === 7,
      wonMatch: i === 7,
      gauntletFloor: i === 7 ? 10 : i,
      gauntletCleared: i === 7,
      dmgDealt: 120,
      wallHits: 10,
      remainingHp: 75,
    });
  }
  const mastery = getBallMasteryInfo(prof, 'hydrogenbomb');
  assert(mastery.level >= 3, `Expected Hydrogen Bomb to reach Gold Crown Lv 3+, got Lv ${mastery.level} (${mastery.xp} XP)`);
  assert(prof.unlockedThemes.includes('cosmic_omega'), 'Clearing Gauntlet Floor 10 must auto-unlock Cosmic Void Ω theme');
  assert(lastRes.sparksEarned > 200, 'Gauntlet Floor 10 clear should award large Sparks reward');

  // Unlock & equip Neon Cyber theme and Flame trail
  const uTheme = unlockCosmetic(prof, 'theme', 'neon_cyber');
  const uTrail = unlockCosmetic(prof, 'trail', 'flame');
  assert(uTheme.ok && prof.equippedTheme === 'neon_cyber', 'Should unlock & equip neon_cyber theme');
  assert(uTrail.ok && prof.equippedTrail === 'flame', 'Should unlock & equip flame trail');
  assert(equipCosmetic(prof, 'theme', 'cosmic_omega') && prof.equippedTheme === 'cosmic_omega', 'Should equip unlocked cosmic_omega');

  // Claim any completed bounty
  const readyBounty = prof.bounties.find((b) => b.progress >= b.target);
  if (readyBounty) {
    const beforeSparks = prof.sparks;
    const claimed = claimBounty(prof, readyBounty.id, rng);
    assert(claimed && prof.sparks > beforeSparks, 'Claiming completed bounty must grant Sparks');
  }

  // Persistence + Save Code roundtrip
  saveProfile(prof, memStorage);
  const loaded = loadProfile(memStorage);
  assert(loaded.sparks === prof.sparks && loaded.equippedTheme === 'cosmic_omega', 'Storage persistence failed');
  const code = exportProfileCode(prof);
  const imported = importProfileCode(code);
  assert(imported && imported.ballMastery.hydrogenbomb.xp === prof.ballMastery.hydrogenbomb.xp, 'Save code roundtrip failed');
  assert(getRankInfo(1400).current.id === 'gold', '1400 trophies should map to Gold rank');
});

test('Gauntlet Tower 10 floors & Run Relics trigger in GAUNTLET mode and stay inactive in BOT/ONLINE modes', () => {
  assert(GAUNTLET_FLOORS.length === 10 && GAUNTLET_RELICS.length === 24, 'Expected 10 floors & 24 relics');
  const f10 = getGauntletFloor(10);
  assert(f10.teamSize === 2 && f10.bossTeam.length === 2, 'Floor 10 must be a 2v2 Final Boss arena');
  const picks = drawRelicChoices(['vampiric_walls'], 3, createSeededRng(99));
  assert(picks.length === 3 && picks.every((r) => r.id !== 'vampiric_walls'), 'Relic draft should prefer unowned relics');

  // Test Aegis Start (blocks 1 hit <=10 DMG), Titan Plating (+10 HP), and Second Wind (revive at 10 HP) in GAUNTLET mode
  const sim = new ArenaSimulation({
    mode: MODES.GAUNTLET,
    hearts: 1,
    seed: 9001,
    runRelics: ['titan_plating', 'aegis_start', 'second_wind'],
    bossHpScale: 1.2,
  });
  sim.startMatch({
    mode: MODES.GAUNTLET,
    hearts: 1,
    runRelics: ['titan_plating', 'aegis_start', 'second_wind'],
    bossHpScale: 1.2,
    skipDraft: true,
  });
  sim.setupAimPhase('verity', 'banana');
  sim.launchRound(0, Math.PI);
  const p1 = sim.balls.find((b) => b.owner === 1);
  const boss = sim.balls.find((b) => b.owner === 2);
  assert(p1.maxHp === 110 && p1.hp === 110, `Titan Plating should give +10 HP (got ${p1.maxHp})`);
  assert(boss.maxHp === 120, `Boss HP scale 1.2x should give 120 HP (got ${boss.maxHp})`);

  // First hit (up to 10 DMG) blocked by Aegis Start
  assert(sim.dealDamage(p1, 9, 2, 'test') === 0, 'Aegis hit 1 (<=10 DMG) should be blocked completely');
  assert(p1.hp === 110, 'HP should remain full after Aegis block');

  // Lethal hit should trigger Second Wind revive at 10 HP
  sim.dealDamage(p1, 999, 2, 'lethal_test');
  assert(p1.hp === 10 && p1.phaseTimer > 0, `Second Wind must revive player at 10 HP with phase shield (hp=${p1.hp})`);

  // Verify PvP / BOT mode ignores runRelics completely
  const pvp = new ArenaSimulation({ mode: MODES.ONLINE, hearts: 1, seed: 9002 });
  pvp.startMatch({ mode: MODES.ONLINE, hearts: 1, runRelics: ['titan_plating', 'aegis_start'], bossHpScale: 1.5, skipDraft: true });
  pvp.setupAimPhase('verity', 'banana');
  pvp.launchRound(0, Math.PI);
  const pvpP1 = pvp.balls.find((b) => b.owner === 1);
  const pvpP2 = pvp.balls.find((b) => b.owner === 2);
  assert(pvpP1.maxHp === 100 && pvpP2.maxHp === 100, 'Online mode must ignore all Gauntlet relics & bossHpScale');
});

test('Ball unlocking: 20 starters, Direct Unlock, Guaranteed-NEW Capsules, Gauntlet Boss Drops, and Draft pool filtering', () => {
  const rng = createSeededRng(777);
  const prof = createDefaultProfile(rng);
  assert(STARTER_BALL_IDS.length === 20, `Expected 20 starter balls, got ${STARTER_BALL_IDS.length}`);
  assert(getUnlockedBallIds(prof).length === 20, 'Fresh profile must have 20 unlocked starter balls');
  assert(isBallUnlocked(prof, 'verity') && isBallUnlocked(prof, 'spider'), 'Verity & Spider must be starters');
  assert(!isBallUnlocked(prof, 'hydrogenbomb'), 'Hydrogen Bomb should start locked');

  // Draft pool filtering respects unlocked roster when allowedIds is provided
  const unlockedDraft = drawRandomBallChoices(3, rng, [], getUnlockedBallIds(prof));
  assert(
    unlockedDraft.length === 3 && unlockedDraft.every((b) => isBallUnlocked(prof, b.id)),
    'Filtered draft choices must all be from unlocked roster'
  );

  // Standard Capsule (75 Sparks) works on starter 100 Sparks balance and guarantees a NEW ball
  assert(CAPSULE_DEFS.length === 3, 'Expected 3 capsule tiers');
  const pull1 = openBallCapsule(prof, 'standard', rng);
  assert(pull1.ok && pull1.ball && prof.sparks === 25, 'Standard Capsule should cost 75 Sparks and unlock 1 new ball');
  assert(getUnlockedBallIds(prof).length === 21 && isBallUnlocked(prof, pull1.ball.id), 'Pulled ball must be unlocked');

  // Direct Unlock in Ball Dex
  prof.sparks = 500;
  const direct = unlockBallDirect(prof, 'hydrogenbomb');
  assert(direct.ok && direct.cost === 320 && prof.sparks === 180, 'Direct unlock Exclusive ball should cost 320 Sparks');
  assert(isBallUnlocked(prof, 'hydrogenbomb'), 'Hydrogen Bomb should now be unlocked');

  // Vault Capsule guarantees Mythic or Exclusive
  prof.sparks = 300;
  const vaultPull = openBallCapsule(prof, 'vault', rng);
  assert(
    vaultPull.ok && (vaultPull.ball.rarity === 'Mythic' || vaultPull.ball.rarity === 'Exclusive'),
    `Vault Capsule must drop Mythic or Exclusive (got ${vaultPull.ball?.rarity})`
  );

  // Gauntlet Boss Floor 5 & 10 grant FREE ball unlocks
  const beforeBoss = getUnlockedBallIds(prof).length;
  const f5 = recordCombatProgress(prof, {
    mode: MODES.GAUNTLET,
    teamSize: 2,
    usedBalls: ['verity', 'spider'],
    wonRound: true,
    gauntletFloor: 5,
    rng,
  });
  assert(f5.bossBallUnlock && getUnlockedBallIds(prof).length === beforeBoss + 1, 'Gauntlet Floor 5 clear must drop a free ball');
  const f10 = recordCombatProgress(prof, {
    mode: MODES.GAUNTLET,
    teamSize: 2,
    usedBalls: ['verity', 'spider'],
    wonRound: true,
    matchEnded: true,
    wonMatch: true,
    gauntletFloor: 10,
    gauntletCleared: true,
    rng,
  });
  assert(
    f10.bossBallUnlock &&
      (f10.bossBallUnlock.rarity === 'Mythic' || f10.bossBallUnlock.rarity === 'Exclusive'),
    'Gauntlet Floor 10 clear must drop a Mythic or Exclusive ball'
  );

  // Save code roundtrip preserves unlockedBalls
  const roundtrip = importProfileCode(exportProfileCode(prof));
  assert(
    roundtrip && roundtrip.unlockedBalls.length === prof.unlockedBalls.length && isBallUnlocked(roundtrip, 'hydrogenbomb'),
    'Save code roundtrip must preserve unlockedBalls'
  );
});

test('Gauntlet Towers (Citadel & Abyssal Void Spire) and 5 escalating Challenge Levels unlock progressively', () => {
  assert(GAUNTLET_TOWERS.length === 2, 'Expected 2 Gauntlet towers');
  assert(SPIRE_FLOORS.length === 10 && SPIRE_FLOORS[9].isBoss && SPIRE_FLOORS[9].teamSize === 2, 'Tower II must have 10 floors with 2v2 final boss');
  assert(CHALLENGE_LEVELS.length === 5, 'Expected 5 Challenge levels per tower');
  assert(getGauntletTower('spire').towerRewardMult > 1, 'Tower II should give higher reward multiplier');

  const rng = createSeededRng(2026);
  const prof = createDefaultProfile(rng);
  assert(isTowerUnlocked(prof, 'citadel') && !isTowerUnlocked(prof, 'spire'), 'Tower II must start locked until Tower I is cleared once');
  assert(getMaxUnlockedChallenge(prof, 'citadel') === 1 && getMaxUnlockedChallenge(prof, 'spire') === 0, 'Fresh profile should only allow Citadel Lv 1');

  // Clearing Citadel Lv 1 unlocks Challenge Lv 2 AND unlocks Abyssal Void Spire (Tower II) + First-Clear Sparks!
  const clearT1Lv1 = recordCombatProgress(prof, {
    mode: MODES.GAUNTLET,
    teamSize: 2,
    usedBalls: ['verity', 'spider'],
    wonRound: true,
    matchEnded: true,
    wonMatch: true,
    gauntletFloor: 10,
    gauntletCleared: true,
    towerId: 'citadel',
    challengeLevel: 1,
    rng,
  });
  assert(clearT1Lv1.towerUnlocked?.id === 'spire' && isTowerUnlocked(prof, 'spire'), 'Clearing Tower I Lv 1 must unlock Tower II (Spire)');
  assert(clearT1Lv1.challengeUnlocked?.level === 2 && getMaxUnlockedChallenge(prof, 'citadel') === 2, 'Clearing Citadel Lv 1 must unlock Lv 2');
  assert(clearT1Lv1.firstClearBonus === 100, `Expected 100 Sparks first-clear bonus on Citadel Lv 1 (got ${clearT1Lv1.firstClearBonus})`);
  assert(getMaxUnlockedChallenge(prof, 'spire') === 1, 'Newly unlocked Tower II must start at Challenge Lv 1');

  // Clearing Tower II progressively through Lv 1..5 unlocks Cyber Glitch trail & Lv 2..5
  for (let lv = 1; lv <= 5; lv++) {
    const res = recordCombatProgress(prof, {
      mode: MODES.GAUNTLET,
      teamSize: 2,
      usedBalls: ['verity', 'spider'],
      wonRound: true,
      matchEnded: true,
      wonMatch: true,
      gauntletFloor: 10,
      gauntletCleared: true,
      towerId: 'spire',
      challengeLevel: lv,
      rng,
    });
    assert(getTowerProgress(prof, 'spire').maxChallengeCleared === lv, `Spire maxChallengeCleared should advance to ${lv}`);
    if (lv < 5) assert(res.challengeUnlocked?.level === lv + 1, `Clearing Spire Lv ${lv} should unlock Lv ${lv + 1}`);
  }
  assert(prof.unlockedTrails.includes('glitch'), 'Clearing Tower II must unlock Cyber Glitch ball trail');

  // Physics bossDmgScale & bossRateScale apply strictly in MODES.GAUNTLET and are ignored in MODES.ONLINE
  const ch5 = getChallengeDef(5);
  const gSim = new ArenaSimulation({
    mode: MODES.GAUNTLET,
    hearts: 1,
    seed: 555,
    bossHpScale: ch5.enemyHpMult,
    bossDmgScale: ch5.enemyDmgMult,
    bossRateScale: ch5.enemyRateMult,
  });
  gSim.startMatch({
    mode: MODES.GAUNTLET,
    hearts: 1,
    bossHpScale: ch5.enemyHpMult,
    bossDmgScale: ch5.enemyDmgMult,
    bossRateScale: ch5.enemyRateMult,
    skipDraft: true,
  });
  gSim.setupAimPhase('verity', 'banana');
  gSim.launchRound(0, Math.PI);
  const gP1 = gSim.balls.find((b) => b.owner === 1);
  const gBoss = gSim.balls.find((b) => b.owner === 2);
  assert(gBoss.maxHp === 130, `Challenge Lv 5 boss should have 130 HP (got ${gBoss.maxHp})`);
  assert(Math.abs(gBoss.rateMult - ch5.enemyRateMult) < 1e-6, 'Challenge Lv 5 boss should scale rateMult');
  const dmgTaken = gSim.dealDamage(gP1, 10, 2, 'boss_test');
  assert(dmgTaken === 9, `Challenge Lv 5 boss (10 * 0.701 * 1.22) should deal 9 dmg (got ${dmgTaken})`);

  const oSim = new ArenaSimulation({
    mode: MODES.ONLINE,
    hearts: 1,
    seed: 556,
    bossHpScale: 2,
    bossDmgScale: 2,
    bossRateScale: 2,
  });
  oSim.startMatch({
    mode: MODES.ONLINE,
    hearts: 1,
    bossHpScale: 2,
    bossDmgScale: 2,
    bossRateScale: 2,
    skipDraft: true,
  });
  oSim.setupAimPhase('verity', 'banana');
  oSim.launchRound(0, Math.PI);
  const oP1 = oSim.balls.find((b) => b.owner === 1);
  const oP2 = oSim.balls.find((b) => b.owner === 2);
  const onlineDmg = oSim.dealDamage(oP1, 10, 2, 'pvp_test');
  assert(oP2.maxHp === 100 && oP2.rateMult === 1 && onlineDmg === 7, `ONLINE mode must ignore all Challenge scaling (hp=${oP2.maxHp}, dmg=${onlineDmg})`);

  // Save code roundtrip preserves towerProgress
  const imported = importProfileCode(exportProfileCode(prof));
  assert(
    imported && getTowerProgress(imported, 'spire').maxChallengeCleared === 5 && getTowerProgress(imported, 'citadel').maxChallengeCleared === 1,
    'Save code roundtrip must preserve towerProgress across both towers'
  );
});

test('24 Run Relics, Relic unlocking (Starter 8 -> Pods / Direct / Boss Drops), filtered draft & Floor 1 easing', () => {
  assert(GAUNTLET_RELICS.length === 24, `Expected 24 GAUNTLET_RELICS (got ${GAUNTLET_RELICS.length})`);
  assert(STARTER_RELIC_IDS.length === 8, `Expected 8 STARTER_RELIC_IDS (got ${STARTER_RELIC_IDS.length})`);

  // Floor 1 of both towers is softened for 0-relic opener
  const cF1 = getGauntletFloor(1, 'citadel');
  const sF1 = getGauntletFloor(1, 'spire');
  assert(cF1.bossHpScale < 0.9 && cF1.bossDmgScale < 1, 'Citadel Floor 1 should have softened HP and damage scales');
  assert(sF1.bossHpScale < 0.85 && sF1.bossDmgScale < 1, 'Spire Floor 1 should have softened HP and damage scales');

  // Fresh profile starts with 8 Starter Relics & draws only from owned pool
  const rng = createSeededRng(777);
  const prof = createDefaultProfile(rng);
  assert(getUnlockedRelicIds(prof).length === 8, 'Default profile must start with 8 starter relics');
  const starterSet = new Set(STARTER_RELIC_IDS);
  for (let i = 0; i < 6; i++) {
    const picks = drawRelicChoices([], 3, rng, getUnlockedRelicIds(prof));
    assert(picks.length === 3 && picks.every((r) => starterSet.has(r.id)), 'Filtered relic draft must only offer unlocked starter relics');
  }

  // Pull Modifier Capsules across all 3 tiers (zero duplicates + tier guarantees)
  assert(RELIC_CAPSULE_DEFS.length === 3, `Expected 3 RELIC_CAPSULE_DEFS tiers (got ${RELIC_CAPSULE_DEFS.length})`);
  prof.sparks = 600;
  const pod = openRelicPod(prof, rng);
  assert(pod.ok && pod.relic && !starterSet.has(pod.relic.id), 'Standard Modifier Capsule must unlock a non-starter locked relic');
  assert(prof.sparks === 600 - RELIC_POD_DEF.cost && getUnlockedRelicIds(prof).length === 9, 'Standard Modifier Capsule must deduct cost and increment unlockedRelics');

  const omegaCap = openRelicCapsule(prof, 'omega', rng);
  assert(
    omegaCap.ok && omegaCap.relic && (omegaCap.relic.rarity === 'Legendary' || omegaCap.relic.rarity === 'Mythic'),
    `Omega Modifier Vault must drop Legendary or Mythic (got ${omegaCap.relic?.rarity})`
  );

  // Direct unlock a specific locked relic (Twin Spark -> adds +1 draft reroll in Gauntlet)
  const targetId = isRelicUnlocked(prof, 'twin_spark') ? 'cleanse_orb' : 'twin_spark';
  const expectedCost = getRelicUnlockCost(targetId);
  const beforeSparks = prof.sparks;
  const dir = unlockRelicDirect(prof, targetId);
  assert(dir.ok && prof.sparks === beforeSparks - expectedCost && isRelicUnlocked(prof, targetId), 'Direct Relic unlock must deduct Sparks and unlock target relic');
  assert(getRelicExtraRerolls(['twin_spark']) === 1, 'Twin Spark relic must grant +1 reroll');

  // Gauntlet Boss Floor 5 grants a free Relic drop (until all 24 owned)
  const beforeBossRelicCount = getUnlockedRelicIds(prof).length;
  const f5Res = recordCombatProgress(prof, {
    mode: MODES.GAUNTLET,
    teamSize: 2,
    usedBalls: ['verity', 'spider'],
    wonRound: true,
    gauntletFloor: 5,
    rng,
  });
  assert(
    f5Res.bossRelicUnlock && getUnlockedRelicIds(prof).length === beforeBossRelicCount + 1,
    'Gauntlet Floor 5 clear must drop a FREE Run Relic'
  );

  // Physics checks: Utility/Skill modifiers leave Max HP at 100 while scaling hitbox/speed/rate cleanly in GAUNTLET only
  const nonHpRelics = [
    'overclocked', 'turbo_boost', 'golden_magnet', 'gyro_stabilizer',
    'kinetic_cushion', 'cleanse_orb', 'featherweight_dash', 'magnetic_core',
    'twin_spark', 'chrono_dampener',
  ];
  const gSim = new ArenaSimulation({
    mode: MODES.GAUNTLET,
    hearts: 1,
    seed: 901,
    runRelics: nonHpRelics,
  });
  gSim.startMatch({
    mode: MODES.GAUNTLET,
    hearts: 1,
    runRelics: nonHpRelics,
    skipDraft: true,
  });
  gSim.setupAimPhase('verity', 'bow');
  gSim.launchRound(0, Math.PI);
  const gP1 = gSim.balls.find((b) => b.owner === 1);
  const gBase = new ArenaSimulation({ mode: MODES.ONLINE, hearts: 1, seed: 901, runRelics: nonHpRelics });
  gBase.startMatch({ mode: MODES.ONLINE, hearts: 1, runRelics: nonHpRelics, skipDraft: true });
  gBase.setupAimPhase('verity', 'bow');
  gBase.launchRound(0, Math.PI);
  const oP1 = gBase.balls.find((b) => b.owner === 1);
  assert(gP1.maxHp === 100, `Utility/Speed/Cleanse modifiers must never inflate Max HP (got ${gP1.maxHp})`);
  assert(
    gP1.radius < oP1.radius && gP1.rateMult > oP1.rateMult,
    `Featherweight should shrink hitbox (${gP1.radius} < ${oP1.radius}) and Utility relics should boost rateMult (${gP1.rateMult} > ${oP1.rateMult}) in GAUNTLET only`
  );

  // Save code roundtrip preserves unlockedRelics
  const roundtrip = importProfileCode(exportProfileCode(prof));
  assert(
    roundtrip && roundtrip.unlockedRelics.length === prof.unlockedRelics.length && isRelicUnlocked(roundtrip, targetId),
    'Save code roundtrip must preserve unlockedRelics'
  );
});

let spiderWins = 0;
let verityWins = 0;
let draws = 0;
for (let s = 1; s <= 20; s++) {
  const sim = new ArenaSimulation({
    mode: MODES.SANDBOX,
    hearts: 1,
    suddenDeathStart: SUDDEN_DEATH_START_SEC,
    seed: s * 313,
  });
  sim.startMatch({ skipDraft: true });
  sim.setupAimPhase('verity', 'spider');
  sim.launchRound(
    chooseBotAimAngle(sim.balls[0], sim.balls[1], sim.rng),
    chooseBotAimAngle(sim.balls[1], sim.balls[0], sim.rng)
  );
  for (let t = 0; t < 3600 && sim.phase === PHASES.FIGHT; t++) sim.step(FIXED_DT);
  if (sim.roundWinner === 1) verityWins++;
  else if (sim.roundWinner === 2) spiderWins++;
  else draws++;
}
log(`All ${passed} tests passed! | Benchmark Verity vs Spider (20 matches): Spider=${spiderWins}, Verity=${verityWins}, Draws=${draws}`);
