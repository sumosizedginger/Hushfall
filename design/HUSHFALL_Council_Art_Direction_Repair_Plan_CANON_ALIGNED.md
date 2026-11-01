# HUSHFALL — COUNCIL ART-DIRECTION VERDICT & COMMERCIAL-FINISH REPAIR PLAN

**Revision:** Canon-aligned synthesis, 2026-10-31 / source material supplied 2026-11-01  
**Purpose:** One unambiguous art-direction brief and prioritized, testable implementation backlog for the Hushfall development agents.  
**Audience:** Creator/director, code-generation agents, independent auditors, and outside playtesters.  
**Decision:** **KEEP THE ART DIRECTION. FIX THE FINISH, GAMEPLAY READABILITY, AND CONSISTENCY.**

> **Important evidence boundary:** This plan synthesizes (a) the creator's current project description and completed-fix claims, (b) the internal `design/ART_ASSESSMENT.md` text supplied with this review, (c) the Council's earlier independent opinions, and (d) the 28-enemy/15-weapon still-image sheets provided in the conversation. We have **not independently opened the repository, the 51 real-game frames described in the internal assessment, the current post-fix build, or live gameplay**. The internal report's observations are reported findings, not new observations independently verified here. Treat current condition, especially after recent art fixes, as **VERIFY** until fresh game captures or a human play session settle it.

---

## 1. THE GAME WE ARE ACTUALLY REVIEWING

Hushfall is an **original, commercially intended, first-person shooter**, in the spirit of mid-1990s classics. It is built for a **desktop browser**, with a desktop wrapper in progress. The game is **true 3D, not 2D directional sprites**: code-built low-poly models, code-painted surface images, code-generated skies and illustrations, synthesized sound, and deliberately low-resolution 3D rendering.

- **Setting:** Port Marrow, a Victorian harbour town at dusk, invaded by the alien **Vael**, who graft captured people into an army and weaponize sound, the **Hush**. Campaign locations progress from harbour to choir-ships, through a gate, and into the invaders' world.
- **Narrative:** Written lore canon and story delivered through radio messages, found documents, and short in-engine scenes.
- **Scale:** Two campaigns, **68 constructed maps**: Campaign One has four eight-level episodes plus one secret per episode (**36**); Campaign Two has **30 main maps and two secrets** (**32**). Summed target times are roughly **9.5 hours**, not a measured average first-playthrough time.
- **Cast:** **28 creature kinds**, including **seven bosses and a peaceful Vael civilian**. **15 weapons** (nine guns and six melee), alternate ammunition, and upgrades. **58 distinct lighting moods**.
- **Rendering:** 3D world rendered at **480 pixels wide**, enlarged with ink outlines and stepped/poster-like color bands. Dusk skies, harbour iron, brass, and lamplight; **cold teal specifically identifies Vael presence/energy**.
- **Asset provenance:** The creator reports that the images, models, textures, skies, and sound are original outputs of authored code, not stock imagery or image-generation output; many programs and much game code/text were authored by an AI coding agent under the creator's direction. The creator reports **172 painted illustrations/images**. These are provenance claims to document, **not an independent legal clearance opinion**.
- **Testing:** All 68 levels reportedly pass automated playthrough checks. **One human has played through them**, with outside playtesting planned. Automated passage proves machine-defined reachability/conditions, **not** human comprehension, pacing, fear, finish, or commercial readiness.

### Non-negotiable visual canon

1. **Do not replace the 480-wide pixel/ink/poster-band style with high-resolution realism.** Improve it on its own terms.
2. **Do not redraw the rotating 3D models as sprite sheets.** Repair 3D form, materials, pose, animation, and camera presentation.
3. **Do not turn Vael teal into a universal UI hint, weak point, sniper color, or generic danger glow.** A teal cue must have an in-world Vael justification.
4. **Do not make every enemy neon, every prop a face, or every boss a humanoid.** The horror relies on unnatural instruments, architecture, ritual devices, and unfamiliar forms.
5. **Do not reclassify the peaceful Vael civilian as a shooter threat** simply because it appears in a creature contact sheet.
6. **Do not assume all 28 creatures serve identical combat functions.** Verify which are mobile hostiles, bosses, stationary hazards, interactive fixtures, environmental machinery, or non-hostile beings.
7. **Preserve the procedural, code-first, owned-assets approach.** Improvements should be reproducible changes to geometry/paint/render/placement recipes, not one-off replacement stock assets.
8. **Do not change damage rules, collision widths, hitboxes, AI, boss timing, or other gameplay balance to fix appearance without director approval and regression evidence.**

---

## 2. EXECUTIVE VERDICT — WHAT MATTERS NOW

**The Council got the visual identity right and the production context partly wrong.** The horror vocabulary is distinctive: bells, bagpipes, organ pipes, choirs, cages, armillary devices, water towers, roots, anchors, and harbour tools. The pink/orange/violet dusk against dark buildings and restrained Vael teal is an asset. The sound-based, liturgical/industrial creature idea is the strongest piece of visual storytelling.

The weakest demonstrated area in the internal review is **not** the creature concepts. It is **commercial-looking environmental finish**: boxy interiors, empty wall runs, evenly arranged furniture, eye-level emptiness, repeated floor tiles, some crude late-campaign materials, and thin surface painting. Visual effects also risk looking like raw translucent geometry. Small normal enemies look fragile up close. Some reading screens were too small. A prior mismatch between weapon and world pixel density has reportedly been addressed and **must be verified before anyone assigns that work again**.

