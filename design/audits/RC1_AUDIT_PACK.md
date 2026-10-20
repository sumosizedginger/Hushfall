# HUSHFALL release candidate 1: the audit pack for outside agents and testers

PT-066 (R16 of the Director's Plan). Hand this file, the repository (or a zip of it without `node_modules`), and one of the two prompts it names to an outside agent or a human tester. It says what they are looking at, how to get a clean copy running, what is deliberately unfinished, what to report and in what shape. Nothing in this pack is an instruction to the builder: what comes back is read, rated and triaged by the builder (`design/audits/README.md`).

## 1. What this is

HUSHFALL is an original browser first-person shooter in the old-school tradition: Campaign One (the harbour town of Port Marrow, four episodes, 36 maps) and Campaign Two (the descent, four acts, 32 maps). 68 maps, 15 weapons (nine guns and six melee), three ammunition loads and six weapon mods, 21 kinds of creature (seven of them bosses) plus six kinds of shield node and one peaceful people (counted by `node tools/dev/store-facts.mjs`). It is built with Three.js and Vite; every picture is baked from p5.js recipes and every sound is synthesised in the browser. It is a RELEASE CANDIDATE for the builder's own purposes, not a shipped product: the commercial list (name search, licence holder, store assets, an outside playtest) is still open.

## 2. A clean copy

```bash
npm ci
npm run build          # production build to dist/ (the test hook is compiled out)
npm run dev            # development server, the game at http://localhost:5173/ (this build has window.__GAME_TEST__ and a DEV level picker on the title screen)
```

Use a desktop Chrome or Edge window with hardware graphics, at least 1280 x 720. A headless or software-rendered browser changes the look and the speed. Controls are in the pause menu; Esc or P pauses; Tab opens the Journal; L lights the hand lantern in dark maps; T turns the gun to its next ammunition load; the weapon wheel is the last-weapon key held. A controller (PS5 or Xbox) works; `http://localhost:5173/pad.html` is the controller test page.

Checks the builder ran, so you do not repeat them: `npm test` (about 1,300 tests; `tests/maps.test.js` plays the gates of every map), `npm run licences`, `npm run check-dist`, `npm run audio-qa` (203 sounds and the music pass objective checks). Evidence under `validation/` is regenerated for RC1.

## 3. What is NOT done on purpose (do not report these as findings)

- **Nothing here has been played to the end by a person** except what the builder's playtest notes (`PLAYTEST_NOTES.md`) record map by map; the numbers (damage, tell lengths, ammunition) are first guesses.
- The commercial items: the name, the licence holder (`LICENSE` is a proprietary draft), store art, a credits roll, a Steam page.
- Painted cinematics beyond one plate: the story scenes are in-engine camera moves with a line or two of text (`src/game/scenes.js`), skippable, played once.
- A second half of the bot (cover use, retreat to a lock): the gates judge a map against a standing and a strafing fighter only.
- Mouse, keyboard and controller rebinding are built; full accessibility (a colour-blind set, subtitles for sounds) is not.
- Performance on weak hardware: `design/PERFORMANCE_PLAN.md` records what is known and the minimum spec the builder believes in; the fallback quality tiers are designed, not built.

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
