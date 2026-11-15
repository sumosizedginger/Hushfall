// A8 (2026-11-14): REAL accent lamps, in the map, for maps whose look still has no warm-against-cool pair and whose drawn-only accent
// (src/render/accents.js) found no spot or did not show in the hero frame. Writes maps-src/accent-lamps.json; tools/mapkit/compile.mjs adds each as
// a `prop` (a hanging `lamp`: no collision; a `lamppost`: the sim's own 0.3 m post) in the shipped (squeezed) frame. Recompile and verify the map.
//   node tools/dev/source-lamps.mjs <looks.json> <ID...>
// The spot: a floor cell 4 to 16 m from the hero view whose bulb lands inside the hero frame (70 degree vertical field, 16:9), off the crosshair, clear
// of the held gun and the objective box, seen without a wall between, not on a prop or an entity, within 3 m of the view's floor. A hanging lamp is
// tried first (it changes nothing the sim moves through); a post where the cell has no roof or the hanging bulb would leave the frame.
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile } from '../../src/engine/harness.js';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const [looksFile, ...ids] = process.argv.slice(2);
const looks = Object.fromEntries(JSON.parse(fs.readFileSync(looksFile, 'utf8')).map((r) => [r.look, r]));
const views = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps-src', 'hero-views.json'), 'utf8'));
const tintOf = (r) => (r.cool < 10 ? 'blue' : r.warm < 10 ? 'amber' : r.cool <= r.warm ? 'blue' : 'amber');
const ROOFED = new Set(['floor', 'door', 'secret']),
  TAN = Math.tan((35 * Math.PI) / 180),
  EYE = 1.6;
const outFile = path.join(ROOT, 'maps-src', 'accent-lamps.json');
const out = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : {};
const miss = [];

for (const id of ids) {
  const map = loadMapFile(path.join(ROOT, 'maps', id + '.json')),
    look = looks[map.atmosphere?.look ?? 'harbour'];
  if (!look?.needs) {
    console.log(id, 'its look already has a pair: skipped');
    continue;
  }
  const S = map.cell,
    hv = views[id],
    v = { x: hv.x * S, z: hv.z * S, yaw: hv.yaw, pitch: hv.pitch ?? 0 }, // (hero views are kept in cells)
    fx = -Math.sin(v.yaw),
    fz = -Math.cos(v.yaw),
    vfy = map.floor(Math.floor(v.x / S), Math.floor(v.z / S)),
    eye = vfy + EYE;
  const taken = new Set(map.entities.map((e) => Math.floor(e.at[0]) + ',' + Math.floor(e.at[1])));
  const seen = (x, z) => {
    const d = Math.hypot(x - v.x, z - v.z);
    for (let t = 0.5; t < d; t += 0.5)
      if (map.kind(Math.floor((v.x + ((x - v.x) * t) / d) / S), Math.floor((v.z + ((z - v.z) * t) / d) / S)) === 'wall') return false;
    return true;
  };
  // where a point lands in the frame (NDC, x right, y up), or null behind the camera
  const ndc = (x, y, z) => {
    const dx = x - v.x,
      dz = z - v.z,
      dy = y - eye,
      ahead = dx * fx + dz * fz,
      side = dx * -fz + dz * fx,
      c = Math.cos(v.pitch),
      s = Math.sin(v.pitch),
      depth = ahead * c + dy * s,
      up = dy * c - ahead * s;
    return depth > 0.5 ? [side / (depth * TAN * (16 / 9)), up / (depth * TAN)] : null;
  };
  const framed = (p) =>
    p && Math.abs(p[0]) < 0.78 && p[1] > -0.55 && p[1] < 0.72 && Math.hypot(p[0], p[1] * 0.6) > 0.12 && !(p[0] > 0.05 && p[1] < -0.15) && !(p[0] < -0.4 && p[1] > 0.6);
  let pick = null,
    skip = +(process.env.SKIP ?? 0);
  search: for (const kind of ['lamp', 'lamppost'])
    for (const d of [7, 8, 6, 9, 10, 5, 11, 12, 4, 13, 14, 16])
      for (const s of [-3, 3, -4.5, 4.5, -2, 2, -6, 6, -8, 8]) {
        const cx = Math.floor((v.x + fx * d - fz * s) / S),
          cz = Math.floor((v.z + fz * d + fx * s) / S);
        if (cx < 0 || cz < 0 || cx >= map.w || cz >= map.h) continue;
        const k = map.kind(cx, cz);
        if (k !== 'floor' && k !== 'outdoor') continue;
        if (kind === 'lamp' && !ROOFED.has(k)) continue;
        if (taken.has(cx + ',' + cz) || Math.abs(map.floor(cx, cz) - vfy) > 3) continue;
        // a post has the sim's 0.3 m collision: out in the floor the bot bumped it and five maps' routes changed, so a post stands against a wall
        // FREE=1 allows a free-standing post (then prove the map's routes unchanged with route-fingerprint); SKIP=n takes the (n+1)th candidate
        if (kind === 'lamppost' && !process.env.FREE && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => map.kind(cx + a, cz + b) === 'wall')) continue;
        const x = (cx + 0.5) * S,
          z = (cz + 0.5) * S,
          bulb = kind === 'lamp' ? map.ceilingAt(cx, cz) - 0.92 : map.floor(cx, cz) + 3.3;
        if (!seen(x, z) || !framed(ndc(x, bulb, z))) continue;
        if (skip-- > 0) continue;
        pick = { at: [cx, cz], kind, tint: tintOf(look) };
        console.log(id.padEnd(8), look.look.padEnd(10), pick.tint.padEnd(6), kind.padEnd(9), cx + ',' + cz, 'frame', ndc(x, bulb, z).map((n) => n.toFixed(2)).join(','));
        break search;
      }
  if (pick) out[id] = [pick];
  else miss.push(id);
}
const sorted = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
fs.writeFileSync(outFile, JSON.stringify(sorted, null, 1).replace(/\[\s+(-?\d+),\s+(-?\d+)\s+\]/g, '[$1, $2]') + '\n');
console.log('lamps', Object.keys(sorted).length, '; no framed spot:', miss.join(' ') || 'none');
