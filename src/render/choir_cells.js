// The atlas contract of the ten Tollbearer / Vael creatures (src/render/models_choir.js on the game side, tools/baker/recipes_choir.js on the baker
// side).
// Each kind has its OWN 256 px atlas, 4x4 cells of 64 px like every other atlas in the game (models.js atlas(): cell 0 = top-left), baked as
// `choir_<kind>`. The NAMES below are the contract:
// the rig asks for a cell by name, the recipe must paint exactly these names in this order (the baker asserts it). Cell index = position in the list.
// Pure data (no Three, no DOM).
export const CHOIR_CELLS = {
  tollbearer: ['skin', 'flesh', 'coat', 'coatDk', 'trou', 'bone', 'bronze', 'bronzeDk', 'rope', 'verd', 'iron', 'mouth'],
  gaunt: ['skin', 'skinDk', 'flesh', 'bone', 'claw', 'throat', 'mouth', 'iron'],
  bellhand: ['skin', 'flesh', 'coat', 'coatDk', 'trou', 'bone', 'bronze', 'bronzeDk', 'rope', 'hat', 'iron', 'mouth'],
  sexton: ['skin', 'robe', 'robeDk', 'stole', 'trou', 'bone', 'bronze', 'bronzeDk', 'iron', 'mouth', 'flesh', 'verd'],
  wardengraft: ['skin', 'flesh', 'leather', 'leatherDk', 'iron', 'ironDk', 'bronze', 'bronzeDk', 'drumskin', 'bone', 'rope', 'mouth'],
  cantor: ['skin', 'flesh', 'robe', 'robeDk', 'bone', 'bronze', 'bronzeDk', 'iron', 'mouth', 'verd', 'trim'],
  bellnode: ['iron', 'ironDk', 'bone', 'boneDk', 'bronze', 'bronzeDk', 'verd', 'stone'],
  gill: ['dome', 'domeDk', 'under', 'fringeA', 'fringeB', 'sac', 'heart', 'bone', 'tendril'],
  feeder: ['skin', 'wrapA', 'wrapB', 'wrapDk', 'bone', 'bronze', 'bronzeDk', 'iron', 'cable', 'mouth', 'stand'],
  chorister: ['skin', 'robe', 'robeDk', 'stole', 'chitin', 'chitinDk', 'horn', 'hornDk', 'bone', 'iron', 'mouth'], // the eleventh creature
  bulwark: ['skin', 'flesh', 'shell', 'shellDk', 'shellIn', 'chitin', 'chitinDk', 'bone', 'iron', 'mouth', 'bronze'], // the shield-bearer
  // the brood-mother
  weeping: ['skin', 'flesh', 'fleshDk', 'robe', 'robeDk', 'bone', 'boneDk', 'bronze', 'bronzeDk', 'iron', 'sac', 'sacDk', 'mouth', 'verd'],
  acolyte: ['skin', 'robe', 'robeDk', 'trim', 'bronze', 'bronzeDk', 'bone', 'iron', 'mouth'], // the Choir's attendant
  vat: ['iron', 'ironDk', 'rust', 'dome', 'domeDk', 'copper', 'verd', 'pipe', 'slime'], // the Foundry's spawner
  reed: ['flesh', 'fleshDk', 'stone', 'bronze', 'bronzeDk', 'bone', 'verd', 'mouth', 'cord'], // a pipe the Grand Cantor sings through
  grandcantor: [
    'skin',
    'flesh',
    'fleshDk',
    'chitin',
    'chitinDk',
    'bone',
    'boneDk',
    'bronze',
    'bronzeDk',
    'iron',
    'mouth',
    'verd',
    'horn',
    'hornIn',
    'trim',
    'leg',
  ], // the Episode 3 boss
  // the Gate Warden, the Campaign One boss
  gatewarden: ['stone', 'stoneDk', 'bone', 'boneDk', 'chitin', 'chitinDk', 'bronze', 'bronzeDk', 'iron', 'mouth', 'verd', 'trim'],
  seal: ['stone', 'stoneDk', 'bone', 'bronze', 'bronzeDk', 'iron', 'trim'], // a seal on the Warden's arch (a node)
  graftmother: ['case', 'caseDk', 'flesh', 'fleshDk', 'bone', 'boneDk', 'bronze', 'bronzeDk', 'iron', 'sac', 'sacDk', 'verd', 'horn', 'leg'],
  // the Vael civilian, the first Vael who is not a weapon
  vaelfolk: ['skin', 'skinDk', 'crystal', 'crystalDk', 'frill', 'rib', 'eye', 'cord', 'mouth'],
  zealot: ['skin', 'hood', 'hoodDk', 'plate', 'plateDk', 'bronze', 'bronzeDk', 'bone', 'iron', 'cord', 'mouth'], // the Songkeeper under arms
  // the Songkeeper with a reed-rifle, in a lichen-grey cloak
  marksman: ['skin', 'cloak', 'cloakDk', 'plate', 'bone', 'reed', 'reedDk', 'brass', 'iron', 'cord', 'mouth'],
  // a small Vael that mends, in milk-white wraps stitched with amber
  mender: ['skin', 'robe', 'robeDk', 'amber', 'bone', 'bronze', 'bronzeDk', 'cord', 'mouth'],
  // the conductor of one district, an afraid one, in the grey-green of a robe that has been washed too often
  subcantor: ['skin', 'robe', 'robeDk', 'sash', 'bone', 'bronze', 'bronzeDk', 'iron', 'mouth', 'verd'],
  // three Tollbearers fused at the hip, bound in rust-brown hide, a ring of bells welded round the waist
  resonant: ['skin', 'skinDk', 'flesh', 'wrap', 'wrapDk', 'bone', 'bronze', 'bronzeDk', 'rope', 'verd', 'iron', 'mouth'],
  // the conductor of the Hive: throat-pale, a crest of nerves, no coat
  hivecantor: ['skin', 'skinDk', 'flesh', 'nerve', 'nerveDk', 'bone', 'bronze', 'bronzeDk', 'shroud', 'iron', 'mouth', 'amber'],
  // the Bell's clapper: bronze wrapped in black root, a heart that glows through a split
  rootbell: ['bronze', 'bronzeDk', 'verd', 'root', 'rootDk', 'chain', 'heart', 'crack', 'bone', 'iron'],
  rootanchor: ['root', 'rootDk', 'stone', 'bronze', 'bronzeDk', 'bone', 'verd', 'heart'], // one of the four root anchors that pin the clapper's chain
};
export const CHOIR_KINDS = Object.keys(CHOIR_CELLS);
/** the baked texture name of a kind's atlas */
export const choirAtlasName = (kind) => 'choir_' + kind;
/** { name: cell index } for a kind: the rig's `C.coat` */
export const cellsOf = (kind) => Object.fromEntries(CHOIR_CELLS[kind].map((n, i) => [n, i]));
