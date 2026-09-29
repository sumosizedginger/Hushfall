import * as THREE from 'three';

const loader = new THREE.TextureLoader();
export function loadTex(name, { repeat = true, srgb = true } = {}) {
  return new Promise((resolve, reject) => loader.load(`/assets/baked/${name}.png`, (t) => {
    t.magFilter = THREE.NearestFilter;                    // crisp texels up close
    t.minFilter = THREE.NearestMipmapLinearFilter;        // no shimmer at distance
    t.anisotropy = 4;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    resolve(t);
  }, undefined, reject));
}

export async function loadAll() {
  const names = ['wall_bulkhead_a', 'floor_planks_a', 'crate_wood_a', 'pod_organic_a', 'sky_dusk', 'tollbearer_atlas', 'flarecannon_atlas'];
  const out = {};
  await Promise.all(names.map(async (n) => { out[n] = await loadTex(n, { repeat: n !== 'tollbearer_atlas' && n !== 'flarecannon_atlas' }); }));
  out.paper_grain = await loadTex('paper_grain', { srgb: false });
  out.paper_grain.magFilter = out.paper_grain.minFilter = THREE.LinearFilter;
  out.paper_grain.generateMipmaps = false;
  return out;
}