**Critical correction to the Council's 'visual soup' verdict:** the internal review reports that ordinary enemies generally **read at a distance because of the ink**, but look toy-like **up close**, where melee encounters demand believable mass. The Council's contact-sheet concerns about small silhouettes, overlap, and dark-floor contrast remain **credible risks**, not proven universal gameplay failures. Both observations can be true depending on distance, level lighting, FOV, and movement.

**Commercial priority:** Make the **opening ten minutes** and the **weakest late-campaign spaces** feel deliberately authored, then confirm that representative encounters remain readable throughout the 58 lighting moods. The game is already broad; indiscriminately adding more assets or reworking all 28 designs is not the highest-value move.

### Source-derived baseline scores — **NOT current post-fix grades**

The internal `ART_ASSESSMENT.md` rated **originality / professionalism**, respectively:

| Category | Originality | Professionalism | How to use this score |
|---|---:|---:|---|
| Creature concepts | 9 | 6 | Protect ideas; raise surface/ordinary-enemy finish. |
| Bosses | 8 | 6 | Maintain iconic geometry; refine boss effect presentation. |
| Story/title/epilogue plates | 7 | 8 | Established benchmark for polished presentation. |
| Skies | 7 | 6 | Keep strong dusk; replace or improve plain noise fills where used. |
| Walls/floors | 6 | 5 | Material identity and repeated pattern problem. |
| Level geometry/dressing | 5 | 4 | **Highest-impact unfinished visual class.** |
| Lighting/post pass | 8 | 7 | Signature worth keeping; improve dark-interior separation. |
| Held weapons | 6 | 5 | **Historical** sharp-pixel mismatch; check after reported fix. |
| Effects | 6 | 5 | Flat shields/beams/rings reported; check after glow fixes. |
| HUD/menus | 5 | 5 | The report specifically corrected its issue to **reading screens**, not all HUD text. |
| Creature animation | 5 | 4 | **Pre-PT-078 assessment**; numerical pose snaps reportedly fixed. |

**Never present this table as fresh scoring of the current build.** Ratings need to be re-established after verifying the recent fixes. The photo sheets are not a substitute for the actual FPS view.

---

## 3. COMPLETED / REPORTEDLY ADDRESSED — CHECK, DO NOT AUTOMATICALLY REWORK

| Earlier criticism | Newer information | Current disposition | Required proof |
|---|---|---|---|
| Held weapon is too high-resolution/clean compared with 480-wide game world | Creator states **held weapon matched to world's pixel size** in the first repair round. | **VERIFY / provisional closure.** Do not order another full viewmodel rewrite on the basis of pre-fix screenshots. | One post-fix real-game frame with hands, weapon, enemy, background; at native 480-wide rendering and actual display upscale. |
| Interiors have no wall dressing | Creator states **wall dressing added**. | **PARTIAL / verify sufficiency.** Dressing on walls does not automatically solve sparsity at eye level, long sightlines, room shape, or repetitive clutter placement. | Same-angle before/after opening maps, plus later representative maps. |
| Materials are flat/generic/repeated | Creator states **materials repainted**. | **VERIFY.** Confirm whether soft-circle grime, straight uniform scratches, gradients and late-game grid/perforation issues were actually corrected. | Side-by-side 480-wide gameplay captures and generator recipe diff. |
| Glows are absent or weak | Creator states **glowing effects added**. | **VERIFY.** Check Vael semantic consistency and whether shields/beams still read like transparent rectangles. | Actual firing/shield/activation clips. |
| Creature joints snap and attacks pop | Internal review reports **PT-078** removed **2,622 >30° frame-to-frame snaps** down to **0 on the same six bot-tested levels**; corrected attack-frame alignment, turning foot steps, head tracking, dash lean. | **Reported FIXED for tested snap metric**. Keep regression test. | Re-run `tools/dev/pose-pops.mjs` or equivalent on same cases and representative changed encounters. |
| Walk cycles are stiff | PT-078 explicitly did **not** resolve basic stick-leg gait/mass. | **OPEN** only where visible/noticeable. | Human gameplay clips at close range; audit stance and weight transfer. |
| Older line-thrower/mortar were flat yellow slabs | Internal assessment corrected itself: these frames were **pre-October-26**. | **RETRACT as a current defect** without new evidence. | Current ADS/hip/gameplay screenshots only. |
| HUD too small | Internal assessment corrected itself: HUD scales; **Journal, Record, stats** had fixed 11–13px text. | **TEST reading screens**, do not blanket-rewrite HUD. | At 1080p and 1440p, realistic viewing distance and user test. |

**Rule:** An existing fix is neither permanently accepted nor automatically reopened. Mark it **Verified Fixed**, **Still Defective**, or **Insufficient Evidence** on a current build. If the recent source description and older assessment disagree, **the newer description wins as the work-status claim; current screenshots decide actual quality**.

---

## 4. PRIORITY REGISTER — REAL COMMERCIAL-RELEASE ORDER

