// C1E4M02 WRECK BELT: the graveyard of earlier invasions. Three wrecks hang in the dark with open sky between them; the only roads are the VENTS (a lit plate in a deck throws you along a slow arc to the next deck: low gravity without a jump key).
// Three wrecks of three other worlds' ships, three plans, three skins: A THE NEEDLE (a teardrop of torn grey plate 62 cells long, broken in two, rising 4 m nose-ward: a roofed hall down its tail, a roofed bunk in its nose, an open bow), B THE GIMBAL (a resin-grown
// gimbal of broken rings: an open outer ring, a resin tube for the middle ring, a chamber for a hub, four spoke walks across them), C THE CUP (a lattice bowl 27 cells across, its rim torn open, a domed lower deck at its keel and the exit lock in the middle).
// Route: the tail of the needle (the car's lock) -> the first vent, a short hop over the break (a miss is nearly impossible: you learn the cost for free) -> the needle's nose and its open bow (Choristers across the gaps, a Drone-Gill) -> the long vent to the gimbal ->
// the gimbal's rings and its hub: the FUSE (a Bellhand and a Sexton guard it) -> the vent to the cup -> down the bowl to the keel, where the exit lock wants the fuse. A miss is the sky: 15 damage and back to the last plate, never death.
// Optional: a long vent from the cup's west rim to a tiny islet with a hut (a loose panel, a cache) and its way back. Scale class MIXED. Look: wreck (torn hulls, cold teal shade, sparks, the world below).
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';

const W = 112, H = 80;
const L = new Level(W, H, { fill: '_' });
L.usedHeights = true; L.usedCeil = true;
const inb = (x, z) => x >= 1 && z >= 1 && x < W - 1 && z < H - 1;
const set = (x, z, ch, h = 0) => { if (inb(x, z)) { L.g[z][x] = ch; L.ht[z][x] = h; } };
const wallAt = (x, z, ch = 'O') => { if (inb(x, z)) L.g[z][x] = ch; };
const isFloor = (x, z) => { const c = L.g[z]?.[x]; return c === 'h' || c === '+' || c === 'm' || c === 'n' || c === 'd' || c === 'a'; };

// ---- A, the needle: a teardrop along z = 14, 62 cells long, broken at x 36..41; the floor climbs 4 m from the tail to the nose ------------------------------------------------------------------------------------------
const Z0 = 14, wN = (x) => { const u = (x - 4) / 62; if (u <= 0 || u >= 1) return 0; return u <= 0.35 ? 6.5 * Math.pow(Math.sin((Math.PI / 2) * (u / 0.35)), 0.8) : 6.5 * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.35) / 0.65, 3))); };
const hA = (x) => Math.round((8 * (x - 4)) / 62);
const BREAK = [36, 41], TAIL_HALL = [8, 33], NOSE_HALL = [44, 58];
for (let x = 4; x <= 66; x++) {
  const w = wN(x); if (w < 0.7 || (x >= BREAK[0] && x <= BREAK[1])) continue;
  const hall = (x >= TAIL_HALL[0] && x <= TAIL_HALL[1]) || (x >= NOSE_HALL[0] && x <= NOSE_HALL[1]), half = w - 1.2;
  for (let z = Math.round(Z0 - w); z <= Math.round(Z0 + w); z++) {
    const dz = Math.abs(z - Z0 + 0.0);
    if (hall) { if (dz <= half) set(x, z, '+', hA(x)); else wallAt(x, z, 'O'); }
    else set(x, z, 'h', hA(x));
  }
}
for (let z = 4; z <= 24; z++) { for (const x of [TAIL_HALL[0] - 1, TAIL_HALL[0] - 2]) if (L.g[z][x] === '+') L.g[z][x] = 'O'; }       // the tail hall's end wall
for (let x = 11; x <= 31; x++) if (![17, 18, 24, 25].includes(x) && L.g[Z0][x] === '+') L.g[Z0][x] = 'O';                          // the spine: a wall down the hall with gaps (two corridors)
for (let z = 4; z <= 24; z++) { if (L.g[z][NOSE_HALL[1] + 1] === 'h' && z !== Z0 && z !== Z0 - 1 && z !== Z0 + 1 && Math.abs(z - Z0) <= wN(NOSE_HALL[1] + 1) - 0.5) { /* the nose hall's open end: left open (the bow deck beyond) */ } }

