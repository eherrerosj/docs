// Three.js supplies the light and geometry; the visible image is drawn as text.
import * as THREE from 'three';

const stage = document.querySelector('#ascii-stage');
const canvas = document.querySelector('#ascii');
const fallback = document.querySelector('#ascii-fallback');
const button = document.querySelector('#motion');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

try {
  start();
} catch {
  // The printed stack remains visible if the browser cannot create a WebGL context.
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
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
  camera.position.set(4.8, 1.2, 6.8);
  camera.lookAt(0, 0, 0);
  const sculpture = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(2.8, 2.25, 48, 36);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getY(i);
    const fold = 0.18 * Math.sin(x * 1.7 + z * 0.65) + 0.06 * Math.cos(z * 2);
    positions.setXYZ(i, x, fold, z);
  }
  geometry.computeVertexNormals();
  for (let i = 0; i < 7; i++) {
    const shade = 0.28 + (i / 6) * 0.7;
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(shade, shade, shade), side: THREE.DoubleSide,
    });
    const sheet = new THREE.Mesh(geometry, material);
    sheet.position.y = (i - 3) * 0.46;
    sheet.rotation.y = (i - 3) * 0.14;
    sculpture.add(sheet);
  }
  scene.add(sculpture);
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const light = new THREE.DirectionalLight(0xffffff, 1.7);
  light.position.set(-3, 7, 5);
  scene.add(light);
  const rim = new THREE.DirectionalLight(0xffffff, 0.5);
  rim.position.set(4, 1, -3);
  scene.add(rim);

  const glyphs = ' .,:;=+*#%@';
  let cols, rows, width, height, pixels, target;
  let frame = 0;
  let elapsed = 0;
  let previous = 0;
  let lastDraw = 0;
  let paused = reducedMotion.matches;
  let inView = true;
  let lost = false;
  let pointerX = 0, pointerY = 0, leanX = 0, leanY = 0;

  function resize() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    const scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.font = '9px "SFMono-Regular", Consolas, "Liberation Mono", monospace';
    context.textBaseline = 'top';
    context.fillStyle = '#a3422b';
    cols = Math.max(1, Math.floor(width / 5.4));
    rows = Math.max(1, Math.floor(height / 8.8));
    pixels = new Uint8Array(cols * rows * 4);
    if (target) target.dispose();
    target = new THREE.WebGLRenderTarget(cols, rows);
    renderer.setSize(cols, rows, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  }

  function draw() {
    if (lost) return;
    sculpture.rotation.set(leanY, elapsed * 0.12 + 0.15 + leanX, 0.1);
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, cols, rows, pixels);
    renderer.setRenderTarget(null);
    context.clearRect(0, 0, width, height);
    const stepX = width / cols;
    const stepY = height / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const pixel = ((rows - 1 - y) * cols + x) * 4;
        const brightness = pixels[pixel] / 255;
        if (brightness < 0.035) continue;
        const character = glyphs[Math.min(glyphs.length - 1, Math.ceil(Math.sqrt(brightness) * (glyphs.length - 1)))];
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
      leanX += (pointerX - leanX) * 0.065;
      leanY += (pointerY - leanY) * 0.065;
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
    button.setAttribute('aria-label', paused ? 'Play sculpture animation' : 'Pause sculpture animation');
    button.setAttribute('aria-pressed', String(paused));
    if (!paused && !document.hidden && inView && !lost) frame = requestAnimationFrame(animate);
  }

  stage.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || paused) return;
    const rect = stage.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 0.55;
    pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 0.25;
  });
  stage.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; });
  button.addEventListener('click', () => { paused = !paused; syncMotion(); });
  reducedMotion.addEventListener('change', event => { paused = event.matches; syncMotion(); });
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
  resize();
  canvas.hidden = false;
  fallback.hidden = true;
  button.hidden = false;
  syncMotion();
}
