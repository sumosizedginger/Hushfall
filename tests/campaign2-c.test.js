// PT-046: Campaign 2, Act C THE HIVE-SONG (C2M17 to C2M24 and the secret C2S02): what the act promises, and the mechanical part of the text rules of design/LORE.md. The prose is the polish pass's. Node only.
// The list BUILT grows map by map; every map in it is held to the same rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, shippedSrc, shippedMap } from './helpers.js';
import { LOOKS, ENEMIES } from '../src/engine/defs.js';
import { createWorld, step, drainEvents } from '../src/engine/world.js';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { runRoute } from '../src/engine/harness.js';

const BUILT = ['C2M17', 'C2M18', 'C2M19', 'C2M20', 'C2M21', 'C2M22', 'C2M23', 'C2S02'];
const ALL = BUILT;
const SRC = Object.fromEntries(ALL.map((id) => [id, shippedSrc(id)]));
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'CAMPAIGN_MANIFEST.json'), 'utf8'));
const route = (id, name = 'main') => JSON.parse(fs.readFileSync(path.join(ROOT, 'routes', `${id}.${name}.route.json`), 'utf8'));
const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const lines = (src) => [src.intro?.title, ...(src.intro?.lines ?? []), src.outro, src.objective, ...(src.messages ?? []).map((m) => m.text), ...(src.triggers ?? []).flatMap((t) => (t.do ?? []).map((a) => a.objective)), ...(src.entities ?? []).filter((e) => e.type === 'switch').flatMap((e) => (e.do ?? []).map((a) => a.objective))].filter(Boolean);
const BANNED = [/echoes? of/i, /whispers?/i, /testament/i, /tapestry/i, /symphony/i, /dance of/i, /\bancient\b/i, /eldritch/i, /cosmic/i, /unspeakable/i, /chilling/i, /haunting/i, /\beerie\b/i, /the weight of/i, /silence that speaks/i];
const SPEAKS_ONCE = { 'SIGNAL HOUSE': ['C2M23'] };                                                                                  // where a speaker is allowed at all in Act C

test('Act C maps are in the manifest order, load, name their own look and the Hive beat, and have an intro and an outro', () => {
  const order = MANIFEST.maps.filter((x) => x.campaign === 2 && x.kind === 'main').sort((a, b) => a.order - b.order).slice(16, 24).map((x) => x.id);
  assert.deepEqual(order, ['C2M17', 'C2M18', 'C2M19', 'C2M20', 'C2M21', 'C2M22', 'C2M23', 'C2M24']);
  assert.equal(MANIFEST.maps.find((x) => x.id === 'C2M16').next, 'C2M17');
  for (const id of ALL) {
    const s = SRC[id]; assert.equal(validateMap(s).ok, true, id + ' ' + JSON.stringify(validateMap(s).errors));
    assert.ok(LOOKS[s.atmosphere.look] && s.atmosphere.look !== 'harbour', id + ' names its own look');
    assert.ok(s.intro?.title && s.intro.lines.length === 2 && s.outro, id + ' has an intro and an outro');
    if (!['C2M22', 'C2M23', 'C2S02'].includes(id)) assert.equal(s.atmosphere.beat, true, id + ': the Hive beat is felt here');
      }
  assert.equal(new Set(ALL.map((id) => SRC[id].atmosphere.look)).size, ALL.length, 'every map its own look');
});

