// PT-071 (R20, first run): what a difficulty changes, in words, derived from the numbers the sim uses (DIFFICULTY in defs.js) so the copy cannot drift from the game. Pure: no DOM, no sim.
import { DIFFICULTY } from '../engine/defs.js';

/** a short promise for each choice (the sentence the player decides on); the facts below it are computed */
const LINE = {
  easy: 'For learning the guns and the places. Nothing here is a trap you cannot walk out of.',
  normal: 'The game as it was built and tuned.',
  hard: 'Less ammunition, harder hits, quicker minds. Cover and movement matter from the first room.',
};
const pct = (x) => `${Math.round(x * 100)}%`;
/** "wait 30% longer between attacks" / "wait 15% less" for the cooldown multiplier (`reaction`) */
const wait = (k) => (k === 1 ? 'wait the standard time between attacks' : k > 1 ? `wait ${Math.round((k - 1) * 100)}% longer between attacks` : `wait ${Math.round((1 - k) * 100)}% less between attacks`);

/** -> { key, name, line, facts: [string] } for 'easy' | 'normal' | 'hard' (null for anything else) */
export function difficultyCopy(key) {
  const d = DIFFICULTY[key]; if (!d) return null;
  return {
    key, name: d.name, line: LINE[key] ?? '',
    facts: [
      `Creatures hit for ${pct(d.enemyDamage)} of the standard damage and carry ${pct(d.enemyHp)} of the standard health.`,
      `Ammunition pickups hold ${pct(d.ammoPickup)} of the standard amount.`,
      `Creatures ${wait(d.reaction)}.`,
    ],
  };
}

/** the note under the three buttons, as HTML text (the numbers are the game's own) */
export function difficultyNote(key) {
  const c = difficultyCopy(key); if (!c) return 'Pick a difficulty. Point at one to see what it changes.';
  return `<b>${c.name}.</b> ${c.line}<br>${c.facts.join(' ')}`;
}
