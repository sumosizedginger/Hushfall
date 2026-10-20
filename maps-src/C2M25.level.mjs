// C2M25 ROOT BELL DESCENT (Campaign 2, Act D THE ROOT BELL; design/ACTD.md section 5). SET-PIECE, DARK, threat 6.
// A WELL: a round shaft seventy-four metres across with a void in the middle (44 m wide) and six LANDINGS round it, each in its own sixty degrees of the ring, each five metres lower than the last: thirty metres in all (the taller height format, E13). A radial wall of black root
// stands between one landing and the next, so the only way down is the VENT at the end of each landing: a plate that throws you across the void, over the glow below, to the start of the next. The shaft is open to the sky (a black sky with a dim ring of light at the top and a glow
// at the bottom: `sky_root`, `sky_root_below`); the landings are lit by posts and by the hand lantern. THE LAMP HOLDS SOUND BACK: told at the niche on the third landing (the Silent's cache: oil, mortar rockets and one plain line) and used at once: the fourth and fifth landings each
// have a Resonant with company, whose ring a lit lantern cuts (a map field `lampHolds`). Eyes follow light (a lit lamp is seen from 24 m), so the trade is real. The beat is gone (the Hive Cantor is dead): the lights do not swell.
// The way on: the last landing's door opens on the exit when its lever is thrown (lit, named, restated at the door). A cache behind a seam in the last landing's wall. Drop-fed ammunition.
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';
import { setCell, placer } from '../tools/mapkit/c2.mjs';