// ---- B, the gimbal: centre (88, 32). Outer ring r 15 (open), middle ring r 10 (a resin tube), hub r 5.5 (a chamber), four spokes ----------------------------------------------------------------------------------------
const BX = 88, BZ = 32, ang = (x, z) => ((Math.atan2(z - BZ, x - BX) * 180) / Math.PI + 360) % 360;
const gapIn = (a, list) => list.some(([lo, hi]) => a >= lo && a <= hi);
const OUTER_GAPS = [[20, 36], [140, 156], [250, 266]], MID_GAPS = [[70, 86], [190, 206], [310, 326]];
for (let z = BZ - 18; z <= BZ + 18; z++) for (let x = BX - 18; x <= BX + 18; x++) {
  const r = Math.hypot(x + 0.5 - BX, z + 0.5 - BZ), a = ang(x + 0.5, z + 0.5);
  const spoke = [0, 90, 180, 270].some((s) => { const da = Math.min(Math.abs(a - s), 360 - Math.abs(a - s)); return r * Math.sin((da * Math.PI) / 180) < 1.6 && Math.cos((da * Math.PI) / 180) > 0; });
  if (r > 18) continue;
  if (r <= 5.4) { set(x, z, 'n', 10); continue; }                                                                                      // the hub
  if (r <= 6.8) { wallAt(x, z, 'R'); continue; }                                                                                      // the hub's wall (opened at the spokes below)
  const outerRing = Math.abs(r - 15) <= 1.6, midRing = Math.abs(r - 10) <= 2.6;
  if (midRing) {                                                                                                                       // the middle ring: a resin tube (floor r 9..11, walls either side)
    if (Math.abs(r - 10) <= 1.4) { if (!gapIn(a, MID_GAPS) || spoke) set(x, z, 'n', 8); }
    else if (!gapIn(a, MID_GAPS)) wallAt(x, z, 'R');
    if (spoke && r > 6.8) set(x, z, 'n', Math.round(10 - (r - 6.8) * 0.45));
    continue;
  }
  if (outerRing) { if (!gapIn(a, OUTER_GAPS) || spoke) set(x, z, 'm', 6); continue; }
  if (spoke && r > 6.8 && r < 16.6) set(x, z, 'm', Math.max(6, Math.round(10 - (r - 6.8) * 0.42)));                                   // a spoke between the rings: a walk (open) with a slope
}
// openings in the hub's wall at the spokes (north and south), a spoke is already floor from r 6.8 out: open the wall ring there
for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) for (let k = 5; k <= 7; k++) for (const off of [-1, 0]) { const x = BX + dx * k + (dx ? 0 : off), z = BZ + dz * k + (dz ? 0 : off); if (L.g[z][x] === 'R') set(x, z, 'n', 10); }
// the heights of the gimbal: the outer ring at 6, the tube at 8, the hub at 10; between them a slope of less than a unit a cell (a step is passable up to 0.6 m)
const hB = (r) => (r >= 14 ? 6 : r > 11.4 ? 6 + (2 * (14 - r)) / 2.6 : r >= 8.6 ? 8 : r > 5.4 ? 8 + (2 * (8.6 - r)) / 3.2 : 10);
for (let z = BZ - 18; z <= BZ + 18; z++) for (let x = BX - 18; x <= BX + 18; x++) { const c = L.g[z][x]; if (c === 'm' || c === 'n') L.ht[z][x] = Math.round(hB(Math.hypot(x + 0.5 - BX, z + 0.5 - BZ))); }

