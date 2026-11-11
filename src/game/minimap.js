// the MINIMAP: a small corner map from the SAME model as the automap (engine/automap.js): only what the player has
// actually seen, north up, the player's arrow in the middle, doors, exits and levers as on the big map. It shows no creature and no pickup: it is
// where you have been, not where things are. The shell redraws it every few frames (MINIMAP.every) from a model it
// builds every few frames too; the sim is not touched. `minimapView` is PURE (what part of the model is shown), `drawMinimap` only draws.
// (Session 2 of design/OPUS_HANDOFF.md, item G5) the corner map is never empty: while fewer than `sparse` explored cells are in view, the walls
// within the automap's own explore radius are drawn as a dim outline straight from the map data (drawing only: nothing is marked explored, and a
// secret wall is just a wall). And when the goal has a known spot (the exit the player has seen) outside the window, a tick on the border points at it.
import { EXPLORE_RADIUS_CELLS } from '../engine/automap.js';
export const MINIMAP = Object.freeze({ every: 6, sparse: 20, sizes: { small: { s: 4, r: 18 }, large: { s: 6, r: 18 } } });

/** the cells within `R` of the player straight from the map (a secret reads as wall, off the map is wall): [{ cx, cz, kind }] */
export function nearbyCells(map, player, R = EXPLORE_RADIUS_CELLS) {
  const S = map.cell,
    pcx = Math.floor(player.x / S),
    pcz = Math.floor(player.z / S),
    out = [];
  for (let cz = pcz - R; cz <= pcz + R; cz++)
    for (let cx = pcx - R; cx <= pcx + R; cx++) {
      const inside = cx >= 0 && cz >= 0 && cx < map.w && cz < map.h,
        k = inside ? map.kind(cx, cz) : 'wall';
      out.push({ cx, cz, kind: k === 'secret' ? 'wall' : k });
    }
  return out;
}

/** where the corner map points: the nearest exit the player has seen ({ x, z } in metres), or null (no known spot: no tick) */
export function objectiveTarget(model) {
  let best = null,
    bd = Infinity;
  for (const e of model.exits ?? []) {
    const d = (e.x - model.player.x) ** 2 + (e.z - model.player.z) ** 2;
    if (d < bd) {
      bd = d;
      best = { x: e.x, z: e.z };
    }
  }
  return best;
}
export const MINIMAP_MODES = Object.freeze(['off', 'small', 'large']);
export const sanitizeMinimap = (v) => (MINIMAP_MODES.includes(v) ? v : 'small');
const PAL = {
  bg: 'rgba(9,11,16,0.78)',
  floor: '#587a82',
  outdoor: '#4a68a6',
  wall: '#0e1317',
  edge: '#d4e4df',
  hint: 'rgba(212,228,223,0.3)',
  dots: 'rgba(150,185,180,0.16)',
  brass: '#c9a44c',
  wood: '#8a6a4a',
  exit: '#ffc070',
  exitLocked: '#a84030',
  lever: '#ff5a44',
  leverDone: '#58ff8a',
  me: '#3fffe0',
  ink: '#0d0f14',
  frame: '#7d6a3c',
};

/**
 * the part of the model the minimap shows: the explored cells within `r` cells of the player (offsets from the player's cell), the doors, the exits
 * and the levers in the same window, and the player's yaw
 */
