// C1E1M04 THE DROWNED CHANDLERY: flooded cellars, a water hazard, alien residue in the water table, and the first secret exit.
// New ideas: wading water (slows everyone), toxic residue pools with a dry catwalk across them, low dark cellars, resin-grown walls, a secret exit to the Lighthouse Cellar.
// Route: chandlery shop (2 m up) -> stairs down -> the flooded undercroft -> chandler's office (iron key) -> the cistern (Bellhands on the platforms, toxic pools, dry catwalk)
//        -> iron drain gate -> exit.  Secret route: office -> vault (toxic pools) -> resin panel in the east wall -> the lighthouse tunnel -> secret exit.
import { Level } from '../tools/mapkit/builder.mjs';
import { Shape, laneOf } from '../tools/mapkit/shape.mjs';

const L = new Level(60, 54);

// ---- rooms -------------------------------------------------------------------------------------------------------------
L.room([4, 4, 26, 16], { floor: '.', wall: 'W', height: 4 }); L.ceiling([4, 4, 26, 16], 7);          // the chandlery shop, 2 m above the cellars
L.room([12, 17, 15, 21], { floor: '.', wall: 'W' }); L.stairs([12, 17, 15, 21], 'z', 4, 0);           // stairs down
L.room([4, 22, 40, 34], { floor: 'f', wall: 'W' });                                                    // the undercroft (flooded)
L.fx([4, 22, 40, 34], 'w'); L.fx([11, 22, 16, 25], '.'); L.fx([37, 23, 40, 29], '.'); L.fx([21, 27, 26, 30], '.');    // dry landings
L.room([4, 36, 12, 44], { floor: 'n', wall: 'W' }); L.rect([8, 35, 8, 35], 'n'); L.fx([4, 36, 12, 44], 'w');      // the rope store
L.room([16, 36, 38, 50], { floor: 'f', wall: 'R' }); L.ceiling([16, 36, 38, 50], 5);                    // the cistern
L.rect([20, 35, 23, 35], 'f'); L.rect([32, 35, 35, 35], 'f');                                          // two archways from the undercroft
L.fx([16, 36, 38, 50], 'w'); L.fx([21, 40, 33, 46], 'x');                                              // the residue pool in the middle
L.height([16, 37, 17, 49], 2); L.height([18, 37, 18, 49], 1); L.height([37, 37, 38, 49], 2); L.height([36, 37, 36, 49], 1);       // side platforms (+1 m) with a step
L.fx([16, 37, 18, 49], '.'); L.fx([36, 37, 38, 49], '.');
L.rect([19, 43, 35, 43], 'g'); L.fx([19, 43, 35, 43], '.');                                            // the dry catwalk across the pool
L.room([42, 22, 54, 30], { floor: '.', wall: 'W' }); L.door(41, 26);                                   // the chandler's office
L.room([48, 32, 48, 33], { floor: 'n', wall: 'R' }); L.door(48, 31);                                   // the way into the vault
L.room([42, 34, 54, 44], { floor: 'n', wall: 'R' }); L.ceiling([42, 34, 54, 44], 5); L.fx([44, 36, 52, 42], 'x'); L.rect([48, 34, 48, 44], 'g'); L.fx([48, 34, 48, 44], '.'); L.fx([42, 34, 54, 44], 'w');
L.fx([44, 36, 52, 42], 'x'); L.fx([48, 34, 48, 44], '.'); L.fx([42, 34, 43, 44], '.');
L.room([56, 39, 58, 39], { floor: 'f', wall: 'R' }); L.secretPanel(55, 39);                            // the secret tunnel to the lighthouse stair
L.room([28, 52, 32, 52], { floor: 'f', wall: 'I' }); L.door(30, 51, { key: 'iron' });                  // the iron drain gate and the exit chamber
for (const x of [20, 24, 36]) { L.room([x, 52, x, 52], { floor: 'f', wall: 'I' }); L.closet(x, 51); }  // cistern closets

