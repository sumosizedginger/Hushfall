// the line a new player gets once, after the controls reminder of their first level. Pure: it names the keys (or the pad's buttons) the player
// actually has.
import { prettyCode } from './bindings.js';
import { padGlyph } from './gamepad.js';

/** { bindings, padBindings, family, pad } -> one short paragraph: where the objective is, what Tab opens, how to pause */
export function firstRunLine({ bindings = {}, padBindings = {}, family = 'xbox', pad = false } = {}) {
  const k = pad ? (a) => padGlyph(padBindings[a]?.[0], family) : (a) => prettyCode(bindings[a]?.[0]);
  return `The line at the top is what to do next. ${k('map')} opens the Journal: the map, what you have read, and what each thing you pick up is for. ${k('pause')} pauses.`;
}

/**
 * the controls card at a level's start (the outside playtest of 2026-11-18: the legend sat in the middle of the picture for 11 s at the start of
 * every level). It shows on a new profile's first level and on Marrow Quay (a new game), as a column in the lower left corner, and firing hides
 * it. Pure: the legend in (one line, ' · ' between controls), the card's text out, or null when this start gets none.
 */
export function controlsCard({ legend = '', firstRun = false, mapId = '', firstLine = '' } = {}) {
  if (!firstRun && mapId !== 'C1E1M01') return null;
  const rows = String(legend).split(' · ').join('\n');
  return (firstLine ? firstLine + '\n\n' : '') + rows + '\n\nFiring hides this. The pause screen shows it again.';
}
