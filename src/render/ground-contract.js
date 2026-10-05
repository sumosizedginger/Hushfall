// The render-side GROUNDING CONTRACT for actors (PT-001 / PT-002: enemies drawn under the floor).
//
// Two transforms, two owners. An enemy view has
//   root - the WORLD placement. Owned by GameView (view.js): x, z, yaw and y = the sim's authoritative ground for that actor.
//          The sim keeps e.y equal to groundAt(world, x, z, radius) (terrain.js): the HIGHEST floor under the actor's footprint
//          (centre + four edge points), so it can differ from the centre-cell floorAt() on stairs, ledges and cell borders.
//          A pose function never writes it.
//   rig  - the LOCAL pose container. Owned by the model (models.js): scale, topple (death / crouch) and a vertical lift that keeps
//          the lowest rendered vertex on the contact plane. Everything an animation may change lives here.
//
// What the contract promises, measured on true WORLD-SPACE rendered vertices (not the sim's numbers):
//   lowest vertex of the rig  >=  authoritative ground - GROUND_BAND.buried     (nothing may be buried in the floor)
//   lowest vertex of the rig  <=  authoritative ground + GROUND_BAND.floating   (grounded poses do not hover)
//
// Why these numbers (they are tolerances, not targets; the model code lifts to the plane exactly):
//   buried   0.03 m  The renderer interpolates root.y between ticks (alpha); on a 0.5 m stair a body can be a fraction of a step off the sim's
//                    snapped y for one frame, and float error / the sleeping-merge bake add ~1e-6. 3 cm is under the 1/4-texel scale of the
//                    low-resolution presentation and below a boot's thickness: nobody can see it. 5 cm and more reads as "sinking".
//   floating 0.30 m  The walk cycle does not drop the hips when the stride widens, so the lowest vertex rides up a little (stride bounce, not
//                    flight). Measured maxima over every pose (tests/rig-grounding.test.js sweep): Tollbearer/Bellhand/Sexton 0.12, Warden 0.16,
//                    Gaunt 0.22, Cantor 0.24 (it is drawn at 2x scale). 0.30 m leaves a margin over those and still catches "standing on the
//                    wrong floor" (a stair step is 0.5 m). It is NOT a licence to hover: only the lowest vertex is judged, dead bodies and
//                    crouches are lifted exactly onto the plane, and the browser census reports the measured maximum so the margin stays visible.
export const GROUND_BAND = Object.freeze({ buried: 0.03, floating: 0.30 });

/** off = lowest rendered vertex minus the authoritative ground (m): negative is buried, positive floats */
export function groundVerdict(minY, groundY, band = GROUND_BAND) {
  const off = minY - groundY;
  return { off, buried: off < -band.buried, floating: off > band.floating, ok: off >= -band.buried && off <= band.floating };
}
