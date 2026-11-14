// The picture's numbers (design/VISUAL_AWE_PLAN.md, session A1): how much dark and light a 1920 x 1080 game frame holds, and how much colour.
// The held gun, the corner map, the objective box and the HUD strip are left out, so the numbers are about the PLACE.
// A floor, not a verdict: a flat grey sky scores a wide spread too. Node only (pngjs).
//   node tools/dev/frame-score.mjs [--json=<out.json>] <png | dir> ...
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

/** the floors of the plan's section 5; a place meant to be colourless is excused the colour floor by the caller */
export const FLOORS = Object.freeze({ spread: 130, bright: [2, 15], dark: [12, 55], coloured: 50 });

/** the numbers of one decoded frame ({ width, height, data }) */
export function scoreFrame(p) {
  const L = [],
    hue = new Array(12).fill(0);
  let sat = 0,
    n = 0,
    col = 0;
  for (let y = 0; y < p.height * 0.9; y += 3)
    for (let x = 0; x < p.width; x += 3) {
      if (x > p.width * 0.52 && y > p.height * 0.58) continue; // the held gun
      if (x > p.width * 0.88 && y < p.height * 0.2) continue; // the corner map
      if (x < p.width * 0.32 && y < p.height * 0.12) continue; // the objective
      const i = (y * p.width + x) * 4,
        r = p.data[i],
        g = p.data[i + 1],
        b = p.data[i + 2],
        mx = Math.max(r, g, b),
        mn = Math.min(r, g, b),
        s = mx ? (mx - mn) / mx : 0;
      L.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
      sat += s;
      n++;
      if (s > 0.2 && mx > 40) {
        let h = mx === r ? ((g - b) / (mx - mn)) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
        if (h < 0) h += 6;
        hue[Math.floor(h * 2) % 12]++;
        col++;
      }
    }
  L.sort((a, b) => a - b);
  const q = (t) => Math.round(L[Math.floor(t * (L.length - 1))]),
    share = (f) => +((L.filter(f).length / n) * 100).toFixed(1),
    top = [...hue].sort((a, b) => b - a);
  return {
    p5: q(0.05),
    p50: q(0.5),
    p95: q(0.95),
    spread: q(0.95) - q(0.05),
    dark: share((v) => v < 40),
    bright: share((v) => v > 180),
    sat: +(sat / n).toFixed(2),
    coloured: +((col / n) * 100).toFixed(1),
    top2hue: col ? +(((top[0] + top[1]) / col) * 100).toFixed(0) : 0,
  };
}

/** which floors a score misses (an empty list = it meets them all) */
export function misses(s, { colourless = false } = {}) {
  const m = [];
  if (s.spread < FLOORS.spread) m.push('spread');
  if (s.bright < FLOORS.bright[0] || s.bright > FLOORS.bright[1]) m.push('bright');
  if (s.dark < FLOORS.dark[0] || s.dark > FLOORS.dark[1]) m.push('dark');
  if (!colourless && s.coloured < FLOORS.coloured) m.push('coloured');
  return m;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const args = process.argv.slice(2),
    jsonOut = args.find((a) => a.startsWith('--json='))?.slice(7),
    files = args
      .filter((a) => !a.startsWith('--'))
      .flatMap((a) =>
        fs.statSync(a).isDirectory()
          ? fs
              .readdirSync(a)
              .filter((f) => f.endsWith('.png'))
              .sort()
              .map((f) => path.join(a, f))
          : [a],
      ),
    out = {};
  for (const f of files) {
    const s = scoreFrame(PNG.sync.read(fs.readFileSync(f))),
      name = path.basename(f, '.png');
    out[name] = s;
    console.log(
      name.padEnd(34),
      'spread',
      String(s.spread).padStart(3),
      'dark',
      String(s.dark).padStart(5) + '%',
      'bright',
      String(s.bright).padStart(5) + '%',
      'coloured',
      String(s.coloured).padStart(5) + '%',
      'top2hue',
      String(s.top2hue).padStart(3) + '%',
      misses(s).length ? 'MISSES ' + misses(s).join(',') : 'ok',
    );
  }
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(out, null, 1));
}
