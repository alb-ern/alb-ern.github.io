/**
 * Procedural emblem art for the 20 Meme & Pop-Culture Balls (#101 - #120).
 */

export function drawMemeBallPattern(ctx, def, x, y, r, opts = {}) {
  switch (def.id) {
    case 'hydrogenbomb': {
      // Classic yellow/black radioactive trefoil hazard emblem
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
      // Wide watery baby eyes + green cough cloud + pacifier ring
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x - r * 0.24, y - r * 0.14, r * 0.11, 0, Math.PI * 2);
      ctx.arc(x + r * 0.24, y - r * 0.14, r * 0.11, 0, Math.PI * 2);
      ctx.fill();
      // Tears
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(x - r * 0.28, y + r * 0.04, r * 0.07, 0, Math.PI * 2);
      ctx.arc(x + r * 0.28, y + r * 0.04, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
      // Open coughing mouth + green puffs
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
      // Colorful zig-zag fiesta stripes + golden star center
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
      // Warm cream starburst AI sparkle
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
      // Golden crown + pink upward tier arrow
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.42, y + r * 0.08);
      ctx.lineTo(x - r * 0.36, y - r * 0.34);
      ctx.lineTo(x - r * 0.12, y - r * 0.12);
      ctx.lineTo(x, y - r * 0.44);
      ctx.lineTo(x + r * 0.12, y - r * 0.12);
      ctx.lineTo(x + r * 0.36, y - r * 0.34);
      ctx.lineTo(x + r * 0.42, y + r * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fdf2f8';
      ctx.lineWidth = Math.max(2.5, r * 0.09);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.25, y + r * 0.42);
      ctx.lineTo(x + r * 0.25, y + r * 0.16);
      ctx.stroke();
      break;
    }

    case 'irondome': {
      // Crisp blue/white radar dome + hexagram star radar reticle
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = Math.max(2.2, r * 0.08);
      // Upward triangle
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
        const px = x + Math.cos(a) * r * 0.52;
        const py = y + Math.sin(a) * r * 0.52;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      // Downward triangle
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = Math.PI / 2 + (i * Math.PI * 2) / 3;
        const px = x + Math.cos(a) * r * 0.52;
        const py = y + Math.sin(a) * r * 0.52;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      // Top & bottom radar bars
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(x - r * 0.6, y - r * 0.62, r * 1.2, r * 0.1);
      ctx.fillRect(x - r * 0.6, y + r * 0.52, r * 1.2, r * 0.1);
      break;
    }

    case 'nokia': {
      // Classic Nokia 3310 monochrome green LCD + keypad dots
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
      // Red Wi-Fi signal arcs + "999" ping badge
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
      // Iconic glossy cyan Crewmate/Impostor visor + sneaky brow
      ctx.fillStyle = '#7dd3fc';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.beginPath();
      ctx.roundRect(x - r * 0.22, y - r * 0.28, r * 0.66, r * 0.4, r * 0.18);
      ctx.fill();
      ctx.stroke();
      // Visor shine
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x + r * 0.16, y - r * 0.16, r * 0.14, r * 0.07, -0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'banana': {
      // Curved cartoon yellow banana crescent
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

    case 'rickroll': {
      // Musical eighth note beamed symbol
      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = Math.max(2.5, r * 0.1);
      ctx.beginPath();
      ctx.arc(x - r * 0.22, y + r * 0.24, r * 0.14, 0, Math.PI * 2);
      ctx.arc(x + r * 0.22, y + r * 0.14, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - r * 0.1, y + r * 0.24);
      ctx.lineTo(x - r * 0.1, y - r * 0.34);
      ctx.lineTo(x + r * 0.34, y - r * 0.44);
      ctx.lineTo(x + r * 0.34, y + r * 0.14);
      ctx.stroke();
      break;
    }

    case 'stonks': {
      // Rising zigzag stock chart arrow
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = Math.max(2.8, r * 0.11);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.52, y + r * 0.36);
      ctx.lineTo(x - r * 0.18, y + r * 0.06);
      ctx.lineTo(x + r * 0.06, y + r * 0.22);
      ctx.lineTo(x + r * 0.48, y - r * 0.38);
      ctx.stroke();
      // Arrow head
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.moveTo(x + r * 0.54, y - r * 0.44);
      ctx.lineTo(x + r * 0.22, y - r * 0.38);
      ctx.lineTo(x + r * 0.48, y - r * 0.12);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'karen': {
      // Iconic blonde bob swoop + angry eyes + megaphone exclamation
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x, y - r * 0.16, r * 0.55, Math.PI, Math.PI * 2);
      ctx.lineTo(x + r * 0.45, y + r * 0.12);
      ctx.lineTo(x - r * 0.45, y + r * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.font = `900 ${Math.max(10, Math.round(r * 0.46))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?!', x, y + r * 0.24);
      break;
    }

    case 'discordmod': {
      // Blurple headset band + white @ symbol
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
      // Crisp white Greek Sigma Σ + cool dark shades bar
      ctx.fillStyle = '#f8fafc';
      ctx.font = `900 ${Math.max(11, Math.round(r * 0.64))}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Σ', x, y + 2);
      break;
    }

    case 'skibidi': {
      // Swirling blue toilet flush spiral
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
      // Glowing heart-shaped shades / heart emblem
      ctx.fillStyle = '#fdf2f8';
      ctx.beginPath();
      ctx.moveTo(x, y + r * 0.42);
      ctx.bezierCurveTo(x - r * 0.58, y + r * 0.05, x - r * 0.52, y - r * 0.46, x, y - r * 0.14);
      ctx.bezierCurveTo(x + r * 0.52, y - r * 0.46, x + r * 0.58, y + r * 0.05, x, y + r * 0.42);
      ctx.fill();
      break;
    }

    case 'floridaman': {
      // Gator eyes + jagged teeth grin
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x - r * 0.24, y - r * 0.22, r * 0.13, 0, Math.PI * 2);
      ctx.arc(x + r * 0.24, y - r * 0.22, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x - r * 0.26, y - r * 0.3, r * 0.05, r * 0.16);
      ctx.fillRect(x + r * 0.22, y - r * 0.3, r * 0.05, r * 0.16);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.46, y + r * 0.2);
      for (let i = 0; i < 6; i++) {
        ctx.lineTo(x - r * 0.38 + i * r * 0.15, y + (i % 2 === 0 ? r * 0.34 : r * 0.14));
      }
      ctx.stroke();
      break;
    }

    case 'taxman': {
      // Golden IRS dollar crest
      ctx.fillStyle = '#fbbf24';
      ctx.font = `900 ${Math.max(11, Math.round(r * 0.58))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$$', x, y + 2);
      break;
    }

    case 'brainrot': {
      // Chaotic neon "67" + glitch eyes
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
