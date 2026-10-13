// PHASES, THE UNISON SHIELD AND THE `hp:` CONDITION (PT-043; design/ACTC.md section 3, design/ACTD.md section 2). Pure functions of the world's enemies; nothing here stores anything on a world that does not use it.
import { ENEMIES, DIFFICULTY } from './defs.js';

/** the share (0..1) of a group's hit points that is left, or null when no creature carries the group (a dead creature counts for nothing) */
export function groupHpFrac(w, group) {
  const d = DIFFICULTY[w.difficulty]; let cur = 0, max = 0, any = false;
  for (const e of w.enemies) if (e.group === group) { any = true; max += ENEMIES[e.kind].hp * d.enemyHp; if (e.state !== 'dead') cur += Math.max(0, e.hp); }
  return any && max > 0 ? cur / max : null;
}

/** the trigger condition `hp:<group><fraction` ('hp:rootbell<0.3'): the group has less than that share of its hit points left. Returns null when the text is not one. */
export function hpCondition(w, c) {
  const m = /^hp:([A-Za-z0-9_-]+)<([0-9.]+)$/.exec(c); if (!m) return null;
  const f = groupHpFrac(w, m[1]); return f != null && f < Number(m[2]);
}

/** is the whole choir (the creatures of a group) dead? A group nobody carries is not. */
export function groupDead(w, group) { let any = false; for (const e of w.enemies) if (e.group === group) { any = true; if (e.state !== 'dead') return false; } return any; }

/**
 * THE UNISON SHIELD: the share of a hit that gets through a creature whose `unison` names a group: `floor` + (1 - floor) x the share of the group that is dead. The choir's death is the way in. A group with no members at all gives no shield (1).
 */
export function unisonMult(w, def) {
  const U = def.unison; let total = 0, dead = 0;
  for (const e of w.enemies) if (e.group === U.group) { total++; if (e.state === 'dead') dead++; }
  return total === 0 ? 1 : U.floor + (1 - U.floor) * (dead / total);
}

/**
 * The phase a creature is in: the highest-numbered entry of `def.phases` whose threshold has been crossed (hit points under `at`, or with `choirDead` the unison group dead). It never goes back (a Sexton may raise the choir; the phase stays).
 * Lazy: only a creature whose definition has phases ever gets `e.ph`. Returns the entry (an object of overrides) or null for phase 0.
 */
export function phaseOf(w, e, def) {
  if (!def.phases) return null;
  const frac = e.hp / (def.hp * DIFFICULTY[w.difficulty].enemyHp); let idx = e.ph ?? 0;
  def.phases.forEach((ph, i) => { if (i + 1 > idx && ((ph.at != null && frac < ph.at) || (ph.choirDead && def.unison && groupDead(w, def.unison.group)))) idx = i + 1; });
  if (idx !== (e.ph ?? 0)) e.ph = idx;
  return idx > 0 ? def.phases[idx - 1] : null;
}
