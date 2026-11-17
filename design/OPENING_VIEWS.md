# HUSHFALL: compose every level's opening (work orders, written 2026-11-16)

For the next builder. Read `design/VISUAL_AWE_HANDOFF.md` first: its rules and its per-map recipe apply here. The standing rules of `design/OPUS_HANDOFF.md` section 1 apply in full (no browser job without a named yes, commit locally and never push, low usage, no backticks or regexes in shell strings).

## 1. Why

The hero views scored so far are a yardstick, not what a player sees. What every player sees, on every level, is the OPENING: the picture on screen in the first second, standing on the start, facing the way the map faces them. A level that opens on a wall or an empty yard looks unfinished however good its best room is. A level that opens on a tower, a lit doorway or the arena it is about looks designed.

The hand-built maps prove the recipe (Lamplighter Hill, Marrow Nave, Bell Tower, Gate Warden went from the weakest frames to among the strongest). This plan applies the same thinking to the one frame that matters most, on all 68 maps.

## 2. Measured (2026-11-16, node only)

`node tools/dev/opening-views.mjs` measures each opening from the map file: how far the eye runs before a wall straight ahead, how much of the level the picture holds, and whether there is anything to look at (a landmark or skyline piece inside the picture under open sky; a lamp within 24 m inside the picture under a roof).

- **25 of 68 openings meet every floor. 43 have at least one fault.**
- Faces a wall (under 8 m ahead): 10. C1E4M07, C1E4M08, C2M04, C2M07, C2M10, C2M13, C2M14, C2M15, C2M21, C2S01.
- Sees little (a view score under 120): 37.
- Nothing to look at: 18. C1E1M06, C1E2M01, C1E2M07, C1E3M07, C1E4M01, C1E4M08, C1E4S01, C2M03, C2M04, C2M07, C2M13, C2M14, C2M15, C2M24, C2M25, C2M29, C2M30, C2S01.

The full table is `D:\Doom_release\awe\openings.txt` (regenerate it; it is not in git). These floors are first guesses. A small start room that opens through a door onto something good is a fine opening and will still read "sees little": the numbers pick candidates, your eye decides.

Episode 1 (the free demo, the first impression) is in good shape by these numbers: seven of eight meet every floor. Signal House (C1E1M07) sees little.

## 3. What a good opening is

Decide, for each level, what the opening picture is OF. In order of preference:

