// C1E4M06 GATEKEEPER'S APPROACH: the last defence. A FUNNEL: a processional hall in five ranks, 62 cells wide at the entrance and 20 at the Gate, each rank a terrace a metre above the last and a vault lower than the last, each divided from the next by a broken screen of
// stone with two gaps that do not line up (so the Gate's light is a glow on the walls and a tall slit until you are through the fourth). Two SERVICE TUNNELS (low, narrow, in the thickness of the walls) run along the flanks from the first rank to the third: the order of the fights is
// yours, within one rule: the way out is locked until the Weeping Mother in the middle of the funnel is dead. No new mechanic: the elites used together. R1 the outer court (open to the sky: the Gate's light is the sky) with two Bulwark Shells at its gaps and the porters in the colonnade shade;
// R2 the stalls (two Acolytes warding four Choristers); R3 the Mother's rank; R4 the steps (Warden-Grafts and Bellhands); R5 the last (one more shell) and the Gate yard. Scale class MIXED (the court is open; the rest is roofed). Look: approach (grey stone and indigo), sky: the Gate's.
import { Level, hchar } from '../tools/mapkit/builder.mjs';
import { FLOOR_SKINS } from '../src/engine/defs.js';
import { laneOf } from '../tools/mapkit/shape.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';

const W = 90, H = 118, CX = 45;
const L = new Level(W, H, { fill: 'A' }); L.usedHeights = true; L.usedCeil = true;
const hw = (z) => 7 + Math.round((12 * (z - 8)) / 100);                                               // PT-052 exemplar: half the funnel's width at row z: 19 at the entrance, 7 at the Gate (it was 30 and 10: the map was 4398 cells with 27 creatures)
const RANKS = [                                                                                         // [z from (north), z to (south), floor (0.5 m units), lid (absolute 0.5 m units), name]
  { z0: 92, z1: 110, h: 0, ce: 24, id: 'R1' }, { z0: 73, z1: 89, h: 2, ce: 22, id: 'R2' }, { z0: 54, z1: 70, h: 4, ce: 20, id: 'R3' }, { z0: 35, z1: 51, h: 6, ce: 18, id: 'R4' }, { z0: 18, z1: 32, h: 8, ce: 16, id: 'R5' }, { z0: 8, z1: 15, h: 10, ce: 16, id: 'YARD' },
];
const SCREENS = [{ z: 90, gaps: [-16, 16], h0: 0 }, { z: 71, gaps: [-6, 11], h0: 2 }, { z: 52, gaps: [-12, 5], h0: 4 }, { z: 33, gaps: [-4, 9], h0: 6 }, { z: 16, gaps: [0], h0: 8 }];      // each 2 thick (z and z + 1 = the rank above is at z - 1 ...)
const set = (x, z, ch, h, ce) => { L.g[z][x] = ch; L.ht[z][x] = h; if (ce != null) L.ce[z][x] = hchar(ce); };
const TUN = new Set(), CHB = new Set();                                                                   // PT-035: the cells of the service tunnels and of the Mother's chamber (the materials pass below)