| Priority | Workstream | Why it outranks the rest | Initial action | Do not do |
|---|---|---|---|---|
| **P0** | Current-build visual audit + independent player reads | Old stills and internal author reviews cannot certify the game's present state. | Capture comparable gameplay frames/clips after fixes; observe unfamiliar players. | Claim that automated clears equal art acceptance. |
| **P1** | Environment composition and dressing | Internal report's lowest professional grade (4/10); every frame contains a level. | Audit first three maps and three weakest late-game spaces. | Fill every room with random crates, destroying intentional emptiness. |
| **P1** | Material-family clarity and late-game motifs | Repeated generic marks make surfaces feel algorithmic, even if the pipeline is original. | Confirm latest repaint, target worst remaining surfaces and set-piece materials. | Redo all 172 images without evidence. |
| **P1** | Ordinary enemy mass, role cues, and combat readability | Some small hostiles are toy-like close-up; overlapping threats may be hard to parse. | Select representative ordinary foes; test close/mid/far and mixed encounters. | Triple all props, widen hitboxes casually, or turn civilians into enemies. |
| **P1** | Boss and combat VFX finish | Flat slabs can make major attacks appear like debug overlays. | Rework *confirmed* weak shield, sweep, beam, ring and strike effects. | Apply unrelated teal or huge bloom to everything. |
| **P2** | Lighting and 480-wide post-process tuning | Some rooms reportedly compress into dark middle values. | Compare enemies on real dark/wood/green interiors, not only dusk test floor. | Destroy dusk mood or simply brighten the whole game. |
| **P2** | Weapon/viewmodel and hands regression | A reported fix might already resolve visual mismatch; camera poses still deserve testing. | Review one representative gun and melee tool in post-fix real play. | Judge in-game quality from weapon contact sheets made without the world pass. |
| **P2** | Movement weight and animation feel | Pose snaps are reportedly fixed, but stiff gait can still ruin close-range menace. | Review six characteristic enemies in motion. | Re-open already resolved jump-frame bugs without evidence. |
| **P2** | Reading-screen clarity and floor repetition | Buyers will notice difficult text and obvious repeating checkerboards. | Test Journal/Record/stats at 1080p+, patch worst floors. | Mistake fixed-scale reading text for a broken scalable HUD. |
| **P3** | Promotional/contact-sheet framing | Professional evidence package, not core encounter quality. | Regenerate clear crops and real-level visual comparisons after fixes. | Change enemy world size just to fill thumbnail cells. |

### P0 rule: make a *current* baseline before editing

The Council previously prioritized a generic isolated-enemy silhouette lab. That remains useful **as a diagnostic**, but for a 68-map commercial FPS the first proof needs to be **in-world gameplay**:

- Opening: **Marrow Quay, Customs Hall, Boardwalk** (store-page / first-ten-minutes priority).
- Weak late-game examples named by internal review: **Hollow Stair, Nerve/Root Bell halls, Harmonic Gardens**, plus any plain-gray-panel/noise-sky locations.
- Combat contexts: warm wood room with Tollbearer, dim green-brown hall, night quay, visually dense mixed enemy encounter, and at least one Vael architecture/boss scene.
- Output: **actual 480-wide world pipeline**, as displayed at 1080p/1440p, both still and moving, including HUD/weapon/effects where the player sees them.
- Test player: at least a few people who did **not** build or memorize the roster. Have them play first, then ask what was confusing. Avoid coaching names or threat roles beforehand.

Represent the 58 lighting moods by visually different families at first, then audit all 58 automatically for obvious visibility regressions once a fix is accepted.

---

## 5. FIX SPECIFICATIONS WITH ACCEPTANCE CRITERIA

### P1-A — Level design *appearance*: break the box-and-grid impression

**Reported defect:** oversized uninterrupted interior walls, rectangular rooms, sparse eye-level objects, rows of identical furniture, repeated large floor tiles. A few trims and wall ornaments don't necessarily change how empty a whole 6m wall feels to a person playing.

**Fix in existing code-based level/dressing tools:**

1. **Establish focal architecture** in each reviewed area: a doorway, destroyed wall segment, hanging assembly, beam cluster, platform, or window that gives the room a recognizable composition.
2. **Dress for the player eye-line**: ropes, nets, shelves, pipes, signs, debris, lamplight, broken furniture, cloth, industrial fittings, and story-specific evidence. Choose props appropriate to a Victorian harbour under Vael occupation.
3. **Vary placement logic**: irregular clusters and story-based groupings instead of evenly spaced rows; leave purposeful pathways and sightlines.
4. **Add spatial rhythm**: alternate compressed passages and open rooms, rough edges and clean spaces, prop-dense moments and deliberately empty moments. **Don't turn melancholy silence into clutter soup.**
5. **Break obvious repeat patterns** with more than a texture swap: patch variation, damage, material changes, floor marks and differently sized surfaces.
6. Keep collision/navigation/performance and gameplay routes stable unless changes are separately authorized.

**Acceptance:** In comparable screenshots, a human can identify where the scene is, what matters in the composition, and at least one location-specific detail without reading the map title. The room does not look like one large unbroken textured box. Pathing, enemy behavior, target framerate, and automated map passage remain valid.

### P1-B — Painted materials: fewer generator fingerprints, better material storytelling

**Reported defect:** across 52 wall + 49 floor textures in the internal assessment, repeated **translucent grime circles**, **hairline scratches**, **smooth vertical gradients**, and similar marks across brick, metal, wood, flesh, plaster. Creature atlases reuse spiral glyphs, teeth-like rows and green blotches. This makes different physical substances feel stamped from the same recipe.