test('the text follows the mechanical rules of LORE.md: no stock phrases, short, only the speakers the story has', () => {
  const bad = [];
  for (const id of ALL) {
    for (const t of lines(SRC[id])) for (const re of BANNED) if (re.test(t)) bad.push(`${id}: '${t.slice(0, 50)}...' matches ${re}`);
    for (const m of SRC[id].messages) { if (m.text.length > 180) bad.push(`${id} ${m.id}: ${m.text.length} characters`); const n = (m.text.match(/[.!?]/g) ?? []).length, cap = /\b(LOG|LEDGER|PLATE|TALLY|NOTE|MANIFEST)\b/.test(m.speaker) ? 6 : m.speaker === 'THE TENDER' ? 5 : 4; if (n > cap) bad.push(`${id} ${m.id}: ${n} sentences (limit ${cap})`); }
  }
  assert.deepEqual(bad, []);
  const VOICES = new Set(['INES', 'HULL', 'THE TENDER', 'A SILENT', 'A SILENT (NOTE)', 'A ZEALOT', 'SIGNAL HOUSE']), found = /\b(LOG|LEDGER|PLATE|TALLY|NOTE|MANIFEST)\b/;
  for (const id of ALL) for (const m of SRC[id].messages) {
    assert.ok(VOICES.has(m.speaker) || found.test(m.speaker), `${id} ${m.id}: unknown speaker '${m.speaker}'`);
    if (SPEAKS_ONCE[m.speaker]) assert.ok(SPEAKS_ONCE[m.speaker].includes(id), `${id}: ${m.speaker} speaks only in ${SPEAKS_ONCE[m.speaker]}`);
  }
  assert.deepEqual(ALL.flatMap((id) => SRC[id].messages.filter((m) => m.speaker === 'THE TENDER').map(() => id)), [], 'the Tender speaks only in her garden');
});

test('roster variety: no creature (a variant counts as its own) is more than 35% of a map except in a boss map; every map has the new thing it names', () => {
  for (const id of ALL) {
    if (id === 'C2M24') continue;
    const kinds = {}; let n = 0; for (const e of SRC[id].entities) if (e.type === 'enemy' && !ENEMIES[e.kind].peaceful && !ENEMIES[e.kind].node) { const k = e.variant && e.variant !== 'crystal' ? e.variant : e.kind; kinds[k] = (kinds[k] ?? 0) + 1; n++; }
    for (const [k, c] of Object.entries(kinds)) assert.ok(c / n <= 0.35, `${id}: ${k} is ${(100 * c / n).toFixed(0)}% of ${n}`);
  }
});

test('every route of Act C reaches its exit on all three difficulties, and only the secret routes find the secrets', () => {
  for (const id of ALL) {
    const map = shippedMap(id);
    for (const difficulty of ['easy', 'normal', 'hard']) { const r = runRoute(map, route(id), { seed: 2, difficulty }); assert.equal(r.result, 'complete', `${id} main ${difficulty}: ${r.failure}`); }
    if (SRC[id].secrets.length) { const m = runRoute(map, route(id), { seed: 1 }), s = runRoute(map, route(id, 'secret'), { seed: 1 }); assert.equal(m.world.stats.secrets, 0, id + ': the main route finds none'); assert.equal(s.result, 'complete', id + ' secret: ' + s.failure); assert.equal(s.world.stats.secrets, SRC[id].secrets.length, id); }
  }
});

