# Gate 2 review bundle: Episode 1, Port Marrow (C1E1M01-M08 + secret C1E1S01)

Generated 2026-10-05T05:56:37.883Z by `node tools/gate2-bundle.mjs` from repository evidence. Code: `5b7b070`.

Evidence provenance: browser check, audio QA and all 9 map evidence files are stamped with the same commit as the code (`5b7b070`).

## Decision requested
> **Not yet asked.** The owner is playtesting Episode 1 map by map (PLAYTEST_NOTES.md). The first playtest found enemies drawn under raised floors (PT-001 / PT-002); they are FIXED IN CODE and guarded by the render-truth census below, but the owner has not yet confirmed in play that the problem is gone. Nothing beyond that is built until they do, and this decision is theirs to open when they have played enough. Human play outranks every number in this bundle.

**APPROVE**, **REVISE**, or **STOP PROJECT**. Approval means the production process may move to Gate 3: turning what Episode 1 proved (the map kit, the roster, the verification loop) into a repeatable pipeline for the remaining episodes. It does not mark any map COMPLETE (that needs a recorded human review of the map), erase the known defects below, or override a failing test. Silence is neither approval nor rejection.

## Two ways to look
- **Screenshots** (`screenshots/<map>/`, 169 images incl. a top-down plan per map): appearance only. Taken with the title card and transmissions cleared, from positions a player can stand in.
- **Play it:**
```bash
npm ci
npm run dev        # http://localhost:5173/  (click a difficulty; click the game once to capture the mouse; the intermission's Next button walks the episode)
```
Controls (rebindable in Pause > Controls): WASD move, mouse look, left click fire, right mouse aim, Shift sprint, E/Space use, 1/2/3 or wheel weapons, Tab automap, F5/F9 quick save/load, Esc pause. Listen: `review/audio/*.wav` (nobody has yet).

## The episode (read from validation/maps/*.json; see maps.json)
| map | name | derived status | enemies | bot s (normal) | fighter damage e/n/h | passive runner (normal) |
|---|---|---|---|---|---|---|
| C1E1M01 | Marrow Quay | AGENT_VERIFIED | 16 | 71.4 | 8/14/36 | dead, 108 damage |
| C1E1M02 | Customs Hall | AGENT_VERIFIED | 38 | 124 | 40/56/108 | dead, 108 damage |
| C1E1M03 | Fishmarket Rows | AGENT_VERIFIED | 37 | 152.4 | 12/35/49 | dead, 100 damage |
| C1E1M04 | The Drowned Chandlery | AGENT_VERIFIED | 44 | 136 | 4/14/43 | dead, 108 damage |
| C1E1M05 | Lamplighter Hill | AGENT_VERIFIED | 45 | 135.9 | 11/28/84 | dead, 126 damage |
| C1E1M06 | Ferry Terminal | AGENT_VERIFIED | 40 | 103.9 | 36/70/54 | dead, 117 damage |
| C1E1M07 | Signal House | AGENT_VERIFIED | 37 | 161.2 | 23/73/87 | dead, 135 damage |
| C1E1M08 | Bell Tower of St. Orrin | AGENT_VERIFIED | 41 | 177.3 | 48/128/190 | dead, 104 damage |
| C1E1S01 | The Lighthouse Cellar | AGENT_VERIFIED | 0 | 44.6 | 0/0/0 | complete, 0 damage |

Perfect-fighter damage summed over M01-M08 (mean of 3 seeds): easy 182, normal 418, hard 651 (the per-map ordering check is loose; the episode total is the real trend).

Derived campaign status: PLANNED 59 / IMPLEMENTED 0 / AGENT_VERIFIED 9 / COMPLETE 0 of 68. Agents cannot award COMPLETE.

