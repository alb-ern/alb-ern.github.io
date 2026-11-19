import { ARENA_SIZE, PHASES } from '../sim/constants.js';
import { drawBallBody } from './ballArt.js';

function drawAimArrow(ctx, ball, angle, bounds, color) {
  const len = 78;
  const startX = ball.x + Math.cos(angle) * (ball.radius + 6);
  const startY = ball.y + Math.sin(angle) * (ball.radius + 6);
  const endX = ball.x + Math.cos(angle) * (ball.radius + len);
  const endY = ball.y + Math.sin(angle) * (ball.radius + len);

  // Subtle 1-bounce trajectory raycast preview
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let tMin = Infinity;
  let hitNx = 0;
  let hitNy = 0;
  if (dx < -1e-4) {
    const t = (bounds.left + ball.radius - ball.x) / dx;
    if (t > 0 && t < tMin) { tMin = t; hitNx = 1; hitNy = 0; }
  } else if (dx > 1e-4) {
    const t = (bounds.right - ball.radius - ball.x) / dx;
    if (t > 0 && t < tMin) { tMin = t; hitNx = -1; hitNy = 0; }
  }
  if (dy < -1e-4) {
    const t = (bounds.top + ball.radius - ball.y) / dy;
    if (t > 0 && t < tMin) { tMin = t; hitNx = 0; hitNy = 1; }
  } else if (dy > 1e-4) {
    const t = (bounds.bottom - ball.radius - ball.y) / dy;
    if (t > 0 && t < tMin) { tMin = t; hitNx = 0; hitNy = -1; }
  }

  ctx.save();
  if (tMin < 900) {
    const hx = ball.x + dx * tMin;
    const hy = ball.y + dy * tMin;
    const rdx = hitNx !== 0 ? -dx : dx;
    const rdy = hitNy !== 0 ? -dy : dy;
    ctx.setLineDash([7, 7]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(hx, hy);
    ctx.lineTo(hx + rdx * 90, hy + rdy * 90);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Thick glowing direction arrow
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  const headSize = 14;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(endX + Math.cos(angle) * 6, endY + Math.sin(angle) * 6);
  ctx.lineTo(
    endX - Math.cos(angle - 0.55) * headSize,
    endY - Math.sin(angle - 0.55) * headSize
  );
  ctx.lineTo(
    endX - Math.cos(angle + 0.55) * headSize,
    endY - Math.sin(angle + 0.55) * headSize
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHazard(ctx, h, bounds, time) {
  ctx.save();
  const alphaFade = Math.min(1, h.ttl / 1.2);
  ctx.globalAlpha = alphaFade;

  switch (h.kind) {
    case 'web_line': {
      ctx.strokeStyle = 'rgba(241, 245, 249, 0.86)';
      ctx.lineWidth = 2.4;
      ctx.shadowColor = 'rgba(167, 139, 250, 0.6)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(h.x1, h.y1);
      ctx.lineTo(h.x2, h.y2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(h.x1, h.y1, 3.5, 0, Math.PI * 2);
      ctx.arc(h.x2, h.y2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'red_zone': {
      const pulse = 0.92 + Math.sin(time * 6) * 0.08;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
      ctx.strokeStyle = 'rgba(248, 113, 113, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'shackle_cage': {
      ctx.fillStyle = h.armTimer <= 0 ? 'rgba(244, 63, 94, 0.14)' : 'rgba(148, 163, 184, 0.1)';
      ctx.strokeStyle = h.armTimer <= 0 ? '#fb7185' : '#94a3b8';
      ctx.lineWidth = 4;
      ctx.setLineDash([9, 5]);
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      // Outer metallic chain studs
      ctx.fillStyle = '#e2e8f0';
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3 + time * 0.5;
        ctx.beginPath();
        ctx.arc(h.x + Math.cos(a) * h.radius, h.y + Math.sin(a) * h.radius, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'track': {
      ctx.strokeStyle = h.telegraph > 0 ? 'rgba(251, 146, 60, 0.7)' : 'rgba(253, 224, 71, 0.5)';
      ctx.lineWidth = 3;
      if (h.horizontal) {
        for (const off of [-10, 10]) {
          ctx.beginPath();
          ctx.moveTo(bounds.left, h.y + off);
          ctx.lineTo(bounds.right, h.y + off);
          ctx.stroke();
        }
        ctx.lineWidth = 2;
        for (let tx = bounds.left + 8; tx < bounds.right; tx += 22) {
          ctx.beginPath();
          ctx.moveTo(tx, h.y - 14);
          ctx.lineTo(tx, h.y + 14);
          ctx.stroke();
        }
      } else {
        for (const off of [-10, 10]) {
          ctx.beginPath();
          ctx.moveTo(h.x + off, bounds.top);
          ctx.lineTo(h.x + off, bounds.bottom);
          ctx.stroke();
        }
        ctx.lineWidth = 2;
        for (let ty = bounds.top + 8; ty < bounds.bottom; ty += 22) {
          ctx.beginPath();
          ctx.moveTo(h.x - 14, ty);
          ctx.lineTo(h.x + 14, ty);
          ctx.stroke();
        }
      }
      break;
    }

    case 'laser_beam': {
      if (h.armTimer > 0) {
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = 'rgba(240, 171, 252, 0.55)';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = '#e879f9';
        ctx.lineWidth = 5;
        ctx.shadowColor = '#f0abfc';
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.moveTo(h.x1, h.y1);
      ctx.lineTo(h.x2, h.y2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.setLineDash([]);
      break;
    }

    case 'plasma_blast': {
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 18;
      ctx.shadowColor = '#93c5fd';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(h.x1, h.y1);
      ctx.lineTo(h.x2, h.y2);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 7;
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    }

    case 'dice': {
      const s = 26;
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(h.x - s * 0.5, h.y - s * 0.5, s, s, 6);
      ctx.fill();
      ctx.stroke();
      // Real pip dots 1..6
      const o = 6;
      const pipMap = {
        1: [[0, 0]],
        2: [[-o, -o], [o, o]],
        3: [[-o, -o], [0, 0], [o, o]],
        4: [[-o, -o], [o, -o], [-o, o], [o, o]],
        5: [[-o, -o], [o, -o], [0, 0], [-o, o], [o, o]],
        6: [[-o, -o], [o, -o], [-o, 0], [o, 0], [-o, o], [o, o]],
      };
      ctx.fillStyle = '#1e1b4b';
      for (const [px, py] of (pipMap[h.roll] || pipMap[1])) {
        ctx.beginPath();
        ctx.arc(h.x + px, h.y + py, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'turret': {
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(h.x, h.y, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'ice_bomb': {
      const flash = Math.sin(time * 22) > 0;
      ctx.fillStyle = flash ? '#e0f2fe' : '#0284c7';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'poison_spike': {
      ctx.fillStyle = '#84cc16';
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 2;
      for (let k = -1; k <= 1; k++) {
        const angle = Math.atan2(h.ny, h.nx) + k * 0.48;
        const tipX = h.x + Math.cos(angle) * 19;
        const tipY = h.y + Math.sin(angle) * 19;
        const perpX = -Math.sin(angle) * 6;
        const perpY = Math.cos(angle) * 6;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(h.x + perpX, h.y + perpY);
        ctx.lineTo(h.x - perpX, h.y - perpY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    default:
      break;
  }

  ctx.restore();
}

function drawProjectile(ctx, p) {
  ctx.save();
  const angle = Math.atan2(p.vy, p.vx);

  if (p.kind === 'train') {
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.fillStyle = '#fb923c';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-34, -17, 68, 34, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(22, -10, 10, 20);
  } else if (p.kind === 'knife' || p.kind === 'shard' || p.kind === 'ice_spike' || p.kind === 'harpoon') {
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.fillStyle = p.color || '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.6;
    const len = p.kind === 'harpoon' ? 16 : 11;
    ctx.beginPath();
    ctx.moveTo(len, 0);
    ctx.lineTo(-len * 0.6, -5.5);
    ctx.lineTo(-len * 0.6, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (p.kind === 'bee') {
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(-1, -6, 4, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.kind === 'chess_piece') {
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icon = p.piece === 'rook' ? '♖' : p.piece === 'bishop' ? '♗' : '♕';
    ctx.fillText(icon, p.x, p.y + 1);
  } else {
    ctx.fillStyle = p.color || '#fbbf24';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawHelper(ctx, h) {
  ctx.save();
  if (h.kind === 'orbital') {
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.hitRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (h.kind === 'blade') {
    ctx.translate(h.x, h.y);
    ctx.rotate(h.orbitAngle * 2.5);
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 13);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (h.kind === 'axe') {
    ctx.translate(h.x, h.y);
    ctx.rotate(h.orbitAngle + Math.PI / 2);
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, h.hitRadius, -1.1, 1.1);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (h.kind === 'forge_orb') {
    ctx.fillStyle = '#f97316';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(h.dmg), h.x, h.y + 0.5);
  }
  ctx.restore();
}

export function renderArena(ctx, sim, uiState = {}) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const scale = w / ARENA_SIZE;
  const time = sim.roundTime || (performance.now() * 0.001);

  ctx.save();
  ctx.scale(scale, scale);

  // Subtle camera shake
  if (sim.shakeTimer > 0 && sim.shakeIntensity > 0) {
    const sx = (Math.random() - 0.5) * sim.shakeIntensity * 2;
    const sy = (Math.random() - 0.5) * sim.shakeIntensity * 2;
    ctx.translate(sx, sy);
  }

  // Outer danger background (visible when Sudden Death shrinks arena)
  ctx.fillStyle = sim.suddenDeathActive ? '#4c0519' : '#0f172a';
  ctx.fillRect(0, 0, ARENA_SIZE, ARENA_SIZE);

  // Playable arena court inside current bounds
  const b = sim.bounds;
  const bw = b.right - b.left;
  const bh = b.bottom - b.top;

  ctx.save();
  ctx.beginPath();
  ctx.rect(b.left, b.top, bw, bh);
  ctx.clip();

  // Tactile Roblox-style bright court floor
  const bgGrad = ctx.createLinearGradient(0, 0, ARENA_SIZE, ARENA_SIZE);
  bgGrad.addColorStop(0, '#1e293b');
  bgGrad.addColorStop(1, '#111827');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(b.left, b.top, bw, bh);

  // Clean subtle grid lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
  ctx.lineWidth = 1;
  const step = 40;
  for (let gx = 0; gx <= ARENA_SIZE; gx += step) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, ARENA_SIZE);
    ctx.stroke();
  }
  for (let gy = 0; gy <= ARENA_SIZE; gy += step) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(ARENA_SIZE, gy);
    ctx.stroke();
  }

  // Center arena emblem
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(ARENA_SIZE * 0.5, ARENA_SIZE * 0.5, 84, 0, Math.PI * 2);
  ctx.stroke();

  // Hazards inside arena
  for (const hz of sim.hazards) {
    drawHazard(ctx, hz, b, time);
  }

  // Vampire blood latch & special targeting lines
  for (const ball of sim.balls) {
    if (ball.ballId === 'vampire' && ball.state?.latchTargetId) {
      const target = sim.balls.find((x) => x.id === ball.state.latchTargetId && x.hp > 0);
      if (target) {
        ctx.save();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 5;
        ctx.shadowColor = '#f87171';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.restore();
      }
    }
    // Beam Ball lock-on targeting line
    if (ball.ballId === 'beam' && ball.state?.locking) {
      ctx.save();
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.85)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      ctx.lineTo(
        ball.x + Math.cos(ball.state.lockAngle) * 850,
        ball.y + Math.sin(ball.state.lockAngle) * 850
      );
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    // Chess Ball telegraph cross
    if (ball.ballId === 'chess' && ball.state?.phase === 'telegraph') {
      const dirs =
        ball.state.mode === 'rook'
          ? [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]
          : ball.state.mode === 'bishop'
          ? [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]
          : [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];
      ctx.save();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.55)';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      for (const a of dirs) {
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(ball.x + Math.cos(a) * 500, ball.y + Math.sin(a) * 500);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // Harpoon tether chains
  for (const p of sim.projectiles) {
    if (p.kind === 'harpoon') {
      const parent = sim.balls.find((ball) => ball.id === p.parentId && ball.hp > 0);
      if (parent) {
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.72)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(parent.x, parent.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
  }

  // Ball motion trails
  for (const ball of sim.balls) {
    if (!ball.trail || ball.trail.length < 2) continue;
    ctx.save();
    for (let i = 0; i < ball.trail.length - 1; i++) {
      const pt = ball.trail[i];
      const frac = (i + 1) / ball.trail.length;
      ctx.fillStyle = ball.owner === 1
        ? `rgba(56, 189, 248, ${frac * 0.2})`
        : `rgba(244, 63, 94, ${frac * 0.2})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, ball.radius * frac * 0.72, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Projectiles & Helpers
  for (const p of sim.projectiles) drawProjectile(ctx, p);
  for (const h of sim.helpers) drawHelper(ctx, h);

  // Aiming arrows during Lock Aim phase
  if (sim.phase === PHASES.AIM) {
    const activePlayer = uiState.aimingPlayer || 1;
    for (const ball of sim.balls) {
      if (ball.owner === activePlayer) {
        drawAimArrow(
          ctx,
          ball,
          sim.aimAngles[ball.owner],
          b,
          ball.owner === 1 ? '#38bdf8' : '#f43f5e'
        );
      }
    }
  }

  // Balls & On-Ball Bold HP
  for (const ball of sim.balls) {
    drawBallBody(ctx, ball, ball.x, ball.y, ball.radius, {
      owner: ball.owner,
      time,
      stage: ball.state?.stage || 1,
      flashTimer: ball.flashTimer,
      stunTimer: ball.stunTimer,
      slowTimer: ball.slowTimer,
      poisonTimer: ball.poisonTimer,
    });

    // Centered HP number inside ball (Roblox style)
    ctx.save();
    ctx.font = `900 ${Math.max(12, Math.round(ball.radius * 0.72))}px "Fredoka", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#090d16';
    ctx.strokeText(String(Math.ceil(ball.hp)), ball.x, ball.y + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(Math.ceil(ball.hp)), ball.x, ball.y + 1);

    // Stage / Scaling / Mature badge right below ball
    if (ball.ballId === 'verity') {
      const stage = ball.state?.stage || 1;
      const badge = stage === 3 ? 'DMG 40!' : stage === 2 ? 'DMG 10' : 'DMG 5';
      ctx.font = '800 10px system-ui, sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeText(badge, ball.x, ball.y + ball.radius + 11);
      ctx.fillStyle = stage === 3 ? '#ef4444' : stage === 2 ? '#fbbf24' : '#fde047';
      ctx.fillText(badge, ball.x, ball.y + ball.radius + 11);
    } else if (ball.ballId === 'fibonacci') {
      const cur = ball.state?.cur || 1;
      ctx.font = '800 10px system-ui, sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeText(`DMG ${cur}`, ball.x, ball.y + ball.radius + 11);
      ctx.fillStyle = '#34d399';
      ctx.fillText(`DMG ${cur}`, ball.x, ball.y + ball.radius + 11);
    } else if (ball.ballId === 'cell' && ball.state?.mature) {
      ctx.font = '800 10px system-ui, sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeText('SPLIT READY', ball.x, ball.y + ball.radius + 11);
      ctx.fillStyle = '#6ee7b7';
      ctx.fillText('SPLIT READY', ball.x, ball.y + ball.radius + 11);
    }
    ctx.restore();
  }

  // Particles
  for (const pt of sim.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.ttl / pt.maxTtl);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Floating Damage / Status Texts
  for (const f of sim.floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (f.ttl / f.maxTtl) * 1.4);
    ctx.font = '900 16px "Fredoka", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#090d16';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }

  ctx.restore(); // unclip arena bounds

  // Glowing Arena Perimeter Frame
  ctx.lineWidth = sim.suddenDeathActive ? 5 : 4;
  ctx.strokeStyle = sim.suddenDeathActive ? '#f43f5e' : '#38bdf8';
  ctx.strokeRect(b.left + 2, b.top + 2, bw - 4, bh - 4);

  ctx.restore();
}
