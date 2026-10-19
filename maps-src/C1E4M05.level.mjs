// C1E4M05 DRIFT ORCHARD: the Vael grow Tollbearers in orbit. A glass bubble 90 cells across (a wall of living glass 20 m tall round it, shattered open at the north where the Gate's light comes in) holding seven islands: the GREAT TREE on a disc 24 across in the middle
// (a solid trunk, a grove of roots round it that is roofed, half open between the root pillars), and six ring islands at radius 30, each a different blob (a disc of open moss with a round greenhouse of pods stuck to its outer edge); a dock on the south rim where you arrive.
// The new thing: DRIFT. The moss of every island has almost no grip (FX.d: you take 0.7 s to get going and as long to stop: plan your landing); the greenhouses and the dock have grip. The roads are the vents, as in the Wreck Belt.
// Route: the dock -> (a vent) the south island -> (a vent) the tree -> the FRUIT (a key) at the foot of the trunk: taking it wakes the Drone-Gills of the whole bubble (the harvest) -> (a vent) the north island -> the gate. The other four islands are optional: pods to harvest,
// health, ammunition, a secret. Scale class MIXED. Look: orchard (green-gold, soft, weightless; the north is white where the glass is gone).
import { Level, hchar } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';
import { FLOOR_SKINS } from '../src/engine/defs.js';

const W = 96, H = 96, CX = 48, CZ = 48, D2R = Math.PI / 180;
const L = new Level(W, H, { fill: '_' }); L.usedHeights = true; L.usedCeil = true; L.usedFx = true;
const rOf = (x, z, cx, cz) => Math.hypot(x + 0.5 - cx, z + 0.5 - cz);
const dir = (a) => [Math.cos(a * D2R), Math.sin(a * D2R)];
const at = (cx, cz, d, a) => { const [ux, uz] = dir(a); return [Math.floor(cx + d * ux), Math.floor(cz + d * uz)]; };
const inb = (x, z) => x >= 1 && z >= 1 && x < W - 1 && z < H - 1;
const set = (x, z, ch, h, fx = '.') => { if (!inb(x, z)) return; L.g[z][x] = ch; L.ht[z][x] = h; L.fxl[z][x] = fx; };

// ---- the glass: a tall wall round the bubble (r 44 to 46), open to the sky in the north where it has shattered; solid beyond ----------------------------------------------------------------------------------------
for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
  const r = rOf(x, z, CX, CZ), a = ((Math.atan2(z + 0.5 - CZ, x + 0.5 - CX) * 180) / Math.PI + 360) % 360, broken = a >= 238 && a <= 302;
  if (r > 44 && !(broken && r <= 60)) L.g[z][x] = 'Q';
}
// ---- the islands ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const TREE = { c: [CX, CZ], h: 4 };
const RING = [
  { id: 'S', a: 90, h: 0, hut: [-1.35, 0] }, { id: 'SW', a: 150, h: 3 }, { id: 'NW', a: 210, h: 6 }, { id: 'N', a: 270, h: 2, hut: [1.35, 0] }, { id: 'NE', a: 330, h: 5 }, { id: 'SE', a: 30, h: 1 },
];
for (const isl of RING) { const [ux, uz] = dir(isl.a); isl.cx = CX + 30 * ux; isl.cz = CZ + 30 * uz; const hd = isl.hut ?? [ux * 1.0, uz * 1.0]; isl.hx = isl.cx + 6 * hd[0]; isl.hz = isl.cz + 6 * hd[1]; }
const HUT_R = 6.4;
const ceilU = (h) => hchar(h + 10);
// the open moss of each island, then its hut (a ring of living glass with an opening towards the island's heart, a roofed floor)
for (const isl of RING) {
  for (let z = Math.floor(isl.cz - 10); z <= Math.ceil(isl.cz + 10); z++) for (let x = Math.floor(isl.cx - 10); x <= Math.ceil(isl.cx + 10); x++) if (rOf(x, z, isl.cx, isl.cz) <= 9) set(x, z, '7', isl.h, 'd');
  const toHeart = Math.atan2(isl.cz - isl.hz, isl.cx - isl.hx) * 180 / Math.PI;
  for (let z = Math.floor(isl.hz - 8); z <= Math.ceil(isl.hz + 8); z++) for (let x = Math.floor(isl.hx - 8); x <= Math.ceil(isl.hx + 8); x++) {
    const r = rOf(x, z, isl.hx, isl.hz); if (r > HUT_R + 1.2) continue;
    const a = ((Math.atan2(z + 0.5 - isl.hz, x + 0.5 - isl.hx) * 180) / Math.PI - toHeart + 540) % 360 - 180;
    if (r <= HUT_R) { set(x, z, '6', isl.h); L.ce[z][x] = ceilU(isl.h); }
    else if (Math.abs(a) <= 24) { set(x, z, '6', isl.h); L.ce[z][x] = ceilU(isl.h); }                      // the opening, three cells wide, towards the island's heart
    else set(x, z, 'Q', isl.h);
  }
}
// the tree island: moss (drift) to r 12, the trunk (bark, r 3.4), the grove (roofed floor between 3.4 and 6.4), root pillars on r 6.4 .. 7.4 every other cell
for (let z = CZ - 14; z <= CZ + 14; z++) for (let x = CX - 14; x <= CX + 14; x++) {
  const r = rOf(x, z, CX, CZ); if (r > 12) continue;
  if (r <= 3.4) { set(x, z, 'U', TREE.h); continue; }
  if (r <= 7.0) { set(x, z, '6', TREE.h); L.ce[z][x] = ceilU(TREE.h + 2); continue; }
  if (r <= 8.0) { if ((x + z) % 2 === 0) set(x, z, 'U', TREE.h); else { set(x, z, '6', TREE.h); L.ce[z][x] = ceilU(TREE.h + 2); } continue; }
  set(x, z, '7', TREE.h, 'd');
}
// the dock on the south rim (grip: it is not drifting), a disc 10 across
for (let z = 84; z <= 94; z++) for (let x = CX - 6; x <= CX + 6; x++) if (rOf(x, z, CX, 89.5) <= 4.8) set(x, z, '7', 0);