// ---- objects -------------------------------------------------------------------------------------------------------------
const legend = { Y: { type: 'prop', kind: 'pillar', skin: 'R' } };
L.put(6, 14, '@');
// shop
L.putAll('F', [[5, 5], [5, 6], [5, 8], [5, 9], [25, 5], [25, 6], [25, 8], [25, 9], [10, 4], [16, 4], [20, 4]]); L.putAll('f', [[10, 10], [18, 10], [22, 13], [8, 12]]); L.putAll('m', [[10, 7], [20, 7], [15, 14]]);
L.putAll('t', [[18, 8], [22, 11], [24, 6]]); L.putAll('h', [[7, 6], [14, 5]]); L.putAll('a', [[24, 14]]); L.putAll('e', [[5, 14]]); L.putAll('r', [[20, 14]]);
// undercroft
L.putAll('Y', [[10, 26], [18, 26], [26, 25], [34, 26], [10, 31], [18, 32], [26, 32], [34, 31]]); L.putAll('n', [[13, 24], [23, 28], [38, 26]]);
L.putAll('t', [[8, 24], [14, 29], [20, 25], [22, 32], [28, 30], [34, 25], [38, 31]]); L.putAll('g', [[10, 33], [18, 31], [30, 25], [36, 33]]);
L.putAll('e', [[22, 28], [39, 24]]); L.putAll('a', [[12, 23], [25, 29]]); L.putAll('r', [[15, 24], [24, 28], [38, 27]]); L.putAll('h', [[13, 25], [38, 24]]); L.put(23, 27, 'H'); L.put(39, 28, 'v');
// rope store
L.putAll('d', [[6, 38], [10, 38], [6, 42]]); L.putAll('y', [[5, 40], [11, 40], [11, 43]]); L.putAll('t', [[7, 41], [10, 42]]); L.putAll('g', [[6, 44], [11, 37]]); L.putAll('r', [[8, 43], [5, 37]]); L.put(9, 40, 'e');
// chandler's office: the iron key on the desk, a Bellhand behind it
L.putAll('f', [[50, 24], [52, 24], [45, 28]]); L.put(51, 24, 'i'); L.putAll('t', [[46, 24], [50, 28]]); L.put(53, 27, 'b'); L.putAll('m', [[45, 24], [52, 29]]); L.putAll('h', [[43, 23], [53, 23]]); L.put(44, 29, 'H'); L.putAll('r', [[43, 29], [46, 23]]); L.put(52, 27, 'e'); L.putAll('n', [[47, 30], [49, 30]]);              // PT-015: two lanterns flank the vault hatch (48,31) so the way on reads from the office
// vault (secret route): six Tollbearers around the pools under resin
L.putAll('Y', [[45, 38], [51, 38], [45, 41], [51, 41]]); L.putAll('t', [[44, 36], [52, 36], [46, 43], [52, 42], [43, 38], [53, 40]]); L.putAll('Q', [[43, 35], [53, 35], [43, 43], [53, 43]]); L.putAll('O', [[46, 37], [50, 41], [48, 36]]);
L.putAll('r', [[43, 40], [54, 36]]); L.putAll('v', [[43, 42]]); L.put(54, 43, 'H'); L.put(57, 39, '$');
// cistern: three Bellhands on the platforms, the crowd in the water, ammo on the catwalk and platforms
L.putAll('b', [[17, 40], [17, 46], [37, 43]]); L.putAll('t', [[24, 38], [30, 38], [26, 48], [32, 48], [20, 44]]); L.putAll('g', [[21, 38], [34, 40], [28, 46], [19, 48]]);
L.putAll('Y', [[22, 39], [32, 39], [22, 47], [32, 47]]); L.putAll('Q', [[27, 41], [27, 45]]); L.putAll('e', [[17, 43], [37, 40], [30, 43]]); L.putAll('r', [[17, 38], [37, 46], [26, 43]]); L.putAll('H', [[17, 48], [37, 38]]); L.putAll('a', [[23, 43], [33, 43]]);
L.putAll('g', [[20, 52], [24, 52], [36, 52]]); L.putAll('t', [[29, 52], [31, 52]]); L.put(30, 52, '>'); L.put(30, 50, 'h');

// ---- PT-021, rooms that are not boxes (tools/mapkit/shape.mjs: only floor is added and corners are cut, away from every object and the routes' lane; props go into the new bays) ----
const S = new Shape(L, { lane: laneOf('C1E1M04'), foeSymbols: 'tgbxwKGZ' });
S.hall([4, 4, 26, 16], { sides: { n: { w: 3, gap: 3, d: 1 }, w: { w: 3, gap: 3, d: 1 }, e: { w: 3, gap: 3, d: 1 } }, cut: 2 });                           // the chandlery shop
S.hall([4, 22, 40, 34], { sides: { n: { w: 3, gap: 3, d: 1 }, w: { w: 3, gap: 3, d: 1 }, e: { w: 3, gap: 3, d: 1 }, s: { w: 3, gap: 3, d: 1 } }, cut: 3 });   // the undercroft: dry landings in the flooded hall's walls
S.hall([4, 36, 12, 44], { sides: { w: { w: 3, gap: 2, d: 1 } }, cut: 2 });                                                                               // the rope store
const c0 = S.bayLog.length;
S.hall([16, 36, 38, 50], { sides: { w: { w: 3, gap: 3, d: 2, heart: 'alt' }, e: { w: 3, gap: 3, d: 2, heart: 'alt' } }, cut: 2 }); S.dressBays('lantern', c0);   // the cistern: resin-lined niches down both sides
S.hall([42, 22, 54, 30], { sides: { n: { w: 3, gap: 3, d: 1 }, e: { w: 3, gap: 3, d: 1 } }, cut: 2 });                                                   // the chandler's office
const v0 = S.bayLog.length;
S.hall([42, 34, 54, 44], { sides: { w: { w: 3, gap: 3, d: 2, heart: true }, s: { w: 3, gap: 3, d: 1 }, e: { w: 3, gap: 3, d: 2, heart: true } }, cut: 2 }); S.dressBays('cradle', v0);   // the vault: a cradle in the heart of each niche
console.log('C1E1M04 shape:', S.report.bays, 'bays,', S.report.corners, 'corners,', S.report.nibs, 'nibs,', S.report.skipped.length, 'skipped,', S.dressing().length, 'props'); if (process.env.SHAPE_REPORT) console.log(S.report.skipped.join(String.fromCharCode(10)));
// ---- end PT-021 shaping ----

