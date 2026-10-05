# PLAYTEST NOTES (human playtests are evidence: log every report here)

The owner plays as we go. Everything in `validation/` and `review/gate-*` was produced by bots and screenshots; a person playing is the only thing that has ever found a defect the automated gates could not. Each report below gets: what was seen (their words), what I established, what I suspect and how sure I am, why my checks missed it, and the guard that must exist before it is called fixed. **A defect is not closed until a check exists that fails on the old behaviour, AND the owner confirms in play that it is gone.**

Format: `PT-NNN` id · map · severity (BLOCKER/MAJOR/MINOR, my classification) · status (OPEN / DIAGNOSED / FIXED-IN-CODE (awaiting the owner) / CLOSED (the owner confirmed)).

## Standing rules learned from these reports
1. The audits (two, independent) and 244 tests never looked at where an enemy MESH is drawn relative to the floor. The sim and the renderer are separate code paths; every number I produced was about the sim. The gate now has BOTH: SIM TRUTH (deterministic sim, hashes, bots) and RENDER TRUTH (`tools/dev/render-census.mjs`: what is drawn, in world space, against the sim's ground). Never again verify one without the other.
2. My screenshots were taken from a handful of hand-picked vantage points with enemies asleep and far away. Enemies up close, awake, dead, on raised floors and in water were never framed. When an enemy state is new or a floor is raised, take that shot (the census now takes them: `review/render-ground/`).
3. Do not build past what was asked. The owner wanted to playtest as we went (reported 2026-09-30 after Episode 1 was already built): stop after each map or each step and let them play before continuing.
4. Evidence must be bound to the code that produced it: `tools/textsha.mjs` (source sets and what depends on what), `tools/validate.mjs` (derives status, refuses stale evidence, refuses a bundle that contradicts it).

---

## PT-001 · C1E1M02 Customs Hall ("the library") · MAJOR · FIXED-IN-CODE (2026-10-04) — awaiting the owner's confirmation in play
**Reported (2026-09-30):** "2nd level in the library like this, enemies are underground." Screenshots: `review/playtest/2026-09-30/pt001-customs-hall-library.png` and `pt001b-half-sunk-body-closeup.png` (a yellow-coated body half inside the floor).
**Clarification (2026-09-30, second message):** the enemies underground are **AWAKE ENEMIES CHASING THE PLAYER**, drawn under the floor. Not sleeping enemies, not corpses, not water. In C1E1M02 it was the "library" (reading room / gallery, floor 3 m up); in C1E1M04 the first room (the chandlery shop, floor 2 m up).

**Root cause, CONFIRMED (reproduced 2026-10-04 before any change; evidence in `review/playtest/2026-10-04/`):**
- **A1 (the reported symptom).** `GameView.render` places the enemy root from the sim (`root.position.set(x, e.y, z)`, view.js) and THEN calls `pose()`. The Tollbearer-family pose wrote `root.position.y = d * 0.12` and the Gaunt pose `root.position.y = d * 0.22`, where `d` is the death blend only. For every living enemy `d = 0`, so the world Y the view had just set was overwritten with 0. On a floor 3 m up the enemy was drawn at world Y ≈ 0: three metres under the carpet, while the sim (hits, AI, damage) kept it standing on the floor. Measured before the fix, on the nine shipped maps: 123 of the 129 sleeping enemies on raised floors (the other 6 are Bell nodes, whose pose never wrote the root) and 246 of the 258 awake samples on raised floors were drawn at the wrong height; the deepest was a sleeping Cantor 12.154 m under the floor of its chamber (a 12 m high floor).
- **A2 (the second screenshot).** The death and crouch poses drove mesh vertices below the contact plane even where the world Y was right. Corpses on FLAT floors were sunk: Tollbearer 0.17 m, Bellhand 0.26, Warden 0.26, Gaunt 0.13, severed Bell node 0.32, Cantor 1.30 m. The Gaunt's full crouch (the tell before a lunge) buried 0.29 m. Walk poses hovered up to 0.12-0.24 m.
- **A3 (found by the census, not suspected before): sleeping Wardens, Sextons and the Cantor were drawn in the wrong place.** Those models put `scale` on the world root (Warden x1.28, Sexton x0.94, Cantor x2.0). A sleeper is frozen by cloning the root, baking its world matrix into one merged mesh, then resetting position and rotation but NOT scale, so the baked world coordinates were scaled a second time about the map origin. Measured: the sleeping Cantor's drawn body centre was 76.6 m from where the sim stands it.
- **A4 (sim): dead, staggered and ring-node enemies did not follow a moving floor** (`updateEnemy` returned before refreshing `e.y`). A corpse or a stunned Warden on the funicular car kept its old height while the car moved.
- **A5 (view): a sleeper standing on a moving floor was frozen at the height it had** and then hovered/sank as the floor moved.

**Fix (all in code, none in map data):**
- World vs pose are separated (`src/render/ground-contract.js` documents the contract). `root` = world placement, owned by the view (x, z, yaw, y = the sim's ground). `rig` = the pose container inside it (scale, topple, joints). `pose()` writes only the rig. After every pose `makeRigGrounder` (models.js) measures the lowest rendered vertex and lifts the rig exactly onto the plane (never sinks it): this covers death, crouch, any future pose, and every rig including the Cantor at 2x and the Bell node.
- Scale moved off the root (fixes A3 at the same stroke); sleepers on a moving floor are not frozen until the floor is steady (A5); `updateEnemy` refreshes `e.y` for every state (A4, engine).
**Guards (each shown to FAIL on the old code and PASS now):**
- `tests/rig-grounding.test.js` (headless, 4 tests; old code: 634 poses overwrote the world root, 1499 band violations, deepest -4.29 m). Also `enemy-hit-volume.test.js` (the sim's own hitscan aimed at the DRAWN body registers on every kind, flat and 3 m up; the sim axis passes through the drawn body), `sim-sector-ground.test.js` (4A; old: 240 stale heights).
- **The render-truth census** in the real browser gate (7 checks inside `npm run browsercheck`, also `npm run render-ground`): every enemy of all nine shipped maps asleep (298), awake (596 samples), in every drawn pose on its highest and lowest floor (683 rows), dying and dead (301 + 301, 132 on raised floors), on moving floors (40 rows, funicular car and ramp), and the Cantor's body/shield/ring. Old code, same census: **2 of 8 checks pass; 292 of 298 sleepers, 253 of 596 awake, 614 of 683 pose rows, 301 of 301 corpses and 40 of 40 moving-floor rows violate the contract** (`render-ground-BEFORE-fix.txt/.json`, screenshots in `before/`). New code: 0 violations.
- Tolerance and why: buried <= 0.03 m, floating <= 0.30 m of the lowest rendered vertex around the sim's `groundAt(world, x, z, radius)` (NOT the centre-cell `floorAt`; they differ on stairs and ledges). Reasons are written next to the constants in `ground-contract.js`.
**Why my checks missed it:** nothing asserted where a mesh is drawn; the browser check compared sim hashes only; screenshots never framed an awake enemy up close on a raised floor.
**Not examined / still hypothesis:** whether the DRAWN FLOOR surface (level mesh) always equals the sim's floor height (the census measures rigs against the sim's ground, not floor quads against the sim). The before/after screenshots of M02 and M04 show the feet on the carpet/floor, which supports it, but no check asserts it.
**Owner action:** play C1E1M02's library and C1E1M04's shop; tell me if any enemy, awake or dead, is still below or above the floor. Until then this stays FIXED-IN-CODE.

## PT-002 · C1E1M04 The Drowned Chandlery · MAJOR · FIXED-IN-CODE (2026-10-04) — awaiting the owner's confirmation in play
**Reported (2026-09-30):** "Same with level 4" (enemies underground), clarified as awake enemies chasing in the first room (the shop, floor 2 m). Same causes and guards as PT-001 (A1; the shop's three Tollbearers are among the 129 raised-floor enemies). Water was ruled out by the owner and is not a factor.

## Other defects found while fixing PT-001/PT-002 (2026-10-04), small and verified
- **Rivet pickup toast said +30, the pickup grants 40.** The toast table hard-coded every amount. Now `src/game/toasts.js` reads the amount from `PICKUPS`, so they cannot drift (`tests/pickup-toasts.test.js`).
- **Debris used `position.y < 0` as "hit the floor"**, so over a raised floor chips fell through it and lived on invisibly until their lifetime ended. Now `src/render/debris.js` uses the terrain under them (heights and moving floors; a wall impact lands on the room it came from). Guards: `tests/debris-floor.test.js` and a browser check over the 3 m gallery.
- **The 800x600 pause menu clipped its control list against the Reset button** (a nested 34vh scroller: 354-436 px of rows hidden, a half row at the edge at every window size). The inner scroller is gone (the panel is the only scroll region) and there is a gap above the button; the browser check measures all four window sizes.

## Evidence freshness (found by the audits of 2026-10-04)
- Evidence was bound to `src/engine` only. A render, game-shell, audio or baked-asset change left "AGENT_VERIFIED" standing; `assetVersion` was recorded and never checked; only the main route was hashed; a committed bundle could claim "9 AGENT_VERIFIED" while the derived status was 0 (at 8dc307c the old `validate` printed OK for exactly that state: `validate-BEFORE-bundle-gap.txt`).
- Now: source SETS with one dependency table (`tools/textsha.mjs`), recorded as `sources` in map evidence, `browser-check.json`, `render-ground.json` and `audio.json`; `validate` marks map evidence stale for any dependent change (engine / render / game shell / audio / baked assets / map / ANY route) and for a browser check that lacks the render-truth census; `validate` also fails when a LIVE bundle's counts, per-map rows or README claim a status the derived evidence does not support (an earlier gate's bundle must say it is a "Historical snapshot"). `tests/freshness.test.js` (13 tests; 9 fail against the old validator, `freshness-tests-vs-OLD-validator.txt`).
- Still hand-typed and therefore unguarded: numbers inside `TESTING.md`, `PRODUCTION_LOG.md` and the prose of `GAME_VISION.md`.

## Open measured finding for the owner (NOT changed: it is gameplay tuning)
The sim hits an enemy inside a cylinder of `defs.js` height; the rig is drawn taller for several kinds (`hitVolume` in `validation/render-ground.json`): Cantor drawn 4.79 m vs 3.2 m hit (its head and crown are above anything a shot can hit), Warden 3.00 vs 2.3, Sexton 2.37 vs 1.85, Bellhand 2.37 vs 1.9, Tollbearer 2.26 vs 1.95; the Gaunt (1.48 vs 1.55) and the Bell node (2.45 vs 2.4) match. Shots at the visible torso register on every kind (tested); shots at the head of a Cantor, Warden or Tollbearer pass over. Decision for the owner: widen the hit volumes to the drawn body, or accept torso-only hits as the rule.

---

## Sunday work list (superseded 2026-10-04; what is left)
1. Owner confirms or reports against PT-001/PT-002 in play. Log anything new HERE before touching code.
2. Visual professionalisation is Phase D of the owner's brief and is NOT started: it begins only after the owner says the grounding problem is gone in play, as a single slice on C1E1M02, and stops for their decision before any propagation.
3. Do NOT start Gate 3. The Gate 2 decision belongs to the owner after they have played it.

## Open question for the owner
"You were only supposed to do gate 1 m2?": I read "APPROVE DIRECTION ... be braver" as approval of all of Gate 2 (a full episode) and built M01-M08 plus the secret map, the boss and two audit rounds. If they wanted map-by-map, the M02-only state is commit `2fd83c8`. The owner said they are not angry and wanted to playtest as we went; no rollback was requested.