1. **The destination.** The thing the level is about, seen far off: the tower you will climb, the arena, the gate. (Lamplighter Hill's beacon.)
2. **A lit threshold.** A doorway, arch or stair with light beyond it, at the end of a dark approach.
3. **A landmark on the skyline** that tells you what kind of place this is.
4. **A lamp and a path.** Under a roof, a warm pool of light on the way you are meant to go.

And three things an opening must not be: a wall within 8 m, an empty floor running to fog, or a view of the level's back wall with the route behind you.

## 4. How to fix one, cheapest first

**Work in this order and stop at the first that makes a good picture.** Options A and B change only what is drawn. Option C changes the simulation and costs more.

**A. Put something in the picture (drawn only).** The start already faces a direction; put the landmark there.
- Under open sky: one `scenery` piece in the source, outside the grid, on the line the start faces (`{ kind, at: [x, z], y, scale }`; kinds and the two-piece limit are in the visual handoff, section 3). `opening-views.mjs` prints `horizon` 1 or more when a piece is inside the picture.
- Under a roof: a lamp on the route within 24 m ahead (`maps-src/accent-lamps.json` and `tools/dev/source-lamps.mjs` are how accent lamps were added in A8; a lamp is a prop, and an added prop must not move a route: fingerprint before and after).
- Sky and light, if the place is one flat colour: the look's row in `LOOKS` (handoff recipe, step 3).

**B. Nothing else.** If A gives a good picture, the map file changed only in `scenery`, lamps or `atmosphere`. Prove it: `route-fingerprint.mjs save` before, `check` after, every run identical; `fun-gates.mjs <ID>` PASS and STRICT PASS.

**C. Turn the player (a simulation change: use only when the start faces a wall or away from everything).** A source may say `startFacing: 'east' | 'west' | 'north' | 'south'` (see `maps-src/C1E4M08.level.mjs`; `tools/mapkit/compile.mjs` applies it to the player). The player's first facing is simulation state, so:
- The route fingerprint WILL differ by a few ticks. That is expected; it is not proof of a fault.
- Run the map's whole gate set: `node tools/dev/fun-gates.mjs <ID>` (PASS and STRICT PASS) and `FULL_AUDIT=1 node --test tests/level-floors.test.js`.
- Raise the map's `version` (a save made at the level start holds the old facing).
- Marrow Quay has no source: do not turn its start.
- Never move the start cell. Never turn a start so that the first enemy is behind the player.

## 5. Sessions

Each session: five or six maps in node, then ONE shoot on the owner's named yes, then at most one round of fixes and one reshoot.

**The shoot.** `opening-views.mjs --views=<file>` writes a views file of every opening (keys `OPEN-<ID>`). Then, with the yes:

```
GPU=1 VIEWS=<file> DOORS=shut  (through tools/dev/low.ps1)  tools/dev/shoot-hero.mjs <outDir> OPEN-<ID> OPEN-<ID> ...
node tools/dev/frame-score.mjs <outDir>
```

`DOORS=shut` matters: the opening is what the player sees before touching anything. Create the output folder before the job (`low.ps1` cannot write its log into a folder that does not exist). Check the log says `pointer-lock requests: 0`.

**O1. A baseline of all 68 openings** (one shoot, about 10 minutes). No changes. Score them, make a labelled contact sheet (`tools/dev/label-sheet.mjs`), send the sheet to the owner. This is the first time anyone sees every opening side by side; expect it to change the list below. Keep the set in `D:\Doom_release\awe\open-before`.

**O2. The ten that face a wall.** C1E4M07, C1E4M08, C2M04, C2M07, C2M10, C2M13, C2M14, C2M15, C2M21, C2S01. Look at each baseline frame first: a start in an airlock or a cell that opens onto the level may be right as it is (say so and leave it). For the rest, option A if the wall is a doorway with a view beyond once opened, option C otherwise.

**O3. The eighteen with nothing to look at** (minus any fixed in O2). Mostly option A: one landmark or one lamp each.

**O4. Episode by episode, the remaining "sees little" maps,** judged by the baseline frames, not the number. Skip any whose frame already reads as a composed picture.

**O5. Reshoot all 68** into `D:\Doom_release\awe\open-after`, score, sheet, send. Then the evidence regeneration on the owner's word (every changed map is stale; `src` should not have changed in this plan unless a look row was edited).

## 6. Done means

- `opening-views.mjs` reports no "faces a wall" and no "nothing to look at" that is not written down as intended (a table at the end of this file: map, why it is right as it is).
- The owner has seen the before and after sheets and named any opening that still looks unfinished.
- Every changed map passes its gates; every map changed only by option A has identical route fingerprints.

## 7. Other things found on the way (not part of this plan; do not lose them)

- **The Drowned Choir (C2M12) hero frame has a large flat pale-green slab across its middle.** It looks like haze over a water plane and may be a drawing fault, not a style choice. Shoot it from two other angles; if the slab is a flat unshaded plane, find what draws it (the water plane under `HAZE.below`, or a wading-water overlay) before touching numbers.
- **The big scenery is unshaded.** The Marrow Nave's rib arches and the skyline pieces are flat single-colour bands beside textured walls. They would sit better with a vertical gradient (darker at the foot, the place's sky colour at the top) or a skin from an existing atlas. Drawn only; `src/render/skyline.js` and the scenery makers in `src/render/models_c2.js`.
- **Pump Cathedral's hero view is 55% rusty wall.** Set it by hand (the visual handoff, recipe step 6).
- **Episode 2's start rooms are one template** (O4): nine box rooms with a centred door and a crate; a turn hides it, a redraw of each start room would end it.
- **C1E2M02's normal balance is on a knife edge** (O4): the strafing fighter with 25% less ammo dies (158 damage) when the start turns 15 degrees either way.
- **About ten maps are still dark or flat by score** (the lowest spreads in the latest set: C2M16 42, C2M27 45, C1E3M08 51, C2M15 64). Some are dark by design; a dark place still needs one bright thing in it.

## 8. Intended exceptions

(Fill in as you go: map, the fault the tool reports, why the opening is right as it is.)