const layers = L.layers();

const MAP = {
  id: 'C1E1M04', name: 'The Drowned Chandlery', version: 1, ceilingHeight: 3.2, par: { time: 800 },
  atmosphere: { fog: '#0a1c1e', fogDensity: 0.028, sky: 'night', look: 'cellar' },
  growth: [{ at: [48, 38], r: 26, power: 1.3 }],                                                       // PT-021: it started in the vault and has crept through the hatch seams into the chandler's office
  decals: [{ kind: 'smear', at: [48, 29], rot: 1.5708, size: 2.4, h: 1.1 }, { kind: 'bloodpool', at: [48, 30], size: 1.2 }, { kind: 'scrape', at: [47, 30], wall: 'south', y: 1.0, size: 1.0 }, { kind: 'scrape', at: [49, 30], wall: 'south', y: 1.0, size: 1.0 }],      // a body was dragged to the hatch
  entryLoadout: { hp: 100, armor: 0, ammo: { flare: 8, shell: 12, rivet: 60 }, weapons: ['flare', 'scattergun', 'rivet'] },
  intro: { title: 'THE DROWNED CHANDLERY', lines: ['The ebb has gone out of the harbour. It has not gone out of the cellars.', 'Something is growing in the water table.'] },
  outro: 'Next: Lamplighter Hill. The survivors are signalling by lamp.',
  objective: 'Find the stairs down (south of the shop)',
  legend,
  ...layers,
  groups: [{ name: 'cistern-closet', rect: [20, 52, 36, 52] }],
  secrets: [{ id: 'lighthouse-tunnel', panel: [55, 39], cells: [[56, 39], [57, 39]] }],
  messages: [
    { id: 'shop', at: [6, 13], radius: 3, speaker: 'SIGNAL HOUSE', text: "Calder, the chandlery. The cellars run under half the quay. Somewhere down there is the drain gate; it needs the chandler's iron key." },
    { id: 'stairs', at: [13, 19], radius: 2.5, speaker: 'INES', text: 'Water at the third step. It is warm. Water is never warm in Port Marrow.' },
    { id: 'under', at: [20, 28], radius: 4, speaker: 'CHANDLER\'S LOG', text: 'Ebb tide, no ebb. The wall in the east store weeps a green wet. Told the harbourmaster. He laughed, then he stopped laughing.' },
    { id: 'office', at: [48, 26], radius: 4, speaker: 'INES', text: 'Iron key on the desk. The blotter has one line: "Do not drain the cistern."' },
    { id: 'cistern', at: [27, 38], radius: 4, speaker: 'INES', text: 'Green pool, catwalk across it. Something sings under the surface. Stay on the grating.' },
    { id: 'hatch', at: [48, 29], radius: 2, speaker: "CHANDLER'S LOG", text: "Strongroom hatch, south wall. They say the old lighthouse stair was bricked up behind the vault's east side. Lamplight leaks round the one panel that is not brick." },
    { id: 'vault', at: [48, 38], radius: 4, speaker: 'RESIN LOG', text: 'It grows where the water is loud. It grows toward the tone. It has started to grow toward us.' },
    { id: 'tunnel', at: [57, 39], radius: 2, speaker: 'LIGHTHOUSE KEEPER', text: 'If you have found this stair, your father was not the only Calder who knew the harbour keeps secrets. Come up.' },
    { id: 'gate', at: [30, 50], radius: 2, speaker: 'SIGNAL HOUSE', text: 'Lamplighter Hill is the way up. The survivors there signal by lamp: green for safe, red for bells.' },
  ],
  triggers: [
    { id: 'cellar', when: 'enter', at: [13, 22], radius: 2, do: [{ objective: "Iron key: the chandler's office, east side of the undercroft" }] },
    { id: 'iron', when: 'key:iron', do: [{ open: [20, 51] }, { open: [24, 51] }, { open: [36, 51] }, { wake: 'cistern-closet' }, { shake: 1.2 }, { objective: 'The drain gate, south wall of the cistern. Stay on the catwalk.' }] },
  ],
  quality: { enemies: [34, 56], botSeconds: [120, 480], mechanics: ['heights', 'hazards', 'closets', 'triggers', 'secret', 'keys>=1'], skins: 7 },
};

// PT-021: the props set down in the new bays (after every other entity: no id shifts)
MAP.entities = [...(MAP.entities ?? []), ...S.dressing()];
export default MAP;
