// C2M09 SOUNDING DEEP GATE: the cavern-city entry; Act B opens. (Campaign 2, Act B THE SOUNDING DEEP; design/ACTB.md.)
// The stair from the spire comes out in the DARK (atmosphere.dark: the hand lantern, L, is introduced here: a dark tunnel, oil on the floor, three Gaunts asleep that see you from 6 m unlit and 24 m lit), and the tunnel opens on the rim
// of a BOWL: an amphitheatre 60 m across, a flat plaza at the bottom ringed by six terraces, lit in rings by hung lanterns, a city of stone houses climbing the north half of it right up to the roof of the cave, peaceful Vael
// walking its alleys. The way down is the west ramp (a Bulwark Shell holds it); on the third terrace of the far side stands the first ZEALOT, asleep, with its lance upright; two more sleep at the foot of the bowl by the pulpit.
// A lever on the pulpit opens the door of the drum at the middle of the plaza: the gate. Scale class SET-PIECE (the tunnel, the grotto and the drum are roofed; the bowl is open to the painted roof of the cave: sky_deep).
// SHAPE: no rectangles at all: a winding tunnel (the cave kit's finger), a start grotto (blob), the amphitheatre (plaza + six terraces + two ramps, tools/mapkit/cave.mjs) and houses placed by a seeded scatter on the terraces.
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';
import { setCell, box, placer } from '../tools/mapkit/c2.mjs';
import { blob, finger, amphitheatre, skinWalls, rng } from '../tools/mapkit/cave.mjs';

const W = 104, H = 92, L = new Level(W, H, { fill: '[' }); L.usedHeights = true; L.usedCeil = true;
const CX = 58, CZ = 50, RX = 31, RZ = 27;
const ROCK = '[', FLOW = '{', PLAZA_C = ':', TERR = 's', RIM = '@', CITY = ']', MARBLE = '|', SLAB = '^';
const polar = (u, th) => [Math.round(CX + u * RX * Math.cos(th)), Math.round(CZ + u * RZ * Math.sin(th))];       // 0 = east, pi/2 = south, pi = west, -pi/2 = north
const S = 0, N = Math.PI, EAST = Math.PI / 2, WEST = -Math.PI / 2;

