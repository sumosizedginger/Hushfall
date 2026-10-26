# HUSHFALL release candidate 2 (the freeze, tag `rc2`): the audit pack for outside agents and testers

*Updated 2026-10-25 for `rc2`: the freeze list (`design/FREEZE_LIST.md`) is done, the evidence was regenerated once more from one clean commit, and the sections below say what changed. The file keeps its old name because the pack tooling and the prompts refer to it.*

PT-066 (R16 of the Director's Plan). Hand this file, the repository (or a zip of it without `node_modules`), and one of the two prompts it names to an outside agent or a human tester. It says what they are looking at, how to get a clean copy running, what is deliberately unfinished, what to report and in what shape. Nothing in this pack is an instruction to the builder: what comes back is read, rated and triaged by the builder (`design/audits/README.md`).

## 1. What this is

HUSHFALL is an original browser first-person shooter in the old-school tradition: Campaign One (the harbour town of Port Marrow, four episodes, 36 maps) and Campaign Two (the descent, four acts, 32 maps). 68 maps, 15 weapons (nine guns and six melee), three ammunition loads and six weapon mods, 21 kinds of creature (seven of them bosses) plus six kinds of shield node and one peaceful people (counted by `node tools/dev/store-facts.mjs`). It is built with Three.js and Vite; every picture is baked from p5.js recipes and every sound is synthesised in the browser. It is a RELEASE CANDIDATE for the builder's own purposes, not a shipped product. Since RC1 the road to a first public page has been built (accessibility settings, an automatic render-width fallback, an opt-in play log, a credits roll, packaging into a web zip, store copy and pictures, the licence holder named in `LICENSE`); what is still open is the owner's part: an outside playtest, the legal clearance of the name (a free web search found no game called HUSHFALL; the trademark search proper is the owner's, `design/store/FREE_PATH.md`), accounts and a price.

## 2. A clean copy

```bash
npm ci
npm run build          # production build to dist/ (the test hook is compiled out)
npm run dev            # development server, the game at http://localhost:5173/ (this build has window.__GAME_TEST__ and a DEV level picker on the title screen)
```

Use a desktop Chrome or Edge window with hardware graphics, at least 1280 x 720. A headless or software-rendered browser changes the look and the speed. Controls are in the pause menu; Esc or P pauses; Tab opens the Journal; L lights the hand lantern in dark maps; T turns the gun to its next ammunition load; the weapon wheel is the last-weapon key held. A controller (PS5 or Xbox) works; `http://localhost:5173/pad.html` is the controller test page.

Checks the builder ran, so you do not repeat them: `npm test` (1,488 tests, all passing; `tests/maps.test.js` plays the gates of every map and takes the better part of an hour), `npm run licences`, `npm run check-dist`, `npm run audio-qa` (203 sounds and the music pass objective checks). Evidence under `validation/` was regenerated for the last time on 2026-10-25, after the outside round 1 fixes (`design/audits/ROUND1_TRIAGE.md`) and the whole freeze list, from one clean commit (e59a47e) by `npm run regen`: the shared browser check (146 of 146 checks, no page errors), the real-game run of every map (68 of 68, every check passed), `verify-map` for all 68, `validate` OK, the whole suite (1,488 of 1,488), derived status AGENT_VERIFIED 68 of 68 and COMPLETE 0 of 68 (only a recorded human review awards COMPLETE, and none has been recorded). All of that is a machine reading the game, not a person playing it.

## 3. What is NOT done on purpose (do not report these as findings)

- **Nothing here has been played to the end by a person** except what the builder's playtest notes (`PLAYTEST_NOTES.md`) record map by map; the numbers (damage, tell lengths, ammunition) are first guesses.
- The commercial items that are the owner's: the legal clearance of the name, the price, the store accounts, a Steam page and a shipping desktop build (a prototype Electron wrapper exists in `tools/desktop`; its README says what it does not do). `LICENSE` is a proprietary licence naming the holder; whether AI-written material can be copyrighted is an open legal question (`design/store/AI_DISCLOSURE.md`). The credits roll is built; its list of people is the owner's and is empty, so only the "made with" lines show.
- Painted cinematics beyond one plate: the story scenes are in-engine camera moves with a line or two of text (`src/game/scenes.js`), skippable, played once. A first-cut trailer (52 s, made from the game's own footage and sound) and a set of store frames exist outside the repository (`design/store/SHOTS.md`); a composed trailer does not.
- A second half of the bot (cover use, retreat to a lock): the gates judge a map against a standing and a strafing fighter only.
- Accessibility is partial on purpose (`design/ACCESSIBILITY.md`): rebinding for mouse, keyboard and pad, text size, reduced motion, captions for the tells, the crosshair, key chips told apart by letters. There is no colour-blind palette for the painted world; threats are also told by shape, motion and sound.
- Performance: `design/PERFORMANCE_PLAN.md` records what is known and the minimum spec the builder believes in. An automatic render-width fallback exists (`src/game/quality.js`) and judges the typical frame; a second rung (the creatures' contact shadows and the floor marks off, then fewer lamps) steps in when the width is already at its floor and the typical frame is still slow; neither rung has been seen on a slow machine. Frame times were measured on the builder's one graphics card, a window-size matrix and a long soak pass, and nobody has run it on weak or integrated graphics.
- Variety of mechanics: eight mechanics appeared in only one map; all eight now return once (conveyors, the noise readout, chimes, the tide, cars, timing platforms, airlocks, vacuum). The last five are OPTIONAL branches with a cache (a skiff across the Pulse Foundry, a lift in the Mirror Array, a service lock and a vacuum closet in the Gatekeeper's Approach, the tide on the Ferry Terminal's quay): `design/MECHANICS_RETURNING.md`. Nobody has played them; a reviewer who finds one dull or hard to find is a data point, not a bug report.
- Painted faces on the creatures were considered and declined with numbers (`design/FREEZE_LIST.md` F10); a heavy ammunition crate (every gun to 60%) lies in thirteen secrets, a new pickup nobody has seen drawn in a hall.

## 4. Choose a job

**A. Break it** (a hostile tester): `design/audits/ATTACK_PROMPT.md` is the prompt. Saves, settings, input, the pause menu, the Journal, the Record, level transitions, the dev hook in a production build (there must be none). The previous two attackers' findings and their fixes are in `design/HARDENING.md`; their scripts and regression tests are in `attack/`.

**B. Play it as a critic** (taste, flow, readability): `design/GEMINI_PLAYTHROUGH_PROMPT.md` is the prompt: play on Easy, 8 to 12 minutes a map, screenshots and honest notes. Useful maps, with what each shows: C1E1M01 Marrow Quay (the first impression), C1E1M08 Bell Tower, C1E2M06 Pump Cathedral (verticality), C1E3M04 Marrow Nave (the Weeping Mother), C1E4M08 Gate Warden (the mirrors), C2M01 Threshold Beach (the cold open and the first scene), C2M02 Glass Steppe, C2M09 Sounding Deep Gate, C2M21 Pulse Foundry, C2M24 Choir of One, C2M29 The Root Bell, C2M30 The Unrung Gate (the ending).

**C. Read it** (a code reviewer): start at `ARCHITECTURE.md`; the rules are in `AGENTS.md`. Look for the hazards listed in its section 7 and for anything that lets the render or the audio write the simulation.

## 5. What to send back

One markdown file per tester, in this shape. A finding without a location and a way to see it again is not a finding.

```
# <agent or tester name>, <date>, <job A, B or C>, <browser and hardware>
## Findings
1. <MAJOR | MINOR | NOTE> <one line>
   Where: <map id and position, or file and line>
   How to see it: <steps, or the exact text of the error>
   What I expected:
## Frames or logs attached: <names>
## What I did not look at:
```

MAJOR is a crash, a black screen, a soft-lock, a lost save, a map that cannot be finished, text a player cannot read, or anything a first-time player would call broken. MINOR is a rough edge. NOTE is taste. Taste is welcome and is weighed against the builder's own look documents (`design/VISUAL_DIRECTION.md`, `design/LOOK_FIRST_REVIEW.md`), not taken as an instruction.

## 6. After it comes back

Findings are merged and rated in a table like `design/HARDENING.md` (what was found, who found it, MAJOR or not, the fix and where it sits). MAJOR items are fixed and held by a test; everything else goes to the work queue in `design/COMMERCIAL_AND_USAGE_PLAN.md`. The outside text stays in `design/audits/`; its images and logs stay out of git.
