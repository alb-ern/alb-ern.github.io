import {
  ARENA_SIZE,
  BASE_CONTACT_DMG,
  CONTACT_COOLDOWN_SEC,
  DEFAULT_HEARTS,
  FIXED_DT,
  MAX_BALL_SPEED,
  MIN_ARENA_SIZE,
  MIN_BALL_SPEED,
  MODES,
  PHASES,
  SUDDEN_DEATH_SHRINK_RATE,
  SUDDEN_DEATH_START_SEC,
} from './constants.js';
import { getBallDef } from './balls.js';
import { ABILITY_HANDLERS } from './abilities.js';
import { getBallTuning } from './balanceTuning.js';

export function createSeededRng(seed = Date.now()) {
  let s = seed >>> 0 || 123456789;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pointToSegmentDistSq(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const lenSq = vx * vx + vy * vy;
  if (lenSq <= 1e-6) {
    const dx = px - x1;
    const dy = py - y1;
    return dx * dx + dy * dy;
  }
  const t = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / lenSq));
  const cx = x1 + t * vx;
  const cy = y1 + t * vy;
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy;
}

export class ArenaSimulation {
  constructor(options = {}) {
    this.mode = options.mode || MODES.BOT;
    this.heartsToWin = options.hearts ?? DEFAULT_HEARTS;
    this.suddenDeathStart = options.suddenDeathStart ?? SUDDEN_DEATH_START_SEC;
    this.rng = options.rng || createSeededRng(options.seed ?? Date.now());
    this.speedMultiplier = options.speedMultiplier ?? 1;

    this.phase = PHASES.LOBBY;
    this.roundNumber = 0;
    this.hearts = { 1: this.heartsToWin, 2: this.heartsToWin };
    this.selectedBallIds = { 1: 'verity', 2: 'spider' };
    this.aimAngles = { 1: 0, 2: Math.PI };

    this.resetRoundEntities();
  }

  resetRoundEntities() {
    this.bounds = { left: 0, top: 0, right: ARENA_SIZE, bottom: ARENA_SIZE };
    this.roundTime = 0;
    this.suddenDeathActive = false;
    this.nextEntityId = 1;
    this.balls = [];
    this.hazards = [];
    this.projectiles = [];
    this.helpers = [];
    this.particles = [];
    this.floatingTexts = [];
    this.events = [];
    this.roundWinner = null; // 1, 2, or 0 for draw
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
  }

  startMatch(options = {}) {
    if (options.mode) this.mode = options.mode;
    if (options.hearts != null) this.heartsToWin = options.hearts;
    if (options.suddenDeathStart != null) this.suddenDeathStart = options.suddenDeathStart;
    if (options.speedMultiplier != null) this.speedMultiplier = options.speedMultiplier;

    this.roundNumber = 1;
    this.hearts = { 1: this.heartsToWin, 2: this.heartsToWin };
    this.resetRoundEntities();
    this.phase = options.skipDraft ? PHASES.AIM : PHASES.DRAFT;
  }

  setupAimPhase(ballId1, ballId2) {
    this.selectedBallIds[1] = ballId1;
    this.selectedBallIds[2] = ballId2;
    this.resetRoundEntities();

    const def1 = getBallDef(ballId1);
    const def2 = getBallDef(ballId2);
    const midY = ARENA_SIZE * 0.5;
    const x1 = ARENA_SIZE * 0.24;
    const x2 = ARENA_SIZE * 0.76;

    this.aimAngles[1] = 0;
    this.aimAngles[2] = Math.PI;

    this.balls = [
      this.createBallEntity({ owner: 1, def: def1, x: x1, y: midY, vx: 0, vy: 0 }),
      this.createBallEntity({ owner: 2, def: def2, x: x2, y: midY, vx: 0, vy: 0 }),
    ];
    this.phase = PHASES.AIM;
  }

  createBallEntity({
    owner,
    def,
    x,
    y,
    vx,
    vy,
    isSplitChild = false,
    generation = 0,
    hpOverride = null,
    radiusOverride = null,
    speedOverride = null,
    contactDmgOverride = null,
  }) {
    const tuning = getBallTuning(def.id);
    const speed = speedOverride ?? def.speed;
    const hp =
      hpOverride ??
      (def.id === 'cell' ? def.hp : Math.max(10, Math.round(def.hp * tuning.hpMult)));
    return {
      id: this.nextEntityId++,
      owner,
      ballId: def.id,
      name: def.name,
      rarity: def.rarity,
      x,
      y,
      vx,
      vy,
      lastDirX: owner === 1 ? 1 : -1,
      lastDirY: 0,
      radius: radiusOverride ?? def.radius,
      hp,
      maxHp: hp,
      baseSpeed: speed,
      rateMult: tuning.rateMult,
      contactDmg: contactDmgOverride ?? def.contactDmg ?? BASE_CONTACT_DMG,
      isSplitChild,
      generation,
      trappedCageId: null,
      cageBounceCd: 0,
      stunTimer: 0,
      slowTimer: 0,
      poisonTimer: 0,
      poisonTick: 0,
      poisonDmg: 0,
      poisonOwner: 0,
      _dmgCarry: 0,
      flashTimer: 0,
      contactCooldowns: {},
      trail: [],
      state: {},
    };
  }

