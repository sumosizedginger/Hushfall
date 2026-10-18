// PT-050 H-L4 (Gemini LEAK-04): a vat, a Weeping Mother or a summoner keeps bearing creatures for as long as the player stays on the map, and every dead one stayed in `w.enemies` for good (and, in the view, as a drawn rig):
// a long stall on a vat map grew the world and the scene without limit. Only creatures that were BORN in play (`summoned`) are ever trimmed, only once more than CORPSES.cap of them are dead and finished falling,
// and the oldest go first; a creature the map placed, and anything still dying or alive, stays. Called from step() on a fixed tick count, between the other updates, so no loop over `w.enemies` is open when it runs.
// A run that never has more than `cap` born corpses (every shipped route) is untouched: this returns 0 without changing anything.
import { CORPSES } from './defs.js';

/** remove the oldest born corpses beyond the cap, in place; returns how many went */
export function trimCorpses(w) {
  const list = w.enemies; let dead = 0;
  for (let i = 0; i < list.length; i++) { const e = list[i]; if (e.summoned && e.state === 'dead' && e.dead >= 1) dead++; }
  let extra = dead - CORPSES.cap; if (extra <= 0) return 0;
  const gone = extra; let j = 0;
  for (let i = 0; i < list.length; i++) { const e = list[i]; if (extra > 0 && e.summoned && e.state === 'dead' && e.dead >= 1) { extra--; continue; } list[j++] = e; }
  list.length = j; return gone;
}
