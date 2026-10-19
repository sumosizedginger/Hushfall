// C2M03 CANTOR OUTPOST: fortified assault; first view of the Vael as people. (Campaign 2, Act A THRESHOLD.)
// A fort set into the end of a gorge, in the plan of a five-pointed star. You come up the gorge under the guns of two terraces (Bellhands on both), across a dry ditch by the only bridge, to a gate that is SHUT: its lever is in a roofed hut at the north end of the east terrace.
// Inside, the court is one great roofed hall in the star's shape (the points are raised platforms, the Choristers' perches), with a round KEEP on a plinth in the middle: the bell house. In the heart of the keep is a cage with three Vael in it, the first you meet as people: THE TENDER (a grave-keeper put there
// for not singing at a burying) and two others who stopped. They have no weapon and they do not fight; a latch outside the cage opens it. Freeing them opens the NORTH GATE, which is the way out. The Songkeepers who hold the fort are Bulwark Shells (two) in the court under an Acolyte's ward, and Choristers on the platforms.
// SHAPE: a star (five points, the south notch is the gate), a round keep in the middle (the big thing), a ditch, a bridge, two terraces 4 m up; heights 0 / 2 / 3 / 5 / 6 m; lids 6 m / 8 m / 9 m. Scale class MIXED (the court and the keep are roofed: about 50%).
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';
import { setCell, ellipse, box, ramp, placer, ring } from '../tools/mapkit/c2.mjs';

