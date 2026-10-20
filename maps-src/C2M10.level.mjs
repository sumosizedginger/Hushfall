// C2M10 ECHO MARKETS: a ring bazaar round an echo-well; dozens of peaceful Vael, Zealots among them. (Campaign 2, Act B THE SOUNDING DEEP; design/ACTB.md.)
// A hall 86 m across under a cave roof, and in it a market laid out as a wheel: the WELL in the middle (a funnel 3 m deep, the one place in the hall where a loud noise turns round and comes back), a plaza ring round the
// well, three belts of houses and stalls between rings of street, twelve alleys through the belts, each belt's alleys offset from the last so that no street runs straight through (the sightline is short). `atmosphere.echo: 2`:
// a SHOT carries twice as far in here (engine: ECHO in defs.js, noise() in world.js; the arc lamp uncharged, a blow and the fork are quiet and carry as they always did). The crowd runs from a shot, the Zealots and porters
// sleeping in the alleys wake to it, and the north gate is on a SOUND-LOCK: it will not open while the hall has been loud inside the last six seconds. The verb is aim discipline: a civilian shot is an innocent (a message and a rank
// cost, never a death). Scale class COMPRESSION (all roofed, short sightlines). No new engine beyond the echo.
// SHAPE: a wheel, not a box: a funnel well, a plaza ring, three belts of houses with seeded gaps and a few open squares, an outer street along the cave wall; the south gate and north gate are straight corridors.
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';
import { setCell, box, placer } from '../tools/mapkit/c2.mjs';
import { blob, rng } from '../tools/mapkit/cave.mjs';

