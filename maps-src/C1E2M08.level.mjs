// C1E2M08 THE GRAFTING FLOOR: the Episode 2 boss, the Graft-Mother. The production line breaks.
// Scale class COMPRESSION (design/CAMPAIGN_SPINE.md): a roofed hall cut up by the line's own machinery (a long conveyor down the middle, four machine blocks, pillars), so no sightline runs past the limit. The Graft-Mother is a pod the size
// of a room at the north end, SHIELDED while any of her three cradle feeders stands (west, east, and one behind the conveyor); she spits spore fans from the start, hatches Drone-Gills from the egg sacs round her, and slams anything that
// reaches her. Destroy the feeders (a trigger tells you the shield is down), then the Mother: the exit is locked until she falls.
// Route: the airlock -> the approach (a gang, machinery) -> the door -> the grafting floor: the three feeders, then the Graft-Mother (the bot's `killboss` op) -> the exit.
// Optional: a SECRET stash behind a panel in the approach's south wall: armour and ammunition for the boss.
// Open air vs roof: everything is `g f` (roofed). Nothing is hung in the open.
import { Level } from '../tools/mapkit/builder.mjs';

const L = new Level(66, 56);

// ---- the airlock, the approach, the grafting floor ---------------------------------------------------------------------------------------------------------------------------
L.room([3, 26, 9, 32], { floor: 'f', wall: 'K' }); L.door(10, 29);
L.room([11, 24, 24, 34], { floor: 'g', wall: 'R' }); L.door(25, 29);
L.room([26, 8, 60, 46], { floor: 'f', wall: 'Y' });
// the line's machinery: a long conveyor down the middle, four machine blocks, and short walls round the Mother's dais that break the north sightlines
L.rect([41, 22, 45, 40], 'I');
for (const r of [[30, 20, 34, 24], [52, 20, 56, 24], [30, 32, 34, 36], [52, 32, 56, 36], [34, 12, 35, 15], [51, 12, 52, 15], [35, 28, 36, 29], [50, 28, 51, 29]]) L.rect(r, 'I');
L.room([16, 36, 20, 38], { floor: 'f', wall: 'R' }); L.secretPanel(18, 35);                                    // the stash

// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(5, 29, '@');
L.putAll('D', [[6, 27], [6, 31]]); L.putAll('f', [[4, 27], [4, 31]]); L.put(3, 29, 'F'); L.putAll('m', [[5, 26], [5, 32]]); L.putAll('e', [[8, 28], [8, 30]]); L.putAll('r', [[3, 27], [3, 31]]); L.put(7, 29, 'h');
// the approach: a gang, machinery, lanterns; ammunition on the lane z=28..30
L.putAll('t', [[20, 27], [20, 31]]); L.put(18, 29, 'g');
L.putAll('O', [[14, 28], [14, 30], [19, 25], [19, 33]]); L.putAll('D', [[16, 25], [16, 33], [22, 29]]); L.putAll('n', [[12, 29], [24, 28], [24, 30]]); L.putAll('m', [[13, 25], [13, 33], [21, 25], [21, 33]]);
L.putAll('P', [[17, 27], [17, 31]]); L.putAll('e', [[13, 29], [16, 29], [19, 29], [23, 29]]); L.putAll('r', [[12, 28], [12, 30], [17, 29], [21, 29]]); L.putAll('a', [[14, 27], [14, 31], [20, 29]]); L.putAll('h', [[12, 26], [12, 32]]); L.putAll('H', [[24, 26], [24, 32]]);
// the grafting floor: the Graft-Mother on her dais (north centre), her three feeders, the brood's sacs round her; the line's occupants in the lanes; pods and cradles down the walls
L.putAll('t', [[28, 14], [58, 14], [38, 30], [48, 30], [38, 38], [48, 38]]); L.putAll('g', [[29, 18], [57, 18], [37, 26], [49, 26]]); L.putAll('b', [[28, 42], [58, 42], [28, 10]]);
L.putAll('O', [[28, 16], [58, 16], [28, 36], [58, 36], [38, 18], [48, 18], [38, 44], [48, 44]]); L.putAll('D', [[27, 22], [59, 22], [27, 30], [59, 30], [31, 10], [55, 10], [39, 22], [47, 22]]);
L.putAll('n', [[27, 12], [59, 12], [27, 44], [59, 44], [43, 12], [43, 20]]); L.putAll('m', [[33, 16], [53, 16], [33, 28], [53, 28], [33, 40], [53, 40], [43, 42]]);
L.putAll('P', [[37, 20], [49, 20], [37, 34], [49, 34], [28, 28], [58, 28]]);
L.putAll('e', [[27, 16], [59, 16], [27, 40], [59, 40], [37, 16], [49, 16], [38, 24], [48, 24], [38, 36], [48, 36], [33, 28], [53, 28]]);
L.putAll('r', [[27, 18], [59, 18], [27, 38], [59, 38], [37, 22], [49, 22], [38, 32], [48, 32], [43, 18], [46, 42]]);
L.putAll('a', [[28, 20], [58, 20], [28, 34], [58, 34], [38, 28], [48, 28], [41, 44], [43, 10]]);
L.putAll('h', [[27, 14], [59, 14], [27, 42], [59, 42], [37, 24], [49, 24], [38, 40], [48, 40]]); L.putAll('H', [[27, 26], [59, 26], [43, 14], [27, 32], [59, 32], [40, 41]]); L.putAll('v', [[27, 20], [59, 20], [43, 44]]);
// the stash: what is left for the night crew
L.put(17, 37, 'v'); L.put(19, 37, 'v'); L.put(17, 38, 'H'); L.put(19, 38, 'H'); L.put(18, 38, 'e'); L.put(18, 37, 'a'); L.put(17, 36, 'r'); L.put(19, 36, 'r');