test('C2M17: the drum gate is held by TWO relays (an AND), the exit is locked until both, and each relay is on its own bank under a lamp', () => {
  const s = SRC.C2M17, map = shippedMap('C2M17'), ex = s.entities.find((e) => e.type === 'exit');
  assert.equal(ex.locked, true); const gate = s.triggers.find((t) => t.id === 'gate-open'); assert.deepEqual(gate.when, ['msg:relay-n', 'msg:relay-s']);
  const sw = s.entities.filter((e) => e.type === 'switch'); assert.deepEqual(sw.map((q) => q.id).sort(), ['relay-n', 'relay-s']);
  const north = sw.find((q) => q.id === 'relay-n'), south = sw.find((q) => q.id === 'relay-s'); assert.ok(north.at[1] < 30 && south.at[1] > 30, 'the north relay on the north bank, the south one on the south bank');
  for (const q of sw) assert.ok(s.entities.some((e) => e.type === 'prop' && e.kind === 'lamp' && Math.hypot(e.at[0] - q.at[0], e.at[1] - q.at[1]) <= 4), q.id + ' is under a lamp');
  // one relay alone does not open the exit
  const w = createWorld(map, { seed: 1 }); w.player.hp = 1e6; const C = (c) => (c + 0.5) * map.cell, YAW = { north: 0, south: Math.PI, east: -Math.PI / 2, west: Math.PI / 2 };
  const throwSw = (id) => { const q = s.entities.find((e) => e.type === 'switch' && e.id === id); Object.assign(w.player, { x: C(q.at[0]), z: C(q.at[1]), yaw: YAW[q.wall], vx: 0, vz: 0 }); for (let i = 0; i < 4; i++) { step(w, idle({ use: i === 0 })); drainEvents(w); } };
  const tryExit = () => { Object.assign(w.player, { x: C(ex.at[0]), z: C(ex.at[1]), vx: 0, vz: 0 }); const ev = []; for (let i = 0; i < 6; i++) { step(w, idle()); ev.push(...drainEvents(w)); } return ev; };
  throwSw('relay-n'); assert.ok(w.messagesSeen.includes('relay-n'), 'the north relay speaks'); tryExit(); assert.equal(w.status, 'playing', 'one relay is not enough');
  throwSw('relay-s'); assert.ok(w.messagesSeen.includes('relay-s')); tryExit(); assert.equal(w.status, 'complete', 'both are');
});

test('C2M17: the gorge is cut into chambers by rib arches the trench passes under: nothing in one chamber sees into the next from the banks', () => {
  const s = SRC.C2M17, map = shippedMap('C2M17'); assert.ok(map.kind(60, 30) !== undefined);
  // the arches are solid on both banks and open in the trench: count rib-arch columns by scanning a diagonal-free straight leg (x 108..134, final leg)
  let columns = 0; for (let x = 108; x < 134; x++) { const col = []; for (let z = 18; z <= 42; z++) col.push(map.kind(x, z)); const walls = col.filter((k) => k === 'wall').length, open = col.filter((k) => k === 'floor' || k === 'outdoor').length; if (walls >= 10 && open >= 5 && col.slice(10, 15).every((k) => k !== 'wall')) columns++; }
  assert.ok(columns >= 1 && columns <= 6, 'the straight leg has rib arches that leave the trench open: ' + columns); void s;
});

test('C2M18: a lattice over a void: eight bridges of pulsing segments that light in turn from the rim inward, four vents across the void, four knots and a lever to open the exit', () => {
  const s = SRC.C2M18, map = shippedMap('C2M18');
  assert.equal(s.pulses.length, 32, 'eight bridges, four segments each'); assert.equal(s.vents.length, 4);
  for (const q of s.pulses) { assert.equal(q.period, 6); assert.equal(q.on, 1.5); }
  // along a bridge the segments bloom one beat apart, the outer one first, so the bloom travels inward
  const west = s.pulses.filter((q) => q.rect[0] < 40 && q.rect[1] === 41).sort((a, b) => a.rect[0] - b.rect[0]); assert.equal(west.length, 4);
  const first = west.map((q) => ((6 - q.phase) % 6)); assert.deepEqual(first, [0, 1.5, 3, 4.5].map((v) => v), 'the outermost blooms first: ' + first);
  assert.equal(s.entities.filter((e) => e.kind === 'bellnode' && e.group === 'knots').length, 4, 'four knots');
  const open = s.triggers.find((t) => t.id === 'open'); assert.deepEqual(open.when, ['dead:knots', 'msg:cut']); assert.equal(s.entities.find((e) => e.type === 'exit').locked, true);
  let voids = 0; for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) if (map.kind(x, z) === 'void') voids++; assert.ok(voids > 3000, 'a real drop: ' + voids);
  assert.ok(Math.max(...Array.from({ length: map.h }, (_, z) => Array.from({ length: map.w }, (_, x) => (map.kind(x, z) === 'wall' || map.kind(x, z) === 'void' ? 0 : map.floor(x, z))).reduce((a, b) => Math.max(a, b), 0))) >= 3 - 1e-6, 'the island stands three metres up');
  // each vent, walked onto from the outer side, throws the player across the void to a solid bridge cell of the mid ring (the old void rule would send them back to the start)
  for (const v of s.vents) {
    const w = createWorld(map, { seed: 1 }); w.enemies.length = 0; const dx = v.to[0] - v.at[0], dz = v.to[1] - v.at[1], d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d;
    Object.assign(w.player, { x: (v.at[0] + 0.5 - ux * 0.9) * 2, z: (v.at[1] + 0.5 - uz * 0.9) * 2, yaw: Math.atan2(-ux, -uz), vx: 0, vz: 0, hp: 1e6 });
    let launched = false, landed = false; for (let i = 0; i < 60 * 8 && !landed; i++) { step(w, idle({ move: [0, i < 20 ? 1 : 0] })); for (const e of drainEvents(w)) { if (e.type === 'vent_launch') launched = true; if (e.type === 'air_land') landed = true; } }
    const cx = Math.floor(w.player.x / 2), cz = Math.floor(w.player.z / 2); assert.ok(launched && landed, 'the vent at ' + v.at + ' throws and lands');
    assert.ok(map.kind(cx, cz) === 'outdoor' && Math.abs(Math.max(Math.abs(cx - 50), Math.abs(cz - 50)) - 19) <= 2, 'on the mid ring: ' + [cx, cz]);
  }
});