const SC = 0.82, W = 88, H = 88, CX = 44, CZ = 44, L = new Level(W, H, { fill: '[' }); L.usedHeights = true; L.usedCeil = true;
const ROCK = '[', FLAG = 'f', PLAZA = ')', WELL = '{', CITY = ']', MARBLE = '|', SLAB = '^', CARPET = 'c', BONE = '*';
const BASE = 6, S = 0, N = Math.PI, EAST = Math.PI / 2, WEST = -Math.PI / 2;
const rnd = rng(1010);
// ---- the hall: one carved cavern under a dome (floor 3 m up, the vault 13 to 17 m) ----------------------------------------------------------------------------------------------------------------------------------------------------------
const hall = blob(L, CX, CZ, 43 * SC, 43 * SC, { seed: 101, rough: 0.05, ch: FLAG, h: BASE, lidMid: 34, lidEdge: 27 });
const polar = (r, deg) => [Math.round(CX - 0.5 + r * SC * Math.cos((deg * Math.PI) / 180)), Math.round(CZ - 0.5 + r * SC * Math.sin((deg * Math.PI) / 180))];       // deg 0 = east, 90 = south, -90 = north
// ---- the wheel: classify every carved cell by radius and angle ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const BELTS = [{ r0: 12.5, r1: 16.5, off: 0, w: 3.6 }, { r0: 20, r1: 25.5, off: 15, w: 3.6 }, { r0: 29.5, r1: 35, off: 0, w: 4 }];
const openSq = new Set(); for (const [b, k] of [[0, 1], [0, 8], [1, 3], [1, 10], [2, 5], [2, 11], [2, 2]]) openSq.add(b + ':' + k);        // sectors with no houses: small squares
const wellCells = [], houseCells = [];
for (const [x, z] of hall) {
  const dx = x + 0.5 - CX, dz = z + 0.5 - CZ, rc = Math.hypot(dx, dz), r = rc / SC, th = (Math.atan2(dz, dx) * 180) / Math.PI;
  if (r < 8) { setCell(L, x, z, WELL, Math.max(0, BASE - Math.round(6.5 - rc))); wellCells.push([x, z]); continue; }
  if (r < 12.5) { setCell(L, x, z, PLAZA); continue; }
  for (const [bi, b] of BELTS.entries()) {
    if (r < b.r0 || r >= b.r1) continue;
    const sector = Math.floor((((th - b.off) % 360) + 360) % 360 / 30), phase = ((((th - b.off) % 30) + 30) % 30), distToGap = Math.min(phase, 30 - phase) * (Math.PI / 180) * rc;
    if (distToGap < b.w / 2 || openSq.has(bi + ':' + sector)) break;                                               // an alley, or an open square
    setCell(L, x, z, CITY); houseCells.push([x, z]); break;
  }
  if (r >= 35.5 && L.g[z][x] === FLAG) setCell(L, x, z, '{');                                                   // the outer street along the wall is flowstone
}
// ---- the gates: a corridor from the south with the start, the sound-locked north gate and its antechamber -------------------------------------------------------------------------------------------------------------------------------------------------
for (let z = 77; z <= 84; z++) for (let x = CX - 1; x <= CX + 1; x++) setCell(L, x, z, FLAG, BASE, 14);
for (let z = 6; z <= 12; z++) for (let x = CX - 2; x <= CX + 2; x++) setCell(L, x, z, FLAG, BASE, 20);
for (let z = 2; z <= 4; z++) setCell(L, CX, z, SLAB, BASE, 14); setCell(L, CX - 1, 5, MARBLE, BASE); setCell(L, CX + 1, 5, MARBLE, BASE); L.door(CX, 5, { soundlock: { quiet: 6, radius: 45 } }); L.height([CX, 5, CX, 5], BASE);
// ---- the store: a secret room in the west wall behind a panel (the quiet bazaar: the Silent sell at the back) ----------------------------------------------------------------------------------------------------------------------------------------------
let xw = 99; for (const [x, z] of hall) if (z === CZ && x < xw) xw = x;
const SEC = { panel: [xw - 1, CZ], cells: [] };
for (let z = CZ - 3; z <= CZ + 3; z++) for (let x = Math.max(2, xw - 6); x <= xw - 2; x++) { setCell(L, x, z, SLAB, BASE, BASE + 12); SEC.cells.push([x, z]); }
setCell(L, xw - 1, CZ, 'S', BASE);
// ---- the walls: the rock round the hall is city stone with lamp niches on the south and bone-coral in the north (the Silent's wing) -----------------------------------------------------------------------------------------------------------
const skin = (x, z) => (z < 30 && x > 30 && x < 70 ? BONE : CITY);
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) if (L.g[z][x] === ROCK) { let t = false; for (let dz = -1; dz <= 1 && !t; dz++) for (let dx = -1; dx <= 1; dx++) if ('fcl{)^'.includes(L.g[z + dz][x + dx])) { t = true; break; } if (t) L.g[z][x] = skin(x, z); }
const P = placer(L); L.put(CX, 82, '@'); P.reserve(CX, 82);
const { E, P: PK, PR } = P;
// ---- kiosks of city stone in the outer street (the long curve of it was the longest sightline in the hall): a block of 2 x 2 every 20 degrees, never at the gates --------------------------------------------------------------------------------------------------------
for (let k = 0; k < 18; k++) { const d = k * 20 + 10; if ((d > 78 && d < 102) || (d > 258 && d < 282)) continue; const [x, z] = polar(38.5, d); if ([[0, 0], [1, 0], [0, 1], [1, 1]].every(([a2, b2]) => 'f{)'.includes(L.g[z + b2]?.[x + a2] ?? '#'))) box(L, [x, z, x + 1, z + 1], CITY); }
for (let k = 0; k < 9; k++) { const d = k * 40 + 20; if ((d > 78 && d < 102) || (d > 258 && d < 282)) continue; const [x, z] = polar(27.5, d); if ([[0, 0], [1, 0]].every(([a2, b2]) => 'f{)'.includes(L.g[z + b2]?.[x + a2] ?? '#'))) box(L, [x, z, x + 1, z], CITY); }              // street 2: a 2 x 1 stall of stone every 40 degrees
for (let k = 0; k < 18; k++) { const [x, z] = polar(11.5, k * 20 + 10); if (L.g[z]?.[x] === PLAZA) setCell(L, x, z, MARBLE); }                                                                                                   // posts of marble on the plaza ring
// ---- the stalls and the lamps: seeded props in the streets, never in an alley's mouth -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const isStreet = (r) => (r >= 16.5 && r < 20) || (r >= 25.5 && r < 29.5) || (r >= 35 && r < 42);
const kinds = ['crate2', 'crate2', 'shelf', 'shelf', 'shelf', 'stall', 'cart', 'crate2', 'table'];
const taken = [];
for (let n = 0, tries = 0; n < 150 && tries < 9000; tries++) {
  const r = 17 + rnd() * 24, th = rnd() * 360, [x, z] = polar(r, th); if (!isStreet(Math.hypot(x + 0.5 - CX, z + 0.5 - CZ) / SC) || !P.isFloor(x, z)) continue;
  if (Math.hypot(x - CX, z - 80) < 6 || Math.hypot(x - CX, z - 8) < 6) continue;
  if (taken.some(([a, b]) => Math.abs(a - x) < 2 && Math.abs(b - z) < 2)) continue;
  taken.push([x, z]); PR(kinds[Math.floor(rnd() * kinds.length)], x, z); n++;
}
for (let k = 0; k < 12; k++) PR('pillar', ...polar(12, k * 30 + 15));                                                                                   // the plaza ring is pillared
for (let k = 0; k < 36; k++) { PR('lantern', ...polar(10.5, k * 10)); }                                                                                     // round the well
for (let k = 0; k < 24; k++) { PR('lantern', ...polar(18.2, k * 15 + 7)); PR('lantern', ...polar(27.4, k * 15 + 3)); }                                          // the two inner streets
for (let k = 0; k < 20; k++) PR('lamp', ...polar(38.5, k * 18 + 4));                                                                                          // the outer street hangs lamps from the vault
// ---- health and armour (ammunition comes from the dead: the compiler drops the boxes of the public part) -------------------------------------------------------------------------------------------------------------------------------------------------
for (const [r, d] of [[18, 70], [18, 200], [18, -20], [27.5, 120], [27.5, 300], [27.5, 20], [10, 10], [10, 190], [38, 90], [38, 270], [38, 0], [38, 180], [18, 120], [27.5, 240]]) PK(d % 3 ? 'health_small' : 'health_large', ...polar(r, d));
for (const [r, d] of [[10, 100], [27.5, 200], [38, 330], [18, -110], [27.5, 80]]) PK('armor_vest', ...polar(r, d));
PK('armor_vest', xw - 4, CZ - 2); PK('health_large', xw - 4, CZ + 2); PK('ammo_shell', xw - 3, CZ - 1); PK('ammo_rivet', xw - 3, CZ + 1); PK('ammo_flare', xw - 5, CZ); PK('ammo_bolt', xw - 5, CZ - 2);          // the store
// ---- the hostile: sleepers, among the crowd ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [r, d] of [[27.5, 20], [27.5, 100], [27.5, 175], [27.5, 255], [27.5, 335], [10.5, -90]]) E('zealot', ...polar(r, d), { facing: ((d + 90) * Math.PI) / 180 });
for (const [r, d, k] of [[18.2, 50, 'tollbearer'], [18.2, 120, 'tollbearer'], [18.2, 200, 'tollbearer'], [18.2, 290, 'tollbearer'], [18.2, -30, 'tollbearer'], [38, 60, 'tollbearer'], [38, 150, 'tollbearer'], [38, 240, 'tollbearer'], [38, -50, 'tollbearer'], [27.5, 60, 'tollbearer']]) E(k, ...polar(r, d));
for (const [r, d] of [[38, 100], [38, 195], [38, 285], [38, -10], [27.5, 140], [27.5, 300]]) E('gaunt', ...polar(r, d));
E('chorister', ...polar(10.5, 40)); E('chorister', ...polar(10.5, 160)); E('chorister', ...polar(10.5, 280));
E('bellhand', ...polar(18.2, 80)); E('bellhand', ...polar(18.2, 255)); E('bellhand', ...polar(27.5, -70));
E('acolyte', ...polar(27.5, -88));
// ---- the crowd: peaceful Vael on every street and round the well, seeded --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (let n = 0, tries = 0; n < 40 && tries < 4000; tries++) {
  const r = 9 + rnd() * 32, th = rnd() * 360, [x, z] = polar(r, th), rr = Math.hypot(x + 0.5 - CX, z + 0.5 - CZ) / SC;
  if (!(rr >= 9 && rr < 12.5) && !isStreet(rr)) continue; if (!P.isFloor(x, z) || Math.hypot(x - CX, z - 80) < 7 || Math.hypot(x - CX, z - 8) < 7) continue;
  if (E('vaelfolk', x, z, { facing: rnd() * 6.28 })) n++;
}
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [39,65], radius: 2, cells: ENC.around([39,65], { n: 3, min: 6, max: 10 }), kind: 'g' });
// ---- end PT-052 ----