**Fix:** first verify what the recent repaint changed, then define specific paint logic for: harbour brick/plaster (salt, waterline, missing mortar), iron (rivets, directional rust bleed), brass (edge highlights, oxidization), painted wood (grain along planks, worn handling zones), cloth (broad folds and shadows), bone/flesh (organic shape shading and variation), stone and Vael-grown material. Add **large readable masses first**; save fine scratches for close-up details that survive at 480-wide output.

**Known high-risk motifs:** the saturated **blue grids in Hollow Stair**, **orange perforated walls in Nerve and Root Bell halls**, **green cubes in Harmonic Gardens**, **plain gray panels**, **noise-fill skies**, and **over-large Customs Hall checkerboard**. A striking geometric motif can remain if it is supported by secondary materials, scale cues, shadows, and world logic. Removing every deliberate geometric pattern would be as bad as keeping all of them.

**Acceptance:** Materials distinguish themselves in **normal in-game footage**, not just zoomed atlases. A wall does not look like a copy of a different wall with a different tint. Targeted before/after comparisons show more coherent material identity, no new shimmering at distance, no broken UVs, and no repeat-pattern regression.

### P1-C — Ordinary enemies: mass, identity, and readable threat action

**Reported defect:** normal humanoids can have tiny cylinders/cones for limbs, weak shoulders, narrow trunks and legs. At close range, some look like lightweight figurines instead of frightening grafted bodies. In separate Council contact-sheet opinions, the Tollbearer/Bellhand/Sexton/Warden-Graft/Marksman/Mender cluster may lose differentiation when small or overlapped.

**Fix in order:**

1. Use the real game camera to identify **which** enemies fail **close**, **medium**, and **distant** viewing. Do not redesign based on contact-sheet thumbnail size alone.
2. Give confirmed weak mobile foes **one dominant body/instrument relationship**: dragging bell, oversized striking apparatus, doubled-down reach/gait, expanded coat/shoulder, visible tool held across body, or distinctive activation posture. Preserve the instrument-grown-into-body logic.
3. Improve **body mass/weight** with broader primary shapes, lower center of gravity, better joint transitions, credible contact, and meaningful pose. This need not mean more polygons or fine paint.
4. **Collision constraint is a director-level decision:** the documented hit-volume-width rule keeps visuals inside the collision cylinder. Widening shoulders/coats may require either a wider hit cylinder (changes gameplay) or permission for limited visible overlap beyond it. **STOP and request approval before altering collision or hit-response behavior.**
5. Pair silhouette with **role/attack states** (wind-up, sound source activation, shielding, aiming, support action). Shape and sound can communicate danger without fluorescent weak-point dots.
6. Preserve the peaceful Vael civilian's non-hostile identity. Do not give it a threat telegraph just because it belongs to the 28-kind bestiary.

**Acceptance:** Representative unfamiliar players can perceive whether a nearby mobile form is pursuing, aiming, preparing an attack, providing support, or not hostile, with fewer mistaken reads than the baseline. At close range its mass/weight is convincing within the stylized aesthetic. Combat collisions/TTK/reach are unchanged unless separately approved.

### P1-D — Boss, sound, and Vael VFX: make an attack feel authored

**Reported defect:** shields, sweeps, ring pulses and beams sometimes resemble single-color transparent rectangles/quads with outlines. Recent added glow may improve this but does not prove the geometry/effect layering is resolved.

**Fix:** at native 480-wide output, use limited, readable layered behavior: a defined leading edge, hot inner core/soft restrained halo where appropriate, motion/pulse, oscillation that relates to sound, and a meaningful impact reaction on walls/ground/targets. A shield should feel like a resonating volume, not merely an alpha-blended signboard. Test animation and audio together.

**Vael color law:** cyan/teal should mean Vael presence/energy. **Do not** apply it to every weak spot, every human firearm sight, every healer, or every outline. Any teal in the **Flare Cannon glass** needs a coherent Vael-energy explanation or should be changed; the internal report flagged this exact conflict. Devices such as Gate Warden/Seal with legitimate Vael energy may keep intentional teal.

**Acceptance:** Human viewers can tell when the effect is **charging / active / over / impacting**, understand its dangerous region, and see it survive real lighting and clutter. No major attacks look like default debug quads; no new bloom swallows the enemy silhouette.

### P2-A — Lighting and grounding without spoiling the dusk

**Reported defect:** some wood, green-brown, and night rooms compress monsters and walls into similar dark middle values; warm hall light turns every character orange. The Council also observed dark legs merging with the studio's blue floor.

**Fix:** targeted **value separation** and clear floor contacts, restrained secondary light from the *other* temperature when appropriate, controlled silhouette/rim highlights where physically or stylistically motivated, and adjusted banding where dark material distinctions vanish. Do not globally lighten every asset or add a glowing ring under everyone.

**Acceptance:** At real encounter distance, the player can locate moving bodies and their ground contacts while the intended room still reads dark, ominous, and atmospheric. Capture side-by-side in selected lighting families, not a special studio-only setup.

### P2-B — 480-wide ink/banding controls

**Reported/visible risk:** tiny struts, hairs, tubes, fingers, and densely grouped organ pipes can disappear under dark outlines and pixel stepping.

**Fix:** inspect at **480-wide rendering**, not enlarged source previews. Where micro-geometry becomes black noise, selectively consolidate small forms, adjust outline contribution by actual screen size, or simplify painted details. Keep high-value large structures (Weeping Mother pipes, Grand Cantor silhouette) intact. Check temporally: a detail should not shimmer or flash as camera moves.

