# HUSHFALL, HARDENING: WHAT TWO HOSTILE TESTERS FOUND AND WHERE EACH FIX SITS IN THE QUEUE (PT-050, 2026-10-14)

The owner sent two outside agents (Gemini and Grok) into the repo with `design/audits/ATTACK_PROMPT.md`: attack the game as the worst user who will ever download it. Both worked with node scripts and by reading code. No browser was opened, so nothing was seen on a GPU, in Firefox or Safari, on a real pad, or heard. Their work: `attack/gemini/` (report, ideas, 9 fuzz scripts, 12 tests) and `attack/groks/` (report, ideas, 12 scripts, 16 tests). This file is the merged, re-rated list and the place of every fix in the work queue (`design/COMMERCIAL_AND_USAGE_PLAN.md`). Commercial finish line: a store release must not brick a save, strand a player or leak until the machine slows, so the whole list is in the plan.

**STATUS (2026-10-15): every finding is OPEN; nothing in `src` has been changed.** The testers' files are committed and pushed (`attack/`). First fix session: H1, right after Session A.
**UPDATE 2026-10-18 (Session H1, part a): FIXED in code and tests: H-S1, H-S2, H-S3, H-S4, H-S5, H-S7 (the keyboard-binding duplicate) and H-F2 (the NaN frame time)**, all by `tests/hardening-saves.test.js` (Grok's 16 contracts, Gemini's save cases, a mutation fuzz of every save field). Still open: H-F1 (the frame-loop guard), H-V1 (the void softlock, to prove on a real route first), H-S6 (prototype names in the Locker, Session H2), and everything in H2 and H3. Three of Grok's tests demanded that a damaged save LOAD; the policy is to reject, so those assertions were corrected.

## 0. How far to trust it (my check, 2026-10-14, node only)
- I ran every script. The Gemini fuzzers print what its report says (`fuzz_progress_proto`, `fuzz_save_overwrite`, `fuzz_void_softlock`, `fuzz_dry_feed`, `fuzz_mortar_wall_pierce`, `fuzz_weapon_step_neg` reproduce; `fuzz_save_roundtrip` PASSES, determinism holds across a save/load; `fuzz_sim_invariants` found nothing; `fuzz_gamepad_nan` shows a NaN look is already IGNORED, so only an Infinity yaw is in question). Grok: its 16 contract tests all FAIL on this tree, as its report says.
- Gemini's 12 tests are DEMONSTRATIONS: they assert the vulnerable behaviour and PASS while the bug exists (their messages say VULNERABILITY). When a fix lands the test is inverted into a normal regression test. Grok's 16 are real contracts: red now, must go green.
- The severity words in their reports are theirs. The column "Mine" is my rating for a normal player. Most of their "BLOCKERs" need a hand-made or damaged save. That still matters for a release (a save can be damaged; a dead page loop must never happen), so it is in the plan, but it ranks below a state a player can reach by playing.
- "Reach" says how the script gets there. A script that places the player or builds a save by hand proves the code is wrong, not that a player can arrive there. Where reach is unproven the first task is a real route (the bot, a vent miss), not a fix.
- Coverage is thin: Gemini's random-input fuzzer ran on 5 maps, Grok's on 13, together 17 of 68. The 51 others, and every Act C and D map but five, have never been fuzzed.

## 1. The findings
Ids: H-S saves, H-F frame loop, H-I input, H-V void, H-E economy, H-W weapons, H-L leaks. "Theirs" is the tester's id; file:line is THEIR claim, not yet checked by me.

