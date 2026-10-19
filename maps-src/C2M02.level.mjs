// C2M02 GLASS STEPPE: wide-open traversal; the world is dying and quiet. (Campaign 2, Act A THRESHOLD; the Act's one SET-PIECE.)
// The floor of the dead sea: a plain of glass sand 2 m above two sunken CANALS (the old sea's drains, 2 m below the plain, five wide, with a ramp every thirty cells) and, down the middle, one slate CAUSEWAY 4 m up, six wide, running the whole way east. You cross it under watch: Choristers and
// Bellhands on four glass ridges (plateaus 5 m up) cover the road at 40 to 60 m, Drone-Gills hang over the plain, and along the causeway stand the Port Marrow people who were sent this way before you, spaced like fence posts, every one facing east. Two ways across: the causeway (fast, open, in plain view of the
// ridges) or the canals (a way up every thirty cells, no line of fire from the ridges, Gaunts in the dark). Three RELAY STATIONS (salt-plate halls: one off the north bank, one the causeway runs THROUGH, one off the south bank) each have a lever; the gate at the east end of the road opens
// when all three are thrown. Route: spawn -> up the ramp onto the road -> station one (north) -> the weigh-house (station two, on the road) -> station three (south) -> the road east -> the gate -> the court and the exit.
// Scale class SET-PIECE (open air; the stations are about 10% of the floor). Shape: a road above two trenches, four plateaus, glass groves; heights 0 / 2 / 4 / 5 m.
import { Level } from '../tools/mapkit/builder.mjs';
import { setCell, ellipse, box, ramp, placer, ring } from '../tools/mapkit/c2.mjs';

