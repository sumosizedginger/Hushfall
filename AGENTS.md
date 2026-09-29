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
- `npm run browsercheck` — headless-Chrome run of the real game (live input, canonical routes, Node-vs-browser parity, save/load, death, GPU-leak check); writes `validation/browser-check.json` + `review/engine-skeleton/*.png`
- `npm run verify-map -- <ID>` — regenerate `validation/maps/<ID>.json` evidence (status is derived by validate, never written)
- `npm run validate` / `npm run status` — topology + evidence checks / derived status counts
- `npm run bake` — regenerate baked assets into `assets/baked/` (headless Chrome; slow under software GL; `BAKE_PORT` allows parallel bakes)
- `npm run shoot` — look-demo screenshots · `node tools/preview.mjs` — 2D asset contact sheet

## Architecture (src/)
- `engine/` pure JS, no DOM/Three: `world.js` fixed-step deterministic sim (plain-data state, seeded RNG, event queue), `mapformat.js` + `reach.js` (ASCII grid + entity list, validation, reachability with keys), `input.js` (devices -> actions -> per-tick cmd, tap latch, remap), `loop.js` (fixed-step accumulator), `save.js` (versioned, migrations, explicit invalidation), `bot.js` + `harness.js` (route bot acting only through InputState), `defs.js` (all tunables).
- `render/` Three.js view of sim state: `view.js`, `levelmesh.js`, `models.js`, `post.js` (ink outline / paper grain / value banding), `textures.js`.
- `game/` runtime shell: state machine, DOM UI, settings, dev-only `testhook.js`.
- Content: `maps/<ID>.json`, `routes/<ID>.<name>.route.json` (canonical semantic routes). `src/look/` = frozen look demo; delete when redundant.
- Rule: render/UI/audio only read sim state and drain events; they never write it.

## Persistent files
`GAME_VISION.md` premise/targets · `ART_BIBLE.md` art rules/seeds/versions · `CAMPAIGN_MANIFEST.json` 68 slots ·
`PRODUCTION_LOG.md` dated log + exact next task · `TESTING.md` tests/evidence · `validation/` machine evidence · `review/gate-N/` review bundles.

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
