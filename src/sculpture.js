// A directory of the actual artifacts, rendered by Three.js and printed as ASCII.
import * as THREE from 'three';

const stage = document.querySelector('#ascii-stage');
const canvas = document.querySelector('#ascii');
const fallback = document.querySelector('#ascii-fallback');
const button = document.querySelector('#motion');
const list = document.querySelector('#sites');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const systemTheme = matchMedia('(prefers-color-scheme: dark)');

try {
  start();
} catch {
  canvas.hidden = true;
  fallback.hidden = false;
  button.hidden = true;
}

function start() {
  const context = canvas.getContext('2d');
  if (!context) return;
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3, 3, 2.5, -2.5, 0.1, 30);
  camera.position.set(3.7, 2.1, 7.2);
  camera.lookAt(0, 0.35, 0);
  const archive = new THREE.Group();
  scene.add(archive);

  const folderMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x999999 });
  const paperMaterial = new THREE.MeshLambertMaterial({ color: 0xe8e8e8, side: THREE.DoubleSide });
  const textMaterial = new THREE.MeshBasicMaterial({ color: 0x080808 });
  const foldMaterial = new THREE.MeshLambertMaterial({ color: 0x666666, side: THREE.DoubleSide });

  function outline(mesh) {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), edgeMaterial);
    mesh.add(edges);
    return mesh;
  }

  // The tab and hinged front make this recognizably a file folder from either side.
  const backShape = new THREE.Shape();
  backShape.moveTo(-1.85, -1.2);
  backShape.lineTo(1.85, -1.2);
  backShape.lineTo(1.85, 1.05);
  backShape.lineTo(-0.15, 1.05);
  backShape.lineTo(-0.42, 1.37);
  backShape.lineTo(-1.6, 1.37);
  backShape.lineTo(-1.85, 1.1);
  backShape.closePath();
  const back = outline(new THREE.Mesh(new THREE.ExtrudeGeometry(backShape, {
    depth: 0.07, bevelEnabled: false,
  }), folderMaterial));
  back.position.z = -0.48;
  archive.add(back);
  const base = outline(new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.07, 0.88), folderMaterial));
  base.position.set(0, -1.2, -0.04);
  archive.add(base);

  const hinge = new THREE.Group();
  hinge.position.set(0, -1.2, 0.4);
  const front = outline(new THREE.Mesh(new THREE.BoxGeometry(3.7, 1.98, 0.07), folderMaterial));
  front.position.y = 0.99;
  hinge.add(front);
  archive.add(hinge);

  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 256;
  labelCanvas.height = 128;
  const labelContext = labelCanvas.getContext('2d');
  labelContext.fillStyle = '#ffffff';
  labelContext.font = 'bold 92px monospace';
  labelContext.textAlign = 'center';
  labelContext.textBaseline = 'middle';
  labelContext.fillText('~/', 128, 64);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.675), new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(labelCanvas), transparent: true,
  }));
  label.position.set(0, 0.98, 0.041);
  hinge.add(label);

  const paperShape = new THREE.Shape();
  paperShape.moveTo(-1.37, -1.4);
  paperShape.lineTo(1.37, -1.4);
  paperShape.lineTo(1.37, 1.05);
  paperShape.lineTo(1.02, 1.4);
  paperShape.lineTo(-1.37, 1.4);
  paperShape.closePath();
  const paperGeometry = new THREE.ShapeGeometry(paperShape);
  const foldGeometry = new THREE.BufferGeometry();
  foldGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    1.02, 1.4, 0.012, 1.02, 1.05, 0.012, 1.37, 1.05, 0.012,
  ], 3));
  foldGeometry.computeVertexNormals();
  const barGeometry = new THREE.PlaneGeometry(1, 1);
  let papers = [];
  let selected = -1;
  let selectionLift = 0;

  function populate(count) {
    for (const paper of papers) archive.remove(paper);
    papers = [];
    // Keep a large library legible; its full count is always shown in the caption.
    const visibleCount = Math.min(Math.max(0, count), 6);
    for (let i = 0; i < visibleCount; i++) {
      const page = new THREE.Group();
      const sheet = new THREE.Mesh(paperGeometry, paperMaterial);
      page.add(sheet);
      page.add(new THREE.Mesh(foldGeometry, foldMaterial));
      for (let line = 0; line < 7; line++) {
        const bar = new THREE.Mesh(barGeometry, textMaterial);
        const length = line === 0 ? 1.05 : line === 6 ? 1.3 : 2.05;
        bar.scale.set(length, line === 0 ? 0.12 : 0.07, 1);
        bar.position.set(-1.04 + length / 2, 0.99 - line * 0.23, 0.018);
        page.add(bar);
      }
      page.userData.baseX = (i - (visibleCount - 1) / 2) * 0.11;
      page.userData.baseY = 0.58 + i * 0.06;
      page.userData.baseZ = 0.12 - i * 0.075;
      page.rotation.z = (i - (visibleCount - 1) / 2) * 0.035;
      archive.add(page);
      papers.push(page);
    }
  }

  scene.add(new THREE.AmbientLight(0xffffff, 1.25));
  const light = new THREE.DirectionalLight(0xffffff, 2.2);
  light.position.set(-3, 7, 6);
  scene.add(light);

  const glyphs = ' .,:;=+*#%@';
  let cols, rows, width, height, pixels, target;
  let palette = {};
  let frame = 0, elapsed = 0, previous = 0, lastDraw = 0;
  let paused = reducedMotion.matches;
  let inView = true, lost = false;
  let pointerX = 0, pointerY = 0, leanX = 0, leanY = 0;

  function refreshPalette() {
    const style = getComputedStyle(document.documentElement);
    palette = {
      normal: style.getPropertyValue('--ascii').trim(),
      bright: style.getPropertyValue('--ascii-bright').trim(),
      dim: style.getPropertyValue('--ascii-dim').trim(),
    };
  }

  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    const scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.font = '8px "SFMono-Regular", Consolas, "Liberation Mono", monospace';
    context.textBaseline = 'top';
    cols = Math.max(1, Math.floor(width / 4.8));
    rows = Math.max(1, Math.floor(height / 7.8));
    pixels = new Uint8Array(cols * rows * 4);
    if (target) target.dispose();
    target = new THREE.WebGLRenderTarget(cols, rows);
    renderer.setSize(cols, rows, false);
    const aspect = width / height;
    const viewHeight = Math.max(4.75, 4.9 / aspect);
    camera.left = -viewHeight * aspect / 2;
    camera.right = viewHeight * aspect / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    draw();
  }

  function draw() {
    if (lost || !target) return;
    // A small oscillation keeps the directory facing the reader.
    archive.rotation.set(leanY, -0.13 + Math.sin(elapsed * 0.32) * 0.14 + leanX, 0);
    hinge.rotation.x = 0.23 + Math.sin(elapsed * 0.55) * 0.035 + selectionLift * 0.1;
    for (let i = 0; i < papers.length; i++) {
      const page = papers[i];
      const active = selected >= 0 && i === selected % papers.length;
      const lift = active ? selectionLift : 0;
      page.position.set(page.userData.baseX, page.userData.baseY + lift * 0.48, page.userData.baseZ + lift * 0.18);
      page.rotation.x = active ? -lift * 0.06 : 0;
    }
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, cols, rows, pixels);
    renderer.setRenderTarget(null);
    context.clearRect(0, 0, width, height);
    const stepX = width / cols, stepY = height / rows;
    let lastColor = '';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const pixel = ((rows - 1 - y) * cols + x) * 4;
        const brightness = pixels[pixel] / 255;
        if (brightness < 0.028) continue;
        const character = glyphs[Math.min(glyphs.length - 1, Math.ceil(Math.pow(brightness, 0.65) * (glyphs.length - 1)))];
        const color = brightness > 0.7 ? palette.bright : brightness > 0.17 ? palette.normal : palette.dim;
        if (color !== lastColor) { context.fillStyle = color; lastColor = color; }
        context.fillText(character, x * stepX, y * stepY);
      }
    }
  }

  function animate(now) {
    frame = 0;
    if (paused || document.hidden || !inView || lost) return;
    if (previous) elapsed += Math.min((now - previous) / 1000, 0.05);
    previous = now;
    if (now - lastDraw >= 1000 / 24) {
      leanX += (pointerX - leanX) * 0.075;
      leanY += (pointerY - leanY) * 0.075;
      selectionLift += ((selected >= 0 ? 1 : 0) - selectionLift) * 0.12;
      draw();
      lastDraw = now;
    }
    frame = requestAnimationFrame(animate);
  }

  function syncMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    button.textContent = paused ? '[ play ]' : '[ pause ]';
    button.setAttribute('aria-label', paused ? 'Play archive animation' : 'Pause archive animation');
    button.setAttribute('aria-pressed', String(paused));
    if (!paused && !document.hidden && inView && !lost) frame = requestAnimationFrame(animate);
  }

  function selectArtifact(row) {
    const next = row ? Number(row.dataset.index) : -1;
    if (next === selected) return;
    selected = next;
    if (paused) {
      // Deliberate focus changes are immediate, without motion.
      selectionLift = selected >= 0 ? 1 : 0;
      draw();
    }
  }
  list.addEventListener('pointerover', event => selectArtifact(event.target.closest('.artifact')));
  list.addEventListener('pointerleave', () => selectArtifact(list.querySelector('.artifact:focus')));
  list.addEventListener('focusin', event => selectArtifact(event.target.closest('.artifact')));
  list.addEventListener('focusout', event => selectArtifact(event.relatedTarget?.closest?.('.artifact') || null));
  document.addEventListener('library:catalog', event => {
    populate(event.detail);
    selected = -1;
    draw();
  });
  stage.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || paused) return;
    const rect = stage.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 0.35;
    pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 0.12;
  });
  stage.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; });
  button.addEventListener('click', () => { paused = !paused; syncMotion(); });
  reducedMotion.addEventListener('change', event => { paused = event.matches; syncMotion(); });
  systemTheme.addEventListener('change', () => {
    refreshPalette();
    draw();
  });
  document.addEventListener('visibilitychange', syncMotion);
  new IntersectionObserver(entries => { inView = entries[0].isIntersecting; syncMotion(); }).observe(stage);
  new ResizeObserver(resize).observe(stage);
  renderer.domElement.addEventListener('webglcontextlost', () => {
    lost = true;
    cancelAnimationFrame(frame);
    canvas.hidden = true;
    fallback.hidden = false;
    button.hidden = true;
  });

  populate(Number(list.dataset.total ?? list.querySelectorAll('.artifact').length));
  refreshPalette();
  resize();
  canvas.hidden = false;
  fallback.hidden = true;
  button.hidden = false;
  syncMotion();
}
