// Gate 2 production kit: terrain heights, ceilings, moving floors, hazards, switches, triggers, closets, exit locks and enemy navigation.
// Every map here is a small synthetic room (2 m cells) so each assertion is about one mechanic.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMap, parseMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, spawnEnemy, hasLOS, useTarget } from '../src/engine/world.js';
import { walkDistance, navWaypoint } from '../src/engine/nav.js';
import { makeSave, parseSave, loadWorld } from '../src/engine/save.js';
import { PLAYER, STEP, FX } from '../src/engine/defs.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, map: false, ...o });
const src = (grid, extra = {}, ents = []) => ({ format: 1, id: 'K1', version: 1, name: 'Kit', grid, doors: [], secrets: [], entities: [{ type: 'player', at: [1, 1], facing: 'east' }, { type: 'exit', at: [grid[0].length - 2, 1] }, ...ents], ...extra });
const W = (n) => '#'.repeat(n);
/** an open hall `n` cells wide, 5 rows (z=1..3 walkable) */
const hall = (n = 12, mid = null) => [W(n), '#' + '.'.repeat(n - 2) + '#', '#' + (mid ?? '.'.repeat(n - 2)) + '#', '#' + '.'.repeat(n - 2) + '#', W(n)];
const rows = (n, f) => Array.from({ length: 5 }, (_, z) => (z === 0 || z === 4 ? '#'.repeat(n) : '#' + f(z).padEnd(n - 2, '.').slice(0, n - 2) + '#'));
const run = (w, n, cmd = () => idle()) => { const ev = []; for (let i = 0; i < n; i++) { step(w, cmd(i)); ev.push(...drainEvents(w)); } return ev; };
const mk = (s, o = {}) => { const w = createWorld(parseMap(s), { seed: 1, ...o }); return w; };
const cell = (c) => (c + 0.5) * 2;
const bad = (s, re) => { const v = validateMap(s); assert.equal(v.ok, false, 'expected invalid'); assert.ok(v.errors.some((e) => re.test(e)), re + ' in ' + JSON.stringify(v.errors)); };

// ----------------------------------------------------------------------------------------------------------------------- format
test('terrain layers: heights use 0.5 m units (0-9, a-z), ceilings are absolute, layer size and chars are validated', () => {
  const g = hall(8), heights = ['........', '.12a....', '........', '........', '........'];
  const m = parseMap(src(g, { heights }));
  assert.equal(m.floor(1, 1), 0.5); assert.equal(m.floor(2, 1), 1); assert.equal(m.floor(3, 1), 5); assert.equal(m.floor(0, 0), 0);
  assert.equal(m.ceilingAt(1, 1), 0.5 + 3.6, 'default ceiling is floor + ceilingHeight'); assert.equal(m.flat, false); assert.equal(parseMap(src(g)).flat, true, 'no layers = the flat fast path');
  bad(src(g, { heights: ['.'] }), /layer 'heights' must be/); bad(src(g, { heights: heights.map((r) => r.replace('1', '?')) }), /invalid char/);
  const tall = parseMap(src(g, { ceilings: ['........', '.9......', '........', '........', '........'] })); assert.equal(tall.ceilingAt(1, 1), 4.5, 'an explicit ceiling char is absolute');
});

test('headroom: an interior cell needs 2.4 m between floor and ceiling; doors must sit on level ground', () => {
  assert.equal(validateMap(src(hall(8), { heights: ['........', '.9......', '........', '........', '........'] })).ok, true, 'a raised floor keeps its relative ceiling (floor + ceilingHeight)');
  const low = src(hall(8), { heights: ['........', '.9......', '........', '........', '........'], ceilings: ['........', '.a......', '........', '........', '........'] }); bad(low, /headroom/);
  const g = ['#######', '#..D..#', '#######'];
  bad(src(g, { doors: [{ at: [3, 1] }], heights: ['.......', '..1....', '.......'] }), /not on level ground/);
});

test('hazard layer: fx only on floor cells; the player may not start in one', () => {
  bad(src(hall(8), { fx: ['........', '........', '........', '........', 'w.......'] }), /not on a floor cell/);
  bad(src(hall(8), { fx: ['........', '.x......', '........', '........', '........'] }), /player starts on a floor effect/);
  assert.equal(validateMap(src(hall(8), { fx: ['........', '..w.....', '........', '........', '........'] })).ok, true);
});

test('actions and triggers are validated: unknown group, sector, message, door cells, bad conditions, unopenable remote doors', () => {
  const g = ['#########', '#...D...#', '#########'], base = (t, extra = {}) => src(g, { doors: [{ at: [4, 1], remote: true }], triggers: [t], ...extra });
  assert.equal(validateMap(base({ id: 't', when: 'start', do: [{ open: [4, 1] }] })).ok, true);
  bad(base({ id: 't', when: 'start', do: [{ wake: 'ghosts' }] }), /unknown group/); bad(base({ id: 't', when: 'start', do: [{ sector: { id: 'nope', to: 'high' } }] }), /sector needs/);
  bad(base({ id: 't', when: 'start', do: [{ open: [1, 1] }] }), /needs the \[cx,cz\] of a door/); bad(base({ id: 't', when: 'start', do: [{ open: [4, 1], close: [4, 1] }] }), /exactly one of/);
  bad(base({ id: 't', when: 'someday', do: [{ open: [4, 1] }] }), /'when' must be/); bad(base({ id: 't', when: 'msg:none', do: [{ open: [4, 1] }] }), /unknown message/);
  bad(base({ id: 't', when: 'start', do: [{ objective: '' }] }), /objective must be/);
  bad(src(g, { doors: [{ at: [4, 1], remote: true }] }), /never opened/);
  bad(base({ id: 't', when: 'start', do: [{ message: 'nope' }] }), /message 'nope' does not exist/);
});

