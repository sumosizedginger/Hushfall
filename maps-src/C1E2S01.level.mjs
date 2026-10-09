// C1E2S01 THE RIME VAULT (secret): cold storage under the Works, puzzle-lite. Pre-invasion Marrow research the Wardens hid.
// Entered from Kiln Row's secret exit; returns to The Cradle Annex. No enemies: a place to stand still in the cold. Three coolant valves (the keys) in three alcoves; a lever beside the vault door spends them
// and rolls the door up; the cache and the research are behind it. Scale class COMPRESSION; the frosted steel (`Z` walls, `r` floor) is new.
import { Level } from '../tools/mapkit/builder.mjs';
import { Shape, laneOf } from '../tools/mapkit/shape.mjs';

const L = new Level(52, 34);
// the antechamber (arrival), the hall (racks of cold storage, three alcoves), the vault (behind a remote door)
L.room([3, 13, 9, 19], { floor: 'r', wall: 'Z' }); L.door(10, 16);
L.room([11, 8, 31, 24], { floor: 'r', wall: 'Z' });
L.room([14, 4, 16, 6], { floor: 'r', wall: 'Z' }); L.door(15, 7);                                       // valve A (north west)
L.room([26, 4, 28, 6], { floor: 'r', wall: 'Z' }); L.door(27, 7);                                       // valve B (north east)
L.room([24, 26, 26, 28], { floor: 'r', wall: 'Z' }); L.door(25, 25);                                    // valve C (south)
L.room([33, 11, 43, 21], { floor: 'f', wall: 'Z' }); L.door(32, 16, { remote: true });                   // the vault

// ---- objects ---------------------------------------------------------------------------------------------------------------------------------------------------------------
L.put(5, 16, '@'); L.put(42, 16, '>');
L.putAll('M', [[5, 14], [5, 18], [14, 12], [14, 20], [22, 12], [22, 20], [30, 12], [30, 20]]); L.putAll('F', [[3, 15], [3, 17]]); L.put(7, 16, 'f');
// the hall: racks of cold storage in rows (shelves, crates), a long table, lanterns
L.putAll('F', [[15, 10], [16, 10], [17, 10], [19, 10], [20, 10], [21, 10], [23, 10], [24, 10], [25, 10], [15, 22], [16, 22], [17, 22], [19, 22], [20, 22], [21, 22], [27, 22], [28, 22], [29, 22]]);
L.putAll('C', [[13, 14], [13, 18], [29, 14], [29, 18]]); L.putAll('c', [[13, 15], [29, 15]]); L.putAll('f', [[20, 15], [21, 15], [22, 15], [20, 17], [21, 17], [22, 17]]); L.putAll('n', [[18, 16], [24, 16]]);
L.putAll('e', [[12, 12], [12, 20]]); L.putAll('r', [[30, 14], [30, 18]]); L.putAll('H', [[12, 16]]);
// the alcoves: a valve (a key) on a bench in each
L.put(15, 5, 'k'); L.put(27, 5, 'i'); L.put(25, 27, 'q'); L.putAll('n', [[14, 5], [28, 5], [24, 27]]);
// the vault: the cache and the research (cradles hold the specimens)
L.putAll('F', [[34, 12], [34, 20], [38, 12], [38, 20]]); L.putAll('f', [[36, 14], [36, 18]]); L.putAll('O', [[36, 12], [36, 20], [40, 14], [40, 18]]); L.putAll('D', [[41, 12], [41, 20]]);
L.putAll('v', [[34, 15], [34, 17]]); L.putAll('H', [[35, 13], [35, 19]]); L.putAll('e', [[37, 15], [37, 17]]); L.putAll('r', [[39, 13], [39, 19]]); L.putAll('a', [[38, 16], [40, 16]]); L.putAll('n', [[33, 13], [43, 16]]);

// ---- PT-021, rooms that are not boxes (tools/mapkit/shape.mjs: only floor is added and corners are cut, away from every object and the routes' lane; props go into the new bays) ----
const S = new Shape(L, { lane: laneOf('C1E2S01'), keep: [[32, 12]] });                                                      // the vault lever's wall stays
S.hall([11, 8, 31, 24], { sides: { n: { w: 3, gap: 3, d: 1 }, s: { w: 3, gap: 3, d: 1 }, w: { w: 3, gap: 3, d: 1 } }, cut: 3 });
S.hall([33, 11, 43, 21], { sides: { n: { w: 3, gap: 2, d: 1 }, s: { w: 3, gap: 2, d: 1 }, e: { w: 3, gap: 2, d: 1 } }, cut: 2 });
S.chamfer([3, 13, 9, 19], 'nw ne sw se', 1);
console.log('C1E2S01 shape:', S.report.bays, 'bays,', S.report.corners, 'corners,', S.report.nibs, 'nibs,', S.report.skipped.length, 'skipped,', S.dressing().length, 'props'); if (process.env.SHAPE_REPORT) console.log(S.report.skipped.join(String.fromCharCode(10)));
// ---- end PT-021 shaping ----

