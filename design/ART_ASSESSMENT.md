# Hushfall: an art assessment for originality and professionalism

Written 2026-10-31 at the owner's request: "a detailed artistic assessment of your assets, and what you think about them if you were looking at it for originality and professionalism."

**What I looked at.**
- 51 real-game frames on the graphics card at 1920 x 1080, taken after the look polish (PT-074): Episode 1 room by room, later-campaign spaces, the five bosses, the guns firing, the title, the Journal.
- All 28 creatures rendered through the game's own painting pass.
- Every painted texture on disk: 52 walls, 49 floors, 17 skies, 28 creature skins, the gun and decal atlases, and the story plates.

The contact sheets are in `review/art-assessment/` (pictures, not in git).

**My bias.** I built all of it, so I am the worst-placed reader to find its faults. I have tried to read it the way a store reviewer, a publisher's art director or a player scrolling past a capsule image would. My picture of the genre comes from memory, not from fresh research.

---

## 1. The verdict in a paragraph

Hushfall has a **real identity**, and none of it is borrowed:
- a drowned Victorian harbour at dusk;
- creatures built out of church bells, bagpipes, organ pipes, water towers and armillaries;
- a teal "Hush" light against amber lamps and brass;
- an ink outline and banded colour over a low-resolution picture.

In screenshots of the first episode it reads as a **confident indie style**. Where it falls down is not originality but **finish**:
- rooms are boxy and sparsely dressed;
- the painted surfaces are thin up close;
- the held weapon is drawn at a different pixel size from the world it sits in;
- shields and beams are flat see-through panels;
- a handful of late-game spaces look like a work in progress (a blue grid stair, an orange perforated wall, green cubes).

A reviewer's likely line: *"stylish, original, a little sparse; some areas look like programmer art."* Nothing reads as stolen, stock or traced.

---

## 2. Scorecard

Each class is scored out of 10 twice: **originality** (could this have come from somewhere else?) and **professionalism** (would a paying player read it as finished?).