test('closets (X tiles) and switches: an X needs a closets entry and something that opens it; a switch must be mounted on a wall', () => {
  const g = ['#########', '#...X...#', '#########'];
  bad(src(g), /'X' tile at 4,1 has no closets entry/);
  bad(src(g, { closets: [{ at: [4, 1] }] }), /closet 4,1 is never opened/);
  const sw = { type: 'switch', id: 's1', at: [2, 1], wall: 'north', do: [{ open: [4, 1] }] };
  assert.equal(validateMap(src(g, { closets: [{ at: [4, 1] }] }, [sw])).ok, true);
  bad(src(g, { closets: [{ at: [4, 1] }] }, [{ ...sw, wall: 'east' }]), /not mounted on a wall/); bad(src(g, { closets: [{ at: [4, 1] }] }, [{ ...sw, do: [] }]), /non-empty do/);
});

// ----------------------------------------------------------------------------------------------------------------------- heights in the sim
test('stairs (0.5 m steps) can be walked up and down; a 1 m ledge stops you but you can drop off it', () => {
  const g = hall(12), heights = ['............', '.....1234444', '............', '............', '............'];       // z=1: floor rises 0.5 m per cell from x=5 to a 2 m terrace
  const w = mk(src(g, { heights }, []));
  Object.assign(w.player, { x: cell(3), z: cell(1), yaw: -Math.PI / 2 });                   // facing east along the stairs
  run(w, 120, () => idle({ move: [0, 1] }));
  assert.ok(w.player.x > cell(8), 'walked up the stairs: x=' + w.player.x.toFixed(1)); assert.ok(w.player.y >= 1.9, 'and stands on the top: y=' + w.player.y);
  const ledge = mk(src(hall(12), { heights: ['............', '.....2222...', '............', '............', '............'] }));
  Object.assign(ledge.player, { x: cell(3), z: cell(1), yaw: -Math.PI / 2 }); run(ledge, 120, () => idle({ move: [0, 1] }));
  assert.ok(ledge.player.x < cell(5), 'a 1.0 m ledge blocks the walk: x=' + ledge.player.x.toFixed(1) + ' (cell 5 starts at ' + cell(4) + ')'); assert.equal(ledge.player.y, 0);
  Object.assign(ledge.player, { x: cell(6), z: cell(1), y: 1, yaw: Math.PI / 2 }); run(ledge, 90, () => idle({ move: [0, 1] }));
  assert.ok(ledge.player.x < cell(4) && ledge.player.y === 0, 'walking off the ledge drops you to the floor below: y=' + ledge.player.y);
});

test('hitscan and projectiles stop on a high ledge; the eye line is blocked by a ledge above it but not by steps', () => {
  const heights = ['............', '.....8888...', '............', '............', '............'];                // a 4 m cliff from x=5..8, z=1
  const w = mk(src(hall(12), { heights, ceilingHeight: 9 })); w.enemies.length = 0;
  assert.equal(hasLOS(w, cell(2), cell(1), cell(10), cell(1)), false, 'the cliff blocks the line');
  assert.equal(hasLOS(w, cell(2), cell(3), cell(10), cell(3)), true, 'clear ground beside it does not');
  const steps = mk(src(hall(12), { heights: ['............', '.....1234444', '............', '............', '............'] })); steps.enemies.length = 0;
  assert.equal(hasLOS(steps, cell(2), cell(1), cell(10), cell(1)), true, 'stairs do not hide the top');
  const e = spawnEnemy(w, 'tollbearer', cell(8), cell(1), 0); assert.equal(e.y, 4, 'an enemy standing on the cliff top rests at its height');
});

test('a Tollbearer directly below a ledge cannot hit a player standing two metres above it', () => {
  const w = mk(src(hall(10), { heights: ['..........', '.....4....', '..........', '..........', '..........'] })); w.enemies.length = 0;
  Object.assign(w.player, { x: cell(5), z: cell(1), y: 2, hp: 200 }); const e = spawnEnemy(w, 'tollbearer', cell(4), cell(1), -Math.PI / 2); e.state = 'chase'; e.hp = 999;
  const ev = run(w, 200); assert.ok(!ev.some((x) => x.type === 'hurt'), 'no melee hits across a 2 m height difference');
});

test('pickups on a ledge cannot be collected from the floor below', () => {
  const w = mk(src(hall(10), { heights: ['..........', '..........', '..44......', '..........', '..........'] }, [{ type: 'pickup', kind: 'health_small', at: [3, 2] }])); w.player.hp = 50;
  Object.assign(w.player, { x: cell(3), z: cell(3), y: 0 }); run(w, 5); assert.equal(w.player.hp, 50, 'not from below'); assert.equal(w.pickups.length, 1);
});