// ---- the bowl: plaza (3 m down), six terraces of a metre, a promenade on the rim 6 m up; ramps west and east -------------------------------------------------------------------------------------------------------------------------------------------
const bowl = amphitheatre(L, CX, CZ, { rx: RX, rz: RZ, steps: 6, rise: 2, bottom: 6, plaza: 0.5, ramps: 2, rampAt: Math.PI, rampWidth: 4, seed: 91, rough: 0.1, ch: TERR });
const TOP = bowl.top;                                                                                               // 18 units = 9 m
for (const [x, z] of bowl.cells) { const st = bowl.step(x, z); if (st === 0) setCell(L, x, z, PLAZA_C); else if (st === 6 && !bowl.ramp(x, z)) setCell(L, x, z, RIM); }      // the plaza is wet cobble, the promenade flowstone (the whole bowl is OPEN: its roof is the painted cave roof, sky_deep)
// ---- the start grotto and the dark tunnel to the rim (roofed low: 12 to 14 m would be wasted on a passage) ---------------------------------------------------------------------------------------------------------------------------------------------------
const grotto = blob(L, 12, 22, 8, 6, { seed: 92, rough: 0.2, ch: FLOW, h: TOP, lidMid: 30, lidEdge: 24 });
const tunnel = finger(L, [14, 24], [30, 38], { seed: 93, width: 4, wobble: 3, ch: FLOW, h: TOP, lid: 25 });
// ---- the houses: seeded blocks of city stone on the terraces of the north half (never on a ramp or the rim or the plaza, an alley of two cells all round) ------------------------------------------------------------------------------------------
const houses = [], rnd = rng(7);
const free = (x, z) => bowl.step(x, z) != null;
for (let n = 0, tries = 0; n < 26 && tries < 12000; tries++) {
  const w = 4 + Math.floor(rnd() * 3), d = 2 + Math.floor(rnd() * 2), x0 = 28 + Math.floor(rnd() * 60), z0 = 24 + Math.floor(rnd() * 22);
  const th = Math.atan2((z0 + d / 2 - CZ) / RZ, (x0 + w / 2 - CX) / RX); if (th > -0.2 || th < -2.95) continue;      // the north: from the north-east round to the north-west
  let ok = true;
  for (let z = z0 - 1; z <= z0 + d && ok; z++) for (let x = x0 - 1; x <= x0 + w && ok; x++) { if (!free(x, z) || bowl.ramp(x, z)) { ok = false; break; } if (bowl.step(x, z) < 2 || bowl.step(x, z) > 5) { ok = false; break; } }
  if (ok && houses.every((q) => x0 > q[2] + 3 || x0 + w < q[0] - 2 || z0 > q[3] + 3 || z0 + d < q[1] - 2)) { houses.push([x0, z0, x0 + w - 1, z0 + d - 1]); box(L, [x0, z0, x0 + w - 1, z0 + d - 1], CITY); n++; }
}
// ---- the drum: the gate in the middle of the plaza (marble and bronze, a door on the south side opened from the pulpit) ----------------------------------------------------------------------------------------------------------------------------
const DX = 58, DZ = 50, PLAZA = bowl.height(DX, DZ);
box(L, [DX - 3, DZ - 2, DX + 3, DZ + 2], MARBLE, PLAZA); box(L, [DX - 2, DZ - 1, DX + 2, DZ + 1], SLAB, PLAZA, PLAZA + 12);
L.door(DX, DZ + 2, { remote: true }); L.height([DX, DZ + 2, DX, DZ + 2], PLAZA);
// ---- the pulpit: a block of city stone on the south-east of the plaza with the lever set in its west face ------------------------------------------------------------------------------------------------------------------------------------------------------
const PUL = [68, 57, 70, 58]; box(L, PUL, CITY, PLAZA);
// ---- the store: a secret room off the north promenade (a panel in the wall beside the first lamp) --------------------------------------------------------------------------------------------------------------------------------------------------------------
const nTop = (() => { let zz = 99; for (const [x, z] of bowl.cells) if (x === 58 && z < zz) zz = z; return zz; })();
const SEC = { panel: [58, nTop - 1], cells: [] };
for (let z = nTop - 5; z <= nTop - 2; z++) for (let x = 55; x <= 61; x++) { setCell(L, x, z, SLAB, TOP, TOP + 12); SEC.cells.push([x, z]); }
setCell(L, 58, nTop - 1, 'S', TOP);
// ---- the walls: the rock round the north half is city (lamp niches), the rest stays rock --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
skinWalls(L, ROCK, (x, z) => (z < CZ - 6 && x > 36 && x < 80 ? CITY : ROCK));
const P = placer(L); L.put(10, 22, '@'); P.reserve(10, 22);
const { E, P: PK, PR } = P;
// ---- the lamps of the bowl: rings of hung lanterns ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (let k = 0; k < 16; k++) { PR('lantern', ...polar(0.95, (k * Math.PI) / 8)); if (k % 2) PR('lantern', ...polar(0.72, (k * Math.PI) / 8 + 0.2)); PR('lantern', ...polar(0.55, (k * Math.PI) / 8 + 0.1)); }
for (const [x, z] of [[DX - 4, DZ + 3], [DX + 4, DZ + 3], [DX - 4, DZ - 3], [DX + 4, DZ - 3], [66, 57], [DX, DZ + 6]]) PR('lantern', x, z);          // the plaza: round the drum and the pulpit
PR('lantern', 13, 22); PR('lantern', 20, 28);                                                                                                  // the grotto is lit by the one lantern a Marrow crew left hung
PR('lantern', 33, 40); PR('lantern', 32, 44);                                                                                                  // the mouth of the tunnel
// ---- oil, health, armour -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
PK('oil', 12, 24); PK('oil', 19, 29); PK('oil', 26, 34); PK('oil', 30, 40);
for (const [x, z] of [polar(0.9, -2.6), polar(0.9, 2.5), polar(0.9, -0.6), polar(0.6, 0.6), polar(0.6, 2.2), polar(0.6, -1.4), [DX - 6, DZ + 4], [DX + 6, DZ + 4]]) PK(x % 3 ? 'health_small' : 'health_large', x, z);
PK('armor_vest', ...polar(0.86, 2.9)); PK('armor_vest', ...polar(0.6, 1.2)); PK('armor_vest', ...polar(0.6, -2.0));
PK('armor_vest', 56, 20); PK('health_large', 60, 20); PK('ammo_shell', 56, 19); PK('ammo_rivet', 60, 19); PK('oil', 58, 19); PK('ammo_flare', 58, 21);                      // the store
// ---- the tunnel: sleepers --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
E('gaunt', 18, 28, { facing: EAST }); E('gaunt', 22, 31, { facing: EAST }); E('gaunt', 26, 34, { facing: EAST }); E('tollbearer', 28, 36, { facing: EAST });
// ---- the rim: porters on the promenade, a singer on a house roof's terrace --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [u, th, k] of [[0.96, -2.45, 'tollbearer'], [0.96, -2.0, 'tollbearer'], [0.96, -1.5, 'gaunt'], [0.96, -1.0, 'tollbearer'], [0.96, -0.5, 'gaunt'], [0.96, 2.6, 'gaunt'], [0.96, 2.2, 'tollbearer']]) E(k, ...polar(u, th), { facing: th > 0 ? WEST : S });
E('chorister', ...polar(0.9, -1.7)); E('chorister', ...polar(0.9, -0.9));
// ---- the west ramp: the Bulwark Shell holds it, with its porters ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
E('bulwark', ...polar(0.78, Math.PI), { facing: -Math.PI / 2 }); E('tollbearer', ...polar(0.84, 3.0)); E('tollbearer', ...polar(0.84, 3.28));
// ---- the terraces: the south half is open ground, the north half is alleys between houses -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [u, th, k] of [[0.84, 2.0, 'tollbearer'], [0.84, 1.6, 'gaunt'], [0.84, 1.2, 'tollbearer'], [0.84, 0.8, 'bellhand'], [0.7, 2.3, 'gill'], [0.7, 1.9, 'gaunt'], [0.7, 1.3, 'tollbearer'], [0.7, 0.9, 'gill'], [0.7, 0.4, 'tollbearer'], [0.62, 2.6, 'bellhand'], [0.62, 0.1, 'gaunt'], [0.62, -0.3, 'gill'], [0.7, -0.9, 'tollbearer'], [0.7, -1.6, 'gaunt'], [0.7, -2.2, 'tollbearer'], [0.78, -0.2, 'tollbearer'], [0.78, 0.3, 'gaunt']]) E(k, ...polar(u, th));
E('zealot', ...polar(0.72, -0.1), { facing: Math.PI + 0.3 });                                                              // the first Zealot: the third terrace of the east side, asleep, its lance upright
// ---- the plaza: sleepers by the pulpit, the Zealots, a Chorister to answer the shots ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
E('zealot', 64, 58, { facing: WEST }); E('zealot', 56, 63, { facing: WEST });
for (const [x, z, k] of [[50, 58, 'tollbearer'], [52, 44, 'tollbearer'], [64, 44, 'tollbearer'], [48, 52, 'gaunt'], [66, 46, 'gaunt'], [58, 60, 'gaunt'], [44, 50, 'bellhand']]) E(k, x, z);
E('chorister', 62, 62); PK('health_large', 63, 56); PK('health_large', 66, 61); PK('armor_vest', 60, 57);
// ---- the folk: walking the alleys, never armed -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [u, th] of [[0.9, -2.2], [0.88, -1.8], [0.88, -1.3], [0.84, -0.9], [0.8, -1.9], [0.8, -1.2], [0.74, -2.4], [0.9, -0.7], [0.9, -2.5], [0.62, -1.6]]) E('vaelfolk', ...polar(u, th));
// ---- the way: waypoints the routes use (printed) ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [37,50], radius: 2, cells: ENC.around([37,50], { n: 3, min: 6, max: 10 }), kind: 'g' });
// ---- end PT-052 ----

