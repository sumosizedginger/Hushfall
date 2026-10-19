// C2M15 ASH BASILICA: the elite gauntlet; Vael zealots who want the Grafting. (Campaign 2, Act B THE SOUNDING DEEP; design/ACTB.md.)
// A basilica burned out and kept: ash-grey stone, soot to the vault, an ember at the foot of every wall. The nave is five BAYS in a row, each shut at its north end by a rood screen with one door; in each bay a STATION of the
// Grafting (a font, a plate) and an elite that holds the screen: THE HAUL, THE HOLD, THE CHOCK, THE FIT, THE FLOAT (Ines, who grew up beside a slipway, reads the five stages of a launch). Bay one: a Bulwark Shell;
// bay two: the Weeping Mother; bay three: an Acolyte and three Zealots; bay four: Zealots in a rank, two Choristers; bay five: a Warden-Graft and three Choristers. A screen's door opens when everything that holds
// its bay is dead. Both aisles are raised two metres (walkable high ground, reached by ramps through the pillars, never connected to the next bay): the player may fight from above. The altar is the last room;
// the exit is behind it. A panel in the first aisle opens the crypt (the secret): a cell of the dead of this house, with what they left. Scale class COMPRESSION (roofed, short bays, screens).
// SHAPE: a basilica plan: a nave of five bays between pillar arcades, raised aisles, rood screens, an altar room; a straight, formal, burned thing, the opposite of the caves.
import { Level } from '../tools/mapkit/builder.mjs';
import { setCell, box, ramp, placer } from '../tools/mapkit/c2.mjs';

