import { EXTRA_ABILITY_HANDLERS } from './abilitiesExtra.js';

function aimAngleToEnemy(sim, ball, spread = 0) {
  const enemy = sim.getClosestEnemy(ball);
  const base = enemy
    ? Math.atan2(enemy.y - ball.y, enemy.x - ball.x)
    : Math.atan2(ball.vy, ball.vx);
  return base + (sim.rng() - 0.5) * 2 * spread;
}

function addOrbitHelper(sim, ball, opts) {
  sim.addHelper({
    kind: opts.kind,
    owner: ball.owner,
    parentId: ball.id,
    orbitAngle: opts.orbitAngle || 0,
    orbitRadius: opts.orbitRadius || 80,
    angularSpeed: opts.angularSpeed || 3.4,
    hitRadius: opts.hitRadius || 18,
    dmg: opts.dmg || 4,
    knockback: opts.knockback || 140,
    x: ball.x,
    y: ball.y,
    hitCooldowns: {},
  });
}

function reindexParentHelpers(sim, parentId, kind) {
  const list = sim.helpers.filter((h) => h.parentId === parentId && h.kind === kind && !h._dead);
  const n = list.length;
  if (n === 0) return;
  const base = list[0].orbitAngle;
  for (let i = 0; i < n; i++) {
    list[i].orbitAngle = base + (i * Math.PI * 2) / n;
  }
}

function shatterGlass(sim, ball) {
  if (ball.state.shatterCd > 0) return;
  ball.state.shatterCd = 0.6;
  const base = sim.rng() * Math.PI * 2;
  for (let i = 0; i < 5; i++) {
    const a = base + (i * Math.PI * 2) / 5;
    sim.addProjectile({
      kind: 'shard',
      owner: ball.owner,
      x: ball.x + Math.cos(a) * (ball.radius + 8),
      y: ball.y + Math.sin(a) * (ball.radius + 8),
      vx: Math.cos(a) * 440,
      vy: Math.sin(a) * 440,
      radius: 11,
      dmg: 4,
      bouncesLeft: 1,
      ttl: 2.1,
      color: '#67e8f9',
    });
  }
  sim.addParticleBurst(ball.x, ball.y, '#a5f3fc', 10);
  sim.emitEvent('ability', { kind: 'shatter', owner: ball.owner });
}

function oppositeWallChord(bounds, hit) {
  if (hit.nx > 0.5) return { x: bounds.right, y: hit.y + (Math.random() - 0.5) * 140 };
  if (hit.nx < -0.5) return { x: bounds.left, y: hit.y + (Math.random() - 0.5) * 140 };
  if (hit.ny > 0.5) return { x: hit.x + (Math.random() - 0.5) * 140, y: bounds.bottom };
  return { x: hit.x + (Math.random() - 0.5) * 140, y: bounds.top };
}

function clampAnchorToBounds(pt, b) {
  return {
    x: Math.max(b.left, Math.min(b.right, pt.x)),
    y: Math.max(b.top, Math.min(b.bottom, pt.y)),
  };
}

function addWallSpanHazard(sim, ball, hit, opts) {
  const cur = { x: hit.x, y: hit.y };
  const prev = ball.state.lastAnchor;
  ball.state.lastAnchor = cur;
  let p1 = prev;
  if (!p1 || Math.hypot(cur.x - p1.x, cur.y - p1.y) < (opts.minSpan || 70)) {
    if (opts.requirePrev) return false;
    p1 = clampAnchorToBounds(
      {
        x: hit.nx !== 0 ? (hit.nx > 0 ? sim.bounds.right : sim.bounds.left) : cur.x + (sim.rng() - 0.5) * 260,
        y: hit.ny !== 0 ? (hit.ny > 0 ? sim.bounds.bottom : sim.bounds.top) : cur.y + (sim.rng() - 0.5) * 260,
      },
      sim.bounds
    );
  }
  sim.addHazard(
    {
      ...opts.hazard,
      owner: ball.owner,
      x1: p1.x,
      y1: p1.y,
      x2: cur.x,
      y2: cur.y,
    },
    opts.maxPerOwner || 10
  );
  return true;
}