// ----------------------------------------------------------------------------------------------------------------------- sectors
const LIFT = { triggers: [{ id: 'drive', when: 'time:9999', do: [{ sector: { id: 'lift', to: 'high' } }] }], sectors: [{ id: 'lift', cells: [[5, 1], [5, 2]], low: 0, high: 2, speed: 2, start: 'low' }], ceilingHeight: 6 };
test('a lift raises whoever stands on it, reports its start and stop, and can be lowered again', () => {
  const w = mk(src(hall(10), LIFT)); w.enemies.length = 0; Object.assign(w.player, { x: cell(5), z: cell(1) });
  runAction(w, { sector: { id: 'lift', to: 'high' } }); const ev = run(w, 90);
  assert.ok(Math.abs(w.player.y - 2) < 1e-6, 'carried up: ' + w.player.y); assert.ok(ev.some((e) => e.type === 'sector_start' && e.up) && ev.some((e) => e.type === 'sector_stop'), ev.map((e) => e.type).join());
  runAction(w, { sector: { id: 'lift', to: 'low' } }); run(w, 90); assert.equal(w.player.y, 0);
});
test('a lowered lift beside a 1 m platform is a ledge you cannot climb; raised to platform height it carries you onto it', () => {
  const s = { triggers: [{ id: 'drive', when: 'time:9999', do: [{ sector: { id: 'lift', to: 'high' } }] }], sectors: [{ id: 'lift', cells: [[5, 2]], low: 0, high: 1, speed: 4 }], heights: ['............', '............', '......22....', '............', '............'], ceilingHeight: 6 };
  const w = mk(src(hall(12), s)); w.enemies.length = 0; Object.assign(w.player, { x: cell(3), z: cell(2), yaw: -Math.PI / 2 }); run(w, 90, () => idle({ move: [0, 1] }));
  assert.ok(w.player.x < cell(5) + 1 && w.player.x > cell(5) - 1.5, 'stopped at the platform edge (x=12): ' + w.player.x.toFixed(2));
  const r = mk(src(hall(12), s)); r.enemies.length = 0; Object.assign(r.player, { x: cell(5), z: cell(2), yaw: -Math.PI / 2 }); runAction(r, { sector: { id: 'lift', to: 'high' } }); run(r, 60);
  assert.equal(r.player.y, 1); run(r, 25, () => idle({ move: [0, 1] })); assert.ok(r.player.x > 12.6 && r.player.y === 1, 'walked off the lift onto the 1 m platform: x=' + r.player.x.toFixed(1) + ' y=' + r.player.y);
});

import { runAction } from '../src/engine/script.js';

// ----------------------------------------------------------------------------------------------------------------------- hazards
test('wading water slows the player; toxic residue slows and burns; stepping in fires a wade event', () => {
  const g = hall(12), fx = ['............', '.....www....', '.....xxx....', '............', '............'];
  const walk = (row, frames) => { const w = mk(src(g, { fx }), {}); w.enemies.length = 0; Object.assign(w.player, { x: cell(3), z: cell(row), yaw: -Math.PI / 2 }); const x0 = w.player.x; const ev = run(w, frames, () => idle({ move: [0, 1] })); return { w, d: w.player.x - x0, ev }; };
  const dry = walk(3, 60), wet = walk(1, 60), toxic = walk(2, 100);
  assert.ok(dry.d > wet.d * 1.15, `wading is slower: dry ${dry.d.toFixed(2)} vs wet ${wet.d.toFixed(2)}`); assert.ok(wet.ev.some((e) => e.type === 'wade' && e.kind === 'w'));
  assert.ok(toxic.w.player.hp < 100, 'toxic residue burns: hp ' + toxic.w.player.hp); assert.equal(wet.w.player.hp, 100, 'plain water does not');
  assert.ok(Math.abs(FX.x.speed - 0.8) < 1e-9);
});

// ----------------------------------------------------------------------------------------------------------------------- switches, triggers, closets
const CLOSET = () => src(['###########', '#....X....#', '###########'], { closets: [{ at: [5, 1] }] }, [
  { type: 'switch', id: 's1', at: [2, 1], wall: 'north', do: [{ open: [5, 1] }, { objective: 'The closet is open' }] }, { type: 'enemy', kind: 'gaunt', at: [6, 1], group: 'closet', facing: 'west' }, { type: 'pickup', kind: 'health_small', at: [8, 1] }]);