const W = 96, H = 100, L = new Level(W, H, { fill: '!' }); L.usedHeights = true; L.usedCeil = true;
const G = 4, D = 0, T = 12, CT = 6, PF = 10, CX = 46, CZ = 37, ROUT = 21, RIN = 12.5;
// ---- the gorge, its two terraces (a ramp each), the ditch with its bridge and the two ramps out of it --------------------------------------------------------------------------------------------------------------------------------------------
box(L, [36, 62, 56, 92], '(', G);
for (const [cx, cz, rx, rz] of [[40, 74, 2, 1.5], [52, 72, 2.5, 1.5], [44, 82, 2, 1.5], [51, 86, 2, 1.5], [39, 87, 1.5, 1.5], [47, 68, 1.5, 1.2]]) ellipse(L, cx, cz, rx, rz, '!', G);          // rocks of fused glass: cover
box(L, [26, 64, 35, 84], '(', T); ramp(L, [28, 85, 35, 92], 'z', T, G, '(');                                    // the west terrace (the Choristers) and its ramp down to the gorge
box(L, [57, 64, 66, 84], '(', T); ramp(L, [57, 85, 64, 92], 'z', T, G, '(');                                    // the east terrace (the Bellhands) and its ramp
box(L, [36, 56, 56, 61], '(', D); box(L, [44, 56, 48, 61], 's', G);                                              // the ditch (2 m deep, dry) and the bridge across it
ramp(L, [37, 57, 40, 62], 'z', D, G, '('); ramp(L, [52, 57, 55, 62], 'z', D, G, '(');                           // the ramps out of the ditch (south bank)
box(L, [36, 53, 56, 55], '%', G);                                                                               // the scarp: the fort's south face
// ---- the hut over the east terrace: roofed, the gate lever inside --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
box(L, [58, 57, 65, 63], '%', T); box(L, [59, 58, 64, 62], ')', T, 18); setCell(L, 61, 63, ')', T, 18); setCell(L, 62, 63, ')', T, 18);
// ---- the star court: a hall in the plan of a five-pointed star, its points raised platforms, a round keep on a plinth in the middle -----------------------------------------------------------------------------------------------------
const rs = (th) => { const u = ((((th + Math.PI / 2) / (2 * Math.PI)) * 5 + 0.5) % 1 + 1) % 1, tri = 1 - Math.abs(2 * u - 1); return RIN + (ROUT - RIN) * tri; };       // the star's radius at an angle: a point at -90 degrees (north) and every 72 degrees round
const PTS = [-90, -18, 54, 126, 198].map((d) => [Math.round(CX + (ROUT - 4) * Math.cos(d * Math.PI / 180)), Math.round(CZ + (ROUT - 4) * Math.sin(d * Math.PI / 180))]);
const hall = [], wall = [];
for (let z = CZ - 28; z <= CZ + 28; z++) for (let x = CX - 28; x <= CX + 28; x++) {
  const dx = x + 0.5 - CX, dz = z + 0.5 - CZ, r = Math.hypot(dx, dz), th = Math.atan2(dz, dx), s = rs(th);
  if (r <= s) hall.push([x, z, r]); else if (r <= s + 3.2) wall.push([x, z]);
}
for (const [x, z] of wall) setCell(L, x, z, '%', CT);
for (const [x, z, r] of hall) {
  let h = CT;
  if (r <= 11.5) h = CT + Math.max(0, Math.min(4, Math.round(11.5 - r)));                                         // the plinth: a stair a cell up to the keep
  for (const [px, pz] of PTS) { const d = Math.hypot(x + 0.5 - px, z + 0.5 - pz); h = Math.max(h, CT + Math.max(0, Math.min(4, Math.round(7 - d)))); }    // the five platforms: a stair ring up to a perch 2 m above the floor
  setCell(L, x, z, ')', h, 18);                                                                                    // basalt flags (a roofed floor: the court is under its vault)
}
// the keep: wall ring, interior at the top of the plinth, the south entrance, the cage in the middle
for (const [x, z, r] of hall) { if (r > 6.4 && r <= 7.9) { const dx = x + 0.5 - CX; if (!(z + 0.5 > CZ && Math.abs(dx) <= 1.6)) setCell(L, x, z, '%', PF, 18); } else if (r <= 6.4) setCell(L, x, z, 'f', PF, 16); }
for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { if (Math.abs(dx) === 3 || Math.abs(dz) === 3) setCell(L, CX + dx, CZ + dz, '%', PF, 16); else setCell(L, CX + dx, CZ + dz, 'f', PF, 16); }
L.door(CX, CZ - 3, { remote: true }); setCell(L, CX, CZ - 3, 'D', PF);                                             // the cage door: the latch opens it
// ---- the south gate: a passage through the wall and the scarp from the court's notch to the bridge; heights 6, 5, 4 ----------------------------------------------------------------------------------------------------------------------------
box(L, [45, 50, 47, 55], ')', CT, 12); box(L, [45, 53, 47, 55], ')', CT - 1, 12);
L.door(46, 51, { remote: true }); setCell(L, 46, 51, 'D', CT); setCell(L, 45, 51, '%', CT); setCell(L, 47, 51, '%', CT);              // the gate: one cell wide, in a wall line
// ---- the north gate and the way out: a corridor through the wall from the north point to the exit ------------------------------------------------------------------------------------------------------------------------------------------------------
box(L, [45, 6, 47, 16], ')', CT, 12); L.door(46, 14, { remote: true }); setCell(L, 46, 14, 'D', CT); setCell(L, 45, 14, '%', CT); setCell(L, 47, 14, '%', CT);
ring(L, '!', (x, z) => (x >= 44 && x <= 48 && z >= 5 && z <= 17) || (x >= 57 && x <= 66 && z >= 56 && z <= 64) ? '%' : '!');
const P = placer(L); L.put(46, 91, '@'); P.reserve(46, 91);
const { E, P: PK, PR } = P;
// ---- the garrison -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[40, 76], [52, 78], [44, 84], [48, 70]]) E('tollbearer', x, z);                                      // the gorge: sleepers
for (const [x, z] of [[38, 80], [54, 74], [46, 88]]) E('gaunt', x, z);
E('gill', 42, 70); E('gill', 50, 80);
E('bellhand', 30, 70, { group: 'terrace' }); E('bellhand', 30, 78, { group: 'terrace' }); E('bellhand', 61, 70, { group: 'terrace' }); E('bellhand', 61, 78, { group: 'terrace' });
E('gaunt', 40, 59); E('gaunt', 52, 59);                                                                          // asleep in the ditch
E('tollbearer', 60, 60); E('tollbearer', 63, 60); E('bellhand', 62, 61);                                                  // the hut
E('bulwark', 42, 44); E('bulwark', 50, 44); E('acolyte', 46, 45);                                                         // the court: two shells under an Acolyte's ward at the keep's stairs
for (const [x, z] of [[36, 38], [56, 38]]) E('tollbearer', x, z); E('gaunt', 35, 44); E('gaunt', 57, 44);
for (const [x, z] of [[34, 32], [58, 32], [46, 26]]) E('gaunt', x, z);
E('chorister', PTS[0][0], PTS[0][1], { group: 'court' }); E('chorister', PTS[4][0], PTS[4][1], { group: 'court' });
E('tollbearer', 41, 32); E('tollbearer', 51, 32);                                                                          // the keep's corridor
E('gaunt', 46, 11); E('gaunt', 46, 7);                                                       // the way out
// the three in the cage: THE TENDER and two who stopped singing (peaceful: they never fight; they run from a shot)
E('vaelfolk', 46, 37, { group: 'caged' }); E('vaelfolk', 45, 36, { group: 'caged' }); E('vaelfolk', 47, 38, { group: 'caged' });
// ---- supplies and furniture ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[46, 90], [44, 76], [50, 70], [46, 60], [31, 74], [61, 74], [46, 52], [46, 46], [38, 40], [54, 40], [46, 31], [46, 12]]) PK(x % 3 ? 'health_small' : 'health_large', x, z);
PK('armor_vest', 46, 58); PK('armor_vest', 46, 29); PK('armor_vest', 61, 62);
for (const [x, z] of [[40, 46], [52, 46], [36, 38], [56, 38], [34, 44], [58, 44], [40, 26], [52, 26], [43, 20], [49, 20]]) PR('pillar', x, z, { skin: '%' });
for (const [x, z] of [[46, 49], [38, 40], [54, 40], [46, 29]]) PR('lamp', x, z);
for (const [x, z] of [[40, 48], [52, 48], [45, 52], [47, 52], [61, 61]]) PR('lantern', x, z);
for (const [x, z] of [[38, 36], [54, 36]]) PR('bellnode', x, z);                                                          // bells on stands: the fort's own, not part of any shield
PR('bellnode', 46, 27);
// ---- the secret: a niche behind the keep's north wall: the Songkeepers' reliquary of grave-clothes (a cache and a plate) ----------------------------------------------------------------------------------------------------------------------------
const SEC = { panel: [46, 24], cells: [[45, 22], [46, 22], [47, 22], [45, 23], [46, 23], [47, 23]] };
{ for (const [x, z] of SEC.cells) setCell(L, x, z, ')', CT, 14); box(L, [44, 21, 48, 21], '%', CT); box(L, [44, 22, 44, 23], '%', CT); box(L, [48, 22, 48, 23], '%', CT); box(L, [44, 24, 48, 24], '%', CT); setCell(L, 46, 24, 'S', CT);
  PK('armor_vest', 45, 22); PK('health_large', 47, 22); PK('ammo_shell', 45, 23); PK('ammo_rivet', 47, 23); PK('ammo_flare', 46, 22); }
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);

