# PRODUCTION LOG

## CURRENT STATE (read first)
- Gate: **0 complete (look approved by user 2026-09-29). Next: Gate 1, one real level (C1E1M01 Marrow Quay).**
- Blockers: none. Note: look approval is NOT the Gate 1 creative approval; that comes after the Gate 1 evidence bundle.
- Exact next task: Gate 1 milestone 1 — promote src/look into the real engine skeleton: map format (ASCII grid + props + triggers) with reachability checker, fixed-step sim, input-action layer, versioned save schema stub, dev-only __GAME_TEST__ hook, first validation evidence for C1E1M01.
- Resume: `npm ci && npm run validate && npm run bake && node tools/preview.mjs`

## 2026-09-29
- Repo was empty, no git history. Initialised git. Node 24.21, npm 11.19. Installed p5 2.3.4, p5.brush 2.2.3, three 0.186.1, vite, puppeteer (Chrome 154), pngjs.
- Instruction policy: `CLAUDE.md` = `@AGENTS.md` (single copy). Not yet verified in a fresh session; verify at next session start.
- Asset spike: found and documented four p5.brush facts (see ART_BIBLE): explicit `brush.seed`, one instance per page, no transparent-canvas compositing (black/white matting), centred origin.
- Rejected: baking all recipes in one page (only first p5 instance renders); alpha from a single bake (brush draws nothing to a transparent canvas).
- 68-slot manifest created (`tools/dev/gen-manifest.mjs`, run once). Validator + evidence-derived status implemented and negative-tested for status inflation.
- Defects: see TESTING.md known defects.

## 2026-09-29 (later)
- User: painted look must be p5, world must be 3D. Built look demo: src/look/* (level grid -> geometry, models, post pass), tools/baker/recipes3d.js (atlases, floor, crate, pod, sky, paper), tools/dev/shoot-look.mjs.
- Process incident: I ran taskkill by image name and closed the user's Chrome. Rule saved in memory; never again.
- Bake times: tollbearer atlas ~100 s under SwiftShader; BAKE_PORT env allows parallel bakes (beware manifest write race).
