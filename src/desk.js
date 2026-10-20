import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createDeskPhysics, PAPER_WIDTH, PAPER_HEIGHT, PAPER_THICKNESS } from './desk-physics.js';
import { documentsFromSites, documentMatches } from './documents.js';
import { paperTexture, tableTexture } from './paper-texture.js';

const stage = document.querySelector('#stage');
const canvas = document.querySelector('#desk');
const fallback = document.querySelector('#desk-fallback');
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const preview = document.querySelector('#preview');
const search = document.querySelector('#search');
const status = document.querySelector('#desk-status');
const hoverLabel = document.querySelector('#hover-label');
let desk = null;
let selected = null;

const fallbackSites = [{
  slug: 'facturascripts', title: 'FacturaScripts',
  description: 'Inside the ERP, with a practical accounting course for Spanish SLs.',
  category: 'Review + course', language: 'Spanish',
}];

async function load() {
  let sites;
  try {
    const response = await fetch('sites.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Catalog unavailable');
    sites = await response.json();
    if (!Array.isArray(sites)) throw new Error('Invalid catalog');
  } catch {
    sites = fallbackSites;
    document.querySelector('.index-context').textContent = 'The catalog could not load. The FacturaScripts report is still available below.';
  }
  const documents = documentsFromSites(sites);
  const artifactCount = documents.length;
  document.querySelector('#desk-count').textContent = artifactCount + (artifactCount === 1 ? ' artifact' : ' artifacts');
  renderIndex(documents);
  search.addEventListener('input', () => {
    renderIndex(documents);
    desk?.filter(search.value);
  });
  try {
    desk = createDesk(documents);
    canvas.hidden = false;
    fallback.hidden = true;
    document.querySelectorAll('.desk-toolbar button').forEach(button => { button.disabled = false; });
  } catch {
    canvas.hidden = true;
    fallback.hidden = false;
    document.querySelector('#fallback-message').textContent = 'The 3D desk is unavailable in this browser. All documents are in the library.';
  }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

function renderIndex(documents) {
  const query = search.value;
  const matching = documents.filter(document => documentMatches(document, query));
  const list = document.querySelector('#documents');
  list.replaceChildren();
  for (const document of matching) {
    const row = element('a', 'document-row');
    row.href = document.href;
    const number = element('span', 'row-number', String(documents.indexOf(document) + 1).padStart(2, '0'));
    const body = element('span', 'row-body');
    body.append(element('strong', '', document.title), element('span', '', document.description));
    row.append(number, body, element('span', 'row-kind', document.category), element('span', '', '↗'));
    list.append(row);
  }
  document.querySelector('#count').textContent = String(matching.length);
  document.querySelector('#no-results').hidden = matching.length > 0;
  document.querySelector('#index-status').textContent = matching.length + (matching.length === 1 ? ' document found.' : ' documents found.');
}

function select(entry) {
  selected = entry;
  canvas.dataset.selected = entry.id;
  document.querySelector('#preview-title').textContent = entry.title;
  document.querySelector('#preview-description').textContent = entry.description;
  document.querySelector('#preview-meta').textContent = entry.category + ' · ' + entry.language;
  document.querySelector('#open-document').href = entry.href;
  preview.hidden = false;
  hoverLabel.hidden = true;
  status.textContent = entry.title + ' selected. Use Open document to read it.';
}

function closePreview(returnFocus = false) {
  preview.hidden = true;
  selected = null;
  delete canvas.dataset.selected;
  desk?.highlight(null);
  if (returnFocus) canvas.focus({ preventScroll: true });
}
document.querySelector('#close-preview').addEventListener('click', () => closePreview(true));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { desk?.cancelDrag(); closePreview(preview.contains(document.activeElement)); }
});