**Acceptance:** Key shape and instrument character remain visible at intended distance, and motion does not produce distracting flicker. No unnecessary homogenization into smooth high-res art.

### P2-C — Weapon/viewmodel current-state verification

**Reported fix:** weapon now matched to world pixel size. **Do not revert it.** Contact sheets explicitly omitted ink outlines and color bands, so using those sheets to prove current-game mismatch is unsound.

**Review:** Tidewarden Scattergun and Charge-Arc Lamp as initial tests, with Flare Cannon as teal-rule exception. Inspect hip/ADS/reload/fire, hand anatomy and grip, shot feedback, weapon occupation of screen, and target visibility. Fists and Vael Tuning-Fork need purposeful nonstandard presentations; melee tools do **not** require fake ADS. The original profile-sheet Fists crop is a contact-sheet deficiency until a current in-game view shows a problem.

**Acceptance:** Same scene, same final rendering: weapon and level feel like the same illustrated world; aiming retains visibility; no hand/weapon awkwardness that breaks immersion; current weapon performance remains unchanged.

### P2-D — Walk cycles and physical presence

**Reported FIXED:** PT-078 has already removed measured large pose snaps in its six-test sample. **Do not relitigate that metric without a regression.**

**Still open:** a mere forward/back stick-leg swing, weak planted feet, little compression before weight transfer, and insufficient mass during close-range movement. Prioritize **Tollbearer** and a contrasting fast creature, then one big mechanical enemy. Different beings should move according to their anatomy: a floating device, a crawling runner, and a bell-carrying human graft must not share the same gait assumptions.

**Acceptance:** No foot skating or weightless pivots visible at close range; attacks and the damage moment line up; the pose-pop metric stays zero on the original tested set, with no newly introduced spikes.

### P2-E — Reading screens, floor repeats, and noncombat presentation

- **Reading UI:** Journal, Record, stats: check text at 1080p and 1440p, including browser windowing and wrapped desktop context. The HUD already reportedly scales; don't replace a working system.
- **Floor patterning:** Customs Hall oversized checkerboard and large plaza 256-pixel tile repeat: use measured in-game captures to tune scale and secondary material patches.
- **Asset sheets:** consistent four-angle framing, legible labels, no accidental clipping. A to-scale lineup is allowed to show tiny creatures honestly; create **separate beauty close-ups** for public-facing images.

**Acceptance:** Text can be read at realistic viewing distances. Floors don't advertise their repeat period. Presentation sheets reflect real scale without making small subjects impossible to inspect.

---

## 6. THE 28-CREATURE TRIAGE — PRESERVE, TEST, OR REPAIR

**These are art-review directions, not verified combat classes.** Gameplay behaviors and the seven actual boss IDs must be read from the game design/data before agent changes. **Preserve the peaceful civilian** and distinguish fixture/non-hostile forms correctly.

| # | Kind | Main visual focus | Status / next step |
|---:|---|---|---|
| 1 | **Tollbearer** | Bent body, shoulder-borne church bell, physical burden. | **Targeted mass + gait review**; strong concept. |
| 2 | **Gaunt Runner** | Gait, stretched arms, attack approach; side silhouette. | **Benchmark mobile threat**; test close/far. |
| 3 | **Bellhand** | Victorian top hat, hand-bell, distinct striking action. | **Targeted role/silhouette check** versus Tollbearer. |
| 4 | **Sexton** | Ceremonial upper shape and robe; readable difference from other upright figures. | **Targeted check** if confused in mixed fight. |
| 5 | **Warden-Graft** | Upper/head shape, visual mass and ground separation. | **Priority small-creature check**. |
| 6 | **Drone-Gill** | Jelly/hover shape, especially thin side profile; real distance visibility. | **Visibility benchmark**; test movement/scale before enlarging. |
| 7 | **Chorister** | One-eyed/horn-like focus and outstretched arms. | **Preserve concept**, clarify meaningful wind-up/activation. |
| 8 | **Zealot** | Ritual implement and stance, not minor ornamentation. | **Role readability check**. |
| 9 | **Marksman** | Weapon/aiming pose and ranged-warning signal. | **Priority ranged benchmark**. |
| 10 | **Mender** | Small body, ambiguous purpose from stills; strong action signal. | **Priority support/role benchmark**, **verify actual role**. |
| 11 | **Resonant** | Grouped multi-body/table shape; mass, contacts, focal mechanism. | **Occlusion/grounding check**. |
| 12 | **Vael Civilian** | Fragile alien anatomy; **non-hostile** distinction. | **Protect peaceful status**; test whether players incorrectly attack or mistake it for a threat. |
| 13 | **Cantor Acolyte** | Wheel-backed recognizable sacred-machine image. | **Preserve design**; inspect active cue at 480-wide. |
| 14 | **Bulwark Shell** | Short heavy shell, distinctive mass/material. | **Tank-like silhouette/texture benchmark**; confirm real role. |
| 15 | **Weeping Mother** | Organ crown and bell machinery; distinctive monumental structure. | **Preserve hero concept**; simplify only truly vanishing micro-pipes. |
| 16 | **Cradle Feeder** | Caged volume, sinister contents, movement/interaction identity. | **Functional-state check**. |
| 17 | **Cantor** | Tall ritual anatomy; differentiation from related named forms. | **Family separation check**. |
| 18 | **Sub-Cantor** | Flared horn form; sound-source direction. | **Preserve signature**, verify side pose. |
| 19 | **Grand Cantor** | Dominant horn/organ body, large supported anatomy. | **Boss-scale visual benchmark**; legs, ground impact, VFX. |
| 20 | **Hive Cantor** | Suspended cruciform, disquieting long limbs. | **Preserve unsettling outline**; make animation and action state clear. |
| 21 | **Gate Warden** | Monumental gateway plus Vael ring. | **Preserve iconic design**; strong VFX/activation opportunity. |
| 22 | **Root Bell** | Encircling bell/cage; copper-heart clapper. | **Hero design benchmark**; material weight, attack/state cue. |
| 23 | **Graft-Mother** | Clock/organ façade; possible fixture-like read. | **Verify function**, communicate active/inactive state if needed. |
| 24 | **Brood Vat** | Water tower on stilts; industrial monument. | **Preserve strong silhouette**; material and interaction states. |
| 25 | **Reed** | **Bagpipe-like form**, not merely a random stick. | **Verify actual gameplay function**; purposeful sonic/airflow signal where applicable. |
| 26 | **Bell Node** | Compact Vael-related device. | **State/interaction cue**, not automatic face or weak-spot glow. |
| 27 | **Seal** | **Armillary** geometry; meaningful alien instrumentation. | **Preserve as architectural/ritual form**; distinguish activation from inertness. |
| 28 | **Root Anchor** | Rooted device with distinctive ring/lamp geometry. | **State/interaction cue** based on actual gameplay. |

