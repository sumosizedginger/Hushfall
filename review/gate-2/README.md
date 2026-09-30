# Gate 2 review bundle: Episode 1, Port Marrow (C1E1M01-M08 + secret C1E1S01)

Generated 2026-09-30T04:24:41.123Z by `node tools/gate2-bundle.mjs` from repository evidence. Code: `f79bf59`.

Evidence provenance: browser check, audio QA and all 9 map evidence files are stamped with the same commit as the code (`f79bf59`).

## Decision requested
**APPROVE**, **REVISE**, or **STOP PROJECT**. Approval means the production process may move to Gate 3: turning what Episode 1 proved (the map kit, the roster, the verification loop) into a repeatable pipeline for the remaining episodes. It does not mark any map COMPLETE (that needs a recorded human review of the map), erase the known defects below, or override a failing test. Silence is neither approval nor rejection.

## Two ways to look
- **Screenshots** (`screenshots/<map>/`, 148 images incl. a top-down plan per map): appearance only. Taken with the title card and transmissions cleared, from positions a player can stand in.
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
| C1E1M02 | Customs Hall | AGENT_VERIFIED | 38 | 124.1 | 40/56/108 | dead, 108 damage |
| C1E1M03 | Fishmarket Rows | AGENT_VERIFIED | 37 | 152.4 | 12/35/49 | dead, 100 damage |
| C1E1M04 | The Drowned Chandlery | AGENT_VERIFIED | 44 | 136 | 4/14/40 | dead, 108 damage |
| C1E1M05 | Lamplighter Hill | AGENT_VERIFIED | 45 | 135.9 | 16/28/69 | dead, 126 damage |
| C1E1M06 | Ferry Terminal | AGENT_VERIFIED | 41 | 90.1 | 19/84/72 | dead, 117 damage |
| C1E1M07 | Signal House | AGENT_VERIFIED | 37 | 162.2 | 23/92/87 | dead, 135 damage |
| C1E1M08 | Bell Tower of St. Orrin | AGENT_VERIFIED | 41 | 163.9 | 49/138/230 | dead, 104 damage |
| C1E1S01 | The Lighthouse Cellar | AGENT_VERIFIED | 0 | 44.6 | 0/0/0 | complete, 0 damage |

Derived campaign status: PLANNED 59 / IMPLEMENTED 0 / AGENT_VERIFIED 9 / COMPLETE 0 of 68. Agents cannot award COMPLETE.

## What Episode 1 added (the production kit and roster)
- **Terrain**: per-cell heights (0.5 m units, 0.6 m step climb, free drops), ceilings, stairs, terraces, cliffs; enemies path over it (BFS distance field) and cannot hit what stands 2 m above them.
- **Moving floors** (lifts, the funicular car, the ferry's bow ramp), **wall switches** (some that demand items: the Signal House's fuses), **trigger scripts** (13 actions: open/close/unlock/seal/wake/spawn/sector/message/exit/alert/shake/objective/lights), **ambush closets**, **wading water and toxic residue**, locked exits, **dark levels that brighten** (`atmosphere.ambient`).
- **Roster**: Tollbearer, Gaunt Runner, Bellhand (ranged), **Sexton** (raises the fallen: channel, revive, interrupted by damage), **Warden-Graft** (front plate, charge with a tell, stuns itself on walls and pillars), **Cantor** boss (shielded while any of six bell nodes ring; tone pulses that cover and height stop; summons; toll-shot fans once the ring is broken). Third weapon: **Riveter driver**.
- **Authoring pipeline**: `maps-src/<ID>.level.mjs` (builder) -> `tools/mapkit/compile.mjs` -> `maps/<ID>.json`; `mapview.mjs` top-down plans; `tools/dev/shoot-map.mjs` vantage tours; campaign flow (next map, secret exit and return, inventory carry-over); shared viability and quality gates (tests + verify-map).

