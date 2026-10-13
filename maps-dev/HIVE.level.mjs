// THE HIVE PREVIEW (PT-043, design/PREVIEW.md): a DEV-ONLY map beside the Range (maps-dev/RANGE.level.mjs) and the Deep Range (DEEP.level.mjs): not one of the 68, never in maps/, never validated, counted or scored. Build it with
//   node tools/dev/build-range.mjs HIVE        (writes maps-dev/HIVE.json); the DEV level picker on the title screen lists it. The Range's rules: every weapon from the start, ammunition refilled, a player who cannot die.
// It is the place where the new creatures, looks and mechanics of Acts C and D are SEEN and TRIED before any map is built on them. A long spine (x 83..88) runs south from the looks corridor; off it:
//   NORTH, the looks wing: a corridor (z 26..29) with fourteen rooms, seven each side: the eight places of Act C and the six of Act D, each lit by its OWN look (`lookZones`), each with its own walls, floor, sky and a plate naming it
//   WEST of the hub, the bestiary: three halls (the Resonant, the Hive Cantor, the Root Bell's clapper), each with creatures asleep, as sponges, and (where it lives) live behind a lever
//   EAST of the hub, the scenery pavilion: the seven landmarks of the acts (tower, ganglion, reactor, rails, crystal tower, root column, shaft)
//   SOUTH, the lineup: every creature in the game in a row (shortest first), the variants in a second row
// The two boss arenas are in HIVEBOSS (the real rules), the ending is HIVEEND. Drop B (conveyors, cars, tide, tall shaft, collapse, noise tell) adds its yards to this map.
import { Level } from '../tools/mapkit/builder.mjs';
import { placer } from '../tools/mapkit/c2.mjs';
import { ENEMIES, FLOOR_SKINS } from '../src/engine/defs.js';

const W = 198, H = 120, L = new Level(W, H, { fill: '#' }); L.usedHeights = true; L.usedCeil = true;
const S = 0, N = Math.PI, EAST = Math.PI / 2, WEST = -Math.PI / 2;
const P = placer(L, { silent: false }), ents = P.ents, put = (e) => ents.push(e);
const enemy = (kind, x, z, facing, extra = {}) => put({ type: 'enemy', kind, at: [x, z], facing, ...extra });
const SPONGE = { hold: 'inert', hp: 5000 }, ASLEEP = { sight: 2.5 };
const messages = [];
const say = (id, x, z, r, speaker, text) => messages.push({ id, at: [x, z], radius: r, speaker, text });
const HULL = 'HULL';