## What Episode 1 added (the production kit and roster)
- **Terrain**: per-cell heights (0.5 m units, 0.6 m step climb, free drops), ceilings, stairs, terraces, cliffs; enemies path over it (BFS distance field) and cannot hit what stands 2 m above them.
- **Moving floors** (lifts, the funicular car, the ferry's bow ramp), **wall switches** (some that demand items: the Signal House's fuses), **trigger scripts** (13 actions: open/close/unlock/seal/wake/spawn/sector/message/exit/alert/shake/objective/lights), **ambush closets**, **wading water and toxic residue**, locked exits, **dark levels that brighten** (`atmosphere.ambient`).
- **Roster**: Tollbearer, Gaunt Runner, Bellhand (ranged), **Sexton** (raises the fallen: channel, revive, interrupted by damage), **Warden-Graft** (front plate, charge with a tell, stuns itself on walls and pillars), **Cantor** boss (shielded while any of six bell nodes ring; tone pulses that cover and height stop; summons; toll-shot fans once the ring is broken). Third weapon: **Riveter driver**.
- **Authoring pipeline**: `maps-src/<ID>.level.mjs` (builder) -> `tools/mapkit/compile.mjs` -> `maps/<ID>.json`; `mapview.mjs` top-down plans; `tools/dev/shoot-map.mjs` vantage tours; campaign flow (next map, secret exit and return, inventory carry-over); shared viability and quality gates (tests + verify-map).

## What is proven (by evidence)
- Automated tests: **272/272 pass** (`test-results.json`). Every map in `maps/` gets the same generic bar (loads, reachability, routes on 3 difficulties, viability, quality contract, determinism, story delivery) from `tests/maps.test.js`.
- Real-browser checks in headless Chrome: **106/106** (`validation/browser-check.json`), including the **canonical route of every Episode 1 map played in the real game and compared with the headless sim (tick count + state hash): 10/10 identical**, the intermission Next button carrying the inventory from M01 into M02, the objective line, the boss bar with its shield note, and a fuse pickup named as a fuse.
- Level viability: a passive runner that never fires does not walk through any map with enemies (the safe room, S01, has none); a perfect fighter completes every map on easy/normal/hard and takes real damage (numbers above).
- **Render truth** (what is DRAWN, not only what the sim says; PT-001/PT-002): 298 sleeping + 596 awake enemy samples, 683 forced pose rows, 602 dying/dead rows (132 on raised floors) and 40 moving-floor rows were measured in world space against the sim's ground: **0 violations** (band -0.03/+0.3 m); the Cantor's body, shield and ring agree. Drawn height vs sim hit height per kind is in `validation/render-ground.json` (`hitVolume`).
- Audio QA: 54 effects rendered alone are finite, non-silent and below full scale (max peak 0.93). It does NOT measure the mixed output.
- Draw calls and triangles at 14 vantage points (Gate 1 map plus the heaviest Gate 2 views, asleep and all-awake) are compared with a recorded baseline (`performance.json`). Structural counts only.

## What remains uncertain (honest list)
- **Real-GPU performance is unmeasured.** Headless software rendering only; the 60 FPS target is unverified. Each awake enemy rig is ~30 draw calls.
- **Nobody has played this.** Difficulty, ammo economy, boss pacing, the Warden and Cantor fights and every par time are bot-tuned placeholders; the bot has perfect aim and no fear.
- **Pointer lock and mouse feel** cannot be granted in the automated environment; the Esc -> Resume -> click flow needs a hand test in real Chrome.
- **Audio has never been heard by a person**, including the 20+ new effects (tone pulses, bell nodes, the ramp, the surge of the Signal House lights).
- **Enemy and boss models are code-authored variants on one rig**; they have been looked at in screenshots only, not in motion by a person.
- **Only Episode 1 exists.** Nothing here proves 68 maps of this quality are achievable; Gate 3 is about making the process repeatable, and Gate 4 about volume.

