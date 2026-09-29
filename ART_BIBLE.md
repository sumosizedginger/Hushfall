# ART BIBLE (Gate 0 draft)

## Direction
Painterly, hand-painted, 1990s-shooter structure: low internal render resolution with nearest-neighbour upscaling of the final frame. Assets keep visible brush character (washes, ink outlines, salt/rust grime) but with crisp alpha edges and solid bodies. User-approved 2026-09-29: painterly over strict pixel art.

## Palette anchors (per-map palettes are constrained subsets)
Harbour slate `#2b3a3f #34474c #3a4e52` · rust `#7a4a2b #5c3620 #8c5a30` · oilskin yellow `#c9a227 #b8951f #8a6d18` · bell bronze `#b8722e #d9a04c #e0aa5a` · Hush teal `#3fffe0 #3fd6c0` · spore violet `#5b3f7a` · ink `#0d0f14 #10181a` · dusk sky `#1a1233 #48246a #c0587a #e8946a`.
Rule: teal is reserved for Vael/Hush signalling (eyes, veins, energy). Yellow oilskin = human/Tide-Warden identity.

## Source resolutions
Wall/floor/ceiling tiles 256x256 (seamless, wrapped drawing) · enemy sprites 128x128 · weapon views 256x160 · UI illustrations 320x200. Final frame nearest-neighbour; textures use `NearestFilter`, no mipmap blur on sprites.

## Transparency
Sprites bake on black AND white (same seed); alpha is recovered by difference matting in `tools/bake.mjs`, then hardened with `alphaCurve` (default [0.12, 0.4]) for solid bodies and crisp edges. Known artefact: coloured speckle on low-coverage edge pixels (see known defects).

## Pipeline facts (verified)
- Versions: p5 2.3.4, p5.brush 2.2.3 (p5-integrated build, `import * as brush from 'p5.brush'`), three 0.186.1, vite, puppeteer (Chrome 154, SwiftShader software GL), pngjs.
- Pattern: `new p5(sketch)`; inside sketch `brush.instance(p)` before setup; `createCanvas(w,h,WEBGL)`; `pixelDensity(1)`; then `brush.seed(seed)` and `brush.noiseSeed(seed)` explicitly (the p5 `randomSeed` hook does not reach brush in ESM instance mode; without it output is non-deterministic).
- Brush coordinates are canvas-centred; recipes author in top-left px via `wrap()`.
- One p5 instance per page (brush binds GL state to the first instance).
- Brush does not draw into a transparent canvas -> matting workaround.
- Brush fill washes are translucent by default; use `blob()` helper (fillTexture 0.2, bleed 0.1) and alpha hardening for solid sprites.

## Asset seeds (recipes in `tools/baker/recipes.js`)
| asset | source | seed |
|---|---|---|
| wall_bulkhead_a | 256x256 | 1101 |
| enemy_tollbearer_idle | 128x128 | 2201 |
| weapon_flarecannon | 256x160 | 3301 |
| ui_title_art | 320x200 | 4401 |

## Commands
`npm run bake` (all) · `node tools/bake.mjs <id>` · `node tools/preview.mjs` · `node tools/dev/determinism.mjs <id>` · `node tools/dev/clean-regen.mjs`.

## Not yet done
Texel-density rules, per-episode palettes, UI/HUD rules, sprite direction sets (8-way vs billboard), animation frame counts, runtime Three.js material verification.
