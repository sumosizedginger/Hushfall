// R15: two ways a map can dodge the new gate/robustness/ammo checks in viability.js.
//  (1) quality.safe = true: viabilityChecks() returns after checking only that the route completes ('a safe room has nothing to survive'). Nothing checks that a 'safe' map really has no enemies.
//      Here: the shipped Signal House with its exit lock REMOVED (a map that is finishable without its gate) is declared safe and every check passes.
//  (2) a map whose enemies all arrive through trigger 'spawn' actions has NO static enemy entities: gateSkip() and the robustness runs are skipped (they key on map.entities.some(enemy)).
//      Here: Fishmarket Rows-style map is emulated by turning every static enemy of the Bell Tower into a spawn at tick 1 -- gateSkip returns [] although the level is full of enemies.
// Run from repo root: node review/gate-2/reaudit/repro/r15_safe_flag_and_spawn_only_loopholes.mjs
import fs from 'node:fs';
import { parseMap, validateMap } from '../../../../src/engine/mapformat.js';
import { evaluateViability, viabilityChecks, gateSkip } from '../../../../src/engine/viability.js';
const load = (id) => JSON.parse(fs.readFileSync(`maps/${id}.json`, 'utf8'));
const route = JSON.parse(fs.readFileSync('routes/C1E1M07.main.route.json', 'utf8'));

// (1)
const m7 = load('C1E1M07'); for (const e of m7.entities) if (e.type === 'exit') delete e.locked;
console.log('(1) M07 with the exit unlocked: validateMap', JSON.stringify(validateMap(m7)).slice(0, 60));
for (const safe of [false, true]) {
  const src = { ...m7, quality: { ...(m7.quality ?? {}), safe } }, map = parseMap(src);
  const v = evaluateViability(map, route), checks = viabilityChecks(v, map.par?.time, { safe }), failed = checks.filter((c) => !c.ok);
  console.log(`    quality.safe=${safe}: ${checks.length} viability checks, ${failed.length} failing${failed.length ? ' -> ' + failed.map((c) => c.name.slice(0, 70)).join(' | ') : '  (all pass: the missing lock is not noticed)'}`);
}
// (2)
const m8 = load('C1E1M08'), spawns = [];
m8.entities = m8.entities.filter((e) => { if (e.type === 'enemy' && e.kind !== 'cantor' && e.kind !== 'bellnode') { spawns.push({ spawn: { kind: e.kind, at: e.at } }); return false; } return true; });
m8.entities = m8.entities.filter((e) => !(e.type === 'enemy'));       // no static enemies at all (the Cantor, its nodes and all)
m8.triggers = [...(m8.triggers ?? []), { id: 'wave', when: 'start', do: spawns.slice(0, 30) }];
for (const e of m8.entities) if (e.type === 'exit') delete e.locked;     // and the lock removed, so the level is finishable without its gate
m8.triggers = m8.triggers.filter((t) => !(t.do || []).some((a) => a.exit));
const v8 = validateMap(m8); console.log('(2) enemy-free-at-start Bell Tower, exit unlocked, 30 enemies spawned at tick 1: validateMap ok =', v8.ok, v8.ok ? '' : v8.errors.slice(0, 2).join(' | '));
if (v8.ok) { const map = parseMap(m8); console.log('    static enemies:', map.entities.filter((e) => e.type === 'enemy').length, '| gateSkip ->', JSON.stringify(gateSkip(map)), '(empty = the probe never ran)'); }
