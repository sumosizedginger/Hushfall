# Art Gate 0: what the current build actually shows (2026-10-31)

This is Gate 0 of `design/audits/HUSHFALL_Council_Art_Direction_Repair_Plan_CANON_ALIGNED.md` (the outside Council's plan): before anything is changed, prove on the current build which earlier criticisms still hold. Every finding below is marked **VERIFIED FIXED**, **PARTIAL**, **STILL DEFECTIVE**, **OPEN** (known, not yet addressed), **RETRACTED** or **INSUFFICIENT EVIDENCE**, with the picture or number it rests on.

## The build and the setup

- **Commit:** `2a7bfe6`, the same code on branch `finish` (D:\Doom_work) and on `master` (D:\Doom).
- **The world** renders at 480 pixels wide, the default. Since PT-079 (`WEAPON_DENSITY` in `src/render/post.js`) the held weapon renders at twice the world's pixel density. Default field of view: 70 degrees.
- **Captures:** made in the real game on the machine's own graphics card, at 1920 x 1080. The reading screens were also captured at 2560 x 1440.
- **The mouse:** every job refused the pointer lock and counted the requests: 0.
- **Where the pictures are:** `review/art-gate0/` (pictures are not in git):

| Folder | What it holds |
|--|--|
| `frames-1080/` | the 33 look-polish vantages: the first three maps and the rest of Episode 1, the dark interiors, the Hollow Stair, the Pulse Foundry, Nerve Cathedral, four guns in the real game, hits, the title |
| `bosses-guns/images/` | the five bosses (the Cantor, the Grand Cantor, the Gate Warden, the Hive Cantor, the Root Bell) at their tell and in their attack; six guns firing |
| `reading-1080/`, `reading-1440/` | the Journal's Map, Items and Objectives pages |
| `late-game/` | Harmonic Gardens (C2M14) and Root Bell Descent (C2M25) |

There are also four review sheets: `sheet-bosses-vfx.png`, `sheet-gun-1to1.png`, `sheet-late-reading.png` and `sheet-gardens-zoom.png`.
- **What was NOT done:** no human player has looked at any of this. Every row below is a machine capture judged by the builder. The plan is right that this is not a substitute for unfamiliar players (section 8 of the plan).

## The findings

| # | Earlier criticism | Status now | Evidence | Note |
|--:|--|--|--|--|
| 1 | The held weapon is drawn sharper than the world (a pasted-in look) | **VERIFIED FIXED** | `sheet-gun-1to1.png`: the flare cannon and the scattergun at 1:1 pixels | They are drawn in square pixels with the same ink, twice as fine as the world. They read as the same illustrated picture. |
| 2 | The flare cannon's glass glows the Vael teal | **VERIFIED FIXED** | same sheet: the tube is signal red | |
| 3 | The Charge-Arc Lamp's bulb also glows teal | **OPEN (new finding)** | `10 weapons - side profile.png`; `src/render/models_arc.js` uses the gun atlas's teal glass | It is a human harbour tool (a lantern wound with copper coil, "strongest against the Vael"). Under the teal law it should be electric white-blue, unless the lore gives it a Vael part. |
| 4 | Interiors have empty walls | **PARTIAL** | `frames-1080/` 04, 09, 13, 14, 15 | The wall dressing shows in the real game: shelving with jars in the Signal House cellar, a cabinet and a notice in Customs Hall, a shelf in the chandlery office, life rings and notices on the Ferry Terminal's steel. It is 61 to 108 pieces per Episode 1 map. It does not change the shape of the rooms: long walls and the box remain. Plan item P1-A is still open. |
| 5 | Materials carry the generator's marks (soft discs, ruled scratches) | **PARTIAL** | the atlases (`review/art assets to refine/` and the PT-079 bake) against `frames-1080/` | 96 textures were repainted: the discs are now irregular stains with a tide line, and the scratches bend and taper. At the game's 480 pixels the difference is small. The texture repeat and the single-material rooms matter more than the marks. |
| 5a | The Pulse Foundry's orange dotted grid | **VERIFIED IMPROVED** | `frames-1080/22` | Copper sheets with one porthole and a pipe. The room is still one orange. |
| 5b | The Hollow Stair's blue grid | **STILL DEFECTIVE** | `frames-1080/21`; the drum's walls are 1,173 cells of `wall_stair_a` | The new texture is masonry in courses. At the distances the drum is seen from, rows of blue blocks still read as a blue grid. The cause is one saturated blue on a huge surface with no second material and very dark light (mean luma 31 of 255): it is not the tile. |
| 5c | Harmonic Gardens' green cubes | **STILL DEFECTIVE** | `sheet-gardens-zoom.png` | The boxes are GEOMETRY (box walls, 281 cells of `wall_orchard_a` round a moss floor). The new texture is leaded "living glass", the recipe's own intent, but they are still cubes. Not fixable by paint. |
| 5d | The Customs Hall checkerboard is too large | **VERIFIED FIXED** | `frames-1080/04`, `24`, `25` | Half its old size (`FLOOR_REPEAT`). |
| 5e | Plain grey panels; noise-fill skies | **INSUFFICIENT EVIDENCE** | | The Unrung Gate walk (C2M30) and the overcast skies were not captured this round. |
| 6 | Shields, beams and rings look like debug geometry | **STILL DEFECTIVE** | `sheet-bosses-vfx.png` | The rings now have a bright leading edge and a trail, and read as rings. The shields (the Cantor, the Root Bell) and the Gate Warden's sweep still read as tall flat translucent teal slabs with ink round them. PT-079 brightened their edges, which is not enough. This is the clearest remaining defect with evidence. |
| 7 | Creature joints snap (PT-078) | **VERIFIED FIXED** | `node tools/dev/pose-pops.mjs maps`: 0 snaps on C1E1M01, C1E1M02, C1E1M05, C1E2M04, C1E3M05, C2M03 | The same tick counts as before, so the game itself is unchanged. `tests/pose-smooth.test.js` holds it. |
| 8 | Stiff walk, weak weight | **OPEN** | | Not addressed. PT-078 fixed snaps, not the gait. |
| 9 | The line-thrower and the mortar are yellow slabs | **RETRACTED** | `bosses-guns/images/*fire_linethrower*`; sheets 08 to 10 | Those were pictures from before the October 26 polish. |
| 10 | Small text on the reading screens | **PARTIAL** | `reading-1080/`, `reading-1440/` | The text now grows with the window: about 16 px at 1080p and 21 px at 1440p. The Items page is a narrow column in a mostly empty screen. Readability at a sofa distance needs a person. |
| 11 | Murky dark rooms | **PARTIAL** | the numbers below | The brighter lamps helped where a lamp is in view. Rooms lit only by the sky or a far lamp barely changed. The Hollow Stair is the worst frame in the set. |
| 12 | The ordinary enemies look thin up close | **OPEN: WAITS FOR THE DIRECTOR** | | The drawn body is held inside the hit cylinder. Fuller bodies mean either wider hit volumes (a combat change) or a drawn body wider than what a shot tests. The plan agrees: stop and ask. |

Brightness of the darkest frames (`frames-1080/`). Each value is a luma from 0 to 255; p95 is the brightness of the brightest 5% of the picture.

| Frame | Mean | p95 | Spread p5 to p95 |
|--|--:|--:|--:|
| C1E1M02 hall entry | 59 | 142 | 129 |
| C1E1M02 gallery | 57 | 126 | 113 |
| C1E1M03 boardwalk drop | 46 | 88 | 77 |
| C1E1M04 shop | 33 | 71 | 71 |
| C1E1M06 vestibule | 36 | 89 | 89 |
| C1E1M07 cellar fuse | 48 | 104 | 92 |
| C1E1M08 courtyard | 58 | 114 | 96 |
| C1E1M08 chamber | 58 | 96 | 77 |
| C1E1S01 tower stair | 47 | 94 | 84 |
| C1E4M07 Hollow Stair | 31 | 59 | 48 |
| C2M21 Pulse Foundry | 51 | 106 | 91 |

## What this means for the next gates

The plan's order holds, and the evidence sharpens it:

1. **Gate 4's effects work is the clearest defect.** The shield plates and the Warden's sweep read as slabs in every boss frame. Fixing them is render-only and needs no decision from anyone.
2. **Gate 1 is about room shape, not dressing.** For the opening maps: focal architecture, varied room outlines, clustered (not rowed) furniture. For the two worst late spaces (the Hollow Stair, Harmonic Gardens): a second material, light, and breaking the box. Some of this changes level geometry, so the routes must be proved unchanged, as the shaping kit does.
3. **The Charge-Arc Lamp's teal** is a one-line canon fix once the lore question is answered.
4. **The ordinary enemies' mass** waits for the director's decision on hit volumes.
5. **Nothing above replaces outside players.** The plan's section 8 test (unfamiliar players, a confusion log) is still owed and is the owner's to arrange.