const W = 60, H = 130, L = new Level(W, H, { fill: '[' }); L.usedHeights = true; L.usedCeil = true;
const ROCK = '[', ASH = "'", MARBLE = '|', NAVE = ')', AISLE = 'f', SLAB = '^';
const S = 0, N = Math.PI, EAST = Math.PI / 2, WEST = -Math.PI / 2;
const NH = 8, AH = 12, LID = 34;
const BAY = (i) => ({ z0: 99 - 22 * i, z1: 119 - 22 * i, screen: 98 - 22 * i });          // rows of bay i, and the row of the screen at its north end
// ---- the entry, the five bays, the screens ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
box(L, [26, 120, 34, 127], NAVE, NH, 24);
for (let i = 0; i < 5; i++) {
  const b = BAY(i);
  box(L, [22, b.z0, 37, b.z1], NAVE, NH, LID); box(L, [10, b.z0, 20, b.z1], AISLE, AH, LID); box(L, [39, b.z0, 49, b.z1], AISLE, AH, LID);              // the nave, the west aisle, the east aisle
  for (const x of [21, 38]) box(L, [x, b.z0, x, b.z1], ASH);                                                                                  // the arcade: a wall of pillars with three ramps through it
  for (const dz of [3, 9, 15]) { for (const [x0, x1, from, to] of [[17, 21, AH, NH], [38, 42, NH, AH]]) ramp(L, [x0, b.z0 + dz, x1, b.z0 + dz + 2], 'x', from, to, NAVE, LID); }
  if (i < 4 || true) { box(L, [10, b.screen, 49, b.screen], ASH); L.door(30, b.screen, { remote: true }); L.height([30, b.screen, 30, b.screen], NH); }                // the rood screen with its one door
  for (const x of [26, 34]) box(L, [x, b.z0 + 12, x + 1, b.z0 + 13], MARBLE);                                                                 // two stone fonts (the stations) in the nave
}
// connect the bays: the screen rows are the only ways, the doors; the rows above each screen belong to the next bay
// ---- the altar room beyond the fifth screen ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
box(L, [22, 2, 37, 9], SLAB, NH, LID); box(L, [26, 3, 33, 5], SLAB, NH + 1, LID);
for (const x of [24, 35]) box(L, [x, 6, x, 6], MARBLE);
// ---- the crypt: a secret cell off the first aisle (west), behind a panel --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const SEC = { panel: [9, 110], cells: [] };
for (let z = 107; z <= 113; z++) for (let x = 4; x <= 8; x++) { setCell(L, x, z, SLAB, AH, AH + 12); SEC.cells.push([x, z]); }
setCell(L, 9, 110, 'S', AH);
for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) if (L.g[z][x] === ROCK) { let t = false; for (let dz = -1; dz <= 1 && !t; dz++) for (let dx = -1; dx <= 1; dx++) if ('f)^|'.includes(L.g[z + dz][x + dx])) { t = true; break; } if (t) L.g[z][x] = (x + z) % 7 ? ASH : MARBLE; }
const P = placer(L); L.put(30, 124, '@'); P.reserve(30, 124);
const { E, P: PK, PR } = P;
// ---- the burned house's furniture: lamps hung from the vault, lanterns at the screens, an organ at the altar ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (let i = 0; i < 5; i++) { const b = BAY(i); for (const dz of [4, 14]) { PR('lamp', 24, b.z0 + dz); PR('lamp', 36, b.z0 + dz); } PR('lantern', 28, b.screen + 1); PR('lantern', 32, b.screen + 1); PR('lantern', 14, b.z0 + 10); PR('lantern', 45, b.z0 + 10); }
PR('organ', 25, 3); PR('organ', 35, 3); PR('lamp', 28, 4); PR('lamp', 32, 4); PR('lantern', 24, 7); PR('lantern', 35, 7); PR('lantern', 30, 122); PR('lantern', 30, 126);
// ---- supplies (ammunition comes from the dead; in the aisles, above the fight, health and plate: the high ground pays) ------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (let i = 0; i < 5; i++) { const b = BAY(i); PK(i % 2 ? 'health_large' : 'health_small', 30, b.z1 - 2); PK('health_small', 14, b.z0 + 6); PK('health_large', 45, b.z0 + 6); PK('armor_vest', 14, b.z0 + 16); PK('armor_vest', 45, b.z0 + 12); }
PK('armor_vest', 30, 8); PK('health_large', 28, 8); PK('health_large', 32, 8);
PK('armor_vest', 6, 108); PK('health_large', 7, 110); PK('ammo_shell', 5, 109); PK('ammo_rivet', 7, 112); PK('ammo_flare', 5, 111); PK('ammo_bolt', 6, 112); PK('ammo_cell', 6, 110);
// ---- the five stations and their keepers ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const g = (n) => ({ group: 's' + n });
// station 1, THE HAUL: a Bulwark Shell and its porters
const b0 = BAY(0); E('bulwark', 30, b0.screen + 5, g(1)); E('gaunt', 26, b0.screen + 6, g(1)); E('gaunt', 34, b0.screen + 6, g(1)); for (const [x, z] of [[24, 110], [36, 110], [30, 105], [26, 114]]) E('tollbearer', x, z, g(1)); for (const [x, z] of [[28, 108], [32, 108]]) E('gaunt', x, z, g(1));
// station 2, THE HOLD: the Weeping Mother, with a brood to come
const b1 = BAY(1); E('weeping', 30, b1.screen + 5, g(2)); for (const [x, z] of [[24, 84], [36, 84], [30, 90]]) E('gaunt', x, z, g(2)); for (const [x, z] of [[26, 92], [34, 92]]) E('tollbearer', x, z, g(2));
// station 3, THE CHOCK: an Acolyte and three Zealots
const b2 = BAY(2); E('acolyte', 30, b2.screen + 8, g(3)); for (const [x, z] of [[24, b2.screen + 4], [30, b2.screen + 4], [36, b2.screen + 4]]) E('zealot', x, z, { ...g(3), facing: S }); for (const [x, z] of [[24, 66], [36, 66]]) E('tollbearer', x, z, g(3)); E('bellhand', 30, 70, g(3));
// station 4, THE FIT: Zealots in a rank, two Choristers behind them
const b3 = BAY(3); for (const x of [25, 30, 35]) E('zealot', x, b3.screen + 4, { ...g(4), facing: S }); E('chorister', 28, b3.screen + 10, g(4)); for (const [x, z] of [[24, 46], [36, 46]]) E('gaunt', x, z, g(4));
// station 5, THE FLOAT: a Warden-Graft, a Bulwark, three Choristers
const b4 = BAY(4); E('wardengraft', 30, b4.screen + 6, { ...g(5), facing: S }); for (const x of [25, 35]) E('chorister', x, b4.screen + 16, g(5)); for (const [x, z] of [[24, 24], [36, 24]]) E('tollbearer', x, z, g(5));
// the aisles: gunners on the high ground in bays three to five (they fire down: the player may go up and take them from behind)
for (const [x, z, k] of [[14, 62, 'bellhand'], [45, 40, 'bellhand'], [14, 22, 'chorister']]) E(k, x, z);
for (const [x, z] of [[16, 106], [43, 106], [16, 84], [43, 84]]) E('gaunt', x, z);
const MAP = {
  id: 'C2M15', name: 'Ash Basilica', version: 1, ceilingHeight: 4.2, par: { time: 660 },
  atmosphere: { look: 'basilica', fog: '#14100e', fogDensity: 0.012 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'ASH BASILICA', lines: ['A house of the Song, burned out and kept.', 'Five stations down the nave. At each one, someone who wants the Grafting to go on.'] },
  outro: 'Behind the altar a stair goes down. The ash on it has been walked by many feet, all going the same way.',
  objective: 'Fight up the nave, bay by bay. Each screen opens when the ones who hold it are dead. The altar is at the north end',
  ...L.layers(),
  secrets: [{ id: 'crypt', panel: SEC.panel, cells: SEC.cells }],
  groups: [],
  entities: [...P.ents, { type: 'exit', at: [30, 3], dest: 'next' }],
  scenery: [],
  messages: [
    { id: 'start', at: [30, 124], radius: 4, speaker: 'INES', text: 'Ash on the flags, soot to the roof and a long nave of five bays in a row. Everything that can burn has. The stone is still warm at the foot of the walls.' },
    { id: 'raised', at: [30, 117], radius: 4, speaker: 'HULL', text: 'The aisles are two metres up, and the ramps through the pillars are the only ways onto them. High ground costs a flight of steps and gives the nave in front of you.' },
    { id: 'haul', at: [30, 106], radius: 4, speaker: 'RINGING PLATE', text: 'First station, THE HAUL. Run a nail down it: the line is drawn in, hand over hand, by all of the ones who are able. It is owed.' },
    { id: 'slip', at: [30, 100], radius: 3, speaker: 'INES', text: 'Haul, hold, chock, fit, float. That is a launch. Five stages, in that order, on every slip I ever stood beside. They are launching something here.' },
    { id: 'hold', at: [30, 84], radius: 4, speaker: 'RINGING PLATE', text: 'Second station, THE HOLD. The line is made fast. It is not lost if it is held: the Mother holds it, and weeps, and does not let go.' },
    { id: 'chock', at: [30, 62], radius: 4, speaker: 'RINGING PLATE', text: 'Third station, THE CHOCK. A wedge is set and the wheel is stopped. The wheel is a person who has been asked to stand still.' },
    { id: 'fit', at: [30, 40], radius: 4, speaker: 'RINGING PLATE', text: 'Fourth station, THE FIT. The bell is fitted. A rank of the willing holds the one who is being fitted, so that it is done without fear.' },
    { id: 'float', at: [30, 18], radius: 4, speaker: 'RINGING PLATE', text: 'Fifth station, THE FLOAT. The first toll. After it the fitted one is no longer asked anything, because it has been answered.' },
    { id: 'zealot', at: [30, 34], radius: 5, speaker: 'INES', text: 'Spears in a rank, shoulder to shoulder, facing the screen with their backs to me. They guard the one behind them from the ones in front.' },
    { id: 'hollow', at: [10, 110], radius: 2, speaker: 'HULL', text: 'The west aisle wall of the first bay rings hollow behind a pillar that has been taken out of the row.' },
    { id: 'crypt', at: [6, 110], radius: 4, speaker: 'A SILENT (NOTE)', text: 'The ones of this house who would not be fitted are put here. Their bells are on the wall, unfitted, in a row. Take what they left.' },
    { id: 'altar', at: [30, 6], radius: 4, speaker: 'INES', text: 'An organ with no pipes left but the lowest ones, and the lowest are warm. Somebody is still playing this house. Very slowly. One note a minute.' },
  ],
  triggers: [
    { id: 'gate1', when: 'dead:s1', do: [{ open: [30, 98] }, { objective: 'The first screen is open: the Weeping Mother holds the second bay' }] },
    { id: 'gate2', when: 'dead:s2', do: [{ open: [30, 76] }, { objective: 'The second screen is open: an Acolyte and three Zealots hold the third' }] },
    { id: 'gate3', when: 'dead:s3', do: [{ open: [30, 54] }, { objective: 'The third screen is open: a rank of Zealots holds the fourth' }] },
    { id: 'gate4', when: 'dead:s4', do: [{ open: [30, 32] }, { objective: 'The fourth screen is open: the last bay, and a Warden-Graft' }] },
    { id: 'gate5', when: 'dead:s5', do: [{ open: [30, 10] }, { objective: 'The last screen is open. The altar and the exit are beyond' }] },
    { id: 'bay1', when: 'enter', at: [30, 112], radius: 5, do: [{ objective: 'The first bay: a Bulwark Shell holds the screen' }] },
  ],
  quality: { enemies: [40, 90], botSeconds: [40, 900], mechanics: ['heights', 'triggers', 'secret'], skins: 6, enemyKinds: { bulwark: 1, weeping: 1, acolyte: 1, zealot: 6, wardengraft: 1, chorister: 3, tollbearer: 8, gaunt: 8, bellhand: 2 },
    scaleClass: 'COMPRESSION', introduces: 'the elite gauntlet: five stations of the Grafting down a burned nave, each held by an elite or a rank (a Bulwark, the Weeping Mother, an Acolyte with Zealots, a rank of Zealots, a Warden-Graft), raised aisles for the high ground, and a screen that opens when its keepers are dead' },
};
MAP.drops = { scale: 1, keep: [] };
console.log('C2M15: enemies', P.ents.filter((e) => e.type === 'enemy').length);
const wp = []; for (let i = 0; i < 5; i++) { const b = BAY(i); wp.push([30, b.z1 - 2], [27, b.z0 + 11], [33, b.screen + 8], [28, b.screen + 3], [30, b.screen, 0]); }
export const waypoints = {
  main: [[30, 124, 0], [30, 120, 0], ...wp, [30, 8, 0], [30, 4, 0], [30, 3, 0]],
  secret: [[30, 124, 0], [30, 120, 0], [28, 114], [20, 112], [12, 110], { op: 'use', at: [9, 110] }, [6, 110, 0], [12, 110, 0], [28, 112], ...wp, [30, 8, 0], [30, 4, 0], [30, 3, 0]],
};
export default MAP;
