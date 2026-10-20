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
  const cover = document.kind === 'Full artifact';
  const paper = cover ? '#203c32' : '#f0eee1';
  const ink = cover ? '#eef2db' : '#243b32';
  const quiet = cover ? '#aec5a8' : '#73806e';
  const accent = cover ? '#c5e79d' : '#4d7358';
  ctx.fillStyle = paper; ctx.fillRect(0, 0, 640, 810);
  ctx.strokeStyle = cover ? '#46614b' : '#d3d6c5'; ctx.lineWidth = 1;
  for (let y = 25; y < 810; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke(); }
  ctx.fillStyle = paper; ctx.fillRect(39, 38, 562, 685);
  ctx.fillStyle = quiet; ctx.font = '17px monospace';
  ctx.fillText('ENRIQUE HERREROS / ARTIFACTS', 48, 58);
  ctx.fillStyle = accent; ctx.font = '18px monospace';
  ctx.fillText(String(index + 1).padStart(2, '0') + '  /  ' + (cover ? 'FULL REPORT' : 'READING NOTES'), 48, 116);
  ctx.strokeStyle = accent; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(48, 137); ctx.lineTo(592, 137); ctx.stroke();
  ctx.fillStyle = ink; ctx.font = 'bold 47px monospace';
  const end = wrap(ctx, document.title, 48, 211, 544, 59, 4);
  ctx.fillStyle = quiet; ctx.font = '22px monospace';
  wrap(ctx, document.description, 48, Math.max(end + 25, 355), 520, 33, 4);
  // Small printed geometry keeps the documents recognizable from a distance.
  ctx.strokeStyle = accent; ctx.lineWidth = 3;
  const y = 581;
  if (index % 3 === 0) {
    for (let i = 0; i < 3; i++) { ctx.strokeRect(53 + i * 23, y - i * 13, 111, 81); }
    ctx.fillStyle = accent; ctx.font = '52px monospace'; ctx.fillText('~/', 229, y + 44);
  } else if (index % 3 === 1) {
    [0, 1, 2].forEach(i => { ctx.strokeRect(52 + i * 159, y, 105, 67); if (i < 2) { ctx.beginPath(); ctx.moveTo(157 + i * 159, y + 34); ctx.lineTo(211 + i * 159, y + 34); ctx.stroke(); } });
  } else {
    for (let i = 0; i < 4; i++) { ctx.strokeRect(53 + (i % 2) * 90, y + Math.floor(i / 2) * 43, 65, 27); }
    ctx.font = '70px monospace'; ctx.fillStyle = accent; ctx.fillText('{ }', 280, y + 61);
  }
  ctx.strokeStyle = quiet; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(48, 718); ctx.lineTo(592, 718); ctx.stroke();
  ctx.fillStyle = quiet; ctx.font = '17px monospace';
  ctx.fillText((document.language || 'Document') + ' / ' + document.category, 48, 750);
  ctx.fillStyle = accent; ctx.fillText('OPEN ↗', 510, 750);
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
  ctx.fillStyle = dark ? '#1a2c29' : '#c5cebc'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = dark ? '#29433b' : '#acbba4'; ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 42) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 0; y < canvas.height; y += 42) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  ctx.strokeStyle = dark ? '#3c5947' : '#8fa183'; ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, 1480, 968);
  ctx.fillStyle = dark ? '#83a789' : '#5c745c'; ctx.font = '22px monospace';
  ctx.fillText('+', 63, 960);
  ctx.textAlign = 'right'; ctx.fillText('+', 1470, 960);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
