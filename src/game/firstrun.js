// PT-071 (R20, first run): the line a new player gets once, after the controls reminder of their first level. Pure: it names the keys (or the pad's buttons) the player actually has.
import { prettyCode } from './bindings.js';
import { padGlyph } from './gamepad.js';

/** { bindings, padBindings, family, pad } -> one short paragraph: where the objective is, what Tab opens, how to pause */
export function firstRunLine({ bindings = {}, padBindings = {}, family = 'xbox', pad = false } = {}) {
  const k = pad ? (a) => padGlyph(padBindings[a]?.[0], family) : (a) => prettyCode(bindings[a]?.[0]);
  return `The line at the top is what to do next. ${k('map')} opens the Journal: the map, what you have read, and what each thing you pick up is for. ${k('pause')} pauses.`;
}
