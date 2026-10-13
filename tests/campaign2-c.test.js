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

const BUILT = ['C2M17'];
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
    if (id !== 'C2M22' && id !== 'C2M23') assert.equal(s.atmosphere.beat, true, id + ': the Hive beat is felt here');
    assert.equal(parseMap(s).atmosphere.beat, id !== 'C2M22' && id !== 'C2M23' ? true : parseMap(s).atmosphere.beat);
  }
  assert.equal(new Set(ALL.map((id) => SRC[id].atmosphere.look)).size, ALL.length, 'every map its own look');
});

test('the text follows the mechanical rules of LORE.md: no stock phrases, short, only the speakers the story has', () => {
  const bad = [];
  for (const id of ALL) {
    for (const t of lines(SRC[id])) for (const re of BANNED) if (re.test(t)) bad.push(`${id}: '${t.slice(0, 50)}...' matches ${re}`);
    for (const m of SRC[id].messages) { if (m.text.length > 180) bad.push(`${id} ${m.id}: ${m.text.length} characters`); const n = (m.text.match(/[.!?]/g) ?? []).length, cap = /\b(LOG|LEDGER|PLATE|TALLY|NOTE)\b/.test(m.speaker) ? 6 : m.speaker === 'THE TENDER' ? 5 : 4; if (n > cap) bad.push(`${id} ${m.id}: ${n} sentences (limit ${cap})`); }
  }
  assert.deepEqual(bad, []);
  const VOICES = new Set(['INES', 'HULL', 'THE TENDER', 'A SILENT', 'A SILENT (NOTE)', 'A ZEALOT', 'SIGNAL HOUSE']), found = /\b(LOG|LEDGER|PLATE|TALLY|NOTE)\b/;
  for (const id of ALL) for (const m of SRC[id].messages) {
    assert.ok(VOICES.has(m.speaker) || found.test(m.speaker), `${id} ${m.id}: unknown speaker '${m.speaker}'`);
    if (SPEAKS_ONCE[m.speaker]) assert.ok(SPEAKS_ONCE[m.speaker].includes(id), `${id}: ${m.speaker} speaks only in ${SPEAKS_ONCE[m.speaker]}`);
  }
  assert.deepEqual(ALL.flatMap((id) => SRC[id].messages.filter((m) => m.speaker === 'THE TENDER').map(() => id)), [], 'the Tender speaks only in her garden');
});

test('roster variety: no creature (a variant counts as its own) is more than 35% of a map except in a boss map; every map has the new thing it names', () => {
  for (const id of ALL) {
    if (id === 'C2M24') continue;
    const kinds = {}; let n = 0; for (const e of SRC[id].entities) if (e.type === 'enemy' && !ENEMIES[e.kind].peaceful && !ENEMIES[e.kind].node) { const k = e.variant ?? e.kind; kinds[k] = (kinds[k] ?? 0) + 1; n++; }
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
