# TESTING

## Commands
- `npm test` — 96 node:test tests (incl. `automap`: fog of war/secret panels/persistence/old-save migration; `bindings`: remap rules;  `weapons`: scattergun falloff/spread/wall-blocking, switching, pickups, in-flight-flare regression, Gaunt tell/dodge/cooldown, obstacle steering, save v2->v3; `audio`: every sim event is audible, every mapped sound exists, positional vs local, panning), headless (~3 s). Files in `tests/`: `controls` (sprint, ADS, accuracy, toggle mode, v1->v2 save migration, settings repair), `mapformat` (validation + reachability, incl. negative cases), `sim` (determinism, frame-rate independence, collision, doors, damage, pickups, input layer, death/exit ordering, transitions), `save` (round-trip, migration machinery, corrupt/newer/incompatible, map-changed fallback, storage), `route` (canonical routes on all difficulties, reproducibility), `settings`, `campaign` (68-slot topology + the PLANNED/IMPLEMENTED/AGENT_VERIFIED/COMPLETE derivation, stale evidence).
- `npm run validate` / `npm run status` — manifest topology + evidence-derived status + asset file check.
- `npm run browsercheck` — headless Chrome (154, SwiftShader software GL, 1280x720) against the dev server, 42 checks (takes ~7 min, run it without a short timeout); writes `validation/browser-check.json`, screenshots in `review/engine-skeleton/`.
- `npm run verify-map -- C1E1M01` — generates map evidence (routes x 3 difficulties, reachability, latest browser check).
- `npm run build` — production build; the dev test hook must not appear in `dist/` (checked by grep, 2026-09-29: 0 matches).
- Asset tools: `node tools/dev/determinism.mjs <asset>`, `node tools/dev/clean-regen.mjs`.

## Results (2026-09-29, engine skeleton)
| area | result |
|---|---|
| unit/integration tests | 96/96 pass |
| automap + remap (real input, headless Chrome) | real Tab opens/closes the map and it paints only explored cells; remap: click slot -> press key -> assigned; conflict takes the key from the other action; Esc cancels without leaving pause; bindings survive a real page reload; reset restores defaults |
| audio QA (offline render, Chrome) | 31 SFX + 2 score renders: all finite, audible, decay to silence, peak <= 0.93; reproducible within 1 LSB (27/31 bit-exact); combat score ~50% louder than calm. WAVs in `review/audio/` |
| live audio (headless Chrome) | locked at startup; a real click unlocks (context running); real firing plays `flare_fire`; a full route plays 71 sounds incl. explosion/key/door/death/footsteps |
| browser check (real DOM input, live rAF loop) | 26/26 pass: click Normal starts a game; held real W moves the player; real Shift+W is ~1.5x walk speed; a real click while sprinting does not fire; real right-mouse holds ADS (fov 70 -> 46, ads 0 -> 1) and release restores it; real click fires; Esc pauses/resumes |
| Node vs Chrome determinism | same route/seed: identical tick count (2045) and identical final state hash (d0d311b7) in Node and in Chrome, with sprint + ADS + hip spread in the route |
| canonical routes | main + secret routes complete on easy/normal/hard through the real input layer (bot acts only via InputState) |
| save/resume | headless: resumed run equals uninterrupted run (hash); browser: quick save/load restores tick and position |
| death/restart | dies, freezes, death screen, retry restores a live player with the key available again |
| GPU lifecycle | 12 level restarts: geometries 341 -> 341, textures 12 -> 12, programs 7 -> 7 |
| mutation check | flipping death-vs-exit ordering makes the "exit while fatal damage" test fail (then restored) |
| production build | succeeds; dev hook absent from bundle |

## Failure-injection coverage
Death while holding the key (restart restores it), use/interact spam on locked and unlocked doors (400 presses), exit reached on the same tick as fatal damage (death wins), save immediately after a transition, reload after finding a secret (no double count), 50 repeated transitions, corrupt/foreign/newer/old saves, map changed since save, unusable storage, key placed behind its own door (reachability catches it), walled-off exit, evidence gone stale after a map edit.

## Not tested / limits
- Audio: whether it SOUNDS good is unverified (no human has listened yet); levels were balanced by measurement only. Headless Chrome has no real output device, so live playback was verified by engine state and log, not by ear. Music/ambience mixing in a real session is untested.
- Pointer lock (not available in the app browser pane; headless Chrome exercised the drag/click fallback path only).
- Real-GPU frame rate and memory: the only numbers are software-GL (avg ~26 ms/frame at 1280x720) and are NOT a performance claim.
- Automap: keyboard/visual verified only in headless Chrome; the map is a whole-level fit with no zoom/pan; it does not show pickups or enemies by design.
- Balance: the route bot has perfect aim and dodges lunges, so it is never hurt; scattergun/Gaunt numbers are unproven by a human.
- Enemy AI is chase-and-steer only (no real pathfinding): an enemy can still get stuck on concave geometry or behind a wall it cannot open.
- Bot aims perfectly and is never hit on the current routes, so difficulty balance is unproven; difficulty is only verified by unit test (damage/health multipliers).
- The app browser pane hides itself and suspends animation frames, so it could not be used for live-loop verification; headless Chrome was used instead.
- Screenshots were reviewed by eye for appearance only.

## Known defects
- MINOR: in ADS the yellow sleeves splay from the bottom centre in an inverted V (their geometry was built for the hip pose).
- MINOR: sprint/ADS pose values were tuned by eye on screenshots only; no feel testing by a human yet.
- MAJOR: value-banding post pass reads more posterised-pixel than brushy (look decision pending).
- MAJOR: weapon view-model reads blocky; enemy coat is a plain cone.
- MINOR: exterior is very dark away from lamp posts; lighting values are placeholders.
- MINOR: secret panel discoverability is untested/unstyled (flush wall, no hint).
- MINOR: baking is slow (atlas ~100 s under software GL).
- MINOR: concept sprites `enemy_tollbearer_idle.png` / `weapon_flarecannon.png` are unused leftovers (excluded from the build).

## History
- Gate 0 asset spike: p5 seeding, opaque bases and matting findings are recorded in `ART_BIBLE.md`; clean-env regeneration within 0.3% differing bytes (`review/gate-0/clean-regen.json`).
- Look demo: two bugs fixed (weapon pass wiped world depth so outlines vanished; brush fills were translucent atlas cells).
- Second weapon/enemy bugs found by tests and fixed in the game: knockback compounded within one pellet volley (pellets are now simultaneous); a Gaunt got stuck pushing into a barrel forever (added obstacle steering); a flare in flight used the CURRENT weapon's stats after a switch (projectiles now carry their weapon).
- Controls pass (sprint / ADS) bugs found by the checks and fixed in the game: the muzzle sat 16 cm right of the crosshair so aimed shots missed (muzzle now centres with ADS); the browser-check helper silently dropped any statement after the first (fixed; earlier teleports/addYaw in the script had not been running).
- Engine skeleton bugs found by the checks and fixed in the game: hook and rAF loop both stepping the sim (added manual clock), one geometry leaked per level restart (post pass quad not disposed), keys tapped between ticks were dropped (tap latch).
