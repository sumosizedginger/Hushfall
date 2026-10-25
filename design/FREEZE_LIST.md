# The freeze list (2026-10-21)

The owner, 2026-10-21: "you need to go until you are finished with EVERYTHING, so I can play and judge. If you are still going to be CHANGING THINGS then I can't judge them."

So this is the complete list of what the builder side still has open. When every line is ticked or has a written decision, the source is FROZEN: one last regeneration, one last pack, one tag, and no change after it. A change after the freeze means the owner is judging something other than what ships.

Rule while working: no regeneration between items (every `src`, `index.html` or `assets/baked` edit stales all 68 maps); each item is its own local commit with a test that fails without it; Chrome jobs one at a time at idle priority on two cores, the pointer lock refused.

## Tier 1: what a player sees or plays

- [x] F1 The Journal's tabs turn with the shoulder buttons on a pad (eb3f6ef)
- [x] F2 The HUD at narrow widths: the lantern's oil count and the ten-weapon strip; the small labels at 1080p (b5bda73: found and fixed with tools/dev/probe-hud.mjs, clean at seven window sizes)
- [x] F3 The corner map reads at a glance (it is a dark box in every frame) (b5bda73)
- [x] F4 Two things in frames: a white slab on the Hollow Stair, a crate through the bottom of the view on C2M14 (find the cause, fix it or say why not) (b5bda73: both are by design, said so with the cause)
- [x] F5 A void-fall recovery re-checks the landing cell (83bdeeb)
- [x] F6 The arrival card and the tally escape what they write as HTML (0ff5ac6)
- [x] F7 The five mechanics that appear in one map return once: tide, cars, timing platforms, airlocks, vacuum
- [x] F8 The heavy ammunition box (specified, placed in caches and secrets) (9bfbe97: `ammo_crate`, every carried gun to 60%; thirteen placed (the secret room of the densest fight of each episode and act, the cache of each secret map); design/WEAPONS_AND_CONTROLS_PLAN.md section 17)
- [x] F9 Painted plates for the story scenes and the epilogues, and scene stings (967498a: two new plates baked (the coast behind the first three cards of Campaign One, the door with the lamp still dark behind the first four of Campaign Two); the scene stings need nothing: the four scenes with a sound have one at their start, the Bell stopping and the silent walk are silent on purpose)
- [x] F10 Faces painted into the creature atlases (the heads are geometry today) (DECLINED, with numbers: at the game's 480 px width and 70 degree view a head 0.26 m wide is 4 px at 12 m, 8 px at 6 m, 17 px at 3 m and 34 px at the 1.5 m of a melee; the geometric face (brow ridge, nose, teeth, eye sockets and the eye states of V8) is already the most a head can show at those sizes, and a painted layer would need a face cell in every humanoid atlas and a rebake of each, to change pixels a player cannot resolve; if the owner judges the V8 faces in play and asks for more, it is one atlas recipe and one bake away)
- [x] F11 The quality fallback's second rung (cheaper effects when a smaller picture is not enough) (c5b674f: the effects rung (shadows and floor marks off, then four lamps))

## Tier 2: robustness (invisible to a player; each behaviour-identical and proved)

- [x] F12 Per-frame allocations (lamp budget, the Warden's beam, the Hive Cantor's threads), the per-punt material clone, the oscillator's upper frequency bound (9b3bb47; the oscillator bound needed nothing: the saw tops out at 3.1 kHz)
- [x] F13 The collision broadphase (the 81-creature stand's worst step), proved identical by the route fingerprints (measured 2026-10-25 and declined: the 81-creature stand costs a mean of 0.165 ms, a 99th percentile of 0.64 ms and a worst step of 5.0 ms against 16.7 ms a tick (tools/dev/sim-cost.mjs --difficulty=hard C2M28), the bot's own thinking included; a broadphase would be a change to collision that buys nothing a player can feel)
- [x] F14 The evidence hash covers the verification tools (d077378)
- [x] F15 `npm test` runs a smoke sample of the floor-truth test; the full sweep is in `npm run verify` (cc883f0)

## Tier 3: for the store

- [ ] F16 Store frames: weapons firing, boss close-ups, the Map tab
- [ ] F17 A trailer
- [ ] F18 A desktop wrapper (prototype, outside the web build)

## The freeze

- [ ] Z1 The whole suite
- [ ] Z2 The one regeneration, from a clean commit
- [ ] Z3 The audit pack, the web zip and the store set rebuilt from it
- [ ] Z4 The plan pages, the log, AGENTS.md and the memory say so
- [ ] Z5 Tagged `rc2`, and nothing changes after it

## Decided, not built (with the reason)

- Bot v2's second half (cover, retreat to a lock, ammunition choice): invisible to a player. It can only move the gates of all 68 maps, and a smarter bot makes the "a perfect bot must take damage" gate harder to meet. It cannot make the game better.
- Entry loadouts generated from what the player has found: they would put the harpoon and the arc lamp into the hands of the bot on about fifty maps and re-roll every gate; the conservative entry loadouts are intended.
- A colour-blind palette for the painted world: threats are also told by shape, motion and sound (`design/ACCESSIBILITY.md`); a second palette is a second art pass for a problem the shape language already answers.
- The player's yaw is not wrapped: a double holds it for years of play, and wrapping changes how a frame is interpolated.
- Taste calls the owner makes by playing: the gun filling the lower centre in aimed fire, distant fighters reading as one red coat, HULL's tutorial voice. They are for the owner's judgement, not for another change.

## Not the builder's

Play it (COMPLETE is 0 of 68 until a person reviews), listen, clear the name (the free searches), a price and an itch.io account, testers, the push, and the engine (Project 2, after the game).
