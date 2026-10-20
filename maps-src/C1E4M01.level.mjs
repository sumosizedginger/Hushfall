// C1E4M01 ASCENT TETHER: the last of the world. A space-elevator tether climbed on its own service road: a solid CABLE (a column of lattice, rising out of sight) with a spiral road wound round it, two full turns, six cells wide,
// two cells of open sky between the turns, narrowing as it climbs (a ziggurat: the outer turn is the lowest). The road is a SNAIL: every cell is a function of its angle and radius round the cable (the sim is 2.5D: one floor per cell,
// so the road cannot pass over itself: each turn lies inside the last). It climbs 12 m in four ramps; between the ramps it is flat, and the flat stretches are the fights. Three TUBES (pressure galleries: walled both sides, a 4 m lid) alternate with
// two OPEN stretches (the deck of the road with the void on both sides, a hard white sun). The new thing: FALLING LOADS (src/engine/loads.js): freight dropped down the tether on a clock, a lit rect and a shadow on the deck for 1.5 s,
// then 30 damage to whoever stands there (and a walker crushed): you read the shadows. Route: the anchor deck (a round hall in the south-west corner) -> tube 1 (cabin 1) -> open 1 (the first load, alone, on a long clock) ->
// tube 2 (cabin 2, the ramp) -> open 2 (three loads out of step across the road, and the FREIGHT BAY cut into the cable: containers, the car-call switch) -> tube 3 (cabin 3, the last ramp) -> the car (a round cab inside the cable).
// Scale class MIXED (about half of it is roofed: the tubes, the cabins, the deck). Look: tether (hard white sun, rust and frost, the black behind it). The sky is orbit: stars over the limb of the world, and below the road the world itself.
import { Level, hchar } from '../tools/mapkit/builder.mjs';

const W = 72, H = 72, CX = 36, CZ = 36, TAU = Math.PI * 2;
const R0 = 27, PITCH = 8, HW = 2.9, CORE = 6, PHI0 = (135 * Math.PI) / 180;                      // the road: centre radius 27 at the foot, 11 at the top, 8 cells between turns (6 of road, 2 of sky)
const rc = (th) => R0 - (PITCH * th) / TAU;                                                       // the road's centre radius at angle th (0 .. 4 pi)
const sOf = (th) => R0 * th - (PITCH * th * th) / (2 * TAU);                                      // arc length from the foot
const thOf = (s) => (R0 - Math.sqrt(R0 * R0 - ((2 * PITCH) / TAU) * s)) / (PITCH / TAU);         // and back
const S_END = sOf(2 * TAU);
const pt = (s, off = 0) => { const th = thOf(s), r = rc(th) + off, a = PHI0 + th; return [CX + r * Math.cos(a), CZ + r * Math.sin(a)]; };
const cell = (s, off = 0) => { const [x, z] = pt(s, off); return [Math.floor(x), Math.floor(z)]; };

// the climb: [start of the ramp (s), the height it reaches (0.5 m units)]; a ramp rises one unit in 1.6 cells (a 0.5 m step is passable, and the inner edge of a turn is a shorter way round than the outer)
const RAMPS = [[40, 6], [130, 12], [196, 18], [214, 24]];
const hU = (s) => { let h = 0, base = 0; for (const [a, t] of RAMPS) { if (s < a) break; h = base + Math.min(t - base, (s - a) / 1.6); base = t; } return Math.round(h); };
// the stretches (s): tubes are walled and roofed, the rest is open to the sky
const TUBES = [[6, 52], [100, 146], [192, S_END + 1]];
const inTube = (s) => TUBES.some(([a, b]) => s >= a && s < b);
const CABINS = [{ s: 24, door: 4.1 }, { s: 120, door: 4.1 }, { s: 226, door: 4.1 }];            // round rooms on the road (radius 3.5), a door each way
const BAY = [168, 188];                                                                            // the freight bay: cut into the cable's collar at the top of the second open stretch
const FLATTEN = new Map();                                                                         // cell -> height unit, where a room overrides the road's slope

