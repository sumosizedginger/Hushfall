// C1E4M07 THE HOLLOW STAIR: the episode's one SET-PIECE. A drum of dark stone, sixty cells across, round a SHAFT of light: the hollow is open sky, its floor a white ring of light far below (the Gate's own sky seen from underneath).
// Round the shaft climbs a stair of four LANDINGS (each a wide terrace of about fifty degrees of arc, a fight in the open) joined by four RAMPS, and every landing steps IN as it rises, so the drum narrows like a ziggurat: L1 at 4 m (south-west), L2 at 8 m
// (north-west), L3 at 12 m (north-east), L4 at 16 m (south-east), the foot of the stair at the south. The sim is 2.5D (one floor to a cell), so the whole stair is a function of the angle round the shaft: each sector is a landing or a ramp and no cell is used twice.
// Every landing has a LEVER set in the drum wall; the exit, in the wall behind L4, opens only when all four are thrown (a list of conditions in one trigger: msg:lever-1 .. lever-4). Four VENTS across the hollow (L1 -> L3, L2 -> L4 and the two
// ways back) are the shortcut and the flank: a bold player can fly over a landing, but the levers still have to be thrown. A loose panel in the drum wall at the north ramp is the secret. Look: stair (deep indigo, the white coming up the shaft).
// Scale class SET-PIECE (no lid anywhere: the whole of it is open to the sky). Fights: L1 the swarm, L2 the crossfire (singers on the far landings), L3 the shell and the ward, L4 the Mother and a Warden, the Gate's light at your back.
import { Level, hchar } from '../tools/mapkit/builder.mjs';

const W = 66, H = 66, CX = 33, CZ = 33, DRUM = 31;
const L = new Level(W, H, { fill: '1' });
L.usedHeights = true;
const RAD = Math.PI / 180;

// the stair as a list of sectors, in the order you climb them: [name, from degrees, to degrees, from height unit, to height unit, inner radius, outer radius]; 0 = east, 90 = south (clockwise on the plan)
const BAND = { l1: [15.5, 29.5], l2: [14.5, 27.5], l3: [13.5, 25.5], l4: [12.5, 23.5] };
const SECT = [
  ['r0', 72, 108, 0, 8, 15.5, 29.5, 'ramp'], ['l1', 108, 162, 8, 8, ...BAND.l1, 'land'],
  ['r1', 162, 198, 8, 16, 15.5, 27.5, 'ramp'], ['l2', 198, 252, 16, 16, ...BAND.l2, 'land'],
  ['r2', 252, 288, 16, 24, 14.5, 25.5, 'ramp'], ['l3', 288, 342, 24, 24, ...BAND.l3, 'land'],
  ['r3', 342, 378, 24, 32, 13.5, 23.5, 'ramp'], ['l4', 378, 432, 32, 32, ...BAND.l4, 'land'],
];
const FOOT = 84;                                                                                    // the first twelve degrees of the first ramp are level ground: the foot of the stair
const phi = (x, z) => { let a = Math.atan2(z + 0.5 - CZ, x + 0.5 - CX) / RAD; if (a < 0) a += 360; return a; };
const rad = (x, z) => Math.hypot(x + 0.5 - CX, z + 0.5 - CZ);
const sectorOf = (x, z) => { let a = phi(x, z); if (a < 72) a += 360; return SECT.find((s) => a >= s[1] && a < s[2]) ?? null; };
const heightAt = (x, z) => { const s = sectorOf(x, z); if (!s) return 0; let a = phi(x, z); if (a < 72) a += 360; if (s[7] === 'land') return s[3]; const u = Math.max(0, (a - (s[0] === 'r0' ? FOOT : s[1])) / (s[2] - (s[0] === 'r0' ? FOOT : s[1]))); return Math.round(s[3] + (s[4] - s[3]) * u); };
const cellOf = (deg, r) => [Math.floor(CX + r * Math.cos(deg * RAD)), Math.floor(CZ + r * Math.sin(deg * RAD))];

