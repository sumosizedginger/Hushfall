// C1E4M03 COLD DOCK: the Vael staging area for the main fleet. A WHEEL: a plus-shaped hub round a solid control spine, four tapered dock bays at north, east, south and west (the tapers open from 11 to 19 cells, 24 long), four round barracks in the corners between them.
// The new thing: AIRLOCKS (a lock is two doors that refuse to be open together, and for three seconds after one shuts: src/engine/airlock.js) and VACUUM (a bay whose hull hatches are open to the dark hurts while you are in it; shutting the hatches ends it).
// South is where you arrive (pressurised, crew asleep). East is the DASH (a short vacuum bay: coupling A at the end). West is the POCKETS (a long vacuum bay with three pressurised closets in its walls: breathe, take what is in them, go on; coupling B at the end).
// Seat both couplings at the spine and the north lock opens: the PANEL (a vacuum bay all the way to a switch on its wall that shuts the hatches and opens the exit).
// Scale class COMPRESSION (all roofed; the bays are 10 m tall for the docked lighters, the spine and the lighters break the sightlines). Look: dock (sterile cyan-white strip light, hazard yellow, frost). Not built from rooms but from the figure: the plan is a wheel.
import { Level, hchar } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';
import { FLOOR_SKINS } from '../src/engine/defs.js';

const W = 92, H = 92, CX = 46, CZ = 46;
const L = new Level(W, H, { fill: 'G' }); L.usedHeights = true; L.usedCeil = true;
const BAYS = { N: { a: [0, -1], l: [1, 0] }, E: { a: [1, 0], l: [0, 1] }, S: { a: [0, 1], l: [-1, 0] }, W: { a: [-1, 0], l: [0, -1] } };
const B = (bay, d, lat = 0) => { const { a, l } = BAYS[bay]; return [CX + a[0] * d + l[0] * lat, CZ + a[1] * d + l[1] * lat]; };
const hw = (d) => 5 + Math.floor((4 * (d - 17)) / 23);                                          // the bay's half-width at depth d: 5 at the lock, 9 at the hatches
const HATCH_D = 31, BAY_END = 30;
const set = (x, z, ch, h = 4) => { L.g[z][x] = ch; L.ht[z][x] = h; };
const ceil = (x, z, u) => { L.ce[z][x] = hchar(u); };
const BAR = new Set(), POCK = new Set(), EXCH = new Set(), LOCKC = new Set();                           // PT-035: the cells of the barracks, the pockets, the exit chamber and the lock chambers (the materials pass below)

