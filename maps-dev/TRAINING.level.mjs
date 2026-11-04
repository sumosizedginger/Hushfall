// THE TRAINING YARD (PT-083 U1): a shipped, optional map, one of no campaign: ten rooms in a line, each taught by doing, the door on to the next opening when you have done it.
// The Range's rules hold (you cannot die, ammunition refills). Build it with: node tools/dev/build-range.mjs TRAINING   (writes maps-dev/TRAINING.json; main.js imports that one file in every build).
// A message's {key:action} is shown as the player's own key or button.
import { Level } from '../tools/mapkit/builder.mjs';

const ROOMS = 10,
  W = 2 + 14 * ROOMS + 2,
  H = 20,
  Z0 = 4,
  Z1 = 15,
  MID = 9;
const L = new Level(W, H);
const room = (i) => ({ x0: 2 + 14 * i, x1: 2 + 14 * i + 12 });
const FLOORS = ['f', 'f', 't', 't', 'f', 't', 'f', 'f', 't', 'f'],
  WALLS = ['C', 'C', 'P', 'P', 'C', 'P', 'C', 'I', 'P', 'C'];
for (let i = 0; i < ROOMS; i++) {
  const r = room(i);
  L.room([r.x0, Z0, r.x1, Z1], { floor: FLOORS[i], wall: WALLS[i] });
  if (i < ROOMS - 1) L.door(r.x1 + 1, MID, { remote: true });
  L.putAll('m', [
    [r.x0 + 2, Z0],
    [r.x1 - 2, Z0],
    [r.x0 + 2, Z1],
    [r.x1 - 2, Z1],
  ]);
}
L.put(room(0).x0 + 1, MID, '@');
const doorOf = (i) => [room(i).x1 + 1, MID];
const open = (i, next) => [{ open: doorOf(i) }, { objective: next }];
const at = (i, dx, z = MID) => [room(i).x0 + dx, z];

// the sights' rail: crates to shoot over
L.putAll('c', [at(2, 4, 7), at(2, 4, 8), at(2, 4, 10), at(2, 4, 11)]);

const FACE_WEST = -Math.PI / 2;
const entities = [
  // 2: the far target of the sights
  { type: 'enemy', kind: 'tollbearer', at: at(2, 11), facing: FACE_WEST, group: 'sights' },
  // 3: one that comes for you
  { type: 'enemy', kind: 'tollbearer', at: at(3, 10), facing: FACE_WEST, group: 'close' },
  // 4: one that swings and swings
  { type: 'enemy', kind: 'tollbearer', at: at(4, 7), facing: FACE_WEST, hold: 'turn', hp: 5000, sight: 9 },
  // 5: a clump for the lamp
  { type: 'enemy', kind: 'tollbearer', at: at(5, 8, 8), facing: FACE_WEST, hold: 'inert', hp: 5000 },
  { type: 'enemy', kind: 'gaunt', at: at(5, 9, 10), facing: FACE_WEST, hold: 'inert', hp: 5000 },
  { type: 'enemy', kind: 'bellhand', at: at(5, 7, 11), facing: FACE_WEST, hold: 'inert', hp: 5000 },
  // 6: something to try a load on
  { type: 'enemy', kind: 'wardengraft', at: at(6, 8), facing: FACE_WEST, hold: 'inert', hp: 5000 },
  { type: 'exit', at: at(9, 11), dest: 'next' },
];