test('a closet is a wall to the player, a switch opens it, the objective updates, and a switch that is not in reach does nothing', () => {
  const w = mk(CLOSET()); Object.assign(w.player, { x: cell(2), z: cell(1), yaw: 0 });
  assert.equal(useTarget(w).switchId, 's1', 'facing the wall with the switch'); w.player.yaw = -Math.PI / 2; assert.equal(useTarget(w), null, 'facing along the hall: nothing to use');
  Object.assign(w.player, { x: cell(4), z: cell(1), yaw: -Math.PI / 2 }); assert.equal(useTarget(w), null, 'the closet panel looks like a wall and cannot be used');
  Object.assign(w.player, { x: cell(2), z: cell(1), yaw: 0 }); const ev = run(w, 3, (i) => idle({ use: i === 0 }));
  assert.ok(ev.some((e) => e.type === 'switch') && ev.some((e) => e.type === 'door_open' && e.remote) && ev.some((e) => e.type === 'objective'), ev.map((e) => e.type).join());
  assert.equal(w.objective, 'The closet is open'); assert.ok(w.doors.find((d) => d.closet).target === 1);
  const far = mk(CLOSET()); Object.assign(far.player, { x: cell(8), z: cell(1), yaw: 0 }); assert.equal(useTarget(far), null, 'out of reach');
});
test('a once-only switch works once; the second press only clicks', () => {
  const w = mk(CLOSET()); Object.assign(w.player, { x: cell(2), z: cell(1), yaw: 0 });
  const a = run(w, 3, (i) => idle({ use: i === 0 })), b = run(w, 3, (i) => idle({ use: i === 0 }));
  assert.ok(a.some((e) => e.type === 'switch') && !b.some((e) => e.type === 'switch') && b.some((e) => e.type === 'switch_dead'));
});
test('closet enemies sleep behind the panel, then wake and hunt when the trigger opens it (wake action)', () => {
  const s = CLOSET(); s.triggers = [{ id: 'ambush', when: 'enter', at: [6, 1], radius: 1, do: [{ wake: 'closet' }] }];
  const w = mk(s); const g = w.enemies.find((e) => e.group === 'closet'); assert.equal(g.state, 'idle');
  Object.assign(w.player, { x: cell(2), z: cell(1), yaw: 0 }); run(w, 60); assert.equal(g.state, 'idle', 'walls hide it: nothing wakes it');
  runAction(w, { open: [5, 1] }); Object.assign(w.player, { x: cell(6), z: cell(1) }); const ev = run(w, 5); assert.ok(ev.some((e) => e.type === 'trigger' && e.id === 'ambush'), 'trigger fired'); assert.equal(g.state, 'chase');
});
test('triggers fire once, in the right circumstances: enter, key, dead:<group>, time, msg', () => {
  const s = src(['##########', '#........#', '##########'], {
    messages: [{ id: 'm', at: [7, 1], radius: 1, text: 'hello there friend', speaker: 'T' }],
    triggers: [
      { id: 'enter', when: 'enter', at: [5, 1], radius: 1, do: [{ objective: 'entered' }] }, { id: 'key', when: 'key:brass', do: [{ message: 'm' }] },
      { id: 'clear', when: 'dead:pack', do: [{ objective: 'pack dead' }] }, { id: 'late', when: 'time:2', do: [{ shake: 1 }] }, { id: 'after', when: 'msg:m', do: [{ alert: true }] },
    ] }, [{ type: 'enemy', kind: 'gaunt', at: [7, 1], group: 'pack' }, { type: 'pickup', kind: 'key_brass', at: [3, 1] }]);
  const w = mk(s); w.player.hp = 300; assert.equal(w.objective, null);
  Object.assign(w.player, { x: cell(1), z: cell(1) }); run(w, 30); assert.equal(w.triggerState.enter.fired, false, 'not yet');
  Object.assign(w.player, { x: cell(3), z: cell(1) }); run(w, 3); assert.equal(w.triggerState.key.fired, true, 'taking the key fires it'); assert.ok(w.messagesSeen.includes('m'), 'and the trigger delivered the message');
  assert.equal(w.triggerState.after.fired, true, 'msg: chains off the message');
  Object.assign(w.player, { x: cell(5), z: cell(1) }); run(w, 2); assert.equal(w.objective, 'entered');
  for (const e of w.enemies) e.state = 'dead'; run(w, 2); assert.equal(w.objective, 'pack dead'); run(w, 120); assert.equal(w.triggerState.late.fired, true);
  const before = w.tick; w.objective = 'again'; Object.assign(w.player, { x: cell(1), z: cell(1) }); run(w, 3); Object.assign(w.player, { x: cell(5), z: cell(1) }); run(w, 3); assert.equal(w.objective, 'again', 'once: it does not fire a second time'); assert.ok(w.tick > before);
});
test('spawn actions create enemies mid-level (counted in the level total), and start awake', () => {
  const s = src(['##########', '#........#', '##########'], { triggers: [{ id: 'wave', when: 'enter', at: [5, 1], radius: 1, do: [{ spawn: { kind: 'gaunt', at: [8, 1], group: 'wave', facing: 'west' } }] }] });
  const w = mk(s); assert.equal(w.enemies.length, 0); const total = w.stats.total.enemies; Object.assign(w.player, { x: cell(5), z: cell(1) }); const ev = run(w, 3);
  assert.equal(w.enemies.length, 1); assert.equal(w.enemies[0].group, 'wave'); assert.equal(w.enemies[0].state, 'chase'); assert.equal(w.stats.total.enemies, total + 1); assert.ok(ev.some((e) => e.type === 'enemy_spawn'));
});

// ----------------------------------------------------------------------------------------------------------------------- exits
test('a locked exit does not complete the level until an action unlocks it; the exit remembers where it leads', () => {
  const s = src(['##########', '#........#', '##########'], { triggers: [{ id: 'open', when: 'key:iron', do: [{ exit: { set: 'unlock' } }] }] }, []);
  s.entities = s.entities.filter((e) => e.type !== 'exit'); s.entities.push({ type: 'exit', at: [8, 1], locked: true, dest: 'secret' }, { type: 'pickup', kind: 'key_iron', at: [4, 1] });
  const w = mk(s); Object.assign(w.player, { x: cell(8), z: cell(1) }); const ev = run(w, 100);
  assert.equal(w.status, 'playing'); assert.ok(ev.some((e) => e.type === 'exit_locked'), 'it tells you it is sealed');
  Object.assign(w.player, { x: cell(4), z: cell(1) }); run(w, 3); Object.assign(w.player, { x: cell(8), z: cell(1) }); const ev2 = run(w, 3);
  assert.equal(w.status, 'complete'); assert.equal(w.endStats.dest, 'secret'); assert.ok(ev2.some((e) => e.type === 'level_complete' && e.dest === 'secret'));
});