// ---- the hub: a square of floor 15 across round a solid spine; four arms (9 wide, 5 long) towards the bays; the spine's face holds the couplings' seat ----
for (let dz = -7; dz <= 7; dz++) for (let dx = -7; dx <= 7; dx++) { if (Math.abs(dx) <= 2 && Math.abs(dz) <= 2) continue; set(CX + dx, CZ + dz, 'x', 4); ceil(CX + dx, CZ + dz, 22); }
for (const bay of Object.keys(BAYS)) for (let d = 8; d <= (bay === 'N' ? 10 : 11); d++) for (let lat = -4; lat <= 4; lat++) { const [x, z] = B(bay, d, lat); set(x, z, 'x', 4); ceil(x, z, 22); }
for (const bay of ['N', 'E', 'W']) { const [x, z] = B(bay, 12, 0); set(x, z, 'x', 4); LOCKC.add(x + ',' + z); }                                  // the narrow passage into a lock
// ---- the locks (north, east, west): D1 at depth 13, the chamber at 14 and 15, D2 at 16; north has D0 at 12 (opened by the spine's switch) ----
const doorsOf = {};
for (const bay of ['N', 'E', 'W']) {
  const d1 = B(bay, 13), d2 = B(bay, 16);
  set(...B(bay, 14), 'x', 4); set(...B(bay, 15), 'x', 4); LOCKC.add(B(bay, 14).join(',')); LOCKC.add(B(bay, 15).join(','));
  L.door(d1[0], d1[1], { interlock: d2 }); L.door(d2[0], d2[1], { interlock: d1 }); L.ht[d1[1]][d1[0]] = 4; L.ht[d2[1]][d2[0]] = 4;
  doorsOf[bay] = { d1, d2 };
}
{ const [x, z] = B('N', 11); L.door(x, z, { remote: true }); L.ht[z][x] = 4; }                                      // the north lock's outer door: opened by the switch that seats the couplings
// ---- the south arm opens straight on to the arrival bay (no lock: it is pressurised) ----
for (const bay of Object.keys(BAYS)) {
  for (let d = 17; d <= BAY_END; d++) {
    const stair = d - 17, h = stair < 0 ? 4 : Math.max(0, 3 - stair + (stair === 0 ? 1 : 0)), floorH = d === 16 ? 4 : d === 17 ? 4 : d === 18 ? 3 : d === 19 ? 2 : d === 20 ? 1 : 0; void h;
    for (let lat = -hw(d); lat <= hw(d); lat++) { const [x, z] = B(bay, d, lat); set(x, z, 'x', floorH); ceil(x, z, 20); }
  }
}
for (let d = 12; d <= 15; d++) { const [x, z] = B('S', d, 0); set(x, z, 'x', 4); }                                     // the south arm's doorway: open
for (let lat = -hw(16); lat <= hw(16); lat++) { const [x, z] = B('S', 16, lat); set(x, z, 'x', 4); ceil(x, z, 20); }
// ---- the hatches: three in the far wall of each of the east, west and north bays, open to the dark (sky beyond) ----
const HATCHES = { N: [], E: [], W: [] };
for (const bay of ['N', 'E', 'W']) for (const lat of [-5, 0, 5]) {
  const [x, z] = B(bay, HATCH_D, lat); L.door(x, z, { remote: true, open: true }); L.ht[z][x] = 0; HATCHES[bay].push([x, z]);
  for (let d = HATCH_D + 1; d <= HATCH_D + 3; d++) for (let o = -1; o <= 1; o++) { const [vx, vz] = B(bay, d, lat + o); L.g[vz][vx] = '_'; }
  const [bx, bz] = B(bay, HATCH_D - 1, lat); set(bx, bz, 'x', 0);
}
// ---- the pockets in the west bay's walls (pressurised closets: a door each, a lantern, something to take) ----
const POCKETS = [['W', 21, -1], ['W', 24, 1], ['W', 27, -1]];
for (const [bay, d, side] of POCKETS) {
  const w0 = hw(d), [dx, dz] = B(bay, d, side * (w0 + 1)); L.door(dx, dz, {}); L.ht[dz][dx] = 0;
  for (let k = -1; k <= 1; k++) for (let j = 2; j <= 4; j++) { const [x, z] = B(bay, d + k, side * (w0 + j)); set(x, z, 'x', 0); ceil(x, z, 10); POCK.add(x + ',' + z); }
}
// ---- the secret: a niche behind a loose panel in the south (arrival) bay's wall ----
const panelAt = B('S', 24, -(hw(24) + 1)); L.secretPanel(panelAt[0], panelAt[1]); L.ht[panelAt[1]][panelAt[0]] = 0;
const nicheCells = []; for (let k = -1; k <= 1; k++) for (let j = 2; j <= 4; j++) { const [x, z] = B('S', 24 + k, -(hw(24) + j)); set(x, z, 'x', 0); ceil(x, z, 10); nicheCells.push([x, z]); }
// ---- the exit chamber west of the north bay, its door on the bay's west wall ----
const EXITD = 25, ew = hw(EXITD); const exitDoor = B('N', EXITD, -(ew + 1)); L.door(exitDoor[0], exitDoor[1], { remote: true }); L.ht[exitDoor[1]][exitDoor[0]] = 0;
for (let k = -2; k <= 2; k++) for (let j = 2; j <= 6; j++) { const [x, z] = B('N', EXITD + k, -(ew + j)); set(x, z, 'x', 0); ceil(x, z, 10); EXCH.add(x + ',' + z); }
const EXIT = B('N', EXITD, -(ew + 4));
// ---- the barracks: four round rooms in the corners, a door each in the hub's outer wall ----
const QUARTERS = [[1, -1], [-1, -1], [1, 1], [-1, 1]];
for (const [sx, sz] of QUARTERS) {
  const cx = CX + sx * 17, cz = CZ + sz * 14;
  for (let z = cz - 7; z <= cz + 7; z++) for (let x = cx - 7; x <= cx + 7; x++) { const r = Math.hypot(x + 0.5 - cx - 0.5, z + 0.5 - cz - 0.5); if (r <= 5.6) { set(x, z, 'x', r <= 2.4 ? 6 : r <= 4 ? 5 : 4); BAR.add(x + ',' + z); } }
  const dxo = CX + sx * 8, dzo = CZ + sz * 7;                                                                          // the door in the hub wall (x = +-8, z = +-7)
  L.door(dxo, dzo, {}); L.ht[dzo][dxo] = 4;
  for (let x = dxo + sx; sx * x <= sx * cx; x += sx) { set(x, dzo, 'x', 4); BAR.add(x + ',' + dzo); }                                           // the corridor out of the door, then in towards the room
  for (let z = dzo; sz * z <= sz * (cz - sz * 3); z += sz) { set(cx, z, 'x', 4); BAR.add(cx + ',' + z); }
}
// ---- vacuum: one strip per cell of depth (the taper), the pockets stay out of it; a lock's chamber is in vacuum while its bay-side door and the bay's hatches are open ----
const VACUUM = [];
for (const bay of ['N', 'E', 'W']) {
  const seals = HATCHES[bay];
  for (let d = 17; d <= HATCH_D; d++) { const a = B(bay, d, -hw(Math.min(d, BAY_END))), b = B(bay, d, hw(Math.min(d, BAY_END))); VACUUM.push({ rect: [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])], seals }); }
  const c1 = B(bay, 14), c2 = B(bay, 15); VACUUM.push({ rect: [Math.min(c1[0], c2[0]), Math.min(c1[1], c2[1]), Math.max(c1[0], c2[0]), Math.max(c1[1], c2[1])], seals, and: [doorsOf[bay].d2] });
}

// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const FLOORS = new Set(Object.keys(FLOOR_SKINS)), isFloor = (x, z) => FLOORS.has(L.g[z]?.[x]);
const ents = [], used = new Set();
for (const bay of ['N', 'E', 'W']) for (const k of ['d1', 'd2']) used.add(doorsOf[bay][k].join(','));
const put = (type, kind, [x, z], extra = {}) => { const k = x + ',' + z; if (!isFloor(x, z) || used.has(k)) { console.log('C1E4M03: no cell for', kind, 'at', x, z, L.g[z]?.[x]); return null; } used.add(k); ents.push({ type, kind, at: [x, z], ...extra }); return [x, z]; };
const E = (kind, bay, d, lat = 0) => put('enemy', kind, B(bay, d, lat)), P = (kind, bay, d, lat = 0) => put('pickup', kind, B(bay, d, lat)), PR = (kind, bay, d, lat = 0, extra = {}) => put('prop', kind, B(bay, d, lat), extra);
const here = (kind, type, dx, dz) => put(type, kind, [CX + dx, CZ + dz]);
const START = B('S', 28, 0); used.add(START.join(',')); L.put(START[0], START[1], '@');
// the south bay (the arrival): the crew asleep, a lighter, cargo, a supply station (kept)
E('tollbearer', 'S', 27, -6); E('tollbearer', 'S', 24, 6); E('tollbearer', 'S', 23, -4); PR('lighter', 'S', 27, 3, { yaw: Math.PI }); PR('lighter', 'S', 24, -2, { yaw: Math.PI / 2 });
for (const [d, lat] of [[29, -6], [29, 6], [25, -5], [19, 4]]) PR('crate2', 'S', d, lat);
for (const [k, d, lat] of [['ammo_flare', 21, -2], ['ammo_shell', 21, 0], ['ammo_rivet', 21, 2], ['health_small', 19, 0], ['health_small', 29, 3]]) P(k, 'S', d, lat);
for (const [d, lat] of [[28, 0], [24, 0], [18, 3]]) PR('lamp', 'S', d, lat);
// the hub: strip light, a Warden-Graft at the north arm, the spine's switch
for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) here('lamp', 'prop', dx, dz);
here('wardengraft', 'enemy', -2, -9); here('health_small', 'pickup', -6, 3); here('health_small', 'pickup', 6, -3); here('health_large', 'pickup', 0, 6);
// the barracks: the sleepers, bunks and tables
const BARR = [[1, -1, [['tollbearer', 1, 0], ['tollbearer', -2, 2], ['gaunt', 2, 2]]], [-1, -1, [['bellhand', 0, 0], ['tollbearer', 2, -2]]], [1, 1, [['gaunt', -2, 0], ['gaunt', 2, 2]]], [-1, 1, [['sexton', 0, 0], ['tollbearer', -2, 2]]]];
for (const [sx, sz, list] of BARR) { const cx = sx * 17, cz = sz * 14; for (const [k, dx, dz] of list) here(k, 'enemy', cx + dx, cz + dz); here('table', 'prop', cx, cz + 3); here('shelf', 'prop', cx + 3, cz - 1); here('lamp', 'prop', cx + 1, cz - 1); }
here('health_large', 'pickup', 17 + 3, -14 + 3); here('armor_vest', 'pickup', -17 - 3, 14 - 3); here('ammo_shell', 'pickup', 17 + 2, 14 + 3); here('ammo_rivet', 'pickup', -17 - 2, -14 + 3);
// the east bay: the dash. Two Gaunts, a Chorister on a lighter's hull, coupling A at the end
E('gaunt', 'E', 20, -3); E('gaunt', 'E', 24, 4); E('chorister', 'E', 27, 0); PR('lighter', 'E', 26, -4, { yaw: -Math.PI / 2 }); PR('crate2', 'E', 19, 4); PR('crate2', 'E', 22, -5); PR('crate2', 'E', 28, 5);
P('key_brass', 'E', 29, 0); P('health_large', 'E', 21, 0); P('health_small', 'E', 25, 2);
// the west bay: the pockets. A Warden-Graft at the second pocket, singers, Gaunts; coupling B at the end; each pocket holds a reward
E('gaunt', 'W', 23, 2); E('chorister', 'W', 26, 3); E('gaunt', 'W', 19, 3); E('gaunt', 'W', 22, -4); PR('lighter', 'W', 24, 4, { yaw: Math.PI / 2 }); PR('crate2', 'W', 18, -4); PR('crate2', 'W', 25, -6); PR('crate2', 'W', 28, 4);
P('key_iron', 'W', 29, 0); P('health_large', 'W', 20, 0);
for (const [bay, d, side] of POCKETS) { const w0 = hw(d), c = B(bay, d, side * (w0 + 3)); put('pickup', side < 0 ? 'health_large' : 'armor_vest', c); put('prop', 'lantern', B(bay, d + 1, side * (w0 + 4))); }
// the north bay: the panel. A Bellhand at the far end, Gaunts, a singer
E('bellhand', 'N', 25, 3); E('gaunt', 'N', 20, -4); E('gaunt', 'N', 23, 3); E('chorister', 'N', 27, 0); PR('crate2', 'N', 19, 3); PR('crate2', 'N', 22, -6); PR('lighter', 'N', 21, 0, { yaw: 0 });
P('health_large', 'N', 18, 0); P('health_small', 'N', 26, -2);
for (const [d, lat] of [[18, -3], [23, 3], [28, -2]]) PR('lamp', 'N', d, lat);
for (const [k, i] of [['armor_vest', 0], ['ammo_shell', 1], ['health_large', 4], ['ammo_rivet', 6]]) put('pickup', k, nicheCells[i]); put('prop', 'lantern', nicheCells[8]);
// the pockets, the exit chamber: a lantern each
put('prop', 'lantern', [EXIT[0] + 1, EXIT[1] + 1]);
// the switches: the spine's seat (both couplings) and the panel at the north bay's far west wall
const SPINE = [CX, CZ + 3], HULLSW = B('N', 28, -hw(28));
// ---- PT-035, the materials (the outside audits and the owner's own eye: Cold Dock was "one room nine times", one white-cyan panel over one white-cyan deck from the arrival to the exit). The BAYS stay the cold white they are (that is the dock). Everything people made
// for themselves is warm and dark against it: the crew's barracks and the closets in the walls are timber over carpet, the exit chamber brick over carpet, the secret niche timber; the spine and the lock chambers are riveted iron. Only the character of a wall or a floor
// changes, never its kind: no route, sight line, shot or breath of air moves (tools/dev/route-fingerprint.mjs proves it). ----
{
  const isOpen = (x, z) => FLOORS.has(L.g[z]?.[x]), NICHE = new Set(nicheCells.map((c) => c.join(',')));
  const wallPlan = [];
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    if (L.g[z][x] !== 'G') continue;
    let barr = false, exch = false, lockc = false;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const k = (x + dx) + ',' + (z + dz); if (!isOpen(x + dx, z + dz)) continue; if (BAR.has(k) || POCK.has(k) || NICHE.has(k)) barr = true; else if (EXCH.has(k)) exch = true; else if (LOCKC.has(k)) lockc = true; }
    if (barr) wallPlan.push([x, z, 'W']); else if (exch) wallPlan.push([x, z, 'B']); else if (lockc || (Math.abs(x - CX) <= 2 && Math.abs(z - CZ) <= 2)) wallPlan.push([x, z, 'I']);
  }
  for (const [x, z, sk] of wallPlan) L.g[z][x] = sk;
  for (const k of [...BAR, ...POCK, ...EXCH, ...NICHE]) { const [x, z] = k.split(',').map(Number); if (L.g[z][x] === 'x') L.g[z][x] = 'c'; }
}
// ---- end PT-035 materials ----
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [47,49], radius: 2, cells: ENC.around([47,49], { n: 3, min: 6, max: 10 }), kind: 'g' });
ENC.dropIn({ at: [59,46], radius: 2, cells: ENC.around([59,46], { n: 3, min: 4, max: 8 }), kind: 'g' });
// ---- end PT-052 ----

