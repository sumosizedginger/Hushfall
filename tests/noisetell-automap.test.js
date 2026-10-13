// PT-045 (drop B): E9 THE NOISE TELL (src/engine/noisetell.js, the HUD line, the automap ring) and the AUTOMAP MARKS of law 1 in design/ACTC.md (the Ossuary winch: "it is impossible to find the switch"): a lever the player has SEEN stays on the map, a key door is drawn in
// its key's colour, a sealed exit is drawn dull red. Pure model tests, plus the HUD function run against a stand-in DOM (the owner's black screen of 2026-10-13 was a per-frame shell function nobody had executed; no browser job may run without a fresh yes).
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { createWorld, step } from '../src/engine/world.js';
import { noiseRadius, noiseTell, noiseHud } from '../src/engine/noisetell.js';
import { automapModel, updateExplored } from '../src/engine/automap.js';
import { NOISE, ECHO, LANTERN, WEAPONS, KEYS } from '../src/engine/defs.js';
import { shippedMap, loadMap } from './helpers.js';

const hall = (over = {}) => ({ format: 1, id: 'N1', version: 1, name: 'Hall', cellSize: 2, grid: ['#'.repeat(20), '#' + '.'.repeat(18) + '#', '#' + '.'.repeat(18) + '#', '#' + '.'.repeat(18) + '#', '#'.repeat(20)], doors: [], secrets: [], entities: [{ type: 'player', at: [3, 2], facing: 'east' }, { type: 'exit', at: [17, 2] }], ...over });
const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const world = (src, w = {}) => { const x = createWorld(parseMap(src), { seed: 1, difficulty: 'normal' }); Object.assign(x.player, w); return x; };

test('the tell: a weapon is LOUD above ECHO.loud metres and QUIET at or below it; the arc, the fork and every blow are quiet, the guns and the saw are loud; the radius is the sim\'s own NOISE', () => {
  const w = world(hall());
  for (const id of ['arc', 'fork', 'fists', 'boathook', 'marlinspike', 'mallet', 'axe']) { w.player.weapon = id; const t = noiseTell(w); assert.equal(t.loud, false, id); assert.equal(t.label, 'QUIET'); assert.equal(t.radius, Math.round(WEAPONS[id].kind === 'melee' ? NOISE.melee : NOISE[id])); }
  for (const id of ['flare', 'scattergun', 'rivet', 'harpoon', 'carbine', 'linethrower', 'mortar', 'chainsaw']) { w.player.weapon = id; const t = noiseTell(w); assert.equal(t.loud, true, id); assert.equal(t.radius, NOISE[id]); assert.equal(t.label, 'LOUD'); }
  assert.equal(noiseRadius(w.map, 'arc'), 14); assert.equal(noiseRadius(w.map, 'flare'), 22);
});

test('an echo carries the loud ones further and leaves the quiet ones alone, as world.js noise() does; the tell says so', () => {
  const m = parseMap(hall({ atmosphere: { echo: 2 } })), w = createWorld(m, { seed: 1, difficulty: 'normal' });
  assert.equal(noiseRadius(m, 'flare'), 44); assert.equal(noiseRadius(m, 'arc'), 14, 'the quiet ones carry as they always did'); w.player.weapon = 'rivet'; assert.equal(noiseTell(w).radius, 40); assert.equal(noiseTell(w).loud, true); assert.ok(ECHO.loud === 16);
});

test('a dark place adds the light to the tell: how far the eyes of a creature notice you, unlit and lit', () => {
  const dark = { atmosphere: { dark: true }, lantern: { oil: 60 } }, w = world(hall(dark)); w.player.weapon = 'arc';
  let t = noiseTell(w); assert.deepEqual(t.light, { lit: false, sees: LANTERN.sightDark }); assert.equal(noiseHud(w).label, 'NOISE 14 M · DARK 6 M');
  step(w, idle({ lamp: true })); t = noiseTell(w); assert.deepEqual(t.light, { lit: true, sees: LANTERN.sightLit }); assert.equal(noiseHud(w).label, 'NOISE 14 M · LIT 24 M'); assert.equal(noiseHud(w).value, 'QUIET');
  assert.equal(noiseTell(world(hall())).light, null, 'an ordinary map says nothing of light'); assert.equal(noiseHud(world(hall())).label, 'NOISE 22 M');
});

