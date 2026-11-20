/**
 * Ability handlers for the 20 Meme & Pop-Culture Balls (roster #101 - #120).
 */

function aimAngleToEnemy(sim, ball, spread = 0) {
  const enemy = sim.getClosestEnemy(ball);
  const base = enemy
    ? Math.atan2(enemy.y - ball.y, enemy.x - ball.x)
    : Math.atan2(ball.vy, ball.vx);
  return base + (sim.rng() - 0.5) * 2 * spread;
}

function clampPos(sim, x, y, pad = 42) {
  const b = sim.bounds;
  return {
    x: Math.max(b.left + pad, Math.min(b.right - pad, x)),
    y: Math.max(b.top + pad, Math.min(b.bottom - pad, y)),
  };
}

function countHelpersOfKind(sim, owner, kind) {
  let c = 0;
  for (const h of sim.helpers) {
    if (h.owner === owner && h.kind === kind && !h._dead) c++;
  }
  return c;
}

function getHighestHpEnemy(sim, owner) {
  let best = null;
  for (const e of sim.getEnemyBalls(owner)) {
    if (!best || e.hp > best.hp) best = e;
  }
  return best;
}

function detonateHydrogenNuke(sim, ball, dmg, expandSpeed, label) {
  sim.addHazard(
    {
      kind: 'ring_wave',
      variant: 'nuke',
      owner: ball.owner,
      x: ball.x,
      y: ball.y,
      currentRadius: ball.radius,
      expandSpeed,
      dmg,
      knockback: 310,
      ttl: 1.15,
    },
    3
  );
  sim.addHazard(
    {
      kind: 'red_zone',
      variant: 'fallout',
      owner: ball.owner,
      x: ball.x,
      y: ball.y,
      radius: 76,
      growRate: 16,
      maxRadius: 120,
      dmg: 2.5,
      poisonTicks: 2,
      tickRate: 0.55,
      ttl: 5.2,
      tickTimers: {},
    },
    2
  );
  sim.emitText(ball.x, ball.y - ball.radius - 14, label, '#fef08a');
  sim.addParticleBurst(ball.x, ball.y, '#f97316', 18);
  sim.triggerShake(11, 0.28);
  sim.emitEvent('ability', { kind: 'bomb', owner: ball.owner });
}

function spawnCoughCloud(sim, ball, speed = 85, radius = 62, ttl = 5.4, dmg = 2, poisonTicks = 3) {
  const a = aimAngleToEnemy(sim, ball, 0.22);
  sim.addHazard(
    {
      kind: 'red_zone',
      variant: 'cough_cloud',
      owner: ball.owner,
      x: ball.x + Math.cos(a) * 18,
      y: ball.y + Math.sin(a) * 18,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      radius,
      growRate: 12,
      maxRadius: radius + 36,
      dmg,
      poisonTicks,
      slowDuration: 0.45,
      tickRate: 0.5,
      ttl,
      tickTimers: {},
    },
    4
  );
}

function spawnPinataBurst(sim, ball, projCount, dropCount) {
  const colors = ['#ec4899', '#38bdf8', '#facc15', '#4ade80', '#a855f7'];
  const base = aimAngleToEnemy(sim, ball, 0.2);
  for (let i = 0; i < projCount; i++) {
    const a = base + (i - (projCount - 1) / 2) * 0.42 + (sim.rng() - 0.5) * 0.25;
    sim.addProjectile({
      kind: 'orb',
      owner: ball.owner,
      x: ball.x + Math.cos(a) * (ball.radius + 6),
      y: ball.y + Math.sin(a) * (ball.radius + 6),
      vx: Math.cos(a) * 430,
      vy: Math.sin(a) * 430,
      radius: 10,
      dmg: 4.5,
      bouncesLeft: 1,
      ttl: 1.7,
      color: colors[i % colors.length],
    });
  }
  for (let i = 0; i < dropCount; i++) {
    const a = sim.rng() * Math.PI * 2;
    sim.addHazard(
      {
        kind: 'pickup_drop',
        variant: i === 0 ? 'candy_big' : 'candy',
        owner: ball.owner,
        x: ball.x + Math.cos(a) * 24,
        y: ball.y + Math.sin(a) * 24,
        vx: Math.cos(a) * 190,
        vy: Math.sin(a) * 190,
        radius: 16,
        heal: 2,
        enemyDmg: 5,
        allyGrace: 0.75,
        ttl: 7.5,
      },
      6
    );
  }
}

function fireClaudeBeam(sim, ball, enemy, dmg = 8.5, label = null) {
  let a = aimAngleToEnemy(sim, ball, 0);
  if (enemy) {
    // Predict enemy position ~0.22s ahead
    const leadX = enemy.x + enemy.vx * 0.22;
    const leadY = enemy.y + enemy.vy * 0.22;
    a = Math.atan2(leadY - ball.y, leadX - ball.x);
  }
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  sim.addHazard(
    {
      kind: 'plasma_blast',
      variant: 'ray',
      owner: ball.owner,
      x1: ball.x,
      y1: ball.y,
      x2: ball.x + dx * 860,
      y2: ball.y + dy * 860,
      dx,
      dy,
      dmg,
      hitIds: {},
      ttl: 0.22,
    },
    3
  );
  if (label) sim.emitText(ball.x, ball.y - ball.radius - 12, label, '#fef3c7');
  sim.addParticleBurst(ball.x, ball.y, '#e8956f', 7);
}