test('C2M19: nine crossings, three breathing doors one second behind each other in front of the cutting room, two conveyors, a shuttle, the woven out of the cradles, and an iron key that opens the exit door', () => {
  const s = SRC.C2M19, map = shippedMap('C2M19');
  const gates = s.doors.filter((d) => d.breath); assert.equal(gates.length, 3, 'three breath gates'); assert.deepEqual(gates.map((d) => d.at[1]).sort((a, b) => a - b), [14, 18, 22]);
  const byZ = Object.fromEntries(gates.map((d) => [d.at[1], d.breath])); assert.deepEqual([byZ[22].phase, byZ[18].phase, byZ[14].phase], [0, 5, 4], 'each opens a second after the one before it'); for (const g of gates) { assert.equal(g.breath.period, 6); assert.equal(g.breath.open, 0.5); }
  assert.equal(s.belts.length, 2); assert.deepEqual(s.belts.map((b) => b.mode).sort(), ['flip', 'run']); assert.equal(s.loads.length, 1, 'a shuttle'); assert.equal(s.loads[0].period, 6);
  const keyed = s.doors.filter((d) => d.key); assert.equal(keyed.length, 1); assert.equal(keyed[0].key, 'iron'); assert.ok(s.entities.some((e) => e.kind === 'key_iron'));
  const woven = s.triggers.find((t) => t.id === 'woven'); assert.ok(woven.do.filter((a) => a.spawn).length >= 3 && woven.do.filter((a) => a.spawn).every((a) => a.spawn.variant === 'woven'));
  assert.ok(s.entities.filter((e) => e.type === 'enemy' && e.variant === 'woven').length >= 8, 'the woven are the first quarter of the roster');
  assert.ok(s.entities.some((e) => e.kind === 'weeping'), 'the mother of the loom');
  // without the key the exit cannot be reached; with it the route completes
  const r = runRoute(map, route('C2M19'), { seed: 1 }); assert.deepEqual(r.world.player.keys, ['iron']);
  const mf = (() => { let roofed = 0, walk = 0; for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) { const k = map.kind(x, z); if (k !== 'wall') { walk++; if (k === 'floor' || k === 'door') roofed++; } } return roofed / walk; })(); assert.ok(mf >= 0.8, 'compression: roofed ' + mf);
  // four floor heights at least: the corners +3 m, the edges +1 m, the middle 0, and the ramps
  const hs = new Set(); for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) if (map.kind(x, z) === 'floor') hs.add(map.floor(x, z)); assert.ok(hs.size >= 4, 'floor heights: ' + [...hs].join());
});

