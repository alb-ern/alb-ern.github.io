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
    orbitRadius: opts.orbitRadius || 46,
    angularSpeed: opts.angularSpeed || 3.4,
    hitRadius: opts.hitRadius || 12,
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
      x: ball.x + Math.cos(a) * (ball.radius + 6),
      y: ball.y + Math.sin(a) * (ball.radius + 6),
      vx: Math.cos(a) * 440,
      vy: Math.sin(a) * 440,
      radius: 7,
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

export const ABILITY_HANDLERS = {
  /**
   * Verity Ball: Stage 1 (Happy: 5 DMG) -> Stage 2 (Displeased: 10 DMG) -> Stage 3 (Monster: 40 DMG).
   * ~12% chance to advance stage each time Verity takes damage.
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
      const cur = { x: hit.x, y: hit.y };
      const prev = ball.state.lastAnchor;
      ball.state.lastAnchor = cur;

      let p1 = prev;
      if (!p1 || Math.hypot(cur.x - p1.x, cur.y - p1.y) < 70) {
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
          kind: 'web_line',
          owner: ball.owner,
          x1: p1.x,
          y1: p1.y,
          x2: cur.x,
          y2: cur.y,
          dmg: 6,
          slowDuration: 0.35,
          ttl: 24,
        },
        14
      );
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
        const cx = Math.max(b.left + 80, Math.min(b.right - 80, ball.x + Math.cos(dir) * 85));
        const cy = Math.max(b.top + 80, Math.min(b.bottom - 80, ball.y + Math.sin(dir) * 85));
        const clusterId = sim.nextEntityId++;
        const offsets = [
          { dx: 0, dy: -26 },
          { dx: -24, dy: 20 },
          { dx: 24, dy: 20 },
        ];
        for (const off of offsets) {
          sim.addHazard(
            {
              kind: 'shackle_cage',
              clusterId,
              owner: ball.owner,
              x: Math.max(b.left + 60, Math.min(b.right - 60, cx + off.dx)),
              y: Math.max(b.top + 60, Math.min(b.bottom - 60, cy + off.dy)),
              radius: 56,
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
          orbitRadius: 56,
          angularSpeed: 3.3,
          hitRadius: 11,
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
            radius: 20,
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
            radius: 74,
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
              radius: 16,
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
          radius: 13,
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
            x: ball.x + Math.cos(a) * (ball.radius + 6),
            y: ball.y + Math.sin(a) * (ball.radius + 6),
            vx: Math.cos(a) * 255,
            vy: Math.sin(a) * 255,
            speed: 265,
            turnRate: 4.5,
            radius: 8,
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
          x: hit.x + hit.nx * 14,
          y: hit.y + hit.ny * 14,
          nx: hit.nx,
          ny: hit.ny,
          radius: 15,
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
            radius: 18,
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
          orbitRadius: 42,
          angularSpeed: 4.5,
          hitRadius: 12,
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
          orbitRadius: 42,
          angularSpeed: 4.5,
          hitRadius: 12,
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
          x: ball.x + Math.cos(a) * (ball.radius + 5),
          y: ball.y + Math.sin(a) * (ball.radius + 5),
          vx: Math.cos(a) * 560,
          vy: Math.sin(a) * 560,
          radius: 5,
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
          x: hit.x + hit.nx * 14,
          y: hit.y + hit.ny * 14,
          nx: hit.nx,
          ny: hit.ny,
          radius: 23,
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
      ball.radius = 17 + frac * 8;
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
          x: Math.max(sim.bounds.left + 20, Math.min(sim.bounds.right - 20, ball.x + Math.cos(a) * 18)),
          y: Math.max(sim.bounds.top + 20, Math.min(sim.bounds.bottom - 20, ball.y + Math.sin(a) * 18)),
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          radius: 17,
          hp: 15,
          contactDmg: 5,
        });
      }
      sim.emitText(ball.x, ball.y - 16, 'MITOSIS x3!', '#34d399');
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
        orbitRadius: 43,
        angularSpeed: 4.0,
        hitRadius: 17,
        dmg: 8,
        knockback: 230,
      });
    },
    onUpdate(sim, ball) {
      const missingRatio = Math.max(0, 1 - ball.hp / ball.maxHp);
      const mult = 1 + missingRatio * 1.15;
      ball.baseSpeed = Math.min(620, ball.state.baseSpeed0 * mult);
      for (const h of sim.helpers) {
        if (h.parentId === ball.id && h.kind === 'axe') {
          h.angularSpeed = 4.0 * (1 + missingRatio * 1.8);
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
          x: ball.x + Math.cos(a) * (ball.radius + 6),
          y: ball.y + Math.sin(a) * (ball.radius + 6),
          vx: Math.cos(a) * 550,
          vy: Math.sin(a) * 550,
          radius: 8,
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
        x: ball.x + Math.cos(a) * 32,
        y: ball.y + Math.sin(a) * 32,
        vx: Math.cos(a) * 290,
        vy: Math.sin(a) * 290,
        speed: 290,
        radius: 13,
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
        orb.radius = Math.min(23, orb.radius + 1.2);
        orb.speed = Math.min(540, orb.speed + 24);
        const cur = Math.hypot(orb.vx, orb.vy) || 1;
        orb.vx = (orb.vx / cur) * orb.speed;
        orb.vy = (orb.vy / cur) * orb.speed;
        sim.emitText(orb.x, orb.y - orb.radius - 8, `FORGE +${orb.dmg}`, '#fdba74');
      }
    },
  },
};