const MAP = {
  id: 'C1E4M03', name: 'Cold Dock', version: 1, ceilingHeight: 4.2, par: { time: 480 },
  atmosphere: { fog: '#a8c4cc', fogDensity: 0.006, sky: 'orbit', ambient: 0.9, look: 'dock' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  keyLabels: { brass: 'Coupling A', iron: 'Coupling B' },
  intro: { title: 'COLD DOCK', lines: ['The fleet is parked here, with its doors open to the dark.', 'Everything you want is on the other side of some air.'] },
  outro: 'The hatches close. Behind the glass the rest of the fleet hangs in the dark, forty ships and a Gate.',
  objective: 'The couplings are in the east and west bays, both open to the dark. Seat them at the spine',
  ...L.layers(),
  secrets: [{ id: 'niche', panel: panelAt, cells: nicheCells }],
  vacuum: VACUUM,
  entities: [...ents, { type: 'exit', at: EXIT, dest: 'next' },
    { type: 'switch', id: 'seat', at: SPINE, wall: 'north', needs: ['brass', 'iron'], do: [{ open: B('N', 11) }, { objective: 'The north lock is open. The panel at the far end of the bay shuts the hatches' }, { shake: 1 }, { message: 'seated' }] },
    { type: 'switch', id: 'hull', at: HULLSW, wall: 'west', do: [...HATCHES.N.map((h) => ({ close: h })), { open: exitDoor }, { objective: 'The hatches are shut and the air is back. The exit is west of the bay' }, { shake: 2 }, { message: 'air' }] }],
  messages: [
    { id: 'start', at: START, radius: 3, speaker: 'SIGNAL HOUSE', text: 'The Vael parked their fleet here, Calder. Two bays are open to the dark and the air in them is gone. A lock lets you in and out, but not both doors at once.' },
    { id: 'hub', at: [CX, CZ + 5], radius: 3, speaker: 'INES', text: 'Look at the glass: ships, rank on rank of them, hanging. The couplings that start them are in the east and west bays. Seat both at the spine.' },
    { id: 'lock', at: B('E', 11), radius: 2.5, speaker: 'HULL', text: 'Airlock. Open the near door, step in, wait for it to shut and for the air to settle. The far door will not move until it has.' },
    { id: 'dash', at: B('E', 20), radius: 3, speaker: 'INES', text: 'No air. You lose it a second at a time. Don\'t stop to look.' },
    { id: 'pockets', at: B('W', 20), radius: 3, speaker: 'SIGNAL HOUSE', text: 'The walls are doored closets: pressurised, small, there for the crews. Breathe in one. You can\'t be followed through a door.' },
    { id: 'seated', at: [CX, CZ + 5], radius: 0.1, speaker: 'HULL', text: 'Both couplings are seated. The north lock is open.' },
    { id: 'panel', at: B('N', 26), radius: 3, speaker: 'SIGNAL HOUSE', text: 'The hatches at the far end are open to the dark. There\'s a panel on the west wall at the end. It shuts them.' },
    { id: 'air', at: HULLSW, radius: 0.1, speaker: 'INES', text: 'And the air comes back. I won\'t say thank you out loud.' },
  ],
  triggers: [
    { id: 'east', when: 'enter', at: B('E', 14), radius: 2, do: [{ objective: 'The east bay: coupling A is at its far end, in the dark. Be quick' }] },
    { id: 'west', when: 'enter', at: B('W', 14), radius: 2, do: [{ objective: 'The west bay: coupling B is at the end. The closets in the walls have air' }] },
  ],
  quality: { enemies: [14, 70], botSeconds: [60, 900], mechanics: ['heights', 'triggers', 'switches', 'keys>=2'], skins: 2, enemyKinds: { tollbearer: 6, gaunt: 6, chorister: 3, wardengraft: 1, bellhand: 2, sexton: 1 },
    scaleClass: 'COMPRESSION', tallReason: 'the dock bays are 10 m tall for the docked Vael lighters, and the hub 9 m for the spine',
    introduces: 'airlocks and vacuum: two doors that refuse to be open together, and bays open to the dark that hurt while you are in them until their hatches are shut' },
};
MAP.drops = { scale: 1, keep: [[CX - 6, CZ + 19, CX + 6, CZ + 25]] };
console.log('C1E4M03: enemies', ents.filter((e) => e.type === 'enemy').length, 'vacuum strips', VACUUM.length);
// ---- PT-056 (R9, ammunition loads): rime for the scattergun and the flare, in the hub of the cold dock, on the road ----
MAP.entities ??= [];
MAP.entities.push(...[["ld_rime_scattergun",46,52],["ld_rime_flare",46,54]].map(([kind, x, z]) => ({ type: 'pickup', kind, at: [x, z] })));
// ---- end PT-056 ----
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C1E4M03', lane: [...(laneOf('C1E4M03') ?? [])], keep: [], plan: [{"from":"gaunt","to":"tollbearer","pick":"spread","n":1},{"from":"gaunt","to":"bellhand","pick":"spread","n":1}] };
ENC.apply(MAP);

// ---- PT-052 Level B: THE SQUEEZE (tools/mapkit/squeeze.mjs). A squeeze of 8 columns and 8 rows, where nothing stands and no stair runs (tools/dev/squeeze-map.mjs).
// Everything above this line is in the AUTHORING frame; the shipped map is narrower and its routes are the waypoints with the same cuts (`node tools/dev/write-routes.mjs C1E4M03`). Kit calls and the lane file stay in the authoring frame.
MAP.squeeze = [{axis:'x',cuts:[[3,4], [7,8], [13,14], [69,70], [79,80], [82,83], [84,85], [88,89]]}, {axis:'z',cuts:[[3,4], [7,8], [13,14], [24,25], [78,79], [80,81], [84,85], [88,89]]}];
// ---- end PT-052 Level B squeeze ----

export default MAP;
export { L, B, hw };
