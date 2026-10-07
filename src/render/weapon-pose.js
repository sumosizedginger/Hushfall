// Where the first-person weapon sits: hip, raised to the sights, carried in a sprint. ONE pure function, called by view.js every frame and by tools/dev/rast-weapon.mjs (the node-only weapon rasteriser),
// so the preview and the game cannot disagree. No Three objects in here: plain numbers in, plain numbers out.
//
// THE SIGHT PICTURE (PT-011, the owner: "Is this what I should see when I aim down sights? No, like COD."): every rig names its sights in group space, `rig.sights = { rear: [x, y, z], front: [x, y, z] }`
// (the middle of the rear notch / peep, and the front bead). Aiming puts the EYE on the line through them: the rear sight sits `dist` metres in front of the camera, dead centre, and the group is turned about x
// so the rear-to-front line runs straight down the view axis. The body is then BELOW the sight line and the barrel recedes from the rear sight to the bead like a road, instead of the old pose (the whole gun
// 0.5 m ahead of the eye, seen from directly behind: its receiver was a 160 px slab and its barrel was hidden behind it).
import { WEAPONS, BASH } from '../engine/defs.js';

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
  const bash = st.bash ? bashOffset(st.bash) : null;                                                   // the quick melee (key V): the gun is swung butt-first
  return {
    scale: lerp(gs, 0.62, sp),
    pos: [px + sway + (bash ? bash.pos[0] : 0), py + Math.abs(sway) * 0.6 - r * 0.02 - dead * 0.6 + dip + (bash ? bash.pos[1] : 0), pz + r * 0.13 + (bash ? bash.pos[2] : 0)],
    rot: [lerp(0, t.rot[0], a) - r * 0.12 + SPRINT_POSE.rx * sp + (bash ? bash.rot[0] : 0), lerp(lerp(0.1, 0, a), SPRINT_POSE.ry, sp) + (bash ? bash.rot[1] : 0), SPRINT_POSE.rz * sp + (bash ? bash.rot[2] : 0)],
  };
}

// ---------------------------------------------------------------- melee (PT-013): where a swing is, how a gun is bashed, where the fists / a found weapon sit
const ease = (x) => x * x * (3 - 2 * x), clamp01 = (x) => Math.min(1, Math.max(0, x));
/** wind-up and recovery seconds of a swing by name ('bash', 'jab', 'heavy' or a found weapon's id), from the SAME table the sim reads */
export function swingTimes(kind) {
  const S = kind === 'bash' ? BASH : kind === 'jab' ? WEAPONS.fists.swing : kind === 'heavy' ? WEAPONS.fists.charge.heavy : WEAPONS[kind]?.swing;
  return S ? { windup: S.windup, recover: S.recover } : null;
}
/** where a swing is at time t (seconds since it began; negative = no swing): a = the wind-up 0..1, b = the blow 0..1 (the first third of the recovery), c = the return 0..1 */
export function swingPhase(kind, t) {
  const T = t >= 0 ? swingTimes(kind) : null; if (!T) return { a: 0, b: 0, c: 0, on: false };
  const a = ease(clamp01(t / T.windup)), b = ease(clamp01((t - T.windup) / (0.35 * T.recover))), c = ease(clamp01((t - T.windup - 0.35 * T.recover) / (0.65 * T.recover)));
  return { a, b, c, on: true };
}
/** the quick bash with a gun in hand: pull back, then swing the butt up and across. Returns offsets to ADD to the gun's pose. `ph` = swingPhase('bash', t) */
export function bashOffset(ph) {
  const k = ph.a * (1 - ph.b) + ph.b * (1 - ph.c);                                                      // 0 -> 1 (wound back) -> 1 (struck) -> 0
  const back = ph.a * (1 - ph.b), hit = ph.b * (1 - ph.c);
  return { pos: [-0.1 * hit + 0.03 * back, 0.1 * hit - 0.02 * back, -0.22 * hit + 0.1 * back], rot: [0.55 * hit - 0.3 * back, -0.35 * hit + 0.1 * back, 0.5 * hit - 0.15 * back], k };
}
/** the pose of the melee rig's group: fixed in front of the player (the rig animates ITSELF, rig.anim), carried lower in a sprint, dipped on a weapon switch */
export function meleePose(rig, st) {
  const h = rig.hip ?? { pos: [0, 0, -0.3], scale: 0.7 }, sp = st.sprint ?? 0, sway = st.sway ?? 0, dead = st.dead ?? 0, dip = st.dip ?? 0, kick = st.kick ?? 0;
  return { scale: h.scale, pos: [h.pos[0] + sway + 0.04 * sp, h.pos[1] + Math.abs(sway) * 0.6 - 0.12 * sp - dead * 0.6 + dip, h.pos[2] + 0.05 * kick + 0.06 * sp], rot: [0.08 * sp - 0.05 * kick, 0.15 * sp, -0.18 * sp] };
}
