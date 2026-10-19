// C2M01 THRESHOLD BEACH: arrival firefight, no retreat. (Campaign 2 The Long Descent, Act A THRESHOLD; design/CAMPAIGN2.md, design/LORE.md.)
// The Gate sets Ines down on the shore of the last water on Anselm-Nine, a salt lake with the Gate standing in it. A walled landing, open to the lake, has one door east: it shuts behind her and stays shut (the engine already has `close` + `seal`: that is the Gate
// sealing). East of it a bowl of glass sand rises to dunes north and south; a lagoon in the middle of the bowl is the one thing you cannot cross and the reason the way east is two ways round it. The people from Port Marrow who came through before stand on the sand in
// two rows, facing the water, where they were put. Singers on the north dune, bellhands on the south; two huts of the first arrivals' camp at the west end (one holds a cache, the other a hidden lifeboat). The east wall of the bowl is a cliff of fused glass with a breach: the
// beached hull of the MARROW GIRL, a trawler that came through the Gate on its keel: a wooden fore hold, a low galley, an iron engine room, a stair up to the boat deck (open to the sky, 3 m up), and a ramp down the far side to a terrace and the cleft in the cliff that is the exit.
// SHAPE: a bowl round a lagoon (the big thing in the middle); heights 0 to 3.5 m; three lids (hold 4 m, galley 3.5 m, engine room 6 m); the figure you can name is "the cove". Scale class MIXED (about 45% roofed: the hull, the huts, the cleft).
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';
import { setCell, ellipse, box, ramp, placer, ring } from '../tools/mapkit/c2.mjs';

const W = 90, H = 60, L = new Level(W, H, { fill: '!' }); L.usedHeights = true; L.usedCeil = true;
const dune = (x, z) => { const bz = Math.max(0, Math.round((Math.abs(z - 29) - 12) * 0.7)), bx = Math.max(0, Math.round((x - 39) * 0.5)); return Math.min(7, bz + bx * 0); };       // the bowl: flat in the middle, rising to the dunes north and south
const BEACH = new Set();

