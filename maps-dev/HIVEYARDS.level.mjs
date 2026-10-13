// THE HIVE YARDS (PT-045, DROP B of the Preview, design/PREVIEW.md wing 3): a DEV-ONLY map beside HIVE (maps-dev/HIVE.level.mjs), the Range and the Deep Range: not one of the 68, never in maps/, never validated, counted or scored. Build it with
//   node tools/dev/build-range.mjs HIVEYARDS      (writes maps-dev/HIVEYARDS.json); the DEV level picker on the title screen lists it. The Range's rules: every weapon from the start, ammunition refilled, a player who cannot die.
// HIVE had no room for these (a map is at most 25600 cells): the machines of Acts C and D that a person has to FEEL before a map is built on them, one yard each, round a plaza:
//   NW  the BELT YARD       clocked conveyors (E8a): a belt that carries you one way, stands still, and carries you back; one that runs and rests; a load crossing the lane
//   N   the CAR YARD        cars (E8b), the one risky piece: a shuttle over a void and a car that rises 3 m; two Choristers on the far dock to shoot you while you ride
//   NE  the BEAT YARD       a nerve bridge over a void whose segments bloom one after another, a choir that acts on the beat, lights that swell
//   W   the TALL SHAFT      the taller format (E13): a 31 m well, a clocked lift up it, vents that throw you down it ledge by ledge
//   E   the TIDE DOCK       the tide (E12): three terraces, the water rises and falls on a 2-minute clock
//   SW  the COLLAPSE YARD   a rift with a front of falling stones that advances along the north road, and three bridges that sink once you have crossed (Restart to try again)
// The dark yards (the lamp's hold, the noise tell and sleepers among root columns) are in HIVEDARK: a lantern needs a dark map.
import { Level } from '../tools/mapkit/builder.mjs';
import { placer } from '../tools/mapkit/c2.mjs';

const W = 200, H = 120, L = new Level(W, H, { fill: '#' }); L.usedHeights = true; L.usedCeil = true;
const EAST = Math.PI / 2, WEST = -Math.PI / 2, NORTH = 0, SOUTH = Math.PI;
const P = placer(L, { silent: false }), ents = P.ents, put = (e) => ents.push(e);
const enemy = (kind, x, z, facing, extra = {}) => put({ type: 'enemy', kind, at: [x, z], facing, ...extra });
const messages = [], zones = [], triggers = [], sectors = [], vents = [], loads = [], pulses = [], belts = [], cars = [], scen = [];
const say = (id, x, z, r, text) => messages.push({ id, at: [x, z], radius: r, speaker: 'HULL', text });
const HR = (r) => [r[0] - 1, r[1] - 1, r[2] + 1, r[3] + 1];

// ---- the plaza and the passages: neutral tile and plaster, roofed ------------------------------------------------------------------------------------------------------------------------------------------------------
const FL = 't', WL = 'P';
const HUB = [70, 44, 130, 76];
L.room(HUB, { floor: FL, wall: WL }); L.ceiling(HUB, 9);
zones.push({ rect: HR(HUB), look: 'customs' });

// ---- NW, the belt yard ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const A1 = [4, 4, 64, 36];
L.room(A1, { floor: 'Δ', wall: 'δ' }); L.ceiling(A1, 7);
L.fx([14, 9, 50, 13], '>'); L.fx([14, 27, 50, 31], '<');                                                       // the north lane flows east, the south lane flows west
belts.push({ rect: [14, 9, 50, 13], period: 24, mode: 'flip', phase: 0 }, { rect: [14, 27, 50, 31], period: 20, mode: 'run', on: 12, phase: 0 });
loads.push({ rect: [31, 8, 32, 14], period: 10, start: 6 });                                                   // the shuttle: a load crosses the north lane every 10 s
zones.push({ rect: HR(A1), look: 'veins' });
for (let x = 10; x <= 58; x += 8) { put({ type: 'prop', kind: 'lamp', at: [x, 6] }); put({ type: 'prop', kind: 'lamp', at: [x, 34] }); put({ type: 'prop', kind: 'lamp', at: [x, 20] }); }
for (const x of [12, 52]) for (const z of [8, 14, 26, 32]) P.PR('pillar', x, z);
say('a1', 60, 20, 6, 'THE BELT YARD. North lane: the floor runs east, slows, STANDS STILL (amber chevrons), then runs west. South lane: runs 12 s, rests 8. A load drops across the north lane every 10 s.');
say('a1b', 31, 20, 6, 'Judge: can you read the belt before it turns? Is a stop the right tell? Is walking against a belt fair, or a fight with the floor?');

