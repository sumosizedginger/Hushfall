// PT-052 U3b, the BESTIARY (the Journal's fifth page): a page that fills the first time a creature is MET (it has noticed the player or it has died), with its name, its hit points and ONE plain line on what it does and the way to answer it. It also serves the players who want to know what they are fighting.
// Pure (no DOM, no sim): `seenKinds` turns the world's creatures into the list of kinds met so far, `bestiaryPage` the page, `sanitizeBestiary` keeps a saved list honest. The shell keeps the list in `progress.bestiary` (lazy: absent until the first meeting).
import { ENEMIES } from '../engine/defs.js';

/** one line for every kind in ENEMIES (tests/journal.test.js fails when a kind has none): what it is, what it does, the answer */
export const BESTIARY = Object.freeze({
  tollbearer: 'A captured townsperson with a bell grafted on. It walks at you and strikes. Slow: shoot it while it walks.',
  gaunt: 'A starved runner. Fast and weak, and it lunges once it is close: sidestep the lunge, then shoot.',
  bellhand: 'Fires a toll-shot from the bell on its forearm. The bell rings first: move when you hear it.',
  sexton: 'Raises the dead after a visible channel. Kill it first, or hurt it to break the rite.',
  wardengraft: 'Plated at the front, so guns barely mark it. Hit it from behind, or with a blast.',
  bellnode: "A bell that holds up the Cantor's shield. It never moves. Break it.",
  cantor: 'Sends rings of sound through the floor and calls Gaunts. Break its bell nodes, then shoot it.',
  gill: 'Flies and shoots from range. The arc lamp stuns it, and a harpoon reaches it.',
  feeder: 'A cradle that feeds the Graft-Mother. It cannot move or fight. Cutting it weakens her.',
  graftmother: 'Huge and slow. She calls Gaunts and fights from her cradle. Cut the feeders first.',
  chorister: 'Sings in bursts that suppress your guns. Close the distance or break its line of sight.',
  bulwark: 'A shell that stays shut while it walks: a hit from the front barely hurts it. Blasts, bolts, the mallet and anything from behind get through. It opens to strike.',
  acolyte: 'Its ring of song halves what its neighbours take. Kill it first.',
  weeping: 'Sits on her throne and lobs tears that leave pools. A brood of Gaunts drops beside her. Keep moving.',
  vat: 'A cistern that drops Gaunts or Tollbearers. It never fights. Destroying it ends the brood.',
  reed: "A pipe that holds up the Grand Cantor's shield. It never moves. Break it.",
  grandcantor: 'Sends a double ring of sound and calls Choristers. Cut the reeds, then shoot it.',
  gatewarden: 'An arch of bone and brass. Three seals shield it and its eye sweeps a beam. Turn the beam onto the seals with a mirror, or shoot them.',
  subcantor: 'Its ring of sound comes back after it passes. Cut its nodes, then shoot it.',
  seal: "A ring of light round a diamond. It holds up the Gate Warden's shield.",
  vaelfolk: 'A Vael who never raised a hand. It will not fight, and hurting it costs you.',
  marksman: 'A Songkeeper with a reed-rifle that shoots from far off. A line of light follows you, then stops: move when it stops, or get behind stone.',
  mender: 'A small pale Vael with an amber lantern that mends the others while you are not looking. Shoot it first.',
  zealot: 'A bronze soldier with a lance. It thrusts from far off and lunges: stay out of the line.',
  resonant: 'A tall Vael whose steps ring through the floor. Keep moving and shoot from range.',
  hivecantor: "Conducts the Hive from above its choir. Its rings come on the Hive's beat. Break the unison, then shoot it.",
  rootbell: 'The last bell. Its clapper swings and falls, and four anchors hold it. Cut the anchors, then shoot.',
  rootanchor: 'A root that anchors the Root Bell. It never moves. Break it.',
});

const ORDER = Object.keys(ENEMIES);
/** the kinds the player has met: what was met before, plus every creature that is awake (it has noticed the player) or dead. `enemies` = world.enemies. Returns the SAME array when nothing is new. */
export function seenKinds(before, enemies) {
  const have = new Set(before ?? []); let added = false;
  for (const e of enemies ?? []) if (e && e.state !== 'idle' && ENEMIES[e.kind] && !have.has(e.kind)) { have.add(e.kind); added = true; }
  return added ? ORDER.filter((k) => have.has(k)) : (before ?? []);
}
/** a saved list made safe: only kinds that exist, once each, in the order of ENEMIES */
export const sanitizeBestiary = (list) => { const s = new Set(Array.isArray(list) ? list.filter((k) => typeof k === 'string') : []); return ORDER.filter((k) => s.has(k)); };

/** the page: one entry per kind met (name, hit points, the line), and how many are still to meet */
export function bestiaryPage(seen) {
  const have = new Set(seen ?? []);
  const entries = ORDER.filter((k) => have.has(k)).map((k) => ({ kind: k, name: ENEMIES[k].name ?? k, hp: ENEMIES[k].hp, line: BESTIARY[k] ?? '' }));
  return { entries, unmet: ORDER.length - entries.length, total: ORDER.length };
}
