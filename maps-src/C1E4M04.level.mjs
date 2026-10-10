// C1E4M04 MIRROR ARRAY: where the Gate is focused. The first real puzzle of the game. A round glass drum 38 cells across (a dome that follows the radius, 12 m over the middle, 6.5 m at the rim) with a solid lens-column in the middle and four glass screens
// cutting the ring of floor into four chambers (north-west where you arrive, north-east, south-east, south-west); a gallery two metres up round three of the chambers, where the singers stand. ONE EMITTER sends light south down the north-west chamber; four
// MIRRORS stand at the corners of a square round the column, and every mirror is one-sided (a face and a back: Use turns it a quarter step, light that meets the back stops there). Each corner is a BRANCH: turn it one way and the light goes into a receiver,
// turn it another and the light goes ON along the square. A receiver you light opens the screen door to the next chamber FOR GOOD; then send the light through it. The last corner chooses the exit (light R-exit) or the secret (light R-secret).
// A small round antechamber teaches it first: one mirror, one turn. Doors latch; the order is the trick; the bot's route turns the mirrors under fire (the singers and the two Acolytes are not impressed). Scale class COMPRESSION. Look: mirror.
import { Level, hchar } from '../tools/mapkit/builder.mjs';
import { FLOOR_SKINS } from '../src/engine/defs.js';

const W = 72, H = 70, CX = 44, CZ = 36, TAU = 360;
const L = new Level(W, H, { fill: 'J' }); L.usedHeights = true; L.usedCeil = true;
const rOf = (x, z) => Math.hypot(x + 0.5 - CX, z + 0.5 - CZ);
const aOf = (x, z) => ((Math.atan2(z + 0.5 - CZ, x + 0.5 - CX) * 180) / Math.PI + TAU) % TAU;
const between = (a, [lo, hi]) => a >= lo && a <= hi;
const GALLERY = [[205, 268], [272, 358], [2, 88]];                                          // NW, NE, SE (the south-west chamber has the exit and no gallery)
const STAIRS = [[250, 11], [335, 11], [70, 11]];                                           // mid-angle and half-width of each stair (degrees)

// ---- the drum -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const domeU = (r) => Math.round(2 * (12 - (r - 5.2) * 0.4));                                  // the lid in 0.5 m units: 12 m at the column, 6.5 m at the rim
for (let z = CZ - 21; z <= CZ + 21; z++) for (let x = CX - 21; x <= CX + 21; x++) {
  if (x < 1 || z < 1 || x >= W - 1 || z >= H - 1) continue;
  const r = rOf(x, z), a = aOf(x, z); if (r <= 5.2 || r > 18.2) continue;
  let h = null;
  if (r <= 7.2) h = 2;                                                                      // the plinth ring round the column
  else if (r <= 8.2) h = 1;                                                                 // a step down from the plinth to the floor
  else if (r <= 15.2) h = 0;
  else if (GALLERY.some((s) => between(a, s))) h = 4;                                        // the galleries
  if (h == null) continue;
  const st = STAIRS.find(([m, hw]) => Math.abs(((a - m + 540) % TAU) - 180) <= hw);
  if (st && r > 12.2 && r <= 15.2) h = Math.min(4, Math.ceil(r - 12.2));                      // the stairs: a unit a cell from the floor to the gallery
  L.g[z][x] = '4'; L.ht[z][x] = h; L.ce[z][x] = hchar(domeU(r));
}
// the four screens: one cell of glass from the column to the outer wall; the three that have doors (north, east, south) and the solid one (west)
for (let z = CZ - 20; z <= CZ - 5; z++) L.g[z][44] = 'J'; for (let z = CZ + 5; z <= CZ + 20; z++) L.g[z][44] = 'J';
for (let x = CX + 5; x <= CX + 20; x++) L.g[36][x] = 'J'; for (let x = CX - 20; x <= CX - 5; x++) L.g[36][x] = 'J';
const D1 = [44, 28], D2 = [52, 36], D3 = [44, 44];
for (const [x, z] of [D1, D2, D3]) { L.door(x, z, { remote: true }); L.ht[z][x] = 0; L.ce[z][x] = hchar(domeU(rOf(x, z))); }

// ---- the antechamber (round), its passage to the drum, the exit passage and the exit room (round), the secret passage and its closet --------------------------------------------------------------------------------------
const ante = L.disc(12, 32, 7.2, 6, '4', 'J'); const exitRoom = L.disc(13, 46, 7.2, 5, '4', 'J');
L.rect([11, 22, 13, 24], '4'); L.secretPanel(12, 25);                                           // a niche behind a loose panel in the antechamber's north wall (a cache: the one secret that is not a puzzle)
L.rect([19, 32, 24, 32], '4'); L.door(25, 32, { remote: true });                                // the antechamber's door into the north-west chamber
for (let x = 26; x <= 29; x++) { L.g[32][x] = '4'; L.ht[32][x] = 0; }
L.rect([18, 44, 24, 44], '4'); L.door(25, 44, { remote: true });                                // the exit passage from the south-west chamber
for (let x = 26; x <= 30; x++) { L.g[44][x] = '4'; L.ht[44][x] = 0; }
for (let z = 49; z <= 53; z++) { L.g[z][38] = '4'; L.ht[z][38] = 0; }
L.closet(38, 54); for (let z = 55; z <= 59; z++) L.g[z][38] = '4'; L.disc(38, 62, 3.6, 3.2, '4', 'J');