test('the map field: noiseTell must be true or false; the parser reads it; no shipped map says it (so no shipped HUD or automap changes)', () => {
  assert.equal(validateMap(hall({ noiseTell: true })).ok, true); const v = validateMap(hall({ noiseTell: 'yes' })); assert.equal(v.ok, false); assert.ok(v.errors.some((e) => /noiseTell must be true or false/.test(e)));
  assert.equal(parseMap(hall({ noiseTell: true })).noiseTell, true); assert.equal(parseMap(hall()).noiseTell, false); assert.equal(shippedMap('C2M13').noiseTell, false); assert.equal(shippedMap('C1E1M01').noiseTell, false);
});

test('the automap model: a lever stays on the map once SEEN, red until thrown and green after; key doors carry their key colour; a sealed exit is marked sealed; the noise ring exists only where the map asks', () => {
  const m = shippedMap('C2M01'), w = createWorld(m, { seed: 1, difficulty: 'normal' }), sw = m.switches[0];
  step(w, idle()); assert.deepEqual(automapModel(w).switches, [], 'a lever not yet seen is not on the map');
  Object.assign(w.player, { x: sw.x, z: sw.z + 2.2 }); w.tick = 5; for (let i = 0; i < 6; i++) step(w, idle()); updateExplored(w);
  const a = automapModel(w); assert.equal(a.switches.length, 1, 'seen'); assert.equal(a.switches[0].used, false); assert.equal(a.switches[0].wall, sw.wallDir); assert.ok(Math.abs(a.switches[0].x - sw.x) < 1e-9);
  w.switchState = { ...(w.switchState ?? {}), [sw.id]: { used: true } }; assert.equal(automapModel(w).switches[0].used, true, 'green once thrown'); assert.equal(automapModel(w).noise, null, 'no ring on a map that does not ask');
  const q = loadMap('C1E1M01'), x = createWorld(q, { seed: 1, difficulty: 'normal' }); const door = q.doors.get('27,3'); Object.assign(x.player, { x: 25 * q.cell, z: 3.5 * q.cell }); x.tick = 5; for (let i = 0; i < 6; i++) step(x, idle()); updateExplored(x);
  const d = automapModel(x).doors.find((e) => e.cx === 27); assert.ok(d && d.key === 'brass' && d.keyColor === KEYS.brass.color, 'brass door in brass: ' + JSON.stringify(d)); assert.equal(door.key, 'brass');
  const n = world(hall({ noiseTell: true })); n.player.weapon = 'flare'; step(n, idle()); const nm = automapModel(n); assert.equal(nm.noise.r, 22); assert.ok(Math.abs(nm.noise.x - n.player.x) < 1e-9);
  const lock = parseMap(hall({ entities: [{ type: 'player', at: [3, 2], facing: 'east' }, { type: 'exit', at: [5, 2], locked: true }], triggers: [{ id: 'u', when: 'enter', at: [16, 2], radius: 1, do: [{ exit: { set: 'unlock' } }] }] })), lw = createWorld(lock, { seed: 1, difficulty: 'normal' });
  step(lw, idle()); updateExplored(lw); assert.equal(automapModel(lw).exits[0].locked, true, 'sealed'); lw.exitLocked.exit0 = false; assert.equal(automapModel(lw).exits[0].locked, false);
});

