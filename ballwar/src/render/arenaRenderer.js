import { ARENA_SIZE, PHASES } from '../sim/constants.js';
import { drawBallBody } from './ballArt.js';
import { drawHypergamyChart } from './ballArtMeme.js';

function drawAimArrow(ctx, ball, angle, bounds, color) {
  const len = 88;
  const startX = ball.x + Math.cos(angle) * (ball.radius + 8);
  const startY = ball.y + Math.sin(angle) * (ball.radius + 8);
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
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  const headSize = 17;
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
      const isBlack = h.variant === 'black';
      ctx.strokeStyle = isBlack ? 'rgba(15, 23, 42, 0.92)' : 'rgba(241, 245, 249, 0.86)';
      ctx.lineWidth = isBlack ? 4 : 2.4;
      ctx.shadowColor = isBlack ? 'rgba(244, 63, 94, 0.75)' : 'rgba(167, 139, 250, 0.6)';
      ctx.shadowBlur = isBlack ? 6 : 4;
      ctx.beginPath();
      ctx.moveTo(h.x1, h.y1);
      ctx.lineTo(h.x2, h.y2);
      ctx.stroke();
      if (isBlack) {
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = isBlack ? '#fb7185' : '#e2e8f0';
      ctx.beginPath();
      ctx.arc(h.x1, h.y1, 4, 0, Math.PI * 2);
      ctx.arc(h.x2, h.y2, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'red_zone': {
      const palettes = {
        acid: ['rgba(163, 230, 53, 0.24)', 'rgba(132, 204, 22, 0.88)'],
        slime: ['rgba(74, 222, 128, 0.22)', 'rgba(34, 197, 94, 0.85)'],
        gas: ['rgba(132, 204, 22, 0.20)', 'rgba(190, 242, 100, 0.65)'],
        potion_freeze: ['rgba(56, 189, 248, 0.24)', 'rgba(125, 211, 252, 0.92)'],
        potion_poison: ['rgba(34, 197, 94, 0.24)', 'rgba(74, 222, 128, 0.9)'],
        potion_dmg: ['rgba(239, 68, 68, 0.26)', 'rgba(251, 146, 60, 0.92)'],
        range: ['rgba(129, 140, 248, 0.14)', 'rgba(165, 180, 252, 0.85)'],
        gravity: ['rgba(15, 23, 42, 0.58)', 'rgba(139, 92, 246, 0.95)'],
        repulsor: ['rgba(34, 211, 238, 0.16)', 'rgba(56, 189, 248, 0.85)'],
        chronos: ['rgba(250, 204, 21, 0.18)', 'rgba(253, 224, 71, 0.9)'],
        anchor: ['rgba(51, 65, 85, 0.22)', 'rgba(56, 189, 248, 0.85)'],
        tornado: ['rgba(148, 163, 184, 0.22)', 'rgba(224, 242, 254, 0.88)'],
        vortex_pull: ['rgba(59, 130, 246, 0.18)', 'rgba(96, 165, 250, 0.85)'],
        vortex_push: ['rgba(239, 68, 68, 0.18)', 'rgba(248, 113, 113, 0.85)'],
        magma: ['rgba(234, 88, 12, 0.34)', 'rgba(253, 224, 71, 0.92)'],
        cloud: ['rgba(71, 85, 105, 0.42)', 'rgba(253, 224, 71, 0.9)'],
        sandstorm: ['rgba(217, 119, 6, 0.24)', 'rgba(253, 230, 138, 0.8)'],
        mimic_lure: ['rgba(251, 191, 36, 0.35)', 'rgba(254, 240, 138, 0.95)'],
        ufo_beam: ['rgba(74, 222, 128, 0.18)', 'rgba(168, 85, 247, 0.88)'],
        fallout: ['rgba(234, 179, 8, 0.28)', 'rgba(239, 68, 68, 0.92)'],
        cough_cloud: ['rgba(132, 204, 22, 0.28)', 'rgba(190, 242, 100, 0.9)'],
        banana_peel: ['rgba(250, 204, 21, 0.42)', 'rgba(254, 249, 195, 0.95)'],
        flush: ['rgba(14, 165, 233, 0.24)', 'rgba(56, 189, 248, 0.92)'],
        mod_zone: ['rgba(88, 101, 242, 0.26)', 'rgba(165, 180, 252, 0.9)'],
        aura_field: ['rgba(168, 85, 247, 0.24)', 'rgba(250, 204, 21, 0.95)'],
      };
      const [fill, stroke] = palettes[h.variant] || ['rgba(239, 68, 68, 0.22)', 'rgba(248, 113, 113, 0.85)'];
      const pulse = h.variant === 'range' ? 0.96 + Math.sin(time * 9) * 0.04 : 0.92 + Math.sin(time * 6) * 0.08;
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
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
      const isElec = h.variant === 'electric';
      if (h.armTimer > 0) {
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = isElec ? 'rgba(56, 189, 248, 0.55)' : 'rgba(240, 171, 252, 0.55)';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = isElec ? '#38bdf8' : '#e879f9';
        ctx.lineWidth = 5;
        ctx.shadowColor = isElec ? '#fde047' : '#f0abfc';
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.moveTo(h.x1, h.y1);
      ctx.lineTo(h.x2, h.y2);
      ctx.stroke();
      if (isElec && h.armTimer <= 0) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
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
      const s = Math.max(26, Math.round((h.radius || 20) * 1.35));
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(h.x - s * 0.5, h.y - s * 0.5, s, s, 8);
      ctx.fill();
      ctx.stroke();
      // Real pip dots 1..6
      const o = s * 0.24;
      const pipR = Math.max(2.3, s * 0.09);
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
        ctx.arc(h.x + px, h.y + py, pipR, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'turret': {
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(h.x, h.y, Math.max(5, h.radius * 0.35), 0, Math.PI * 2);
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
      const isBig = h.variant === 'big';
      const spikeLen = (h.radius || 23) * 0.9;
      const spikeHalf = (h.radius || 23) * 0.28;
      ctx.fillStyle = isBig ? '#9ca3af' : '#84cc16';
      ctx.strokeStyle = isBig ? '#dc2626' : '#14532d';
      ctx.lineWidth = isBig ? 2.5 : 2;
      for (let k = -1; k <= 1; k++) {
        const angle = Math.atan2(h.ny, h.nx) + k * 0.48;
        const tipX = h.x + Math.cos(angle) * spikeLen;
        const tipY = h.y + Math.sin(angle) * spikeLen;
        const perpX = -Math.sin(angle) * spikeHalf;
        const perpY = Math.cos(angle) * spikeHalf;
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

    case 'bomb': {
      const flash = h.fuse < 0.5 && Math.sin(time * 28) > 0;
      if (h.blastRadius && h.fuse < 0.6) {
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.55)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.blastRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = flash ? '#ef4444' : '#18181b';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(h.x + h.radius * 0.35, h.y - h.radius * 0.55, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'cactus': {
      ctx.fillStyle = '#16a34a';
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI * 2) / 12;
        const r = i % 2 === 0 ? h.radius : h.radius * 0.68;
        const px = h.x + Math.cos(a) * r;
        const py = h.y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'pickup_drop': {
      if (h.variant === 'apple') {
        ctx.fillStyle = '#dc2626';
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius * 0.78, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.ellipse(h.x + 5, h.y - h.radius * 0.75, 6, 3.5, -0.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const big = h.variant === 'candy_big';
        ctx.fillStyle = big ? '#fde047' : '#f472b6';
        ctx.strokeStyle = '#831843';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'portal_pair': {
      const col = h.portalColor || '#38bdf8';
      ctx.strokeStyle = col;
      ctx.lineWidth = 4;
      ctx.shadowColor = col;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius * (0.92 + Math.sin(time * 8) * 0.08), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    }

    case 'pinball_bumper': {
      ctx.fillStyle = '#be185d';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.radius * 0.56, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case 'ring_wave': {
      if (h.delay > 0) {
        if (h.variant === 'quake') {
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.78)';
          ctx.lineWidth = 4;
          ctx.setLineDash([10, 8]);
          ctx.beginPath();
          ctx.moveTo(h.x1, h.y1);
          ctx.lineTo(h.x2, h.y2);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.85)';
          ctx.fillStyle = 'rgba(234, 88, 12, 0.2)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(h.x, h.y, h.blastRadius || h.radius || 85, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else if (h.sweepVx != null || h.sweepVy != null) {
        ctx.fillStyle = 'rgba(14, 165, 233, 0.52)';
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 3;
        const w = h.w || 44;
        const hh = h.h || 240;
        ctx.beginPath();
        ctx.roundRect(h.x - w * 0.5, h.y - hh * 0.5, w, hh, 12);
        ctx.fill();
        ctx.stroke();
      } else {
        const waveCol = h.variant === 'nuke'
          ? '#f97316'
          : h.variant === 'dome'
          ? '#38bdf8'
          : h.variant === 'solar'
          ? '#fbbf24'
          : h.variant === 'blood'
          ? '#ef4444'
          : h.variant === 'ghost'
          ? '#c084fc'
          : '#f472b6';
        ctx.strokeStyle = waveCol;
        ctx.lineWidth = h.variant === 'nuke' ? 8 : 5;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.currentRadius || h.radius || 40, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    default:
      break;
  }

  ctx.restore();
}

function drawProjectile(ctx, p, time = 0) {
  ctx.save();
  const angle = Math.atan2(p.vy, p.vx);

  if (p.kind === 'train') {
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.fillStyle = '#fb923c';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-42, -22, 84, 44, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(28, -13, 12, 26);
  } else if (
    p.kind === 'knife' ||
    p.kind === 'shard' ||
    p.kind === 'ice_spike' ||
    p.kind === 'harpoon' ||
    p.kind === 'arrow' ||
    p.kind === 'syringe' ||
    p.kind === 'hook' ||
    p.kind === 'needle' ||
    p.kind === 'sniper_round' ||
    p.kind === 'dart'
  ) {
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.fillStyle = p.color || '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    const len = p.kind === 'harpoon' || p.kind === 'hook' ? 22 : Math.max(12, (p.radius || 10) * 1.35);
    const hw = Math.max(5.5, len * 0.48);
    if (p.kind === 'arrow' || p.kind === 'sniper_round') {
      ctx.strokeStyle = p.kind === 'sniper_round' ? '#ef4444' : '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-len * 1.2, 0);
      ctx.lineTo(len * 0.6, 0);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(len, 0);
    ctx.lineTo(-len * 0.55, -hw);
    ctx.lineTo(-len * 0.55, hw);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (p.kind === 'boomerang') {
    ctx.translate(p.x, p.y);
    ctx.rotate(time * 16 + (p.id || 0));
    ctx.strokeStyle = p.color || '#fb923c';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-12, 8);
    ctx.lineTo(4, -12);
    ctx.lineTo(14, 7);
    ctx.stroke();
  } else if (p.kind === 'shuriken') {
    ctx.translate(p.x, p.y);
    ctx.rotate(time * 18 + (p.id || 0));
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -p.radius);
      ctx.lineTo(4.5, -4.5);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (p.kind === 'robux') {
    ctx.translate(p.x, p.y);
    ctx.rotate(time * 8);
    ctx.fillStyle = '#10b981';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(-p.radius * 0.85, -p.radius * 0.85, p.radius * 1.7, p.radius * 1.7, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-3.5, -3.5, 7, 7);
  } else if (p.kind === 'bee') {
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(-1.5, -8, 5.5, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.kind === 'chess_piece') {
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.font = `900 ${Math.max(14, Math.round(p.radius * 0.9))}px system-ui, sans-serif`;
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

function drawHelper(ctx, h, sim) {
  ctx.save();
  if (h.kind === 'orbital') {
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.hitRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (h.kind === 'blade') {
    const r = h.hitRadius || 18;
    const parent = sim && sim.balls.find((b) => b.id === h.parentId);
    if (h.longBlade && parent) {
      const startDist = Math.max(20, parent.radius * 0.72);
      const bx = parent.x + Math.cos(h.orbitAngle) * startDist;
      const by = parent.y + Math.sin(h.orbitAngle) * startDist;
      const tipX = h.x + Math.cos(h.orbitAngle) * (r * 0.9);
      const tipY = h.y + Math.sin(h.orbitAngle) * (r * 0.9);
      const nx = -Math.sin(h.orbitAngle) * (r * 0.48);
      const ny = Math.cos(h.orbitAngle) * (r * 0.48);
      const mx = parent.x + Math.cos(h.orbitAngle) * (h.orbitRadius * 0.78);
      const my = parent.y + Math.sin(h.orbitAngle) * (h.orbitRadius * 0.78);
      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(mx + nx, my + ny);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(mx - nx, my - ny);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.translate(h.x, h.y);
      ctx.rotate(h.orbitAngle * 2.5);
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.15);
      ctx.lineTo(r * 0.85, 0);
      ctx.lineTo(0, r * 1.15);
      ctx.lineTo(-r * 0.85, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (h.kind === 'hook_claw') {
    const parent = sim && sim.balls.find((b) => b.id === h.parentId);
    if (parent) {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 7;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.moveTo(parent.x, parent.y);
      ctx.lineTo(h.x, h.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.translate(h.x, h.y);
    ctx.rotate(h.orbitAngle);
    ctx.fillStyle = h.hookedId ? '#fb923c' : '#cbd5e1';
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, h.hitRadius * 0.78, -1.65, 1.65);
    ctx.lineTo(h.hitRadius * 0.9, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (h.kind === 'axe') {
    const parent = sim && sim.balls.find((b) => b.id === h.parentId);
    if (parent) {
      // Draw heavy two-ball-length shaft from Axe Ball to the curved battle-axe head
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(parent.x, parent.y);
      ctx.lineTo(h.x, h.y);
      ctx.stroke();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.translate(h.x, h.y);
    ctx.rotate(h.orbitAngle + Math.PI / 2);
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, h.hitRadius, -1.15, 1.15);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (h.kind === 'hypergamy_symbol') {
    const parent = sim && sim.balls.find((b) => b.id === h.parentId);
    if (parent) {
      // Long gold-and-pink pole from Hypergamy Ball to the outer Hypergamy Chart board
      ctx.strokeStyle = '#db2777';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(parent.x, parent.y);
      ctx.lineTo(h.x, h.y);
      ctx.stroke();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.translate(h.x, h.y);
    ctx.rotate(h.orbitAngle + Math.PI / 2);
    const hr = h.hitRadius || 32;
    drawHypergamyChart(ctx, 0, 0, hr * 2.15);
  } else if (h.kind === 'dondurma_paddle') {
    const parent = sim && sim.balls.find((b) => b.id === h.parentId);
    if (parent) {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(parent.x, parent.y);
      ctx.lineTo(h.x, h.y);
      ctx.stroke();
    }
    ctx.translate(h.x, h.y);
    ctx.rotate(h.orbitAngle);
    const hr = h.hitRadius || 24;
    // Waffle cone + pink/vanilla Maraş dondurma scoop
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(-hr * 0.55, 0);
    ctx.lineTo(hr * 0.15, -hr * 0.44);
    ctx.lineTo(hr * 0.15, hr * 0.44);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fbcfe8';
    ctx.strokeStyle = '#be123c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(hr * 0.35, 0, hr * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (h.kind === 'spear') {
    const parent = sim && sim.balls.find((b) => b.id === h.parentId);
    if (parent) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(parent.x, parent.y);
      ctx.lineTo(h.x, h.y);
      ctx.stroke();
    }
    ctx.translate(h.x, h.y);
    ctx.rotate(h.orbitAngle);
    ctx.fillStyle = '#eab308';
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(h.hitRadius * 1.15, 0);
    ctx.lineTo(-h.hitRadius * 0.65, -h.hitRadius * 0.55);
    ctx.lineTo(-h.hitRadius * 0.65, h.hitRadius * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (h.kind === 'forge_orb') {
    ctx.fillStyle = '#f97316';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.max(12, Math.round(h.radius * 0.72))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(h.dmg), h.x, h.y + 0.5);
  } else if (h.kind === 'hammer') {
    const parent = sim && sim.balls.find((b) => b.id === h.parentId);
    if (parent) {
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(parent.x, parent.y);
      ctx.lineTo(h.x, h.y);
      ctx.stroke();
    }
    ctx.translate(h.x, h.y);
    ctx.rotate(h.orbitAngle + Math.PI / 2);
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    ctx.fillRect(-h.hitRadius * 0.9, -h.hitRadius * 0.45, h.hitRadius * 1.8, h.hitRadius * 0.9);
    ctx.strokeRect(-h.hitRadius * 0.9, -h.hitRadius * 0.45, h.hitRadius * 1.8, h.hitRadius * 0.9);
  } else if (h.kind === 'knight_lance') {
    const parent = sim && sim.balls.find((b) => b.id === h.parentId);
    if (parent) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(parent.x, parent.y);
      ctx.lineTo(h.x, h.y);
      ctx.stroke();
    }
    ctx.translate(h.x, h.y);
    ctx.rotate(h.orbitAngle);
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(h.hitRadius * 1.25, 0);
    ctx.lineTo(-h.hitRadius * 0.7, -h.hitRadius * 0.52);
    ctx.lineTo(-h.hitRadius * 0.7, h.hitRadius * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (h.kind === 'chainsaw' || h.kind === 'drill') {
    ctx.translate(h.x, h.y);
    ctx.rotate(h.orbitAngle);
    ctx.fillStyle = h.kind === 'chainsaw' ? '#ef4444' : '#eab308';
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(h.hitRadius * 1.15, 0);
    ctx.lineTo(-h.hitRadius * 0.7, -h.hitRadius * 0.65);
    ctx.lineTo(-h.hitRadius * 0.7, h.hitRadius * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (h.kind === 'shadow_decoy') {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (h.kind === 'mini_turret') {
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(h.orbitAngle || 0);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, -4, h.radius + 8, 8);
  }
  ctx.restore();
}

export function renderArena(ctx, sim, uiState = {}) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const arenaSz = sim.arenaSize || ARENA_SIZE;
  const scale = w / arenaSz;
  const time = sim.roundTime || (performance.now() * 0.001);

  ctx.save();
  ctx.scale(scale, scale);

  // Subtle camera shake
  if (sim.shakeTimer > 0 && sim.shakeIntensity > 0) {
    const sx = (Math.random() - 0.5) * sim.shakeIntensity * 2;
    const sy = (Math.random() - 0.5) * sim.shakeIntensity * 2;
    ctx.translate(sx, sy);
  }

  // Arena Theme Palette (cosmetic-only)
  const themeId = uiState.arenaTheme || 'classic';
  const themeStyles = {
    classic: {
      outer: '#0f172a',
      bg0: '#1e293b',
      bg1: '#111827',
      grid: 'rgba(148, 163, 184, 0.12)',
      ring: 'rgba(148, 163, 184, 0.16)',
    },
    neon_cyber: {
      outer: '#09071a',
      bg0: '#1e1b4b',
      bg1: '#0b0920',
      grid: 'rgba(34, 211, 238, 0.18)',
      ring: 'rgba(232, 121, 249, 0.35)',
    },
    volcano: {
      outer: '#1c0a00',
      bg0: '#451a03',
      bg1: '#1c0902',
      grid: 'rgba(249, 115, 22, 0.16)',
      ring: 'rgba(251, 146, 60, 0.34)',
    },
    notebook: {
      outer: '#cbd5e1',
      bg0: '#fefce8',
      bg1: '#fef3c7',
      grid: 'rgba(59, 130, 246, 0.22)',
      ring: 'rgba(239, 68, 68, 0.26)',
    },
    matrix: {
      outer: '#010a06',
      bg0: '#022c22',
      bg1: '#010f0a',
      grid: 'rgba(34, 197, 94, 0.2)',
      ring: 'rgba(74, 222, 128, 0.32)',
    },
    cosmic_omega: {
      outer: '#090214',
      bg0: '#2e1065',
      bg1: '#090214',
      grid: 'rgba(251, 191, 36, 0.14)',
      ring: 'rgba(251, 191, 36, 0.42)',
    },
  };
  const th = themeStyles[themeId] || themeStyles.classic;

  // Outer danger background (visible when Sudden Death shrinks arena)
  ctx.fillStyle = sim.suddenDeathActive ? '#4c0519' : th.outer;
  ctx.fillRect(0, 0, arenaSz, arenaSz);

  // Playable arena court inside current bounds
  const b = sim.bounds;
  const bw = b.right - b.left;
  const bh = b.bottom - b.top;

  ctx.save();
  ctx.beginPath();
  ctx.rect(b.left, b.top, bw, bh);
  ctx.clip();

  // Themed court floor
  const bgGrad = ctx.createLinearGradient(0, 0, arenaSz, arenaSz);
  bgGrad.addColorStop(0, th.bg0);
  bgGrad.addColorStop(1, th.bg1);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(b.left, b.top, bw, bh);

  // Subtle decorative starfield for Cosmic Omega theme
  if (themeId === 'cosmic_omega') {
    ctx.fillStyle = 'rgba(254, 240, 138, 0.32)';
    for (let s = 0; s < 26; s++) {
      const sx = ((s * 173 + 47) % 100) * 0.01 * arenaSz;
      const sy = ((s * 293 + 83) % 100) * 0.01 * arenaSz;
      const sr = (s % 3) * 0.7 + 1.1;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Clean grid lines
  ctx.strokeStyle = th.grid;
  ctx.lineWidth = themeId === 'notebook' ? 1.2 : 1;
  const step = 40;
  for (let gx = 0; gx <= arenaSz; gx += step) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, arenaSz);
    ctx.stroke();
  }
  for (let gy = 0; gy <= arenaSz; gy += step) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(arenaSz, gy);
    ctx.stroke();
  }

  // Center arena emblem
  ctx.strokeStyle = th.ring;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(arenaSz * 0.5, arenaSz * 0.5, 84, 0, Math.PI * 2);
  ctx.stroke();
  if (themeId === 'cosmic_omega') {
    ctx.fillStyle = 'rgba(251, 191, 36, 0.16)';
    ctx.font = '900 72px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Ω', arenaSz * 0.5, arenaSz * 0.5 + 3);
  }

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

  // Ball motion trails (with unlockable cosmetic trail for local player's balls)
  const localOwner = uiState.localOwner || 1;
  const equippedTrail = uiState.ballTrail || 'default';
  for (const ball of sim.balls) {
    if (!ball.trail || ball.trail.length < 2) continue;
    const trailId = ball.owner === localOwner ? equippedTrail : 'default';
    ctx.save();
    for (let i = 0; i < ball.trail.length - 1; i++) {
      const pt = ball.trail[i];
      const frac = (i + 1) / ball.trail.length;
      const rad = ball.radius * frac * 0.72;
      if (trailId === 'flame') {
        ctx.fillStyle = i % 2 === 0
          ? `rgba(249, 115, 22, ${frac * 0.36})`
          : `rgba(250, 204, 21, ${frac * 0.32})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, rad * 1.06, 0, Math.PI * 2);
        ctx.fill();
      } else if (trailId === 'rainbow') {
        const hue = Math.round((time * 160 + i * 28) % 360);
        ctx.fillStyle = `hsla(${hue}, 92%, 62%, ${frac * 0.32})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
        ctx.fill();
      } else if (trailId === 'glitch') {
        const off = (i % 2 === 0 ? 1 : -1) * 5;
        ctx.fillStyle = i % 2 === 0
          ? `rgba(34, 211, 238, ${frac * 0.34})`
          : `rgba(232, 121, 249, ${frac * 0.34})`;
        ctx.fillRect(pt.x - rad * 0.65 + off, pt.y - rad * 0.65, rad * 1.3, rad * 1.3);
      } else if (trailId === 'gold_dust') {
        ctx.fillStyle = `rgba(251, 191, 36, ${frac * 0.35})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, rad * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(254, 240, 138, ${frac * 0.6})`;
        ctx.beginPath();
        ctx.arc(pt.x + Math.sin(i * 2.1) * 7, pt.y + Math.cos(i * 1.9) * 7, 3.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (trailId === 'void_lightning') {
        const nextPt = ball.trail[i + 1];
        ctx.strokeStyle = i % 2 === 0
          ? `rgba(168, 85, 247, ${frac * 0.62})`
          : `rgba(45, 212, 191, ${frac * 0.62})`;
        ctx.lineWidth = Math.max(2, frac * 6);
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo((pt.x + nextPt.x) * 0.5 + ((i % 2) * 8 - 4), (pt.y + nextPt.y) * 0.5 + ((i % 3) * 5 - 5));
        ctx.lineTo(nextPt.x, nextPt.y);
        ctx.stroke();
      } else {
        ctx.fillStyle = ball.owner === 1
          ? `rgba(56, 189, 248, ${frac * 0.2})`
          : `rgba(244, 63, 94, ${frac * 0.2})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Projectiles & Helpers
  for (const p of sim.projectiles) drawProjectile(ctx, p, time);
  for (const h of sim.helpers) drawHelper(ctx, h, sim);

  // Aiming arrows during Lock Aim phase
  if (sim.phase === PHASES.AIM) {
    const activePlayer = uiState.aimingPlayer || 1;
    const activeSlot = uiState.aimSlot ?? 0;
    const is2v2 = sim.teamSize === 2;
    const singleSlotOnly = Boolean(uiState.aimOnlySingleSlot);
    for (const ball of sim.balls) {
      if (ball.owner === activePlayer) {
        const slot = ball.slotIndex ?? 0;
        if (singleSlotOnly && slot !== activeSlot) continue;
        const isSelected = !is2v2 || slot === activeSlot;
        const angle =
          ball.aimAngle ??
          sim.teamAimAngles?.[ball.owner]?.[slot] ??
          sim.aimAngles[ball.owner];
        ctx.save();
        if (!isSelected) ctx.globalAlpha = 0.55;
        if (is2v2 && isSelected) {
          ctx.strokeStyle = ball.owner === 1 ? '#7dd3fc' : '#fda4af';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.radius + 11, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        drawAimArrow(
          ctx,
          ball,
          angle,
          b,
          ball.owner === 1 ? '#38bdf8' : '#f43f5e'
        );
        ctx.restore();
      }
    }
  }

  // Snake Ball chunky trailing body segments (draw back-to-front so neck tucks under head)
  for (const ball of sim.balls) {
    if (ball.ballId !== 'snake' || !Array.isArray(ball.tail) || ball.tail.length === 0) continue;
    ctx.save();
    for (let i = ball.tail.length - 1; i >= 0; i--) {
      const seg = ball.tail[i];
      ctx.fillStyle = i % 2 === 0 ? '#15803d' : '#22c55e';
      ctx.strokeStyle = ball.owner === 1 ? '#38bdf8' : '#fb7185';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, seg.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, seg.r * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Balls & On-Ball Bold HP
  for (const ball of sim.balls) {
    // Snake red forked tongue flicking forward
    if (ball.ballId === 'snake') {
      const sp = Math.hypot(ball.vx, ball.vy);
      const ang = sp > 1 ? Math.atan2(ball.vy, ball.vx) : 0;
      const flick = Math.sin(time * 0.018 + ball.id) > -0.25;
      if (flick) {
        const tx = ball.x + Math.cos(ang) * (ball.radius - 2);
        const ty = ball.y + Math.sin(ang) * (ball.radius - 2);
        const midX = tx + Math.cos(ang) * 14;
        const midY = ty + Math.sin(ang) * 14;
        ctx.save();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(midX, midY);
        ctx.lineTo(midX + Math.cos(ang + 0.55) * 9, midY + Math.sin(ang + 0.55) * 9);
        ctx.moveTo(midX, midY);
        ctx.lineTo(midX + Math.cos(ang - 0.55) * 9, midY + Math.sin(ang - 0.55) * 9);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Charge Ball kinetic lightning aura
    if (ball.ballId === 'charge' && (ball.state?.charge || 0) > 0.15) {
      const ch = Math.min(1, ball.state.charge);
      ctx.save();
      ctx.strokeStyle = `rgba(34, 211, 238, ${0.35 + ch * 0.55})`;
      ctx.lineWidth = 2.5 + ch * 3.5;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius + 7 + ch * 5, time * 0.008, time * 0.008 + Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Burst Ball nitro boost flame ring
    if (ball.dashTimer > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.85)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Shield Ball rotating reflector buckler arc
    if (ball.shieldHalfWidth > 0) {
      ctx.save();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#93c5fd';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius + 9, ball.shieldAngle - ball.shieldHalfWidth, ball.shieldAngle + ball.shieldHalfWidth);
      ctx.stroke();
      ctx.restore();
    }

    // Sniper laser sight telegraph
    if (ball.ballId === 'sniper' && (ball.state?.aiming || 0) > 0) {
      const a = ball.state.aimAngle || 0;
      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.72)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      ctx.lineTo(ball.x + Math.cos(a) * 750, ball.y + Math.sin(a) * 750);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    drawBallBody(ctx, ball, ball.x, ball.y, ball.radius, {
      owner: ball.owner,
      time,
      stage: ball.state?.stage || 1,
      phaseTimer: ball.phaseTimer || 0,
      flashTimer: ball.flashTimer,
      stunTimer: ball.stunTimer,
      slowTimer: ball.slowTimer,
      poisonTimer: ball.poisonTimer,
      masteryLevel:
        ball.owner === localOwner && uiState.ballMasteryMap
          ? uiState.ballMasteryMap[ball.ballId] || 0
          : 0,
    });

    // Centered HP number inside ball (Roblox style)
    ctx.save();
    ctx.font = `900 ${Math.max(12, Math.round(ball.radius * 0.72))}px "Fredoka", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4.5, Math.round(ball.radius * 0.14));
    ctx.strokeStyle = '#090d16';
    ctx.strokeText(String(Math.ceil(ball.hp)), ball.x, ball.y + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(Math.ceil(ball.hp)), ball.x, ball.y + 1);

    // Stage / Scaling / Status badge right below ball
    let badgeText = '';
    let badgeColor = '#fde047';
    if (ball.ballId === 'verity') {
      const stage = ball.state?.stage || 1;
      badgeText = stage === 3 ? 'DMG 40!' : stage === 2 ? 'DMG 10' : 'DMG 5';
      badgeColor = stage === 3 ? '#ef4444' : stage === 2 ? '#fbbf24' : '#fde047';
    } else if (ball.ballId === 'doubler' && (ball.state?.mult || 1) > 1) {
      badgeText = `x${ball.state.mult}`;
      badgeColor = '#fbbf24';
    } else if (ball.ballId === 'mach' && ball.baseSpeed >= 500) {
      badgeText = `${Math.round(ball.baseSpeed)} SPD`;
      badgeColor = '#38bdf8';
    } else if (ball.ballId === 'gambler' && ball.state?.slotText) {
      badgeText = ball.state.slotText;
      badgeColor = '#fde047';
    } else if (ball.ballId === 'banker' && (ball.state?.coins || 0) > 0) {
      badgeText = `$${ball.state.coins}`;
      badgeColor = '#facc15';
    } else if (ball.ballId === 'mirror' && ball.state?._mimicId) {
      badgeText = ball.state._mimicId.toUpperCase();
      badgeColor = '#f0abfc';
    } else if (ball.ballId === 'fibonacci') {
      badgeText = `DMG ${ball.state?.cur || 1}`;
      badgeColor = '#34d399';
    } else if (ball.ballId === 'cell' && ball.state?.mature) {
      badgeText = 'SPLIT READY';
      badgeColor = '#6ee7b7';
    } else if (ball.ballId === 'charge') {
      badgeText = `CHG ${Math.round((ball.state?.charge || 0) * 100)}%`;
      badgeColor = '#22d3ee';
    } else if (ball.ballId === 'robux' && (ball.state?.stacks || 0) > 0) {
      badgeText = `R$${ball.state.stacks}`;
      badgeColor = '#4ade80';
    } else if ((ball.chillStacks || 0) > 0) {
      badgeText = `CHILL x${ball.chillStacks}`;
      badgeColor = '#7dd3fc';
    } else if ((ball.virusStacks || 0) > 0) {
      badgeText = `VIRUS x${ball.virusStacks}`;
      badgeColor = '#c084fc';
    }
    if (badgeText) {
      ctx.font = '800 12px system-ui, sans-serif';
      ctx.lineWidth = 3.5;
      ctx.strokeText(badgeText, ball.x, ball.y + ball.radius + 14);
      ctx.fillStyle = badgeColor;
      ctx.fillText(badgeText, ball.x, ball.y + ball.radius + 14);
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
