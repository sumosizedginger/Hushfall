// A14: flare/explosion splash ignores walls. A Tollbearer standing on the far side of a full 2 m wall cell (no line of sight, asleep) is damaged by a flare that
// explodes against the near face of the wall; the same holds for the player (self damage through a wall). Synthetic map, real world.step.
// Run: node review/gate-2/audit/repro/a14_splash_through_walls.mjs
import { parseMap } from '../../../../src/engine/mapformat.js';
import { createWorld, step, spawnEnemy, hasLOS } from '../../../../src/engine/world.js';
const grid = ['#############', '#....#.....##', '#....#.....##', '#....#.....##', '#############'];
const m = parseMap({ format: 1, id: 'T', version: 1, name: 'T', ceilingHeight: 4, grid, doors: [], secrets: [], entities: [{ type: 'player', at: [1, 2] }, { type: 'exit', at: [10, 2] }] });
const w = createWorld(m, { seed: 1 });
const e = spawnEnemy(w, 'tollbearer', 12.45, 5, Math.PI); e.state = 'idle';      // just east of the wall cell at x=5 (world x 10..12)
w.player.x = 2 * 4.5; w.player.z = 5; w.player.hp = 100;                                                  // player just west of the wall
console.log('line of sight between player and enemy:', hasLOS(w, w.player.x, w.player.z, e.x, e.z), '| distance', Math.hypot(w.player.x - e.x, w.player.z - e.z).toFixed(2), 'm (flare splash 3.4 m)');
w.projectiles.push({ id: 99, weapon: 'flare', x: 9.6, y: 1.2, z: 5, vx: 0, vy: 0, vz: 0, life: 0.001 });      // explodes against the west face of the wall
const hp0 = e.hp, php = w.player.hp; step(w, { move: [0, 0] });
console.log('enemy hp', hp0, '->', e.hp.toFixed(1), '(state', e.state + ')', '| player hp', php, '->', w.player.hp);
