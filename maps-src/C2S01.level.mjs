// C2S01 THE SILENT ORCHARD: the secret of the Drowned Choir; a hidden garden, a resource cache and the Tender's testimony. (Campaign 2, Act B THE SOUNDING DEEP; design/ACTB.md, design/LORE.md.)
// The crypt at the bottom of the east chapel of the Drowned Choir comes up in a garden: a cavern open to its own roof of small lights (sky_deep), ten raised beds of moss on swept paths, a lantern at each. No creature,
// no score, no ambience (`atmosphere.silence`). THE TENDER, the grave-keeper of the Cantor Outpost (C2M03), walked down after the cage was opened, and keeps the garden where the dead are set down. She speaks plainly
// (LORE section 4: no contractions, "the ones who sang" for the dead, "the count" for the Song): seven short pieces at seven beds, the longest text of the act, and what she says is true to the lore (the count is short, the Root
// Bell is tired, the dead are answered, the seed of the chimes is pressed for oil). The cache is in the beds: oil for the lantern, plate, health. The way out is the stair at the north, which returns to the main road at C2M13.
// SHAPE: a round garden with a ring of ten beds (not a box), two short corridors. Scale class SET-PIECE (open to the cave roof; a safe room, no creatures: quality.safe).
import { Level } from '../tools/mapkit/builder.mjs';
import { setCell, box, ellipse, placer } from '../tools/mapkit/c2.mjs';
import { skinWalls } from '../tools/mapkit/cave.mjs';

