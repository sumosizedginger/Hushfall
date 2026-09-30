// R02: how sensitive is the new gate-skip probe (viability.js gateSkip) and validateMap to a gate that has been removed?
// For every shipped map we apply "open the gate" mutations to an in-memory copy of the map JSON and report (a) validateMap ok/errors and (b) the gateSkip result per exit.
// A mutation is CAUGHT when gateSkip reports result === 'complete' for some exit (the probe bot finished the level without the designed gate), or validateMap rejects the map.
// Run from repo root: node review/gate-2/reaudit/repro/r02_gateskip_mutations.mjs [mapId ...]
import fs from 'node:fs';
import { parseMap, validateMap } from '../../../../src/engine/mapformat.js';
import { gateSkip } from '../../../../src/engine/viability.js';
import { runRoute } from '../../../../src/engine/harness.js';
import { createWorld } from '../../../../src/engine/world.js';

const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync('maps').filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
const clone = (x) => JSON.parse(JSON.stringify(x));
const spawnCell = (m) => m.entities.find((e) => e.type === 'player').at;
const muts = {
  'keys removed from doors': (m) => { for (const d of m.doors || []) delete d.key; return (m.doors || []).some((d) => true); },
  'remote doors made ordinary': (m) => { let n = 0; for (const d of m.doors || []) if (d.remote) { delete d.remote; n++; } return n > 0; },
  'sectors start at the other end': (m) => { let n = 0; for (const s of m.sectors || []) { s.start = (s.start ?? 'low') === 'low' ? 'high' : 'low'; n++; } return n > 0; },
  'locked exits unlocked': (m) => { let n = 0; for (const e of m.entities) if (e.type === 'exit' && e.locked) { delete e.locked; n++; } return n > 0; },
  'an unlocked exit added next to the spawn': (m) => { const [sx, sz] = spawnCell(m); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [0, 2]]) { const c = m.grid[sz + dz]?.[sx + dx]; if (c && c !== '#' && c !== 'D' && c !== '~') { m.entities.push({ type: 'exit', dest: 'next', at: [sx + dx, sz + dz], id: 'extra' }); return true; } } return false; },
};
// ground truth for a MISSED mutation: an invulnerable copy of the same bot (hp 1e9) sent at each exit. If THAT completes, the gate really is gone and the probe only failed to notice because its bot died or stalled.
function godGate(m) { return m.exits.filter((x) => x.dest !== 'secret').map((x) => { const w = createWorld(m, { seed: 1, difficulty: 'normal' }); w.player.hp = 1e9; const r = runRoute(m, [{ op: 'goto', at: [Math.floor(x.at[0]), Math.floor(x.at[1])] }, { op: 'wait', seconds: 3 }], { world: w, maxTicks: 60 * 240 }); return r.result + (r.failure ? '[' + r.failure.slice(0, 22) + ']' : ''); }); }
muts['ALL gates open (keys, remote, sectors flipped, exits unlocked)'] = (m) => { let n = 0; for (const k of ['keys removed from doors', 'remote doors made ordinary', 'sectors start at the other end', 'locked exits unlocked']) if (muts[k](m)) n++; return n > 0; };
const rows = [];
for (const id of ids) {
  const src = JSON.parse(fs.readFileSync(`maps/${id}.json`, 'utf8'));
  for (const [name, mut] of Object.entries(muts)) {
    const m = clone(src); if (!mut(m)) continue;
    const v = validateMap(m);
    let gate = null, err = null;
    if (v.ok) { try { gate = gateSkip(parseMap(m)); } catch (e) { err = String(e.message).slice(0, 80); } }
    const caughtByGate = (gate || []).some((g) => g.result === 'complete');
    const god = v.ok && !caughtByGate && gate && gate.length ? godGate(parseMap(m)) : null;
    const line = `${id.padEnd(9)} ${name.padEnd(42)} validate=${v.ok ? 'ok' : 'REJECT(' + v.errors[0].slice(0, 60) + ')'} gate=${gate ? gate.map((g) => g.result + (g.failure ? '[' + g.failure.slice(0, 22) + ']' : '')).join(',') || '(none: safe/no enemies)' : err ?? '-'} -> ${!v.ok ? 'caught by validator' : caughtByGate ? 'CAUGHT by probe' : 'MISSED (map may be finishable without its gate; invulnerable-bot ground truth: ' + (god ? god.join(',') : 'n/a') + ')'}`;
    console.log(line); rows.push(line);
  }
}
