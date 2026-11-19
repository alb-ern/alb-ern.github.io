import { getBallDef } from '../sim/balls.js';

function drawPolygon(ctx, cx, cy, r, sides, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i * Math.PI * 2) / sides;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawBallPattern(ctx, id, x, y, r, def, time, opts = {}) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r - 1.5, 0, Math.PI * 2);
  ctx.clip();

  switch (id) {
    case 'verity': {
      const stage = opts.stage || 1;
      if (stage === 1) {
        // Stage 1: Happy analog-horror smiley face
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(x - r * 0.28, y - r * 0.2, r * 0.11, 0, Math.PI * 2);
        ctx.arc(x + r * 0.28, y - r * 0.2, r * 0.11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = Math.max(2, r * 0.09);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(x, y + r * 0.05, r * 0.36, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else if (stage === 2) {
        // Stage 2: Displeased wide-eyed expression
        ctx.fillStyle = '#dc2626';
        ctx.globalAlpha = 0.28;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y - r * 0.22, r * 0.13, 0, Math.PI * 2);
        ctx.arc(x + r * 0.3, y - r * 0.22, r * 0.13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = Math.max(2, r * 0.1);
        ctx.beginPath();
        ctx.moveTo(x - r * 0.36, y + r * 0.28);
        ctx.lineTo(x + r * 0.36, y + r * 0.28);
        ctx.stroke();
      } else {
        // Stage 3: Monster face (dark void + glowing eyes + jagged teeth)
        ctx.fillStyle = '#09090b';
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(x - r * 0.32, y - r * 0.25, r * 0.16, 0, Math.PI * 2);
        ctx.arc(x + r * 0.32, y - r * 0.25, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x - r * 0.32, y - r * 0.25, r * 0.07, 0, Math.PI * 2);
        ctx.arc(x + r * 0.32, y - r * 0.25, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
        // Jagged monster grin
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - r * 0.52, y + r * 0.18);
        for (let t = -3; t <= 3; t++) {
          ctx.lineTo(x + (t * r * 0.16), y + (t % 2 === 0 ? r * 0.38 : r * 0.12));
        }
        ctx.stroke();
      }
      break;
    }
    case 'spider': {
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.45)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      // Spider eyes
      ctx.fillStyle = '#f43f5e';
      for (const ex of [-0.32, 0.32]) {
        ctx.beginPath();
        ctx.arc(x + ex * r, y - 0.15 * r, r * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const ex of [-0.16, 0.16]) {
        ctx.beginPath();
        ctx.arc(x + ex * r, y - 0.35 * r, r * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'shackles': {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(x - r, y - r * 0.45);
      ctx.lineTo(x + r, y + r * 0.45);
      ctx.moveTo(x - r, y + r * 0.45);
      ctx.lineTo(x + r, y - r * 0.45);
      ctx.stroke();
      ctx.strokeStyle = '#fb7185';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.48, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'vampire': {
      ctx.fillStyle = '#fecaca';
      // Twin fangs
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + sx * r * 0.42, y + r * 0.1);
        ctx.lineTo(x + sx * r * 0.25, y + r * 0.55);
        ctx.lineTo(x + sx * r * 0.12, y + r * 0.1);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x - r * 0.32, y - r * 0.24, r * 0.12, 0, Math.PI * 2);
      ctx.arc(x + r * 0.32, y - r * 0.24, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'conductor': {
      ctx.fillStyle = '#fb923c';
      ctx.fillRect(x - r, y + r * 0.22, r * 2, r * 0.25);
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(x, y - r * 0.25, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'orbital': {
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.85, r * 0.35, 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.85, r * 0.35, -0.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'laser': {
      ctx.strokeStyle = '#fdf4ff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.52, 0, Math.PI * 2);
      ctx.moveTo(x - r * 0.8, y);
      ctx.lineTo(x + r * 0.8, y);
      ctx.moveTo(x, y - r * 0.8);
      ctx.lineTo(x, y + r * 0.8);
      ctx.stroke();
      break;
    }
    case 'dice': {
      ctx.fillStyle = '#1e1b4b';
      const pip = r * 0.13;
      const off = r * 0.38;
      for (const [px, py] of [[-off, -off], [off, -off], [0, 0], [-off, off], [off, off]]) {
        ctx.beginPath();
        ctx.arc(x + px, y + py, pip, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'zone': {
      ctx.strokeStyle = 'rgba(254, 226, 226, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'chess': {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x - r, y - r, r, r);
      ctx.fillRect(x, y, r, r);
      ctx.fillStyle = '#f59e0b';
      drawPolygon(ctx, x, y, r * 0.35, 4, 0);
      ctx.fill();
      break;
    }
    case 'glass': {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.6, y - r * 0.5);
      ctx.lineTo(x + r * 0.1, y);
      ctx.lineTo(x + r * 0.7, y - r * 0.3);
      ctx.moveTo(x + r * 0.1, y);
      ctx.lineTo(x - r * 0.2, y + r * 0.75);
      ctx.stroke();
      break;
    }
    case 'beam': {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.66, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'harpoon': {
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, y + r * 0.5);
      ctx.lineTo(x + r * 0.45, y - r * 0.45);
      ctx.lineTo(x + r * 0.05, y - r * 0.45);
      ctx.moveTo(x + r * 0.45, y - r * 0.45);
      ctx.lineTo(x + r * 0.45, y - r * 0.05);
      ctx.stroke();
      break;
    }
    case 'hive': {
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.8;
      for (const [hx, hy] of [[0, 0], [-0.55, -0.35], [0.55, -0.35], [-0.55, 0.35], [0.55, 0.35]]) {
        drawPolygon(ctx, x + hx * r, y + hy * r, r * 0.32, 6, Math.PI / 6);
        ctx.stroke();
      }
      break;
    }
    case 'cannon': {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.48, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.24, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'fibonacci': {
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let t = 0; t < Math.PI * 3.5; t += 0.25) {
        const sr = (t / (Math.PI * 3.5)) * r * 0.78;
        const px = x + Math.cos(t) * sr;
        const py = y + Math.sin(t) * sr;
        if (t === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      break;
    }
    case 'icecone': {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(a) * r * 0.72, y - Math.sin(a) * r * 0.72);
        ctx.lineTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72);
        ctx.stroke();
      }
      break;
    }
    case 'blade': {
      ctx.fillStyle = '#e2e8f0';
      drawPolygon(ctx, x, y, r * 0.65, 4, time * 1.2);
      ctx.fill();
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'machinegun': {
      ctx.fillStyle = '#fef08a';
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, r * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'poisonspike': {
      ctx.fillStyle = '#d9f99d';
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, r * 0.17, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'cell': {
      ctx.fillStyle = 'rgba(167, 243, 208, 0.6)';
      ctx.beginPath();
      ctx.arc(x - r * 0.12, y - r * 0.1, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.arc(x - r * 0.12, y - r * 0.1, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'axe': {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.55, y + r * 0.55);
      ctx.lineTo(x + r * 0.55, y - r * 0.55);
      ctx.stroke();
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(x + r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'thief': {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(x - r, y - r * 0.32, r * 2, r * 0.42);
      ctx.fillStyle = '#818cf8';
      ctx.beginPath();
      ctx.arc(x - r * 0.32, y - r * 0.12, r * 0.12, 0, Math.PI * 2);
      ctx.arc(x + r * 0.32, y - r * 0.12, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'reforge': {
      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, y - r * 0.5);
      ctx.lineTo(x, y);
      ctx.lineTo(x + r * 0.55, y - r * 0.2);
      ctx.moveTo(x, y);
      ctx.lineTo(x - r * 0.2, y + r * 0.6);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

export function drawBallBody(ctx, ballOrDef, x, y, radius, opts = {}) {
  const def = ballOrDef.primaryColor ? ballOrDef : getBallDef(ballOrDef.ballId || ballOrDef.id);
  const id = def.id;
  const time = opts.time || 0;
  const owner = opts.owner || 0;

  ctx.save();

  // Verity transformation aura
  if (id === 'verity' && opts.stage && opts.stage > 1) {
    ctx.beginPath();
    ctx.arc(x, y, radius + (opts.stage === 3 ? 7 : 4), 0, Math.PI * 2);
    ctx.strokeStyle = opts.stage === 3 ? 'rgba(239, 68, 68, 0.9)' : 'rgba(251, 191, 36, 0.8)';
    ctx.lineWidth = opts.stage === 3 ? 4 : 3;
    ctx.stroke();
  }

  // Team ring (Blue vs Red) so mirror matches remain crystal clear
  if (owner === 1 || owner === 2) {
    ctx.beginPath();
    ctx.arc(x, y, radius + Math.max(3.5, radius * 0.08), 0, Math.PI * 2);
    ctx.strokeStyle = owner === 1 ? '#38bdf8' : '#f43f5e';
    ctx.lineWidth = Math.max(3, Math.round(radius * 0.08));
    ctx.stroke();
  }

  // Drop shadow
  ctx.beginPath();
  ctx.arc(x, y + 3, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.35)';
  ctx.fill();

  // Base gradient orb
  const grad = ctx.createRadialGradient(
    x - radius * 0.32,
    y - radius * 0.32,
    radius * 0.15,
    x,
    y,
    radius
  );
  grad.addColorStop(0, def.primaryColor);
  grad.addColorStop(1, def.secondaryColor);

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Custom procedural emblem inside circle
  drawBallPattern(ctx, id, x, y, radius, def, time, opts);

  // Glossy Roblox highlight
  ctx.beginPath();
  ctx.ellipse(
    x - radius * 0.28,
    y - radius * 0.34,
    radius * 0.36,
    radius * 0.18,
    -0.55,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.fill();

  // Hit flash
  if (opts.flashTimer > 0) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fill();
  }

  // Outer crisp border
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = opts.slowTimer > 0
    ? '#7dd3fc'
    : opts.poisonTimer > 0
    ? '#84cc16'
    : '#0f172a';
  ctx.stroke();

  // Stun chain overlay
  if (opts.stunTimer > 0) {
    ctx.strokeStyle = '#fb7185';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

export function renderBallPreview(canvas, ballDef) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const r = Math.min(w, h) * 0.38;
  drawBallBody(ctx, ballDef, w * 0.5, h * 0.5, r, { time: 0.4 });
}
