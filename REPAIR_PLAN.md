# HUSHFALL repair plan (written 2026-10-05, after the owner confirmed the grounding fix in play)

This file is self-contained: it is written for someone (or an agent) who has ONLY this repository as of the last push. Nothing here depends on a chat. Where a number is quoted, the file that holds it is named; the file wins over this page.

## 0. Cold start

1. `git clone https://github.com/sumosizedginger/Hushfall` (branch `main`; the author's local branch is `master`, pushed as `master:main`), then `npm ci`.
2. Read in this order: `AGENTS.md` (the rules; `CLAUDE.md` only imports it) -> top of `PRODUCTION_LOG.md` -> `PLAYTEST_NOTES.md` -> `TESTING.md` -> this file.
3. Baseline, expected at the last push: `npm run validate` prints OK; `npm test` 272/272; `npm run status` derives PLANNED 59 / IMPLEMENTED 0 / AGENT_VERIFIED 9 / COMPLETE 0 of 68. If your baseline differs, stop and find out why before changing anything.
4. Hard rules (from the owner's brief and `AGENTS.md`): no `git reset/checkout/revert/clean` on someone else's work; agents never award COMPLETE (status is derived by `npm run validate`, never typed); never kill processes by image name; no Gate 3, no Episode 2, no art propagation beyond what is authorised below; a hypothesis is never written down as a fact; log every owner finding in `PLAYTEST_NOTES.md` BEFORE touching code; the owner "gets the last word".
5. Two kinds of proof, neither replaces the other: SIM TRUTH (deterministic sim, hashes, bots, `npm test`) and RENDER TRUTH (what is actually drawn, in world space, against the sim: `tools/dev/render-census.mjs`, run by `npm run browsercheck` and `npm run render-ground`). A fix is only "fixed" when a check that FAILS on the old code now passes (save the failing output under `review/playtest/<date>/`).
6. Evidence order matters: finish and commit ALL source and doc edits first, then regenerate evidence once from that clean commit (section 5). Any commit in between forces a full re-run (about 6 minutes for the census, 10+ minutes for browsercheck). Never edit tracked files while a regeneration runs (Vite serves them live).

## 1. State at the last push (facts, with sources)

- Grounding defect (PT-001 awake enemies under the C1E1M02 gallery, PT-002 same in the C1E1M04 shop) fixed in code at 7601f0d, guarded by the render-truth census (2 of 8 census checks passed on the old code, 0 violations now: `review/playtest/2026-10-04/REPORT.md`, `validation/render-ground.json`).
- The owner played the repaired build and reported (their words, 2026-10-05): "my issues were resolved and gameplay is solid." They did not say which maps they played. That closes PT-001 and PT-002 and nothing else.
- The owner decided: **the hit box must match the enemy** (PT-005). Not yet implemented.
- Not confirmed by anyone: audio heard by a person (G2-U2), pointer lock in a real browser (G2-U4), real-GPU frame cost (G2-U3 / F12), hard difficulty played by a human, every map played (G2-U1), the boss judged by a human (G2-U8).
- Open defects with their text: `review/gate-2/known-defects.json` (Gate 2, the live judgement file) and `review/gate-1/known-defects.json` (historical).

## 2. Decisions

| # | Decision | State | Default if the owner is not reachable |
|---|---|---|---|
| D1 | Hit volumes match the drawn bodies (PT-005) | DECIDED by the owner 2026-10-05 | WP1 |
| D2 | A14: explosion splash must respect walls (line of sight from the blast, not from the projectile) | design change, retunes every map | Do it (WP3); if viability gates fail on any map, stop and report instead of retuning the map |
| D3 | R14: Continue can load the auto-save instead of an older manual save | UX | Reproduce first; if real, add a visible slot chooser, newest highlighted (WP4) |
| D4 | A13: ~137 MB of tracked review images | repo hygiene | Remove byte-identical duplicates only; NO history rewrite, NO force-push, NO LFS without the owner (WP9) |
| D5 | R08: the last-resort flare feed makes total starvation survivable | by design (no soft-lock) | Keep; record "accepted by design", no code change |

## 3. Work packages, in order

Engine-touching packages come first (WP1, WP3, WP5) so ONE evidence regeneration covers them. Each package: goal, steps, done-when. "Guard" means a test or gate you must show failing on the old code first.

### WP1. Hit volumes match the drawn bodies (PT-005, decision D1)
Facts (`validation/render-ground.json` -> `report.hitVolume`, drawn vs sim): tollbearer 2.264 vs 1.95 m, bellhand 2.366 vs 1.9, sexton 2.365 vs 1.85, wardengraft 3.003 vs 2.3, cantor 4.788 vs 3.2; gaunt (1.476 vs 1.55) and bellnode (2.45 vs 2.4) already match. Drawn widths (bounding box on x): tollbearer 0.84, bellhand 0.98, sexton 0.77, warden 1.09, cantor 2.51 against sim diameters 0.8 / 0.76 / 0.76 / 1.1 / 1.3.
Where the numbers are consumed: `ENEMIES[kind].height` in `src/engine/world.js` (player shots, around line 199; enemy projectiles stopped by bodies, around line 522) and `src/engine/bot.js` (aim point). `ENEMIES[kind].radius` is ALSO the movement and navigation collider (`blockedCircle`, `groundAt` footprint, spawn), so do not widen it to fix shots: add an optional `hitRadius` (default = `radius`) used only where shots test bodies (the enemy-projectile test currently uses a literal 0.5).
Steps:
1. Write the guards first. In `tests/enemy-hit-volume.test.js` (it already places each rig exactly as `GameView` does and fires the sim's own hitscan): (a) head shots at 85%, 95% and 99% of the DRAWN height register on every kind, on a flat floor and on a 3 m floor; (b) a shot 0.2 m above the drawn top does not register; (c) horizontally, a shot inside the torso silhouette registers and a shot 0.3 m outside it misses; (d) for every kind `|hit height - drawn height| <= 0.10 m`, computed from the rig, so a future model change cannot drift. Record the failing run on the old `defs.js` in `review/playtest/<date>/hit-volume-BEFORE-fix.txt`.
2. Measure the silhouette per 10 cm height slab (extent of the rig's vertices in x-z), not the whole-box width: the Cantor's 2.51 m box is probably arms and cape, not torso. Choose `hitRadius` to cover the torso slab; whether arms and cape are hittable is an owner call, so record the measured numbers and the choice in `PLAYTEST_NOTES.md`.
3. Set `height` (and `hitRadius` where needed) in `src/engine/defs.js` to the rig, rounded UP to 0.05 m. Make the census (`tools/dev/render-census.mjs`) fail when drawn and hit heights differ by more than 0.10 m, so the owner's decision is enforced, not remembered.
4. Run `npm test` (watch `tests/elites.test.js`: the Warden plate and the Cantor shield depend on hits), then `npm run verify-map -- <ID>` for all nine maps (section 5): taller volumes mean more hits, so ammo slack should improve, but the passive-runner, gate-skip and boss gates (M08: a perfect bot must still take damage) must be re-read, not assumed.
5. Close PT-005 in `review/gate-2/known-defects.json` only when the guard passes and the census check is in the browser gate.
Done when: guards fail on the old numbers and pass on the new; census check present; `hitVolume` in the new `validation/render-ground.json` shows no kind more than 0.10 m apart.

### WP2. Prove the drawn FLOOR and PICKUPS (the two things PT-001's fix did not assert)
Goal: remove the last two "hypotheses" in `PLAYTEST_NOTES.md` / PT-001: nothing asserts the drawn floor surface equals the sim floor; pickups riding a moving deck are not covered.
Steps:
1. Floor-mesh truth in the census: for every shipped map, cast a ray straight down at every walkable cell centre plus four offsets (and each moving sector at both ends of travel: M05 `car` low 2 / high 4, M06 `ramp` 0.5 / 4) against the level's floor meshes (`src/render/levelmesh.js`; exclude props, scenery and water) and compare the top hit with the sim's `floorAt`. Tolerance: 0.02 m on flat quads; stairs and ramps get a documented band like `src/render/ground-contract.js`.
2. Pickup truth: for every pickup of every map (and each pickup placed on a moving sector at both ends), the drawn bottom must be within the documented band of `groundAt`. Define the band from the bob amplitude, do not guess it.
3. Guard: offset a floor mesh by 0.2 m in a test (a deliberate mutation) and show the new check fails; same for a pickup.
Done when both checks are in `npm run browsercheck`, fail on the mutation, and report 0 violations on the shipped maps. If they find a real mismatch, log it in `PLAYTEST_NOTES.md` first, then fix.

### WP3. A14 explosion splash through walls (decision D2)
Facts: `src/engine/world.js` splash loop (around lines 170-184) damages, pushes and wakes every enemy within `def.splash` with no line-of-sight test. The Warden's plate design assumes splash gets through (`damageEnemy(..., { splash: true })` ignores the plate): keep that.
Steps: (1) failing test first: a flare explodes on the far side of a wall from an enemy; today it hurts and wakes it. (2) Apply the sim's own `hasLOS` from the BLAST point to the enemy (centre, or any of feet / middle / head so corner cases do not flicker), with a small close-range exception (about 0.8 m) so a flare at a doorway still counts. Knockback and the wake rule follow the same test. (3) `npm test`, then `verify-map` for every map; the bot uses flares, so read viability and par, do not assume. (4) If a map fails its gates, stop and report; do not retune maps inside this package.
Done when: the new test fails before and passes after; all nine maps still derive AGENT_VERIFIED; A14 text in known-defects updated with what changed.

### WP4. R14 Continue prefers the auto-save (decision D3)
Facts: `src/game/main.js` `loadFirstSave`: the NEWEST readable slot among `quick` and `auto` wins; `auto` is rewritten at every level entry and Retry. Recorded as "plausible, not reproduced".
Steps: (1) reproduce in the browser check: quick-save with F5, die, Retry, Continue; record which slot loaded. (2) If it reproduces, add a pure `listSlots(store)` (testable in Node) and show a Continue chooser with map name and age per slot, the newest highlighted; keep newest-wins as the default. If it does not reproduce, close R14 as "not reproduced, rule documented" with the recorded steps.
Done when: the reproduction (or its absence) is recorded in `PLAYTEST_NOTES.md`; if a chooser was added, a Node test covers it and the browser gate drives it.

### WP5. A21 test-suite weaknesses
Steps: (1) pin mutation M12 ("melee ignores the height difference", see `review/gate-2/audit/AUDIT.md`): a test where the player stands 3 m above/below a melee enemy and is not hit (and cannot hit it) must fail when the height check is removed. Find the melee height check in `src/engine/world.js` before writing the test; the Warden charge has its own `Math.abs(p.y - e.y) < 1.4`. (2) Re-run the full 22-mutation harness: `review/gate-2/audit/repro/mutation_runner.mjs` and `review/gate-2/reaudit/repro/r09_mutation_runner.mjs`. READ THEM FIRST and run them on a COPY (a separate checkout), never on your working tree. (3) Every surviving mutant gets a test or a written "equivalent mutant" justification.
Done when: M12 is pinned and a full mutation run is recorded under `review/playtest/<date>/`.

### WP6. A04 hard difficulty is fragile for a degraded player
Facts: `known-defects.json` A04: "M06 hard with both handicaps (aim error and 25% less ammo pickups) kills the strafing bot." The owner reports normal-difficulty play as solid; nobody human has played hard.
Steps: reproduce with the viability tooling (`node tools/dev/dbg-route.mjs maps/C1E1M06.json routes/C1E1M06.main.route.json hard <seed>`, `HITS=1` lists every hit); find the damage source; make the smallest change (ammo or one encounter) that lets the degraded bot finish on hard; `verify-map -- C1E1M06`. If the fix needs a design change beyond a few pickups, stop and ask the owner. Lowest priority.

### WP7. Hand-typed numbers (A05, R12): make drift fail loudly
Facts: numbers in `TESTING.md`, `PRODUCTION_LOG.md` and `GAME_VISION.md` are typed by hand and drift every time.
Steps: generate the evidence-derived block of `TESTING.md` (test counts, browser-check count, derived status counts, census totals) from `validation/*.json` between marker comments, and make `npm run validate` fail when the committed block differs from what the evidence says. Keep `PRODUCTION_LOG.md` prose free of counts; point to `npm run status`.
Done when: editing a number in the block makes `validate` fail (show it), and restoring it makes `validate` pass.

### WP8. Measure real-GPU cost (G2-U3, F12, A09)
Goal: turn "unmeasured" into numbers from the owner's machine, with no guessing about optimisation.
Steps: (1) a dev-only perf overlay (compiled out of production like `src/game/testhook.js`; toggle with a key, `?perf=1` in dev) showing frame ms p50/p95/p99 over the last 600 frames, `renderer.info` draw calls and triangles, awake-enemy count, and the milliseconds spent in `pose()` plus the contact solver (`makeRigGrounder` in `src/render/models.js`; measured only in Node so far: 0.34 ms per frame for 45 awake rigs). A key prints one JSON line to copy. (2) Add a test that the production build contains none of it (the same `grep -c` check used for `enemyBounds`). (3) The owner plays the heaviest spots (M02 gallery, M06, the M08 boss with Gaunts) and pastes the lines into `PLAYTEST_NOTES.md`.
Done when: the numbers are recorded as MEASURED with the hardware named. Only if p95 exceeds 16.7 ms anywhere do you optimise, and then the measured hot spot first (candidates: solve fewer vertices, crowd LOD, merge more statics).

### WP9. Repository hygiene (A13, decision D4)
Facts: `du -sh review` = 137 MB; `known-defects.json` A13 says the screenshot tours exist twice (per-map folders such as `review/level-*/` and the bundle copies in `review/gate-2/screenshots/`).
Steps: (1) hash every candidate pair; only byte-identical duplicates are removable. (2) Keep the files the Gate bundle validates; stop tracking regenerable per-map tours via `.gitignore` plus a note on the command that recreates them (`node tools/dev/shoot-map.mjs <ID>`). (3) `npm run validate` must still print OK. No history rewrite, no force-push, no LFS without the owner.

### WP10. Regenerate evidence and report (see section 5), then STOP for the owner

## 4. Items only the owner can close (do not close them by assumption)

Log the answer in `PLAYTEST_NOTES.md`, then update `known-defects.json`.
- G2-U1 (nobody played the nine maps): which of C1E1M01-M08 and C1E1S01 did they play, on which difficulty, with what result? "Gameplay is solid" is recorded verbatim and closes nothing by itself.
- G2-U2 and U2 (audio never heard): listen to `review/audio/*.wav` and in game; report anything harsh, missing or too loud.
- G2-U4 and F14 (pointer lock never exercised in a real browser): the owner has been playing in a real browser; ask them to confirm mouse look, Esc/pause and re-lock worked.
- G2-U5 and U3 (par times are placeholders): collect clear times (map, difficulty, time) from the owner; change `par` in the map files only from those; a map-file change makes that map's evidence stale, so re-run `verify-map` for it.
- G2-U8 (the bot is the only judge of the boss): the owner fights the M08 Cantor and reports.
- A12 (near-black sea horizon beyond the Lighthouse Cellar and the hill wall), G2-U6 (models reviewed only in stills), G2-U9 (set dressing repeats): visual judgements; they belong to Phase D below, not to this plan.
- The Gate 2 approve / revise / stop decision is the owner's after they have played the episode.

## 5. WP10: one regeneration, one report (the order is the point)

1. All code and doc edits committed; working tree clean (the owner's untracked `What Grok Did.md` and `what deepseek did.md` are excluded locally via `.git/info/exclude`; leave them alone: add that exclude on a fresh clone if the tools report a dirty tree).
2. `npm run verify` (validate + test + build; confirm `grep -c enemyBounds dist/assets/*.js` prints 0).
3. `npm run browsercheck` (10+ minutes; no short timeout), `npm run audio-qa`, `npm run verify-map -- <ID>` for every id in `maps/` (C1E1M01-M08, C1E1S01), `node tools/dev/shoot-level.mjs` / `shoot-map.mjs` as the bundle needs, `npm run gate2-bundle`, `npm run validate`.
4. Commit ONLY `validation/` and `review/`; push to `main`.
5. Write `review/playtest/<date>/REPORT.md` (failing-before / passing-after output, the census, derived status, hashes, what is still unproven) and put the game in the owner's hands: `npm run dev`, http://localhost:5173/. Then STOP. Do not start Phase D until they have played it and said so.

## 6. Phase D: one visual slice (authorised by the owner's brief once grounding is confirmed; sequence it AFTER WP10 unless the owner says otherwise)

Scope: C1E1M02 Customs Hall only. Goal: raise professional polish without destroying the approved painterly low-poly look (`ART_BIBLE.md`).
Rules: (1) capture the BEFORE shots first, from fixed viewpoints, with `node tools/dev/shoot-map.mjs C1E1M02` (`maps-src/C1E1M02.views.json`); the AFTER shots use the SAME viewpoints; produce a side-by-side contact sheet. (2) Art only through the p5.js 2.x + p5.brush baker (`npm run bake`) and code-authored meshes; no stock or generated art. (3) Draw-call and triangle counts stay inside the recorded render budget (`validation/render-budget*`, checked by browsercheck); the census stays at 0 violations. (4) Enemy silhouettes must stay readable against the new surfaces. (5) Never write "visual quality accepted": the owner decides. (6) STOP after the slice. Nothing propagates to M03-M08 without the owner's explicit approval.

## 7. Not authorised (do not start)

Phase E items from the owner's brief, Gate 3 (repeatable production), Gate 4, Episode 2 and later maps (59 of 68 slots still PLANNED), any COMPLETE status, any history rewrite or force-push, deleting or committing the owner's audit notes.

## 8. Recommended order at a glance

WP1 -> WP3 -> WP5 (engine) -> WP2 -> WP4 -> WP7 -> WP8 -> WP9 -> WP6 (optional, last) -> WP10 regenerate + report -> owner plays (collect section 4 answers and the WP8 numbers) -> Phase D on their word.
