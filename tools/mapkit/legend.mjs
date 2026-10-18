// The default object symbols of the map compiler (one character per cell of the `objects` layer), kept in a module of their own so the encounter kit and the roster pass can read them without importing the compiler.
/** default object symbols (one char per cell in the `objects` layer). Maps can add or override with `legend`. */
export const LEGEND = {
  '@': { type: 'player' }, '>': { type: 'exit', dest: 'next' }, '$': { type: 'exit', dest: 'secret' },
  t: { type: 'enemy', kind: 'tollbearer' }, g: { type: 'enemy', kind: 'gaunt' }, b: { type: 'enemy', kind: 'bellhand' }, x: { type: 'enemy', kind: 'sexton' }, w: { type: 'enemy', kind: 'wardengraft' }, K: { type: 'enemy', kind: 'cantor' }, G: { type: 'enemy', kind: 'gill' }, Y: { type: 'enemy', kind: 'graftmother' }, Z: { type: 'enemy', kind: 'feeder' },
  h: { type: 'pickup', kind: 'health_small' }, H: { type: 'pickup', kind: 'health_large' }, a: { type: 'pickup', kind: 'ammo_flare' }, e: { type: 'pickup', kind: 'ammo_shell' }, r: { type: 'pickup', kind: 'ammo_rivet' },
  v: { type: 'pickup', kind: 'armor_vest' }, k: { type: 'pickup', kind: 'key_brass' }, i: { type: 'pickup', kind: 'key_iron' }, q: { type: 'pickup', kind: 'key_bell' }, S: { type: 'pickup', kind: 'weapon_scattergun' }, R: { type: 'pickup', kind: 'weapon_rivet' }, X: { type: 'pickup', kind: 'weapon_harpoon' }, U: { type: 'pickup', kind: 'ammo_bolt' },
  c: { type: 'prop', kind: 'crate' }, C: { type: 'prop', kind: 'crate2' }, o: { type: 'prop', kind: 'barrel' }, P: { type: 'prop', kind: 'pillar' }, m: { type: 'prop', kind: 'lamp' }, M: { type: 'prop', kind: 'lamp', tint: 'cool' }, Q: { type: 'prop', kind: 'lamp', tint: 'teal' },
  j: { type: 'prop', kind: 'lamppost' }, u: { type: 'prop', kind: 'bollard' }, n: { type: 'prop', kind: 'lantern' }, z: { type: 'prop', kind: 'cart' }, y: { type: 'prop', kind: 'sack' }, d: { type: 'prop', kind: 'rope' },
  f: { type: 'prop', kind: 'table' }, F: { type: 'prop', kind: 'shelf' }, O: { type: 'prop', kind: 'cradle' }, N: { type: 'prop', kind: 'bellnode' }, D: { type: 'prop', kind: 'pod' }, A: { type: 'prop', kind: 'stall' },
};

