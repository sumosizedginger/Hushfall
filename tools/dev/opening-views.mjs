// The opening view of every map (design/OPENING_VIEWS.md): what a player sees in the first second, standing on the start and facing the way the
// map faces them. Node only. It measures, per map: how far the eye runs before a wall straight ahead, how much of the level the picture holds
// (the hero score of hero-views.mjs), whether anything stands on the horizon inside the picture (the map's own scenery or its automatic skyline),
// and whether a lamp is in it. `--views=<file>` also writes a views file for `VIEWS=<file> DOORS=shut tools/dev/shoot-hero.mjs` (keys OPEN-<ID>).
//   node tools/dev/opening-views.mjs [--views=<out.json>] [--json=<out.json>] [ID ...]
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../../src/engine/mapformat.js';
import { PROPS } from '../../src/engine/defs.js';
import { HERO, forward, viewScore } from './hero-views.mjs';
import { skylinePlan } from '../../src/render/skyline.js';

const root = path.resolve(import.meta.dirname, '../..');
/** the floors an opening should meet (first guesses: design/OPENING_VIEWS.md section 3) */
export const OPENING = Object.freeze({ ahead: 8, sees: 120, cone: HERO.cone });

/** metres from (x, z) (cells) along `yaw` to the first wall or shut door; at most `max` */
export function runAhead(map, x, z, yaw, max = 60) {
  const [dx, dz] = forward(yaw);
  for (let t = 0.25; t * map.cell <= max; t += 0.25) {
    const cx = Math.floor(x + dx * t),
      cz = Math.floor(z + dz * t);
    if (cx < 0 || cz < 0 || cx >= map.w || cz >= map.h) return t * map.cell;
    const k = map.kind(cx, cz);
    if (k === 'wall' || k === 'door' || k === 'secret') return t * map.cell;
  }
  return max;
}

const inCone = (map, x, z, yaw, px, pz) => {
  const [fx, fz] = forward(yaw),
    dx = px / map.cell - x,
    dz = pz / map.cell - z,
    d = Math.hypot(dx, dz);
  return d > 0.5 && (dx * fx + dz * fz) / d > Math.cos(OPENING.cone / 2);
};

/** the numbers of a map's opening view */
export function openingOf(map) {
  const x = map.spawn.x / map.cell,
    z = map.spawn.z / map.cell,
    yaw = map.spawn.yaw,
    ahead = runAhead(map, x, z, yaw),
    sees = Math.round(viewScore(map, x, z, yaw)),
    horizon = [...map.scenery.map((s) => [s.x, s.z]), ...skylinePlan(map).map((p) => [p.x, p.z])].filter(([px, pz]) => inCone(map, x, z, yaw, px, pz)).length,
    lamps = map.props.filter(
      (p) =>
        /lamp|lantern|brazier|streetlamp/.test(p.kind) &&
        PROPS[p.kind] &&
        Math.hypot(p.x - map.spawn.x, p.z - map.spawn.z) < 24 &&
        inCone(map, x, z, yaw, p.x, p.z),
    ).length,
    k = map.kind(Math.floor(x), Math.floor(z)),
    faults = [];
  if (ahead < OPENING.ahead) faults.push('faces a wall');
  if (sees < OPENING.sees) faults.push('sees little');
  const roofed = k === 'floor' || k === 'door',
    skyline = roofed ? 0 : horizon; // under a roof the horizon is not seen: only a lamp counts
  if (!skyline && !lamps) faults.push('nothing to look at');
  return {
    x: +x.toFixed(2),
    z: +z.toFixed(2),
    yaw: +yaw.toFixed(3),
    roofed: k === 'floor' || k === 'door',
    ahead: +ahead.toFixed(1),
    sees,
    horizon,
    lamps,
    faults,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const args = process.argv.slice(2),
    opt = (n) => args.find((a) => a.startsWith('--' + n + '='))?.slice(n.length + 3),
    named = args.filter((a) => !a.startsWith('--')),
    ids = named.length
      ? named
      : fs
          .readdirSync(path.join(root, 'maps'))
          .filter((f) => f.endsWith('.json'))
          .map((f) => f.slice(0, -5))
          .sort(),
    out = {},
    views = {};
  for (const id of ids) {
    const map = parseMap(JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8'))),
      o = (out[id] = openingOf(map));
    views['OPEN-' + id] = { map: id, x: o.x, z: o.z, yaw: o.yaw, pitch: 0 };
    console.log(
      id.padEnd(8),
      o.roofed ? 'roofed' : 'sky   ',
      'ahead',
      String(o.ahead).padStart(5),
      'm  sees',
      String(o.sees).padStart(4),
      ' horizon',
      o.horizon,
      ' lamps',
      o.lamps,
      o.faults.length ? '  ' + o.faults.join(', ').toUpperCase() : '  ok',
    );
  }
  const bad = Object.values(out).filter((o) => o.faults.length).length;
  console.log(`\n${ids.length - bad} of ${ids.length} openings meet every floor; ${bad} have a fault`);
  if (opt('json')) fs.writeFileSync(opt('json'), JSON.stringify(out, null, 1));
  if (opt('views')) fs.writeFileSync(opt('views'), JSON.stringify(views, null, 1));
}