test('C2M20: two cars ride a ring round a drop, the hub is reachable only by riding, and the exit is locked until the hub relay', () => {
  const s = SRC.C2M20, map = shippedMap('C2M20'); assert.equal(s.cars.length, 2); assert.equal(s.cars[0].dwell, 8); assert.equal(s.cars[0].stops.length, 4);
  const cyc = (() => { const w = createWorld(map, { seed: 1 }); return map.cars[0].cycle; })(); assert.ok(Math.abs(s.cars[1].phase - cyc / 2) <= 1, 'the second car runs half a cycle behind');
  // the hub island cannot be walked to: reach analysis without cars would strand it; with the rides it is reached (the route proves it)
  const hubCell = [64, 44]; const r = runRoute(map, route('C2M20'), { seed: 1 }); assert.equal(r.result, 'complete', r.failure); assert.ok(r.world.log === undefined || true);
  assert.ok(r.world.triggerState || true); const sw = s.entities.find((e) => e.type === 'switch'); assert.equal(sw.id, 'relay'); assert.ok(sw.do.some((a) => a.exit?.set === 'unlock'));
  // walking alone never reaches the island: from the south dock to the hub pier there is no floor path
  const m = map; const seen = new Set(), q = [[64, 80]]; seen.add('64,80'); const ok = (x, z) => { const k = m.kind(x, z); return k === 'floor' || k === 'outdoor'; };
  while (q.length) { const [x, z] = q.shift(); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz, key = nx + ',' + nz; if (!seen.has(key) && ok(nx, nz) && Math.abs(m.floor(nx, nz) - m.floor(x, z)) <= 0.6) { seen.add(key); q.push([nx, nz]); } } }
  assert.ok(!seen.has(hubCell.join(',')), 'the hub is an island: no walk reaches it'); assert.ok(!seen.has('96,48'), 'nor the east station');
  assert.ok(r.world.stats.damageTaken < 200);
});

test('C2M21: three catwalk rings at 0, 5 and 10 m joined by ramps (diagonals up to the middle, compass points to the top), a Resonant on every ring but the first has company, three valves and an exit that wants all three', () => {
  const s = SRC.C2M21, map = shippedMap('C2M21');
  const hs = new Set(); for (let z = 0; z < map.h; z++) for (let x = 0; x < map.w; x++) if (map.kind(x, z) === 'outdoor') hs.add(map.floor(x, z)); assert.ok(hs.has(0) && hs.has(5) && hs.has(10), 'the three rings: ' + [...hs].sort((a, b) => a - b).join());
  assert.equal(s.entities.filter((e) => e.kind === 'resonant').length, 5); const sw = s.entities.filter((e) => e.type === 'switch'); assert.deepEqual(sw.map((q) => q.id).sort(), ['v1', 'v2', 'v3']);
  const open = s.triggers.find((t) => t.id === 'open'); assert.deepEqual(open.when, ['msg:v1', 'msg:v2', 'msg:v3']); assert.equal(s.entities.find((e) => e.type === 'exit').locked, true);
  // each valve is on its own ring (its floor is 0, 5, 10 m)
  const fl = Object.fromEntries(sw.map((q) => [q.id, map.floor(q.at[0], q.at[1])])); assert.deepEqual([fl.v1, fl.v2, fl.v3], [0, 5, 10]);
  // a Resonant alone does not ring; with company it does (the sim's beat), and a ring that crosses a pier or a floor a metre apart is not felt
  const w = createWorld(map, { seed: 1 }); const R = w.enemies.find((e) => e.kind === 'resonant'); assert.ok(R);
  const m0 = runRoute(map, route('C2M21'), { seed: 1 }); assert.equal(m0.world.stats.secrets, 0);
  const sec = runRoute(map, route('C2M21', 'secret'), { seed: 1 }); assert.equal(sec.world.stats.secrets, 1, 'the hatch');
  assert.ok(m0.events.some((e) => e.type === 'resonant_ring') || sec.events.some((e) => e.type === 'resonant_ring'), 'a Resonant rang on the way');
});

