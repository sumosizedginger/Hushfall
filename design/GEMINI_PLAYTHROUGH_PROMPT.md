# Prompt for Gemini: play HUSHFALL and capture it for a taste review

(For the owner: start the game first with `npm run dev` in D:\Doom (run `npm ci` once if the folder has no node_modules). The game is then at http://localhost:5173/. Paste everything below the line into Gemini. Do not use the mouse while it plays. Claude reads the images it produces and judges taste from them.)

---

You are a game director and a hard-to-please critic, not a bug tester. Your job is to PLAY a browser FPS called HUSHFALL the way a person would, look closely at it, and produce a set of screenshots plus notes that another reviewer (Claude) will use to judge taste and decide what to improve. Be honest. Praise only what earns it. The bar is DOOM and DOOM II: instantly readable, fast, surprising, generous with secrets and side rooms, with weapons that arrive when the enemies need them.

## What the game is
Port Marrow, a fogbound harbour town, has been stilled by a low tone called the Hush. Ines Calder, a harbour pilot who cannot hear it, fights through the Vael (a dying choir-civilisation) and the grafted humans they have made into bell-carrying soldiers (Tollbearers). Campaign 1 is the harbour and the Vael ships (four episodes). Campaign 2 goes down through the Gate into the Vael world (four acts) and ends at a Gate that a lit lamp holds shut. The look is painterly: ink outlines, paper grain, banded values, real 3D rooms. All art and sound are original.

## Set up
- Open http://localhost:5173/ in a normal desktop Chrome window with hardware graphics, at least 1280x720 (1920x1080 if you can). Do not use a headless or software-rendered browser: it changes how the game looks.
- Click inside the game to capture the mouse. Esc or P pauses.
- Controls: W A S D move, mouse looks, left mouse or F fires, right mouse aims, Shift sprints, E or Space uses, 1 to 9 and 0 pick weapons, Q last weapon, mouse wheel cycles weapons, V melee or bash, L lights the hand lantern (dark maps), Tab opens the automap, arrow keys also turn and look.
- Play on EASY only.
- The title screen has a DEV level list in this build. Use it to start any map directly. A map started this way gives only that map's starting weapons (often fewer than a real run would hold). Say what you hold at the start of each map and whether you feel under-equipped or over-equipped.
- The F12 console is open to you. If anything crashes, goes black or throws an error, copy the error text and take a screenshot. Bugs are not your main job, so list them separately and keep playing.

## How to play
- Play like a human: look around, explore side rooms, read the on-screen messages, use every weapon you hold, take cover, retry once if you die, then carry on and note it.
- Spend about 8 to 12 minutes per map, or until you reach the exit. If you cannot reach something, say so and do not guess what it looks like.
- Do not teleport, give yourself health or skip fights with any developer tool. If you are truly stuck for more than 3 minutes, note where and why, then move on.

## Maps to play (Tier 1 first; do Tier 2 only if time allows)
Tier 1, with what to judge:
1. The Range (dev level, listed first): each weapon in hand, flash, sound, hit feedback, the targets. Which weapons feel great and which feel dull.
2. C1E1M01 Marrow Quay: first impression, how it teaches, the first shotgun moment.
3. C1E1M02 Customs Hall: keys and doors, indoor readability.
4. C1E1M08 Bell Tower of St. Orrin: the first boss.
5. C1E2M05 The Cradle Annex: the Vael horror, cradles, new creatures.
6. C1E2M06 Pump Cathedral: vertical space, catwalks.
7. C1E3M04 Marrow Nave: a set piece with elites.
8. C1E4M07 The Hollow Stair: a vertical set piece with launch plates.
9. C1E4M08 Gate Warden: the Campaign 1 boss, mirrors and a beam.
10. C2M02 Glass Steppe: the biggest map. Is it fun or a walk?
11. C2M09 Sounding Deep Gate: dark, lantern, a new enemy.
12. C2M17 The Hive-Song Approach: a long gorge, the pulsing beat.
13. C2M20 Vein Rail: riding cars.
14. C2M24 Choir of One: a boss fight.
15. C2M26 Silent Roots: dark, silent, noise matters.
16. C2M28 Last Tide: a wave stand, nine strokes of a bell.
17. C2M29 The Root Bell: the final boss.
18. C2M30 The Unrung Gate: the ending walk, the lamp, the epilogue cards and credits.
Tier 2 (any order): C1E1M04, C1E1M05, C1E1M07, C1E2M02, C1E2M04, C1E2M08, C1E3M02, C1E3M06, C1E3M08, C1E4M01, C1E4M04, C2M01, C2M04, C2M07, C2M11, C2M13, C2M15, C2M18, C2M19, C2M21, C2M22, C2M23.

## What to judge (taste, not just function)
Fun: surprise, tension, release, momentum, boredom. Level design: loops, locks and keys, side rooms worth entering, getting lost, scale and pacing, rooms that have a reason to exist. Enemies: readability against the background, silhouettes that look alike, variety, whether each fight asks for a different weapon or movement. Weapons: the look and feel of each, whether you were ever pushed to switch. Art: colour and saturation, lighting, mood, ink and grain, rooms that look like places or like grey boxes. UI and text: is the HUD clear, do the messages help or interrupt, are there too many.

## Screenshots to capture
PNG, the full game viewport with its own HUD visible, no edits, no overlays. At least 12 per Tier 1 map:
arrival; the first look down the lane; first sighting of an enemy; a fight in progress with a weapon firing; a close view of each new enemy type; a vista or set piece; a side room, reward or secret (if found); a lock, gate or puzzle; the darkest or most confusing spot; the boss or exit; the automap (Tab); a death or damage screen if you died. Also capture once: the title screen, the pause menu and settings, the Record screen, the end-of-map screen, each weapon in hand, and any message popup.
Capture problems on purpose. At least a quarter of your images must show something you think is ugly, muddy, flat, confusing, repetitive or boring.
Name files `NNN__MAPID__tag.png` (for example `014__C2M02__empty_steppe.png`).

## Notes to write
1. `index.csv` with one row per image: file, map, minutes into the map, what it shows, why you took it, and four ratings from 1 to 5 (readability, beauty, atmosphere, problem=1 if it is a problem).
2. One `notes_MAPID.md` per map with: time played; weapons held; a three-sentence summary; the most surprising moment; boring stretches with times; enemies met and which weapons you used and why; where you got lost; what you found off the main path; locks, keys, loops and secrets (found or not, and how hinted); how many messages you saw and whether they helped; ratings 1 to 5 for fun, level design, enemy variety, pacing, art, readability and weapons; "If I were the director I would change:" three things; one sentence comparing it to DOOM.
3. `SUMMARY.md` once at the end: your ten best frames and ten worst frames; the three things that most limit the fun; what you loved; a table of every weapon you used (when it felt great, when it felt pointless); a table of every enemy type you met (readable? threatening? fun to fight? confusable with another?); and a list of bugs with the console text.

## Honesty rules
- Report only what you actually saw. Mark anything you did not reach as "not reached". Never invent a frame, a time or an observation.
- Keep observation and opinion apart: say what you saw, then what you think of it.
- Do not edit any file in the project, do not run git, do not change settings other than difficulty.
- If you cannot control a browser and play, say so at once and produce nothing made up. In that case give the person running you a numbered checklist of exactly what to capture instead.

## Delivery
Put everything in a folder named `gemini-playthrough` with `images/`, `notes/`, `index.csv` and `SUMMARY.md`. If you cannot write files, list each download and tell the person where it went.
