// HOW BAD IS IT: a fight's level from what the world says, for the score to follow. Pure: it reads the
// world and keeps its own small memory; it never writes the world.
//   0 calm · 1 noticed (something is after you, far off or alone) · 2 fighting · 3 overwhelmed (many, something big, or you are badly hurt)
// Only creatures ALREADY after you count, so the music never warns of an ambush ahead. Up at once; down only after the danger has
// stayed under the lower line for HOLD seconds, so a creature stepping out of view does not make the music flicker.
import { ENEMIES } from '../engine/defs.js';

export const INTENSITY = {
  near: 10,
  far: 32,
  gone: 40, // metres: full weight within `near`, falling to `farW` at `far`, nothing beyond `gone`
  farW: 0.35,
  floorW: 0.25, // a creature that is after you but far still counts this much (it keeps the pulse going)
  line2: 1.6,
  line3: 4.2, // danger at which the band (2) and the overwhelmed layer (3) come in
  down: 0.75,
  hold: 2.5, // to drop a level the danger must stay under (line x down) for `hold` seconds
  hurtWindow: 5,
  hurtPer: 25,
  hurtCap: 1.5, // damage taken in the last 5 s adds (damage / 25), at most 1.5
  low: [35, 0.8],
  veryLow: [20, 1.5], // hit points under 35 add 0.8, under 20 add 1.5 (only while something is after you)
};
/** how much a creature of this kind weighs in a fight (0: a node, a peaceful one, a boss: a boss is level 3 by itself) */
export function weightOf(kind) {
  const d = ENEMIES[kind];
  if (!d || d.node || d.peaceful || d.boss) return 0;
  return Math.min(4, Math.max(0.5, d.hp / 45));
}
const engaged = (e) => e.state === 'chase' && !(e.hp <= 0) && !e.dead && !e.dying;

/** the danger right now: { score, engaged, boss } */
export function dangerOf(world, recentHurt = 0) {
  const p = world?.player;
  if (!p) return { score: 0, engaged: 0, boss: false };
  let score = 0,
    n = 0,
    boss = false;
  const I = INTENSITY;
  for (const e of world.enemies ?? []) {
    if (!engaged(e)) continue;
    const d = ENEMIES[e.kind];
    if (d?.boss) {
      boss = true;
      n++;
      continue;
    }
    const w = weightOf(e.kind);
    if (w === 0) continue;
    const dist = Math.hypot(e.x - p.x, e.z - p.z);
    if (dist > I.gone) continue;
    const prox = dist <= I.near ? 1 : dist >= I.far ? I.farW : 1 - ((1 - I.farW) * (dist - I.near)) / (I.far - I.near);
    score += Math.max(I.floorW, w * prox);
    n++;
  }
  if (n > 0) {
    score += Math.min(I.hurtCap, recentHurt / I.hurtPer);
    if (p.hp < I.veryLow[0]) score += I.veryLow[1];
    else if (p.hp < I.low[0]) score += I.low[1];
  }
  return { score, engaged: n, boss };
}
const levelFor = ({ score, engaged: n, boss }) => (boss ? 3 : n === 0 ? 0 : score >= INTENSITY.line3 ? 3 : score >= INTENSITY.line2 ? 2 : 1);

/** the tracker: feed it the world every frame (and the hurt events as they come); `level` is what the score should play */
export class IntensityTracker {
  constructor() {
    this.level = 0;
    this.below = 0;
    this.hurts = [];
    this.clock = 0;
    this.danger = { score: 0, engaged: 0, boss: false };
  }
  reset() {
    this.level = 0;
    this.below = 0;
    this.hurts.length = 0;
  }
  hurt(amount) {
    if (Number.isFinite(amount) && amount > 0) this.hurts.push([this.clock, amount]);
  }
  /** advance by `dt` seconds; returns the level */
  update(world, dt) {
    this.clock += Number.isFinite(dt) ? Math.max(0, dt) : 0;
    while (this.hurts.length && this.hurts[0][0] < this.clock - INTENSITY.hurtWindow) this.hurts.shift();
    // dying, dead or through the exit: the music holds where it was (a "room clear" on your death would mock you)
    if (world && world.status !== undefined && world.status !== 'playing') return this.level;
    const recent = this.hurts.reduce((s, h) => s + h[1], 0),
      d = (this.danger = dangerOf(world, recent)),
      want = levelFor(d);
    if (want >= this.level) {
      this.level = want;
      this.below = 0;
      return this.level;
    }
    // level 1 drops to 0 only when nothing is after you any more
    const line = this.level === 3 ? INTENSITY.line3 : this.level === 2 ? INTENSITY.line2 : 0;
    const under = this.level === 1 ? d.engaged === 0 : !d.boss && d.score < line * INTENSITY.down;
    this.below = under ? this.below + (Number.isFinite(dt) ? dt : 0) : 0;
    if (this.below >= INTENSITY.hold) {
      this.level = d.engaged === 0 ? 0 : Math.max(want, this.level - 1);
      this.below = 0;
    } // nothing left after you: the room is clear, straight to calm
    return this.level;
  }
}
