// C2M22 MOURNING HALLS (Campaign 2, Act C; design/ACTC.md section 5, the TROUGH of the campaign). MIXED, threat 3.
// A CLOISTER: a square arcade (a long low roof, three metres) round an open garden of moss and gravestones, a chapel at each corner, a passage and steps down the south arm to the GATE HALL, and a lift shaft behind the hall's last row of pews.
// The verb is endure. The map is short and quiet on purpose: few creatures, hard-hitting, ammunition low (a fifth of the usual supply: no boxes at all, drops at 0.4), the health on the lane counted by hand. The Silent are in the four chapels: a LATCH in each
// (a lever beside a candle, named by the objective) lets the ones in that cell out. When the fourth is thrown the count is called (a horn, a tremor) and the Silent are on the lift in the gate hall; the player has only to stand and watch: the lift
// sinks slowly and each of them speaks once, refusing one thing (to sing, to count, to answer, to forget). They are taken down, scripted, on screen: never a fight, never an ally to protect. Which wing the player went through in the Undercantor Halls
// (`choice halls=silent` | `songkeepers`) decides how many there are (six or three) and what they say. What is left in the cloister is what comes for them: Zealots, Gaunts, a Weeping Mother's brood and Sextons.
// A hidden chapel behind the north arm holds the longest text of the act. Nothing is thrown away: the exit unlocks when the lift has gone.
import { Level } from '../tools/mapkit/builder.mjs';
import { setCell, placer } from '../tools/mapkit/c2.mjs';

