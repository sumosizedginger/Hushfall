// A06: fuzz validateMap / parseMap / analyseReach with mutated copies of the shipped maps. validateMap is documented as "never throws".
// Reports mutations that THROW, HANG (>3 s) or that are ACCEPTED although the map is unwinnable. Run: node review/gate-2/audit/repro/a06_validator_fuzz.mjs
import fs from 'node:fs';
import { validateMap, parseMap } from '../../../../src/engine/mapformat.js';
import { analyseReach } from '../../../../src/engine/reach.js';
const load = (id) => JSON.parse(fs.readFileSync(`maps/${id}.json`, 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));
const M = {
  'grid[0] = null': (m) => { m.grid[0] = null; },
  'grid[0] = 42': (m) => { m.grid[0] = 42; },
  'grid = "abc"': (m) => { m.grid = 'abc'; },
  'grid row shorter': (m) => { m.grid[3] = m.grid[3].slice(1); },
  'doors = [null]': (m) => { m.doors = [null]; },
  'doors = "x"': (m) => { m.doors = 'x'; },
  'entities = [null]': (m) => { m.entities = [null]; },
  'entities = {}': (m) => { m.entities = {}; },
  'entity.at = null': (m) => { m.entities[0].at = null; },
  'secrets[0].cells = [null]': (m) => { m.secrets = [{ id: 's', panel: [1, 1], cells: [null] }]; },
  'secrets = [{}]': (m) => { m.secrets = [{}]; },
  'sectors = "x"': (m) => { m.sectors = 'x'; },
  'sectors = [null]': (m) => { m.sectors = [null]; },
  'sector.cells = [5]': (m) => { m.sectors = [{ id: 'a', cells: [5], low: 0, high: 1 }]; },
  'sector.cells = [[NaN,NaN]]': (m) => { m.sectors = [{ id: 'a', cells: [[NaN, NaN]], low: 0, high: 1 }]; },
  'sector low=high': (m) => { m.sectors = [{ id: 'a', cells: [[4, 4]], low: 1, high: 1 }]; },
  'triggers = [null]': (m) => { m.triggers = [null]; },
  'trigger.do = [null]': (m) => { m.triggers = [{ id: 't', when: 'start', do: [null] }]; },
  'trigger.do = [{open: null}]': (m) => { m.triggers = [{ id: 't', when: 'start', do: [{ open: null }] }]; },
  'trigger.when = 12': (m) => { m.triggers = [{ id: 't', when: 12, do: [{ shake: 1 }] }]; },
  'messages = [null]': (m) => { m.messages = [null]; },
  'scenery = [null]': (m) => { m.scenery = [null]; },
  'closets = [null]': (m) => { m.closets = [null]; },
  'cellSize = 0': (m) => { m.cellSize = 0; },
  'cellSize = -2': (m) => { m.cellSize = -2; },
  'cellSize = "big"': (m) => { m.cellSize = 'big'; },
  'ceilingHeight = NaN (via null)': (m) => { m.ceilingHeight = null; },
  'heights layer wrong size': (m) => { m.heights = ['abc']; },
  'keyLabels = null': (m) => { m.keyLabels = null; },
  'atmosphere.ambient = "x"': (m) => { m.atmosphere = { ambient: 'x' }; },
  'quality = 7': (m) => { m.quality = 7; },
  'huge grid 4000x4000 of walls+floor': (m) => { const row = '#' + '.'.repeat(3998) + '#'; m.grid = ['#'.repeat(4000), ...Array(3998).fill(row), '#'.repeat(4000)]; m.entities = [{ type: 'player', at: [5, 5] }, { type: 'exit', at: [9, 9] }]; delete m.heights; delete m.ceilings; delete m.fx; m.doors = []; m.secrets = []; m.closets = []; m.triggers = []; m.sectors = []; m.messages = []; m.scenery = []; },
};
const summary = { throws: [], hangs: [], accepted: [] };
for (const [name, mut] of Object.entries(M)) {
  const m = clone(load(name.startsWith('sector') || name.startsWith('trigger') ? 'C1E1M06' : 'C1E1M05')); mut(m);
  const t0 = Date.now(); let out;
  try { const v = validateMap(m); out = v.ok ? 'ACCEPTED' : 'rejected (' + v.errors.length + ' errors)'; if (v.ok) { try { parseMap(m); } catch (e) { out += ' but parseMap THROWS ' + e.message.slice(0, 60); } } } catch (e) { out = 'THROWS ' + e.constructor.name + ': ' + e.message.slice(0, 70); summary.throws.push(name); }
  const dt = Date.now() - t0; if (dt > 3000) summary.hangs.push(name);
  if (out.startsWith('ACCEPTED')) summary.accepted.push(name);
  console.log(name.padEnd(40), out, dt > 500 ? `[${dt} ms]` : '');
}
// unwinnable-but-valid maps (validator + analyseReach both say fine; only a played route would notice)
const unwin = {
  'M07: switch needs fuses that do not exist (all key pickups removed)': ['C1E1M07', (m) => { m.entities = m.entities.filter((e) => !(e.type === 'pickup' && String(e.kind).startsWith('key_'))); }],
  'M05: nothing ever unlocks the locked exit (beacon action removed)': ['C1E1M05', (m) => { for (const e of m.entities) if (e.type === 'switch') e.do = e.do.filter((a) => !a.exit); }],
  'M06: the winch (the only thing that lowers the ramp) removed': ['C1E1M06', (m) => { m.entities = m.entities.filter((e) => e.type !== 'switch'); }],
  'M08: the Cantor removed AND exit locked (nothing can unlock it)': ['C1E1M08', (m) => { m.entities = m.entities.filter((e) => e.kind !== 'cantor'); m.entities = m.entities.filter((e) => !(e.type === 'exit' && !e.locked)); m.triggers = m.triggers.filter((t) => t.id !== 'cantor-dead'); }],
};
for (const [name, [id, mut]] of Object.entries(unwin)) {
  const m = clone(load(id)); mut(m); let out;
  try { const v = validateMap(m); if (!v.ok) out = 'rejected: ' + v.errors[0]; else { const r = analyseReach(parseMap(m)); out = 'validateMap OK; analyseReach exitReachable=' + r.exitReachable + ', unreachable=' + r.unreachable.length; summary.accepted.push(name); } } catch (e) { out = 'THROWS ' + e.message.slice(0, 60); }
  console.log(name.padEnd(70), out);
}
console.log('\nTHROW:', summary.throws.length, JSON.stringify(summary.throws)); console.log('HANG:', summary.hangs.length); console.log('ACCEPTED (mutations that should not be valid):', JSON.stringify(summary.accepted));
