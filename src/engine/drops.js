// Ammunition drops (PT-025; the rules and every number are DROPS in defs.js). Pure sim code: a kill may leave one ordinary ammunition box where the creature fell, of the type the player needs most, and a box that
// has dropped slides toward the player when they are close. All the dice are a stream of their own (`w.drops.rngState`, made on the first kill), so a map that has no `drops` is byte for byte what it was and
// the fights of one that has are not shifted by it. Lazy state: `w.drops = { rngState, dry, seen, firedAt }` (it is saved with the world like the rest).
import { DROPS, AMMO_MAX, WEAPONS, ENEMIES, PICKUPS, FX, STEP, TICK } from './defs.js';
import { nextRandom, initialRngState } from './rng.js';
import { ammoCap } from './progress.js';
import { floorAt, fxAt } from './terrain.js';
import { emit, cellSolid } from './world.js';

const TYPES = Object.keys(AMMO_MAX);
const state = (w) => (w.drops ??= { rngState: initialRngState((w.seed ?? 0) ^ 0xd30d), dry: 0, seen: {}, firedAt: {} });
const ammoType = (id) => WEAPONS[id]?.ammo ?? null;

/** a gun is "fired" when its ammunition went DOWN since the last look: no need to hook every way a weapon can shoot */
export function trackFired(w) {
  const d = state(w), p = w.player;
  for (const t of TYPES) { const now = p.ammo[t] || 0; if (d.seen[t] != null && now < d.seen[t]) d.firedAt[t] = w.tick; d.seen[t] = now; }
}

/** the ammunition type a dead creature's box would be: the emptiest of the guns in use (fired lately, or in hand), else of the guns carried; null when everything that matters is full */
export function dropType(w) {
  const p = w.player, d = state(w), carried = new Set(p.weapons.map(ammoType).filter(Boolean)), share = (t) => (p.ammo[t] || 0) / ammoCap(t, w.upgrades);
  const inHand = ammoType(p.weapon), window = DROPS.window / TICK;
  const used = TYPES.filter((t) => carried.has(t) && (t === inHand || (d.firedAt[t] != null && w.tick - d.firedAt[t] <= window)));
  const pick = (pool) => { let best = null; for (const t of pool) if (share(t) < DROPS.full && (best === null || share(t) < share(best))) best = t; return best; };
  return pick(used) ?? pick(TYPES.filter((t) => carried.has(t)));
}

/** the nearest cell to (x, z) a box can lie in without a player having to wade into a hazard: the cell itself, else one of its neighbours up to three cells out */
function spot(w, x, z) {
  const m = w.map, S = m.cell, ok = (px, pz) => { const cx = Math.floor(px / S), cz = Math.floor(pz / S); if (cx < 0 || cz < 0 || cx >= m.w || cz >= m.h) return false; const k = m.kind(cx, cz); return (k === 'floor' || k === 'outdoor') && !cellSolid(w, cx, cz) && !FX[fxAt(w, px, pz)]?.dps; };
  if (ok(x, z)) return [x, z];
  for (let r = 1; r <= 3; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; const px = x + dx * S, pz = z + dz * S; if (ok(px, pz)) return [px, pz]; }
  return [x, z];
}

/** a creature just died: maybe it leaves a box. Never a summoned or a raised creature (no farming a Sexton or a hatchery), a node, or a target on the Range. */
export function maybeDrop(w, e) {
  const def = ENEMIES[e.kind], map = w.map;
  if (!map.drops || def.node || e.summoned || e.revived || e.hold || w.player.hp <= 0) return null;
  trackFired(w);
  const d = state(w), type = dropType(w); if (!type) return null;
  const need = 1 - (w.player.ammo[type] || 0) / ammoCap(type, w.upgrades), base = DROPS.chance[e.kind] ?? DROPS.chance.default;
  let chance = Math.min(0.95, base * (DROPS.weight[type] ?? 1) * (DROPS.need.floor + DROPS.need.slope * need) * (map.drops.scale ?? 1));
  if (base >= 1) chance = 1;
  const pity = need >= DROPS.pityNeed && d.dry >= DROPS.pity;
  if (!pity && nextRandom(d) >= chance) { d.dry++; return null; }
  d.dry = 0;
  const [x, z] = spot(w, e.x, e.z), kind = 'ammo_' + type;
  if (!PICKUPS[kind]) return null;
  const it = { id: w.nextId++, kind, x, z, y: floorAt(w, x, z), drop: true };
  w.pickups.push(it); emit(w, 'drop', { kind, x, z }); return it;
}

/** a box that has dropped slides toward the player when they are within the magnet's reach, on about the same floor, with nothing solid between them */
export function updateDrops(w, dt) {
  if (!w.map.drops || !w.pickups.length) return;
  const p = w.player, M = DROPS.magnet, S = w.map.cell;
  for (const it of w.pickups) {
    if (!it.drop) continue;
    const dx = p.x - it.x, dz = p.z - it.z, dist = Math.hypot(dx, dz);
    if (dist > M.r || dist < M.stop || Math.abs((it.y ?? 0) - (p.y ?? 0)) > STEP + 0.3) continue;
    const step = Math.min(M.speed * dt, dist - M.stop), nx = it.x + dx / dist * step, nz = it.z + dz / dist * step;
    if (cellSolid(w, Math.floor(nx / S), Math.floor(nz / S))) continue;
    it.x = nx; it.z = nz; it.y = floorAt(w, nx, nz);
  }
}
