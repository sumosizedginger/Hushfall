# Episode 3: The Choir Ships

Campaign 1, episode 3 (`CAMPAIGN_MANIFEST.json`: "Living alien vessels grown from grafted bell-chitin"). Eight main maps and a secret. Built in batches the owner sets, each played before the next (Gate 4); the owner's approval of the five new creatures (Chorister, Bulwark Shell, Weeping Mother, Cantor Acolyte, the Grand Cantor) was given 2026-10-09 and the batch order is the builder's (their words: "you're the builder, you make the choice, I just make sure it looks and feels good").

## Batch plan (the builder's)
| batch | maps | what it proves | state |
|---|---|---|---|
| **A** | M01 Landing Scar | the ship's look and light (`choir`), the first new creature (the CHORISTER), SUPPRESSION | **BUILT 2026-10-09, unplayed** |
| B | M02 Ribbed Corridors, M03 Gill Gardens | doors that breathe; spores and snipers on high ledges; the bell-breaker MORTAR placed | not started |
| C | M04 Marrow Nave, S01 The Choirless Chamber | the episode's one set-piece arena; the secret exit | not started |
| D | M05 Resonance Loom, M06 The Choir Loft | timing platforms and sound-lock doors; suppression enemies in numbers | not started |
| E | M07 Spore Foundry, M08 The Cantor's Throat | spawner denial; the Grand Cantor | not started |

Creatures still to build, by the batch that needs them: Bulwark Shell (elite) and Weeping Mother (elite) by B / C, Cantor Acolyte by D, the Grand Cantor by E. Each is its own engine step (a definition, a rig, a baked atlas, sounds, tests) done before the batch that needs it, and the evidence of every map is regenerated once at the end of a batch that changed engine, render, audio or assets.

## M01 Landing Scar (main): crater approach, crossfire lanes. First look at a grounded Choir Ship.
**New:** the CHORISTER (`ENEMIES.chorister`): a grafted singer whose throat is a grown ivory horn. It sings in BURSTS (four light shots a tenth of a second apart, each a little off the line), keeps its distance (it backs off while you are inside 8 m), circles you (flanks) and holds at range; one round does 3, a ring of them does a lot, and a round that goes by within 1.5 m SUPPRESSES: for under a second every gun you fire opens its cone by up to 90% (`SUPPRESS` in defs.js; the carbine's tight cone is the answer, and cover). The crosshair opens red while you are suppressed. Scale class MIXED (about 45% roofed: the open crater against the roofed hull; p90 sightline 20 cells).
**Look:** `choir` (pale green-grey light, violet shade), the `ash` sky, slate and silt for the crater, resin walls and silt floors for the hull, growth from the ship's heart reaching out of the breach.
**Route:** the west rim (one sleeper and a Gaunt in sight of the spawn; the two ledges' singers are out of their sight) -> the ramp (the first singers wake on it) -> the basin, rubble to rubble, under both ledges -> the breach -> the gullet (ribs: a singer on the north rib, a Bellhand, a Sexton, pillars off the lane) -> the throat door -> the throat (two singers across the door, the valve lever on its north wall) -> the hatch -> the exit. **Optional:** the ledges step down at their east ends: the high ground is a way round the crossfire, through the singers. **Secret:** a hollow rib on the gullet's north wall (a niche, a cache).
**Ammunition:** none on the road (the dead feed you: design/WEAPONS_AND_CONTROLS_PLAN.md section 14); the niche keeps its cache. Health and armour are on the road as before.
**Numbers (all first guesses, tuned against the route bot's gates, not against a human):** 25 creatures (7 Chorister, 8 Tollbearer, 6 Gaunt, 3 Bellhand, 1 Sexton), par 320 s. The first draft had 39 and killed the bot on normal; the singers' sight is 26 m so the rims do not see the spawn.
**Not verified:** nothing of the map or the creature was seen in a browser; how a burst, the suppression and the crossfire FEEL is unplayed; the Chorister's rig and atlas were drawn only as a rig check (`tools/look/check-rigs.mjs`) until the bake.
