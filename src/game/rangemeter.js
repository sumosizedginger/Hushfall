// The weapons range's readout (PT-016): what is under the crosshair, what the last hit did, the damage of the current burst, what the targets did to you. PURE: it reads a world and a list of events and builds text; main.js owns the DOM.
// It measures damage dealt by watching the targets' hit points (the sim does not report a number for a hit), so a burn is a stream of small drops, a kill counts its full blow (overkill included).
import { ENEMIES, PLAYER, TICK } from '../engine/defs.js';
import { hitCylinder } from '../engine/hitvolume.js';
import { hasLOS } from '../engine/world.js';

export const HOLD_TEXT = { inert: 'stands and takes it', turn: 'turns to you and swings', fixed: 'never turns' };
const BURST_GAP = 1.2, DPS_WINDOW = 3;

/** where the line from the eye along `f` (a unit vector) enters an enemy's hit cylinder (a distance), or null: the same volume a shot tests */
function rayCylinder(ex, ey, ez, f, c) {
  const ox = ex - c.x, oz = ez - c.z, a = f[0] * f[0] + f[2] * f[2]; if (a < 1e-9) return null;
  const b = 2 * (ox * f[0] + oz * f[2]), k = ox * ox + oz * oz - c.r * c.r, disc = b * b - 4 * a * k; if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a), y = ey + f[1] * t; return t > 0 && y >= c.y0 && y <= c.y1 ? t : null;
}
/** the enemy under the crosshair: the nearest body the line of sight really runs through (a shot would hit it); failing that, the one closest to the line within `cone` radians (the body's own width counts: a little aim assist for reading the panel); or null */
export function crosshairTarget(w, cone = 0.06, maxDist = 70) {
  const p = w.player, ex = p.x, ey = p.y + PLAYER.eye, ez = p.z, f = [-Math.sin(p.yaw) * Math.cos(p.pitch), Math.sin(p.pitch), -Math.cos(p.yaw) * Math.cos(p.pitch)];
  const near = [], close = [];
  for (const e of w.enemies) {
    if (e.state === 'dead') continue;
    const c = hitCylinder(e), dx = c.x - ex, dy = (c.y0 + c.y1) / 2 - ey, dz = c.z - ez, d = Math.hypot(dx, dy, dz); if (d < 0.2 || d > maxDist || !hasLOS(w, ex, ez, c.x, c.z)) continue;
    const t = rayCylinder(ex, ey, ez, f, c); if (t != null) { near.push({ e, d: t, ang: 0 }); continue; }
    const ang = Math.acos(Math.min(1, Math.max(-1, (dx * f[0] + dy * f[1] + dz * f[2]) / d))) - Math.atan2(c.r, d); if (ang < cone) close.push({ e, d, ang });
  }
  return (near.sort((a, b) => a.d - b.d)[0] ?? close.sort((a, b) => a.ang - b.ang)[0])?.e ?? null;
}

export class RangeMeter {
  constructor() { this.hp = new Map(); this.reset(); }
  reset() { this.hp.clear(); this.last = null; this.burst = null; this.hits = []; this.taken = { last: 0, total: 0, note: '' }; }
  /** call once per frame with the world: reads the drops in the targets' hit points since the last call */
  update(w) {
    const t = w.time; let dealt = 0, n = 0, best = 0;
    for (const e of w.enemies) {
      const before = this.hp.get(e.id), now = e.hp; this.hp.set(e.id, now);
      if (before != null && now < before - 1e-6) { const d = before - now; dealt += d; n++; best = Math.max(best, d); }
    }
    if (dealt > 0) {
      this.hits.push([t, dealt]); if (dealt >= 1 || n > 1) this.last = { dmg: dealt, n, best, t };         // a burn's tiny drops are in the damage per second, not each a "hit"
      if (!this.burst || t - this.burst.t1 > BURST_GAP) this.burst = { t0: t, t1: t, dmg: 0 }; this.burst.t1 = t; this.burst.dmg += dealt;
    }
    while (this.hits.length && t - this.hits[0][0] > DPS_WINDOW) this.hits.shift();
  }
  /** the events of one drain: what the targets did to you */
  events(ev) {
    for (const e of ev) {
      if (e.type === 'hurt') { this.taken.last = e.amount; this.taken.total += e.amount; this.taken.note = ''; }
      else if (e.type === 'headshot') this.headAt = (e.tick ?? 0) * TICK;              // PT-022: the carbine's head zone: the readout says HEAD beside the hit it belongs to
      else if (e.type === 'parry') this.taken.note = 'parried: nothing taken';
      else if (e.type === 'block') this.taken.note = 'blocked';
      else if (e.type === 'guard_break') this.taken.note = 'guard broken';
    }
  }
  /** the lines of the panel */
  lines(w) {
    const t = w.time, tg = crosshairTarget(w), L = [];
    if (tg) {
      const d = ENEMIES[tg.kind], flags = [(tg.stunT || 0) > 0 && 'STUNNED / PINNED', (tg.slowT || 0) > 0 && 'SLOWED', w.burns.some((b) => Math.hypot(tg.x - b.x, tg.z - b.z) < b.r + 0.2) && !d.flying && !d.node && 'IN FIRE', d.armor && 'plated front', (d.poise ?? 1) >= 3 && 'poise ' + d.poise].filter(Boolean);
      L.push(`TARGET  ${d.name} · ${tg.hold ? HOLD_TEXT[tg.hold] : 'live (acts as in the game)'}`, `HP ${Math.ceil(tg.hp)} / ${Math.ceil(tg.maxHp ?? d.hp)}${flags.length ? ' · ' + flags.join(' · ') : ''}`);
    } else L.push('TARGET  none under the crosshair', '');
    const dps = this.hits.reduce((s, h) => s + h[1], 0) / DPS_WINDOW, b = this.burst, age = b ? t - b.t1 : Infinity;
    L.push(this.last && t - this.last.t < 8 ? `LAST HIT  ${this.last.dmg.toFixed(1)}${this.last.n > 1 ? ` on ${this.last.n} targets (best ${this.last.best.toFixed(1)})` : ''}${this.headAt != null && Math.abs(this.last.t - this.headAt) < 0.25 ? '  ·  HEAD' : ''}` : 'LAST HIT  –');
    L.push(b && age < 8 ? `BURST  ${b.dmg.toFixed(0)} in ${(b.t1 - b.t0).toFixed(1)} s  ·  now ${dps.toFixed(0)} / s` : 'BURST  –');
    L.push(`TAKEN  last ${this.taken.last}  ·  total ${this.taken.total}${this.taken.note ? '  ·  ' + this.taken.note : ''}`);
    return L;
  }
}