## Independent audit and known defects
An independent adversarial audit of code f79bf59 (the report audit/AUDIT.md, audit/findings.json, reproduction scripts in audit/repro/) found **1 BLOCKER, 6 MAJOR, 15 MINOR** (all confirmed by script). The BLOCKER (two exits on one cell, so the fuse and Cantor gates never locked) was the author's own error that every test and check missed; the BLOCKER and the six MAJORs were repaired afterwards (A01 fixed, A02 fixed, A03 fixed, A04 partially-fixed, A16 fixed, A17 fixed, A18 fixed; A04 is only partly fixed). A second, focused independent audit of the repairs (reaudit/REAUDIT.md) found no behavioural regression and one more MAJOR (three repairs were guarded by tests that could not fail) plus 14 MINOR items; those were then addressed too (see known-defects R01-R15). Nobody has audited the second round of repairs independently. What is open, partial or unverified is listed from `known-defects.json`:
- Open/partial/unverified: BLOCKER 0 · MAJOR 7 · MINOR 15 (of 52 recorded; 30 fixed)
- **MAJOR** [partially-fixed] A04 Bot-tuned maps had almost no margin for a weaker player — remaining: Hard difficulty is still fragile when the player is degraded (M06 hard with both handicaps kills the strafing bot). Per-type ammo slack is now gated (>= 1.5x per ammunition type the bot fires >= 5 times) and M08 hard now completes on 8 of 8 seeds (it was 4 of 8). Nobody human has played it (G2-U1).
- **MINOR** [partially-fixed] A05 Stale and inconsistent documentation (TESTING.md still reported Gate 1 numbers) — remaining: Docs were refreshed twice from evidence; small drift keeps reappearing where numbers are typed by hand (see R12). The bundle README is generated; TESTING.md is not.
- **MINOR** [open] A09 The render-budget baseline check was vacuous for the Gate 2 vantage points (baseline recorded from the same run) and the awake ceiling was set just above the measured maximum — remaining: The baseline is now recorded once (at the Gate 2 evidence run) and compares from then on; the 900-call awake-crowd ceiling is an engineering budget, not a measurement (see G2-U3).
- **MINOR** [partially-fixed] A12 Sky texture seam, dark secret-level horizon, mislabelled or in-collider screenshots — remaining: The sea beyond the Lighthouse Cellar and the hill's outer wall is still a near-black horizon band (dark water under a dark fog); not judged by a person.
- **MINOR** [partially-fixed] A13 Repository hygiene: ~117 MB of tracked review images, loose git objects — remaining: review/ still holds the screenshot tours twice (per-map folders and the gate bundle copies); prune or LFS them before the repository grows further.
- **MINOR** [open] A14 Explosion splash ignores walls and cover (flares hurt and wake enemies through walls) — remaining: Not fixed: changing splash rules re-tunes every map and the Warden's plate design assumes splash gets through; needs a design decision (line of sight from the blast, not from the projectile).
- **MINOR** [partially-fixed] A21 Test-suite weaknesses (vacuous assertions, audio coverage not reading script.js, 8 of 22 surviving mutations) — remaining: M12 (melee ignores the height difference) is not pinned by a test. After the second audit the seven surviving mutations were re-checked one by one: M21 (Cantor pulse damage) had still survived and is now pinned to the literal 22; the tryMove and nav guards were mutation-tested (each new test fails on the old code). The full 22-mutation run was not repeated.
- **MINOR** [partially-fixed] R08 The last-resort flare feed makes scarcity soft (an unlimited stream of flares completes a map with zero pickups) — remaining: It still makes total starvation survivable by an extremely patient player; that is the intent (no soft-lock), recorded here as a known effect.
- **MINOR** [open] R14 Continue can prefer the auto-save over an older manual quick save (every level entry and Retry rewrites auto) — remaining: Plausible rather than reproduced in a browser: after an F5, dying and pressing Retry rewrites the auto slot with a newer time, so Continue loads the level start of the retry, not the F5. Newest-wins is the documented rule; a save-slot picker would remove the ambiguity.
- **MAJOR** [unverified] G2-U1 Nobody has played any of the nine maps — remaining: Difficulty, ammunition economy, encounter pacing, the Warden and Cantor fights and every par time were tuned against a bot (a stationary perfect shot, plus a strafing variant under handicaps). Needs a hand playthrough and a recorded review per map (only that can make a map COMPLETE).
- **MAJOR** [unverified] G2-U2 Audio has never been heard by a person — remaining: 54 effects pass the offline measurements (finite, audible, below full scale, decaying) but nobody has listened to them or to the mix; the tone pulse, bell node, ramp, lift, lights-surge and dry-feed sounds are the least certain.
- **MAJOR** [open] G2-U3 Real-GPU performance is unmeasured; crowds are expensive — remaining: Only software-GL numbers exist. Each awake enemy rig is about 30 draw calls; with every enemy awake and in view the market (M03) reaches ~820 and the ferry quay (M06) ~830 draw calls (ceiling 900, an engineering budget). Sleeping enemies are merged, so quiet play is cheap. A rig LOD is the obvious fix if a real GPU disagrees.
- **MAJOR** [unverified] G2-U4 Pointer lock has never been exercised in a real browser session — remaining: Carried over from Gate 1 (F14). The retry logic exists; the Esc -> Resume -> click flow needs a hand test in real Chrome.
- **MINOR** [open] G2-U5 Par times are placeholders — remaining: Every par is 2x-8x the bot's time by rule, not from a human run.
- **MINOR** [open] G2-U6 Enemy and boss models are code-authored variants on one rig, reviewed only in stills — remaining: The Sexton, Warden-Graft and Cantor differ by silhouette (extra meshes), not by animation. Never judged in motion by a person; in the chamber screenshots the Cantor is largely hidden by its own shield wireframe and the cover pillars.
- **MINOR** [open] G2-U7 The per-map 'damage rises with difficulty' check is a loose proxy — remaining: It now allows hard >= 60% of normal (M06 measures 54 vs 70) because a deterministic bot takes a handful of hits and per-map hit counts jitter; the sim's difficulty multipliers themselves are unit-tested. The bundle reports the episode totals.
- **MINOR** [open] G2-U8 The bot is the only judge of the boss fight — remaining: The bot takes cover behind pillars from tone pulses and cuts the ring first; a human may find a dominant tactic (high ground, door camping) or an unfair one. The chamber door seals behind the player and only reopens when the Cantor dies.
- **MINOR** [open] G2-U9 Set dressing repeats; some spaces read as rectangles — remaining: Terrace streets, the quay and the tower legs are long rectangles with props on a grid. Verticality and hazards vary the maps, but the level art is still a kit, not hand-dressed. The Signal House 'beds' are tables.
- **MINOR** [open] G2-U10 Only Episode 1 exists; C1E2-C2 (59 maps) are not started — remaining: By design: Gate 3 has not been approved.
- **MAJOR** [partially-fixed] PT-001 Playtest 2026-09-30: awake enemies drawn UNDER raised floors (C1E1M02 gallery, 3 m) and corpses sunk into the floor — remaining: FIXED IN CODE, NOT CONFIRMED BY THE OWNER IN PLAY. Not asserted by any check: that the drawn floor surface equals the sim floor; pickups on moving decks.
- **MAJOR** [partially-fixed] PT-002 Playtest 2026-09-30: same symptom in C1E1M04 (the raised shop, 2 m) — remaining: Awaiting the owner confirming in play.
- **MINOR** [open] PT-005 Rendered bodies are taller than their sim hit cylinders: Cantor 4.79 m drawn vs 3.2 m hit, Warden 3.00 vs 2.3, Sexton 2.37 vs 1.85, Bellhand 2.37 vs 1.9, Tollbearer 2.26 vs 1.95 (Gaunt and Bell node match) — remaining: Measured (validation/render-ground.json hitVolume), deliberately NOT changed: it is gameplay tuning. Shots at the visible torso register on every kind (tests/enemy-hit-volume); shots at the head of the tall kinds pass over. Owner decision: widen the hit volumes or accept torso-only hits.

## Files
`test-results.json` `performance.json` `maps.json` `known-defects.json` `audio-qa.json` `build-info.json` `audit/` `reaudit/` `screenshots/`