// ---- the vents -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const byId = Object.fromEntries(RING.map((i) => [i.id, i]));
const VENTS = [];
const vent = (from, to, time) => VENTS.push({ at: from, to, time });
vent([CX, 88], [CX, 82], 3);                                                                                  // dock -> the south island
{ const s = byId.S; vent(at(s.cx, s.cz, 7.5, 270 - 12), at(TREE.c[0], TREE.c[1], 10, 90 - 14), 5); }          // the south island -> the tree
{ const n = byId.N; vent(at(TREE.c[0], TREE.c[1], 10, 270 + 14), at(n.cx, n.cz, 5.8, 90 - 14), 4.5); }       // the tree -> the north island
for (const id of ['SW', 'NW', 'NE', 'SE']) {
  const k = byId[id], a = k.a;
  vent(at(TREE.c[0], TREE.c[1], 10.4, a + 16), at(k.cx, k.cz, 5.8, a + 180 - 18), 4);                         // the tree -> the island
  vent(at(k.cx, k.cz, 7.6, a + 180 + 18), at(TREE.c[0], TREE.c[1], 10.4, a - 16), 4);                         // and back
}
for (const v of VENTS) for (const c of [v.at, v.to]) if (!['7', '6'].includes(L.g[c[1]][c[0]])) console.log('C1E4M05: vent cell', c, 'is', L.g[c[1]][c[0]]);

// ---- map edge ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (let x = 0; x < W; x++) { L.g[0][x] = 'Q'; L.g[H - 1][x] = 'Q'; } for (let z = 0; z < H; z++) { L.g[z][0] = 'Q'; L.g[z][W - 1] = 'Q'; }
// the gate: a small arch of glass on the north island's far side and the exit in front of it
const GATE = [CX, 8]; for (let z = 6; z <= 10; z++) for (let x = CX - 3; x <= CX + 3; x++) { if (z === 6 || x === CX - 3 || x === CX + 3) { if (inb(x, z)) { L.g[z][x] = 'Q'; L.fxl[z][x] = '.'; } } else set(x, z, '7', 2); }
for (let z = 11; z <= 15; z++) set(CX, z, '7', 2, 'd'); for (let z = 11; z <= 15; z++) { set(CX - 1, z, '7', 2, 'd'); set(CX + 1, z, '7', 2, 'd'); }

// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const FLOORS = new Set(Object.keys(FLOOR_SKINS)), isFloor = (x, z) => FLOORS.has(L.g[z]?.[x]);
const ents = [], used = new Set(); for (const v of VENTS) { used.add(v.at.join(',')); used.add(v.to.join(',')); }
const put = (type, kind, [x, z], extra = {}) => { const k = x + ',' + z; if (!isFloor(x, z) || used.has(k)) { for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1], [2, 0], [0, 2]]) { const k2 = (x + dx) + ',' + (z + dz); if (isFloor(x + dx, z + dz) && !used.has(k2)) { used.add(k2); ents.push({ type, kind, at: [x + dx, z + dz], ...extra }); return [x + dx, z + dz]; } } console.log('C1E4M05: no cell for', kind, x, z, L.g[z]?.[x]); return null; } used.add(k); ents.push({ type, kind, at: [x, z], ...extra }); return [x, z]; };
const near = (isl, d, a) => at(isl.cx, isl.cz, d, a), hutAt = (isl, d, a) => at(isl.hx, isl.hz, d, a);
const START = [CX, 90]; used.add(START.join(',')); L.put(START[0], START[1], '@');
// the dock: a crate or two and a supply station (kept)
for (const [dx, dz] of [[-3, 0], [3, 1]]) put('prop', 'crate2', [CX + dx, 90 + dz]); for (const [k, dx] of [['ammo_flare', -2], ['ammo_shell', 0], ['ammo_rivet', 2]]) put('pickup', k, [CX + dx, 92]); put('pickup', 'health_small', [CX, 87]);
// every island: what lives there (pods and sleepers in the hut, flyers and others on the moss)
const S = byId.S, SW = byId.SW, NW = byId.NW, N = byId.N, NE = byId.NE, SE = byId.SE;
const hutPods = (isl, kinds, pods = 3) => { kinds.forEach((k, i) => put('enemy', k, hutAt(isl, 1.5 + (i % 2), (i * 137) % 360), { group: 'pods' })); for (let i = 0; i < pods; i++) put('prop', 'pod', hutAt(isl, 3.3, 40 + i * 110)); put('prop', 'lamp', hutAt(isl, 0.5, 0)); };
// the south island: flyers, Gaunts, cover
put('enemy', 'gaunt', near(S, 5, 10)); put('enemy', 'gaunt', near(S, 3, 100)); put('enemy', 'bellhand', near(S, 6, 320)); put('enemy', 'chorister', near(S, 7, 215)); put('enemy', 'chorister', near(S, 6, 60)); hutPods(S, ['tollbearer', 'tollbearer'], 2); put('prop', 'crate2', near(S, 6.5, 330)); put('prop', 'crate2', near(S, 6, 40));
put('pickup', 'health_small', near(S, 2, 270)); put('pickup', 'health_small', near(S, 2, 160));
// the tree: the fruit at the foot of the trunk, two Gaunts in the grove, two singers on the moss, flyers
put('pickup', 'key_brass', [CX, CZ + 5]); put('enemy', 'bellhand', [CX - 6, CZ + 8]); put('enemy', 'gaunt', [CX + 5, CZ - 3]); put('enemy', 'gaunt', [CX - 5, CZ + 2]); put('enemy', 'chorister', [CX - 9, CZ - 5]); put('enemy', 'chorister', [CX + 2, CZ - 10]); put('enemy', 'chorister', [CX + 9, CZ + 4]); put('enemy', 'gill', [CX + 7, CZ - 8], { group: 'gills' });
for (const [a, k] of [[40, 'health_large'], [140, 'health_small'], [220, 'ammo_shell'], [310, 'ammo_rivet']]) put('pickup', k, at(CX, CZ, 9.5, a));
for (const a of [20, 100, 200, 300]) put('prop', 'lantern', at(CX, CZ, 5, a));
// the north island: the last guards (a Bellhand, a singer, Gaunts), the gate behind
put('enemy', 'bellhand', near(N, 3, 330)); put('enemy', 'chorister', near(N, 5, 200)); put('enemy', 'chorister', near(N, 7, 250)); put('enemy', 'gaunt', near(N, 4, 120)); put('enemy', 'gaunt', near(N, 6, 60)); put('enemy', 'gill', near(N, 5, 300), { group: 'gills' }); hutPods(N, ['tollbearer', 'tollbearer'], 2); put('pickup', 'health_large', near(N, 2, 90)); put('pickup', 'armor_vest', near(N, 5, 160));
// the four optional islands
hutPods(SW, ['tollbearer', 'tollbearer', 'tollbearer']); put('enemy', 'sexton', near(SW, 3, 100)); put('pickup', 'health_large', near(SW, 4, 0)); put('pickup', 'ammo_shell', near(SW, 2, 200));
hutPods(NW, ['tollbearer', 'tollbearer', 'tollbearer']); put('enemy', 'gill', near(NW, 4, 60), { group: 'gills' }); put('enemy', 'chorister', near(NW, 3, 120)); put('pickup', 'armor_vest', near(NW, 5, 0));
hutPods(NE, ['bellhand', 'tollbearer']); put('enemy', 'gill', near(NE, 5, 220), { group: 'gills' }); put('pickup', 'health_large', near(NE, 3, 90)); put('pickup', 'ammo_rivet', near(NE, 4, 180));
hutPods(SE, ['tollbearer', 'tollbearer']); put('enemy', 'gaunt', near(SE, 4, 250)); put('enemy', 'gill', near(SE, 5, 130), { group: 'gills' }); put('pickup', 'health_small', near(SE, 3, 0)); put('pickup', 'ammo_flare', near(SE, 2, 160));
// the secret: a niche behind a loose panel in the north-west greenhouse (a cache): the panel is a cell of the ring wall with the hut's floor on one side and open sky on the other; the niche is carved out over the sky
let secret = null;
{ const isl = NW;
  for (let z = Math.floor(isl.hz - 9); z <= Math.ceil(isl.hz + 9) && !secret; z++) for (let x = Math.floor(isl.hx - 9); x <= Math.ceil(isl.hx + 9) && !secret; x++) {
    if (L.g[z][x] !== 'Q' || rOf(x, z, isl.hx, isl.hz) > HUT_R + 1.3) continue;
    for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      if (L.g[z - dz]?.[x - dx] !== '6' || L.g[z + dz]?.[x + dx] !== '_') continue;
      if (L.g[z + dx]?.[x + dz] !== 'Q' || L.g[z - dx]?.[x - dz] !== 'Q') continue;
      let free = true; for (let k = 1; k <= 3 && free; k++) for (let j = -1; j <= 1; j++) { const cx = x + dx * k + dz * j, cz = z + dz * k + dx * j; if (L.g[cz]?.[cx] !== '_') free = false; }
      if (!free || rOf(x, z, CX, CZ) > 40) continue;
      const cells = []; for (let k = 1; k <= 3; k++) for (let j = -1; j <= 1; j++) { const cx = x + dx * k + dz * j, cz = z + dz * k + dx * j; set(cx, cz, '6', isl.h); L.ce[cz][cx] = ceilU(isl.h); cells.push([cx, cz]); }
      L.g[z][x] = 'S'; L.ht[z][x] = isl.h; secret = { panel: [x, z], cells }; break;
    }
  } }
