export function drawExtraBallPattern(ctx, def, x, y, r, opts) {
  switch (def.id) {
    case 'duplicator': {
      ctx.strokeStyle = '#ccfbf1';
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.beginPath();
      ctx.arc(x - r * 0.25, y, r * 0.26, 0, Math.PI * 2);
      ctx.arc(x + r * 0.25, y, r * 0.26, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'doubler': {
      ctx.fillStyle = '#fef08a';
      ctx.font = `900 ${Math.max(10, Math.round(r * 0.44))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('2x', x, y + 1);
      break;
    }
    case 'mach': {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = Math.max(2, r * 0.09);
      for (const ox of [-r * 0.24, r * 0.14]) {
        ctx.beginPath();
        ctx.moveTo(x + ox - r * 0.16, y - r * 0.26);
        ctx.lineTo(x + ox + r * 0.18, y);
        ctx.lineTo(x + ox - r * 0.16, y + r * 0.26);
        ctx.stroke();
      }
      break;
    }
    case 'titan': {
      ctx.strokeStyle = '#fed7aa';
      ctx.lineWidth = Math.max(2.5, r * 0.1);
      ctx.strokeRect(x - r * 0.36, y - r * 0.36, r * 0.72, r * 0.72);
      break;
    }
    case 'hydra': {
      ctx.fillStyle = '#a7f3d0';
      for (const off of [-0.42, 0, 0.42]) {
        ctx.beginPath();
        ctx.arc(x + off * r, y - r * 0.18, r * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'micro': {
      ctx.strokeStyle = '#ede9fe';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.22, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'gravity': {
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.74, r * 0.24, -0.45, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'repulsor': {
      ctx.strokeStyle = '#cffafe';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2);
        ctx.lineTo(x + Math.cos(a) * r * 0.68, y + Math.sin(a) * r * 0.68);
        ctx.stroke();
      }
      break;
    }
    case 'portal': {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = Math.max(2.5, r * 0.12);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.48, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();
      ctx.strokeStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.48, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
      break;
    }
    case 'chronos': {
      ctx.strokeStyle = '#fef9c3';
      ctx.lineWidth = Math.max(2, r * 0.08);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.52, 0, Math.PI * 2);
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - r * 0.36);
      ctx.moveTo(x, y);
      ctx.lineTo(x + r * 0.28, y + r * 0.1);
      ctx.stroke();
      break;
    }
    case 'shield': {
      ctx.strokeStyle = '#dbeafe';
      ctx.lineWidth = Math.max(2.5, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.34, y - r * 0.32);
      ctx.lineTo(x + r * 0.34, y - r * 0.32);
      ctx.lineTo(x, y + r * 0.46);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'mirror': {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, r * 0.09);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.35, y - r * 0.1);
      ctx.lineTo(x + r * 0.1, y - r * 0.45);
      ctx.moveTo(x - r * 0.15, y + r * 0.35);
      ctx.lineTo(x + r * 0.38, y - r * 0.08);
      ctx.stroke();
      break;
    }
    case 'boomerang': {
      ctx.strokeStyle = '#ffedd5';
      ctx.lineWidth = Math.max(3, r * 0.14);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.35, y + r * 0.25);
      ctx.lineTo(x + r * 0.15, y - r * 0.28);
      ctx.lineTo(x + r * 0.4, y + r * 0.18);
      ctx.stroke();
      break;
    }
    case 'chainsaw': {
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.4;
      ctx.strokeRect(x - r * 0.35, y - r * 0.2, r * 0.7, r * 0.4);
      break;
    }
    case 'sniper': {
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
      ctx.moveTo(x - r * 0.65, y);
      ctx.lineTo(x + r * 0.65, y);
      ctx.moveTo(x, y - r * 0.65);
      ctx.lineTo(x, y + r * 0.65);
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'shotgun': {
      ctx.fillStyle = '#fde047';
      for (const [ox, oy] of [[-0.22, -0.18], [0, -0.25], [0.22, -0.18], [-0.14, 0.18], [0.14, 0.18]]) {
        ctx.beginPath();
        ctx.arc(x + ox * r, y + oy * r, r * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'hammer': {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(x - r * 0.42, y - r * 0.34, r * 0.84, r * 0.3);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - r * 0.1, y - r * 0.04, r * 0.2, r * 0.56);
      break;
    }
    case 'anchor': {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = Math.max(2.5, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.42);
      ctx.lineTo(x, y + r * 0.4);
      ctx.moveTo(x - r * 0.28, y - r * 0.18);
      ctx.lineTo(x + r * 0.28, y - r * 0.18);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y + r * 0.12, r * 0.36, 0.25, Math.PI - 0.25);
      ctx.stroke();
      break;
    }
    case 'ricochet': {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    }
    case 'tornado': {
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 2.4;
      for (const [oy, rx] of [[-0.28, 0.48], [0, 0.32], [0.28, 0.18]]) {
        ctx.beginPath();
        ctx.ellipse(x, y + oy * r, rx * r, r * 0.1, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'ninja': {
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(x - r * 0.62, y - r * 0.16, r * 1.24, r * 0.28);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x - r * 0.22, y - r * 0.02, r * 0.1, 0, Math.PI * 2);
      ctx.arc(x + r * 0.22, y - r * 0.02, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'vortex': {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.5, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.5, 0, Math.PI);
      ctx.fill();
      break;
    }
    case 'magma':
    case 'meteor': {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.45, y - r * 0.1);
      ctx.lineTo(x, y - r * 0.5);
      ctx.lineTo(x + r * 0.45, y - r * 0.1);
      ctx.lineTo(x + r * 0.2, y + r * 0.4);
      ctx.lineTo(x - r * 0.25, y + r * 0.36);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'frost': {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(a) * r * 0.5, y - Math.sin(a) * r * 0.5);
        ctx.lineTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5);
        ctx.stroke();
      }
      break;
    }
    case 'quake': {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, y - r * 0.2);
      ctx.lineTo(x - r * 0.1, y + r * 0.25);
      ctx.lineTo(x + r * 0.2, y - r * 0.2);
      ctx.lineTo(x + r * 0.5, y + r * 0.25);
      ctx.stroke();
      break;
    }
    case 'tsunami': {
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = Math.max(2.5, r * 0.1);
      ctx.beginPath();
      ctx.arc(x, y + r * 0.12, r * 0.45, Math.PI, 0);
      ctx.stroke();
      break;
    }
    case 'solar': {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.38, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'eclipse': {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x - r * 0.08, y, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = def.primaryColor;
      ctx.beginPath();
      ctx.arc(x + r * 0.12, y - r * 0.04, r * 0.36, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'cloud': {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(x - r * 0.22, y + r * 0.05, r * 0.24, 0, Math.PI * 2);
      ctx.arc(x + r * 0.22, y + r * 0.05, r * 0.22, 0, Math.PI * 2);
      ctx.arc(x, y - r * 0.1, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'crystal': {
      ctx.fillStyle = '#f0abfc';
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.58);
      ctx.lineTo(x + r * 0.38, y);
      ctx.lineTo(x, y + r * 0.58);
      ctx.lineTo(x - r * 0.38, y);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'sandstorm': {
      ctx.strokeStyle = '#fde68a';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case 'plasma': {
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'berserker': {
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.42, y - r * 0.32);
      ctx.lineTo(x - r * 0.12, y - r * 0.12);
      ctx.moveTo(x + r * 0.42, y - r * 0.32);
      ctx.lineTo(x + r * 0.12, y - r * 0.12);
      ctx.stroke();
      break;
    }
    case 'phoenix': {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.52);
      ctx.lineTo(x + r * 0.45, y + r * 0.25);
      ctx.lineTo(x, y + r * 0.05);
      ctx.lineTo(x - r * 0.45, y + r * 0.25);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'gambler': {
      ctx.fillStyle = '#fef08a';
      ctx.font = `900 ${Math.max(9, Math.round(r * 0.36))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('777', x, y + 1);
      break;
    }
    case 'hacker': {
      ctx.fillStyle = '#4ade80';
      ctx.font = `900 ${Math.max(9, Math.round(r * 0.34))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('01', x, y + 1);
      break;
    }
    case 'banker': {
      ctx.fillStyle = '#fef08a';
      ctx.font = `900 ${Math.max(10, Math.round(r * 0.46))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', x, y + 1);
      break;
    }
    case 'necromancer': {
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(x, y - r * 0.06, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#312e81';
      ctx.beginPath();
      ctx.arc(x - r * 0.12, y - r * 0.08, r * 0.08, 0, Math.PI * 2);
      ctx.arc(x + r * 0.12, y - r * 0.08, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'mimicchest': {
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(x - r * 0.42, y - r * 0.26, r * 0.84, r * 0.52);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(x - r * 0.42, y - 2, r * 0.84, 5);
      break;
    }
    case 'leech': {
      ctx.fillStyle = '#fda4af';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4c0519';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'thorn': {
      ctx.fillStyle = '#f8fafc';
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r * 0.56, y + Math.sin(a) * r * 0.56, r * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'alchemist': {
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.45);
      ctx.lineTo(x + r * 0.4, y + r * 0.35);
      ctx.lineTo(x - r * 0.4, y + r * 0.35);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'ghost': {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(x - r * 0.2, y - r * 0.12, r * 0.12, 0, Math.PI * 2);
      ctx.arc(x + r * 0.2, y - r * 0.12, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'rocket': {
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.55);
      ctx.lineTo(x + r * 0.28, y + r * 0.3);
      ctx.lineTo(x - r * 0.28, y + r * 0.3);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'drill': {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.32, y - r * 0.25);
      ctx.lineTo(x + r * 0.42, y);
      ctx.lineTo(x - r * 0.32, y + r * 0.25);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'ufo': {
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(x, y - r * 0.12, r * 0.28, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.06, r * 0.56, r * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'drum': {
      ctx.strokeStyle = '#fbcfe8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.56, 0, Math.PI * 2);
      ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'pacman': {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, r * 0.92, -0.42, 0.42);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'turret': {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x - r * 0.28, y - r * 0.28, r * 0.56, r * 0.56);
      break;
    }
    case 'knight': {
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.35, y - r * 0.32);
      ctx.lineTo(x + r * 0.35, y - r * 0.32);
      ctx.lineTo(x + r * 0.35, y + r * 0.15);
      ctx.lineTo(x, y + r * 0.45);
      ctx.lineTo(x - r * 0.35, y + r * 0.15);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'omega': {
      ctx.fillStyle = '#fef08a';
      ctx.font = `900 ${Math.max(11, Math.round(r * 0.56))}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Ω', x, y + 1);
      break;
    }
    default:
      break;
  }
}