**Suggested benchmark group (not a command to redo all): Gaunt Runner, Tollbearer, Marksman, Mender, Vael Civilian, Bulwark Shell, Weeping Mother, Grand Cantor, Root Bell, and one device chosen after its actual role is confirmed.** This explicitly includes a non-hostile creature and both ordinary and monumental forms, preventing a universal “make every entity look dangerous” error.

---

## 7. WEAPON TRIAGE — 9 GUNS, 6 MELEE

The weapon contact sheets show 15 tools, but they were captured without the same outline/banding treatment as the enemy sheets. **Judge the final render only after the reported viewmodel pixel-size correction.**

| Weapon | First current-build check |
|---|---|
| Flare Cannon | Post-fix pixel match; its glass glow must not misuse Vael teal without lore justification. |
| Tidewarden Scattergun | Familiar, dependable benchmark for hip/ADS/fire/reload/shot weight. |
| Riveter Driver | Strong industrial function; check screen occlusion and aim clarity. |
| Harpoon Rifle | Recognizable lance/harpoon profile, projectile/impact communication. |
| Charge-Arc Lamp | Mechanical brass/coil language; Vael-energy cue only where story supports it; ADS space. |
| Harbour Carbine | Distinction from Scattergun and Harpoon Rifle in motion, not just paint. |
| Rocket Line-Thrower | Heavy shape and launch/reload presentation; ignore obsolete 'yellow slab' criticism. |
| Bell-Breaker Mortar | Bell-mouth form and heavy recoil/settling; ignore obsolete 'yellow slab' criticism. |
| Vael Tuning-Fork | Special ready/aim behavior; Vael energy and musical interaction, not fake iron sights. |
| Fists | Real in-game pose vs poor side-profile sheet crop; check punch/readiness. |
| Boat Hook | Grip, leverage, reach, and readable hooked strike. |
| Marlinspike | Short pointed tool, stabbing read and hand alignment. |
| Lamplighter's Mallet | Heavy blunt motion and contact weight. |
| Fire Axe | Trustworthy chop and recognizable blade profile. |
| Shipwright's Chainsaw | Chain/motor action, weight, obstruction and distinctive industrial feel. |

**No wholesale redesign ordered.** Fix actual post-fix FPS inconsistencies rather than independent still-sheet aesthetics.

---

## 8. HUMAN-PLAYER VALIDATION: WHAT THE TEST MUST PROVE

### Separate **recognition**, **danger communication**, **emotional impact**, and **commercial finish**

1. **Recognition:** Can an unfamiliar player distinguish the Gaunt Runner from Bellhand, the Marksman from another human-sized foe, and a small fixture from nearby clutter at normal speed and distance?
2. **Danger/action:** Does an upcoming attack provide a readable sign through pose, sound, environment response, or controlled glow? Does an inactive machine communicate a different state from an active one? Can the peaceful civilian remain visibly non-hostile without becoming banal?
3. **Emotion:** Does the scene feel melancholy, uncanny, oppressive, mournful, or frightening as intended? More brightness or more debris is not automatically better horror.
4. **Finish:** Does a paying player perceive authored environments, differentiated materials, satisfying weapons and effects, readable documents, and convincing close encounters—or generic procedural fill?

### Practical test procedure

- Recruit several people unfamiliar with enemy names and prior art criticism; record or observe actual play, not just a slideshow.
- Let them play Marrow Quay/Customs Hall/Boardwalk, one dark interior, a mixed enemy fight, and a later-campaign showcase after appropriate spoiler precautions.
- Ask **what drew your eye, what you misunderstood, what looked unfinished, and what looked memorable**. Record comments verbatim, with timestamps and screenshots.
- Use silhouette-only, grayscale, isolated-enemy turntables, 480-wide screen-space zoom and outline toggles **only after** a real problem is observed, to diagnose the cause.
- Keep an explicit **confusion log**: expected read, actual read, distance/lighting, consequence, possible cause, tested fix.
- Compare before/after with same map, camera position/FOV, 480-wide render scale, lighting mood, enemies, and post pass; include timing and browser/desktop-wrapper notes if relevant.
- **No invented acceptance percentages:** if the team wants numerical thresholds, establish them against the actual combat design and test cohort first. A false-positive player mistake is more important than a flattering average.