const MAP = {
  id: 'C2M10', name: 'Echo Markets', version: 1, ceilingHeight: 4.2, par: { time: 420 },
  atmosphere: { look: 'markets', echo: 2, fog: '#1a1410', fogDensity: 0.01 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'ECHO MARKETS', lines: ['A market under the roof of the cave, laid out as a wheel round a well.', 'Everyone in it is speaking softly. A shot here carries twice as far.'] },
  outro: 'The north gate opened when the hall had gone quiet. Behind it the stair goes down, and the noise of the market stays behind.',
  objective: 'Cross the market, south gate to north gate. The north gate will not open while the hall is loud',
  ...L.layers(),
  secrets: [{ id: 'store', panel: SEC.panel, cells: SEC.cells }],
  groups: [],
  entities: [...P.ents, { type: 'exit', at: [CX, 3], dest: 'next' }],
  scenery: [],
  messages: [
    { id: 'start', at: [CX, 81], radius: 4, speaker: 'INES', text: 'A hall with a roof I cannot see. Stalls, strings of lamps, and a crowd that is doing its buying in a murmur. Nobody here has a bell.' },
    { id: 'echo', at: [CX, 74], radius: 4, speaker: 'HULL', text: 'The hall has an echo: a shot carries twice as far as it does outside, and wakes what sleeps that far off. A blow, the arc lamp uncharged and the fork are quiet.' },
    { id: 'folk', at: [CX, 67], radius: 5, speaker: 'INES', text: 'A stallholder throws a cloth over the fruit as I pass, the way you cover a pan when a gull lands. Not at me. At what I am carrying.' },
    { id: 'ledger', at: polar(27.5, 105), radius: 3, speaker: 'MARKET LEDGER', text: 'Cord, per length: one voice. Lamp oil, per tin: two. A room at the back, for a night: nothing, and ask no one.' },
    { id: 'zealot', at: polar(18.2, 105), radius: 4, speaker: 'INES', text: 'Spears among the stalls. They stand with the butts on the flags and nobody gives them room or takes any. Part of the furniture, like the bollards at home.' },
    { id: 'well', at: polar(10.5, 160), radius: 5, speaker: 'HULL', text: 'The well is an echo well: a noise made over it comes back from the walls. Keep anything quiet away from it.' },
    { id: 'north', at: [CX, 13], radius: 4, speaker: 'HULL', text: 'The north gate is on a sound-lock. It will not open while the hall has made a loud noise in the last six seconds. Wait, then use it.' },
    { id: 'hollow', at: [xw + 1, CZ], radius: 2, speaker: 'HULL', text: 'The west wall rings hollow behind the last stall.' },
    { id: 'rack', at: [xw - 3, CZ], radius: 3, speaker: 'A SILENT (NOTE)', text: 'This is the room at the back. Nobody asks. Take what you need and leave the door as it was.' },
    { id: 'end', at: [CX, 4], radius: 2, speaker: 'INES', text: 'A stair down, wide, and the murmur of the market already thinner behind me. It was a good market. I did not buy anything.' },
  ],
  triggers: [
    { id: 'wheel', when: 'enter', at: [CX, 54], radius: 6, do: [{ objective: 'The wheel: the plaza ring, then the belts of houses. North is straight on' }] },
    { id: 'gate', when: 'enter', at: [CX, 11], radius: 6, do: [{ objective: 'The north gate is sound-locked: stand quiet until it opens, then use it' }] },
  ],
  quality: { enemies: [25, 60], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'secret'], skins: 6, enemyKinds: { zealot: 5, tollbearer: 8, gaunt: 5, chorister: 3, bellhand: 2, acolyte: 1 },
    scaleClass: 'COMPRESSION', introduces: 'the echo: a hall where a shot carries twice as far and wakes the market, a crowd of peaceful Vael to keep from harm, and a gate that only opens when the hall has gone quiet' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M10: enemies', P.ents.filter((e) => e.type === 'enemy' && e.kind !== 'vaelfolk').length, 'folk', P.ents.filter((e) => e.kind === 'vaelfolk').length, 'props', P.ents.filter((e) => e.type === 'prop').length, 'houses', houseCells.length, 'xw', xw);
// the route's waypoints (cells), by the same polar rule as the placement: the routes are written from these (node maps-src/C2M10.route.mjs)
export const waypoints = (() => {
  const south = [[CX, 79], [CX, 75], polar(38, 90)];
  const wheel = [polar(27.5, 90), polar(27.5, 105), polar(22.5, 105), polar(18.2, 105), polar(14.5, 120), polar(10.5, 130), polar(10.5, 180), polar(10.5, -150), polar(14.5, -120), polar(18.2, -105), polar(22.5, -105), polar(27.5, -90), polar(32, -90), polar(38, -90), [CX, 8], [CX, 7]];
  const gate = [{ op: 'use', at: [CX, 5] }, [CX, 4, 0], [CX, 3, 0]];
  return { main: [...south, ...wheel, ...gate], secret: [...south, polar(38, 130), polar(38, 165), [xw + 2, CZ], { op: 'use', at: [xw - 1, CZ] }, [xw - 3, CZ, 0], [xw + 3, CZ, 0], polar(38, 130), ...wheel, ...gate] };
})();
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C2M10', lane: [...(laneOf('C2M10') ?? [])], keep: [], plan: [] };
ENC.apply(MAP);

export default MAP;
