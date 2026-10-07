# HUSHFALL look bible v2 ("Tuned")

**Status: L0, design only, awaiting the owner's decision.** Nothing in the game changed: no `src/`, `assets/`, map, route or sim file was touched, so no evidence is stale. The studies below were drawn by the project's own p5.js + p5.brush pipeline (`tools/look/`, written to `review/look-bible/`, never to `assets/baked`).

Why this exists: `assessment.md` found the renderer's painted/ink language is good and the content drawn through it is generic. The owner's brief (2026-10-06): *"distinct enemies ... things that look different than anything else out there ... keep the art style."* Their decisions: **everything is an instrument**; humans keep **dark torn oilskin**; tone **escalates by episode**; **look only first** (same ten kinds, same behaviours, same hit volumes).

**What this document is not.** These are flat front-view design studies, not game renders. They prove silhouettes, families and rules; they do not prove how the 3D rigs, the 480-pixel frame or the ink/banding post pass will treat them; that is L1. Whether any of it is "different from anything else out there" is a design intent, not something I have verified: I did not survey other games. What I can say is that every choice below is derived from this game's own premise (the Hush, bells, cradles, grafting), which is what keeps it from being the generic zombie/alien kit.

---

## 1. The grammar (six rules every creature, prop and surface is checked against)

1. **Form follows instrument.** A silhouette is an abstracted instrument family: BELL, PIPE, CLAPPER, DRUM/SHELL, TINE/FORK, GLASS-BELL, SAC. Distinct enemies come from distinct families, never from a hat on the same body.
2. **Horror is being tuned.** A human is stretched, pale, drum-tight; the oilskin hangs off as dark rags; bell-chitin and bone grow from the shoulder and spine; cables run from the jaw into the chest; the mouth is held open as a resonator. The *stage* of the graft rises with the episode: same family, more instrument.
3. **The Vael are the singers, not the instruments.** Grown, translucent, vertically symmetric: a glass-bell jelly with a tine fringe, an organ-bodied mother, a cradle sac with a person inside (not an egg).
4. **Motion is vibration.** Things that sing *ring*: the outline repeats in the Hush colour, drifting (the teal echo outlines in the studies). An attack tell is the ring doubling. Hordes sway to one shared Hush clock (render-only; the sim is untouched).
5. **Surface is engraving.** Baked line-work that reads as scrimshaw: ivory and bone with inked lines whose density follows the light, nodal (Chladni) figures instead of random cracks, verdigris on bronze. Ink outline, paper grain and value banding stay exactly as approved.
6. **Colour has meaning.** **Teal is the Hush: the Vael's voice only** (rings, eyes, energy). **Yellow is survivors and lamplight**, never an enemy. Bodies are bone, verdigris-bronze, bruise-violet, oxblood, oilskin-dark.

**Legibility rule (measured from the renderer).** Internal width 480 px, vertical FOV 70 degrees: about 32 px per metre at 6 m and 16 px per metre at 12 m. A 15 cm part is **4.8 px wide at 6 m and 2.4 px at 12 m**. So every silhouette-*defining* mass (bell, pipes, tines, drum, fringe) is at least ~15 cm; limbs may be thinner; engraving and nodal line-work (5 cm spacing) are **close-range detail only**: at 6 m they are 1-2 px and will not read. At distance the player sees silhouette, 2-3 value bands and the teal marks. The designs are made to carry on exactly that.

![at game scale](../review/look-bible/at-game-scale.png)
*Top: the ten creatures at 6 m, bottom: 12 m, at the game's pixel density, nearest-neighbour. The first figure is a roughly 1.8 m reference human. All ten stay distinct at 6 m; at 12 m the large ones read at once and the small ones (Gaunt, Gill) shrink but keep their family shape.*

---

## 2. The roster