// ---- end PT-052 ----

const MAP = {
  id: 'C2M03', name: 'Cantor Outpost', version: 1, ceilingHeight: 4.2, par: { time: 480 },
  atmosphere: { fog: '#a8928c', fogDensity: 0.007, sky: 'anselm', look: 'outpost' },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'CANTOR OUTPOST', lines: ['Five points, a ditch and one bridge.', 'Something in the middle of it is being kept.'] },
  outro: 'Next: the Tuning Fork Fields, on the road the Tender named.',
  objective: 'The gate is shut: its lever is in the hut at the north end of the east terrace',
  ...L.layers(),
  secrets: [{ id: 'reliquary', panel: SEC.panel, cells: SEC.cells }],
  groups: [{ name: 'terrace', rect: [26, 64, 66, 84] }, { name: 'court', rect: [24, 14, 68, 52] }],
  entities: [...P.ents,
    { type: 'switch', id: 'gate', at: [61, 58], wall: 'north', once: true, do: [{ open: [46, 51] }, { message: 'gate' }, { objective: 'The gate is open: across the bridge and into the court' }, { shake: 1.2 }] },
    { type: 'switch', id: 'latch', at: [46, 31], wall: 'north', once: true, do: [{ open: [46, 34] }, { open: [46, 14] }, { message: 'freed' }, { message: 'silent' }, { objective: 'The north gate is open: the corridor to the exit' }, { shake: 1 }] },
    { type: 'exit', at: [46, 7], dest: 'next' }],
  scenery: [{ kind: 'spire', at: [20, 4] }, { kind: 'spire', at: [74, 8] }, { kind: 'spire', at: [46, -20] }],
  messages: [
    { id: 'start', at: [46, 91], radius: 3, speaker: 'INES', text: 'A fort in the glass: five points, a ditch, one bridge. Everything on it faces the gorge. Nobody built it for visitors.' },
    { id: 'terrace', at: [46, 80], radius: 4, speaker: 'HULL', text: 'Bellhands on both terraces, 4 m up, covering the whole gorge. The rocks are the only cover.' },
    { id: 'bridge', at: [46, 63], radius: 3, speaker: 'HULL', text: 'The gate is shut. The lever that works it is in the hut on the east terrace, over the ditch. The terrace ramps are at the south end.' },
    { id: 'gate', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'The gate grinds open, a hand at a time. Something in the court hears it.' },
    { id: 'court', at: [46, 48], radius: 3, speaker: 'INES', text: 'A hall with the roof left on and the middle left open to the floor. Five perches, one round keep. This is where they ring things.' },
    { id: 'keep', at: [46, 43], radius: 3, speaker: 'INES', text: 'Something is shut in the middle of that keep and it is not one of them. They do not cage their own. Or they do, and I do not know which.' },
    { id: 'latch', at: [46, 32], radius: 2, speaker: 'HULL', text: 'The latch outside the cage. A cage door has no business with a lever this size.' },
    { id: 'freed', at: [0, 0], radius: 0.1, speaker: 'THE TENDER', text: 'You do not sing. Good. I keep the dead, and they shut me in the bell house for not singing at a burying. The north gate answers to me. It is open.' },
    { id: 'silent', at: [0, 0], radius: 0.1, speaker: 'A SILENT', text: 'We stopped. That is the whole of what we did.' },
    { id: 'way', at: [46, 11], radius: 3, speaker: 'INES', text: 'The Fields, she said. I have not seen a field on this world yet. I do not know what they grow in them.' },
    { id: 'hollow', at: [46, 23], radius: 2, speaker: 'HULL', text: 'The north wall of the keep rings hollow behind the pillar.' },
  ],
  triggers: [
    { id: 'terrace', when: 'enter', at: [46, 80], radius: 5, do: [{ wake: 'terrace' }] },
    { id: 'court', when: 'enter', at: [46, 47], radius: 3.5, do: [{ wake: 'court' }, { objective: 'Something is shut in the keep. The north gate stays closed until it is out' }] },
  ],
  quality: { enemies: [26, 70], botSeconds: [40, 700], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 6, enemyKinds: { tollbearer: 8, gaunt: 4, chorister: 2, bellhand: 4, bulwark: 2, acolyte: 1, gill: 2 },
    scaleClass: 'MIXED', tallReason: 'the court of the Outpost is a nave: nine metres to the vault over a star-shaped floor',
    introduces: 'the Vael as people: three of them in a cage at the heart of a fort, grave-keepers who stopped singing, who never fight, run from gunfire and must not be shot; freeing them (a latch outside the cage) opens the way out' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M03: enemies', P.ents.filter((e) => e.type === 'enemy' && e.kind !== 'vaelfolk').length, 'folk', P.ents.filter((e) => e.kind === 'vaelfolk').length);
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C2M03', lane: [...(laneOf('C2M03') ?? [])], keep: [], plan: [{"from":"gaunt","to":"tollbearer","pick":"spread","n":1}] };
ENC.apply(MAP);

export default MAP;
