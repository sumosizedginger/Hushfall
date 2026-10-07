// Where the first-person weapon sits: hip, raised to the sights, carried in a sprint. ONE pure function, called by view.js every frame and by tools/dev/rast-weapon.mjs (the node-only weapon rasteriser),
// so the preview and the game cannot disagree. No Three objects in here: plain numbers in, plain numbers out.
//
// THE SIGHT PICTURE (PT-011, the owner: "Is this what I should see when I aim down sights? No, like COD."): every rig names its sights in group space, `rig.sights = { rear: [x, y, z], front: [x, y, z] }`
// (the middle of the rear notch / peep, and the front bead). Aiming puts the EYE on the line through them: the rear sight sits `dist` metres in front of the camera, dead centre, and the group is turned about x
// so the rear-to-front line runs straight down the view axis. The body is then BELOW the sight line and the barrel recedes from the rear sight to the bead like a road, instead of the old pose (the whole gun
// 0.5 m ahead of the eye, seen from directly behind: its receiver was a 160 px slab and its barrel was hidden behind it).
export const HIP = { x: 0.2, y: -0.2, z: -0.46 };
export const SPRINT_POSE = { x: 0.13, y: -0.235, z: -0.42, rx: -0.3, ry: 0.65, rz: -0.28 };           // gun carried low and across the body
const LEGACY_ADS = { x: 0, y: -0.067, z: -0.6 };
const lerp = (a, b, t) => a + (b - a) * t;

/** the pose the gun has at FULL aim: { scale, pos: [x, y, z], rot: [rx, 0, 0] } from the rig's sights */
export function adsTarget(rig) {
  const { rear, front } = rig.sights, gs = rig.adsScale ?? 0.5, dist = rig.adsDist ?? 0.24;
  const th = -Math.atan2(front[1] - rear[1], rear[2] - front[2]);                                     // level the line rear -> front
  const c = Math.cos(th), s = Math.sin(th), ry = rear[1] * gs, rz = rear[2] * gs;                      // the rear sight after the turn
  return { scale: gs, pos: [-rear[0] * gs, -(ry * c - rz * s), -dist - (ry * s + rz * c)], rot: [th, 0, 0] };
}

/**
 * st: { ads 0..1, sprint 0..1, sway (m, lateral bob), recoil 0..1, dead (0..1 lowering), dip (m, a weapon switch), legacy }
 * -> { scale, pos: [x, y, z], rot: [x, y, z] } for rig.group
 */
export function weaponPose(rig, st) {
  const a = st.ads, sp = st.sprint, sway = st.sway ?? 0, r = (st.recoil ?? 0) * (1 - 0.5 * a), dead = st.dead ?? 0, dip = st.dip ?? 0;
  if (st.legacy || !rig.sights) {                                                                      // the pose before PT-011 (kept so the old stills can be reproduced)
    const gs = lerp(0.62, 0.56, a), px = lerp(lerp(HIP.x, LEGACY_ADS.x, a), SPRINT_POSE.x, sp), py = lerp(lerp(HIP.y, rig.adsY * gs / 0.62, a), SPRINT_POSE.y, sp), pz = lerp(lerp(HIP.z, LEGACY_ADS.z, a), SPRINT_POSE.z, sp);
    return { scale: gs, pos: [px + sway, py + Math.abs(sway) * 0.6 - r * 0.02 - dead * 0.6 + dip, pz + r * 0.13], rot: [-r * 0.12 + SPRINT_POSE.rx * sp, lerp(lerp(0.1, 0, a), SPRINT_POSE.ry, sp), SPRINT_POSE.rz * sp] };
  }
  const t = adsTarget(rig), gs = lerp(0.62, t.scale, a);
  const px = lerp(lerp(HIP.x, t.pos[0], a), SPRINT_POSE.x, sp), py = lerp(lerp(HIP.y, t.pos[1], a), SPRINT_POSE.y, sp), pz = lerp(lerp(HIP.z, t.pos[2], a), SPRINT_POSE.z, sp);
  return {
    scale: lerp(gs, 0.62, sp),
    pos: [px + sway, py + Math.abs(sway) * 0.6 - r * 0.02 - dead * 0.6 + dip, pz + r * 0.13],
    rot: [lerp(0, t.rot[0], a) - r * 0.12 + SPRINT_POSE.rx * sp, lerp(lerp(0.1, 0, a), SPRINT_POSE.ry, sp), SPRINT_POSE.rz * sp],
  };
}