// ---- N, the car yard --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const B1 = [70, 4, 130, 36];
L.room(B1, { floor: 'Β', wall: 'β' });
L.rect([93, 5, 107, 35], '_');                                                                                 // the void between the docks
L.height([108, 24, 114, 34], 6);                                                                               // the raised dock (3 m) the second car climbs to
zones.push({ rect: HR(B1), look: 'nerve', sky: 'hive' });
for (const [x, z] of [[74, 8], [74, 32], [88, 6], [88, 34], [112, 6], [124, 6], [124, 34], [118, 20]]) put({ type: 'prop', kind: 'lamppost', at: [x, z] });
cars.push({ id: 'shuttle', size: [4, 4], path: [[95, 12, 0], [106, 12, 0]], speed: 5, dwell: 8, phase: 0 });
cars.push({ id: 'climber', size: [4, 4], path: [[95, 28, 0], [106, 28, 3]], speed: 5, dwell: 8, phase: 14 });
enemy('chorister', 118, 8, WEST, { group: 'dockguns', sight: 45 }); enemy('chorister', 118, 16, WEST, { group: 'dockguns', sight: 45 });
put({ type: 'switch', id: 'dock', at: [76, 4], wall: 'north', once: false, do: [{ wake: 'dockguns' }, { objective: 'Two Choristers on the far dock are awake: ride and shoot back' }] });
say('b1', 78, 20, 6, 'THE CAR YARD. Two decks wait 8 s at the west dock, ride east, wait, return. The rim blinks before one leaves. The south car CLIMBS 3 m. The north-wall lever wakes two shooters.');
say('b1b', 100, 20, 7, 'Judge: does a moving floor under a fight feel good or sick? Is the wait too long? Does stepping on and off feel safe? Is the rim a clear tell?');

// ---- NE, the beat yard ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const C1 = [136, 4, 196, 36];
L.room(C1, { floor: 'Α', wall: 'α' });
L.rect([151, 5, 195, 35], '_');                                                                                // the void
L.rect([181, 5, 195, 35], 'Α'); L.rect([151, 18, 180, 22], 'Β');                                              // the far island, and the nerve bridge to it
L.rect([151, 4, 180, 4], 'α'); L.rect([151, 36, 180, 36], 'α');                                               // no walking round the void: the bridge is the way
L.fx([151, 18, 180, 22], 's');
for (let k = 0; k < 6; k++) pulses.push({ rect: [151 + 5 * k, 18, 155 + 5 * k, 22], period: 6, on: 1.5, phase: (6 - 1.5 * k) % 6 });          // segment k blooms at t = 1.5 k (mod 6): the bloom travels from the start towards the island, a beat a segment
zones.push({ rect: HR(C1), look: 'hive', sky: 'hive', beat: true });
for (const [x, z] of [[140, 8], [140, 32], [146, 20], [184, 8], [184, 32], [190, 20]]) put({ type: 'prop', kind: 'lamppost', at: [x, z] });
for (const [x, z] of [[186, 14], [186, 18], [186, 22], [186, 26]]) enemy('tollbearer', x, z, WEST, { hold: 'turn', hp: 5000, sight: 16, onBeat: true, variant: 'hived' });
for (const [x, z] of [[190, 16], [190, 24]]) enemy('chorister', x, z, WEST, { hold: 'turn', hp: 5000, sight: 44, onBeat: true });
say('c1', 144, 20, 6, 'THE BEAT YARD. The light swells every 1.5 s. The nerve bridge blooms a segment at a time, a beat apart, and the bloom travels. The choir on the far island acts only on the beat.');
say('c1b', 165, 25, 7, 'Judge: is the beat READABLE (light first, then the hazard)? Can you cross by watching the bridge? Do the singers attacking together feel like one voice or a wall?');

