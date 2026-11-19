import { ARENA_SIZE } from './constants.js';
import { ABILITY_HANDLERS } from './abilities.js';

function aimAngleToEnemy(sim, ball, spread = 0) {
  const enemy = sim.getClosestEnemy(ball);
  const base = enemy
    ? Math.atan2(enemy.y - ball.y, enemy.x - ball.x)
    : Math.atan2(ball.vy, ball.vx);
  return base + (sim.rng() - 0.5) * 2 * spread;
}

function clampPos(sim, x, y, pad = 36) {
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

function countEnemiesOrSelfBalls(sim, owner) {
  let c = 0;
  for (const b of sim.balls) {
    if (b.owner === owner && b.hp > 0) c++;
  }
  return c;
}

export const EXTRA_ABILITY_HANDLERS = {
  /** 49. Duplicator Ball: Insta-Reels exponential 1 -> 2 -> 4 -> 8 -> 16 clone doubler. */
  duplicator: {
    onInit(sim, ball) {
      ball.state = { splitTimer: 2.05, generation: ball.generation || 0 };
      ball.contactDmg = 4;
      if (ball.generation > 0) {
        ball.mass = 0.48;
      }
    },
    onUpdate(sim, ball, dt) {
      if (ball.state.generation >= 4 || ball.hp <= 10) return;
      ball.state.splitTimer -= dt;
      if (ball.state.splitTimer <= 0) {
        ball.state.splitTimer = 2.15;
        if (countEnemiesOrSelfBalls(sim, ball.owner) >= 16) return;

        const nextGen = ball.state.generation + 1;
        const nextHp = Math.max(6, Math.ceil(ball.hp * 0.54));
        const nextMaxHp = Math.max(nextHp, Math.ceil(ball.maxHp * 0.54));
        const radii = [50, 40, 32, 26, 21];
        const nextRadius = radii[Math.min(4, nextGen)];
        const nextSpeed = Math.min(480, ball.baseSpeed + 24);

        ball.hp = nextHp;
        ball.maxHp = nextMaxHp;
        ball.radius = nextRadius;
        ball.mass = 0.48;
        ball.generation = nextGen;
        ball.state.generation = nextGen;
        ball.baseSpeed = nextSpeed;
        const pos = clampPos(sim, ball.x, ball.y, nextRadius);
        ball.x = pos.x;
        ball.y = pos.y;

        const baseAngle = Math.atan2(ball.vy, ball.vx) || 0;
        const a = baseAngle + (sim.rng() < 0.5 ? 0.9 : -0.9);
        const childPos = clampPos(sim, ball.x + Math.cos(a) * 24, ball.y + Math.sin(a) * 24, nextRadius);
        sim.spawnSplitBall({
          owner: ball.owner,
          ballId: 'duplicator',
          generation: nextGen,
          x: childPos.x,
          y: childPos.y,
          vx: Math.cos(a) * nextSpeed,
          vy: Math.sin(a) * nextSpeed,
          radius: nextRadius,
          hp: nextHp,
          baseSpeed: nextSpeed,
          contactDmg: 4,
          mass: 0.48,
          state: { splitTimer: 2.15, generation: nextGen },
        });
        sim.emitText(ball.x, ball.y - nextRadius - 10, `x${Math.pow(2, nextGen)}!`, '#2dd4bf');
        sim.addParticleBurst(ball.x, ball.y, '#5eead4', 8);
        sim.emitEvent('ability', { kind: 'split', owner: ball.owner });
      }
    },
  },

  /** 50. Doubler Ball: Wall bounces double stack x1 -> x2 -> x4 -> x8 -> x16 -> x32. */
  doubler: {
    onInit(sim, ball) {
      ball.state = { mult: 1, cd: 0 };
      ball.contactDmg = 2;
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
    },
    onWallHit(sim, ball) {
      if (ball.state.cd > 0) return;
      ball.state.cd = 0.16;
      if (ball.state.mult < 32) {
        ball.state.mult *= 2;
        sim.emitText(ball.x, ball.y - ball.radius - 10, `x${ball.state.mult}!`, '#fbbf24');
        sim.addParticleBurst(ball.x, ball.y, '#fde047', 6);
      }
    },
    onBallHit(sim, ball, enemy) {
      const m = ball.state.mult || 1;
      if (m > 1) {
        const bonus = Math.min(30, Math.round(m * 1.1));
        sim.dealDamage(enemy, bonus, ball.owner, 'doubler');
        sim.emitText(enemy.x, enemy.y - enemy.radius - 12, `x${m} SLAM!`, '#f59e0b');
        ball.state.mult = 1;
      }
    },
  },

  /** 51. Mach Ball: Accelerates exponentially on every bounce + emits sonic shockwaves. */
  mach: {
    onInit(sim, ball) {
      ball.state = { cd: 0 };
      ball.customSpeedCap = 980;
      ball.contactDmg = 3;
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
    },
    onWallHit(sim, ball) {
      if (ball.state.cd > 0) return;
      ball.state.cd = 0.14;
      sim.scaleBallSpeed(ball, 1.13);
      ball.contactDmg = Math.min(13, Math.round(3 + Math.max(0, ball.baseSpeed - 310) * 0.016));
      if (ball.baseSpeed >= 600) {
        sim.addHazard(
          {
            kind: 'ring_wave',
            variant: 'bass',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            currentRadius: ball.radius,
            expandSpeed: 320,
            dmg: 4,
            knockback: 180,
            ttl: 0.45,
          },
          3
        );
        sim.emitText(ball.x, ball.y - ball.radius - 10, 'MACH!', '#38bdf8');
      }
    },
  },

  /** 52. Titan Ball: Grows larger & heavier on wall hits with mass-scaled crushes. */
  titan: {
    onInit(sim, ball) {
      ball.state = { cd: 0 };
      ball.contactDmg = 3;
      ball.mass = 1.15;
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
    },
    onWallHit(sim, ball) {
      if (ball.state.cd > 0 || ball.radius >= 108) return;
      ball.state.cd = 0.2;
      ball.radius = Math.min(108, ball.radius + 5);
      ball.mass = Math.min(2.8, ball.mass + 0.14);
      const pos = clampPos(sim, ball.x, ball.y, ball.radius);
      ball.x = pos.x;
      ball.y = pos.y;
      ball.contactDmg = Math.round(3 + (ball.radius - 46) * 0.16);
      sim.emitText(ball.x, ball.y - ball.radius - 10, 'GROW!', '#f97316');
    },
  },

  /** 53. Hydra Ball: Regenerates out of combat and sprouts dual serpent heads on chunks/death. */
  hydra: {
    onInit(sim, ball) {
      ball.state = {
        generation: ball.generation || 0,
        regenDelay: 2.0,
        regenCarry: 0,
        nextThreshold: ball.hp - 34,
      };
      ball.contactDmg = 2;
    },
    onUpdate(sim, ball, dt) {
      ball.state.regenDelay = Math.max(0, ball.state.regenDelay - dt);
      if (ball.state.regenDelay <= 0 && ball.hp < ball.maxHp) {
        ball.state.regenCarry += 2.0 * dt;
        if (ball.state.regenCarry >= 1) {
          const heal = Math.floor(ball.state.regenCarry);
          ball.state.regenCarry -= heal;
          sim.healBall(ball, heal);
        }
      }
    },
    onTakeDamage(sim, ball) {
      ball.state.regenDelay = 2.4;
      if (ball.state.generation < 2 && ball.hp <= ball.state.nextThreshold && countEnemiesOrSelfBalls(sim, ball.owner) < 6) {
        ball.state.nextThreshold -= 34;
        const a = aimAngleToEnemy(sim, ball, 0.5);
        const pos = clampPos(sim, ball.x + Math.cos(a) * 26, ball.y + Math.sin(a) * 26, 30);
        sim.spawnSplitBall({
          owner: ball.owner,
          ballId: 'hydra',
          generation: ball.state.generation + 1,
          x: pos.x,
          y: pos.y,
          vx: Math.cos(a) * 380,
          vy: Math.sin(a) * 380,
          radius: 30,
          hp: 26,
          baseSpeed: 380,
          contactDmg: 3,
          mass: 0.65,
        });
        sim.emitText(ball.x, ball.y - ball.radius - 10, 'HEAD SPROUT!', '#22c55e');
      }
    },
    onDeath(sim, ball) {
      if (ball.state.generation >= 2 || countEnemiesOrSelfBalls(sim, ball.owner) >= 6) return;
      const baseA = Math.atan2(ball.vy, ball.vx);
      for (const off of [-0.7, 0.7]) {
        if (countEnemiesOrSelfBalls(sim, ball.owner) >= 6) break;
        const a = baseA + off;
        const pos = clampPos(sim, ball.x + Math.cos(a) * 24, ball.y + Math.sin(a) * 24, 28);
        sim.spawnSplitBall({
          owner: ball.owner,
          ballId: 'hydra',
          generation: ball.state.generation + 1,
          x: pos.x,
          y: pos.y,
          vx: Math.cos(a) * 390,
          vy: Math.sin(a) * 390,
          radius: 28,
          hp: 24,
          baseSpeed: 390,
          contactDmg: 3,
          mass: 0.6,
        });
      }
      sim.emitText(ball.x, ball.y - 16, 'HYDRA x2!', '#4ade80');
    },
  },

  /** 54. Micro Ball (80 HP): Shrinks down to 20px dodger and fires high-speed needles on bounce. */
  micro: {
    onInit(sim, ball) {
      ball.state = { cd: 0 };
      ball.mass = 0.75;
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
    },
    onWallHit(sim, ball) {
      if (ball.state.cd > 0) return;
      ball.state.cd = 0.16;
      if (ball.radius > 20) {
        ball.radius = Math.max(20, ball.radius - 2.5);
        ball.mass = Math.max(0.45, ball.mass - 0.04);
        sim.scaleBallSpeed(ball, 1.05);
      }
      const a = aimAngleToEnemy(sim, ball, 0.06);
      const count = ball.baseSpeed >= 435 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const ang = a + (count === 2 ? (k - 0.5) * 0.12 : 0);
        sim.addProjectile({
          kind: 'needle',
          owner: ball.owner,
          x: ball.x + Math.cos(ang) * (ball.radius + 6),
          y: ball.y + Math.sin(ang) * (ball.radius + 6),
          vx: Math.cos(ang) * 650,
          vy: Math.sin(ang) * 650,
          radius: 8,
          dmg: 6,
          bouncesLeft: 1,
          ttl: 1.9,
          color: '#a78bfa',
        });
      }
      sim.emitEvent('ability', { kind: 'shot', owner: ball.owner });
    },
  },

  /** 55. Gravity Ball: Projects a moving Black Hole pulling enemies & projectiles inward. */
  gravity: {
    onInit(sim, ball) {
      ball.state = { timer: 0.8 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 4.6;
        const pos = clampPos(sim, (ball.x + (sim.arenaSize || ARENA_SIZE) * 0.5) * 0.5, (ball.y + (sim.arenaSize || ARENA_SIZE) * 0.5) * 0.5, 110);
        sim.addHazard(
          {
            kind: 'red_zone',
            variant: 'gravity',
            owner: ball.owner,
            x: pos.x,
            y: pos.y,
            vx: (sim.rng() - 0.5) * 65,
            vy: (sim.rng() - 0.5) * 65,
            radius: 108,
            fieldScale: 1.85,
            pullForce: 460,
            pullProj: 420,
            dmg: 4,
            tickRate: 0.46,
            ttl: 5.5,
            tickTimers: {},
          },
          1
        );
        sim.emitEvent('ability', { kind: 'zone', owner: ball.owner });
      }
    },
  },

  /** 56. Repulsor Ball: Anti-gravity blasts throwing enemies into walls for Slam bonus DMG. */
  repulsor: {
    onInit(sim, ball) {
      ball.state = { timer: 0.9 };
      sim.addHazard(
        {
          kind: 'red_zone',
          variant: 'repulsor',
          owner: ball.owner,
          followParentId: ball.id,
          x: ball.x,
          y: ball.y,
          radius: 100,
          fieldScale: 1.5,
          pushForce: 320,
          pushProj: 520,
          wallSlam: true,
          dmg: 2,
          tickRate: 0.55,
          ttl: 999,
          tickTimers: {},
        },
        1
      );
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 2.4;
        sim.addHazard(
          {
            kind: 'ring_wave',
            variant: 'repulsor',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            currentRadius: ball.radius,
            expandSpeed: 310,
            dmg: 5,
            knockback: 380,
            ttl: 0.55,
          },
          3
        );
      }
    },
  },

  /** 57. Portal Ball: Drops linked Blue/Orange portals warping enemies & projectiles + fires dual portal orbs. */
  portal: {
    onInit(sim, ball) {
      ball.state = { cd: 0, nextOrange: false, fireTimer: 0.85 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
      ball.state.fireTimer -= dt;
      if (ball.state.fireTimer <= 0) {
        ball.state.fireTimer = 1.45;
        const a = aimAngleToEnemy(sim, ball, 0.08);
        for (const off of [-0.14, 0.14]) {
          sim.addProjectile({
            kind: 'plasma',
            owner: ball.owner,
            x: ball.x + Math.cos(a + off) * (ball.radius + 8),
            y: ball.y + Math.sin(a + off) * (ball.radius + 8),
            vx: Math.cos(a + off) * 480,
            vy: Math.sin(a + off) * 480,
            radius: 12,
            dmg: 6.5,
            bouncesLeft: 1,
            ttl: 2.3,
            color: off < 0 ? '#38bdf8' : '#fb923c',
          });
        }
      }
    },
    onWallHit(sim, ball, hit) {
      if (ball.state.cd > 0) return;
      ball.state.cd = 0.5;
      const color = ball.state.nextOrange ? '#fb923c' : '#38bdf8';
      ball.state.nextOrange = !ball.state.nextOrange;
      sim.addHazard(
        {
          kind: 'portal_pair',
          owner: ball.owner,
          x: hit.x + hit.nx * 36,
          y: hit.y + hit.ny * 36,
          radius: 34,
          dmg: 10,
          portalColor: color,
          ttl: 22,
        },
        2
      );
      sim.emitEvent('ability', { kind: 'deploy', owner: ball.owner });
    },
  },

  /** 58. Chronos Ball: Drops Time Dilation spheres slowing foes while gaining temporal haste. */
  chronos: {
    onInit(sim, ball) {
      ball.state = { timer: 0.9 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 3.2;
        ball.dashTimer = 0.7;
        const enemy = sim.getClosestEnemy(ball);
        const target = enemy ? clampPos(sim, enemy.x, enemy.y, 96) : { x: ball.x, y: ball.y };
        sim.addHazard(
          {
            kind: 'red_zone',
            variant: 'chronos',
            owner: ball.owner,
            x: target.x,
            y: target.y,
            radius: 102,
            slowDuration: 0.95,
            dmg: 4,
            tickRate: 0.45,
            ttl: 2.5,
            tickTimers: {},
          },
          2
        );
        const a = aimAngleToEnemy(sim, ball, 0.05);
        sim.addProjectile({
          kind: 'dart',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 8),
          y: ball.y + Math.sin(a) * (ball.radius + 8),
          vx: Math.cos(a) * 520,
          vy: Math.sin(a) * 520,
          radius: 10,
          dmg: 5,
          slowDuration: 0.9,
          bouncesLeft: 1,
          ttl: 1.9,
          color: '#fde047',
        });
      }
    },
  },

  /** 59. Shield Ball: Rotates a 120° Buckler perimeter reflecting enemy projectiles cleanly. */
  shield: {
    onInit(sim, ball) {
      ball.state = { bashCd: 0 };
      ball.shieldAngle = 0;
      ball.shieldHalfWidth = 1.05;
      ball.shieldRotateSpeed = 2.7;
      ball.reflectProj = true;
    },
    onUpdate(sim, ball, dt) {
      ball.state.bashCd = Math.max(0, ball.state.bashCd - dt);
    },
    onDamagePrevent(sim, ball, rawAmount) {
      return rawAmount > 2 ? rawAmount * 0.8 : rawAmount;
    },
    onBallHit(sim, ball, enemy) {
      if (ball.state.bashCd > 0) return;
      ball.state.bashCd = 0.45;
      sim.dealDamage(enemy, 6, ball.owner, 'shield_bash');
      const dx = enemy.x - ball.x;
      const dy = enemy.y - ball.y;
      const d = Math.hypot(dx, dy) || 1;
      enemy.vx += (dx / d) * 260;
      enemy.vy += (dy / d) * 260;
    },
  },

  /** 60. Mirror Ball: Copies the opponent's ball identity & runs their exact ability kit. */
  mirror: {
    onInit(sim, ball) {
      const enemy = sim.getClosestEnemy(ball);
      const mimicId = enemy && enemy.ballId !== 'mirror' ? enemy.ballId : 'crystal';
      ball.state = { _mimicId: mimicId };
      const targetH = ABILITY_HANDLERS[mimicId];
      if (targetH && targetH.onInit) {
        targetH.onInit(sim, ball);
      }
      ball.state._mimicId = mimicId;
      sim.emitText(ball.x, ball.y - ball.radius - 12, `MIMIC: ${mimicId.toUpperCase()}`, '#e879f9');
    },
    onUpdate(sim, ball, dt) {
      const targetH = ABILITY_HANDLERS[ball.state._mimicId];
      if (targetH && targetH.onUpdate) targetH.onUpdate(sim, ball, dt);
    },
    onWallHit(sim, ball, hit) {
      const targetH = ABILITY_HANDLERS[ball.state._mimicId];
      if (targetH && targetH.onWallHit) targetH.onWallHit(sim, ball, hit);
    },
    onBallHit(sim, ball, enemy) {
      const targetH = ABILITY_HANDLERS[ball.state._mimicId];
      if (targetH && targetH.onBallHit) targetH.onBallHit(sim, ball, enemy);
    },
    onTakeDamage(sim, ball, amt, src) {
      const targetH = ABILITY_HANDLERS[ball.state._mimicId];
      if (targetH && targetH.onTakeDamage) targetH.onTakeDamage(sim, ball, amt, src);
    },
    onDamagePrevent(sim, ball, rawAmt, src, reason) {
      const targetH = ABILITY_HANDLERS[ball.state._mimicId];
      if (targetH && targetH.onDamagePrevent) return targetH.onDamagePrevent(sim, ball, rawAmt, src, reason);
      return rawAmt;
    },
    onBeforeDeath(sim, ball) {
      const targetH = ABILITY_HANDLERS[ball.state._mimicId];
      if (targetH && targetH.onBeforeDeath) return targetH.onBeforeDeath(sim, ball);
      return false;
    },
    onDeath(sim, ball) {
      const targetH = ABILITY_HANDLERS[ball.state._mimicId];
      if (targetH && targetH.onDeath) targetH.onDeath(sim, ball);
    },
  },

  /** 61. Boomerang Ball: Throws curved boomerangs slicing outbound AND returning home. */
  boomerang: {
    onInit(sim, ball) {
      ball.state = { timer: 0.6 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.3;
        const a = aimAngleToEnemy(sim, ball, 0.12);
        sim.addProjectile({
          kind: 'boomerang',
          owner: ball.owner,
          parentId: ball.id,
          x: ball.x + Math.cos(a) * (ball.radius + 10),
          y: ball.y + Math.sin(a) * (ball.radius + 10),
          vx: Math.cos(a) * 560,
          vy: Math.sin(a) * 560,
          radius: 22,
          dmg: 8.5,
          piercing: true,
          bouncesLeft: 2,
          hitIds: {},
          returnTimer: 0.48,
          ttl: 2.8,
          color: '#fb923c',
        });
        sim.emitEvent('ability', { kind: 'knife', owner: ball.owner });
      }
    },
  },

  /** 62. Chainsaw Ball: Velocity-aligned front Buzzsaw grinding rapid ticks head-on. */
  chainsaw: {
    onInit(sim, ball) {
      ball.state = { shredCd: 0 };
      sim.addHelper({
        kind: 'chainsaw',
        owner: ball.owner,
        parentId: ball.id,
        orbitAngle: 0,
        orbitRadius: ball.radius + 32,
        protrusion: 32,
        alignVelocity: true,
        angularSpeed: 0,
        hitRadius: 28,
        hitCd: 0.16,
        dmg: 4.5,
        knockback: 35,
        x: ball.x,
        y: ball.y,
        hitCooldowns: {},
      });
    },
    onUpdate(sim, ball, dt) {
      ball.state.shredCd = Math.max(0, ball.state.shredCd - dt);
    },
    onBallHit(sim, ball, enemy) {
      if (ball.state.shredCd > 0) return;
      ball.state.shredCd = 0.2;
      sim.dealDamage(enemy, 5, ball.owner, 'chainsaw');
      sim.emitText(enemy.x, enemy.y - enemy.radius - 10, 'SHRED!', '#ef4444');
    },
  },

  /** 63. Sniper Ball: Brief laser lock before blasting a supersonic 950 px/s ricochet bullet. */
  sniper: {
    onInit(sim, ball) {
      ball.state = { timer: 1.3, aiming: 0, aimAngle: 0 };
    },
    onUpdate(sim, ball, dt) {
      if (ball.state.aiming > 0) {
        ball.state.aiming -= dt;
        ball.state.aimAngle = aimAngleToEnemy(sim, ball, 0);
        if (ball.state.aiming <= 0) {
          const a = ball.state.aimAngle;
          sim.addProjectile({
            kind: 'sniper_round',
            owner: ball.owner,
            x: ball.x + Math.cos(a) * (ball.radius + 8),
            y: ball.y + Math.sin(a) * (ball.radius + 8),
            vx: Math.cos(a) * 950,
            vy: Math.sin(a) * 950,
            radius: 10,
            dmg: 14,
            bouncesLeft: 1,
            ttl: 1.6,
            color: '#f87171',
          });
          sim.triggerShake(4, 0.1);
          sim.emitEvent('ability', { kind: 'beamFire', owner: ball.owner });
        }
        return;
      }
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 2.45;
        ball.state.aiming = 0.34;
        ball.stunTimer = Math.max(ball.stunTimer, 0.34);
        ball.state.aimAngle = aimAngleToEnemy(sim, ball, 0);
      }
    },
  },

  /** 64. Shotgun Ball: Wall bounce blasts 6-pellet spread + recoil push across court. */
  shotgun: {
    onInit(sim, ball) {
      ball.state = { cd: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
    },
    onWallHit(sim, ball) {
      if (ball.state.cd > 0) return;
      ball.state.cd = 0.45;
      const base = aimAngleToEnemy(sim, ball, 0.05);
      for (let k = 0; k < 6; k++) {
        const a = base + (k - 2.5) * 0.11;
        sim.addProjectile({
          kind: 'bullet',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 8),
          y: ball.y + Math.sin(a) * (ball.radius + 8),
          vx: Math.cos(a) * 580,
          vy: Math.sin(a) * 580,
          radius: 7,
          dmg: 2.5,
          bouncesLeft: 0,
          ttl: 0.72,
          color: '#fbbf24',
        });
      }
      ball.vx -= Math.cos(base) * 140;
      ball.vy -= Math.sin(base) * 140;
      sim.emitEvent('ability', { kind: 'shot', owner: ball.owner });
    },
  },

  /** 65. Hammer Ball: Heavy sweeping Smash Hammer stuns & knocks foes flying. */
  hammer: {
    onInit(sim, ball) {
      ball.state = {};
      sim.addHelper({
        kind: 'hammer',
        owner: ball.owner,
        parentId: ball.id,
        orbitAngle: 0,
        orbitRadius: 128,
        angularSpeed: 3.6,
        hitRadius: 36,
        hitCd: 0.42,
        stunDuration: 0.45,
        dmg: 12,
        knockback: 310,
        x: ball.x,
        y: ball.y,
        hitCooldowns: {},
      });
    },
  },

  /** 66. Anchor Ball: High 3.2x mass; drops chained Iron Anchors tethering fleeing enemies. */
  anchor: {
    onInit(sim, ball) {
      ball.mass = 3.2;
      ball.state = { timer: 1.0, boltCd: 1.6 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 4.0;
        sim.addHazard(
          {
            kind: 'red_zone',
            variant: 'anchor',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            radius: 95,
            fieldScale: 2.4,
            leashRadius: 90,
            pullForce: 260,
            dmg: 4,
            tickRate: 0.55,
            ttl: 4.5,
            tickTimers: {},
          },
          2
        );
      }
      ball.state.boltCd -= dt;
      if (ball.state.boltCd <= 0) {
        ball.state.boltCd = 1.8;
        const a = aimAngleToEnemy(sim, ball, 0.08);
        sim.addProjectile({
          kind: 'cannonball',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 8),
          y: ball.y + Math.sin(a) * (ball.radius + 8),
          vx: Math.cos(a) * 410,
          vy: Math.sin(a) * 410,
          radius: 13,
          dmg: 5,
          knockback: 200,
          bouncesLeft: 0,
          ttl: 1.7,
          color: '#64748b',
        });
      }
    },
  },

  /** 67. Pinball / Ricochet Ball: Places 3 neon Pinball Bumpers bursting ball speed & sparks. */
  ricochet: {
    onInit(sim, ball) {
      ball.state = { cd: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
    },
    onWallHit(sim, ball) {
      if (ball.state.cd > 0) return;
      ball.state.cd = 0.7;
      const b = sim.bounds;
      const pos = clampPos(
        sim,
        b.left + 90 + sim.rng() * (b.right - b.left - 180),
        b.top + 90 + sim.rng() * (b.bottom - b.top - 180),
        40
      );
      sim.addHazard(
        {
          kind: 'pinball_bumper',
          owner: ball.owner,
          x: pos.x,
          y: pos.y,
          radius: 26,
          dmg: 6,
          hitCooldown: 0,
          ttl: 13,
        },
        3
      );
      sim.emitEvent('ability', { kind: 'deploy', owner: ball.owner });
    },
  },

  /** 68. Tornado Ball: Releases wandering Cyclone Vortices swirling foes tangentially. */
  tornado: {
    onInit(sim, ball) {
      ball.state = { timer: 0.65 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 3.2;
        const a = aimAngleToEnemy(sim, ball, 0.2);
        sim.addHazard(
          {
            kind: 'red_zone',
            variant: 'tornado',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            vx: Math.cos(a) * 115,
            vy: Math.sin(a) * 115,
            radius: 112,
            fieldScale: 1.55,
            swirlForce: 510,
            pullForce: 210,
            dmg: 5,
            tickRate: 0.34,
            ttl: 7.5,
            tickTimers: {},
          },
          2
        );
        sim.emitEvent('ability', { kind: 'zone', owner: ball.owner });
      }
    },
  },

  /** 69. Ninja Ball: Stealth blinks behind enemies leaving slashing Shadow Decoys. */
  ninja: {
    onInit(sim, ball) {
      ball.state = { blinkTimer: 1.4 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.blinkTimer -= dt;
      if (ball.state.blinkTimer <= 0) {
        ball.state.blinkTimer = 2.15;
        if (countHelpersOfKind(sim, ball.owner, 'shadow_decoy') < 2) {
          sim.addHelper({
            kind: 'shadow_decoy',
            owner: ball.owner,
            parentId: ball.id,
            independent: true,
            x: ball.x,
            y: ball.y,
            radius: 34,
            dmg: 8,
            ttl: 3.2,
            hitCooldowns: {},
          });
        }
        const enemy = sim.getClosestEnemy(ball);
        if (enemy) {
          const behindA = Math.atan2(enemy.vy, enemy.vx) + Math.PI;
          const pos = clampPos(
            sim,
            enemy.x + Math.cos(behindA) * (enemy.radius + ball.radius + 14),
            enemy.y + Math.sin(behindA) * (enemy.radius + ball.radius + 14),
            ball.radius
          );
          ball.x = pos.x;
          ball.y = pos.y;
          ball.phaseTimer = 0.32;
          const a = Math.atan2(enemy.y - ball.y, enemy.x - ball.x);
          for (const off of [-0.18, 0, 0.18]) {
            sim.addProjectile({
              kind: 'knife',
              owner: ball.owner,
              x: ball.x + Math.cos(a + off) * (ball.radius + 6),
              y: ball.y + Math.sin(a + off) * (ball.radius + 6),
              vx: Math.cos(a + off) * 590,
              vy: Math.sin(a + off) * 590,
              radius: 10,
              dmg: 5.5,
              bouncesLeft: 1,
              ttl: 1.6,
              color: '#94a3b8',
            });
          }
          sim.emitText(ball.x, ball.y - ball.radius - 10, 'POOF!', '#cbd5e1');
        }
      }
    },
  },

  /** 70. Magnet / Vortex Ball: Alternates Attract vs Repel fields every 2.4s. */
  vortex: {
    onInit(sim, ball) {
      ball.state = { timer: 2.2, attract: true };
      sim.addHazard(
        {
          kind: 'red_zone',
          variant: 'vortex_pull',
          owner: ball.owner,
          followParentId: ball.id,
          x: ball.x,
          y: ball.y,
          radius: 120,
          fieldScale: 1.8,
          pullForce: 320,
          pullProj: 320,
          pushForce: 0,
          pushProj: 0,
          dmg: 3,
          tickRate: 0.45,
          ttl: 999,
          tickTimers: {},
        },
        1
      );
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 2.4;
        ball.state.attract = !ball.state.attract;
        const zone = sim.hazards.find((h) => h.followParentId === ball.id && h.owner === ball.owner);
        if (zone) {
          zone.variant = ball.state.attract ? 'vortex_pull' : 'vortex_push';
          zone.pullForce = ball.state.attract ? 340 : 0;
          zone.pullProj = ball.state.attract ? 340 : 0;
          zone.pushForce = ball.state.attract ? 0 : 420;
          zone.pushProj = ball.state.attract ? 0 : 420;
          zone.wallSlam = !ball.state.attract;
        }
        sim.emitText(ball.x, ball.y - ball.radius - 10, ball.state.attract ? 'ATTRACT' : 'REPEL', '#f43f5e');
      }
    },
  },

  /** 71. Magma Ball: Drops molten lava puddles that continuously expand before cooling. */
  magma: {
    onInit(sim, ball) {
      ball.state = { timer: 0.9 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.95;
        sim.addHazard(
          {
            kind: 'red_zone',
            variant: 'magma',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            radius: 38,
            growRate: 16,
            maxRadius: 108,
            dmg: 4,
            tickRate: 0.48,
            ttl: 6.2,
            tickTimers: {},
          },
          3
        );
        sim.emitEvent('ability', { kind: 'zone', owner: ball.owner });
      }
    },
  },

  /** 72. Frost Ball: Applies Chill stacks; 4 stacks shatter-freeze the opponent solid. */
  frost: {
    onInit(sim, ball) {
      ball.state = { timer: 0.95 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.35;
        const base = aimAngleToEnemy(sim, ball, 0.08);
        for (const off of [-0.14, 0.14]) {
          const a = base + off;
          sim.addProjectile({
            kind: 'ice_spike',
            owner: ball.owner,
            x: ball.x + Math.cos(a) * (ball.radius + 8),
            y: ball.y + Math.sin(a) * (ball.radius + 8),
            vx: Math.cos(a) * 480,
            vy: Math.sin(a) * 480,
            radius: 11,
            dmg: 3,
            chillStacks: 1,
            slowDuration: 0.75,
            bouncesLeft: 1,
            ttl: 1.7,
            color: '#7dd3fc',
          });
        }
        sim.emitEvent('ability', { kind: 'shot', owner: ball.owner });
      }
    },
  },

  /** 73. Quake Ball: Every 2nd wall hit telegraphs and ruptures a wide Fault Line + tremor wave. */
  quake: {
    onInit(sim, ball) {
      ball.state = { hits: 0, cd: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
    },
    onWallHit(sim, ball) {
      if (ball.state.cd > 0) return;
      ball.state.cd = 0.18;
      ball.state.hits += 1;
      if (ball.state.hits % 2 === 0) {
        const horiz = Math.abs(ball.vy) > Math.abs(ball.vx);
        const enemy = sim.getClosestEnemy(ball);
        const b = sim.bounds;
        const y = enemy ? enemy.y : (sim.arenaSize || ARENA_SIZE) * 0.5;
        const x = enemy ? enemy.x : (sim.arenaSize || ARENA_SIZE) * 0.5;
        sim.addHazard(
          {
            kind: 'ring_wave',
            variant: 'quake',
            owner: ball.owner,
            x1: horiz ? b.left : x,
            y1: horiz ? y : b.top,
            x2: horiz ? b.right : x,
            y2: horiz ? y : b.bottom,
            radius: 52,
            delay: 0.25,
            dmg: 14,
            ttl: 1.0,
          },
          3
        );
        sim.addHazard(
          {
            kind: 'ring_wave',
            variant: 'bass',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            currentRadius: ball.radius,
            expandSpeed: 310,
            dmg: 5,
            knockback: 200,
            ttl: 0.55,
          },
          3
        );
        sim.emitText(ball.x, ball.y - ball.radius - 10, 'QUAKE!', '#d97706');
      }
    },
  },

  /** 74. Tsunami Ball: Launches sweeping arena-wide Water Walls washing away enemy traps. */
  tsunami: {
    onInit(sim, ball) {
      ball.state = { timer: 0.85, leftToRight: ball.owner === 1 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 2.35;
        const b = sim.bounds;
        const fromLeft = ball.state.leftToRight;
        ball.state.leftToRight = !fromLeft;
        sim.addHazard(
          {
            kind: 'ring_wave',
            variant: 'tsunami',
            owner: ball.owner,
            x: fromLeft ? b.left : b.right,
            y: (b.top + b.bottom) * 0.5,
            sweepVx: fromLeft ? 320 : -320,
            sweepVy: 0,
            w: 52,
            h: (b.bottom - b.top) * 0.78,
            washHazards: true,
            dmg: 11,
            ttl: 2.2,
          },
          2
        );
        sim.emitEvent('ability', { kind: 'zone', owner: ball.owner });
      }
    },
  },

  /** 75. Solar Ball: Pulsing Solar Flare waves + orbiting ignite sparks. */
  solar: {
    onInit(sim, ball) {
      ball.state = { timer: 0.8 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.45;
        sim.addHazard(
          {
            kind: 'ring_wave',
            variant: 'solar',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            currentRadius: ball.radius,
            expandSpeed: 310,
            dmg: 9,
            knockback: 220,
            ttl: 0.9,
          },
          3
        );
        const enemy = sim.getClosestEnemy(ball);
        if (enemy && Math.hypot(enemy.x - ball.x, enemy.y - ball.y) < 210) {
          sim.applyPoison(enemy, 2, 2, ball.owner);
        }
      }
    },
  },

  /** 76. Eclipse Ball: Cycles New -> Crescent -> Full Moon scaling crescent size & power. */
  eclipse: {
    onInit(sim, ball) {
      ball.state = { timer: 0.7, moon: 1 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.15;
        const m = ball.state.moon;
        ball.state.moon = (m % 3) + 1;
        const a = aimAngleToEnemy(sim, ball, 0.08);
        const radii = [13, 20, 28];
        const dmgs = [6, 10, 15];
        sim.addProjectile({
          kind: 'plasma',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 10),
          y: ball.y + Math.sin(a) * (ball.radius + 10),
          vx: Math.cos(a) * 480,
          vy: Math.sin(a) * 480,
          radius: radii[m - 1],
          dmg: dmgs[m - 1],
          bouncesLeft: 1,
          ttl: 2.2,
          color: m === 3 ? '#fef08a' : '#818cf8',
        });
      }
    },
  },

  /** 77. Cloud Ball: Overhead Storm Cloud drifting toward opponents dropping vertical bolts. */
  cloud: {
    onInit(sim, ball) {
      ball.state = { strikeTimer: 1.4 };
      sim.addHazard(
        {
          kind: 'red_zone',
          variant: 'cloud',
          owner: ball.owner,
          x: (sim.arenaSize || ARENA_SIZE) * 0.5,
          y: (sim.arenaSize || ARENA_SIZE) * 0.5,
          vx: 55,
          vy: 42,
          radius: 74,
          dmg: 2,
          slowDuration: 0.5,
          tickRate: 0.65,
          ttl: 999,
          tickTimers: {},
        },
        1
      );
    },
    onUpdate(sim, ball, dt) {
      const cloud = sim.hazards.find((h) => h.kind === 'red_zone' && h.variant === 'cloud' && h.owner === ball.owner);
      const enemy = sim.getClosestEnemy(ball);
      if (cloud && enemy) {
        const dx = enemy.x - cloud.x;
        const dy = enemy.y - cloud.y;
        const d = Math.hypot(dx, dy) || 1;
        cloud.vx = (dx / d) * 110;
        cloud.vy = (dy / d) * 110;
        ball.state.strikeTimer -= dt;
        if (ball.state.strikeTimer <= 0) {
          ball.state.strikeTimer = 1.65;
          if (d <= cloud.radius + enemy.radius) {
            sim.dealDamage(enemy, 8, ball.owner, 'lightning');
            sim.emitText(enemy.x, enemy.y - enemy.radius - 12, 'ZAP!', '#fde047');
            sim.addParticleBurst(enemy.x, enemy.y, '#fef08a', 8);
          }
        }
      }
    },
  },

  /** 78. Crystal Ball: Fires prism lasers that split cleanly into 3 rainbow shards on bounce. */
  crystal: {
    onInit(sim, ball) {
      ball.state = { timer: 0.65 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.25;
        const a = aimAngleToEnemy(sim, ball, 0.1);
        sim.addProjectile({
          kind: 'shard',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 8),
          y: ball.y + Math.sin(a) * (ball.radius + 8),
          vx: Math.cos(a) * 560,
          vy: Math.sin(a) * 560,
          radius: 14,
          dmg: 8,
          splitOnWall: true,
          bouncesLeft: 2,
          ttl: 2.5,
          color: '#e879f9',
        });
        sim.emitEvent('ability', { kind: 'shatter', owner: ball.owner });
      }
    },
  },

  /** 79. Sandstorm Ball: Corner-drifting dust winds deflect trajectories & chip enemies. */
  sandstorm: {
    onInit(sim, ball) {
      ball.state = { timer: 0.85 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 2.6;
        const a = sim.rng() * Math.PI * 2;
        sim.addHazard(
          {
            kind: 'red_zone',
            variant: 'sandstorm',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            vx: Math.cos(a) * 75,
            vy: Math.sin(a) * 75,
            radius: 90,
            swirlForce: 220,
            slowDuration: 0.45,
            dmg: 2.5,
            tickRate: 0.42,
            ttl: 7.5,
            tickTimers: {},
          },
          3
        );
      }
    },
  },

  /** 80. Plasma Ball: Floating Ball Lightning orbs zapping enemies within 135px. */
  plasma: {
    onInit(sim, ball) {
      ball.state = { timer: 0.7 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.45;
        const a = aimAngleToEnemy(sim, ball, 0.2);
        sim.addProjectile({
          kind: 'plasma',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 10),
          y: ball.y + Math.sin(a) * (ball.radius + 10),
          vx: Math.cos(a) * 215,
          vy: Math.sin(a) * 215,
          radius: 19,
          dmg: 6.5,
          zapRadius: 135,
          zapDmg: 5,
          bouncesLeft: 2,
          ttl: 5.5,
          color: '#60a5fa',
        });
      }
    },
  },

  /** 81. Berserker Ball (135 HP): Self-burns own HP to unleash blood shockwaves & ramp speed/DMG. */
  berserker: {
    onInit(sim, ball) {
      ball.state = { waveTimer: 1.3, baseSpeed0: ball.baseSpeed };
      ball.contactDmg = 3;
    },
    onUpdate(sim, ball, dt) {
      const missingRatio = Math.max(0, 1 - ball.hp / ball.maxHp);
      ball.baseSpeed = Math.min(620, ball.state.baseSpeed0 * (1 + missingRatio * 0.9));
      ball.contactDmg = Math.round(3 + missingRatio * 8);
      ball.state.waveTimer -= dt;
      if (ball.state.waveTimer <= 0) {
        ball.state.waveTimer = Math.max(0.95, 1.85 - missingRatio * 0.85);
        sim.applySelfBurn(ball, 3.5);
        sim.addHazard(
          {
            kind: 'ring_wave',
            variant: 'blood',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            currentRadius: ball.radius,
            expandSpeed: 290,
            dmg: Math.round(4 + missingRatio * 7),
            knockback: 200,
            ttl: 0.45,
          },
          3
        );
      }
    },
  },

  /** 82. Phoenix Ball: Explodes in a Supernova on first fatal hit and rebirths once at 35 HP. */
  phoenix: {
    onInit(sim, ball) {
      ball.state = { reborn: false, fireCd: 0.85 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.fireCd -= dt;
      if (ball.state.fireCd <= 0) {
        ball.state.fireCd = 1.4;
        sim.addHazard(
          {
            kind: 'red_zone',
            variant: 'magma',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            radius: 52,
            dmg: 4,
            poisonTicks: 2,
            tickRate: 0.44,
            ttl: 4.0,
            tickTimers: {},
          },
          4
        );
      }
    },
    onBeforeDeath(sim, ball) {
      if (ball.state.reborn) return false;
      ball.state.reborn = true;
      ball.hp = 35;
      ball.radius = 52;
      sim.scaleBallSpeed(ball, 1.2);
      sim.addHazard(
        {
          kind: 'ring_wave',
          variant: 'solar',
          owner: ball.owner,
          x: ball.x,
          y: ball.y,
          currentRadius: ball.radius,
          expandSpeed: 360,
          dmg: 16,
          knockback: 360,
          ttl: 0.8,
        },
        3
      );
      sim.emitText(ball.x, ball.y - ball.radius - 14, 'REBIRTH!', '#fb923c');
      sim.addParticleBurst(ball.x, ball.y, '#fbbf24', 20);
      return true;
    },
  },

  /** 83. Gambler Ball: Spins 3-reel Slot Roulette triggering Jackpots, Risk-Crits, or Coins. */
  gambler: {
    onInit(sim, ball) {
      ball.state = { timer: 0.8, slotText: 'READY' };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.65;
        const r = sim.rng();
        const a = aimAngleToEnemy(sim, ball, 0.08);
        if (r < 0.25) {
          ball.state.slotText = '777!';
          sim.emitText(ball.x, ball.y - ball.radius - 12, 'JACKPOT 777!', '#fde047');
          for (const off of [-0.22, 0, 0.22]) {
            sim.addProjectile({
              kind: 'robux',
              owner: ball.owner,
              x: ball.x + Math.cos(a + off) * (ball.radius + 8),
              y: ball.y + Math.sin(a + off) * (ball.radius + 8),
              vx: Math.cos(a + off) * 530,
              vy: Math.sin(a + off) * 530,
              radius: 13,
              dmg: 8.5,
              bouncesLeft: 1,
              ttl: 2.1,
              color: '#fde047',
            });
          }
        } else if (r < 0.50) {
          ball.state.slotText = 'HEART+';
          sim.healBall(ball, 9);
        } else if (r < 0.76) {
          ball.state.slotText = 'COINS!';
          for (let k = 0; k < 5; k++) {
            const ang = a + (k - 2) * 0.2;
            sim.addProjectile({
              kind: 'robux',
              owner: ball.owner,
              x: ball.x + Math.cos(ang) * (ball.radius + 8),
              y: ball.y + Math.sin(ang) * (ball.radius + 8),
              vx: Math.cos(ang) * 470,
              vy: Math.sin(ang) * 470,
              radius: 11,
              dmg: 5,
              bouncesLeft: 1,
              ttl: 1.9,
              color: '#4ade80',
            });
          }
        } else {
          ball.state.slotText = 'SKULL!';
          sim.applySelfBurn(ball, 3);
          sim.addProjectile({
            kind: 'cannonball',
            owner: ball.owner,
            x: ball.x + Math.cos(a) * (ball.radius + 8),
            y: ball.y + Math.sin(a) * (ball.radius + 8),
            vx: Math.cos(a) * 580,
            vy: Math.sin(a) * 580,
            radius: 16,
            dmg: 18,
            knockback: 280,
            bouncesLeft: 0,
            ttl: 1.9,
            color: '#ef4444',
          });
        }
      }
    },
  },

  /** 84. Hacker Ball: Glitch packets scramble enemy velocity angles & bounce vectors. */
  hacker: {
    onInit(sim, ball) {
      ball.state = { timer: 0.7 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.15;
        const a = aimAngleToEnemy(sim, ball, 0.08);
        for (const off of [-0.12, 0.12]) {
          sim.addProjectile({
            kind: 'plasma',
            owner: ball.owner,
            x: ball.x + Math.cos(a + off) * (ball.radius + 8),
            y: ball.y + Math.sin(a + off) * (ball.radius + 8),
            vx: Math.cos(a + off) * 580,
            vy: Math.sin(a + off) * 580,
            radius: 13,
            dmg: 6.5,
            glitchScramble: true,
            bouncesLeft: 2,
            ttl: 2.3,
            color: '#22d3ee',
          });
        }
      }
    },
  },

  /** 85. Banker Ball: Earns Coins on hits/walls; spends Coins as a 1:1 absorbing Gold Shield. */
  banker: {
    onInit(sim, ball) {
      ball.state = { coins: 4, volleyCd: 2.2 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.volleyCd -= dt;
      if (ball.state.volleyCd <= 0 && ball.state.coins >= 4) {
        ball.state.volleyCd = 2.0;
        const count = Math.min(3, Math.floor(ball.state.coins / 3));
        ball.state.coins -= count;
        const a = aimAngleToEnemy(sim, ball, 0.1);
        for (let k = 0; k < count; k++) {
          const off = (k - (count - 1) * 0.5) * 0.2;
          sim.addProjectile({
            kind: 'robux',
            owner: ball.owner,
            x: ball.x + Math.cos(a + off) * (ball.radius + 8),
            y: ball.y + Math.sin(a + off) * (ball.radius + 8),
            vx: Math.cos(a + off) * 480,
            vy: Math.sin(a + off) * 480,
            radius: 11,
            dmg: 4.5,
            bouncesLeft: 1,
            ttl: 1.8,
            color: '#fbbf24',
          });
        }
      }
    },
    onWallHit(sim, ball) {
      ball.state.coins = Math.min(20, (ball.state.coins || 0) + 1);
    },
    onBallHit(sim, ball, enemy) {
      ball.state.coins = Math.min(20, (ball.state.coins || 0) + 2);
      sim.dealDamage(enemy, 3, ball.owner, 'banker');
    },
    onDamagePrevent(sim, ball, rawAmount) {
      const coins = ball.state.coins || 0;
      if (coins <= 0 || rawAmount <= 1) return rawAmount;
      const block = Math.min(coins, Math.ceil(rawAmount * 0.45));
      ball.state.coins -= block;
      return Math.max(0.5, rawAmount - block);
    },
  },

  /** 86. Necromancer Ball: Raises homing Bone Skull wisps swarming opponents. */
  necromancer: {
    onInit(sim, ball) {
      ball.state = { timer: 0.75 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = ball.hp < 50 ? 1.15 : 1.45;
        const base = sim.rng() * Math.PI * 2;
        for (const off of [0, 0.7]) {
          const a = base + off;
          sim.addProjectile({
            kind: 'bee',
            owner: ball.owner,
            x: ball.x + Math.cos(a) * (ball.radius + 10),
            y: ball.y + Math.sin(a) * (ball.radius + 10),
            vx: Math.cos(a) * 355,
            vy: Math.sin(a) * 355,
            speed: 375,
            turnRate: 5.5,
            radius: 13,
            dmg: 6,
            bouncesLeft: 1,
            ttl: 3.4,
            color: '#cbd5e1',
          });
        }
        sim.emitEvent('ability', { kind: 'shot', owner: ball.owner });
      }
    },
  },

  /** 87. Bait Chest Ball: Drops fake glowing Pickups that CHOMP & stun enemies touching them. */
  mimicchest: {
    onInit(sim, ball) {
      ball.state = { timer: 1.0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.9;
        const enemy = sim.getClosestEnemy(ball);
        const target = enemy
          ? clampPos(sim, (ball.x + enemy.x) * 0.5 + (sim.rng() - 0.5) * 90, (ball.y + enemy.y) * 0.5 + (sim.rng() - 0.5) * 90, 40)
          : { x: ball.x, y: ball.y };
        sim.addHazard(
          {
            kind: 'red_zone',
            variant: 'mimic_lure',
            owner: ball.owner,
            x: target.x,
            y: target.y,
            radius: 28,
            trapRoot: 0.65,
            dmg: 11,
            tickRate: 0.5,
            ttl: 11,
            tickTimers: {},
          },
          4
        );
      }
    },
  },

  /** 88. Leech Ball: Launches homing parasites that poison foes and siphon life with a hit cooldown. */
  leech: {
    onInit(sim, ball) {
      ball.state = { timer: 1.25, biteCd: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.biteCd = Math.max(0, ball.state.biteCd - dt);
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 2.05;
        const a = aimAngleToEnemy(sim, ball, 0.25);
        sim.addProjectile({
          kind: 'bee',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 8),
          y: ball.y + Math.sin(a) * (ball.radius + 8),
          vx: Math.cos(a) * 330,
          vy: Math.sin(a) * 330,
          speed: 345,
          turnRate: 4.8,
          radius: 10,
          dmg: 3,
          poisonTicks: 1,
          bouncesLeft: 0,
          ttl: 2.5,
          color: '#be123c',
        });
      }
    },
    onBallHit(sim, ball, enemy) {
      if (ball.state.biteCd > 0) return;
      ball.state.biteCd = 0.5;
      sim.dealDamage(enemy, 3, ball.owner, 'leech');
      sim.healBall(ball, 2);
    },
  },

  /** 89. Thorn Ball: Tough carapace reduces minor hits & auto-fires reactive thorns when damaged. */
  thorn: {
    onInit(sim, ball) {
      ball.state = { procCd: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.procCd = Math.max(0, ball.state.procCd - dt);
    },
    onDamagePrevent(sim, ball, rawAmount) {
      return rawAmount > 2 ? Math.max(1.5, rawAmount - 1) : rawAmount;
    },
    onTakeDamage(sim, ball, amount) {
      if (amount <= 0 || ball.state.procCd > 0) return;
      ball.state.procCd = 0.28;
      const base = aimAngleToEnemy(sim, ball, 0.1);
      for (const off of [-0.18, 0.18]) {
        const a = base + off;
        sim.addProjectile({
          kind: 'shard',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 6),
          y: ball.y + Math.sin(a) * (ball.radius + 6),
          vx: Math.cos(a) * 510,
          vy: Math.sin(a) * 510,
          radius: 9,
          dmg: 4,
          bouncesLeft: 1,
          ttl: 1.5,
          color: '#22c55e',
        });
      }
    },
  },

  /** 90. Alchemist Ball: Transmutes nearby enemy projectiles & hazards into gold heal orbs & bolts. */
  alchemist: {
    onInit(sim, ball) {
      ball.state = { cd: 0, boltCd: 1.4 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.cd = Math.max(0, ball.state.cd - dt);
      ball.state.boltCd -= dt;
      if (ball.state.boltCd <= 0) {
        ball.state.boltCd = 1.9;
        const a = aimAngleToEnemy(sim, ball, 0.08);
        sim.addProjectile({
          kind: 'plasma',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 8),
          y: ball.y + Math.sin(a) * (ball.radius + 8),
          vx: Math.cos(a) * 440,
          vy: Math.sin(a) * 440,
          radius: 12,
          dmg: 6,
          bouncesLeft: 1,
          ttl: 1.8,
          color: '#fbbf24',
        });
      }
      if (ball.state.cd > 0) return;
      const reach = ball.radius + 34;
      for (let i = sim.projectiles.length - 1; i >= 0; i--) {
        const p = sim.projectiles[i];
        if (p.owner === ball.owner || p.piercing) continue;
        if (Math.hypot(p.x - ball.x, p.y - ball.y) <= reach + p.radius) {
          ball.state.cd = 0.55;
          sim.projectiles.splice(i, 1);
          sim.healBall(ball, 3);
          sim.emitText(ball.x, ball.y - ball.radius - 10, 'TRANSMUTE!', '#fde047');
          return;
        }
      }
      for (let i = sim.hazards.length - 1; i >= 0; i--) {
        const h = sim.hazards[i];
        if (h.owner === ball.owner) continue;
        if ((h.kind === 'red_zone' || h.kind === 'poison_spike' || h.kind === 'pickup_drop') && Math.hypot(h.x - ball.x, h.y - ball.y) <= reach + (h.radius || 20) * 0.7) {
          ball.state.cd = 0.8;
          sim.hazards.splice(i, 1);
          sim.healBall(ball, 4);
          sim.emitText(ball.x, ball.y - ball.radius - 10, 'GOLD!', '#fbbf24');
          return;
        }
      }
    },
  },

  /** 91. Ghost Ball: Alternates ethereal Phasing immunity, Haunt Chill bursts, and phantom wisps. */
  ghost: {
    onInit(sim, ball) {
      ball.state = { timer: 1.4, wasPhasing: false };
    },
    onUpdate(sim, ball, dt) {
      const phasing = ball.phaseTimer > 0;
      if (ball.state.wasPhasing && !phasing) {
        for (const enemy of sim.getEnemyBalls(ball.owner)) {
          if (Math.hypot(enemy.x - ball.x, enemy.y - ball.y) <= 155 + enemy.radius) {
            sim.dealDamage(enemy, 10, ball.owner, 'haunt');
            sim.applyChill(enemy, 2, ball.owner);
          }
        }
        sim.addHazard(
          {
            kind: 'ring_wave',
            variant: 'ghost',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            currentRadius: ball.radius,
            expandSpeed: 310,
            dmg: 7,
            knockback: 160,
            ttl: 0.75,
          },
          2
        );
        const a = aimAngleToEnemy(sim, ball, 0.1);
        for (const off of [-0.22, 0, 0.22]) {
          sim.addProjectile({
            kind: 'plasma',
            owner: ball.owner,
            x: ball.x + Math.cos(a + off) * (ball.radius + 8),
            y: ball.y + Math.sin(a + off) * (ball.radius + 8),
            vx: Math.cos(a + off) * 460,
            vy: Math.sin(a + off) * 460,
            radius: 10,
            dmg: 5,
            bouncesLeft: 1,
            ttl: 1.7,
            color: '#a5b4fc',
          });
        }
        sim.emitText(ball.x, ball.y - ball.radius - 10, 'BOO!', '#c084fc');
      }
      ball.state.wasPhasing = phasing;
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 2.6;
        ball.phaseTimer = 1.0;
        sim.scaleBallSpeed(ball, 1.15);
      }
    },
  },

  /** 92. Rocket Ball: Continuous homing missile steering toward opponent + flame trail bombs. */
  rocket: {
    onInit(sim, ball) {
      ball.steerRate = 2.4;
      ball.state = { exhaustCd: 1.0 };
      ball.contactDmg = 4;
    },
    onUpdate(sim, ball, dt) {
      ball.state.exhaustCd -= dt;
      if (ball.state.exhaustCd <= 0) {
        ball.state.exhaustCd = 1.65;
        sim.addHazard(
          {
            kind: 'bomb',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            radius: 22,
            blastRadius: 115,
            armDelay: 0.18,
            fuse: 1.2,
            dmg: 7,
            knockback: 260,
            ttl: 1.35,
          },
          4
        );
      }
    },
  },

  /** 93. Meteor Ball: Marks target reticles crashing down as fiery Meteors after 0.45s. */
  meteor: {
    onInit(sim, ball) {
      ball.state = { timer: 0.75 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.65;
        const enemy = sim.getClosestEnemy(ball);
        const pos = enemy ? clampPos(sim, enemy.x + enemy.vx * 0.2, enemy.y + enemy.vy * 0.2, 65) : { x: (sim.arenaSize || ARENA_SIZE) * 0.5, y: (sim.arenaSize || ARENA_SIZE) * 0.5 };
        sim.addHazard(
          {
            kind: 'ring_wave',
            variant: 'meteor',
            owner: ball.owner,
            x: pos.x,
            y: pos.y,
            radius: 95,
            blastRadius: 135,
            delay: 0.45,
            dmg: 14,
            ttl: 1.0,
          },
          3
        );
      }
    },
  },

  /** 94. Drill Ball: Front velocity-aligned Spiral Drill shredding multi-ticks head-on. */
  drill: {
    onInit(sim, ball) {
      ball.state = { boreCd: 0 };
      sim.addHelper({
        kind: 'drill',
        owner: ball.owner,
        parentId: ball.id,
        orbitAngle: 0,
        orbitRadius: ball.radius + 34,
        protrusion: 34,
        alignVelocity: true,
        angularSpeed: 0,
        hitRadius: 27,
        hitCd: 0.14,
        dmg: 4.5,
        knockback: 20,
        x: ball.x,
        y: ball.y,
        hitCooldowns: {},
      });
    },
    onUpdate(sim, ball, dt) {
      ball.state.boreCd = Math.max(0, ball.state.boreCd - dt);
    },
    onBallHit(sim, ball, enemy) {
      if (ball.state.boreCd > 0) return;
      ball.state.boreCd = 0.22;
      sim.dealDamage(enemy, 5.5, ball.owner, 'drill');
      enemy.slowTimer = Math.max(enemy.slowTimer, 0.35);
      sim.emitText(enemy.x, enemy.y - enemy.radius - 10, 'DRILL!', '#eab308');
    },
  },

  /** 95. UFO Ball: Tractor beam lifts/slows opponents & launches Alien Plasma Saucers. */
  ufo: {
    onInit(sim, ball) {
      ball.state = { timer: 1.0 };
      sim.addHazard(
        {
          kind: 'red_zone',
          variant: 'ufo_beam',
          owner: ball.owner,
          followParentId: ball.id,
          x: ball.x,
          y: ball.y,
          radius: 96,
          fieldScale: 1.35,
          pullForce: 220,
          slowDuration: 0.65,
          dmg: 3.5,
          tickRate: 0.44,
          ttl: 999,
          tickTimers: {},
        },
        1
      );
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.95;
        const a = aimAngleToEnemy(sim, ball, 0.12);
        sim.addProjectile({
          kind: 'bee',
          owner: ball.owner,
          x: ball.x + Math.cos(a) * (ball.radius + 8),
          y: ball.y + Math.sin(a) * (ball.radius + 8),
          vx: Math.cos(a) * 340,
          vy: Math.sin(a) * 340,
          speed: 355,
          turnRate: 3.8,
          radius: 12,
          dmg: 4.5,
          bouncesLeft: 1,
          ttl: 2.5,
          color: '#4ade80',
        });
      }
    },
  },

  /** 96. Drum Ball: Emits expanding hollow Bass Shockwaves blasting enemies radially on rim contact. */
  drum: {
    onInit(sim, ball) {
      ball.state = { timer: 0.6 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.25;
        sim.addHazard(
          {
            kind: 'ring_wave',
            variant: 'bass',
            owner: ball.owner,
            x: ball.x,
            y: ball.y,
            currentRadius: ball.radius,
            expandSpeed: 310,
            dmg: 9,
            knockback: 260,
            ttl: 1.1,
          },
          3
        );
        sim.emitText(ball.x, ball.y - ball.radius - 8, 'BOOM!', '#f472b6');
      }
    },
  },

  /** 97. Chomper (Pac) Ball: Eats pickups & floor hazards along its path to scale Bite damage. */
  pacman: {
    onInit(sim, ball) {
      ball.state = { chomps: 0 };
      ball.contactDmg = 4;
    },
    onUpdate(sim, ball) {
      const eatR = ball.radius + 20;
      for (let i = sim.hazards.length - 1; i >= 0; i--) {
        const h = sim.hazards[i];
        if (h.owner === ball.owner) continue;
        if (h.kind === 'pickup_drop' || h.kind === 'poison_spike' || h.kind === 'cactus' || h.kind === 'bomb') {
          if (Math.hypot(h.x - ball.x, h.y - ball.y) <= eatR + (h.radius || 16)) {
            sim.hazards.splice(i, 1);
            ball.state.chomps += 1;
            ball.contactDmg = Math.min(18, 4 + ball.state.chomps * 2);
            sim.healBall(ball, 2);
            sim.emitText(ball.x, ball.y - ball.radius - 10, 'CHOMP!', '#fde047');
            break;
          }
        }
      }
    },
    onWallHit(sim, ball) {
      if (ball.state.chomps < 4) {
        ball.state.chomps += 0.25;
        ball.contactDmg = Math.min(18, Math.round(4 + ball.state.chomps * 2));
      }
    },
  },

  /** 98. Sentry Builder Ball: Deploys autonomous rotating Free-Standing Mini-Turrets near center. */
  turret: {
    onInit(sim, ball) {
      ball.state = { timer: 0.75 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 3.2;
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
            fireTimer: 0.3,
            fireRate: 0.88,
            dmg: 5.5,
            ttl: 12,
            hitCooldowns: {},
          });
          sim.emitEvent('ability', { kind: 'deploy', owner: ball.owner });
        }
      }
    },
  },

  /** 99. Knight Ball: Carries velocity-aligned Joust Lance & periodically dashes for heavy speed impales. */
  knight: {
    onInit(sim, ball) {
      ball.state = { dashCd: 2.1 };
      sim.addHelper({
        kind: 'knight_lance',
        owner: ball.owner,
        parentId: ball.id,
        orbitAngle: 0,
        orbitRadius: ball.radius + 44,
        protrusion: 44,
        alignVelocity: true,
        angularSpeed: 0,
        hitRadius: 20,
        hitCd: 0.42,
        dmg: 4.5,
        speedDmgFactor: 0.032,
        knockback: 230,
        x: ball.x,
        y: ball.y,
        hitCooldowns: {},
      });
    },
    onUpdate(sim, ball, dt) {
      ball.state.dashCd -= dt;
      if (ball.state.dashCd <= 0) {
        ball.state.dashCd = 2.6;
        const a = aimAngleToEnemy(sim, ball, 0.05);
        ball.vx = Math.cos(a) * ball.baseSpeed * 1.65;
        ball.vy = Math.sin(a) * ball.baseSpeed * 1.65;
        ball.dashTimer = 0.45;
        sim.emitText(ball.x, ball.y - ball.radius - 10, 'CHARGE!', '#e2e8f0');
      }
    },
  },

  /** 100. Omega Ball (Ω): Cycles 4 Cosmic Runes — Shock Ring, Gravity Snap, Nova Orbs, Omega Ray. */
  omega: {
    onInit(sim, ball) {
      ball.state = { timer: 0.65, rune: 0 };
    },
    onUpdate(sim, ball, dt) {
      ball.state.timer -= dt;
      if (ball.state.timer <= 0) {
        ball.state.timer = 1.25;
        const rune = ball.state.rune % 4;
        ball.state.rune += 1;
        if (rune === 0) {
          sim.addHazard(
            {
              kind: 'ring_wave',
              variant: 'solar',
              owner: ball.owner,
              x: ball.x,
              y: ball.y,
              currentRadius: ball.radius,
              expandSpeed: 330,
              dmg: 10,
              knockback: 240,
              ttl: 0.95,
            },
            3
          );
          sim.emitText(ball.x, ball.y - ball.radius - 10, 'Ω PULSE', '#fbbf24');
        } else if (rune === 1) {
          const enemy = sim.getClosestEnemy(ball);
          if (enemy) {
            const dx = ball.x - enemy.x;
            const dy = ball.y - enemy.y;
            const d = Math.hypot(dx, dy) || 1;
            enemy.vx += (dx / d) * 320;
            enemy.vy += (dy / d) * 320;
            sim.dealDamage(enemy, 9, ball.owner, 'omega_snap');
            sim.emitText(enemy.x, enemy.y - enemy.radius - 10, 'Ω SNAP', '#c084fc');
          }
        } else if (rune === 2) {
          const base = aimAngleToEnemy(sim, ball, 0);
          for (let k = 0; k < 8; k++) {
            const a = base + (k * Math.PI * 2) / 8;
            sim.addProjectile({
              kind: 'plasma',
              owner: ball.owner,
              x: ball.x + Math.cos(a) * (ball.radius + 8),
              y: ball.y + Math.sin(a) * (ball.radius + 8),
              vx: Math.cos(a) * 470,
              vy: Math.sin(a) * 470,
              radius: 12,
              dmg: 6,
              bouncesLeft: 1,
              ttl: 1.9,
              color: '#fbbf24',
            });
          }
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
              x2: ball.x + dx * 900,
              y2: ball.y + dy * 900,
              dx,
              dy,
              dmg: 11,
              hitIds: {},
              ttl: 0.2,
            },
            3
          );
        }
      }
    },
  },
};