// ---- the drum: floor in each sector's band, void inside it, solid outside it -------------------------------------------------------------------------------------------------------------------------------------------
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
  const r = rad(x, z); if (r >= DRUM) continue;
  const s = sectorOf(x, z); if (!s) continue;
  if (r < s[5]) { L.g[z][x] = '_'; continue; }
  if (r > s[6]) continue;
  L.g[z][x] = '&'; L.ht[z][x] = heightAt(x, z);
}
// the seam where L4 (16 m up) meets the foot of the stair (ground): a wall, not a cliff
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) { if (L.g[z][x] !== '&') continue; const a = phi(x, z); if (a > 70.2 && a < 73.8) { L.g[z][x] = '1'; L.ht[z][x] = 0; } }
const isFloor = (x, z) => L.g[z]?.[x] === '&';
// the foot of the stair: a little pen of ground on the south side, the way you came in
const START = cellOf(77, 22);

// ---- the exit: a straight corridor out of L4's outer wall, two cells wide, and the exit at its end (locked until the four levers) -----------------------------------------------------------------------------------
const EXZ = CZ + 11;
for (let x = 50; x <= 58; x++) for (const dz of [0, 1]) { const z = EXZ + dz; if (L.g[z][x] === '1' || L.g[z][x] === 'J') { L.g[z][x] = '&'; L.ht[z][x] = 32; } else if (L.g[z][x] === '&') { L.ht[z][x] = 32; } }
for (let x = 50; x <= 59; x++) for (const dz of [-1, 2]) { const z = EXZ + dz; if (L.g[z][x] === 'J' || L.g[z][x] === '1') L.g[z][x] = '2'; }
L.g[EXZ][59] = '2'; L.g[EXZ + 1][59] = '2';
const EXIT = [58, EXZ];

// ---- the secret: a loose panel in the drum wall at the north ramp, a chamber behind it -------------------------------------------------------------------------------------------------------------------------------------
let SECRET = null;
{ const solid = (x, z) => L.g[z]?.[x] === '1';
  const cand = []; for (let bz = 6; bz <= 14; bz++) for (let bx = 18; bx <= 48; bx++) if (isFloor(bx, bz) && sectorOf(bx, bz)?.[0] === 'r2') cand.push([bx, bz]);
  cand.sort((p, q) => Math.abs(p[0] - 33) - Math.abs(q[0] - 33) || p[1] - q[1]);
  for (const [bx, bz] of cand) {
    const px = bx, pz = bz - 1; if (!solid(px, pz) || !solid(px - 1, pz) || !solid(px + 1, pz)) continue;
    let ok = true; for (let dz = 1; dz <= 4 && ok; dz++) for (let dx = -2; dx <= 2; dx++) { const c = L.g[pz - dz]?.[px + dx]; if (c !== '1' || rad(px + dx, pz - dz) > DRUM - 0.8) ok = false; }
    if (!ok) continue;
    const cells = [], h = L.ht[bz][bx];
    for (let dz = 2; dz <= 4; dz++) for (let dx = -1; dx <= 1; dx++) { L.g[pz - dz][px + dx] = '9'; L.ht[pz - dz][px + dx] = h; cells.push([px + dx, pz - dz]); }
    L.g[pz - 1][px] = '9'; L.ht[pz - 1][px] = h; cells.push([px, pz - 1]);
    L.g[pz][px] = 'S'; L.ht[pz][px] = h; SECRET = { panel: [px, pz], cells, centre: [px, pz - 3], h, front: [bx, bz] }; break;
  }
}

// windows (after the secret, which needs plain wall): a pane of glass in the drum wall behind each landing and ramp, two cells wide, every few cells along the arc
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
  if (L.g[z][x] !== '1') continue; const r = rad(x, z), s = sectorOf(x, z); if (!s || r > s[6] + 1.6 || r < s[6]) continue;
  const a = phi(x, z); if (Math.floor(a / 6.5) % 2 === 0) L.g[z][x] = 'J';
}

// ---- ceilings: only the secret chamber and the exit corridor have a lid ---------------------------------------------------------------------------------------------------------------------------------------------------
L.usedCeil = true;
for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) { const c = L.g[z][x]; if (c === '9' || c === 'S') L.ce[z][x] = hchar(L.ht[z][x] + 8); }

