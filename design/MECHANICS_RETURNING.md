# Mechanics returning (R19, PT-071, 2026-10-20)

The plan said: each of the eight mechanics that appear in only one shipped map returns once, combined with another, when a map is next edited. This is what was done, what was not, and why. It is a record of decisions, not a promise; the owner's play outranks it.

## Done (three returns, each checked by every node gate; nothing played)

| mechanic | first map | returns in | combined with | how |
|---|---|---|---|---|
| conveyors (belts) | C2M19 Bone Loom | C2M21 Pulse Foundry | steam jets | a flip-clock belt on the outer ring's north-west run; its south foot ends at the steam jet that already stood there, so the half of the clock that carries you back carries you into the jet. A message (HULL) says so at its foot. Routes: the main and secret routes still complete (every gate passes); the route fingerprints differ on purpose (a floor that moves). |
| noise readout | C2M26 Silent Roots | C2M27 Fault Line | the falling front | `noiseTell: true`: everything on both roads is asleep and the front is behind you, so QUIET or LOUD is a real choice. HUD and automap only: the route fingerprints are identical (18 of 18). |
| chimes | C2M14 Harmonic Gardens | C2M22 Mourning Halls | a remote door | a bell-tree and three chimes in the garden; answering it (three notes, each within eight seconds of the last) opens a door with no handle in the west wall of the arcade: a closet with a lamp, a large health pack and armour, and a note. Optional: the SECRET route plays it (the main route does not), so `map-check`'s "every message delivered" and "only the secret route finds the secrets" hold. |

## Freeze F7 (2026-10-25): the other five returned, each as an OPTIONAL branch with a cache

The owner asked for everything on the list to be finished before the last regeneration. The five that had been left are now placed, all in the same way: nothing the main or the secret route walks is touched (the route fingerprints of every route of every difficulty and three seeds are identical to a baseline saved before the edit: 18 of 18 for each map), the new piece is cut into solid wall or sits in a corner nobody walks, it holds a satchel and a vest, a third route file plays it and the bot gates and the tests hold it.

| mechanic | first map | returns in | combined with | how |
|---|---|---|---|---|
| tide | C2M28 Last Tide | C1E1M06 Ferry Terminal | the harbour | a 90 s loop on the south quay: wet for 20 s, only the strip floods; the cache is cheap at low tide and told from the lane (commit 6d98f19, `tests/tide-ferry.test.js`) |
| cars | C2M20 Vein Rail | C2M21 Pulse Foundry | the pit behind the rim wall | the SKIFF, a 3 x 3 flat car on a straight path across the pit between two docks cut into the rim on the SOUTH side (a first try with the docks on the north side, beside the Resonant that stands by the last valve, moved a Hard seed: the route fingerprints told), ten seconds at each end; a third route (`car`) rides it (`tests/skiff-foundry.test.js`) |
| timing platforms | C1E3M05 Resonance Loom | C1E4M04 Mirror Array | a sealed ledge | a hoist plinth of nine cells in the south-west chamber's west wall that rises two metres to a ledge cut into the drum's wall, holds eight seconds, sinks, on a clock of fourteen; a satchel and a vest on the ledge; the route `plat` waits for it (`tests/lift-mirror.test.js`) |
| airlocks and vacuum | C1E4M03 Cold Dock | C1E4M06 Gatekeeper's Approach | a hull hatch and a switch | a service lock in the east wall of the steps: a door, a chamber, a second door (never both open), a closet in vacuum because its hatch stands open to the dark, a switch on the closet's wall that shuts the hatch, a satchel and a vest; the route `lock` plays the whole sequence (`tests/lock-approach.test.js`) |

What is NOT proven for any of the four: how they look and sound in the real game, whether a person finds them, and whether the cache is worth its risk (the numbers are first guesses). The messages are told where the main route passes, because `map-check` requires every message to be delivered by the main or the secret route; the Approach's hatch has no feedback message for the same reason (the sound, the frost leaving the screen and the hatch closing are the feedback).

`node tools/dev/pocket-sites.mjs <ID>` finds wall pockets with a clear apron off the traffic; it found the Mirror Array and Approach sites.

## Not placed (earlier note, now superseded by the table above)


- **tide** (C2M28 Last Tide): introduced two maps from the end of the campaign; the only maps after it are the final boss and the silent walk, and a tide in either would be out of place (the walk is "a short walk in silence"; the boss fight has gates tuned to the Root Bell's own clock). The only honest return is a second use BEFORE it (a low tide in the Ferry Terminal, C1E1M06, would fit the harbour: the Last Tide's start line says the fog-bell tolled at the turn of the tide), which would put a new mechanic into the free demo's sixth map. Left for the owner's word.
- **cars** (C2M20 Vein Rail): a car needs a void to run over and a dock on each side. The only void maps after it are Pulse Foundry (a 156-cell reactor pit behind a rim wall: a car would cut the rim and the reactor scenery) and Root Bell Descent (the vents are the only road down by design). Neither was worth a tuned set piece.
- **timing platforms** (C1E3M05 Resonance Loom): a platform is a floor that rises and falls, so it needs a pit it can cross; the candidates (Choir Loft's tiers, Ascent Tether's open stretches) have no pit, and the Tether's routes are hand-written files that would need new `waitplatform` ops and a new clock against the falling loads.
- **airlocks** and **vacuum** (C1E4M03 Cold Dock): they come as a set (doors that refuse to be open together, regions that hurt while the pair that seals them is open); the candidates (Gatekeeper's Approach's service tunnels, the Hollow Stair's top landing) would need hull hatches, a switch that shuts them and routes that wait at the lock.

Each of these is a map edit with its own gates; none is blocked by the engine. The cost is that every one touches a map the owner has played (Episode 1 and 4) or a boss map.