// ---- the beams ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const props = [
  { type: 'prop', kind: 'emitter', id: 'e0', at: [7, 30], dir: 'e' }, { type: 'prop', kind: 'mirror', id: 'm0', at: [12, 30], rot: 2 }, { type: 'prop', kind: 'receiver', id: 'r0', at: [12, 35] },     // the lesson
  { type: 'prop', kind: 'emitter', id: 'e1', at: [36, 25], dir: 's' },
  { type: 'prop', kind: 'mirror', id: 'mb', at: [36, 28], rot: 2 }, { type: 'prop', kind: 'receiver', id: 'r1', at: [32, 28] },
  { type: 'prop', kind: 'mirror', id: 'mc', at: [52, 28], rot: 1 }, { type: 'prop', kind: 'receiver', id: 'r2', at: [52, 25] },
  { type: 'prop', kind: 'mirror', id: 'md', at: [52, 44], rot: 3 }, { type: 'prop', kind: 'receiver', id: 'r3', at: [56, 44] },
  { type: 'prop', kind: 'mirror', id: 'me', at: [36, 44], rot: 0 }, { type: 'prop', kind: 'receiver', id: 'rx', at: [36, 40] }, { type: 'prop', kind: 'receiver', id: 'rs', at: [36, 48] },
  { type: 'prop', kind: 'mirror', id: 'xa', at: [40, 29], rot: 0 }, { type: 'prop', kind: 'mirror', id: 'xb', at: [48, 43], rot: 1 },                                                                    // two that do nothing
];
// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const FLOORS = new Set(Object.keys(FLOOR_SKINS)), isFloor = (x, z) => FLOORS.has(L.g[z]?.[x]);
const ents = [...props], used = new Set(props.map((p) => p.at.join(',')));
const put = (type, kind, x, z, extra = {}) => { const k = x + ',' + z; if (!isFloor(x, z) || used.has(k)) { console.log('C1E4M04: no cell for', kind, 'at', x, z, L.g[z]?.[x]); return null; } used.add(k); ents.push({ type, kind, at: [x, z], ...extra }); return [x, z]; };
const polar = (r, a) => [Math.floor(CX + r * Math.cos((a * Math.PI) / 180)), Math.floor(CZ + r * Math.sin((a * Math.PI) / 180))];
const E = (kind, r, a) => { const [x, z] = polar(r, a); for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1]]) if (put('enemy', kind, x + dx, z + dz)) return; };
const P = (kind, r, a) => { const [x, z] = polar(r, a); for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1]]) if (put('pickup', kind, x + dx, z + dz)) return; };
const PR = (kind, r, a) => { const [x, z] = polar(r, a); for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1]]) if (put('prop', kind, x + dx, z + dz)) return; };
const START = [8, 33]; used.add(START.join(',')); L.put(START[0], START[1], '@');
// the antechamber: a porter asleep, a lamp or two, a supply station (kept)
put('enemy', 'tollbearer', 16, 28); for (const [x, z] of [[9, 28], [15, 36], [17, 32]]) put('prop', 'lantern', x, z);
for (const [k, x, z] of [['ammo_flare', 15, 33], ['ammo_shell', 16, 34], ['ammo_rivet', 14, 35], ['health_small', 9, 36]]) put('pickup', k, x, z);
// the north-west chamber (you arrive): a chorister on its gallery, a gaunt, a tollbearer
E('chorister', 17, 232); E('gaunt', 11, 214); E('tollbearer', 12, 244); E('gaunt', 13, 262); P('health_small', 12, 205); PR('lantern', 8.5, 235); PR('lantern', 8.5, 205);
// the north-east chamber: an Acolyte warding a pair, a chorister up on the gallery
E('acolyte', 11, 318); E('tollbearer', 13, 300); E('gaunt', 10, 285); E('chorister', 17, 312); P('health_large', 9, 290); PR('lantern', 8.5, 300); PR('lantern', 8.5, 340);
// the south-east chamber: another Acolyte, singers, sleepers
E('tollbearer', 13, 40); E('gaunt', 12, 80); E('tollbearer', 9.5, 20); E('chorister', 17, 55); P('health_small', 10, 75); P('armor_vest', 9, 50); PR('lantern', 8.5, 55); PR('lantern', 8.5, 20);
// the south-west chamber: the last of them, and the receivers
E('gaunt', 12, 120); E('tollbearer', 10, 155); E('gaunt', 13, 140); P('health_large', 9, 130); PR('lantern', 8.5, 160); PR('lantern', 8.5, 125);
// the exit room: nothing (a lantern); the secret room: a cache
put('prop', 'lantern', 10, 44); put('prop', 'lantern', 16, 48);
for (const [k, x, z] of [['armor_vest', 11, 23], ['ammo_shell', 13, 23], ['health_large', 12, 22], ['ammo_rivet', 11, 24]]) put('pickup', k, x, z);
for (const [k, x, z] of [['armor_vest', 36, 60], ['ammo_shell', 40, 60], ['ammo_rivet', 37, 63], ['health_large', 39, 63], ['ammo_flare', 38, 64]]) put('pickup', k, x, z);

