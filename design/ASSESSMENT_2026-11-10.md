# HUSHFALL: assessment and change list (2026-11-10)

The owner asked for a detailed assessment of the game, the graphics and the code, judged as a product and leaving aside how much of it has been played, plus the changes I would make. This file is both. Nothing in it is built. Point me at an item id (G1, A3, C2 ...) to start one.

## 0. How this was made, and its limits

- **Read:** `src` (173 files, 44k lines), the top of `PRODUCTION_LOG.md`, `design/RELEASE_QUALITY_PLAN.md` section 2, `design/DIFFICULTY_CURVE.md`, `design/level-floors.json`, the package files.
- **Looked at:** six real-game stills at 1920 x 1080 from `D:\Doom_release\polish\pt083-after`, `polish\sweep` and `store\shots`, and one creature atlas. The store frames predate the PT-080 shield and the PT-079 art fixes, so the art notes about effects describe an older build where marked.
- **Ran:** `npm run validate` (OK), ESLint over `src` (clean), `tsc` (clean), and 13 tests (code health, the headless frame loop, portable maths): all passed.
- **Did not do:** the whole suite, any browser job, any listening. Sound and music are judged from the code and the measured reports only. Feel (mouse, recoil, hit feedback) is judged from the code only.
- **State at the time:** master 2f45dc9, clean, 95 commits ahead of GitHub. `npm run status` says AGENT_VERIFIED 0 of 68 because PT-084 to PT-087 changed `src`, `index.html` and maps after the last regeneration.

## 1. Scores

Scored as a commercial indie retro shooter at about a ten-dollar price, against shipped games of that kind, not against the project's own gates.

| Area | Score | In one line |
|---|---|---|
| Identity and fiction | 8.5 | Sound as the enemy's weapon and a lamp as the answer: a real idea carried through creatures, bosses and the ending |
| Combat design | 8 | Ten guns with separate jobs, melee with parry, loads and mods, creatures that dodge and call for help |
| Enemy roster | 8 | About thirty kinds with separate silhouettes and tells; the coat-wearers still overlap |
| Level design | 7 | Good variety of place and mechanic; uneven map to map; some large flat spaces in Campaign 2 |
| Pacing and difficulty curve | 6.5 | Bot numbers are sane with five or six bumps; Hard is steep; one unexplained spike |
| Art direction | 8 | Coherent and unusual: ink, banding, painted skins, a palette per place |
| Art execution | 6.5 | Skies, creatures up close and the guns are good; floors, far creatures and flat rooms are not |
| Effects | 6 | Muzzle flash and impacts are good; translucent volumes were the weakest class in the frames I have |
| UI and information | 7.5 | Clean HUD, Journal, corner map, captions, stats; the corner map carries little |
| Audio (from code and measurements) | 7 | All procedural, adaptive themes per act; nothing recorded, so texture is limited |
| Simulation code | 8.5 | Headless, deterministic, bit-portable, lazy state; a few very long functions |
| Shell and render code | 6.5 | Correct and tested, but two 2,000-line hubs |
| Tests and evidence | 9 | Route bots, real-page parity, a headless frame loop; far above the norm |
| Tooling and docs | 6 | Powerful, but twice the size of the game and hard to enter |
| Release readiness | 6 | Web package, wrapper prototype, credits, licences exist; evidence stale, store art stale, one machine tested |

**Overall: a strong 7.** The idea, the systems and the engineering are an 8 or better. What holds it at 7 is execution that is uneven from map to map and room to room, and a few visual defects that sit in the middle of the picture.

## 2. The game

### What is good

- **It is its own game.** Bells, choirs, tolls, a harbour, a lamp. The sprint lockout, the sights' slowdown, parry, loads and mods make it play differently from the games it resembles.
- **Each gun has a job.** Flare (burn and light), scattergun, rivet driver, harpoon (goes through bodies), arc lamp (chains), carbine (precision), line-thrower (blast), fork (gravity), mortar (indirect), plus five melee weapons. None is a plain upgrade of another.
- **The creatures act.** Dodging out of your sights, strafing after a shot, the Tollbearer's lurch, the Bellhand's call for help that you can interrupt: these are visible, readable behaviours with a counter each.
- **Bosses are staged around a rule.** Seals and mirrors for the Gate Warden, the beat for the Hive Cantor, a pendulum and anchors for the Root Bell. Only the three Cantors share a ring dance.
- **The shell is complete.** Training yard, three difficulties, checkpoints, a save screen between levels, Journal, Bestiary, stats, challenges, New Game+, captions, text size, reduced motion, pad support with glyphs, cinematics, credits.
- **Play reports become rules.** Doors, keys, captions, traps and findable levers each became a lint gate, so the same mistake cannot return on map 60.