// ----------------------------------------------------------------------------------------------------------------------- navigation
test('enemies path around a wall to reach a player they cannot see (they used to push at it forever)', () => {
  const g = ['#############', '#...........#', '#.#########.#', '#...........#', '#############'];
  const w = mk(src(g)); w.enemies.length = 0; Object.assign(w.player, { x: cell(1), z: cell(3) });
  const e = spawnEnemy(w, 'tollbearer', cell(11), cell(3), Math.PI); e.state = 'chase'; e.hp = 999; e.lastX = w.player.x; e.lastZ = w.player.z;
  assert.ok(walkDistance(w, e.x, e.z, w.player.x, w.player.z) >= 0, 'a route exists');
  const wp = navWaypoint(w, e.x, e.z, w.player.x, w.player.z); assert.ok(wp, 'there is a next waypoint');
  run(w, 60 * 40); assert.ok(Math.hypot(e.x - w.player.x, e.z - w.player.z) < 3, 'it walked the long way round: distance ' + Math.hypot(e.x - w.player.x, e.z - w.player.z).toFixed(1));
});
test('enemies climb stairs to a player on a terrace, and give up at a cliff with no way up', () => {
  const stairs = mk(src(hall(14), { heights: ['..............', '.......1234444', '..............', '..............', '..............'], ceilingHeight: 9 })); stairs.enemies.length = 0;
  Object.assign(stairs.player, { x: cell(11), z: cell(1), y: 2, hp: 999 }); const a = spawnEnemy(stairs, 'tollbearer', cell(2), cell(1), -Math.PI / 2); a.state = 'chase'; a.hp = 999; a.lastX = stairs.player.x; a.lastZ = stairs.player.z;
  run(stairs, 60 * 30); assert.ok(Math.hypot(a.x - stairs.player.x, a.z - stairs.player.z) < 3, 'climbed to the player: ' + a.x.toFixed(1));
  const cliff = mk(src(hall(14), { heights: ['..............', '.......8888888', '..............', '..............', '..............'], ceilingHeight: 9 })); cliff.enemies.length = 0;
  Object.assign(cliff.player, { x: cell(11), z: cell(1), y: 4, hp: 999 }); const b = spawnEnemy(cliff, 'tollbearer', cell(2), cell(1), -Math.PI / 2); b.state = 'chase'; b.hp = 999; b.lastX = cliff.player.x; b.lastZ = cliff.player.z;
  assert.equal(walkDistance(cliff, b.x, b.z, cliff.player.x, cliff.player.z), -1, 'no route up a 4 m cliff'); run(cliff, 60 * 12); assert.ok(b.x < cell(7), 'it stays at the foot');
});

// ----------------------------------------------------------------------------------------------------------------------- persistence
test('sectors, triggers, switches, exit locks and the objective survive a save; a v6 save (before the kit) migrates and plays on', () => {
  const s = CLOSET(); s.triggers = [{ id: 't', when: 'start', do: [{ objective: 'go' }] }, { id: 'drive', when: 'time:9999', do: [{ sector: { id: 'lift', to: 'high' } }] }]; s.sectors = [{ id: 'lift', cells: [[8, 1]], low: 0, high: 1, speed: 1 }]; s.ceilingHeight = 5;
  const m = parseMap(s), w = createWorld(m, { seed: 3 }); Object.assign(w.player, { x: cell(2), z: cell(1), yaw: 0 }); run(w, 3, (i) => idle({ use: i === 0 })); runAction(w, { sector: { id: 'lift', to: 'high' } }); run(w, 20);
  const back = loadWorld(parseSave(JSON.stringify(makeSave(w, 'mid-level'))).save, () => m).world;
  assert.equal(back.objective, 'go'); assert.equal(back.switchState.s1.used, true); assert.equal(back.triggerState.t.fired, true); assert.equal(back.sectors[0].target, 1); assert.ok(back.sectors[0].h > 0);
  const old = JSON.parse(JSON.stringify(makeSave(createWorld(parseMap(src(hall(8))), { seed: 1 }), 'mid-level'))); old.version = 6;
  for (const k of ['sectors', 'triggerState', 'switchState', 'exitLocked', 'objective']) delete old.world[k]; delete old.world.player.y; old.world.enemies.forEach((e) => { delete e.y; delete e.group; });
  const r = parseSave(JSON.stringify(old)); assert.equal(r.ok, true, r.detail); assert.equal(r.migratedFrom, 6);
  const w2 = loadWorld(r.save, () => parseMap(src(hall(8)))).world; run(w2, 30); assert.ok(Number.isFinite(w2.player.y) && Array.isArray(w2.sectors));
});
test('flat maps (no layers, no sectors) behave exactly as before: actors rest at y=0 and the terrain queries are free', () => {
  const w = mk(src(hall(8))); w.enemies.length = 0; run(w, 10, () => idle({ move: [0, 1] })); assert.equal(w.player.y, 0); assert.equal(PLAYER.eye, 1.6); assert.ok(STEP > 0.5);
});

// ----------------------------------------------------------------------------------------------------------------------- bot + reachability across the kit
import { runRoute } from '../src/engine/harness.js';
import { analyseReach } from '../src/engine/reach.js';
test('reachability understands the kit: a lift-only platform is reachable, a 4 m cliff top with no way up is not, and closets/remote doors count as passable', () => {
  const lift = parseMap(src(hall(12), { triggers: [{ id: 'drive', when: 'time:9999', do: [{ sector: { id: 'lift', to: 'high' } }] }], sectors: [{ id: 'lift', cells: [[5, 2]], low: 0, high: 1, speed: 2 }], heights: ['............', '............', '......22....', '............', '............'], ceilingHeight: 6 },
    [{ type: 'pickup', kind: 'health_small', at: [6, 2] }, { type: 'switch', id: 'go', at: [2, 3], wall: 'south', do: [{ sector: { id: 'lift', to: 'high' } }] }]));
  assert.deepEqual(analyseReach(lift).unreachable, [], 'the pickup on the platform is reachable through the lift');
  const cliff = parseMap(src(hall(12), { heights: ['............', '............', '......88....', '............', '............'], ceilingHeight: 9 }, [{ type: 'pickup', kind: 'health_small', at: [6, 2] }]));
  assert.equal(analyseReach(cliff).unreachable.length, 1, 'the pickup on the sheer platform is not');
  assert.deepEqual(analyseReach(parseMap(CLOSET())).unreachable, []);
});
test('the route bot uses switches and lifts: stand on the lift, press the switch, wait for it to arrive, walk onto the platform and take the exit', () => {
  const s = src(hall(12), { triggers: [{ id: 'drive', when: 'time:9999', do: [{ sector: { id: 'lift', to: 'high' } }] }], sectors: [{ id: 'lift', cells: [[5, 3]], low: 0, high: 1, speed: 2 }], heights: ['............', '............', '............', '......22222.', '............'], ceilingHeight: 6 },
    [{ type: 'switch', id: 'go', at: [5, 3], wall: 'south', do: [{ sector: { id: 'lift', to: 'high' } }] }]);
  s.entities = s.entities.filter((e) => e.type !== 'exit'); s.entities.push({ type: 'exit', at: [9, 3] });
  const m = parseMap(s);
  const route = [{ op: 'goto', at: [5, 3] }, { op: 'switch', id: 'go' }, { op: 'waitsector', id: 'lift', to: 'high' }, { op: 'goto', at: [9, 3] }];
  const r = runRoute(m, route, { seed: 1 }); assert.equal(r.result, 'complete', r.failure); assert.ok(r.events.some((e) => e.type === 'sector_stop'));
  const skip = runRoute(m, [{ op: 'goto', at: [9, 3] }], { seed: 1 }); assert.notEqual(skip.result, 'complete', 'without the switch the platform cannot be reached');
});