// ---- the lake and the landing -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
box(L, [1, 12, 8, 48], '~', 0);                                                                         // the last water (impassable; the Gate stands in it)
box(L, [9, 24, 16, 32], ')', 0, 8);                                                                     // the landing hall: basalt flags under a 4 m lid, open to the lake on the west
// ---- the bowl: an ellipse of glass sand with its dunes; walls are the fused-glass cliff by default -----------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of ellipse(L, 31, 29, 14.5, 22, '(', 0)) { if (x >= 18 && x <= 44) { setCell(L, x, z, '(', dune(x, z)); BEACH.add(x + ',' + z); } else setCell(L, x, z, '!', 0); }
box(L, [17, 0, 17, H - 1], '!', 0); box(L, [45, 0, 52, H - 1], '!', 0);
ellipse(L, 31, 29, 5, 7, '~', 0);                                                                       // the lagoon
L.door(17, 28, { open: true, remote: true });                                                                         // the landing's door: open now, shut and sealed when you are through (the Gate closing)
setCell(L, 17, 28, 'D', 0);
// rocks of fused glass: cover on the sand (3 x 2 blocks of wall), off the lanes round the lagoon
for (const [x, z, w, d] of [[22, 20, 2, 2], [22, 37, 2, 2], [27, 17, 3, 2], [27, 41, 3, 2], [35, 18, 2, 2], [36, 40, 2, 2], [39, 24, 2, 3], [39, 33, 2, 3], [24, 29, 1, 1]]) for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) if (BEACH.has((x + i) + ',' + (z + j))) setCell(L, x + i, z + j, '!', dune(x + i, z + j));
// ---- the first arrivals' camp: two huts of salt plate at the west end of the bowl (roofed, corners cut; the north one has a door on the sand, the south one hides a lifeboat) ------------------------------------------------------------
const hut = (r, floor, lidAbs, doorCell) => { box(L, [r[0] - 1, r[1] - 1, r[2] + 1, r[3] + 1], '$', floor); box(L, r, '.', floor, lidAbs); for (const [x, z] of [[r[0], r[1]], [r[2], r[1]], [r[0], r[3]], [r[2], r[3]]]) setCell(L, x, z, '$', floor); setCell(L, doorCell[0], doorCell[1], '.', floor, lidAbs); };
hut([19, 17, 24, 20], dune(21, 18), dune(21, 18) + 7, [21, 21]);                                         // the camp hut (north): a ledger, a bed of sacking, a lamp; door on the south side
hut([19, 38, 24, 41], dune(21, 40), dune(21, 40) + 7, [21, 37]);                                         // the south hut: a stove, a store; the back wall is hollow
// ---- the hull of the Marrow Girl: a ship's plan (a pointed oval, bow west), breach, fore hold, galley, engine room, companionway, boat deck, ramp, terrace, cleft ----------------------------------------------------------------------
const hullCells = ellipse(L, 58, 29, 12.8, 8.6, '+', 2, 12);                                              // the footprint of the hull: every cell is plate under a 6 m lid unless the compartments below say otherwise
for (const [x, z] of hullCells) {
  if (x <= 53) setCell(L, x, z, '.', 2, 8);                                                               // the fore hold: planks, a lid at 4 m
  else if (x === 54 || x === 58) setCell(L, x, z, Math.abs(z - 29) <= 1 ? (x === 54 ? '.' : '+') : '$', 2, x === 54 ? 8 : 7);        // two bulkheads, a doorway in each at z 28..30
  else if (x <= 57) setCell(L, x, z, Math.abs(z - 29) <= 1 ? '+' : '$', 2, 7);                           // the galley: a low passage between machinery spaces, lid 3.5 m
}
box(L, [45, 27, 45, 31], '.', 1, 8); box(L, [46, 27, 46, 31], '.', 2, 8);                                // the breach: five cells of the cliff are gone; a step up to the hold
box(L, [62, 28, 64, 30], '$', 2);                                                                          // the boiler: a block in the middle of the engine room
// the boat deck: an ellipse of open deck 3 m up on a shelf of the cliff north of the hull, the companionway that climbs to it, a gate at its east end, a gangway down to the arcade
ellipse(L, 69, 11, 12.5, 4.2, 'd', 6);
ramp(L, [64, 14, 68, 23], 'z', 6, 2, '+', 12, 2);                                                         // the companionway: from the engine room's north end up to the deck, a unit every two cells
box(L, [57, 7, 64, 12], '$', 6); box(L, [58, 8, 63, 11], '.', 6, 12); box(L, [60, 12, 61, 12], '.', 6, 12);   // the wheelhouse: a roofed cab on the deck, walls all round, a doorway on the south
L.door(78, 14, { remote: true }); setCell(L, 78, 14, 'D', 6);                                             // the gangway gate: the winch in the wheelhouse opens it
ramp(L, [77, 15, 79, 21], 'z', 6, 0, '+', 12);                                                             // the gangway: down from the deck to the arcade
ellipse(L, 77, 29, 5.5, 8.5, ')', 0, 9);                                                                   // the customs arcade: a roofed hall of basalt flags east of the hull
box(L, [81, 28, 88, 28], '.', 2, 9); ramp(L, [81, 28, 88, 28], 'x', 0, 4, '.', 9, 2);                      // the cleft: a roofed cut in the cliff, rising 2 m to the exit
// ---- the ring of walls: the fill is the glass cliff everywhere; the hull's own plating is salt plate ---------------------------------------------------------------------------------------------------------------------------------------
ring(L, '!', (x, z) => ((x >= 74 && x <= 82 && z >= 13 && z <= 39) ? '%' : (x >= 45 && x <= 71 && z >= 19 && z <= 39) || (x >= 56 && x <= 65 && z >= 6 && z <= 12) ? '$' : '!'));
const P = placer(L); P.reserve(11, 28);
L.put(11, 28, '@');
// ---- creatures (about 30) ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const { E, P: PK, PR } = P;
for (const [x, z] of [[21, 23], [21, 26], [21, 29], [21, 32], [24, 24], [24, 27], [24, 30], [24, 34]]) E('tollbearer', x, z);                // the rows: put on the sand, facing the water, in oilskins
E('gaunt', 27, 24); E('gaunt', 27, 33); E('gaunt', 36, 27);                                              // crouched behind rocks
E('chorister', 27, 10, { group: 'north' }); E('chorister', 36, 11, { group: 'north' });              // the singers on the north dune
E('bellhand', 29, 48, { group: 'south' }); E('bellhand', 37, 47, { group: 'south' });                // the bellhands on the south dune
E('tollbearer', 41, 22); E('tollbearer', 41, 36); E('tollbearer', 43, 29);                              // at the breach
E('tollbearer', 49, 25, { group: 'hull' }); E('tollbearer', 49, 33, { group: 'hull' }); E('tollbearer', 52, 28, { group: 'hull' }); E('gaunt', 52, 24, { group: 'hull' }); E('gaunt', 52, 34, { group: 'hull' });
E('gaunt', 56, 29); E('bellhand', 62, 22); E('tollbearer', 61, 31); E('gaunt', 66, 27); E('chorister', 65, 24);
E('tollbearer', 62, 10); E('bellhand', 72, 11); E('gaunt', 68, 12);                                         // the boat deck
E('tollbearer', 76, 26); E('tollbearer', 78, 33); E('gaunt', 77, 30); E('bellhand', 79, 24);              // the terrace
E('gaunt', 84, 28); E('gaunt', 86, 28);                                                                    // the cleft
E('chorister', 41, 15, { group: 'north' }); E('chorister', 41, 43, { group: 'south' });                  // more singers on the east shoulders of the dunes, over the last stretch to the breach
E('bellhand', 75, 24); E('bellhand', 79, 34); E('tollbearer', 78, 22); E('tollbearer', 76, 23);        // the arcade: the gangway's foot is covered
E('gaunt', 60, 24); E('gaunt', 60, 34); E('chorister', 63, 33);                                          // the engine room: from the stanchions
// ---- supplies and furniture -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
PK('health_small', 20, 28); PK('health_small', 40, 28); PK('health_large', 21, 19); PK('armor_vest', 22, 19);                // the camp hut's cache
PK('health_large', 48, 28); PK('health_small', 59, 27); PK('health_large', 66, 11); PK('health_small', 77, 28); PK('armor_vest', 62, 11);
for (const [kind, x, z] of [['cart', 25, 21], ['crate2', 26, 36], ['barrel', 38, 21], ['barrel', 39, 36], ['crate2', 33, 22], ['cart', 32, 36], ['barrel', 44, 26], ['crate2', 44, 32]]) PR(kind, x, z);
for (const [x, z] of [[49, 26], [49, 32], [52, 30], [51, 23], [51, 35]]) PR('crate', x, z);
for (const [x, z] of [[60, 24], [60, 30], [64, 22], [64, 32]]) PR('pillar', x, z, { skin: '$' });          // the boiler's stack and the engine room's stanchions
for (const [x, z] of [[20, 18], [22, 18]]) PR('lantern', x, z); PR('lantern', 21, 40); PR('lamp', 60, 10); PR('lamp', 50, 28); PR('lamp', 60, 27); PR('lamp', 85, 28); PR('lamp', 12, 28); PR('lamp', 77, 25); PR('lamp', 77, 33);
PR('lamppost', 14, 28); PR('lamppost', 14, 25); PR('lamppost', 14, 31);
// ---- the secret: the south hut's back wall is hollow: a lifeboat buried in the dune with a store (a cache of the camp's, kept) ---------------------------------------------------------------------------------------------------------
const SEC = { panel: [21, 42], cells: [[20, 43], [21, 43], [22, 43], [20, 44], [21, 44], [22, 44]] };
{ const fl = dune(21, 40); setCell(L, 21, 42, 'S', fl); for (const [x, z] of SEC.cells) setCell(L, x, z, '.', fl, fl + 7); ring(L, '!', (x, z) => ((x >= 18 && x <= 24 && z >= 42 && z <= 46) ? '$' : null));
  for (const [x, z] of [[23, 43], [23, 44], [23, 45], [20, 45], [21, 45], [22, 45]]) setCell(L, x, z, '$', dune(x, z));     // the dune ran up to the secret's east and south edge: wall it (tests/secrets-sealed.test.js)
  PK('armor_vest', 20, 44); PK('health_large', 22, 44); PK('ammo_shell', 20, 43); PK('ammo_rivet', 22, 43); PK('ammo_flare', 21, 44); }
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);