  launchRound(angle1, angle2) {
    if (angle1 != null) this.aimAngles[1] = angle1;
    if (angle2 != null) this.aimAngles[2] = angle2;

    for (const ball of this.balls) {
      const a = this.aimAngles[ball.owner];
      ball.vx = Math.cos(a) * ball.baseSpeed;
      ball.vy = Math.sin(a) * ball.baseSpeed;
      ball.lastDirX = Math.cos(a);
      ball.lastDirY = Math.sin(a);
      const handler = ABILITY_HANDLERS[ball.ballId];
      if (handler && handler.onInit) {
        handler.onInit(this, ball);
      }
    }
    this.phase = PHASES.FIGHT;
    this.emitEvent('launch', {});
  }

  consumeEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  emitEvent(type, data) {
    this.events.push({ type, ...data });
  }

  emitText(x, y, text, color = '#ffffff') {
    this.floatingTexts.push({
      _fxId: this.nextEntityId++,
      x,
      y,
      vy: -42,
      text,
      color,
      ttl: 0.9,
      maxTtl: 0.9,
    });
  }

  addParticleBurst(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const a = this.rng() * Math.PI * 2;
      const sp = 55 + this.rng() * 170;
      this.particles.push({
        _fxId: this.nextEntityId++,
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        radius: 2 + this.rng() * 3,
        color,
        ttl: 0.35 + this.rng() * 0.25,
        maxTtl: 0.6,
      });
    }
  }

  triggerShake(intensity = 6, duration = 0.16) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  getEnemyBalls(owner) {
    return this.balls.filter((b) => b.owner !== owner && b.hp > 0);
  }

  getClosestEnemy(ball) {
    let best = null;
    let bestDistSq = Infinity;
    for (const other of this.balls) {
      if (other.owner === ball.owner || other.hp <= 0) continue;
      const dSq = (other.x - ball.x) ** 2 + (other.y - ball.y) ** 2;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = other;
      }
    }
    return best;
  }

  scaleBallSpeed(ball, factor) {
    ball.baseSpeed = Math.min(MAX_BALL_SPEED, Math.max(MIN_BALL_SPEED, ball.baseSpeed * factor));
    const cur = Math.hypot(ball.vx, ball.vy);
    if (cur > 1) {
      const next = Math.min(MAX_BALL_SPEED, cur * factor);
      ball.vx = (ball.vx / cur) * next;
      ball.vy = (ball.vy / cur) * next;
    }
  }

  addHazard(hazard, maxPerOwner = 10) {
    const sameKind = this.hazards.filter(
      (h) => h.owner === hazard.owner && h.kind === hazard.kind
    );
    if (sameKind.length >= maxPerOwner) {
      const oldest = sameKind[0];
      const idx = this.hazards.indexOf(oldest);
      if (idx !== -1) this.hazards.splice(idx, 1);
    }
    hazard.id = this.nextEntityId++;
    this.hazards.push(hazard);
  }

  addProjectile(proj) {
    proj.id = this.nextEntityId++;
    this.projectiles.push(proj);
  }

  addHelper(helper) {
    helper.id = this.nextEntityId++;
    this.helpers.push(helper);
  }

  spawnSplitBall(opts) {
    const def = getBallDef(opts.ballId);
    const child = this.createBallEntity({
      owner: opts.owner,
      def,
      x: opts.x,
      y: opts.y,
      vx: opts.vx,
      vy: opts.vy,
      isSplitChild: true,
      generation: opts.generation || 1,
      hpOverride: opts.hp,
      radiusOverride: opts.radius,
      speedOverride: opts.baseSpeed,
      contactDmgOverride: opts.contactDmg,
    });
    const handler = ABILITY_HANDLERS[child.ballId];
    if (handler && handler.onInit) {
      handler.onInit(this, child);
    }
    this.balls.push(child);
  }

  dealDamage(target, rawAmount, sourceOwner, reason = 'hit') {
    if (!target || target.hp <= 0) return 0;
    let amount = rawAmount;
    if (sourceOwner === 1 || sourceOwner === 2) {
      const sourceBallId = this.selectedBallIds[sourceOwner];
      if (sourceBallId) {
        const dmgMult = getBallTuning(sourceBallId).dmgMult;
        amount *= sourceBallId === 'vampire' ? Math.max(1, dmgMult) : dmgMult;
      }
    }
    const total = amount + (target._dmgCarry || 0);
    const dmg = Math.max(1, Math.round(total));
    target._dmgCarry = Math.max(-0.5, Math.min(0.5, total - dmg));
    target.hp = Math.max(0, target.hp - dmg);
    target.flashTimer = 0.12;
    this.emitText(
      target.x + (this.rng() - 0.5) * 18,
      target.y - target.radius - 4,
      `-${dmg}`,
      '#ef4444'
    );
    this.addParticleBurst(target.x, target.y, '#fca5a5', 5);
    if (reason === 'hit' || dmg >= 8) {
      this.triggerShake(Math.min(8, 2 + dmg * 0.35), 0.12);
    }
    this.emitEvent('damage', { targetOwner: target.owner, sourceOwner, amount: dmg, reason });

    const handler = ABILITY_HANDLERS[target.ballId];
    if (target.hp > 0 && handler && handler.onTakeDamage) {
      handler.onTakeDamage(this, target, dmg, sourceOwner);
    }
    if (target.hp <= 0 && !target._deathHandled) {
      target._deathHandled = true;
      this.addParticleBurst(target.x, target.y, '#ffffff', 16);
      this.triggerShake(9, 0.22);
      if (handler && handler.onDeath) {
        handler.onDeath(this, target);
      }
      // Mark helpers tied to this dead ball for cleanup after active loops
      for (const h of this.helpers) {
        if (h.parentId === target.id) h._dead = true;
      }
    }
    return dmg;
  }

  healBall(ball, amount) {
    if (!ball || ball.hp <= 0) return;
    const actual = Math.min(ball.maxHp - ball.hp, Math.round(amount));
    if (actual <= 0) return;
    ball.hp += actual;
    this.emitText(ball.x, ball.y - ball.radius - 8, `+${actual}`, '#4ade80');
    this.emitEvent('heal', { owner: ball.owner, amount: actual });
  }

  applyPoison(ball, dmgPerTick, ticks, sourceOwner = 0) {
    if (!ball || ball.hp <= 0) return;
    ball.poisonDmg = Math.max(ball.poisonDmg, dmgPerTick);
    ball.poisonTimer = Math.max(ball.poisonTimer, ticks * 0.55);
    if (sourceOwner) ball.poisonOwner = sourceOwner;
    if (ball.poisonTick <= 0) ball.poisonTick = 0.5;
  }

  step(dt = FIXED_DT) {
    this.updateFX(dt);
    if (this.phase !== PHASES.FIGHT) return;

    const simDt = dt;
    this.roundTime += simDt;

    // Sudden Death shrinking arena walls
    if (this.suddenDeathStart > 0 && this.roundTime >= this.suddenDeathStart) {
      if (!this.suddenDeathActive) {
        this.suddenDeathActive = true;
        this.emitText(ARENA_SIZE * 0.5, ARENA_SIZE * 0.22, 'SUDDEN DEATH!', '#f43f5e');
        this.emitEvent('suddenDeath', {});
      }
      const curWidth = this.bounds.right - this.bounds.left;
      if (curWidth > MIN_ARENA_SIZE) {
        const delta = Math.min(
          SUDDEN_DEATH_SHRINK_RATE * simDt,
          (curWidth - MIN_ARENA_SIZE) * 0.5
        );
        this.bounds.left += delta;
        this.bounds.right -= delta;
        this.bounds.top += delta;
        this.bounds.bottom -= delta;
      }
    }

    // 1. Update balls & abilities
    for (const ball of [...this.balls]) {
      if (ball.hp <= 0) continue;
      this.updateBallStatuses(ball, simDt);
      this.updateBallMovement(ball, simDt);
      const handler = ABILITY_HANDLERS[ball.ballId];
      if (handler && handler.onUpdate) {
        const rate = ball.ballId === 'cell' ? Math.max(1, ball.rateMult || 1) : (ball.rateMult || 1);
        handler.onUpdate(this, ball, simDt * rate);
      }
    }

    // 2. Ball-to-Ball elastic collisions
    this.resolveBallCollisions();

    // 3. Update & resolve Helpers (orbitals, blades, axe, forge orb)
    this.updateHelpers(simDt);

    // 4. Update & resolve Hazards
    this.updateHazards(simDt);

    // 5. Update & resolve Projectiles
    this.updateProjectiles(simDt);

    // 6. Remove dead balls and check win condition
    this.balls = this.balls.filter((b) => b.hp > 0);
    this.checkRoundOutcome();
  }

  updateFX(dt) {
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      if (this.shakeTimer === 0) this.shakeIntensity = 0;
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const f = this.floatingTexts[i];
      f.y += f.vy * dt;
      f.ttl -= dt;
      if (f.ttl <= 0) this.floatingTexts.splice(i, 1);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.ttl -= dt;
      if (p.ttl <= 0) this.particles.splice(i, 1);
    }
  }

  updateBallStatuses(ball, dt) {
    if (ball.flashTimer > 0) ball.flashTimer = Math.max(0, ball.flashTimer - dt);
    if (ball.stunTimer > 0) ball.stunTimer = Math.max(0, ball.stunTimer - dt);
    if (ball.slowTimer > 0) ball.slowTimer = Math.max(0, ball.slowTimer - dt);
    if (ball.cageBounceCd > 0) ball.cageBounceCd = Math.max(0, ball.cageBounceCd - dt);

    for (const key of Object.keys(ball.contactCooldowns)) {
      ball.contactCooldowns[key] -= dt;
      if (ball.contactCooldowns[key] <= 0) delete ball.contactCooldowns[key];
    }

    if (ball.poisonTimer > 0) {
      ball.poisonTimer -= dt;
      ball.poisonTick -= dt;
      if (ball.poisonTick <= 0) {
        ball.poisonTick = 0.55;
        this.dealDamage(ball, ball.poisonDmg || 2, ball.poisonOwner || 0, 'poison');
      }
    }
  }

  updateBallMovement(ball, dt) {
    if (ball.stunTimer > 0) {
      ball.vx = 0;
      ball.vy = 0;
      return;
    }

    const speedBoost = this.suddenDeathActive ? 1.15 : 1;
    const slowFactor = ball.slowTimer > 0 ? 0.65 : 1;
    const targetSpeed = Math.min(MAX_BALL_SPEED, ball.baseSpeed * speedBoost * slowFactor);

    let speed = Math.hypot(ball.vx, ball.vy);
    if (speed < 10) {
      ball.vx = ball.lastDirX * targetSpeed;
      ball.vy = ball.lastDirY * targetSpeed;
      speed = targetSpeed;
    } else {
      ball.lastDirX = ball.vx / speed;
      ball.lastDirY = ball.vy / speed;
      const nextSpeed = speed + (targetSpeed - speed) * Math.min(1, dt * 3.5);
      ball.vx = ball.lastDirX * nextSpeed;
      ball.vy = ball.lastDirY * nextSpeed;
    }

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 9) ball.trail.shift();

    // Shackles Ball inner cage wall reflection
    if (ball.trappedCageId) {
      const cage = this.hazards.find((h) => h.id === ball.trappedCageId && h.kind === 'shackle_cage');
      if (!cage) {
        ball.trappedCageId = null;
      } else {
        const dx = ball.x - cage.x;
        const dy = ball.y - cage.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const maxR = Math.max(8, cage.radius - ball.radius);
        if (dist >= maxR) {
          const nx = dx / dist;
          const ny = dy / dist;
          ball.x = cage.x + nx * maxR;
          ball.y = cage.y + ny * maxR;
          const vn = ball.vx * nx + ball.vy * ny;
          if (vn > 0) {
            ball.vx -= 2 * vn * nx;
            ball.vy -= 2 * vn * ny;
          }
          if (ball.cageBounceCd <= 0) {
            ball.cageBounceCd = 0.28;
            this.dealDamage(ball, cage.wallDmg, cage.owner, 'shackle');
            this.addParticleBurst(ball.x + nx * ball.radius, ball.y + ny * ball.radius, '#fb7185', 4);
          }
        }
      }
    }

    // Wall collisions against current arena bounds
    const b = this.bounds;
    const r = ball.radius;
    let wallHit = null;

    if (ball.x - r < b.left) {
      ball.x = b.left + r;
      ball.vx = Math.abs(ball.vx);
      wallHit = { x: b.left, y: ball.y, nx: 1, ny: 0 };
    } else if (ball.x + r > b.right) {
      ball.x = b.right - r;
      ball.vx = -Math.abs(ball.vx);
      wallHit = { x: b.right, y: ball.y, nx: -1, ny: 0 };
    }

    if (ball.y - r < b.top) {
      ball.y = b.top + r;
      ball.vy = Math.abs(ball.vy);
      wallHit = wallHit || { x: ball.x, y: b.top, nx: 0, ny: 1 };
    } else if (ball.y + r > b.bottom) {
      ball.y = b.bottom - r;
      ball.vy = -Math.abs(ball.vy);
      wallHit = wallHit || { x: ball.x, y: b.bottom, nx: 0, ny: -1 };
    }

    if (wallHit) {
      if (Math.abs(ball.vx) < 35) ball.vx += (ball.vx >= 0 ? 1 : -1) * 45;
      if (Math.abs(ball.vy) < 35) ball.vy += (ball.vy >= 0 ? 1 : -1) * 45;

      this.emitEvent('wall', { owner: ball.owner });
      this.addParticleBurst(wallHit.x, wallHit.y, '#e2e8f0', 4);
      const handler = ABILITY_HANDLERS[ball.ballId];
      if (handler && handler.onWallHit) {
        handler.onWallHit(this, ball, wallHit);
      }
    }
  }

  resolveBallCollisions() {
    for (let i = 0; i < this.balls.length; i++) {
      const a = this.balls[i];
      if (a.hp <= 0) continue;
      for (let j = i + 1; j < this.balls.length; j++) {
        const b = this.balls[j];
        if (b.hp <= 0) continue;

        // Skip bounce separation if one Vampire ball is actively latched onto the other
        if (a.state?.latchTargetId === b.id || b.state?.latchTargetId === a.id) {
          continue;
        }

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const minDist = a.radius + b.radius;
        const distSq = dx * dx + dy * dy;
        if (distSq >= minDist * minDist) continue;

        const dist = Math.sqrt(distSq) || 0.001;
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;

        a.x -= nx * (overlap * 0.5 + 0.5);
        a.y -= ny * (overlap * 0.5 + 0.5);
        b.x += nx * (overlap * 0.5 + 0.5);
        b.y += ny * (overlap * 0.5 + 0.5);

        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const velAlongNormal = rvx * nx + rvy * ny;
        if (velAlongNormal < 0) {
          const jImp = -velAlongNormal;
          a.vx -= jImp * nx;
          a.vy -= jImp * ny;
          b.vx += jImp * nx;
          b.vy += jImp * ny;
        } else {
          a.vx -= nx * 40;
          a.vy -= ny * 40;
          b.vx += nx * 40;
          b.vy += ny * 40;
        }

        if (a.owner !== b.owner && !a.contactCooldowns[b.id]) {
          a.contactCooldowns[b.id] = CONTACT_COOLDOWN_SEC;
          b.contactCooldowns[a.id] = CONTACT_COOLDOWN_SEC;

          const midX = (a.x + b.x) * 0.5;
          const midY = (a.y + b.y) * 0.5;
          this.addParticleBurst(midX, midY, '#fef08a', 6);
          this.emitEvent('clash', {});

          const dmgToB = a.contactDmg;
          const dmgToA = b.contactDmg;
          if (dmgToB > 0) this.dealDamage(b, dmgToB, a.owner, 'contact');
          if (dmgToA > 0) this.dealDamage(a, dmgToA, b.owner, 'contact');

          const hA = ABILITY_HANDLERS[a.ballId];
          const hB = ABILITY_HANDLERS[b.ballId];
          if (a.hp > 0 && b.hp > 0 && hA && hA.onBallHit) hA.onBallHit(this, a, b);
          if (a.hp > 0 && b.hp > 0 && hB && hB.onBallHit) hB.onBallHit(this, b, a);
        }
      }
    }
  }

  updateHelpers(dt) {
    for (const h of [...this.helpers]) {
      if (h._dead) continue;
      const parent = this.balls.find((b) => b.id === h.parentId && b.hp > 0);
      if (!parent) {
        h._dead = true;
        continue;
      }

      for (const k of Object.keys(h.hitCooldowns)) {
        h.hitCooldowns[k] -= dt;
        if (h.hitCooldowns[k] <= 0) delete h.hitCooldowns[k];
      }

      if (h.kind === 'forge_orb') {
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        const b = this.bounds;
        if (h.x - h.radius < b.left) { h.x = b.left + h.radius; h.vx = Math.abs(h.vx); }
        if (h.x + h.radius > b.right) { h.x = b.right - h.radius; h.vx = -Math.abs(h.vx); }
        if (h.y - h.radius < b.top) { h.y = b.top + h.radius; h.vy = Math.abs(h.vy); }
        if (h.y + h.radius > b.bottom) { h.y = b.bottom - h.radius; h.vy = -Math.abs(h.vy); }

        for (const enemy of this.getEnemyBalls(h.owner)) {
          if (h.hitCooldowns[enemy.id]) continue;
          const dist = Math.hypot(enemy.x - h.x, enemy.y - h.y);
          if (dist <= enemy.radius + h.radius) {
            h.hitCooldowns[enemy.id] = 0.38;
            this.dealDamage(enemy, h.dmg, h.owner, 'helper');
          }
        }
      } else {
        // Orbiting weapon helper (orbital, blade, axe)
        h.orbitAngle += h.angularSpeed * dt;
        h.x = parent.x + Math.cos(h.orbitAngle) * h.orbitRadius;
        h.y = parent.y + Math.sin(h.orbitAngle) * h.orbitRadius;

        for (const enemy of this.getEnemyBalls(h.owner)) {
          if (h.hitCooldowns[enemy.id]) continue;
          const dx = enemy.x - h.x;
          const dy = enemy.y - h.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= enemy.radius + h.hitRadius) {
            h.hitCooldowns[enemy.id] = 0.38;
            this.dealDamage(enemy, h.dmg, h.owner, 'orbit');
            if (h.knockback && dist > 0.01) {
              enemy.vx += (dx / dist) * h.knockback;
              enemy.vy += (dy / dist) * h.knockback;
            }
          }
        }
      }
    }
    this.helpers = this.helpers.filter((h) => !h._dead);
  }

  updateHazards(dt) {
    const b = this.bounds;
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.ttl -= dt;
      if (h.ttl <= 0) {
        this.hazards.splice(i, 1);
        continue;
      }

      if (h.kind === 'track') {
        const trackRate = getBallTuning(this.selectedBallIds[h.owner] || 'conductor').rateMult || 1;
        h.telegraph -= dt * trackRate;
        if (h.telegraph <= 0 && !h.fired) {
          h.fired = true;
          this.addProjectile({
            kind: 'train',
            owner: h.owner,
            x: h.x - h.dirX * 30,
            y: h.y - h.dirY * 30,
            vx: h.dirX * 920,
            vy: h.dirY * 920,
            radius: 28,
            dmg: 14,
            knockback: 380,
            bouncesLeft: 0,
            piercing: true,
            hitIds: {},
            ttl: 1.1,
            color: '#fb923c',
          });
          this.emitEvent('ability', { kind: 'train', owner: h.owner });
        }
        continue;
      }

      if (h.kind === 'ice_bomb') {
        h.fuse -= dt;
        if (h.fuse <= 0) {
          const base = this.rng() * Math.PI * 2;
          for (let k = 0; k < 8; k++) {
            const a = base + (k * Math.PI * 2) / 8;
            this.addProjectile({
              kind: 'ice_spike',
              owner: h.owner,
              x: h.x,
              y: h.y,
              vx: Math.cos(a) * 400,
              vy: Math.sin(a) * 400,
              radius: 13,
              dmg: 5,
              slowDuration: 1.25,
              bouncesLeft: 0,
              ttl: 1.5,
              color: '#bae6fd',
            });
          }
          this.addParticleBurst(h.x, h.y, '#e0f2fe', 12);
          this.emitEvent('ability', { kind: 'iceBurst', owner: h.owner });
          this.hazards.splice(i, 1);
        }
        continue;
      }

      if (h.kind === 'turret') {
        h.x = Math.max(b.left + 18, Math.min(b.right - 18, h.x));
        h.y = Math.max(b.top + 18, Math.min(b.bottom - 18, h.y));
        const turretRate = getBallTuning(this.selectedBallIds[h.owner] || 'cannon').rateMult || 1;
        h.fireTimer -= dt * turretRate;
        if (h.fireTimer <= 0) {
          h.fireTimer = h.fireRate;
          const enemy = this.balls.find((ball) => ball.owner !== h.owner && ball.hp > 0);
          if (enemy) {
            const a = Math.atan2(enemy.y - h.y, enemy.x - h.x);
            this.addProjectile({
              kind: 'cannonball',
              owner: h.owner,
              x: h.x + Math.cos(a) * 24,
              y: h.y + Math.sin(a) * 24,
              vx: Math.cos(a) * 450,
              vy: Math.sin(a) * 450,
              radius: 14,
              dmg: 5,
              bouncesLeft: 0,
              ttl: 1.9,
              color: '#94a3b8',
            });
          }
        }
        continue;
      }

      if (h.kind === 'shackle_cage') {
        if (h.armTimer > 0) {
          h.armTimer -= dt;
          continue;
        }
        for (const enemy of this.getEnemyBalls(h.owner)) {
          if (enemy.trappedCageId) continue;
          const dist = Math.hypot(enemy.x - h.x, enemy.y - h.y);
          if (dist <= h.radius - 10) {
            enemy.trappedCageId = h.id;
            this.emitText(enemy.x, enemy.y - enemy.radius - 10, 'SHACKLED!', '#fb7185');
            this.emitEvent('ability', { kind: 'shackleSnap', owner: h.owner });
          }
        }
        continue;
      }

      if (h.kind === 'web_line') {
        let broken = false;
        for (const enemy of this.getEnemyBalls(h.owner)) {
          const dSq = pointToSegmentDistSq(enemy.x, enemy.y, h.x1, h.y1, h.x2, h.y2);
          if (dSq <= (enemy.radius + 5) ** 2) {
            this.dealDamage(enemy, h.dmg, h.owner, 'web');
            if (h.slowDuration) {
              enemy.slowTimer = Math.max(enemy.slowTimer, h.slowDuration);
            }
            this.addParticleBurst(enemy.x, enemy.y, '#e2e8f0', 6);
            broken = true;
            break;
          }
        }
        if (broken) this.hazards.splice(i, 1);
        continue;
      }

      if (h.kind === 'laser_beam') {
        if (h.armTimer > 0) {
          h.armTimer -= dt;
          continue;
        }
        for (const k of Object.keys(h.tickTimers)) {
          h.tickTimers[k] -= dt;
          if (h.tickTimers[k] <= 0) delete h.tickTimers[k];
        }
        for (const enemy of this.getEnemyBalls(h.owner)) {
          if (h.tickTimers[enemy.id]) continue;
          const dSq = pointToSegmentDistSq(enemy.x, enemy.y, h.x1, h.y1, h.x2, h.y2);
          if (dSq <= (enemy.radius + 5) ** 2) {
            h.tickTimers[enemy.id] = h.tickRate;
            this.dealDamage(enemy, h.dmg, h.owner, 'laser');
          }
        }
        continue;
      }

      if (h.kind === 'plasma_blast') {
        for (const enemy of this.getEnemyBalls(h.owner)) {
          if (h.hitIds[enemy.id]) continue;
          const dSq = pointToSegmentDistSq(enemy.x, enemy.y, h.x1, h.y1, h.x2, h.y2);
          if (dSq <= (enemy.radius + 14) ** 2) {
            h.hitIds[enemy.id] = true;
            this.dealDamage(enemy, h.dmg, h.owner, 'beam');
          }
        }
        continue;
      }

      if (h.kind === 'red_zone') {
        for (const k of Object.keys(h.tickTimers)) {
          h.tickTimers[k] -= dt;
          if (h.tickTimers[k] <= 0) delete h.tickTimers[k];
        }
        for (const enemy of this.getEnemyBalls(h.owner)) {
          const dist = Math.hypot(enemy.x - h.x, enemy.y - h.y);
          if (dist <= enemy.radius + h.radius * 0.88) {
            if (!h.tickTimers[enemy.id]) {
              h.tickTimers[enemy.id] = h.tickRate;
              this.dealDamage(enemy, h.dmg, h.owner, 'zone');
            }
          }
        }
        continue;
      }

      if (h.kind === 'dice') {
        if (h.hitCooldown > 0) h.hitCooldown = Math.max(0, h.hitCooldown - dt);
        if (h.hitCooldown <= 0) {
          for (const enemy of this.getEnemyBalls(h.owner)) {
            const dist = Math.hypot(enemy.x - h.x, enemy.y - h.y);
            if (dist <= enemy.radius + h.radius) {
              h.hitCooldown = 0.55;
              const dmg = h.roll * (h.dmgPerPip || 1);
              this.dealDamage(enemy, dmg, h.owner, 'dice');
              this.emitText(h.x, h.y - 18, `ROLLED ${h.roll}!`, '#c084fc');
              h.roll = 1 + Math.floor(this.rng() * 6);
              break;
            }
          }
        }
        continue;
      }

      if (h.kind === 'poison_spike') {
        h.x = Math.max(b.left + 18, Math.min(b.right - 18, h.x));
        h.y = Math.max(b.top + 18, Math.min(b.bottom - 18, h.y));
        if (h.hitCooldown > 0) h.hitCooldown = Math.max(0, h.hitCooldown - dt);
        if (h.hitCooldown <= 0) {
          for (const enemy of this.getEnemyBalls(h.owner)) {
            const dist = Math.hypot(enemy.x - h.x, enemy.y - h.y);
            if (dist <= enemy.radius + h.radius) {
              h.hitCooldown = 0.65;
              this.dealDamage(enemy, h.dmg, h.owner, 'spike');
              this.applyPoison(enemy, 2, h.poisonTicks, h.owner);
              if (h.slowDuration) {
                enemy.slowTimer = Math.max(enemy.slowTimer, h.slowDuration);
              }
              break;
            }
          }
        }
      }
    }
  }

  updateProjectiles(dt) {
    const b = this.bounds;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.ttl -= dt;
      if (p.ttl <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.kind === 'bee') {
        const enemy = this.balls.find((ball) => ball.owner !== p.owner && ball.hp > 0);
        if (enemy) {
          const desired = Math.atan2(enemy.y - p.y, enemy.x - p.x);
          let cur = Math.atan2(p.vy, p.vx);
          let diff = desired - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          cur += Math.max(-p.turnRate * dt, Math.min(p.turnRate * dt, diff));
          p.vx = Math.cos(cur) * p.speed;
          p.vy = Math.sin(cur) * p.speed;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Wall interaction (harpoon bounces up to 2 times!)
      if (!p.piercing || p.bouncesLeft > 0) {
        let hitWall = false;
        if (p.x - p.radius < b.left || p.x + p.radius > b.right) {
          if (p.bouncesLeft > 0) {
            p.bouncesLeft -= 1;
            p.vx = -p.vx;
            p.x = Math.max(b.left + p.radius, Math.min(b.right - p.radius, p.x));
          } else {
            hitWall = true;
          }
        }
        if (p.y - p.radius < b.top || p.y + p.radius > b.bottom) {
          if (p.bouncesLeft > 0) {
            p.bouncesLeft -= 1;
            p.vy = -p.vy;
            p.y = Math.max(b.top + p.radius, Math.min(b.bottom - p.radius, p.y));
          } else {
            hitWall = true;
          }
        }
        if (hitWall && !p.piercing) {
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      // Harpoon continuous drag along bouncing projectile flight
      if (p.kind === 'harpoon' && p.dragTargetId) {
        const dragged = this.balls.find((ball) => ball.id === p.dragTargetId && ball.hp > 0);
        if (!dragged) {
          p.dragTargetId = null;
        } else {
          dragged.x = Math.max(b.left + dragged.radius, Math.min(b.right - dragged.radius, p.x));
          dragged.y = Math.max(b.top + dragged.radius, Math.min(b.bottom - dragged.radius, p.y));
          dragged.vx = p.vx * 0.7;
          dragged.vy = p.vy * 0.7;
          p.dragTick -= dt;
          if (p.dragTick <= 0) {
            p.dragTick = 0.25;
            this.dealDamage(dragged, p.dmg, p.owner, 'harpoon');
          }
        }
        continue;
      }

      // Enemy collision
      let consumed = false;
      for (const enemy of this.getEnemyBalls(p.owner)) {
        if (p.hitIds && p.hitIds[enemy.id]) continue;
        const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
        if (dist <= enemy.radius + p.radius) {
          if (p.hitIds) p.hitIds[enemy.id] = true;
          this.dealDamage(enemy, p.dmg, p.owner, p.kind);

          if (p.poisonTicks) {
            this.applyPoison(enemy, 2, p.poisonTicks, p.owner);
          }
          if (p.slowDuration) {
            enemy.slowTimer = Math.max(enemy.slowTimer, p.slowDuration);
          }
          if (p.knockback) {
            const pSp = Math.hypot(p.vx, p.vy) || 1;
            enemy.vx += (p.vx / pSp) * p.knockback;
            enemy.vy += (p.vy / pSp) * p.knockback;
          }
          if (p.kind === 'harpoon' && !p.dragTargetId) {
            p.dragTargetId = enemy.id;
            p.dragTick = 0.25;
            p.ttl = Math.min(p.ttl, 0.75);
            this.emitText(enemy.x, enemy.y - enemy.radius - 10, 'HOOKED!', '#38bdf8');
          }

          if (!p.piercing) {
            consumed = true;
            break;
          }
        }
      }
      if (consumed) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  checkRoundOutcome() {
    const p1Alive = this.balls.some((b) => b.owner === 1 && b.hp > 0);
    const p2Alive = this.balls.some((b) => b.owner === 2 && b.hp > 0);

    if (p1Alive && p2Alive) return;

    if (!p1Alive && !p2Alive) {
      this.roundWinner = 0; // Draw — no hearts lost
      this.phase = PHASES.ROUND_END;
      this.emitEvent('roundEnd', { winner: 0 });
      return;
    }

    const winner = p1Alive ? 1 : 2;
    const loser = winner === 1 ? 2 : 1;
    this.hearts[loser] = Math.max(0, this.hearts[loser] - 1);
    this.roundWinner = winner;

    if (this.hearts[loser] <= 0) {
      this.phase = PHASES.MATCH_END;
      this.emitEvent('matchEnd', { winner, loser });
    } else {
      this.phase = PHASES.ROUND_END;
      this.emitEvent('roundEnd', { winner, loser });
    }
  }
}