// ----------------------------------------------------------------------------------------------------------------------- Signal House: fuses and the lights
test('a switch that needs items refuses until the player has them all, then spends them; the lights action sets the ambient level', () => {
  const s = CLOSET(); s.atmosphere = { ambient: 0.3 }; s.keyLabels = { brass: 'Brass fuse', iron: 'Iron fuse' };
  const si = s.entities.findIndex((e) => e.type === 'switch'); s.entities[si] = { ...s.entities[si], needs: ['brass', 'iron'], do: [{ open: [5, 1] }, { lights: 0.9 }] }; s.entities.push({ type: 'pickup', kind: 'key_brass', at: [7, 1] }, { type: 'pickup', kind: 'key_iron', at: [9, 1] });
  const m = parseMap(s), w = createWorld(m, { seed: 1 }); Object.assign(w.player, { x: cell(2), z: cell(1), yaw: 0 });
  assert.equal(w.ambient, undefined, 'the level default is used until a lights action fires'); assert.equal(m.atmosphere.ambient, 0.3);
  w.player.keys = ['brass']; let ev = run(w, 3, (i) => idle({ use: i === 0 }));
  const need = ev.find((e) => e.type === 'switch_need'); assert.ok(need && need.missing.join() === 'iron', 'refused, and says what is missing'); assert.equal(w.switchState.s1.used, false); assert.deepEqual(w.player.keys, ['brass'], 'nothing is spent on a refusal');
  w.player.keys = ['brass', 'iron']; ev = run(w, 3, (i) => idle({ use: i === 0 }));
  assert.ok(ev.some((e) => e.type === 'switch') && ev.some((e) => e.type === 'lights'), ev.map((e) => e.type).join()); assert.equal(w.ambient, 0.9); assert.deepEqual(w.player.keys, [], 'the fuses are spent');
  const back = loadWorld(parseSave(JSON.stringify(makeSave(w, 'mid-level'))).save, () => m).world; assert.equal(back.ambient, 0.9, 'the light level survives a save');
  bad({ ...CLOSET(), atmosphere: { ambient: 3 } }, /ambient/); bad({ ...CLOSET(), keyLabels: { copper: 'x' } }, /keyLabels/);
  const t = CLOSET(); t.entities[si] = { ...t.entities[si], needs: ['copper'] }; bad(t, /needs must list known keys/);
  const u = CLOSET(); u.entities[si] = { ...u.entities[si], do: [{ lights: 9 }] }; bad(u, /lights must be a level/);
});

// ----------------------------------------------------------------------------------------------------------------------- gates that must gate (audit A01/A02)
test('exit validation: two exits on one cell, a lock nothing can open, and a switch that needs an item the level lacks are all rejected', () => {
  const two = CLOSET(); two.entities.push({ type: 'exit', at: [9, 1], locked: true }); bad(two, /two exits on cell 9,1/);
  const locked = CLOSET(); const ei = locked.entities.findIndex((e) => e.type === 'exit'); locked.entities[ei] = { ...locked.entities[ei], locked: true }; bad(locked, /locked but no switch or trigger ever unlocks it/);
  const need = CLOSET(); const si = need.entities.findIndex((e) => e.type === 'switch'); need.entities[si] = { ...need.entities[si], needs: ['iron'] }; bad(need, /needs 'iron' but the level has no such pickup/);
});

test('the gate-skip probe: the shipped Signal House and Bell Tower cannot be finished by walking to the exit, and the same map with its lock removed can', async () => {
  const fs = await import('node:fs'); const { gateSkip } = await import('../src/engine/viability.js');
  for (const id of ['C1E1M07', 'C1E1M08', 'C1E1M05']) {
    const src = JSON.parse(fs.readFileSync(new URL(`../maps/${id}.json`, import.meta.url), 'utf8'));
    assert.ok(gateSkip(parseMap(src)).every((g) => g.result !== 'complete'), id + ' is gated');
    assert.equal(src.entities.some((e) => e.type === 'exit' && e.locked), true, id + ' declares a locked exit');
  }
  const open = JSON.parse(fs.readFileSync(new URL('../maps/C1E1M07.json', import.meta.url), 'utf8'));
  for (const e of open.entities) if (e.type === 'exit') e.locked = false;
  assert.ok(gateSkip(parseMap(open)).some((g) => g.result === 'complete'), 'the probe catches an exit whose lock does not lock');
});