// ---- objects ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const ents = [], used = new Set();
const blocked = (x, z) => !isFloor(x, z) || used.has(x + ',' + z);
const spot = (deg, r) => { const [x0, z0] = cellOf(deg, r); for (let k = 0; k <= 3; k++) for (let dz = -k; dz <= k; dz++) for (let dx = -k; dx <= k; dx++) { const x = x0 + dx, z = z0 + dz; if (!blocked(x, z) && !(Math.abs(x - START[0]) < 2 && Math.abs(z - START[1]) < 2)) return [x, z]; } return null; };
const put = (type, kind, deg, r, extra = {}) => { const p = spot(deg, r); if (!p) { console.log('C1E4M07: no cell for', kind, 'at', deg, r); return null; } used.add(p.join(',')); ents.push({ type, kind, at: p, ...extra }); return p; };
if (SECRET) for (const [ox, oz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) used.add((SECRET.front[0] + ox) + ',' + (SECRET.front[1] + oz));       // nothing stands in front of the panel
used.add(START.join(',')); L.put(START[0], START[1], '@');
const E = (kind, deg, r, extra) => put('enemy', kind, deg, r, extra);

// the vents: plate on one landing's inner edge -> landing on another's, across the hollow; the ways back too
const edgeOf = (key) => BAND[key][0] + 1.6;
const VENT_PLATES = [['l1', 138, 'l3', 318, 5.5], ['l3', 318, 'l1', 138, 5.5], ['l2', 222, 'l4', 42, 5.5], ['l4', 42, 'l2', 222, 5.5]];
const VENTS = [];
const reserve = [];
for (const [k0, a0, k1, a1, time] of VENT_PLATES) {
  const at = cellOf(a0, edgeOf(k0)), to = cellOf(a1 + (k1 === 'l1' || k1 === 'l2' ? 7 : -7), edgeOf(k1) + 2);
  VENTS.push({ at, to, time }); reserve.push(at, to);
}
for (const p of reserve) { used.add(p.join(',')); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) used.add((p[0] + dx) + ',' + (p[1] + dz)); }

// the arcade: pillars along each landing's inner edge, a gap round every vent; lampposts between them
for (const [name, a0, a1] of [['l1', 112, 158], ['l2', 202, 248], ['l3', 292, 338], ['l4', 382, 428]]) {
  const key = name, inner = BAND[key][0] + 0.5; let n = 0;
  for (let a = a0; a <= a1; a += 5.5) {
    const deg = a % 360, [x, z] = cellOf(deg, inner);
    if (blocked(x, z) || reserve.some((q) => Math.hypot(q[0] - x, q[1] - z) < 4.2)) continue;
    used.add(x + ',' + z); ents.push({ type: 'prop', kind: n++ % 3 === 2 ? 'lamppost' : 'pillar', at: [x, z] });
  }
}
// cover on the open floor of each landing
for (const [deg, r] of [[124, 22], [138, 25], [150, 21], [214, 21], [226, 24], [240, 20], [304, 20], [316, 22], [330, 18], [392, 18], [405, 21], [418, 17]]) put('prop', (deg * 7) % 3 === 0 ? 'crate2' : 'crate', deg % 360, r);

// the enemies, landing by landing
E('tollbearer', 90, 22); E('tollbearer', 98, 26); E('gaunt', 102, 19);                                                                                   // the foot and the first ramp
E('gaunt', 116, 18); E('gaunt', 124, 26); E('gaunt', 134, 20); E('gaunt', 146, 27); E('gaunt', 156, 23);                                                    // L1: the swarm
E('tollbearer', 120, 22); E('tollbearer', 129, 23); E('tollbearer', 141, 24); E('tollbearer', 152, 19); E('tollbearer', 158, 26);
E('bellhand', 178, 20);                                                                                                                                  // ramp 1
E('bellhand', 208, 21); E('sexton', 232, 24); E('gill', 244, 19);                                                                                    // L2
E('chorister', 386, 13.8); E('chorister', 400, 13.8); E('chorister', 416, 13.8);                                                                          // the crossfire: singers on the far inner edges
E('tollbearer', 262, 20); E('bellhand', 275, 18);                                                                                                      // ramp 2
E('bulwark', 318, 21); E('acolyte', 304, 17); E('gaunt', 312, 26); E('gaunt', 334, 23); E('tollbearer', 298, 24);                                          // L3: the shell and the ward
E('wardengraft', 350, 18);                                                                                                                               // ramp 3
E('weeping', 418, 23); E('gaunt', 396, 20); E('tollbearer', 404, 22);                                                                                // L4: the Mother and a Warden

