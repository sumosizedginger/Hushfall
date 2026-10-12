// C2M08 THRESHOLD ASCENT: vertical assault; Act A closes: entering the Sounding Deep. (Campaign 2, Act A THRESHOLD.)
// A city built up a cliff of glass in four tiers, 12 m from the foot to the summit: the GATE HALL at the foot (roofed, the arrival), a stair house up to the first terrace, a LIFT up to the second, another stair house to the third, a second LIFT to the summit, and at the top a hollow SPIRE whose heart is a round well with a stair going down the wall:
// the way down at the top of the way up. The elite gauntlet of Act A: a Warden-Graft holds the first terrace (it charges along the terrace), a Bulwark Shell and a Chorister the second, the Weeping Mother the third (pools and a brood on the open terrace), a Bulwark and the spire's keepers on the summit. The lifts are worked from a lever on the car; a call lever on each landing
// brings the car back. The exit is in the spire, so nothing reaches it that has not ridden both lifts. No new engine: the lifts (moving floors) and the elites already built. Look: ascent (high, thin, clear air), sky anselm.
// SHAPE: four tiers up a cliff face, two stairs and two lifts as the links, a gate hall and a spire (roofed), terraces open; heights 0 / 3 / 6 / 9 / 12 m. Scale class MIXED (the gate hall, the stair houses and the spire are roofed: about 45%).
import { Level } from '../tools/mapkit/builder.mjs';
import { setCell, ellipse, ellipseCells, box, ramp, placer, ring } from '../tools/mapkit/c2.mjs';

const W = 72, H = 100, L = new Level(W, H, { fill: '!' }); L.usedHeights = true; L.usedCeil = true;
const XA = 16, XB = 55;
// ---- the gate hall at the foot (roofed, flags), the terraces (open slate), the summit court ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
box(L, [XA, 82, XB, 94], 'f', 0, 14);
box(L, [XA, 64, XB, 73], 's', 6); box(L, [XA, 50, XB, 59], 'f', 12, 26);                  // (the second tier is a roofed market hall: flags under a lid 7 m up)
 box(L, [XA, 32, XB, 41], 's', 18); box(L, [XA, 8, XB, 27], 's', 24);