test('knockback stops at a wall: a 3 m shove never carries an actor through a one-cell wall, and a real Warden charge cannot throw the player into the next room (audit A03/R01)', async () => {
  const { tryMove } = await import('../src/engine/world.js');
  // the shove lands BEYOND the wall (start 0.6 m before it, wall cell = x 8..10): the pre-repair end-point test let this through
  const w = mk(src(['#########', '#...#...#', '#...#...#', '#...#...#', '#########'])); const p = w.player;
  Object.assign(p, { x: cell(3) + 0.6, z: cell(2) }); tryMove(w, p, 3.0, 0, PLAYER.radius);
  assert.ok(p.x < 8, 'stopped before the wall, x=' + p.x);
  Object.assign(p, { x: cell(1), z: cell(1) }); tryMove(w, p, 0.1, 0.1, PLAYER.radius); assert.ok(Math.abs(p.x - (cell(1) + 0.1)) < 1e-9, 'ordinary moves are unchanged');
  // the real charge: the Warden faces the player (yaw +pi/2 = east), who stands 0.55 m from a one-cell wall with the far room behind it
  const w2 = mk(src(['###########', '#....#....#', '#....#....#', '#....#....#', '###########'])), e = spawnEnemy(w2, 'wardengraft', cell(1), cell(2), Math.PI / 2);
  Object.assign(w2.player, { x: 10 - 0.55, z: cell(2), yaw: Math.PI / 2, hp: 5000 }); e.state = 'chase'; e.chargeT = 0.86; e.chargeCd = 0;
  const ev = run(w2, 240); assert.ok(ev.some((x) => x.type === 'enemy_strike' && x.kind === 'wardengraft'), 'the charge landed');
  assert.ok(w2.player.x < 12, 'the player is still in the near room, x=' + w2.player.x);
});

test('a structurally broken mid-level save is rejected with a reason instead of loading (audit A08)', () => {
  const m = parseMap(src(hall(8))), w = createWorld(m, { seed: 1 }); run(w, 5);
  const save = () => JSON.parse(JSON.stringify(makeSave(w, 'mid-level')));
  assert.equal(loadWorld(save(), () => m).ok, true, 'a good save loads');
  const broke = (f) => { const s = save(); f(s.world); const r = loadWorld(s, () => m); assert.equal(r.ok, false, 'rejected'); assert.equal(r.reason, 'corrupt'); return r.detail; };
  assert.match(broke((x) => { delete x.enemies; }), /missing field enemies/);
  assert.match(broke((x) => { x.enemies = null; }), /field enemies is a null, expected array/);
  assert.match(broke((x) => { x.pickups = null; }), /field pickups is a null/);
  assert.match(broke((x) => { x.player.x = null; }), /player\.x is not finite/);
  assert.match(broke((x) => { x.tick = 'soon'; }), /field tick is a string/);
  assert.match(broke((x) => { x.doors = [{}]; }), /doors count/);
});

test('validateMap never throws: malformed shapes are reported, absurd sizes and units are refused, an undriven sector is an error (audit A06)', () => {
  const base = () => src(hall(8));
  const shapes = { 'grid row null': (m) => { m.grid[1] = null; }, 'entities [null]': (m) => { m.entities = [null]; }, 'doors "x"': (m) => { m.doors = 'x'; }, 'sectors [null]': (m) => { m.sectors = [null]; }, 'triggers [null]': (m) => { m.triggers = [null]; }, 'trigger do [null]': (m) => { m.triggers = [{ id: 't', when: 'start', do: [null] }]; }, 'secrets [{}]': (m) => { m.secrets = [{}]; }, 'messages [null]': (m) => { m.messages = [null]; }, 'closets [null]': (m) => { m.closets = [null]; }, 'quality 7': (m) => { m.quality = 7; } };
  for (const [name, f] of Object.entries(shapes)) { const m = base(); f(m); let v; assert.doesNotThrow(() => { v = validateMap(m); }, name); assert.equal(v.ok, false, name + ' is rejected'); }
  bad({ ...base(), cellSize: -2 }, /cellSize/); bad({ ...base(), cellSize: 'big' }, /cellSize/); bad({ ...base(), ceilingHeight: 400 }, /ceilingHeight/);
  const huge = base(); huge.grid = ['#'.repeat(3000), ...Array(20).fill('#' + '.'.repeat(2998) + '#'), '#'.repeat(3000)]; bad(huge, /too large/);
  const undriven = src(hall(12), { sectors: [{ id: 'lift', cells: [[5, 2]], low: 0, high: 1, speed: 2 }], heights: ['............', '............', '......22....', '............', '............'], ceilingHeight: 6 }); bad(undriven, /never moved by any switch or trigger/);
});

test('a switch and a pickup on a moving floor ride with it: the lever stays in reach and the pickup can be collected after the lift moves (audit A22)', () => {
  const g = ['###########', '#....#....#', '###########'];
  const s = src(g, { triggers: [{ id: 'drive', when: 'time:9999', do: [{ sector: { id: 'car', to: 'high' } }] }], sectors: [{ id: 'car', cells: [[7, 1]], low: 0, high: 2, speed: 4, start: 'low' }], heights: ['...........', '...........', '...........'], ceilingHeight: 8 },
    [{ type: 'switch', id: 'lever', at: [7, 1], wall: 'north', once: false, do: [{ sector: { id: 'car', to: 'high' } }] }, { type: 'pickup', kind: 'health_small', at: [7, 1] }]);
  const w = mk(s); const sw = w.map.switches[0];
  Object.assign(w.player, { x: cell(7), z: cell(1), yaw: 0 }); assert.equal(useTarget(w)?.switchId, 'lever', 'in reach on the low car');
  runAction(w, { sector: { id: 'car', to: 'high' } }); run(w, 40); assert.ok(w.player.y > 1.9, 'the player rode up: y=' + w.player.y);
  assert.equal(useTarget(w)?.switchId, 'lever', 'the lever is still in reach at the top (it followed the floor)');
  assert.ok(Math.abs(w.pickups[0].y - w.player.y) < 0.6 || w.pickups.length === 0, 'the pickup rose with the car (or was already collected)');
  assert.equal(sw.fy, 0, 'the static fy is the creation height only');
});

