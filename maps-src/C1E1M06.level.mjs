// C1E1M06 FERRY TERMINAL: the evacuation that never left. A wide set piece and the first elite.
// New ideas: the Warden-Graft (front-plated, charges in a straight line, stuns itself on a wall or a pillar: let it run into something), the bow ramp (a sector: a slab that stands 3.5 m tall until the winch drops it),
//            waves that pour out of the ferry, a watchtower with Bellhands, cover pillars across the quay.
// Route: hill road (west) -> concourse (colonnade, mezzanine, luggage) -> the quay -> winch cabin (north) -> pull the winch: the ramp crashes down, the hold empties, the Warden charges
//        -> kill it (flares round the plate, or dodge and let it hit a pillar) -> reinforcements -> board the ferry, east end.
import { Level } from '../tools/mapkit/builder.mjs';

const L = new Level(68, 46);
// concourse (interior, tall), the mezzanine along the north wall, its stairs at the east end
L.room([3, 10, 26, 34], { floor: 'f', wall: 'B' }); L.ceiling([3, 10, 26, 34], 7);
L.height([7, 10, 20, 12], 5); L.stairs([21, 10, 25, 12], 'x', 5, 1);
L.rect([7, 13, 20, 13], 'f');
// the arch to the quay (open), thick wall either side
L.rect([27, 20, 27, 26], 'f'); L.height([27, 20, 27, 26], 0);
// the quay: open air, planks over cobble, a wall of ferry hull on the east side with the bow ramp gap
L.room([28, 8, 53, 40], { floor: ':', wall: 'B' });
L.rect([28, 22, 53, 26], 'p');                                    // the loading lane: planks (the charge lane)
// hull wall (east of the quay) with the ramp gap at z 22..26
L.wall([54, 8, 55, 21], 'I'); L.wall([54, 27, 55, 40], 'I');
L.rect([54, 22, 55, 26], 'p'); L.height([54, 22, 55, 26], 1);
// the ferry hold (deck 0.5 m above the quay) and its rear bulkhead
L.room([56, 18, 63, 30], { floor: 'p', wall: 'I', height: 1 });
// the winch cabin on the north quay (interior), one door onto the quay
L.room([40, 3, 46, 6], { floor: 't', wall: 'I' }); L.door(43, 7);
// the watchtower (south quay): stairs east from the quay, a 3 m deck with a low parapet of crates
L.stairs([41, 33, 45, 36], 'x', 1, 5); L.height([46, 33, 51, 36], 6);
// pillars: solid stone blocks are props on the quay (the charge stops on them)

// ---- objects -------------------------------------------------------------------------------------------------------------
L.put(4, 22, '@');
// concourse: lamps, colonnade, ticket counter, benches, luggage rows
L.putAll('P', [[9, 17], [15, 17], [21, 17], [9, 28], [15, 28], [21, 28]]);
L.wall([12, 21, 18, 22], 'W');                                               // the ticket counter (solid, chest-high look; blocks sight)
L.putAll('f', [[6, 25], [8, 25], [6, 19], [8, 19], [22, 24], [24, 24], [22, 20], [24, 20]]);
L.putAll('z', [[6, 31], [11, 31], [17, 31], [23, 31], [10, 14], [22, 14]]); L.putAll('C', [[5, 27], [5, 28], [12, 31], [18, 31], [24, 32], [11, 26], [19, 26], [8, 22]]); L.putAll('c', [[6, 27], [13, 32], [19, 32], [10, 26], [20, 26]]); L.putAll('y', [[7, 32], [14, 31], [22, 31], [11, 15], [23, 15]]);
L.putAll('m', [[8, 11], [16, 11], [24, 11], [8, 33], [16, 33], [24, 33]]);
L.putAll('t', [[14, 24], [20, 24], [18, 30], [23, 27], [12, 19]]); L.putAll('g', [[12, 27], [22, 22]]); L.putAll('b', [[10, 11], [18, 11]]);
L.putAll('h', [[5, 24], [24, 30], [14, 13]]); L.putAll('e', [[7, 20], [21, 26], [16, 13]]); L.putAll('r', [[9, 24], [19, 21]]); L.put(6, 33, 'a'); L.put(24, 28, 'H');
// the quay: cover pillars and luggage stacks scattered across the apron, tightest around the loading lane
L.putAll('P', [[34, 12], [34, 20], [34, 28], [34, 36], [41, 17], [41, 31], [47, 18], [47, 30], [50, 24], [44, 36], [44, 15]]);
L.putAll('C', [[31, 14], [31, 16], [31, 32], [31, 34], [37, 24], [38, 14], [38, 34], [45, 22], [45, 26], [48, 12], [48, 36]]); L.putAll('c', [[32, 15], [32, 33], [38, 15], [38, 35], [46, 22], [46, 26]]); L.putAll('o', [[36, 18], [36, 30], [42, 20], [42, 28]]); L.putAll('z', [[30, 38], [30, 10], [39, 26], [40, 22]]);
L.putAll('n', [[30, 22], [30, 26], [52, 23], [52, 25], [36, 10], [36, 38]]);
L.putAll('t', [[33, 18], [33, 30], [40, 12], [40, 38], [46, 14], [46, 34], [37, 19], [37, 29], [50, 20], [49, 34], [43, 33], [30, 32], [36, 32], [36, 16]]); L.putAll('g', [[35, 24], [43, 30], [48, 32], [39, 16], [44, 20]]); L.putAll('b', [[47, 34], [51, 34]]);                           // two Bellhands on the tower deck
L.putAll('h', [[29, 12], [29, 36], [52, 10], [52, 38]]); L.putAll('e', [[32, 24], [42, 24], [49, 14]]); L.putAll('r', [[31, 20], [31, 28]]); L.putAll('a', [[33, 22], [33, 26], [45, 38]]); L.put(49, 35, 'H'); L.put(51, 36, 'v'); L.put(44, 22, 'H');
// winch cabin
L.put(43, 5, 'n'); L.putAll('H', [[41, 9], [45, 9], [52, 21], [52, 27]]); L.putAll('r', [[41, 5], [45, 5]]); L.putAll('e', [[41, 6], [45, 6], [51, 22], [51, 26]]); L.putAll('a', [[49, 22], [49, 26]]); L.putAll('h', [[41, 4], [45, 4]]);
// the ferry hold: idle until the winch; the Warden at the back, the rest close behind the ramp; lanterns aboard
L.put(61, 24, 'w'); L.putAll('t', [[58, 20], [58, 28], [60, 20], [60, 28], [62, 22], [62, 26]]); L.putAll('g', [[58, 22], [58, 26], [60, 22]]); L.putAll('n', [[57, 19], [57, 29], [63, 24]]); L.putAll('C', [[62, 20], [62, 28]]);
L.put(62, 24, '>');

