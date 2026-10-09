// The atlas contract of the ten Tollbearer / Vael creatures (src/render/models_choir.js on the game side, tools/baker/recipes_choir.js on the baker side).
// Each kind has its OWN 256 px atlas, 4x4 cells of 64 px like every other atlas in the game (models.js atlas(): cell 0 = top-left), baked as `choir_<kind>`. The NAMES below are the contract:
// the rig asks for a cell by name, the recipe must paint exactly these names in this order (the baker asserts it). Cell index = position in the list. Pure data (no Three, no DOM).
export const CHOIR_CELLS = {
  tollbearer:  ['skin', 'flesh', 'coat', 'coatDk', 'trou', 'bone', 'bronze', 'bronzeDk', 'rope', 'verd', 'iron', 'mouth'],
  gaunt:       ['skin', 'skinDk', 'flesh', 'bone', 'claw', 'throat', 'mouth', 'iron'],
  bellhand:    ['skin', 'flesh', 'coat', 'coatDk', 'trou', 'bone', 'bronze', 'bronzeDk', 'rope', 'hat', 'iron', 'mouth'],
  sexton:      ['skin', 'robe', 'robeDk', 'stole', 'trou', 'bone', 'bronze', 'bronzeDk', 'iron', 'mouth', 'flesh', 'verd'],
  wardengraft: ['skin', 'flesh', 'leather', 'leatherDk', 'iron', 'ironDk', 'bronze', 'bronzeDk', 'drumskin', 'bone', 'rope', 'mouth'],
  cantor:      ['skin', 'flesh', 'robe', 'robeDk', 'bone', 'bronze', 'bronzeDk', 'iron', 'mouth', 'verd', 'trim'],
  bellnode:    ['iron', 'ironDk', 'bone', 'boneDk', 'bronze', 'bronzeDk', 'verd', 'stone'],
  gill:        ['dome', 'domeDk', 'under', 'fringeA', 'fringeB', 'sac', 'heart', 'bone', 'tendril'],
  feeder:      ['skin', 'wrapA', 'wrapB', 'wrapDk', 'bone', 'bronze', 'bronzeDk', 'iron', 'cable', 'mouth', 'stand'],
  chorister:   ['skin', 'robe', 'robeDk', 'stole', 'chitin', 'chitinDk', 'horn', 'hornDk', 'bone', 'iron', 'mouth'],          // PT-026 (Episode 3): the eleventh creature
  graftmother: ['case', 'caseDk', 'flesh', 'fleshDk', 'bone', 'boneDk', 'bronze', 'bronzeDk', 'iron', 'sac', 'sacDk', 'verd', 'horn', 'leg'],
};
export const CHOIR_KINDS = Object.keys(CHOIR_CELLS);
/** the baked texture name of a kind's atlas */
export const choirAtlasName = (kind) => 'choir_' + kind;
/** { name: cell index } for a kind: the rig's `C.coat` */
export const cellsOf = (kind) => Object.fromEntries(CHOIR_CELLS[kind].map((n, i) => [n, i]));