const W = 84, H = 100, L = new Level(W, H, { fill: 'ζ' }); L.usedHeights = true; L.usedCeil = true;
const ARC = 'Ζ', GARDEN = '7', WALL = 'ζ', BONE = 'γ', CHAPEL = 'Θ', HALL = 'Γ';
// ---- the cloister: the arcade ring (lid 3 m) round the garden (open) ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const OUT = [12, 8, 71, 67], IN = [20, 16, 63, 59];
for (let z = OUT[1]; z <= OUT[3]; z++) for (let x = OUT[0]; x <= OUT[2]; x++) { const inGarden = x >= IN[0] && x <= IN[2] && z >= IN[1] && z <= IN[3]; if (inGarden) setCell(L, x, z, GARDEN, 0); else setCell(L, x, z, ARC, 0, 6); }
for (let k = IN[0]; k <= IN[2]; k += 4) { for (const [x, z] of [[k, IN[1] - 1], [k, IN[3] + 1]]) setCell(L, x, z, BONE, 0); }                  // the arcade's columns on the north and south arms (along the garden edge)
for (let k = IN[1]; k <= IN[3]; k += 4) { for (const [x, z] of [[IN[0] - 1, k], [IN[2] + 1, k]]) setCell(L, x, z, BONE, 0); }                                       // ... and on the east and west arms
// the garden has a well and graves
for (let z = 36; z <= 39; z++) for (let x = 40; x <= 43; x++) L.g[z][x] = BONE;                                                                                  // the well-head: a block of bone
// tombs in the garden (solid blocks: they stop the eye and the shot) and rood screens across the arms (a three-cell opening in each)
for (const [x, z] of [[24, 20], [30, 26], [36, 20], [48, 20], [54, 26], [60, 20], [24, 36], [30, 44], [50, 44], [58, 36], [24, 54], [32, 56], [46, 56], [56, 54], [34, 32], [48, 33], [42, 26], [40, 48], [27, 30], [56, 31], [27, 46], [56, 48], [37, 22], [46, 52], [36, 40], [52, 36], [44, 58]]) for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) L.g[z + dz][x + dx] = BONE;
for (const [x, z, horiz] of [[28, 8, false], [56, 8, false], [28, 60, false], [56, 60, false], [12, 28, true], [12, 46, true], [64, 28, true], [64, 46, true]]) { if (horiz) { for (let k = 0; k < 8; k++) if (k < 2 || k > 4) L.g[z + k - 0][x + k * 0] = L.g[z + k][x] ; } }
for (const x of [24, 33, 50, 59]) for (const z0 of [8, 60]) for (let k = 0; k < 8; k++) if (k < 2 || k > 4) L.g[z0 + k][x] = BONE;
for (const z of [24, 33, 42, 51]) for (const x0 of [12, 64]) for (let k = 0; k < 8; k++) if (k < 2 || k > 4) L.g[z][x0 + k] = BONE;
// ---- the four chapels: a room a little higher than the arcade, a doorway two cells wide to the arm ------------------------------------------------------------------------------------------------------------------------------------------------
const CH = { nw: [2, 8, 10, 15], ne: [73, 8, 81, 15], se: [73, 60, 81, 67], sw: [2, 60, 10, 67] };
for (const r of Object.values(CH)) { for (let z = r[1]; z <= r[3]; z++) for (let x = r[0]; x <= r[2]; x++) setCell(L, x, z, CHAPEL, 1, 10); }
for (const z of [11, 12]) { setCell(L, 11, z, CHAPEL, 1, 10); setCell(L, 72, z, CHAPEL, 1, 10); }                                                                 // doorways (north chapels)
for (const z of [63, 64]) { setCell(L, 11, z, CHAPEL, 1, 10); setCell(L, 72, z, CHAPEL, 1, 10); }
// ---- the gate hall: south of the south arm, up a short stair; a lift shaft below its last row of pews ----------------------------------------------------------------------------------------------------------------------------------------------
for (let x = 40; x <= 43; x++) setCell(L, x, 69, ARC, 0, 6);
for (let z = 70; z <= 75; z++) for (let x = 40; x <= 43; x++) setCell(L, x, z, ARC, z - 69, 6 + (z - 69) + 2);
for (const x of [40, 42, 43]) L.g[68][x] = WALL;
L.door(41, 68, { remote: true });                                                  // the stair: a half metre a cell
for (let z = 76; z <= 92; z++) for (let x = 26; x <= 57; x++) setCell(L, x, z, HALL, 6, 20);
for (let z = 93; z <= 98; z++) for (let x = 38; x <= 45; x++) setCell(L, x, z, HALL, 6, 24);                                                                       // the shaft (the lift sector)
for (let z = 81; z <= 84; z++) for (let x = 58; x <= 65; x++) setCell(L, x, z, HALL, 6, 14);                                                                       // the way out
const LIFT = []; for (let z = 93; z <= 98; z++) for (let x = 38; x <= 45; x++) LIFT.push([x, z]);
for (const [x, z] of [[31, 80], [52, 80], [31, 88], [52, 88], [41, 83]]) for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) L.g[z + dz][x + dx] = BONE;                      // pillars of the gate hall
// ---- the hidden chapel: behind the north arm ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const SEC = { panel: [41, 7], cells: [] };
for (let z = 2; z <= 6; z++) for (let x = 38; x <= 45; x++) { setCell(L, x, z, CHAPEL, 1, 12); SEC.cells.push([x, z]); }
setCell(L, 41, 7, 'S', 0);
// ---- objects -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const P = placer(L); const { E, P: PK, PR } = P; L.put(41, 11, '@'); P.reserve(41, 11);
for (const [x, z] of [[16, 12], [28, 12], [41, 12], [54, 12], [67, 12], [16, 63], [28, 63], [54, 63], [67, 63], [16, 30], [16, 45], [67, 30], [67, 45]]) PR('lamp', x, z);
for (const [x, z] of [[33, 29], [50, 29], [33, 46], [50, 46], [26, 22], [57, 22], [26, 53], [57, 53], [41, 25], [41, 51]]) PR('lamppost', x, z);
for (const [x, z] of [[24, 20], [30, 26], [36, 32], [46, 32], [52, 26], [58, 20], [24, 55], [34, 52], [48, 52], [58, 55], [30, 36], [52, 40]]) PR('grave', x, z);
for (const r of Object.values(CH)) { PR('lamp', r[0] + 4, r[1] + 3); PR('lamp', r[0] + 4, r[3] - 3); }
for (const x of [38, 39, 40, 41, 42, 43, 44, 45]) PR('pew', x, 92);                                                                                                // the rail of the lift shaft: a row of pews
for (const [x, z] of [[30, 80], [30, 88], [53, 80], [53, 88], [34, 78], [49, 78], [41, 86], [60, 82]]) PR('lamp', x, z);
for (const [x, z] of [[39, 91], [44, 91]]) PR('lantern', x, z);
// latches: one in each chapel, beside a candle
const LATCH = { c1: { at: [2, 11], wall: 'west' }, c2: { at: [81, 11], wall: 'east' }, c3: { at: [81, 63], wall: 'east' }, c4: { at: [2, 63], wall: 'west' } };
for (const [id, v] of Object.entries(LATCH)) { PR('lantern', v.at[0] + (v.wall === 'west' ? 1 : -1), v.at[1] - 1); PR('lantern', v.at[0] + (v.wall === 'west' ? 1 : -1), v.at[1] + 1); }
// the roster
const R = (list, kind, extra = {}) => list.forEach(([x, z]) => E(kind, x, z, extra));
R([[15, 38], [68, 36], [34, 64], [52, 64], [34, 11], [52, 11]], 'zealot', { group: 'hunters' });
R([[30, 24], [52, 24], [30, 50], [52, 50]], 'gaunt', { group: 'garden' }); R([[6, 12], [77, 12], [77, 64], [6, 64]], 'gaunt');
R([[15, 20], [68, 20], [68, 56], [15, 56]], 'tollbearer', { variant: 'hived' }); R([[20, 11], [63, 64]], 'bellhand');
R([[41, 22], [41, 54], [24, 40]], 'sexton', { group: 'garden' }); E('weeping', 59, 40, { group: 'garden' }); R([[15, 50], [68, 16]], 'bulwark', { group: 'hunters' });
for (const [x, z, k] of [[41, 14, 'health_small'], [26, 11, 'health_small'], [14, 24, 'health_small'], [68, 30, 'health_small'], [68, 48, 'health_small'], [14, 52, 'health_small'], [41, 62, 'health_small'], [28, 64, 'health_small']]) PK(k, x, z);
const sec = SEC.cells; PK('ammo_rocket', sec[3][0], sec[3][1]); PK('ammo_rocket', sec[6][0], sec[6][1]); PK('armor_vest', sec[10][0], sec[10][1]); PK('health_large', sec[13][0], sec[13][1]); PK('ammo_round', sec[16][0], sec[16][1]);
const EXIT = [65, 82];
// the cloister answers each latch: two Gaunts and a Zealot step out of the dark of the chapel, behind whoever threw the latch
const AMB = { c1: [[6, 9], [6, 14], [7, 11], [8, 9], [8, 14]], c2: [[77, 9], [77, 14], [76, 11], [75, 9], [75, 14]], c3: [[77, 61], [77, 66], [76, 63], [75, 61], [75, 66]], c4: [[6, 61], [6, 66], [7, 63], [8, 61], [8, 66]] };
const AMBUSH = Object.fromEntries(Object.entries(AMB).map(([id, cells]) => [id, [{ spawn: { kind: 'gaunt', at: cells[0], group: 'amb-' + id } }, { spawn: { kind: 'gaunt', at: cells[1], group: 'amb-' + id } }, { spawn: { kind: 'zealot', at: cells[2], group: 'amb-' + id } }, { spawn: { kind: 'bellhand', at: cells[4], group: 'amb-' + id } }]]));
const chapelMsg = (id, at, text) => ({ id, at, radius: 0.1, speaker: 'HULL', text });
const MAP = {
  id: 'C2M22', name: 'Mourning Halls', version: 1, ceilingHeight: 4.2, par: { time: 480 },
  atmosphere: { look: 'mourning', sky: 'overcast', fog: '#262428', fogDensity: 0.012 },
  entryLoadout: { hp: 100, armor: 30, ammo: { flare: 14, shell: 22, rivet: 150, bolt: 10, cell: 30, round: 30, rocket: 3 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'MOURNING HALLS', lines: ['A cloister with a garden of graves, and a chapel at every corner with somebody in it.', 'There is not much left to shoot with. There is not much to shoot.'] },
  outro: 'The lift came to the bottom and stopped. The shaft is a very long way down. The door in the east wall of the hall had unlocked itself by then, and nobody was in the room to hear it.',
  objective: 'Throw the latch in each of the four chapels, one at each corner of the cloister. Ammunition is low: spend it',
  ...L.layers(),
  secrets: [{ id: 'hidden-chapel', panel: SEC.panel, cells: SEC.cells }],
  groups: [], sectors: [{ id: 'lift', cells: LIFT, low: 0, high: 3, speed: 0.12, start: 'high' }],
  entities: [...P.ents,
    ...Object.entries(LATCH).map(([id, v], i) => ({ type: 'switch', id, at: v.at, wall: v.wall, once: true, do: [{ message: id }, ...AMBUSH[id], { objective: ['The north-west latch is thrown. Three chapels more', 'The north-east latch is thrown. The others are south', 'The south-east latch is thrown. One chapel more, the south-west', 'The south-west latch is thrown'][i] }] })),
    { type: 'exit', at: EXIT, dest: 'next', locked: true }],
  scenery: [],
  messages: [
    { id: 'start', at: [41, 11], radius: 5, speaker: 'INES', text: 'A cloister. The arcade is low and the garden in the middle is full of stones with names cut in them in a hand I cannot read. There is a candle lit at every corner of the building.' },
    { id: 'count', at: [41, 14], radius: 4, speaker: 'TALLY PLATE', text: 'THE SILENT IN THIS HOUSE: 6. TO THE LIFT, ON THE CALL. A number is crossed out and written again in the margin: 4.' },
    { id: 'plan', at: [16, 28], radius: 6, speaker: 'HULL', text: 'The four chapels are at the corners. Each has a latch on the far wall, beside the candles. When all four are thrown the call goes out.' },
    { id: 'hunt', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'A bell has gone in the south arm, three strokes. The Songkeepers on the rounds have stopped walking and turned to face the north-west chapel.' },
    { id: 'zealot', at: [15, 36], radius: 6, speaker: 'INES', text: 'Songkeepers in the arcade, in pairs, walking the rounds. They are not looking for me yet. They are looking for what the chapels hold.' },
    chapelMsg('c1', [1, 1], 'The latch is thrown. The cell behind the altar is empty. The bench is still warm.'),
    chapelMsg('c2', [1, 1], 'The second latch. A cup on the floor, still wet. Whoever it held went out by the arcade without a sound.'),
    chapelMsg('c3', [1, 1], 'The third latch. The cell is open and there is a folded cloth on the bench. The candle beside it has just been lit.'),
    chapelMsg('c4', [1, 1], 'The fourth latch. Every cell in the house is open now.'),
    { id: 'call', at: [1, 1], radius: 0.1, speaker: 'HULL', text: 'The horn at the south end has sounded the call. The Silent are going to the lift in the gate hall.' },
    { id: 'door-shut', at: [41, 65], radius: 4, speaker: 'HULL', text: 'The door at the head of the stair to the gate hall is shut. It opens to the call, and the call is the fourth latch.' },
    { id: 'hall', at: [41, 78], radius: 6, speaker: 'HULL', text: 'The gate hall. The lift shaft is behind the last row of pews: the rail will keep you out of it. Stay behind the rail.' },
    { id: 'door', at: [60, 82], radius: 5, speaker: 'HULL', text: 'The way out is sealed until the lift has gone down. It does not need a key or a lever. It needs the Silent to be gone.' },
    { id: 's1', at: [1, 1], radius: 0.1, speaker: 'A SILENT', text: 'I will not sing it. I sang it forty years and it was never mine.' },
    { id: 's2', at: [1, 1], radius: 0.1, speaker: 'A SILENT', choice: 'halls=silent', text: 'You are the one who came by the low halls. You asked nothing of us. I will not count you.' },
    { id: 's2b', at: [1, 1], radius: 0.1, speaker: 'A SILENT', choice: 'halls!=silent', text: 'You went through the gallery. I heard what was left of it. I will not thank you and I do not blame you.' },
    { id: 's3', at: [1, 1], radius: 0.1, speaker: 'A SILENT', text: 'I will not answer. Whoever calls, I will stand here.' },
    { id: 's4', at: [1, 1], radius: 0.1, speaker: 'A SILENT', choice: 'halls=silent', text: 'I will not forget the ones who sang. I have kept them in order. Carry a light, low. They follow it, and they do not ring it.' },
    { id: 's5', at: [1, 1], radius: 0.1, speaker: 'A SILENT', choice: 'halls=silent', text: 'Thank you for the quiet.' },
    { id: 's6', at: [1, 1], radius: 0.1, speaker: 'A SILENT', choice: 'halls=silent', text: 'Go down. Do not wait for us.' },
    { id: 'gone', at: [1, 1], radius: 0.1, speaker: 'INES', text: 'They did not look at me, and they did not look back. Forty feet down the shaft the light of the lift went out, one lamp at a time.' },
    { id: 'hollow', at: [41, 9], radius: 3, speaker: 'HULL', text: 'The north wall of the arcade rings hollow in one run of cells. There is a door in it, painted over.' },
    { id: 'g1', at: [41, 4], radius: 4, speaker: 'A SILENT (NOTE)', text: 'My sister is under the third stone. She sang the count at the Gate for twenty years and stopped on the day it asked her to sing me. They put her here. I took the next house along.' },
    { id: 'g2', at: [39, 4], radius: 4, speaker: 'A SILENT (NOTE)', text: 'I tend the stones. Nobody comes. The ones who sang are kept in order by size, and the Silent in order by the day they stopped. She is first. I am not on the list yet.' },
    { id: 'g3', at: [43, 4], radius: 4, speaker: 'A SILENT (NOTE)', text: 'If you are the one with the lamp, put it here for the length of one candle. Then take it with you. She was afraid of the dark at the end, and I never got it right.' },
  ],
  triggers: [
    { id: 'garden', when: 'msg:c3', do: [{ wake: 'garden' }] },
    { id: 'hunt', when: 'msg:c1', do: [{ wake: 'hunters' }, { message: 'hunt' }] },
    { id: 'call-six', when: ['msg:c1', 'msg:c2', 'msg:c3', 'msg:c4', 'choice:halls=silent'], do: [{ sound: 'toll' }, { tremor: 0.4 }, { message: 'call' }, { open: [41, 68] }, { objective: 'The call has gone out. The gate hall is south, down the stair from the south arm' }, ...[[39, 95], [41, 94], [43, 95], [40, 97], [42, 96], [44, 97]].map(([x, z]) => ({ spawn: { kind: 'vaelfolk', at: [x, z], group: 'silent' } }))] },
    { id: 'call-three', when: ['msg:c1', 'msg:c2', 'msg:c3', 'msg:c4', 'not:choice:halls=silent'], do: [{ sound: 'toll' }, { tremor: 0.4 }, { message: 'call' }, { open: [41, 68] }, { objective: 'The call has gone out. The gate hall is south, down the stair from the south arm' }, ...[[40, 95], [42, 96], [44, 95]].map(([x, z]) => ({ spawn: { kind: 'vaelfolk', at: [x, z], group: 'silent' } }))] },
    { id: 'sink', when: ['msg:call', 'msg:hall'], do: [{ sector: { id: 'lift', to: 'low' } }, { objective: 'The lift is going down. Stay behind the rail and listen' }, { message: 's1' }, { message: 's2' }, { message: 's2b' }, { message: 's3' }, { message: 's4' }, { message: 's5' }, { message: 's6' }, { message: 'gone' }] },
    { id: 'open', when: 'sector:lift:low', do: [{ exit: { set: 'unlock' } }, { objective: 'The lift has gone. The exit is open: it is at the east end of the hall' }] },
  ],
  quality: { enemies: [15, 40], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'switches', 'secret'], skins: 5,
    enemyKinds: { zealot: 4, gaunt: 6, tollbearer: 3, bellhand: 1, sexton: 2, weeping: 1, bulwark: 2 },
    scaleClass: 'MIXED', introduces: 'the loss: a quiet cloister, ammunition cut to a fifth, and a scripted lift that takes the Silent down while the player watches' },
};
MAP.drops = { scale: 0.4, keep: [] };
console.log('C2M22: enemies', P.ents.filter((e) => e.type === 'enemy').length, 'secret', SEC.cells.length);
const Z = (x, z) => [x, z];
export const waypoints = {
  main: [[41, 11, 0], Z(30, 12), Z(14, 12), Z(8, 11), { op: 'switch', id: 'c1' }, Z(14, 12), Z(30, 12), Z(52, 12), Z(66, 12), Z(77, 11), { op: 'switch', id: 'c2' }, Z(68, 12), Z(68, 30), Z(68, 48), Z(68, 62), Z(77, 63), { op: 'switch', id: 'c3' }, Z(68, 63), Z(52, 63), Z(41, 64), Z(28, 63), Z(14, 63), Z(8, 63), { op: 'switch', id: 'c4' }, Z(14, 63), Z(28, 64), Z(41, 64), [41, 69, 0], [41, 75, 0], Z(41, 82), { op: 'wait', seconds: 36 }, [50, 83, 0], [58, 83, 0], [64, 83, 0], [EXIT[0], EXIT[1], 0]],
  secret: [[41, 11, 0], [41, 10, 0], { op: 'use', at: SEC.panel }, [41, 5, 0], [41, 10, 0], Z(30, 12), Z(14, 12), Z(8, 11), { op: 'switch', id: 'c1' }, Z(14, 12), Z(30, 12), Z(52, 12), Z(66, 12), Z(77, 11), { op: 'switch', id: 'c2' }, Z(68, 12), Z(68, 30), Z(68, 48), Z(68, 62), Z(77, 63), { op: 'switch', id: 'c3' }, Z(68, 63), Z(52, 63), Z(41, 64), Z(28, 63), Z(14, 63), Z(8, 63), { op: 'switch', id: 'c4' }, Z(14, 63), Z(28, 64), Z(41, 64), [41, 69, 0], [41, 75, 0], Z(41, 82), { op: 'wait', seconds: 36 }, [50, 83, 0], [58, 83, 0], [64, 83, 0], [EXIT[0], EXIT[1], 0]],
};
export default MAP;
