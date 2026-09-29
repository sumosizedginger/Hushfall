# TESTING

## Commands
- `npm run validate` — manifest topology (68/36/32/62/6, unique IDs, main chain, secret entrances/returns) + evidence-derived status + asset file check.
- `npm run status` — status counts derived from `validation/maps/*.json`.
- `node tools/dev/determinism.mjs <asset>` — bake twice, diff.
- `node tools/dev/clean-regen.mjs` — `npm ci` in a fresh copy, bake, diff against `assets/baked/`.

## Results so far (2026-09-29, Gate 0)
| check | result |
|---|---|
| `npm run validate` | OK: 68 slots, C1 36, C2 32, main 62, secret 6 |
| status | PLANNED 68 / IMPLEMENTED 0 / AGENT_VERIFIED 0 / COMPLETE 0 |
| negative test: manifest claims `COMPLETE` without evidence | validator exits 1 (observed) |
| clean-env asset regen | all 4 assets within 0.3% differing bytes; not bit-exact (`review/gate-0/clean-regen.json`) |
| p5 seeding | without `brush.seed()` ~30% of bytes differed run to run; with it <0.3% |
| transparency | enemy/weapon alpha recovered by difference matting; inspected on checkerboard |
| nearest-neighbour scaling | preview sheet only; NOT yet verified through Three.js |

## Not yet tested (no game exists)
Runtime/browser paths, Three.js load of baked assets, pointer lock, collision, combat, saves, performance, secret-exit routing negatives (only the status-inflation negative test was observed failing; other validator error branches are untested).

## Known defects (asset spike)
- MAJOR: weapon-view art: receiver/hands show coloured speckle from matting on low-coverage pixels; hands are translucent-looking.
- MAJOR: enemy shading blobs read flat/blocky; grime lines look like black bars on the coat.
- MINOR: title art tower is lost against dark clouds after the reseed; needs a lighter sky value behind it.
- MINOR: bakes are slow (~10 s per page under SwiftShader).

## Look demo (2026-09-29)
- `npm run shoot`: headless Chrome (SwiftShader) drives the demo: 5 viewpoints, fire/impact/kill sequence, raw-vs-painted; 10 screenshots in review/look-demo/. Kill confirmed via state (kills: 1). No page errors after fixing a favicon 404.
- Built-in browser pane: loaded http://localhost:5173/look.html, no console errors. Pointer lock, keyboard play and real-GPU frame rate NOT yet tested (headless SwiftShader measured ~35 fps at 1280x720; not a valid perf number).
- Known look issues: post value-banding makes it read more posterised-pixel than brushy; coat is a plain cone; weapon receiver reads blocky; ceiling reuses floor texture; sky/floor colours untuned; edge-detect thresholds untuned; lighting is placeholder.
- Bug found+fixed: clearing depth for the weapon pass wiped the world depth the outline shader needs (fixed by compressing weapon depth into the near range).
- Bug found+fixed: a bake wrote translucent atlas cells because brush fills are washes (added opaque p5 base fills).
