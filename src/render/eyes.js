// EYES AS STATE (PT-061, V8 of design/VISUAL_DIRECTION.md): every creature kit builds ONE `glow` material for its eyes (and whatever else it lights); the view sets its colour each frame from what the creature is doing, so a player reads the creature's mood
// from across a room: ASLEEP a dim teal, AWAKE teal, HUNTING (awake and it has seen you within the last moments) amber-white, STRIKING (inside the strike of an attack or a lunge) a hot white. Render only: it reads sim state, never writes it. A merged sleeper is static, which is what asleep wants.
export const EYE = Object.freeze({ asleep: 0x147a6c, awake: 0x3fffe0, hunting: 0xffd890, striking: 0xffffff });
/** the eye colour for a creature: `e` the sim record, `attack` the attack phase 0..1 (what the pose gets), `lunge` the lunge phase (negative = crouching, positive = the dash) */
export function eyeColor(e, attack = 0, lunge = 0) {
  if (e.state === 'idle') return EYE.asleep;
  if ((attack >= 0.5 && attack < 0.85) || lunge > 0.5) return EYE.striking;
  return (e.lost ?? 0) < 0.4 ? EYE.hunting : EYE.awake;
}