// ---- W, the tall shaft ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
L.rect([4, 44, 64, 76], 'ι');
const SH = (r, h) => { L.rect(r, 'Ι'); L.height(r, h); };
SH([8, 46, 40, 50], 61); SH([36, 51, 40, 58], 49); SH([36, 62, 40, 69], 49); SH([8, 70, 40, 74], 37); SH([8, 51, 12, 69], 25);   // the ledges: 30.5, 24.5, 24.5, 18.5 and 12.5 m
SH([13, 51, 35, 69], 0); SH([36, 59, 47, 61], 0); SH([48, 52, 63, 75], 0);                                    // the well bottom, the corridor out of it, and the court
zones.push({ rect: [3, 43, 65, 77], look: 'descent', sky: 'root' });
sectors.push({ id: 'shaftlift', cells: [[34, 51], [35, 51], [34, 52], [35, 52]], low: 0, high: 30.5, speed: 5, start: 'low', cycle: { period: 26, hold: 6, phase: 13 } });          // (a platform starts high: phase 13 starts the lift at the bottom of its wait, the way the player comes in)
vents.push({ at: [38, 48], to: [38, 55], time: 3 }, { at: [38, 56], to: [38, 64], time: 3 }, { at: [38, 67], to: [34, 72], time: 3.5 }, { at: [10, 72], to: [10, 64], time: 3 }, { at: [10, 56], to: [20, 60], time: 4 });
for (const [x, z] of [[9, 47], [39, 47], [9, 73], [39, 73], [9, 52], [20, 52], [30, 68], [56, 56], [56, 72]]) put({ type: 'prop', kind: 'lamppost', at: [x, z] });
scen.push({ kind: 'shaft', at: [44, 40], y: 0, scale: 1.3, yaw: 0 });
say('a2', 56, 62, 6, 'THE TALL SHAFT: a well 30 m deep. Ride the clocked lift up to the north ledge, then step on the plates: each throws you to the next ledge down. Or step off any edge: you dive.');
say('a2b', 24, 60, 8, 'Judge: does the drop read as a dive? Is 30 m too much or too little? Does the lift wait too long? Do the vents feel like a fall you chose?');

// ---- E, the tide dock -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const C2 = [138, 46, 194, 74];
L.room(C2, { floor: 'Μ', wall: 'μ' });
L.height([138, 46, 158, 74], 0); L.height([159, 46, 159, 74], 1); L.height([160, 46, 172, 74], 2); L.height([173, 46, 173, 74], 3); L.height([174, 46, 174, 74], 4); L.height([175, 46, 182, 74], 5); L.height([183, 46, 183, 74], 6); L.height([184, 46, 184, 74], 7); L.height([185, 46, 194, 74], 8);
zones.push({ rect: HR(C2), look: 'tide', sky: 'dusk' });
for (const [x, z] of [[190, 50], [190, 70], [178, 50], [178, 70], [166, 50], [166, 70]]) put({ type: 'prop', kind: 'lamppost', at: [x, z] });
for (let z = 48; z <= 72; z += 6) { P.PR('bollard', 161, z); P.PR('bollard', 176, z); }
P.PR('crate', 188, 60); P.PR('crate', 188, 62); P.PR('barrel', 180, 56);
say('c2', 142, 60, 7, 'THE TIDE DOCK. The water comes in over two minutes: first the basin, then the low quay, then the middle terrace; the top never floods. Wet floor slows you. Nobody drowns.');
say('c2b', 168, 60, 7, 'Judge: can you read the tide coming (the sea, the sound)? Does the slowing feel fair? Is there always dry ground to run to? Is a two-minute clock too slow to watch?');