test('resuming from a save is identical to uninterrupted play on a map with terrain, moving floors and awake enemies (nav fields depend on state, not cache history; audit A07)', async () => {
  const fs = await import('node:fs'); const { hashWorld } = await import('../src/engine/world.js');
  const m = parseMap(JSON.parse(fs.readFileSync(new URL('../maps/C1E1M05.json', import.meta.url), 'utf8')));
  const start = () => { const w = createWorld(m, { seed: 7, difficulty: 'hard' }); for (const e of w.enemies) if (e.state === 'idle') { e.state = 'chase'; e.lastX = w.player.x; e.lastZ = w.player.z; } return w; };
  const cmd = (i) => idle({ move: [0, i % 90 < 45 ? 1 : 0], yaw: 0.02 * i });
  const a = start(); run(a, 500, cmd);
  const b = start(); run(b, 250, cmd); const c = loadWorld(parseSave(JSON.stringify(makeSave(b, 'mid-level'))).save, () => m).world; run(c, 250, (i) => cmd(i + 250));
  assert.equal(hashWorld(c), hashWorld(a), 'a save/load in the middle changes nothing');
});

test('a player with no ammunition of any kind gets a flare after a few seconds, and another each time it is spent: nobody is stranded without a weapon (audit A04)', () => {
  const w = mk(src(hall(8))); const p = w.player; p.ammo = { flare: 0, shell: 0, rivet: 0 };
  let ev = run(w, 60 * 8); assert.equal(p.ammo.flare, 0, 'not yet'); ev = run(w, 60 * 3); assert.equal(p.ammo.flare, 1, 'fed after 10 s'); assert.ok(ev.some((e) => e.type === 'dry_feed'));
  run(w, 60 * 12); assert.equal(p.ammo.flare, 1, 'no further feed while the flare is unspent');
  p.ammo.flare = 0; run(w, 60 * 11); assert.equal(p.ammo.flare, 1, 'fed again once spent');
  p.ammo = { flare: 0, shell: 3, rivet: 0 }; run(w, 60 * 6); assert.equal(p.ammo.flare, 0, 'no feed while any ammunition is left');
});

test('pinned (audit A21): a dead:<group> trigger waits for EVERY member; a sealed door cannot be opened by use until it is unsealed', () => {
  const s = src(['##########', '#........#', '##########'], { triggers: [{ id: 'clear', when: 'dead:pack', do: [{ objective: 'all dead' }] }] }, [{ type: 'enemy', kind: 'gaunt', at: [6, 1], group: 'pack' }, { type: 'enemy', kind: 'gaunt', at: [7, 1], group: 'pack' }]);
  const w = mk(s); w.player.hp = 5000; w.enemies[0].state = 'dead'; run(w, 3); assert.equal(w.triggerState.clear.fired, false, 'one of two is not enough'); w.enemies[1].state = 'dead'; run(w, 3); assert.equal(w.triggerState.clear.fired, true, 'both dead fires it');
  const d = mk(src(['#######', '#..D..#', '#######'], { doors: [{ at: [3, 1] }] })); Object.assign(d.player, { x: cell(2), z: cell(1), yaw: -Math.PI / 2 });
  runAction(d, { seal: [3, 1] }); assert.equal(d.doors[0].sealed, true); run(d, 40, (i) => idle({ use: i === 0 })); assert.ok(d.doors[0].open < 0.1, 'use does not open a sealed door');
  runAction(d, { unseal: [3, 1] }); run(d, 40, (i) => idle({ use: i === 0 })); assert.ok(d.doors[0].open > 0.5, 'once unsealed it opens');
});

test('navigation fields follow the world, not cache age: a door that opens is seen at once, and a resumed world agrees with the running one (audit A07/R01)', () => {
  const grid = ['###########', '#...#.....#', '#...D.....#', '#...#.....#', '###########'], s = () => src(grid, { doors: [{ at: [4, 2] }] });
  const a = mk(s()), b = mk(s()); const from = [cell(2), cell(2)], to = [cell(8), cell(2)];
  assert.equal(navWaypoint(a, ...from, ...to), null, 'closed door: no way through'); a.doors[0].open = 1; a.doors[0].target = 1; b.doors[0].open = 1; b.doors[0].target = 1;
  const ra = navWaypoint(a, ...from, ...to), rb = navWaypoint(b, ...from, ...to);
  assert.ok(rb && rb.x > from[0], 'a fresh world sees the open door'); assert.deepEqual(ra, rb, 'the running world (which cached the closed door a moment ago) agrees at once');
});

test('exit ids: an id-less exit is named "exit" + its index among ALL exits, in the validator exactly as in the sim (audit R04)', () => {
  const g = ['###########', '#.........#', '###########'];
  const mk2 = (unlockId) => src(g, { triggers: [{ id: 'u', when: 'time:1', do: [{ exit: { set: 'unlock', id: unlockId } }] }] }, []);
  const withExits = (unlockId) => { const s = mk2(unlockId); s.entities = s.entities.filter((e) => e.type !== 'exit'); s.entities.push({ type: 'exit', id: 'front', at: [8, 1] }, { type: 'exit', at: [9, 1], locked: true }); return s; };
  assert.equal(parseMap(withExits('exit1')).exits[1].id, 'exit1', 'the sim names the second exit exit1');
  assert.equal(validateMap(withExits('exit1')).ok, true, 'an unlock aimed at exit1 is accepted');
  bad(withExits('exit0'), /locked but no switch or trigger ever unlocks it/);
});
