// C2M17 THE HIVE-SONG APPROACH (Campaign 2, Act C THE HIVE-SONG, first map; design/ACTC.md section 5, design/LORE.md section 2c). MIXED, threat 7.
// A THROAT: a gorge cut into pale stone, running west to east in an S, a sunk trench down the middle (the lane), a slope of four steps up each side to a roofed bank two metres above the lane, and on the banks six FIRE-BASES, three a
// side, staggered: half-moon positions behind a crescent of wall where Choristers sing in bursts. The verb is cover to cover under suppression: a Chorister's gun cone opens while it hits you, so you move on the break. The first base is alone,
// the next are pairs, then threes: the placement teaches the cadence before it punishes. The Hive beat starts here as atmosphere only (the ribs swell every second and a half; the tower at the end throbs red).
// The way on: two RELAYS, one at the back of the last base of each bank (north, south), each under an amber lamp and named by the objective; the drum gate at the east end opens when both are thrown and says which one is missing.
// A rib-hollow in the south bank holds a cache. Drop-fed ammunition. SHAPE: a snake of a gorge (an S of seven legs), four floor heights, three lid heights (bank, rib, pocket), rib piers along both banks.
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { laneOf } from '../tools/mapkit/shape.mjs';
import { setCell, placer } from '../tools/mapkit/c2.mjs';
import { centreline, band } from '../tools/mapkit/hive.mjs';

const W = 148, H = 60, L = new Level(W, H, { fill: 'α' }); L.usedHeights = true; L.usedCeil = true;
const TRENCH = 'Α', BANK = 'Ο', WALL = 'α', CRESC = 'β', RIB = 'V', ALCOVE = 'Γ', GATEW = 'γ';
const cl = centreline([[9, 30], [20, 30], [36, 17], [52, 17], [72, 43], [88, 43], [104, 30], [132, 30]]);
const END = cl.length, spot = (s, off = 0) => cl.at(s, off).map(Math.floor);
const SIDE = { n: 1, s: -1 };                                                                                            // north is LEFT of the way east
const BASES = [{ id: 'b1', side: 's', s: 20 }, { id: 'b2', side: 'n', s: 42 }, { id: 'b3', side: 's', s: 66 }, { id: 'b4', side: 'n', s: 89 }, { id: 'b5', side: 's', s: 126 }, { id: 'b6', side: 'n', s: 141 }];
const BAFFLES = [28, 50, 78, 100, 112, 122, 135];                                                                           // rib arches across the banks (the trench stays open): they cut the gorge into chambers: no sight, no shot, no shout crosses them
const local = (b, f) => ({ a: f.s - b.s, o: SIDE[b.side] * f.off });                                                       // along the way, outward from the trench (positive on the base's own bank)
const inPocket = (b, f) => { const q = local(b, f); return Math.abs(q.a) < 6 && q.o > 6 && q.o < 16 && Math.hypot(q.a, q.o - 10) < 4.2; };
const isCrescent = (b, f) => { const q = local(b, f), r = Math.hypot(q.a, q.o - 10); return r >= 2.6 && r < 3.7 && q.o < 10.4 && q.o >= 6.6; };