export function minimapView(model, r) {
  const S = model.cell,
    pcx = Math.floor(model.player.x / S),
    pcz = Math.floor(model.player.z / S),
    within = (dx, dz) => Math.abs(dx) <= r && Math.abs(dz) <= r;
  const cells = [],
    doors = [],
    exits = [],
    switches = [];
  for (const c of model.cells) {
    const dx = c.cx - pcx,
      dz = c.cz - pcz;
    if (within(dx, dz)) cells.push({ dx, dz, kind: c.kind });
  }
  for (const d of model.doors) {
    const dx = d.cx - pcx,
      dz = d.cz - pcz;
    if (within(dx, dz)) doors.push({ dx, dz, key: d.key, keyColor: d.keyColor, open: d.open, axis: d.axis });
  }
  const rel = (e) => ({ fx: e.x / S - model.player.x / S, fz: e.z / S - model.player.z / S });
  for (const e of model.exits) {
    const o = rel(e);
    if (Math.abs(o.fx) <= r + 0.5 && Math.abs(o.fz) <= r + 0.5) exits.push({ ...o, locked: !!e.locked });
  }
  for (const l of model.switches ?? []) {
    const o = rel(l);
    if (Math.abs(o.fx) <= r + 0.5 && Math.abs(o.fz) <= r + 0.5) switches.push({ ...o, used: !!l.used });
  }
  const keys = (model.keyMarks ?? []).map((m) => {
    const o = rel(m),
      most = Math.max(Math.abs(o.fx), Math.abs(o.fz)),
      k = most > r ? r / most : 1;
    return { fx: o.fx * k, fz: o.fz * k, far: most > r, color: m.color };
  });
  const seenAt = new Set(cells.map((c) => c.dx + ',' + c.dz)),
    sparse = cells.length < MINIMAP.sparse,
    near = sparse ? (model.near ?? []).map((c) => ({ dx: c.cx - pcx, dz: c.cz - pcz, kind: c.kind })).filter((c) => within(c.dx, c.dz)) : [];
  let tick = null;
  if (model.target) {
    const o = rel(model.target),
      most = Math.max(Math.abs(o.fx), Math.abs(o.fz));
    if (most > r + 0.5) tick = { fx: (o.fx * (r + 0.5)) / most, fz: (o.fz * (r + 0.5)) / most };
  }
  return {
    cells,
    doors,
    exits,
    switches,
    keys,
    near: near.map((c) => ({ ...c, seen: seenAt.has(c.dx + ',' + c.dz) })),
    tick,
    yaw: model.player.yaw,
    frac: { x: model.player.x / S - pcx, z: model.player.z / S - pcz },
  };
}

