// C2M04 TUNING FORK FIELDS: sound-lure hazards; the Song is an economy. (Campaign 2, Act A THRESHOLD.)
// PT-082 REDRAW (design/FUN_CHECK.md: the old map was three bands stacked like a spreadsheet, mirrored, with a 178 m walk where nothing woke). Now a HILL drawn by hand, climbed in one turn: a hollow way into
// the LOWER FIELD, the DRYING BARN on its east side (the harvesters' way up: a stair to the hay loft, and the loft door onto the terrace), the TERRACE that overlooks the field from 2 m, the GREAT STAIR whose lower
// flight has fallen (you see the gate at its head from the field and cannot reach it), the WINCH HOUSE at the terrace's west end whose chain works that gate (the gate you come back through: a pack has come down the
// stair by the time you return), the UPPER FIELD with a broken shrine and a ledge over the terrace, two stairs to the SUMMIT (a loop), and the TUNING TOWER: the great bell, the lever on its stand, the north gate.
// The forks (the resonators: they ring at a noise, call the forks beside them and wake everything asleep near them) stand in clusters of three, apart: the answer is still the gun you choose and where you fight.
// Two secrets of two kinds: the harvesters' store behind the barn's east wall (a panel) and the forkwright's cupboard behind the winch house's split wall (shoot it).
import { Level } from '../tools/mapkit/builder.mjs';
import { Encounters } from '../tools/mapkit/encounters.mjs';
import { placer } from '../tools/mapkit/c2.mjs';
import { sketch } from '../tools/mapkit/sketch.mjs';

