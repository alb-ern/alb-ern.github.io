import { PHASES } from '../sim/constants.js';

export function encodeSnapshot(sim, pendingEvents = [], fxWatermark = { lastId: 0 }) {
  const newTexts = [];
  for (const f of sim.floatingTexts) {
    if ((f._fxId || 0) > fxWatermark.lastId) {
      newTexts.push({
        x: Math.round(f.x),
        y: Math.round(f.y),
        vy: f.vy,
        text: f.text,
        color: f.color,
        ttl: f.ttl,
        maxTtl: f.maxTtl,
      });
    }
  }

  const newParticles = [];
  for (const p of sim.particles) {
    if ((p._fxId || 0) > fxWatermark.lastId) {
      newParticles.push({
        x: Math.round(p.x),
        y: Math.round(p.y),
        vx: Math.round(p.vx),
        vy: Math.round(p.vy),
        radius: p.radius,
        color: p.color,
        ttl: p.ttl,
        maxTtl: p.maxTtl,
      });
    }
  }

  let maxSeen = fxWatermark.lastId;
  for (const f of sim.floatingTexts) maxSeen = Math.max(maxSeen, f._fxId || 0);
  for (const p of sim.particles) maxSeen = Math.max(maxSeen, p._fxId || 0);
  fxWatermark.lastId = maxSeen;

  return {
    type: 'snap',
    phase: sim.phase,
    roundNumber: sim.roundNumber,
    roundTime: Number(sim.roundTime.toFixed(3)),
    suddenDeathActive: sim.suddenDeathActive,
    suddenDeathStart: sim.suddenDeathStart,
    roundWinner: sim.roundWinner,
    hearts: { ...sim.hearts },
    heartsToWin: sim.heartsToWin,
    selectedBallIds: { ...sim.selectedBallIds },
    bounds: { ...sim.bounds },
    shakeTimer: sim.shakeTimer,
    shakeIntensity: sim.shakeIntensity,
    balls: sim.balls.map((b) => ({
      id: b.id,
      owner: b.owner,
      ballId: b.ballId,
      name: b.name,
      rarity: b.rarity,
      x: Math.round(b.x * 10) / 10,
      y: Math.round(b.y * 10) / 10,
      vx: Math.round(b.vx * 10) / 10,
      vy: Math.round(b.vy * 10) / 10,
      radius: Math.round(b.radius * 10) / 10,
      hp: Math.round(b.hp * 10) / 10,
      maxHp: b.maxHp,
      flashTimer: b.flashTimer,
      stunTimer: b.stunTimer,
      slowTimer: b.slowTimer,
      poisonTimer: b.poisonTimer,
      dashTimer: b.dashTimer,
      hookSpinTimer: b.hookSpinTimer,
      tail: b.tail && b.tail.length ? b.tail.map((s) => ({ x: Math.round(s.x), y: Math.round(s.y), r: s.r })) : [],
      state: {
        stage: b.state?.stage,
        cur: b.state?.cur,
        mature: b.state?.mature,
        latchTargetId: b.state?.latchTargetId,
        locking: b.state?.locking,
        lockAngle: b.state?.lockAngle,
        phase: b.state?.phase,
        mode: b.state?.mode,
        charge: b.state?.charge,
      },
    })),
    hazards: sim.hazards.map((h) => ({
      id: h.id,
      kind: h.kind,
      variant: h.variant,
      owner: h.owner,
      x: h.x,
      y: h.y,
      x1: h.x1,
      y1: h.y1,
      x2: h.x2,
      y2: h.y2,
      nx: h.nx,
      ny: h.ny,
      radius: h.radius,
      blastRadius: h.blastRadius,
      fuse: h.fuse,
      roll: h.roll,
      armTimer: h.armTimer,
      telegraph: h.telegraph,
      horizontal: h.horizontal,
      ttl: h.ttl,
    })),
    projectiles: sim.projectiles.map((p) => ({
      id: p.id,
      kind: p.kind,
      piece: p.piece,
      owner: p.owner,
      parentId: p.parentId,
      x: Math.round(p.x * 10) / 10,
      y: Math.round(p.y * 10) / 10,
      vx: Math.round(p.vx * 10) / 10,
      vy: Math.round(p.vy * 10) / 10,
      radius: p.radius,
      color: p.color,
    })),
    helpers: sim.helpers.map((h) => ({
      id: h.id,
      kind: h.kind,
      parentId: h.parentId,
      x: Math.round(h.x * 10) / 10,
      y: Math.round(h.y * 10) / 10,
      orbitAngle: h.orbitAngle,
      orbitRadius: h.orbitRadius,
      hitRadius: h.hitRadius,
      radius: h.radius,
      dmg: h.dmg,
    })),
    texts: newTexts,
    particles: newParticles,
    events: pendingEvents,
  };
}

export function applySnapshot(mirrorSim, snap) {
  const prevTrails = new Map();
  for (const b of mirrorSim.balls) {
    prevTrails.set(b.id, b.trail || []);
  }

  mirrorSim.phase = snap.phase;
  mirrorSim.roundNumber = snap.roundNumber;
  mirrorSim.roundTime = snap.roundTime;
  mirrorSim.suddenDeathActive = snap.suddenDeathActive;
  mirrorSim.suddenDeathStart = snap.suddenDeathStart;
  mirrorSim.roundWinner = snap.roundWinner;
  mirrorSim.hearts = { ...snap.hearts };
  mirrorSim.heartsToWin = snap.heartsToWin;
  mirrorSim.selectedBallIds = { ...snap.selectedBallIds };
  mirrorSim.bounds = { ...snap.bounds };
  mirrorSim.shakeTimer = Math.max(mirrorSim.shakeTimer || 0, snap.shakeTimer || 0);
  mirrorSim.shakeIntensity = Math.max(mirrorSim.shakeIntensity || 0, snap.shakeIntensity || 0);

  mirrorSim.balls = snap.balls.map((b) => {
    const trail = prevTrails.get(b.id) || [];
    trail.push({ x: b.x, y: b.y });
    if (trail.length > 9) trail.shift();
    return { ...b, trail };
  });

  mirrorSim.hazards = snap.hazards;
  mirrorSim.projectiles = snap.projectiles;
  mirrorSim.helpers = snap.helpers;

  if (snap.texts && snap.texts.length) {
    mirrorSim.floatingTexts.push(...snap.texts);
  }
  if (snap.particles && snap.particles.length) {
    mirrorSim.particles.push(...snap.particles);
  }
}

export function stepMirrorVisuals(mirrorSim, dt) {
  mirrorSim.updateFX(dt);
  if (mirrorSim.phase !== PHASES.FIGHT) return;

  // Light dead-reckoning between 30Hz host snapshots so 60fps canvas stays silky smooth
  const b = mirrorSim.bounds;
  for (const ball of mirrorSim.balls) {
    if (ball.stunTimer > 0) continue;
    ball.x = Math.max(b.left + ball.radius, Math.min(b.right - ball.radius, ball.x + ball.vx * dt));
    ball.y = Math.max(b.top + ball.radius, Math.min(b.bottom - ball.radius, ball.y + ball.vy * dt));
  }
  for (const p of mirrorSim.projectiles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}
