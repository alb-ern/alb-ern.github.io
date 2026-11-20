/**
 * Procedural & PNG emblem art for the 20 Meme & Pop-Culture Balls (#101 - #120).
 */

const hypergamyPng = typeof Image !== 'undefined' ? new Image() : null;
if (hypergamyPng) {
  hypergamyPng.src = './assets/hypergamy.png';
}

/**
 * Draws the 10-Women (left) -> Top-3-Men (right) Hypergamy Chart using ./assets/hypergamy.png
 * with an instant vector fallback of the same bipartite graph before the image finishes loading.
 */
export function drawHypergamyChart(ctx, x, y, size) {
  const half = size * 0.5;
  if (hypergamyPng && hypergamyPng.complete && hypergamyPng.naturalWidth > 0) {
    ctx.drawImage(hypergamyPng, x - half, y - half, size, size);
    return;
  }

  // Vector fallback: 10 pink women on left column -> all 10 connected to top 3 men on right column
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = Math.max(1.5, size * 0.045);
  ctx.beginPath();
  ctx.roundRect(x - half * 0.86, y - half * 0.86, size * 0.86, size * 0.86, size * 0.14);
  ctx.fill();
  ctx.stroke();

  const lx = x - half * 0.52;
  const rx = x + half * 0.52;
  const topY = y - half * 0.64;
  const stepY = (size * 0.64) / 9;
  const targets = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2];

  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = Math.max(1, size * 0.025);
  for (let i = 0; i < 10; i++) {
    const wy = topY + i * stepY;
    const my = topY + targets[i] * stepY;
    ctx.beginPath();
    ctx.moveTo(lx, wy);
    ctx.lineTo(rx, my);
    ctx.stroke();
  }

  for (let i = 0; i < 10; i++) {
    const wy = topY + i * stepY;
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(lx, wy, Math.max(1.6, size * 0.036), 0, Math.PI * 2);
    ctx.fill();

    const my = topY + i * stepY;
    ctx.fillStyle = i < 3 ? '#38bdf8' : '#475569';
    ctx.beginPath();
    ctx.arc(rx, my, Math.max(1.6, size * (i < 3 ? 0.044 : 0.032)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFourPointStar(ctx, cx, cy, outerR, innerR) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 - Math.PI / 2;
    const nextA = a + Math.PI / 2;
    const midA = a + Math.PI / 4;
    const px = cx + Math.cos(a) * outerR;
    const py = cy + Math.sin(a) * outerR;
    const mx = cx + Math.cos(midA) * innerR;
    const my = cy + Math.sin(midA) * innerR;
    const nx = cx + Math.cos(nextA) * outerR;
    const ny = cy + Math.sin(nextA) * outerR;
    if (i === 0) ctx.moveTo(px, py);
    ctx.quadraticCurveTo(mx, my, nx, ny);
  }
  ctx.closePath();
}

export function drawMemeBallPattern(ctx, def, x, y, r) {
  switch (def.id) {
    case 'hydrogenbomb': {
      ctx.fillStyle = '#0f172a';
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, r * 0.62, a - 0.42, a + 0.42);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.11, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'coughingbaby': {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x - r * 0.24, y - r * 0.14, r * 0.11, 0, Math.PI * 2);
      ctx.arc(x + r * 0.24, y - r * 0.14, r * 0.11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(x - r * 0.28, y + r * 0.04, r * 0.07, 0, Math.PI * 2);
      ctx.arc(x + r * 0.28, y + r * 0.04, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(x, y + r * 0.22, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#bef264';
      ctx.beginPath();
      ctx.arc(x + r * 0.32, y + r * 0.26, r * 0.14, 0, Math.PI * 2);
      ctx.arc(x + r * 0.48, y + r * 0.16, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'pinata': {
      const cols = ['#ec4899', '#facc15', '#38bdf8', '#4ade80'];
      ctx.lineWidth = Math.max(3, r * 0.14);
      for (let i = 0; i < 4; i++) {
        const yy = y - r * 0.45 + i * r * 0.3;
        ctx.strokeStyle = cols[i];
        ctx.beginPath();
        ctx.moveTo(x - r * 0.65, yy);
        ctx.lineTo(x - r * 0.25, yy - r * 0.1);
        ctx.lineTo(x + r * 0.25, yy + r * 0.1);
        ctx.lineTo(x + r * 0.65, yy);
        ctx.stroke();
      }
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'claude': {
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = Math.max(2.5, r * 0.11);
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const len = i % 2 === 0 ? r * 0.56 : r * 0.38;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r * 0.12, y + Math.sin(a) * r * 0.12);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
      }
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'hypergamy': {
      // 10 Women (left) -> Top 3 Men (right) Hypergamy Chart PNG
      drawHypergamyChart(ctx, x, y, r * 1.24);
      break;
    }

    case 'israel': {
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = Math.max(2.2, r * 0.08);
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
        const px = x + Math.cos(a) * r * 0.46;
        const py = y + Math.sin(a) * r * 0.46;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = Math.PI / 2 + (i * Math.PI * 2) / 3;
        const px = x + Math.cos(a) * r * 0.46;
        const py = y + Math.sin(a) * r * 0.46;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(x - r * 0.62, y - r * 0.62, r * 1.24, r * 0.11);
      ctx.fillRect(x - r * 0.62, y + r * 0.51, r * 1.24, r * 0.11);
      break;
    }

    case 'nokia': {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(x - r * 0.34, y - r * 0.54, r * 0.68, r * 1.08);
      ctx.fillStyle = '#84cc16';
      ctx.fillRect(x - r * 0.25, y - r * 0.42, r * 0.5, r * 0.36);
      ctx.fillStyle = '#0f172a';
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          ctx.fillRect(
            x - r * 0.22 + col * r * 0.17,
            y + r * 0.06 + row * r * 0.14,
            r * 0.11,
            r * 0.08
          );
        }
      }
      break;
    }

    case 'lagswitch': {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = Math.max(2.2, r * 0.08);
      for (const rr of [0.24, 0.44, 0.62]) {
        ctx.beginPath();
        ctx.arc(x, y + r * 0.12, r * rr, -Math.PI * 0.78, -Math.PI * 0.22);
        ctx.stroke();
      }
      ctx.fillStyle = '#4ade80';
      ctx.font = `900 ${Math.max(9, Math.round(r * 0.32))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('999ms', x, y + r * 0.34);
      break;
    }

    case 'impostor': {
      ctx.fillStyle = '#7dd3fc';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.beginPath();
      ctx.roundRect(x - r * 0.22, y - r * 0.28, r * 0.66, r * 0.4, r * 0.18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x + r * 0.16, y - r * 0.16, r * 0.14, r * 0.07, -0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'banana': {
      ctx.strokeStyle = '#fef9c3';
      ctx.lineWidth = Math.max(4, r * 0.2);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x + r * 0.08, y - r * 0.06, r * 0.46, Math.PI * 0.22, Math.PI * 0.92);
      ctx.stroke();
      ctx.fillStyle = '#713f12';
      ctx.beginPath();
      ctx.arc(x - r * 0.34, y + r * 0.08, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'chatgpt': {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2.2, r * 0.085);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.arc(
          x + Math.cos(a) * r * 0.22,
          y + Math.sin(a) * r * 0.22,
          r * 0.26,
          a - 0.5,
          a + Math.PI * 0.85
        );
        ctx.stroke();
      }
      break;
    }

    case 'dondurma': {
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.moveTo(x, y + r * 0.52);
      ctx.lineTo(x - r * 0.26, y + r * 0.02);
      ctx.lineTo(x + r * 0.26, y + r * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.arc(x, y - r * 0.12, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(x, y - r * 0.34, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'kebab': {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = Math.max(2.5, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.65);
      ctx.lineTo(x, y + r * 0.65);
      ctx.stroke();
      const widths = [0.46, 0.54, 0.42, 0.3];
      for (let i = 0; i < 4; i++) {
        const yy = y - r * 0.34 + i * r * 0.22;
        ctx.fillStyle = i % 2 === 0 ? '#f97316' : '#fde047';
        ctx.beginPath();
        ctx.roundRect(x - r * widths[i], yy - r * 0.08, r * widths[i] * 2, r * 0.15, 6);
        ctx.fill();
      }
      break;
    }

    case 'discordmod': {
      ctx.strokeStyle = '#e0e7ff';
      ctx.lineWidth = Math.max(2.5, r * 0.1);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.62, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.max(11, Math.round(r * 0.56))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('@', x, y + 2);
      break;
    }

    case 'sigma': {
      ctx.fillStyle = '#f8fafc';
      ctx.font = `900 ${Math.max(11, Math.round(r * 0.64))}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Σ', x, y + 2);
      break;
    }

    case 'skibidi': {
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = Math.max(2.4, r * 0.09);
      ctx.beginPath();
      for (let i = 0; i <= 26; i++) {
        const t = i / 26;
        const a = t * Math.PI * 4.5;
        const rr = t * r * 0.58;
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      break;
    }

    case 'rizz': {
      ctx.fillStyle = '#fdf2f8';
      ctx.beginPath();
      ctx.moveTo(x, y + r * 0.42);
      ctx.bezierCurveTo(x - r * 0.58, y + r * 0.05, x - r * 0.52, y - r * 0.46, x, y - r * 0.14);
      ctx.bezierCurveTo(x + r * 0.52, y - r * 0.46, x + r * 0.58, y + r * 0.05, x, y + r * 0.42);
      ctx.fill();
      break;
    }

    case 'aura': {
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = Math.max(2.2, r * 0.08);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const rad = i % 2 === 0 ? r * 0.62 : r * 0.34;
        const px = x + Math.cos(a) * rad;
        const py = y + Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.max(9, Math.round(r * 0.34))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('AURA', x, y + 1);
      break;
    }

    case 'gemini': {
      // Iconic Google Gemini 4-point curved sparkle star + companion twin star
      ctx.fillStyle = '#ffffff';
      drawFourPointStar(ctx, x - r * 0.06, y + r * 0.04, r * 0.58, r * 0.13);
      ctx.fill();
      ctx.fillStyle = '#fbcfe8';
      drawFourPointStar(ctx, x + r * 0.34, y - r * 0.34, r * 0.24, r * 0.06);
      ctx.fill();
      break;
    }

    case 'brainrot': {
      ctx.fillStyle = '#22d3ee';
      ctx.font = `900 ${Math.max(11, Math.round(r * 0.52))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('67', x + 2, y + 2);
      ctx.fillStyle = '#fef08a';
      ctx.fillText('67', x, y);
      break;
    }

    default:
      break;
  }
}