const W = 66, H = 62, L = new Level(W, H, { fill: '!' }); L.usedHeights = true; L.usedCeil = true;
// ---- the hill, drawn: north is up; one character a cell. Heights are half-metres: the field 0, the terrace 4 (2 m), the upper field 8, the summit 12 (6 m) ------------------------------------------------------------------
const PLAN = String.raw`
                                             %%%%%
                                             %eXe%
                                             %eee%
                                             %eee%
                                           %%%%N%%%%
                                      ;;;;%%fffffff%%;;;;
                                      ;;;;%fffffffff%;;;;
                                      ;;;%fffffOfffff%;J;;;
                                      ;;;%ffGfffffGff%;;;;;
                                 ;A;;;;;;%fffffffffff%;;;;;
                                ;;;;;;;;;%Vffffffffff%;;G;;
                                ;;;F;;;;;%fffffffffff%;;;;;
                                ;;;;;;;;;%fffYfffYfff%;;F;;
                                ;;;;;;;;;%fffffffffff%;;;;;
                                ;;;;;;;;;%fffffffff*f%;;;;;
                                ;;;;;T;;;%%fffffffff%%;;T;;
                                ;;;;;;;;;;%%fffffff%%;;;;;;
                                ;;;;;;;;;;;%%%fff%%%;;;;;;;
                                ;;;;;;;;;;;;;;;;;;;;H;;;;;*
                                 zzz;;;;;;;;;U;;;U;;;;;zzz
                                 yyy;          ;;;;;;;;yyy
                                 xxx;          ;;;;;;;;xxx
             ::::::::::::::::::::::::::::::::::::::::::::::
            #######:::::::::::::::::::::::::::::+::::::::::
          ::#:::::#:::::::::::T::::::::::::::::::::::::::::
          ::#::H::::F:::::::::::::::::::::::::::::::F::::::
          ::#:::::T:::::::::::::::::F::::::::::::::::::::::
          ::#:::::#:::::::::::::::::::::::::::T:::::::G::::
     ccc  ::###::##:::::J::::::::::::::::::::::::::::::::
     ccc  ::::::::::::::::::*::::::::::::::::::::::::::::
     ccc              ##D##::::::::::::::::::::::::
  WWWWZWWWW           #ggg#::::::::::::::::::::::::
  WwwwwwwwW           #777#:::::::::::::::::J::::::
  WwwwwwGwW           #666#   :::::::::::::::::::::
  WQwwwwwwW           #555#   ::::::::::::::WWWWWWWWWWWWWWWWW
  WwwwwwwwW,,,,,,,,,,,,LLL,,,,Y,,,,,,,,,    BBBBBBBBBBBBBBBBW
  WwwwKwwww,G,,,,,Y,,,,LLL,,,,,,F,,,,,,,,,,,BB*BBBBBBBBBBBBBW
  Wwwwwwwww,,,,,F,,,H,,LLL,,T,,,,,,,,,,,,,,,BBEBBBBBEBJBBBBBW
  WwAwwwwww,,,,,,,,,,,,,,,,,,,+,,,,,,,,,H,,,WBBBBBBBBBBBBBBBW
  WwwwwwwwW    ,,,,,,,,,,,,,,,,,,,,,Y,,,,,,,WBBBBBBBBBBBBBBBW
  WWWWWW   .................................Wbbbbbbbbbb3333bW
        ....................................WbRbbbbbbbb2222bW
        ....................................Wbbbbbbbbbb1111bW
        ...... ...................H.........WbbbbbbbbbbbbbbbW
        ...... .......T..........K..........bbbbbbbbTbbbbbbbW
        ...................      ...........bbbbGbbbbbbbbbbbW
        ....T..............      .......T...WbbbbbbbbbbbbbRbWhhh
        ........F.........G      ...........WbRbbbbbbbbbbbbbShhh
        ...................      ....F......WbbbbbFbbbbbbbbbWhhh
        ......................T.............bbbbbbbbbbbbbbbbW
        ..........G.....*...................bbbbbbbbbbbbGbbbW
        ............+....................   WbbKbbbbbbbbbbAbW
      lllll                                 WbbbbbbbbbbbbRbbW
      lllll                                 WWWWWWWWWWWWWWWWW
      lllll
      lllll
   lll+l
   lllll
   lllll
   ll@ll
   lllll
`;
const F = (t, h, lid = null) => (lid == null ? { t, h } : { t, h, lid });
const S = sketch(L, PLAN, {
  '#': { t: '$' }, W: { t: 'W' }, '%': { t: '%' },
  '.': F('-', 0), ',': F('-', 4), ':': F('-', 8), ';': F('-', 12),                                            // the lower field, the terrace, the upper field, the summit: turf open to the sky
  l: F('(', 0),                                                                                                  // the hollow way: glass sand between banks
  b: F('.', 0, 9), B: F('.', 4, 9), 1: F('.', 1, 12), 2: F('.', 2, 11), 3: F('.', 3, 10),                     // the barn: planks under a 4.5 m roof, the hay loft 2 m up, the loft stair
  L: F('f', 4), g: F('f', 8), 5: F('f', 5), 6: F('f', 6), 7: F('f', 7),                                                       // the great stair: its landing and its upper flight
  w: F('.', 4, 8), c: F('.', 4, 6),                                                                              // the winch house and the cupboard behind it (PT-082: roofed planks: a house, so its lamps hang from a roof)
  x: F('&', 9), y: F('&', 10), z: F('&', 11),                                                                    // the stairs from the upper field to the summit (PT-082: open-air stone steps, not a roofed slab)
  f: F('f', 12, 10), e: F(')', 12, 8), h: F('.', 0, 8),                                                         // the tower (a 5 m roof), the passage beyond the north gate, the store
}, { marks: '@XDNSZQVOTGHKJUF+*AERY' });
const P = placer(L), { E, P: PK, PR } = P; const [sx, sz] = S.one('@'); L.put(sx, sz, '@'); P.reserve(sx, sz);
// ---- the doors: the stair gate (the winch's chain) and the north gate (the bell's lever); the secrets' panels ----------------------------------------------------------------------------------------------------------------------
const GATE = S.one('D'), NORTH = S.one('N'), STORE = S.one('S'), CRACK = S.one('Z');
L.door(GATE[0], GATE[1], { remote: true }); L.door(NORTH[0], NORTH[1], { remote: true }); L.secretPanel(STORE[0], STORE[1]); L.secretPanel(CRACK[0], CRACK[1]);
// ---- the forks: a cluster of three at every F, apart (a ring wakes what tends that cluster) ------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of S.at('F')) { PR('resonator', x, z); PR('resonator', x + 2, z + 1); PR('resonator', x + 1, z - 2); }
// ---- the harvesters and the guards ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [ch, kind] of [['T', 'tollbearer'], ['G', 'gaunt'], ['H', 'bellhand'], ['K', 'sexton'], ['J', 'gill'], ['U', 'bulwark']]) for (const [x, z] of S.at(ch)) E(kind, x, z);
// ---- supplies and furniture --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const [x, z] of S.at('+')) PK('health_small', x, z); for (const [x, z] of S.at('*')) PK('health_large', x, z); for (const [x, z] of S.at('A')) PK('armor_vest', x, z);
for (const [x, z] of S.at('E')) PR('lamp', x, z); for (const [x, z] of S.at('R')) PR('crate', x, z); for (const [x, z] of S.at('Y')) PR('lantern', x, z);
const BELL = S.one('O'); PR('bellnode', BELL[0], BELL[1]);
for (const [x, z] of [[23, 41], [25, 42], [24, 40]]) PR('crate', x, z);                                           // what is left of the stair's lower flight
PK('armor_vest', 44, 19); PK('health_large', 40, 17);                                                     // before the summit fight: a vest and a mend on the walk to the tower door (the strafing robustness run died at the tower door)
PR('lamp', 7, 37); PR('lamp', 4, 32);                                                                            // the winch house is lit: its lever is the way on
// the secrets' rewards
PK('armor_vest', 61, 46); PK('health_large', 63, 46); PK('ammo_shell', 61, 48); PK('ammo_rivet', 63, 48); PK('ammo_flare', 62, 47);
PK('ld_slag_scattergun', 6, 29); PK('armor_vest', 5, 28);