const W = 132, H = 72, L = new Level(W, H, { fill: '!' }); L.usedHeights = true; L.usedCeil = true;
const PL = 4, CS = 8, CN = 0, RG = 10;
// ---- the plain, with patches of salt crust and silt so it is not one colour --------------------------------------------------------------------------------------------------------------------------------------------------------------------
box(L, [8, 6, 124, 66], '(', PL);
for (const [cx, cz, rx, rz, c] of [[24, 12, 10, 4, 'l'], [58, 58, 12, 5, 'l'], [84, 12, 9, 4, 'm'], [112, 56, 8, 5, 'm'], [40, 40, 6, 3, 'l'], [96, 30, 8, 3, 'l'], [16, 56, 8, 4, 'm'], [76, 44, 7, 3, 'l']]) ellipse(L, cx, cz, rx, rz, c, PL);
// ---- the canals: two trenches 2 m under the plain, a ramp up on each bank every thirty cells (the banks' ramps are offset so you walk along the trench between them) ---------------------------------------------------------------------------
box(L, [10, 21, 120, 25], '(', CN); box(L, [10, 47, 120, 51], '(', CN);
for (const x of [30, 62, 94]) { ramp(L, [x, 17, x + 3, 21], 'z', PL, CN, '('); ramp(L, [x, 51, x + 3, 55], 'z', CN, PL, '('); }          // the outer banks (north bank of the north canal, south bank of the south canal)
for (const x of [46, 78]) { ramp(L, [x, 25, x + 3, 29], 'z', CN, PL, '('); ramp(L, [x, 43, x + 3, 47], 'z', PL, CN, '('); }               // the inner banks (towards the road)
// ---- the causeway: slate, 4 m up, six wide, with ramps down on both sides now and then and a long ramp at the west end ------------------------------------------------------------------------------------------------------------------------------
box(L, [10, 33, 118, 38], 's', CS); ramp(L, [10, 33, 13, 38], 'x', PL, CS, 's');
for (const x of [24, 50, 88]) ramp(L, [x, 29, x + 3, 33], 'z', PL, CS, 's');
for (const x of [36, 76, 104]) ramp(L, [x, 38, x + 3, 42], 'z', CS, PL, 's');
// ---- four glass ridges: plateaus 3 m above the plain with one ramp each; the watchers stand on them ---------------------------------------------------------------------------------------------------------------------------------------------
ellipse(L, 40, 10, 9, 3.5, '(', RG); ramp(L, [38, 13, 41, 19], 'z', RG, PL, '(');
ellipse(L, 92, 10, 9, 3.5, '(', RG); ramp(L, [90, 13, 93, 19], 'z', RG, PL, '(');
ellipse(L, 52, 62, 9, 3.5, '(', RG); ramp(L, [50, 52, 53, 58], 'z', PL, RG, '(');
ellipse(L, 117, 61, 6.5, 3.5, '(', RG); ramp(L, [115, 52, 118, 58], 'z', PL, RG, '(');
// ---- the three relay stations: salt-plate halls ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const hall = (r, floor, lid, doorCells) => { box(L, [r[0] - 1, r[1] - 1, r[2] + 1, r[3] + 1], '$', floor); box(L, r, ')', floor, lid); for (const [x, z] of doorCells) setCell(L, x, z, ')', floor, lid); for (const [x, z] of [[r[0], r[1]], [r[2], r[1]], [r[0], r[3]], [r[2], r[3]]]) setCell(L, x, z, '$', floor); };
hall([14, 8, 25, 15], PL, 12, [[19, 16], [20, 16]]);                                                       // station one: off the north bank, its door on the plain
box(L, [60, 32, 72, 32], '$', CS); box(L, [60, 39, 72, 39], '$', CS); box(L, [60, 33, 72, 38], ')', CS, 16);   // station two, the weigh-house: the causeway runs through it (open at both ends)
hall([96, 56, 106, 64], PL, 12, [[100, 55], [101, 55]]);                                                  // station three: off the south bank
// ---- the gate and the court at the east end of the road ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
box(L, [119, 33, 119, 38], '$', CS); L.door(119, 35, { remote: true }); setCell(L, 119, 35, 'D', CS);
box(L, [120, 32, 128, 39], 's', CS);
// ---- the old shore: the plain's corners are cut away and outcrops of fused glass stand on it (cover, and the plain is not a rectangle) ------------------------------------------------------------------------------------------------------------------
for (const [cx, cz, rx, rz] of [[8, 6, 10, 7], [124, 6, 10, 7], [8, 66, 10, 7], [124, 66, 10, 7], [60, 5, 9, 2.5], [70, 67, 8, 2.5], [100, 5, 6, 2.2], [26, 67, 7, 2.2]]) ellipse(L, cx, cz, rx, rz, '!', PL);
for (const [cx, cz, rx, rz] of [[28, 17, 2.5, 2], [64, 11, 4, 3], [74, 17, 3, 2], [110, 14, 4, 3], [38, 29, 2, 1.5], [66, 28, 3, 1.5], [98, 29, 2.5, 1.5], [112, 29, 2, 1.5], [28, 43, 2.5, 1.5], [58, 42, 2, 1.5], [66, 44, 3, 1.5], [92, 43, 2.5, 1.5], [112, 42, 2, 1.5], [12, 62, 3, 2.5], [32, 60, 3, 2.5], [72, 60, 4, 3], [86, 56, 2.5, 2], [120, 20, 3, 2.5], [10, 44, 2, 2]]) ellipse(L, cx, cz, rx * 1.4, rz * 1.1, '!', PL);          // PT-052: the squeeze shaves the outcrops; these are a little broader so the plain keeps its blocks to run round
ring(L, '!', (x, z) => (x >= 13 && x <= 27 && z >= 7 && z <= 17) || (x >= 95 && x <= 107 && z >= 54 && z <= 66) ? '$' : '!');
const P = placer(L); L.put(8, 35, '@'); P.reserve(8, 35);
const { E, P: PK, PR } = P;
// ---- the queue: the people sent down the road before you, standing along it, all facing east ---------------------------------------------------------------------------------------------------------------------------------------------------
for (const x of [20, 28, 36, 44, 52, 56, 78, 84, 92, 100, 108, 114]) E('tollbearer', x, x % 16 < 8 ? 34 : 36, { facing: -Math.PI / 2 });
// ---- the watchers on the ridges --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
E('chorister', 36, 9, { group: 'ridgeN' }); E('bellhand', 44, 10, { group: 'ridgeN' }); E('bellhand', 88, 10, { group: 'ridgeN' }); E('chorister', 96, 11, { group: 'ridgeN' });
E('bellhand', 48, 62, { group: 'ridgeS' }); E('chorister', 56, 62, { group: 'ridgeS' }); E('bellhand', 115, 61, { group: 'ridgeS' }); E('chorister', 119, 61, { group: 'ridgeS' });
// ---- over the plain and in the trenches ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[30, 28], [56, 42], [74, 28], [100, 44], [44, 18], [84, 56]]) E('gill', x, z);
for (const [x, z] of [[22, 23], [38, 23], [54, 23], [70, 23], [86, 23], [102, 23], [36, 49], [66, 49], [98, 49]]) E('gaunt', x, z);
E('sexton', 20, 12); E('tollbearer', 17, 11); E('tollbearer', 23, 13); E('tollbearer', 98, 60); E('sexton', 104, 60); E('tollbearer', 101, 62);   // the stations' keepers
E('bellhand', 66, 36); E('tollbearer', 63, 35); E('gaunt', 70, 34);                                         // the weigh-house
E('gaunt', 121, 34); E('bellhand', 124, 35); E('tollbearer', 123, 37);                                      // the court
E('wardengraft', 76, 35, { facing: Math.PI / 2 }); E('bulwark', 123, 33);                                // the road's two wardens: one at the weigh-house's east door (it charges down the road), a shell at the court
for (const [x, z] of [[27, 31], [41, 31], [57, 40], [83, 31], [95, 40], [107, 31]]) E('gaunt', x, z);        // gaunts in the plain beside the road, asleep until the ridges wake
for (const [x, z] of [[46, 28], [80, 46], [100, 30]]) E('bellhand', x, z);                               // bellhands at the inner banks
// ---- supplies and furniture ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[11, 34], [30, 35], [47, 36], [68, 35], [87, 35], [113, 36], [20, 22], [64, 23], [100, 49], [57, 58], [20, 13]]) PK(x % 3 ? 'health_small' : 'health_large', x, z);
PK('armor_vest', 66, 37); PK('armor_vest', 22, 14); PK('armor_vest', 100, 60);
for (const [x, z] of [[44, 29], [46, 31], [49, 28], [52, 30], [80, 41], [83, 43], [86, 40], [92, 44], [34, 44], [32, 46], [66, 26], [68, 28], [108, 28], [110, 30]]) PR('pillar', x, z, { skin: '!' });         // glass groves: cover on the plain
for (const [x, z] of [[18, 10], [22, 10], [66, 34], [66, 37], [100, 58], [102, 62]]) PR('lantern', x, z);
for (const [x, z] of [[20, 11], [66, 35], [101, 60]]) PR('lamp', x, z);
for (const [x, z] of [[17, 14], [23, 14], [97, 63], [105, 63], [64, 34], [70, 37]]) PR('crate', x, z);
// ---- the secret: a hollow in the north wall of station three: a store the first party made (a panel in the station's north wall's neighbour) ---------------------------------------------------------------------------------------------
const SEC = { panel: [95, 60], cells: [[93, 59], [94, 59], [93, 60], [94, 60], [93, 61], [94, 61]] };
{ for (const [x, z] of SEC.cells) { setCell(L, x, z, ')', PL, 12); } box(L, [92, 58, 95, 58], '$', PL); box(L, [92, 62, 95, 62], '$', PL); box(L, [92, 59, 92, 61], '$', PL); setCell(L, 95, 59, '$', PL); setCell(L, 95, 61, '$', PL); setCell(L, 95, 60, 'S', PL);
  PK('armor_vest', 93, 59); PK('health_large', 94, 61); PK('ammo_shell', 93, 61); PK('ammo_rivet', 94, 59); PK('ammo_flare', 93, 60); }