export default {
  id: 'TRAINING',
  name: 'The Training Yard',
  version: 1,
  ceilingHeight: 6,
  range: true,
  training: true,
  atmosphere: { look: 'customs', dark: true, fog: '#0c0f12', fogDensity: 0.006 },
  lantern: { oil: 60, max: 90, eternal: true },
  lookZones: [{ rect: [room(7).x0 - 1, Z0 - 1, room(7).x1 + 1, Z1 + 1], look: 'cellar', fog: '#020304', fogDensity: 0.09 }],
  entryLoadout: {
    hp: 100,
    armor: 50,
    ammo: { flare: 30, shell: 40, rivet: 200, bolt: 24, cell: 100, round: 180, rocket: 12 },
    weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'fists', 'carbine', 'linethrower', 'fork', 'mortar'],
  },
  intro: { title: 'THE TRAINING YARD', lines: ['Ten rooms. Each door opens when you have done what the room asks.', 'You cannot die here. {key:pause} leaves whenever you like.'] },
  objective: 'Walk to the far end of the room',
  ...L.layers(),
  doors: [],
  triggers: [
    { id: 't0', when: 'msg:walked', do: open(0, 'Hold the run key along this hall') },
    { id: 't1', when: 'did:sprint', do: open(1, 'Use the sights and kill the far one') },
    { id: 't2', when: 'dead:sights', do: open(2, 'Kill this one up close with the scattergun') },
    { id: 't3', when: 'dead:close', do: open(3, 'Guard against its blow') },
    { id: 't4', when: 'did:guard', do: open(4, 'Charge the lamp and let go') },
    { id: 't5', when: 'did:charged', do: open(5, 'Turn a gun to one of its loads') },
    { id: 't6', when: 'did:load', do: open(6, 'Light the lantern') },
    { id: 't7', when: 'lamp:on', do: open(7, 'Change gun with the wheel, or the last-gun key') },
    { id: 't8', when: 'did:switch', do: open(8, 'Walk out when you are ready') },
  ],
  entities,
  startFacing: 'east',
  messages: [
    { id: 's0', at: at(0, 1), radius: 3, speaker: 'THE YARD', text: '{key:forward} {key:left} {key:back} {key:right} to walk, the mouse to look. Walk to the far end.' },
    { id: 'walked', at: at(0, 11), radius: 3, speaker: 'THE YARD', text: 'The door has opened. A door with no handle answers to something you did somewhere else.' },
    { id: 's1', at: at(1, 1), radius: 3, speaker: 'THE YARD', text: 'Hold {key:sprint} to run. The gun comes down while you run: you cannot fire until you let go and it comes back up.' },
    { id: 's2', at: at(2, 1), radius: 3, speaker: 'THE YARD', text: 'Hold {key:aim} for the sights: slower on your feet, steadier on the target, and spread grows when you move. Kill the far one with {key:fire}.' },
    { id: 's3', at: at(3, 1), radius: 3, speaker: 'THE YARD', text: '{key:weapon2} is the scattergun. Wait until it is close and lifts its arm: a close hit knocks it out of its swing.' },
    { id: 's4', at: at(4, 1), radius: 3, speaker: 'THE YARD', text: '{key:weapon6} is your fists. Hold {key:aim} to guard. Raise it just as the blow lands and it is a parry: the next blow of yours hits twice as hard.' },
    { id: 's5', at: at(5, 1), radius: 3, speaker: 'THE YARD', text: '{key:weapon5} is the lamp. Tap for an arc that finds its own targets. Hold {key:fire} to charge, and let go.' },
    { id: 's6', at: at(6, 1), radius: 3, speaker: 'THE YARD', text: 'A gun can carry a load. {key:load} turns it to the next one: slag burns, rime chills, penetrators go through plate. A load is found, not given: here they are free.' },
    { id: 's7', at: at(7, 1), radius: 3, speaker: 'THE YARD', text: 'Dark. {key:lamp} lights the lantern. Oil runs out, and what hunts by light will see you.' },
    { id: 's8', at: at(8, 1), radius: 3, speaker: 'THE YARD', text: 'Tap {key:weaponLast} for your last gun. Hold it for the wheel: time slows while it is open, and you let go on the gun you want.' },
    { id: 's9', at: at(9, 1), radius: 3, speaker: 'THE YARD', text: '{key:map} opens the Journal: the map, what you have read, what each thing you pick up is for. It stops the clock. That is everything. The way out is ahead.' },
  ],
};