| Id | Theirs | What is wrong, in plain words | Mine | Reach | Claimed place |
|---|---|---|---|---|---|
| H-S1 | Grok G-01, G-04 | A save the loader accepts can still break the whole page: a "complete" save with no end stats makes `earn()` throw (and pays a rank); an unknown weapon on a finished world makes the renderer throw. Neither is caught, so the frame loop dies, and Continue loads the same save again at every start | MAJOR (they say BLOCKER) | damaged or edited save | `src/game/main.js` frame(), `src/engine/save.js` |
| H-S2 | Grok G-02, G-03 | A save the loader accepts throws on the first step (unknown weapon, `events: null`, weapons or keys stored as a string, a null pickup), or has a status other than playing, dead or complete, which freezes the sim while the shell stays in play. The bad slot is kept and hides the older autosave | MAJOR | damaged or edited save | `save.js` `worldShapeErrors` |
| H-S3 | Grok G-05, Gemini-10 | Numbers are not capped on load: hit points above the cap or negative, ammunition negative, over the cap or a string (it becomes NaN at the first shot), salvage past a safe integer | MAJOR | damaged or edited save | `save.js:74` |
| H-S4 | Gemini-02 | A save with an enumerable `map` or `events` key overwrites live simulation state (`Object.assign` onto the world); `loadWorld` says ok, the next `step` crashes | MAJOR | edited save | `save.js:66-78, 89-90` |
| H-S5 | Grok G-06 | `loadWorld` throws on an unknown difficulty instead of returning `{ ok: false }` | MINOR | edited save | `save.js` |
| H-S6 | Gemini-01 | `buy()` and `describeNext()` crash on names such as `toString` or `__proto__` (inherited keys count as upgrades) | MINOR | a forged progress blob; the Locker never sends such names | `progress.js:71-85` |
| H-S7 | Grok G-07 | The same keyboard code can be bound to two actions (pad bindings are de-duplicated, keyboard ones are not) | MINOR | settings screen | `settings.js` |
| H-F1 | Grok (frame) | `frame()` catches a throw in `step` (back to the title) but not in `earn()` or `GameView.render()`: one throw there ends the page loop for good, with no message | MAJOR | any future bug | `main.js:230, 388` |
| H-F2 | Grok G-08 | One NaN frame time freezes `FixedLoop` for the rest of the session | MINOR | a timer glitch | `src/engine/loop.js` |
| H-V1 | Gemini-03 | On void maps without cars (the script uses C1E4M01, M02, M07) the void fall is not triggered: a player standing in the void at y = -6 is recorded as "last safe", with full health, and cannot get out | MAJOR (they say CRITICAL) | the script teleports the player into the void; whether a vent miss or a drop ends there is UNPROVEN, and is the first task | `world.js:964-967` |
| H-E1 | Gemini-06 | The emergency "dry feed" gives flare ammunition to a player who does not carry the flare cannon, stranding them with ammunition they cannot use | MAJOR | play (carbine, harpoon, fists, empty) | `world.js:1223-1225` |
| H-E2 | Gemini-08 | Brood Vat spawns add to the map's total enemies, so the rank, and with it the salvage, can fall for kills the player cannot avoid | MAJOR | play | `world.js:822` |
| H-E3 | Gemini-09 | Creatures spawned by a map script lack the `summoned` flag, so each can drop ammunition: infinite ammunition in trigger maps | MAJOR | play | `drops.js:40`, `script.js:27` |
| H-W1 | Gemini-04 | The mortar pushes the landing point out to its minimum range through walls: in the script 4 of 4 aims landed inside a wall | MAJOR | play | `mortar.js:33-36` |
| H-I1 | Gemini-05 | A weapon step below -1 (a fast reverse flick) makes a negative array index: no weapon change | MINOR now, MAJOR if `input.js` can sum a wheel flick to -2 or less (check) | play | `world.js:1151` |
| H-I2 | Gemini-07 | An infinite yaw turns the look vector into NaN and breaks aiming (a NaN look is already ignored; infinity is not) | MINOR | broken device or a script | `world.js:1111` |
| H-L1 | Gemini LEAK-01 | The chime puzzle creates five canvas textures and never disposes them: GPU memory grows on every reload of a chime map | MAJOR for a long session | static reading, not measured | `chimefx.js` |
| H-L2 | LEAK-02 | The tide view clones the water texture and never disposes the clone | MAJOR for a long session | static | `tidefx.js` |
| H-L3 | LEAK-03 | `GameView.dispose()` does not dispose the beam view or the sweep view | MAJOR for a long session | static | `view.js`, `beamfx.js` |
| H-L4 | LEAK-04 | Brood Vat corpses are never removed from `w.enemies` or from the enemy views: the scene grows | MAJOR on the two vat maps | static | `world.js`, `view.js` |
| (info) | LEAK-05 | Events pile up when `drainEvents()` is never called. The shell drains every frame, so only a harness that forgets can hit it | INFO | none in the game | `world.js` |

