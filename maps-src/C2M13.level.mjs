// C2M13 LANTERN OSSUARY: the dark; the remains of the Marrow Girl's crew. (Campaign 2, Act B THE SOUNDING DEEP; design/ACTB.md, design/LORE.md section 2b.)
// A web of rings and spokes cut in the stone and walled in bone: three ring corridors (the outer at 7 m, the middle at 5 m, the inner at 3 m above the floor of the well), spokes between them that are ramps, each ring's spokes
// offset from the last so that the way down is a SPIRAL (round the outer ring, down a spoke, round the middle, down, round the inner, down a spoke into the well room). Every ring has alcoves cut in its walls: niches. The whole
// map is DARK (`atmosphere.dark`, the hand lantern: L; 1 oil a second, tins of 30) and creatures that follow their eyes (Gaunts, Gills, Zealots, Choristers) notice you from 6 m dark and 24 m lit, while the Hush-driven
// (Tollbearers, Bellhands, Sextons) do not care. Oil is on the lane but never in surplus; a lantern hung in some niches lights a stretch. The logs of PELLEW, mate of the Marrow Girl (dated, short, the last ends in the middle of
// a line) lie in the niches: eleven became six, three, one. The exit is at the north side of the well room at the bottom. A sealed niche on the outer ring holds the last tins.
// SHAPE: a web, not a box (rings, spokes, alcoves, a funnel well). Scale class COMPRESSION (all roofed, short sightlines). The new thing: the dark itself, and oil as a resource.
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';
import { setCell, placer } from '../tools/mapkit/c2.mjs';
import { rng } from '../tools/mapkit/cave.mjs';

