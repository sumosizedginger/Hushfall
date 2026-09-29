# TESTING

## Commands
- `npm test` — 48 node:test tests, headless (~3 s). Files in `tests/`: `mapformat` (validation + reachability, incl. negative cases), `sim` (determinism, frame-rate independence, collision, doors, damage, pickups, input layer, death/exit ordering, transitions), `save` (round-trip, migration machinery, corrupt/newer/incompatible, map-changed fallback, storage), `route` (canonical routes on all difficulties, reproducibility), `settings`, `campaign` (68-slot topology + the PLANNED/IMPLEMENTED/AGENT_VERIFIED/COMPLETE derivation, stale evidence).
- `npm run validate` / `npm run status` — manifest topology + evidence-derived status + asset file check.
- `npm run browsercheck` — headless Chrome (154, SwiftShader software GL, 1280x720) against the dev server, 22 checks; writes `validation/browser-check.json`, screenshots in `review/engine-skeleton/`.
- `npm run verify-map -- C1E1M01` — generates map evidence (routes x 3 difficulties, reachability, latest browser check).
- `npm run build` — production build; the dev test hook must not appear in `dist/` (checked by grep, 2026-09-29: 0 matches).
- Asset tools: `node tools/dev/determinism.mjs <asset>`, `node tools/dev/clean-regen.mjs`.

## Results (2026-09-29, engine skeleton)
| area | result |
|---|---|
| unit/integration tests | 48/48 pass |
| browser check (real DOM input, live rAF loop) | 22/22 pass: click Normal starts a game; held real W key moves the player; real click fires; Esc pauses/resumes |
| Node vs Chrome determinism | same route/seed: identical tick count (2813) and identical final state hash in Node and in Chrome |
| canonical routes | main + secret routes complete on easy/normal/hard through the real input layer (bot acts only via InputState) |
| save/resume | headless: resumed run equals uninterrupted run (hash); browser: quick save/load restores tick and position |
| death/restart | dies, freezes, death screen, retry restores a live player with the key available again |
| GPU lifecycle | 12 level restarts: geometries 341 -> 341, textures 12 -> 12, programs 7 -> 7 |
| mutation check | flipping death-vs-exit ordering makes the "exit while fatal damage" test fail (then restored) |
| production build | succeeds; dev hook absent from bundle |

## Failure-injection coverage
Death while holding the key (restart restores it), use/interact spam on locked and unlocked doors (400 presses), exit reached on the same tick as fatal damage (death wins), save immediately after a transition, reload after finding a secret (no double count), 50 repeated transitions, corrupt/foreign/newer/old saves, map changed since save, unusable storage, key placed behind its own door (reachability catches it), walled-off exit, evidence gone stale after a map edit.

## Not tested / limits
- Pointer lock (not available in the app browser pane; headless Chrome exercised the drag/click fallback path only).
- Real-GPU frame rate and memory: the only numbers are software-GL (avg ~26 ms/frame at 1280x720) and are NOT a performance claim.
- Audio does not exist yet. Automap does not exist yet. Only one weapon and one enemy type exist.
- Bot aims perfectly and is never hit on the current routes, so difficulty balance is unproven; difficulty is only verified by unit test (damage/health multipliers).
- The app browser pane hides itself and suspends animation frames, so it could not be used for live-loop verification; headless Chrome was used instead.
- Screenshots were reviewed by eye for appearance only.

## Known defects
- MAJOR: value-banding post pass reads more posterised-pixel than brushy (look decision pending).
- MAJOR: weapon view-model reads blocky; enemy coat is a plain cone.
- MINOR: exterior is very dark away from lamp posts; lighting values are placeholders.
- MINOR: secret panel discoverability is untested/unstyled (flush wall, no hint).
- MINOR: baking is slow (atlas ~100 s under software GL).
- MINOR: concept sprites `enemy_tollbearer_idle.png` / `weapon_flarecannon.png` are unused leftovers (excluded from the build).

## History
- Gate 0 asset spike: p5 seeding, opaque bases and matting findings are recorded in `ART_BIBLE.md`; clean-env regeneration within 0.3% differing bytes (`review/gate-0/clean-regen.json`).
- Look demo: two bugs fixed (weapon pass wiped world depth so outlines vanished; brush fills were translucent atlas cells).
- Engine skeleton bugs found by the checks and fixed in the game: hook and rAF loop both stepping the sim (added manual clock), one geometry leaked per level restart (post pass quad not disposed), keys tapped between ticks were dropped (tap latch).
