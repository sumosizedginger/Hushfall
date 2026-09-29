# PRODUCTION LOG

## CURRENT STATE (read first)
- Gate: **1, milestone 1 (engine skeleton) DONE.** Gate 0 complete; look approved by the user 2026-09-29. That is NOT the Gate 1 creative approval, which comes after the Gate 1 evidence bundle.
- Blockers: none. Waiting on user: nothing required. A controls pass (sprint + ADS) was added on request after the skeleton; see below.
- Map status (derived): C1E1M01 AGENT_VERIFIED (skeleton test layout, map v1); 67 PLANNED. See `npm run status`.
- Exact next task: **Gate 1 milestone 2** — turn `C1E1M01` into the real Marrow Quay level and add the missing Gate 1 content, in this order: (1) original audio via the sim event queue (weapons, damage, enemies, pickups, doors, feedback; unlock on first gesture); (2) second tactically different weapon + a second behaviourally different enemy; (3) automap; (4) HUD/pause polish + key remapping UI; (5) proper Marrow Quay layout, lighting and set dressing (map v2 will invalidate the old evidence automatically); (6) Gate 1 evidence bundle `review/gate-1/` and the adversarial audit.
- Do not start Gate 2. Do not change the look direction without asking.
- Resume: `npm ci && npm run verify && npm run browsercheck && npm run dev` (game on http://localhost:5173/).

## Recent decisions
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
- Commits: see `git log`.
