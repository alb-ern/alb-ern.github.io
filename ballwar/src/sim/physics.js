import {
  ARENA_SIZE,
  ARENA_SIZE_2V2,
  BASE_CONTACT_DMG,
  CONTACT_COOLDOWN_SEC,
  DEFAULT_HEARTS,
  FIXED_DT,
  MAX_BALL_SPEED,
  MAX_TEAM_BALLS,
  MIN_ARENA_SIZE,
  MIN_ARENA_SIZE_2V2,
  MIN_BALL_SPEED,
  MODES,
  PHASES,
  SUDDEN_DEATH_SHRINK_RATE,
  SUDDEN_DEATH_START_SEC,
} from './constants.js';
import { getBallDef } from './balls.js';
import { ABILITY_HANDLERS } from './abilities.js';
import { getBallTuning } from './balanceTuning.js';
import {
  applyRelicsOnBallHit,
  applyRelicsOnBeforeDeath,
  applyRelicsOnDamagePrevent,
  applyRelicsOnInit,
  applyRelicsOnTakeDamage,
  applyRelicsOnUpdate,
  applyRelicsOnWallHit,
  getRelicDmgMult,
} from './gauntlet.js';

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
    this.teamSize = options.teamSize === 2 ? 2 : 1;
    this.arenaSize = this.teamSize === 2 ? ARENA_SIZE_2V2 : ARENA_SIZE;
    this.minArenaSize = this.teamSize === 2 ? MIN_ARENA_SIZE_2V2 : MIN_ARENA_SIZE;
    this.heartsToWin = options.hearts ?? DEFAULT_HEARTS;
    this.suddenDeathStart = options.suddenDeathStart ?? SUDDEN_DEATH_START_SEC;
    this.rng = options.rng || createSeededRng(options.seed ?? Date.now());
    this.speedMultiplier = options.speedMultiplier ?? 1;
    this.headless = Boolean(options.headless);

    this.phase = PHASES.LOBBY;
    this.roundNumber = 0;
    this.hearts = { 1: this.heartsToWin, 2: this.heartsToWin };
    this.selectedTeams = { 1: ['verity'], 2: ['spider'] };
    this.selectedBallIds = { 1: 'verity', 2: 'spider' };
    this.teamAimAngles = { 1: [0, 0], 2: [Math.PI, Math.PI] };
    this.aimAngles = { 1: 0, 2: Math.PI };
    this._actingBallId = null;
    this._actingEntityId = null;
    this.runRelics = Array.isArray(options.runRelics) ? [...options.runRelics] : [];
    this.bossHpScale = options.bossHpScale ?? 1;
    this.bossDmgScale = options.bossDmgScale ?? 1;
    this.bossRateScale = options.bossRateScale ?? 1;

    this.resetRoundEntities();
  }

  setTeamSize(teamSize) {
    this.teamSize = teamSize === 2 ? 2 : 1;
    this.arenaSize = this.teamSize === 2 ? ARENA_SIZE_2V2 : ARENA_SIZE;
    this.minArenaSize = this.teamSize === 2 ? MIN_ARENA_SIZE_2V2 : MIN_ARENA_SIZE;
  }

  resetRoundEntities() {
    this.bounds = { left: 0, top: 0, right: this.arenaSize, bottom: this.arenaSize };
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
    this._actingBallId = null;
    this._actingEntityId = null;
    this.roundStats = { dmgDealt: { 1: 0, 2: 0 }, wallHits: { 1: 0, 2: 0 } };
  }

  startMatch(options = {}) {
    if (options.mode) this.mode = options.mode;
    if (options.teamSize != null) this.setTeamSize(options.teamSize);
    if (options.hearts != null) this.heartsToWin = options.hearts;
    if (options.suddenDeathStart != null) this.suddenDeathStart = options.suddenDeathStart;
    if (options.speedMultiplier != null) this.speedMultiplier = options.speedMultiplier;
    this.runRelics =
      this.mode === MODES.GAUNTLET && Array.isArray(options.runRelics) ? [...options.runRelics] : [];
    this.bossHpScale = this.mode === MODES.GAUNTLET && options.bossHpScale != null ? options.bossHpScale : 1;
    this.bossDmgScale = this.mode === MODES.GAUNTLET && options.bossDmgScale != null ? options.bossDmgScale : 1;
    this.bossRateScale = this.mode === MODES.GAUNTLET && options.bossRateScale != null ? options.bossRateScale : 1;

    this.roundNumber = 1;
    this.hearts = { 1: this.heartsToWin, 2: this.heartsToWin };
    this.resetRoundEntities();
    this.phase = options.skipDraft ? PHASES.AIM : PHASES.DRAFT;
  }

  setupAimPhase(teamOrId1, teamOrId2) {
    const list1 = (Array.isArray(teamOrId1) ? teamOrId1 : [teamOrId1]).filter(Boolean);
    const list2 = (Array.isArray(teamOrId2) ? teamOrId2 : [teamOrId2]).filter(Boolean);
    const inferredTeamSize = Math.max(list1.length, list2.length) >= 2 ? 2 : 1;
    this.setTeamSize(inferredTeamSize);

    this.selectedTeams = { 1: [...list1], 2: [...list2] };
    this.selectedBallIds[1] = list1[0];
    this.selectedBallIds[2] = list2[0];
    this.resetRoundEntities();

    const sz = this.arenaSize;
    this.aimAngles[1] = 0;
    this.aimAngles[2] = Math.PI;
    this.teamAimAngles[1] = list1.map(() => 0);
    this.teamAimAngles[2] = list2.map(() => Math.PI);

    const spawnList = (list, owner) => {
      const x = owner === 1 ? sz * (list.length > 1 ? 0.22 : 0.24) : sz * (list.length > 1 ? 0.78 : 0.76);
      const yOffsets = list.length > 1 ? [sz * 0.31, sz * 0.69] : [sz * 0.5];
      return list.map((ballId, idx) =>
        this.createBallEntity({
          owner,
          slotIndex: idx,
          def: getBallDef(ballId),
          x,
          y: yOffsets[idx % yOffsets.length],
          vx: 0,
          vy: 0,
        })
      );
    };

    this.balls = [...spawnList(list1, 1), ...spawnList(list2, 2)];
    this.phase = PHASES.AIM;
  }

  createBallEntity({
    owner,
    slotIndex = 0,
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
    const baseHp =
      hpOverride ??
      (['cell', 'berserker', 'micro', 'coughingbaby'].includes(def.id)
        ? def.hp
        : Math.max(10, Math.round(def.hp * tuning.hpMult)));
    const hp =
      this.mode === MODES.GAUNTLET && owner === 2 && !isSplitChild && this.bossHpScale !== 1
        ? Math.max(15, Math.round(baseHp * this.bossHpScale))
        : baseHp;
    return {
      id: this.nextEntityId++,
      owner,
      slotIndex,
      ballId: def.id,
      name: def.name,
      rarity: def.rarity,
      aimAngle: owner === 1 ? 0 : Math.PI,
      x,
      y,
      vx,
      vy,
      lastDirX: owner === 1 ? 1 : -1,
      lastDirY: 0,
      radius: radiusOverride ?? def.radius,
      mass: def.mass ?? 1,
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
      phaseTimer: 0,
      chillStacks: 0,
      chillDecay: 0,
      shieldAngle: 0,
      shieldHalfWidth: 0,
      reflectProj: false,
      steerRate: 0,
      teleportCd: 0,
      customSpeedCap: 0,
      wallSlamBonusTimer: 0,
      wallSlamOwner: 0,
      poisonTimer: 0,
      poisonTick: 0,
      poisonDmg: 0,
      poisonOwner: 0,
      poisonBallId: null,
      dashTimer: 0,
      hookSpinTimer: 0,
      virusStacks: 0,
      _dmgCarry: 0,
      _burnCarry: 0,
      flashTimer: 0,
      contactCooldowns: {},
      trail: [],
      tail: [],
      state: {},
    };
  }

  launchRound(angle1, angle2) {
    if (Array.isArray(angle1)) {
      this.teamAimAngles[1] = [...angle1];
      if (angle1[0] != null) this.aimAngles[1] = angle1[0];
    } else if (angle1 != null) {
      this.aimAngles[1] = angle1;
      this.teamAimAngles[1] = this.teamSize === 2 ? [angle1, angle1] : [angle1];
    }
    if (Array.isArray(angle2)) {
      this.teamAimAngles[2] = [...angle2];
      if (angle2[0] != null) this.aimAngles[2] = angle2[0];
    } else if (angle2 != null) {
      this.aimAngles[2] = angle2;
      this.teamAimAngles[2] = this.teamSize === 2 ? [angle2, angle2] : [angle2];
    }

    for (const ball of this.balls) {
      const slot = ball.slotIndex ?? 0;
      const teamAngles = this.teamAimAngles[ball.owner];
      const a =
        teamAngles && teamAngles[slot] != null
          ? teamAngles[slot]
          : ball.aimAngle ?? this.aimAngles[ball.owner];
      ball.aimAngle = a;
      ball.vx = Math.cos(a) * ball.baseSpeed;
      ball.vy = Math.sin(a) * ball.baseSpeed;
      ball.lastDirX = Math.cos(a);
      ball.lastDirY = Math.sin(a);
      const handler = ABILITY_HANDLERS[ball.ballId];
      if (handler && handler.onInit) {
        this._actingBallId = ball.ballId;
        this._actingEntityId = ball.id;
        try {
          handler.onInit(this, ball);
        } finally {
          this._actingBallId = null;
          this._actingEntityId = null;
        }
      }
      if (this.mode === MODES.GAUNTLET && this.runRelics.length > 0 && ball.owner === 1) {
        applyRelicsOnInit(this, ball, this.runRelics);
      }
      if (this.mode === MODES.GAUNTLET && ball.owner === 2 && this.bossRateScale !== 1) {
        ball.rateMult = (ball.rateMult || 1) * this.bossRateScale;
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
    if (this.headless) return;
    this.events.push({ type, ...data });
  }

  emitText(x, y, text, color = '#ffffff') {
    if (this.headless) return;
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
    if (this.headless) return;
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
    if (this.headless) return;
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
    const maxCap = Math.max(MAX_BALL_SPEED, ball.customSpeedCap || 0);
    ball.baseSpeed = Math.min(maxCap, Math.max(MIN_BALL_SPEED, ball.baseSpeed * factor));
    const cur = Math.hypot(ball.vx, ball.vy);
    if (cur > 1) {
      const next = Math.min(maxCap, cur * factor);
      ball.vx = (ball.vx / cur) * next;
      ball.vy = (ball.vy / cur) * next;
    }
  }

  addHazard(hazard, maxPerOwner = 10) {
    if (!hazard.sourceBallId && this._actingBallId) hazard.sourceBallId = this._actingBallId;
    if (!hazard.sourceEntityId && this._actingEntityId) hazard.sourceEntityId = this._actingEntityId;
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
    if (!proj.sourceBallId && this._actingBallId) proj.sourceBallId = this._actingBallId;
    if (!proj.sourceEntityId && this._actingEntityId) proj.sourceEntityId = this._actingEntityId;
    proj.id = this.nextEntityId++;
    this.projectiles.push(proj);
  }

  addHelper(helper) {
    if (!helper.sourceBallId && this._actingBallId) helper.sourceBallId = this._actingBallId;
    if (!helper.sourceEntityId && this._actingEntityId) helper.sourceEntityId = this._actingEntityId;
    helper.id = this.nextEntityId++;
    this.helpers.push(helper);
  }

  spawnSplitBall(opts) {
    let activeTeam = 0;
    for (const b of this.balls) {
      if (b.owner === opts.owner && b.hp > 0) activeTeam++;
    }
    if (activeTeam >= MAX_TEAM_BALLS * this.teamSize) return null;

    const def = getBallDef(opts.ballId);
    const child = this.createBallEntity({
      owner: opts.owner,
      slotIndex: opts.slotIndex ?? 0,
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
    if (opts.mass != null) child.mass = opts.mass;
    const handler = ABILITY_HANDLERS[child.ballId];
    if (handler && handler.onInit && !opts.skipInit) {
      const prevBall = this._actingBallId;
      const prevEnt = this._actingEntityId;
      this._actingBallId = child.ballId;
      this._actingEntityId = child.id;
      try {
        handler.onInit(this, child);
      } finally {
        this._actingBallId = prevBall;
        this._actingEntityId = prevEnt;
      }
    }
    if (opts.state) {
      Object.assign(child.state, opts.state);
    }
    this.balls.push(child);
    return child;
  }

  dealDamage(target, rawAmount, sourceOwner, reason = 'hit', sourceBallId = null) {
    if (!target || target.hp <= 0) return 0;
    let amount = rawAmount;
    if (sourceOwner === 1 || sourceOwner === 2) {
      const resolvedBallId = sourceBallId || this._actingBallId || this.selectedBallIds[sourceOwner];
      if (resolvedBallId) {
        const dmgMult = getBallTuning(resolvedBallId).dmgMult;
        amount *= resolvedBallId === 'vampire' ? Math.max(1, dmgMult) : dmgMult;
      }
      if (this.mode === MODES.GAUNTLET && sourceOwner === 1 && this.runRelics.length > 0) {
        amount *= getRelicDmgMult(this.runRelics);
      }
      if (this.mode === MODES.GAUNTLET && sourceOwner === 2 && this.bossDmgScale !== 1) {
        amount *= this.bossDmgScale;
      }
    }
    const targetHandler = ABILITY_HANDLERS[target.ballId];
    if (targetHandler && targetHandler.onDamagePrevent) {
      amount = targetHandler.onDamagePrevent(this, target, amount, sourceOwner, reason);
      if (!(amount > 0)) return 0;
    }
    if (this.mode === MODES.GAUNTLET && target.owner === 1 && this.runRelics.length > 0) {
      amount = applyRelicsOnDamagePrevent(this, target, amount);
      if (!(amount > 0)) return 0;
    }

    const total = amount + (target._dmgCarry || 0);
    const dmg = Math.max(1, Math.round(total));
    target._dmgCarry = Math.max(-0.5, Math.min(0.5, total - dmg));
    target.hp = Math.max(0, target.hp - dmg);
    if ((sourceOwner === 1 || sourceOwner === 2) && target.owner !== sourceOwner && this.roundStats) {
      this.roundStats.dmgDealt[sourceOwner] += dmg;
    }
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

    const prevBall = this._actingBallId;
    const prevEnt = this._actingEntityId;
    this._actingBallId = target.ballId;
    this._actingEntityId = target.id;
    try {
      if (target.hp > 0 && targetHandler && targetHandler.onTakeDamage) {
        targetHandler.onTakeDamage(this, target, dmg, sourceOwner);
      }
      if (target.hp > 0 && this.mode === MODES.GAUNTLET && target.owner === 1 && this.runRelics.length > 0) {
        applyRelicsOnTakeDamage(this, target, dmg, sourceOwner, this.runRelics, reason);
      }
      if (target.hp <= 0 && !target._deathHandled) {
        if (targetHandler && targetHandler.onBeforeDeath && targetHandler.onBeforeDeath(this, target)) {
          return dmg;
        }
        if (
          this.mode === MODES.GAUNTLET &&
          target.owner === 1 &&
          this.runRelics.length > 0 &&
          applyRelicsOnBeforeDeath(this, target)
        ) {
          return dmg;
        }
        target._deathHandled = true;
        this.addParticleBurst(target.x, target.y, '#ffffff', 16);
        this.triggerShake(9, 0.22);
        if (targetHandler && targetHandler.onDeath) {
          targetHandler.onDeath(this, target);
        }
        for (const h of this.helpers) {
          if (h.parentId === target.id) h._dead = true;
        }
      }
    } finally {
      this._actingBallId = prevBall;
      this._actingEntityId = prevEnt;
    }
    return dmg;
  }

  applySelfBurn(ball, rawAmount) {
    if (!ball || ball.hp <= 1) return 0;
    const total = rawAmount + (ball._burnCarry || 0);
    const dmg = Math.min(ball.hp - 1, Math.floor(total));
    ball._burnCarry = total - dmg;
    if (dmg <= 0) return 0;
    ball.hp -= dmg;
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

  applyPoison(ball, dmgPerTick, ticks, sourceOwner = 0, sourceBallId = null) {
    if (!ball || ball.hp <= 0) return;
    ball.poisonDmg = Math.max(ball.poisonDmg, dmgPerTick);
    ball.poisonTimer = Math.max(ball.poisonTimer, ticks * 0.55);
    if (sourceOwner) ball.poisonOwner = sourceOwner;
    const resolvedBall = sourceBallId || this._actingBallId || (sourceOwner ? this.selectedBallIds[sourceOwner] : null);
    if (resolvedBall) ball.poisonBallId = resolvedBall;
    if (ball.poisonTick <= 0) ball.poisonTick = 0.5;
  }

  applyChill(ball, stacks = 1, sourceOwner = 0, sourceBallId = null) {
    if (!ball || ball.hp <= 0 || ball.phaseTimer > 0) return;
    ball.chillStacks = (ball.chillStacks || 0) + stacks;
    ball.chillDecay = 2.6;
    ball.slowTimer = Math.max(ball.slowTimer, 0.55);
    if (ball.chillStacks >= 4) {
      ball.chillStacks = 0;
      ball.stunTimer = Math.max(ball.stunTimer, 0.85);
      this.dealDamage(ball, 7, sourceOwner, 'freeze', sourceBallId || this._actingBallId || null);
      this.emitText(ball.x, ball.y - ball.radius - 12, 'FROZEN!', '#7dd3fc');
      this.addParticleBurst(ball.x, ball.y, '#bae6fd', 12);
    }
  }

  step(dt = FIXED_DT) {
    if (!this.headless) this.updateFX(dt);
    if (this.phase !== PHASES.FIGHT) return;

    const simDt = dt;
    this.roundTime += simDt;

    // Sudden Death shrinking arena walls
    if (this.suddenDeathStart > 0 && this.roundTime >= this.suddenDeathStart) {
      if (!this.suddenDeathActive) {
        this.suddenDeathActive = true;
        this.emitText(this.arenaSize * 0.5, this.arenaSize * 0.22, 'SUDDEN DEATH!', '#f43f5e');
        this.emitEvent('suddenDeath', {});
      }
      const curWidth = this.bounds.right - this.bounds.left;
      if (curWidth > this.minArenaSize) {
        const delta = Math.min(
          SUDDEN_DEATH_SHRINK_RATE * simDt,
          (curWidth - this.minArenaSize) * 0.5
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
        this._actingBallId = ball.ballId;
        this._actingEntityId = ball.id;
        try {
          handler.onUpdate(this, ball, simDt * rate);
        } finally {
          this._actingBallId = null;
          this._actingEntityId = null;
        }
      }
      if (this.mode === MODES.GAUNTLET && this.runRelics.length > 0 && ball.owner === 1) {
        applyRelicsOnUpdate(this, ball, simDt, this.runRelics);
      }
    }

    // 2. Update & resolve Helpers before rebound so nose weapons strike head-on
    this.updateHelpers(simDt);

    // 3. Ball-to-Ball elastic collisions
    this.resolveBallCollisions();

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
    if (ball.phaseTimer > 0) ball.phaseTimer = Math.max(0, ball.phaseTimer - dt);
    if (ball.teleportCd > 0) ball.teleportCd = Math.max(0, ball.teleportCd - dt);
    if (ball.wallSlamBonusTimer > 0) ball.wallSlamBonusTimer = Math.max(0, ball.wallSlamBonusTimer - dt);
    if (ball.dashTimer > 0) ball.dashTimer = Math.max(0, ball.dashTimer - dt);
    if (ball.hookSpinTimer > 0) ball.hookSpinTimer = Math.max(0, ball.hookSpinTimer - dt);
    if (ball.cageBounceCd > 0) ball.cageBounceCd = Math.max(0, ball.cageBounceCd - dt);
    if (ball.chillDecay > 0) {
      ball.chillDecay = Math.max(0, ball.chillDecay - dt);
      if (ball.chillDecay === 0) ball.chillStacks = 0;
    }
    if (ball.shieldRotateSpeed) {
      ball.shieldAngle += ball.shieldRotateSpeed * dt;
    }

    for (const key of Object.keys(ball.contactCooldowns)) {
      ball.contactCooldowns[key] -= dt;
      if (ball.contactCooldowns[key] <= 0) delete ball.contactCooldowns[key];
    }

    if (ball.poisonTimer > 0) {
      ball.poisonTimer -= dt;
      ball.poisonTick -= dt;
      if (ball.poisonTick <= 0) {
        ball.poisonTick = 0.55;
        this.dealDamage(ball, ball.poisonDmg || 2, ball.poisonOwner || 0, 'poison', ball.poisonBallId || null);
      }
    }
  }

  updateBallMovement(ball, dt) {
    if (ball.stunTimer > 0) {
      ball.vx = 0;
      ball.vy = 0;
      return;
    }

    if (ball.hookSpinTimer > 0) {
      const spinAngle = 9.2 * dt;
      const cosA = Math.cos(spinAngle);
      const sinA = Math.sin(spinAngle);
      const nvx = ball.vx * cosA - ball.vy * sinA;
      const nvy = ball.vx * sinA + ball.vy * cosA;
      ball.vx = nvx;
      ball.vy = nvy;
    } else if (ball.steerRate > 0) {
      const enemy = this.getClosestEnemy(ball);
      if (enemy) {
        const desired = Math.atan2(enemy.y - ball.y, enemy.x - ball.x);
        const curSp = Math.hypot(ball.vx, ball.vy);
        if (curSp > 5) {
          let curA = Math.atan2(ball.vy, ball.vx);
          let diff = desired - curA;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          curA += Math.max(-ball.steerRate * dt, Math.min(ball.steerRate * dt, diff));
          ball.vx = Math.cos(curA) * curSp;
          ball.vy = Math.sin(curA) * curSp;
        }
      }
    }

    const speedBoost = (this.suddenDeathActive ? 1.15 : 1) * (ball.dashTimer > 0 ? 1.85 : 1);
    const slowFactor = ball.slowTimer > 0 ? 0.65 : 1;
    const baseCap = Math.max(MAX_BALL_SPEED, ball.customSpeedCap || 0);
    const capSpeed = ball.dashTimer > 0 ? baseCap * 1.15 : baseCap;
    const targetSpeed = Math.min(capSpeed, ball.baseSpeed * speedBoost * slowFactor);

    let speed = Math.hypot(ball.vx, ball.vy);
    if (speed < 10) {
      ball.vx = ball.lastDirX * targetSpeed;
      ball.vy = ball.lastDirY * targetSpeed;
      speed = targetSpeed;
    } else {
      ball.lastDirX = ball.vx / speed;
      ball.lastDirY = ball.vy / speed;
      const nextSpeed = speed + (targetSpeed - speed) * Math.min(1, dt * (ball.dashTimer > 0 ? 8 : 3.5));
      ball.vx = ball.lastDirX * nextSpeed;
      ball.vy = ball.lastDirY * nextSpeed;
    }

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (!this.headless) {
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 9) ball.trail.shift();
    }

    // Shackles Ball inner cage wall reflection
    if (ball.trappedCageId && !(ball.phaseTimer > 0)) {
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
            this.dealDamage(ball, cage.wallDmg, cage.owner, 'shackle', cage.sourceBallId || null);
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

      if (ball.wallSlamBonusTimer > 0) {
        ball.wallSlamBonusTimer = 0;
        this.dealDamage(ball, 5, ball.wallSlamOwner || 0, 'wallslam', ball.wallSlamBallId || null);
        this.emitText(ball.x, ball.y - ball.radius - 10, 'SLAM!', '#38bdf8');
      }

      if (this.roundStats && (ball.owner === 1 || ball.owner === 2)) {
        this.roundStats.wallHits[ball.owner] += 1;
      }
      this.emitEvent('wall', { owner: ball.owner });
      this.addParticleBurst(wallHit.x, wallHit.y, '#e2e8f0', 4);
      const handler = ABILITY_HANDLERS[ball.ballId];
      if (handler && handler.onWallHit) {
        this._actingBallId = ball.ballId;
        this._actingEntityId = ball.id;
        try {
          handler.onWallHit(this, ball, wallHit);
        } finally {
          this._actingBallId = null;
          this._actingEntityId = null;
        }
      }
      if (this.mode === MODES.GAUNTLET && this.runRelics.length > 0 && ball.owner === 1) {
        applyRelicsOnWallHit(this, ball, this.runRelics);
      }
    }
  }

  resolveBallCollisions() {
    for (let i = 0; i < this.balls.length; i++) {
      const a = this.balls[i];
      if (a.hp <= 0 || a.phaseTimer > 0) continue;
      for (let j = i + 1; j < this.balls.length; j++) {
        const b = this.balls[j];
        if (b.hp <= 0 || b.phaseTimer > 0) continue;

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

        const invA = 1 / Math.max(0.2, a.mass || 1);
        const invB = 1 / Math.max(0.2, b.mass || 1);
        const invSum = invA + invB;
        const wA = invA / invSum;
        const wB = invB / invSum;

        a.x -= nx * (overlap * wA + 0.5);
        a.y -= ny * (overlap * wA + 0.5);
        b.x += nx * (overlap * wB + 0.5);
        b.y += ny * (overlap * wB + 0.5);

        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const velAlongNormal = rvx * nx + rvy * ny;
        if (velAlongNormal < 0) {
          const jImp = -(2 * velAlongNormal) / invSum;
          a.vx -= jImp * invA * nx;
          a.vy -= jImp * invA * ny;
          b.vx += jImp * invB * nx;
          b.vy += jImp * invB * ny;
        } else {
          a.vx -= nx * 40 * wA * 2;
          a.vy -= ny * 40 * wA * 2;
          b.vx += nx * 40 * wB * 2;
          b.vy += ny * 40 * wB * 2;
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
          if (dmgToB > 0) this.dealDamage(b, dmgToB, a.owner, 'contact', a.ballId);
          if (dmgToA > 0) this.dealDamage(a, dmgToA, b.owner, 'contact', b.ballId);

          const hA = ABILITY_HANDLERS[a.ballId];
          const hB = ABILITY_HANDLERS[b.ballId];
          if (a.hp > 0 && b.hp > 0 && hA && hA.onBallHit) {
            this._actingBallId = a.ballId;
            this._actingEntityId = a.id;
            try {
              hA.onBallHit(this, a, b);
            } finally {
              this._actingBallId = null;
              this._actingEntityId = null;
            }
          }
          if (a.hp > 0 && b.hp > 0 && hB && hB.onBallHit) {
            this._actingBallId = b.ballId;
            this._actingEntityId = b.id;
            try {
              hB.onBallHit(this, b, a);
            } finally {
              this._actingBallId = null;
              this._actingEntityId = null;
            }
          }
          if (this.mode === MODES.GAUNTLET && this.runRelics.length > 0 && a.hp > 0 && b.hp > 0) {
            if (a.owner === 1) applyRelicsOnBallHit(this, a, b, this.runRelics);
            else if (b.owner === 1) applyRelicsOnBallHit(this, b, a, this.runRelics);
          }
        }
      }
    }
  }

  updateHelpers(dt) {
    for (const h of [...this.helpers]) {
      if (h._dead) continue;
      if (h.ttl != null) {
        h.ttl -= dt;
        if (h.ttl <= 0) {
          h._dead = true;
          continue;
        }
      }
      const parent = this.balls.find((b) => b.id === h.parentId && b.hp > 0);
      if (!parent && !h.independent) {
        h._dead = true;
        continue;
      }

      this._actingBallId = h.sourceBallId || parent?.ballId || this.selectedBallIds[h.owner] || null;
      this._actingEntityId = h.sourceEntityId || parent?.id || null;
      try {
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
            if (enemy.phaseTimer > 0 || h.hitCooldowns[enemy.id]) continue;
            const dist = Math.hypot(enemy.x - h.x, enemy.y - h.y);
            if (dist <= enemy.radius + h.radius) {
              h.hitCooldowns[enemy.id] = 0.38;
              this.dealDamage(enemy, h.dmg, h.owner, 'helper');
            }
          }
        } else if (h.kind === 'shadow_decoy') {
          for (const enemy of this.getEnemyBalls(h.owner)) {
            if (enemy.phaseTimer > 0 || h.hitCooldowns[enemy.id]) continue;
            if (Math.hypot(enemy.x - h.x, enemy.y - h.y) <= enemy.radius + h.radius) {
              h.hitCooldowns[enemy.id] = 0.45;
              this.dealDamage(enemy, h.dmg, h.owner, 'ninja');
              this.addParticleBurst(h.x, h.y, '#94a3b8', 6);
            }
          }
        } else if (h.kind === 'mini_turret') {
          const enemy = this.balls.find((ball) => ball.owner !== h.owner && ball.hp > 0);
          if (enemy) {
            h.orbitAngle = Math.atan2(enemy.y - h.y, enemy.x - h.x);
            h.fireTimer -= dt;
            if (h.fireTimer <= 0) {
              h.fireTimer = h.fireRate || 1.15;
              this.addProjectile({
                kind: 'dart',
                owner: h.owner,
                x: h.x + Math.cos(h.orbitAngle) * 20,
                y: h.y + Math.sin(h.orbitAngle) * 20,
                vx: Math.cos(h.orbitAngle) * 440,
                vy: Math.sin(h.orbitAngle) * 440,
                radius: 9,
                dmg: h.dmg || 4,
                bouncesLeft: 0,
                ttl: 1.5,
                color: '#38bdf8',
              });
            }
          }
        } else {
          // Orbiting or velocity-aligned weapon helper (orbital, blade, axe, spear, hammer, chainsaw, drill, lance)
          if (h.alignVelocity && parent) {
            const sp = Math.hypot(parent.vx, parent.vy);
            if (sp > 5) h.orbitAngle = Math.atan2(parent.vy, parent.vx);
            h.orbitRadius = parent.radius + (h.protrusion || 16);
          } else {
            h.orbitAngle += h.angularSpeed * dt;
          }
          h.x = parent.x + Math.cos(h.orbitAngle) * h.orbitRadius;
          h.y = parent.y + Math.sin(h.orbitAngle) * h.orbitRadius;

          const hasShaft =
            h.kind === 'axe' ||
            h.kind === 'spear' ||
            h.kind === 'hammer' ||
            h.kind === 'knight_lance' ||
            h.kind === 'hypergamy_symbol' ||
            h.kind === 'dondurma_paddle';
          const sx = hasShaft ? parent.x + Math.cos(h.orbitAngle) * (h.orbitRadius * 0.68) : h.x;
          const sy = hasShaft ? parent.y + Math.sin(h.orbitAngle) * (h.orbitRadius * 0.68) : h.y;

          for (const enemy of this.getEnemyBalls(h.owner)) {
            if (enemy.phaseTimer > 0 || h.hitCooldowns[enemy.id]) continue;
            const dx = enemy.x - h.x;
            const dy = enemy.y - h.y;
            const distTip = Math.hypot(dx, dy);
            const hitTip = distTip <= enemy.radius + h.hitRadius;
            const hitShaft = hasShaft && Math.hypot(enemy.x - sx, enemy.y - sy) <= enemy.radius + h.hitRadius * 0.68;
            if (hitTip || hitShaft) {
              h.hitCooldowns[enemy.id] = h.hitCd || 0.38;
              let hitDmg = h.dmg;
              if (h.speedDmgFactor && parent) {
                const sp = Math.hypot(parent.vx, parent.vy);
                hitDmg += Math.max(0, (sp - 260) * h.speedDmgFactor);
              }
              this.dealDamage(enemy, hitDmg, h.owner, 'orbit');
              if (h.kind === 'hypergamy_symbol' && parent) {
                this.healBall(parent, 2);
                h.upgrades = Math.min(6, (h.upgrades || 0) + 1);
                h.dmg = 9 + h.upgrades * 1.1;
                h.angularSpeed = 4.2 + h.upgrades * 0.45;
                h.orbitRadius = Math.min(198, 162 + h.upgrades * 6);
                this.emitText(enemy.x, enemy.y - enemy.radius - 12, 'TOP 20%!', '#f472b6');
              } else if (h.kind === 'dondurma_paddle') {
                this.applyChill(enemy, 1, h.owner);
              }
              if (h.stunDuration) {
                enemy.stunTimer = Math.max(enemy.stunTimer, h.stunDuration);
                this.emitText(enemy.x, enemy.y - enemy.radius - 10, 'STUN!', '#facc15');
              }
              const pdx = enemy.x - parent.x;
              const pdy = enemy.y - parent.y;
              const pdist = Math.hypot(pdx, pdy);
              if (h.knockback && pdist > 0.01) {
                enemy.vx += (pdx / pdist) * h.knockback;
                enemy.vy += (pdy / pdist) * h.knockback;
              }
            }
          }
        }
      } finally {
        this._actingBallId = null;
        this._actingEntityId = null;
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

      this._actingBallId = h.sourceBallId || this.selectedBallIds[h.owner] || null;
      this._actingEntityId = h.sourceEntityId || null;
      try {
        if (h.kind === 'track') {
          const trackRate = getBallTuning(h.sourceBallId || this.selectedBallIds[h.owner] || 'conductor').rateMult || 1;
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

      if (h.kind === 'bomb') {
        if (h.vx || h.vy) {
          h.x += h.vx * dt;
          h.y += h.vy * dt;
          const damp = Math.pow(0.45, dt);
          h.vx *= damp;
          h.vy *= damp;
          if (h.x - h.radius < b.left) { h.x = b.left + h.radius; h.vx = Math.abs(h.vx); }
          if (h.x + h.radius > b.right) { h.x = b.right - h.radius; h.vx = -Math.abs(h.vx); }
          if (h.y - h.radius < b.top) { h.y = b.top + h.radius; h.vy = Math.abs(h.vy); }
          if (h.y + h.radius > b.bottom) { h.y = b.bottom - h.radius; h.vy = -Math.abs(h.vy); }
        }
        if (h.armDelay > 0) h.armDelay = Math.max(0, h.armDelay - dt);
        if (h.armDelay <= 0) {
          for (const enemy of this.getEnemyBalls(h.owner)) {
            if (Math.hypot(enemy.x - h.x, enemy.y - h.y) <= enemy.radius + h.radius + 6) {
              h.fuse = 0;
              break;
            }
          }
        }
        h.fuse -= dt;
        if (h.fuse <= 0) {
          for (const enemy of this.getEnemyBalls(h.owner)) {
            const dx = enemy.x - h.x;
            const dy = enemy.y - h.y;
            const dist = Math.hypot(dx, dy);
            if (dist <= h.blastRadius + enemy.radius) {
              this.dealDamage(enemy, h.dmg, h.owner, 'bomb');
              if (h.knockback && dist > 0.01) {
                enemy.vx += (dx / dist) * h.knockback;
                enemy.vy += (dy / dist) * h.knockback;
              }
            }
          }
          this.emitText(h.x, h.y - 16, 'BOOM!', '#fb923c');
          this.addParticleBurst(h.x, h.y, '#fbbf24', 18);
          this.triggerShake(7, 0.16);
          this.emitEvent('ability', { kind: 'explode', owner: h.owner });
          this.hazards.splice(i, 1);
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
        const turretRate = getBallTuning(h.sourceBallId || this.selectedBallIds[h.owner] || 'cannon').rateMult || 1;
        h.fireTimer -= dt * turretRate;
        if (h.fireTimer <= 0) {
          h.fireTimer = h.fireRate;
          const enemy = this.balls.find((ball) => ball.owner !== h.owner && ball.hp > 0);
          if (enemy) {
            const a = Math.atan2(enemy.y - h.y, enemy.x - h.x);
            if (h.beamTurret) {
              const dx = Math.cos(a);
              const dy = Math.sin(a);
              this.addHazard(
                {
                  kind: 'plasma_blast',
                  variant: 'ray',
                  owner: h.owner,
                  x1: h.x,
                  y1: h.y,
                  x2: h.x + dx * 950,
                  y2: h.y + dy * 950,
                  dx,
                  dy,
                  dmg: 4,
                  hitIds: {},
                  ttl: 0.16,
                },
                6
              );
              this.emitEvent('ability', { kind: 'beamFire', owner: h.owner });
            } else {
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
          if (enemy.phaseTimer > 0) continue;
          const dSq = pointToSegmentDistSq(enemy.x, enemy.y, h.x1, h.y1, h.x2, h.y2);
          if (dSq <= (enemy.radius + 5) ** 2) {
            this.dealDamage(enemy, h.dmg, h.owner, 'web');
            if (h.slowDuration) {
              enemy.slowTimer = Math.max(enemy.slowTimer, h.slowDuration);
            }
            if (h.healOwner) {
              const ownerBall =
                (h.sourceEntityId && this.balls.find((ball) => ball.id === h.sourceEntityId && ball.hp > 0)) ||
                this.balls.find((ball) => ball.owner === h.owner && ball.hp > 0);
              if (ownerBall) this.healBall(ownerBall, h.healOwner);
            }
            this.addParticleBurst(enemy.x, enemy.y, h.variant === 'black' ? '#fb7185' : '#e2e8f0', 6);
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
          if (enemy.phaseTimer > 0 || h.tickTimers[enemy.id]) continue;
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
          if (enemy.phaseTimer > 0 || h.hitIds[enemy.id]) continue;
          const dSq = pointToSegmentDistSq(enemy.x, enemy.y, h.x1, h.y1, h.x2, h.y2);
          if (dSq <= (enemy.radius + 14) ** 2) {
            h.hitIds[enemy.id] = true;
            this.dealDamage(enemy, h.dmg, h.owner, 'beam');
          }
        }
        continue;
      }

      if (h.kind === 'red_zone') {
        if (h.followParentId) {
          const parent = this.balls.find((ball) => ball.id === h.followParentId && ball.hp > 0);
          if (!parent) {
            this.hazards.splice(i, 1);
            continue;
          }
          h.x = parent.x;
          h.y = parent.y;
        } else if (h.vx || h.vy) {
          h.x += (h.vx || 0) * dt;
          h.y += (h.vy || 0) * dt;
          if (h.x - h.radius * 0.5 < b.left || h.x + h.radius * 0.5 > b.right) h.vx = -(h.vx || 0);
          if (h.y - h.radius * 0.5 < b.top || h.y + h.radius * 0.5 > b.bottom) h.vy = -(h.vy || 0);
        }
        if (h.growRate) {
          h.radius = Math.min(h.maxRadius || 125, h.radius + h.growRate * dt);
        }
        for (const k of Object.keys(h.tickTimers)) {
          h.tickTimers[k] -= dt;
          if (h.tickTimers[k] <= 0) delete h.tickTimers[k];
        }
        let consumedTrap = false;
        const fieldRange = h.radius * (h.fieldScale || 1.3);
        for (const enemy of this.getEnemyBalls(h.owner)) {
          if (enemy.phaseTimer > 0) continue;
          const dx = enemy.x - h.x;
          const dy = enemy.y - h.y;
          const dist = Math.hypot(dx, dy);

          // Continuous physics forces (gravity pull, repulsor push, tornado swirl, anchor leash)
          if (dist > 0.01 && dist <= fieldRange + enemy.radius) {
            const nx = dx / dist;
            const ny = dy / dist;
            if (h.pullForce) {
              enemy.vx -= nx * h.pullForce * dt;
              enemy.vy -= ny * h.pullForce * dt;
            }
            if (h.pushForce) {
              enemy.vx += nx * h.pushForce * dt;
              enemy.vy += ny * h.pushForce * dt;
              if (h.wallSlam) {
                enemy.wallSlamBonusTimer = 0.85;
                enemy.wallSlamOwner = h.owner;
                enemy.wallSlamBallId = h.sourceBallId || null;
              }
            }
            if (h.swirlForce) {
              enemy.vx += (-ny * h.swirlForce - nx * h.swirlForce * 0.35) * dt;
              enemy.vy += (nx * h.swirlForce - ny * h.swirlForce * 0.35) * dt;
            }
            if (h.leashRadius && dist > h.leashRadius) {
              enemy.vx -= nx * (dist - h.leashRadius) * 8.5 * dt;
              enemy.vy -= ny * (dist - h.leashRadius) * 8.5 * dt;
            }
          }

          if (dist <= enemy.radius + h.radius * 0.88) {
            if (h.trapRoot) {
              this.dealDamage(enemy, h.dmg, h.owner, 'mimic');
              enemy.stunTimer = Math.max(enemy.stunTimer, h.trapRoot);
              this.emitText(enemy.x, enemy.y - enemy.radius - 10, 'CHOMP!', '#fbbf24');
              this.addParticleBurst(h.x, h.y, '#fbbf24', 10);
              consumedTrap = true;
              break;
            }
            if (h.slipSpin) {
              this.dealDamage(enemy, h.dmg, h.owner, 'banana_slip');
              enemy.hookSpinTimer = Math.max(enemy.hookSpinTimer, h.slipSpin);
              enemy.wallSlamBonusTimer = 1.1;
              enemy.wallSlamOwner = h.owner;
              enemy.wallSlamBallId = h.sourceBallId || null;
              this.emitText(enemy.x, enemy.y - enemy.radius - 10, 'SLIP!', '#facc15');
              this.addParticleBurst(h.x, h.y, '#fef08a', 10);
              consumedTrap = true;
              break;
            }
            if (!h.tickTimers[enemy.id]) {
              h.tickTimers[enemy.id] = h.tickRate;
              const dmg = h.speedDmgScale
                ? Math.max(h.dmg, Math.round(Math.hypot(enemy.vx, enemy.vy) * 0.022))
                : h.dmg;
              if (dmg > 0) this.dealDamage(enemy, dmg, h.owner, 'zone');
              if (h.slowDuration) {
                enemy.slowTimer = Math.max(enemy.slowTimer, h.slowDuration);
              }
              if (h.poisonTicks > 0) {
                this.applyPoison(enemy, 2, h.poisonTicks, h.owner);
              }
              if (h.chillStacks > 0) {
                this.applyChill(enemy, h.chillStacks, h.owner);
              }
            }
          }
        }
        if (h.pullProj || h.pushProj) {
          for (const p of this.projectiles) {
            if (p.owner === h.owner || p.piercing) continue;
            const dx = p.x - h.x;
            const dy = p.y - h.y;
            const d = Math.hypot(dx, dy);
            if (d > 4 && d <= h.radius * 1.45) {
              const nx = dx / d;
              const ny = dy / d;
              const f = h.pullProj ? -h.pullProj : h.pushProj;
              p.vx += nx * f * dt;
              p.vy += ny * f * dt;
            }
          }
        }
        if (consumedTrap) this.hazards.splice(i, 1);
        continue;
      }

      if (h.kind === 'portal_pair') {
        const twin = this.hazards.find(
          (o) =>
            o.kind === 'portal_pair' &&
            o.owner === h.owner &&
            o.id !== h.id &&
            (o.sourceEntityId == null || h.sourceEntityId == null || o.sourceEntityId === h.sourceEntityId)
        );
        if (twin) {
          for (const ball of this.balls) {
            if (ball.hp <= 0 || ball.teleportCd > 0 || ball.phaseTimer > 0) continue;
            if (Math.hypot(ball.x - h.x, ball.y - h.y) <= h.radius + ball.radius * 0.45) {
              ball.x = Math.max(b.left + ball.radius, Math.min(b.right - ball.radius, twin.x));
              ball.y = Math.max(b.top + ball.radius, Math.min(b.bottom - ball.radius, twin.y));
              ball.teleportCd = 0.9;
              if (ball.owner !== h.owner && h.dmg > 0) {
                this.dealDamage(ball, h.dmg, h.owner, 'portal');
              }
              this.addParticleBurst(twin.x, twin.y, twin.portalColor || '#38bdf8', 8);
              this.emitText(twin.x, twin.y - 20, 'WARP!', twin.portalColor || '#38bdf8');
            }
          }
          for (const p of this.projectiles) {
            if (p.teleportCd > 0) continue;
            if (Math.hypot(p.x - h.x, p.y - h.y) <= h.radius + p.radius) {
              p.x = twin.x;
              p.y = twin.y;
              p.teleportCd = 0.65;
            }
          }
        }
        continue;
      }

      if (h.kind === 'pinball_bumper') {
        if (h.hitCooldown > 0) h.hitCooldown = Math.max(0, h.hitCooldown - dt);
        for (const ball of this.balls) {
          if (ball.hp <= 0 || ball.phaseTimer > 0) continue;
          const dx = ball.x - h.x;
          const dy = ball.y - h.y;
          const dist = Math.hypot(dx, dy);
          const minD = h.radius + ball.radius;
          if (dist < minD && dist > 0.001) {
            const nx = dx / dist;
            const ny = dy / dist;
            ball.x = h.x + nx * minD;
            ball.y = h.y + ny * minD;
            const sp = Math.min(MAX_BALL_SPEED, Math.max(360, Math.hypot(ball.vx, ball.vy) * 1.24));
            ball.vx = nx * sp;
            ball.vy = ny * sp;
            if (h.hitCooldown <= 0) {
              h.hitCooldown = 0.22;
              this.addParticleBurst(h.x, h.y, '#f472b6', 6);
              if (ball.owner !== h.owner) {
                this.dealDamage(ball, h.dmg, h.owner, 'bumper');
              }
            }
          }
        }
        continue;
      }

      if (h.kind === 'ring_wave') {
        if (h.delay > 0) {
          h.delay -= dt;
          if (h.delay <= 0) {
            h.hitIds = h.hitIds || {};
            if (h.variant === 'meteor') {
              for (const enemy of this.getEnemyBalls(h.owner)) {
                if (enemy.phaseTimer > 0) continue;
                const dx = enemy.x - h.x;
                const dy = enemy.y - h.y;
                const dist = Math.hypot(dx, dy);
                if (dist <= h.blastRadius + enemy.radius) {
                  this.dealDamage(enemy, h.dmg, h.owner, 'meteor');
                  if (dist > 0.01) {
                    enemy.vx += (dx / dist) * 320;
                    enemy.vy += (dy / dist) * 320;
                  }
                }
              }
              this.emitText(h.x, h.y - 18, 'IMPACT!', '#fb923c');
              this.addParticleBurst(h.x, h.y, '#f97316', 16);
              this.triggerShake(8, 0.18);
              this.hazards.splice(i, 1);
            } else if (h.variant === 'quake') {
              for (const enemy of this.getEnemyBalls(h.owner)) {
                if (enemy.phaseTimer > 0) continue;
                const dSq = pointToSegmentDistSq(enemy.x, enemy.y, h.x1, h.y1, h.x2, h.y2);
                if (dSq <= (enemy.radius + (h.radius || 28)) ** 2) {
                  this.dealDamage(enemy, h.dmg, h.owner, 'quake');
                  enemy.vy += (enemy.y < h.y1 ? -1 : 1) * 240;
                  enemy.stunTimer = Math.max(enemy.stunTimer, 0.25);
                }
              }
              this.emitText((h.x1 + h.x2) * 0.5, (h.y1 + h.y2) * 0.5 - 12, 'QUAKE!', '#d97706');
              this.triggerShake(7, 0.16);
              this.hazards.splice(i, 1);
            }
          }
          continue;
        }

        h.hitIds = h.hitIds || {};
        if (h.sweepVx != null || h.sweepVy != null) {
          h.x += (h.sweepVx || 0) * dt;
          h.y += (h.sweepVy || 0) * dt;
          const halfW = (h.w || 44) * 0.5;
          const halfH = (h.h || 240) * 0.5;
          // Tsunami washes away enemy floor traps along its path
          if (h.washHazards) {
            for (let k = this.hazards.length - 1; k >= 0; k--) {
              const oh = this.hazards[k];
              if (oh === h || oh.owner === h.owner) continue;
              if (oh.kind === 'red_zone' || oh.kind === 'poison_spike' || oh.kind === 'pickup_drop') {
                if (Math.abs(oh.x - h.x) <= halfW + (oh.radius || 20) && Math.abs(oh.y - h.y) <= halfH + (oh.radius || 20)) {
                  this.hazards.splice(k, 1);
                  if (k < i) i--;
                }
              }
            }
          }
          for (const enemy of this.getEnemyBalls(h.owner)) {
            if (enemy.phaseTimer > 0) continue;
            if (Math.abs(enemy.x - h.x) <= halfW + enemy.radius && Math.abs(enemy.y - h.y) <= halfH + enemy.radius) {
              enemy.vx += (h.sweepVx || 0) * 1.4 * dt;
              enemy.vy += (h.sweepVy || 0) * 1.4 * dt;
              if (!h.hitIds[enemy.id]) {
                h.hitIds[enemy.id] = true;
                this.dealDamage(enemy, h.dmg, h.owner, 'wave');
              }
            }
          }
        } else {
          h.currentRadius = (h.currentRadius || 20) + (h.expandSpeed || 240) * dt;
          for (const enemy of this.getEnemyBalls(h.owner)) {
            if (enemy.phaseTimer > 0 || h.hitIds[enemy.id]) continue;
            const dx = enemy.x - h.x;
            const dy = enemy.y - h.y;
            const dist = Math.hypot(dx, dy);
            if (Math.abs(dist - h.currentRadius) <= enemy.radius + 16) {
              h.hitIds[enemy.id] = true;
              this.dealDamage(enemy, h.dmg, h.owner, 'wave');
              if (h.knockback && dist > 0.01) {
                enemy.vx += (dx / dist) * h.knockback;
                enemy.vy += (dy / dist) * h.knockback;
              }
            }
          }
        }
        continue;
      }

      if (h.kind === 'dice') {
        if (h.hitCooldown > 0) h.hitCooldown = Math.max(0, h.hitCooldown - dt);
        if (h.hitCooldown <= 0) {
          for (const enemy of this.getEnemyBalls(h.owner)) {
            if (enemy.phaseTimer > 0) continue;
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

      if (h.kind === 'cactus') {
        if (h.hitCooldown > 0) h.hitCooldown = Math.max(0, h.hitCooldown - dt);
        if (h.hitCooldown <= 0) {
          for (const enemy of this.getEnemyBalls(h.owner)) {
            if (enemy.phaseTimer > 0) continue;
            const dx = enemy.x - h.x;
            const dy = enemy.y - h.y;
            const dist = Math.hypot(dx, dy);
            if (dist <= enemy.radius + h.radius) {
              h.hitCooldown = 0.52;
              this.dealDamage(enemy, h.dmg, h.owner, 'cactus');
              if (h.knockback && dist > 0.01) {
                enemy.vx += (dx / dist) * h.knockback;
                enemy.vy += (dy / dist) * h.knockback;
              }
              break;
            }
          }
        }
        continue;
      }

      if (h.kind === 'pickup_drop') {
        if (h.vx || h.vy) {
          h.x += h.vx * dt;
          h.y += h.vy * dt;
          const damp = Math.pow(0.55, dt);
          h.vx *= damp;
          h.vy *= damp;
          if (h.x - h.radius < b.left) { h.x = b.left + h.radius; h.vx = Math.abs(h.vx); }
          if (h.x + h.radius > b.right) { h.x = b.right - h.radius; h.vx = -Math.abs(h.vx); }
          if (h.y - h.radius < b.top) { h.y = b.top + h.radius; h.vy = Math.abs(h.vy); }
          if (h.y + h.radius > b.bottom) { h.y = b.bottom - h.radius; h.vy = -Math.abs(h.vy); }
        }
        if (h.allyGrace > 0) h.allyGrace = Math.max(0, h.allyGrace - dt);
        let taken = false;
        for (const enemy of this.getEnemyBalls(h.owner)) {
          if (enemy.phaseTimer > 0) continue;
          if (Math.hypot(enemy.x - h.x, enemy.y - h.y) <= enemy.radius + h.radius) {
            this.dealDamage(enemy, h.enemyDmg, h.owner, 'drop');
            this.addParticleBurst(h.x, h.y, '#fda4af', 6);
            taken = true;
            break;
          }
        }
        if (!taken && !(h.allyGrace > 0)) {
          for (const ally of this.balls) {
            if (ally.owner !== h.owner || ally.hp <= 0 || ally.hp >= ally.maxHp) continue;
            if (Math.hypot(ally.x - h.x, ally.y - h.y) <= ally.radius + h.radius) {
              this.healBall(ally, h.heal);
              this.addParticleBurst(h.x, h.y, '#86efac', 6);
              taken = true;
              break;
            }
          }
        }
        if (taken) this.hazards.splice(i, 1);
        continue;
      }

      if (h.kind === 'poison_spike') {
        h.x = Math.max(b.left + 18, Math.min(b.right - 18, h.x));
        h.y = Math.max(b.top + 18, Math.min(b.bottom - 18, h.y));
        if (h.hitCooldown > 0) h.hitCooldown = Math.max(0, h.hitCooldown - dt);
        if (h.hitCooldown <= 0) {
          for (const enemy of this.getEnemyBalls(h.owner)) {
            if (enemy.phaseTimer > 0) continue;
            const dist = Math.hypot(enemy.x - h.x, enemy.y - h.y);
            if (dist <= enemy.radius + h.radius) {
              h.hitCooldown = 0.65;
              this.dealDamage(enemy, h.dmg, h.owner, 'spike');
              if (h.poisonTicks > 0) {
                this.applyPoison(enemy, 2, h.poisonTicks, h.owner);
              }
              if (h.slowDuration) {
                enemy.slowTimer = Math.max(enemy.slowTimer, h.slowDuration);
              }
              break;
            }
          }
        }
      }
      } finally {
        this._actingBallId = null;
        this._actingEntityId = null;
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
      if (p.teleportCd > 0) p.teleportCd = Math.max(0, p.teleportCd - dt);

      this._actingBallId = p.sourceBallId || this.selectedBallIds[p.owner] || null;
      this._actingEntityId = p.sourceEntityId || null;
      try {
        if (p.kind === 'boomerang') {
          p.returnTimer = (p.returnTimer ?? 0.55) - dt;
          const parent = this.balls.find((ball) => ball.id === p.parentId && ball.hp > 0);
          if (p.returnTimer <= 0 && parent) {
            if (!p._reversed) {
              p._reversed = true;
              p.hitIds = {};
            }
            const dx = parent.x - p.x;
            const dy = parent.y - p.y;
            const d = Math.hypot(dx, dy);
            if (d <= parent.radius + p.radius + 6) {
              this.projectiles.splice(i, 1);
              continue;
            }
            const desired = Math.atan2(dy, dx);
            const sp = Math.max(360, Math.hypot(p.vx, p.vy));
            p.vx = Math.cos(desired) * sp;
            p.vy = Math.sin(desired) * sp;
          }
        } else if (p.turnRate) {
          const enemy = this.balls.find((ball) => ball.owner !== p.owner && ball.hp > 0);
          if (enemy) {
            const desired = Math.atan2(enemy.y - p.y, enemy.x - p.x);
            let cur = Math.atan2(p.vy, p.vx);
            let diff = desired - cur;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            cur += Math.max(-p.turnRate * dt, Math.min(p.turnRate * dt, diff));
            const sp = p.speed || Math.hypot(p.vx, p.vy);
            p.vx = Math.cos(cur) * sp;
            p.vy = Math.sin(cur) * sp;
          }
        }

        if (p.zapRadius) {
          p.zapCd = (p.zapCd || 0.42) - dt;
          if (p.zapCd <= 0) {
            p.zapCd = 0.42;
            for (const enemy of this.getEnemyBalls(p.owner)) {
              if (enemy.phaseTimer > 0) continue;
              if (Math.hypot(enemy.x - p.x, enemy.y - p.y) <= p.zapRadius + enemy.radius) {
                this.dealDamage(enemy, p.zapDmg || 3, p.owner, 'plasma_zap');
                this.addParticleBurst(enemy.x, enemy.y, '#93c5fd', 4);
                break;
              }
            }
          }
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Wall interaction (harpoon/boomerang/crystal prism bounces)
        if (!p.piercing || p.bouncesLeft > 0) {
          let hitWall = false;
          let wallX = false;
          let wallY = false;
          if (p.x - p.radius < b.left || p.x + p.radius > b.right) {
            if (p.bouncesLeft > 0) {
              p.bouncesLeft -= 1;
              p.vx = -p.vx;
              p.x = Math.max(b.left + p.radius, Math.min(b.right - p.radius, p.x));
              wallX = true;
            } else {
              hitWall = true;
            }
          }
          if (p.y - p.radius < b.top || p.y + p.radius > b.bottom) {
            if (p.bouncesLeft > 0) {
              p.bouncesLeft -= 1;
              p.vy = -p.vy;
              p.y = Math.max(b.top + p.radius, Math.min(b.bottom - p.radius, p.y));
              wallY = true;
            } else {
              hitWall = true;
            }
          }
          if ((wallX || wallY) && p.splitOnWall) {
            p.splitOnWall = false;
            const base = Math.atan2(p.vy, p.vx);
            const sp = Math.hypot(p.vx, p.vy) * 0.9;
            for (const off of [-0.36, 0.36]) {
              this.addProjectile({
                kind: 'shard',
                owner: p.owner,
                x: p.x,
                y: p.y,
                vx: Math.cos(base + off) * sp,
                vy: Math.sin(base + off) * sp,
                radius: 9,
                dmg: Math.max(2, Math.round(p.dmg * 0.7)),
                bouncesLeft: 1,
                hitIds: {},
                ttl: 1.4,
                color: off < 0 ? '#f472b6' : '#38bdf8',
              });
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
          if (enemy.phaseTimer > 0 || (p.hitIds && p.hitIds[enemy.id])) continue;
          const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
          if (dist <= enemy.radius + p.radius) {
            // Check directional Shield Arc reflection
            if (enemy.shieldHalfWidth > 0 && enemy.reflectProj && !p.piercing) {
              const incomingAngle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
              let aDiff = incomingAngle - enemy.shieldAngle;
              while (aDiff > Math.PI) aDiff -= Math.PI * 2;
              while (aDiff < -Math.PI) aDiff += Math.PI * 2;
              if (Math.abs(aDiff) <= enemy.shieldHalfWidth) {
                const sp = Math.hypot(p.vx, p.vy) || 360;
                p.vx = Math.cos(incomingAngle) * sp;
                p.vy = Math.sin(incomingAngle) * sp;
                p.owner = enemy.owner;
                p.sourceBallId = enemy.ballId;
                p.sourceEntityId = enemy.id;
                this._actingBallId = enemy.ballId;
                this._actingEntityId = enemy.id;
                p.hitIds = {};
                p.ttl = Math.max(p.ttl, 1.2);
                this.emitText(enemy.x, enemy.y - enemy.radius - 10, 'REFLECT!', '#60a5fa');
                this.addParticleBurst(p.x, p.y, '#93c5fd', 5);
                break;
              }
            }

            if (p.hitIds) p.hitIds[enemy.id] = true;
            this.dealDamage(enemy, p.dmg, p.owner, p.kind);

            if (p.poisonTicks) {
              this.applyPoison(enemy, 2, p.poisonTicks, p.owner);
            }
            if (p.chillStacks) {
              this.applyChill(enemy, p.chillStacks, p.owner);
            }
            if (p.slowDuration) {
              enemy.slowTimer = Math.max(enemy.slowTimer, p.slowDuration);
            }
            if (p.glitchScramble) {
              const ra = (this.rng() - 0.5) * 2.2;
              const sp = Math.hypot(enemy.vx, enemy.vy);
              const cur = Math.atan2(enemy.vy, enemy.vx) + ra;
              enemy.vx = Math.cos(cur) * sp;
              enemy.vy = Math.sin(cur) * sp;
              this.emitText(enemy.x, enemy.y - enemy.radius - 10, 'GLITCH!', '#22d3ee');
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
            } else if (p.kind === 'hook') {
              enemy.hookSpinTimer = Math.max(enemy.hookSpinTimer, p.spinDuration || 0.95);
              this.emitText(enemy.x, enemy.y - enemy.radius - 10, 'SPIN OUT!', '#94a3b8');
              this.addParticleBurst(enemy.x, enemy.y, '#cbd5e1', 8);
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
      } finally {
        this._actingBallId = null;
        this._actingEntityId = null;
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