### What is weaker

- **Mechanic sprawl.** Vents, drift, airlocks, vacuum, mirrors, chimes, resonators, current, belts, cars, tide, timing platforms, sound-locks, falling loads, breathing gates, spore beds. Many live in one or two maps. A player learns a rule and seldom uses it again. `design/MECHANICS_RETURNING.md` brought five back as optional branches, which helps only players who take the branch.
- **The level floors have 20 written exceptions** out of 62 main maps, and for several the reason is that the bot gates refused more creatures or an ambush. Those maps are the likeliest to feel thin.
- **Key hunts on 21 of 62 maps.** Many maps are a line with a lever. The old-school bar the owner set means return trips with a new key through rooms that changed.
- **Hard is a cliff.** Median damage to the perfect bot is 22 / 69 / 122 on Easy / Normal / Hard, and Hard kills the bot often enough that its test allows replays. Normal to Hard nearly doubles.
- **Easy and Normal can be close or inverted.** Lamplighter Hill is 60 / 70; Bell Tower is 144 on Normal but 117 on Hard.
- **Rail Yard is 116 on Normal** against about 75 around it, with no reason written.
- **Text load.** The story is told in radio lines and documents. The Journal fixed readability; the amount of reading per map is still high for the genre.
- **Campaign 2 scale.** Its maps were drawn at about twice the area for a similar creature count. The squeeze and the fun pass reduced it; the audit still lists it as the campaign's main shape problem.

## 3. The graphics

### What is good

- **The style is one decision applied everywhere.** Low internal width, ink lines, value bands, paper grain, painted atlases. It does not look like any asset store.
- **Red ink for hostiles** makes a target readable at any distance and against any wall.
- **Skies and place palettes** are the best asset class: the Nerve Cathedral's orange sky over black domes and a glowing red grid is a store picture as it stands.
- **Creatures up close** have faces, weight and a clear tell. The Tollbearer at two metres is a character.
- **The held gun** at screen resolution with its own ink is crisp and well lit; the muzzle flash lights the room.

### What is weaker

- **G-a. Floor moiré.** Customs Hall's checker tile turns into shimmer from mid-distance and fills half the frame. The texture has mipmaps, but a high-contrast two-texel pattern drawn into a 480-pixel target and then banded still aliases.
- **G-b. Far creatures are blobs.** At 12 m a head is about four pixels. In the Hollow Stair still the enemies are small red-rimmed smudges; only the outline says what they are.
- **G-c. One-hue rooms.** The Hollow Stair still is almost entirely navy with one orange pillar. The materials lint counted 228 of 454 rooms with one wall skin and 61 with no accent.
- **G-d. Gun against world.** The gun is sharp, warm and bright; the world behind it is coarse and often dark. `gunlight.js` follows the place's light at a correlation of 0.83, yet in the navy and red maps the gun still reads as pasted on.
- **G-e. Translucent volumes.** In the Gate Warden store frame the shield is flat teal sheets that hide the boss and the arena. PT-080 rebuilt it as a shell; I have no frame of the result.
- **G-f. Large flat floor planes.** Outdoor Campaign 2 frames have a wide single-texture ground with thin dark bands at the horizon; nothing breaks the middle distance.
- **G-g. The corner map** is a dark box with one dot for most of a level's opening.
- **G-h. Creature atlases are 256 px** of flat swatches with scratches. Fine at 480; thin at the 960 option.
- **G-i. Store pictures are stale** (old shield, pre-PT-079 walls and dressing).

## 4. The code

### What is good

- **The boundary holds.** `src/engine` has no DOM, Three, clock or `Math.random`; everything else reads state and drains events. Saves, replays, bots and the real page all run the same code.
- **Bit-portable maths** (`dmath.js`), found by evidence and held by a test.
- **Lazy state plus route fingerprints**: a new mechanic costs nothing in a world that never meets it, and that is proved, not assumed.
- **Clean by measurement.** No TODO or FIXME, no empty catch, ESLint and tsc clean, line and function length capped by `tests/code-health.test.js`.
- **Two runtime dependencies**, pinned, with licences audited.
- **A headless frame loop test** over every map catches the black-screen class of bug without a browser.