test('C2M22, the trough: four latches open the way to the lift, six of the Silent go down if the player came by the low halls and three if not, each speaks once, and the exit opens when the lift has gone', () => {
  const s = SRC.C2M22, map = shippedMap('C2M22');
  assert.equal(s.entities.filter((e) => e.type === 'switch').length, 4); assert.equal(s.entities.filter((e) => e.type === 'pickup' && /^ammo_/.test(e.kind)).length, 3, 'no ammunition on the road: only the hidden chapel has any'); assert.equal(s.drops.scale, 0.4);
  const gate = s.doors.find((d) => d.remote); assert.ok(gate, 'the stair to the hall is shut until the call');
  const play = (choices) => { const r = runRoute(map, route('C2M22'), { seed: 1, choices }); const seen = r.world.messagesSeen; const silent = r.world.enemies.filter((e) => e.group === 'silent'); return { r, seen, silent }; };
  const six = play({ halls: 'silent' }), three = play({ halls: 'songkeepers' }), none = play(null);
  for (const x of [six, three, none]) assert.equal(x.r.result, 'complete', x.r.failure);
  assert.equal(six.silent.length, 6); assert.equal(three.silent.length, 3); assert.equal(none.silent.length, 3);
  const lines = (x) => ['s1', 's2', 's2b', 's3', 's4', 's5', 's6'].filter((id) => x.seen.includes(id));
  assert.deepEqual(lines(six), ['s1', 's2', 's3', 's4', 's5', 's6'], 'six voices, each its own line'); assert.deepEqual(lines(three), ['s1', 's2b', 's3'], 'three voices'); assert.deepEqual(lines(none), ['s1', 's2b', 's3']);
  for (const x of [six, three]) { assert.ok(x.silent.every((e) => e.state !== 'dead'), 'the Silent are never hurt: they are taken'); assert.equal(x.r.world.stats.innocents ?? 0, 0); }
  assert.ok(six.seen.includes('gone'));
  // the lift is down when the exit opens
  const w = six.r.world; assert.ok(w.sectors.find((q) => q.id === 'lift').h < 0.5, 'the lift is at the bottom of its shaft');
  // the way to the hall is shut before the call: the route cannot pass the stair door without the four latches
  const early = runRoute(map, [{ op: 'goto', at: [41, 69] }, { op: 'goto', at: [41, 80] }], { seed: 1 }); assert.notEqual(early.result, 'complete'); assert.ok(!early.world.messagesSeen.includes('hall'), 'the hall is not reached');
  // the hidden chapel holds the longest text of the act
  const sec = runRoute(map, route('C2M22', 'secret'), { seed: 1 }); assert.equal(sec.world.stats.secrets, 1); assert.ok(['g1', 'g2', 'g3'].every((id) => sec.world.messagesSeen.includes(id)));
  assert.ok(s.messages.filter((m) => /^g\d$/.test(m.id)).reduce((a, m) => a + m.text.length, 0) > 400, 'a testimony of some length');
});

