// C2M12 THE DROWNED CHOIR: a flooded cathedral; a mass of earlier conversions. (Campaign 2, Act B THE SOUNDING DEEP; design/ACTB.md.)
// A Vael cathedral that the sea took when the sea was still here, and never gave back: the nave is full of green water to the knee, the choir stalls stand in it in rows, and in every stall there is a DROWNED: a Tollbearer in the
// colours the water has made of it (the same rig, tinted: `variant: 'drowned'`, engine PT-039), grafted standing in water and never taken out. A raised CAUSEWAY (dry, a metre above the water) runs up the middle of the nave
// from the narthex to the sanctuary steps, two aisle walks run along the sides, and the transept's wings are dry chapels. Three waves of the Drowned RISE out of the water cells as the player passes the thresholds of the
// nave. Water carries the ARC LAMP: a charged bolt jumps through up to eight bodies standing in it within 8 m (the room that arc lamp was made for). The sanctuary is a dais; behind the altar, on the choir loft, four
// Choristers conduct the Drowned and the exit is behind them (it opens when they are dead). A panel in the east chapel opens on a flooded crypt: the secret exit to the Silent Orchard (C2S01).
// SHAPE: a cathedral plan (narthex, nave with aisle arcades, transept, sanctuary, loft) and the causeway; the Drowned hold the water, the player holds the dry. Scale class SET-PIECE: the nave's roof is gone (the wreck fell
// through it), so the whole cathedral but the narthex and the crypt lies open to the cave's own roof (sky_deep).
import { Level } from '../tools/mapkit/builder.mjs';
import { setCell, box, ramp, placer } from '../tools/mapkit/c2.mjs';
import { skinWalls } from '../tools/mapkit/cave.mjs';

