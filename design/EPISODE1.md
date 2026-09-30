# Episode 1 — Port Marrow (Gate 2 design brief)

Approved direction (2026-09-30): Gate 1 accepted, with the instruction to be braver. This file is the design intent for the nine Episode 1 maps. It is intent, not status: status is derived from `validation/maps/<ID>.json`.

## Episode promise
One long night in Port Marrow. The player begins as a harbour pilot on an empty pier and ends by breaking the machine that is ringing the town. Each map has ONE new idea the player has not met, and a look that could not be confused with its neighbours. Verticality, hazards and set pieces are the point: the harbour is not a flat grid.

## Production kit (built before any map; every item has a test)
| kit item | why it exists | first used |
|---|---|---|
| Floor heights (0.5 m steps, stairs, ledges, drops) + headroom validation | Lamplighter Hill, Bell Tower, galleries, sunken markets | M02 gallery |
| Sectors (moving floors: lifts, drawbridges) | funicular, ferry ramp, tower platforms | M05 |
| Wading water (slow) and toxic residue (damage) | Drowned Chandlery | M04 |
| Triggers + switches + ambush closets + timed reveals | authored encounters instead of standing enemies | M02 |
| More keys (brass, iron, bell) and a lockable exit | key hunts, boss gate | M02 |
| Skins: 6 wall + 6 floor kits, 3 skies | every map looks like a place | M02+ |
| Rivet driver (3rd weapon) | sustained fire, scarce-ammo maps | M02 |
| Sexton (support), Warden-Graft (elite), Cantor + ring nodes (boss), tone pulses | enemy roster beyond "walks at you" | M05, M06, M08 |
| Text-map compiler (`maps-src/*.level.mjs`), top-down PNG preview, level linter/metrics | repeatable authoring (feeds Gate 3) | all |
| Campaign flow (next map, secret exit, carry-over, episode end) | an episode you can actually play through | all |

## Maps
**M01 Marrow Quay (done, Gate 1).** Pier, plaza, customs shed, warehouse, dock; the bell tower glimpsed. Ends on the dock: "Take Customs Hall up to Signal House."

**M02 Customs Hall — key hunt in a looping hall with ambush closets.** New: triggers/closets, iron key, first raised gallery, rivet driver. A grand tiled hall (plaster + checker floor) ringed by a mezzanine; two keys (brass upstairs, iron behind a ledge). Every time the player takes a key, a closet along the hall opens (Gaunts). Manifests on the walls: "212 received, 212 processed." Palette: cold institutional cream and green lamps.

**M03 Fishmarket Rows — dense stalls, flanking, sightlines.** New: switches (roll-down shutters open flank lanes), Bellhand packs, gutter water that slows. Sunken market floor with stalls in rows; the town was herded here. Palette: awnings, wet stone, night lanterns.

**M04 The Drowned Chandlery — flooded cellars, water hazard, secret exit.** New: wading water, toxic residue pools ("alien residue in the water table"), low ceilings, darkness. Timber siding, drips, a teal glow where the residue seeps. The secret exit is a hidden panel behind rope-stacks (to S01).

**M05 Lamplighter Hill — vertical switchbacks, ranged pressure from above.** New: real stairs and ledges, a funicular lift you call with a switch, Sexton (resurrects the fallen), lamps that survivors light as you pass. Bellhands on terraces above; drop-downs as shortcuts and traps.

**M06 Ferry Terminal — wide set piece, first elite.** New: Warden-Graft (armoured, charges, staggers into walls), a lowering ferry ramp, waves streaming off the ferry. Abandoned luggage rows and cars as cover; the evacuation that never left. Open arena with pillars: the flare cannon's home.

**M07 Signal House — tight interior, scarce ammo, radio narrative.** New: darkness and low light, ammo scarcity by design (the rivet driver and melee-range scattergun decide), the first clear Vael transmission. Cramped brass-and-oilcloth rooms, closets, a rebuilt radio you repair by finding three fuses.

**M08 Bell Tower of St. Orrin — the Cantor; sever the ring.** New: the boss. A spiral ascent (stairs, ledges, rising platforms) to a ringing chamber. The Cantor is shielded while any of its bell nodes stand; it sings expanding tone pulses that cover blocks. Sever the ring, kill the Cantor, the exit gate opens. "The Bell is a machine."

**S01 The Lighthouse Cellar (secret) — quiet cache.** Reached from M04; returns to M05. No fighting: a warm cellar, Warden Calder's notes, a real cache. Rest, and hear where Ines comes from.

## Per-map acceptance (checked by tools, not by me saying so)
Loads and validates; every pickup/enemy reachable; canonical route completes on all three difficulties; a passive runner cannot get through; the perfect bot takes damage; main route time is within the target band; the map uses at least its thesis's mechanics; distinct skin mix; headroom valid; no body spawns inside a collider; keys/doors are solvable; par is 2x-8x the bot; secret found only by the secret route.


## As built (2026-09-30, after the Gate 2 audit)
The maps above are design intent; this section says what shipped, so a reviewer can compare the two honestly.

| map | delivered | dropped or changed against the brief |
|---|---|---|
| M02 Customs Hall | keys (brass, iron), ambush closets, a gallery, the Riveter driver, a secret office | none of note |
| M03 Fishmarket Rows | two hoist switches that open the auction shutters, Bellhand packs on a raised boardwalk, gutter wading, waves | none of note |
| M04 Drowned Chandlery | wading water, toxic pools with a dry catwalk, resin walls, a hidden panel to the secret exit | darkness is fog and lamps, not a lighting system |
| M05 Lamplighter Hill | five terraces, switchback stairs, a funicular car (the only way from terrace one to two, with call levers), Sextons, a summit beacon that opens the gate | **the survivors' lamp signals were not built** (the lanterns are dressing; the text no longer promises signals); **no drop-down traps or shortcuts** |
| M06 Ferry Terminal | a concourse, a pillared quay, a winch cabin, a bow-ramp slab that a winch drops, waves off the ferry, the first Warden-Graft, a watchtower with Bellhands | the ramp is a slab that drops to deck level (a wall while raised), not a sloped gangway |
| M07 Signal House | a dark level that brightens as fuses are found, three fuses (keys with fuse names) spent by a switch that needs them, scarce ammunition, the first Vael transmission, dormitory closets | none of note |
| M08 Bell Tower of St. Orrin | a counter-clockwise spiral ascent, a Warden among pillars, a Sexton, a sealed open-air chamber with six bell nodes and the Cantor, cover pillars and 1.5 m platforms | **no rising platforms** (the spiral and the chamber platforms are static); the ring is six nodes on a hexagon rather than nodes on the tower's stair |
| S01 Lighthouse Cellar | a quiet cache reached from M04, returning to M05 | none of note |

Rules learned while building (all enforced by tests or gates now): a level must not be finishable without its gate (gate-skip probe); one exit per cell; every sector needs something that moves it; balance evidence must hold from the arrival inventory (arrival is floored at the authored loadout) and for a weaker player (aim error, 25% less ammunition on pickups).