// ---- end PT-052 ----

const MAP = {
  id: 'C2M01', name: 'Threshold Beach', version: 1, ceilingHeight: 4.2, par: { time: 360 },
  atmosphere: { fog: '#c88a70', fogDensity: 0.006, sky: 'anselm', look: 'threshold' },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'THRESHOLD BEACH', lines: ['The Gate set you down at the edge of the last water on the world.', 'The people who came before you are standing on the sand.'] },
  outro: 'Next: the Glass Steppe. East of the cliff the sea bed runs to the horizon, and there is a causeway across it.',
  objective: 'Leave the landing and cross the beach. The hull in the east cliff is the way on',
  ...L.layers(),
  secrets: [{ id: 'lifeboat', panel: SEC.panel, cells: SEC.cells }],
  groups: [{ name: 'north', rect: [18, 6, 44, 16] }, { name: 'south', rect: [18, 42, 44, 52] }],
  entities: [...P.ents, { type: 'switch', id: 'winch', at: [60, 8], wall: 'north', once: true, do: [{ open: [78, 14] }, { message: 'winch' }, { objective: 'The gate at the east end of the deck is open: down to the arcade' }, { shake: 1 }] }, { type: 'exit', at: [88, 28], dest: 'next' }],
  scenery: [{ kind: 'arch', at: [2, 28], yaw: 1.5708 }, { kind: 'spire', at: [30, -26] }, { kind: 'spire', at: [60, -34] }, { kind: 'spire', at: [78, -22] }, { kind: 'boat', at: [4, 50], yaw: 0.6 }, { kind: 'boat', at: [6, 6], yaw: 2.4 }],
  messages: [
    { id: 'start', at: [11, 28], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, you are through. I have you for as long as the Gate holds behind you. After that it is just the set and the dark.' },
    { id: 'seal', at: [16, 28], radius: 0.1, speaker: 'INES', text: 'Door is shut. Signal House, no answer. Logging it anyway: day one, a beach, the Gate dark behind me.' },
    { id: 'rows', at: [21, 28], radius: 5, speaker: 'INES', text: 'Oilskins. Marrow boat crews in two rows, facing the water. They were put here and told to wait.' },
    { id: 'camp', at: [21, 19], radius: 2.5, speaker: 'CAMP LEDGER', text: 'WATER: the lake is salt. FOOD: nine days. Two of ours went out in the night and stood on the sand. Keep moving. Keep the lamp lit.' },
    { id: 'north', at: [31, 19], radius: 4, speaker: 'HULL', text: 'Singers on the north dune. Their rounds shake your aim. Rock to rock, and do not stand in the open.' },
    { id: 'breach', at: [46, 28], radius: 2.5, speaker: 'MARROW GIRL LOG', text: 'Third night of the Hush. Skipper took her out past the bar to get clear. The Gate opened under the keel. We did not sink. We arrived.' },
    { id: 'engine', at: [62, 27], radius: 3, speaker: 'INES', text: 'Iron plate, a boiler gone cold, and the stair to the deck is up the north end. The wood is Marrow oak. I know the smell.' },
    { id: 'deck', at: [66, 11], radius: 3, speaker: 'INES', text: 'From the deck you can see the whole cove. And the only other thing standing up out here: needles, three of them, a long way off.' },
    { id: 'winch', at: [60, 10], radius: 2.5, speaker: 'HULL', text: 'A winch lever on the wheelhouse wall. It works the gate at the east end of the deck: nothing else here is that well kept.' },
    { id: 'cleft', at: [78, 28], radius: 3, speaker: 'INES', text: 'A cut in the cliff, and wind coming through it. First moving air I have felt on this world.' },
    { id: 'hollow', at: [21, 40], radius: 2, speaker: 'HULL', text: 'The back wall of this hut rings hollow.' },
  ],
  triggers: [
    { id: 'seal', when: 'enter', at: [21, 28], radius: 1.5, do: [{ close: [17, 28] }, { seal: [17, 28] }, { message: 'seal' }, { objective: 'Round the lagoon, north or south, to the hull in the east cliff' }] },
    { id: 'breach', when: 'enter', at: [46, 28], radius: 2.5, do: [{ wake: 'hull' }, { objective: 'Inside the Marrow Girl: the stair to the boat deck is in the engine room' }] },
    { id: 'deck', when: 'enter', at: [68, 11], radius: 3, do: [{ objective: 'The gate at the east end of the deck is shut: the winch is in the wheelhouse' }] },
    { id: 'north-dune', when: 'enter', at: [31, 18], radius: 5, do: [{ wake: 'north' }] },
  ],
  quality: { enemies: [22, 60], botSeconds: [40, 600], mechanics: ['heights', 'triggers', 'secret'], skins: 6, enemyKinds: { tollbearer: 8, gaunt: 4, chorister: 2, bellhand: 3 },
    scaleClass: 'MIXED', introduces: 'the other side of the Gate: a world with a red sun and no sea, where the Port Marrow people who came before you stand on the sand in rows, and the way back shuts behind you (a door that closes and stays shut)' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M01: enemies', P.ents.filter((e) => e.type === 'enemy').length);
// ---- PT-057 (R9, weapon mods): the scattergun double barrel, in a recess above the beach, off the road ----
MAP.entities ??= [];
MAP.entities.push(...[["mod_doublebarrel",59,37]].map(([kind, x, z]) => ({ type: 'pickup', kind, at: [x, z] })));
// ---- end PT-057 ----
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C2M01', lane: [...(laneOf('C2M01') ?? [])], keep: [], plan: [{"from":"tollbearer","to":"gaunt","pick":"spread","n":2}] };
ENC.apply(MAP);

export default MAP;