// ---- the five ranks and the yard: floor between the funnel's walls, a lid over everything but the court -------------------------------------------------------------------------------------------------------------------
for (const r of RANKS) for (let z = r.z0; z <= r.z1; z++) for (let x = CX - hw(z); x <= CX + hw(z); x++) { if (r.id === 'R1') set(x, z, 's', r.h); else set(x, z, '8', r.h, r.ce); }
// ---- the screens: two cells of stone across the funnel with two gaps (a 5-cell gap, rising a unit a cell from the rank below to the rank above) ----
for (const sc of SCREENS) for (const dz of [0, 1]) { const z = sc.z + dz; for (let x = CX - hw(z) - 1; x <= CX + hw(z) + 1; x++) L.g[z][x] = 'A'; }
for (const sc of SCREENS) for (const g of sc.gaps) for (let o = -2; o <= 2; o++) { const x = CX + g + o, upper = sc.z, lower = sc.z + 1; const above = RANKS.find((r) => r.z1 === sc.z - 1) ?? RANKS.find((r) => r.z1 === sc.z - 1); const hAbove = above ? above.h : sc.h0 + 2; set(x, upper, '8', hAbove - 1, hAbove + 12); set(x, lower, '8', sc.h0 + 1 > hAbove ? hAbove : Math.max(sc.h0 + 1, hAbove - 1 - 0) , hAbove + 12); }
// ---- fix the gap heights properly: lower cell = floor of the rank below + 1, upper cell = the rank above's floor ---------------------------------------------------------------------------------------------------------------
for (const sc of SCREENS) { const above = RANKS.find((r) => r.z1 === sc.z - 1), below = RANKS.find((r) => r.z0 === sc.z + 2); for (const g of sc.gaps) for (let o = -2; o <= 2; o++) { const x = CX + g + o; if (below && above) { set(x, sc.z + 1, '8', below.h + 1 > above.h ? above.h : below.h + 1, above.ce + 2); set(x, sc.z, '8', above.h, above.ce + 2); } } }
// the court's open sky: R1 has no lid (floor 's' is outdoor); its screen's gap cells are roofed
// ---- the service tunnels: three cells wide in the thickness of each wall, from the court's flank to the Mother's rank, rising with the ranks -----------------------------------------------------------------------------------
const tunnel = (side) => {
  for (let z = 56; z <= 107; z++) {
    const h = Math.round((4 * (107 - z)) / 51), x0 = side < 0 ? CX - hw(z) - 5 : CX + hw(z) + 3;
    for (let o = 0; o < 3; o++) { set(x0 + o, z, '8', h, h + 8); TUN.add((x0 + o) + ',' + z); }
  }
  // the mouths: three cells open on to the court (z 106..108) and, in the east tunnel, on to the third rank (z 57..59)
  for (const [zA, zB, h] of side < 0 ? [[105, 107, 0]] : [[105, 107, 0], [57, 59, 4]]) for (let z = zA; z <= zB; z++) { const xa = side < 0 ? CX - hw(z) - 3 : CX + hw(z) + 1, xb = side < 0 ? CX - hw(z) : CX + hw(z) + 3; for (let x = Math.min(xa, xb); x <= Math.max(xa, xb); x++) { set(x, z, h === 0 ? 's' : '8', h, h === 0 ? null : 20); TUN.add(x + ',' + z); } }
};
tunnel(-1); tunnel(1);
// ---- the Mother's chamber: a round room on the west flank of the third rank, joined to it by a corridor three cells wide (and to the court by the west tunnel): she is not on the straight way through, you go to her ----
const CH = [8, 62];
for (let z = CH[1] - 8; z <= CH[1] + 8; z++) for (let x = 1; x <= CH[0] + 8; x++) if (Math.hypot(x + 0.5 - CH[0] - 0.5, z + 0.5 - CH[1] - 0.5) <= 7) { set(x, z, '8', 4, 18); CHB.add(x + ',' + z); }
for (let z = 61; z <= 63; z++) for (let x = CH[0] + 5; x <= CX - hw(62) - 1; x++) { set(x, z, '8', 4, 18); CHB.add(x + ',' + z); }
// ---- cover: fallen colossi (blocks of stone) and colonnades of pillars; the exit and the Gate behind it ----------------------------------------------------------------------------------------------------------------------------
const FLOORS = new Set(Object.keys(FLOOR_SKINS)), isFloor = (x, z) => FLOORS.has(L.g[z]?.[x]);
for (const [x, z, w, d] of [[CX - 12, 100, 3, 2], [CX + 10, 98, 3, 2], [CX - 4, 104, 4, 2], [CX - 14, 82, 2, 3], [CX + 8, 80, 2, 3], [CX - 6, 63, 3, 2], [CX + 4, 61, 3, 2], [CX - 10, 44, 3, 2], [CX + 6, 42, 3, 2], [CX - 3, 25, 2, 2]]) for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) if (isFloor(x + i, z + j)) L.g[z + j][x + i] = 'A';
const EXIT = [CX, 9]; for (let x = CX - 4; x <= CX + 4; x++) L.g[8][x] = x === CX ? '8' : 'A'; L.g[7][CX] = 'A';
// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const ents = [], used = new Set();
const put = (type, kind, [x, z], extra = {}) => { for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1], [2, 0], [0, 2], [-2, 0], [0, -2]]) { const xx = x + dx, zz = z + dz, k = xx + ',' + zz; if (isFloor(xx, zz) && !used.has(k)) { used.add(k); ents.push({ type, kind, at: [xx, zz], ...extra }); return [xx, zz]; } } console.log('C1E4M06: no cell for', kind, x, z); return null; };
const START = [CX, 108]; used.add(START.join(',')); L.put(START[0], START[1], '@');
const E = (kind, x, z, extra = {}) => put('enemy', kind, [CX + x, z], extra), P = (kind, x, z) => put('pickup', kind, [CX + x, z]), PR = (kind, x, z, extra = {}) => put('prop', kind, [CX + x, z], extra);
// R1: the porters in the colonnade shade; two shells at the gaps; the supply station by the door
for (const [x, z] of [[-24, 104], [-26, 96], [24, 104], [26, 96]]) E('tollbearer', x, z);
E('gaunt', 16, 94); E('gaunt', -16, 94);
for (const [k, x] of [['ammo_flare', -2], ['ammo_shell', 0], ['ammo_rivet', 2]]) P(k, x, 106); P('health_small', 0, 103);
for (const [x, z] of [[-10, 102], [10, 102], [-20, 94], [20, 94], [-26, 108], [26, 108]]) PR('pillar', x, z, { skin: 'A' });
// R2: the stalls: two Acolytes warding four Choristers
E('acolyte', -2, 80); E('chorister', -14, 77); E('chorister', 12, 83); E('chorister', 16, 76); P('health_large', 0, 82);
for (const [x, z] of [[-12, 86], [12, 86], [-16, 74], [18, 74], [0, 88]]) PR('pillar', x, z, { skin: 'A' });
// R3: the Mother's rank: a ring of pillars round her; sleepers either side; a supply station before her
put('enemy', 'weeping', [CH[0], CH[1]], { group: 'mother' }); put('enemy', 'gaunt', [CH[0] + 3, CH[1] - 3]); put('enemy', 'gaunt', [CH[0] - 3, CH[1] + 3]); put('prop', 'lamp', [CH[0], CH[1] + 2]); put('pickup', 'health_large', [CH[0] + 4, CH[1]]); E('gaunt', -14, 66); E('gaunt', 14, 64); E('tollbearer', -10, 58); E('tollbearer', 10, 56);
for (const [k, x] of [['ammo_flare', -3], ['ammo_shell', -1], ['ammo_rivet', 1], ['ammo_shell', 3]]) P(k, x, 68); P('health_large', -6, 68); P('armor_vest', 6, 68);
// R4: the steps: two Warden-Grafts, Bellhands
E('wardengraft', -8, 46); E('bellhand', 9, 44); E('bellhand', 0, 40); E('bellhand', -16, 42); P('health_large', 0, 49); P('health_small', -12, 38); P('health_small', 12, 38);
for (const [x, z] of [[-4, 48], [5, 49], [-14, 38], [14, 40]]) PR('pillar', x, z, { skin: 'A' });
// R5 and the yard: the last shell, the Gate's lamps
E('gaunt', 0, 26); E('tollbearer', -8, 22); E('tollbearer', 8, 22); P('health_large', 0, 30); P('armor_vest', -5, 20);
for (const [x, z] of [[-6, 29], [6, 29]]) PR('pillar', x, z, { skin: 'A' });
// PT-052 (the exemplar, Director's Plan R3): the funnel is narrower (19 to 7 half-width, it was 30 to 10) and holds more: a second line in every rank, a third of the whole shooting, so the walk between fights is short
for (const [k, x, z] of [['gaunt', -14, 98], ['bellhand', -16, 105], ['bellhand', -10, 84], ['bellhand', 8, 78], ['gaunt', -4, 86], ['chorister', -12, 74],
  ['bellhand', 10, 60], ['gaunt', -8, 56], ['bellhand', -6, 38], ['bellhand', 8, 48], ['gaunt', -10, 48], ['bellhand', -5, 28], ['gaunt', 4, 24],
  ['chorister', 14, 96], ['bellhand', 0, 74], ['chorister', -6, 62], ['chorister', 0, 34], ['bellhand', -3, 24]]) E(k, x, z);
