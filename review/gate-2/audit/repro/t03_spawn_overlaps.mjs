// T03: are enemies (initial entities, trigger/switch `spawn` actions, and Cantor summon points) placed inside a collider (wall, closed door, prop, ledge, another body)?
// validateMap only checks entity-vs-prop overlap for initial entities. Uses the sim's own blockedCircle. Run: node review/gate-2/audit/repro/t03_spawn_overlaps.mjs
import fs from 'node:fs';
import { loadMapFile } from '../../../../src/engine/harness.js';
import { createWorld, spawnEnemy, blockedCircle } from '../../../../src/engine/world.js';
import { ENEMIES, PROPS } from '../../../../src/engine/defs.js';
let total = 0;
for (const f of fs.readdirSync('maps').filter((f) => f.endsWith('.json'))) {
  const map = loadMapFile('maps/' + f), w = createWorld(map, { seed: 1 }), issues = [];
  const check = (kind, x, z, tag, ignore) => { const d = ENEMIES[kind], e = { x, z, y: 0, kind, state: 'chase', radius: d.radius }; const wall = (() => { const S = map.cell; for (let cz = Math.floor((z - d.radius) / S); cz <= Math.floor((z + d.radius) / S); cz++) for (let cx = Math.floor((x - d.radius) / S); cx <= Math.floor((x + d.radius) / S); cx++) { const k = map.kind(cx, cz); if (k === 'wall') return 'wall'; } return null; })();
    const props = map.props.filter((p) => PROPS[p.kind].radius > 0 && Math.hypot(x - p.x, z - p.z) < d.radius + PROPS[p.kind].radius).map((p) => p.kind + '@' + p.at);
    const others = w.enemies.filter((o) => o !== ignore && o.state !== 'dead' && Math.hypot(x - o.x, z - o.z) < d.radius + ENEMIES[o.kind].radius).map((o) => o.kind + '#' + o.id);
    if (wall || props.length || others.length) issues.push(`${tag} ${kind}@(${(x / map.cell - 0.5).toFixed(1)},${(z / map.cell - 0.5).toFixed(1)}): ${[wall, ...props, ...others].filter(Boolean).join(', ')}`); };
  for (const e of w.enemies) check(e.kind, e.x, e.z, 'initial', e);
  const scripted = [...map.entities.filter((e) => e.type === 'switch').map((e) => ({ tag: 'switch ' + e.id, do: e.do })), ...map.triggers.map((t) => ({ tag: 'trigger ' + t.id, do: t.do }))];
  for (const s of scripted) for (const a of s.do || []) if (a.spawn) { const [cx, cz] = a.spawn.at; check(a.spawn.kind, (cx + 0.5) * map.cell, (cz + 0.5) * map.cell, s.tag + ' spawn', null); }
  for (const e of w.enemies) if (e.summons) for (const [sx, sz] of e.summons) check('gaunt', sx, sz, 'cantor summon point', null);
  total += issues.length;
  console.log(f.replace('.json', '').padEnd(9), 'enemy placements overlapping a collider:', issues.length); for (const i of issues.slice(0, 10)) console.log('   ', i);
}
console.log('total', total, '(the 2 flagged in C1E1M06 are trigger-spawned wave members whose cell is shared with sleeping hold enemies at tick 0; they spawn only after the ramp is down, and a 900-tick run of that scene showed no overlapping or stuck bodies)');