if (secret) { const c = secret.cells; for (const [k, i] of [['armor_vest', 4], ['ammo_shell', 1], ['ammo_rivet', 7], ['health_large', 5]]) put('pickup', k, c[i]); } else console.log('C1E4M05: no cell for the secret');
// ---- PT-035, the materials (the outside audits: "one material in one hue": the whole orchard was one bright lawn and one olive wall, a lawn with slabs on it). Now every island has its OWN ground (a different place to land): the south island keeps the moss you arrive on, the
// south-west is dark silt (the beds), the north-west old wet cobbles (a paved yard gone under), the north cream salt-crust (it is where the glass is gone and the light is white), the north-east slate, the south-east the dark gill-garden floor; the dock is a hazard-striped
// deck (the way in is a ship's, not a garden's), the greenhouses are planked inside, and every island has two lanterns: warm pools on a green night. The drift is the FX layer, not the floor character: no island drifts any differently, no route, sight line or shot moves. ----
{
  const GROUND = { S: '7', SW: 'm', NW: ':', N: 'l', NE: 's', SE: 'u' };
  for (const isl of RING) { const [a0, a1] = [isl.a + 180 - 30, isl.a + 180 + 30]; put('prop', 'lantern', near(isl, 7.5, a0)); put('prop', 'lantern', near(isl, 7.5, a1)); }
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    const c = L.g[z][x];
    if (c === '7') {
      if (z >= 83 && rOf(x, z, CX, 89.5) <= 5.2) { L.g[z][x] = 'd'; continue; }
      const isl = RING.find((i) => rOf(x, z, i.cx, i.cz) <= 10); if (isl) L.g[z][x] = GROUND[isl.id];
    } else if (c === '6' && rOf(x, z, CX, CZ) > 8.5) L.g[z][x] = '.';
  }
}
// ---- end PT-035 materials ----
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [50,45], radius: 2, cells: ENC.around([50,45], { n: 3, min: 6, max: 10 }), kind: 'g' });
// ---- end PT-052 ----

