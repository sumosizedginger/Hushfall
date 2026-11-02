# THE FUN CHECK: every level against a fun standard (2026-11-01)

The owner, 2026-11-01: "we want you to do a full level check as well, shape and everything, to make sure they are up to 'fun' standards based on what you know and your vast knowledge of games and how they are built." Still planning: nothing here is built.

**How it was judged:** all 68 floor plans looked at by eye (four contact sheets); `director-audit.mjs` (size, creatures, kinds, shooters, heights, mirror overlap, keys, secrets, ambushes, loops, empty rooms); `--routes` (each main route replayed on Normal: the bot's minutes, seconds to the first fight, the share of time under threat, the longest walk with nothing awake within 25 m); `map-shape.mjs` (rooms, boxiness, heights); `map-feel.mjs` (roof, sightlines). The bot is fast: a person takes three to five times its minutes. Numbers find the problems; only play decides fun.

Regenerate the evidence: `node tools/dev/director-audit.mjs --json`, `node tools/dev/director-audit.mjs --routes --json` (about 6 minutes, run it through `tools/dev/low.ps1`), `PLAN_OUT=<dir> node tools/mapkit/mapview.mjs <ID> 4` for each map, `node tools/dev/label-sheet.mjs` for the sheets.

---

## 1. The fun standard (what every combat map is held to)

What the best old-school shooters and their modern heirs share, in level terms:

1. **A place, not a diagram.** It reads as somewhere (a quay, a kiln, a choir loft), not a circle, a grid or concentric squares. Rooms of different sizes and shapes. Not a mirror image of itself (mirror overlap under 0.85).
2. **It folds back on itself.** At least one loop you can run round in a fight, and at least one shortcut that opens back onto somewhere you have been. Never a plain string of rooms from start to exit.
3. **A gate you come back through.** A key or lever deep in the map opens a door you already passed, and the way back is not the same walk: something has arrived, or the room has changed.
4. **Height.** Ledges, balconies, stairs and drops in the fights; at least one place where you SEE an area before you can reach it.
5. **Arenas, not hallways.** Three to five real fights a map, each in a space with cover, two or more ways in or out, and a mix of creatures that makes you choose a target.
6. **Rhythm.** Fight, breather, explore, fight, building to a finale. Nothing awake for more than about 90 m is a hole; under threat all the time is noise (about 40 to 70% of the time, by the bot's measure, is the healthy band).
7. **Secrets worth finding.** Two to four a map, of at least two kinds, each with a visible hint and a reward that matters (armour, a load, a mod, an early weapon).
8. **One postcard.** Each map has one thing you remember: a reveal, a view, a set piece.
9. **You always know where to go.** (The findability law, already enforced.)
10. **The right size.** Under about 3,200 walkable cells and about 15 creatures per thousand cells, unless the map is quiet on purpose.

---

## 2. What the check found, campaign-wide

| Finding | Evidence | Standard |
|--|--|--|
| **Every map has exactly one secret, and it is always the same kind** (a panel in a wall) | 59 of the 60 combat maps have exactly one (the Bell Tower has none); the engine has one secret kind | 7 |
| **Almost no gates you come back through** after Episode 1 | keys: Episodes 2 to 4 have 4 maps with a key, Campaign 2 has 2 of 32 | 3 |
| **Episodes 2 and 3 are strings of rooms**, start on the left, exit on the right; Episode 3 is also mirrored top to bottom | the plans; 14 of their 16 maps run along one line (the exceptions: Pump Cathedral, Spore Foundry) | 1, 2 |
| **Campaign 2 is drawn as geometry**: perfect circles, grids, concentric squares, long strips | the plans; mirror overlap 0.88 to 0.99 on 14 of the 32 Campaign 2 maps | 1 |
| **Campaign 2 maps are too big and too empty** | 12 Campaign 2 maps over 3,000 cells (the largest 4,584; Campaign 1's largest is 3,107); 9 at 10 creatures per thousand or fewer | 10, 6 |
| **Pressure never lets up** in Episodes 2 and 3 and much of Campaign 2 | the bot is under threat 67 to 78% of the time on 14 of the 16 maps of Episodes 2 and 3, up to 87% in Campaign 2 | 6 |
| **Long empty walks** | 11 maps have a stretch over 100 m with nothing awake (up to 189 m) | 6 |
| **Flat maps** | 11 combat maps have almost one floor height (Marrow Quay, four in Episode 2, three in Episode 3, three in Campaign 2) | 4 |
| **No new gun after map 21** | `progression-audit.mjs`: the axe in the Resonance Loom is the last; loads and mods carry the rest | (pacing) |
| **Four of the seven bosses fight the same way** (a ring pulse you step through) | the boss definitions | 8 |

**The best levels** are Episode 1 (real places, varied rooms), Episode 4 (bold shapes: rings, islands, a funnel, a hollow stair) and the two maps the owner played and liked (Signal House, Gatekeeper's Approach). The earlier rebuild (PT-052) fixed WHO stands WHERE (rosters, ambushes) on 44 maps; it did not touch shape, loops, gates or secrets. That is the work left.

---

## 3. Every level

**Grades:** **KEEP** = the layout meets the bar; it gets only the campaign-wide passes (secrets, a gate) · **PASS** = keep the layout, edit it (a loop, height, a gate, break a mirror, fill a hole) · **REDRAW** = the layout itself is the problem: a new plan by hand, same story, creatures and mechanics · **PLAY** = a boss or set piece: the owner's play decides first.

### Campaign 1, Episode 1: the harbour (the free demo)
| Map | Grade | What is wrong | The fix |
|--|--|--|--|
| C1E1M01 Marrow Quay | PASS | Small and completely flat; a fine first map | A raised pier and a moored ship's deck to fight from, a loop round the warehouse, a second secret |
| C1E1M02 Customs Hall | PASS | Good rooms and heights; 160 m with nothing awake; no loop | A shortcut from the records rooms back to the hall; something in the long stretch |
| C1E1M03 Fishmarket Rows | PASS (heavy) | One big rectangle of parallel aisles: the same aisle five times (mirror 0.85) | Collapse two rows into a wreck, an upper gallery on one side, an alley that loops behind the stalls |
| C1E1M04 The Drowned Chandlery | PASS | Varied rooms; 175 m with nothing awake; no loop | A flooded cut-through that loops back; fill the quiet stretch |
| C1E1M05 Lamplighter Hill | KEEP | The best height in the episode, nine loops | A landmark lamp at the top seen from the start; break the plain outline |
| C1E1M06 Ferry Terminal | KEEP | Good | Secrets |
| C1E1M07 Signal House | KEEP | Played and liked | Fill one 167 m quiet stretch; secrets |
| C1E1M08 Bell Tower of St. Orrin | PLAY | The first boss; the courtyard is a plain square; no secret | Likely a gallery round the courtyard |
| C1E1S01 The Lighthouse Cellar | KEEP | | |

### Campaign 1, Episode 2: the works
| Map | Grade | What is wrong | The fix |
|--|--|--|--|
| C1E2M01 Brine Gate | PASS | Three rooms in a row | A loop and a gate you come back through |
| C1E2M02 Evaporation Pans | REDRAW | Long, flat, a near-perfect mirror (0.94): a field of identical pans | Half the size; pans at different levels, a pump house in the middle, a raised walkway that loops |
| C1E2M03 Rail Yard | PASS (light) | The best loops in the episode; flat | A footbridge over the tracks; secrets |
| C1E2M04 Kiln Row | PASS | Flat, a row | Kiln tops to stand on, a loop behind the kilns |
| C1E2M05 The Cradle Annex | PASS | Short and flat | A mezzanine and a loop |
| C1E2M06 Pump Cathedral | KEEP | A real shape: a ring round the pump | Two empty rooms given a job |
| C1E2M07 Slurry Undercroft | PASS | Flat, a row | A lower sump and a catwalk above it |
| C1E2M08 The Grafting Floor | PLAY | A boss in two big boxes | |
| C1E2S01 The Rime Vault | KEEP | | |

### Campaign 1, Episode 3: the choir ships
| Map | Grade | What is wrong | The fix |
|--|--|--|--|
| C1E3M01 Landing Scar | PASS (heavy) | A straight line, mirrored top to bottom (0.91), no loop | Break the mirror: a crashed hull to climb on one side, a crater on the other |
| C1E3M02 Ribbed Corridors | PASS | Flat, one line | Side ribs that join into a loop; one drop |
| C1E3M03 Gill Gardens | PASS | A line of rooms, no loop | A loop through the gardens; height |
| C1E3M04 Marrow Nave | PLAY | The set piece: big and sparse (9 per thousand) | Tighten it |
| C1E3M05 Resonance Loom | PASS | A line, no loop | A loop round the loom |
| C1E3M06 The Choir Loft | KEEP | A raked wedge of tiers: real height | |
| C1E3M07 The Spore Foundry | PASS | A ring, flat | Furnace tiers |
| C1E3M08 The Cantor's Throat | PLAY | A boss; flat, melee-only roster | |
| C1E3S01 The Choirless Chamber | KEEP | | |

### Campaign 1, Episode 4: the Gate
| Map | Grade | What is wrong | The fix |
|--|--|--|--|
| C1E4M01 Ascent Tether | PLAY | A set piece ring; a 119 m quiet stretch | |
| C1E4M02 Wreck Belt | PASS | Islands in the void, mirrored (0.93) | Break the mirror |
| C1E4M03 Cold Dock | KEEP | A cross of bays; the lock was played | |
| C1E4M04 Mirror Array | KEEP | The puzzle map | |
| C1E4M05 Drift Orchard | PASS | Islands round a centre, mirrored (0.96) | Break the mirror |
| C1E4M06 Gatekeeper's Approach | KEEP | Rebuilt, played and liked | |
| C1E4M07 The Hollow Stair | KEEP | The set piece | |
| C1E4M08 Gate Warden | PLAY | The Campaign 1 boss | |
| C1E4S01 The Quiet Room | KEEP | | |

### Campaign 2, Act A: Threshold
| Map | Grade | What is wrong | The fix |
|--|--|--|--|
| C2M01 Threshold Beach | KEEP | A chain, but varied; a good opener | |
| C2M02 Glass Steppe | PASS | Squeezed once and still the largest map in the game (4,584 cells); long strips | Cut a third more; turn the strips into a few distinct places |
| C2M03 Cantor Outpost | PASS | A star fort and a box; a 100 m quiet approach | Give the approach something |
| C2M04 Tuning Fork Fields | REDRAW | Horizontal bands stacked like a spreadsheet, mirrored (0.91), 178 m quiet | |
| C2M05 The Reliquary Road | PASS | A straight spine with round pods: a procession | Bend the road; loop the pods |
| C2M06 Chitin Aqueduct | PASS (heavy) | Three parallel strips in a Z: three corridors | Cross-channels between the strips; height |
| C2M07 Bellwright Yard | PASS | A ring yard, mirrored (0.89) | Break the mirror |
| C2M08 Threshold Ascent | KEEP | A zigzag climb with real height | |

### Campaign 2, Act B: the Sounding Deep
| Map | Grade | What is wrong | The fix |
|--|--|--|--|
| C2M09 Sounding Deep Gate | KEEP | A cave with a real shape | |
| C2M10 Echo Markets | REDRAW | A perfect disc with a grid of blocks; flat; six empty rooms | |
| C2M11 Undercantor Halls | REDRAW | 3,851 cells, 8 creatures per thousand, four empty rooms | |
| C2M12 The Drowned Choir | PASS (heavy) | A cross of 4,319 cells; two thirds Tollbearers | Cut it down; mix the roster |
| C2M13 Lantern Ossuary | KEEP | Concentric rings make a real maze for a lantern level | |
| C2M14 Harmonic Gardens | REDRAW | A flat disc dotted with boxes; 3,819 cells; a 189 m walk with nothing | |
| C2M15 Ash Basilica | REDRAW | A strip of five identical boxes, 4,278 cells, mirrored (0.96) | Keep the five elite fights; make them five different rooms |
| C2M16 Sounding Deep Heart | PLAY | Two blobs, flat and sparse | |
| C2S01 The Silent Orchard | PASS (light) | An oval, mirrored (0.98) | |

### Campaign 2, Act C: the Hive-Song
| Map | Grade | What is wrong | The fix |
|--|--|--|--|
| C2M17 The Hive-Song Approach | PASS | An S-shaped corridor of 3,459 cells | Cut it; side loops |
| C2M18 Nerve Cathedral | REDRAW | Concentric squares, mirrored (0.97): a diagram | |
| C2M19 Bone Loom | PASS (heavy) | A grid lattice (0.89) | Break the grid into a few real rooms |
| C2M20 Vein Rail | REDRAW | An empty square with three boxes, mirrored (0.99) | |
| C2M21 Pulse Foundry | REDRAW | A wheel with spokes, mirrored (0.99) | |
| C2M22 Mourning Halls | REDRAW | One huge pillar hall: 4,335 cells, 6 creatures per thousand | It is the quiet trough on purpose: keep it quiet, make it small |
| C2M23 The Reprise | KEEP | Marrow Quay remixed; asymmetric | |
| C2S02 Ines's Lamp | KEEP | | |
| C2M24 Choir of One | PLAY | A boss | |

### Campaign 2, Act D: the Root Bell
| Map | Grade | What is wrong | The fix |
|--|--|--|--|
| C2M25 Root Bell Descent | PASS | A ring, mirrored (0.99) | Break the mirror |
| C2M26 Silent Roots | REDRAW | A field of pillars, 3,776 cells, sparse | |
| C2M27 Fault Line | REDRAW | Two long strips, 3,840 cells, mirrored (0.93) | |
| C2M28 Last Tide | PLAY | The stand | |
| C2M29 The Root Bell | PLAY | The final boss | |
| C2M30 The Unrung Gate | KEEP | The silent walk | |

**Totals:** KEEP 20 · PASS 26 · REDRAW 12 · PLAY 10 (bosses and set pieces: the owner plays them first).

---

## 4. The campaign-wide passes (every combat map)

1. **Secrets:** two to four per map. New secret KINDS in the engine (lazy, fingerprint-proved like every engine addition): a cracked wall you shoot open, a hidden switch that opens something elsewhere, a ledge reached by a vent, a crate stack or a drop, a crawlspace. Each hinted (a draught, a stain, a sound, a glint) and each worth it.
2. **A gate you come back through,** from Episode 2 on: a key or lever deep in the map opens a door you passed, and the way back has changed (the encounter kit's `reinforce` / `dropIn`).
3. **A shortcut:** one door per map that opens from the far side onto somewhere earlier.
4. **Height:** overlooks and drops in the fights (the shaping kit's ledges grow a balcony and a stair).
5. **Mirrors broken** on every map over 0.88 that is not a boss arena.
6. **Holes filled:** every stretch over about 90 m with nothing awake gets a fight, a view, a pickup or a story beat.
7. **Breathers:** maps under threat more than about 75% of the time get a safe room or a view between fights.
8. **A postcard per map,** written down in the map's brief.

## 5. How it is checked

- **Machine:** every gate that exists now (the route bot on all difficulties, viability, ammunition, traps, findability), plus the standard as numbers in `director-audit.mjs` (secrets and their kinds, a gate with a return, loops, the longest quiet walk, mirror overlap, size, the threat share) held by a ratchet so no map slides back.
- **People:** the owner plays each batch (one or two maps, with the five-question card); then outside players on the Episode 1 demo. The bot proves a map can be finished; it cannot say whether it is fun.

## 6. The order (levels, music and the bell together)

| Step | What | Size |
|--|--|--|
| F0 | The standard as audit numbers and a ratchet; the new secret kinds; a shortcut / return-gate kit piece | M |
| F1 | **Episode 1 finished as one slice:** the level passes, the smart music system with the harbour theme, the teal bell swing. The owner plays the whole episode | L |
| F2 | Episode 2 (Evaporation Pans redrawn) and its theme | XL |
| F3 | Episode 3 and its theme | L |
| F4 | Episode 4 and its theme | M |
| F5 to F8 | Campaign 2, one act at a time: the redraws, the passes, each act's theme | XL each |
| F9 | Bosses: after the owner has played all seven (four share one dance) | M |
| F10 | One evidence regeneration, the store build | L |

Every step ends with the owner's play. Any change to `src`, `maps` or `assets` stales the real-game evidence, so the single regeneration waits for F10 (and a named yes); bakes and browser jobs need a named yes.

## 8. AS BUILT (updated as the work goes)

The owner's answers (2026-11-01): old-school shooters are the bar; redraw the twelve and keep 68; "You are in charge, start where you will, but make sure it is fun, the music fits, and that covers everything needed to make it something you would be proud of."

| Step | State |
|--|--|
| Smart music (`src/audio/score.js`, `intensity.js`, `music.js`) | BUILT; the harbour theme plays on Episode 1; every other place keeps the generative score until its theme is written. Not heard by anyone |
| Teal bell swing | BUILT (Tollbearer, Bellhand) |
| Secret kinds: cracked wall, lever | BUILT (engine, kit, bot op `crack`, secret routes) |
| Episode 1: two secrets of two kinds on every map | DONE (c4028ac) |
| Episode 1: ambushes in the two long empty walks | DONE (Customs Hall, the Chandlery) |
| Episode 1: Fishmarket Rows' grid broken (a raised auction block, a back alley that loops) | DONE (419ec6f) |
| Episode 1: loops in Customs Hall (servants' passage) and the Chandlery (a cut that saves a 124-cell walk, a loop through the south stores); the Bell Tower's second secret | DONE (679d064) |
| THE OWNER'S GO FOR ALL OF CAMPAIGN 1 ("work until you have done all of the first 4 episodes") | |
| Episode 2: a cracked wall on all 8; loops (Brine Gate, Kiln Row x2, the Cradle Annex, the Pump Cathedral's shortcut: 8 cells for a 134-cell walk); height (Evaporation Pans' salt terrace, platforms in the Rail Yard, Kiln Row, the Cradle Annex); THE WORKS theme | DONE |
| Episode 3: a cracked wall on all 8; passages on one side (Ribbed Corridors, Gill Gardens' shortcut, the Resonance Loom, the Choir Loft, the Spore Foundry's shortcut: 7 cells for 46); height (Ribbed Corridors, Gill Gardens); THE CHOIR theme | DONE |
| Episode 4: a cracked wall on 6 of 8; the Ascent Tether's empty ring walk gets an ambush; THE GATE theme | DONE |
| Saves: every changed map's version raised (an older mid-level save resumes from the level start with its carry) | DONE |
| The whole suite | 1547 of 1547 (3864444, then the last four maps' tests) |
| NOT DONE, and why: the bosses and set pieces (Bell Tower, Grafting Floor, Marrow Nave, Cantor's Throat, Ascent Tether, Gate Warden) wait for the owner's play; the Wreck Belt and Drift Orchard keep one secret (no wall thick enough: they are islands); Landing Scar's mirror stays (its passage let a bot skip a gate); Slurry Undercroft has no loop (the cuts broke a lever's wall or a counted block) and, with the Spore Foundry, no platform spot; the Pump Cathedral's two empty rooms; Marrow Quay's raised pier; Lamplighter Hill's landmark lamp (it needs a new prop) | |
| The standard as audit numbers and a ratchet | NEXT |
| The real-game evidence (one regeneration, a Chrome job, the owner's named yes) | after the owner's play |
| THE OWNER'S GO FOR CAMPAIGN 2 (2026-11-02, from the Rail Yard: "lets get you working on the back half of the game and making it something you're fuckin' proud of") (PT-082) | |
| A map drawn BY HAND: `tools/mapkit/sketch.mjs` (a picture in characters, a legend, marks for where things go) and `tools/dev/picedit.mjs` (edit a plan by coordinates, `--from` a whole picture); `fun-gates.mjs` now also runs the strict per-map tests (`MAPS=` in tests/maps.test.js) | BUILT |
| Act A: REDRAWN by hand: Tuning Fork Fields (a hill climbed in one turn, the chained stair gate you come back through), the Reliquary Road (a road winding down a hillside in three legs, the ossuary stair back up), the Chitin Aqueduct (the water's course: basin, weir, reservoir, a bridge over a ravine, the tower's stair down into it), the Bellwright Yard (a foundry yard: casting pits, a kiln house off-centre, a terrace, a coal yard with the yard gate). A cracked wall on the other four (Glass Steppe's in its north cliff, the Outpost's bell-house ring gets an ambush). THE THRESHOLD theme | DONE |
| Act B: REDRAWN: Echo Markets (a market town in a cave: houses to circle, the echo well, the arcade, the raised quarter), Undercantor Halls (half the size: the balcony loop in the Songkeepers' gallery, a ring of the Silent's bowls), Harmonic Gardens (a sunken garden: three terraces of beds down to the chime-tree), Ash Basilica (five stations, five different rooms: rope-walk, chapter house, the crypt of the cross, the choir, the dome). The Drowned Choir squeezed (4319 -> 3094 cells), the Silent Orchard no longer a mirror (0.98 -> 0.87), a cracked wall on the Gate, the Choir, the Ossuary and the Heart. THE SOUNDING DEEP theme | DONE |
| Acts C and D: THE HIVE-SONG and THE ROOT BELL themes (the Root Bell brings back the harbour hymn) | DONE; the maps are next |

## 7. Decisions for the owner

1. Is this standard the bar? (Default: yes.)
2. The twelve REDRAW maps: redraw them by hand and keep all 68 (recommended), or fold the weakest into fewer, better maps (the 68 target changes only with the owner's word).
3. Start with Episode 1 as one finished slice (levels, music, bell), played as a whole before anything else moves. (Default: yes.)
