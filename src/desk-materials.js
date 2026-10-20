import * as THREE from 'three';

function hash(x, y) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let u = x - ix, v = y - iy;
  u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
  const a = hash(ix, iy), b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function textures(width, height, pixel, renderer, repeat = 1) {
  const color = document.createElement('canvas');
  const relief = document.createElement('canvas');
  color.width = relief.width = width; color.height = relief.height = height;
  const colorContext = color.getContext('2d'), reliefContext = relief.getContext('2d');
  const image = colorContext.createImageData(width, height);
  const heightImage = reliefContext.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, h] = pixel(x, y);
      const i = (y * width + x) * 4;
      image.data[i] = r; image.data[i + 1] = g; image.data[i + 2] = b; image.data[i + 3] = 255;
      heightImage.data[i] = heightImage.data[i + 1] = heightImage.data[i + 2] = h;
      heightImage.data[i + 3] = 255;
    }
  }
  colorContext.putImageData(image, 0, 0); reliefContext.putImageData(heightImage, 0, 0);
  const map = new THREE.CanvasTexture(color), bumpMap = new THREE.CanvasTexture(relief);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const texture of [map, bumpMap]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }
  return { map, bumpMap };
}

export function woodTextures(renderer, onLoad) {
  const loader = new THREE.TextureLoader();
  const maps = {};
  for (const [slot, suffix] of [['map', 'diff'], ['normalMap', 'nor_gl'], ['roughnessMap', 'rough']]) {
    maps[slot] = loader.load('assets/textures/wood_table_001_' + suffix + '_1k.jpg', onLoad);
    maps[slot].anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    maps[slot].center.set(0.5, 0.5);
    maps[slot].rotation = Math.PI / 2;
  }
  maps.map.colorSpace = THREE.SRGBColorSpace;
  return maps;
}

export function stoneTextures(dark, renderer) {
  const base = dark ? [72, 65, 56] : [191, 180, 161];
  // Four large limestone tiles with narrow, recessed joints.
  return textures(1024, 1024, (x, y) => {
    const tileX = Math.floor(x / 512), tileY = Math.floor(y / 512);
    const edge = Math.min(x % 512, y % 512, 511 - x % 512, 511 - y % 512);
    const cloud = noise(x * 0.012, y * 0.012) * 9 + noise(x * 0.055, y * 0.055) * 4;
    const grit = (hash(x, y) - 0.5) * 6;
    const pore = hash(x + 71, y) > 0.996 ? -13 : 0;
    const variation = cloud - 6 + grit + pore + (hash(tileX + 2, tileY + 9) - 0.5) * 9;
    const joint = edge < 2 ? -16 : edge < 3 ? 3 : 0;
    return [base[0] + variation + joint, base[1] + variation + joint, base[2] + variation + joint, edge < 2 ? 55 : 155 + grit + pore];
  }, renderer, 25);
}