export const MEME_ABILITY_HANDLERS = {
  /** 101. Hydrogen Bomb Ball: Menacing 3..2..1 countdown into a thermonuclear shockwave + fallout. */
  hydrogenbomb: {
    onInit(sim, ball) {
      ball.state = { timer: 3.6, lastTick: 4 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      const sec = Math.ceil(ball.state.timer);
      if (sec <= 3 && sec >= 1 && sec < ball.state.lastTick) {
        ball.state.lastTick = sec;
        sim.emitText(ball.x, ball.y - ball.radius - 12, `${sec}...`, '#fde047');
        sim.addParticleBurst(ball.x, ball.y, '#facc15', 5);
      }
      if (ball.state.timer <= 0) {
        ball.state.timer = 3.8;
        ball.state.lastTick = 4;
        detonateHydrogenNuke(sim, ball, 14, 410, 'KABOOM!!');
        sim.applySelfBurn(ball, 5);
      }
    },
    onDeath(sim, ball) {
      detonateHydrogenNuke(sim, ball, 13, 450, 'FINAL NUKE!');
    },
  },

  /** 102. Coughing Baby Ball: Fragile 55 HP underdog spreading toxic cough clouds & panicking when hit. */
  coughingbaby: {
    onInit(sim, ball) {
      ball.state = { coughTimer: 0.75, cryCd: 0 };
      ball.mass = 0.65;
    },
    onUpdate(sim, ball, dt) {
      ball.state.cryCd = Math.max(0, ball.state.cryCd - dt);
      ball.state.coughTimer -= dt;
      if (ball.state.coughTimer <= 0) {
        ball.state.coughTimer = 1.45;
        spawnCoughCloud(sim, ball, 95, 62, 5.4, 2, 3);
        sim.emitText(ball.x, ball.y - ball.radius - 10, '*COUGH*', '#bef264');
        sim.emitEvent('ability', { kind: 'poison', owner: ball.owner });
      }
    },
    onTakeDamage(sim, ball) {
      if (ball.state.cryCd > 0) return;
      ball.state.cryCd = 0.65;
      sim.scaleBallSpeed(ball, 1.12);
      spawnCoughCloud(sim, ball, 125, 58, 4.8, 2.5, 3);
      sim.emitText(ball.x, ball.y - ball.radius - 12, 'WAAAH!', '#fda4af');
    },
    onDeath(sim, ball) {
      spawnCoughCloud(sim, ball, 20, 108, 7.5, 3.5, 4);
      sim.addHazard(
        {
          kind: 'ring_wave',
          variant: 'ghost',
          owner: ball.owner,
          x: ball.x,
          y: ball.y,
          currentRadius: ball.radius,
          expandSpeed: 360,
          dmg: 10,
          knockback: 200,
          ttl: 0.85,
        },
        3
      );
      for (const enemy of sim.getEnemyBalls(ball.owner)) {
        sim.applyPoison(enemy, 2.5, 4, ball.owner, 'coughingbaby');
      }
      sim.emitText(ball.x, ball.y - ball.radius - 14, '*FINAL COUGH*', '#a3e635');
    },
  },

  /** 103. Piñata Ball: Bursts explosive candy shrapnel & healing treats on every bonk and wall bounce. */
  pinata: {
    onInit(sim, ball) {
      ball.state = { shotTimer: 1.45, hurtCd: 0, wallCd: 0, fiestaUsed: false };
    },
    onUpdate(sim, ball, dt) {
      ball.state.hurtCd = Math.max(0, ball.state.hurtCd - dt);
      ball.state.wallCd = Math.max(0, ball.state.wallCd - dt);
      ball.state.shotTimer -= dt;
      if (ball.state.shotTimer <= 0) {
        ball.state.shotTimer = 1.65;
        spawnPinataBurst(sim, ball, 2, 1);
      }
    },
    onWallHit(sim, ball) {
      if (ball.state.wallCd > 0) return;
      ball.state.wallCd = 0.7;
      spawnPinataBurst(sim, ball, 1, 1);
      sim.emitText(ball.x, ball.y - ball.radius - 10, 'CANDY!', '#facc15');
    },
    onTakeDamage(sim, ball) {
      if (!ball.state.fiestaUsed && ball.hp <= ball.maxHp * 0.5) {
        ball.state.fiestaUsed = true;
        spawnPinataBurst(sim, ball, 6, 3);
        sim.emitText(ball.x, ball.y - ball.radius - 14, 'FIESTA!!', '#ec4899');
        return;
      }
      if (ball.state.hurtCd > 0) return;
      ball.state.hurtCd = 0.65;
      spawnPinataBurst(sim, ball, 2, 1);
    },
    onDeath(sim, ball) {
      spawnPinataBurst(sim, ball, 8, 2);
      sim.emitText(ball.x, ball.y - ball.radius - 14, 'PIÑATA POP!', '#f472b6');
    },
  },

  /** 104. Claude Ball: Predicts projectiles to sidestep, pops Refusal Shield, and fires Token Beams. */
  claude: {
    onInit(sim, ball) {
      ball.state = { shieldReady: true, shieldCd: 0, beamTimer: 1.55, dodgeCd: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.dodgeCd = Math.max(0, ball.state.dodgeCd - dt);
      if (!ball.state.shieldReady) {
        ball.state.shieldCd -= dt;
        if (ball.state.shieldCd <= 0) {
          ball.state.shieldReady = true;
          sim.emitText(ball.x, ball.y - ball.radius - 10, 'ALIGNED', '#fef3c7');
        }
      }

      // Predictive sidestep away from incoming enemy projectiles
      if (ball.state.dodgeCd <= 0) {
        for (const p of sim.projectiles) {
          if (p.owner === ball.owner) continue;
          const dx = ball.x - p.x;
          const dy = ball.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 10 && dist < 145) {
            const dot = dx * p.vx + dy * p.vy;
            if (dot > 0) {
              const pLen = Math.hypot(p.vx, p.vy) || 1;
              const side = (dx * p.vy - dy * p.vx) >= 0 ? 1 : -1;
              const perpX = (-p.vy / pLen) * side;
              const perpY = (p.vx / pLen) * side;
              ball.vx = perpX * ball.baseSpeed * 1.18;
              ball.vy = perpY * ball.baseSpeed * 1.18;
              ball.state.dodgeCd = 0.72;
              sim.emitText(ball.x, ball.y - ball.radius - 10, 'PREDICTED', '#e8956f');
              break;
            }
          }
        }
      }

      ball.state.beamTimer -= dt;
      if (ball.state.beamTimer <= 0) {
        ball.state.beamTimer = 1.65;
        const enemy = sim.getClosestEnemy(ball);
        fireClaudeBeam(sim, ball, enemy, 8.5, 'THINKING...');
      }
    },
    onDamagePrevent(sim, ball, amount, sourceOwner, reason) {
      if (ball.state.shieldReady && amount >= 2 && reason !== 'poison') {
        ball.state.shieldReady = false;
        ball.state.shieldCd = 3.2;
        const enemy = sim.getClosestEnemy(ball);
        fireClaudeBeam(sim, ball, enemy, 7, "CAN'T HELP!");
        return 0;
      }
      return amount;
    },
  },

  /** 105. Hypergamy Ball: Locks onto the highest-HP enemy to UPGRADE, rejects weaker foes with ICK! */
  hypergamy: {
    onInit(sim, ball) {
      ball.state = { timer: 1.15 };
      ball.steerRate = 2.4;
    },
    onUpdate(sim, ball, dt) {
      const target = getHighestHpEnemy(sim, ball.owner);
      if (target) {
        const dx = target.x - ball.x;
        const dy = target.y - ball.y;
        const d = Math.hypot(dx, dy) || 1;
        ball.vx += (dx / d) * 160 * dt;
        ball.vy += (dy / d) * 160 * dt;
      }

      ball.state.timer -= dt;
      if (ball.state.timer <= 0 && target) {
        ball.state.timer = 1.55;
        const a = Math.atan2(target.y - ball.y, target.x - ball.x);
        if (target.hp > ball.hp) {
          sim.dealDamage(target, 8, ball.owner, 'hypergamy');
          sim.healBall(ball, 4);
          sim.scaleBallSpeed(ball, 1.03);
          sim.emitText(ball.x, ball.y - ball.radius - 12, 'UPGRADE!', '#f472b6');
        } else {
          sim.addHazard(
            {
              kind: 'ring_wave',
              variant: 'bass',
              owner: ball.owner,
              x: ball.x,
              y: ball.y,
              currentRadius: ball.radius,
              expandSpeed: 320,
              dmg: 6.5,
              knockback: 260,
              ttl: 0.55,
            },
            3
          );
          sim.emitText(ball.x, ball.y - ball.radius - 12, 'ICK!', '#fbbf24');
        }
        for (const off of [-0.14, 0.14]) {
          sim.addProjectile({
            kind: 'dart',
            owner: ball.owner,
            x: ball.x + Math.cos(a + off) * (ball.radius + 8),
            y: ball.y + Math.sin(a + off) * (ball.radius + 8),
            vx: Math.cos(a + off) * 510,
            vy: Math.sin(a + off) * 510,
            radius: 10,
            dmg: 4.5,
            bouncesLeft: 0,
            ttl: 1.6,
            color: '#ec4899',
          });
        }
      }
    },
  },

  /** 106. Iron Dome Ball: Active missile defense intercepting enemy projectiles & launching guided Tamirs. */
  irondome: {
    onInit(sim, ball) {
      ball.state = { interceptCd: 0, salvoTimer: 1.2 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.interceptCd = Math.max(0, ball.state.interceptCd - dt);

      // Shoot down incoming non-piercing enemy projectiles in radar dome
      if (ball.state.interceptCd <= 0) {
        for (let i = sim.projectiles.length - 1; i >= 0; i--) {
          const p = sim.projectiles[i];
          if (p.owner === ball.owner || p.piercing) continue;
          const dist = Math.hypot(p.x - ball.x, p.y - ball.y);
          if (dist <= 165) {
            sim.addParticleBurst(p.x, p.y, '#38bdf8', 9);
            sim.projectiles.splice(i, 1);
            ball.state.interceptCd = 0.52;
            sim.emitText(ball.x, ball.y - ball.radius - 12, 'INTERCEPTED!', '#38bdf8');
            const a = aimAngleToEnemy(sim, ball, 0.05);
            sim.addProjectile({
              kind: 'sniper_round',
              owner: ball.owner,
              x: ball.x + Math.cos(a) * (ball.radius + 8),
              y: ball.y + Math.sin(a) * (ball.radius + 8),
              vx: Math.cos(a) * 580,
              vy: Math.sin(a) * 580,
              radius: 9,
              dmg: 5.5,
              bouncesLeft: 0,
              ttl: 1.5,
              color: '#38bdf8',
            });
            break;
          }
        }
      }

      // Periodic radar-guided interceptor salvo
      ball.state.salvoTimer -= dt;
      if (ball.state.salvoTimer <= 0) {
        ball.state.salvoTimer = 1.6;
        const a = aimAngleToEnemy(sim, ball, 0.08);
        for (const off of [-0.12, 0.12]) {
          sim.addProjectile({
            kind: 'dart',
            owner: ball.owner,
            x: ball.x + Math.cos(a + off) * (ball.radius + 8),
            y: ball.y + Math.sin(a + off) * (ball.radius + 8),
            vx: Math.cos(a + off) * 530,
            vy: Math.sin(a + off) * 530,
            radius: 9,
            dmg: 5,
            bouncesLeft: 1,
            ttl: 1.7,
            color: '#60a5fa',
          });
        }
        sim.addHazard(
          {
            kind: 'ring_wave',
            variant: 'dome',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            currentRadius: ball.radius,
            expandSpeed: 280,
            dmg: 4,
            knockback: 180,
            ttl: 0.42,
          },
          2
        );
      }
    },
  },

  /** 107. Nokia 3310 Ball: Indestructible 2.35x mass brick with flat armor & wall-cracking ringtones. */
  nokia: {
    onInit(sim, ball) {
      ball.mass = 2.35;
      ball.contactDmg = 5;
      ball.state = { wallCd: 0, armorTextCd: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.wallCd = Math.max(0, ball.state.wallCd - dt);
      ball.state.armorTextCd = Math.max(0, ball.state.armorTextCd - dt);
    },
    onDamagePrevent(sim, ball, amount) {
      // Shave off 2 flat damage while letting tiny DoT ticks still deal 55%
      const reduced = Math.max(amount * 0.55, amount - 2);
      if (amount - reduced >= 0.8 && ball.state.armorTextCd <= 0) {
        ball.state.armorTextCd = 0.85;
        sim.emitText(ball.x, ball.y - ball.radius - 10, 'NO SCRATCH!', '#84cc16');
      }
      return reduced;
    },
    onWallHit(sim, ball) {
      if (ball.state.wallCd > 0) return;
      ball.state.wallCd = 0.72;
      sim.triggerShake(6, 0.14);
      sim.addHazard(
        {
          kind: 'ring_wave',
          variant: 'dome',
          owner: ball.owner,
          x: ball.x,
          y: ball.y,
          currentRadius: ball.radius,
          expandSpeed: 310,
          dmg: 5.5,
          knockback: 220,
          ttl: 0.55,
        },
        3
      );
      sim.emitText(ball.x, ball.y - ball.radius - 10, 'BEEP-BOOP!', '#a3e635');
    },
  },

  /** 108. Lag Switch Ball: 999ms ping freeze -> rubberband teleport straight onto lagged enemy spot. */
  lagswitch: {
    onInit(sim, ball) {
      ball.state = { timer: 1.8, lagging: 0, snapX: ball.x, snapY: ball.y, shotTimer: 1.1 };
    },
    onUpdate(sim, ball, dt) {
      const enemy = sim.getClosestEnemy(ball);
      if (ball.state.lagging > 0) {
        ball.state.lagging -= dt;
        ball.vx *= 0.7;
        ball.vy *= 0.7;
        if (ball.state.lagging <= 0) {
          const pos = clampPos(sim, ball.state.snapX, ball.state.snapY, ball.radius + 8);
          ball.x = pos.x;
          ball.y = pos.y;
          const a = aimAngleToEnemy(sim, ball, 0.1);
          ball.vx = Math.cos(a) * ball.baseSpeed * 1.2;
          ball.vy = Math.sin(a) * ball.baseSpeed * 1.2;
          sim.addHazard(
            {
              kind: 'ring_wave',
              variant: 'blood',
              owner: ball.owner,
              x: ball.x,
              y: ball.y,
              currentRadius: ball.radius * 0.7,
              expandSpeed: 350,
              dmg: 8.5,
              knockback: 210,
              ttl: 0.5,
            },
            3
          );
          if (enemy && Math.hypot(enemy.x - ball.x, enemy.y - ball.y) < 210) {
            const rot = (sim.rng() < 0.5 ? 1 : -1) * 1.3;
            const c = Math.cos(rot);
            const s = Math.sin(rot);
            const nvx = enemy.vx * c - enemy.vy * s;
            const nvy = enemy.vx * s + enemy.vy * c;
            enemy.vx = nvx;
            enemy.vy = nvy;
          }
          sim.emitText(ball.x, ball.y - ball.radius - 12, 'PACKET LOSS!', '#ef4444');
          sim.addParticleBurst(ball.x, ball.y, '#4ade80', 10);
        }
        return;
      }

      ball.state.timer -= dt;
      if (ball.state.timer <= 0 && enemy) {
        ball.state.timer = 2.45;
        ball.state.lagging = 0.45;
        ball.state.snapX = enemy.x;
        ball.state.snapY = enemy.y;
        ball.phaseTimer = Math.max(ball.phaseTimer, 0.5);
        sim.emitText(ball.x, ball.y - ball.radius - 12, '999ms...', '#fca5a5');
      }

      ball.state.shotTimer -= dt;
      if (ball.state.shotTimer <= 0) {
        ball.state.shotTimer = 1.2;
        const a = aimAngleToEnemy(sim, ball, 0.14);
        sim.addProjectile({
          kind: 'orb',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 8),
          y: ball.y + Math.sin(a) * (ball.radius + 8),
          vx: Math.cos(a) * 470,
          vy: Math.sin(a) * 470,
          radius: 10,
          dmg: 5,
          bouncesLeft: 1,
          ttl: 1.6,
          color: '#4ade80',
        });
      }
    },
  },

  /** 109. Impostor Ball: Vents underground invisible and pops up right behind enemy for a SUS STAB! */
  impostor: {
    onInit(sim, ball) {
      ball.state = { ventTimer: 1.9, venting: 0, boltTimer: 1.25 };
    },
    onUpdate(sim, ball, dt) {
      const enemy = sim.getClosestEnemy(ball);
      if (ball.state.venting > 0) {
        ball.state.venting -= dt;
        if (ball.state.venting <= 0 && enemy) {
          const eSpd = Math.hypot(enemy.vx, enemy.vy) || 1;
          const behindX = enemy.x - (enemy.vx / eSpd) * (enemy.radius + ball.radius + 14);
          const behindY = enemy.y - (enemy.vy / eSpd) * (enemy.radius + ball.radius + 14);
          const pos = clampPos(sim, behindX, behindY, ball.radius + 8);
          ball.x = pos.x;
          ball.y = pos.y;
          const a = Math.atan2(enemy.y - ball.y, enemy.x - ball.x);
          ball.vx = Math.cos(a) * ball.baseSpeed * 1.25;
          ball.vy = Math.sin(a) * ball.baseSpeed * 1.25;
          sim.dealDamage(enemy, 10.5, ball.owner, 'impostor_stab');
          sim.emitText(enemy.x, enemy.y - enemy.radius - 12, 'SUS STAB!', '#ef4444');
          sim.addParticleBurst(enemy.x, enemy.y, '#ef4444', 12);
          for (const off of [-0.2, 0.2]) {
            sim.addProjectile({
              kind: 'knife',
              owner: ball.owner,
              x: ball.x + Math.cos(a + off) * (ball.radius + 6),
              y: ball.y + Math.sin(a + off) * (ball.radius + 6),
              vx: Math.cos(a + off) * 510,
              vy: Math.sin(a + off) * 510,
              radius: 10,
              dmg: 4.5,
              bouncesLeft: 0,
              ttl: 1.3,
              color: '#dc2626',
            });
          }
        }
        return;
      }

      ball.state.ventTimer -= dt;
      if (ball.state.ventTimer <= 0 && enemy) {
        ball.state.ventTimer = 2.65;
        ball.state.venting = 0.58;
        ball.phaseTimer = Math.max(ball.phaseTimer, 0.62);
        sim.emitText(ball.x, ball.y - ball.radius - 10, 'VENTED!', '#7dd3fc');
        sim.addParticleBurst(ball.x, ball.y, '#94a3b8', 8);
      }

      ball.state.boltTimer -= dt;
      if (ball.state.boltTimer <= 0) {
        ball.state.boltTimer = 1.45;
        const a = aimAngleToEnemy(sim, ball, 0.1);
        sim.addProjectile({
          kind: 'knife',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 8),
          y: ball.y + Math.sin(a) * (ball.radius + 8),
          vx: Math.cos(a) * 490,
          vy: Math.sin(a) * 490,
          radius: 10,
          dmg: 5,
          bouncesLeft: 0,
          ttl: 1.5,
          color: '#ef4444',
        });
      }
    },
  },

  /** 110. Banana Peel Ball: Drops slippery cartoon banana peels + tosses curved banana boomerangs. */
  banana: {
    onInit(sim, ball) {
      ball.state = { peelTimer: 0.75, rangTimer: 1.65 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.peelTimer -= dt;
      if (ball.state.peelTimer <= 0) {
        ball.state.peelTimer = 1.25;
        const pos = clampPos(sim, ball.x, ball.y, 44);
        sim.addHazard(
          {
            kind: 'red_zone',
            variant: 'banana_peel',
            owner: ball.owner,
            x: pos.x,
            y: pos.y,
            radius: 30,
            dmg: 6.5,
            slipSpin: 1.05,
            tickRate: 0.5,
            ttl: 11,
            tickTimers: {},
          },
          5
        );
      }

      ball.state.rangTimer -= dt;
      if (ball.state.rangTimer <= 0) {
        ball.state.rangTimer = 1.85;
        const a = aimAngleToEnemy(sim, ball, 0.08);
        sim.addProjectile({
          kind: 'boomerang',
          owner: ball.owner,
          parentId: ball.id,
          x: ball.x + Math.cos(a) * (ball.radius + 10),
          y: ball.y + Math.sin(a) * (ball.radius + 10),
          vx: Math.cos(a) * 470,
          vy: Math.sin(a) * 470,
          radius: 15,
          dmg: 6.5,
          piercing: true,
          returnTimer: 0.6,
          returning: false,
          hitIds: {},
          ttl: 2.2,
          color: '#facc15',
        });
      }
    },
  },

  /** 111. Rickroll Ball: Fires dancing chorus notes; every 3rd volley triggers a RICKROLLED stun wave. */
  rickroll: {
    onInit(sim, ball) {
      ball.state = { timer: 0.9, verse: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.15;
        ball.state.verse += 1;
        const lyrics = ['NEVER GONNA', 'GIVE YOU UP!', 'RICKROLLED!!'];
        const idx = (ball.state.verse - 1) % 3;
        const a = aimAngleToEnemy(sim, ball, 0.12);
        for (const off of [-0.18, 0.18]) {
          sim.addProjectile({
            kind: 'orb',
            owner: ball.owner,
            x: ball.x + Math.cos(a + off) * (ball.radius + 8),
            y: ball.y + Math.sin(a + off) * (ball.radius + 8),
            vx: Math.cos(a + off) * 460,
            vy: Math.sin(a + off) * 460,
            radius: 11,
            dmg: 4.5,
            bouncesLeft: 2,
            ttl: 2.0,
            color: idx === 2 ? '#fde047' : '#fb923c',
          });
        }
        sim.emitText(ball.x, ball.y - ball.radius - 10, lyrics[idx], '#fde047');

        if (idx === 2) {
          sim.healBall(ball, 4);
          sim.addHazard(
            {
              kind: 'ring_wave',
              variant: 'solar',
              owner: ball.owner,
              x: ball.x,
              y: ball.y,
              currentRadius: ball.radius,
              expandSpeed: 330,
              dmg: 7.5,
              knockback: 210,
              ttl: 0.65,
            },
            3
          );
          for (const enemy of sim.getEnemyBalls(ball.owner)) {
            if (Math.hypot(enemy.x - ball.x, enemy.y - ball.y) <= 210) {
              enemy.stunTimer = Math.max(enemy.stunTimer, 0.6);
            }
          }
        }
      }
    },
  },

  /** 112. Stonks Ball: Wall bounces flip between BULL RUN green candles & RUG PULL crash waves. */
  stonks: {
    onInit(sim, ball) {
      ball.state = { bull: true, timer: 0.8, flipCd: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.flipCd = Math.max(0, ball.state.flipCd - dt);
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        const a = aimAngleToEnemy(sim, ball, 0.08);
        if (ball.state.bull) {
          ball.state.timer = 0.72;
          sim.addProjectile({
            kind: 'dart',
            owner: ball.owner,
            x: ball.x + Math.cos(a) * (ball.radius + 8),
            y: ball.y + Math.sin(a) * (ball.radius + 8),
            vx: Math.cos(a) * 560,
            vy: Math.sin(a) * 560,
            radius: 10,
            dmg: 5.5,
            bouncesLeft: 0,
            ttl: 1.5,
            color: '#4ade80',
          });
        } else {
          ball.state.timer = 1.15;
          for (const off of [-0.22, 0, 0.22]) {
            sim.addProjectile({
              kind: 'orb',
              owner: ball.owner,
              x: ball.x + Math.cos(a + off) * (ball.radius + 8),
              y: ball.y + Math.sin(a + off) * (ball.radius + 8),
              vx: Math.cos(a + off) * 410,
              vy: Math.sin(a + off) * 410,
              radius: 11,
              dmg: 4.5,
              slowDuration: 0.5,
              bouncesLeft: 1,
              ttl: 1.6,
              color: '#ef4444',
            });
          }
        }
      }
    },
    onWallHit(sim, ball) {
      if (ball.state.flipCd > 0) return;
      ball.state.flipCd = 0.9;
      ball.state.bull = !ball.state.bull;
      if (ball.state.bull) {
        ball.baseSpeed = 395;
        sim.emitText(ball.x, ball.y - ball.radius - 12, 'BULL RUN!', '#4ade80');
      } else {
        ball.baseSpeed = 315;
        sim.addHazard(
          {
            kind: 'ring_wave',
            variant: 'blood',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            currentRadius: ball.radius,
            expandSpeed: 340,
            dmg: 7.5,
            knockback: 230,
            ttl: 0.55,
          },
          3
        );
        sim.emitText(ball.x, ball.y - ball.radius - 12, 'RUG PULL!', '#ef4444');
      }
    },
  },

  /** 113. Karen Ball: Screams complaint cones & builds Rage to summon angry Manager turrets! */
  karen: {
    onInit(sim, ball) {
      ball.state = { yellTimer: 1.0, rage: 0, managerTimer: 3.4 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.yellTimer -= dt;
      if (ball.state.yellTimer <= 0) {
        ball.state.yellTimer = 1.45;
        const a = aimAngleToEnemy(sim, ball, 0.06);
        for (const off of [-0.24, 0, 0.24]) {
          sim.addProjectile({
            kind: 'orb',
            owner: ball.owner,
            x: ball.x + Math.cos(a + off) * (ball.radius + 8),
            y: ball.y + Math.sin(a + off) * (ball.radius + 8),
            vx: Math.cos(a + off) * 445,
            vy: Math.sin(a + off) * 445,
            radius: 10,
            dmg: 3.5,
            slowDuration: 0.45,
            bouncesLeft: 0,
            ttl: 1.45,
            color: '#f43f5e',
          });
        }
        sim.emitText(ball.x, ball.y - ball.radius - 10, 'EXCUSE ME?!', '#fef08a');
      }

      ball.state.managerTimer -= dt;
      if (ball.state.managerTimer <= 0 || ball.state.rage >= 18) {
        ball.state.managerTimer = 4.5;
        ball.state.rage = 0;
        if (countHelpersOfKind(sim, ball.owner, 'mini_turret') < 2) {
          const pos = clampPos(sim, ball.x, ball.y, 48);
          sim.addHelper({
            kind: 'mini_turret',
            owner: ball.owner,
            parentId: ball.id,
            independent: true,
            x: pos.x,
            y: pos.y,
            orbitAngle: 0,
            radius: 22,
            fireTimer: 0.25,
            fireRate: 0.85,
            dmg: 5.5,
            ttl: 10.5,
            hitCooldowns: {},
          });
          sim.emitText(ball.x, ball.y - ball.radius - 14, 'MANAGER!!', '#facc15');
        }
      }
    },
    onTakeDamage(sim, ball, dmg) {
      ball.state.rage += dmg;
    },
  },

  /** 114. Discord Mod Ball: Swings a heavy Ban Hammer, drops #general Timeout zones & @everyone pings. */
  discordmod: {
    onInit(sim, ball) {
      ball.mass = 1.85;
      ball.state = { modTimer: 1.5 };
      sim.addHelper({
        kind: 'hammer',
        owner: ball.owner,
        parentId: ball.id,
        orbitAngle: 0,
        orbitRadius: ball.radius + 32,
        protrusion: 32,
        angularSpeed: 3.3,
        hitRadius: 24,
        hitCd: 0.48,
        dmg: 6.5,
        knockback: 260,
        x: ball.x,
        y: ball.y,
        hitCooldowns: {},
      });
    },
    onUpdate(sim, ball, dt) {
      ball.state.modTimer -= dt;
      if (ball.state.modTimer <= 0) {
        ball.state.modTimer = 2.05;
        sim.addHazard(
          {
            kind: 'red_zone',
            variant: 'mod_zone',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            radius: 72,
            dmg: 3,
            slowDuration: 0.75,
            tickRate: 0.55,
            ttl: 5.0,
            tickTimers: {},
          },
          2
        );
        const a = aimAngleToEnemy(sim, ball, 0.12);
        for (const off of [-0.16, 0.16]) {
          sim.addProjectile({
            kind: 'orb',
            owner: ball.owner,
            x: ball.x + Math.cos(a + off) * (ball.radius + 8),
            y: ball.y + Math.sin(a + off) * (ball.radius + 8),
            vx: Math.cos(a + off) * 440,
            vy: Math.sin(a + off) * 440,
            radius: 11,
            dmg: 4.5,
            bouncesLeft: 1,
            ttl: 1.7,
            color: '#5865f2',
          });
        }
        sim.emitText(ball.x, ball.y - ball.radius - 12, '@EVERYONE!', '#a5b4fc');
      }
    },
  },

  /** 115. Sigma Ball: Stacks silent Grindset power while untouched; cashes in with GIGACHAD slams or laser eyes. */
  sigma: {
    onInit(sim, ball) {
      ball.mass = 1.3;
      ball.contactDmg = 4;
      ball.state = { stacks: 0, stackTimer: 0.75 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.stackTimer -= dt;
      if (ball.state.stackTimer <= 0) {
        ball.state.stackTimer = 0.78;
        if (ball.state.stacks < 6) {
          ball.state.stacks += 1;
          ball.contactDmg = Math.min(16, 4 + ball.state.stacks * 2);
          sim.emitText(ball.x, ball.y - ball.radius - 10, `GRIND x${ball.state.stacks}`, '#e2e8f0');
        } else {
          // Discharge laser eyes at max stacks so kiting enemies still get mogged
          const a = aimAngleToEnemy(sim, ball, 0);
          const dx = Math.cos(a);
          const dy = Math.sin(a);
          sim.addHazard(
            {
              kind: 'plasma_blast',
              variant: 'ray',
              owner: ball.owner,
              x1: ball.x,
              y1: ball.y,
              x2: ball.x + dx * 880,
              y2: ball.y + dy * 880,
              dx,
              dy,
              dmg: 12,
              hitIds: {},
              ttl: 0.22,
            },
            2
          );
          ball.state.stacks = 2;
          ball.contactDmg = 8;
          sim.emitText(ball.x, ball.y - ball.radius - 12, 'MOG BEAM!', '#f8fafc');
        }
      }
    },
    onBallHit(sim, ball, enemy) {
      if (ball.state.stacks > 0) {
        const bonus = Math.round(ball.state.stacks * 3);
        sim.dealDamage(enemy, bonus, ball.owner, 'sigma_slam');
        sim.emitText(enemy.x, enemy.y - enemy.radius - 12, 'GIGACHAD!', '#f8fafc');
        ball.state.stacks = 0;
        ball.contactDmg = 4;
      }
    },
  },

  /** 116. Skibidi Ball: Drops swirling porcelain Flush Vortex drains & fires bouncing plungers. */
  skibidi: {
    onInit(sim, ball) {
      ball.state = { flushTimer: 1.0, plungerTimer: 0.85 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.flushTimer -= dt;
      if (ball.state.flushTimer <= 0) {
        ball.state.flushTimer = 2.4;
        const pos = clampPos(sim, ball.x, ball.y, 64);
        sim.addHazard(
          {
            kind: 'red_zone',
            variant: 'flush',
            owner: ball.owner,
            x: pos.x,
            y: pos.y,
            radius: 76,
            swirlForce: 450,
            pullForce: 260,
            dmg: 3,
            tickRate: 0.5,
            ttl: 6.2,
            tickTimers: {},
          },
          2
        );
        sim.emitText(ball.x, ball.y - ball.radius - 12, 'FLUSHED!', '#38bdf8');
      }

      ball.state.plungerTimer -= dt;
      if (ball.state.plungerTimer <= 0) {
        ball.state.plungerTimer = 1.15;
        const a = aimAngleToEnemy(sim, ball, 0.1);
        sim.addProjectile({
          kind: 'dart',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 8),
          y: ball.y + Math.sin(a) * (ball.radius + 8),
          vx: Math.cos(a) * 485,
          vy: Math.sin(a) * 485,
          radius: 11,
          dmg: 5,
          bouncesLeft: 2,
          ttl: 1.9,
          color: '#ef4444',
        });
      }
    },
  },

  /** 117. Rizz Ball: Charms enemies toward its 2 orbiting rose blades while scrambling trajectories. */
  rizz: {
    onInit(sim, ball) {
      ball.state = { timer: 1.1 };
      for (let i = 0; i < 2; i++) {
        sim.addHelper({
          kind: 'blade',
          owner: ball.owner,
          parentId: ball.id,
          orbitAngle: i * Math.PI,
          orbitRadius: ball.radius + 26,
          angularSpeed: 4.1,
          hitRadius: 17,
          hitCd: 0.45,
          dmg: 5.5,
          knockback: 120,
          x: ball.x,
          y: ball.y,
          hitCooldowns: {},
        });
      }
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.5;
        const enemy = sim.getClosestEnemy(ball);
        if (enemy) {
          const dx = ball.x - enemy.x;
          const dy = ball.y - enemy.y;
          const d = Math.hypot(dx, dy) || 1;
          enemy.vx = (dx / d) * enemy.baseSpeed * 1.05;
          enemy.vy = (dy / d) * enemy.baseSpeed * 1.05;
          sim.emitText(enemy.x, enemy.y - enemy.radius - 12, 'W RIZZ!', '#f472b6');
        }
        const a = aimAngleToEnemy(sim, ball, 0.12);
        for (const off of [-0.15, 0.15]) {
          sim.addProjectile({
            kind: 'orb',
            owner: ball.owner,
            x: ball.x + Math.cos(a + off) * (ball.radius + 8),
            y: ball.y + Math.sin(a + off) * (ball.radius + 8),
            vx: Math.cos(a + off) * 470,
            vy: Math.sin(a + off) * 470,
            radius: 10,
            dmg: 4.5,
            bouncesLeft: 1,
            ttl: 1.5,
            color: '#ec4899',
          });
        }
      }
    },
  },

  /** 118. Florida Man Ball: Rolls an unhinged chaotic Florida headline every 1.65s! */
  floridaman: {
    onInit(sim, ball) {
      ball.state = { timer: 0.9 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.65;
        const roll = Math.floor(sim.rng() * 5);
        const a = aimAngleToEnemy(sim, ball, 0.08);
        if (roll === 0) {
          const pos = clampPos(sim, ball.x, ball.y, 48);
          sim.addHazard(
            {
              kind: 'red_zone',
              variant: 'mimic_lure',
              owner: ball.owner,
              x: pos.x,
              y: pos.y,
              radius: 42,
              dmg: 10,
              trapRoot: 0.85,
              tickRate: 0.5,
              ttl: 9,
              tickTimers: {},
            },
            3
          );
          sim.emitText(ball.x, ball.y - ball.radius - 12, 'GATOR TRAP!', '#4ade80');
        } else if (roll === 1) {
          ball.vx = Math.cos(a) * ball.baseSpeed * 1.65;
          ball.vy = Math.sin(a) * ball.baseSpeed * 1.65;
          ball.dashTimer = 0.45;
          for (let k = -1; k <= 1; k++) {
            sim.addProjectile({
              kind: 'shard',
              owner: ball.owner,
              x: ball.x + Math.cos(a + k * 0.25) * (ball.radius + 8),
              y: ball.y + Math.sin(a + k * 0.25) * (ball.radius + 8),
              vx: Math.cos(a + k * 0.25) * 510,
              vy: Math.sin(a + k * 0.25) * 510,
              radius: 10,
              dmg: 5,
              bouncesLeft: 1,
              ttl: 1.5,
              color: '#f97316',
            });
          }
          sim.emitText(ball.x, ball.y - ball.radius - 12, 'LAWNMOWER!', '#fb923c');
        } else if (roll === 2) {
          sim.addHazard(
            {
              kind: 'red_zone',
              variant: 'tornado',
              owner: ball.owner,
              x: ball.x,
              y: ball.y,
              vx: Math.cos(a) * 140,
              vy: Math.sin(a) * 140,
              radius: 74,
              swirlForce: 480,
              dmg: 3.5,
              tickRate: 0.45,
              ttl: 5.0,
              tickTimers: {},
            },
            2
          );
          sim.emitText(ball.x, ball.y - ball.radius - 12, 'HURRICANE!', '#bae6fd');
        } else if (roll === 3) {
          for (let k = -2; k <= 2; k++) {
            sim.addProjectile({
              kind: 'dart',
              owner: ball.owner,
              x: ball.x + Math.cos(a + k * 0.2) * (ball.radius + 8),
              y: ball.y + Math.sin(a + k * 0.2) * (ball.radius + 8),
              vx: Math.cos(a + k * 0.2) * 470,
              vy: Math.sin(a + k * 0.2) * 470,
              radius: 9,
              dmg: 3.5,
              poisonTicks: 2,
              bouncesLeft: 0,
              ttl: 1.5,
              color: '#22c55e',
            });
          }
          sim.emitText(ball.x, ball.y - ball.radius - 12, 'SWAMP GATOR!', '#86efac');
        } else {
          sim.addHazard(
            {
              kind: 'ring_wave',
              variant: 'nuke',
              owner: ball.owner,
              x: ball.x,
              y: ball.y,
              currentRadius: ball.radius,
              expandSpeed: 370,
              dmg: 10,
              knockback: 260,
              ttl: 0.7,
            },
            3
          );
          sim.emitText(ball.x, ball.y - ball.radius - 12, 'FIREWORKS!', '#fde047');
        }
      }
    },
  },

  /** 119. IRS Tax Ball: Audits enemy HP into golden coins, taxes 12% current HP & heals a cut! */
  taxman: {
    onInit(sim, ball) {
      ball.state = { auditTimer: 1.55, coinTimer: 1.05 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.auditTimer -= dt;
      if (ball.state.auditTimer <= 0) {
        ball.state.auditTimer = 2.2;
        const enemy = sim.getClosestEnemy(ball);
        if (enemy) {
          const tax = Math.max(4.5, Math.min(10, Math.round(enemy.hp * 0.11)));
          sim.dealDamage(enemy, tax, ball.owner, 'irs_tax');
          sim.healBall(ball, 3);
          sim.emitText(enemy.x, enemy.y - enemy.radius - 12, `TAXED -${tax}!`, '#fbbf24');
          sim.addParticleBurst(enemy.x, enemy.y, '#fbbf24', 8);
        }
      }

      ball.state.coinTimer -= dt;
      if (ball.state.coinTimer <= 0) {
        ball.state.coinTimer = 1.2;
        const a = aimAngleToEnemy(sim, ball, 0.1);
        for (const off of [-0.18, 0, 0.18]) {
          sim.addProjectile({
            kind: 'robux',
            owner: ball.owner,
            x: ball.x + Math.cos(a + off) * (ball.radius + 8),
            y: ball.y + Math.sin(a + off) * (ball.radius + 8),
            vx: Math.cos(a + off) * 465,
            vy: Math.sin(a + off) * 465,
            radius: 10,
            dmg: 3.5,
            bouncesLeft: 1,
            ttl: 1.65,
            color: '#fbbf24',
          });
        }
      }
    },
  },

  /** 120. Brainrot Ball: Cycles FANUM TAX, OHIO GLITCH, MOGGED, and 67 SPLIT-BEAM! */
  brainrot: {
    onInit(sim, ball) {
      ball.state = { timer: 0.8, phase: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.45;
        const move = ball.state.phase % 4;
        ball.state.phase += 1;
        const enemy = sim.getClosestEnemy(ball);
        const a = aimAngleToEnemy(sim, ball, 0);

        if (move === 0 && enemy) {
          sim.dealDamage(enemy, 8, ball.owner, 'fanum_tax');
          sim.healBall(ball, 4);
          sim.emitText(enemy.x, enemy.y - enemy.radius - 12, 'FANUM TAX!', '#22d3ee');
        } else if (move === 1) {
          for (let k = 0; k < 6; k++) {
            const ang = a + (k * Math.PI * 2) / 6 + (sim.rng() - 0.5) * 0.25;
            sim.addProjectile({
              kind: 'plasma',
              owner: ball.owner,
              x: ball.x + Math.cos(ang) * (ball.radius + 8),
              y: ball.y + Math.sin(ang) * (ball.radius + 8),
              vx: Math.cos(ang) * 455,
              vy: Math.sin(ang) * 455,
              radius: 11,
              dmg: 4.5,
              bouncesLeft: 1,
              ttl: 1.75,
              color: k % 2 === 0 ? '#ec4899' : '#22d3ee',
            });
          }
          sim.emitText(ball.x, ball.y - ball.radius - 12, 'OHIO!', '#ec4899');
        } else if (move === 2) {
          if (enemy) enemy.slowTimer = Math.max(enemy.slowTimer, 1.0);
          sim.addHazard(
            {
              kind: 'ring_wave',
              variant: 'ghost',
              owner: ball.owner,
              x: ball.x,
              y: ball.y,
              currentRadius: ball.radius,
              expandSpeed: 350,
              dmg: 8.5,
              knockback: 230,
              ttl: 0.7,
            },
            3
          );
          sim.emitText(ball.x, ball.y - ball.radius - 12, 'MOGGED!', '#a855f7');
        } else {
          for (const off of [-0.14, 0.14]) {
            const dx = Math.cos(a + off);
            const dy = Math.sin(a + off);
            sim.addHazard(
              {
                kind: 'plasma_blast',
                variant: 'ray',
                owner: ball.owner,
                x1: ball.x,
                y1: ball.y,
                x2: ball.x + dx * 860,
                y2: ball.y + dy * 860,
                dx,
                dy,
                dmg: 7,
                hitIds: {},
                ttl: 0.2,
              },
              3
            );
          }
          sim.emitText(ball.x, ball.y - ball.radius - 12, '67 BEAM!', '#facc15');
        }
      }
    },
  },
};
