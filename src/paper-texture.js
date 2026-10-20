import * as THREE from 'three';

function wrap(context, text, x, y, width, lineHeight, maxLines = 5) {
  let line = '', lines = 0;
  for (const word of text.split(/\s+/)) {
    const trial = line ? line + ' ' + word : word;
    if (context.measureText(trial).width > width && line) {
      context.fillText(line, x, y);
      y += lineHeight;
      if (++lines >= maxLines) return y;
      line = word;
    } else line = trial;
  }
  if (line) { context.fillText(line, x, y); y += lineHeight; }
  return y;
}

export function paperTexture(document, index, renderer) {
  const canvas = documentElement();
  const ctx = canvas.getContext('2d');
  const paper = '#f6eddd';
  const ink = '#493227';
  const quiet = '#766352';
  const accent = ['#aa573e', '#52686b', '#827044'][index % 3];
  ctx.fillStyle = paper; ctx.fillRect(0, 0, 640, 810);
  ctx.fillStyle = accent; ctx.fillRect(0, 0, 16, 810);
  ctx.fillStyle = quiet; ctx.font = '17px sans-serif';
  ctx.fillText('ENRIQUE HERREROS', 50, 62);
  ctx.textAlign = 'right'; ctx.fillText('No. ' + String(index + 1).padStart(2, '0'), 588, 62);
  ctx.textAlign = 'left';
  ctx.strokeStyle = '#cbbba7'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(50, 88); ctx.lineTo(590, 88); ctx.stroke();
  ctx.fillStyle = ink; ctx.font = '52px Georgia, serif';
  const end = wrap(ctx, document.title, 48, 174, 544, 60, 3);
  ctx.fillStyle = quiet; ctx.font = '23px sans-serif';
  wrap(ctx, document.description, 50, Math.max(end + 20, 282), 520, 34, 4);
  // An open-book motif, printed like an illustration on a report cover.
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.moveTo(135, 623); ctx.lineTo(135, 466);
  ctx.bezierCurveTo(196, 443, 266, 470, 320, 507);
  ctx.lineTo(320, 669); ctx.bezierCurveTo(254, 627, 193, 603, 135, 623); ctx.fill();
  ctx.globalAlpha = 0.65;
  ctx.beginPath(); ctx.moveTo(320, 669); ctx.lineTo(320, 507);
  ctx.bezierCurveTo(374, 470, 444, 443, 505, 466);
  ctx.lineTo(505, 623); ctx.bezierCurveTo(447, 603, 386, 627, 320, 669); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = paper; ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath(); ctx.moveTo(159, 488 + i * 24);
    ctx.quadraticCurveTo(222, 485 + i * 24, 293, 531 + i * 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(347, 531 + i * 24);
    ctx.quadraticCurveTo(418, 485 + i * 24, 481, 488 + i * 24); ctx.stroke();
  }
  ctx.strokeStyle = '#cbbba7'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(50, 718); ctx.lineTo(590, 718); ctx.stroke();
  ctx.fillStyle = quiet; ctx.font = '18px sans-serif';
  ctx.fillText(document.category, 50, 758);
  ctx.textAlign = 'right'; ctx.fillText(document.language || 'Document', 590, 758);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function documentElement() {
  const canvas = document.createElement('canvas');
  canvas.width = 640; canvas.height = 810;
  return canvas;
}

export function tableTexture(dark) {
  const canvas = document.createElement('canvas');
  canvas.width = 1536; canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = dark ? '#5b4030' : '#c7a47c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Fine, irregular lines suggest wood grain without a distracting grid.
  for (let y = 0; y < canvas.height; y += 3) {
    const wave = Math.sin(y * 13.7);
    ctx.strokeStyle = dark ? 'rgba(27, 15, 8, 0.12)' : 'rgba(104, 65, 33, 0.10)';
    ctx.lineWidth = 0.5 + (wave + 1) * 0.4;
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= canvas.width; x += 32) {
      ctx.lineTo(x, y + Math.sin(x * 0.006 + y * 0.02) * (2 + wave));
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