const MAP = {
  id: 'C2M09', name: 'Sounding Deep Gate', version: 1, ceilingHeight: 4.2, par: { time: 420 },
  atmosphere: { look: 'deepgate', sky: 'deep', dark: true, fog: '#06080e', fogDensity: 0.012 },
  lantern: { oil: 50, max: 90 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'SOUNDING DEEP GATE', lines: ['The stair from the spire came out in the dark.', 'Below it is a bowl of lamps, and a city built round the bowl.'] },
  outro: 'The door in the drum opens on a stair wide enough for two carts.',
  objective: 'Follow the tunnel with the lantern lit (L). The way down is the ramp on the west of the bowl: the lever is at the bottom, and the gate is the drum',
  ...L.layers(),
  secrets: [{ id: 'store', panel: SEC.panel, cells: SEC.cells }],
  groups: [],
  entities: [...P.ents,
    { type: 'switch', id: 'pulpit', at: [67, 57], wall: 'east', once: true, do: [{ open: [DX, DZ + 2] }, { objective: 'The drum is open: the gate is in the middle of the plaza' }, { message: 'open' }] },
    { type: 'exit', at: [DX, DZ - 1], dest: 'next' }],
  scenery: [{ kind: 'cityface', at: [40, 10], y: 8, scale: 1.3 }, { kind: 'cityface', at: [60, 6], y: 8, scale: 1.5 }, { kind: 'cityface', at: [80, 11], y: 8, scale: 1.3 }, { kind: 'cityface', at: [92, 40], y: 7, yaw: -1.57, scale: 1.2 }],
  messages: [
    { id: 'start', at: [11, 22], radius: 4, speaker: 'INES', text: 'Dark. The tin on the floor is a Marrow tin with the label gone. Somebody carried it this far down and put it where it would be found.' },
    { id: 'lamp', at: [19, 29], radius: 3, speaker: 'HULL', text: 'The lantern is L. Gaunts and Gills find you by eye: from 6 metres with it out, 24 with it lit. Tollbearers follow the Hush and do not care about light.' },
    { id: 'mouth', at: [31, 39], radius: 3, speaker: 'INES', text: 'The tunnel opens on a bowl lit in rings. The far side is houses stacked up to the roof, a window lit in every one. There are Vael on every terrace, walking.' },
    { id: 'folk', at: [38, 32], radius: 4, speaker: 'INES', text: 'None of them has a bell. They are carrying baskets and cord and they have not looked up. Do not shoot what is walking.' },
    { id: 'zealot', at: [31, 44], radius: 4, speaker: 'INES', text: 'One on the east terraces is standing still with a lance as long as a mast. Armoured, and its feet apart, the way a man stands who means to stay.' },
    { id: 'ramp', at: [36, 50], radius: 3, speaker: 'HULL', text: 'The west ramp is the only way down. A Bulwark Shell is on it: the plate on its front stops a shot. Hit it from the side, or when it opens to strike.' },
    { id: 'plate', at: [46, 57], radius: 3, speaker: 'RINGING PLATE', text: 'Run a nail down it: nine hundred and four voices owed by this district. The count beside it is two hundred short, and it was the same last year.' },
    { id: 'pulpit', at: [64, 56], radius: 4, speaker: 'INES', text: 'Two sleepers by a pulpit, standing with their lances grounded. One has its hood back. It looks young.' },
    { id: 'drum', at: [DX, DZ + 5], radius: 3, speaker: 'HULL', text: 'The gate is the drum in the middle of the plaza. Its door is on the pulpit lever, and nothing else opens it.' },
    { id: 'watch', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'A bell is rung once somewhere above, and the doors of the lower terraces open. The watch comes down the steps.' },
    { id: 'open', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The door has opened. It was shut with a counterweight, not a lock.' },
    { id: 'hollow', at: [58, nTop + 1], radius: 2, speaker: 'HULL', text: 'The north wall of the promenade rings hollow behind the middle lamp.' },
    { id: 'zealotword', at: [66, 56], radius: 3, speaker: 'A ZEALOT', text: 'I was not made to carry this. I asked for it.' },
    { id: 'end', at: [DX, DZ - 1], radius: 2, speaker: 'INES', text: 'A stair down, wide enough for two carts side by side, and a draught coming up it that smells of wet stone and cold oil.' },
  ],
  triggers: [
    { id: 'rim', when: 'enter', at: [33, 40], radius: 4, do: [{ objective: 'The bowl: the west ramp is the way down. Put the lantern out (L) to save oil' }] },
    { id: 'plaza', when: 'enter', at: [DX, DZ + 8], radius: 8, do: [{ objective: 'The lever is on the pulpit, south-east of the plaza. The gate is the drum' }, { message: 'watch' },
      ...[[62, 55, 'gaunt'], [64, 61, 'tollbearer'], [60, 65, 'gaunt'], [55, 66, 'tollbearer'], [67, 62, 'tollbearer'], [69, 55, 'gaunt'], [52, 64, 'tollbearer'], [70, 60, 'gaunt']].map(([x, z, kind]) => ({ spawn: { kind, at: [x, z], group: 'watch', facing: N } }))] },
  ],
  quality: { enemies: [30, 70], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 6, enemyKinds: { tollbearer: 8, gaunt: 7, zealot: 3, gill: 3, chorister: 2, bellhand: 2, bulwark: 1 },
    scaleClass: 'SET-PIECE', reason: 'the lever is at the bottom of a bowl lit like a stage: the player crosses open ground under the whole city, with the tunnel and the drum as the roofed beats either side', introduces: 'the Sounding Deep: a dark tunnel and the hand lantern, then an amphitheatre city 60 metres across with peaceful Vael in its alleys, and the first Zealots' },
};
MAP.drops = { scale: 1, keep: [] };
const where = (k) => P.ents.filter((e) => e.kind === k).map((e) => e.at.join(','));
console.log('C2M09: enemies', P.ents.filter((e) => e.type === 'enemy' && e.kind !== 'vaelfolk').length, 'folk', P.ents.filter((e) => e.kind === 'vaelfolk').length, 'houses', houses.length, 'nTop', nTop, 'plaza', PLAZA, 'top', TOP);
console.log('zealots', where('zealot').join(' | '), '| bulwark', where('bulwark').join(' | '));
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C2M09', lane: [...(laneOf('C2M09') ?? [])], keep: [], plan: [{"from":"tollbearer","to":"gaunt","pick":"spread","n":1}] };
ENC.apply(MAP);

export default MAP;