// ---- the ambushes: the gaunts at the tower door (the pack that comes down the great stair when the chain runs is in the winch switch: the way back has changed) --------------------------------------------------------------------------------------------
const ENC = new Encounters(L);
ENC.dropIn({ at: [47, 20], radius: 2.5, cells: ENC.around([47, 20], { n: 2, min: 6, max: 10 }), kind: 'g' });

const [qx, qz] = S.one('Q'), [vx, vz] = S.one('V'), EXIT = S.one('X');
const MAP = {
  id: 'C2M04', name: 'Tuning Fork Fields', version: 3, startFacing: -0.52, ceilingHeight: 4.2, par: { time: 480 },
  atmosphere: { fog: '#d0c090', fogDensity: 0.005, sky: 'anselm', look: 'fields' },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'TUNING FORK FIELDS', lines: ['Every row on this hill is a fork, and every fork has been tuned.', 'What gets struck here is paid for somewhere else.'] },
  outro: 'Next: the Reliquary Road, where the Vael keep the people they have finished with.',
  objective: 'Climb the hill to the tower on the summit',
  ...L.layers(),
  secrets: [{ id: 'store', panel: STORE, cells: [[62, 47], [61, 47]] }, { id: 'cupboard', panel: CRACK, cells: [[6, 30], [6, 29]], open: 'shoot' }],
  groups: [],
  entities: [...P.ents,
    { type: 'switch', id: 'winch', at: [qx, qz], wall: 'west', once: true, do: [{ open: GATE }, { message: 'winch' }, ...[['gaunt', 22, 27], ['gaunt', 26, 27], ['tollbearer', 24, 25]].map(([kind, x, z]) => ({ spawn: { kind, at: [x, z], group: 'stairpack', facing: 'south', hunt: true } })), { objective: 'The stair gate is open: back along the terrace and up the great stair' }, { shake: 1 }] },
    { type: 'switch', id: 'tune', at: [vx, vz], wall: 'west', once: true, do: [{ open: NORTH }, { message: 'tune' }, { objective: 'The north gate is open: the passage beyond it goes to the exit' }, { shake: 1.5 }] },
    { type: 'exit', at: EXIT, dest: 'next' }],
  scenery: [{ kind: 'spire', at: [12, -6] }, { kind: 'spire', at: [66, -10] }, { kind: 'spire', at: [40, -22] }],
  messages: [
    { id: 'start', at: [5, 58], radius: 3, speaker: 'INES', text: 'Terraces, and on every terrace a row of standing forks, brass and green, taller than a man. They are all humming, so low I feel it in my hands before I hear it.' },
    { id: 'fork', at: [9, 51], radius: 3, speaker: 'HULL', text: 'A fork rings at a shot, answers its neighbours down the row, and everything asleep near them wakes. The arc lamp and a blow are heard from least far.' },
    { id: 'plate', at: [15, 45], radius: 2.5, speaker: 'FORK PLATE', text: 'A brass plate hammered onto the foot, in our letters: AMBLER, T. BOSUN. Somebody here had that courtesy. I count eight more plates in this row.' },
    { id: 'tend', at: [30, 44], radius: 4, speaker: 'INES', text: 'They are tending the forks. Weeding round them, wiping them down, putting an ear to them. Nobody looks up. I would like to keep it that way.' },
    { id: 'stair', at: [24, 43], radius: 3, speaker: 'HULL', text: 'The lower flight of the great stair has come down, and the gate at its head is shut. The harvesters go up through the barn and its hay loft.' },
    { id: 'count', at: [50, 46], radius: 3, speaker: 'RINGING PLATE', text: 'Run a nail down it: a long number, a longer number, then one short note that rises like a question. Struck and owed, if I had to guess.' },
    { id: 'hollow', at: [58, 47], radius: 2, speaker: 'HULL', text: 'The east wall of this barn rings hollow behind the crates.' },
    { id: 'gate', at: [24, 36], radius: 2.5, speaker: 'HULL', text: 'The gate at the head of the stair is chained shut. The chain runs west along the terrace, into the winch house at the end of it.' },
    { id: 'split', at: [6, 34], radius: 2.5, speaker: 'INES', text: 'The back wall of the winch house is split from floor to roof, and cold air comes through the split. One good shot would open it.' },
    { id: 'shelf', at: [6, 29], radius: 1.5, speaker: 'INES', text: 'A forkwright\'s cupboard. Shells for the scattergun that burn, and a brass plate with nothing stamped on it yet.' },
    { id: 'winch', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'The chain runs out along the terrace and the stair gate swings open. Something on the field above it has started walking.' },
    { id: 'tower', at: [40, 23], radius: 3.5, speaker: 'INES', text: 'A round tower on the top of the hill with a bell inside it the size of a boat. Everything on this hill is tuned to that.' },
    { id: 'lever', at: [vx + 1, vz], radius: 2, speaker: 'HULL', text: 'A lever on the bell stand. It works the gate in the north wall; the Keepers ring the bell and the gate answers.' },
    { id: 'tune', at: [0, 0], radius: 0.1, speaker: 'HULL', text: 'The gate in the north wall opens. Down the hill, every fork in every field gives one low note, and stops.' },
  ],
  triggers: [
    { id: 'barn', when: 'enter', at: [24, 43], radius: 3, do: [{ objective: 'Up through the barn: its loft opens onto the terrace' }] },
    { id: 'chained', when: 'enter', at: [24, 36], radius: 2.5, do: [{ objective: 'The stair gate is chained: the winch house is at the west end of the terrace' }] },
    { id: 'upper', when: 'enter', at: [30, 26], radius: 3, do: [{ objective: 'The summit: a stair at each end of the upper field. The tower is on top' }] },
    { id: 'summit', when: 'enter', at: [47, 19], radius: 3, do: [{ objective: 'The tuning tower: the lever on the bell stand opens the north gate' }] },
  ],
  quality: { enemies: [30, 60], botSeconds: [40, 700], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 6, enemyKinds: { tollbearer: 8, gaunt: 8, bellhand: 4, sexton: 2, gill: 3, bulwark: 1 },
    scaleClass: 'SET-PIECE', reason: 'a hill climbed in the open: the field, the terrace and the summit are open ground on purpose, the forks stand in it, and the barn, the winch house and the tower are the cover the climb is planned round',
    introduces: 'the resonators: standing forks that ring at a noise, answer the forks beside them down the row and wake everything asleep near them, so the gun you fire near them is the puzzle (the arc lamp, a blow and the tuning-fork gun are heard from least far)' },
};
MAP.drops = { scale: 1, keep: [] };
ENC.apply(MAP);
for (const [mid, unless] of Object.entries({ chained: ['msg:winch'], gate: ['msg:winch'] })) { const m = MAP.messages.find((q) => q.id === mid); if (m) m.unless = unless; }
console.log('C2M04: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'forks', P.ents.filter((e) => e.kind === 'resonator').length);

const D = (x, z) => [x, z];
export const waypoints = {
  main: [[5, 59, 0], D(8, 52), D(12, 47), D(22, 46), [24, 44, 0], D(34, 45), D(40, 47), [44, 49, 0], D(49, 47), D(54, 47), [57, 44, 0], [57, 41, 0], D(56, 37), D(48, 37), [44, 36, 0], D(36, 37), D(28, 37), [24, 37, 0], D(20, 39), [12, 37, 0], [9, 37, 0], D(6, 35), { op: 'switch', id: 'winch' },
    [9, 37, 0], D(20, 39), D(24, 37), [24, 34, 0], [24, 31, 0], D(24, 28), D(32, 26), D(38, 25), [34, 23, 0], [34, 19, 0], D(37, 15), D(44, 19), [47, 18, 0], D(47, 13), { op: 'switch', id: 'tune' }, [47, 6, 0], [47, 3, 0], [EXIT[0], EXIT[1], 0]],
};
waypoints.secret = (() => {
  const m = waypoints.main, a = m.findIndex((w) => Array.isArray(w) && w[0] === 54 && w[1] === 47), b = m.findIndex((w) => w.op === 'switch' && w.id === 'winch');
  return [...m.slice(0, a + 1), [58, 47, 0], { op: 'use', at: STORE }, [62, 47, 0], [58, 47, 0], ...m.slice(a + 1, b + 1), [6, 34, 0], { op: 'crack', at: CRACK }, [6, 29, 0], [6, 34, 0], ...m.slice(b + 1)];
})();
// 2026-11-18 (step 4 of the playtest list): the start looks up the 35 m view north-north-east (startFacing -0.52) instead of at the wall 5 m east
// (design/OPENING_VIEWS.md section 10). Every turn lost the hard runs: the bot reached the stair-gate fight worn down by the ringing field and the
// hard-only Bellhand at (24, 25) finished it. That extra is now a Gaunt (maps-src/skill/C2M04.json): Hard keeps its count, loses one gun at the gate.
export default MAP;
