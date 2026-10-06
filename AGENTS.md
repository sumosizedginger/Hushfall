# HUSHFALL — agent operating rules

Original desktop-browser old-school FPS. Alien "Vael" invaders graft captured humans into a zombie army ("Tollbearers").
Target: 68 maps (C1: 4 episodes x (8 main + 1 secret) = 36; C2: 30 main + 2 secret = 32). Never silently reduce it.

## Non-negotiables
- Stack: Three.js runtime renderer; Vite; Node scripts. Pin dependency versions, keep `package-lock.json`.
- World is real 3D (no billboard sprites): code-authored low-poly Three.js meshes wearing p5-baked painted atlases + painterly post pass.
- Art: painterly (approved by user, look approved 2026-09-29). All visual art is baked from **p5.js 2.x + p5.js-integrated p5.brush** (never the standalone build) by `tools/bake.mjs`. No stock/downloaded/generative-service art. p5 is a baker, not the runtime.
- Audio: original, synthesized/procedural only.
- Everything game-specific is original. No Doom/classic assets, layouts, names, or text.
- Simulation uses a fixed timestep; never tie gameplay to render FPS. The sim stays headless and deterministic.
- Verification has TWO halves and neither replaces the other: SIM TRUTH (deterministic sim, hashes, bots) and RENDER TRUTH (what is actually drawn, in world space, against the sim's ground: `tools/dev/render-census.mjs`). An actor's `root` in `src/render` is its WORLD placement, owned by `GameView`; animation (`pose()`) writes only the `rig` inside it, and the contract lives in `src/render/ground-contract.js`. Never put scale, topple or height on a root.

## Proof before expansion
Gate 0 inspect/normalize -> Gate 1 one real level -> (USER: APPROVE/REVISE/STOP) -> Gate 2 one episode -> (USER) -> Gate 3 repeatable production -> Gate 4 full campaign in small batches.
Never build Gate N+1 content before the user approves Gate N. Never "generate all remaining maps".
Current gate and next task: see the top of `PRODUCTION_LOG.md`.

## Status semantics (derived, never typed)
PLANNED -> IMPLEMENTED (loads) -> AGENT_VERIFIED (automated pass + canonical route reaches exit) -> COMPLETE (recorded human review).
Status is computed by `npm run validate` from `validation/maps/<ID>.json`; evidence goes stale if the map file changes. `CAMPAIGN_MANIFEST.json` is design intent only. Agents may not award COMPLETE.

## Commands
- `npm ci` — reproducible install
- `npm run dev` — dev server: game at http://localhost:5173/ (look demo at /look.html). The dev build exposes `window.__GAME_TEST__`.
- `npm test` — node:test suite (engine, maps, saves, input, routes, settings, campaign/status model); headless, no browser
- `npm run build` — production build to `dist/` (test hook is compiled out)
- `npm run verify` — validate + test + build
- `npm run browsercheck` (10+ min; do not wrap in a short timeout; `-- --update-baseline` rewrites the render-budget baseline) — headless-Chrome run of the real game (live input incl. sprint/ADS, un-teleported walk + ordered transmissions, prompts, canonical routes, Node-vs-browser parity, the RENDER-TRUTH CENSUS of every enemy on every shipped map, save/load, pause layout, GPU-leak check); writes `validation/browser-check.json` (stamped with commit, map shas and the hashes of the source sets it depends on) + `validation/render-ground.json` + `review/engine-skeleton/*.png` + `review/render-ground/*.png`
- `npm run render-ground` (about 6 min) — only the render-truth census (`-- --root <dir>` runs it against another checkout, e.g. a git worktree of older code: that is how the before/after evidence for PT-001 was made)
- `npm run map -- <ID> [--browser]` — THE per-map loop (Gate 3): compile `maps-src/<ID>.level.mjs`, plan image, (real-game evidence with `--browser`), `verify-map`, `validate` -> ONE verdict line (derived status) and the first failing gate. `npm run map -- --list` = every map that exists with its derived status. `npm run map:new -- <ID>` scaffolds source + views + route stub + a brief in `design/EPISODE<n>.md` from the manifest (never overwrites). A map file `maps/<ID>.json` is committed only once it passes: an unfinished one fails the generic map tests by design.
- `node tools/dev/browser-map.mjs <ID...|--all>` (`npm run browser-maps` = all) — a map's OWN real-game evidence, about 10 s per map: every route of the map played in the live game page and compared with the headless Node sim (ticks + state hash), the HUD, and the render-truth census of that map's enemies; writes `validation/browser/<ID>.json` (stamped with the map's sha, its routes' sha and the source sets)
- `npm run verify-map -- <ID>` — regenerate `validation/maps/<ID>.json` evidence: routes x 3 difficulties, reachability, viability (passive runner must not get through, perfect bot must take damage and finish on enough seeds, par plausible), the gate-skip probe (an invulnerable fighting bot sent at each main exit must not finish), ammo slack (1.5x, total and per type), robustness (a strafing bot with aim error / 25% less ammo pickups must finish on normal), real-game evidence (the shared browser check, which is about CODE, plus the map's own `validation/browser/<ID>.json`: a changed map invalidates only itself, changed engine/render/shell/audio/asset code invalidates every map), hashes of the source sets it depends on (`tools/textsha.mjs`: evidence made by other engine / render / game-shell / audio / baked-asset code, or with another map or route file, is stale), open BLOCKERs from both known-defects files (status is derived by validate, never written)
- `npm run validate` / `npm run status` — topology + evidence checks / derived status counts. It also FAILS when a live `review/gate-N/` bundle claims a status the derived evidence does not support (earlier gates must carry a "Historical snapshot" banner); `--no-bundles` skips that (the bundle tools use it while rewriting)
- `npm run bake` — regenerate baked assets into `assets/baked/` (headless Chrome; slow under software GL; `BAKE_PORT` allows parallel bakes)
- `npm run audio-qa` — renders every SFX + the score offline in headless Chrome, measures them (finite/audible/no clipping/decays/reproducible), writes `review/audio/*.wav` (LISTEN to these) + `validation/audio.json`
- `npm run shoot-level` — Marrow Quay vantage-point tour (review/level-c1e1m01/*.png)
- `npm run gate1-bundle` — assemble review/gate-1/ from repository evidence (run verify, browsercheck, audio-qa, shoot-level, shoot-stances, verify-map first, from a clean commit; it fails if the defect list is empty or evidence is from another commit)
- `node tools/mapkit/compile.mjs <ID>` — compile `maps-src/<ID>.level.mjs` (the `Level` builder in `tools/mapkit/builder.mjs`) into a validated `maps/<ID>.json` · `node tools/mapkit/mapview.mjs <ID> [scale]` — top-down plan `review/maps/<ID>.png` (enemies, pickups, switches, lifts, triggers) · `node tools/dev/shoot-map.mjs <ID> [view]` — vantage tour from `maps-src/<ID>.views.json` (`open`, `wake`, `ticks`, `ambient` options) into `review/level-<id>/*.png`
- `node tools/dev/dbg-route.mjs <map.json> <route.json> [difficulty] [seed]` — run a route and attribute the damage taken (`HITS=1` lists every hit); the fast way to tune a level for the bot
- `npm run gate2-bundle` — assemble `review/gate-2/` (all nine Episode 1 maps) from evidence; same exit codes as gate1-bundle. Run `npm run verify`, `browsercheck`, `audio-qa`, `verify-map` for every map and `npm run validate` first, from a clean commit
- `node tools/dev/refresh-manifest.mjs` — rebuild the asset manifest from disk after parallel bakes
- `npm run shoot-weapons` — scattergun stances/flash/pump, Gaunt poses, new pickups (review/engine-skeleton/weapons-*.png) · `node tools/dev/lane-cells.mjs <ID> <fraction>...` — free cells ON the route's lane (put ammunition there, never beside it) · `node tools/dev/shoot-harpoon.mjs` — the Harpoon rifle (weapon 4) on C1E2M02: hip, sights, flash and streak, the cycled action, a bolt left in a wall, a shot through two bodies, the pickups (review/engine-skeleton/harpoon-*.png)
- `node tools/dev/map-feel.mjs` — how every shipped map FEELS in numbers (roofed share, sightlines, enemy density, distance to the first enemy, alien props, new enemy kinds per map); read-only, it enforces nothing. The space contract it would enforce is a proposal in `design/CAMPAIGN_SPINE.md` (PT-008)
- `node tools/dev/measure-rig.mjs [kind ...]` — where an enemy rig is really drawn against what the sim thinks (height, hover, hit radius) and the hit radius range the fairness test accepts: use it when adding a creature (Gate 4 batch 2: Drone-Gill, cradle feeder, Graft-Mother in `src/render/models_e2.js`; a FLYER has `hover` in `defs.js`, its pose lifts its rig by it, the census and `tests/rig-grounding.test.js` judge it against `hoverLift` in `ground-contract.js`)
- `node tools/dev/shoot-outlines.mjs <out-dir>` — fixed-viewpoint stills + ink masks + ink-share for outline work (before/after pairs are in `review/outlines/`)
- `npm run shoot-stances` — hip / ADS / sprint screenshots for quick weapon-pose iteration · `npm run shoot` — look-demo screenshots · `node tools/preview.mjs` — 2D asset contact sheet

## Architecture (src/)
- `engine/` pure JS, no DOM/Three (Gate 2 added `terrain.js` heights/ceilings/step rules, `nav.js` BFS distance field for enemies, `script.js` switches/triggers/actions/sector movement, `viability.js` the shared viability + quality gates): `world.js` fixed-step deterministic sim (plain-data state, seeded RNG, event queue), `mapformat.js` + `reach.js` (ASCII grid + entity list, validation, reachability with keys), `input.js` (devices -> actions -> per-tick cmd, tap latch, toggle mode), `automap.js` (sim-saved exploration + drawable model), `loop.js` (fixed-step accumulator), `save.js` (versioned, migrations, explicit invalidation), `bot.js` + `harness.js` (route bot acting only through InputState), `progress.js` (campaign progression, owner decision PT-008: rank per map, salvage, the Locker's upgrade tiers and the ammunition/armour caps they raise; the sim reads only the tiers, the shell owns salvage/records/buying; every number is an unplayed first guess), `defs.js` (all tunables), `hitvolume.js` (the volume a SHOT tests: `height` is the drawn height, optional `hitRadius`/`hitForward`; `radius` stays the movement collider).
- `audio/` WebAudio, all procedural: `synth.js` (recipes, run on any context), `events.js` (sim event -> sounds, pure/testable), `engine.js` (graph, unlock, positional play, footsteps, tension), `music.js`, `ambience.js`. It only reads sim state and drained events.
- `render/` Three.js view of sim state: `view.js` (freezes sleeping enemies into one merged mesh; a sleeper on a moving floor is not frozen), `entityflag.js` (enemies and the weapon write alpha 0 so `post.js` keeps their ORIGINAL ink and gives only the level the corner ink; `?outline=classic` = the original pass everywhere), `ground-contract.js` (world root vs pose rig, the tolerance band), `debris.js`, `levelmesh.js` (skins, water, scenery), `merge.js` (static-geometry merging: props share cached materials), `models.js`, `post.js` (ink outline / paper grain / value banding), `textures.js`.
- `game/` runtime shell: state machine, DOM UI, settings, dev-only `testhook.js`.
- Content: `maps/<ID>.json` (grid + entities + doors + secrets + scenery + messages + intro/outro), `routes/<ID>.<name>.route.json` (canonical semantic routes). Engine tests use FROZEN fixtures in `tests/fixtures/`; tests of the shipped level are `tests/shipped.test.js` + `tests/story.test.js`. `src/look/` = frozen look demo; delete when redundant.
- Rule: render/UI/audio only read sim state and drain events; they never write it.

## Persistent files
`design/EPISODE1.md` per-map briefs and the kit table (intent, not status) · `GAME_VISION.md` premise/targets · `ART_BIBLE.md` art rules/seeds/versions · `CAMPAIGN_MANIFEST.json` 68 slots ·
`design/GATE3.md` Gate 3 plan, acceptance criteria and pilot log · `REPAIR_PLAN.md` the Gate 2 repair plan (history) · `PLAYTEST_NOTES.md` human playtest reports with causes, guards and the next work list (read before any code work) · `PRODUCTION_LOG.md` dated log + exact next task · `TESTING.md` tests/evidence · `validation/` machine evidence · `review/gate-N/` review bundles.

## p5.brush facts learned (see ART_BIBLE.md)
- ESM instance mode: call `brush.instance(p)` before setup AND `brush.seed(n)` + `brush.noiseSeed(n)` explicitly; the `p.randomSeed` hook does not reach brush.
- brush binds GL state to the first p5 instance per page -> one page per bake job.
- brush does not composite into a transparent canvas -> transparent assets use black/white difference matting.
- brush fills are translucent washes -> use plain p5 `rect` (`g.solid`) for opaque bases. Brush origin is canvas-centred in WEBGL.

## Session start
1. Confirm this file is loaded (CLAUDE.md imports it). 2. `git status`. 3. Read top of `PRODUCTION_LOG.md`, then `GAME_VISION.md`, `TESTING.md`.
4. `npm run validate && npm test`. 5. Do only the logged next task inside the current gate.

## Checkpoint (before ending or context loss)
Repo runnable; run `npm run verify` (+ `npm run browsercheck` if rendering/runtime changed); update `validation/`, `PRODUCTION_LOG.md` (state, defects, exact next task, resume commands); commit.

## Verification rules
Never claim unobserved behavior. Screenshots show appearance, not correctness. Fix the game, not a valid test. Classify defects BLOCKER/MAJOR/MINOR; fix blockers, then top majors; then stop and present for review.
Never kill processes by image name (chrome.exe / node.exe); only stop processes this session started, by PID or task id.
Shell: avoid backticks and large heredocs inside `bash`/`node -e` strings (they get executed/mangled); write files with the Write/Edit tools.
Instruction-loading policy: Claude Code reads `CLAUDE.md`, not `AGENTS.md`; `CLAUDE.md` contains only `@AGENTS.md` so there is a single copy.