// the levers, set in the drum wall behind each landing
const LEVERS = [];
{ const mids = [['l1', 135], ['l2', 225], ['l3', 315], ['l4', 405]];
  mids.forEach(([key, mid], i) => {
    let best = null;
    for (let z = 2; z < H - 2; z++) for (let x = 2; x < W - 2; x++) {
      if (!isFloor(x, z) || used.has(x + ',' + z) || sectorOf(x, z)?.[0] !== key) continue;
      for (const [w, dx, dz] of [['north', 0, -1], ['south', 0, 1], ['west', -1, 0], ['east', 1, 0]]) {
        if (L.g[z + dz]?.[x + dx] !== '1' && L.g[z + dz]?.[x + dx] !== 'J') continue;
        if (L.g[z + dz + dx]?.[x + dx + dz] === '_' || L.g[z + dz - dx]?.[x + dx - dz] === '_') continue;
        let a = phi(x, z); if (a < 72) a += 360; const d = Math.abs(a - mid) + Math.abs(rad(x, z) - (BAND[key][1] - 0.6)) * 4;
        if (!best || d < best.d) best = { d, at: [x, z], w };
      }
    }
    if (best) { used.add(best.at.join(',')); L.g[best.at[1] + ({ north: -1, south: 1, west: 0, east: 0 })[best.w]][best.at[0] + ({ west: -1, east: 1, north: 0, south: 0 })[best.w]] = '1'; LEVERS.push({ id: 'lever-' + (i + 1), at: best.at, wall: best.w }); }
    else console.log('C1E4M07: no place for the lever of', key);
  });
}

// pickups: health along the climb, ammunition and armour kept at the levers (the drops system feeds the rest)
const P = (kind, deg, r) => put('pickup', kind, deg, r);
P('health_small', 100, 24); P('health_small', 128, 17); P('health_large', 150, 24); P('health_small', 178, 24); P('health_small', 210, 24); P('health_large', 236, 18); P('armor_vest', 258, 22); P('health_small', 280, 22); P('health_small', 306, 21); P('health_large', 326, 20); P('health_small', 352, 22); P('health_large', 400, 15); P('armor_vest', 424, 20);
for (const [key, deg] of [['l1', 130], ['l2', 220], ['l3', 310], ['l4', 410]]) {
  const lv = LEVERS.find((q) => q.id === 'lever-' + (['l1', 'l2', 'l3', 'l4'].indexOf(key) + 1)); if (!lv) continue;
  for (const [k, dx, dz] of [['ammo_shell', 1, 1], ['ammo_rivet', -1, 1], ['ammo_flare', 1, -1]]) { const p = [lv.at[0] + dx, lv.at[1] + dz]; if (isFloor(...p) && !used.has(p.join(','))) { used.add(p.join(',')); ents.push({ type: 'pickup', kind: k, at: p }); } }
}
// ammunition stays on the ramps (a supply stop before each fight: see MAP.drops.keep)
const RAMP_SUPPLY = [182, 270, 358].map((deg) => cellOf(deg, 21));
RAMP_SUPPLY.forEach(([cx, cz], i) => { for (const [k, dx, dz] of [['ammo_shell', 0, 0], ['ammo_rivet', 1, 0], ['ammo_flare', 0, 1], ['ammo_rivet', 1, 1]]) { const p = [cx + dx, cz + dz]; if (isFloor(...p) && !used.has(p.join(','))) { used.add(p.join(',')); ents.push({ type: 'pickup', kind: k, at: p }); } } });
if (SECRET) { const [qx, qz] = SECRET.centre; for (const [k, dx, dz] of [['ammo_shell', -1, -1], ['ammo_rivet', 1, -1], ['ammo_flare', 0, 1], ['health_large', 1, 1], ['armor_vest', -1, 1]]) ents.push({ type: 'pickup', kind: k, at: [qx + dx, qz + dz] }); }