function createDesk(documents) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reducedMotion.matches;
  controls.dampingFactor = 0.09;
  controls.minPolarAngle = 0.13;
  controls.maxPolarAngle = 1.12;
  controls.minDistance = 5;
  controls.maxDistance = 55;
  controls.screenSpacePanning = false;
  controls.panSpeed = 0.6;
  controls.rotateSpeed = 0.5;

  const columns = documents.length <= 4 ? 2 : 3;
  const rows = Math.max(2, Math.ceil(documents.length / columns));
  const tableWidth = columns * 3.55 + 3;
  const tableDepth = rows * 3.9 + 2.6;
  controls.maxDistance = Math.max(55, tableDepth * 2.2);
  const physics = createDeskPhysics(tableWidth, tableDepth);
  const tableSideMaterial = new THREE.MeshStandardMaterial({ color: 0x344b36, roughness: 0.9 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(tableWidth, 0.4, tableDepth), tableSideMaterial);
  table.position.y = -0.2;
  table.castShadow = true; table.receiveShadow = true;
  scene.add(table);
  const surfaceMaterial = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(tableWidth - 0.01, tableDepth - 0.01), surfaceMaterial);
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 0.005;
  surface.receiveShadow = true;
  scene.add(surface);

  const rimMaterial = new THREE.MeshStandardMaterial({ roughness: 0.8, color: 0x38513c });
  for (const [x, z, w, d] of [[-tableWidth / 2, 0, 0.07, tableDepth], [tableWidth / 2, 0, 0.07, tableDepth], [0, -tableDepth / 2, tableWidth, 0.07], [0, tableDepth / 2, tableWidth, 0.07]]) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.13, d), rimMaterial);
    rim.position.set(x, 0.05, z);
    rim.castShadow = true; scene.add(rim);
  }
  for (const x of [-tableWidth / 2 + 0.7, tableWidth / 2 - 0.7]) {
    for (const z of [-tableDepth / 2 + 0.7, tableDepth / 2 - 0.7]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 2.5, 0.32), tableSideMaterial);
      leg.position.set(x, -1.65, z); leg.castShadow = true; scene.add(leg);
    }
  }
  const floorMaterial = new THREE.MeshStandardMaterial({ roughness: 1 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), floorMaterial);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.92; floor.receiveShadow = true; scene.add(floor);
  const ambient = new THREE.HemisphereLight(0xfff4e5, 0x65554a, 2.4);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xfff4d8, 3.2);
  key.position.set(-7, 15, 9); key.castShadow = true;
  key.shadow.mapSize.set(innerWidth < 700 ? 1024 : 2048, innerWidth < 700 ? 1024 : 2048);
  key.shadow.camera.left = -tableWidth; key.shadow.camera.right = tableWidth;
  key.shadow.camera.top = tableDepth; key.shadow.camera.bottom = -tableDepth;
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 50;
  key.shadow.normalBias = 0.035; key.shadow.bias = -0.00005;
  scene.add(key);

  const papers = [];
  const geometry = new THREE.BoxGeometry(PAPER_WIDTH, PAPER_THICKNESS, PAPER_HEIGHT);
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xe0dfce, roughness: 0.95 });
  const backMaterial = new THREE.MeshStandardMaterial({ color: 0xe8e7d9, roughness: 0.95 });
  documents.forEach((document, index) => {
    const texture = paperTexture(document, index, renderer);
    const face = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 });
    const mesh = new THREE.Mesh(geometry, [edgeMaterial, edgeMaterial, face, backMaterial, edgeMaterial, edgeMaterial]);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const x = documents.length === 1 ? 0 : ((index % columns) - (columns - 1) / 2) * 3.55 + Math.sin(index * 13 + 2) * 0.24;
    const z = documents.length === 1 ? 0 : (Math.floor(index / columns) - (rows - 1) / 2) * 3.9 + Math.cos(index * 7 + 1) * 0.22;
    const angle = Math.sin(index * 4.1 + 0.6) * 0.19;
    const body = physics.addPaper({ x, z, angle });
    mesh.userData.paper = { document, body, mesh, face, match: true };
    papers.push(mesh.userData.paper);
    scene.add(mesh);
  });

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(PAPER_WIDTH + 0.06, PAPER_THICKNESS + 0.025, PAPER_HEIGHT + 0.06)),
    new THREE.LineBasicMaterial({ color: 0xe2a184, transparent: true, opacity: 0.8 }),
  );
  outline.visible = false; scene.add(outline);
  let highlighted = null, hoverPaper = null;
  let dirty = true, visible = true, lost = false;
  let frame = 0, previous = 0;
  let pending = null;
  let query = '';
  let lastDragAt = -Infinity;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.9);
  const intersection = new THREE.Vector3();

  function updateTheme() {
    const dark = systemTheme.matches;
    const color = dark ? '#211e1b' : '#f7f3ec';
    scene.background = new THREE.Color(color);
    scene.fog = new THREE.Fog(color, 35, 100);
    floorMaterial.color.set(dark ? '#29231e' : '#ede4d5');
    tableSideMaterial.color.set(dark ? '#493024' : '#987451');
    rimMaterial.color.set(dark ? '#76523a' : '#ae8960');
    surfaceMaterial.map?.dispose();
    surfaceMaterial.map = tableTexture(dark); surfaceMaterial.needsUpdate = true;
    outline.material.color.set(dark ? '#e2a184' : '#a24f38');
    ambient.intensity = dark ? 1.65 : 2.4;
    key.intensity = dark ? 2.3 : 3.2;
    dirty = true;
  }

  function resetView() {
    cancelDrag();
    controls.reset();
    const aspect = stage.clientWidth / stage.clientHeight;
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const distance = Math.max((tableWidth * 0.82) / (Math.max(aspect, 1) * 2 * tangent), (tableDepth * 0.7 + 1.8) / (2 * tangent)) * 1.12;
    const x = aspect < 0.9 && documents.length > 1 ? -1.5 : 0;
    controls.target.set(x, 0, 0);
    camera.position.set(x, distance * 0.77, distance * 0.64);
    controls.update();
    dirty = true;
  }

  function resize() {
    const width = stage.clientWidth, height = stage.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    dirty = true;
  }

  function pointRay(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return rect;
  }

  function hit(event) {
    pointRay(event);
    return raycaster.intersectObjects(papers.filter(paper => paper.match).map(paper => paper.mesh), false)[0] || null;
  }

  function highlight(paper) {
    highlighted = paper;
    outline.visible = Boolean(paper);
    dirty = true;
  }

  function handleDown(event) {
    if (event.button !== 0 || !event.isPrimary) return;
    if (pending) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    const result = hit(event);
    if (!result) { closePreview(); highlight(null); return; }
    event.preventDefault(); event.stopImmediatePropagation();
    controls.enabled = false;
    pending = {
      id: event.pointerId, paper: result.object.userData.paper, point: result.point.clone(),
      x: event.clientX, y: event.clientY, dragging: false,
    };
    canvas.setPointerCapture(event.pointerId);
    hoverLabel.hidden = true;
    highlight(pending.paper);
  }

  function handleMove(event) {
    if (pending && event.pointerId === pending.id) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!pending.dragging && Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > 6) {
        closePreview();
        highlight(pending.paper);
        pending.dragging = true;
        physics.beginDrag(pending.paper.body, pending.point);
        canvas.dataset.dragging = pending.paper.document.id;
        status.textContent = 'Moving ' + pending.paper.document.title + '. Release to drop it.';
      }
      if (pending.dragging) {
        pointRay(event);
        if (raycaster.ray.intersectPlane(plane, intersection)) physics.moveDrag(intersection);
      }
      return;
    }
    if (event.pointerType === 'touch') return;
    const result = hit(event);
    hoverPaper = result?.object.userData.paper || null;
    if (hoverPaper && preview.hidden) {
      const rect = canvas.getBoundingClientRect();
      hoverLabel.textContent = hoverPaper.document.title;
      hoverLabel.dataset.document = hoverPaper.document.id;
      hoverLabel.style.left = Math.min(event.clientX - rect.left + 16, rect.width - 265) + 'px';
      hoverLabel.style.top = Math.min(event.clientY - rect.top + 18, rect.height - 50) + 'px';
      hoverLabel.hidden = false;
    } else hoverLabel.hidden = true;
    if (!selected) highlight(hoverPaper);
  }

  function finish(event, cancel = false) {
    if (!pending || event.pointerId !== pending.id) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const current = pending;
    pending = null;
    physics.release();
    controls.enabled = true;
    if (canvas.hasPointerCapture(current.id)) canvas.releasePointerCapture(current.id);
    delete canvas.dataset.dragging;
    if (current.dragging) {
      lastDragAt = performance.now();
      status.textContent = current.paper.document.title + ' dropped on the desk.';
      canvas.dispatchEvent(new CustomEvent('desk:drop', { detail: { id: current.paper.document.id } }));
      highlight(null);
    } else if (!cancel) {
      select(current.paper.document);
      highlight(current.paper);
    }
    dirty = true;
  }

  function cancelDrag() {
    if (!pending) return;
    const id = pending.id;
    pending = null;
    physics.release();
    controls.enabled = true;
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    delete canvas.dataset.dragging;
    hoverLabel.hidden = true;
    dirty = true;
  }

  canvas.addEventListener('pointerdown', handleDown, true);
  canvas.addEventListener('pointermove', handleMove, true);
  canvas.addEventListener('pointerup', event => finish(event), true);
  canvas.addEventListener('pointercancel', event => finish(event, true), true);
  canvas.addEventListener('lostpointercapture', () => { if (pending) cancelDrag(); });
  canvas.addEventListener('pointerleave', () => { hoverLabel.hidden = true; if (!selected && !pending) highlight(null); });
  canvas.addEventListener('dblclick', event => {
    if (performance.now() - lastDragAt < 600) return;
    const result = hit(event);
    if (result) location.href = result.object.userData.paper.document.href;
  });
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'r', 'R', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Enter') { document.querySelector('#library').scrollIntoView(); search.focus({ preventScroll: true }); return; }
    if (event.key.toLowerCase() === 'r') { resetView(); return; }
    if (['+', '=', '-'].includes(event.key)) { zoom(event.key === '-' ? 1.15 : 0.87); return; }
    const direction = event.key === 'ArrowLeft' ? [-0.55, 0] : event.key === 'ArrowRight' ? [0.55, 0] : event.key === 'ArrowUp' ? [0, -0.55] : [0, 0.55];
    camera.position.x += direction[0]; camera.position.z += direction[1];
    controls.target.x += direction[0]; controls.target.z += direction[1];
    controls.update(); dirty = true;
  });
  function zoom(factor) {
    const offset = camera.position.clone().sub(controls.target);
    const distance = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(offset.setLength(distance));
    controls.update(); dirty = true;
  }
  document.querySelector('#zoom-in').addEventListener('click', () => zoom(0.82));
  document.querySelector('#zoom-out').addEventListener('click', () => zoom(1.22));
  document.querySelector('#reset-view').addEventListener('click', resetView);
  document.querySelector('#tidy').addEventListener('click', () => {
    cancelDrag(); closePreview(); physics.reset(); highlight(null);
    status.textContent = 'Documents returned to their original places.';
    dirty = true;
  });
  controls.addEventListener('change', () => {
    // Bound exploration to the desk so panning cannot strand the reader.
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -tableWidth / 2, tableWidth / 2);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -tableDepth / 2, tableDepth / 2);
    dirty = true;
  });
  controls.addEventListener('start', () => { hoverLabel.hidden = true; });
  systemTheme.addEventListener('change', updateTheme);
  reducedMotion.addEventListener('change', () => { controls.enableDamping = !reducedMotion.matches; dirty = true; });
  new ResizeObserver(resize).observe(stage);
  function schedule() {
    cancelAnimationFrame(frame); frame = 0; previous = 0;
    if (visible && !document.hidden && !lost) frame = requestAnimationFrame(animate);
  }
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelDrag(); schedule(); });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); lost = true; cancelDrag(); schedule();
    canvas.hidden = true; fallback.hidden = false;
    document.querySelector('#fallback-message').textContent = 'The 3D desk paused. You can still read every document in the library.';
    document.querySelectorAll('.desk-toolbar button').forEach(button => { button.disabled = true; });
  });

  function animate(now) {
    frame = 0;
    if (lost || document.hidden || !visible) return;
    const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 1 / 60;
    previous = now;
    const active = physics.dragging || physics.papers.some(body => body.sleepState !== 2);
    if (active) physics.step(dt);
    for (const paper of papers) {
      paper.mesh.position.copy(paper.body.position);
      paper.mesh.quaternion.copy(paper.body.quaternion);
    }
    if (highlighted) {
      outline.position.copy(highlighted.body.position);
      outline.quaternion.copy(highlighted.body.quaternion);
    }
    controls.update();
    if (dirty || active) { renderer.render(scene, camera); dirty = false; }
    frame = requestAnimationFrame(animate);
  }

  updateTheme(); resize(); resetView();
  // Start settled; reduced-motion readers never get an automatic falling-paper intro.
  for (let i = 0; i < 90; i++) physics.step(1 / 120);
  schedule();
  return {
    cancelDrag, highlight,
    filter(value) {
      query = value;
      for (const paper of papers) {
        paper.match = documentMatches(paper.document, query);
        paper.face.color.set(paper.match ? 0xffffff : 0x555b51);
      }
      hoverLabel.hidden = true;
      if (selected && !documentMatches(selected, query)) closePreview();
      highlight(null); dirty = true;
    },
  };
}

load();
