// THE RANGE (PT-016): a DEV-ONLY map for testing the weapons / melee / controls batch. Not one of the 68, not in maps/, never validated or counted; the dev server's level picker lists it first.
// Build it with: node tools/dev/build-range.mjs   (writes maps-dev/RANGE.json)
// Every weapon from the start, ammunition that refills and a player who cannot die (src/engine/range.js); targets that STAND on their posts (`hold`):
//   inert = takes every hit and never fights back (hp 5000 where it says so)   turn = faces you and swings   fixed = never turns (the sides and the back)
// Cells are 2 m. x = column, z = row (south is +z). An enemy's `facing` is the direction it looks as (sin, cos): 0 = south (+z), PI = north, PI/2 = east, -PI/2 = west.
import { Level } from '../tools/mapkit/builder.mjs';

const L = new Level(62, 32);
const S = 0, N = Math.PI, EAST = Math.PI / 2, WEST = -Math.PI / 2;

// ---- rooms ---------------------------------------------------------------------------------------------------------------
L.room([47, 9, 57, 23], { floor: 'f', wall: 'I' });             // the pen, behind the east wall
L.room([2, 6, 45, 27], { floor: 'f', wall: 'C' });              // the range
L.door(46, 16, { remote: true });                               // the pen's door: a lever opens it
L.fx([30, 17, 44, 25], 'w');                                    // the water bay (wading water: everything standing in it conducts the lamp)

// ---- dressing (lamps and a colonnade; the targets are entities below) ---------------------------------------------------------
L.putAll('m', [[7, 8], [15, 8], [23, 8], [31, 9], [39, 9], [7, 26], [15, 26], [23, 26], [31, 26], [39, 26], [52, 12], [52, 20]]);
L.putAll('P', [[28, 11], [28, 16], [28, 21]]);
L.put(22, 24, '@');                                              // the hub: the sponges north, the pair and the far sponge on this row, the crowd and the water north-east

// ---- targets -------------------------------------------------------------------------------------------------------------------
const E = [];
const t = (kind, x, z, facing, hold, extra = {}) => E.push({ type: 'enemy', kind, at: [x, z], facing, ...(hold ? { hold } : {}), ...extra });
const SPONGE = { hp: 5000 };

// north wall: the sponges, a metre from the wall (a harpoon bolt pins what has a wall close behind it), facing south
t('tollbearer', 5, 6, S, 'inert', SPONGE); t('gaunt', 9, 6, S, 'inert', SPONGE); t('bellhand', 13, 6, S, 'inert', SPONGE); t('sexton', 17, 6, S, 'inert', SPONGE); t('gill', 21, 6, S, 'inert', SPONGE); t('wardengraft', 25, 6, S, 'inert', SPONGE);
t('cantor', 31, 7, S, 'inert'); t('graftmother', 38, 7, S, 'inert');      // the bosses keep their own hit points (the boss bar and the node shield are part of what is tested)
// the middle row: swingers (turn to you, swing, lunge, charge, toll), each only noticing you within a few metres
t('tollbearer', 5, 13, S, 'turn', { sight: 6 }); t('gaunt', 9, 13, S, 'turn', { sight: 8 }); t('wardengraft', 13, 13, S, 'turn', { sight: 9 }); t('bellhand', 17, 13, S, 'turn', { sight: 10 }); t('sexton', 21, 13, S, 'turn', { sight: 6 });
// the south row: fixed (never turn): walk round them
t('tollbearer', 5, 19, EAST, 'fixed', { sight: 6 }); t('tollbearer', 9, 19, WEST, 'fixed', { sight: 6 }); t('tollbearer', 13, 19, N, 'fixed', { sight: 6 }); t('gaunt', 17, 19, N, 'fixed', { sight: 8 });
t('wardengraft', 21, 19, S, 'fixed', { sight: 6 }); t('wardengraft', 25, 19, N, 'fixed', { sight: 6 });
// a harpoon pair (two bodies on one line from the hub: face west) and a far sponge to the east for the rifle's range and a far sponge for the rifle's range
t('tollbearer', 14, 24, WEST, 'inert'); t('tollbearer', 18, 24, WEST, 'inert'); t('tollbearer', 43, 24, WEST, 'inert', SPONGE);
// the crowd: close together (flare splash and fire, scattergun spread, the arc's jumps); they fall and stand up again
for (const [i, x] of [33, 34.5, 36, 37.5].entries()) for (const [j, z] of [10, 11.5, 13].entries()) t((i + j) % 4 === 3 ? 'gaunt' : 'tollbearer', x, z, S, 'inert');
// the water bay: standing in it, they conduct the lamp's shock to each other
for (const [x, z] of [[32, 19], [35, 19], [38, 19], [33, 22], [36, 22], [39, 22], [42, 22]]) t('tollbearer', x, z, S, 'inert'); t('gaunt', 41, 19, S, 'inert');
// the Vael bay: gills (the lamp stuns them), a bell node and a feeder (the lamp does double)
t('gill', 41, 8, S, 'inert'); t('gill', 43, 8, S, 'inert'); t('gill', 45, 8, S, 'inert'); t('bellnode', 42, 12, S, 'inert'); t('feeder', 45, 12, S, 'inert');
// the pen: ordinary creatures, asleep until the lever (they fight as in the game and do not stand up again)
const pen = (kind, x, z) => E.push({ type: 'enemy', kind, at: [x, z], facing: WEST, group: 'pen' });
for (const [kind, x, z] of [['tollbearer', 50, 11], ['tollbearer', 54, 13], ['tollbearer', 51, 21], ['gaunt', 49, 15], ['gaunt', 53, 17], ['gaunt', 55, 21], ['bellhand', 56, 11], ['sexton', 55, 15], ['wardengraft', 52, 18]]) pen(kind, x, z);
E.push({ type: 'switch', id: 'pen', at: [45, 19], wall: 'east', once: true, do: [{ open: [46, 16] }, { wake: 'pen' }, { objective: 'The pen is open and awake: nine creatures, fighting as in the game' }, { shake: 1.5 }] });

