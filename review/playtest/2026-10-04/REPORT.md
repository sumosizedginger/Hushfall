# PT-001 / PT-002 repair and the render-truth gate: Phase C report (2026-10-04)

Status: **fixed in code and guarded; NOT confirmed by the owner in play.** Nothing beyond this phase has been built (no visual pass, no Gate 3).
Evidence was regenerated for all nine Episode 1 maps from ONE clean commit (`5b7b070`, source tree clean, every step exit 0). Numbers below come from `validation/*.json` and the files named; the evidence wins over this page.

## 1. Root cause (confirmed, reproduced before any change)
`GameView.render` places an enemy's root from the sim (`root.position.set(x, e.y, z)`), then calls `pose()`. The Tollbearer-family pose wrote `root.position.y = d * 0.12` and the Gaunt pose `... = d * 0.22`, where `d` is the death blend only; for every living enemy `d = 0`, so the height the view had just set was overwritten with 0. On a floor 3 m up (the M02 gallery) the enemy was drawn 3 m under the carpet while the sim kept it standing on the floor. The audit's description was re-confirmed in the working tree, not trusted (`models.js:139` and `:333` before the fix).
Found on the way (all CONFIRMED by the same census; none was in the audit):
- **Sleeping Wardens, Sextons and the Cantor were baked at the wrong place.** Their scale lived on the world root; the sleeper freeze reset position and rotation but not scale, so the baked world coordinates were scaled again about the map origin (the sleeping Cantor's body was drawn 76.6 m from where it stands).
- Death and crouch poses buried the mesh even on FLAT floors (Cantor 1.30 m, Warden 0.26, Bellhand 0.26, Tollbearer 0.17, Gaunt 0.13, Bell node 0.32; Gaunt full crouch 0.29).
- Sim: dead, staggered and ring-node enemies did not follow a moving floor (`e.y` not refreshed); a sleeper on a moving floor was frozen at its old height.

## 2. Files changed
Renderer: `src/render/models.js` (root/rig split, `makeRigGrounder`), `models_g2.js`, `view.js`, new `ground-contract.js`, `debris.js`, `diagnostics.js` (dev-only). Sim: `src/engine/world.js` (one line: refresh `e.y` in every state). Game shell: `ui.js`, new `toasts.js`, `testhook.js`, `index.html` (pause list). Gate: new `tools/dev/render-census.mjs`, `render-ground.mjs`, `savepng.mjs`; `browser-check.mjs`; evidence freshness `tools/textsha.mjs`, `validate.mjs`, `verify-map.mjs`, `gate2-bundle.mjs`, `audio-qa.mjs`. Docs: `PLAYTEST_NOTES.md`, `TESTING.md`, `AGENTS.md`, `PRODUCTION_LOG.md`. No map data, no baked art and no weapon/AI tuning changed.

## 3. Old failing evidence (the same checks run on the UNREPAIRED code)
- `rig-grounding-BEFORE-fix.txt`: 634 poses overwrote the world root; 1499 grounding violations; deepest 4.29 m (dead Cantor on a 3 m floor); corpses on flat y = 0 floors buried too.
- `render-ground-BEFORE-fix.txt/.json` (the census run against 8dc307c in a separate git worktree with only the read-only diagnostics added): **2 of 8 checks pass.** Sleepers 292 of 298 violate, awake 253 of 596, pose rows 614 of 683, dying/dead 301 of 301 each, moving-floor rows 40 of 40; deepest 12.154 m (a sleeping Cantor on its 12 m chamber floor); Cantor encounter: body centre 76.6 m from the sim, shield and links nowhere near it. Before screenshots: `before/` (one awake + one corpse shot per map; the M02 and M04 awake shots show NO enemy where the sim has one).
- `sim-sector-ground-BEFORE-fix.txt`: 240 stale heights. `pause-layout-BEFORE-fix.txt`: 5-7 of 19 control rows visible, 354-436 px hidden in a nested scroller. `validate-BEFORE-bundle-gap.txt`: the old `validate` printed OK at 8dc307c while the committed bundle claimed 9 AGENT_VERIFIED and the derived status was 0. `freshness-tests-vs-OLD-validator.txt`: 9 of 13 new freshness tests fail on the old validator.

## 4. New passing evidence
- Tests: **272/272** (244 before, +28). Browser check **106/106** (92 before), headless Chrome, `validation/browser-check.json`. Audio QA 54 sounds, 0 failures. `npm run verify` green; production build clean (`grep -c enemyBounds dist/assets/*.js` = 0: the diagnostics do not ship).
- Render-truth census (`validation/render-ground.json`), band: not buried > 0.03 m, not hovering > 0.30 m of the lowest rendered vertex around `groundAt(world, x, z, radius)`: 298 sleeping, 596 awake samples, 683 forced pose rows (401 on raised floors), 301 dying + 301 dead rows (132 on raised floors each), 40 moving-floor rows: **0 violations**. Highest hover measured 0.242 m (Cantor walk), deepest 0.000 m. Every enemy of every map is measured (exact accounting, not a threshold).
- The Cantor (M08, floor 12 m): body 4.788 m tall on its floor; shield centred on it (r 2.94 m, farthest body corner 3.13 m from its centre); six ring nodes 14-14.4 m out, each link ends inside both bodies; cutting the ring removes the shield and all links. Screenshot `review/render-ground/C1E1M08-cantor-body-shield-ring.png`.
- Visible body = hit body: the SIM'S OWN hitscan aimed at the drawn lower body (10/30/50% of rendered height) registers on every kind on a flat floor and a 3 m floor (`tests/enemy-hit-volume.test.js`); the sim axis passes through the drawn body.
- Screenshots (after): `review/render-ground/` one awake enemy + one corpse per map (M01-M08) on the highest floor with enemies, e.g. `C1E1M02-tollbearer-on-3m-awake.png`, `C1E1M04-tollbearer-on-2m-awake.png`, `C1E1M05-bellhand-on-10m-awake.png`; also copied into `review/gate-2/screenshots/_render-ground/`.
- Derived campaign status (`npm run status`): PLANNED 59 / IMPLEMENTED 0 / **AGENT_VERIFIED 9** / COMPLETE 0 of 68. Agents cannot award COMPLETE; nobody has.

## 5. Tests added (28)
`rig-grounding` (4), `enemy-hit-volume` (2), `sim-sector-ground` (2), `freshness` (13), `pickup-toasts` (3), `debris-floor` (4), plus 7 render-truth checks, 4 pause-layout checks, a debris check and a rivet-toast check in the browser gate.

## 6. Evidence-freshness changes
Source sets with ONE dependency table (`tools/textsha.mjs`): engine, render, game shell (+ index.html, vite.config.js), audio, baked assets (png bytes + manifest). Map evidence records `sources`, `routesSha` (EVERY route of the map) and a validated `assetVersion`; the browser check, render-ground and audio evidence are stamped too. `validate` downgrades a map to IMPLEMENTED when any dependent set, the map file or any of its routes changed, or when the browser check was made by other code, lacks the census, did not run this map, or has a failing check. `validate` also FAILS when a live `review/gate-N/` bundle's counts, `maps.json` rows, README status line or table disagree with the derived status (an earlier gate must say "Historical snapshot": Gate 1 now does). `gate2-bundle` refreshes the derived status first, judges freshness by source hash as well as commit, and verifies its own output.

## 7. Small fixes
Rivet toast +30 -> +40 (amount now derived from `PICKUPS`); debris lands on the terrain under it instead of world y = 0; the 800x600 pause control list is no longer clipped against Reset Controls (no inner scroller; all 19 rows visible at four window sizes, 10 px gap).

## 8. Remaining confirmed defects (not fixed here, listed in `review/gate-2/known-defects.json`)
Open or partial from before: A04 hard-difficulty fragility under degraded play, A09, A12, A13, A14 (splash through walls), R14, A21's M12, G2-U*. New and measured, deliberately NOT changed (gameplay tuning, owner's call): **bodies are drawn taller than their hit cylinders** (Cantor 4.79 m vs 3.2 m, Warden 3.00 vs 2.3, Sexton 2.37 vs 1.85, Bellhand 2.37 vs 1.9, Tollbearer 2.26 vs 1.95; Gaunt and Bell node match): torso shots register on every kind, head shots on the tall kinds pass over.

## 9. Remaining hypotheses (NOT facts)
- That the drawn FLOOR surface always equals the sim floor: no check asserts it (the after screenshots show feet on the floor in M02/M04/M05).
- Pickups riding a moving deck are not covered by the census.
- The suspicion that the owner's second screenshot (a half-sunk body) was a corpse: consistent with the confirmed corpse-sinking, but the owner said their report was about awake chasers; both are fixed.
- Real-GPU cost: untouched. The contact solver reads every vertex of an awake rig each frame (903-1786 vertices per rig); measured in Node, JIT-warm: posing 45 awake rigs including the solve takes 0.34 ms per frame. Not measured in a browser on real hardware; the render-budget check (draw calls and triangles, software GL) stayed within its recorded baseline.

## 10. Exact next human decision
Play C1E1M02 (library/gallery) and C1E1M04 (the shop), awake enemies and corpses, and the M05 funicular, and tell me whether anything is still below or above the floor. Until you say it is gone, PT-001/PT-002 stay open and I build nothing else. Two further decisions are yours whenever you want them: (a) the hit-volume question above; (b) opening Phase D (one visual-professionalisation slice on C1E1M02) only after the grounding verdict.
