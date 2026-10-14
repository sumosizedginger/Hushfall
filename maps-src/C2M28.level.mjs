// C2M28 LAST TIDE (Campaign 2, Act D; design/ACTD.md section 5). SET-PIECE, threat 10, a stand.
// A ROUND DOCK, the harbour's echo, 64 x 64 (the plan said 90: the creatures walk at 1.1 to 1.9 m a second and a wave that needs ninety seconds to cross the dock is not a wave): a ring quay in three steps round a basin (the highest at +2 m under the outer wall, the middle one
// at +1 m, the lowest at the water's edge, the steps joined by ramps of a half-metre rise), the Tide bell on a mole in the middle of the basin (the copy of the north pier's fog-bell, "Anselm"), a gate in the north wall; open sky. The verb is HOLD. The stand lasts NINE STROKES:
// the dock tolls the first eight itself (a stroke every eighteen seconds after a first quiet thirty: a toll from a trigger) and a wave comes in through the four gates of the outer wall with each one (spawn actions on `time:` triggers, a gate a few seconds after the last so they arrive
// in a stream, not a heap; a wave creature `hunt`s: it always knows where you stand). THE TIDE (E12) comes over the lowest step at the third stroke and over the middle one at the sixth. The eighth wave's death brings the LAST SQUAD (thirty seconds after the eighth stroke); its death and the eighth wave's open the gate on the
// causeway to the mole (`dead:last`); on the mole the BELL ROPE (a lever, lit, named by the objective from the start) is the ninth stroke, and ringing it unlocks the exit in the north wall. Health and armour lie along the highest step for the first thirty seconds. Drop-fed
// ammunition. A seam in the outer wall holds a cache.
import { Level } from '../tools/mapkit/builder.mjs';
import { setCell, box, placer } from '../tools/mapkit/c2.mjs';

