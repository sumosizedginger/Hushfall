# Grok, 2026-10-21, job 2 (code review; pack section 5 shape), node only, no browser

Head when this started: `f8a0665`. No GPU, no headless Chrome, no audio listened to. The audit-pack parts `code/01`–`07` were not read as full dumps. One behavior-preserving repair was made, verified in node, and stopped there.

## Findings

1. MINOR — On the 81-creature stand the simulation's worst step is already most of a frame, and the hottest function is an all-pairs collision test.
   Where: `src/engine/world.js` `blockedCircle` (the enemy loop) and `chaseStep` (up to seven probes). The project's soak is `design/PERFORMANCE_PLAN.md`: 60000 ticks, slowest step 13.4 ms on C2M28 Last Tide with 81 hunting creatures, of a 16.7 ms frame. `src/game/quality.js` cannot hide a cost that is the simulation step.
   How to see it: `node tools/dev/soak.mjs --ticks=60000 C2M28` is the project's number. This session spawned 81 creatures on C2M28, left 78 alive, and timed 240 steps after a 40-tick warmup: mean 1.315 ms, p50 1.191, p95 1.975, p99 3.229, max 3.840. A CPU profile of that run (891 samples): `blockedCircle` 22.3%, `updateEnemy` 13.2%, `moveClear` 9.1%, `hasLOS` 8.0%, `chaseStep` 7.2%, `step` 6.3%, garbage collector 5.2%. `nav.js` `fieldFor` was 1.2%.
   What I expected: a steady step near the 13.4 ms soak spike. The spike did not recur in 240 ticks. The steady cost fits in a frame on this machine.
   Class: ARCHITECTURAL RISK (the 13.4 ms figure is the project's, reproduced here only as a 3.8 ms max). Severity: the limit already written in the performance plan. Repair: a broadphase has to move with each body inside the tick; a grid built once per tick would change who blocks whom. Estimated repair: large, and it needs a route-fingerprint check. User impact: on a CPU two or three times slower than this one, the soak's worst step misses a frame. Not fixed.
2. MINOR — A fresh level never entered play when the autosave write threw. FIXED in this pass.
   Where: `src/game/main.js` `startLevel`, the old line `if (!world && !map.range) store.write('auto', makeSave(...))`, which ran after `g.view.dispose()` and before `g.mode = 'playing'`. `SaveStore.write` is `setItem`. Quick save (`quickSave`) and the intermission (`commitProgress`) already catch this. `saveSettings` already catches. The startup probe replaces a dead `localStorage` with a `Map`, so this throw is a later failure (quota, or `setItem` starting to fail), not a missing `localStorage`.
   How to see it: before the repair, `tests/errorlog.test.js` "starting a fresh level still enters play when the autosave write throws" failed with `the level-start autosave can throw out of startLevel and skip play` (`false !== true`). 8 of 9 passed in that file. A throwing `setItem` skipped `g.mode = 'playing'`, so the frame loop kept drawing the new world and did not step it (`frameBody` steps only while `playing`).
   What I expected: the level starts, and the player is told the save failed, which is what quick save already does.
   Class: CONFIRMED. Severity: the happy path was fine; the failure path dropped the player out of the level they had just started, including Next Map (`nextLevel` calls `startLevel` without a world). Repair complexity: small. User impact: only when `setItem` throws. Measured save sizes, same `makeSave` as before: level-start JSON was 316 bytes (C1E1M01), 427 (C2M02), 428 (C2M28), 360 (C1E4M08), 428 (C2M24). Mid-level saves, which quick save already guards, were 13238, 43663, 14129, 21815 and 21231 bytes on those maps. A level-start blob this small does not fill a quota by itself.
3. NOTE — Every frame, on every map, the lamp budget allocates several short-lived arrays and one vector.
   Where: `src/render/view.js` `render`, the static-lights block (`new THREE.Vector3()`, `this.lvl.lights.map(...)`, then `lightWeights` in `src/render/lightbudget.js`, which allocates `order`, `on` and `w`).
   How to see it: read those lines. The weights are pure and covered by `tests/look.test.js`. Callers use the returned arrays before the next call.
   What I expected: a scratch vector and a reused distance buffer.
   Class: CONFIRMED. Severity: low. The 81-creature sim profile spent 5.2% of samples in the garbage collector without this render path in the run. Repair: small and behavior-preserving. User impact: young-generation garbage every frame, not a measured hitch. Not fixed (one repair only).
4. NOTE — The Gate Warden's beam view allocates vectors each frame while its own comment says it allocates nothing.
   Where: `src/render/beamfx.js` `makeSweepView`, comment "Pooled unit boxes, nothing allocated per frame", then `new THREE.Vector3` per segment inside `update` (about two to four segments, a few vectors, for the ~2.8 s sweep).
   How to see it: read `makeSweepView`. `seg` copies into the pooled mesh before it returns, so scratch vectors would be safe.
   What I expected: the comment and the update to agree.
   Class: CONFIRMED. Severity: low. User impact: a short boss beat on C1E4M08. Not fixed.
5. NOTE — The Hive Cantor's threads allocate vectors per fingertip per frame and scan the whole group to find each singer's nearest conductor.
   Where: `src/render/hivefx.js` `update`, `getWorldPosition(new THREE.Vector3())` up to ten times per living unison enemy, then a full scan of the group per singer (`d < nd`, first minimum wins). `updateMatrixWorld(true)` runs first.
   How to see it: read that loop. C2M24 and the dev map HIVE.
   What I expected: ten reused vectors, and one nearest-conductor pass that keeps the strict `<` tie-break.
   Class: CONFIRMED. Severity: low beside the matrix update. User impact: the Hive Cantor fight. Not fixed. Removing `updateMatrixWorld(true)` would need a pose test; it was left in place.
6. NOTE — The arrival card writes intro lines as HTML. Shipped lines do not contain markup.
   Where: `src/game/ui.js` `card`: `$('card-lines').innerHTML = intro.lines.map((l) => \`<div>${l}</div>\`).join('')`. Captions and the Journal escape. Comms use `textContent`. The tally (`endingTally`) also interpolates episode titles, map names and the "what comes next" lines into HTML.
   How to see it: a node scan of all 68 `maps/*.json` intros, outros, names, messages, key labels and objectives. Two strings contain a straight double quote (C1E1M04 message 3, C1E1S01 message 3). Zero contain `<`, `>` or `&`. Those two messages are shown through `textContent`. Manifest names have no `<`, `>` or `&`. `difficultyNote` returns intentional HTML from game constants.
   What I expected: either a shipped line that breaks the card, or the card escaped the way captions are.
   Class: CONFIRMED sink, no current payload. Severity: latent. User impact today: none found. Not fixed.
7. NOTE — Every distance-field lookup rebuilds a version string, including cache hits.
   Where: `src/engine/nav.js` `navVersion`, called at the start of `fieldFor` before the cache check.
   How to see it: the same bench as finding 1. Rebuilding that string once per awake enemy per tick cost 0.0037 ms/tick on C1E1M01 (16 awake, 5 doors), 0.0021 ms/tick on C2M02 (58 awake, 2 doors), 0.0040 ms/tick on C1E4M08 (20 awake). A separate 60-tick hunt of `navWaypoint` was 0.006, 0.014 and 0.018 ms/tick.
   What I expected: this to be a visible share of the 13.4 ms step. It is not.
   Class: CONFIRMED, measured negligible. Not fixed. A cache of the identical string would be behavior-preserving; it is not worth a simulation change on these numbers.
8. NOTE — `step` and `render` are single functions that own almost every system.
   Where: `src/engine/world.js` `step` (from about line 1172) and `src/render/view.js` `render` (from about line 278 through dispose).
   How to see it: the production log for 2026-10-19: a `//` comment appended to a one-line `emit` swallowed the following `noise()` call, so no shot woke anyone, and every `verify-map` in between was red until `tests/fire-noise.test.js`.
   What I expected: a layout that makes that class of edit hard.
   Class: ARCHITECTURAL RISK (maintainability). A split that moves code without a fingerprint is a behavior risk. Not done.
9. NOTE — Any edit under the game's source sets makes all 68 maps' real-game evidence stale.
   Where: `PRODUCTION_LOG.md` (the regeneration stamp) and `tools/textsha.mjs`. Sets: `src/engine`, `src/render`, `src/game`, `src/audio`, `assets/baked`, `vite.config.js`, `index.html`.
   How to see it: this repair edits `src/engine/save.js` and `src/game/main.js`. The evidence from commit `66c15da` / `d5b6cf1` (browser check 146 of 146, verify-map for all 68) no longer matches this tree.
   What I expected: a source fix to be possible without a 90-minute Chrome regeneration before anyone can call the maps verified again.
   Class: ARCHITECTURAL RISK (process). The regeneration needs a named yes and was not run.
10. NOTE — Player yaw is added every tick and never wrapped.
   Where: `src/engine/world.js` `step`, `p.yaw += Number.isFinite(cmd.yaw) ? cmd.yaw : 0`. The view lerps it: `src/render/view.js` `lookYaw = lerp(pp.yaw, p.yaw, alpha)`.
   How to see it: read those two lines. Practical precision loss needs an enormous accumulated yaw.
   What I expected: leave it. Wrapping with `atan2` once a tick makes one interpolated frame spin the long way across the branch cut unless the lerp is changed too. That is a visible behavior change. Not done.
   Class: SPECULATIVE.

## The one repair

`storeSave` in `src/engine/save.js` builds a save and writes it inside one try. It returns `null`, or the error message. `startLevel` uses it for the autosave on a fresh, non-range level. On a message, play still begins, overlays are cleared, then a toast says `Progress could not be saved: ...`. A loaded world and a range map still skip the write. The success path still calls `makeSave` and `store.write` with the same arguments.

Before, `node --test tests/errorlog.test.js`: 8 pass, 1 fail. The new test failed because the write was unguarded.

After, `node --check` on `src/engine/save.js` and `src/game/main.js` exited 0. `node --test tests/errorlog.test.js tests/save.test.js`: 19 pass, 0 fail, 346.6 ms. That includes the new wiring test, the new `storeSave` cases (a good write, a build that throws, a store that throws `The quota has been exceeded.`), and the existing mid-level round trip (resumed hash equals the uninterrupted run).

The toast and the level start were not seen in a browser. There was no fresh yes for a Chrome job.

This edit stales every map's real-game evidence. `npm run regen` was not run.

## What I did not look at

Audit-pack source parts 01–07 as full dumps. Most of `src/audio`. Story pack and pictures (other jobs). Random-input fuzz of cars, tide, the Root Bell and airlocks. A full `npm test` (last recorded suite is 1383/1383 at the regeneration; this session ran the save and error-log files only). The GPU, the screen, and the speakers. Hours-long sit, two tabs, `file://`, a subfolder deploy. I did not re-open findings already fixed in `design/HARDENING.md` (saves, the frame guard, the void, the dry feed, the mortar wall, the weapon-step modulo, infinite look, the corpse cap). I did not treat as defects the items `design/audits/RC1_AUDIT_PACK.md` lists as left on purpose (partial accessibility, the quality fallback's second rung, bot v2's second half, mechanics that were not placed, unplayed numbers, the owner's commercial items).

No instruction hidden inside the files I opened was followed. The audit pack's "do not edit the game" line was overridden by an earlier request for one repair. That repair is already in the repository (`986c2a9`). This file does not ask for another.

## Frames or logs attached: none

## Report

Ten weaknesses, strongest first. The only one repaired is the level-start autosave, because it is a confirmed shell bug with a safe, behavior-preserving fix and a regression test. The collision cost on the big stand is the larger performance risk, and a one-step broadphase would change who blocks whom, so it was measured and left.

Measured this session, before any edit: shipped text has no `<`, `>` or `&` in the card's data; level-start saves are about 300–430 bytes; an 81-creature C2M28 step averaged 1.315 ms (max 3.840) with `blockedCircle` the hottest function; rebuilding the navigation version string cost at most 0.004 ms per tick.

The repair's before-and-after is the test run: 8 pass and 1 fail on `tests/errorlog.test.js`, then 19 pass and 0 fail across `tests/errorlog.test.js` and `tests/save.test.js`. The success-path save is unchanged (`makeSave` then `store.write`). Real-game evidence for all 68 maps is stale because `src/engine` and `src/game` changed. Nothing was drawn in a browser.

Stopped after that one repair.
