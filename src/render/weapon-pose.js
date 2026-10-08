// Where the first-person weapon sits: hip, raised to the sights, carried in a sprint. ONE pure function, called by view.js every frame and by tools/dev/rast-weapon.mjs (the node-only weapon rasteriser),
// so the preview and the game cannot disagree. No Three objects in here: plain numbers in, plain numbers out.
//
// THE SIGHT PICTURE (PT-011, the owner: "Is this what I should see when I aim down sights? No, like COD."): every rig names its sights in group space, `rig.sights = { rear: [x, y, z], front: [x, y, z] }`
// (the middle of the rear notch / peep, and the front bead). Aiming puts the EYE on the line through them: the rear sight sits `dist` metres in front of the camera, dead centre, and the group is turned about x
// so the rear-to-front line runs straight down the view axis. The body is then BELOW the sight line and the barrel recedes from the rear sight to the bead like a road, instead of the old pose (the whole gun
// 0.5 m ahead of the eye, seen from directly behind: its receiver was a 160 px slab and its barrel was hidden behind it).
import { WEAPONS, BASH } from '../engine/defs.js';

export const HIP = { x: 0.2, y: -0.2, z: -0.5 };
export const HIP_SCALE = 0.74;                                          // PT-021: the guns were 0.62 and sat small in the corner of the frame ("bigger in the frame"); the aimed gun's own scale is unchanged
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
    const gs = lerp(HIP_SCALE, 0.56, a), px = lerp(lerp(HIP.x, LEGACY_ADS.x, a), SPRINT_POSE.x, sp), py = lerp(lerp(HIP.y, rig.adsY * gs / HIP_SCALE, a), SPRINT_POSE.y, sp), pz = lerp(lerp(HIP.z, LEGACY_ADS.z, a), SPRINT_POSE.z, sp);
    return { scale: gs, pos: [px + sway, py + Math.abs(sway) * 0.6 - r * 0.02 - dead * 0.6 + dip, pz + r * 0.13], rot: [-r * 0.12 + SPRINT_POSE.rx * sp, lerp(lerp(0.1, 0, a), SPRINT_POSE.ry, sp), SPRINT_POSE.rz * sp] };
  }
  const t = adsTarget(rig), gs = lerp(HIP_SCALE, t.scale, a);
  const px = lerp(lerp(HIP.x, t.pos[0], a), SPRINT_POSE.x, sp), py = lerp(lerp(HIP.y, t.pos[1], a), SPRINT_POSE.y, sp), pz = lerp(lerp(HIP.z, t.pos[2], a), SPRINT_POSE.z, sp);
  const bash = st.bash ? bashOffset(st.bash) : null;                                                   // the quick melee (key V): the gun is swung butt-first
  return {
    scale: lerp(gs, HIP_SCALE, sp),
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
/** the blow's own travel: the LAST part of the wind-up, so that it ends at the very instant the sim resolves the hit (t = windup; PT-017: the first version drew the blow AFTER the damage, up to a quarter of a second late) */
export const strikeTime = (T) => Math.min(0.14, Math.max(0.035, 0.4 * T.windup));
/**
 * where a swing is at time t (seconds since it began; negative = no swing): a = the pull-back 0..1, b = the blow 0..1 (accelerating, and 1 exactly when the sim's hit lands), c = the return 0..1 (after a short hold on the follow-through).
 * pull-back + blow = the sim's `windup`; hold + return = its `recover`.
 */
export function swingPhase(kind, t) {
  const T = t >= 0 ? swingTimes(kind) : null; if (!T) return { a: 0, b: 0, c: 0, on: false };
  const s = strikeTime(T), pull = T.windup - s, hold = 0.2 * T.recover;
  const a = ease(clamp01(t / pull)), b = clamp01((t - pull) / s) ** 2, h = clamp01((t - T.windup) / hold), c = ease(clamp01((t - T.windup - hold) / (T.recover - hold)));          // h: 0..1 through the hold on the follow-through (the weapon sinks past its hit pose and settles)
  return { a, b, c, h, on: true };
}
/**
 * How a blow FEELS (PT-020; VIEW ONLY: the simulation never reads this, so no balance, hash or evidence depends on it).
 *   stop   the freeze on contact, seconds: the weapon sticks in the body for a moment (a hit-stop of the view model only; the heavier the weapon the longer)
 *   pitch  the camera's kick, radians, [as the weapon is raised, on the blow]: + looks up. roll: the same for the camera's roll, + leans to the right
 *   over   how far past the hit pose the weapon sinks and settles, as a share of the stroke
 * Kept small: the camera kick is visual and the hit arc is wide, but a blow must never feel like it moved your aim.
 */
export const FEEL = {
  jab: { stop: 0.035, pitch: [0.004, -0.01], roll: [0.0, 0.0], over: 0.05 }, heavy: { stop: 0.075, pitch: [0.012, -0.028], roll: [0.01, -0.012], over: 0.08 }, bash: { stop: 0.04, pitch: [0.006, -0.014], roll: [0.0, 0.01], over: 0.06 },
  boathook: { stop: 0.05, pitch: [0.006, -0.015], roll: [0.008, -0.01], over: 0.06 }, marlinspike: { stop: 0.03, pitch: [0.003, -0.01], roll: [0.0, -0.006], over: 0.04 },
  mallet: { stop: 0.09, pitch: [0.028, -0.04], roll: [0.0, 0.0], over: 0.09 }, axe: { stop: 0.085, pitch: [0.014, -0.032], roll: [-0.03, 0.045], over: 0.08 },
};
/**
 * The swing's own clock for the VIEW (PT-020): sim seconds since the swing began, minus the time the view model was held at the contact (the hit-stop). Pure and testable; the simulation never sees it, and because it counts SIM
 * time (the pause and the wheel's slowed time hold it too) a freeze lasts as long as the game says, not as long as the frame rate does.
 *   start(kind, t0)  a swing began at sim time t0 (the 'swing' event's tick)     hit(kind, killed)  the 'melee_hit' event: snap to the hit pose and hold it FEEL[kind].stop seconds (once per swing)
 *   sample(now)      the phase { a, b, c, h, on } at sim time `now` (null once the swing, and its freeze, are over)
 */
export class SwingClock {
  constructor() { Object.assign(this, { on: false, kind: null, t0: 0, stopped: 0, freeze: 0, snap: false, hitDone: false, lastNow: 0 }); }
  start(kind, t0) { Object.assign(this, { on: true, kind, t0, stopped: 0, freeze: 0, snap: false, hitDone: false, lastNow: t0 }); }
  hit(kind, killed = false) {
    if (!this.on || this.kind !== kind) return;
    if (!this.hitDone) { this.hitDone = true; this.snap = true; }
    this.freeze = Math.max(this.freeze, (FEEL[kind]?.stop ?? 0.04) * (killed ? 1.3 : 1));
  }
  sample(now) {
    if (!this.on) return null;
    const T = swingTimes(this.kind); if (!T) { this.on = false; return null; }
    if (this.snap) { this.snap = false; this.stopped = Math.max(0, now - this.t0 - T.windup); }                                  // the contact: the pose IS the hit pose, whatever the frame did
    else if (this.freeze > 0) { const use = Math.min(this.freeze, Math.max(0, now - this.lastNow)); this.stopped += use; this.freeze -= use; }
    this.lastNow = now; const t = now - this.t0 - this.stopped;
    if (t > T.windup + T.recover) { this.on = false; return null; }
    return swingPhase(this.kind, Math.max(0, t));
  }
}
/** the camera's kick for a swing phase: { pitch, roll } in radians (see FEEL) */
export function swingCamera(kind, ph) {
  const F = FEEL[kind]; if (!F || !ph.on) return { pitch: 0, roll: 0 };
  const pull = ph.a * (1 - ph.b), blow = ph.b * (1 - ph.c);
  return { pitch: F.pitch[0] * pull + F.pitch[1] * blow, roll: F.roll[0] * pull + F.roll[1] * blow };
}
/** the quick bash with a gun in hand: pull back, then swing the butt up and across. Returns offsets to ADD to the gun's pose. `ph` = swingPhase('bash', t) */
export function bashOffset(ph) {
  const k = ph.a * (1 - ph.b) + ph.b * (1 - ph.c);                                                      // 0 -> 1 (wound back) -> 1 (struck) -> 0
  const back = ph.a * (1 - ph.b), hit = ph.b * (1 - ph.c);
  return { pos: [-0.1 * hit + 0.03 * back, 0.1 * hit - 0.02 * back, -0.22 * hit + 0.1 * back], rot: [0.55 * hit - 0.3 * back, -0.35 * hit + 0.1 * back, 0.5 * hit - 0.15 * back], k };
}
/** the pose of the melee rig's group: fixed in front of the player (the rig animates ITSELF, rig.anim), carried lower in a sprint, dipped on a weapon switch */
export function meleePose(rig, st) {
  const h = rig.hip ?? { pos: [0, 0, -0.3], scale: 0.7 }, sp = st.sprint ?? 0, sway = st.sway ?? 0, dead = st.dead ?? 0, dip = st.dip ?? 0, kick = st.kick ?? 0, lx = st.lagX ?? 0, ly = st.lagY ?? 0;      // lagX / lagY: the view model trails a turning view (PT-020)
  return { scale: h.scale, pos: [h.pos[0] + sway + 0.04 * sp + lx, h.pos[1] + Math.abs(sway) * 0.6 - 0.12 * sp - dead * 0.6 + dip + ly, h.pos[2] + 0.05 * kick + 0.06 * sp], rot: [0.08 * sp - 0.05 * kick + ly * 0.8, 0.15 * sp - lx * 1.2, -0.18 * sp - lx * 1.6] };
}