const layers = L.layers();

export default {
  id: 'RANGE', name: 'The Range (dev only)', version: 1, ceilingHeight: 6, range: true,
  atmosphere: { fog: '#8d9a98', fogDensity: 0.006, sky: 'overcast' },
  entryLoadout: { hp: 100, armor: 100, ammo: { flare: 30, shell: 40, rivet: 200, bolt: 24, cell: 100 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'boathook', 'marlinspike', 'mallet', 'axe'] },
  intro: { title: 'THE RANGE', lines: ['Every weapon. Nothing runs out. You cannot die.', 'Targets stand where they are put.'] },
  objective: 'RANGE: sponges north, swingers middle, fixed south; crowd, water, Vael, pen east',
  ...layers,
  entities: E.map((e) => ({ ...e })).concat([{ type: 'exit', dest: 'next', at: [45, 27] }]),
  startFacing: 'north',
  messages: [
    { id: 'sponges', at: [15, 8], radius: 7, speaker: 'RANGE', text: 'SPONGES, a metre from the wall (the harpoon pins them): they take everything, never fight, heal after 3 s. West to east: Tollbearer, Gaunt, Bellhand, Sexton, Gill, Warden, bosses.' },
    { id: 'swingers', at: [13, 14], radius: 6, speaker: 'RANGE', text: 'SWINGERS stay on their posts and face you. A Gaunt lunges, a Warden charges, a Bellhand tolls. Guard with a melee weapon (hold Aim), parry, then step to their side.' },
    { id: 'fixed', at: [15, 20], radius: 7, speaker: 'RANGE', text: 'FIXED targets never turn: blows land only in front of them. Walk round. Marlinspike into the back of the one facing north. One Warden faces you (plated), the other shows its back.' },
    { id: 'crowd', at: [36, 12], radius: 4, speaker: 'RANGE', text: 'CROWD: flare splash and burning ground, scattergun spread, the arc lamp jumping (hold to charge, it forks). They fall and stand up again after 5 s.' },
    { id: 'water', at: [37, 21], radius: 6, speaker: 'RANGE', text: 'WATER: the arc lamp shocks everything standing in the water, not only what it hits. Wading slows you too.' },
    { id: 'vael', at: [43, 10], radius: 3, speaker: 'RANGE', text: 'VAEL: Gills (the lamp stuns them), a bell node and a feeder (the lamp does double). The two bosses take less damage while a node stands.' },
  ],
};
