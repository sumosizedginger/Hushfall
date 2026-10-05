# Gate 3 report (2026-10-05): the repeatable pipeline, proven on one pilot map

Status: **built and verified by the automated gates; NOT played by the owner.** Nothing of Gate 4 is started. The plan and criteria: `design/GATE3.md` (full pilot log and the honest cost list there).

## What was built
- **Manifest-driven gates:** `tools/mapset.mjs` discovers the maps and routes; `tools/dev/route-parity.mjs` is the one "play it in the real game and compare with the Node sim" implementation; the render census takes one map and finds moving floors and the boss from the maps themselves.
- **Per-map real-game evidence:** `tools/dev/browser-map.mjs` -> `validation/browser/<ID>.json` (every route vs the Node sim, the HUD, the census), stamped with the map's sha, its routes' sha and the source sets. `validate` and `verify-map` judge the shared check (about code) and the map's own file. 4 of 14 freshness tests fail on the old validator (`freshness-tests-vs-OLD-validator.txt`).
- **One command per map:** `npm run map -- <ID> [--browser]`, `npm run map:new -- <ID>`, `npm run map -- --list`.
- **Episode 2 theme kit:** three skins through the p5.js + p5.brush path (`tools/baker/recipes_e2.js`); skins are declared once in `defs.js` and the builder's floor characters and the texture list derive from them.
- **The Gate 2 bundle is frozen** as a historical snapshot (it can no longer be rewritten; adding maps changes the campaign-wide counts).

## The pilot: C1E2M01 Brine Gate
Checkpoint assault across open ground, existing enemies/weapons/kit only, 30 enemies. `npm run map -- C1E2M01 --browser`: **AGENT_VERIFIED in 21 s** (real-game evidence 8.7 s, verify-map 11.8 s). Real game == Node sim (5432 ticks, same hash); census 0 violations; perfect-bot damage 18 / 49 / 82 (easy / normal / hard); the aim-error bot completes on normal. What the gates caught while it was built, step by step, is in `design/GATE3.md`.

## Evidence (all from ONE clean commit, stamped in every file; every step exit 0)
Tests **292/292**; shared browser check **109/109** (`validation/browser-check.json`, includes the dev level picker); per-map real-game evidence for all ten maps; `npm run validate` OK; derived status: PLANNED 58 / IMPLEMENTED 0 / **AGENT_VERIFIED 10** / COMPLETE 0 of 68 (agents never award COMPLETE).

## Not proven
Nobody has played the pilot (balance, readability of the pan, the dyke, the towers, the look of the three new skins and the pale sky are all unjudged). Real-GPU cost is still unmeasured. A new skin still invalidates every map's evidence (see the cost list). One map proves the loop, not that 59 more will go as smoothly.

## To play
`npm run dev` -> http://localhost:5173/ . The title screen now has a DEV level picker (dev server only, not in the shipped game): choose `C1E2M01 Brine Gate` and a difficulty, press Play, click the game once to capture the mouse (Esc releases it). Look at: the pale pan and the new skins, the north ditch to the guardhouse, the kennels opening, pulling the sluice wheel, the walk back east through the dyke gap, the towers and the rank, the gate and the Warden in the yard, the exit.

## Your decision
Approve Gate 3 (then Gate 4 starts, in small batches you set, each played by you before the next), or revise (log what you saw first), and whether to fix the skin cost before Gate 4.