const W = 100, H = 104, L = new Level(W, H, { fill: '[' }); L.usedHeights = true; L.usedCeil = true; L.usedFx = true;
const ROCK = '[', DRY = ')', OUT = 's', NAVE = 'u', WET = 'f', STONE = '}', HULL = 'O', SLAB = '^';
const S = 0, N = Math.PI, EAST = Math.PI / 2, WEST = -Math.PI / 2;
const WATER = 4, WALK = 8, DAIS = 12, LOFT = 13;
// ---- the narthex and the nave ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
box(L, [38, 92, 58, 100], DRY, WALK, 24); box(L, [42, 90, 54, 91], DRY, WALK, 26);
box(L, [32, 30, 64, 89], NAVE, WATER); L.fx([32, 30, 64, 89], 'w');                                                          // the nave: wading water; its roof is gone (the hull came through it) and the cave's own roof is the sky
box(L, [45, 30, 51, 89], OUT, WALK); L.fx([45, 30, 51, 89], '.');                                                    // the causeway: dry, a metre above the water
box(L, [20, 30, 29, 89], OUT, WALK);                                                                                // west aisle walk
box(L, [67, 30, 76, 89], OUT, WALK);                                                                                // east aisle walk
for (let z = 32; z <= 88; z += 6) { box(L, [30, z, 31, z + 1], STONE); box(L, [65, z, 66, z + 1], STONE); }                      // the arcades: a pillar and a four-cell arch, down both sides
// ---- ways out of the water: ramps (a unit a cell) from the nave up to the causeway on both sides and up to each aisle walk through the arches, so that nobody who steps into the water is trapped in it ---------------------------------------------------------------------------------------------------------
for (const z of [40, 62, 82]) { ramp(L, [41, z, 44, z + 2], 'x', WATER, WALK - 1, NAVE); ramp(L, [52, z, 55, z + 2], 'x', WALK - 1, WATER, NAVE); }
for (const z of [38, 62, 74]) { ramp(L, [32, z, 35, z + 2], 'x', WALK - 1, WATER, NAVE); ramp(L, [61, z, 64, z + 2], 'x', WATER, WALK - 1, NAVE); }
for (const z of [38, 62, 74]) { box(L, [30, z, 31, z + 2], OUT, WALK); box(L, [65, z, 66, z + 2], OUT, WALK); }                  // the arches stand open at the ramps
// ---- the transept: dry wings (chapels) at both ends of the crossing ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
box(L, [8, 46, 29, 58], OUT, WALK); box(L, [67, 46, 88, 58], OUT, WALK);
for (const x of [12, 16, 20]) { box(L, [x, 48, x + 1, 49], STONE); box(L, [x, 55, x + 1, 56], STONE); }
for (const x of [76, 80, 84]) { box(L, [x, 48, x + 1, 49], STONE); box(L, [x, 55, x + 1, 56], STONE); }
// ---- the sanctuary: a dais at the north end, steps from the causeway, a loft behind the altar --------------------------------------------------------------------------------------------------------------------------------------------------------------------
ramp(L, [44, 26, 52, 29], 'z', DAIS, WALK, OUT);                                                                       // the steps: four rows, four units
box(L, [32, 11, 64, 25], OUT, DAIS); box(L, [32, 26, 43, 29], NAVE, WATER); L.fx([32, 26, 43, 29], 'w'); box(L, [53, 26, 64, 29], NAVE, WATER); L.fx([53, 26, 64, 29], 'w');
box(L, [38, 11, 58, 16], OUT, LOFT);                                                                                // the loft: two units above the dais
box(L, [44, 18, 52, 19], STONE);                                                                                         // the altar (a block of stone) with the loft behind it
// ---- the hull: the wreck that fell through the roof and lies across the transept's crossing (cover in the water) ------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x0, z0, x1, z1] of [[34, 50, 40, 51], [56, 50, 62, 51], [34, 54, 36, 54], [60, 54, 62, 54]]) { box(L, [x0, z0, x1, z1], HULL); L.fx([x0, z0, x1, z1], '.'); }
// ---- the secret crypt: a flooded room behind a panel in the east chapel's end wall; the secret exit is at its far end -----------------------------------------------------------------------------------------------------------------------------------------------------------
const SEC = { panel: [89, 52], cells: [] };
for (let z = 49; z <= 55; z++) for (let x = 90; x <= 96; x++) { setCell(L, x, z, WET, WATER, 30); SEC.cells.push([x, z]); } L.fx([90, 49, 96, 55], 'w');
setCell(L, 89, 52, 'S', WALK);
// ---- the walls of a drowned stone cathedral ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
skinWalls(L, ROCK, () => STONE);
const P = placer(L); L.put(48, 98, '@'); P.reserve(48, 98);
const { E, P: PK, PR } = P;
// ---- the stalls: rows of pews standing in the water on both sides of the causeway ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (let z = 36; z <= 84; z += 4) for (const x of [35, 40, 56, 61]) { if (z > 44 && z < 62) continue; PR('pew', x, z); }
for (const x of [36, 41, 55, 60]) { PR('pew', x, 64); PR('pew', x, 68); }
PR('organ', 48, 21); PR('organ', 40, 22); PR('organ', 56, 22);
for (let z = 36; z <= 86; z += 10) { PR('lantern', 44, z); PR('lantern', 52, z); }
for (let z = 34; z <= 86; z += 8) { PR('lantern', 22, z); PR('lantern', 74, z); }
for (const [x, z] of [[12, 52], [24, 52], [78, 52], [84, 52], [40, 96], [56, 96], [44, 20], [52, 20]]) PR('lantern', x, z);
// ---- supplies (ammunition comes from the dead) -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[48, 94], [48, 82], [48, 72], [48, 60], [48, 48], [48, 38], [24, 80], [24, 60], [24, 40], [72, 80], [72, 60], [72, 40], [12, 52], [84, 52], [42, 22], [54, 22], [48, 14]]) PK((x + z) % 3 ? 'health_small' : 'health_large', x, z);
for (const [x, z] of [[48, 88], [24, 70], [72, 70], [48, 54], [48, 30]]) PK('armor_vest', x, z);
for (const [x, z] of [[93, 51], [93, 53]]) PK('armor_vest', x, z); PK('health_large', 91, 50); PK('ammo_cell', 91, 54); PK('ammo_cell', 95, 50); PK('ammo_bolt', 92, 52); PK('ammo_shell', 95, 54);                     // the crypt (the arc lamp's cells)
// ---- the Drowned: standing in the stalls (idle until they see or hear you), and three waves that rise as the thresholds are crossed -----------------------------------------------------------------------------------------------------------------------------
const drowned = (x, z, facing = S) => E('tollbearer', x, z, { facing, variant: 'drowned' });
for (let z = 38; z <= 86; z += 6) for (const x of [34, 38, 58, 62]) { if (z > 46 && z < 60) continue; drowned(x + (z % 4 ? 1 : 0), z, x < 48 ? EAST : WEST); }
for (const [x, z] of [[36, 52], [44, 55], [52, 55], [60, 52], [40, 46], [56, 46], [38, 58], [58, 58]]) drowned(x, z, S);
// ---- the rest of the choir's company --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[24, 74], [24, 44], [72, 74], [72, 44]]) E('bulwark', x, z);
for (const [x, z] of [[40, 62], [56, 62], [40, 78], [56, 78], [44, 40], [52, 40]]) E('gill', x, z);
E('chorister', 12, 52); E('chorister', 84, 52);
for (const x of [42, 46, 50, 54]) E('chorister', x, 13, { facing: S, group: 'choir' });
E('sexton', 48, 15, { group: 'choir' });
for (const [x, z] of [[22, 36], [74, 36], [24, 84], [72, 84]]) E('tollbearer', x, z);
for (const [x, z] of [[22, 62], [74, 62], [28, 40], [68, 40]]) E('gaunt', x, z);
// ---- the waves: the Drowned rise out of the water (spawned in wading cells, awake) -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const wave = (cells, group) => cells.map(([x, z]) => ({ spawn: { kind: 'tollbearer', variant: 'drowned', at: [x, z], group, facing: S } }));
const rise = (z, xs) => xs.map((x) => [x, z]);
const MAP = {
  id: 'C2M12', name: 'The Drowned Choir', version: 1, ceilingHeight: 4.2, par: { time: 600 },
  atmosphere: { look: 'drowned', sky: 'deep', fog: '#0a1814', fogDensity: 0.016 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 30, shell: 20, rivet: 90, bolt: 10, cell: 60, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'THE DROWNED CHOIR', lines: ['A cathedral the sea took, and the water never left.', 'The choir is still in its stalls.'] },
  outro: 'Behind the altar a stair goes down. The water on the first steps is perfectly still.',
  objective: 'Walk the causeway up the nave to the sanctuary. The exit is behind the altar, and the choir that keeps the Drowned standing is between',
  ...L.layers(),
  secrets: [{ id: 'crypt', panel: SEC.panel, cells: SEC.cells }],
  groups: [],
  entities: [...P.ents,
    { type: 'switch', id: 'rope', at: [36, 11], wall: 'north', once: true, do: [{ exit: { id: 'main', set: 'unlock' } }, { objective: 'The organ has opened the stair: the exit is behind the altar' }, { message: 'rope' }] },
    { type: 'exit', id: 'main', at: [48, 12], dest: 'next', locked: true }, { type: 'exit', id: 'secret', at: [95, 52], dest: 'secret' }],
  scenery: [],
  messages: [
    { id: 'start', at: [48, 97], radius: 4, speaker: 'INES', text: 'A cathedral up to the knees in green water, and the choir stalls are under it. Every stall is full. They are standing.' },
    { id: 'boots', at: [48, 86], radius: 5, speaker: 'INES', text: 'Oilskin boots, the heel stamped with a yard number. Pender yard. Every one of them was on a boat.' },
    { id: 'arc', at: [48, 78], radius: 5, speaker: 'HULL', text: 'The causeway is dry. The rest is wading water, and water carries the arc lamp: a charged bolt jumps between bodies standing in it, eight metres, up to eight of them.' },
    { id: 'plate', at: [48, 68], radius: 3, speaker: 'RINGING PLATE', text: 'Run a nail down it: the stalls of this choir hold three hundred and twelve. The count says they are all present.' },
    { id: 'rise1', at: [1, 1], radius: 0.1, speaker: 'INES', text: 'The water has moved. Something has stood up in it, and something else after that.' },
    { id: 'wing', at: [24, 52], radius: 4, speaker: 'INES', text: 'A chapel with its own roof and a dry floor. The singer in it is not a Drowned. It was never in the water.' },
    { id: 'choir', at: [48, 30], radius: 5, speaker: 'INES', text: 'Four singers on a loft behind the altar, and the exit behind them. The Drowned stand because they are told to. These four are doing the telling.' },
    { id: 'silent-w', at: [48, 40], radius: 6, speaker: 'INES', text: 'The ones in the low halls said these were the first. They did not say they were ours. I think they did not know.', choice: 'halls=silent' },
    { id: 'songkeeper-w', at: [48, 40], radius: 6, speaker: 'INES', text: 'The ranks in the long gallery said the choir was theirs to keep. I did not ask who sang in it before.', choice: 'halls=songkeepers' },
    { id: 'hollow', at: [87, 52], radius: 2, speaker: 'HULL', text: 'The east chapel rings hollow behind its last pillar, and the floor beyond it is wet.' },
    { id: 'crypt', at: [93, 52], radius: 4, speaker: 'A SILENT (NOTE)', text: 'The way down for those of us who are carried out. Go quietly. There is a garden at the bottom, and a keeper who has been waiting.' },
    { id: 'open', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The four on the loft are down. The Drowned are still standing, and nobody is telling them to do anything now.' },
    { id: 'rope', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The rope at the north wall rings the organ. The stair behind the altar was kept shut by the same rope, from this side.' },
  ],
  triggers: [
    { id: 'rise-a', when: 'enter', at: [48, 78], radius: 4, do: [{ message: 'rise1' }, ...wave(rise(76, [36, 40, 56, 60]).concat(rise(80, [34, 62])), 'wave-a')] },
    { id: 'rise-b', when: 'enter', at: [48, 58], radius: 4, do: [...wave(rise(60, [36, 40, 44, 52, 56, 60]).concat(rise(66, [38, 58])), 'wave-b')] },
    { id: 'rise-c', when: 'enter', at: [48, 40], radius: 4, do: [...wave(rise(42, [36, 40, 44, 52, 56, 60]).concat(rise(36, [38, 58])), 'wave-c')] },
    { id: 'choir-down', when: 'dead:choir', do: [{ objective: 'The choir is down. The organ rope is by the north wall' }, { message: 'open' }] },
    { id: 'nave', when: 'enter', at: [48, 84], radius: 4, do: [{ objective: 'The nave: the causeway is dry; the Drowned hold the water' }] },
    { id: 'steps', when: 'enter', at: [48, 30], radius: 4, do: [{ objective: 'The sanctuary: the loft behind the altar holds the choir' }] },
  ],
  quality: { enemies: [30, 110], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 6, enemyKinds: { tollbearer: 20, gill: 4, chorister: 4, bulwark: 2, gaunt: 3 },
    scaleClass: 'SET-PIECE', reason: 'the nave lost its roof when a hull came through it: the player crosses the open water on a causeway, with the Drowned in the stalls on both sides', introduces: 'the drowned: a flooded cathedral whose choir stalls hold a crowd of the earliest conversions, a dry causeway through them, and the arc lamp\'s bolt jumping through the water' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M12: enemies', P.ents.filter((e) => e.type === 'enemy' && e.kind !== 'vaelfolk').length, 'drowned placed', P.ents.filter((e) => e.variant === 'drowned').length);
export const waypoints = {
  main: [[48, 98, 0], [48, 92, 0], [48, 84], [48, 76], [48, 66], [48, 56], [48, 46], [48, 36], [48, 30], [48, 26], [48, 22], [48, 18], [48, 15], [38, 13], { op: 'switch', id: 'rope' }, [48, 13], [48, 12, 0]],
  secret: [[48, 98, 0], [48, 92, 0], [48, 84], [48, 76], [48, 66], [48, 56], [58, 54], [72, 52], [86, 52], { op: 'use', at: [89, 52] }, [93, 52, 0], [95, 52, 0]],
};
export default MAP;