const L = new Level(W, H, { fill: 'N' });
const info = new Map();                                                                            // 'x,z' -> { s, d, th } for road cells
const cls = (x, z) => {
  const px = x + 0.5 - CX, pz = z + 0.5 - CZ, r = Math.hypot(px, pz), tb = (((Math.atan2(pz, px) - PHI0) % TAU) + TAU) % TAU;
  const d0 = r - rc(tb), d1 = r - rc(tb + TAU);
  if (Math.abs(d0) <= HW) return { k: 'road', th: tb, d: d0 };
  if (Math.abs(d1) <= HW) return { k: 'road', th: tb + TAU, d: d1 };
  if (d1 < -HW) return { k: 'collar', d1 };
  if (d0 > HW) return { k: 'out' };
  return { k: 'gap', d0, d1 };
};

// ---- the road, the sky between the turns, the collar round the cable ---------------------------------------------------------------------------------------------------------------------------------------------
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
  const c = cls(x, z), r = Math.hypot(x + 0.5 - CX, z + 0.5 - CZ);
  if (c.k === 'road' && r > CORE) {
    const s = sOf(c.th); info.set(x + ',' + z, { s, d: c.d, th: c.th });
    if (inTube(s) && Math.abs(c.d) > 2.0) { L.g[z][x] = 'O'; continue; }                       // a tube's walls
    L.g[z][x] = inTube(s) ? 'a' : 'd'; L.ht[z][x] = hU(s);
  } else if (c.k === 'gap' && r > CORE) L.g[z][x] = '_';
}
L.usedHeights = true; L.usedCeil = true;

const at = (s, off = 0, a = 0) => { const [x, z] = pt(s + a, off); return [Math.floor(x), Math.floor(z)]; };
// ---- the cabins: round rooms (radius 3.5) on the flat of the road, a ring of wall, a door at each end of the road through them ------------------------------------------------------------------------------------
for (const cb of CABINS) {
  const [px, pz] = pt(cb.s), h = hU(cb.s), gates = [pt(cb.s - cb.door), pt(cb.s + cb.door)];          // the two openings of the ring, on the road's centre line (no doors: a curved wall has no straight line to hang one in)
  for (let z = Math.floor(pz - 6); z <= Math.ceil(pz + 6); z++) for (let x = Math.floor(px - 6); x <= Math.ceil(px + 6); x++) {
    const d = Math.hypot(x + 0.5 - px, z + 0.5 - pz);
    if (d <= 3.5) { L.g[z][x] = 'g'; L.ht[z][x] = h; FLATTEN.set(x + ',' + z, h); }
    else if (d <= 4.7) { if (gates.some(([gx, gz]) => Math.hypot(x + 0.5 - gx, z + 0.5 - gz) <= 1.8)) { L.g[z][x] = 'a'; L.ht[z][x] = h; FLATTEN.set(x + ',' + z, h); } else L.g[z][x] = 'O'; }
  }
}
// ---- the freight bay: a room cut into the cable's collar off the road, at the road's height; containers, the switch -------------------------------------------------------------------------------------------------------
const bayCells = [];
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
  const c = cls(x, z); if (c.k !== 'collar' && !(c.k === 'road' && c.d < -2.0 && info.has(x + ',' + z))) continue;
  const s = info.get(x + ',' + z)?.s ?? null;
  if (c.k === 'collar') { const th = (((Math.atan2(z + 0.5 - CZ, x + 0.5 - CX) - PHI0) % TAU) + TAU) % TAU + TAU; const sc = sOf(th); const dd = c.d1; if (sc >= BAY[0] && sc <= BAY[1] && dd > -6.6 && dd < -HW) { L.g[z][x] = 'd'; L.ht[z][x] = hU(sc); bayCells.push([x, z]); } }
}