### Automated checks remain useful, but in their lane

- All 68 maps complete their automated playthrough checks after visual edits.
- Visual captures from representative moments stay stable and render at target resolution.
- No new pose snaps, UV corruption, obvious transparency errors, clipping, or bright-color canon violations.
- Memory use/framerate do not substantially worsen in target browser hardware.
- **A bot passing a map is not evidence that a human knows where to look.**

---

## 9. EXECUTION PLAN FOR DEVELOPMENT AGENTS — ORDERED GATES

**Gate 0 — Freeze and document the actual current state.**

- Record current commit/branch, build details, fix IDs, existing rendering rules, FOV and target display resolutions.
- Audit which claimed repairs are already present: environment wall dressing, texture re-paint, glow, viewmodel pixel match, PT-078 pose corrections.
- Capture the specific first-three-map + weakest-late-map comparison scenes and post-fix weapon/enemy interactions.
- **Deliver:** image/video evidence index, list of **Verified Fixed / Open / Uncertain** findings. **PASS:** no stale pre-fix defect is misrepresented as current.

**Gate 1 — Finish opening environments and worst late-game motifs.**

- Repair high-salience negative space, repetitive object placement and level-specific material monotony in the selected maps without modifying playable routes.
- **Deliver:** room-by-room screenshot pairs, placement generator change summary, automated 68-level passage regression. **PASS:** stronger place identity and intentional composition; stable gameplay.

**Gate 2 — Material and lighting coherence.**

- Target confirmed remaining generator marks and poor value separation; preserve code-painted identity and Vael color meaning.
- **Deliver:** material recipes, identical-camera captures at native render scale, contrast failures resolved, no unwanted shimmer. **PASS:** materials read as different substances; rooms remain dark when intended.

**Gate 3 — One complete ordinary-enemy + one elite/boss visual pass.**

- Use **Tollbearer/Gaunt Runner** for close-range mass and approach, **Marksman or Mender** for distant role recognition, plus **Grand Cantor or Root Bell** for monumental animation/effects. Include Vael Civilian in the non-hostile-state check.
- If any geometry exceeds current collision widths, **hold for director decision**, not silent gameplay edits.
- **Deliver:** gameplay clips before/after, attack tells, weight/gait, pose-pop regression, collision-change declaration. **PASS:** improved human comprehension, preserved horror, no unapproved mechanics change.

**Gate 4 — Effects and weapon integration.**

- Fix remaining transparent-slab VFX, ensure sound/visual timing and Vael-teal discipline. Review existing weapon pixel-size fix in actual FPS render; only alter it if it demonstrably fails.
- **Deliver:** attack/shield/beam/ring clips and Scattergun/Charge-Arc/Flare Cannon current-view captures; changed-effects performance impact. **PASS:** effects feel authored, readable, and consistently Vael-coded where appropriate.

**Gate 5 — Full-coverage visual sweep and external human test.**

- Sample all visual lighting families; flag outliers across 58 moods, 68 maps, 28 creature kinds, 15 weapons. For any high-risk finding, capture the actual local gameplay context rather than rewriting by asset list order.
- Outside players report confusion, visual fatigue, perceived quality, and memorable moments.
- **Deliver:** prioritized remaining defects, tester report, regressions, accepted exceptions, evidence archive. **PASS:** no severe release-facing visual failure remains unknown; residual artistic choices are intentional and documented.

**Gate 6 — Marketing and store-facing capture.**

- Regenerate turnarounds and to-scale lineups as inspection aids, but lead with **real first-person game environments and gameplay**. Favor visual story: Port Marrow at dusk, an ordinary graft at threatening proximity, an impossible instrument creature, an unmistakable Vael interaction, a distinctive weapon in the same rendered world.
- **Deliver:** final consistent capture package with correct render settings and current build reference. **PASS:** screenshots show actual game quality and don't conceal unresolved quality gaps through isolated beauty-camera tricks.

---

## 10. COUNCIL CLAIMS TO REJECT, RETRACT, OR QUALIFY