// ---- the gorge: trench 0, a slope of four steps, the roofed bank at +2 m; the east end is cut square (the gate) ----------------------------------------------------------------------------------------------------------------------
band(L, cl, 12, (f) => {
  const { x, z, d, s } = f;
  if (x < 2 || z < 2 || x > W - 3 || z > H - 3) return;
  if (s >= END - 1e-6 && x + 0.5 > 132) return;                                                                         // past the last vertex: the wall of the gate
  if (d <= 2.5) { setCell(L, x, z, TRENCH, 0); return; }
  if (BAFFLES.some((q) => Math.abs(s - q) < 0.8)) { setCell(L, x, z, RIB, 4); return; }                                  // a rib arch across both banks: the trench passes under it
  if (d <= 6.5) { setCell(L, x, z, TRENCH, Math.ceil(d - 2.5)); return; }
  const base = BASES.find((b) => b.side === (f.off > 0 ? 'n' : 's') && Math.abs(f.s - b.s) < 8 && inPocket(b, f));
  if (base && isCrescent(base, f)) { setCell(L, x, z, CRESC, 4); return; }                                              // the half-moon of wall in front of the pocket
  const pier = d < 7.7 && (((s % 6) + 6) % 6) < 1.1 && !BASES.some((b) => Math.abs(f.s - b.s) < 6 && b.side === (f.off > 0 ? 'n' : 's'));
  if (pier) { setCell(L, x, z, RIB, 4); return; }                                                                       // a rib pier on the lip of the bank
  setCell(L, x, z, BANK, 4, base ? 12 : (((s % 12) + 12) % 12) < 2.2 ? 17 : 14);
});
// ---- the alcoves behind each base: carved out of the solid back wall (only solid, never touching another open cell) -----------------------------------------------------------------------------------------------------------------
const alcove = [];
for (const b of BASES) {
  const cells = [];
  for (let z = 2; z < H - 2; z++) for (let x = 2; x < W - 2; x++) {
    if (L.g[z][x] !== WALL) continue; const f = cl.frame(x + 0.5, z + 0.5), q = local(b, f);
    if (b.side === (f.off > 0 ? 'n' : 's') && Math.abs(q.a) <= 3 && f.d > 12 && f.d <= 15.5) cells.push([x, z]);
  }
  for (const [x, z] of cells) setCell(L, x, z, ALCOVE, 4, 12); alcove.push(cells);
}
// ---- the gate: a chamber at the east end of the trench, the drum gate's exit in it ---------------------------------------------------------------------------------------------------------------------------------------------------
L.room([132, 27, 138, 33], { floor: BANK, wall: GATEW });
for (let z = 27; z <= 33; z++) for (let x = 132; x <= 138; x++) setCell(L, x, z, BANK, 0, 9);
// ---- the rib-hollow: a cache behind the south bank (the panel in the bank's back wall, between the third and fourth bases) ---------------------------------------------------------------------------------------------------------------
const XS = 80; let zs = 44; while (L.g[zs][XS] !== WALL) zs++;                                                          // the first wall cell south of the bank at x = 88
const SEC = { panel: [XS, zs], cells: [] };
for (let z = zs + 1; z <= zs + 3; z++) for (let x = XS - 2; x <= XS + 2; x++) { setCell(L, x, z, ALCOVE, 4, 12); SEC.cells.push([x, z]); }
setCell(L, XS, zs, 'S', 4);
// ---- objects: props first (so nothing is placed on them), then the creatures, then what lies on the road ---------------------------------------------------------------------------------------------------------------------------------
const P = placer(L); const { E, P: PK, PR } = P; L.put(9, 30, '@'); P.reserve(9, 30);
const ats = (b, a, o) => spot(b.s + a, SIDE[b.side] * o);
for (const b of BASES) {
  PR('lamp', ...ats(b, 0, 10)); PR('lamp', ...ats(b, -3, 13)); PR('lamp', ...ats(b, 3, 13));                          // under the roof of the pocket and its alcove
}
for (let s = 14, k = 0; s < END - 8; s += 5, k++) { const [x, z] = spot(s, k % 2 ? 1.4 : -1.4); if (L.g[z][x] === TRENCH && !BASES.some((b) => Math.abs(b.s - s) < 2 && false)) setCell(L, x, z, RIB, 0); }       // rib stumps in the trench, left and right in turn: cover between the banks and a lane that zigzags
for (let s = 12; s < END - 4; s += 20) { PR('lamppost', ...spot(s, 2)); PR('lamppost', ...spot(s + 10, -2)); }
// the relays: on the back wall of the last base of each bank, each under an amber lamp
const b5 = BASES[4], b6 = BASES[5], relayCell = (b) => { const c = spot(b.s, SIDE[b.side] * 15.4); return c; };
const [rsx, rsz] = relayCell(b5), [rnx, rnz] = relayCell(b6);
PR('lamp', rsx - 1, rsz); PR('lamp', rnx + 1, rnz);
// the roster: a base, then what is in the trench round it
const S = (b, kind, a, o, extra = {}) => E(kind, ...ats(b, a, o), extra), T = (kind, s, off, extra = {}) => E(kind, ...spot(s, off), extra);
const [B1, B2, B3, B4, B5, B6] = BASES;
S(B1, 'chorister', 0, 11);                                                                                              // the first base is alone
S(B2, 'chorister', 0, 11); S(B2, 'tollbearer', -3, 9, { variant: 'hived' }); S(B2, 'tollbearer', 3, 9, { variant: 'hived' });
S(B3, 'chorister', -2, 11); S(B3, 'chorister', 2, 11); S(B3, 'bulwark', 0, 13); S(B3, 'zealot', 0, 9);
S(B4, 'chorister', -3, 11); S(B4, 'chorister', 3, 11); for (const a of [-4, 0, 4]) S(B4, 'tollbearer', a, 8, { variant: 'hived' }); S(B4, 'zealot', 0, 13);
S(B5, 'chorister', -3, 11); S(B5, 'chorister', 3, 11); S(B5, 'bulwark', -4, 13); S(B5, 'bulwark', 4, 13); S(B5, 'sexton', 0, 14); S(B5, 'wardengraft', 0, 9);
S(B6, 'chorister', -3, 11); S(B6, 'chorister', 3, 11); S(B6, 'zealot', 0, 9); S(B6, 'tollbearer', -2, 14, { variant: 'hived' }); S(B6, 'wardengraft', 0, 8);
for (const [s, o] of [[14, 0.5], [16, -1], [40, -1], [41, 1], [124, 0.8], [125, -0.8], [113, 0.8], [114, -0.8]]) T('gaunt', s, o);
for (const [s, o] of [[34, 0.8], [35, -0.8], [64, 1], [104, 1], [105, -1], [106, 0], [20, 1]]) T('tollbearer', s, o, { variant: 'hived' });
for (const [s, o] of [[48, 0.5], [49, -0.5]]) T('tollbearer', s, o);
for (const [s, o] of [[56, 1], [84, -1], [108, 1], [119, -1], [138, 1]]) T('bellhand', s, o);
T('zealot', 95, -1); T('zealot', 117, 1); T('tollbearer', 107, 0.5, { variant: 'hived' }); T('sexton', 115, 0.5);
for (const s of [72, 110, 130]) T('gill', s, 0, {});
// health and armour ON the lane (the route bot only takes what lies on its way): one box a chamber, the large ones before the heavy chambers
const LANE_S = [14, 22, 34, 44, 58, 70, 88, 106, 117, 128];
LANE_S.forEach((s, i) => PK([1, 5, 6, 8, 9].includes(i) ? 'health_large' : 'health_small', ...spot(s + 2.5, 0.3)));
for (const [s, k] of [[60, 'armor_vest'], [100, 'armor_vest'], [120, 'armor_vest'], [128, 'health_large'], [136, 'health_large'], [118, 'health_large']]) PK(k, ...spot(s, -0.4));
for (const b of [B3, B5]) PK('armor_vest', ...ats(b, -2, 13)); PK('armor_vest', ...ats(B4, 2, 13)); PK('health_large', ...ats(B2, 0, 13)); PK('health_large', ...ats(B6, 2, 13)); PK('health_small', ...ats(B1, 2, 13)); PK('health_large', ...ats(B5, 2, 13)); PK('health_large', ...ats(B4, -2, 13));
PK('armor_vest', XS - 1, zs + 2); PK('ammo_rocket', XS + 1, zs + 2); PK('ammo_rocket', XS, zs + 3); PK('health_large', XS, zs + 1); PK('ammo_round', XS - 2, zs + 3);