const W = 80, H = 80, C = 40, L = new Level(W, H, { fill: 'ι' }); L.usedHeights = true;
const RI = 26, RO = 37, SEC = 60, K = 6;
const VOID = '_', SHAFT = 'ι', ROOT = 'κ', FLOORS = ['Ι', 'Α', 'Ι', 'Λ', 'Ι', 'Α'], HEIGHTS = [60, 50, 40, 30, 20, 10];
const rOf = (x, z) => Math.hypot(x + 0.5 - C, z + 0.5 - C), aOf = (x, z) => ((Math.atan2(z + 0.5 - C, x + 0.5 - C) * 180 / Math.PI) + 360) % 360;
const pol = (r, a) => [Math.floor(C + r * Math.cos(a * Math.PI / 180)), Math.floor(C + r * Math.sin(a * Math.PI / 180))];
const sector = (a) => Math.floor(a / SEC);
// the distance of a point from the radial line at angle a0 (cells)
const lineDist = (x, z, a0) => Math.abs(Math.sin((aOf(x, z) - a0) * Math.PI / 180)) * rOf(x, z);
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
  const r = rOf(x, z), a = aOf(x, z), k = sector(a);
  if (r < RI) { setCell(L, x, z, VOID, 0); continue; }
  if (r > RO) continue;
  // the radial walls: on the boundary lines, between one landing and the next
  let wall = false; for (let b = 0; b < K; b++) if (lineDist(x, z, b * SEC) <= 1.0 && Math.abs(((a - b * SEC + 540) % 360) - 180) > 90) wall = true;
  if (wall && r >= RI + 3) { L.g[z][x] = ROOT; continue; }
  setCell(L, x, z, FLOORS[k], HEIGHTS[k]);
}
// ---- the vents: at the end of each landing, a plate that throws across the void to the start of the next ---------------------------------------------------------------------------------------------------------------------------------
const vents = [];
for (let k = 0; k < K - 1; k++) vents.push({ at: pol(RI + 0.8, k * SEC + 44), to: pol(RI + 1.0, (k + 1) * SEC + 16), time: 4.2 });
// ---- the entrance (the start room outside the shaft at the first landing), the exit (a corridor through the wall of the last) ------------------------------------------------------------------------------------------------------
const START = pol(33, 30), DOORAT = pol(38.5, 330), EXITAT = pol(41.5, 330);
// ---- objects -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const P = placer(L); const { E, P: PK, PR } = P; L.put(START[0], START[1], '@'); P.reserve(START[0], START[1]);
for (let k = 0; k < K; k++) for (const [r, da] of [[28, 12], [28, 40], [32, 26], [35, 8], [35, 50]]) PR('lamppost', ...pol(r, k * SEC + da));
const NICHE = pol(36.2, 2 * SEC + 30);                                                                                              // the Silent's cache: a lit nook in the outer wall of the third landing
const R = (list, kind, extra = {}) => list.forEach(([k, r, da]) => E(kind, ...pol(r, k * SEC + da), extra));
R([[0, 28, 30], [0, 33, 12], [0, 31, 46]], 'tollbearer'); R([[0, 27, 20]], 'gaunt'); R([[0, 30, 40]], 'zealot');
R([[1, 30, 20], [1, 34, 40]], 'zealot'); R([[1, 28, 32]], 'chorister'); R([[1, 31, 10]], 'tollbearer'); R([[1, 26, 46]], 'gaunt');
R([[2, 29, 18], [2, 33, 42]], 'gaunt'); R([[2, 31, 30]], 'chorister'); R([[2, 33, 12]], 'zealot');
R([[3, 28, 22]], 'resonant'); R([[3, 31, 28]], 'tollbearer'); R([[3, 33, 44]], 'chorister');
R([[4, 30, 32]], 'resonant'); R([[4, 33, 20]], 'tollbearer'); R([[4, 34, 46]], 'zealot');
R([[5, 34, 32]], 'zealot'); R([[5, 31, 44]], 'bellhand'); R([[5, 34, 10]], 'chorister');
R([[0, 25, 54], [1, 25, 54], [2, 25, 54], [3, 25, 54], [4, 25, 54]], 'gill');
for (let k = 0; k < K; k++) { PK(k % 2 ? 'health_large' : 'health_small', ...pol(30, k * SEC + 24)); PK('health_small', ...pol(25, k * SEC + 18)); }
for (const k of [1, 3, 5]) PK('armor_vest', ...pol(32, k * SEC + 16));
PK('oil', ...pol(33, 0 * SEC + 20)); PK('oil', ...pol(28, 1 * SEC + 26)); PK('oil', ...pol(32, 2 * SEC + 34)); PK('oil', ...pol(28, 4 * SEC + 24));
PK('oil', ...pol(34.5, 2 * SEC + 29)); PK('ammo_rocket', ...pol(34.5, 2 * SEC + 31)); PK('ammo_rocket', ...pol(34, 2 * SEC + 33)); PK('oil', ...pol(34, 2 * SEC + 27));
// the secret: a seam in the outer wall of the last landing, a cache behind it
const SP = pol(36.4, 5 * SEC + 6), SECCELLS = [];
const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
let SECP = null;
find: for (let da = 2; da < 58; da += 1) for (let rr = 30; rr < 37; rr += 0.5) {
  const [cx, cz] = pol(rr, 5 * SEC + da); if (!'ΙΑ'.includes(L.g[cz]?.[cx] ?? '')) continue;
  for (const [dx, dz] of dirs) {
    const px = cx + dx, pz = cz + dz; if (L.g[pz]?.[px] !== SHAFT && L.g[pz]?.[px] !== ROOT) continue;
    const perp = dx === 0 ? [1, 0] : [0, 1]; if (!['ι', 'κ'].includes(L.g[pz + perp[1]]?.[px + perp[0]]) || !['ι', 'κ'].includes(L.g[pz - perp[1]]?.[px - perp[0]])) continue;
    const cells = []; let ok = true; for (let k = 1; k <= 3 && ok; k++) for (let o = -1; o <= 1 && ok; o++) { const x = px + dx * k + perp[0] * o, z = pz + dz * k + perp[1] * o; if (!['ι', 'κ'].includes(L.g[z]?.[x]) || rOf(x, z) < RO - 1.5) ok = false; else cells.push([x, z]); }
    if (!ok) continue;
    for (let k = 1; k <= 3; k++) for (let o = -2; o <= 2; o += 4) { const x = px + dx * k + perp[0] * o, z = pz + dz * k + perp[1] * o; if (!['ι', 'κ'].includes(L.g[z]?.[x] ?? 'ι')) ok = false; }
    if (!ok) continue;
    SECP = { panel: [px, pz], front: [cx, cz], cells }; for (const [x, z] of cells) setCell(L, x, z, 'Ι', HEIGHTS[5]); L.g[pz][px] = 'S'; L.ht[pz][px] = HEIGHTS[5]; break find;
  }
}
if (!SECP) throw new Error('no place for the seam');
SECP.cells.slice(0, 5).forEach(([x, z], i) => PK(['armor_vest', 'ammo_rocket', 'ammo_rocket', 'health_large', 'ammo_round'][i], x, z));
// the exit: a corridor north through the wall of the last landing, a door in it; the lever is on the landing's outer wall, lit, near the mouth of the corridor
const CORR = [66, 13];
for (let z = 2; z <= 13; z++) setCell(L, CORR[0], z, 'Ι', HEIGHTS[5]);
const DOORC = [66, 7], EX = [66, 3];
L.door(DOORC[0], DOORC[1], { remote: true });
let LEVER = null;
for (let da = 20; da < 58 && !LEVER; da++) for (let rr = 33; rr < 37 && !LEVER; rr += 0.5) {
  const [cx, cz] = pol(rr, 5 * SEC + da); if (!'ΙΑ'.includes(L.g[cz]?.[cx] ?? '')) continue; if (Math.hypot(cx - CORR[0], cz - CORR[1]) > 9 || Math.hypot(cx - CORR[0], cz - CORR[1]) < 3) continue;
  for (const [dx, dz, wall] of [[0, -1, 'north'], [1, 0, 'east'], [-1, 0, 'west'], [0, 1, 'south']]) if (['ι', 'κ'].includes(L.g[cz + dz]?.[cx + dx])) { LEVER = { at: [cx, cz], wall }; break; }
}
if (!LEVER) throw new Error('no place for the lever');
PR('lamppost', LEVER.at[0] + (LEVER.wall === 'west' ? 1 : LEVER.wall === 'east' ? -1 : 0), LEVER.at[1] + (LEVER.wall === 'north' ? 1 : LEVER.wall === 'south' ? -1 : 0)); PR('lantern', LEVER.at[0] + 1, LEVER.at[1] + 1);
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
PK('oil', 33, 68); PK('oil', 13, 24);                                      // the two fights cost the lamp about twelve seconds of oil: a tin at each (the route used to end with four seconds left)
ENC.dropIn({ at: [33,68], radius: 2, cells: ENC.around([33,68], { n: 3, min: 6, max: 10 }), kind: 'g' });
ENC.dropIn({ at: [13,24], radius: 2, cells: ENC.around([13,24], { n: 3, min: 6, max: 10 }), kind: 'g' });
// ---- end PT-052 ----