const MAP = {
  id: 'C1E4M05', name: 'Drift Orchard', version: 1, ceilingHeight: 20, par: { time: 400 },
  atmosphere: { fog: '#cfe4b4', fogDensity: 0.004, sky: 'orbit', ambient: 0.9, look: 'orchard' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  keyLabels: { brass: 'The fruit' },
  intro: { title: 'DRIFT ORCHARD', lines: ['The Vael grow their soldiers in orbit.', 'Nothing here has a floor it can hold on to.'] },
  outro: 'The gate takes you. Behind it the Gate itself is no longer a rumour.',
  objective: 'The fruit hangs at the foot of the great tree in the middle. The gate is in the north, past the tree',
  ...L.layers(),
  secrets: secret ? [{ id: 'niche', panel: secret.panel, cells: secret.cells }] : [],
  vents: VENTS,
  entities: [...ents, { type: 'exit', at: [CX, 9], locked: true, dest: 'next' }],
  messages: [
    { id: 'start', at: START, radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Drift Orchard. The Vael grow Tollbearers in orbit. The moss has no grip at all: you will slide where you push. Landing is the whole art. The plates throw you across.' },
    { id: 'drift', at: [CX, 80], radius: 3, speaker: 'INES', text: 'It is ice with leaves on. Let go of the stick before you reach the edge, and let it carry you.' },
    { id: 'tree', at: [CX, CZ + 10], radius: 3, speaker: 'SIGNAL HOUSE', text: 'The great tree. The fruit is at its foot, in the grove, where there is grip. Take it and the whole bubble will know. The gate will not open for anything else.' },
    { id: 'fruit', at: [CX, CZ + 5], radius: 1.5, speaker: 'INES', text: 'It is warm. They are all awake, now, and the flyers will come.' },
    { id: 'north', at: [CX, 30], radius: 3, speaker: 'HULL', text: 'The glass is gone in the north. White light. The gate is on the far side of the north island.' },
    { id: 'panel', at: secret ? secret.panel : [0, 0], radius: 3, speaker: 'HULL', text: 'The panel in the greenhouse wall rings hollow.' },
  ],
  triggers: [
    { id: 'harvest', when: 'key:brass', do: [{ wake: 'gills' }, { exit: { set: 'unlock' } }, { objective: 'You have the fruit. They are awake. The vent to the north island is on the tree' }, { shake: 2 }] },
    { id: 'tree', when: 'enter', at: [CX, CZ + 10], radius: 3, do: [{ objective: 'The tree: the fruit is at the foot of the trunk, in the grove' }] },
  ],
  quality: { enemies: [14, 70], botSeconds: [30, 1200], mechanics: ['heights', 'triggers', 'hazards', 'keys>=1'], skins: 4, enemyKinds: { tollbearer: 6, gill: 5, gaunt: 3, chorister: 3, bellhand: 1, sexton: 1 },
    scaleClass: 'MIXED', tallReason: 'the glass of the bubble is 20 m of living wall round the arena',
    introduces: 'drift: a floor with almost no grip, so that you slide where you push and landing from a vent is an art' },
};
MAP.drops = { scale: 1, keep: [[CX - 3, 91, CX + 3, 93]] };
console.log('C1E4M05: enemies', ents.filter((e) => e.type === 'enemy').length, 'vents', VENTS.length);
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C1E4M05', lane: [...(laneOf('C1E4M05') ?? [])], keep: [], plan: [] };
ENC.apply(MAP);

export default MAP;
export { L, VENTS, byId, TREE, CX, CZ };
