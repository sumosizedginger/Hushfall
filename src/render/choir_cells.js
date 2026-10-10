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
  bulwark:     ['skin', 'flesh', 'shell', 'shellDk', 'shellIn', 'chitin', 'chitinDk', 'bone', 'iron', 'mouth', 'bronze'],          // PT-028 (Episode 3, Batch C): the shield-bearer
  weeping:     ['skin', 'flesh', 'fleshDk', 'robe', 'robeDk', 'bone', 'boneDk', 'bronze', 'bronzeDk', 'iron', 'sac', 'sacDk', 'mouth', 'verd'],      // PT-028: the brood-mother
  acolyte:     ['skin', 'robe', 'robeDk', 'trim', 'bronze', 'bronzeDk', 'bone', 'iron', 'mouth'],          // PT-029 (Episode 3, Batch D): the Choir's attendant
  vat:         ['iron', 'ironDk', 'rust', 'dome', 'domeDk', 'copper', 'verd', 'pipe', 'slime'],          // PT-030 (Episode 3, Batch E): the Foundry's spawner
  reed:        ['flesh', 'fleshDk', 'stone', 'bronze', 'bronzeDk', 'bone', 'verd', 'mouth', 'cord'],          // PT-030: a pipe the Grand Cantor sings through
  grandcantor: ['skin', 'flesh', 'fleshDk', 'chitin', 'chitinDk', 'bone', 'boneDk', 'bronze', 'bronzeDk', 'iron', 'mouth', 'verd', 'horn', 'hornIn', 'trim', 'leg'],          // PT-030: the Episode 3 boss
  gatewarden:  ['stone', 'stoneDk', 'bone', 'boneDk', 'chitin', 'chitinDk', 'bronze', 'bronzeDk', 'iron', 'mouth', 'verd', 'trim'],          // PT-033 (Episode 4, Batch E): the Gate Warden, the Campaign One boss
  seal:        ['stone', 'stoneDk', 'bone', 'bronze', 'bronzeDk', 'iron', 'trim'],          // PT-033: a seal on the Warden's arch (a node)
  graftmother: ['case', 'caseDk', 'flesh', 'fleshDk', 'bone', 'boneDk', 'bronze', 'bronzeDk', 'iron', 'sac', 'sacDk', 'verd', 'horn', 'leg'],
};
export const CHOIR_KINDS = Object.keys(CHOIR_CELLS);
/** the baked texture name of a kind's atlas */
export const choirAtlasName = (kind) => 'choir_' + kind;
/** { name: cell index } for a kind: the rig's `C.coat` */
export const cellsOf = (kind) => Object.fromEntries(CHOIR_CELLS[kind].map((n, i) => [n, i]));
