// A22: a pickup placed on a moving-floor cell keeps the height it had at creation (world.js createWorld: y = floorAt at tick 0) and validateMap accepts it, so it is left behind
// (uncollectable, and drawn floating/buried) as soon as the sector moves more than 1 m. No shipped map does this today; it is a kit trap for Gate 3 authoring.
// Run: node review/gate-2/audit/repro/a22_pickup_on_sector.mjs
import { validateMap, parseMap } from '../../../../src/engine/mapformat.js';
import { createWorld, step } from '../../../../src/engine/world.js';
import { runAction } from '../../../../src/engine/script.js';
const src = { format: 1, id: 'T', version: 1, name: 'T', ceilingHeight: 9, grid: ['##########', '#........#', '#........#', '##########'], doors: [], secrets: [],
  sectors: [{ id: 'lift', cells: [[5, 1]], low: 0, high: 2, speed: 4 }],
  entities: [{ type: 'player', at: [5, 1] }, { type: 'exit', at: [8, 2] }, { type: 'pickup', kind: 'health_large', at: [5, 1] }] };
console.log('validateMap:', JSON.stringify(validateMap(src)));
const w = createWorld(parseMap(src), { seed: 1 }); w.player.hp = 100; w.player.x = 5 * 2 + 1.6; w.player.z = 1 * 2 + 1;     // stand on the lift, 0.6 m from the pickup at the cell centre? (pickup radius 0.9)
runAction(w, { sector: { id: 'lift', to: 'high' } });
for (let i = 0; i < 60; i++) step(w, { move: [0, 0] });
w.player.hp = 40;                       // now the player needs the pickup, standing right next to it on the raised lift
for (let i = 0; i < 30; i++) step(w, { move: [0, 0] });
console.log('after the lift rose: player y', w.player.y, '| pickup y', w.pickups[0]?.y, '| pickup still on the map:', w.pickups.length === 1, '| hp', w.player.hp, '(40 = not collected; a health_large would give 80)');
