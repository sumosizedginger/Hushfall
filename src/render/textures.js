import * as THREE from 'three';
import { WALL_SKINS, FLOOR_SKINS } from '../engine/defs.js';

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

// Textures that are not skins (props, atlases, the title art, water) are listed here. Wall and floor SKINS come from the skin tables in defs.js and SKIES from the baked files themselves,
// so adding a skin or a sky means a recipe, a defs row and a bake: no list to edit (Gate 3).
const FIXED = ['wall_bulkhead_a', 'floor_planks_a', 'crate_wood_a', 'pod_organic_a', 'door_hatch_a', 'tollbearer_atlas', 'flarecannon_atlas', 'props_atlas', 'ui_title_art', 'water_dusk', 'awning_stripe_a', 'boat_hull_a'];
const SKIES = Object.keys(URL_BY_NAME).filter((n) => n.startsWith('sky_'));
const NAMES = [...new Set([...FIXED, ...SKIES, ...Object.values(WALL_SKINS), ...Object.values(FLOOR_SKINS).map((f) => f.tex)])];

/**
 * The painted skies are not periodic: wrapped round the dome their left and right edges meet in a hard vertical seam (audit A12). Cross-fade the last B columns into the first B and drop them, so the
 * image tiles horizontally. (Browser only: it draws through a canvas.)
 */
function makeSeamlessUnsafe(t) {
  const img = t.image; if (typeof document === 'undefined' || !img?.width) return t;
  const W = img.width, H = img.height, B = Math.round(W * 0.125), W2 = W - B, src = document.createElement('canvas'); src.width = W; src.height = H;
  const sc = src.getContext('2d'); sc.drawImage(img, 0, 0); const a = sc.getImageData(0, 0, W, H).data, out = new Uint8ClampedArray(W2 * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W2; x++) for (let c = 0; c < 4; c++) {
    const o = a[(y * W + x) * 4 + c]; out[(y * W2 + x) * 4 + c] = x >= B ? o : Math.round(a[(y * W + W2 + x) * 4 + c] * (1 - x / B) + o * (x / B));
  }
  const dst = document.createElement('canvas'); dst.width = W2; dst.height = H; dst.getContext('2d').putImageData(new ImageData(out, W2, H), 0, 0);
  const nt = new THREE.CanvasTexture(dst); nt.magFilter = t.magFilter; nt.minFilter = t.minFilter; nt.wrapS = nt.wrapT = t.wrapS; nt.colorSpace = t.colorSpace; nt.anisotropy = t.anisotropy; t.dispose(); return nt;
}

/** a cosmetic fix must never take the game down: any canvas failure keeps the original sky (audit R10) */
function makeSeamless(t) { try { return makeSeamlessUnsafe(t); } catch { return t; } }

export async function loadAll() {
  const out = {};
  await Promise.all(NAMES.map(async (n) => { out[n] = await loadTex(n, { repeat: !ATLASES.has(n) && n !== 'ui_title_art' && n !== 'door_hatch_a' }); }));
  for (const n of ['sky_dusk', 'sky_night', 'sky_overcast']) out[n] = makeSeamless(out[n]);
  out.wall_plaster_a.wrapT = THREE.ClampToEdgeWrapping;        // the wainscot is at the bottom of the tile and plain plaster above it: it must not repeat up a tall wall
  out.paper_grain = await loadTex('paper_grain', { srgb: false });
  out.paper_grain.magFilter = out.paper_grain.minFilter = THREE.LinearFilter;
  out.paper_grain.generateMipmaps = false;
  return out;
}
export const titleArtUrl = () => URL_BY_NAME.ui_title_art;
