// THE HIVE YARDS, THE DARK (PT-045, drop B, design/PREVIEW.md wing 3): the two yards of the Preview that need a DARK map (a hand lantern is only carried where it is dark, `atmosphere.dark`), so they could not stand in HIVEYARDS beside the machines.
// A DEV-ONLY map like HIVE and HIVEYARDS: never in maps/, never validated, counted or scored. Build it with  node tools/dev/build-range.mjs HIVEDARK  ; the DEV level picker lists it. The Range's rules: every weapon, ammunition refilled, 600 s of oil in the lantern, a player who cannot die.
//   WEST  the SLEEPERS' YARD  (the noise tell, E9: C2M26 Silent Roots in small): root columns for cover, ten sleepers, a HUD line that says QUIET or LOUD and how far a shot carries, a ring on the automap (Tab); the eyes of a creature that follows light notice you at 6 m unlit, 24 m lit
//   EAST  the LAMP YARD       (the lamp holds sound back, ACTD.md section 1): a Sub-Cantor that cannot be killed sends a ring every few seconds; light the lamp (L): a ring that reaches you is cut to 0.6, Ines's own lamp to 0.4; two levers swap the lamps; cover and a half-metre step are the other answers
// A lit lantern also makes the creatures that follow eyes see you from 24 m: that is the trade the lamp is.
import { Level } from '../tools/mapkit/builder.mjs';
import { placer } from '../tools/mapkit/c2.mjs';

const W = 140, H = 80, L = new Level(W, H, { fill: '#' }); L.usedHeights = true; L.usedCeil = true;
const EAST = Math.PI / 2, WEST = -Math.PI / 2, NORTH = 0, SOUTH = Math.PI;
const P = placer(L, { silent: false }), ents = P.ents, put = (e) => ents.push(e);
const enemy = (kind, x, z, facing, extra = {}) => put({ type: 'enemy', kind, at: [x, z], facing, ...extra });
const messages = [], zones = [];
const say = (id, x, z, r, text) => messages.push({ id, at: [x, z], radius: r, speaker: 'HULL', text });
const HR = (r) => [r[0] - 1, r[1] - 1, r[2] + 1, r[3] + 1];

// ---- the plaza -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const HUB = [50, 28, 90, 52];
L.room(HUB, { floor: 't', wall: 'P' }); L.ceiling(HUB, 9); zones.push({ rect: HR(HUB), look: 'customs' });
for (const [x, z] of [[56, 32], [84, 32], [56, 48], [84, 48], [70, 40]]) put({ type: 'prop', kind: 'lamp', at: [x, z] });
L.put(70, 40, '@'); put({ type: 'exit', dest: 'next', at: [70, 50] });
say('hub', 70, 40, 8, 'THE HIVE YARDS, THE DARK (dev): west the sleepers\' yard (the noise tell), east the lamp yard (the lamp holds sound back). L lights the lantern. Nothing can kill you here.');
say('exit', 70, 48, 4, 'THE EXIT is south of here: it goes back to the title.');

// ---- WEST, the sleepers' yard ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const SY = [4, 10, 44, 70];
L.room(SY, { floor: 'Κ', wall: 'κ' }); L.ceiling(SY, 8); zones.push({ rect: HR(SY), look: 'roots' });
for (const [x, z] of [[40, 38], [40, 42]]) put({ type: 'prop', kind: 'lamp', at: [x, z] });                       // two lit lamps at the door: the only light in the yard but your own
const COLS = [[36, 20], [36, 58], [30, 30], [30, 48], [28, 38], [22, 16], [22, 62], [20, 26], [20, 52], [16, 38], [12, 20], [12, 58], [10, 40], [26, 10], [26, 68], [34, 38]];
for (const [x, z] of COLS) put({ type: 'prop', kind: 'pillar', at: [x, z] });
const SLEEPERS = [['zealot', 32, 24], ['zealot', 18, 44], ['zealot', 8, 30], ['gaunt', 26, 34], ['gaunt', 24, 56], ['gaunt', 14, 24], ['gaunt', 8, 52], ['tollbearer', 30, 62], ['tollbearer', 16, 46], ['tollbearer', 10, 36]];
SLEEPERS.forEach(([k, x, z], i) => enemy(k, x, z, i % 2 ? EAST : WEST));
say('sy', 41, 40, 6, "THE SLEEPERS' YARD. Ten sleep among the columns. The HUD says QUIET or LOUD for the gun in hand and how far a shot carries (Tab: the ring). The arc, the fork and a blow are quiet.");
say('sy2', 24, 40, 8, 'Judge: is the tell useful (do you change weapon for it)? Is 6 m dark / 24 m lit a fair way to be seen? Is the quiet kill a real option? (Pause, Restart puts them back to sleep.)');
say('sy3', 8, 40, 5, 'The far wall. The sleepers still asleep are the ones you passed quietly.');

