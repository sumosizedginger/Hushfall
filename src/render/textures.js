import * as THREE from 'three';

// Vite resolves + hashes these at build time, so dev and production builds use the same code path.
const urls = import.meta.glob(['../../assets/baked/*.png', '!../../assets/baked/enemy_tollbearer_idle.png', '!../../assets/baked/weapon_flarecannon.png'], { eager: true, query: '?url', import: 'default' });
const URL_BY_NAME = Object.fromEntries(Object.entries(urls).map(([p, u]) => [p.split('/').pop().replace('.png', ''), u]));

const loader = new THREE.TextureLoader();
const ATLASES = new Set(['tollbearer_atlas', 'flarecannon_atlas', 'props_atlas']);

export function loadTex(name, { repeat = true, srgb = true } = {}) {
  const url = URL_BY_NAME[name];
  if (!url) return Promise.reject(new Error('unknown baked texture ' + name));
  return new Promise((resolve, reject) => loader.load(url, (t) => {
    t.magFilter = THREE.NearestFilter;                    // crisp texels up close
    t.minFilter = THREE.NearestMipmapLinearFilter;        // no shimmer at distance
    t.anisotropy = 4;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    resolve(t);
  }, undefined, () => reject(new Error('failed to load texture ' + name))));
}

const NAMES = ['wall_bulkhead_a', 'floor_planks_a', 'crate_wood_a', 'pod_organic_a', 'sky_dusk', 'door_hatch_a', 'tollbearer_atlas', 'flarecannon_atlas', 'props_atlas', 'ui_title_art',
  'water_dusk', 'cobble_wet_a', 'brick_warm_a', 'awning_stripe_a', 'boat_hull_a', 'tower_stone_a',
  // Gate 2 kit
  'wall_timber_a', 'wall_plaster_a', 'wall_concrete_a', 'wall_iron_a', 'wall_resin_a', 'floor_tile_a', 'floor_grate_a', 'floor_carpet_a', 'floor_flag_a', 'floor_silt_a', 'floor_slate_a', 'sky_night', 'sky_overcast'];

export async function loadAll() {
  const out = {};
  await Promise.all(NAMES.map(async (n) => { out[n] = await loadTex(n, { repeat: !ATLASES.has(n) && n !== 'ui_title_art' && n !== 'door_hatch_a' }); }));
  out.paper_grain = await loadTex('paper_grain', { srgb: false });
  out.paper_grain.magFilter = out.paper_grain.minFilter = THREE.LinearFilter;
  out.paper_grain.generateMipmaps = false;
  return out;
}
export const titleArtUrl = () => URL_BY_NAME.ui_title_art;