const layers = L.layers();
const rampCells = [[54, 22], [55, 22], [54, 23], [55, 23], [54, 24], [55, 24], [54, 25], [55, 25], [54, 26], [55, 26]];

export default {
  id: 'C1E1M06', name: 'Ferry Terminal', version: 1, ceilingHeight: 4.2, par: { time: 700 },
  atmosphere: { fog: '#2a2c38', fogDensity: 0.01, sky: 'dusk' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'FERRY TERMINAL', lines: ['The last boat is still at the quay.', 'It never left. Nobody on it did either.'] },
  outro: 'Next: the Signal House. The antenna on the ridge still answers.',
  objective: 'Cross the terminal. The winch is in the cabin on the north quay',
  ...layers,
  groups: [{ name: 'warden', rect: [61, 24, 61, 24] }, { name: 'hold', rect: [56, 18, 63, 30] }],
  sectors: [{ id: 'ramp', cells: rampCells, low: 0.5, high: 4, speed: 4, start: 'high' }],
  entities: [
    { type: 'switch', id: 'winch', at: [43, 3], wall: 'north', do: [{ sector: { id: 'ramp', to: 'low' } }, { wake: 'hold' }, { wake: 'warden' }, { shake: 2 }, { objective: 'The ramp is down. Something plated is coming out: let it hit a pillar' }] },
  ],
  messages: [
    { id: 'start', at: [4, 22], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Ferry Terminal. The last boat never left the quay. The bow ramp is winched up: find the winch, the control cabin on the north quay.' },
    { id: 'board', at: [14, 23], radius: 3, speaker: 'TICKET BOARD', text: 'ALL SAILINGS CANCELLED. BOARDING BY WARDEN\'S ORDER ONLY. ALL PERSONS REMAIN IN THE HALL.' },
    { id: 'quay', at: [30, 24], radius: 3, speaker: 'INES', text: 'It is a big open quay. Move between the pillars, and keep the crates between you and the tower.' },
    { id: 'winch', at: [43, 5], radius: 2.5, speaker: 'WINCH PLACARD', text: 'BOW RAMP. RAISED FOR THE NIGHT. TWO HANDS, ONE CRANK. STAND CLEAR OF THE LANE.' },
    { id: 'warden', at: [46, 24], radius: 6, speaker: 'INES', text: 'That is Tide-Warden plate: the front is nearly armour-proof. Do not stand in front of it. Let it charge, and let it hit something.' },
    { id: 'aboard', at: [60, 24], radius: 3, speaker: 'SIGNAL HOUSE', text: 'The Signal House is next: the ridge antenna is still answering. Whatever comes down that ramp, it is not the only one.' },
  ],
  triggers: [
    { id: 'ramp-down', when: 'sector:ramp:low', do: [{ spawn: { kind: 'gaunt', at: [59, 23], group: 'wave1', facing: 'west' } }, { spawn: { kind: 'gaunt', at: [59, 25], group: 'wave1', facing: 'west' } }, { spawn: { kind: 'tollbearer', at: [60, 22], group: 'wave1', facing: 'west' } }, { message: 'warden' }] },
    { id: 'warden-down', when: 'dead:warden', do: [{ spawn: { kind: 'tollbearer', at: [58, 19], group: 'wave2', facing: 'west' } }, { spawn: { kind: 'tollbearer', at: [58, 29], group: 'wave2', facing: 'west' } }, { spawn: { kind: 'gaunt', at: [62, 22], group: 'wave2', facing: 'west' } }, { objective: 'The Warden is down. The ferry deck, east: the way out' }, { shake: 0.8 }] },
  ],
  quality: { enemies: [40, 66], botSeconds: [80, 600], mechanics: ['heights', 'switches', 'sectors', 'triggers'], skins: 6, enemyKinds: { wardengraft: 1, bellhand: 4 } },
};