export const ABILITY_HANDLERS = {
  /**
   * Verity Ball: Stage 1 (48px, 5 DMG) -> Stage 2 (60px, 10 DMG) -> Stage 3 Monster (76px, 40 DMG).
   */
  verity: {
    onInit(sim, ball) {
      ball.state = { stage: 1, procCd: 0 };
      ball.contactDmg = 5;
    },
    onUpdate(sim, ball, dt) {
      ball.state.procCd = Math.max(0, ball.state.procCd - dt);
    },
    onTakeDamage(sim, ball, amount) {
      if (amount <= 0 || ball.hp <= 0 || ball.state.procCd > 0) return;
      ball.state.procCd = 0.15;
      if (ball.state.stage < 3 && sim.rng() < 0.10) {
        ball.state.stage += 1;
        ball.contactDmg = ball.state.stage === 2 ? 10 : 40;
        ball.radius = ball.state.stage === 2 ? 60 : 76;
        const b = sim.bounds;
        ball.x = Math.max(b.left + ball.radius, Math.min(b.right - ball.radius, ball.x));
        ball.y = Math.max(b.top + ball.radius, Math.min(b.bottom - ball.radius, ball.y));
        sim.scaleBallSpeed(ball, 1.08);
        const label = ball.state.stage === 2 ? 'STAGE 2!' : 'MONSTER!!';
        const color = ball.state.stage === 2 ? '#fbbf24' : '#ef4444';
        sim.emitText(ball.x, ball.y - ball.radius - 10, label, color);
        sim.addParticleBurst(ball.x, ball.y, color, 16);
        sim.emitEvent('levelUp', { owner: ball.owner, level: ball.state.stage });
      }
    },
  },

  /**
   * Spider Ball: Anchors white web tripwire lines across wall hits.
   * Crossing a web deals 6 damage and consumes that web line.
   */
  spider: {
    onInit(sim, ball) {
      ball.state = { cd: 0, lastAnchor: null };
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
    },
    onWallHit(sim, ball, hit) {
      if (ball.state.cd > 0) return;
      ball.state.cd = 0.12;
      addWallSpanHazard(sim, ball, hit, {
        minSpan: 70,
        maxPerOwner: 14,
        hazard: {
          kind: 'web_line',
          dmg: 6,
          slowDuration: 0.35,
          ttl: 24,
        },
      });
      sim.emitEvent('ability', { kind: 'web', owner: ball.owner });
    },
  },

  /**
   * Shackles Ball: Every 3.5s spawns 3 interconnected shackle ring cages (5.2s duration).
   * Trapped enemies bounce inside the ring taking 3 damage on every inner cage wall hit.
   */
  shackles: {
    onInit(sim, ball) {
      ball.state = { timer: 1.4 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 3.5;
        const dir = Math.atan2(ball.vy, ball.vx) || 0;
        const b = sim.bounds;
        const cx = Math.max(b.left + 100, Math.min(b.right - 100, ball.x + Math.cos(dir) * 110));
        const cy = Math.max(b.top + 100, Math.min(b.bottom - 100, ball.y + Math.sin(dir) * 110));
        const clusterId = sim.nextEntityId++;
        const offsets = [
          { dx: 0, dy: -42 },
          { dx: -38, dy: 32 },
          { dx: 38, dy: 32 },
        ];
        for (const off of offsets) {
          sim.addHazard(
            {
              kind: 'shackle_cage',
              clusterId,
              owner: ball.owner,
              x: Math.max(b.left + 96, Math.min(b.right - 96, cx + off.dx)),
              y: Math.max(b.top + 96, Math.min(b.bottom - 96, cy + off.dy)),
              radius: 92,
              wallDmg: 3,
              armTimer: 0.25,
              ttl: 5.2,
            },
            9
          );
        }
        sim.emitEvent('ability', { kind: 'rune', owner: ball.owner });
      }
    },
  },

  /**
   * Vampire Ball: Physically latches onto enemy on collision, dealing 3 ticks of 4 damage
   * and healing +4 HP per tick before unlatching.
   */
  vampire: {
    onInit(sim, ball) {
      ball.state = { latchTargetId: null, ticksLeft: 0, tickTimer: 0, latchAngle: 0, relatchCd: 0 };
    },
    onBallHit(sim, ball, enemy) {
      if (ball.state.latchTargetId || ball.state.relatchCd > 0) return;
      ball.state.latchTargetId = enemy.id;
      ball.state.ticksLeft = 3;
      ball.state.tickTimer = 0.24;
      ball.state.latchAngle = Math.atan2(ball.y - enemy.y, ball.x - enemy.x);
      sim.emitText(ball.x, ball.y - ball.radius - 8, 'LATCH!', '#f87171');
      sim.emitEvent('ability', { kind: 'latch', owner: ball.owner });
    },
    onUpdate(sim, ball, dt) {
      if (ball.state.relatchCd > 0) {
        ball.state.relatchCd = Math.max(0, ball.state.relatchCd - dt);
      }
      if (!ball.state.latchTargetId) return;

      const target = sim.balls.find((b) => b.id === ball.state.latchTargetId && b.hp > 0);
      if (!target) {
        ball.state.latchTargetId = null;
        return;
      }

      // Cling directly to the target ball while riding along with it
      ball.state.latchAngle += 2.2 * dt;
      const dist = target.radius + ball.radius + 2;
      const b = sim.bounds;
      ball.x = Math.max(b.left + ball.radius, Math.min(b.right - ball.radius, target.x + Math.cos(ball.state.latchAngle) * dist));
      ball.y = Math.max(b.top + ball.radius, Math.min(b.bottom - ball.radius, target.y + Math.sin(ball.state.latchAngle) * dist));
      ball.vx = target.vx;
      ball.vy = target.vy;

      ball.state.tickTimer -= dt;
      if (ball.state.tickTimer <= 0) {
        ball.state.tickTimer = 0.34;
        sim.dealDamage(target, 4, ball.owner, 'drain');
        sim.healBall(ball, 4);
        ball.state.ticksLeft -= 1;
        if (ball.state.ticksLeft <= 0 || target.hp <= 0) {
          const outA = ball.state.latchAngle;
          ball.state.latchTargetId = null;
          ball.state.relatchCd = 0.85;
          ball.vx = Math.cos(outA) * ball.baseSpeed;
          ball.vy = Math.sin(outA) * ball.baseSpeed;
        }
      }
    },
  },

  conductor: {
    onInit(sim, ball) {
      ball.state = { cd: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
    },
    onWallHit(sim, ball, hit) {
      if (ball.state.cd > 0) return;
      ball.state.cd = 0.45;
      const horizontal = Math.abs(hit.nx) > 0.5;
      const b = sim.bounds;
      const sx = horizontal ? (hit.nx > 0 ? b.left : b.right) : Math.max(b.left + 26, Math.min(b.right - 26, hit.x));
      const sy = horizontal ? Math.max(b.top + 26, Math.min(b.bottom - 26, hit.y)) : (hit.ny > 0 ? b.top : b.bottom);
      sim.addHazard(
        {
          kind: 'track',
          owner: ball.owner,
          x: sx,
          y: sy,
          dirX: horizontal ? hit.nx : 0,
          dirY: horizontal ? 0 : hit.ny,
          horizontal,
          telegraph: 0.55,
          fired: false,
          ttl: 1.6,
        },
        4
      );
      sim.emitEvent('ability', { kind: 'whistle', owner: ball.owner });
    },
  },

  orbital: {
    onInit(sim, ball) {
      ball.state = {};
      for (let i = 0; i < 3; i++) {
        addOrbitHelper(sim, ball, {
          kind: 'orbital',
          orbitAngle: (i * Math.PI * 2) / 3,
          orbitRadius: 92,
          angularSpeed: 3.3,
          hitRadius: 17,
          dmg: 6,
          knockback: 210,
        });
      }
    },
  },

  /**
   * Laser Ball: Connects consecutive wall hits with persistent laser lines across the arena.
   * Crossing a laser line deals 3 damage.
   */
  laser: {
    onInit(sim, ball) {
      ball.state = { cd: 0, lastAnchor: null };
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
    },
    onWallHit(sim, ball, hit) {
      if (ball.state.cd > 0) return;
      ball.state.cd = 0.16;
      const cur = { x: hit.x, y: hit.y };
      const prev = ball.state.lastAnchor;
      ball.state.lastAnchor = cur;
      if (!prev || Math.hypot(cur.x - prev.x, cur.y - prev.y) < 75) {
        return;
      }
      sim.addHazard(
        {
          kind: 'laser_beam',
          owner: ball.owner,
          x1: prev.x,
          y1: prev.y,
          x2: cur.x,
          y2: cur.y,
          armTimer: 0.35,
          dmg: 3,
          tickRate: 0.55,
          ttl: 22,
          tickTimers: {},
        },
        6
      );
      sim.emitEvent('ability', { kind: 'laserCharge', owner: ball.owner });
    },
  },

  /**
   * Dice Ball: Every 2 seconds places a permanent die (1-6 pips).
   * Touching it deals damage equal to the pips shown, then rerolls.
   */
  dice: {
    onInit(sim, ball) {
      ball.state = { timer: 1.2 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 2.0;
        const roll = 1 + Math.floor(sim.rng() * 6);
        sim.addHazard(
          {
            kind: 'dice',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            radius: 28,
            roll,
            dmgPerPip: 1,
            hitCooldown: 0,
            ttl: 32,
          },
          10
        );
      }
    },
  },

  zone: {
    onInit(sim, ball) {
      ball.state = { timer: 0.9 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 2.4;
        sim.addHazard(
          {
            kind: 'red_zone',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            radius: 96,
            dmg: 3,
            tickRate: 0.36,
            ttl: 11,
            tickTimers: {},
          },
          3
        );
        sim.emitEvent('ability', { kind: 'zone', owner: ball.owner });
      }
    },
  },

  chess: {
    onInit(sim, ball) {
      ball.state = { timer: 1.8, phase: 'idle', prepTimer: 0, mode: 'rook' };
    },
    onUpdate(sim, ball, dt) {
      if (ball.state.phase === 'telegraph') {
        ball.state.prepTimer -= dt;
        ball.vx *= 0.88;
        ball.vy *= 0.88;
        if (ball.state.prepTimer <= 0) {
          ball.state.phase = 'idle';
          ball.state.timer = 2.3;
          const angles =
            ball.state.mode === 'rook'
              ? [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]
              : ball.state.mode === 'bishop'
              ? [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]
              : [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];
          for (const a of angles) {
            sim.addProjectile({
              kind: 'chess_piece',
              piece: ball.state.mode,
              owner: ball.owner,
              x: ball.x + Math.cos(a) * (ball.radius + 8),
              y: ball.y + Math.sin(a) * (ball.radius + 8),
              vx: Math.cos(a) * 580,
              vy: Math.sin(a) * 580,
              radius: 22,
              dmg: 14,
              bouncesLeft: 0,
              ttl: 1.5,
              color: '#fbbf24',
            });
          }
          const outAngle = sim.rng() * Math.PI * 2;
          ball.vx = Math.cos(outAngle) * ball.baseSpeed;
          ball.vy = Math.sin(outAngle) * ball.baseSpeed;
          ball.state.mode =
            ball.state.mode === 'rook' ? 'bishop' : ball.state.mode === 'bishop' ? 'queen' : 'rook';
          sim.emitEvent('ability', { kind: 'chessStrike', owner: ball.owner });
        }
        return;
      }

      ball.state.timer -= dt;
      if (ball.state.timer <= 0 && ball.stunTimer <= 0 && !ball.trappedCageId) {
        const cx = (sim.bounds.left + sim.bounds.right) * 0.5;
        const cy = (sim.bounds.top + sim.bounds.bottom) * 0.5;
        const dx = cx - ball.x;
        const dy = cy - ball.y;
        const d = Math.hypot(dx, dy);
        if (d > 14) {
          ball.vx = (dx / d) * Math.max(ball.baseSpeed * 1.65, 520);
          ball.vy = (dy / d) * Math.max(ball.baseSpeed * 1.65, 520);
        }
        if (d < 44) {
          ball.x = cx;
          ball.y = cy;
          ball.state.phase = 'telegraph';
          ball.state.prepTimer = 0.35;
          sim.emitText(ball.x, ball.y - ball.radius - 8, `${ball.state.mode.toUpperCase()}!`, '#fde68a');
        }
      }
    },
  },

  glass: {
    onInit(sim, ball) {
      ball.state = { shatterCd: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.shatterCd = Math.max(0, ball.state.shatterCd - dt);
    },
    onWallHit(sim, ball) {
      shatterGlass(sim, ball);
    },
    onBallHit(sim, ball) {
      shatterGlass(sim, ball);
    },
  },

  beam: {
    onInit(sim, ball) {
      ball.state = { charge: 0, locking: false, lockTimer: 0, lockAngle: 0 };
    },
    onUpdate(sim, ball, dt) {
      if (ball.state.locking) {
        ball.state.lockTimer -= dt;
        const enemy = sim.getClosestEnemy(ball);
        if (enemy) {
          const desired = Math.atan2(enemy.y - ball.y, enemy.x - ball.x);
          let diff = desired - ball.state.lockAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          ball.state.lockAngle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
        }
        if (ball.state.lockTimer <= 0) {
          ball.state.locking = false;
          ball.state.charge = 0;
          const dx = Math.cos(ball.state.lockAngle);
          const dy = Math.sin(ball.state.lockAngle);
          sim.addHazard(
            {
              kind: 'plasma_blast',
              owner: ball.owner,
              x1: ball.x,
              y1: ball.y,
              x2: ball.x + dx * 950,
              y2: ball.y + dy * 950,
              dx,
              dy,
              dmg: 11,
              hitIds: {},
              ttl: 0.28,
            },
            3
          );
          sim.emitEvent('ability', { kind: 'beamFire', owner: ball.owner });
        }
        return;
      }

      ball.state.charge += dt;
      if (ball.state.charge >= 2.2) {
        ball.state.locking = true;
        ball.state.lockTimer = 0.55;
        ball.state.lockAngle = aimAngleToEnemy(sim, ball, 0);
        sim.emitText(ball.x, ball.y - ball.radius - 8, 'LOCKING!', '#93c5fd');
      }
    },
  },

  /**
   * Harpoon Ball: Every 2.1s fires a harpoon that bounces off walls and drags hit enemies along.
   */
  harpoon: {
    onInit(sim, ball) {
      ball.state = { timer: 1.1 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 2.1;
        const a = aimAngleToEnemy(sim, ball, 0.04);
        sim.addProjectile({
          kind: 'harpoon',
          owner: ball.owner,
          parentId: ball.id,
          x: ball.x + Math.cos(a) * (ball.radius + 8),
          y: ball.y + Math.sin(a) * (ball.radius + 8),
          vx: Math.cos(a) * 640,
          vy: Math.sin(a) * 640,
          radius: 18,
          dmg: 5,
          bouncesLeft: 2,
          dragTargetId: null,
          dragTimer: 0,
          dragTick: 0,
          piercing: true,
          hitIds: {},
          ttl: 2.2,
          color: '#38bdf8',
        });
        sim.emitEvent('ability', { kind: 'harpoon', owner: ball.owner });
      }
    },
  },

  /**
   * Hive Ball: Every 3.5s spawns escalating waves of homing bees (1 -> 2 -> 3 -> 4 -> max 5).
   * Bees deal 3 hit damage + Poison ticks.
   */
  hive: {
    onInit(sim, ball) {
      ball.state = { timer: 1.2, waveCount: 1 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 3.5;
        const active = sim.projectiles.filter((p) => p.kind === 'bee' && p.owner === ball.owner).length;
        const toSpawn = Math.min(ball.state.waveCount, 5 - active);
        for (let k = 0; k < toSpawn; k++) {
          const a = aimAngleToEnemy(sim, ball, 0.65) + (k - toSpawn * 0.5) * 0.35;
          sim.addProjectile({
            kind: 'bee',
            owner: ball.owner,
            x: ball.x + Math.cos(a) * (ball.radius + 8),
            y: ball.y + Math.sin(a) * (ball.radius + 8),
            vx: Math.cos(a) * 255,
            vy: Math.sin(a) * 255,
            speed: 265,
            turnRate: 4.5,
            radius: 12,
            dmg: 3,
            poisonTicks: 2,
            bouncesLeft: 1,
            ttl: 6.0,
            color: '#facc15',
          });
        }
        ball.state.waveCount = Math.min(5, ball.state.waveCount + 1);
      }
    },
  },

  cannon: {
    onInit(sim, ball) {
      ball.state = { cd: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
    },
    onWallHit(sim, ball, hit) {
      if (ball.state.cd > 0) return;
      ball.state.cd = 0.25;
      sim.addHazard(
        {
          kind: 'turret',
          owner: ball.owner,
          x: hit.x + hit.nx * 18,
          y: hit.y + hit.ny * 18,
          nx: hit.nx,
          ny: hit.ny,
          radius: 22,
          fireTimer: 0.75,
          fireRate: 1.55,
          ttl: 24,
        },
        5
      );
      sim.emitEvent('ability', { kind: 'deploy', owner: ball.owner });
    },
  },

  /**
   * Fibonacci Ball: Contact damage starts at 1 and climbs 1, 1, 2, 3, 5, 8, 13, 21, 34.
   */
  fibonacci: {
    onInit(sim, ball) {
      ball.state = { prev: 0, cur: 1 };
      ball.contactDmg = 1;
    },
    onBallHit(sim, ball, enemy) {
      sim.emitText(enemy.x, enemy.y - enemy.radius - 12, `FIB ${ball.state.cur}!`, '#34d399');
      const next = Math.min(34, ball.state.prev + ball.state.cur);
      ball.state.prev = ball.state.cur;
      ball.state.cur = next;
      ball.contactDmg = next;
    },
  },

  icecone: {
    onInit(sim, ball) {
      ball.state = { timer: 1.1 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 2.0;
        sim.addHazard(
          {
            kind: 'ice_bomb',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            radius: 26,
            fuse: 0.85,
            ttl: 1.0,
          },
          4
        );
      }
    },
  },

  blade: {
    onInit(sim, ball) {
      ball.state = { spawnTimer: 3.0, count: 2 };
      for (let i = 0; i < 2; i++) {
        addOrbitHelper(sim, ball, {
          kind: 'blade',
          orbitAngle: i * Math.PI,
          orbitRadius: 78,
          angularSpeed: 4.5,
          hitRadius: 18,
          dmg: 4,
          knockback: 140,
        });
      }
    },
    onUpdate(sim, ball, dt) {
      if (ball.state.count >= 6) return;
      ball.state.spawnTimer -= dt;
      if (ball.state.spawnTimer <= 0) {
        ball.state.spawnTimer = 3.0;
        ball.state.count += 1;
        addOrbitHelper(sim, ball, {
          kind: 'blade',
          orbitAngle: 0,
          orbitRadius: 78,
          angularSpeed: 4.5,
          hitRadius: 18,
          dmg: 4,
          knockback: 140,
        });
        reindexParentHelpers(sim, ball.id, 'blade');
        sim.emitText(ball.x, ball.y - ball.radius - 8, `${ball.state.count} BLADES!`, '#d8b4fe');
      }
    },
  },

  machinegun: {
    onInit(sim, ball) {
      ball.state = { timer: 0.45 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 0.28;
        const a = aimAngleToEnemy(sim, ball, 0.08);
        sim.addProjectile({
          kind: 'bullet',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 6),
          y: ball.y + Math.sin(a) * (ball.radius + 6),
          vx: Math.cos(a) * 560,
          vy: Math.sin(a) * 560,
          radius: 8,
          dmg: 2,
          bouncesLeft: 0,
          ttl: 1.5,
          color: '#fbbf24',
        });
        sim.emitEvent('ability', { kind: 'shot', owner: ball.owner });
      }
    },
  },

  poisonspike: {
    onInit(sim, ball) {
      ball.state = { cd: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
    },
    onWallHit(sim, ball, hit) {
      if (ball.state.cd > 0) return;
      ball.state.cd = 0.16;
      sim.addHazard(
        {
          kind: 'poison_spike',
          owner: ball.owner,
          x: hit.x + hit.nx * 18,
          y: hit.y + hit.ny * 18,
          nx: hit.nx,
          ny: hit.ny,
          radius: 30,
          dmg: 5,
          poisonTicks: 3,
          slowDuration: 0.85,
          hitCooldown: 0,
          ttl: 28,
        },
        8
      );
    },
  },

  /**
   * Cell Ball: 15 HP, 5 contact DMG. Takes 3s to mature while growing.
   * When destroyed at maturity (max generation 2 -> 9 cells cap), splits into 3 new 15-HP cells!
   */
  cell: {
    onInit(sim, ball) {
      ball.state = {
        age: 0,
        mature: false,
        generation: ball.generation || 0,
      };
      ball.contactDmg = 5;
    },
    onUpdate(sim, ball, dt) {
      if (ball.state.mature) return;
      ball.state.age += dt;
      const frac = Math.min(1, ball.state.age / 3.0);
      ball.radius = 34 + frac * 16;
      if (ball.state.age >= 3.0) {
        ball.state.mature = true;
        sim.emitText(ball.x, ball.y - ball.radius - 6, 'MATURE!', '#34d399');
      }
    },
    onDeath(sim, ball) {
      if (!ball.state.mature || ball.state.generation >= 2) return;
      const activeTeamCells = sim.balls.filter((b) => b.owner === ball.owner && b.hp > 0).length;
      const toSpawn = Math.min(3, 9 - activeTeamCells);
      if (toSpawn <= 0) return;
      const baseAngle = Math.atan2(ball.vy, ball.vx);
      for (let i = 0; i < toSpawn; i++) {
        const a = baseAngle + (i * Math.PI * 2) / toSpawn;
        const speed = 355;
        sim.spawnSplitBall({
          owner: ball.owner,
          ballId: 'cell',
          generation: ball.state.generation + 1,
          x: Math.max(sim.bounds.left + 36, Math.min(sim.bounds.right - 36, ball.x + Math.cos(a) * 32)),
          y: Math.max(sim.bounds.top + 36, Math.min(sim.bounds.bottom - 36, ball.y + Math.sin(a) * 32)),
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          radius: 34,
          hp: 15,
          contactDmg: 5,
        });
      }
      sim.emitText(ball.x, ball.y - 24, 'MITOSIS x3!', '#34d399');
      sim.addParticleBurst(ball.x, ball.y, '#6ee7b7', 16);
      sim.emitEvent('ability', { kind: 'split', owner: ball.owner });
    },
  },

  axe: {
    onInit(sim, ball) {
      ball.state = { baseSpeed0: ball.baseSpeed };
      addOrbitHelper(sim, ball, {
        kind: 'axe',
        orbitAngle: 0,
        orbitRadius: 170,
        angularSpeed: 4.1,
        hitRadius: 34,
        dmg: 10,
        knockback: 240,
      });
    },
    onUpdate(sim, ball) {
      const missingRatio = Math.max(0, 1 - ball.hp / ball.maxHp);
      const mult = 1 + missingRatio * 1.15;
      ball.baseSpeed = Math.min(620, ball.state.baseSpeed0 * mult);
      for (const h of sim.helpers) {
        if (h.parentId === ball.id && h.kind === 'axe') {
          h.angularSpeed = 4.1 * (1 + missingRatio * 1.75);
        }
      }
    },
  },

  thief: {
    onInit(sim, ball) {
      ball.state = { timer: 0.6 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        const hpRatio = Math.max(0.15, ball.hp / ball.maxHp);
        ball.state.timer = 0.25 + hpRatio * 0.65;
        const a = aimAngleToEnemy(sim, ball, 0.05);
        sim.addProjectile({
          kind: 'knife',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 8),
          y: ball.y + Math.sin(a) * (ball.radius + 8),
          vx: Math.cos(a) * 550,
          vy: Math.sin(a) * 550,
          radius: 12,
          dmg: 4,
          bouncesLeft: 0,
          ttl: 1.65,
          color: '#e4e4e7',
        });
        sim.emitEvent('ability', { kind: 'knife', owner: ball.owner });
      }
    },
  },

  reforge: {
    onInit(sim, ball) {
      ball.state = { cd: 0 };
      const a = Math.atan2(ball.vy, ball.vx) + 0.65;
      sim.addHelper({
        kind: 'forge_orb',
        owner: ball.owner,
        parentId: ball.id,
        x: ball.x + Math.cos(a) * 64,
        y: ball.y + Math.sin(a) * 64,
        vx: Math.cos(a) * 290,
        vy: Math.sin(a) * 290,
        speed: 290,
        radius: 20,
        dmg: 3,
        forgeLevel: 1,
        hitCooldowns: {},
      });
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
    },
    onWallHit(sim, ball) {
      if (ball.state.cd > 0) return;
      ball.state.cd = 0.25;
      const orb = sim.helpers.find((h) => h.parentId === ball.id && h.kind === 'forge_orb');
      if (!orb) return;
      if (orb.forgeLevel < 8) {
        orb.forgeLevel += 1;
        orb.dmg = Math.min(16, orb.dmg + 2);
        orb.radius = Math.min(34, orb.radius + 1.8);
        orb.speed = Math.min(540, orb.speed + 24);
        const cur = Math.hypot(orb.vx, orb.vy) || 1;
        orb.vx = (orb.vx / cur) * orb.speed;
        orb.vy = (orb.vy / cur) * orb.speed;
        sim.emitText(orb.x, orb.y - orb.radius - 8, `FORGE +${orb.dmg}`, '#fdba74');
      }
    },
  },

  snake: {
    onInit(sim, ball) {
      ball.state = { segCount: 9, growthTimer: 1.1, path: [], tailCds: {}, biteCd: 0 };
      ball.tail = [];
    },
    onUpdate(sim, ball, dt) {
      ball.state.biteCd = Math.max(0, ball.state.biteCd - dt);
      ball.state.growthTimer -= dt;
      if (ball.state.growthTimer <= 0 && ball.state.segCount < 16) {
        ball.state.growthTimer = 1.1;
        ball.state.segCount += 1;
      }

      const path = ball.state.path;
      if (path.length === 0 || Math.hypot(ball.x - path[0].x, ball.y - path[0].y) >= 8) {
        path.unshift({ x: ball.x, y: ball.y });
        if (path.length > 125) path.length = 125;
      }

      // Build thick trailing body/tail segments along path history
      const tail = [];
      let pathIdx = 0;
      let targetDist = 30;
      let accum = 0;
      let prev = { x: ball.x, y: ball.y };
      for (let s = 0; s < ball.state.segCount && pathIdx < path.length; s++) {
        while (pathIdx < path.length) {
          const pt = path[pathIdx];
          const stepLen = Math.hypot(pt.x - prev.x, pt.y - prev.y);
          if (accum + stepLen >= targetDist) {
            const need = targetDist - accum;
            const t = stepLen > 0.001 ? need / stepLen : 0;
            const sx = prev.x + (pt.x - prev.x) * t;
            const sy = prev.y + (pt.y - prev.y) * t;
            const r = Math.max(22, Math.round(40 - (s / ball.state.segCount) * 16));
            tail.push({ x: sx, y: sy, r });
            prev = { x: sx, y: sy };
            accum = 0;
            targetDist = 19;
            break;
          }
          accum += stepLen;
          prev = pt;
          pathIdx++;
        }
      }
      ball.tail = tail;

      for (const k of Object.keys(ball.state.tailCds)) {
        ball.state.tailCds[k] -= dt;
        if (ball.state.tailCds[k] <= 0) delete ball.state.tailCds[k];
      }
      for (const enemy of sim.getEnemyBalls(ball.owner)) {
        if (ball.state.tailCds[enemy.id]) continue;
        for (const seg of ball.tail) {
          const dx = enemy.x - seg.x;
          const dy = enemy.y - seg.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= enemy.radius + seg.r * 0.92) {
            ball.state.tailCds[enemy.id] = 0.24;
            sim.dealDamage(enemy, 8, ball.owner, 'snake');
            if (dist > 0.01) {
              enemy.vx += (dx / dist) * 230;
              enemy.vy += (dy / dist) * 230;
            }
            break;
          }
        }
      }
    },
    onBallHit(sim, ball, other) {
      if (ball.state.biteCd > 0) return;
      ball.state.biteCd = 0.35;
      sim.dealDamage(other, 6, ball.owner, 'snake_bite');
      sim.applyPoison(other, 2, 0.7, 1, ball.owner);
      sim.emitText(other.x, other.y - other.radius - 10, 'FANG!', '#4ade80');
    },
  },

  blackspider: {
    onInit(sim, ball) {
      ball.state = { cd: 0, lastAnchor: null };
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
    },
    onWallHit(sim, ball, hit) {
      if (ball.state.cd > 0) return;
      ball.state.cd = 0.25;
      addWallSpanHazard(sim, ball, hit, {
        minSpan: 70,
        maxPerOwner: 8,
        hazard: {
          kind: 'web_line',
          variant: 'black',
          dmg: 5,
          slowDuration: 0.35,
          healOwner: 1.5,
          ttl: 16,
        },
      });
      sim.emitEvent('ability', { kind: 'web', owner: ball.owner });
    },
  },

  bomb: {
    onInit(sim, ball) {
      ball.state = { timer: 0.55 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.25;
        const a = aimAngleToEnemy(sim, ball, 0.25);
        sim.addHazard(
          {
            kind: 'bomb',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            vx: Math.cos(a) * 195,
            vy: Math.sin(a) * 195,
            radius: 28,
            blastRadius: 155,
            armDelay: 0.16,
            fuse: 1.15,
            dmg: 13,
            knockback: 340,
            ttl: 1.4,
          },
          5
        );
      }
    },
  },

  electric: {
    onBallHit(sim, ball, enemy) {
      sim.dealDamage(enemy, 5, ball.owner, 'electric');
      enemy.stunTimer = Math.max(enemy.stunTimer, 0.55);
      sim.emitText(enemy.x, enemy.y - enemy.radius - 10, 'ZAP!', '#fde047');
      sim.addParticleBurst(enemy.x, enemy.y, '#fef08a', 10);
      sim.emitEvent('ability', { kind: 'electric', owner: ball.owner });
    },
  },

  electroking: {
    onInit(sim, ball) {
      ball.state = { cd: 0, lastAnchor: null };
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
    },
    onWallHit(sim, ball, hit) {
      if (ball.state.cd > 0) return;
      ball.state.cd = 0.16;
      const added = addWallSpanHazard(sim, ball, hit, {
        requirePrev: true,
        minSpan: 75,
        maxPerOwner: 6,
        hazard: {
          kind: 'laser_beam',
          variant: 'electric',
          armTimer: 0.28,
          dmg: 4,
          tickRate: 0.48,
          ttl: 20,
          tickTimers: {},
        },
      });
      if (added) sim.emitEvent('ability', { kind: 'laserCharge', owner: ball.owner });
    },
  },

  bow: {
    onInit(sim, ball) {
      ball.state = { timer: 0.9 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.45;
        const a = aimAngleToEnemy(sim, ball, 0.04);
        sim.addProjectile({
          kind: 'arrow',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 8),
          y: ball.y + Math.sin(a) * (ball.radius + 8),
          vx: Math.cos(a) * 640,
          vy: Math.sin(a) * 640,
          radius: 12,
          dmg: 6,
          bouncesLeft: 3,
          ttl: 3.2,
          color: '#fbbf24',
        });
        sim.emitEvent('ability', { kind: 'bow', owner: ball.owner });
      }
    },
  },

  virus: {
    onInit(sim, ball) {
      ball.state = { pulseTimer: 1.8 };
    },
    onBallHit(sim, ball, enemy) {
      enemy.virusStacks = Math.min(4, (enemy.virusStacks || 0) + 1);
      sim.applyPoison(enemy, 1 + enemy.virusStacks, 4, ball.owner);
      sim.emitText(enemy.x, enemy.y - enemy.radius - 10, `VIRUS x${enemy.virusStacks}`, '#c084fc');
      sim.addParticleBurst(enemy.x, enemy.y, '#a855f7', 8);
    },
    onUpdate(sim, ball, dt) {
      ball.state.pulseTimer -= dt;
      if (ball.state.pulseTimer <= 0) {
        ball.state.pulseTimer = 2.0;
        for (const enemy of sim.getEnemyBalls(ball.owner)) {
          if (Math.hypot(enemy.x - ball.x, enemy.y - ball.y) <= ball.radius + enemy.radius + 55) {
            enemy.virusStacks = Math.min(4, (enemy.virusStacks || 0) + 1);
            sim.applyPoison(enemy, 1 + enemy.virusStacks, 3, ball.owner);
            sim.addParticleBurst(enemy.x, enemy.y, '#4ade80', 6);
          }
        }
      }
    },
  },

  hook: {
    onInit(sim, ball) {
      ball.state = { timer: 0.7 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.55;
        const a = aimAngleToEnemy(sim, ball, 0.05);
        sim.addProjectile({
          kind: 'hook',
          owner: ball.owner,
          parentId: ball.id,
          x: ball.x + Math.cos(a) * (ball.radius + 8),
          y: ball.y + Math.sin(a) * (ball.radius + 8),
          vx: Math.cos(a) * 720,
          vy: Math.sin(a) * 720,
          radius: 21,
          dmg: 10,
          bouncesLeft: 1,
          spinDuration: 0.95,
          ttl: 2.0,
          color: '#94a3b8',
        });
        sim.emitEvent('ability', { kind: 'harpoon', owner: ball.owner });
      }
    },
  },

  charge: {
    onInit(sim, ball) {
      ball.state = { charge: 0 };
      ball.contactDmg = 2;
    },
    onUpdate(sim, ball, dt) {
      ball.state.charge = Math.min(1, ball.state.charge + dt / 2.8);
      ball.contactDmg = Math.round(2 + ball.state.charge * 22);
    },
    onBallHit(sim, ball, enemy) {
      const ch = ball.state.charge;
      if (ch >= 0.4) {
        sim.emitText(enemy.x, enemy.y - enemy.radius - 10, `SLAM ${ball.contactDmg}!`, '#22d3ee');
        const dx = enemy.x - ball.x;
        const dy = enemy.y - ball.y;
        const d = Math.hypot(dx, dy) || 1;
        enemy.vx += (dx / d) * (240 * ch);
        enemy.vy += (dy / d) * (240 * ch);
        sim.addParticleBurst(enemy.x, enemy.y, '#67e8f9', 10);
      }
      ball.state.charge = 0;
      ball.contactDmg = 2;
    },
  },

  burst: {
    onInit(sim, ball) {
      ball.state = { timer: 1.5 };
      ball.contactDmg = 3;
    },
    onUpdate(sim, ball, dt) {
      ball.contactDmg = ball.dashTimer > 0 ? 10 : 3;
      ball.state.timer -= dt;
      if (ball.state.timer <= 0 && ball.stunTimer <= 0 && !ball.trappedCageId) {
        ball.state.timer = 2.5;
        ball.dashTimer = 0.65;
        const a = aimAngleToEnemy(sim, ball, 0.12);
        const burstSpeed = ball.baseSpeed * 1.9;
        ball.vx = Math.cos(a) * burstSpeed;
        ball.vy = Math.sin(a) * burstSpeed;
        sim.emitText(ball.x, ball.y - ball.radius - 8, 'BURST!', '#fb923c');
        sim.addParticleBurst(ball.x, ball.y, '#fdba74', 10);
        sim.emitEvent('ability', { kind: 'dash', owner: ball.owner });
      }
    },
    onBallHit(sim, ball, enemy) {
      if (ball.dashTimer > 0) {
        const dx = enemy.x - ball.x;
        const dy = enemy.y - ball.y;
        const d = Math.hypot(dx, dy) || 1;
        enemy.vx += (dx / d) * 260;
        enemy.vy += (dy / d) * 260;
        sim.emitText(enemy.x, enemy.y - enemy.radius - 10, 'CRASH!', '#fbbf24');
      }
    },
  },

  bigspike: {
    onInit(sim, ball) {
      ball.state = { cd: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
    },
    onWallHit(sim, ball, hit) {
      if (ball.state.cd > 0) return;
      ball.state.cd = 0.2;
      sim.addHazard(
        {
          kind: 'poison_spike',
          variant: 'big',
          owner: ball.owner,
          x: hit.x + hit.nx * 24,
          y: hit.y + hit.ny * 24,
          nx: hit.nx,
          ny: hit.ny,
          radius: 42,
          dmg: 8,
          poisonTicks: 0,
          slowDuration: 0.65,
          hitCooldown: 0,
          ttl: 30,
        },
        6
      );
    },
  },

  ray: {
    onInit(sim, ball) {
      ball.state = { cd: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
    },
    onWallHit(sim, ball, hit) {
      if (ball.state.cd > 0) return;
      ball.state.cd = 0.55;
      sim.addHazard(
        {
          kind: 'turret',
          beamTurret: true,
          owner: ball.owner,
          x: hit.x + hit.nx * 18,
          y: hit.y + hit.ny * 18,
          nx: hit.nx,
          ny: hit.ny,
          radius: 22,
          fireTimer: 1.1,
          fireRate: 2.75,
          ttl: 20,
        },
        2
      );
      sim.emitEvent('ability', { kind: 'deploy', owner: ball.owner });
    },
  },

  range: {
    onInit(sim, ball) {
      ball.state = { pulse: 0 };
      sim.addHazard(
        {
          kind: 'red_zone',
          variant: 'range',
          owner: ball.owner,
          followParentId: ball.id,
          x: ball.x,
          y: ball.y,
          radius: 145,
          dmg: 3,
          tickRate: 0.45,
          ttl: 999,
          tickTimers: {},
        },
        1
      );
    },
    onUpdate(sim, ball, dt) {
      ball.state.pulse += dt * 3;
    },
  },

  acid: {
    onInit(sim, ball) {
      ball.state = { timer: 1.0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.9;
        const b = sim.bounds;
        const px = Math.max(b.left + 75, Math.min(b.right - 75, ball.x + (sim.rng() - 0.5) * 90));
        const py = Math.max(b.top + 75, Math.min(b.bottom - 75, ball.y + (sim.rng() - 0.5) * 90));
        sim.addHazard(
          {
            kind: 'red_zone',
            variant: 'acid',
            owner: ball.owner,
            x: px,
            y: py,
            radius: 74,
            dmg: 3,
            tickRate: 0.35,
            ttl: 10,
            tickTimers: {},
          },
          6
        );
        sim.emitEvent('ability', { kind: 'zone', owner: ball.owner });
      }
    },
  },

  slime: {
    onInit(sim, ball) {
      ball.state = { timer: 0.9, generation: ball.generation || 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.7;
        sim.addHazard(
          {
            kind: 'red_zone',
            variant: 'slime',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            radius: Math.max(40, Math.round(ball.radius * 1.15)),
            dmg: 1,
            slowDuration: 0.75,
            tickRate: 0.42,
            ttl: 7.5,
            tickTimers: {},
          },
          6
        );
      }
    },
    onDeath(sim, ball) {
      if (ball.state.generation >= 2) return;
      const activeTeam = sim.balls.filter((b) => b.owner === ball.owner && b.hp > 0).length;
      const toSpawn = Math.min(2, 6 - activeTeam);
      if (toSpawn <= 0) return;
      const nextGen = ball.state.generation + 1;
      const childHp = nextGen === 1 ? 45 : 20;
      const childRadius = nextGen === 1 ? 36 : 26;
      const baseAngle = Math.atan2(ball.vy, ball.vx);
      for (let i = 0; i < toSpawn; i++) {
        const a = baseAngle + (i === 0 ? -0.8 : 0.8);
        sim.spawnSplitBall({
          owner: ball.owner,
          ballId: 'slime',
          generation: nextGen,
          x: Math.max(sim.bounds.left + childRadius, Math.min(sim.bounds.right - childRadius, ball.x + Math.cos(a) * 28)),
          y: Math.max(sim.bounds.top + childRadius, Math.min(sim.bounds.bottom - childRadius, ball.y + Math.sin(a) * 28)),
          vx: Math.cos(a) * 345,
          vy: Math.sin(a) * 345,
          radius: childRadius,
          hp: childHp,
          contactDmg: 0,
        });
      }
      sim.emitText(ball.x, ball.y - 20, 'SPLIT!', '#4ade80');
      sim.addParticleBurst(ball.x, ball.y, '#86efac', 14);
      sim.emitEvent('ability', { kind: 'split', owner: ball.owner });
    },
  },

  potion: {
    onInit(sim, ball) {
      ball.state = { timer: 0.9 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 2.7;
        const kinds = ['potion_freeze', 'potion_poison', 'potion_dmg'];
        const variant = kinds[Math.floor(sim.rng() * kinds.length)];
        const b = sim.bounds;
        const enemy = sim.getClosestEnemy(ball);
        const tx = enemy ? (ball.x + enemy.x) * 0.5 : ball.x;
        const ty = enemy ? (ball.y + enemy.y) * 0.5 : ball.y;
        sim.addHazard(
          {
            kind: 'red_zone',
            variant,
            owner: ball.owner,
            x: Math.max(b.left + 66, Math.min(b.right - 66, tx + (sim.rng() - 0.5) * 90)),
            y: Math.max(b.top + 66, Math.min(b.bottom - 66, ty + (sim.rng() - 0.5) * 90)),
            radius: 66,
            dmg: variant === 'potion_dmg' ? 4 : variant === 'potion_poison' ? 1.5 : 2,
            speedDmgScale: variant === 'potion_freeze',
            poisonTicks: variant === 'potion_poison' ? 3 : 0,
            slowDuration: variant === 'potion_freeze' ? 0.9 : variant === 'potion_poison' ? 0.5 : 0,
            tickRate: 0.52,
            ttl: 4.0,
            tickTimers: {},
          },
          2
        );
        sim.emitEvent('ability', { kind: 'zone', owner: ball.owner });
      }
    },
  },

  robux: {
    onInit(sim, ball) {
      ball.state = { timer: 0.4, elapsed: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.elapsed += dt;
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = Math.max(0.24, 0.85 - ball.state.elapsed * 0.025);
        const a = aimAngleToEnemy(sim, ball, 0.14);
        sim.addProjectile({
          kind: 'robux',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 8),
          y: ball.y + Math.sin(a) * (ball.radius + 8),
          vx: Math.cos(a) * 540,
          vy: Math.sin(a) * 540,
          radius: 13,
          dmg: 3,
          bouncesLeft: 1,
          ttl: 2.2,
          color: '#22c55e',
        });
        sim.emitEvent('ability', { kind: 'shot', owner: ball.owner });
      }
    },
  },

  medic: {
    onInit(sim, ball) {
      ball.state = { timer: 1.0, healTimer: 2.4 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.7;
        const a = aimAngleToEnemy(sim, ball, 0.06);
        sim.addProjectile({
          kind: 'syringe',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 8),
          y: ball.y + Math.sin(a) * (ball.radius + 8),
          vx: Math.cos(a) * 560,
          vy: Math.sin(a) * 560,
          radius: 11,
          dmg: 4,
          bouncesLeft: 0,
          ttl: 1.6,
          color: '#ef4444',
        });
        sim.emitEvent('ability', { kind: 'shot', owner: ball.owner });
      }
      ball.state.healTimer -= dt;
      if (ball.state.healTimer <= 0) {
        ball.state.healTimer = 2.8;
        sim.healBall(ball, 7);
        sim.addParticleBurst(ball.x, ball.y, '#4ade80', 8);
      }
    },
  },

  candybox: {
    onInit(sim, ball) {
      ball.state = { timer: 0.7, hurtCd: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.hurtCd = Math.max(0, ball.state.hurtCd - dt);
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.25;
        const big = sim.rng() < 0.4;
        const a = aimAngleToEnemy(sim, ball, 0.35);
        const spd = 240 + sim.rng() * 80;
        sim.addHazard(
          {
            kind: 'pickup_drop',
            variant: big ? 'candy_big' : 'candy_small',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            allyGrace: 0.75,
            radius: big ? 26 : 21,
            heal: big ? 3.5 : 2,
            enemyDmg: big ? 12 : 8,
            ttl: 12,
          },
          8
        );
      }
    },
    onTakeDamage(sim, ball, amount) {
      if (amount <= 0 || ball.hp <= 0 || ball.state.hurtCd > 0) return;
      ball.state.hurtCd = 0.6;
      const a = aimAngleToEnemy(sim, ball, 0.45);
      sim.addHazard(
        {
          kind: 'pickup_drop',
          variant: 'candy_small',
          owner: ball.owner,
          x: ball.x,
          y: ball.y,
          vx: Math.cos(a) * 230,
          vy: Math.sin(a) * 230,
          allyGrace: 0.75,
          radius: 21,
          heal: 2,
          enemyDmg: 8,
          ttl: 12,
        },
        8
      );
    },
  },

  cactus: {
    onInit(sim, ball) {
      ball.state = { timer: 1.0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 2.1;
        sim.addHazard(
          {
            kind: 'cactus',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            radius: 34,
            dmg: 7,
            knockback: 220,
            hitCooldown: 0,
            ttl: 16,
          },
          5
        );
      }
    },
  },

  spear: {
    onInit(sim, ball) {
      ball.state = { timer: 1.1, thrustTimer: 0 };
      addOrbitHelper(sim, ball, {
        kind: 'spear',
        orbitAngle: ball.owner === 1 ? 0 : Math.PI,
        orbitRadius: ball.radius + 76,
        angularSpeed: 0,
        hitRadius: 20,
        dmg: 6,
        knockback: 210,
      });
    },
    onUpdate(sim, ball, dt) {
      const spear = sim.helpers.find((h) => h.parentId === ball.id && h.kind === 'spear');
      if (!spear) return;
      const enemy = sim.getClosestEnemy(ball);
      if (enemy) {
        const desired = Math.atan2(enemy.y - ball.y, enemy.x - ball.x);
        let diff = desired - spear.orbitAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        spear.orbitAngle += Math.max(-3.6 * dt, Math.min(3.6 * dt, diff));
      }
      if (ball.state.thrustTimer > 0) {
        ball.state.thrustTimer -= dt;
        spear.orbitRadius = ball.radius + 118;
      } else {
        spear.orbitRadius = ball.radius + 76;
      }
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.45;
        ball.state.thrustTimer = 0.28;
        ball.dashTimer = 0.22;
        ball.vx = Math.cos(spear.orbitAngle) * ball.baseSpeed * 1.45;
        ball.vy = Math.sin(spear.orbitAngle) * ball.baseSpeed * 1.45;
        sim.emitEvent('ability', { kind: 'dash', owner: ball.owner });
      }
    },
  },

  apple: {
    onInit(sim, ball) {
      ball.state = { timer: 0.65 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.25;
        const a = aimAngleToEnemy(sim, ball, 0.3);
        const spd = 245 + sim.rng() * 75;
        sim.addHazard(
          {
            kind: 'pickup_drop',
            variant: 'apple',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            allyGrace: 0.75,
            radius: 26,
            heal: 4,
            enemyDmg: 10,
            ttl: 12,
          },
          7
        );
      }
    },
  },

  shuriken: {
    onInit(sim, ball) {
      ball.state = { timer: 1.1, volley: 1 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 2.5;
        const base = aimAngleToEnemy(sim, ball, 0.08);
        const count = ball.state.volley;
        for (let k = 0; k < count; k++) {
          const offset = (k - (count - 1) * 0.5) * 0.24;
          const a = base + offset;
          sim.addProjectile({
            kind: 'shuriken',
            owner: ball.owner,
            x: ball.x + Math.cos(a) * (ball.radius + 8),
            y: ball.y + Math.sin(a) * (ball.radius + 8),
            vx: Math.cos(a) * 520,
            vy: Math.sin(a) * 520,
            radius: 14,
            dmg: 4,
            bouncesLeft: 3,
            ttl: 3.0,
            color: '#38bdf8',
          });
        }
        ball.state.volley = Math.min(4, count + 1);
        sim.emitEvent('ability', { kind: 'knife', owner: ball.owner });
      }
    },
  },

  poisongas: {
    onInit(sim, ball) {
      ball.state = { timer: 1.0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 2.3;
        const a = sim.rng() * Math.PI * 2;
        sim.addHazard(
          {
            kind: 'red_zone',
            variant: 'gas',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            vx: Math.cos(a) * 48,
            vy: Math.sin(a) * 48,
            radius: 86,
            dmg: 2,
            poisonTicks: 2,
            tickRate: 0.45,
            ttl: 9,
            tickTimers: {},
          },
          4
        );
        sim.emitEvent('ability', { kind: 'zone', owner: ball.owner });
      }
    },
  },
};

Object.assign(ABILITY_HANDLERS, EXTRA_ABILITY_HANDLERS);