### What is weaker

- **C-a. `updateEnemy` is 347 lines, `tick` 270, `brainStep` 200.** A creature is a chain of `if (def.x)` branches over 37 definition keys. Order matters, early returns are scattered, and each new creature lengthened it. The test only stops it growing.
- **C-b. `src/game/main.js` is 2,015 lines**, about 50 imports and 76 top-level functions sharing module state. `src/render/view.js` is 2,084. Pure helpers were extracted; the hubs were not divided.
- **C-c. `defs.js` is 2,115 lines** with every tunable of every system. `models_choir.js` is 2,507.
- **C-d. Type checking covers `src/engine` only, non-strict.** Event payloads and save shapes, the two contracts everything depends on, are untyped.
- **C-e. Events are stringly typed.** `emit(w, 'pulse', {...})` on one side, string matches in audio, view, captions and stats on the other. A test enumerates some; nothing lists them all in one place.
- **C-f. Tools outweigh the game two to one** (83k lines in 406 files; 153 files in `tools/dev`, 22 of them probes, 12 shoots). Many are one-task records.
- **C-g. `AGENTS.md` is 149 KB** and is mostly a changelog. Every session loads it. The rules are a small part; the rest belongs in the log and in `ARCHITECTURE.md` (109 lines, the right shape).
- **C-h. Comments carry history** (ticket numbers, what a thing used to be, who said what) where they should explain the code.
- **C-i. The route bot shapes content.** It is a gate and also, in practice, a designer: maps were relaxed where it died. Its second half (cover, retreat, ammunition choice) was never built.
- **C-j. Evidence staleness is all or nothing.** One CSS line stales 68 maps and costs 90 to 170 minutes.
- **C-k. Performance.** The worst step is 8.2 ms against a target of 4; one machine, one browser family.

## 5. The changes I would make

Each item says what, where, how to know it worked, its size (S under an hour, M a session, L several), and whether it stales the real-game evidence. Items marked **stales** should be batched before one regeneration.

### Tier 1: visible in the first minute

