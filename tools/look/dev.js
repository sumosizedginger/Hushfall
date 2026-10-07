// Look-dev page: the refined rigs (tools/look/rigs_v2.js) drawn through the GAME'S OWN pipeline, not a mock-up: the real PostPass (src/render/post.js: ink, banding, paper grain, vignette), the real entity
// flagging (src/render/entityflag.js), the real lighting recipe of GameView (hemisphere + sun + exponential fog + the painted sky), the real camera (70 degrees vertical, near 0.1) and the real default
// internal width (480 px, settings.js) upscaled nearest-neighbour. It is design tooling: it imports from src/render read-only and is not part of the game, the build or any evidence set.
// Driven by tools/look/shoot-rigs.mjs through window.__LOOK__.
import * as THREE from 'three';
import { PostPass } from '../../src/render/post.js';
import { markEntity } from '../../src/render/entityflag.js';
import { mergeStatic } from '../../src/render/merge.js';
import { FACTORIES } from '../../src/render/models_choir.js';
import { makeTollbearer, makeGaunt } from '../../src/render/models.js';
import { makeBellNodeEnemy } from '../../src/render/models_g2.js';
import { makeDroneGill, makeFeeder, makeGraftMother } from '../../src/render/models_e2.js';
import tbUrl from '../../assets/baked/tollbearer_atlas.png?url';
import podUrl from '../../assets/baked/pod_organic_a.png?url';
import paperUrl from '../../assets/baked/paper_grain.png?url';
import skyUrl from '../../assets/baked/sky_dusk.png?url';
import skyNightUrl from '../../assets/baked/sky_night.png?url';
import floorUrl from '../../assets/baked/floor_slate_a.png?url';
import floorFlagUrl from '../../assets/baked/floor_flag_a.png?url';
import wallUrl from '../../assets/baked/wall_saltbrick_a.png?url';
const choirUrls = import.meta.glob('../../assets/baked/choir_*.png', { eager: true, query: '?url', import: 'default' });

const W = 1280, H = 720, INTERNAL = 480, NEAR = 0.1, FAR = 170;
const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.autoClear = false; renderer.setSize(W, H, false);
const loader = new THREE.TextureLoader();
const load = (url, { repeat = false, srgb = true, nearest = true } = {}) => new Promise((res, rej) => loader.load(url, (t) => {
  if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; } t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; res(t);
}, undefined, () => rej(new Error('texture ' + url))));
const T = {};
for (const [p, u] of Object.entries(choirUrls)) T[p.split('/').pop().replace('.png', '')] = await load(u);
await Promise.all([['paper', paperUrl, { srgb: false, nearest: false }], ['sky', skyUrl], ['skyNight', skyNightUrl], ['floor', floorUrl, { repeat: true }], ['floorFlag', floorFlagUrl, { repeat: true }], ['wall', wallUrl, { repeat: true }], ['tb', tbUrl], ['pod', podUrl]].map(async ([k, u, o]) => { T[k] = await load(u, o); }));
T.paper.magFilter = T.paper.minFilter = THREE.LinearFilter; T.paper.generateMipmaps = false;

const scene = new THREE.Scene();
const hemi = new THREE.HemisphereLight(0x9fb4d0, 0x3a2a40, 2.4), sun = new THREE.DirectionalLight(0xd8b0e0, 1.3); sun.position.set(-8, 14, -6); scene.add(hemi, sun);
const lamp = new THREE.PointLight(0xffb060, 0, 18, 2); lamp.position.set(-1.6, 3.4, 2.4); scene.add(lamp);
const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ map: T.sky, side: THREE.BackSide, fog: false, depthWrite: false })); sky.renderOrder = -1; scene.add(sky);
const floorMat = new THREE.MeshLambertMaterial({ map: T.floor }); T.floor.repeat.set(120, 120);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), floorMat); floor.rotation.x = -Math.PI / 2; scene.add(floor);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(240, 14), new THREE.MeshLambertMaterial({ map: T.wall })); T.wall.repeat.set(60, 3.5); wall.position.set(0, 7, -22); wall.visible = false; scene.add(wall);
const cam = new THREE.PerspectiveCamera(70, W / H, NEAR, FAR); cam.rotation.order = 'YXZ';
const post = new PostPass(renderer, T.paper, NEAR, FAR); post.resize(INTERNAL, Math.round(INTERNAL * H / W));
const actors = [];
/** the SHIPPED rigs, for an honest A/B in the same light, camera and post pass (place('old:tollbearer', ...)) */
const OLD = { tollbearer: () => makeTollbearer(T.tb), bellhand: () => makeTollbearer(T.tb, 'bellhand'), sexton: () => makeTollbearer(T.tb, 'sexton'), wardengraft: () => makeTollbearer(T.tb, 'warden'), cantor: () => makeTollbearer(T.tb, 'cantor'), gaunt: () => makeGaunt(T.tb), bellnode: () => makeBellNodeEnemy(), gill: () => makeDroneGill(T.pod), feeder: () => makeFeeder(T.pod), graftmother: () => makeGraftMother(T.pod) };