/** a stand-in DOM: every id is one element that remembers its text, its classes and whatever else is written to it; enough to run UI.hud for real */
function standInDom() {
  const els = new Map(), mk = (id) => { const classes = new Set(); const el = { id, textContent: '', innerHTML: '', value: '', checked: false, style: {}, dataset: {}, classes, onclick: null, oninput: null, onchange: null, onmousedown: null,
    classList: { toggle(c, on) { const want = on === undefined ? !classes.has(c) : !!on; want ? classes.add(c) : classes.delete(c); return want; }, add(...c) { c.forEach((x) => classes.add(x)); }, remove(...c) { c.forEach((x) => classes.delete(x)); }, contains: (c) => classes.has(c) } };
    Object.defineProperty(el, 'parentElement', { get() { return (el._p ??= mk(id + '^')); } }); Object.defineProperty(el, 'firstElementChild', { get() { return (el._c ??= mk(id + '>')); } }); return el; };
  globalThis.document = { getElementById: (id) => { if (!els.has(id)) els.set(id, mk(id)); return els.get(id); }, querySelectorAll: () => [], body: { dataset: {} }, createElement: () => mk('x') };
  return els;
}

test('UI.hud runs against a stand-in DOM: the noise stat is hidden where the map does not ask, and says QUIET or LOUD with the radius where it does', async () => {
  const els = standInDom(); let ui;
  try {
    const { UI } = await import('../src/game/ui.js'); ui = new UI(new Proxy({}, { get: () => () => {} }));
    const plain = world(hall()); ui.hud(plain, true); assert.equal(els.get('hud-noise').classes.has('hidden'), true, 'no tell on a map that does not ask');
    const w = world(hall({ noiseTell: true })); w.player.weapon = 'flare'; ui.hud(w, true); const el = els.get('hud-noise'); assert.equal(el.classes.has('hidden'), false); assert.equal(els.get('hud-noise-v').textContent, 'LOUD'); assert.equal(els.get('hud-noise-label').textContent, 'NOISE 22 M'); assert.equal(el.classes.has('loud'), true);
    w.player.weapon = 'arc'; ui.hud(w, true); assert.equal(els.get('hud-noise-v').textContent, 'QUIET'); assert.equal(el.classes.has('loud'), false); assert.equal(els.get('hud-noise-label').textContent, 'NOISE 14 M');
    const dk = world(hall({ noiseTell: true, atmosphere: { dark: true }, lantern: { oil: 60 } })); dk.player.weapon = 'fork'; ui.hud(dk, true); assert.equal(els.get('hud-noise-label').textContent, 'NOISE 12 M · DARK 6 M'); assert.equal(els.get('hud-lamp').classes.has('hidden'), false);
  } finally { delete globalThis.document; }
});

test('drawAutomap runs against a stand-in canvas with a lever, a sealed exit, a key door and the noise ring in the model (every call it makes exists on a 2D context)', async () => {
  const { drawAutomap } = await import('../src/game/automap.js'); const calls = new Map();
  const ctx = new Proxy({}, { get: (o, k) => (k in o ? o[k] : (...a) => { calls.set(k, (calls.get(k) ?? 0) + 1); }), set: (o, k, v) => { o[k] = v; return true; } }), canvas = { width: 0, height: 0, getContext: () => ctx };
  globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
  try {
    const q = loadMap('C1E1M01'), x = createWorld(q, { seed: 1, difficulty: 'normal' }); Object.assign(x.player, { x: 25 * q.cell, z: 3.5 * q.cell }); x.tick = 5; for (let i = 0; i < 6; i++) step(x, idle()); updateExplored(x);
    const model = automapModel(x); model.switches = [{ x: 30, z: 7, wall: 'north', used: false }, { x: 34, z: 7, wall: 'south', used: true }]; model.noise = { x: x.player.x, z: x.player.z, r: 22 }; model.exits = [{ x: 60, z: 7, locked: true }];
    drawAutomap(canvas, model); assert.equal(canvas.width, 1280); assert.ok(calls.get('arc') >= 1, 'the noise ring'); assert.ok(calls.get('setLineDash') >= 2, 'dashed and reset'); assert.ok((calls.get('rect') ?? 0) >= 2, 'the levers'); assert.ok(calls.get('fillText') >= 3);
    delete model.noise; delete model.switches; drawAutomap(canvas, model);                 // a model from before this batch (a save, a test fixture) still draws
  } finally { delete globalThis.innerWidth; delete globalThis.innerHeight; }
});