| map | fault | why it stays |
|---|---|---|
| C2M04 Tuning Fork Fields | faces a wall (5 m east) | NOT right, held: every facing up the entry corridor (north, -0.52 to 0.3 rad) loses the hard runs (main and secret, both fighters, seeds 1-2). Its hard routes are on a knife edge already. Fix the hard balance first (or the bot's first fight), then turn it north. |
| C2M07 Bellwright Yard | faces a wall (5 m east) | NOT right, held: every north facing (-0.35 to 0.35 rad) loses the hard secret run on seed 1, and most the hard main on seed 2; the original east facing already dies on the secret route on hard with one of the two fighters (hp 15 at the bell node at 61,32). Same fix as C2M04. No lamp spot in the corridor either. |

## 9. Progress (2026-11-16, node only, nothing seen in a browser yet)

- **O2 (option C), eight turned** (version raised to 3): C1E4M07 1.05 rad (west and a little north, along the route), C1E4M08 south (the route's first leg; east was a wall 3 m off), C2M10 north, C2M13 north, C2M14 north, C2M15 0.52 rad, C2M21 north, C2S01 north. Two held (section 8). C2M10's secret route took one more waypoint (55,18) round the stall block at 49-53,20-23: the turned start put the bot on the block's corner on the way back.
- **O3 (option A), eleven given something to look at:** a hanging amber lamp 8 to 10 m ahead and about 12 degrees off the crosshair (`maps-src/accent-lamps.json`, `why: 'opening'`) on C1E1M06, C1E2M01, C1E2M07, C1E3M07, C1E4M01, C1E4S01, C2M24, C2M29, C2M30, and after their turn C1E4M08 and C2S01; a landmark on the facing line on C2M03 (a fourth spire, outside the grid east) and C2M25 (a hangrock east). The eleven option-A maps: all 189 fingerprint runs identical.
- **Measured after:** no opening faces a wall or has nothing to look at except C2M04 and C2M07 (held). 36 of 68 meet every floor (was 25); the rest are "sees little", left for O4, which needs the baseline frames.
- **Found:** `tools/mapkit/compile.mjs` skipped `startFacing: 0` (a falsy number); it now takes any facing that is not null.
- **Not done:** O1, O4, O5 need the shoot (the owner's named yes).


## 10. O1 and O4 (2026-11-16, the owner's named yes for the shoot)

- **O1, the shoot:** all 68 openings shot after O2/O3 (`D:\Doom_release\awe\open-now`, GPU, 800 wide, doors shut; 0 pointer-lock requests, no page errors). Scores in `open-now-score.json`, labelled sheets `openings-C1.png` / `openings-C2.png` beside them. There is no "before" set: O2/O3 were committed before the shoot. To have one, shoot from 45bd2c3.
- **O4, judged by eye.** Most "sees little" openings already read as a composed picture (a lit corridor, a lamp, depth) and were left alone. Three faults the numbers did not show:
  - **Episode 2 opened on the same picture nine times:** a box room seen dead-on, a door in the middle, a crate in front (C1E2M01 to M08, C1E2S01). Each start is turned about 15 degrees so the door sits off-centre, alternating left and right: -1.83 on M01, M02 (only -1.46, see below), M03, M07, S01; -1.31 on M04, M05, M06, M08. This breaks the repeat; the rooms are still one template, which a turn cannot fix (section 7).
  - **Four openings were mostly black:** C1E1M04, C1E4M04 and C2M12 each get a hanging amber lamp 10 m ahead, 11 degrees off the crosshair. Draw-only: 63 fingerprint runs identical. C2M25 faced a dark wall 9 m east, so it is turned to 0.52 rad, up the open ground the route crosses (sees 1304).
  - **C2M23 opened on a flat wall over the water;** turned to 1.83 rad (west, 19 degrees off the route; 57 m deep, four skyline pieces).
- **Gates:** the twelve turned maps pass fun-gates and strict. Two needed a second try: C1E2M05 lost its hard secret run at -1.83 and passes at -1.31. C1E2M02 fails the strict robustness check (strafing fighter, normal, 25% less ammo: dead, 158 damage) at both 15-degree turns and passes at -1.46. Its balance is on a knife edge, like C2M04 and C2M07.
- **Measured after:** 39 of 68 meet every floor (36 before O4).
- **Not done:** O5 (the reshoot into `open-after`) needs a fresh yes for that job; then the evidence regeneration (31 maps are now stale).

## 11. O5, the reshoot (2026-11-16, the owner's named yes)

- All 68 reshot into `D:\Doom_release\awe\open-after` (GPU, 800 wide, doors shut; 0 pointer-lock requests, no page errors). Sheets: `openings-after-C1.png`, `openings-after-C2.png`, and `openings-changed.png` (the fourteen O4 openings).
- **Seen:** the nine Episode 2 rooms now read as a corner of a room with the door off-centre, not a flat elevation. Brine Gate's pump-station room and the Rime Vault still show their table and crate. The Reprise looks down a lit quay to the water. Root Bell Descent looks up open ground past a lamppost, with a creature in view.
- **Dark share, before -> after:** C1E1M04 65% -> 39%, C1E4M04 81% -> 65%, C2M12 75% -> 41%, C2M25 55% -> 19%. C1E4M04 is still the darkest opening. Its lamp shows, but the room around it stays purple-black. Look at it in play before adding more.
- **Picture floors (frame-score):** 21 of 68 frames pass before and after. C1E2M03 and C1E2M06 now pass slightly over the "bright" ceiling (15%) because a lit wall comes into the frame. C2M05 and C2M14 (not changed) flipped to ok, which shows how noisy one frame is. The picture floors are a guide, not a verdict (frame-score's own header).
- **Left:** the evidence regeneration (31 maps stale); C2M04, C2M07 and C1E2M02's balance before they can turn; a redraw of the Episode 2 start rooms (section 7).