// ---- rooms that are not boxes (tools/mapkit/shape.mjs; the routes prove nothing moved) ----
import { Shape, laneOf } from '../tools/mapkit/shape.mjs';
const S = new Shape(L, { lane: laneOf('C2M02'), keep: [[20, 8], [66, 33], [101, 64]] });                  // the relay levers' walls stay
S.hall([14, 8, 25, 15], { sides: { n: { w: 3, gap: 3, d: 2, heart: true }, w: { w: 3, gap: 3, d: 2 }, e: { w: 3, gap: 3, d: 2 } }, cut: 2 });
S.hall([96, 56, 106, 64], { sides: { s: { w: 3, gap: 3, d: 2, heart: true }, w: { w: 3, gap: 3, d: 2 }, e: { w: 3, gap: 3, d: 2 } }, cut: 2 });
S.chamfer([120, 32, 128, 39], 'ne se', 2);
console.log('C2M02 shape:', S.summary()); if (process.env.SHAPE_REPORT) console.log(S.report.skipped.join(String.fromCharCode(10)));
// ---- end shaping ----
// ---- PT-052 exemplar 2 (the Director's Plan, R3): a shorter crossing (the squeeze at the end of this file) and two ambushes on the road: the queue turns at the first stretch of the road, the canal gives up what lay in it on the second. The first try added twelve creatures and killed the bot on Hard, four were still too many for its ammunition gates, so the weight is the ambushes and a few more bolts at the start (the ridges are what the harpoon is for) ----
import { Encounters } from '../tools/mapkit/encounters.mjs';
const ENC = new Encounters(L), taken = P.ents.map((e) => e.at);
ENC.dropIn({ at: [58, 35], radius: 2.5, cells: ENC.around([58, 35], { n: 3, min: 6, max: 10, avoid: taken }), kind: 'tollbearer' });
ENC.dropIn({ at: [94, 35], radius: 2.5, cells: ENC.around([94, 35], { n: 2, min: 6, max: 10, avoid: taken }), kind: 'gaunt' });
// ---- end PT-052 ----