// ---- C, the cup: centre (58, 64), radius 13.5; the bowl's floor climbs from the keel to the rim; a domed lower deck (r <= 8) inside a lattice ring with four openings ----------------------------------------------------------------
const CX = 58, CZ = 64, hC = (r) => Math.max(2, Math.round(6 * Math.pow(r / 13.5, 2)));
for (let z = CZ - 15; z <= CZ + 15; z++) for (let x = CX - 15; x <= CX + 15; x++) {
  const r = Math.hypot(x + 0.5 - CX, z + 0.5 - CZ), a = ((Math.atan2(z + 0.5 - CZ, x + 0.5 - CX) * 180) / Math.PI + 360) % 360;
  if (r > 13.5) continue;
  if (r <= 8.0) { set(x, z, '+', 2); continue; }
  if (r <= 9.3) { const open = [0, 90, 180, 270].some((s) => Math.min(Math.abs(a - s), 360 - Math.abs(a - s)) < 11); if (open) set(x, z, 'h', hC(r)); else wallAt(x, z, 'N'); continue; }
  set(x, z, 'h', hC(r));
}
// the keel chamber with the exit lock: a 3 x 3 room in the middle, a door on its north side that wants the fuse
for (let z = CZ - 2; z <= CZ + 2; z++) for (let x = CX - 2; x <= CX + 2; x++) { const inner = Math.abs(x - CX) <= 1 && Math.abs(z - CZ) <= 1; if (inner) set(x, z, '+', 2); else wallAt(x, z, 'N'); }
L.door(CX, CZ - 2, { key: 'brass' }); L.ht[CZ - 2][CX] = 2;

// ---- the islet and its hut (the secret) -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const IX = 26, IZ = 50;
for (let z = IZ - 4; z <= IZ + 4; z++) for (let x = IX - 5; x <= IX + 5; x++) if (Math.hypot((x - IX) / 5.2, (z - IZ) / 4.2) <= 1) set(x, z, 'h', 5);
for (let z = IZ - 4; z <= IZ - 1; z++) for (let x = IX - 2; x <= IX + 2; x++) { if (z === IZ - 4 || x === IX - 2 || x === IX + 2) wallAt(x, z, 'O'); else set(x, z, '+', 5); }          // the hut: a 3-wide, 2-deep room, its mouth to the south
L.g[IZ - 1][IX] = 'S'; L.ht[IZ - 1][IX] = 5;                                                                                           // the loose panel in the hut's south wall...
for (const x of [IX - 1, IX + 1]) set(x, IZ - 1, 'O', 5);
set(IX, IZ - 2, '+', 5); set(IX - 1, IZ - 2, '+', 5); set(IX + 1, IZ - 2, '+', 5); set(IX, IZ - 3, '+', 5); set(IX - 1, IZ - 3, '+', 5); set(IX + 1, IZ - 3, '+', 5);

// ---- the vents: plate (at) -> landing (to), seconds in the air ---------------------------------------------------------------------------------------------------------------------------------------------------------
const VENTS = [
  { at: [35, 14], to: [43, 14], time: 2.2 },               // the break in the needle: the lesson
  { at: [63, 14], to: [73, 33], time: 5 },                 // the bow to the gimbal's outer ring
  { at: [80, 45], to: [69, 57], time: 4.5 },               // the gimbal's outer ring to the cup's rim
  { at: [45, 64], to: [30, 52], time: 6 },                 // the cup's west rim to the islet
  { at: [24, 52], to: [47, 66], time: 6 },                 // and back
];
for (const v of VENTS) for (const [x, z] of [v.at]) { /* plates are plain floor cells: the view draws them */ }

// ---- map edge: a wall all round -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (let x = 0; x < W; x++) { L.g[0][x] = 'O'; L.g[H - 1][x] = 'O'; } for (let z = 0; z < H; z++) { L.g[z][0] = 'O'; L.g[z][W - 1] = 'O'; }
// the cup's dome is a tall one (7 m): the lower deck of a hull the size of a hall
for (let z = CZ - 9; z <= CZ + 9; z++) for (let x = CX - 9; x <= CX + 9; x++) if ((L.g[z][x] === '+' || L.g[z][x] === 'D') && Math.hypot(x + 0.5 - CX, z + 0.5 - CZ) <= 8.2 && !(Math.abs(x - CX) <= 2 && Math.abs(z - CZ) <= 2)) L.ce[z][x] = 'g';      // 16 units = an 8 m lid

// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const ents = [], used = new Set();
const put = (type, kind, x, z, extra = {}) => { const k = x + ',' + z; if (!isFloor(x, z) || used.has(k)) { console.log('C1E4M02: no cell for', kind, 'at', x, z, L.g[z]?.[x]); return null; } used.add(k); ents.push({ type, kind, at: [x, z], ...extra }); return [x, z]; };
const E = (kind, x, z, extra = {}) => put('enemy', kind, x, z, extra), P = (kind, x, z) => put('pickup', kind, x, z), PR = (kind, x, z, extra = {}) => put('prop', kind, x, z, extra);
for (const v of VENTS) { used.add(v.at.join(',')); used.add(v.to.join(',')); }
const START = [10, 12]; used.add(START.join(',')); L.put(START[0], START[1], '@');
// A, the tail hall
E('tollbearer', 14, 11); E('tollbearer', 21, 17); E('gaunt', 17, 11); E('gaunt', 24, 16); E('gaunt', 29, 12); E('gaunt', 31, 17);
P('health_small', 13, 16); P('health_large', 27, 17); P('health_small', 33, 13);
for (const [x, z] of [[10, 14], [16, 18], [24, 10], [31, 12], [20, 12]]) PR('lamp', x, z);
// A, the nose hall (the supply station at its west door: kept) and the bow
E('gaunt', 47, 11); E('gaunt', 52, 17); E('tollbearer', 50, 12); E('tollbearer', 55, 16);
for (const [k, x, z] of [['ammo_flare', 45, 11], ['ammo_shell', 45, 17], ['ammo_rivet', 46, 14]]) P(k, x, z);
P('health_small', 57, 12); P('health_large', 58, 16);
for (const [x, z] of [[47, 14], [53, 11], [56, 17]]) PR('lamp', x, z);
E('chorister', 61, 10); E('chorister', 61, 18); E('gill', 60, 13);
for (const [x, z] of [[60, 12], [60, 16], [62, 11], [62, 17]]) PR('crate2', x, z);
// B, the gimbal
E('tollbearer', 88, 17); E('tollbearer', 103, 32); E('tollbearer', 88, 47); E('gill', 74, 27); E('gill', 102, 35); E('gaunt', 88, 22); E('gaunt', 78, 32); E('gaunt', 98, 32);
E('bellhand', 88, 29); E('sexton', 86, 35); P('key_brass', 88, 32); P('armor_vest', 90, 30); P('health_large', 85, 31);
for (const [x, z] of [[88, 26], [88, 38], [82, 32], [94, 32]]) PR('lamp', x, z);
P('health_small', 73, 31); P('health_small', 102, 29); P('health_small', 90, 46);
for (const [x, z] of [[89, 18], [102, 30], [89, 46], [74, 35]]) PR('crate2', x, z);
// C, the cup
E('chorister', 62, 52); E('chorister', 50, 57); E('chorister', 64, 74); E('gill', 68, 60); E('gill', 49, 70);
E('gaunt', 58, 58); E('gaunt', 53, 68); E('gaunt', 62, 69); E('tollbearer', 52, 63); E('tollbearer', 65, 64); E('bellhand', 63, 62);
P('health_large', 56, 59); P('health_small', 68, 58); P('health_small', 47, 62);
for (const [x, z] of [[58, 57], [58, 71], [52, 64], [64, 66]]) PR('lamp', x, z);
for (const [x, z] of [[60, 53], [53, 54], [66, 70], [51, 72], [46, 68]]) PR('pillar', x, z);
// the islet's cache
for (const [k, x, z] of [['armor_vest', 25, 47], ['ammo_shell', 27, 47], ['ammo_rivet', 25, 48], ['health_large', 27, 48], ['ammo_flare', 26, 47]]) P(k, x, z);
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [51,13], radius: 2, cells: ENC.around([51,13], { n: 3, min: 6, max: 10 }), kind: 'g' });
ENC.dropIn({ at: [88,31], radius: 2, cells: ENC.around([88,31], { n: 3, min: 6, max: 10 }), kind: 'g' });
// ---- end PT-052 ----