const gx = 137, gz = 30;
// ---- PT-052 R2 (the Director's Plan, design/ROADMAP.md 0.12): the scripted ambushes and the secret the kit builds (tools/mapkit/encounters.mjs; planned by tools/dev/rebuild-map.mjs; the rules: design/DIRECTOR_AUDIT.md) ----
const ENC = new Encounters(L);
ENC.dropIn({ at: [68,34], radius: 2, cells: ENC.around([68,34], { n: 3, min: 6, max: 10 }), kind: 'g' });
ENC.dropIn({ at: [124,31], radius: 2, cells: ENC.around([124,31], { n: 3, min: 4, max: 9 }), kind: 'g' });
// ---- end PT-052 ----

const MAP = {
  id: 'C2M17', name: 'The Hive-Song Approach', version: 1, ceilingHeight: 4.2, par: { time: 540 },
  atmosphere: { look: 'hive', sky: 'hive', beat: true, fog: '#2a1822', fogDensity: 0.012 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 20, shell: 24, rivet: 100, bolt: 12, cell: 50, round: 50, rocket: 6 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'THE HIVE-SONG APPROACH', lines: ['A gorge nearly three hundred metres long, and a tower at the end of it that keeps time.', 'Six posts on the banks, a song in every one. The way to the gate is the trench and two levers.'] },
  outro: 'The drum gate turned on its two bolts and let the red in. Beyond it the ribs are lit a little faster.',
  objective: 'Follow the gorge east. The Choristers sing in bursts and draw breath between: move then, and take cover when they start',
  ...L.layers(),
  secrets: [{ id: 'rib-hollow', panel: SEC.panel, cells: SEC.cells }],
  groups: [],
  entities: [...P.ents,
    { type: 'switch', id: 'relay-n', at: [rnx, rnz], wall: 'north', once: true, do: [{ message: 'relay-n' }, { objective: 'North relay thrown. The south relay is under the last south base' }] },
    { type: 'switch', id: 'relay-s', at: [rsx, rsz], wall: 'south', once: true, do: [{ message: 'relay-s' }, { objective: 'South relay thrown. The north relay is under the last north base' }] },
    { type: 'exit', at: [gx, gz], dest: 'next', locked: true }],
  scenery: [{ kind: 'hivetower', at: [158, 30], y: 0, scale: 2.2 }, { kind: 'rib', at: [60, 3], y: 0, scale: 1.2 }, { kind: 'rib', at: [100, 57], y: 0, scale: 1.2 }],
  messages: [
    { id: 'start', at: [10, 30], radius: 5, speaker: 'INES', text: 'A gorge cut into pale stone, and at the far end of it a tower with a red light in it. The light comes and goes about once every second and a half.' },
    { id: 'beat', at: [20, 29], radius: 5, speaker: 'HULL', text: 'Every rib on these banks is lit together and dimmed together. They are keeping time to the tower.' },
    { id: 'count', at: [26, 30], radius: 4, speaker: 'COUNT PLATE', text: 'OWED 52,310. SUNG 49,715. Under it one stroke is scratched for each night the count has been short. The strokes run off the edge of the plate.' },
    { id: 'breath', at: [32, 24], radius: 6, speaker: 'HULL', text: 'A Chorister sings a burst and has to draw breath. Its voice breaks for about as long as it takes to say so. Move then.' },
    { id: 'cover', at: [48, 18], radius: 6, speaker: 'HULL', text: 'The crescents on the banks are stone. So are the ribs on the lip of each slope. A song does not go through either.' },
    { id: 'tower', at: [70, 30], radius: 6, speaker: 'INES', text: 'The tower is wider at the top than at the bottom. The red in it goes in step with the ribs, and after a while so does my pulse.' },
    { id: 'relays', at: [118, 31], radius: 6, speaker: 'HULL', text: 'The gate has two bolts, one under the last base of each bank. A brass lever on a root of black cable, under an amber lamp.' },
    { id: 'gate', at: [131, 30], radius: 5, speaker: 'HULL', text: 'The drum gate is shut. It is held by the north relay and the south relay, and it opens only when both are thrown.' },
    { id: 'relay-n', at: [1, 1], radius: 0.1, speaker: 'INES', text: 'North relay. The cable under my feet jumps once, like a line with a fish on it.' },
    { id: 'relay-s', at: [1, 1], radius: 0.1, speaker: 'INES', text: 'South relay. The same jump in the cable, one beat late.' },
    { id: 'open', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'Both bolts are back. The drum gate is turning.' },
    { id: 'past', at: [135, 30], radius: 3, speaker: 'INES', text: 'Past the gate the floor goes on down in wide steps. The red light is nearer, and I can feel it in my teeth.' },
    { id: 'hollow', at: [XS, zs - 2], radius: 3, speaker: 'HULL', text: 'One rib on the south bank rings hollow under a boot. There is a seam of paler stone in the wall behind it.' },
    { id: 'cache', at: [XS, zs + 2], radius: 3, speaker: 'A SILENT (NOTE)', text: 'I hid this under the rib the day they posted the singers. Armour, and what I could carry of the heavy shot. Use it where it counts.' },
  ],
  triggers: [
    { id: 'first', when: 'enter', at: spot(22, -9), radius: 12, do: [{ objective: 'Take each bank to its relay: north and south, at the east end' }] },
    { id: 'gate-open', when: ['msg:relay-n', 'msg:relay-s'], do: [{ exit: { set: 'unlock' } }, { objective: 'Both relays thrown. The drum gate is open: the exit is at the east end' }, { message: 'open' }] },
  ],
  quality: { enemies: [40, 80], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 6,
    enemyKinds: { chorister: 10, tollbearer: 10, gaunt: 6, bellhand: 4, zealot: 4, bulwark: 3, gill: 3, sexton: 2, wardengraft: 2 },
    scaleClass: 'MIXED', introduces: 'suppression at scale: Choristers in fire-bases on both banks of a gorge, and the first beat of the Hive (the ribs swell every second and a half)' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M17: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'relays', [rnx, rnz], [rsx, rsz], 'panel', SEC.panel, 'alcoves', alcove.map((a) => a.length).join('/'));
const lane = (list) => list.map((s) => [...spot(s, 0)]);
const run1 = lane(LANE_S);
const relays = [[...spot(131, 0)], [...ats(B5, 0, 8)], { op: 'switch', id: 'relay-s' }, [...spot(138, 0)], [...ats(B6, 0, 8)], { op: 'switch', id: 'relay-n' }, [...spot(138, 0), 0], [gx - 3, gz, 0], [gx, gz, 0]];
export const waypoints = {
  main: [[9, 30, 0], ...run1, ...relays],
  secret: [[9, 30, 0], ...lane([14, 22, 34, 44, 58, 70]), [75, 31], [XS, zs - 3, 0], { op: 'use', at: [XS, zs] }, [XS, zs + 2, 0], [XS, zs - 3, 0], ...lane([88, 106, 117, 128]), ...relays],
};
// ---- PT-052 R2: which kinds stand where (applied by the compiler, tools/mapkit/roster.mjs) and what the kit built join the map ----
MAP.roster = { id: 'C2M17', lane: [...(laneOf('C2M17') ?? [])], keep: [], plan: [{"pick":"range","from":"gaunt","to":"mender","n":2}] };
ENC.apply(MAP);

// ---- PT-070 unless (the story pass): reminders that are silent once the thing they remind of has happened
for (const [mid, unless] of Object.entries({ "gate": [["msg:relay-s","msg:relay-n"]] })) MAP.messages.find((m) => m.id === mid).unless = unless;
// ---- end PT-070 unless
export default MAP;