const PRESETS = {
  dusk: { fog: '#3a2c4a', density: 0.02, ambient: 1, sky: 'sky', floor: 'floor', wall: false, lamp: 0 },                    // Episode 1 harbour at dusk (the default level look)
  hall: { fog: '#1c2a2a', density: 0.02, ambient: 0.55, sky: 'skyNight', floor: 'floorFlag', wall: true, lamp: 90 },        // Episode 2 interior: dim, a warm lamp pool
  dark: { fog: '#0e1218', density: 0.03, ambient: 0.3, sky: 'skyNight', floor: 'floorFlag', wall: true, lamp: 60 },         // the dark halls
};
function setup(name = 'dusk') {
  const p = PRESETS[name]; scene.fog = new THREE.FogExp2(new THREE.Color(p.fog), p.density); hemi.intensity = 2.4 * p.ambient; sun.intensity = 1.3 * p.ambient;
  sky.material.map = T[p.sky]; floorMat.map = T[p.floor]; floorMat.needsUpdate = true; T[p.floor].repeat.set(120, 120); wall.visible = p.wall; lamp.intensity = p.lamp;
}
setup('dusk');

const api = {
  ready: true,
  setup,
  clear() { for (const a of actors) { scene.remove(a.v.root); if (a.frozen) scene.remove(a.frozen); } actors.length = 0; },
  /** place one creature: kind, world x/z, yaw (0 faces the +z camera side), pose params, factory options (o.stage ...); returns an index */
  place(kind, { x = 0, z = 0, yaw = 0, pose = {}, o = {}, sleeping = false } = {}) {
    const v = kind.startsWith('old:') ? OLD[kind.slice(4)]() : FACTORIES[kind](T['choir_' + kind], o); markEntity(v.root); v.root.position.set(x, 0, z); v.root.rotation.y = yaw; scene.add(v.root);
    const a = { v, pose: { t: 1.3, walk: 0, phase: 0, attack: 0, lunge: 0, dead: 0, flash: 0, ...pose }, sleeping, frozen: null }; actors.push(a); return actors.length - 1;
  },
  setPose(i, pose) { Object.assign(actors[i].pose, pose); },
  /** the same sleeping-merge the view does (one mesh per material): used to prove the rig survives it */
  freeze(i) { const a = actors[i], v = a.v; v.pose(a.pose); v.root.updateMatrixWorld(true); const f = v.root.clone(true); scene.add(f); f.updateMatrixWorld(true); const out = mergeStatic(f, { disposeSources: false, cull: true }); f.position.set(0, 0, 0); f.rotation.set(0, 0, 0); f.updateMatrixWorld(true); a.frozen = f; v.root.visible = false; return out.length; },
  camera({ x = 0, y = 1.6, z = 6, yaw = 0, pitch = 0, fov = 70 } = {}) { cam.position.set(x, y, z); cam.rotation.set(pitch, yaw, 0); if (cam.fov !== fov) { cam.fov = fov; cam.updateProjectionMatrix(); } sky.position.copy(cam.position); },
  /** one frame through the real post pass */
  frame() { for (const a of actors) if (!a.frozen) a.v.pose(a.pose); post.render(() => renderer.render(scene, cam)); return true; },
  /** true-scale front silhouette, black on white, 100 px per metre, feet 40 px above the bottom (the format tools/look/sil-matrix.mjs reads): the REAL geometry, not a drawing of it */
  silhouette(i, w = 360, h = 560) {
    const a = actors[i]; a.v.pose(a.pose); const keep = { x: a.v.root.position.x, z: a.v.root.position.z, ry: a.v.root.rotation.y };
    a.v.root.position.set(0, 0, 0); a.v.root.rotation.y = 0; for (const o of actors) if (o !== a) o.v.root.visible = false; sky.visible = floor.visible = wall.visible = false; lamp.visible = false;
    const sc = scene.background, fog = scene.fog, ov = scene.overrideMaterial; scene.background = new THREE.Color(0xffffff); scene.fog = null; scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const oc = new THREE.OrthographicCamera(-w / 200, w / 200, (h - 40) / 100, -0.4, 0.1, 100); oc.position.set(0, 0, 20); oc.lookAt(0, 0, 0);
    renderer.setSize(w, h, false); renderer.setClearColor(0xffffff, 1); renderer.clear(); renderer.render(scene, oc);
    const data = canvas.toDataURL('image/png');
    renderer.setSize(W, H, false); scene.background = sc; scene.fog = fog; scene.overrideMaterial = ov; sky.visible = floor.visible = true; lamp.visible = true; renderer.setClearColor(0x000000, 1);
    a.v.root.position.set(keep.x, 0, keep.z); a.v.root.rotation.y = keep.ry; for (const o of actors) o.v.root.visible = !o.frozen; return data;
  },
  info() { let meshes = 0; scene.traverse((o) => { if (o.isMesh) meshes++; }); return { meshes, calls: renderer.info.render.calls }; },
};
window.__LOOK__ = api;