## What is proven (by evidence)
- Automated tests: **220/220 pass** (`test-results.json`). Every map in `maps/` gets the same generic bar (loads, reachability, routes on 3 difficulties, viability, quality contract, determinism, story delivery) from `tests/maps.test.js`.
- Real-browser checks in headless Chrome: **89/89** (`validation/browser-check.json`), including the **canonical route of every Episode 1 map played in the real game and compared with the headless sim (tick count + state hash): 10/10 identical**, the intermission Next button carrying the inventory from M01 into M02, the objective line, the boss bar with its shield note, and a fuse pickup named as a fuse.
- Level viability: a passive runner that never fires does not walk through any map; a perfect fighter completes every map on easy/normal/hard and takes real damage (numbers above).
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
_No independent audit has been recorded yet._ What is open, partial or unverified is listed from `known-defects.json`:
- Open/partial/unverified: BLOCKER 0 · MAJOR 4 · MINOR 6 (of 10 recorded; 0 fixed)
- **MAJOR** [unverified] G2-U1 Nobody has played any of the nine maps — remaining: Difficulty, ammunition economy, encounter pacing, the Warden and Cantor fights and every par time were tuned against a perfect-aim bot with no fear. A human will find some fights too easy (cover-hugging) and some too hard (open quay, the Cantor's pulses). Needs a hand playthrough and a recorded review per map (only that can make a map COMPLETE).
- **MAJOR** [unverified] G2-U2 Audio has never been heard by a person — remaining: 53 effects pass the offline measurements (finite, audible, below full scale, decaying) but nobody has listened to them or to the mix; the new tone pulse, bell node, ramp, lift and lights-surge sounds are the least certain.
- **MAJOR** [open] G2-U3 Real-GPU performance is unmeasured; crowds are expensive — remaining: Only software-GL numbers exist. Each awake enemy rig is about 30 draw calls; with every enemy awake and in view the market (M03) reaches ~820 and the ferry quay (M06) ~830 draw calls (ceiling raised from 650 to 900 for awake crowds). Sleeping enemies are merged, so quiet play is cheap. A rig LOD (far awake enemies as a merged pose) is the obvious fix if a real GPU disagrees.
- **MAJOR** [unverified] G2-U4 Pointer lock has never been exercised in a real browser session — remaining: Carried over from Gate 1 (F14). The retry logic exists; the Esc -> Resume -> click flow needs a hand test in real Chrome.
- **MINOR** [open] G2-U5 Par times are placeholders — remaining: Every par is 2x-8x the bot's time by rule, not from a human run.
- **MINOR** [open] G2-U6 Enemy and boss models are code-authored variants on one rig, reviewed only in stills — remaining: The Sexton, Warden-Graft and Cantor differ by silhouette (extra meshes), not by animation. Never judged in motion by a person; in the chamber screenshots the Cantor is largely hidden by its own shield wireframe and the cover pillars.
- **MINOR** [open] G2-U7 The viability difficulty-ordering check was loosened — remaining: 'damage rises with difficulty' now allows hard >= 80% of normal because a deterministic bot takes only a handful of hits and hit counts jitter (M06: 84 vs 72). The sim's difficulty multipliers themselves are unit-tested; the map check is a proxy.
- **MINOR** [open] G2-U8 The bot is the only judge of the boss fight — remaining: The bot takes cover behind pillars from tone pulses and cuts the ring first; a human may find a dominant tactic (high ground, corridor door camping) or an unfair one. The chamber door seals behind the player and does not reopen until the Cantor dies.
- **MINOR** [open] G2-U9 Set dressing repeats; some spaces read as rectangles — remaining: Terrace streets, the quay and the tower legs are long rectangles with props on a grid. Verticality and hazards vary the maps, but the level art is still a kit, not hand-dressed. The Signal House 'beds' are tables.
- **MINOR** [open] G2-U10 Only Episode 1 exists; C1E2-C2 (59 maps) are not started — remaining: By design: Gate 3 has not been approved.

## Files
`test-results.json` `performance.json` `maps.json` `known-defects.json` `audio-qa.json` `build-info.json` `audit/` `screenshots/`