![lineup](../review/look-bible/lineup_paint.png)
*To scale, left to right: reference human, Gaunt, Tollbearer, Bellhand, Sexton, bell node, Warden-Graft, Drone-Gill (hovering), cradle feeder, Cantor, Graft-Mother. Heights match the simulation's `defs.js` heights (checked: `node tools/look/check-figures.mjs`, all within +-0.10 m).*

Each entry: what it is, the tell the player sees, what changes by episode, how it must be built to stay fair. Hit volumes (`height`, `hitRadius`, `hitForward`) are **unchanged**; the drawn body must sit inside them. Arms, bells and trailing cloth that stick out past the torso are deliberately not hittable (the existing fairness rule).

### 2.1 Tollbearer: BELL (the zombie)
![tollbearer stage 0](../review/look-bible/paint_tollbearer0.png) ![tollbearer stage 2](../review/look-bible/paint_tollbearer.png)
*Left: early graft (Episode 1). Right: grown (Episode 2+).*
- **Identity.** A person bowed under a bronze bell that grows from the right shoulder like a satchel; the body leans away from the weight. Head tilted as if listening, mouth slack and open (it is a resonator), one cold-teal eye point, grown cables running from the jaw into the chest, ribs showing as strings. Dark sodden oilskin; yellow survives only as a trim remnant. Grown stage: verdigris at the bell's lip, a bone vane on the other shoulder, the coat hanging in strips (the strings of the instrument).
- **Tell.** The bell swells and its teal outline doubles (replaces today's arm-raise glow; the arm-raise and its timing stay).
- **Death.** The bell rings once as it falls and the echo outlines fade; the body stays (L3: bodies that stay).
- **Why it is distinct.** The only lopsided, top-heavy figure in the roster: nothing else has a mass hung off one shoulder.

### 2.2 Gaunt Runner: UNTUNED (the screamer)
![gaunt](../review/look-bible/paint_gaunt.png)
- **Identity.** Stripped, pale, no instrument yet: too-long limbs, bone claws, and the jaw come off its hinge into a red horn. The only creature that is *not* being tuned: it screams instead. Low and wide (a runner), so it never competes with the upright human forms.
- **Tell.** Crouch, the jaw opens wider, the throat reddens (the existing crouch-then-dash timing).
- **Note.** 48% of its silhouette is thinner than 15 cm (spindly by design); the claws are texture, not geometry, in L1.

### 2.3 Bellhand: CLAPPER
![bellhand](../review/look-bible/paint_bellhand.png)
- **Identity.** A collar-bell on the shoulders; one arm has grown long and hangs to the knee ending in a bronze clapper; the other raises a bronze cup like a hand-bell. Lopsided in two directions at once.
- **Tell.** The cup arm rises and its outline doubles; the clapper swings (the ranged toll-shot timing is unchanged).

### 2.4 Sexton: PIPE
![sexton](../review/look-bible/paint_sexton.png)
- **Identity.** Stooped: the hooded head hangs low, and a comb of five pipes rises from the back above it. The robe is a bell-skirt to the floor. A top-wide, waisted, bottom-wide shape.
- **Tell.** The pipes light in sequence along the channel beam (the existing channel-over-a-corpse mechanic, now visible on the body).

### 2.5 Warden-Graft: DRUM/SHELL
![warden-graft](../review/look-bible/paint_wardengraft.png)
- **Identity.** A hulk with a grown drum-shell on its chest, concentric ring engraving and bronze lugs, a faceless bone plate for a head, and drum-sized fists. The plate that takes a third damage from the front *is* the drum.
- **Tell.** The shoulder drops and the drum's teal ring thickens before the charge.
- **Note.** The drawn width (1.66 m with the fists) exceeds the hit cylinder (1.25 m): the fists are the unhittable part, as in the existing rig.

### 2.6 Cantor (boss): CHOIR-MASTER
![cantor](../review/look-bible/paint_cantor.png)
- **Identity.** A tall bell-robe with a rank of pipes on the chest, a halo of eight resonator petals round a small human face, two fork-bearing arms, 4.8 m. It reads as a vertical *organ* standing up, not a gown.
- **Tell.** Petals open outward; the halo ring expands (the pulse).

### 2.7 Bell node: RESONATOR
![bell node](../review/look-bible/paint_bellnode.png)
- **Identity.** A bell floating between the tines of a tuning fork struck into the ground: no cord, no gallows. The ring beam runs through it.

### 2.8 Drone-Gill: GLASS-BELL (the first non-human)
![gill](../review/look-bible/paint_gill.png)
- **Identity.** A translucent bell mantle with a hanging heart-clapper, a fringe of seven chunky tines, and a glowing note-bubble spore sac. Hovers 1.2 m. It is a jellyfish by shape and a bell by logic; the teal echo outlines trail the mantle as it flies.
- **Tell.** The tines vibrate faster and the sac swells (the existing spit windup).
- **Build note.** Translucency needs a blended material; blended meshes are left out of entity marking (see `src/render/entityflag.js`).

### 2.9 Cradle feeder: SAC
![feeder](../review/look-bible/paint_feeder.png)
- **Identity.** A membrane sac hung in an iron rack under three pipes, **with a person inside**, curled. This puts the premise's best image on screen: the horror was in the text and not the pixels.
- **Tell.** The sac pulses and the nodal pattern brightens while it feeds the mother.

### 2.10 Graft-Mother (boss): PIPE-ORGAN BODY
![graft-mother](../review/look-bible/paint_graftmother.png)
- **Identity.** Nine ranks of pipes over a case with a dark oxblood throat, cradle racks as her ribs and legs, six sacs down the flanks. She is a room-sized instrument. Her shield is a **resonance field** (concentric standing-wave rings that open like petals), not today's wireframe ball.
- **Tell.** The pipes fire in sequence; the rings widen.

### 2.11 Silhouette overlap (the L0 acceptance test)
Measured on flat black silhouettes at true scale, same distance, feet aligned (`node tools/look/sil-matrix.mjs`; intersection over union of the pixels):

| | today (assessment) | designs |
|---|---|---|
| Tollbearer / Sexton | 0.87 | **0.46** |
| Tollbearer / Bellhand | 0.82 | **0.42** |
| Bellhand / Sexton | 0.79 | **0.44** |
| worst pair of any two game kinds | 0.87 | **0.49** (bell node / Sexton) |
| target | | < 0.50 |

![silhouettes](../review/look-bible/silhouettes.png)
*Row 1: Tollbearer (grown), Tollbearer (early), Gaunt, Bellhand, Sexton, Warden-Graft, Cantor. Row 2: bell node, Drone-Gill, feeder, Graft-Mother, then three Episode 3 sketches.*

**Honest reading of this number.** I iterated the shapes until the metric passed, so it proves *these studies* are distinct at equal scale, not that the finished 3D rigs will be. Under the stricter *shape-only* reading (each scaled to the same height) the worst pair is Cantor / Sexton at 0.69, because both are tall robes with pipes; in the game they differ by a factor of two in size, but they DO share a map (C1E1M08, the Cantor's arena also holds Sextons, a Warden-Graft and the bell nodes), so it is the weakest pair that actually meets, and I would redraw one of them if you want it fixed now. The thin-feature numbers (share of the silhouette thinner than 15 cm): Tollbearer 35%, Gaunt 48%, Bellhand 31% (these are limbs, tatters and claws, which become texture in L1), all other kinds under 12%.

---

## 3. Surfaces

Six material families, each drawn by a **different generator** (this is the point: today's 28 textures share one recipe of blotches, scratches and rivets):

![surfaces](../review/look-bible/surfaces.png)
*Top row: nodal plate; engraved bone; verdigris bronze. Bottom row: oilskin remnant; membrane; drum-skin.*

| family | generator in the study | used for |
|---|---|---|
| **Nodal plate** | marching squares over cos(n pi x)cos(m pi y) - cos(m pi x)cos(n pi y) = 0: real Chladni nodal lines | Vael walls and instruments; bells' faces; the pattern that brightens when a thing feeds or sings |
| **Engraved bone** | hatch passes whose density follows a lighting function (the line-work *is* the shading) | bone vanes, jaws, skin on bodies, pipes |
| **Verdigris bronze** | irregular patina patches over bronze plus concentric engraved rings and rim ticks | bell-chitin, collars, drum lugs, clappers |
| **Oilskin remnant** | woven grid, torn polygons, stitched edge, a yellow remnant | human coats (dark; yellow only as trim) |
| **Membrane** | veined cells | cradle sacs, Vael walls, the gill's mantle |
| **Drum-skin** | radial tension lines to a hoop with lugs, one teal ring | the Warden's drum, drums in rooms |

**Limits of this study.** These are single swatches, **not tileable 256 px game textures**; the membrane's vein network is visibly stepped because I found the cells on a coarse grid (L1 would use a proper Voronoi or warped cells); and at game scale only the large-scale value and colour survive (see the legibility rule). Making them real, tiling, painted-in-brush textures is L1/L2 work. The recipes in `tools/look/recipes_look.js` are the starting point, not the end.

### The alien room kit (set dressing; render only; the sim stays a grid)
![kit](../review/look-bible/kit_paint.png)
*Left to right: pipe-rib arch; membrane wall panel; a chain of three cradle sacs; a cluster of resonator bells; a pipe column; the lantern.*
The sim's rooms stay rectangles; these dress them: ribbed arches across ceilings, bulging membrane panels on walls, hanging cradle chains, bell clusters, pipe columns that read as load-bearing. Rules: cladding stays inside the cell or wall thickness (the render-truth census and hit-volume tests must pass); and **the lantern shows the colour rule**: warm yellow is a survivor or a lamp, never an enemy. This is a menu of shapes, not a map layout; no map is changed.

---

## 4. Colour script and tone, by episode

![palette](../review/look-bible/palette.png)
*Rows: Episodes 1-4. Columns: three hues, the accent (a lamp or ember or sulphur), the body colours, and the narrow teal strip: the Hush.*

| episode | tone | hues | accent | graft stage and what the player sees |
|---|---|---|---|---|
| **1 Port Marrow** | **Eerie.** The wrongness is quiet: stillness, humming, a bell where a shoulder should be. No exposed tissue. | slate, brick, dusk-rose | lamp yellow | **Stage 0**: a small bell, the person still mostly intact |
| **2 The Salt Works** | **Uncanny-industrial.** The process is visible: rails, rigs, cradles holding people. First Vael (the gill). | bleached salt, rust, chemical green | ember orange | **Stage 1-2**: grown bell, verdigris, bone vanes, the coat in strips |
| **3 The Choir Ships** | **Alien.** The Vael themselves; membranes and nodal figures on every surface; things visibly vibrate. | ivory, violet, oxblood | sulphur | **Stage 3**: fully grown, little left of the person but the face; the pipes and drums are the body |
| **4 The Hollow Sky** | **Visceral and cold.** The choir is a body: wet oxblood interiors, lacquer highlights, exposed resonance. | black, cold steel, bone-white | vermilion | **Stage 3 + wounds**: the same families, now bleeding |

Only stages 0 and 2 are drawn (the two ends of the Episode 1-2 range); 1 and 3 are described, not drawn. The default sky stops being the pink-orange dusk: dusk is Episode 1's, earned, and the others take their own.

---

## 5. Motion language (render-only, deterministic, free for the sim)

- **Hush clock.** One shared render-time clock (not the sim's RNG and not per-enemy randomness) drives the sway of idle hordes in unison and the tempo of every Vael light. Enemies that are asleep are merged into one mesh by `view.js`: ring ghosts must be hidden while idle so the merge still works.
- **Echo outlines.** A part's outline repeated 2-3 times, offset, in teal at low alpha: the "this one sings" read. Blended, so left out of entity marking.
- **Attack tells.** Keep every existing windup and its timing (the sim's tells do not move); change only what the body does *during* them: the bell swells, the pipes light in sequence, the drum ring thickens, the halo opens.
- **Grounding.** All rigs keep the existing contract (`ground-contract.js`: the view owns `root`, `pose()` writes only `rig`, `makeRigGrounder` lifts the lowest vertex): nothing here needs it changed.

---

## 6. Episode 3 sketches (silhouette level only; NOT built, NOT in the game)

Row 2 of the silhouette sheet: **Chorister** (a tuning-fork tripod under a glass dome: suppression and flanking), **Bulwark Shell** (a conch carapace on short legs: the shield-bearer), **Weeping Mother** (an organ throne hung with cradle sacs: the elite mother). They are here so the first ten are not designed in isolation. Two overlaps to fix when Episode 3 is designed: Bulwark / feeder 0.62 and Weeping Mother / Graft-Mother 0.53 in place.

---

## 7. Behaviour ideas (NOT proposed for this pass; listed so you can say yes or no later)

Your decision was look first. These are the ideas the instrument roles suggest; none is built or planned without a separate approval, and each would touch the sim and force re-verification:
- **Chorus coupling:** three or more Tollbearers swaying in unison inside 6 m amplify each other (area toll), so the horde's synchrony is a mechanic, not just a look.
- **Piper (Sexton variant):** its pipes sustain a tone that narrows the player's aim cone while in earshot.
- **Wire-weaver:** a tuned human that throws a snare line which pins the player for a second unless dodged.
- **Warden's drum-roll:** a floor ring that marks the charge lane during the windup (a readability change).
- **Cantor petals:** per-phase vulnerable petals instead of only the bell ring.

---

## 8. What I need from you (L0 decision)

Approve, revise or stop. If revise, the most useful answers:
1. **The Tollbearer:** is a bell hanging off one shoulder (lopsided, leaning) the right zombie? Or should the instrument grow from the centre of the back?
2. **The Gaunt:** is a pale screamer with the jaw off its hinge right, or should the runner also be tuned?
3. **The look of the studies:** these are clean, flat, inked shapes with engraved shading. Is that the painted language you want, or rougher and more brush-wet? (The game's post pass adds ink, banding and grain on top.)
4. **Cantor / Sexton** share a tall-robe-with-pipes read when scaled to the same height (0.69 shape-only), and they do meet in C1E1M08. Redraw one now?
5. **Cradles with people inside, from Episode 2:** comfortable with that level of content?
6. **Colour:** yellow survives only as trim on dark coats, and teal belongs to the Vael alone. Agreed?

## 9. What L1 will build and how it will be judged (after approval, not before)

L1 rebuilds three things end to end: the **Tollbearer** (stage 0 and stage 2, to prove the escalation), the **Drone-Gill**, and the **cradle** (a sac with a person inside), plus one real tiling material set and the echo and chorus-sway tech. Same shot list as `assessment.md`, before and after, same spots. Acceptance: hit-volume fairness, rig grounding, entity-flag, e2-roster and render tests pass with their thresholds unchanged; silhouette overlap against every other kind < 0.5 **measured on the built rigs, not the studies**; the render-truth census passes; render cost not worse than the baseline. Cost: it changes `src/render/` and `assets/`, which invalidates the real-game evidence of all 18 maps; I will batch so there is one full regeneration for L1, not one per tweak.

## 10. Reproduce

```
node tools/look/check-figures.mjs                 # drawn heights vs defs.js (plain Node)
node tools/look/bake-concepts.mjs [id ...]        # draw the studies into review/look-bible/ (headless Chrome, p5 + p5.brush)
node tools/look/sil-matrix.mjs                    # the overlap matrix + thin-feature loss (writes sil-matrix.json)
node tools/look/at-game-scale.mjs                 # the lineup at the game's pixel density
```
Data: `tools/look/figures.js` (the designs, in metres). Drawing: `tools/look/recipes_look.js`. Nothing here is a game asset.
