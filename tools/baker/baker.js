// p5.js 2.x instance mode + p5.brush (p5-integrated build) asset baker. Runs in a browser page (see tools/bake.mjs).
// Finding: p5.brush binds its GL state to the FIRST p5 instance in a page, so bake.mjs loads one fresh page per job.
// Finding: p5.brush does not composite into a transparent WEBGL canvas, so `transparent` recipes are baked on black
// and on white (same seed) and bake.mjs recovers exact alpha by difference matting.
import p5 from 'p5';
import * as brush from 'p5.brush';
import { recipes } from './all.js';

const params = new URLSearchParams(location.search);
const id = params.get('asset');
const bgColor = params.get('bg') || '#000000';

try {
  const r = recipes[id];
  if (!r) throw new Error('unknown recipe ' + id);
  new p5((p) => {
    brush.instance(p); // documented instance-mode pattern: before setup/draw
    p.setup = () => {
      try {
        p.pixelDensity(1);
        p.createCanvas(r.width, r.height, p.WEBGL);
        p.noLoop();
        p.randomSeed(r.seed); p.noiseSeed(r.seed);
        brush.seed(r.seed); brush.noiseSeed(r.seed); // REQUIRED in ESM instance mode: the p5 randomSeed hook does not reach brush's RNG (it seeds from Math.random)
        p.background(bgColor);
        r.draw(p, brush, r.width, r.height);
        window.__BAKE_RESULT__ = { id, bg: bgColor, transparent: !!r.transparent, seed: r.seed, width: r.width, height: r.height, dataUrl: p.canvas.toDataURL('image/png') };
        window.__BAKE_ENV__ = { p5: p5.VERSION, ua: navigator.userAgent };
        window.__BAKE_DONE__ = true;
      } catch (e) { window.__BAKE_ERROR__ = String(e && e.stack || e); }
    };
  }, document.getElementById('out'));
} catch (e) { window.__BAKE_ERROR__ = String(e && e.stack || e); }