const layers = L.layers();

const MAP = {
  id: 'C1E2S01', name: 'The Rime Vault', version: 1, ceilingHeight: 3.4, par: { time: 240 },
  atmosphere: { fog: '#8aa0b0', fogDensity: 0.013, sky: 'overcast', ambient: 0.75, look: 'rime' },
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 10, shell: 14, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  keyLabels: { brass: 'Coolant valve A', iron: 'Coolant valve B', bell: 'Coolant valve C' },
  intro: { title: 'THE RIME VAULT', lines: ['It is colder here than the sea has any reason to be.', 'Someone built a winter under the Works, on purpose.'] },
  outro: 'Back to the Works. The Cradle Annex is next.',
  objective: 'Three coolant valves open the vault: two north, one south. The lever is by its door',
  ...layers,
  entities: [
    { type: 'switch', id: 'vault', at: [31, 12], wall: 'east', needs: ['brass', 'iron', 'bell'],
      do: [{ open: [32, 16] }, { objective: 'The vault is open. Read what they hid, and take what they left' }, { shake: 1 }, { message: 'rolling' }] },
  ],
  messages: [
    { id: 'arrive', at: [5, 16], radius: 3, speaker: 'WARDEN CALDER', text: 'You found it. I hid what the Wardens learned where the Works could not burn it: in the cold. The vault wants three coolant valves. They are in the alcoves.' },
    { id: 'hall', at: [13, 13], radius: 4, speaker: 'INES', text: 'Racks and racks. Look at the dates on the crates: all of them before the firing. They knew, Calder. Someone here knew for years.' },
    { id: 'valve', at: [15, 5], radius: 2, speaker: 'VALVE LOG', text: 'COOLANT VALVE A. IF THE VAULT WARMS, THE DOOR WILL NOT OPEN FROM OUTSIDE. KEEP IT COLD. KEEP IT QUIET.' },
    { id: 'lever', at: [30, 14], radius: 3, speaker: 'VAULT LEVER', text: 'THREE VALVES: A, B, C. THE LEVER SPENDS THEM. THE DOOR RISES ON ITS OWN COUNTERWEIGHT.' },
    { id: 'rolling', at: [31, 16], radius: 0.1, speaker: 'INES', text: 'It is rolling up. Cold air is coming out. Whatever they kept, they kept it a long time.' },
    { id: 'research', at: [37, 16], radius: 3, speaker: 'WARDEN LOG', text: 'SEVEN YEARS BEFORE THE FIRING. THE HUM IN THE CHALK IS NOT GEOLOGY: IT HAS A RHYTHM. THE PANS ARE A COVER. THE BEDS UNDER THEM ARE A RECEIVER. WE WERE TOLD TO STOP ASKING.' },
    { id: 'cold', at: [41, 16], radius: 3, speaker: 'WARDEN LOG', text: 'THEY DO NOT LIKE COLD. IT SLOWS THE HUSH. IF YOU ARE READING THIS, KEEP IT COLD, AND KEEP THE BELLS COLDER.' },
  ],
  triggers: [
    { id: 'valve-a', when: 'key:brass', do: [{ objective: 'Valve A taken. Two to go: north east, and south' }] },
    { id: 'valve-b', when: 'key:iron', do: [{ objective: 'Valve B taken. One to go' }] },
    { id: 'valve-c', when: 'key:bell', do: [{ objective: 'All three valves are yours. The lever by the vault door, east of the hall' }] },
  ],
  quality: { safe: true, enemies: [0, 0], botSeconds: [15, 300], mechanics: ['switches', 'triggers', 'keys>=3'], skins: 3,
    scaleClass: 'COMPRESSION', introduces: 'the Wardens research vault: the first plain statement of what the Works is for, behind three coolant valves and a lever (puzzle-lite, no enemies)' },
};

// PT-021: the props set down in the new bays (after every other entity: no id shifts)
MAP.entities = [...(MAP.entities ?? []), ...S.dressing()];
// ---- PT-023 (owner, 2026-10-08: "update all the maps"): ammunition for the carbine (rounds) and the line-thrower (rockets) ----
// Every pickup is ON the lane the routes walk (tools/dev/place-near.mjs) and every movable prop OFF the traffic of every route, all appended after every other entity so no id shifts and no route moves.
MAP.entities ??= [];
MAP.entities.push(...[['ammo_round', 30, 13], ['ammo_rocket', 27, 24]].map(([kind, x, z]) => ({ type: 'pickup', kind, at: [x, z] })));
// ---- end PT-023 ----

export default MAP;