Grok found no leak in the sim or the audio by counting (its numbers are in `attack/groks/REPORT.md`, "Memory leaks"); it did not measure the GPU. Gemini's four render leaks are by reading the source. Both are consistent. The existing GPU-leak check in the browser check is the instrument to extend.

## 2. Where each fix sits in the queue
All fixes are node-only (no window), mechanical, and cheap in usage. They come in three small sessions, each stop-safe.

- **Session H1 (right after Session A): saves, the frame loop and the void.** First, show H-V1 on a REAL route (a vent miss on C1E4M01, M02, M07 with the bot) before touching it. Then H-S1 to H-S5, H-S7, H-F1, H-F2. Method: one strict validator for a whole save (every field: type, cap, known weapon, known status, known difficulty; `loadWorld` returns `{ ok: false, reason }` and NEVER throws; a rejected slot is set aside, not kept in front of the older autosave); the world is rebuilt from whitelisted keys, never `Object.assign` of the file onto the sim; `frame()` gets a guard that shows a plain "something broke, back to the title" screen and writes an error log the player can export (this is M7). Done when Grok's 16 contracts are green and Gemini's save and void demonstrations are inverted into tests.
- **Session H2 (right after Session B): economy, weapons, input.** H-E1 (the dry feed gives ammunition for a gun the player carries), H-E2 (a spawned creature is not counted in the rank total), H-E3 (a script spawn is flagged `summoned`), H-W1 (the minimum range clamps along the aim ray and stops at the first wall), H-I1, H-I2, H-S6. These touch the simulation: after each, `node tools/dev/route-fingerprint.mjs check` must stay identical for every route, or the change is the intended one and is written down with the map it moves (the vat maps' totals will move: say so, re-derive their par).
- **Session H3 (with Session F, performance and stability, M4 and M7): leaks.** H-L1 to H-L4, then extend the browser check's GPU-leak test to reload a chime map, a tide map and a vat map many times and assert flat texture and geometry counts. Needs the real browser check, so it waits for the owner's yes for that job.

## 3. Rules for every fix
1. The tester's script becomes a test in `tests/` named `hardening-<id>.test.js` (Gemini's demonstration test is inverted; Grok's contracts move over as they are). The fix is not done until it is green.
2. A change in `src/engine` is checked by `route-fingerprint.mjs check` (identical, or the move is explained). A change in `src/game`, `src/render` or `src/audio` is checked by `tests/frame-loop.test.js`.
3. `npm run validate` before the commit; one local commit per finding or per family; no push without the owner's word.
4. Do not trust a severity word, including the ones above: reproduce on a real route first when the reach is script-built.

## 4. The next attack (Round 2), when the fixes are in
What nobody has tried, in order of value:
1. The 51 maps never fuzzed, and Acts C and D (C2M17 to C2M30) above all, which no person has played.
2. The real page: a key that sticks after a blur or alt-tab, pointer lock lost mid-fight, resizing to 200x100 and 5120x1440, a WebGL context loss, a suspended or throwing AudioContext, two tabs sharing one localStorage, localStorage full or disabled. Needs headless-Chrome jobs, each with the owner's yes.
3. Settings and bindings blobs (wrong types, prototype keys), URL parameters, the production build served from a sub-folder.
4. Sequence breaks and softlocks with the fork, vents, self-blast and the mortar: can any map be made unfinishable? Can a required kill be made unreachable?
5. Real pads (PS5, Xbox, Switch) and a four-hour session.
Run it with `design/audits/ATTACK_PROMPT.md`, edited to say what was already covered (this file).