// the service tunnels: a Warden-Graft in the west one, a Bellhand and a Gaunt in the east one; a cache in each
{ const tz = (z, side) => [CX + side * (hw(z) + 4 + (side > 0 ? 0 : 0)), z]; put('enemy', 'gaunt', tz(90, -1)); put('enemy', 'bulwark', tz(84, 1)); put('enemy', 'gaunt', tz(72, 1)); put('pickup', 'health_large', tz(96, -1)); put('pickup', 'armor_vest', tz(66, 1)); put('pickup', 'ammo_shell', tz(78, -1)); }
// lamps: the Gate's strip at the far end; a lamp per rank under the lid
for (const [x, z] of [[-10, 82], [10, 82], [-10, 64], [10, 64], [-10, 46], [10, 46], [-6, 26], [6, 26], [0, 12]]) PR('lamp', x, z);
// the secret: a loose panel in the east tunnel's wall (a cache of a sort the porters used to keep)
let secret = null;
{ for (let z = 100; z >= 60 && !secret; z--) { const x = CX + hw(z) + 6; if (L.g[z][x] !== 'A' || !isFloor(x - 1, z)) continue; if (L.g[z - 1][x] !== 'A' || L.g[z + 1][x] !== 'A') continue;
    let free = true; for (let k = 1; k <= 3; k++) for (let j = -1; j <= 1; j++) if (L.g[z + j]?.[x + k] !== 'A' || x + k >= W - 1) free = false; if (!free) continue;
    const cells = []; for (let k = 1; k <= 3; k++) for (let j = -1; j <= 1; j++) { set(x + k, z + j, '8', L.ht[z][x - 1], L.ht[z][x - 1] + 8); cells.push([x + k, z + j]); }
    L.g[z][x] = 'S'; L.ht[z][x] = L.ht[z][x - 1]; secret = { panel: [x, z], cells }; } }