const MAP = {
  id: 'C2M25', name: 'Root Bell Descent', version: 1, ceilingHeight: 4.2, par: { time: 540 },
  atmosphere: { look: 'descent', sky: 'root', dark: true, fog: '#0c1410', fogDensity: 0.012, ambient: 0.5 },
  lantern: { oil: 120, max: 240 }, lampHolds: { plain: 0.6, own: 0.4 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 20, shell: 36, rivet: 200, bolt: 18, cell: 50, round: 50, rocket: 8 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine', 'linethrower'] },
  intro: { title: 'ROOT BELL DESCENT', lines: ['A well thirty metres deep, in six landings.', 'The way down is across the dark.'] },
  outro: 'The last landing is a root floor with an open door in the wall. The corridor beyond goes on down at the slope of the rest of the country, towards a sound that is not a sound yet.',
  objective: 'Go down: at the end of each landing a lit plate throws you across the well to the next. A lit lantern holds sound back; it is seen from far off',
  ...L.layers(),
  secrets: [{ id: 'seam', panel: SECP.panel, cells: SECP.cells }],
  groups: [], vents,
  entities: [...P.ents,
    { type: 'switch', id: 'door', at: LEVER.at, wall: LEVER.wall, once: true, do: [{ open: DOORC }, { message: 'door-open' }, { objective: 'The door in the wall of the last landing is open: the exit is beyond it' }] },
    { type: 'exit', at: EX, dest: 'next' }],
  scenery: [{ kind: 'shaft', at: [C, C], y: 0, scale: 1.0 }],
  messages: [
    { id: 'start', at: START, radius: 5, speaker: 'INES', text: 'A well, and a floor at the bottom of it I can see from here, a long way down, by its own copper light. I count six ledges between me and it, and I count thirty metres.' },
    { id: 'vent', at: pol(30, 38), radius: 5, speaker: 'HULL', text: 'The plate at the end of each ledge throws you across the well to the next. It is lit. There is no other way down but a fall.' },
    { id: 'niche', at: NICHE, radius: 4, speaker: 'A SILENT (NOTE)', text: 'A lit lamp holds the sound back. Keep it lit when the rings come. It is seen from far off, and the oil is what is in the tins here.' },
    { id: 'rings', at: pol(30, 3 * SEC + 20), radius: 6, speaker: 'HULL', text: 'The Resonant on this ledge rings on nothing now: the beat is gone, and it rings when something stands near it. A lit lantern cuts what reaches you to three-fifths.' },
    { id: 'door-lever', at: LEVER.at, radius: 5, speaker: 'HULL', text: 'The lever on the wall by the last ledge opens the door to the north. Its lamp is lit.' },
    { id: 'door-shut', at: [66, 10], radius: 4, speaker: 'HULL', text: 'The door to the north is shut. It opens to the lever on the wall of this ledge, beside the lantern.' },
    { id: 'door-open', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The door has gone back into the wall. The corridor beyond it slopes down.' },
    { id: 'seam', at: SECP.front, radius: 3, speaker: 'HULL', text: 'The outer wall of the last ledge rings hollow in one short run. There is a seam in the root.' },
    { id: 'cache', at: SECP.cells[4], radius: 3, speaker: 'A SILENT (NOTE)', text: 'This is what I could carry down. I counted the ledges on the way: six, and I stopped counting after that.' },
  ],
  triggers: [
    { id: 'landing-3', when: 'enter', at: pol(30, 2 * SEC + 24), radius: 8, do: [{ objective: 'Landing three: the Silent left a lamp and oil in the niche in the outer wall' }] },
    { id: 'landing-6', when: 'enter', at: pol(30, 5 * SEC + 20), radius: 8, do: [{ objective: 'The last landing: the lever on the outer wall opens the door to the north' }] },
  ],
  quality: { enemies: [20, 80], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 5,
    enemyKinds: { tollbearer: 6, gaunt: 4, zealot: 5, chorister: 4, resonant: 2, gill: 3, bellhand: 1 },
    scaleClass: 'SET-PIECE', reason: 'the place is an open well: the player crosses a void between landings, and the fights are on ledges over a drop', introduces: 'the descent: six landings thirty metres down, a vent across the dark between each, and the lamp that holds a ring of sound back' },
};
MAP.drops = { scale: 1, keep: [[NICHE[0] - 4, NICHE[1] - 4, NICHE[0] + 4, NICHE[1] + 4]] };                 // the Silent's niche keeps its tins and its rockets
console.log('C2M25: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'start', START, 'door', DOORAT, 'exit', EX, 'seam', SECP.panel, 'vents', JSON.stringify(vents));
const Q = (k, r, da) => pol(r, k * SEC + da);
const landing = (k) => [Q(k, 31, 22), Q(k, 33, 36), Q(k, RI + 1.2, 42)];
const cross = (k) => [...Q(k, RI + 1.5, 20), 0];
const landings = (from, to) => { const out = []; for (let k = from; k <= to; k++) { out.push(Q(k, 31, 22), Q(k, 34, 38)); if (k < 5) out.push(cross(k + 1), { op: 'kill' }); } return out; };
export const waypoints = {
  main: [[START[0], START[1], 0], ...landings(0, 4), { op: 'kill' }, Q(5, 31, 22), { op: 'switch', id: 'door' }, [CORR[0], CORR[1], 0], [CORR[0], 9, 0], [EX[0], EX[1], 0]],
  secret: [[START[0], START[1], 0], ...landings(0, 4), { op: 'kill' }, Q(5, 31, 22), [SECP.front[0], SECP.front[1], 0], { op: 'use', at: SECP.panel }, [SECP.cells[4][0], SECP.cells[4][1], 0], [SECP.front[0], SECP.front[1], 0], { op: 'switch', id: 'door' }, [CORR[0], CORR[1], 0], [CORR[0], 9, 0], [EX[0], EX[1], 0]],
};
void landing;
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C2M25', lane: [...(laneOf('C2M25') ?? [])], keep: [], plan: [] };
ENC.apply(MAP);

// ---- PT-070 unless (the story pass): reminders that are silent once the thing they remind of has happened
for (const [mid, unless] of Object.entries({ "door-shut": ["msg:door-open"] })) MAP.messages.find((m) => m.id === mid).unless = unless;
// ---- end PT-070 unless
export default MAP;