const W = 76, H = 76, CX = 38, CZ = 38, L = new Level(W, H, { fill: '[' }); L.usedHeights = true; L.usedCeil = true;
const BONE = '"', ROCK = '[', RING = '{', SPOKE = 'f', SILT = 'n', WELLF = '^';
const S = 0, N = Math.PI, EAST = Math.PI / 2, WEST = -Math.PI / 2;
const rnd = rng(1313);
const RINGS = [{ r0: 29, r1: 32, h: 14 }, { r0: 19, r1: 22, h: 10 }, { r0: 9, r1: 12, h: 6 }];
const SPOKES = [{ rIn: 22, rOut: 29, from: 1, to: 0, deg: [200, 290] }, { rIn: 12, rOut: 19, from: 2, to: 1, deg: [65, 155, 245, 335] }, { rIn: 6, rOut: 9, deg: [0, 180] }];
const angDist = (a, b) => Math.abs((((a - b + 180) % 360) + 360) % 360 - 180);
const polar = (r, deg) => [Math.round(CX - 0.5 + r * Math.cos((deg * Math.PI) / 180)), Math.round(CZ - 0.5 + r * Math.sin((deg * Math.PI) / 180))];
const carve = (x, z, ch, h) => setCell(L, x, z, ch, h, h + 12);
// ---- the web: rings, spokes and the well --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const cellsOf = { ring: [], spoke: [], well: [] };
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
  const dx = x + 0.5 - CX, dz = z + 0.5 - CZ, r = Math.hypot(dx, dz), th = ((Math.atan2(dz, dx) * 180) / Math.PI + 360) % 360;
  const ring = RINGS.find((q) => r >= q.r0 && r < q.r1);
  if (ring) { carve(x, z, RING, ring.h); cellsOf.ring.push([x, z]); continue; }
  if (r < 6) { carve(x, z, WELLF, Math.max(0, Math.round(r - 3))); cellsOf.well.push([x, z]); continue; }
  for (const sp of SPOKES) {
    if (r < sp.rIn || r >= sp.rOut || !sp.deg.some((d) => angDist(th, d) * (Math.PI / 180) * r <= 1.6)) continue;
    let h; if (sp.from == null) h = Math.round(r - 3); else { const lo = RINGS[sp.from].h, hi = RINGS[sp.to].h, t = (r - sp.rIn) / (sp.rOut - sp.rIn); h = Math.round(lo + (hi - lo) * t); }
    carve(x, z, sp.from == null ? WELLF : SPOKE, h); cellsOf.spoke.push([x, z]); break;
  }
}
// ---- the niches: alcoves 3 x 2 cut into the walls of the rings, outer and inner side, away from the spokes ---------------------------------------------------------------------------------------------------------------------------------------------------------
const niches = [];
for (const [ri, ring] of RINGS.entries()) for (let k = 0; k < 18; k++) {
  const deg = k * 20 + 7 + Math.floor(rnd() * 8), outer = (k + ri) % 2 === 0;
  if (!outer && ri === 2) continue;
  if (SPOKES.some((sp) => sp.deg.some((d) => angDist(deg, d) < 14)) || angDist(deg, 270) < 12) continue;
  const rr = outer ? ring.r1 + 1.3 : ring.r0 - 1.3, [cx, cz] = polar(rr, deg); let n = 0;
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const x = cx + dx, z = cz + dz; if (Math.hypot(dx, dz) <= 1.6 && L.g[z]?.[x] === ROCK) { carve(x, z, SILT, ring.h); n++; } }
  if (n >= 5) niches.push([cx, cz, ring.h]);
}
// ---- the start corridor (south) and the exit at the north of the well ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (let z = 68; z <= 73; z++) for (let x = 37; x <= 39; x++) carve(x, z, RING, 14);
// ---- the sealed niche: behind a panel in the north wall of the outer ring, a 3 x 3 room of silt ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const SEC = { panel: [38, 5], cells: [] };
for (let z = 2; z <= 4; z++) for (let x = 37; x <= 39; x++) { carve(x, z, SILT, 14); SEC.cells.push([x, z]); }
setCell(L, 38, 5, 'S', 14);
// ---- walls: bone everywhere, rock where the funnel meets the floor -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) if (L.g[z][x] === ROCK) { let t = false; for (let dz = -1; dz <= 1 && !t; dz++) for (let dx = -1; dx <= 1; dx++) if ('{fn^'.includes(L.g[z + dz][x + dx])) { t = true; break; } if (t) L.g[z][x] = Math.hypot(x + 0.5 - CX, z + 0.5 - CZ) < 9.5 ? ROCK : BONE; }
// the winch: a lever on the inner ring's outer wall that lets the well room's stair open (the exit is locked until it is thrown). PT-039 playtest ("it is impossible to find the switch"): it was a small dark panel on a 6 m wide
// ring, found by a scan, 3 m from the walking line, lit by nothing but its own thumb-sized lamp. It is now on the wall DIRECTLY OPPOSITE THE MOUTH OF THE WELL SPOKE (the one place every player stops and turns), a lantern hangs
// beside it, its lamp glows red in a dark map (levelmesh.js), and the ring entry, the lit ring and the sealed gate each say where it is.
const WINCH = { at: [26, 38], wall: 'west' };
if (L.g[WINCH.at[1]][WINCH.at[0]] !== RING || ![BONE, ROCK].includes(L.g[38][25])) throw new Error('C2M13: the winch cell moved: ' + L.g[38][25] + ' ' + L.g[38][26]);
const P = placer(L); L.put(38, 72, '@'); P.reserve(38, 72);
const { E, P: PK, PR } = P;
// ---- lanterns (a few hung in the niches: a lit stretch), oil on the lane ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
PR('lantern', 38, 70); PR('lantern', ...polar(30.5, 200)); PR('lantern', ...polar(20.5, 245)); PR('lantern', ...polar(10.5, 200)); PR('lantern', ...polar(7.5, 180)); PR('lantern', 27, 36);
for (const k of [3, 9, 15]) if (niches[k]) PR('lantern', niches[k][0], niches[k][1]);
PK('oil', 38, 69); PK('oil', ...polar(30.5, 135)); PK('oil', ...polar(25.5, 200)); PK('oil', ...polar(20.5, 230)); PK('oil', ...polar(10.5, 215));
for (const [x, z] of SEC.cells.slice(0, 3)) PK('oil', x, z); if (SEC.cells[3]) PK('armor_vest', ...SEC.cells[3]); if (SEC.cells[4]) PK('health_large', ...SEC.cells[4]); if (SEC.cells[5]) PK('ammo_cell', ...SEC.cells[5]); if (SEC.cells[6]) PK('ammo_shell', ...SEC.cells[6]); if (SEC.cells[7]) PK('ammo_rivet', ...SEC.cells[7]);
for (const [i, d] of [[30.5, 110], [30.5, 160], [30.5, 250], [20.5, 100], [20.5, 180], [20.5, 290], [10.5, 100], [10.5, 300]].entries()) PK(i % 3 ? 'health_small' : 'health_large', ...polar(d[0], d[1]));
for (const [r, d] of [[30.5, 230], [20.5, 130], [10.5, 40], [10.5, 250]]) PK('armor_vest', ...polar(r, d));
// ---- the dark's company ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const place = (kind, r, d, extra) => E(kind, ...polar(r, d), { facing: ((d + 90) * Math.PI) / 180, ...extra });
for (const [r, d] of [[30.5, 105], [30.5, 128], [30.5, 150], [30.5, 172], [30.5, 215], [30.5, 240], [30.5, 265], [30.5, 300], [30.5, 340], [30.5, 20], [30.5, 55]]) place('gaunt', r, d);
for (const [r, d] of [[30.5, 118], [30.5, 185], [30.5, 275], [30.5, 330], [30.5, 40], [20.5, 215], [20.5, 232], [20.5, 120], [20.5, 300], [10.5, 232], [10.5, 205]]) place('tollbearer', r, d);
for (const [r, d] of [[30.5, 138], [30.5, 252], [20.5, 190], [10.5, 150], [10.5, 320]]) place('zealot', r, d);
for (const [r, d] of [[20.5, 205], [20.5, 100], [10.5, 215], [10.5, 280]]) place('bellhand', r, d);
for (const [r, d] of [[20.5, 160], [10.5, 170], [10.5, 340]]) place('gill', r, d);
for (const [r, d] of [[20.5, 250], [20.5, 330], [10.5, 190]]) place('chorister', r, d);
place('sexton', 20.5, 135); place('sexton', 10.5, 120); place('acolyte', 10.5, 250); place('bulwark', 20.5, 270); place('bulwark', 30.5, 195);
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [7,43], radius: 2, cells: ENC.around([7,43], { n: 3, min: 6, max: 10 }), kind: 'g' });
ENC.dropIn({ at: [27,20], radius: 2, cells: ENC.around([27,20], { n: 3, min: 6, max: 10 }), kind: 'g' });
// ---- end PT-052 ----