const W = 64, H = 64, C = 32, L = new Level(W, H, { fill: 'μ' }); L.usedHeights = true;
const WALL = 'μ', STRIPE = 'ι', DECK = 'Μ', MOLE = 'Ι', PLINTH = 'G';
const rOf = (x, z) => Math.hypot(x - C, z - C);                                                                    // the dock is centred on the middle of cell (32, 32)
const pol = (r, a) => [Math.round(C + r * Math.cos(a * Math.PI / 180)), Math.round(C + r * Math.sin(a * Math.PI / 180))];
// the steps: the lowest r 8..13 (h 0), a ramp 13..15 (h 1), the middle step 15..21 (h 2), a ramp 21..23 (h 3), the highest 23..27 (h 4); a band is two cells wide so no diagonal ever steps two units
const hOf = (r) => (r < 13 ? 0 : r < 15 ? 1 : r < 21 ? 2 : r < 23 ? 3 : 4);
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
  const r = rOf(x, z); if (r >= 27) continue;
  if (r < 4) setCell(L, x, z, MOLE, 4); else if (r < 8) L.g[z][x] = '~'; else setCell(L, x, z, DECK, hOf(r));
}
// the causeway to the mole (north side, three wide, a half-metre rise a cell) with the mole gate in it: a door between two stubs of wall, on level ground at the mole's first row
for (let z = 25; z <= 28; z++) for (const x of [31, 32, 33]) setCell(L, x, z, DECK, z - 24);
for (const x of [30, 31, 33, 34]) setCell(L, x, 29, PLINTH, 4); setCell(L, 32, 29, DECK, 4); L.door(32, 29, { remote: true });
// the plinth of the bell in the middle of the mole
for (let z = 31; z <= 33; z++) for (let x = 31; x <= 33; x++) setCell(L, x, z, PLINTH);
// the four gates of the outer wall: a three-by-three bay cut into the wall on each diagonal, level with the highest step
const GATES = [45, 135, 225, 315].map((a) => { const [gx, gz] = pol(28.4, a); box(L, [gx - 1, gz - 1, gx + 1, gz + 1], DECK, 4); return [gx, gz]; });
const EXIT = [32, 6];
// the outer wall wears a second stone in stripes
for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (L.g[z][x] === WALL) { let t = false; for (let dz = -1; dz <= 1 && !t; dz++) for (let dx = -1; dx <= 1; dx++) if ((L.g[z + dz]?.[x + dx] ?? WALL) === DECK && !(dx && dz)) { t = true; break; } if (t && (x + z) % 3 === 0) L.g[z][x] = STRIPE; }
if (process.env.FIND_SECRET) {
  const wall = (x, z) => x >= 1 && z >= 1 && x < W - 1 && z < H - 1 && (L.g[z][x] === WALL || L.g[z][x] === STRIPE), out = [];
  for (let z = 2; z < H - 2; z++) for (let x = 2; x < W - 2; x++) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (!wall(x, z) || L.g[z - dz][x - dx] !== DECK || L.ht[z - dz][x - dx] !== 4) continue;
    const px = -dz, pz = dx; if (!wall(x + px, z + pz) || !wall(x - px, z - pz)) continue;
    const room = []; for (let i = 1; i <= 2; i++) for (let s = -1; s <= 1; s++) room.push([x + dx * i + px * s, z + dz * i + pz * s]);
    if (!room.every(([a, b]) => wall(a, b))) continue;
    const key = new Set(room.map(([a, b]) => a + ',' + b)); key.add(x + ',' + z); let ok = true;
    for (const [a, b] of room) for (let q = -1; q <= 1; q++) for (let r2 = -1; r2 <= 1; r2++) { const na = a + q, nb = b + r2; if (key.has(na + ',' + nb)) continue; if (!wall(na, nb)) ok = false; }
    if (ok) out.push({ panel: [x, z], d: [dx, dz], a: Math.round(Math.atan2(z - C, x - C) * 180 / Math.PI) });
  }
  console.log('SECRET CANDIDATES', JSON.stringify(out));
}
// the secret: a seam in the outer wall (a straight run of wall with the highest step in front of it and a 3 x 2 block of solid behind)
const SEC = { panel: [38, 5], cells: [[37, 4], [38, 4], [39, 4], [37, 3], [38, 3], [39, 3]] };
for (const [x, z] of SEC.cells) setCell(L, x, z, DECK, 4);
L.g[SEC.panel[1]][SEC.panel[0]] = 'S'; L.ht[SEC.panel[1]][SEC.panel[0]] = 4;
// ---- objects --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const P = placer(L); const { E, P: PK, PR } = P; void E;
const START = pol(25, 90); L.put(START[0], START[1], '@'); P.reserve(START[0], START[1]);
for (let z = 6; z <= 9; z++) for (let x = 31; x <= 35; x++) P.reserve(x, z);                                                // the way to the exit stays clear
for (let a = 0; a < 360; a += 30) { const [x, z] = pol(26, a + 15); PR('lamppost', x, z); }
for (let a = 0; a < 360; a += 30) { const [x, z] = pol(18, a + 15); PR('crate', x, z); }
for (let a = 0; a < 360; a += 45) { const [x, z] = pol(22, a); PR('barrel', x, z); }
for (const a of [45, 135, 225, 315]) { const [x, z] = pol(3, a); PR('pillar', x, z); }
for (const [gx, gz] of GATES) PR('lantern', gx, gz);
PR('lamppost', 31, 30); PR('lamppost', 33, 30); PR('lantern', 32, 30);                                                   // the lamps over the rope
for (const [a, k] of [[60, 'health_large'], [75, 'health_small'], [105, 'health_small'], [120, 'health_large'], [160, 'health_small'], [200, 'health_small'], [240, 'health_large'], [260, 'health_small'], [280, 'health_small'], [300, 'health_large'], [340, 'health_small'], [20, 'health_small']]) { const [x, z] = pol(25, a); PK(k, x, z); }
for (const a of [80, 100, 180, 270, 0]) { const [x, z] = pol(25, a); PK('armor_vest', x, z); }
// the landing: a supply ring within a step of where you land (a human and the bot both fight from here)
for (const [dx, dz, k] of [[-2, 0, 'health_large'], [2, 0, 'health_large'], [-1, -1, 'health_small'], [1, -1, 'health_small'], [-1, 1, 'health_small'], [1, 1, 'health_small'], [0, -2, 'armor_vest'], [0, -3, 'armor_vest'], [-3, -1, 'ammo_rivet'], [3, -1, 'ammo_rivet'], [-3, 1, 'ammo_rivet'], [-4, -1, 'ammo_rivet'], [4, -1, 'ammo_rivet'], [-4, 1, 'ammo_rivet'], [4, 1, 'ammo_rivet'], [-5, 0, 'ammo_rivet'], [3, 1, 'ammo_shell'], [-4, 0, 'ammo_shell'], [4, 0, 'ammo_shell'], [5, 0, 'ammo_shell'], [-5, -1, 'ammo_shell'], [5, -1, 'ammo_shell'], [-2, -2, 'ammo_flare'], [2, -2, 'ammo_flare'], [-3, -2, 'ammo_flare'], [3, -2, 'ammo_flare'], [-1, -3, 'ammo_bolt'], [1, -3, 'ammo_bolt'], [-2, -3, 'ammo_bolt'], [2, -3, 'ammo_bolt'], [-6, 0, 'ammo_bolt'], [6, 0, 'ammo_bolt'], [0, -4, 'ammo_cell']]) PK(k, START[0] + dx, START[1] + dz);
SEC.cells.forEach(([x, z], i) => PK(['armor_vest', 'ammo_rocket', 'health_large', 'ammo_round', 'ammo_rocket', 'health_small'][i], x, z));
// ---- the stand -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const T0 = 30, DT = 18, strokeT = (k) => T0 + DT * (k - 1);                                                           // stroke 1 at 30 s, stroke 8 at 156 s
const WAVES = [
  { gaunt: 4, tollbearer: 4 },
  { bellhand: 1, chorister: 1, tollbearer: 5 },
  { zealot: 3, gaunt: 3, tollbearer: 2 },
  { bulwark: 1, tollbearer: 5, gaunt: 2 },
  { zealot: 2, tollbearer: 5, gaunt: 3 },
  { gill: 1, chorister: 1, tollbearer: 6 },
  { gaunt: 4, zealot: 2, bellhand: 1, tollbearer: 4 },
  { bulwark: 1, chorister: 1, zealot: 3, tollbearer: 5 },
];
const LAST = { zealot: 4, gill: 1, tollbearer: 5, bellhand: 1 };
const SLOTS = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]];
const flat = (o) => Object.entries(o).flatMap(([k, n]) => Array(n).fill(k));
const spawnsAt = (kinds, g, group) => kinds.map((kind, i) => { const [gx, gz] = GATES[g], [dx, dz] = SLOTS[i % SLOTS.length]; return { spawn: { kind, at: [gx + dx, gz + dz], group, hunt: true, facing: Math.atan2(C - gx, C - gz) } }; });
const triggers = [], messages = [];
const STROKE_TEXT = ['ONE. A GATE IN THE WALL IS OPEN.', 'TWO.', 'THREE. THE WATER IS COMING UP THE FIRST STEP.', 'FOUR.', 'FIVE.', 'SIX. THE WATER IS COMING UP THE SECOND STEP.', 'SEVEN.', 'EIGHT. THE NINTH IS RUNG BY HAND.'];
WAVES.forEach((roster, wi) => {
  const k = wi + 1, kinds = flat(roster), t = strokeT(k);
  for (let j = 0; j < 4; j++) {
    const mine = kinds.filter((_, i) => i % 4 === j); if (!mine.length) continue;
    triggers.push({ id: `w${k}-${j}`, when: 'time:' + (t + 3 * j), do: [...(j === 0 ? [{ sound: 'toll' }, { tremor: 0.3 }, { message: 'stroke' + k }] : []), ...spawnsAt(mine, (wi + j) % 4, 'w' + k)] });
  }
  messages.push({ id: 'stroke' + k, at: [1, 1], radius: 0.1, speaker: 'TIDE PLATE', text: STROKE_TEXT[wi] });
});
triggers.push({ id: 'last', when: 'time:' + (strokeT(8) + 28), do: [{ sound: 'toll' }, { tremor: 0.4 }, ...[0, 1, 2, 3].flatMap((g) => spawnsAt(flat(LAST).filter((_, i) => i % 4 === g), g, 'last')), { message: 'last' }, { objective: 'The last squad is in the gates. Clear the dock and the causeway opens' }] });
triggers.push({ id: 'mole', when: ['dead:w8', 'dead:last'], do: [{ open: [32, 29] }, { message: 'mole' }, { objective: 'The causeway is open. The rope is on the plinth in the middle of the mole' }] });
triggers.push({ id: 'tide1', when: 'time:' + (strokeT(3) + 2), do: [{ objective: 'The water is rising. Keep to the highest step' }] });
triggers.push({ id: 'stand', when: 'time:' + strokeT(1), do: [{ objective: 'Hold the dock. The gates open at every stroke' }] });
const MAP = {
  id: 'C2M28', name: 'Last Tide', version: 1, ceilingHeight: 4.2, par: { time: 600 },
  atmosphere: { look: 'tide', sky: 'anselm', fog: '#34382c', fogDensity: 0.006 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 20, shell: 30, rivet: 200, bolt: 18, cell: 50, round: 50, rocket: 6 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'LAST TIDE', lines: ['The harbour has been copied in a smaller size, stone for stone, with the sea left out.', 'A bell hangs in the middle of it. Somebody rings it from outside.'] },
  outro: 'Nine. The gate at the north end of the quay stood open, and the dock was still, and the water went on rising for a while with nothing left to climb.',
  objective: 'Hold the dock. Eight strokes bring eight waves; the ninth is the rope on the mole',
  ...L.layers(),
  secrets: [{ id: 'seam', panel: SEC.panel, cells: SEC.cells }],
  groups: [], tide: { levels: [[0, -1], [strokeT(3), -1], [strokeT(3) + 12, 0.6], [strokeT(6), 0.6], [strokeT(6) + 12, 1.6]] },
  entities: [...P.ents,
    { type: 'switch', id: 'rope', at: [32, 30], wall: 'south', once: true, do: [{ sound: 'toll' }, { tremor: 0.6 }, { message: 'ninth' }, { exit: { set: 'unlock' } }, { objective: 'Nine. The gate in the north wall is open: back across the dock to the exit' }] },
    { type: 'exit', at: EXIT, dest: 'next', locked: true }],
  scenery: [{ kind: 'tower', at: [32, 32] }, { kind: 'spire', at: [-8, 14] }, { kind: 'spire', at: [72, 50] }, { kind: 'spire', at: [20, 76] }],
  messages: [
    { id: 'start', at: START, radius: 6, speaker: 'INES', text: 'Three steps of stone down to the water, and a bell on a mole. Marrow\'s north pier had a fog-bell that rang nine times at the turn of the tide. Somebody has copied it from memory.' },
    { id: 'plate', at: START, radius: 8, speaker: 'TIDE PLATE', text: 'NINE STROKES. THE DOCK RINGS THE FIRST EIGHT. THE NINTH IS RUNG BY HAND, ON THE MOLE.' },
    { id: 'gates', at: pol(25, 70), radius: 6, speaker: 'HULL', text: 'The four bays in the outer wall are gates. What comes in comes from them, a few seconds apart. The first stroke is thirty seconds after you land.' },
    { id: 'caches', at: pol(25, 120), radius: 6, speaker: 'HULL', text: 'Health and armour lie along the highest step. Pick them up before the first stroke; after it there is no time.' },
    { id: 'tide', at: pol(18, 90), radius: 6, speaker: 'HULL', text: 'The water will come over the lowest step at the third stroke and the middle step at the sixth. Wading slows you to under two thirds. The highest step stays dry.' },
    { id: 'last', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The gates have opened once more, and this is the last squad. When it falls, and the eighth wave with it, the gate on the causeway opens.' },
    { id: 'mole', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The causeway gate is open. The rope is on the plinth in the middle of the mole, under the lamps.' },
    { id: 'ninth', at: [1, 1], radius: 0.1, speaker: 'INES', text: 'Nine. It sounds the same as the north pier\'s, to the half-second. Somebody listened to it for a very long time.' },
    { id: 'exit', at: [32, 10], radius: 5, speaker: 'HULL', text: 'The exit is locked. The ninth stroke unlocks it, and the rope for the ninth is on the mole.' },
    { id: 'hollow', at: [38, 7], radius: 3, speaker: 'HULL', text: 'The outer wall of the highest step rings hollow in one short run, east of the exit. There is a seam.' },
    { id: 'cache', at: SEC.cells[1], radius: 3, speaker: 'A SILENT (NOTE)', text: 'I kept the dock\'s tally on this wall, a mark a night for a year. The water took the first step of the quay. It never got as far as the wall.' },
    ...messages,
  ],
  triggers,
  quality: { enemies: [0, 200], botSeconds: [60, 900], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 5,
    scaleClass: 'SET-PIECE', reason: 'the place is one round dock under an open sky: a stand on three steps round a basin, with a tide that climbs them', introduces: 'the stand: the dock tolls eight strokes and a wave comes through four gates with each, the tide climbs the lower steps, and the ninth stroke is rung by hand' },
};
MAP.drops = { scale: 1, keep: [[START[0] - 8, START[1] - 6, START[0] + 8, START[1] + 3]] };                                   // the landing's own ammunition stays (a stand has supplies as well as kills)
console.log('C2M28: spawn actions', triggers.reduce((n, t) => n + t.do.filter((a) => a.spawn).length, 0), 'start', START, 'gates', JSON.stringify(GATES));
const Z = (x, z) => [x, z];
const HOLD = (t) => ({ op: 'waitfor', when: 'time:' + t });
const STAND = [START[0], START[1] - 1];
const finale = [{ op: 'waitfor', when: ['dead:w8', 'dead:last'], max: 150 }, { op: 'wait', seconds: 3 }, [32, 24, 0], [32, 28, 0], [32, 30, 0], { op: 'switch', id: 'rope' }, [32, 28, 0], [32, 24, 0], [34, 16, 0], [34, 10, 0], [EXIT[0], EXIT[1] + 1, 0], [EXIT[0], EXIT[1], 0]];
export const waypoints = {
  main: [[START[0], START[1], 0], [STAND[0], STAND[1], 0], HOLD(strokeT(1)), HOLD(strokeT(1) + 70), HOLD(strokeT(8)), ...finale],
  secret: [[START[0], START[1], 0], [38, 8, 0], { op: 'use', at: SEC.panel }, [38, 3, 0], [38, 8, 0], [STAND[0], STAND[1], 0], HOLD(strokeT(1)), HOLD(strokeT(1) + 70), HOLD(strokeT(8)), ...finale],
};
export default MAP;