/** draw the minimap into `canvas` (sized here to its window) for the mode 'small' | 'large'; 'off' draws nothing and returns false */
export function drawMinimap(canvas, model, mode = 'small') {
  const spec = MINIMAP.sizes[mode];
  if (!spec) return false;
  const { s, r } = spec,
    size = (2 * r + 1) * s;
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }
  const ctx = canvas.getContext('2d'),
    v = minimapView(model, r),
    at = new Map(v.cells.map((c) => [c.dx + ',' + c.dz, c.kind]));
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = PAL.bg;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = PAL.dots;
  for (let dz = -r; dz <= r; dz++)
    for (let dx = -r; dx <= r; dx++)
      // FREEZE F3: unexplored ground is a faint dot grid, so a map you have barely seen does not read as a hole
      if ((dx + dz * 2) % 4 === 0 && !at.has(dx + ',' + dz)) ctx.fillRect((dx + r) * s + (s >> 1), (dz + r) * s + (s >> 1), 1, 1);
  const X = (dx) => (dx + r) * s,
    walkable = (k) => k === 'floor' || k === 'outdoor' || k === 'door' || k === 'secret-revealed';
  for (const c of v.cells) {
    ctx.fillStyle = c.kind === 'wall' ? PAL.wall : c.kind === 'outdoor' ? PAL.outdoor : PAL.floor;
    ctx.fillRect(X(c.dx), X(c.dz), s, s);
  }
  ctx.strokeStyle = PAL.edge;
  ctx.lineWidth = 1;
  ctx.beginPath(); // an edge where explored floor meets a wall: the room's outline
  for (const c of v.cells) {
    if (!walkable(c.kind)) continue;
    for (const [ax, az] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      if (at.get(c.dx + ax + ',' + (c.dz + az)) !== 'wall') continue;
      const x0 = X(c.dx + (ax > 0 ? 1 : 0)),
        z0 = X(c.dz + (az > 0 ? 1 : 0));
      if (ax !== 0) {
        ctx.moveTo(x0, X(c.dz));
        ctx.lineTo(x0, X(c.dz + 1));
      } else {
        ctx.moveTo(X(c.dx), z0);
        ctx.lineTo(X(c.dx + 1), z0);
      }
    }
  }
  ctx.stroke();
  if (v.near.length) {
    // G5: a dim outline of the walls round the player where nothing is explored yet (drawing only)
    const nearAt = new Map(v.near.map((c) => [c.dx + ',' + c.dz, c.kind]));
    ctx.strokeStyle = PAL.hint;
    ctx.beginPath();
    for (const c of v.near) {
      if (c.seen || !walkable(c.kind)) continue;
      for (const [ax, az] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        if (nearAt.get(c.dx + ax + ',' + (c.dz + az)) !== 'wall') continue;
        const x0 = X(c.dx + (ax > 0 ? 1 : 0)),
          z0 = X(c.dz + (az > 0 ? 1 : 0));
        if (ax !== 0) {
          ctx.moveTo(x0, X(c.dz));
          ctx.lineTo(x0, X(c.dz + 1));
        } else {
          ctx.moveTo(X(c.dx), z0);
          ctx.lineTo(X(c.dx + 1), z0);
        }
      }
    }
    ctx.stroke();
  }
  for (const d of v.doors) {
    ctx.fillStyle = d.key ? (d.keyColor ?? PAL.brass) : PAL.wood;
    const t = Math.max(2, s * (d.open > 0.5 ? 0.3 : 0.7));
    if (d.axis === 'x') ctx.fillRect(X(d.dx), X(d.dz) + (s - t) / 2, s, t);
    else ctx.fillRect(X(d.dx) + (s - t) / 2, X(d.dz), t, s);
  }
  const px = (r + v.frac.x) * s,
    // the window is centred on the player's CELL; the player's own offset inside it is drawn, and exits and levers are placed from the player's exact
    // spot
    pz = (r + v.frac.z) * s;
  const P = (o) => [px + o.fx * s, pz + o.fz * s];
  for (const e of v.exits) {
    const [x, z] = P(e),
      h = s * 0.9;
    ctx.fillStyle = e.locked ? PAL.exitLocked : PAL.exit;
    ctx.beginPath();
    ctx.moveTo(x, z - h);
    ctx.lineTo(x + h, z);
    ctx.lineTo(x, z + h);
    ctx.lineTo(x - h, z);
    ctx.closePath();
    ctx.fill();
  }
  for (const l of v.switches) {
    const [x, z] = P(l),
      h = Math.max(3, s * 0.8);
    ctx.fillStyle = l.used ? PAL.leverDone : PAL.lever;
    ctx.fillRect(x - h / 2, z - h / 2, h, h);
  }
  for (const m of v.keys ?? []) {
    const [x, z] = P(m),
      h = Math.max(3, s * (m.far ? 0.7 : 1));
    ctx.fillStyle = m.color;
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, z, h, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  const fx = -Math.sin(v.yaw),
    fz = -Math.cos(v.yaw),
    a = Math.max(5, s * 1.5);
  ctx.fillStyle = PAL.me;
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + fx * a, pz + fz * a);
  ctx.lineTo(px - fx * a * 0.6 - fz * a * 0.6, pz - fz * a * 0.6 + fx * a * 0.6);
  ctx.lineTo(px - fx * a * 0.6 + fz * a * 0.6, pz - fz * a * 0.6 - fx * a * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = PAL.frame;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
  if (v.tick) {
    // G5: a small wedge on the border, pointing out toward the goal
    const [tx, tz] = P(v.tick),
      x = Math.min(size - 1, Math.max(1, tx)),
      z = Math.min(size - 1, Math.max(1, tz)),
      len = Math.hypot(v.tick.fx, v.tick.fz) || 1,
      ux = v.tick.fx / len,
      uz = v.tick.fz / len,
      h = Math.max(4, s * 1.4);
    ctx.fillStyle = PAL.exit;
    ctx.strokeStyle = PAL.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, z);
    ctx.lineTo(x - ux * h - uz * h * 0.6, z - uz * h + ux * h * 0.6);
    ctx.lineTo(x - ux * h + uz * h * 0.6, z - uz * h - ux * h * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  return true;
}