const MAP = {
  id: 'C2M13', name: 'Lantern Ossuary', version: 1, ceilingHeight: 4.2, par: { time: 600 },
  atmosphere: { look: 'ossuary', dark: true, fog: '#050408', fogDensity: 0.02 },
  lantern: { oil: 40, max: 90 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'LANTERN OSSUARY', lines: ['A web of corridors cut in the stone, and every wall is bone.', 'The oil is what you carry. The dark does not run out.'] },
  outro: 'The well room opens on a stair, and the stair on a hall that is lit from below.',
  objective: 'Go down: round the outer ring, down a spoke, round the middle ring, down again. The exit is at the bottom of the well. Keep the oil',
  ...L.layers(),
  secrets: [{ id: 'sealed', panel: SEC.panel, cells: SEC.cells }],
  groups: [],
  entities: [...P.ents,
    { type: 'switch', id: 'winch', at: WINCH.at, wall: WINCH.wall, once: true, do: [{ exit: { set: 'unlock' } }, { objective: 'The winch is thrown. The well room is open: the exit is on its north side' }, { message: 'winch' }] },
    { type: 'exit', at: polar(4, 270), dest: 'next', locked: true }],
  scenery: [],
  messages: [
    { id: 'start', at: [38, 71], radius: 4, speaker: 'INES', text: 'Bone for walls, floor to roof, in niches. Not heaped. Stacked, long bones one way and skulls in a row, the way you stack barrels.' },
    { id: 'lamp', at: [38, 68], radius: 3, speaker: 'HULL', text: 'The lantern is L, an oil a second, a tin is thirty. Gaunts, Gills and Zealots find you by eye: 6 metres in the dark, 24 with the lantern lit. Tollbearers do not care.' },
    { id: 'log1', at: polar(30.5, 100), radius: 3, speaker: 'PELLEW, MARROW GIRL (LOG)', text: 'Day 9 below. Eleven left the beach, six are left. We burn one lantern at a time and keep the rest dark. Nineteen tins. It is cold.' },
    { id: 'log2', at: polar(30.5, 165), radius: 3, speaker: 'PELLEW, MARROW GIRL (LOG)', text: 'Day 12. Six. The dark here is not empty. Two of ours stood in the corridor and would not come on. Lit, they blink. Nine tins.' },
    { id: 'ring', at: polar(30.5, 200), radius: 4, speaker: 'INES', text: 'The ring goes right round and the spokes are the only way off it. Whoever laid this out wanted the way down to be long.' },
    { id: 'log3', at: polar(20.5, 215), radius: 3, speaker: 'PELLEW, MARROW GIRL (LOG)', text: 'Day 15. Three. We took the spiral down because every other turning ends in a niche. Four tins. I have stopped counting the dead in the walls.' },
    { id: 'plate', at: polar(20.5, 250), radius: 3, speaker: 'RINGING PLATE', text: 'Run a nail down it: a count of the stacked. Four thousand and sixty, in this ring. The ring below is shorter.' },
    { id: 'log4', at: polar(10.5, 190), radius: 3, speaker: 'PELLEW, MARROW GIRL (LOG)', text: 'Day 16. One. The oil is out and I am writing by the last of the wick. The well is below me. There is something at the bottom of it that is' },
    { id: 'well', at: polar(7.5, 180), radius: 3, speaker: 'INES', text: 'She stopped at the top of the spoke. Her lantern is on the floor here, empty, with the wick burned to the stub. I will take the tin she did not need.' },
    { id: 'winchhint', at: [1, 1], radius: 0.1, speaker: 'INES', text: 'Round the ring, across from where the spoke goes down: a hung lantern, and under it a red lamp on an iron plate set in the bone. That is a lever.' },
    { id: 'sealedhint', at: polar(3.5, 240), radius: 3, speaker: 'HULL', text: 'A plain gate at the bottom of the well, and no handle. If it is shut, a counterweight holds it, and the winch for that is on the inner ring, on the wall across from the spoke.' },
    { id: 'winch', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The winch turns a counterweight somewhere under the floor. Below, a stair has come up out of the well.' },
    { id: 'hollow', at: [38, 7], radius: 3, speaker: 'HULL', text: 'The outer wall rings hollow in the north, in the one stretch that has no niche cut in it.' },
    { id: 'sealed', at: [38, 3], radius: 3, speaker: 'PELLEW, MARROW GIRL (LOG)', text: 'Day 10. We sealed the spare tins in the wall for whoever came after, and left the north stretch bare to mark it. Eight tins and a pistol. God keep' },
  ],
  triggers: [
    { id: 'ring3', when: 'enter', at: polar(30.5, 130), radius: 5, do: [{ objective: 'The outer ring: the spokes down are to the west and the north' }] },
    { id: 'ring2', when: 'enter', at: polar(20.5, 230), radius: 5, do: [{ objective: 'The middle ring: the way on is a spoke to the west' }] },
    { id: 'ring1', when: 'enter', at: polar(10.5, 232), radius: 5, do: [{ objective: 'Throw the winch: a lever on the ring wall across from the well spoke' }, { message: 'winchhint' }] },
  ],
  quality: { enemies: [30, 70], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 6, enemyKinds: { gaunt: 8, tollbearer: 8, zealot: 4, bellhand: 3, gill: 2, chorister: 2, sexton: 1, acolyte: 1, bulwark: 1 },
    scaleClass: 'COMPRESSION', introduces: 'the dark: a map lit only by the hand lantern, where oil is the resource, creatures that follow their eyes see you from 6 m unlit and 24 lit, and the logs of a lost Marrow crew lie in the niches' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M13: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'niches', niches.length, 'sec cells', SEC.cells.length, 'oil', P.ents.filter((e) => e.kind === 'oil').length);
const spiral = [polar(30.5, 90), polar(30.5, 110), polar(30.5, 130), polar(30.5, 150), polar(30.5, 170), polar(30.5, 190), polar(26, 200), polar(20.5, 205), polar(20.5, 225), polar(20.5, 240), polar(16, 245), polar(10.5, 235), polar(10.5, 215), polar(10.5, 195), { op: 'switch', id: 'winch' }, polar(9, 180), polar(5.5, 180), polar(3.5, 200), polar(3.5, 250), polar(4, 270)];
const around = [polar(30.5, 90), polar(30.5, 110), polar(30.5, 130), polar(30.5, 150), polar(30.5, 170), polar(30.5, 190), polar(30.5, 210), polar(30.5, 230), polar(30.5, 250), polar(30.5, 265)];
export const waypoints = {
  main: [[38, 72, 0], [38, 68], ...spiral],
  secret: [[38, 72, 0], [38, 68], ...around, [38, 7], { op: 'use', at: [38, 5] }, [38, 3, 0], [38, 8, 0], polar(30.5, 280), polar(30.5, 290), polar(26, 290), polar(20.5, 290), polar(20.5, 270), polar(20.5, 250), polar(16, 245), ...spiral.slice(11)],
};
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C2M13', lane: [...(laneOf('C2M13') ?? [])], keep: [], plan: [] };
ENC.apply(MAP);

export default MAP;
