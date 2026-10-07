// Plain-Node check of the L0 design studies against the simulation's own numbers (src/engine/defs.js), before anything is drawn or built:
//   - drawn HEIGHT within +-0.10 m of defs `height` (the fairness rule of tests/hit-volume-fair.test.js), a flyer measured from its hover
//   - the standing body's WIDTH against the hit cylinder (2 x hitRadius, +0.15 m for the pellet), reported, not enforced: arms and trailing cloth are deliberately not hittable
// node tools/look/check-figures.mjs
import { ENEMIES } from '../../src/engine/defs.js';
import { FIGURES, figureBox, chaikin, sym } from './figures.js';

let bad = 0;
for (const [kind, fn] of Object.entries(FIGURES)) {
  const items = kind === 'tollbearer' ? [fn(0), fn(2)] : [fn()];
  items.forEach((it, n) => {
    const b = figureBox(it), d = ENEMIES[kind], hover = d.hover ?? 0, h = b.y1 - Math.max(b.y0, hover), w = b.x1 - b.x0, hitW = 2 * (d.hitRadius ?? d.radius) + 0.15;
    const okH = Math.abs(h - d.height) <= 0.1 && b.y0 >= hover - 0.05;
    // the 85th-percentile half-width of the BODY outline points (limbs excluded would need tags; this is the whole figure, so it is an upper bound)
    const xs = []; for (const p of it) if (p.t === 'part') for (const [x] of chaikin(p.sym ? sym(p.pts) : p.pts, p.it ?? 2)) xs.push(Math.abs(x)); xs.sort((a, c) => a - c);
    const p85 = xs[Math.floor(xs.length * 0.85)];
    if (!okH) bad++;
    console.log(`${kind}${kind === 'tollbearer' ? ' stage ' + (n ? 2 : 0) : ''}: height ${h.toFixed(2)} (defs ${d.height}${hover ? ', hover ' + hover : ''}) ${okH ? 'OK' : 'OUT OF +-0.10'} | width ${w.toFixed(2)} (hit cylinder ${hitW.toFixed(2)}) | 85th-pct half-width ${p85.toFixed(2)} vs radius ${(d.hitRadius ?? d.radius).toFixed(2)}`);
  });
}
process.exit(bad ? 1 : 0);
