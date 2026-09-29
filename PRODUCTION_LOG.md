# PRODUCTION LOG

## CURRENT STATE (read first)
- Gate: **0 complete except Three.js load-through of assets; paused at the painterly-look review requested by the user.**
- Blockers: none. Waiting on user: assess `review/gate-0/pipeline-sheet.png`; is the painterly direction right?
- Exact next task (after user feedback): (1) improve sprite/weapon art quality (fix matting speckle, solid fills); (2) scaffold Vite + Three.js game shell that loads baked PNGs with NearestFilter to finish the pipeline acceptance test; (3) decide map data format + reachability checker; (4) begin Gate 1 level C1E1M01 "Marrow Quay".
- Resume: `npm ci && npm run validate && npm run bake && node tools/preview.mjs`

## 2026-09-29
- Repo was empty, no git history. Initialised git. Node 24.21, npm 11.19. Installed p5 2.3.4, p5.brush 2.2.3, three 0.186.1, vite, puppeteer (Chrome 154), pngjs.
- Instruction policy: `CLAUDE.md` = `@AGENTS.md` (single copy). Not yet verified in a fresh session; verify at next session start.
- Asset spike: found and documented four p5.brush facts (see ART_BIBLE): explicit `brush.seed`, one instance per page, no transparent-canvas compositing (black/white matting), centred origin.
- Rejected: baking all recipes in one page (only first p5 instance renders); alpha from a single bake (brush draws nothing to a transparent canvas).
- 68-slot manifest created (`tools/dev/gen-manifest.mjs`, run once). Validator + evidence-derived status implemented and negative-tested for status inflation.
- Defects: see TESTING.md known defects.
