# PLAYTEST NOTES (human playtests are evidence: log every report here)

The owner plays as we go. Everything in `validation/` and `review/gate-*` was produced by bots and screenshots; a person playing is the only thing that has ever found a defect the automated gates could not. Each report below gets: what was seen (their words), what I established, what I suspect and how sure I am, why my checks missed it, and the guard that must exist before it is called fixed. **A defect is not closed until a check exists that fails on the old behaviour.**

Format: `PT-NNN` id · map · severity (BLOCKER/MAJOR/MINOR, my classification) · status (OPEN / DIAGNOSED / FIXED).

## Standing rules learned from these reports
1. The audits (two, independent) and 244 tests never looked at where an enemy MESH is drawn relative to the floor. The sim and the renderer are separate code paths; every number I produced is about the sim. Add render-vs-sim consistency checks (feet above floor, for sleeping, awake and dead enemies, on every map).
2. My screenshots were taken from a handful of hand-picked vantage points with enemies asleep and far away. Enemies up close, awake, dead, on raised floors and in water were never framed. When an enemy state is new or a floor is raised, take that shot.
3. Do not build past what was asked. The owner wanted to playtest as we went (reported 2026-09-30 after Episode 1 was already built): from now on stop after each map or each step and let them play before continuing.

---

## PT-001 · C1E1M02 Customs Hall ("the library") · MAJOR · OPEN (cause not yet confirmed)
**Reported (2026-09-30):** "2nd level in the library like this, enemies are underground." Screenshots: `review/playtest/2026-09-30/pt001-customs-hall-library.png` (a red-carpeted room with tables, a barrel and a hanging cradle, objective "Iron door, east wall: get out", kills 27/38, secrets 1/1; no enemy visible) and `pt001b-half-sunk-body-closeup.png` (a yellow-coated body/lump that is half inside the floor).

**What I established (facts, checked in the sim):**
- Sim positions are not the problem in the sense of "y = 0 everywhere": in M02, 15 of 38 enemies stand at y = 3.0 m (the gallery, raised floor), 1 at 2.0, 1 at 1.0, 21 at 0. Raised-floor enemies at y = 3.0 (cell coordinates): gaunt (26.5,6.5), gaunt (30.5,6.5), gaunt (40.5,6.5), gaunt (44.5,6.5), tollbearer (38.5,10.5), bellhand (32.5,12.5).
- The renderer draws enemies at `root.position.y = lerp(prev.y, e.y, alpha)` (src/render/view.js ~110) and sleeping enemies are frozen into one merged mesh (view.js ~119, `mergeStatic` of a clone of the rig, then `f.position.set(0,0,0)`); dead enemies play a lying-down pose from the same root.
- I tried to reproduce it with the shoot-map tool and FAILED to frame it: my teleported camera ended up against a wall, so I have **no visual confirmation from my side**. Do not treat any suspect below as confirmed.

**Suspects, most likely first (all unverified):**
1. **Dead bodies sink into the floor.** The second screenshot looks like a corpse whose pose pivots at the feet, so a body lying flat is half below the floor plane. If so it affects every map, and Gate 1 (flat) would have shown it too, unless the pose offset was only ever tuned by eye on M01. Check the death pose in `models.js` (`dead` blend) against body thickness.
2. **The frozen (sleeping) merge loses or double-applies the y offset.** Only affects enemies that never woke. Check `mergeStatic` baking of `matrixWorld` when the root is at y > 0 (M02 gallery, M04 raised cells).
3. **Floor mesh and sim floor disagree by a step** in some rooms (heights layer read with a different unit or an off-by-one on stairs/risers), so a correctly placed enemy looks sunk. Compare `levelmesh.js` floor quad y against `cellFloor` for every cell of M02/M04.
4. **Water overlay (M04 only).** 25 of M04's 44 enemies stand in wading water; the translucent water quad sits 0.07 m above the floor and would make legs look submerged. That is not "underground" but may be what was seen there.

**Why my checks missed it:** nothing asserts where an enemy mesh is relative to the floor; browser check compares sim hashes only; my screenshots never framed enemies up close on raised floors or dead bodies.

**Guard required before FIXED:** a browser check (needs a small dev hook returning each enemy view's world-space bounding box) that, on every shipped map and for enemies asleep, awake and dead, asserts `mesh min y >= floorAt(x,z) - 0.03`. It must fail on the current build.

## PT-002 · C1E1M04 The Drowned Chandlery · MAJOR · OPEN (same symptom, cause not yet confirmed)
**Reported (2026-09-30):** "Same with level 4" (enemies underground). No screenshot.
**Facts:** M04 has 3 tollbearers at y = 2.0 m (24.5,6.5), (18.5,8.5), (22.5,11.5) and 3 bellhands at y = 1.0 m (17.5,40.5), (37.5,43.5), (17.5,46.5); 38 at y = 0; 25 enemies stand in wading water (`w`), 4 on toxic residue (`x`). M03 (also raised floors and water) was not reported, but may simply not have been reached yet.
**Suspects:** as PT-001, plus the water overlay (4). Ask the owner which enemies (idle, walking, corpses) and where (in water or on dry raised floor).
**Guard required:** the same feet-above-floor check, plus the case "enemy standing in wading water".

---

## Sunday work list (in this order)
1. Reproduce PT-001/PT-002 in a real browser (headless Chrome, `npm run shoot-map`-style views placed 4 m from the enemies listed above, asleep / awake / dead), find the cause among the suspects, fix it.
2. Add the render-vs-sim feet check to the browser check for every map and enemy state; confirm it fails before the fix and passes after.
3. Ask the owner for any further playtest findings (M03, M05-M08 not yet played by them) and log them here before touching code.
4. Regenerate all evidence from one clean commit (the second-round audit repairs changed the engine, so every map is stale: `npm run verify`, `browsercheck`, `audio-qa`, `verify-map` for the nine maps, `validate`, `gate2-bundle`).
5. Do NOT start Gate 3. The Gate 2 decision belongs to the owner after they have played it; their playtest is the review.

## Open question for the owner
"You were only supposed to do gate 1 m2?": I read "APPROVE DIRECTION ... be braver" as approval of all of Gate 2 (a full episode) and built M01-M08 plus the secret map, the boss and two audit rounds. If they wanted map-by-map, the M02-only state is commit `2fd83c8`. The owner said they are not angry and wanted to playtest as we went; no rollback was requested.
