# HUSHFALL — agent operating rules

Original desktop-browser old-school FPS. Alien "Vael" invaders graft captured humans into a zombie army ("Tollbearers").
Target: 68 maps (C1: 4 episodes x (8 main + 1 secret) = 36; C2: 30 main + 2 secret = 32). Never silently reduce it.

## Non-negotiables
- Stack: Three.js runtime renderer; Vite; Node scripts. Pin dependency versions, keep `package-lock.json`.
- Art: painterly (approved by user). All visual art is baked from **p5.js 2.x + p5.js-integrated p5.brush** (never the standalone build) by `tools/bake.mjs`. No stock/downloaded/generative-service art. p5 is a baker, not the runtime.
- Audio: original, synthesized/procedural only.
- Everything game-specific is original. No Doom/classic assets, layouts, names, or text.
- Simulation uses a fixed timestep; never tie gameplay to render FPS.

## Proof before expansion
Gate 0 inspect/normalize -> Gate 1 one real level -> (USER: APPROVE/REVISE/STOP) -> Gate 2 one episode -> (USER) -> Gate 3 repeatable production -> Gate 4 full campaign in small batches.
Never build Gate N+1 content before the user approves Gate N. Never "generate all remaining maps".
Current gate and next task: see the top of `PRODUCTION_LOG.md`.

## Status semantics (derived, never typed)
PLANNED -> IMPLEMENTED (loads) -> AGENT_VERIFIED (automated pass + canonical route reaches exit) -> COMPLETE (recorded human review).
Status is computed by `npm run validate` from `validation/maps/<ID>.json`. `CAMPAIGN_MANIFEST.json` is design intent only. Agents may not award COMPLETE.

## Commands
- `npm install` / `npm ci` — install (reproducible)
- `npm run bake` — regenerate baked assets into `assets/baked/` (headless Chrome; ~30 s/asset)
- `npm run validate` — topology + evidence checks (exit 1 on error); writes `validation/campaign.json`
- `npm run status` — status counts derived from evidence
- `node tools/preview.mjs` — contact sheet to `review/gate-0/`
- `node tools/dev/determinism.mjs <asset>` — bake twice, report pixel differences
- (Gate 1+) `npm run dev`, `npm test`, `npm run build` — added when the game exists; update this list when they do.

## Persistent files
`GAME_VISION.md` premise/targets · `ART_BIBLE.md` art rules/seeds/versions · `CAMPAIGN_MANIFEST.json` 68 slots ·
`PRODUCTION_LOG.md` dated log + exact next task · `TESTING.md` tests/evidence · `validation/` machine evidence · `review/gate-N/` review bundles.

## p5.brush facts learned (see ART_BIBLE.md)
- ESM instance mode: call `brush.instance(p)` before setup AND `brush.seed(n)` + `brush.noiseSeed(n)` explicitly; the `p.randomSeed` hook does not reach brush.
- brush binds GL state to the first p5 instance per page -> one page per bake job.
- brush does not composite into a transparent canvas -> transparent assets use black/white difference matting.
- Brush origin is canvas-centred in WEBGL.

## Session start
1. Confirm this file is loaded (CLAUDE.md imports it). 2. `git status`. 3. Read top of `PRODUCTION_LOG.md`, then `GAME_VISION.md`, `TESTING.md`.
4. `npm run validate`. 5. Do only the logged next task inside the current gate.

## Checkpoint (before ending or context loss)
Repo runnable; run validate/tests; update `validation/`, `PRODUCTION_LOG.md` (state, defects, exact next task, resume commands); commit.

## Verification rules
Never claim unobserved behavior. Screenshots show appearance, not correctness. Fix the game, not a valid test. Classify defects BLOCKER/MAJOR/MINOR; fix blockers, then top majors; then stop and present for review.
Instruction-loading policy: Claude Code reads `CLAUDE.md`, not `AGENTS.md`; `CLAUDE.md` contains only `@AGENTS.md` so there is a single copy.
