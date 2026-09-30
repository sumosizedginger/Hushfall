# TESTING

Numbers below were read from the evidence files at the commit named in `validation/browser-check.json` (`commit`). If a number here disagrees with a file in `validation/`, the file wins and this page is stale.

## Commands
- `npm test` — 151 node:test tests, headless (no browser, no GPU). Areas: `sim` (determinism, RNG, loop scheduling, saves, carry-over), `ai` (waking, alerts, noise, hunting, cover, actor collision, Bellhand, Retry inventory, spawn-overlap validation), `weapons`, `controls` (sprint/ADS/accuracy), `bindings`, `settings`, `automap`, `audio` (event coverage, recipes, music-stall regression), `story` (message format, sim delivery, UI queue rules on a fake clock), `tiles`, `render` (level-mesh structure built headless), `mapformat`, `save`, `route`, `campaign`, `shipped` (Marrow Quay design contracts, canonical routes, viability gates, par plausibility). Engine tests run on FROZEN fixtures in `tests/fixtures/` (the old hall-and-quay layout); only `shipped`/`story`/`render` read the level that ships.
- `npm run validate` / `npm run status` — manifest topology + evidence-derived status + asset file check. `npm test` no longer touches tracked evidence files (a test asserts that).
- `npm run browsercheck` — headless Chrome (SwiftShader software GL, 1280x720) against the dev server, 66 checks, about 1-5 minutes; writes `validation/browser-check.json` (stamped with commit, map sha, map version), `validation/render-budget.json`, screenshots in `review/engine-skeleton/`. `-- --update-baseline` rewrites `validation/render-budget-baseline.json` (the reference the budget check compares against; do it deliberately).
- `npm run verify-map -- C1E1M01` — map evidence: reachability, routes x 3 difficulties, **viability** (passive runner must not get through; perfect fighter must bleed; damage rises with difficulty; par is 2x-8x the bot's time), browser evidence bound to this map file's sha, open BLOCKERs from `review/gate-1/known-defects.json`.
- `npm run audio-qa`, `npm run shoot-level`, `npm run shoot-stances`, `npm run shoot-weapons` — evidence/screenshot tools; they clear the title card and overlays so the images show what a player sees.
- `npm run gate1-bundle` — assembles `review/gate-1/` from evidence; exits non-zero if tests fail (1), the defect list is empty (2), or evidence/code provenance differs or source is dirty (3).
- `npm run build` — production build; the dev test hook must not appear in `dist/`.
- Asset tools: `node tools/dev/determinism.mjs <asset>`, `node tools/dev/clean-regen.mjs`.

## What each layer proves (and what it does not)
| layer | proves | does NOT prove |
|---|---|---|
| unit/integration tests | sim rules, determinism, AI behaviours, save migrations, UI queue ordering, level structure | that anything is fun, readable or fast |
| route bot (`fights:true`) | one valid path per difficulty completes through the real input layer; a perfect fighter takes 24/54/80 damage (easy/normal/hard) | balance for humans: the bot has perfect aim |
| runner bot (`fights:false`) | a player who never shoots cannot simply walk through: dies (hard) or is blocked (easy/normal) after 45/77/109 damage | that the level is fair |
| headless Chrome check | the real game runs: real key/mouse input, un-teleported walk with ordered transmissions, prompts, F5/F9, pause layout at four window sizes, WebGL-unavailable message, Node-vs-Chrome identical state (tick count 4602, hash 1924e14d), GPU-leak check | pointer lock, real GPU speed, how it feels |
| audio QA | each of 36 effects rendered ALONE is finite, non-silent, below full scale, decays; 2 score renders (combat louder than calm) | mixed loudness, overlap, music-vs-effects balance, that it sounds good |
| render budget | draw calls / triangles at 5 vantage points incl. all-enemies-awake are within 25% of a recorded baseline and under ceilings (350 asleep / 650 awake: engineering budgets, not measurements) | frame rate on any real machine |

## Results (see validation/*.json for the source)
| area | result |
|---|---|
| unit/integration tests | 151/151 pass |
| browser check | 66/66 pass (software GL) |
| render budget | pier 191 calls / 21.5k tris; plaza 161 / 19.3k; warehouse 68 / 9.5k; plaza with every enemy awake 493 calls (each awake rig is ~30 draw calls; asleep enemies are merged); warehouse awake 117 |
| software-GL frames (unclamped) | 837 frames in the 6 s sample, avg 46.5 ms, p95 217 ms, worst 1000 ms (first-frame shader compile). NOT a performance claim |
| GPU lifecycle | 12 level restarts: geometries 352 -> 352, textures 18 -> 18, programs 12 -> 12 |
| level viability (normal) | runner: blocked after 77 damage; fighter: completes, 54 damage, 77 s; par 300 s = 3.9x the bot |
| audio QA | 36 SFX + 2 score renders, peaks <= 0.93 |
| production build | succeeds |

## Failure-injection coverage
Death while holding the key (restart restores it), use/interact spam on locked and unlocked doors, exit on the same tick as fatal damage (death wins), save immediately after a transition, reload after finding a secret (no double count), a 50-level carry-over chain (bounded, no growth), corrupt/foreign/newer/old saves (v1..v5 migrate to v6), map changed since save, unusable storage, key placed behind its own door (reachability catches it), a body spawned inside a solid prop (validation rejects it), a music scheduler stalled for 3 minutes (no burst of catch-up notes; the test fails without the fix), WebGL unavailable (browser check), Retry after a load (unit + browser check).

## Not tested / limits (honest list)
- **Pointer lock**: cannot be granted in headless Chrome or the app browser pane. The Esc -> Resume -> click flow, and whether a rejected request recovers, need a hand test in real Chrome.
- **Real-GPU performance**: only software-GL numbers exist.
- **Audio has never been heard by a person.** Live playback was verified by engine state and log only.
- **Balance and feel**: enemy speeds, damage, ammo/health flow and the Bellhand toll-shot's readability were tuned with bots and unit tests. Par time (5:00) is a placeholder.
- Enemy AI is chase-and-steer to the last known position: no pathfinding, so an enemy can still be held up by concave geometry.
- Automap: whole-level fit, no zoom/pan; shows no pickups/enemies by design.
- Screenshots were reviewed by eye for appearance only. The app browser pane suspends animation frames when hidden, so live verification uses headless Chrome.

## Known defects
Authoritative list: `review/gate-1/known-defects.json` (audit findings F01-F20 with their repair status, plus unverified items). Still open or partial: F10 (only two wall skins and one interior floor; layout variety beyond this is production-kit work), F12 (real-GPU performance unmeasured), F14 (pointer lock unverified), plus U1-U4 (balance/feel unplayed, audio unheard, placeholder par, one level only). Other standing issues:
- MAJOR: value-banding post pass reads more posterised-pixel than brushy (look decision pending).
- MAJOR: weapon view-model reads blocky; enemy coat is a plain cone.
- MINOR: exterior is very dark away from lamp posts; lighting values are placeholders.
- MINOR: in ADS the receiver's rear face still sits under the sight line (sleeves now fade out; the ADS pose was reclassified MAJOR by the audit and then reduced).
- MINOR: baking is slow (atlas ~100 s under software GL). Concept sprites `enemy_tollbearer_idle.png` / `weapon_flarecannon.png` are unused leftovers (excluded from the build).

## History
- Gate 0 asset spike: p5 seeding, opaque bases and matting findings are in `ART_BIBLE.md`; clean-env regeneration within 0.3% differing bytes (`review/gate-0/clean-regen.json`).
- Look demo: two bugs fixed (weapon pass wiped world depth so outlines vanished; brush fills were translucent atlas cells).
- Second weapon/enemy, controls pass, engine skeleton: bugs found by tests/checks and fixed in the game (pellet knockback compounding, Gaunt stuck on a barrel, flare in flight using the current weapon's stats, muzzle offset missing aimed shots, hook + rAF both stepping the sim, a per-restart geometry leak, dropped sub-tick key taps).
- Gate 1 audit (commit 7bf03a9, independent): 0 verified BLOCKER, 15 MAJOR, 5 MINOR; 18 weak tests; 9 unsupported doc claims. Repairs: hunting AI + Bellhand + viability gates (the level used to play itself), message queue, UI prompts, pause layout, Retry inventory (save v6), spawn-overlap validation, pointer-lock retry, honest perf sampling, evidence provenance, and the weak tests rewritten so they can fail (e.g. seeds-diverge now compares real shots; the flare test asserts on the enemy it aimed at; par is checked against the bot; ammo against what the bot spends).