// ---- the secret: a round chamber inside the cable, behind a loose panel in the freight bay's wall ----------------------------------------------------------------------------------------------------------------------------
let SECRET = null;
{ const solid = (x, z) => L.g[z]?.[x] === 'N';
  for (const [bx, bz] of [...bayCells].sort((p, q) => Math.hypot(p[0] - CX, p[1] - CZ) - Math.hypot(q[0] - CX, q[1] - CZ))) {
    for (const [dx, dz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const px = bx + dx, pz = bz + dz, cx = bx + 4 * dx, cz = bz + 4 * dz;
      if (!solid(px, pz) || !solid(px + dz, pz + dx) || !solid(px - dz, pz - dx)) continue;                                           // the panel sits in a straight wall line
      let ok = true; for (let z = cz - 4; z <= cz + 4 && ok; z++) for (let x = cx - 4; x <= cx + 4 && ok; x++) if (Math.hypot(x + 0.5 - cx - 0.5, z + 0.5 - cz - 0.5) <= 3.6 && !solid(x, z)) ok = false;
      if (!ok || Math.hypot(cx + 0.5 - CX, cz + 0.5 - CZ) < 8) continue;
      const cells = []; const h = L.ht[bz][bx];
      for (let z = cz - 4; z <= cz + 4; z++) for (let x = cx - 4; x <= cx + 4; x++) if (Math.hypot(x - cx, z - cz) <= 2.3) { L.g[z][x] = 'a'; L.ht[z][x] = h; cells.push([x, z]); }
      for (let k = 2; k <= 3; k++) { const x = bx + k * dx, z = bz + k * dz; if (L.g[z][x] === 'N') { L.g[z][x] = 'a'; L.ht[z][x] = h; cells.push([x, z]); } }
      L.g[pz][px] = 'S'; L.ht[pz][px] = h; SECRET = { panel: [px, pz], cells, centre: [cx, cz], h, front: [bx, bz] }; break;
    }
    if (SECRET) break;
  }
}

// ---- the anchor deck: a round hall in the south-west corner, glass over it, the cable's foot in sight; the road starts at its north-east door ---------------------------------------------------------------------------
const [sx, sz] = pt(0), DECK = [Math.round(sx - 7), Math.round(sz + 9)];
{ const R = 6.5; for (let z = DECK[1] - 9; z <= DECK[1] + 9; z++) for (let x = DECK[0] - 9; x <= DECK[0] + 9; x++) { if (x < 1 || z < 1 || x > W - 2 || z > H - 2) continue; const d = Math.hypot(x + 0.5 - DECK[0], z + 0.5 - DECK[1]); if (d <= R) { L.g[z][x] = 'a'; L.ht[z][x] = 0; } else if (d <= R + 1.4 && L.g[z][x] === 'N') L.g[z][x] = 'N'; } }
{ // the deck door: a short passage from the deck to the foot of the road
  const [ex, ez] = at(2), [fx, fz] = at(0.5);
  const n = Math.max(Math.abs(ex - DECK[0]), Math.abs(ez - DECK[1]));
  for (let i = 0; i <= n; i++) { const x = Math.round(DECK[0] + (ex - DECK[0]) * i / n), z = Math.round(DECK[1] + (ez - DECK[1]) * i / n); for (const [ox, oz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const xx = x + ox, zz = z + oz; if (L.g[zz][xx] === 'N' || L.g[zz][xx] === '_') { L.g[zz][xx] = 'a'; L.ht[zz][xx] = 0; } } }
}

// ---- the car: a round cab inside the cable, a door to the end of the road through the collar ------------------------------------------------------------------------------------------------------------------------------
const topH = hU(S_END);
{ for (let z = CZ - 5; z <= CZ + 4; z++) for (let x = CX - 5; x <= CX + 4; x++) { const d = Math.hypot(x + 0.5 - CX, z + 0.5 - CZ); if (d <= 3.4) { L.g[z][x] = 'a'; L.ht[z][x] = topH; FLATTEN.set(x + ',' + z, topH); } } }
{ // from the end of the road a straight service passage (two wide) east, then north into the cab
  const [ex, ez] = cell(S_END - 2, -1.5), carve = (x, z) => { if (L.g[z][x] === 'N' || L.g[z][x] === 'O' || L.g[z][x] === '_') { L.g[z][x] = 'a'; L.ht[z][x] = topH; FLATTEN.set(x + ',' + z, topH); } };
  for (let x = Math.min(ex, CX - 1); x <= Math.max(ex, CX); x++) { carve(x, ez); carve(x, ez - 1); }
  for (let z = Math.min(ez, CZ + 3); z <= Math.max(ez, CZ + 3); z++) { carve(CX - 1, z); carve(CX, z); }
}

// ---- ceilings: every roofed cell is given its lid (the map's ceilingHeight is the cable's, 30 m: walls beside open air rise that far) ------------------------------------------------------------------------------
const isRoofed = (c) => c === 'a' || c === 'g' || c === 'D' || c === 'S';
for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
  if (!isRoofed(L.g[z][x])) continue;
  const h = L.ht[z][x], inDeck = Math.hypot(x + 0.5 - DECK[0], z + 0.5 - DECK[1]) <= 6.6, inCab = FLATTEN.has(x + ',' + z) && Math.hypot(x + 0.5 - CX, z + 0.5 - CZ) > 4;
  L.ce[z][x] = hchar(h + (inDeck ? 18 : inCab ? 9 : 8));
}
const car = hchar(topH + 9); for (let z = CZ - 5; z <= CZ + 4; z++) for (let x = CX - 5; x <= CX + 4; x++) if (isRoofed(L.g[z][x]) && Math.hypot(x + 0.5 - CX, z + 0.5 - CZ) <= 4.2) L.ce[z][x] = car;

// ---- objects ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const ents = [], used = new Set(), zones = [];
const isFloor = (x, z) => { const c = L.g[z]?.[x]; return c === 'a' || c === 'd' || c === 'g'; };
const inZone = (x, z) => zones.some((r) => x >= r[0] && z >= r[1] && x <= r[2] && z <= r[3]);
const spot = (s0, off = 0, a = 0) => { const [x0, z0] = at(s0, off, a); for (let r = 0; r <= 2; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const x = x0 + dx, z = z0 + dz, k = x + ',' + z; if (isFloor(x, z) && !used.has(k) && !inZone(x, z)) return [x, z]; } return null; };
const put = (type, kind, s0, off = 0, extra = {}) => { const p = spot(s0, off); if (!p) { console.log('C1E4M01: no cell for', kind, 'at s', s0); return null; } used.add(p.join(',')); ents.push({ type, kind, at: p, ...extra }); return p; };
const deckSpot = (dx, dz) => { for (let r = 0; r < 3; r++) for (const [ox, oz] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) { const x = DECK[0] + dx + ox * r, z = DECK[1] + dz + oz * r; if (isFloor(x, z) && !used.has(x + ',' + z)) return [x, z]; } return null; };
const rectAround = (s0) => { const [x, z] = at(s0); return [x - 3, z - 3, x + 2, z + 2]; };
// the loads first: nothing is put where one lands
const LOADS = [{ rect: rectAround(72), period: 14, phase: 0 }, { rect: rectAround(158), period: 8, phase: 0 }, { rect: rectAround(166), period: 8, phase: 4 }, { rect: rectAround(182), period: 10, phase: 3 }];
for (const l of LOADS) zones.push(l.rect);

if (SECRET) for (const [ox, oz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) used.add((SECRET.front[0] + ox) + ',' + (SECRET.front[1] + oz));      // nothing stands in front of the panel
const start = deckSpot(0, 0); L.put(start[0], start[1], '@'); used.add(start.join(','));
// the deck: the porters asleep on their benches
for (const [dx, dz] of [[-3, -3], [3, -2], [-2, 3]]) { const p = deckSpot(dx, dz); if (p) { used.add(p.join(',')); ents.push({ type: 'enemy', kind: 'tollbearer', at: p }); } }
const E = (kind, s0, off = 0) => put('enemy', kind, s0, off);
// tube 1 and cabin 1
E('gaunt', 15, -1); E('tollbearer', 18, 1); E('sexton', 24, 1); E('tollbearer', 25, -1); E('gaunt', 33, 0); E('gaunt', 38, 1);
// open stretch 1: the first load alone on the long clock
E('tollbearer', 56, -1); E('bellhand', 84, 1); E('gaunt', 62, 1); E('chorister', 80, -2); E('gaunt', 88, 0); E('gill', 94, 1);
// tube 2 and cabin 2
E('chorister', 112, 1); E('gaunt', 104, 0); E('tollbearer', 109, -1); E('bellhand', 120, 0); E('gill', 121, 1); E('gaunt', 138, 0);
// open stretch 2, the loads and the freight bay
E('tollbearer', 150, -1); E('bellhand', 152, 1); E('chorister', 154, -2); E('bellhand', 176, 0); E('tollbearer', 172, -1); E('gill', 185, 1); E('chorister', 178, -2); E('gaunt', 188, 0); E('gaunt', 191, 1);
// tube 3 and cabin 3
E('gaunt', 198, 0); E('tollbearer', 206, -1); E('gaunt', 211, 1); E('tollbearer', 226, 1); E('chorister', 227, -1); E('gill', 232, 0);
// health and armour on the road, ammunition kept in cabin 1 and cabin 3 (see MAP.drops)
const P = (kind, s0, off = 0) => put('pickup', kind, s0, off);
P('health_small', 8, 1); P('health_small', 44, 0); P('health_small', 66, 1); P('health_large', 96, 0); P('health_small', 112, 1); P('health_large', 142, 0); P('health_small', 156, 1); P('armor_vest', 187, -1); P('health_small', 200, 0); P('health_small', 218, 1); P('health_large', 233, 0);
const c1 = at(24), c3 = at(226);
const box = (c, k, dx, dz) => { const p = [c[0] + dx, c[1] + dz]; if (isFloor(...p) && !used.has(p.join(','))) { used.add(p.join(',')); ents.push({ type: 'pickup', kind: k, at: p }); } };
for (const [k, dx, dz] of [['ammo_flare', -2, -1], ['ammo_shell', 2, -2], ['ammo_rivet', -2, 2], ['ammo_flare', 2, 2]]) box(c1, k, dx, dz);
for (const [k, dx, dz] of [['ammo_shell', -2, -1], ['ammo_rivet', 2, -2], ['ammo_flare', 0, 2]]) box(c3, k, dx, dz);
// lamps in the tubes, the cabins and the deck (a lamp hangs from a lid: only under a roof); crates for cover on the open road and in the bay
for (const s0 of [10, 20, 30, 46, 104, 114, 126, 138, 196, 204, 214, 222, 234]) { const p = spot(s0, 1.5); if (p && L.ce[p[1]][p[0]] !== '.') { used.add(p.join(',')); ents.push({ type: 'prop', kind: 'lamp', at: p }); } }
for (const [dx, dz] of [[-4, -4], [4, -4], [-5, 2], [5, 3], [0, 5]]) { const p = deckSpot(dx, dz); if (p) { used.add(p.join(',')); ents.push({ type: 'prop', kind: 'lamp', at: p }); } }
for (const [s0, off] of [[66, 1.5], [68, -1.5], [76, 1], [90, -1.5], [150, 0.5], [162, 1.5], [174, 2], [186, -1.5]]) put('prop', 'crate2', s0, off);
const bayFloor = bayCells.filter(([x, z]) => isFloor(x, z) && !used.has(x + ',' + z));
bayFloor.forEach(([x, z], i) => { if (i % 5 === 1) { used.add(x + ',' + z); ents.push({ type: 'prop', kind: (x + z) % 2 === 0 ? 'crate2' : 'crate', at: [x, z] }); } });
// the car-call switch: on the wall of the freight bay
let swAt = null, swWall = 'north';
for (const [x, z] of bayFloor) { for (const [w, dx, dz] of [['north', 0, -1], ['south', 0, 1], ['west', -1, 0], ['east', 1, 0]]) { if (L.g[z + dz]?.[x + dx] === 'N' && !used.has(x + ',' + z)) { swAt = [x, z]; swWall = w; break; } } if (swAt) break; }
if (SECRET) { const [qx, qz] = SECRET.centre; for (const [k, dx, dz] of [['ammo_shell', -1, -1], ['ammo_rivet', 1, -1], ['ammo_flare', 0, 1], ['health_large', 1, 1], ['armor_vest', -1, 1]]) { const p = [qx + dx, qz + dz]; if (isFloor(...p) && !used.has(p.join(','))) { used.add(p.join(',')); ents.push({ type: 'pickup', kind: k, at: p }); } } }
const exitCell = [CX - 1, CZ - 1];
const MAP = {
  id: 'C1E4M01', name: 'Ascent Tether', version: 1, ceilingHeight: 30, par: { time: 480 },
  atmosphere: { fog: '#161c28', fogDensity: 0.004, sky: 'orbit', look: 'tether' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'ASCENT TETHER', lines: ['The last of the world is the foot of this cable.', 'The only way up is the road round it.'] },
  outro: 'The car climbs. The world becomes a curve, then a bright coin, then a thing you can hold in one hand.',
  objective: 'Climb the tether. The car is at the top of the road, inside the cable',
  ...L.layers(),
  secrets: SECRET ? [{ id: 'cable-hatch', panel: SECRET.panel, cells: SECRET.cells }] : [],
  loads: LOADS,
  entities: [...ents, { type: 'exit', at: exitCell, locked: true, dest: 'next' }, ...(swAt ? [{ type: 'switch', id: 'car-call', at: swAt, wall: swWall, do: [{ exit: { set: 'unlock' } }, { objective: 'The car is called. Up the last of the road, into the cable' }, { shake: 1 }, { message: 'called' }] }] : [])],
  messages: [
    { id: 'start', at: start, radius: 3, speaker: 'SIGNAL HOUSE', text: 'The Vael freight goes up this cable, Calder, and the call went up with it. One road, round and round it. Nothing on it moves slowly except the loads.' },
    { id: 'loads', at: at(60), radius: 3, speaker: 'HULL', text: 'Orange on the deck, a shadow growing: that is where the next load lands. Thirty if it catches you. It will not catch anything that stays out of the light.' },
    { id: 'crush', at: at(140), radius: 3, speaker: 'INES', text: 'They crush what they land on. All of it. Stand them under one.' },
    { id: 'bay', at: at(166), radius: 3, speaker: 'SIGNAL HOUSE', text: 'The freight bay. The car-call switch is on the wall. You will have to stand still for a moment to throw it.' },
    { id: 'called', at: exitCell, radius: 0.1, speaker: 'HULL', text: 'The car is called.' },
    ...(SECRET ? [{ id: 'panel', at: [SECRET.panel[0], SECRET.panel[1]], radius: 3, speaker: 'HULL', text: 'The panel in the bay wall rings hollow.' }] : []),
    { id: 'top', at: at(S_END - 6), radius: 3, speaker: 'INES', text: 'It goes into the cable. Of course it does.' },
  ],
  triggers: [
    { id: 'first-load', when: 'enter', at: at(60), radius: 3, do: [{ objective: 'Falling freight: stay out of the lit patch until it has landed' }] },
    { id: 'bay', when: 'enter', at: at(166), radius: 3, do: [{ objective: 'The freight bay: throw the car-call switch on its wall' }] },
  ],
  quality: { enemies: [14, 70], botSeconds: [60, 900], mechanics: ['heights', 'triggers', 'switches'], skins: 5, enemyKinds: { tollbearer: 6, gaunt: 5, chorister: 3, bellhand: 1, sexton: 1 },
    scaleClass: 'MIXED', tallReason: 'the cable rises out of sight: walls beside the open road are 30 m so that it does',
    introduces: 'falling loads: freight dropped down the tether on a clock, a lit patch and a shadow for 1.5 seconds, then 30 damage and a crushed walker' },
};
MAP.drops = { scale: 1, keep: [[c1[0] - 4, c1[1] - 4, c1[0] + 4, c1[1] + 4], [c3[0] - 4, c3[1] - 4, c3[0] + 4, c3[1] + 4]] };
console.log('C1E4M01: road', Math.round(S_END), 'cells, enemies', ents.filter((e) => e.type === 'enemy').length, 'bay', bayCells.length, 'switch', swAt, swWall);
export default MAP;
export { L, at, hU, S_END };