| Asset class | Originality | Professionalism | In one line |
|--|--|--|--|
| Creature concepts (the instrument bestiary) | **9** | 6 | The most original thing in the game; the surfaces and the slight ordinary enemies hold it back |
| Bosses | 8 | 6 | Iconic shapes (a bone arch, a horned vase, an armillary bell); their shields and beams look like debug geometry |
| Title, cold open and epilogue plates | 7 | **8** | The strongest finish in the game: poster-like, clear, well lit |
| Skies | 7 | 6 | The dusk and twin-sun skies are lovely; three are plain noise fills |
| Wall and floor materials | 6 | 5 | Consistent and readable, but full of recognisable generator marks |
| Level geometry and set dressing | 5 | **4** | The weakest class: big flat walls, rectangular rooms, few objects at eye level |
| Lighting and the post pass (ink, bands, tone) | 8 | 7 | The signature of the game; some interiors sink into murk |
| Held weapons | 6 | 5 | Good shapes; drawn sharper than the world, and a few are flat slabs |
| Effects (beams, shields, rings, marks) | 6 | 5 | Readable, but flat and uniform |
| HUD and menus | 5 | 5 | Clean type; too small and too dim at 1080p and above |
| Creature animation (before today's fix) | 5 | 4 | Stiff, with joints that jumped; see section 6 |

---

## 3. What is genuinely original (keep and push)

1. **The bestiary's idea.** Every enemy is a musical instrument grown into a body, for example:
   - the Tollbearer drags a church bell from its shoulder;
   - the Bellhand is a Victorian in a top hat with a hand-bell;
   - the Reed is a bagpipe;
   - the Brood Vat is a water tower on stilts;
   - the Seal is an armillary;
   - the Root Bell's clapper is a bronze cage round a copper heart.

   This is a theme I have not seen in another shooter, and it ties the creatures to the story (the Hush is a sound). It is the asset I would put in the store's first screenshot.
2. **The palette and the light.** Dusk orange and violet skies, warm lamp pools, brass, and the teal reserved for the alien light. The rule "teal means the Vael" is kept almost everywhere, which gives the game a readable visual language.
3. **The ink and the bands.** A real 3D world drawn with an outline and stepped colour at a low resolution gives a look between a 1990s shooter and a print. The hostile red ink (PT-074) is a clever readability device.
4. **The 2D plates.** The town under the teal rings, the lit door in the wall, the sunburst gate and the lighthouse title are composed like posters. They give the game a front door that looks finished.
5. **Provenance.** Every picture is painted by a program in the repository and every sound is synthesised. There is no stock, no download and no traced reference. That is a clean legal position for a store.

## 4. What reads as unfinished, and why a buyer would notice

Ordered by how much a first impression suffers.

1. **Rooms are boxes, and the boxes are empty.**
   - **What I saw:** in nearly every interior frame, two or three wall planes run unbroken from floor to ceiling. Furniture comes in grids (crates in rows, tables in lines) and there is little at eye level: no shelves, pipes, signs, hanging cloth, debris piles or clutter on tables. The shaping kit and the trims added bays, skirting and cornices, but they are small next to a 6 m wall.
   - **Why it matters:** store screenshots and trailers are read in under a second. Empty space at that size reads as "unfinished" before it reads as "atmospheric".
2. **The held weapon belongs to a different picture.**
   - **What I saw:** since the polish, the gun is drawn at the screen's full resolution, smooth and crisp. The world is drawn at 480 pixels wide and enlarged into chunky pixels. The flare cannon also takes about a quarter of the frame, and its saturated cyan grip is the brightest colour on screen in most frames. The line-thrower and the mortar fill the bottom centre with a plain yellow slab.
   - **Why it matters:** two pixel sizes in one frame is the classic tell of assembled-from-parts art. A plain slab reads as a placeholder.
3. **Surfaces show the generator's marks.**
   - **What I saw:** across the 101 wall and floor textures, the same three devices repeat:
     - soft translucent circles used as grime;
     - straight hairline scratches;
     - smooth vertical gradients.

     They are recognisable once seen, and they are the same on brick, metal, plaster and flesh. The creature skins are swatches: a gradient with a few hatch marks, and the same spiral glyph, row of teeth and green blotch reused on many creatures. The ART_BIBLE promises "painterly ... visible brush character". On disk, most materials read as **flat vector illustration**, and the painterly feel comes from the post pass rather than the textures.
   - **Why it matters:** a buyer will not name it, but "procedural" is the word they will reach for.
4. **Late-game spaces look like a work in progress.**
   - **What I saw:**
     - the Hollow Stair is a field of saturated blue grids;
     - the Nerve and Root Bell halls wear an orange wall of perforated squares that dominates the frame;
     - the Harmonic Gardens are green cubes on green;
     - a few materials are a plain grey panel with one line across it.
   - **Why it matters:** these are fine as graphic choices once, but here they carry whole levels with no secondary material, so they read as flat colour, not a place.
5. **Shields, beams and rings are flat planes.**
   - **What I saw:** the Cantor's shield (teal see-through slabs), the Warden's sweep, the ring pulses and the lock beams are single-colour translucent quads with an outline.
   - **Why it matters:** next to the painted plates they look like debug drawing. Effects are where a modern indie shooter spends its polish.
6. **Ordinary enemies are slight and toy-like.**
   - **What I saw:** the close-ups show stick limbs and thin torsos built from cylinders and cones. At a distance they read well thanks to the ink, but up close (exactly where melee happens) they look like figurines, not threats. They are thin because the hit-volume width rule keeps the drawn body inside its collision cylinder. The bosses do not have this problem.
   - **Why it matters:** a melee enemy that looks fragile has no menace.
7. **Murk.**
   - **What I saw:** several interiors (the green-brown hall of Episode 1, the night quay, parts of Episode 3) sit in a narrow band of dark mid-tones where the banding has few steps to work with. Creatures in red and brown then sink into brown wood rooms. The warm "hall" light makes every creature orange.
8. **The HUD is small and dim at 1080p.** The objective line, the message strip and the Journal's body text are a few pixels tall in the frames. Fine on a laptop, a squint on a television or a 1440p monitor.
9. **Scale and repetition on floors.** The Customs Hall checkerboard is huge in the frame and tiles obviously into the distance; large plazas show the 256-pixel repeat.

## 5. Where it sits in the market

The "boomer shooter" shelf is crowded with low-resolution, outlined or palette-limited 3D. What lifts a game off that shelf is a **subject** you cannot see elsewhere. Hushfall has one (instruments, bells, a drowned harbour, the Hush), and it is better than most.

What the shelf's successful games also have is **density and finish in the first ten minutes**: hand-placed clutter, chunky effects, a weapon that sits in the same picture as the world. Hushfall's first ten minutes are its best-looking, so this is fixable where it counts.

## 6. The animation note (today's fix)

The owner said the Tollbearer's swing felt stiff. Measured with `tools/dev/pose-pops.mjs` on six real levels played by the bot, the old animation had **2,622 frame-to-frame snaps**:
- a joint turning more than 30 degrees in one frame, up to 141 degrees at the end of every Tollbearer swing;
- creatures whipping a full turn when the brain made them dodge, strafe or circle;
- the Acolyte's halo jumping at random.

After PT-078 there are **0 on the same levels**, with the game itself unchanged tick for tick. The blow now lands on the frame the damage is dealt. Creatures also:
- step their feet when they turn on the spot;
- follow you with their head;
- lean into a dash.

What is not fixed by this is the stiffness of the walk itself: a plain swing of stick legs. That is a matter of the rigs' proportions and the walk cycle, and is part of item 6 above.

## 7. What I would do, in order of value for the money

1. **Dress the first three levels for the camera.** Add clutter at eye level to every room a store screenshot could come from (Marrow Quay, Customs Hall, the Boardwalk): shelves, coils of rope, nets, crates in piles rather than rows, hanging lamps, signs, broken furniture. These are new props from the existing kit. The first ten minutes are the store page.
2. **Put the weapon back in the world's picture.** Draw it at the world's pixel size (or exactly twice it) with the same bands. Lower the flare cannon's grip to the palette's brass and slate. Give the line-thrower and the mortar real shapes in place of their slabs.
3. **Re-bake the materials without the generator's marks.**
   - Retire the soft-circle grime and the uniform scratches.
   - Give each material one idea of wear that belongs to it: salt crust along the bottom of harbour brick, rust bleeding down from rivets, worn paths on planks, soot above lamps.
   - Vary brick and plank sizes.
   - The look kit's per-wall foot and head shading already helps; the textures should stop fighting it.
4. **Rework the six worst late-game materials** and give each of those levels a second material: the blue grid stair, the orange perforated wall, the green cube gardens, the plain grey panels, the noise skies.
5. **Give the effects a painted treatment.**
   - Shields: a gradient, an edge glow, a slow ripple, instead of flat slabs.
   - Beams: a hot core, a soft halo and sparks where they hit.
   - Rings: a leading edge.
6. **Give the ordinary enemies mass.** Thicker coats, shoulders and bells, a lower stance. This needs the owner's word on the hit-volume width rule: drawing them fuller means either widening their hit cylinders (a combat change) or accepting a drawn body slightly wider than what a shot tests.
7. **Paint value into the creature skins**: big light and shadow masses, belts, straps, seams, a darker underside. This is what reads at game distance, not fine detail. Then check each creature against the room it lives in (the red Tollbearer in brown wood rooms).
8. **Lift the murky interiors** a band or two, and give each warm room one cold light (and each cold one a warm one) so creatures separate from walls.
9. **HUD at 1080p and above:** scale with the window height, raise the contrast of the objective and message lines.
10. **Break floor repeats** in the big plazas: a second floor material in patches, the existing floor marks denser there, and the Customs Hall checkerboard at half its size.

None of these changes how the game plays except item 6. Items 1, 2, 3 and 5 are the ones a store page shows.

## 8. A note for the store

Steam and other stores ask whether a game contains AI-generated content. Here the pictures and sounds are made by programs that an AI agent wrote at the owner's direction. They are not produced by an image or audio model, and nothing was trained on or traced from anyone else's work. The credits already say an AI agent wrote the code, text and painting programs.

I would disclose this plainly on the store form in those words; the owner decides. This is not legal advice.
