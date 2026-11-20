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

  /** 105. Hypergamy Ball: Swings a giant 2-ball-long Hypergamy Symbol (♀↑) like Axe Ball that upgrades on every hit! */
  hypergamy: {
    onInit(sim, ball) {
      ball.state = { baseSpeed0: ball.baseSpeed };
      sim.addHelper({
        kind: 'hypergamy_symbol',
        owner: ball.owner,
        parentId: ball.id,
        orbitAngle: 0,
        orbitRadius: 162,
        angularSpeed: 4.2,
        hitRadius: 32,
        hitCd: 0.4,
        dmg: 9,
        upgrades: 0,
        knockback: 235,
        x: ball.x,
        y: ball.y,
        hitCooldowns: {},
      });
    },
    onUpdate(sim, ball) {
      const missingRatio = Math.max(0, 1 - ball.hp / ball.maxHp);
      ball.baseSpeed = Math.min(540, ball.state.baseSpeed0 * (1 + missingRatio * 0.75));
    },
  },

  /** 106. Israel Ball: Active Iron Dome missile defense intercepting enemy projectiles & launching guided Tamirs. */
  israel: {
    onInit(sim, ball) {
      ball.state = { interceptCd: 0, salvoTimer: 1.2 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.interceptCd = Math.max(0, ball.state.interceptCd - dt);

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

  /** 111. ChatGPT Ball: Hallucinates exploding Decoy Clones, fires prompt bursts & GPT Overdrive waves. */
  chatgpt: {
    onInit(sim, ball) {
      ball.state = { timer: 1.05, cycle: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.35;
        ball.state.cycle += 1;
        const a = aimAngleToEnemy(sim, ball, 0.08);

        if (countHelpersOfKind(sim, ball.owner, 'shadow_decoy') < 2) {
          sim.addHelper({
            kind: 'shadow_decoy',
            owner: ball.owner,
            parentId: ball.id,
            independent: true,
            x: ball.x + Math.cos(a + 0.5) * 28,
            y: ball.y + Math.sin(a + 0.5) * 28,
            vx: Math.cos(a + 0.35) * 320,
            vy: Math.sin(a + 0.35) * 320,
            radius: 26,
            dmg: 8,
            ttl: 4.5,
            hitCooldowns: {},
          });
          sim.emitText(ball.x, ball.y - ball.radius - 10, 'HALLUCINATING!', '#a7f3d0');
        } else {
          sim.emitText(ball.x, ball.y - ball.radius - 10, 'AS AN AI...', '#34d399');
        }

        for (const off of [-0.18, 0, 0.18]) {
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
            ttl: 1.7,
            color: '#10a37f',
          });
        }

        if (ball.state.cycle % 3 === 0) {
          sim.healBall(ball, 3);
          sim.addHazard(
            {
              kind: 'ring_wave',
              variant: 'dome',
              owner: ball.owner,
              x: ball.x,
              y: ball.y,
              currentRadius: ball.radius,
              expandSpeed: 330,
              dmg: 7,
              knockback: 200,
              ttl: 0.6,
            },
            2
          );
        }
      }
    },
  },

  /** 112. Dondurma Ball: Turkish Ice Cream vendor swinging a 156px cone paddle & yanking away with "SIKE!" */
  dondurma: {
    onInit(sim, ball) {
      ball.state = { sikeCd: 0, scoopTimer: 1.25 };
      sim.addHelper({
        kind: 'dondurma_paddle',
        owner: ball.owner,
        parentId: ball.id,
        orbitAngle: 0,
        orbitRadius: 156,
        angularSpeed: 4.6,
        hitRadius: 28,
        hitCd: 0.38,
        dmg: 8.5,
        knockback: 210,
        x: ball.x,
        y: ball.y,
        hitCooldowns: {},
      });
    },
    onUpdate(sim, ball, dt) {
      ball.state.sikeCd = Math.max(0, ball.state.sikeCd - dt);
      ball.state.scoopTimer -= dt;
      if (ball.state.scoopTimer <= 0) {
        ball.state.scoopTimer = 1.75;
        const a = aimAngleToEnemy(sim, ball, 0.08);
        sim.addProjectile({
          kind: 'ice_spike',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 8),
          y: ball.y + Math.sin(a) * (ball.radius + 8),
          vx: Math.cos(a) * 470,
          vy: Math.sin(a) * 470,
          radius: 10,
          dmg: 4,
          chillStacks: 1,
          bouncesLeft: 1,
          ttl: 1.5,
          color: '#fbcfe8',
        });
      }
    },
    onTakeDamage(sim, ball) {
      if (ball.state.sikeCd > 0) return;
      ball.state.sikeCd = 2.2;
      const enemy = sim.getClosestEnemy(ball);
      const oldX = ball.x;
      const oldY = ball.y;
      sim.addHazard(
        {
          kind: 'ice_bomb',
          owner: ball.owner,
          x: oldX,
          y: oldY,
          vx: 0,
          vy: 0,
          radius: 22,
          fuse: 0.2,
          ttl: 1.5,
        },
        3
      );
      if (enemy) {
        const awayAngle = Math.atan2(ball.y - enemy.y, ball.x - enemy.x) + (sim.rng() < 0.5 ? 0.9 : -0.9);
        const pos = clampPos(
          sim,
          enemy.x + Math.cos(awayAngle) * 145,
          enemy.y + Math.sin(awayAngle) * 145,
          ball.radius + 10
        );
        ball.x = pos.x;
        ball.y = pos.y;
      }
      sim.emitText(oldX, oldY - 24, 'SIKE! TOO SLOW!', '#fde047');
      sim.addParticleBurst(oldX, oldY, '#fbcfe8', 10);
    },
  },

  /** 113. Doner Kebab Ball: Spins 2 Doner carving blades while spraying fiery chili-garlic sauce! */
  kebab: {
    onInit(sim, ball) {
      ball.state = { sauceTimer: 0.95 };
      for (let i = 0; i < 2; i++) {
        sim.addHelper({
          kind: 'blade',
          owner: ball.owner,
          parentId: ball.id,
          orbitAngle: i * Math.PI,
          orbitRadius: ball.radius + 28,
          angularSpeed: 5.2,
          hitRadius: 19,
          hitCd: 0.42,
          dmg: 6,
          knockback: 165,
          x: ball.x,
          y: ball.y,
          hitCooldowns: {},
        });
      }
    },
    onUpdate(sim, ball, dt) {
      ball.state.sauceTimer -= dt;
      if (ball.state.sauceTimer <= 0) {
        ball.state.sauceTimer = 1.35;
        const a = aimAngleToEnemy(sim, ball, 0.08);
        for (const off of [-0.18, 0, 0.18]) {
          sim.addProjectile({
            kind: 'dart',
            owner: ball.owner,
            x: ball.x + Math.cos(a + off) * (ball.radius + 8),
            y: ball.y + Math.sin(a + off) * (ball.radius + 8),
            vx: Math.cos(a + off) * 485,
            vy: Math.sin(a + off) * 485,
            radius: 10,
            dmg: 4,
            poisonTicks: 2,
            bouncesLeft: 1,
            ttl: 1.55,
            color: off === 0 ? '#fef3c7' : '#ef4444',
          });
        }
        sim.emitText(ball.x, ball.y - ball.radius - 10, 'EXTRA SPICY!', '#fb923c');
      }
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

  /** 118. Aura Ball: Surrounded by a live Aura Field that grows (+1000 AURA!) on wall bounces & crushes enemies with -9999 AURA! */
  aura: {
    onInit(sim, ball) {
      ball.state = { wallCd: 0, waveTimer: 1.5, auraLevel: 0 };
      sim.addHazard(
        {
          kind: 'red_zone',
          variant: 'aura_field',
          owner: ball.owner,
          followParentId: ball.id,
          x: ball.x,
          y: ball.y,
          radius: 78,
          dmg: 4,
          slowDuration: 0.55,
          tickRate: 0.45,
          ttl: 999,
          tickTimers: {},
        },
        1
      );
    },
    onUpdate(sim, ball, dt) {
      ball.state.wallCd = Math.max(0, ball.state.wallCd - dt);
      ball.state.waveTimer -= dt;
      if (ball.state.waveTimer <= 0) {
        ball.state.waveTimer = 1.65;
        sim.addHazard(
          {
            kind: 'ring_wave',
            variant: 'solar',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            currentRadius: ball.radius,
            expandSpeed: 340,
            dmg: 7,
            knockback: 220,
            ttl: 0.65,
          },
          3
        );
        const enemy = sim.getClosestEnemy(ball);
        if (enemy && Math.hypot(enemy.x - ball.x, enemy.y - ball.y) <= 155) {
          sim.emitText(enemy.x, enemy.y - enemy.radius - 12, '-9999 AURA!', '#c084fc');
        }
      }
    },
    onWallHit(sim, ball) {
      if (ball.state.wallCd > 0) return;
      ball.state.wallCd = 0.48;
      ball.state.auraLevel = Math.min(8, ball.state.auraLevel + 1);
      const field = sim.hazards.find(
        (h) => h.kind === 'red_zone' && h.variant === 'aura_field' && h.followParentId === ball.id
      );
      if (field) {
        field.radius = Math.min(134, 78 + ball.state.auraLevel * 7);
        field.dmg = 4 + ball.state.auraLevel * 0.45;
      }
      sim.emitText(ball.x, ball.y - ball.radius - 10, '+1000 AURA!', '#fde047');
    },
  },

  /** 119. Gemini Ball: Orbits twin Castor & Pollux stars, fires star shards & DEEP THINK twin beams! */
  gemini: {
    onInit(sim, ball) {
      ball.state = { timer: 0.9, cycle: 0 };
      for (let i = 0; i < 2; i++) {
        sim.addHelper({
          kind: 'orbital',
          owner: ball.owner,
          parentId: ball.id,
          orbitAngle: i * Math.PI,
          orbitRadius: ball.radius + 26,
          angularSpeed: 4.3,
          hitRadius: 15,
          hitCd: 0.44,
          dmg: 5.5,
          knockback: 150,
          x: ball.x,
          y: ball.y,
          hitCooldowns: {},
        });
      }
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.25;
        ball.state.cycle += 1;
        const a = aimAngleToEnemy(sim, ball, 0.08);

        for (const off of [-0.15, 0.15]) {
          sim.addProjectile({
            kind: 'shard',
            owner: ball.owner,
            x: ball.x + Math.cos(a + off) * (ball.radius + 8),
            y: ball.y + Math.sin(a + off) * (ball.radius + 8),
            vx: Math.cos(a + off) * 510,
            vy: Math.sin(a + off) * 510,
            radius: 10,
            dmg: 4.5,
            bouncesLeft: 1,
            ttl: 1.65,
            color: off < 0 ? '#60a5fa' : '#c084fc',
          });
        }

        if (ball.state.cycle % 3 === 0) {
          sim.healBall(ball, 3);
          for (const off of [-0.08, 0.08]) {
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
                dmg: 6.5,
                hitIds: {},
                ttl: 0.22,
              },
              3
            );
          }
          sim.emitText(ball.x, ball.y - ball.radius - 12, 'DEEP THINK! ✦', '#93c5fd');
        } else {
          sim.emitText(ball.x, ball.y - ball.radius - 10, '1M CONTEXT!', '#c084fc');
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