const MAP = {
  id: 'C1E4M04', name: 'Mirror Array', version: 1, ceilingHeight: 4.2, par: { time: 480 },
  atmosphere: { fog: '#10081c', fogDensity: 0.009, sky: 'orbit', look: 'mirror' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'MIRROR ARRAY', lines: ['The Gate is focused here, through glass.', 'A beam wants somewhere to go.'] },
  outro: 'The array lets the light through. Somewhere ahead a ring is being made ready.',
  objective: 'The antechamber: turn the mirror so the light reaches the receiver. It opens the way into the array',
  ...L.layers(),
  secrets: [{ id: 'niche', panel: [12, 25], cells: [[11, 24], [12, 24], [13, 24], [11, 23], [12, 23], [13, 23], [11, 22], [12, 22], [13, 22]] }],
  entities: [...ents, { type: 'exit', at: [11, 46], dest: 'next' }, { type: 'exit', id: 'secret', at: [38, 62], dest: 'secret', locked: true }],
  messages: [
    { id: 'start', at: START, radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Mirror Array: where the Gate is focused. Light does the work here. Use turns a mirror a quarter step. A mirror has a face and a back: light that meets the back stops.' },
    { id: 'lesson', at: [12, 33], radius: 2.5, speaker: 'INES', text: 'The light wants somewhere to go.' },
    { id: 'opened', at: [28, 32], radius: 2, speaker: 'HULL', text: 'The way into the array is open.' },
    { id: 'nw', at: [34, 31], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Four chambers, screens between them. Light stops at a shut screen door. Light a receiver and the next door opens, for good. Then send the light on through it.' },
    { id: 'acolyte', at: [50, 30], radius: 3, speaker: 'INES', text: 'Tall one with the wheel. Everything near it takes half. Kill it first. The mirrors can wait; they are not going anywhere.' },
    { id: 'se', at: [50, 42], radius: 3, speaker: 'SIGNAL HOUSE', text: 'The corner mirror throws the light two ways: into a receiver, or on along the square. You will want both, one after the other.' },
    { id: 'sw', at: [38, 44], radius: 3, speaker: 'INES', text: 'Two receivers on the last mirror. One opens the exit. The other, on the far side, opens something that was not meant to be found.' },
    { id: 'secret', at: [38, 52], radius: 3, speaker: 'HULL', text: 'The wall at the end of the niche is not a wall.' },
  ],
  triggers: [
    { id: 'door-in', when: 'lit:r0', do: [{ open: [25, 32] }, { objective: 'The array: light each receiver in turn, then send the light on' }, { message: 'opened' }] },
    { id: 'door-1', when: 'lit:r1', do: [{ open: [44, 28] }, { objective: 'The north screen is open. Send the light through it, to the north-east receiver' }] },
    { id: 'door-2', when: 'lit:r2', do: [{ open: [52, 36] }, { objective: 'The east screen is open. On to the south-east receiver' }] },
    { id: 'door-3', when: 'lit:r3', do: [{ open: [44, 44] }, { objective: 'The south screen is open. The last mirror, south-west, opens the exit' }] },
    { id: 'door-out', when: 'lit:rx', do: [{ open: [25, 44] }, { objective: 'The exit is open: south-west, west of the last mirror' }, { shake: 1 }] },
    { id: 'door-secret', when: 'lit:rs', do: [{ open: [38, 54] }, { exit: { id: 'secret', set: 'unlock' } }, { objective: 'Something opened in the south wall of the last chamber' }, { shake: 1 }] },
  ],
  quality: { enemies: [10, 70], botSeconds: [30, 900], mechanics: ['heights', 'triggers', 'closets'], skins: 2, enemyKinds: { acolyte: 1, chorister: 3, tollbearer: 4, gaunt: 3 },
    scaleClass: 'COMPRESSION', tallReason: 'the mirror drum is a named hall: a dome 12 m over the column so that the light has room to run',
    introduces: 'the beam tracer: one-sided mirrors you turn with Use, an emitter, receivers that open the screen doors for good: the first real puzzle of the game' },
};
MAP.drops = { scale: 1, keep: [[14, 32, 17, 36]] };
console.log('C1E4M04: enemies', ents.filter((e) => e.type === 'enemy').length);
export default MAP;
export { L };
