# The freeze list (2026-10-21)

The owner, 2026-10-21: "you need to go until you are finished with EVERYTHING, so I can play and judge. If you are still going to be CHANGING THINGS then I can't judge them."

So this is the complete list of what the builder side still has open. When every line is ticked or has a written decision, the source is FROZEN: one last regeneration, one last pack, one tag, and no change after it. A change after the freeze means the owner is judging something other than what ships.

Rule while working: no regeneration between items (every `src`, `index.html` or `assets/baked` edit stales all 68 maps); each item is its own local commit with a test that fails without it; Chrome jobs one at a time at idle priority on two cores, the pointer lock refused.

## Tier 1: what a player sees or plays

- [ ] F1 The Journal's tabs turn with the shoulder buttons on a pad
- [ ] F2 The HUD at narrow widths: the lantern's oil count and the ten-weapon strip; the small labels at 1080p
- [ ] F3 The corner map reads at a glance (it is a dark box in every frame)
- [ ] F4 Two things in frames: a white slab on the Hollow Stair, a crate through the bottom of the view on C2M14 (find the cause, fix it or say why not)
- [ ] F5 A void-fall recovery re-checks the landing cell
- [ ] F6 The arrival card and the tally escape what they write as HTML
- [x] F7 The five mechanics that appear in one map return once: tide, cars, timing platforms, airlocks, vacuum
- [ ] F8 The heavy ammunition box (specified, placed in caches and secrets)
- [ ] F9 Painted plates for the story scenes and the epilogues, and scene stings
- [ ] F10 Faces painted into the creature atlases (the heads are geometry today)
- [ ] F11 The quality fallback's second rung (cheaper effects when a smaller picture is not enough)

## Tier 2: robustness (invisible to a player; each behaviour-identical and proved)

- [ ] F12 Per-frame allocations (lamp budget, the Warden's beam, the Hive Cantor's threads), the per-punt material clone, the oscillator's upper frequency bound
- [ ] F13 The collision broadphase (the 81-creature stand's worst step), proved identical by the route fingerprints
- [ ] F14 The evidence hash covers the verification tools
- [ ] F15 `npm test` runs a smoke sample of the floor-truth test; the full sweep is in `npm run verify`

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