const MAP = {
  id: 'C1E4M02', name: 'Wreck Belt', version: 1, par: { time: 480 },
  atmosphere: { fog: '#0c1618', fogDensity: 0.005, sky: 'orbit', look: 'wreck' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  keyLabels: { brass: 'The fuse' },
  intro: { title: 'WRECK BELT', lines: ['Other worlds had ships. Here they are.', 'The only roads are the vents.'] },
  outro: 'The lock cycles. Behind you the wrecks turn slowly in the dark, three of forty-one.',
  objective: 'Cross the wrecks by the vents. The exit lock is in the cup, and it wants the fuse from the gimbal',
  ...L.layers(),
  secrets: [{ id: 'islet-hut', panel: [IX, IZ - 1], cells: [[IX - 1, IZ - 2], [IX, IZ - 2], [IX + 1, IZ - 2], [IX - 1, IZ - 3], [IX, IZ - 3], [IX + 1, IZ - 3]] }],
  vents: VENTS,
  entities: [...ents, { type: 'exit', at: [CX, CZ], dest: 'next' }],
  messages: [
    { id: 'start', at: START, radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Wreck Belt: wrecks of earlier invasions. Step on a lit plate and it throws you across the gap. Steer a little, shoot as you go. If you miss, the sky puts you back.' },
    { id: 'break', at: [31, 14], radius: 3, speaker: 'INES', text: 'Six cells of nothing. The plate is at the end of the deck. If this is wrong it costs fifteen.' },
    { id: 'bow', at: [58, 14], radius: 3, speaker: 'HULL', text: 'The bow. Singers across the gap, a flyer over it. The plate throws you to the gimbal. You have time to shoot on the way.' },
    { id: 'gimbal', at: [74, 33], radius: 3, speaker: 'INES', text: 'Rings inside rings. Everything here is a different world. The hub has the fuse, and so does whatever guards it.' },
    { id: 'fuse', at: [88, 32], radius: 2, speaker: 'HULL', text: 'The fuse. The exit lock in the cup wants it.' },
    { id: 'cup', at: [69, 56], radius: 3, speaker: 'SIGNAL HOUSE', text: 'The cup. The lock is at the keel, in the middle, inside the dome. Singers on the rim.' },
    { id: 'islet', at: [30, 52], radius: 3, speaker: 'INES', text: 'An islet. A hut. Someone hid this on purpose.' },
    { id: 'panel', at: [IX, IZ + 1], radius: 2, speaker: 'HULL', text: 'The panel in the hut wall rings hollow.' },
  ],
  triggers: [
    { id: 'gimbal', when: 'enter', at: [80, 33], radius: 3, do: [{ objective: 'The gimbal: the fuse is in the hub, the middle of the rings' }] },
    { id: 'cup', when: 'enter', at: [69, 56], radius: 3, do: [{ objective: 'The cup: the exit lock is at its keel. It wants the fuse' }] },
  ],
  quality: { enemies: [14, 70], botSeconds: [60, 900], mechanics: ['heights', 'triggers', 'keys>=1'], skins: 5, enemyKinds: { gaunt: 5, tollbearer: 5, chorister: 3, gill: 3, bellhand: 1, sexton: 1 },
    scaleClass: 'MIXED', introduces: 'launch vents: a lit plate throws you along a slow low-gravity arc to the next deck; you steer a little and shoot as you go; the sky between the wrecks sets you back for 15' },
};
MAP.drops = { scale: 1, keep: [[44, 10, 47, 18]] };
console.log('C1E4M02: enemies', ents.filter((e) => e.type === 'enemy').length);
// ---- PT-056 (R9, ammunition loads): the first penetrators: rivets, bolts and rounds with a hardened tip, off the road in the wreck belt ----
MAP.entities ??= [];
MAP.entities.push(...[["ld_pen_rivet",75,37],["ld_pen_harpoon",75,42],["ld_pen_carbine",67,54]].map(([kind, x, z]) => ({ type: 'pickup', kind, at: [x, z] })));
// ---- end PT-056 ----
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C1E4M02', lane: [...(laneOf('C1E4M02') ?? [])], keep: [], plan: [{"from":"gaunt","to":"tollbearer","pick":"spread","n":1}] };
ENC.apply(MAP);

export default MAP;
export { L, VENTS };