if (secret) { const c = secret.cells; for (const [k, i] of [['armor_vest', 4], ['ammo_shell', 1], ['ammo_rivet', 7], ['health_large', 5]]) put('pickup', k, c[i]); } else console.log('C1E4M06: no cell for the secret');
// ---- PT-035, the materials (the outside audits: "one material in one hue": the five ranks were one purple-grey stone over one lavender tile from the court to the Gate, in the dark). Now every rank has its own stone and the Gate's light ARRIVES rank by
// rank: the stalls are timber over planks, the Mother's rank and her chamber brick over flagstone and carpet, the steps grey tower stone over tile, the last rank and the yard Gate marble over the white-ringed floor, the service tunnels riveted iron over grating.
// Only the CHARACTER of a wall or a floor changes, never its kind (every skin used is a plain wall or a plain roofed floor): no route, no sight line and no shot moves (tools/dev/route-fingerprint.mjs proves it).
{
  const RANK_SKIN = { R1: ['A', 's'], R2: ['W', '.'], R3: ['B', 'f'], R4: ['T', 't'], R5: ['2', ';'], YARD: ['2', ';'] };
  const rankOf = (z) => RANKS.find((r) => z >= r.z0 && z <= r.z1) ?? (SCREENS.some((sc) => z === sc.z || z === sc.z + 1) ? RANKS.find((r) => r.z1 === SCREENS.find((sc) => z === sc.z || z === sc.z + 1).z - 1) : null);
  if (secret) for (const [cx, cz] of secret.cells) TUN.add(cx + ',' + cz);
  const isOpen = (x, z) => FLOORS.has(L.g[z]?.[x]);
  const wallPlan = [];
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    if (L.g[z][x] !== 'A') continue;
    let rankFloor = false, chamber = false, tunnel = false;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const k = (x + dx) + ',' + (z + dz); if (!isOpen(x + dx, z + dz)) continue; if (CHB.has(k)) chamber = true; else if (TUN.has(k)) tunnel = true; else rankFloor = true; }
    const r = rankOf(z);
    if (rankFloor && r) wallPlan.push([x, z, RANK_SKIN[r.id][0]]); else if (chamber) wallPlan.push([x, z, 'B']); else if (tunnel) wallPlan.push([x, z, 'I']);
  }
  for (const [x, z, sk] of wallPlan) L.g[z][x] = sk;
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (L.g[z][x] !== '8') continue; const k = x + ',' + z;
    if (CHB.has(k)) L.g[z][x] = 'c'; else if (TUN.has(k)) L.g[z][x] = 'g'; else { const r = rankOf(z); if (r) L.g[z][x] = RANK_SKIN[r.id][1]; }
  }
  for (const e of ents) if (e.type === 'prop' && e.kind === 'pillar') { const r = rankOf(e.at[1]); if (r) e.skin = RANK_SKIN[r.id][0]; }
  // warm pools of light: a lantern at the foot of the screens' flanks and by each rank's side walls (a prop with no body: it blocks nothing)
  for (const [x, z] of [[-26, 86], [26, 86], [-22, 68], [22, 68], [-18, 49], [18, 49], [-14, 30], [14, 30], [-8, 13], [8, 13], [-24, 106], [24, 106]]) put('prop', 'lantern', [CX + x, z]);
}
// ---- end PT-035 materials ----
// ---- PT-052 R3 (exemplar): two scripted ambushes (the kit: tools/mapkit/encounters.mjs): a pack of Gaunts drops in as the player crosses the Mother's rank and the steps ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [54, 70], radius: 2, cells: ENC.around([54, 70], { n: 3, min: 6, max: 10 }), kind: 'g' });
ENC.dropIn({ at: [45, 48], radius: 2, cells: ENC.around([45, 48], { n: 3, min: 6, max: 10 }), kind: 'g' });
// ---- end PT-052 ----

