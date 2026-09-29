# Gate 0 review: painterly look

Open `pipeline-sheet.png`: wall tile (shown 2x2 to check seams), enemy sprite (Tollbearer), weapon view (flare cannon), title illustration. Sprites are shown over a checkerboard, nearest-neighbour scaled.

Decision requested: **is this painterly direction (washes + ink outlines + rust/salt grime, teal Hush accents) right to build on?** Reply with what to keep or change.

Proven: the p5.js + p5.brush pipeline works end to end; assets regenerate from a clean `npm ci` within 0.3% of bytes (`clean-regen.json`, not bit-exact); alpha extraction works.
Not yet proven: rendering through Three.js in-game; texel density at play distance. Known defects: `TESTING.md`.
Regenerate: `npm run bake && node tools/preview.mjs`.