for (const [cx, cz, rx, rz] of [[24, 68, 2, 1.5], [46, 70, 2.5, 1.5], [30, 55, 2, 1.5], [44, 53, 2, 1.5], [24, 36, 2, 1.5], [46, 38, 2.5, 1.5], [24, 20, 2.5, 2], [48, 22, 2.5, 2]]) ellipse(L, cx, cz, rx, rz, '!', 0);     // outcrops on the terraces (fused glass: cover)
// ---- the stair houses: roofed, a unit a row (8 rows for 4 m); the first on the west, the second on the east ---------------------------------------------------------------------------------------------------------------------------------------------------
ramp(L, [18, 74, 25, 81], 'z', 6, 0, ')', 22);                                                          // from the gate hall (z 82) up to the first terrace (z 73)
ramp(L, [46, 42, 53, 49], 'z', 18, 12, ')', 30);                                                        // from the second terrace (z 50) up to the third (z 41)
// ---- the lifts: a car of 4 x 4 cells in the gap between two tiers, low level with the tier below and high level with the tier above ----------------------------------------------------------------------------------------------------------------------------------------
const CAR1 = [], CAR3 = [];
for (let z = 60; z <= 63; z++) for (let x = 34; x <= 37; x++) { setCell(L, x, z, 'd', 6); CAR1.push([x, z]); }
for (let z = 28; z <= 31; z++) for (let x = 34; x <= 37; x++) { setCell(L, x, z, 'd', 18); CAR3.push([x, z]); }
// ---- the spire on the summit: a round hall, a well in its heart with a stair down the wall (the exit) -------------------------------------------------------------------------------------------------------------------------------------------------------------------
const SP = ellipse(L, 36, 16, 9, 9, ')', 24, 35); const SPS = new Set(SP.map(([x, z]) => x + ',' + z));
for (const [x, z] of ellipseCells(36, 16, 10.6, 10.6)) if (!SPS.has(x + ',' + z)) setCell(L, x, z, '*', 24);                      // the spire's wall
for (const [x, z] of ellipse(L, 36, 16, 3.2, 3.2, ')', 24, 35)) setCell(L, x, z, '!', 24);               // the well: a column of wall in the middle (the shaft down is the exit beyond it)
for (let z = 24; z <= 27; z++) for (const x of [35, 36, 37]) setCell(L, x, z, ')', 24, 35);               // the spire's door on the south side
box(L, [33, 11, 39, 11], ')', 24, 35);
for (const [x, z] of [[32, 58], [33, 58], [32, 59], [33, 59]]) setCell(L, x, z, '!', 0);          // the call levers' walls on the upper landings
const P = placer(L); L.put(20, 91, '@'); P.reserve(20, 91);
const { E, P: PK, PR } = P;
ring(L, '!', (x, z) => (z >= 82 ? '$' : z >= 64 ? '*' : z >= 50 ? '$' : z >= 32 ? '*' : '='));
// ---- the gauntlet -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[26, 88], [40, 90], [50, 86], [34, 85]]) E('tollbearer', x, z);                     // the gate hall: porters
E('gaunt', 46, 92); E('gaunt', 30, 92); E('bellhand', 52, 90);
E('wardengraft', 40, 68, { facing: Math.PI }); E('tollbearer', 28, 70); E('tollbearer', 50, 66); E('gill', 36, 66); E('bellhand', 18, 66);      // the first terrace
E('bulwark', 30, 54); E('chorister', 48, 52); E('gaunt', 24, 56); E('gaunt', 52, 56); E('gill', 36, 52);                                         // the second
E('weeping', 38, 36, { group: 'mother' }); E('gaunt', 24, 34); E('tollbearer', 52, 36); E('tollbearer', 20, 40); E('bellhand', 30, 40);       // the third: the Mother, her guard
E('bulwark', 28, 22); E('tollbearer', 50, 14); E('tollbearer', 22, 14); E('gaunt', 36, 24); E('bellhand', 44, 18); E('gill', 30, 12);          // the summit court
E('tollbearer', 33, 14); E('tollbearer', 39, 14);                                                                                                     // the spire's keepers
// ---- supplies and furniture -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of [[20, 90], [36, 88], [52, 88], [20, 70], [34, 72], [52, 71], [20, 56], [36, 58], [52, 58], [20, 38], [36, 40], [52, 40], [20, 25], [36, 26], [52, 25], [36, 12]]) PK(x % 3 ? 'health_small' : 'health_large', x, z);
PK('armor_vest', 22, 84); PK('armor_vest', 50, 72); PK('armor_vest', 22, 52); PK('armor_vest', 50, 34); PK('armor_vest', 22, 26);
for (const [x, z] of [[24, 86], [48, 86], [32, 94], [44, 94]]) PR('lamp', x, z);
for (const [x, z] of [[36, 20], [32, 16], [40, 16]]) PR('lamp', x, z);
for (const [x, z] of [[18, 72], [54, 72], [18, 58], [54, 58], [18, 40], [54, 40], [18, 26], [54, 26]]) PR('lantern', x, z);
for (const [x, z] of [[30, 90], [44, 88], [26, 62], [46, 56], [28, 38], [44, 34]]) PR('crate', x, z);
// ---- the secret: a cell behind the gate hall's north wall: the keepers' store -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const SEC = { panel: [32, 81], cells: [[31, 79], [32, 79], [33, 79], [31, 80], [32, 80], [33, 80]] };
{ for (const [x, z] of SEC.cells) setCell(L, x, z, 'f', 0, 12); box(L, [30, 78, 34, 78], '$', 0); box(L, [30, 79, 30, 80], '$', 0); box(L, [34, 79, 34, 80], '$', 0); setCell(L, 32, 81, 'S', 0);
  PK('armor_vest', 31, 79); PK('health_large', 33, 79); PK('ammo_shell', 31, 80); PK('ammo_rivet', 33, 80); PK('ammo_flare', 32, 79); }