const MAP = {
  id: 'C1E4M06', name: "Gatekeeper's Approach", version: 1, ceilingHeight: 4.2, par: { time: 600 },
  atmosphere: { fog: '#34365a', fogDensity: 0.005, sky: 'gate', ambient: 0.9, look: 'approach' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: "GATEKEEPER'S APPROACH", lines: ['Everything the Vael had left is standing in this hall.', 'The Gate is at the far end, and it is very bright.'] },
  outro: 'The hall opens. Above the last steps the light stops being a rumour and becomes a thing you can look at.',
  objective: 'Cross the court and the five ranks of the Approach. The way out is locked while the Weeping Mother stands',
  ...L.layers(),
  secrets: secret ? [{ id: 'cache', panel: secret.panel, cells: secret.cells }] : [],
  entities: [...ents, { type: 'exit', at: EXIT, locked: true, dest: 'next' }],
  messages: [
    { id: 'start', at: START, radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Approach. Five ranks, each a step higher, each with its own guard. The gaps in the screens do not line up. The tunnels in the flanks go round the first two.' },
    { id: 'court', at: [CX, 103], radius: 4, speaker: 'INES', text: 'Shell-backs at the gaps. Walk round them or use something that goes through. The sky is the Gate. It is like looking at the sun.' },
    { id: 'stalls', at: [CX, 85], radius: 4, speaker: 'SIGNAL HOUSE', text: 'The stalls. A tall one with the wheel, and singers behind. Kill the wheel first. Everything near it takes half.' },
    { id: 'mother', at: [CX - 20, 62], radius: 4, speaker: 'INES', text: 'She is in there, in the round room west of the rank. The way out stays locked as long as she weeps. Walk out of what she makes.' },
    { id: 'steps', at: [CX, 50], radius: 4, speaker: 'HULL', text: 'The steps. Two grafts with plates on their fronts, and bellhands behind them. Pillars are cover from the bells.' },
    { id: 'last', at: [CX, 30], radius: 4, speaker: 'INES', text: 'One more shell. Then the yard, and the Gate beyond it. I can feel it in my teeth.' },
    { id: 'panel', at: secret ? secret.panel : [0, 0], radius: 3, speaker: 'HULL', text: 'The wall of the east tunnel rings hollow.' },
  ],
  triggers: [
    { id: 'mother-down', when: 'dead:mother', do: [{ exit: { set: 'unlock' } }, { objective: 'The Mother is down. The way out is open: the Gate yard, straight ahead' }, { shake: 2 }] },
    { id: 'stalls', when: 'enter', at: [CX, 85], radius: 5, do: [{ objective: 'The stalls: kill the Acolytes first, then the singers' }] },
    { id: 'mother-rank', when: 'enter', at: [CX - 14, 62], radius: 5, do: [{ objective: 'The Mother is in the round room west of this rank: kill her' }] },
  ],
  quality: { enemies: [14, 70], botSeconds: [60, 1200], mechanics: ['heights', 'triggers', 'secret'], skins: 3, enemyKinds: { bulwark: 1, acolyte: 1, chorister: 3, weeping: 1, wardengraft: 1, bellhand: 2, tollbearer: 4, gaunt: 2 },
    scaleClass: 'MIXED', tallReason: 'the outer court of the Approach is 12 m under the Gate\'s sky and the hall closes down rank by rank to 8',
    introduces: 'the gauntlet: every elite the Vael have, used together in five ranks of a funnel, with two flank tunnels that go round the first two and a Mother in the middle who keeps the way out locked' },
};
MAP.drops = { scale: 1, keep: [[CX - 4, 104, CX + 4, 108], [CX - 4, 66, CX + 4, 70]] };
console.log('C1E4M06: enemies', ents.filter((e) => e.type === 'enemy').length);
// ---- PT-052 R3 (exemplar): what the kit built joins the map, and which kinds stand where is a plan the compiler applies (tools/mapkit/roster.mjs; tools/dev/tune-roster.mjs swaps it) ----
ENC.apply(MAP);
MAP.roster = { id: 'C1E4M06', lane: [...(laneOf('C1E4M06') ?? [])], keep: [], plan: [{ from: 'chorister', to: 'tollbearer', n: 3, pick: 'spread' }, { from: 'bellhand', to: 'tollbearer', n: 5, pick: 'spread' }] };          // found with tools/dev/tune-roster.mjs: both fighters finish every route; eleven Bellhands and seven Choristers killed the strafing one on hard

export default MAP;
export { L, hw, CX, SCREENS, RANKS };