| Claim | Verdict |
|---|---|
| “These are concept models; prove you can build a game.” | **Retract.** The creator reports 68 built maps, two campaigns, and automated passage. Need human proof of quality, not proof that maps exist. |
| “Every creature is a combat enemy.” | **Reject.** The bestiary includes a peaceful Vael civilian; fixture roles require actual game-data verification. |
| “The enemy roster only has eight readable silhouettes.” | **Unsupported absolute.** Still-sheet similarity is visible, but the internal report says ink helps distant readability. Test mixed live encounters. |
| “All ordinary enemies fail at distance.” | **Qualify.** Internal assessment places the stronger documented weakness at **close-up toy-like mass**. Both distances need testing. |
| “Make every enemy glow/put a face or bullseye on it.” | **Reject.** Breaks Vael teal law and the uncanny instrument/architecture language; not every entity is hostile. |
| “Color-code rushers white/red, snipers brass/cyan, tanks toxic green.” | **Reject as universal.** Canon reserves teal for Vael, and expressive palette must serve world logic. |
| “Triple every hat or limb.” | **Reject as formula.** Change only defining forms implicated by current gameplay testing; beware collision rules. |
| “Remove half the enemies / delete furniture-like entities.” | **Reject without mechanical/level design review.** Twenty-eight kinds may serve different encounters, ritual mechanics or narrative functions. |
| “Redraw side/front/back views as 2D sprites.” | **Reject.** Hushfall uses genuine 3D meshes; 2D sprite-redraw is the wrong medium. |
| “Weapons definitely belong to another game.” | **Unproven in current build.** Contact sheets used different passes; creator reports a viewmodel pixel-density correction. Verify real FPS frames. |
| “Fix the 2,622 animation snaps.” | **Reportedly already fixed in PT-078.** Maintain regression tests; remaining problem is movement weight, not demonstrated joint snaps. |
| “The entire HUD is too tiny.” | **Retract.** Internal report corrected the problem to Journal, Record, stats fixed-size text. |
| “Change all 58 light moods to be bright.” | **Reject.** Preserve dark, melancholy mood; repair specific unreadable encounters. |
| “Every empty atlas cell is wasted.” | **Not established.** Only optimize atlas use where it improves visual quality or resource budget. |
| “All legal/Steam AI provenance questions are settled.” | **Not established by this art audit.** The creator's provenance account can be documented, but platform policy/commercial legal review is separate and should be verified against current requirements. |

---

## 11. REQUIRED AGENT WORK-ORDER FORMAT

Each implementation agent should receive **one bounded scope** and return:

1. **Defect:** what a human player sees, in which map/asset/state, with evidence.
2. **Cause:** geometry / paint / 480-wide post effect / light / animation / placement / viewmodel / user-interface, or **unknown** pending investigation.
3. **Canon protected:** Vael teal, real-3D rendering, Port Marrow materials, sound/ritual identity, peaceful civilian, gameplay mechanics.
4. **Change:** exact files/recipes/parameters touched and why; avoid generic mass regeneration.
5. **Proof:** before/after screenshots or clips from **the real game**, same camera and post-processing, with current commit identity.
6. **Regression:** 68-map automated checks where relevant; animation pop check; visuals/frames; performance; color coding; hitboxes and game rules not changed unless approved.
7. **Result:** **PASS / FAIL / NEED EVIDENCE**, with unresolved defects explicitly listed. “Looks better” without controlled comparison is **NEED EVIDENCE**.

### Copy-paste directive for the agent council

> Hushfall is a completed-in-structure, commercially intended 68-map **true 3D** browser FPS, not an unbuilt concept. It renders the world at **480 pixels wide** with deliberate ink outlines and stepped color bands. The code-built, procedurally painted visual style and the Port Marrow/Vael/Hush canon must be preserved. **Teal signifies Vael presence**, not generic danger or a universal weak spot. Of 28 creature kinds, one is a **peaceful Vael civilian**; verify all roles from source data. Recent work reportedly added wall dressing, repainted materials, introduced glow, aligned the viewmodel's pixel scale, and eliminated measured pose pops in PT-078. Begin by proving which older critiques still exist in the current build. Highest priority is environmental finish—especially the first three levels and weak late-game visual motifs—then material specificity, close-range ordinary enemy mass, legitimate attack/state cues, and confirmed crude VFX. Test at actual 480-wide FPS output, under representative lighting and moving encounters, with independent humans. Do not redraw 3D models as sprites, universally recolor or glow characters, silently modify collision/gameplay, or declare all 28 enemies broken from contact sheets. Supply bounded changes, before/after real-game evidence, 68-map and pose regression checks, and an explicit PASS/FAIL/NEED EVIDENCE finding.

---

## 12. FINAL DIRECTOR'S STANDARD

**A player should wonder what these impossible instruments *mean*—not whether a dark smear is an enemy, whether a beam is a debug rectangle, or whether an empty room was ever finished.**

The visual mission is **not to make Hushfall prettier in a generic sense**. It is to make the game feel like an authored Victorian harbour consumed by an alien acoustic religion, with enough material specificity, strange mechanical life, careful room composition, purposeful darkness, and physical weight that a paying player trusts the world.

**Keep the 480-wide art. Keep the dusk. Keep the bells. Keep the silence. Stop letting unfinished surfaces and empty boxes undermine the thing that is already original.**

---

### Evidence/source inventory

- **Creator's authoritative project description** provided in the conversation: scope, lore, campaign count, 480-wide style, asset provenance, current test state, and first-round fix claims.
- **Internal art assessment**, supplied as `Pasted text(20261101-041820).txt`, titled *Hushfall: an art assessment for originality and professionalism*, written 2026-10-31, including original and corrected notes about PT-074 and PT-078. This report states it examined **51 real-game frames** and painted materials; **those frames themselves were not supplied for independent inspection here**.
- **Council critiques** supplied in the conversation: complementary first-impression, silhouette, weapon, atlas, lighting, presentation, and human-player perspectives. Some of those reviewers did not know the true project scope or completed repair status.
- **Visual sheets actually provided:** 28-enemy front/three-quarter/side/back grids, in-scale lineup and seven-at-a-time turnarounds, enemy atlases, 15-weapon hip/ADS/profile sheets and weapon atlas. These are evidence of the art assets as shown, **not evidence of post-fix live gameplay behavior**.

**No external market study, repository audit, legal audit, or fresh real-player test is claimed by this document.**
