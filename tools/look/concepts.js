// Concept-sheet baker page (p5.js 2.x instance mode + p5.brush, the same pipeline and conventions as tools/baker/baker.js). It draws DESIGN STUDIES for design/LOOK_BIBLE.md.
// It is not the asset baker: nothing it draws is a game asset, and tools/look/bake-concepts.mjs writes only to review/look-bible/ (never assets/baked, never the manifest).
import p5 from 'p5';
import * as brush from 'p5.brush';
import { recipes } from './recipes_look.js';

const id = new URLSearchParams(location.search).get('asset');
try {
  const r = recipes[id];
  if (!r) throw new Error('unknown concept ' + id);
  new p5((p) => {
    brush.instance(p);                                           // before setup (documented instance-mode pattern)
    p.setup = () => {
      try {
        p.pixelDensity(1);
        p.createCanvas(r.width, r.height, p.WEBGL);
        p.noLoop();
        p.randomSeed(r.seed); p.noiseSeed(r.seed);
        brush.seed(r.seed); brush.noiseSeed(r.seed);             // required: the p5 hook does not reach brush's RNG
        r.draw(p, brush, r.width, r.height);
        window.__BAKE_RESULT__ = { id, seed: r.seed, width: r.width, height: r.height, dataUrl: p.canvas.toDataURL('image/png') };
        window.__BAKE_DONE__ = true;
      } catch (e) { window.__BAKE_ERROR__ = String(e && e.stack || e); }
    };
  }, document.getElementById('out'));
} catch (e) { window.__BAKE_ERROR__ = String(e && e.stack || e); }