// ---- SW, the collapse yard --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const A3 = [5, 84, 63, 116];
L.room(A3, { floor: 'Λ', wall: 'λ' });
L.height([5, 84, 63, 92], 4); L.height([5, 108, 63, 116], 4); L.height([5, 93, 63, 107], 0);                   // the two roads (2 m) and the rift between them (0)
for (const [x0, x1] of [[6, 8], [60, 62]]) { L.height([x0, 93, x1, 93], 3); L.height([x0, 94, x1, 94], 2); L.height([x0, 95, x1, 95], 1); L.height([x0, 107, x1, 107], 3); L.height([x0, 106, x1, 106], 2); L.height([x0, 105, x1, 105], 1); }   // four stairs out of the rift
for (const [id, x] of [['bridge1', 18], ['bridge2', 34], ['bridge3', 50]]) {
  L.height([x, 105, x + 2, 105], 2); L.height([x, 106, x + 2, 106], 3); L.height([x, 107, x + 2, 107], 4);   // the far end: a stair out of the pit once the deck has sunk
  const cells = []; for (let z = 93; z <= 104; z++) for (let dx = 0; dx <= 2; dx++) { cells.push([x + dx, z]); L.height([x + dx, z, x + dx, z], 0); }
  sectors.push({ id, cells, low: 0.5, high: 2, speed: 1.5, start: 'high' });
  triggers.push({ id: 'warn-' + id, when: 'enter', at: [x + 1, 99], radius: 2.5, do: [{ tremor: 0.6 }] }, { id: 'sink-' + id, when: 'enter', at: [x + 1, 110], radius: 2.5, do: [{ sector: { id, to: 'low' } }, { tremor: 1 }] });
}
for (let k = 0; k < 14; k++) loads.push({ rect: [6 + 4 * k, 85, 9 + 4 * k, 92], period: 6, start: 30 + 8 * k, count: 3, loop: 160, ...(k % 2 === 0 ? { tremor: 0.5 } : {}) });          // the front: a strip every 8 s along the north road, 1 m a second
zones.push({ rect: HR(A3), look: 'fault', sky: 'hive' });
for (const [x, z] of [[8, 87], [8, 111], [30, 87], [30, 111], [56, 87], [56, 111], [62, 100]]) put({ type: 'prop', kind: 'lamppost', at: [x, z] });
say('a3', 12, 100, 7, 'THE COLLAPSE YARD. A front of stones starts at the west end of the north road 30 s in and advances a metre a second; behind it the road keeps falling. Stay ahead of it.');
say('a3b', 40, 110, 8, 'The three bridges SINK once you reach the south road (stairs climb out of the pit), once each: Restart (pause menu) to try again. Judge: fair, or cheap? Does the shake warn you?');

// ---- the passages and the plaza -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const PASS = [[65, 18, 69, 22], [76, 37, 80, 43], [120, 37, 124, 43], [131, 18, 135, 22], [64, 58, 69, 62], [131, 58, 137, 62], [144, 37, 148, 45]];
for (const r of PASS) { L.room(r, { floor: FL, wall: WL }); L.ceiling(r, 7); }
// the way from the shaft's court to the collapse yard climbs 2 m in a stair
L.room([52, 76, 56, 83], { floor: FL, wall: WL }); L.ceiling([52, 76, 56, 83], 7); L.stairs([52, 77, 56, 83], 'z', 0, 4, 2);
for (const [x, z] of [[80, 48], [120, 48], [80, 72], [120, 72], [100, 52], [100, 68], [90, 60], [110, 60]]) put({ type: 'prop', kind: 'lamp', at: [x, z] });
for (const [x, z] of [[84, 54], [116, 54], [84, 66], [116, 66]]) P.PR('pillar', x, z);
L.put(100, 60, '@');
put({ type: 'exit', dest: 'next', at: [100, 74] });
say('hub', 100, 60, 8, 'THE HIVE YARDS (dev): NW the belts, N the cars, NE the beat, W the shaft, E the tide, SW the collapse. The dark yards are in HIVEDARK. Nothing can kill you here.');
say('exit', 100, 72, 4, 'THE EXIT is south of here: it goes back to the title.');

const layers = L.layers();
export default {
  id: 'HIVEYARDS', name: 'The Hive Yards (dev only)', version: 1, ceilingHeight: 12, range: true,
  atmosphere: { look: 'customs', fog: '#9aa4a8', fogDensity: 0.004, sky: 'hive' },
  entryLoadout: { hp: 100, armor: 100, ammo: { flare: 30, shell: 40, rivet: 200, bolt: 24, cell: 100, round: 180, rocket: 12 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine', 'linethrower', 'fork', 'mortar', 'boathook', 'marlinspike', 'mallet', 'axe', 'chainsaw'] },
  intro: { title: 'THE HIVE YARDS', lines: ['The machines of Acts C and D, before any map is built on them: belts, cars, the beat, a 30 m shaft, a tide, a collapse.', 'Every weapon. Nothing runs out. You cannot die. F8 slows the game.'] },
  objective: 'HIVE YARDS: belts NW, cars N, beat NE, shaft W, tide E, collapse SW',
  ...layers,
  lookZones: zones, entities: ents.map((e) => ({ ...e })), scenery: scen, startFacing: 'north', messages, triggers, sectors, vents, loads, belts, cars, pulses,
  tide: { levels: [[0, -1], [10, -1], [22, 0.8], [36, 0.8], [50, 1.8], [64, 1.8], [78, 3.2], [92, 3.2], [112, -1]], loop: 120, rect: [138, 46, 194, 74] },
};
console.log('HIVEYARDS: enemies', ents.filter((e) => e.type === 'enemy').length, 'vents', vents.length, 'cars', cars.length, 'loads', loads.length);