| id | Change | Where | Done when | Size | Stales |
|---|---|---|---|---|---|
| G1 | **Kill the floor moiré.** Fade a floor's pattern contrast toward its mean colour with distance, and repaint `floor_tile_a` with less value contrast between squares | `src/render/surface.js` (`patchSurface`), `tools/baker/recipes_polish2.js` | A Customs Hall frame shows calm tile past 8 m; a node check of row-to-row luma variance in the far half of the frame drops by half | M | yes |
| G2 | **Far creatures read as figures.** A second, simpler body tone and a brighter head patch beyond about 10 m, so a creature is two or three flat shapes, not noise | `src/render/view.js`, `entityflag.js`, `choir_kit.js` | `probe-contrast.mjs` median rises; a Hollow Stair frame shows head, coat and bell at 15 m | M | yes |
| G3 | **Every room gets an accent.** Use the materials lint as a work list: the 61 rooms with no accent first, then one-wall-skin rooms on main lanes. Trims and dressing only, so no route moves | `src/render/dressing.js`, `trims.js`, map `PT-035`-style blocks | Lint: no accentless room on a main lane; `route-fingerprint` identical | L | yes |
| G4 | **Seat the gun in the scene.** Tint the gun's shadow side with the place's ambient colour and drop its saturation in dark looks | `src/render/gunlight.js`, `post.js` | `probe-gun.mjs` correlation above 0.9; the gun's hue distance to the scene mean falls in the navy and red looks | S | yes |
| G5 | **Corner map shows the room you are in from the first frame** (reveal the current room's outline on entry) and the next objective's direction as a tick on its border | `src/game/minimap.js`, `src/engine/automap.js` read only | The corner map is never an empty box after the first second | S | yes |
| G6 | **Reshoot every store picture and the trailer** on the current build | `tools/dev/store-*.mjs` | New set in `D:\Doom_release\store` | M (Chrome, a named yes) | no |
| G7 | **Check the effects on the current build**: shield shell, sweep beam, rings. Six frames, then fix what still reads as a slab | `shield.js`, `glowfx.js`, `beamfx.js` | The boss is visible through its shield in every boss frame | S + M | yes |

### Tier 2: the play itself

| id | Change | Where | Done when | Size | Stales |
|---|---|---|---|---|---|
| P1 | **Explain or fix Rail Yard** (116 on Normal). `dbg-route.mjs` with `HITS=1` names the source | `maps-src/C1E2M03.level.mjs`, its sidecar | The curve report has a reason or the number is near 80 | S | that map only |
| P2 | **Soften the step to Hard.** Aim for a Normal to Hard ratio near 1.4, not 1.8: trim `enemyDamage` on Hard a little and keep its extra creatures | `DIFFICULTY` in `defs.js` | Median bot damage on Hard near 100; the carried-run test needs no replays | M (every Hard gate re-run) | yes |
| P3 | **Fix the inversions** (Bell Tower harder on Normal than Hard, Lamplighter Hill flat from Easy to Normal) | Their sidecars in `maps-src/skill/` | Damage rises Easy < Normal < Hard on every map | S each | those maps |
| P4 | **Revisit the 20 floor exceptions** with a rule: an exception whose only reason is "the bot refused" gets one more attempt using the strafing policy and a hand-placed ambush, or a named moment instead | `design/level-floors.json`, `tools/dev/level-pass.mjs` | Exceptions at 10 or fewer, each with a reason about the map and not the bot | L | those maps |
| P5 | **Give the one-map mechanics a second mainline use.** Pick the four best (my picks: mirrors, timing platforms, the tide, cars) and put a short required beat of each into one later map; leave the rest as flavour | Four map sources | Each of the four appears on the required road of two maps or more | L | those maps |
| P6 | **More return trips.** Add a key hunt to ten more maps where the route already passes a dead-end room | `tools/dev/add-key-hunt.mjs` | Key hunts on 31 of 62, every one inside the PT-087 walk limit | L | those maps |
| P7 | **Trim reading on the road.** Cap radio lines per map; move the overflow into found documents | `tools/dev/route-story.mjs` to measure, map sources | No main route makes the player read more than a set word count; the protected lines stay | M | those maps |
| P8 | **Finish the coat-wearer silhouettes.** Eleven pairs still over 0.5. Change headgear and what they carry, not the hit volume | `models_choir.js` | Pairs over the bar at 5 or fewer; the ratchet lowered | M | yes |

### Tier 3: the code

| id | Change | Where | Done when | Size | Stales |
|---|---|---|---|---|---|
| C1 | **Split `updateEnemy` into ordered behaviour steps.** A table of `{ when(def), step }` run in a fixed order, each step in its own function or file; no behaviour change | `src/engine/enemies.js` | No function over 150 lines there; `fp-par.mjs check` identical on every route | L | yes |
| C2 | **One event catalogue.** A single module listing every event type and its payload fields; `emit` checks against it in tests; audio, view, captions and stats import the names | new `src/engine/eventtypes.js` | A test fails on an unknown event name or a missing consumer decision | M | yes |
| C3 | **Divide `main.js` by mode.** One file per shell mode (title, playing, paused, dying, epilogue, cinematic, journal) around the existing `state.js`; `main.js` becomes wiring | `src/game/` | `main.js` under 600 lines; `tests/frame-loop.test.js` green | L | yes |
| C4 | **Divide `view.js`** into scene setup, actors, effects and the frame | `src/render/` | Under 800 lines; the render tests green | L | yes |
| C5 | **Split `defs.js`** into `defs/weapons.js`, `enemies.js`, `places.js`, `rules.js`, re-exported from `defs.js` so no import changes | `src/engine/defs/` | Same exports, four files | S | yes |
| C6 | **Type the contracts.** JSDoc typedefs for the world, the save, events and a map; extend `tsc` to `src/game` and `src/audio` | `tsconfig.json`, typedef file | tsc clean with the wider include | M | yes (comments only, but the hash sees them) |
| C7 | **Shrink `AGENTS.md` to rules and commands** (target under 15 KB); move each dated entry to `PRODUCTION_LOG.md` or a `design/` file it already summarises | `AGENTS.md` | Every session loads a tenth of the text; nothing lost | M | no |
| C8 | **Archive one-task tools.** Anything in `tools/dev` not named by an npm script, a test, another tool or the trimmed `AGENTS.md` moves to `D:\Doom_archive` with a line in `ARCHIVE_INDEX.md` | `tools/dev` | Under 80 files; `tests/repo-layout.test.js` green | M | only if a hashed verifier moves: check `tools/textsha.mjs` first |
| C9 | **Comment pass.** Remove ticket numbers and history from comments in `src`; keep the why | `tools/dev/tidy-comments.mjs` extended | A test finds no `PT-` in `src` comments | S | yes |
| C10 | **Narrow what stales evidence.** Hash the CSS that affects the play picture separately from menu-only CSS and text | `tools/textsha.mjs` | A menu wording change stales nothing | M | no (but changes the stamps: one regeneration after) |
| C11 | **Find the 8.2 ms step.** `step-cost.mjs --all` names the map and tick; fix or cache | `src/engine` | Worst step under 4 ms | M | yes |
| C12 | **A second browser and a weaker machine.** Firefox and a laptop with integrated graphics, one pass each | `probe-prof.mjs`, by hand | Numbers in `design/PERFORMANCE_PLAN.md` | S (Chrome and Firefox jobs, a named yes) | no |

### What I would leave alone

- The engine and render boundary, lazy state, the fingerprints, `dmath.js`.
- The art direction itself: 480 default, ink, banding, painted atlases.
- The gun roster, parry, loads and mods.
- The 68-map target.
- The story's protected lines.

## 6. Order

1. **One visual batch:** G1, G4, G5, G7, then G2. All stale the evidence, so they go together.
2. **One play batch:** P1, P3, P2, then P8.
3. **One code batch with no behaviour change:** C5, C2, C1, C9, C6, then C3 and C4. Each proved by fingerprints and the frame-loop test.
4. **One regeneration** (a Chrome job, the owner's named yes).
5. **No-stale work at any time:** C7, C8, then G6 after the regeneration.
6. **Content, map by map, as the owner's play reports arrive:** P4, P5, P6, P7, G3. A changed map stales only itself.
7. **Before a store page:** C11, C12, C10.

## 7. The owner's answers (2026-11-10)

1. **Hard stays very hard.** "Hard is supposed to be very hard." **P2 is dropped.** P3 stays, because a map that is harder on Normal than on Hard is a bug under that rule too. The perfect bot needing replays on Hard is accepted.
2. **P5 confirmed:** mirrors, timing platforms, the tide and cars each get a second required use.
3. **The large refactors: the owner asked for my recommendation. It is AFTER release**, with two small exceptions. The reasons:
   - C1, C3 and C4 change no behaviour a player can see, and each touches the code most likely to break something the owner has already played and approved.
   - Each one stales all 68 maps, and a refactor of `updateEnemy` has to match every route bit for bit, so it is slow, careful work for no change in the product.
   - The code is not blocking anything now. It is long, not tangled: tests hold it and new work still lands.
   - The right moment already exists: `design/ENGINE_PROJECT.md` (Project 2) starts by pulling the engine apart. C1, C2, C5 and C6 are its first steps, done once, with a shipped game as the reference to compare against.

   **Before release, do only these:**
   - **C7** (shrink `AGENTS.md`) and **C8** (archive one-task tools): docs and tools, no evidence staled, and every session gets cheaper.
   - **C2 as a test only:** a catalogue of event names in `tests/`, checked against what `src` emits and what audio, captions and stats consume. It catches a silent or uncaptioned event without touching `src`.
   - **C11** (the 8.2 ms step), because a player can feel it.

   **After release (or as Project 2's opening):** C1, C3, C4, C5, C6, C9, C10.

   **What would change this:** a second programmer joining before release, or a bug that takes more than a session to find because of `updateEnemy` or `main.js`. Either one makes C1 or C3 worth doing first.

## 8. The order, revised by those answers

1. No-stale work now: C7, C8, C2 (test only).
2. One visual batch: G1, G4, G5, G7, G2.
3. One play batch: P1, P3, P8, C11.
4. One regeneration (a Chrome job, the owner's named yes), then G6.
5. Content as play reports arrive: P5, P4, P6, P7, G3.
6. Before a store page: C12.
7. After release: C1, C3, C4, C5, C6, C9, C10.