const MAP = {
  id: 'C2M02', name: 'Glass Steppe', version: 1, ceilingHeight: 4.2, par: { time: 420 },
  atmosphere: { fog: '#d8b49a', fogDensity: 0.0035, sky: 'anselm', look: 'steppe' },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 24, rivet: 90, bolt: 18, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'GLASS STEPPE', lines: ['East of the cliff there was a sea. The floor of it is a plain of glass.', 'There is one road across.'] },
  outro: 'Next: the Cantor Outpost. A fort stands in the glass at the far side, with a bell house at its heart.',
  objective: 'Cross the dry sea: three relay stations open the gate at the east end of the road',
  ...L.layers(),
  secrets: [{ id: 'store', panel: SEC.panel, cells: SEC.cells }],
  groups: [{ name: 'ridgeN', rect: [30, 5, 100, 13] }, { name: 'ridgeS', rect: [44, 58, 124, 66] }],
  entities: [...P.ents,
    { type: 'switch', id: 'relay1', at: [20, 8], wall: 'north', once: true, do: [{ message: 'relay1' }] },
    { type: 'switch', id: 'relay2', at: [66, 33], wall: 'north', once: true, do: [{ message: 'relay2' }] },
    { type: 'switch', id: 'relay3', at: [101, 64], wall: 'south', once: true, do: [{ message: 'relay3' }] },
    { type: 'exit', at: [127, 35], dest: 'next' }],
  scenery: [{ kind: 'spire', at: [20, -30] }, { kind: 'spire', at: [48, -44] }, { kind: 'spire', at: [74, -26] }, { kind: 'spire', at: [100, -50] }, { kind: 'spire', at: [126, -34] }, { kind: 'spire', at: [60, 110] }, { kind: 'spire', at: [140, 96] }],
  messages: [
    { id: 'start', at: [8, 35], radius: 3, speaker: 'INES', text: 'East of the cliff the sea bed runs flat to the horizon. Salt, glass, one road. A hundred metres on, the people on it are all facing the same way.' },
    { id: 'queue', at: [20, 35], radius: 4, speaker: 'INES', text: 'A queue along the road, spaced like fence posts, every one facing east. Nobody is leading it. Nobody is at the back.' },
    { id: 'ridges', at: [34, 35], radius: 4, speaker: 'HULL', text: 'Glass ridges north and south, and something standing on each. At sixty metres the carbine or the harpoon is the honest answer.' },
    { id: 'canals', at: [30, 28], radius: 4, speaker: 'HULL', text: 'The canals are two metres under the plain: no line of fire from the ridges, a way up every thirty cells. Gaunts like the dark.' },
    { id: 'plate', at: [20, 12], radius: 2.5, speaker: 'RINGING PLATE', text: 'A plate of ringing stone. Run a nail down it: twelve notes, then the same twelve. A count, or a name, or both.' },
    { id: 'lever', at: [20, 10], radius: 2, speaker: 'HULL', text: 'A relay lever: station one of three. The gate at the east end of the road wants all three thrown.' },
    { id: 'relay1', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'One of three. A hum comes up through the floor, once, and stops.' },
    { id: 'relay2', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'Two of three. The road is lit from underneath for a moment, east to west.' },
    { id: 'relay3', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'Three of three. Far to the east, a gate opens that nobody here could have heard.' },
    { id: 'needles', at: [66, 40], radius: 5, speaker: 'INES', text: 'The needles are nearer from here. At the foot of the nearest there is something taller than the rest, standing very still.' },
    { id: 'log', at: [101, 60], radius: 2.5, speaker: 'PELLEW, MATE (LOG)', text: 'Eleven left the beach. Nine at the first station. The queue does not look at you; we walked past it. Eight. East is the only road. Do not count.' },
    { id: 'hollow', at: [95, 60], radius: 2, speaker: 'HULL', text: 'The east wall of this recess rings hollow.' },
    { id: 'gate', at: [0, 0], radius: 0.1, speaker: 'INES', text: 'Three levers, one gate. Somebody built this road to be crossed one station at a time, and counted.' },
  ],
  triggers: [
    { id: 'ridges', when: 'enter', at: [30, 35], radius: 6, do: [{ wake: 'ridgeN' }, { wake: 'ridgeS' }, { objective: 'Ridges watch the road: run it, or use the canals. Stations are off both banks' }] },
    { id: 'gate', when: ['msg:relay1', 'msg:relay2', 'msg:relay3'], do: [{ open: [119, 35] }, { message: 'gate' }, { objective: 'The gate at the east end of the road is open: the court and the exit' }, { shake: 1.5 }] },
    { id: 'court', when: 'enter', at: [122, 35], radius: 4, do: [{ objective: 'The exit is at the east end of the court' }] },
  ],
  quality: { enemies: [26, 70], botSeconds: [40, 700], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 6, enemyKinds: { tollbearer: 8, gaunt: 6, chorister: 3, bellhand: 3, gill: 4, sexton: 1 },
    scaleClass: 'SET-PIECE', reason: 'the crossing of the dry sea is the point: one road, two hundred and forty metres of open ground and a watch on it that you cannot avoid, only choose how to meet',
    introduces: 'a long crossing under watch: snipers on glass ridges at sixty metres and a queue of the grafted along the road, two ways across (the causeway, fast and exposed, or the sunken canals, covered and ambushed) and three relay stations that open the gate at the end' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M02: enemies', P.ents.filter((e) => e.type === 'enemy').length);
MAP.roster = { id: 'C2M02', lane: [...(laneOf('C2M02') ?? [])], keep: [], plan: [] };
ENC.apply(MAP);
// ---- PT-052 exemplar 2: THE SQUEEZE (tools/mapkit/squeeze.mjs). The crossing was 132 columns of mostly empty glass for 58 creatures (nine per thousand cells); thirty-four columns are taken out where nothing stands (the crossing is a quarter shorter).
// Everything above this line is in the AUTHORING frame (the 132-column drawing); the shipped map is narrower and its routes are the same routes with the same cuts (`node tools/mapkit/squeeze.mjs routes C2M02`). Kit calls and the lane file stay in the authoring frame.
MAP.squeeze = { axis: 'x', cuts: [[5, 7], [15, 17], [19, 20], [24, 25], [26, 27], [31, 32], [35, 36], [37, 38], [39, 40], [43, 44], [51, 52], [55, 56], [58, 60], [65, 66], [71, 72], [73, 74], [77, 78], [79, 80], [82, 83], [85, 86], [90, 91], [99, 100], [103, 104], [106, 107], [109, 110], [112, 113], [116, 117], [118, 119], [122, 123], [126, 127], [128, 129]] };
// ---- end PT-052 exemplar 2 ----

export default MAP;