const layers = L.layers();

export default {
  id: 'C1E2M08', name: 'The Grafting Floor', version: 1, ceilingHeight: 4.2, par: { time: 420 },
  atmosphere: { fog: '#2a1a30', fogDensity: 0.016, sky: 'night', ambient: 0.65 },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'THE GRAFTING FLOOR', lines: ['Every pipe in the Works ends in this room.', 'Something has been fed here for a very long time.'] },
  outro: 'Episode three: Landing Scar. Whatever the Mother was feeding, it has landed.',
  objective: 'The Graft-Mother is at the north end. Her three cradle feeders keep her shielded: west, east and behind the conveyor',
  ...layers,
  secrets: [{ id: 'night-stash', panel: [18, 35], cells: [[18, 36], [18, 37], [18, 38]] }],
  groups: [{ name: 'feeders', rect: [30, 14, 30, 14] }, { name: 'feeders', rect: [56, 14, 56, 14] }, { name: 'feeders', rect: [43, 42, 43, 42] }, { name: 'mother', rect: [43, 13, 43, 13] }],
  entities: [
    { type: 'exit', at: [28, 44], locked: true, dest: 'next' },
    { type: 'enemy', kind: 'feeder', at: [30, 14], group: 'feeders' }, { type: 'enemy', kind: 'feeder', at: [56, 14], group: 'feeders' }, { type: 'enemy', kind: 'feeder', at: [43, 42], group: 'feeders' },
    { type: 'enemy', kind: 'graftmother', at: [43, 13], group: 'mother', facing: 'south', summons: [[38, 12], [48, 12], [38, 17], [48, 17]] },
  ],
  messages: [
    { id: 'start', at: [5, 29], radius: 3, speaker: 'SIGNAL HOUSE', text: 'Calder, the Grafting Floor. The whole Works feeds this room. Whatever runs it is at the north end. Break its feeders first: it is shielded until they are gone.' },
    { id: 'approach', at: [15, 29], radius: 3, speaker: 'INES', text: 'The line comes in here. Cradles all the way down, and the sound of something large breathing. We are close.' },
    { id: 'floor', at: [30, 29], radius: 3, speaker: 'INES', text: 'There. Three cradle feeders, one on each wing and one behind the conveyor, feeding it through the floor. Break them and the shield falls.' },
    { id: 'mother', at: [43, 20], radius: 5, speaker: 'INES', text: 'It is a pod the size of a room. It spits, and it hatches the small ones from the sacs on its sides. Do not stand in the open.' },
    { id: 'stash', at: [18, 37], radius: 2.5, speaker: 'NIGHT LOG', text: 'EMERGENCY STORES FOR THE NIGHT CREW, IN CASE THE LINE SHOULD EVER GO BAD. IT HAS GONE BAD.' },
    { id: 'shield', at: [43, 20], radius: 0.1, speaker: 'INES', text: 'The shield is gone. All of it. Hit it, Calder, hit it with everything.' },
    { id: 'broken', at: [28, 44], radius: 3, speaker: 'SIGNAL HOUSE', text: 'The line is broken. Calder, whatever the Mother was feeding has landed. Episode three is a crater, and the Choir ships are in it.' },
  ],
  triggers: [
    { id: 'shield-down', when: 'dead:feeders', do: [{ objective: 'The shield is down. Kill the Graft-Mother, north end' }, { shake: 2 }, { message: 'shield' }] },
    { id: 'mother-dead', when: 'dead:mother', do: [{ exit: { set: 'unlock' } }, { objective: 'The line is broken. The exit is open: south-west corner' }, { shake: 3 }, { message: 'broken' }] },
  ],
  quality: { enemies: [20, 70], botSeconds: [60, 900], mechanics: ['triggers', 'secret'], skins: 5, enemyKinds: { graftmother: 1, feeder: 3, bellhand: 3 },
    scaleClass: 'COMPRESSION', introduces: 'the Graft-Mother: a boss that is a pod the size of a room, shielded by three cradle feeders, hatching Drone-Gills and spitting spore fans' },
};