const MAP = {
  id: 'C2M08', name: 'Threshold Ascent', version: 1, ceilingHeight: 4.2, par: { time: 540 },
  atmosphere: { fog: '#d8d0e8', fogDensity: 0.003, sky: 'anselm', look: 'ascent' },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'THRESHOLD ASCENT', lines: ['A city built up a cliff of glass, one tier above another.', 'The way down is at the top.'] },
  outro: 'Below the spire is the Deep. The first act of the descent ends here.',
  objective: 'Climb the city: stair, lift, stair, lift. The spire on the summit is the way on',
  ...L.layers(),
  secrets: [{ id: 'store', panel: SEC.panel, cells: SEC.cells }],
  groups: [],
  sectors: [{ id: 'lift1', cells: CAR1, low: 3, high: 6, speed: 1.2, start: 'low' }, { id: 'lift3', cells: CAR3, low: 9, high: 12, speed: 1.2, start: 'low' }],
  entities: [...P.ents,
    { type: 'switch', id: 'lift1-up', at: [34, 62], wall: 'west', once: false, do: [{ sector: { id: 'lift1', to: 'high' } }, { objective: 'Riding up. The second terrace: a Bulwark and a singer wait' }] },
    { type: 'switch', id: 'lift1-call', at: [33, 64], wall: 'north', once: false, do: [{ sector: { id: 'lift1', to: 'low' } }] },
    { type: 'switch', id: 'lift1-down', at: [34, 59], wall: 'west', once: false, do: [{ sector: { id: 'lift1', to: 'low' } }] },
    { type: 'switch', id: 'lift3-up', at: [34, 30], wall: 'west', once: false, do: [{ sector: { id: 'lift3', to: 'high' } }, { objective: 'Riding up to the summit: the spire is ahead' }] },
    { type: 'switch', id: 'lift3-call', at: [33, 32], wall: 'north', once: false, do: [{ sector: { id: 'lift3', to: 'low' } }] },
    { type: 'switch', id: 'lift3-down', at: [34, 26], wall: 'north', once: false, do: [{ sector: { id: 'lift3', to: 'low' } }] },
    { type: 'exit', at: [36, 11], dest: 'next' }],
  scenery: [{ kind: 'spire', at: [8, 2] }, { kind: 'spire', at: [64, 4] }, { kind: 'spire', at: [36, -22] }, { kind: 'spire', at: [-6, 60] }],
  messages: [
    { id: 'start', at: [20, 91], radius: 3, speaker: 'INES', text: 'A gate hall at the foot of a cliff, and the cliff is a city: tiers of terraces up the face, stairs and lifts between them, all of it glass the colour of weak tea.' },
    { id: 'stair', at: [21, 80], radius: 3, speaker: 'HULL', text: 'The first stair is under a roof. At the top the terrace is open, and a Warden-Graft with its plate to you will charge down the whole length of it.' },
    { id: 'plate', at: [32, 71], radius: 3, speaker: 'RINGING PLATE', text: 'Run a nail down it: the long number is shorter than it was at the Fields. By about a thousand. I do not know whether that is good news.' },
    { id: 'lift', at: [36, 65], radius: 2.5, speaker: 'HULL', text: 'The lift. A lever on the car sends it up; a call lever on each landing brings it down. Nothing on the next tier can reach you until it is up.' },
    { id: 'second', at: [36, 56], radius: 4, speaker: 'INES', text: 'A shell-back at the foot of the second stair and a singer behind it. They have had a long time to get used to this view. Do not hurry.' },
    { id: 'mother', at: [36, 40], radius: 4, speaker: 'INES', text: 'The third terrace has a mother on it, weeping, and the stone round her is wet. Walk out of what she makes. The lift is on the far side.' },
    { id: 'summit', at: [36, 26], radius: 4, speaker: 'INES', text: 'The top. The whole sea bed behind me, flat to the edge, and the road across it like a scratch. The needles are much nearer from here.' },
    { id: 'note', at: [36, 20], radius: 2.5, speaker: 'A SILENT (NOTE)', text: 'Below this is where the count is kept. We go down only to be counted. If you go, you are the first who has not come to be counted.' },
    { id: 'spire', at: [36, 13], radius: 3, speaker: 'INES', text: 'A hollow spire, a round well in the middle of it and a stair going down the wall. Cold air comes up it, and a sound. That is where the sound comes from.' },
    { id: 'hollow', at: [32, 80], radius: 2, speaker: 'HULL', text: 'The north wall of the gate hall rings hollow beside the stair.' },
  ],
  triggers: [
    { id: 'terrace1', when: 'enter', at: [36, 70], radius: 4, do: [{ objective: 'The first terrace: the lift to the second is in the middle of its north edge' }] },
    { id: 'terrace2', when: 'enter', at: [46, 54], radius: 4, do: [{ objective: 'The second terrace: the stair to the third is on its east side' }] },
    { id: 'terrace3', when: 'enter', at: [36, 36], radius: 4, do: [{ objective: 'The Mother holds the third terrace: the lift to the summit is at its north edge' }] },
  ],
  quality: { enemies: [26, 70], botSeconds: [40, 800], mechanics: ['heights', 'triggers', 'switches', 'sectors', 'secret'], skins: 6, enemyKinds: { tollbearer: 8, gaunt: 5, bellhand: 3, gill: 3, bulwark: 2, wardengraft: 1, weeping: 1, chorister: 1 },
    scaleClass: 'MIXED', introduces: 'the ascent: a city of four tiers up a cliff of glass, 12 metres from the foot to the summit, climbed by stairs and two lifts under the whole elite roster of the Act, ending at a hollow spire that is the way down into the Deep' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M08: enemies', P.ents.filter((e) => e.type === 'enemy').length);
export default MAP;
