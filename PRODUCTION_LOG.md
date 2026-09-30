# PRODUCTION LOG

## CURRENT STATE (read first)
- Gate: **1 (one real level) — implementation, adversarial audit and audit repairs DONE; waiting for the user's Gate 1 creative decision.** Gate 0 complete; the look was approved 2026-09-29 (that is not the Gate 1 approval). The evidence bundle is `review/gate-1/` (README first). **Do not start Gate 2 until the user answers APPROVE DIRECTION / REVISE DIRECTION / STOP PROJECT.**
- Map status (derived from evidence, never typed): C1E1M01 AGENT_VERIFIED (Marrow Quay, map v7, 16 enemies of 3 kinds); 67 PLANNED. See `npm run status`. No map is COMPLETE: that needs a recorded human review.
- Open/partial/unverified items (authoritative list: `review/gate-1/known-defects.json`): F10 layout variety (two wall skins, one interior floor), F12 real-GPU performance unmeasured, F14 pointer lock unverified in real Chrome, U1 balance/feel never played by a human, U2 audio never heard, U3 par time is a placeholder, U4 only one level exists.
- If the user says **REVISE**: fix what they name, re-run `npm run verify && npm run browsercheck && npm run audio-qa && npm run shoot-level && npm run verify-map -- C1E1M01`, commit, then `npm run gate1-bundle`. If **STOP**: leave the repo runnable and record why. If **APPROVE**: the next task is Gate 2 (one full episode: 8 main + 1 secret maps) reusing this pipeline, starting with the production kit (more tile skins/floor heights, a level-authoring checklist) BEFORE authoring maps.
- Resume: `npm ci && npm run verify && npm run browsercheck && npm run dev` (game on http://localhost:5173/).

## Recent decisions
- 2026-09-29 (audit repair): enemies are hunters, not sentries: they wake on sight, on being hit, on loud gunfire/explosions (close, or with a clear line) and when a neighbour wakes; they walk to where they last saw the player and give up after ~8 s; they are solid (the player cannot walk through them); pillars and stacked crates block sight. A third enemy, the Bellhand, fires a slow, dodgeable, aimed toll-shot. A level is not AGENT_VERIFIED unless a passive runner cannot get through it and a perfect bot takes damage (`verify-map` viability gates).
- 2026-09-29 (audit repair): save v6 records `levelStart` so Retry restores the inventory the level began with (also after loading). Mid-level saves store that as their carry.
- 2026-09-29 (audit repair): evidence must come from one commit and say so (browser-check, audio-qa, map evidence are stamped; the bundle fails on mismatch). Known defects live in `review/gate-1/known-defects.json`, a judgement file; open BLOCKERs there are read by verify-map.
- 2026-09-29: sim is headless and deterministic (plain-data state, seeded RNG, event queue) so tests run in Node with no browser; the renderer only reads it. Verified Node and Chrome give identical state hashes.
- 2026-09-29: map format v1 = ASCII grid (# wall, . interior, : outdoor, D door, S secret panel) + entity list (player, enemy, pickup, prop, exit) + doors/secrets tables. Reachability considers keys.
- 2026-09-29: death beats exit when both happen on the same tick (documented + tested).
- 2026-09-29: save policy: migrate or reject with an explicit reason; mid-level saves fall back to level start if the map version changed. Settings are versioned the same way.
- 2026-09-29: controls (user request): walk 6.4 m/s, hold-Sprint (x1.55 forward-only, cancelled by aim, no firing until 0.18 s after), hold-ADS (right mouse; FOV 46, centred weapon + iron sights, accuracy cone 0.035 -> 0.003 rad, x0.55 move speed, sensitivity follows zoom); optional toggle mode for both. Sim-side so routes/tests cover them. Save schema is now v2 (first real migration, v1 -> v2). Weapons must define `spread`.
- 2026-09-29: dev test hook is compiled out of production via `import.meta.env.DEV`; its only state writers are labelled `setup_*`.

## Rejected / removed
- Baking several recipes in one page (only the first p5 instance renders); alpha from a single bake; one-page-per-asset kept.
- Using the app browser pane for live-loop verification (it hides itself, suspending rAF). Headless Chrome is used.

## Defects
See `TESTING.md` known defects.

## Log
- 2026-09-29 Gate 0: repo initialised, docs, 68-slot manifest, validator/status, p5+p5.brush spike (clean-env regen within 0.3%).
- 2026-09-29 look demo: painted-3D direction proven and approved. Process incident: I killed the user's Chrome with `taskkill /IM`; rule saved to memory and AGENTS.md.
- 2026-09-29 engine skeleton: `src/engine/*` (world, mapformat, reach, input, loop, save, bot, harness, defs, rng), `src/render/*`, `src/game/*`, `maps/C1E1M01.json`, routes, 48 tests, `tools/dev/browser-check.mjs` (22 checks), `tools/verify-map.mjs`. Two new bakes: `door_hatch_a`, `props_atlas`.
- 2026-09-29 controls pass: sprint + ADS + accuracy cone, tap-latch-safe toggle mode, save v2 migration, per-action bindings repair in settings, crosshair stances, weapon poses (hip / ADS / sprint), 60 tests, 26 browser checks (incl. real Shift/right-mouse), `tools/dev/shoot-stances.mjs`.
- 2026-09-29 audio: `src/audio/*` (31 recipes, generative score, ambience, positional engine, unlock handling), sim events carry positions, `tools/dev/audio-qa.mjs`, `tests/audio.test.js`, live-audio browser checks (30 total), volume sliders. Levels tuned after QA found clipping (flare_boom 1.32, scatter_fire 1.40) and a weak combat/calm contrast.
- 2026-09-29 weapon/enemy: scattergun (hitscan pellets, falloff, pump anim), weapon slots + switching + wheel, weapon pickup, Gaunt Runner (lunge with tell), obstacle steering, save v3, HUD weapon strip, `shoot-weapons`, 82 tests, 33 browser checks. Map C1E1M01 v2 (test layout) gained the scattergun, shells, 2 Gaunts.
- 2026-09-29 automap + remap: `engine/automap.js` (sim-saved exploration, save v4), `game/automap.js`, `game/bindings.js` (pure remap rules), interactive controls list with capture/conflict/reset, 96 tests, 42 browser checks.
- 2026-09-29 Marrow Quay: water/skins/scenery in the engine, 6 new painted textures, authored level (pier, hut + secret loft, plaza, customs shed, warehouse, dock), frozen engine-test fixtures, 22 tests of the shipped level, story delivery (title card, 8 messages, outro; save v5), draw-call cuts.
- 2026-09-29 Gate 1 audit + repairs: independent audit of 7bf03a9 found 0 BLOCKER / 15 MAJOR / 5 MINOR (review/gate-1/audit/). Repairs in three commits: (1) hunting/waking/alerting AI, actor collision, Bellhand ranged enemy (3rd enemy), passive runner bot + viability gates, Retry restores the level-start inventory (save v6), spawn-overlap validation; (2) UX and robustness (door prompts, controls legend, pause layout, F5/F9, pointer-lock retry, wheel accumulation, loading/error/WebGL states, base './'), comms queue (pure, unit-tested), ADS sleeves fade, secret tell + reward, room lighting and plaza cover, music-stall clamp, unclamped perf sampling, evidence provenance, weak tests rewritten; (3) browser-check UX/retry/budget checks, honest gate1-bundle tool, known-defects list. Evidence regenerated from one commit: 151 tests, 66 browser checks, 36 SFX audio QA.
- Commits: see `git log`.