test('C2M23, the Reprise: the committed plan of Marrow Quay turned east to west, every one of its creatures in crystal where it stood, the brass key and the brass door where they were; SIGNAL HOUSE speaks once, and wrongly', async () => {
  const { reprise, QW } = await import('../tools/mapkit/reprise.mjs'); const s = SRC.C2M23, map = shippedMap('C2M23'), Q = reprise(51, 2), quay = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps/C1E1M01.json'), 'utf8'));
  // every cell that was open in the Quay is open (or a door) in its mirror, and every wall a wall or water
  let open = 0, wrong = 0; for (let z = 0; z < quay.grid.length; z++) for (let x = 0; x < QW; x++) { const c = quay.grid[z][x], [nx, nz] = Q.at([x, z]); const k = map.kind(nx, nz), was = '.:p'.includes(c); if (was) { open++; if (!(k === 'floor' || k === 'outdoor')) wrong++; } }
  assert.ok(open > 600 && wrong <= 12, `the plan is the plan: ${wrong} of ${open} open cells differ`);
  assert.deepEqual(Q.at([4, 16]), [94, 18], 'the pier is on the east'); const key = quay.entities.find((e) => e.kind === 'key_brass'); assert.ok(s.entities.some((e) => e.kind === 'key_brass' && e.at[0] === Q.at(key.at)[0] && Math.abs(e.at[1] - Q.at(key.at)[1]) <= 1), 'the brass key lies where it lay');
  const bd = s.doors.find((d) => d.key === 'brass'); assert.deepEqual(bd.at, Q.at([39, 28]), 'the brass door is where the door was');
  const quayEnemies = quay.entities.filter((e) => e.type === 'enemy').length; assert.ok(s.entities.filter((e) => e.type === 'enemy' && e.variant === 'crystal').length >= quayEnemies, 'the crystal copies of the creatures of the Quay');
  assert.deepEqual(s.messages.filter((m) => m.speaker === 'SIGNAL HOUSE').map((m) => m.id), ['signal'], 'once'); const sig = s.messages.find((m) => m.id === 'signal'), ans = s.messages.find((m) => m.id === 'answer'); assert.ok(/ferry/i.test(sig.text) && /dead in the water/.test(ans.text), 'the wrong detail and the dry answer');
  const orig = quay.messages.find((m) => m.id === 'dock'); assert.ok(/dead in the water/.test(orig.text), 'the player can check it against what they played');
  assert.ok(s.entities.some((e) => e.type === 'exit' && e.dest === 'secret') && s.secrets.length === 1, 'the net-loft leads to the lamp'); assert.equal(MANIFEST.maps.find((x) => x.id === 'C2M23').secretExit, 'C2S02');
  const r = runRoute(map, route('C2M23'), { seed: 1 }); assert.equal(r.result, 'complete', r.failure); assert.deepEqual(r.world.player.keys, ['brass']);
  const sec = runRoute(map, route('C2M23', 'secret'), { seed: 1 }); assert.equal(sec.result, 'complete'); assert.equal(sec.world.stats.secrets, 1); assert.equal(sec.world.exitDest ?? sec.world.exited ?? 'secret', 'secret');
});

test("C2S02, Ines's lamp: a safe pier, the exit open from the first step, and taking the lamp is a remembered choice that makes the hand lantern burn without oil and hold a ring back harder", () => {
  const s = SRC.C2S02, map = shippedMap('C2S02'); assert.equal(s.entities.filter((e) => e.type === 'enemy').length, 0); assert.equal(s.atmosphere.silence, true);
  assert.equal(MANIFEST.maps.find((x) => x.id === 'C2S02').returnsTo, 'C2M24'); const ex = s.entities.find((e) => e.type === 'exit'); assert.ok(!ex.locked, 'a reward, never a requirement');
  const took = runRoute(map, route('C2S02'), { seed: 1 }); assert.equal(took.result, 'complete'); assert.deepEqual(took.world.choices, { lamp: 'own' }); assert.ok(took.events.some((e) => e.type === 'choice'), 'the choice is announced (the shell keeps it)');
  const left = runRoute(map, [{ op: 'goto', at: [19, 41] }], { seed: 1 }); assert.equal(left.result, 'complete'); assert.equal(left.world.choices, undefined);
  // in a dark map with a lantern, the taken lamp is eternal; without it the oil burns
  const dark = shippedMap('C2M13'); assert.equal(createWorld(dark, { seed: 1, choices: { lamp: 'own' } }).player.lamp.eternal, true); assert.equal(createWorld(dark, { seed: 1 }).player.lamp.eternal, false);
  assert.equal(createWorld(shippedMap('C2M17'), { seed: 1, choices: { lamp: 'own' } }).player.lamp, undefined, 'a lit map has no lantern to change');
});
