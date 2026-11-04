# RELEASE QUALITY PLAN (PT-083, 2026-11-03)

The plan to take every category of the cold review from where it stands (5 to 7 of 10) to 8 or 9, and to finish the game so the owner and a friend can play it. Phases 1 to 13 are built as far as a machine can take them (branch `finish`, not pushed); the marks below say what is done, what is only partly done and what was dropped. Nobody has played it: phase 14 is theirs.

## 0. How to use this file

- Work the phases in order. An item is done when its "done when" holds and it is committed with a test that fails without it.
- When resuming cold: read section 1 (the owner's decisions), section 2 (the scorecard), section 3 (the rules), then the first unticked item in section 4.
- Tick an item by writing its commit hash after it. Do not delete items; strike a dropped one through and say why.

## 1. The owner's decisions (2026-11-03)

- HUSHFALL is an old-school retro shooter with its own flavour, NOT a copy of Doom. These stay exactly as they are:
  - the sprint lowers the gun (no firing while sprinting);
  - aiming down the sights slows you;
  - spread grows when you move;
  - parry, ammunition loads and weapon mods.
- Ammunition scales with difficulty: more on Easy, less on Hard. That already holds for box size (1.5 / 1 / 0.8, `world.js` pickup code). This plan extends it to the drop rules (D1).
- Combat and movement are good. The mouse lag must be fixed.
- The owner and a friend play once the game is DONE. Human play is the last gate before release (phase 14), not a step inside the build. Status COMPLETE comes only from their recorded review.
- The target: every category at 8 or better.

## 2. The scorecard

"Now" is the cold review of 2026-11-03 at commit 10bf82a, revised after the owner's decisions above. One correction to that review: the field of view default (70) is the VERTICAL angle three.js uses, which is about 102 degrees horizontal at 16:9. That is wide, not narrow. The fix is the label (C4), not the value.

| # | Category | Now | Target | Done when (machine) | Judged in play |
|---|---|---|---|---|---|
| 1 | Core gameplay loop | 7 | 8–9 | phases 3, 5, 7 done | yes |
| 2 | Controls | 5 | 9 | C1–C6 tests; the real page moves the camera in the same frame as the mouse (B1) | yes |
| 3 | Camera | 6 | 8 | C4, C5; reduced motion covers every camera motion (test) | no |
| 4 | Art | 6 | 8 | R1–R6; every map's capture over the contrast floor (R2) | owner's eye |
| 5 | Feel (juice) | 5 | 8–9 | J1–J6; the coverage test (every gun x fire / hit / kill / overkill has a picture and a sound) | yes |
| 6 | Audio and music | 5 | 8 | A1–A5; `audio-qa` green for every sound and theme; loudness inside its bands | owner's ears |
| 7 | UI/UX and onboarding | 5 | 8 | U1–U7; the HUD probe clean at nine window sizes (B1) | the friend's first hour |
| 8 | Levels and pacing | 5 | 8 | every main map meets the floors in L0 or carries a written exception | yes |
| 9 | Difficulty and balance | 5 | 8 | D1–D4; every gate green on all three difficulties; the curve report has no unexplained spike | yes |
| 10 | Performance | 6 | 8 | worst simulation tick under 4 ms; frame targets met on two real machines; Firefox runs | play log |
| 11 | Code quality | 6 | 8 | K1–K5 tests; route fingerprints identical | no |
| 12 | Stability | 7 | 9 | the regeneration green 68 of 68; S1–S4 | yes |
| 13 | Accessibility | 7 | 9 | X1–X6; the guidelines checklist ticked | no |
| 14 | Replayability | 7 | 8–9 | Y1–Y5 | yes |
| 15 | Overall polish | 5 | 8 | everything above plus the sweep (phase 13) | yes |

Corrections to the cold review, found while building this: (1) the field of view (above); (2) hit marks and hit sounds already existed, so J1 added the kill mark, the tick and the setting and not the whole thing; (3) the HUD's text was less tiny than the review's contact sheet made it look; (4) creatures already moved when idle, and guns already had layers and reverb; (5) the simulation's "10 ms" worst ticks were mostly the route bot's own path searches.

A plan cannot promise a score. These are the conditions under which a cold reviewer would score each category 8 or better; the owner's and the friend's play decides whether it is true.

## 3. Rules for this work

- **The simulation changes only where an item names it** (D1, D2, the U5 checkpoints, L work). Everything else must leave every route identical, proved by `node tools/dev/route-fingerprint.mjs check` against a baseline saved before the item.
- **One regeneration.** Any edit to `src`, `index.html`, `vite.config.js`, `package-lock.json` or `assets/baked` stales every map's real-game evidence. All of them land before the one regeneration in phase 13, and a second one follows the play round.
- **Browser jobs come in named windows.** Each window needs the owner's explicit yes in chat; nothing else touches Chrome.
  - B1, after phases 1 and 6: the controls probe, the HUD at nine sizes, the pad probe.
  - B2, before and after phase 8: a capture sheet of every map and every creature at 1080p, plus the feel frames of phase 3.
  - B3: `npm run audio-qa`.
  - B4: Firefox smoke, the 60-minute soak, the performance probes.
  - B5: the regeneration (phase 13).
  - B6: the regeneration after the play round.

  Every launcher refuses the pointer lock and prints the count (must be 0).
- One commit per item. Run the whole suite before calling a phase done (the lesson of PT-082: a tool that read the wrong field passed failures for a day).
- No sub-agents; numbers over pictures; at most about six images per job (the low-usage protocol).

## 4. The phases

### Phase 1. Controls and camera (Controls 5 to 9, Camera 6 to 8)

- [x] **C1 Mouse look at draw time.** (454f8ef; proved in the real page in window B1: the camera holds all of the mouse on every frame, worst 5e-14 degrees, while the simulation trails by up to 1.76)
  - The problem: mouse movement collects in `input.yaw` / `input.pitch` (`src/engine/input.js` `addMouse`). The simulation applies it once a tick (`world.js` `step`, `p.yaw += cmd.yaw`). The camera then draws a blend of the last two ticks (`view.js` `render`, `lerp(pp.yaw, p.yaw, alpha)`), so the view trails the hand by up to a tick.
  - Fix: `render` takes the look not yet used by the simulation and draws yaw = `p.yaw + pending`, pitch = clamp(`p.pitch + pending`) with no blend of the angle (position keeps its blend).
  - Shots still go where the player looks: the tick applies the pending look before it fires.
  - The pad's stick look goes through the same collection, so one change covers it.
  - Test: a stand-in GameView with a mouse movement and no tick turns the camera by exactly that amount in the same frame. Fingerprints identical.
- [x] **C2 Raw mouse.** Ask for the lock with `{ unadjustedMovement: true }` (no system acceleration) and fall back to a plain lock where it is refused (Firefox, Safari). A setting "Raw mouse input", on by default. `lockpolicy.js` still refuses in a driven browser. (454f8ef; proved in the real page in window B1: the camera holds all of the mouse on every frame, worst 5e-14 degrees, while the simulation trails by up to 1.76)
- [x] **C3 Mouse options.** (454f8ef; proved in the real page in window B1: the camera holds all of the mouse on every frame, worst 5e-14 degrees, while the simulation trails by up to 1.76)
  - Invert Y for the mouse (the pad has one).
  - A sights-sensitivity slider (today the automatic `adsSensScale`).
  - A number box beside the sensitivity slider.
- [x] **C4 Field of view, labelled.** The setting is vertical degrees. Show "70° (102° across)" from the window's aspect. `probe-viewports` checks 21:9. (454f8ef; proved in the real page in window B1: the camera holds all of the mouse on every frame, worst 5e-14 degrees, while the simulation trails by up to 1.76)
- [x] **C5 Head bob and motion.** (454f8ef; proved in the real page in window B1: the camera holds all of the mouse on every frame, worst 5e-14 degrees, while the simulation trails by up to 1.76)
  - A head-bob setting: full / gentle / off.
  - Reduced motion also turns off the bob, the sprint and air widening of the view, and the weapon sway.
  - A test lists every camera motion and asserts reduced motion covers it.
- [x] **C6 Fire between ticks.** A test: a click that lands between two ticks fires on the next tick (the tap latch), at any frame rate from 30 to 240. (454f8ef; proved in the real page in window B1: the camera holds all of the mouse on every frame, worst 5e-14 degrees, while the simulation trails by up to 1.76)

### Phase 2. Code health, mechanical (Code 6 to 8)

Done early, so that every later change is made on readable code. Every item leaves behaviour identical: fingerprints on every map, the whole suite, `tests/frame-loop.test.js`.

- [x] **K1 Formatting.** (97ca145)
  - Prettier (a pinned dev dependency) at print width 160 over `src/` and `tools/`.
  - Trailing comments longer than the limit move to their own line above (a script).
  - A test holds `src` lines to 180 characters.
- [x] **K2 Split `world.js` by system.** (88ce74d, 7e629e0)
  - New modules: `player.js` (movement, stance, firing), `enemies.js` (`updateEnemy` and the brain glue), `projectiles.js`, `pickups.js`, the trigger hooks.
  - `step()` becomes the ordered list of calls, under 80 lines.
  - A test holds every engine function under 150 lines, with a named exception list that may only shrink.
- [x] **K3 Shell state.** `main.js`'s single object `g` becomes named parts (session, input, screens, timing) with no behaviour change. (88ce74d)
- [x] **K4 History out of the code.** (97ca145)
  - The `PT-xxx` tags and owner quotes in comments move to `design/history/CODE_NOTES.md`, keyed by file and function.
  - The code keeps a one-line why.
- [x] **K5 Lint and types.** (88ce74d)
  - ESLint (pinned; no-undef, no-unused-vars, no-shadow of globals) as a test.
  - `tsc --checkJs --noEmit` on the pure engine modules with JSDoc types, as a test.
  - `ARCHITECTURE.md` updated to the new files.

### Phase 3. Combat feel (Feel 5 to 8–9)

Drawing and sound only; the simulation already emits what is needed (`dmg`, `enemy_hit`, `enemy_died` with the gun, `hurt` with its direction).

- [x] **J1 Hit and kill confirmation.** (dac7966)
  - A crosshair tick on every blow the player lands, stronger for a head-zone hit (carbine), a distinct mark on a kill.
  - A quiet sound tick pitched by damage.
  - A setting to turn it off.
- [x] **J2 Hit reactions.** A drawn flinch from the hit's direction on every humanoid rig, and a stagger pose when the simulation's poise breaks. The joint smoothing (`inertializer`) keeps it from snapping. (dac7966)
- [x] **J3 Deaths.** (dac7966)
  - The body falls away from the killing blow.
  - OVERKILL: a blast, harpoon, axe, saw or mortar kill beyond a threshold breaks the rig into its own parts as debris, with decals, capped in number.
  - A setting "gore: full / reduced" (it also helps the age rating).
- [x] **J4 Impacts by surface.** Sparks on metal, chips on stone, splinters on wood, a splash in water, spatter on Vael tissue. Each is a particle burst, a decal and a sound, chosen from the floor and wall families of `floorscatter.js`. (dac7966)
- [x] **J5 Gun feel per weapon.** (dac7966)
  - A recoil curve (kick and recover).
  - A muzzle flash shape of its own.
  - Ejected shells and casings (scattergun shells, rivet pins, carbine cases) as instanced debris.
  - The pump and the reload visible; the tables in `weapon-pose.js`.
- [x] **J6 Coverage tests.** (dac7966)
  - Every gun has a picture and a sound for fire, hit, kill and overkill.
  - Every attacking creature has a tell (glint and sound) for every attack.
  - Both tests enumerate `WEAPONS` and `ENEMIES`, so a new one fails until it has its parts.

### Phase 4. Audio (Audio 5 to 8)

All synthesized, as the rules say.

- [x] **A1 Weapon voices.** (dac7966; measured by audio-qa, not yet heard by a person)
  - Each gun built in layers: a transient crack, a body, a low thump, a tail.
  - Distance filtering and a room tail.
  - No two guns alike: B3 measures each pair's spectrum.
- [x] **A2 Place reverb.** (dac7966; measured by audio-qa, not yet heard by a person)
  - Impulse responses synthesized per place family: hall, cave, open air, metal hull, the dead air of vacuum.
  - A convolver on the effects bus, the wet level from the place's look.
- [x] **A3 The mix.** (dac7966; measured by audio-qa, not yet heard by a person)
  - Priority ducking: creature tells and the player's hurt over the music; the music under messages and big blasts.
  - Loudness targets per family from `design/AUDIO_LOUDNESS.md`.
  - A limiter on the master.
- [x] **A4 The small sounds.** The J1 ticks, footsteps per floor family, landing, sprint breath, the empty click. (dac7966; measured by audio-qa, not yet heard by a person)
- [x] **A5 Music.** (b8bfa82; audio-qa measures all eight themes at four levels through the real player, 218 sounds pass; `score-preview.mjs` renders them for the owner)
  - Every theme measured by `audio-qa`.
  - A preview of each theme's calm, noticed, fighting and overwhelmed levels for the owner's ears (`score-preview.mjs`).

### Phase 5. Difficulty (Difficulty 5 to 8)

- [x] **D1 Drop rules per difficulty.** (b46009a, aaaf4ca: Easy 1.3x / 3 / 1.4, Normal 1x / 5 / 1, Hard 0.75x / 8 / 0.85 (pull as a share of 3.2 m; 2 m starved the bot); Hard keeps a slack gate of its own, 1.15x per type and 1.2x in all)
  - `DIFFICULTY` gains a drop chance, the dry-kill count before a guaranteed drop, and the pull distance. First guesses: Easy 1.3x / 3 / 4.5 m, Normal 1x / 5 / 3.2 m, Hard 0.75x / 8 / 2 m.
  - Box size stays 1.5 / 1 / 0.8.
  - The difficulty text (`difficulty.js`) computes the new facts.
  - Every map's gates re-run on all three difficulties.
- [x] **D2 Placement by difficulty.** (b46009a, b8bfa82: sidecars `maps-src/skill/<ID>.json`; a quarter more on Hard and about one in seven left out on Easy where the gates allow, less where they do not, none on boss maps)
  - An entity may say `skill: 'normal'` (Normal and Hard) or `skill: 'hard'` (Hard only), and the world leaves out what the difficulty excludes.
  - A map with no tags is unchanged: fingerprints prove it.
  - Each main map gets Hard extras (a first guess: 20 to 30% more creatures, more of them ranged or elite) and loses some on Easy (about 15%), placed by a `tune-roster`-style search against the gates.
- [~] **D3 The campaign curve.** (PARTLY: the report is `tools/dev/curve-report.mjs` and `design/DIFFICULTY_CURVE.md`; it reads the evidence, so it is written from the final regeneration)
  - A report of the bot's damage taken, deaths and ammunition slack per map and difficulty.
  - It flags a map more than 1.5x its neighbours and long stretches with nothing to fear; each flagged map is fixed or given a written reason.
- [x] **D4 Bosses.** Every boss phase readable, its damage windows timed, its bot runs green on every difficulty. (0b0e25d: tests/bosses-pt083.test.js; every boss has a map, a windup of at least half a second, a stagger or window, and the gates hold each on all three difficulties)
- [-] ~~**D5 (nice-to-have) A fourth tier** in the game's own voice: Hard's placements, quicker brains, no guaranteed drop.~~ (DROPPED: the tables and the gates are keyed by three difficulties; a fourth would multiply every gate for a nice-to-have. New Game+ (Y4) gives the same kind of second run)

### Phase 6. Onboarding and UI (UI 5 to 8)

- [x] **U1 The training yard.** (750bb45)
  - A shipped, optional map, not one of the 68 and not counted by status.
  - Ten stations, each taught by doing: moving and the sprint trade-off; the sights; the scattergun's interrupt; melee and the parry; the arc's charge; a load; the lamp; the wheel; the Journal.
  - Offered from the title and before the first map of a new game; skippable; its completion remembered.
  - Built from the Range's pieces with the dev-only parts left out.
- [x] **U2 First-time prompts in the campaign.** (750bb45)
  - When a system first matters (the first load picked up, the first blow that can be parried, the first dark room, the first charge gun), one line with the player's own key, shown once.
  - The same line goes into the Journal's item help.
- [x] **U3 The HUD.** (750bb45; probe-hud clean at nine sizes in B1, 1024x600 to 3440x1440)
  - Text sized by the window's height: the objective at least 16 px at 1080p.
  - The weapon strip as icons with ammunition bars.
  - The load and lamp readouts together in one corner.
  - `probe-hud` at 1280x720 up to 3440x1440 (B1): nothing overlaps, nothing below its minimum size.
- [x] **U4 Settings in tabs:** Controls, Mouse and pad, Video, Audio, Accessibility, Gameplay, each with its own "defaults" button. (750bb45)
- [x] **U5 Death and retry.** (750bb45)
  - An automatic checkpoint at each gate opened, key taken and boss phase; a separate save slot.
  - Retry from it in under 3 seconds.
  - A setting keeps the old "restart the level" behaviour.
  - The checkpoint is a save, so the simulation is untouched.
- [x] **U6 Map select.** Title, then Campaign, then a list of finished maps with best rank, time and secrets per difficulty. Also serves Y1. (750bb45)
- [x] **U7 Text pass on every screen.** No development wording or placeholders; a test searches `index.html` and `src/game` for the markers. (750bb45)

### Phase 7. Levels and pacing (Levels 5 to 8)

- [x] **L0 The floors.** Written into `tools/dev/director-audit.mjs --laws` and the ratchet (`design/director-floor.json`). Every main map meets them or carries a written reason in its source (boss, set piece, the silent walk): (0acff62, b2f14d8: tools/dev/floors.mjs, design/level-floors.json, tests/level-floors.test.js. 20 of 62 maps miss a floor with a written reason; several of those reasons are simply that the bot gates refused more creatures: that is a limit of the gates and a person may disagree)
  - at least one loop;
  - the first fight within 60 s of bot time;
  - the longest walk with nothing awake under 90 m (`quiet-walks.mjs`);
  - mirror overlap under 0.9 (10 main maps are over it today);
  - at least 18 creatures per thousand walkable cells (Campaign 2's median is 16);
  - two secrets of two kinds;
  - at least one gate beyond walking to the exit, and a key hunt on at least a third of the main maps (10 of 62 today);
  - one named moment (an ambush, a set piece, a view) in the map's brief.
- [x] **L1 The fun pass's leftovers** (`design/FUN_CHECK.md` section 8): Nerve Cathedral's lattice, Silent Roots, the Reprise's second secret, the Hive-Song Approach's loop and length, the Pulse Foundry's size, the Unrung Gate. (each is in the floors with a reason, or in FUN_CHECK section 8; the Reprise keeps one secret, the Nerve Cathedral its lattice)
- [x] **L2 Every main map that fails L0,** listed by the audit once the floors are set, brought inside them with `fun-gates.mjs` and the strict per-map tests green. (0acff62, 8a6a0b8, 4813c72, b8bfa82, b2f14d8: bypasses on ten maps, key hunts on 21 of 62, encounter pass, ambushes on seven empty walks)
- [-] ~~**L3 The secret maps.** Each keeps its quiet room (that is its point) and gains an optional challenge wing with a reward worth finding.~~ (DROPPED: four of the six secret maps are silent rooms by design and all six already pay well; combat wings in them would break their point and their gates)
- [x] **L4 The Hard extras and Easy cuts of D2,** map by map. (b8bfa82)

### Phase 8. Art (Art 6 to 8)

First run window B2 for the current pictures: the newest captures on disk (2026-10-31) predate the PT-079 and PT-080 shield, beam and dressing changes. Judge them, then work.

- [x] **R1 The held guns.** (ea61e8d: brass and enamel repainted darker and weathered, the flare cannon's toy yellow is signal orange)
  - A material and silhouette pass on all ten guns and the six melee weapons: worn paint over metal and wood, darker values, more shape where the hands are.
  - Judged at 1080p against the world behind them (`recipes_polish.js`, the `models_*` gun rigs).
- [x] **R2 Readability per map.** (ea61e8d, b2f14d8: tools/dev/probe-contrast.mjs; the silhouette's edge stands at least 24 luma from what is behind it on every map, median 34; rim light raised; the Hollow Stair warmed)
  - `tools/look/readability.mjs` over every map's capture: a contrast floor between creatures and what stands behind them.
  - The single-hue places (the Hollow Stair's blue first) get a second light colour and rim light.
- [x] **R3 Life in the object-like creatures** (the vat, reed, seal, anchor, the Grand Cantor, the Root Bell): an idle motion, a state-driven glow, eyes or an aperture that follows the player. (b9dd1ea: a test, every creature moves while it stands still; they already did)
- [x] **R4 Floors.** Confirm the checkerboard shimmer is gone at 480 and 960 wide; fix the filtering where it is not. (ea61e8d)
- [x] **R5 One language for effects.** Muzzle, impacts, rings, shields and beams share the `glowfx.js` materials and colour rules. (b9dd1ea: a test, rings, shields, beams and muzzle flashes share their materials; they already did)
- [x] **R6 Title, menus and loading screen** in the same hand as the game. (0993ef7: the title's scrim had been painted under the picture since the look polish; it now lies over it, so the small menu lines can be read. The owner's eye decides the rest)

### Phase 9. Accessibility (7 to 9)

- [x] **X1 Colour-blind support.** (96c49a3)
  - Tells and outlines carry a shape cue, not colour alone.
  - Three palettes for the hostile and peaceful outlines and the teal, amber and red tells.
  - A table-driven test: no state is told by colour alone.
- [x] **X2 Reduce flashes,** a setting of its own (muzzle, lightning, the hurt flash, beams). (96c49a3)
- [x] **X3 Hold or toggle for every held action** (charge, guard, the saw). (96c49a3)
- [x] **X4 Captions and subtitles:** size and background options, speaker named and coloured. (96c49a3)
- [x] **X5 Every input remappable,** menu keys included. (96c49a3)
- [x] **X6 The checklist.** The Game Accessibility Guidelines, basic and intermediate, each item ticked or given a reason in `design/ACCESSIBILITY.md`. (96c49a3)

### Phase 10. Replayability (7 to 8–9)

- [x] **Y1 Map select with records** (U6), par times shown, best rank per difficulty. (750bb45)
- [x] **Y2 Each difficulty a different run** (D2). (b8bfa82)
- [~] **Y3 Challenges.** (PARTLY: per-map challenges (no damage, every secret, under par) are recorded and shown (750bb45); the challenge wings went with L3)
  - The challenge wings (L3).
  - Per-map challenges (no damage, every secret, under par) recorded in the stats database and shown in map select.
- [x] **Y4 (nice-to-have) New Game+:** guns, mods and upgrades kept, Hard placements. (0b0e25d)
- [x] **Y5 Collectibles counted:** the Record's documents per map and campaign, shown in map select. (750bb45)

### Phase 11. Performance and compatibility (6 to 8)

- [~] **P1 Simulation spikes.** The worst ticks (9.8 ms on Last Tide, 10.5 ms on Nerve Cathedral, measured by `sim-cost.mjs` on Hard) traced and cut under 4 ms. (PARTLY: 0993ef7, tools/dev/step-cost.mjs. The plan's 9.8 and 10.5 ms included the route bot's own path searches. The real step: mean 0.2 to 0.7 ms, worst 3 ms on Nerve Cathedral (was 11), 5.8 on Last Tide (was 7), 4.8 on the Drowned Choir, 8.2 once on the Reprise. Two or three ticks in thirty thousand are still over 4 ms, some of them the collector's; all are well inside the 16.7 ms a tick has)
- [-] ~~**P2 Download size.**~~ (DROPPED: lossless WebP would not halve painted atlases, the build is 9.7 MB and cached after the first load, and lazy loading a campaign adds a failure mode for a small gain)
  - The painted atlases (6 MB of the 9.7 MB build) as WebP if that halves them, with a test that the decoded pixels match within a tolerance.
  - Campaign 2's atlases loaded when Campaign 2 starts.
- [~] **P3 Firefox and Safari.** (PARTLY: NOT RUN: Firefox is not installed on this machine and I did not download a browser without being asked; Safari needs a Mac. The lock falls back when raw input is refused (a test), that is all that is known. To do it: install Firefox and run the game)
  - Boot, the audio unlock, the pointer lock (no raw mode there), saves and the pad.
  - Firefox in B4; Safari on a Mac the owner or the friend has.
- [~] **P4 Real machines.** (PARTLY: needs the owner's and the friend's machines through the opt-in play log; the minimum spec cannot be written before that)
  - The owner's and the friend's machines through the opt-in play log (frame percentiles).
  - The published minimum spec is written from those numbers.
- [~] **P5 Frame targets.** 95th-percentile frame at or under 16.7 ms on the owner's card at width 960; at or under 33 ms on a laptop's integrated graphics at 480. (PARTLY: on the owner's card at 1920x1080 the real page holds 60 fps at widths 960 and 480, 95th percentile 16.8 ms, with every creature awake and hunting (4519f64). No integrated-graphics laptop was available)

### Phase 12. Stability (7 to 9)

- [x] **S1 The page's life.** A hidden tab pauses; resizing, an audio device change and full storage are all handled with a message, never a hang. (0b0e25d)
- [x] **S2 Crash capture** into the play log (kept on the device, exported by the player). (0b0e25d)
- [x] **S3 Saves.** A fixture for every save version this release can meet, loaded by the suite. (b9dd1ea: every save anyone outside can hold is version 10; fixtures from RC1 and from this build)
- [ ] **S4 Soak.** 60 minutes in the real page (B4): no growth in memory, objects or GPU resources.

### Phase 13. The polish sweep and the regeneration

- [ ] **The sweep.** A 1080p capture of every map's vantage points checked against a list: seams, floating props, clipping, z-fighting, stretched textures, placeholder text, typos. Each find fixed.
- [ ] **The regeneration** (B5) from a clean commit: `npm run regen`. The browser check, every map's real-game run, `verify-map` x68, validate and the whole suite: AGENT_VERIFIED 68 of 68.
- [ ] **The scorecard (section 2)** re-scored cold, with the evidence for each line.

**THE GAME IS DONE** when phases 1 to 13 are ticked. That is the build the owner and the friend play.

### Phase 14. The owner and a friend play

- [ ] **The kit.** The play log on, the five questions after each map, the export file, and a one-page brief from `design/store/TESTERS.md`.
- [ ] **Triage.** Every report checked against the game before it is fixed (`PLAYTEST_NOTES.md`), then a fix round and the second regeneration (B6).
- [ ] **COMPLETE** recorded per map from their review, never by an agent.

### Phase 15. Release (workstream M of `design/COMMERCIAL_AND_USAGE_PLAN.md`; most of it is the owner's)

- [ ] Name clearance, price, the store page and its copy.
- [ ] The age rating answers updated for J3.
- [ ] The web build (`npm run package`).
- [ ] The desktop wrapper's installers and signing (`tools/desktop`).
- [ ] The trailer and store pictures made again after the art pass.
- [ ] The push, on the owner's word.

## 5. Order and size

| Phase | Size | Why here |
|---|---|---|
| 1 Controls and camera | S–M | The biggest complaint; small. |
| 2 Code health | M–L | Mechanical. Done first so every later change is cheaper and safer. |
| 3 Feel | M–L | The largest score gain after the mouse. |
| 4 Audio | M | Pairs with feel (the confirmation sounds). |
| 5 Difficulty | M–L | Placements are map work; they come before the level phase so each map is touched once. |
| 6 Onboarding and UI | M–L | Keeping every system means teaching them. |
| 7 Levels | L | The longest; uses the floors and the D2 tags. |
| 8 Art | L | After B2 shows the current state. |
| 9 Accessibility | M | |
| 10 Replayability | M | Mostly rides on U6, D2 and L3. |
| 11 Performance and compatibility | M | Needs B4 and real machines. |
| 12 Stability | S–M | |
| 13 Sweep and regeneration | M | Last, once nothing in the source sets moves. |
| 14 Play | the owner and a friend | |
| 15 Release | the owner, with M work | |

## 6. What this plan does not change

- The movement and gun rules of section 1.
- The 68-map target.
- The synthesized-only audio and p5-baked-only art.
- The fixed-step deterministic simulation.
- The rule that only the owner's recorded play makes a map COMPLETE.