// ---- the spine, the hub and the looks corridor ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const N0 = '#', FL = 't';                                                                                                // the neutral parts: bulkhead and tile (the `customs` look)
L.room([8, 26, 190, 29], { floor: FL, wall: 'P' });
L.room([83, 26, 88, 116], { floor: FL, wall: 'P' });
L.disc(85.5, 70, 10, 10, FL, 'P');
// ---- the looks wing: fourteen rooms, each with its own walls and floor (the Greek letters are the Acts C and D skins, defs.js) --------------------------------------------------------------------------------------------------------------
const LOOKS = [
  // [name, look, wall, floor, roofed, plate, dressing prop]
  ['THE THROAT, C2M17', 'hive', 'α', 'Α', false, 'a gorge of folded flesh-rock with amber veins and a red sun behind the Hive tower. Judge: a place, or a brown room?', 'pillar', 'hive'],
  ['THE NERVE CATHEDRAL, C2M18', 'nerve', 'β', 'Β', false, 'a black lattice of pink nerves over a glowing red void. Judge: does it read as a lattice you cross, not a wall you pass?', 'pillar', 'hive'],
  ['THE BONE LOOM, C2M19', 'woven', 'γ', 'Γ', true, 'bone woven like basketwork, cream and old gold, warm light. Judge: a loom, or wallpaper?', 'organ'],
  ['THE VEIN RAIL, C2M20', 'veins', 'δ', 'Δ', true, 'iron plate over red muscle with blue vessels, a deck of diamond tread. Judge: a place a train runs through?', 'pillar'],
  ['THE PULSE FOUNDRY, C2M21', 'reactor', 'ε', 'Ε', true, 'copper panels and orange portholes, a grate that glows from beneath. Judge: heat, and the room the Resonants live in?', 'vat'],
  ['THE MOURNING HALLS, C2M22', 'mourning', 'ζ', 'Ζ', true, 'ash-white plaster, black cloth hung in scallops, almost no colour. Judge: quiet and grief, or an empty gallery?', 'pew'],
  ['THE REPRISE, C2M23', 'copy', 'η', 'Η', false, 'the quay as the Hive remembers it, in glass, under two suns. Judge: wrong in a way you can feel, or a blue room?', 'pillar', 'marrow_wrong'],
  ['CHOIR OF ONE, C2M24', 'conductor', 'θ', 'Θ', true, 'pale nerve-white stone, rows of seats, a ring of pink lamps. Judge: a hall built for a choir?', 'organ'],
  ['THE DESCENT, C2M25', 'descent', 'ι', 'Ι', false, 'black wet stone, copper going green, a well. Judge: is it a different kind of dark from the Deep?', 'pillar', 'root'],
  ['THE SILENT ROOTS, C2M26', 'roots', 'κ', 'Κ', true, 'wood, pale dead moss, loam: no green anywhere. Judge: a forest that is dead, or a brown cave?', 'pillar'],
  ['THE FAULT LINE, C2M27', 'fault', 'λ', 'Λ', false, 'split basalt, copper light welling up in the cracks. Judge: a place about to fall?', 'pillar', 'hive'],
  ['THE LAST TIDE, C2M28', 'tide', 'μ', 'Μ', false, 'a round dock: lime line, weed, drowned oak, a mooring ring. Judge: the harbour again, or something else?', 'pillar', 'dusk'],
  ['INSIDE THE BELL, C2M29', 'rootbell', 'ν', 'Ν', true, 'bronze plates, verdigris, roots stitched through them, one copper glow. Judge: the inside of a bell?', 'pillar'],
  ['THE UNRUNG GATE, C2M30', 'unrung', 'ξ', 'Ξ', true, 'pale dim marble, one gold line, a path worn down the middle. Judge: the end of the road, or a corridor?', 'pillar'],
];
const NORTH = [8, 34, 60, 86, 112, 138, 164].map((x0) => [x0, x0 + 20]), SOUTH = [[8, 28], [34, 54], [60, 76], [96, 116], [122, 142], [148, 168], [174, 194]];
const zones = [], scen = [];
const SCEN = {                                                                                        // the landmark each room looks at, over its far wall: [kind, x, z, y, scale, yaw]
  0: ['hivetower', 18, 3, 0, 1, 0], 1: ['ganglion', 44, 4, 0, 1.4, 0], 3: ['rails', 96, 2, 0, 1, 1.5708], 4: ['reactor', 122, 3, 0, 1.2, 0], 6: ['crystaltower', 174, 3, 0, 1, 0],
  8: ['shaft', 44, 53, 0, 1.3, 0], 9: ['rootcolumn', 68, 51, 0, 1.4, 0], 13: ['arch', 158, 53, 0, 0.8, 0],
};
LOOKS.forEach((lk, i) => {
  const [name, look, wall, floor, roofed, plate, prop, sky] = lk, north = i < 7, [x0, x1] = north ? NORTH[i] : SOUTH[i - 7], z0 = north ? 9 : 33, z1 = north ? 23 : 47, mid = Math.round((x0 + x1) / 2), cz = (z0 + z1) / 2 | 0;
  L.room([x0, z0, x1, z1], { floor, wall });
  const dz = north ? [24, 25] : [30, 32];
  L.rect([mid - 3, dz[0], mid + 3, dz[1]], floor);                                                                     // the doorway to the corridor, in the room's own floor
  if (roofed) L.ceiling([x0, z0, x1, z1], i === 12 ? 14 : i === 7 ? 12 : 7);
  zones.push({ rect: [x0 - 1, north ? z0 - 1 : z0 - 3, x1 + 1, north ? z1 + 3 : z1 + 1], look, ...(sky ? { sky } : {}) });
  for (const [dx, dz2] of [[3, 3], [x1 - x0 - 3, 3], [3, z1 - z0 - 3], [x1 - x0 - 3, z1 - z0 - 3]]) put({ type: 'prop', kind: roofed && FLOOR_SKINS[floor].kind === 'floor' ? 'lamp' : 'lamppost', at: [x0 + dx, z0 + dz2] });      // PT-043 report 1: a lamp hangs from a ceiling; in the open, a post (the placement lint: tools/maplint.mjs)
  put({ type: 'prop', kind: prop, at: [mid, cz] }); put({ type: 'prop', kind: prop, at: [x0 + 5, cz - 3] }); put({ type: 'prop', kind: prop, at: [x1 - 5, cz + 3] });
  say('look' + i, mid, north ? z1 - 2 : z0 + 2, 5, HULL, name + ': ' + plate);
  if (SCEN[i]) { const [kind, sx, sz, sy, sc, yaw] = SCEN[i]; scen.push({ kind, at: [sx, sz], y: sy, scale: sc, yaw }); }
});
// ---- the bestiary: three halls west of the hub ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const hall = (r, passage) => { L.room(r, { floor: FL, wall: N0 }); L.room(passage, { floor: FL, wall: N0 }); };
const HR = [40, 52, 72, 62], HH = [40, 64, 72, 80], HB = [40, 84, 72, 100];
hall(HR, [73, 55, 82, 58]); hall(HH, [73, 70, 76, 73]); hall(HB, [73, 90, 82, 93]);
L.ceiling(HH, 12); L.ceiling(HB, 17);
for (const r of [HR, HH, HB]) zones.push({ rect: [r[0] - 1, r[1] - 1, r[2] + 1, r[3] + 1], look: 'customs', beat: r !== HB });
for (const r of [HR, HH, HB]) for (let x = r[0] + 4; x <= r[2] - 3; x += 9) { put({ type: 'prop', kind: 'lamp', at: [x, r[1] + 1] }); put({ type: 'prop', kind: 'lamp', at: [x, r[3] - 1] }); }
const stand = (cx, cz, h = 1) => { L.rect([cx - 1, cz - 1, cx + 1, cz + 1], 'f'); L.height([cx - 1, cz - 1, cx + 1, cz + 1], h); };
// THE RESONANT: asleep, a sponge, and three pens woken by a lever
stand(46, 55); enemy('resonant', 46, 55, EAST, ASLEEP);
stand(54, 55); enemy('resonant', 54, 55, EAST, SPONGE);
say('rs1', 48, 58, 5, HULL, 'RESONANT, asleep (left) and a sponge (right): 420 hp, slow, three bodies fused at the hip, a ring of bells welded round the waist. Judge the outline, the colour, the hit volume.');
say('rs2', 61, 58, 6, HULL, 'THE PENS (lever, south wall): one Resonant alone, three together, one with two Tollbearers. A ring every beat: 5 x (1 + company), 20 at most. A metre up, it passes under.');
L.rect([60, 59, 62, 61], FL); enemy('resonant', 61, 60, EAST, { group: 'rs-lone', ...ASLEEP });
enemy('resonant', 66, 57, EAST, { group: 'rs-three', ...ASLEEP }); enemy('resonant', 66, 60, EAST, { group: 'rs-three', ...ASLEEP }); enemy('resonant', 69, 58.5, EAST, { group: 'rs-three', ...ASLEEP });
enemy('resonant', 51, 60, EAST, { group: 'rs-mixed', ...ASLEEP }); enemy('tollbearer', 49, 59, EAST, { group: 'rs-mixed', ...ASLEEP }); enemy('tollbearer', 49, 61, EAST, { group: 'rs-mixed', ...ASLEEP });
put({ type: 'switch', id: 'pens', at: [57, 62], wall: 'south', once: true, do: [{ wake: 'rs-lone' }, { wake: 'rs-three' }, { wake: 'rs-mixed' }, { objective: 'The pens are awake: one Resonant alone, three together, one with company' }, { shake: 1 }] });
// THE HIVE CANTOR: asleep, a sponge over its podium with six singers on a tier (the unison shield: kill them and it takes the full blow)
stand(46, 68, 1); enemy('hivecantor', 46, 68, EAST, ASLEEP);
L.rect([53, 71, 59, 77], 'f'); L.height([53, 71, 59, 77], 2); enemy('hivecantor', 56, 74, EAST, SPONGE);
for (let k = 0; k < 6; k++) { const a = Math.PI * (0.55 + 0.9 * k / 5), x = Math.round(56 + Math.cos(a + Math.PI) * 9.5 - 0), z = Math.round(74 + Math.sin(a) * 6.5); L.rect([x - 1, z - 1, x + 1, z + 1], 'f'); L.height([x - 1, z - 1, x + 1, z + 1], 3); enemy('tollbearer', x, z, EAST, { group: 'choir', hold: 'inert', hp: 40 }); }
say('hc1', 48, 70, 5, HULL, 'HIVE CANTOR, asleep (left). 1500 hp, hovering, arms out, ten fingers. It never walks. Its fight is in HIVEBOSS: a double ring that returns, on the beat.');
say('hc2', 56, 69, 6, HULL, 'A sponge over its podium; the threads run to the choir. It takes 5% while the six singers stand, more with each one that falls (they stand up after 5 s). Shoot the singers first.');
// THE ROOT BELL'S CLAPPER: asleep, still, swinging, and the anchors
stand(46, 92); enemy('rootbell', 46, 92, EAST, ASLEEP);
stand(56, 92); enemy('rootbell', 56, 92, EAST, SPONGE);
stand(67, 92); enemy('rootbell', 67, 92, EAST, { ...SPONGE, swing: true });
for (const [x, z] of [[46, 98], [52, 98], [58, 98], [64, 98]]) { stand(x, z, 1); enemy('rootanchor', x, z, EAST, {}); }
say('rb1', 49, 88, 6, HULL, 'THE CLAPPER: a bronze cage round a copper heart, wound in black root, hung from the dome. Asleep (left), still (middle): look at it. The right one swings: lead it.');
say('rb2', 55, 96, 6, HULL, 'ROOT ANCHORS: four pin the chain in the fight. While one stands the clapper takes 30% of a hit; each one cut lowers it and widens the swing. The real fight is in HIVEBOSS.');
// ---- the scenery pavilion: east of the hub, open to the sky --------------------------------------------------------------------------------------------------------------------------------------------------------------------------
L.room([96, 58, 140, 82], { floor: 'p', wall: 'P' }); L.room([89, 68, 95, 71], { floor: FL, wall: 'P' });
zones.push({ rect: [95, 57, 141, 83], look: 'hive', sky: 'hive' });
for (const [x, z] of [[100, 62], [136, 62], [100, 78], [136, 78], [118, 70]]) put({ type: 'prop', kind: 'lamppost', at: [x, z] });
for (const [kind, x, z, y, sc, yaw] of [['hivetower', 100, 54, 0, 1, 0], ['ganglion', 112, 54, 0, 1.3, 0], ['reactor', 124, 54, 0, 1.2, 0], ['crystaltower', 136, 54, 0, 1, 0], ['rootcolumn', 100, 88, 0, 1.2, 0], ['shaft', 114, 88, 0, 1.2, 0], ['rails', 130, 90, 0, 1, 1.5708]]) scen.push({ kind, at: [x, z], y, scale: sc, yaw });
say('scen', 104, 70, 8, HULL, 'THE SCENERY, over the walls: tower, ganglion, reactor, crystal tower (north); root column, shaft, rails (south). In the maps they stand far off; look at each from here.');
// ---- the lineup: every creature in the game, shortest first, and the variants ----------------------------------------------------------------------------------------------------------------------------------------------------------------
L.room([12, 104, 82, 114], { floor: FL, wall: N0 });
zones.push({ rect: [11, 103, 82, 115], look: 'customs' });
for (let x = 18; x <= 78; x += 12) put({ type: 'prop', kind: 'lamp', at: [x, 105] });
const ORDER = ['gaunt', 'gill', 'vaelfolk', 'chorister', 'bellhand', 'sexton', 'tollbearer', 'zealot', 'resonant', 'acolyte', 'wardengraft', 'bulwark', 'weeping', 'cantor', 'subcantor', 'hivecantor', 'graftmother', 'grandcantor', 'gatewarden', 'rootbell', 'bellnode', 'feeder', 'rootanchor', 'seal', 'reed', 'vat'];
const heightOf = (k) => (ENEMIES[k].height ?? 2) + (ENEMIES[k].hover ?? 0);
const sorted = [...ORDER.filter((k) => !ENEMIES[k].node && !ENEMIES[k].boss && k !== 'rootbell'), ...ORDER.filter((k) => ENEMIES[k].boss || k === 'rootbell'), ...ORDER.filter((k) => ENEMIES[k].node && k !== 'rootbell' && k !== 'hivecantor')];
for (const k of Object.keys(ENEMIES)) if (!sorted.includes(k)) sorted.push(k);
let lx = 15, prevR = 0.5;
for (const kind of sorted) { const r = ENEMIES[kind].radius ?? 0.5; lx += (prevR + r) / 2 + 1.6; enemy(kind, Math.round(lx), 107, S, { hold: 'inert', hp: 5000 }); prevR = r; }
const LINE_END = lx;
say('line', 17, 110, 6, HULL, 'THE LINEUP: every creature in the game at true scale, as sponges: shortest first, then the bosses, then the nodes. Judge the new against the old: outline, height, colour.');
// the variants: tints only
const VAR = [['tollbearer', null], ['tollbearer', 'drowned'], ['tollbearer', 'hived'], ['tollbearer', 'woven'], ['tollbearer', 'crystal'], ['gaunt', null], ['gaunt', 'hived'], ['gaunt', 'woven'], ['gaunt', 'crystal']];
VAR.forEach(([kind, variant], i) => enemy(kind, 24 + i * 3.5, 112, N, { hold: 'inert', hp: 5000, ...(variant ? { variant } : {}) }));
for (let x = 24; x <= 54; x += 5) put({ type: 'prop', kind: 'lamp', at: [x, 110] });                                                                                              // light on the variants: a tint is hard to judge in the dark
say('var', 22, 109, 5, HULL, 'THE VARIANTS (the near row): plain, Drowned, Hived, Woven, Crystal. A tint on the same rig and nothing else. Is each a different creature, or a tint too far?');
// ---- the hub, the start, the exit ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(85, 70, '@');
put({ type: 'exit', dest: 'next', at: [85, 115] });
for (const [x, z] of [[80, 66], [91, 66], [80, 74], [91, 74]]) put({ type: 'prop', kind: 'lamp', at: [x, z] });
say('hub', 85, 70, 6, HULL, 'THE HIVE PREVIEW (dev): north, the 14 looks; west, the bestiary; east, the scenery; south, the lineup and the exit. HIVEBOSS and HIVEEND are separate maps in the picker.');
say('exit', 85, 112, 4, HULL, 'THE EXIT is south of here: it goes back to the title.');
const layers = L.layers();

export default {
  id: 'HIVE', name: 'The Hive Preview (dev only)', version: 1, ceilingHeight: 6, range: true,
  atmosphere: { look: 'customs', fog: '#9aa4a8', fogDensity: 0.004, sky: 'dusk' },
  entryLoadout: { hp: 100, armor: 100, ammo: { flare: 30, shell: 40, rivet: 200, bolt: 24, cell: 100, round: 180, rocket: 12 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine', 'linethrower', 'fork', 'mortar', 'boathook', 'marlinspike', 'mallet', 'axe', 'chainsaw'] },
  intro: { title: 'THE HIVE PREVIEW', lines: ['The new creatures, looks and mechanics of Acts C and D, before any map is built on them.', 'Every weapon. Nothing runs out. You cannot die. F8 slows the game.'] },
  objective: 'HIVE PREVIEW: looks north, bestiary west, scenery east, lineup south',
  ...layers,
  lookZones: zones,
  entities: ents.map((e) => ({ ...e })),
  scenery: scen,
  startFacing: 'north',
  messages,
  triggers: [],
};
console.log('HIVE: lineup ends at x', Math.round(LINE_END), 'enemies', ents.filter((e) => e.type === 'enemy').length);