// ---- EAST, the lamp yard ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const LY = [96, 28, 128, 52];
L.room(LY, { floor: 'Ν', wall: 'ν' }); L.ceiling(LY, 10); zones.push({ rect: HR(LY), look: 'rootbell' });
L.height([104, 28, 120, 33], 3); L.height([104, 34, 120, 34], 2); L.height([104, 35, 120, 35], 1);              // a ledge 1.5 m up north of the Sub-Cantor, a half-step stair to it: the ring passes under whoever stands there
for (const [x, z] of [[100, 30], [100, 50], [124, 30], [124, 50]]) put({ type: 'prop', kind: 'lamp', at: [x, z] });
for (const [x, z] of [[106, 38], [106, 42]]) put({ type: 'prop', kind: 'pillar', at: [x, z] });
enemy('subcantor', 112, 40, WEST, { hold: 'turn', hp: 5000, sight: 40, rings: true });                          // its ring turns back at 22 m: the yard is the 22 m round it
put({ type: 'switch', id: 'plain', at: [96, 36], wall: 'west', once: false, do: [{ lamp: 'plain' }, { objective: 'The plain hand lantern: a ring is cut to 0.6 while it is lit' }] });
put({ type: 'switch', id: 'own', at: [96, 44], wall: 'west', once: false, do: [{ lamp: 'own' }, { objective: "Ines's own lamp: a ring is cut to 0.4 while it is lit" }] });
say('ly', 99, 40, 7, "THE LAMP YARD. The Sub-Cantor cannot be killed; its ring reaches 22 m. L lights the lantern: a ring is cut to 0.6. West-wall levers: the plain lantern, or Ines's own (0.4).");
say('ly2', 112, 48, 8, 'Judge: is the lamp a real trade (it is the only way to take less, but creatures that follow light see you from 24 m) or a fiddly one? Are cover and the ledge better answers?');

// ---- the passages --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
for (const r of [[45, 38, 49, 42], [91, 38, 95, 42]]) { L.room(r, { floor: 't', wall: 'P' }); L.ceiling(r, 7); }

const layers = L.layers();
export default {
  id: 'HIVEDARK', name: 'The Hive Yards, the dark (dev only)', version: 1, ceilingHeight: 8, range: true, noiseTell: true,
  atmosphere: { look: 'customs', fog: '#1c2224', fogDensity: 0.01, sky: 'dusk', dark: true, ambient: 0.5 },
  lantern: { oil: 600, max: 600 }, lampHolds: { plain: 0.6, own: 0.4 },
  entryLoadout: { hp: 100, armor: 100, ammo: { flare: 30, shell: 40, rivet: 200, bolt: 24, cell: 100, round: 180, rocket: 12 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine', 'linethrower', 'fork', 'mortar', 'boathook', 'marlinspike', 'mallet', 'axe', 'chainsaw'] },
  intro: { title: 'THE HIVE YARDS, THE DARK', lines: ['A lantern, sleepers and a creature that rings: the noise tell and the lamp that holds sound back.', 'Every weapon. Nothing runs out. You cannot die. L lights the lantern. F8 slows the game.'] },
  objective: 'HIVE DARK: sleepers\' yard west (quiet play), lamp yard east',
  ...layers,
  lookZones: zones, entities: ents.map((e) => ({ ...e })), startFacing: 'north', messages, triggers: [],
};
console.log('HIVEDARK: enemies', ents.filter((e) => e.type === 'enemy').length);
