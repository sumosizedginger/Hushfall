// PT-056 / PT-057: where the ammunition loads and the weapon mods lie on the shipped maps. The Director's law: rewards live OFF the road, for people who look (a mod is never on the lane the routes walk); a load cache may be on it where the plan says so (Cold Dock).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { shippedSrc, shippedMap, ROOT } from './helpers.js';
import { analyseReach } from '../src/engine/reach.js';
import { MOD_ORDER, PICKUPS } from '../src/engine/defs.js';

const MODS_AT = { mod_spinup: 'C1E3M06', mod_longchain: 'C1E4M05', mod_doublebarrel: 'C2M01', mod_barbed: 'C2M09', mod_phosphor: 'C2M13', mod_airburst: 'C2M21' };
const LOADS_AT = { C1E2M04: ['ld_slag_scattergun', 'ld_slag_rivet'], C1E2S01: ['ld_rime_scattergun', 'ld_rime_harpoon', 'ld_rime_flare'], C1E4M02: ['ld_pen_rivet', 'ld_pen_harpoon', 'ld_pen_carbine'], C1E4M03: ['ld_rime_scattergun', 'ld_rime_flare'] };
const kindsOn = (id) => shippedSrc(id).entities.filter((e) => e.type === 'pickup').map((e) => e.kind);

test('every mod lies on exactly one map, once, and no other map has one', () => {
  assert.deepEqual(Object.keys(MODS_AT).sort(), MOD_ORDER.map((m) => 'mod_' + m).sort());
  const all = fs.readdirSync(path.join(ROOT, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  for (const id of all) { const mods = kindsOn(id).filter((k) => PICKUPS[k]?.type === 'mod'); assert.deepEqual(mods, Object.entries(MODS_AT).filter(([, m]) => m === id).map(([k]) => k), `${id}: its mods`); }
});
test('a mod is off the road: its cell is not in the traffic of any route of its map (the lane file, in the map source\'s frame; none of these maps is squeezed)', () => {
  for (const [kind, id] of Object.entries(MODS_AT)) {
    const e = shippedSrc(id).entities.find((q) => q.type === 'pickup' && q.kind === kind), lane = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'maps-src/lanes', id + '.json'), 'utf8')));
    assert.ok(e, kind); assert.equal(lane.has(e.at.join(',')), false, `${kind} on ${id} at ${e.at} is on the road`);
  }
});
test('the load caches are where the plan puts them, and every pickup on these maps can be reached on foot', () => {
  for (const [id, kinds] of Object.entries(LOADS_AT)) { const have = kindsOn(id).filter((k) => PICKUPS[k]?.type === 'load'); assert.deepEqual(have.sort(), [...kinds].sort(), `${id}: its loads`); }
  for (const id of [...Object.values(MODS_AT), ...Object.keys(LOADS_AT)]) { const r = analyseReach(shippedMap(id)); assert.deepEqual(r.unreachable, [], `${id}: nothing unreachable`); }
});