const W = 70, H = 64, L = new Level(W, H, { fill: '[' }); L.usedHeights = true; L.usedCeil = true;
const ROCK = '[', PATH = ',', BED = '7', FLOW = '{';
const FL = 4;
ellipse(L, 35, 31, 27, 21, PATH, FL);
box(L, [34, 48, 36, 60], FLOW, FL, 18); box(L, [34, 4, 36, 14], FLOW, FL, 18);
const beds = [];
for (let k = 0; k < 10; k++) {
  const a = (k * 36 + 18) * Math.PI / 180, cx = Math.round(35 + 17 * Math.cos(a)), cz = Math.round(31 + 13 * Math.sin(a));
  box(L, [cx - 2, cz - 1, cx + 2, cz + 1], BED, FL + 1); beds.push([cx, cz]);
}
skinWalls(L, ROCK, (x, z) => ((x + z) % 3 ? 'Q' : 'U'));
const P = placer(L); L.put(35, 58, '@'); P.reserve(35, 58);
const { PK, PR } = { PK: P.P, PR: P.PR };
for (const [x, z] of beds) PR('lantern', x, z - 3 > 9 ? z - 3 : z + 3);
for (const [x, z] of [[35, 24], [35, 38], [27, 31], [43, 31]]) PR('lantern', x, z);
PR('table', 35, 31);
const oilBeds = [0, 2, 4, 6, 8, 9];
for (const k of oilBeds) PK('oil', ...beds[k]);
for (const k of [1, 5]) PK('health_large', ...beds[k]);
for (const k of [3, 7]) PK('armor_vest', ...beds[k]);
PK('ammo_cell', 35, 33); PK('ammo_shell', 33, 31); PK('ammo_rivet', 37, 31); PK('ammo_bolt', 35, 29);
const MAP = {
  id: 'C2S01', name: 'The Silent Orchard', version: 1, ceilingHeight: 4.2, par: { time: 150 },
  atmosphere: { look: 'tender', sky: 'deep', silence: true, fog: '#1a2a18', fogDensity: 0.006 },
  entryLoadout: { hp: 100, armor: 50, ammo: { flare: 14, shell: 20, rivet: 90, bolt: 10, cell: 40, round: 50, rocket: 4 }, weapons: ['flare', 'scattergun', 'rivet', 'harpoon', 'arc', 'carbine'] },
  intro: { title: 'THE SILENT ORCHARD', lines: ['Ten beds under a roof of small lights.', 'Someone has kept them.'] },
  outro: 'The stair out of the garden comes up beyond the Drowned Choir, in the dark.',
  objective: 'Walk the garden. The beds hold what the keeper left for whoever came',
  ...L.layers(),
  secrets: [],
  groups: [],
  entities: [...P.ents, { type: 'exit', at: [35, 5], dest: 'next' }],
  scenery: [],
  messages: [
    { id: 'start', at: [35, 57], radius: 4, speaker: 'INES', text: 'A garden. Ten beds, the paths between them swept, and a roof of small lights. No sound at all, not even from the gate behind me.' },
    { id: 't1', at: beds[0], radius: 3.5, speaker: 'THE TENDER', text: 'You opened the cage. I walked down after you. It is a long way, and I know it, because it is the way the dead are carried. I keep the garden where they are set down.' },
    { id: 't2', at: beds[2], radius: 3.5, speaker: 'THE TENDER', text: 'This garden is the oldest thing here. Ten beds. Seven are for the worlds that were sung before yours. Three I have not named yet.' },
    { id: 't3', at: beds[4], radius: 3.5, speaker: 'THE TENDER', text: 'The ones who sang are in the beds. A Vael cannot be put in the ground alone. So the beds are planted, and the plants are tuned, and the dead are answered.' },
    { id: 't4', at: beds[6], radius: 3.5, speaker: 'THE TENDER', text: 'The count is short. It has been short since the stone cooled. When the count is short they take more voices. That is why they came to your harbour.' },
    { id: 't5', at: beds[7], radius: 3.5, speaker: 'THE TENDER', text: 'You do not hear the Hush. I have watched you walk through three halls. You walk as if nothing has asked you a question. I think that is why you can reach the bottom.' },
    { id: 't6', at: beds[8], radius: 3.5, speaker: 'THE TENDER', text: 'At the bottom is the Root Bell. It is the last voice the stone has. They ring it by hand, and the hands are tired. I will not tell you to stop it. I will tell you that it is tired.' },
    { id: 't7', at: beds[9], radius: 3.5, speaker: 'THE TENDER', text: 'Take what is in the beds. It is oil, pressed from the seed of the chimes. It will light you. Go back up by the stair. I will be here.' },
    { id: 'oil', at: [35, 31], radius: 3, speaker: 'HULL', text: 'The oil in the tins is pressed from the seed of the chime plants. A tin burns as long as a Marrow tin, and smells of cut grass.' },
    { id: 'exit', at: [35, 8], radius: 3, speaker: 'INES', text: 'The stair is narrow and goes up in the dark. She did not come to the foot of it to say goodbye. She did not need to.' },
  ],
  triggers: [
    { id: 'beds', when: 'enter', at: [35, 40], radius: 6, do: [{ objective: 'Walk the ring of beds: the keeper has left a word at several of them' }] },
    { id: 'out', when: 'enter', at: [35, 12], radius: 6, do: [{ objective: 'The way out is the stair at the north end of the garden' }] },
  ],
  quality: { safe: true, enemies: [0, 0], botSeconds: [5, 300], mechanics: ['heights', 'triggers'], skins: 6,
    scaleClass: 'SET-PIECE', reason: 'a garden is open ground and nobody in it means harm: the player is meant to walk it slowly and read it', introduces: 'the Silent Orchard: a ring of ten beds, no creatures, no sound, and the longest piece of text in the act: the Tender, who was freed at the Cantor Outpost and walked down' },
};
console.log('C2S01: beds', beds.length, 'pickups', P.ents.filter((e) => e.type === 'pickup').length);
export const waypoints = { main: [[35, 56, 0], [35, 48, 0], ...beds.map(([x, z]) => [x, z, 0]), [35, 31, 0], [35, 14, 0], [35, 8, 0], [35, 5, 0]] };
export default MAP;