// ---- PT-035, the materials (the outside audits: the whole climb was one navy stone over one navy floor, so the sixteen metres read as a single colour). Now the climb passes THROUGH materials on its way to the light: the foot and the first landing are the
// dark slate and navy arches you start in; the second landing is brass organ pipes over a gold-diamond floor; the third is purple and gold loom-work; the fourth and the way out are Gate marble over the white-ringed floor. A ramp wears the material of the landing it
// climbs TO, so each change arrives before you do. Only the character of a wall or a floor changes, never its kind (every floor used is an outdoor floor, every wall a plain wall): no route, sight line or shot moves. ----
{
  const MAT = { r0: ['1', '&'], l1: ['1', 's'], r1: ['E', 'z'], l2: ['E', 'z'], r2: ['M', 'e'], l3: ['M', 'e'], r3: ['2', '<'], l4: ['2', '<'] };
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    const c = L.g[z][x], r = rad(x, z); if (r >= DRUM + 1.5) continue;
    const sct = sectorOf(x, z); if (!sct) continue;
    if (c === '&') { if (sct[0] !== 'r0') L.g[z][x] = MAT[sct[0]][1]; } else if (c === '1') L.g[z][x] = MAT[sct[0]][0];
  }
}
// ---- end PT-035 materials ----
const MAP = {
  id: 'C1E4M07', name: 'The Hollow Stair', version: 1, ceilingHeight: 40, par: { time: 600 },
  atmosphere: { fog: '#161c44', fogDensity: 0.0032, sky: 'gate', look: 'stair' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'THE HOLLOW STAIR', lines: ['The Gate is at the top. The stair goes up the inside of the world.', 'Everything that is awake is awake above you.'] },
  outro: 'The last door is behind you. The Gate is near enough to feel in the floor, and it is not quiet.',
  objective: 'Climb the Stair. A lever on every landing opens the way to the Gate',
  ...L.layers(),
  secrets: SECRET ? [{ id: 'drum-panel', panel: SECRET.panel, cells: SECRET.cells }] : [],
  vents: VENTS,
  entities: [...ents, { type: 'exit', at: EXIT, locked: true, dest: 'next' }, ...LEVERS.map((lv, i) => ({ type: 'switch', id: lv.id, at: lv.at, wall: lv.wall, once: true, do: [{ message: lv.id }, { objective: i < 3 ? `Lever ${i + 1} is thrown. Up the next ramp, to the next landing` : 'All four levers are thrown. The exit is in the wall behind this landing' }, { shake: 0.8 }] }))],
  messages: [
    { id: 'start', at: START, radius: 4, speaker: 'SIGNAL HOUSE', text: 'You will hear them long before you see them, Calder. There\'s a lever on every landing; the Gate opens for all four.' },
    { id: 'shaft', at: cellOf(100, 20), radius: 4, speaker: 'INES', text: 'It is open all the way up. The light comes from underneath. Don\'t look down for long.' },
    { id: 'vents', at: cellOf(138, 21), radius: 4, speaker: 'HULL', text: 'Those plates on the inner edges throw you across the hollow. Across, not up: you still have to come back for the lever.' },
    ...LEVERS.map((lv, i) => ({ id: lv.id, at: lv.at, radius: 0.1, speaker: i === 3 ? 'SIGNAL HOUSE' : 'HULL', text: i === 3 ? 'The last lever. Something in the wall behind the landing has started to move.' : `Lever ${i + 1} of 4.` })),
    ...(SECRET ? [{ id: 'panel', at: SECRET.panel, radius: 3, speaker: 'HULL', text: 'The panel in the drum wall rings hollow.' }] : []),
  ],
  triggers: [
    { id: 'gate-opens', when: ['msg:lever-1', 'msg:lever-2', 'msg:lever-3', 'msg:lever-4'], do: [{ exit: { set: 'unlock' } }, { objective: 'The way is open: the corridor in the wall behind the top landing' }, { shake: 1.5 }] },
  ],
  quality: { enemies: [14, 70], botSeconds: [60, 900], mechanics: ['heights', 'triggers', 'switches'], skins: 5, enemyKinds: { tollbearer: 6, gaunt: 5, chorister: 3, bellhand: 2, sexton: 1, wardengraft: 1, bulwark: 1, acolyte: 1, weeping: 1 },
    scaleClass: 'SET-PIECE', reason: 'it is the one place in the episode where the whole of the climb is seen at once, open to the sky: the player crosses sixteen metres of landings under fire from the ones above', tallReason: 'the hollow is open to the sky: the drum wall climbs out of sight so that the shaft reads as one',
    introduces: 'scale: a sixteen metre climb in the open round a shaft of light, with the next landing\'s singers across the hollow from you' },
};
MAP.drops = { scale: 1, keep: [...LEVERS.map((lv) => [lv.at[0] - 2, lv.at[1] - 2, lv.at[0] + 2, lv.at[1] + 2]), ...RAMP_SUPPLY.map(([x, z]) => [x - 2, z - 2, x + 3, z + 3])] };
console.log('C1E4M07: enemies', ents.filter((e) => e.type === 'enemy').length, 'levers', LEVERS.length, 'vents', VENTS.length, 'secret', SECRET?.panel);
export default MAP;
export { L, VENTS, START, EXIT, LEVERS, SECRET, cellOf, sectorOf };
