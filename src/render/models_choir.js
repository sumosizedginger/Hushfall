// The ten Tollbearer / Vael creatures of the look redesign (design/LOOK_BIBLE.md, "Tuned": every creature is an instrument that has been tuned). Same contract as every other rig in the game
// (src/render/ground-contract.js): the view owns `root` (world placement), `pose(p)` writes only `rig`, the lowest vertex is lifted onto the contact plane by the grounder, a FLYER adds its hover inside
// the rig after grounding. Each factory is makeX(atlasTexture) -> { root, rig, pose, mat } like makeTollbearer / makeDroneGill, and wears ITS OWN baked atlas (`choir_<kind>`, cells by name in
// src/render/choir_cells.js). Hit volumes are the ones in src/engine/defs.js and did not move: tools/look/check-rigs.mjs re-applies the project's fairness and grounding rules to every rig here.
// Front is +z (the view turns `root` to face the player); screen-right is +x as the player sees a creature facing them.
// Design rules that came out of real renders through the post pass at 480 px: big shapes and big value shifts survive, hairlines do not; a bell is a church bell (domed crown, straight waist, flared
// lip), not a funnel; flat card-like panels read as labels; teal is light (eyes, clappers, rings, tells), never paint; a prop worn by the body is hung from a joint so the motion can be the instrument.
import * as THREE from 'three';
import { makeCreature, humanoidPose, ease, clamp01 } from './choir_kit.js';
import { cellsOf } from './choir_cells.js';

const S = Math.sin, K = Math.cos, PI = Math.PI, V2 = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y));
const legs = (R, hipsName, x, spec, footCell) => {
  for (const [n, s] of [['legA', -1], ['legB', 1]]) { R.limb(hipsName, n, [s * x, 0, 0], spec); R.box(n + 'M', spec.fw ?? 0.13, spec.fh ?? 0.08, spec.fl ?? 0.3, footCell, { pos: [0, -spec.b + 0.01, 0.06] }); }
};
/** a head on a neck: lumpy skull, hanging jaw with a dark mouth, sockets, teal light in the eye(s). eyes: 'one' (the screen-left socket lit), 'both' */
const head = (R, C, { neckAt, r = 0.15, tall = 1.3, neck = 0.2, cell = C.skin, eyes = 'both', eyeX = 0.06, seed = 3 }) => {
  R.joint('neck', 'spine', neckAt); R.cyl('neck', 0.055, 0.065, neck, 6, cell, { pos: [0, neck / 2 - 0.03, 0] });
  R.joint('head', 'neck', [0, neck - 0.04, 0]); R.lump('head', r, 1, 0.1, seed, cell, { pos: [0, r * 0.55, 0], scale: [0.85, tall, 1] });
  R.joint('jaw', 'head', [0, -0.05, r * 0.2]); R.box('jaw', r * 0.72, r * 0.9, r * 0.8, cell, { pos: [0, -r * 0.45, r * 0.3] }); R.box('jaw', r * 0.62, r * 0.62, 0.02, C.mouth, { pos: [0, r * 0.1, r * 0.64] });
  R.sph('head', r * 0.28, 5, 3, C.iron, { pos: [-eyeX, r * 0.72, r * 0.76] }); R.sph('head', r * 0.28, 5, 3, C.iron, { pos: [eyeX, r * 0.72, r * 0.76] });
  R.sph('head', r * 0.14, 4, 3, 'glow', { pos: [-eyeX, r * 0.72, r * 0.93] }); if (eyes === 'both') R.sph('head', r * 0.14, 4, 3, 'glow', { pos: [eyeX, r * 0.72, r * 0.93] });
};
/** a hand: a lumpy palm and three bone fingers */
const hand = (R, C, arm, { len, r = 0.075, finger = 0.2, cell = C.skin }) => { R.lump(arm + 'M', r, 0, 0.12, 5, cell, { pos: [0, -len, 0], scale: [0.95, 1.5, 0.78] }); for (const d of [-1, 0, 1]) R.cone(arm + 'M', 0.018, finger, 4, C.bone, { pos: [d * r * 0.5, -len - r * 1.4 - finger / 2 + 0.03, 0.01], rot: [PI, 0, 0] }); };

// ------------------------------------------------------------------------------------------------------------------ TOLLBEARER (the bell: oxblood oilskin, a church bell hung from the shoulder on a grown rope)
/** o.stage: 0 = early graft (Episode 1: a small bell), 2 = grown (Episode 2 on: a great bell, verdigris at the lip, a bone spur). The drawn height is the shipped 2.25 m at every stage. */
export function tollbearer(tex, o = {}) {
  const C = cellsOf('tollbearer'), stage = o.stage ?? 2, big = stage >= 2;
  return makeCreature(tex, (R) => {
    R.joint('hips', null, [0, 0.94, 0]);
    legs(R, 'hips', 0.11, { a: 0.46, b: 0.44, r0: 0.105, r1: 0.082, r2: 0.058, cellA: C.trou, cellB: C.skin }, C.trou);
    R.joint('spine', 'hips', [0, 0.05, 0]);
    R.cyl('spine', 0.15, 0.18, 0.78, 8, C.skin, { pos: [0, 0.38, 0], scale: [1, 1, 0.75] });                                                 // the torso under the coat: skin
    R.pleat('spine', V2([[0.15, 0.82], [0.2, 0.78], [0.255, 0.66], [0.27, 0.48], [0.285, 0.28], [0.32, 0.06], [0.36, -0.14], [0.38, -0.3]]), 12, 5, 0.07, C.coat, { scale: [1, 1, 0.72], phi: [0.55, PI * 2 - 1.1] });   // the oilskin coat, torn open down the front
    for (const s of [-1, 1]) R.lump('spine', 0.12, 0, 0.18, s + 2, C.coat, { pos: [s * 0.25, 0.74, 0], scale: [1.2, 0.8, 1] });             // hunched shoulders
    const strips = big ? 8 : 5;
    for (let i = 0; i < strips; i++) {                                                                                                       // the hem in strips: the strings of the instrument
      const a = (i / strips) * PI * 2 + 0.3, len = 0.3 + 0.2 * ((i * 5) % 3) / 2;
      R.joint('tat' + i, 'spine', [S(a) * 0.35 * 0.98, -0.28, K(a) * 0.35 * 0.72], [0, a, 0]); R.rag('tat' + i, 0.13, len, 0.05, 0.5, i % 2 ? C.coat : C.coatDk, { pos: [0, -len / 2, 0] });
    }
    for (const [n, s] of [['armA', -1], ['armB', 1]]) { R.limb('spine', n, [s * 0.27, 0.7, 0], { a: 0.36, b: 0.5, r0: 0.075, r1: 0.062, r2: 0.052, cellA: C.coat, cellB: C.skin }); hand(R, C, n, { len: 0.56 }); }
    head(R, C, { neckAt: [0, 0.82, 0.03], r: 0.165, tall: 1.28, neck: 0.22, eyes: 'one' });
    // THE BELL: a church bell on a rope that has grown into the screen-right shoulder, swinging at the hip as a pendulum
    const bh = big ? 0.5 : 0.34, rl = big ? 0.28 : 0.18, rope = 0.3;
    R.joint('bellPivot', 'spine', [0.3, 0.7, -0.02]);
    R.tube('bellPivot', [[0, 0.04, 0], [0.01, -rope / 2, 0.01], [0.02, -rope, 0]], [0.03, 0.026, 0.026], 5, C.rope);
    for (const [dx, dy] of [[-0.1, 0.1], [-0.14, 0.02]]) R.tube('bellPivot', [[0, 0.02, 0], [dx * 0.5, dy * 0.6, 0.02], [dx, dy, 0.01]], [0.032, 0.03, 0.01], 4, C.bone);    // the roots into the shoulder
    R.joint('bell', 'bellPivot', [0.02, -rope, 0]);
    const bell = R.bell('bell', bh, rl, C.bronze, C.bronzeDk, { pos: [0, -bh, 0], name: 'bellMesh' });
    R.tor('bell', rl, 0.03, 4, 12, C.bronzeDk, { pos: [0, -bh + 0.02, 0], rot: [PI / 2, 0, 0] });
    if (big) R.cyl('bell', rl * 0.94, rl * 1.0, 0.13, 10, C.verd, { pos: [0, -bh + 0.1, 0] });
    R.sph('bell', 0.05, 6, 4, 'glow', { pos: [0, -bh + 0.0, 0], name: 'clapper' });
    R.J.bellEchoes = R.echo(bell, 1, 0.14);
    if (big) R.cone('spine', 0.12, 0.6, 5, C.bone, { pos: [-0.34, 0.12, -0.05], rot: [0, 0, 1.15] });                                         // a bone spur grown from the other hip
  }, (p, J, R) => {
    const t = p.t, h = humanoidPose(p, J, big ? { stoop: 0.2, lean: 0.06, headX: 0.5, headZ: 0.32, jawOpen: 0.5, hipY: 0.94 } : { stoop: 0.14, lean: 0.03, headX: 0.35, headZ: 0.2, jawOpen: 0.4, hipY: 0.96 });
    const ring = h.raise * (1 - h.rec);
    J.bellPivot.rotation.z = S(t * 1.7) * 0.05 + S(p.phase - 0.9) * 0.3 * p.walk + 0.5 * h.raise * (1 - h.slam) - 0.4 * h.slam * (1 - h.rec);       // the pendulum: it lags the stride and is thrown out by the raised arm
    J.bell.rotation.x = S(t * 1.3) * 0.04 + 0.2 * h.slam;
    J.clapper.scale.setScalar(1 + 0.25 * S(t * 3) + 1.4 * ring); R.ring(J.bellEchoes, p.attack > 0 ? ring : 0);
    for (let i = 0; J['tat' + i]; i++) J['tat' + i].rotation.x = S(t * 1.6 + i * 1.3) * 0.12 + 0.35 * p.walk * S(p.phase + i);
  });
}

// ------------------------------------------------------------------------------------------------------------------ GAUNT (UNTUNED: the screamer; raw, nothing grafted, nothing grown)
export function gaunt(tex) {
  const C = cellsOf('gaunt');
  return makeCreature(tex, (R) => {
    R.joint('hips', null, [0, 0.66, 0]);
    for (const [n, s] of [['legA', -1], ['legB', 1]]) { R.limb('hips', n, [s * 0.1, 0, 0], { a: 0.36, b: 0.36, r0: 0.1, r1: 0.075, r2: 0.05, cellA: C.skin, cellB: C.skinDk, seg: 6 }); R.box(n + 'M', 0.12, 0.06, 0.26, C.bone, { pos: [0, -0.36, 0.07] }); }
    R.joint('spine', 'hips', [0, 0.04, 0]);
    R.cyl('spine', 0.2, 0.24, 0.6, 7, C.skin, { pos: [0, 0.3, 0], scale: [1, 1, 0.85] });
    R.cyl('spine', 0.11, 0.13, 0.36, 6, C.flesh, { pos: [0.04, 0.34, 0.15], scale: [1, 1, 0.45] });                       // the open chest: raw
    for (let i = 0; i < 4; i++) R.cone('spine', 0.05, 0.22, 4, C.bone, { pos: [0, 0.12 + i * 0.14, -0.2 - i * 0.01], rot: [-0.75, 0, 0] });             // a ridge of bone down the back
    for (const [n, s] of [['armA', -1], ['armB', 1]]) {
      R.limb('spine', n, [s * 0.27, 0.52, 0], { a: 0.36, b: 0.4, r0: 0.085, r1: 0.07, r2: 0.055, cellA: C.skin, cellB: C.skinDk, seg: 6 });
      R.lump(n + 'M', 0.09, 0, 0.14, 7, C.skinDk, { pos: [0, -0.43, 0], scale: [1, 1.25, 0.85] });
      for (const d of [-1, 0, 1]) R.cone(n + 'M', 0.024, 0.24, 4, C.claw, { pos: [d * 0.04, -0.63, 0.02], rot: [PI, 0, 0] });                            // bone claws
    }
    R.joint('neck', 'spine', [0, 0.5, 0.04]); R.cyl('neck', 0.06, 0.07, 0.12, 6, C.skin, { pos: [0, 0.03, 0] });
    R.joint('head', 'neck', [0, 0.1, 0]); R.lump('head', 0.16, 1, 0.1, 4, C.skin, { pos: [0, 0.08, 0], scale: [0.9, 1.0, 1.1] });
    R.box('head', 0.13, 0.11, 0.05, C.throat, { pos: [0, -0.02, 0.15] });                                                // the throat: a red slot in the face, the horn
    R.joint('jaw', 'head', [0, -0.02, 0.08]);                                                                          // the jaw has come off its hinge: it hangs DOWN, long, bone
    R.box('jaw', 0.11, 0.34, 0.07, C.bone, { pos: [0, -0.17, 0.02] });
    R.sph('head', 0.03, 6, 4, 'glow', { pos: [-0.07, 0.13, 0.14] }); R.sph('head', 0.03, 6, 4, 'glow', { pos: [0.07, 0.13, 0.14] });
  }, (p, J, R) => {
    const w = p.walk, ph = p.phase, t = p.t, cr = Math.max(0, -p.lunge), ex = Math.max(0, p.lunge), swing = S(ph) * 1.0 * w;
    J.legA.rotation.x = swing * (1 - ex) - ex * 0.9; J.legB.rotation.x = -swing * (1 - ex) - ex * 0.9;
    J.legAM.rotation.x = 0.4 + Math.max(0, K(ph)) * 1.0 * w + cr * 1.1 + ex * 0.2; J.legBM.rotation.x = 0.4 + Math.max(0, -K(ph)) * 1.0 * w + cr * 1.1 + ex * 0.2;
    J.hips.position.y = 0.66 - cr * 0.38 - ex * 0.12 + Math.abs(S(ph)) * 0.05 * w;
    J.spine.rotation.x = 0.7 + 0.1 * w + cr * 0.5 + ex * 0.45 + S(t * 1.8) * 0.03; J.spine.rotation.y = -S(ph) * 0.15 * w; J.spine.rotation.z = S(ph) * 0.06 * w + S(t * 38) * 0.08 * cr;
    J.armA.rotation.x = -0.85 - S(ph) * 0.7 * w; J.armB.rotation.x = -0.85 + S(ph) * 0.7 * w; J.armA.rotation.z = -0.05; J.armB.rotation.z = 0.05; J.armAM.rotation.x = J.armBM.rotation.x = -0.2;
    if (cr > 0) { J.armA.rotation.x = J.armB.rotation.x = -0.4; J.armAM.rotation.x = J.armBM.rotation.x = -1.4; }
    if (ex > 0) { J.armA.rotation.x = J.armB.rotation.x = -2.6; J.armAM.rotation.x = J.armBM.rotation.x = 0; }
    const a = p.attack; if (a > 0) { const up = a < 0.4 ? ease(a / 0.4) : 1, sl = a < 0.4 ? 0 : ease(clamp01((a - 0.4) / 0.2)); J.armB.rotation.x = -2.9 * up + 1.8 * sl; J.armA.rotation.x = -2.9 * up * 0.6 + 1.4 * sl; }
    J.head.rotation.x = -0.6 + S(t * 2.4) * 0.05; J.head.rotation.z = S(t * 1.3) * 0.08;
    J.jaw.rotation.x = -(0.12 + Math.max(cr, ex) * 0.5 + (a > 0 ? 0.3 : 0) + S(t * 5) * 0.03);                          // the scream: the jaw drops further on the crouch tell
    J.rig.rotation.z = ease(clamp01(p.dead)) * 1.5;
  });
}

// ------------------------------------------------------------------------------------------------------------------ BELLHAND (the crier: indigo coat and stovepipe hat, a hand-bell raised and always ringing)
export function bellhand(tex) {
  const C = cellsOf('bellhand');
  return makeCreature(tex, (R) => {
    R.joint('hips', null, [0, 0.9, 0]);
    legs(R, 'hips', 0.1, { a: 0.47, b: 0.43, r0: 0.09, r1: 0.07, r2: 0.05, cellA: C.trou, cellB: C.trou }, C.coatDk);
    R.joint('spine', 'hips', [0, 0.05, 0]);
    R.pleat('spine', V2([[0.1, 0.84], [0.17, 0.78], [0.225, 0.62], [0.235, 0.4], [0.255, 0.18], [0.3, -0.05], [0.34, -0.26]]), 12, 6, 0.05, C.coat, { scale: [1, 1, 0.75] });       // the long coat, buttoned to the throat
    R.lathe('spine', V2([[0.22, 0.95], [0.2, 0.9], [0.15, 0.82], [0.12, 0.78]]), 10, C.coatDk, { pos: [0, 0, 0.02] });                                                          // a flared collar: the head stands in it like a clapper
    R.tor('spine', 0.2, 0.03, 4, 12, C.bronze, { pos: [0, 0.93, 0.02], rot: [PI / 2, 0, 0] });
    for (const s of [-1, 1]) R.lump('spine', 0.11, 0, 0.18, s + 5, C.coat, { pos: [s * 0.24, 0.72, 0], scale: [1.2, 0.8, 1] });
    // armA (screen-left): raised beside the head, holding a bronze hand-bell by a handle that has grown from the wrist
    R.limb('spine', 'armA', [-0.24, 0.7, 0], { a: 0.34, b: 0.34, r0: 0.07, r1: 0.062, r2: 0.055, cellA: C.coat, cellB: C.skin });
    R.lump('armAM', 0.07, 0, 0.12, 6, C.skin, { pos: [0, -0.36, 0], scale: [1, 1.3, 0.9] });
    R.joint('hb', 'armAM', [0, -0.46, 0]);
    R.cyl('hb', 0.022, 0.03, 0.2, 5, C.bone, { pos: [0, 0.1, 0] }); R.sph('hb', 0.04, 5, 4, C.bone, { pos: [0, 0.22, 0] });
    const hbell = R.bell('hb', 0.3, 0.19, C.bronze, C.bronzeDk, { pos: [0, -0.3, 0], name: 'hbellMesh', seg: 8 });
    R.sph('hb', 0.045, 5, 4, 'glow', { pos: [0, -0.3, 0], name: 'hclapper' });
    R.J.hbEchoes = R.echo(hbell, 1, 0.14);
    // armB (screen-right): hangs, a long rope coiled on the hip
    R.limb('spine', 'armB', [0.24, 0.7, 0], { a: 0.36, b: 0.42, r0: 0.07, r1: 0.062, r2: 0.055, cellA: C.coat, cellB: C.skin }); hand(R, C, 'armB', { len: 0.46 });
    R.tube('spine', [[0.27, 0.0, 0.1], [0.34, -0.04, 0.12], [0.36, -0.14, 0.1], [0.3, -0.2, 0.1], [0.24, -0.12, 0.12]], 0.025, 4, C.rope);
    head(R, C, { neckAt: [0, 0.86, 0.03], r: 0.15, tall: 1.2, neck: 0.1, eyes: 'both' });
    R.cyl('head', 0.14, 0.16, 0.22, 8, C.hat, { pos: [0, 0.3, -0.01], name: 'hat' }); R.cyl('head', 0.23, 0.23, 0.025, 12, C.hat, { pos: [0, 0.2, -0.01] }); R.tor('head', 0.155, 0.02, 4, 10, C.bronze, { pos: [0, 0.25, -0.01], rot: [PI / 2, 0, 0] });   // the stovepipe hat of a town crier
  }, (p, J, R) => {
    const t = p.t, h = humanoidPose(p, J, { stoop: 0.14, lean: 0.05, headX: 0.25, headZ: 0.12, jawOpen: 0.3, hipY: 0.9, stride: 0.6 });
    const ring = h.raise * (1 - h.rec), up = p.attack > 0 ? h.raise * (1 - h.slam) : 0, sl = p.attack > 0 ? h.slam * (1 - h.rec) : 0;
    J.armA.rotation.set(-0.15 * up - 0.5 * sl, 0, -0.35 - 0.6 * up + 0.2 * sl); J.armAM.rotation.set(-0.35 * sl, 0, -2.79 + 0.5 * up);         // the forearm stands up beside the head; the tell lifts it, the strike throws the bell forward
    const live = p.awake ? 1 : 0;                                                                                                                    // a sleeper is silent: the view says whether the creature is awake (idle = asleep)
    const toll = S(t * 6.3 + p.phase) * (live * (0.14 + 0.1 * p.walk) + 0.5 * ring) - 0.9 * sl;                                                    // awake, the bell is always ringing: faster and harder on the tell
    J.hb.rotation.set(0.15 * S(t * 4.1) + 0.6 * sl, 0, PI + toll); J.hclapper.scale.setScalar(1 + 0.3 * Math.abs(toll) * 3 + 1.2 * ring); R.ring(J.hbEchoes, live * (0.15 + Math.min(1, Math.abs(toll) * 3) * 0.5) + ring);
    J.armB.rotation.x = S(p.phase) * 0.4 * p.walk; J.armB.rotation.z = 0.08 + 0.02 * S(t * 1.1); J.armBM.rotation.x = -0.2;
  });
}

// ------------------------------------------------------------------------------------------------------------------ SEXTON (PIPE: an ivory surplice, a violet stole, five pipes grown from the back)
export function sexton(tex) {
  const C = cellsOf('sexton');
  return makeCreature(tex, (R) => {
    R.joint('hips', null, [0, 0.62, 0]);
    legs(R, 'hips', 0.1, { a: 0.31, b: 0.3, r0: 0.08, r1: 0.065, r2: 0.05, cellA: C.trou, cellB: C.trou, fw: 0.12, fl: 0.34 }, C.trou);
    R.pleat('hips', V2([[0.13, 0.46], [0.17, 0.32], [0.21, 0.12], [0.27, -0.1], [0.34, -0.32], [0.4, -0.54], [0.43, -0.62]]), 14, 7, 0.06, C.robe);          // the robe: a bell-skirt to the floor
    R.tor('hips', 0.42, 0.04, 4, 14, C.stole, { pos: [0, -0.59, 0], rot: [PI / 2, 0, 0] });
    R.joint('spine', 'hips', [0, 0.35, 0]);
    R.pleat('spine', V2([[0.1, 0.72], [0.14, 0.64], [0.165, 0.42], [0.15, 0.2], [0.13, 0.05]]), 12, 5, 0.04, C.robe, { scale: [1, 1, 0.78] });
    R.rag('spine', 0.13, 1.05, 0.03, 0.25, C.stole, { pos: [0, 0.34, 0.15] });                                                                               // the stole: one violet stripe down the front
    // the pipes: five, fanned, grown from the back like a peacock's tail; bone and bronze alternate; the mouths glow in sequence on the tell
    const lens = [0.66, 0.8, 0.9, 0.8, 0.66], fan = [0.3, 0.15, 0, -0.15, -0.3];
    for (let i = 0; i < 5; i++) {
      R.joint('pipe' + i, 'spine', [fan[i] * 0.4, 0.3, -0.17], [-0.12, 0, -fan[i]]);
      R.cyl('pipe' + i, 0.06, 0.085, lens[i], 7, i % 2 ? C.bone : C.bronze, { pos: [0, lens[i] / 2, 0] });
      R.cone('pipe' + i, 0.115, 0.1, 7, C.bronzeDk, { pos: [0, lens[i] + 0.03, 0], rot: [PI, 0, 0] });
      R.sph('pipe' + i, 0.06, 5, 4, 'glow', { pos: [0, lens[i] + 0.05, 0], name: 'mouth' + i });
    }
    for (const [n, s] of [['armA', -1], ['armB', 1]]) { R.limb('spine', n, [s * 0.2, 0.58, 0], { a: 0.34, b: 0.42, r0: 0.065, r1: 0.055, r2: 0.047, cellA: C.robe, cellB: C.skin }); hand(R, C, n, { len: 0.48, finger: 0.16 }); }
    R.tube('armAM', [[0, -0.6, 0.02], [0.0, -0.7, 0.04], [0.0, -0.8, 0.06]], 0.012, 4, C.iron);                                                                // a censer on a chain
    R.lump('armAM', 0.1, 0, 0.1, 8, C.bronze, { pos: [0, -0.9, 0.06], name: 'censer' });
    head(R, C, { neckAt: [0, 0.68, 0.04], r: 0.15, tall: 1.2, neck: 0.16, eyes: 'both' });
    R.cone('head', 0.21, 0.42, 7, C.robe, { pos: [0, 0.2, -0.06], rot: [0.25, 0, 0] });                                                                      // the hood
  }, (p, J, R) => {
    const t = p.t, h = humanoidPose(p, J, { stoop: 0.38, headX: 0.7, jawOpen: 0.25, hipY: 0.62, stride: 0.45 });
    J.legA.rotation.x *= 0.5; J.legB.rotation.x *= 0.5;
    for (let i = 0; i < 5; i++) { const seq = p.attack > 0 ? 0.5 + 0.5 * S(t * 7 - i * 1.1) : 0.15 + 0.1 * S(t * 2 + i); J['mouth' + i].scale.setScalar(0.4 + 1.3 * seq); J['pipe' + i].rotation.z = -[0.3, 0.15, 0, -0.15, -0.3][i] + S(t * 1.2 + i) * 0.015; }
    J.censer.rotation.z = S(t * 1.5) * 0.15;
  });
}

// ------------------------------------------------------------------------------------------------------------------ WARDEN-GRAFT (DRUM: a kettledrum grown into the chest, skin forward; it drags two mallets)
export function wardengraft(tex) {
  const C = cellsOf('wardengraft');
  return makeCreature(tex, (R) => {
    R.joint('hips', null, [0, 1.0, 0]);
    legs(R, 'hips', 0.25, { a: 0.5, b: 0.48, r0: 0.2, r1: 0.17, r2: 0.14, cellA: C.leather, cellB: C.leatherDk, seg: 8, fw: 0.34, fh: 0.14, fl: 0.46 }, C.iron);
    R.joint('spine', 'hips', [0, 0.05, 0]);
    R.cyl('spine', 0.36, 0.3, 1.15, 9, C.leather, { pos: [0, 0.57, 0], scale: [1, 1, 0.85] });
    R.cyl('spine', 0.42, 0.42, 0.18, 9, C.leatherDk, { pos: [0, 0.0, 0], scale: [1, 1, 0.85] });                                                               // a wide studded belt
    for (const s of [-1, 1]) {                                                                                                                                  // iron pauldrons spiked with tension rods
      R.lump('spine', 0.23, 1, 0.12, s + 11, C.ironDk, { pos: [s * 0.4, 1.2, -0.02], scale: [1, 0.7, 1.1] });
      for (const [dx, dz] of [[0.0, 0.0], [0.12, 0.1], [-0.12, 0.1]]) R.cone('spine', 0.04, 0.17, 5, C.bronze, { pos: [s * (0.4 + dx * 0.8), 1.4, -0.02 + dz], rot: [0, 0, -s * 0.2] });
    }
    // THE DRUM: a bronze bowl whose skin faces the player and a little up; the hoop is bone, eight lugs round the rim, a claw-scarred skin
    R.joint('drum', 'spine', [0, 0.82, 0.1], [0.75, 0, 0]);
    R.lathe('drum', V2([[0.5, 0], [0.49, -0.1], [0.46, -0.2], [0.41, -0.3], [0.35, -0.4], [0.28, -0.47], [0.18, -0.52], [0.09, -0.55], [0.001, -0.56]]), 12, C.bronze, { name: 'drumBowl' });
    R.cyl('drum', 0.47, 0.47, 0.06, 16, C.drumskin, { pos: [0, 0.0, 0], name: 'drumSkin' }); R.tor('drum', 0.5, 0.05, 4, 16, C.bone, { pos: [0, 0.03, 0], rot: [PI / 2, 0, 0] });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; R.box('drum', 0.07, 0.15, 0.07, C.iron, { pos: [S(a) * 0.5, -0.07, K(a) * 0.5], rot: [0, a, 0] }); }
    R.sph('drum', 0.07, 6, 4, 'glow', { pos: [0, 0.07, 0], name: 'drumCore' });
    R.J.drumEchoes = R.echo(R.J.drumBowl, 1, 0.12);
    for (const [n, s] of [['armA', -1], ['armB', 1]]) {                                                                                                         // long thick arms ending in a mallet each: it drags them
      R.limb('spine', n, [s * 0.42, 1.2, 0], { a: 0.55, b: 0.6, r0: 0.15, r1: 0.13, r2: 0.12, cellA: C.leather, cellB: C.skin, seg: 7 });
      R.lump(n + 'M', 0.15, 1, 0.14, s + 12, C.skin, { pos: [0, -0.66, 0], scale: [1, 1, 1] });
      R.cyl(n + 'M', 0.035, 0.035, 0.9, 5, C.rope, { pos: [0, -1.05, 0.04] }); R.lump(n + 'M', 0.2, 1, 0.12, s + 20, C.leatherDk, { pos: [0, -1.5, 0.04], scale: [1, 1.1, 1] });
    }
    // the head: small, sunk between the shoulders; a bone mask with two swept-back horns and one teal slit
    R.joint('neck', 'spine', [0, 1.4, -0.08]); R.cyl('neck', 0.13, 0.17, 0.14, 6, C.skin, { pos: [0, 0.03, 0] });
    R.joint('head', 'neck', [0, 0.1, 0.0]); R.lump('head', 0.18, 1, 0.08, 14, C.bone, { pos: [0, 0.12, 0], scale: [0.9, 1.15, 1] }); R.box('head', 0.15, 0.03, 0.04, 'glow', { pos: [0, 0.16, 0.18] });
    for (const s of [-1, 1]) R.tube('head', [[s * 0.12, 0.2, 0.0], [s * 0.25, 0.3, -0.05], [s * 0.3, 0.44, -0.14]], [0.05, 0.04, 0.012], 5, C.bone);
  }, (p, J, R) => {
    const t = p.t, h = humanoidPose(p, J, { stoop: 0.12, headX: 0.5, hipY: 1.0, stride: 0.5 });
    const charge = p.attack > 0 ? h.raise : 0; J.drumCore.scale.setScalar(1 + 0.2 * S(t * 3) + 1.2 * charge); R.ring(J.drumEchoes, charge * (1 - h.rec));
    J.drum.rotation.x = 0.75 + 0.03 * S(t * 1.6) - 0.12 * h.slam; J.armA.rotation.z = -0.06; J.armB.rotation.z = 0.06;
  });
}

// ------------------------------------------------------------------------------------------------------------------ CANTOR (CHOIR-MASTER, boss: the body is a great bell, six bells sing round the head)
export function cantor(tex) {
  const C = cellsOf('cantor');
  return makeCreature(tex, (R) => {
    R.joint('hips', null, [0, 1.0, 0]);
    legs(R, 'hips', 0.14, { a: 0.5, b: 0.5, r0: 0.13, r1: 0.1, r2: 0.08, cellA: C.robeDk, cellB: C.robeDk, seg: 6 }, C.robeDk);
    R.pleat('hips', V2([[0.2, 3.4], [0.27, 3.0], [0.37, 2.5], [0.5, 1.9], [0.64, 1.2], [0.78, 0.5], [0.86, 0.02], [0.86, 0.0]]), 18, 9, 0.05, C.robe, { pos: [0, -0.98, 0] });         // the body IS a bell: a pleated robe to the floor
    for (const [y, r] of [[0.1, 0.87], [0.9, 0.7], [1.7, 0.54], [2.6, 0.36]]) R.tor('hips', r, 0.055, 4, 20, C.trim, { pos: [0, y - 1.0, 0], rot: [PI / 2, 0, 0] });                  // ivory bands: the engraved rings of a great bell
    R.joint('spine', 'hips', [0, 2.45, 0]);
    R.cyl('spine', 0.26, 0.34, 0.62, 8, C.robe, { pos: [0, 0.22, 0], scale: [1, 1, 0.8] });
    R.cone('spine', 0.5, 0.2, 10, C.trim, { pos: [0, 0.58, 0], rot: [PI, 0, 0] });                                                                                                          // a bone ruff at the shoulders
    for (const [n, s] of [['armA', -1], ['armB', 1]]) {                                                                                                                                      // the arms end in tuning forks
      R.limb('spine', n, [s * 0.36, 0.5, 0], { a: 0.7, b: 0.7, r0: 0.12, r1: 0.1, r2: 0.08, cellA: C.robe, cellB: C.skin, seg: 7 });
      R.cyl(n + 'M', 0.08, 0.08, 0.14, 6, C.bronzeDk, { pos: [0, -0.77, 0] });
      for (const d of [-1, 1]) R.box(n + 'M', 0.1, 0.7, 0.1, C.bone, { pos: [d * 0.15, -1.13, 0] }); R.box(n + 'M', 0.4, 0.1, 0.1, C.bone, { pos: [0, -0.81, 0] });
    }
    R.joint('neck', 'spine', [0, 0.62, 0.03]); R.cyl('neck', 0.08, 0.1, 0.24, 6, C.skin, { pos: [0, 0.08, 0] });
    R.joint('head', 'neck', [0, 0.22, 0]); R.lump('head', 0.22, 1, 0.08, 15, C.skin, { pos: [0, 0.14, 0], scale: [0.85, 1.28, 1] });
    R.joint('jaw', 'head', [0, -0.02, 0.06]); R.box('jaw', 0.14, 0.16, 0.13, C.skin, { pos: [0, -0.1, 0.07] }); R.box('jaw', 0.1, 0.07, 0.02, C.mouth, { pos: [0, 0.02, 0.14] });
    R.sph('head', 0.04, 6, 4, 'glow', { pos: [-0.08, 0.2, 0.18] }); R.sph('head', 0.04, 6, 4, 'glow', { pos: [0.08, 0.2, 0.18] });
    // the choir: six bronze church bells orbit the head (a ring that turns); the Cantor sings through them
    R.joint('halo', 'head', [0, 0.15, 0]);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; R.joint('hb' + i, 'halo', [K(a) * 0.68, 0, S(a) * 0.68]); R.bell('hb' + i, 0.32, 0.16, C.bronze, C.bronzeDk, { pos: [0, -0.1, 0], seg: 8 }); R.sph('hb' + i, 0.035, 5, 4, 'glow', { pos: [0, -0.1, 0] }); }
    R.tor('halo', 0.68, 0.025, 4, 24, 'glow', { rot: [PI / 2, 0, 0], name: 'haloRing' });
  }, (p, J, R) => {
    const t = p.t, h = humanoidPose(p, J, { stoop: 0.05, headX: 0.12, hipY: 1.0, stride: 0.35, jawOpen: 0.2 });
    const open = p.attack > 0 ? h.raise : 0;
    J.armA.rotation.z = -0.3 - 0.6 * open; J.armB.rotation.z = 0.3 + 0.6 * open; J.armA.rotation.x = -0.1 - 0.5 * open; J.armB.rotation.x = -0.1 - 0.5 * open; J.armAM.rotation.x = J.armBM.rotation.x = -0.35;
    J.halo.rotation.y = t * 0.7 + open * 2; J.halo.scale.setScalar(1 + 0.6 * open); J.haloRing.scale.setScalar(1 + 0.05 * S(t * 4));
    for (let i = 0; i < 6; i++) J['hb' + i].rotation.z = S(t * 2.1 + i) * 0.12;
  }, { maxLift: 5 });
}

// ------------------------------------------------------------------------------------------------------------------ BELL NODE (RESONATOR: a tuning fork struck into the ground, a bell floating between the tines)
export function bellnode(tex) {
  const C = cellsOf('bellnode');
  return makeCreature(tex, (R) => {
    R.cyl(null, 0.62, 0.7, 0.26, 10, C.stone, { pos: [0, 0.13, 0] });
    for (const s of [-1, 1]) { R.cyl(null, 0.11, 0.18, 2.2, 7, C.bone, { pos: [s * 0.5, 1.35, 0], rot: [0, 0, -s * 0.24] }); R.cyl(null, 0.14, 0.14, 0.12, 7, C.bronzeDk, { pos: [s * 0.22, 0.3, 0], rot: [0, 0, -s * 0.24] }); }          // two tines of a fork, each held by a bronze collar
    R.joint('bell', null, [0, 1.9, 0]);
    const b = R.bell('bell', 0.9, 0.32, C.bronze, C.bronzeDk, { pos: [0, -0.9, 0] });
    R.tor('bell', 0.32, 0.03, 4, 12, C.bronzeDk, { pos: [0, -0.88, 0], rot: [PI / 2, 0, 0] }); R.cyl('bell', 0.3, 0.32, 0.14, 10, C.verd, { pos: [0, -0.82, 0] }); R.sph('bell', 0.05, 6, 4, 'glow', { pos: [0, -0.9, 0], name: 'clapper' });
    R.J.bellEchoes = R.echo(b, 1, 0.14);
    R.tor('bell', 0.62, 0.03, 6, 26, 'glow', { pos: [0, -0.35, 0], rot: [PI / 2, 0, 0], name: 'ring' });
  }, (p, J, R) => {
    const t = p.t, d = ease(clamp01(p.dead));
    J.bell.position.y = 1.9 + 0.04 * S(t * 2.2) - 0.55 * d; J.bell.rotation.z = S(t * 1.4) * 0.03 * (1 - d); J.clapper.scale.setScalar(d > 0 ? 0.001 : 1 + 0.3 * S(t * 4) + 0.8 * (p.flash || 0));
    J.ring.scale.setScalar(d > 0.1 ? 0.001 : 1 + 0.12 * S(t * 3)); R.ring(J.bellEchoes, d > 0 ? 0 : 0.5 + 0.5 * S(t * 2));
    J.rig.rotation.z = d * 0.1;
  });
}

// ------------------------------------------------------------------------------------------------------------------ DRONE-GILL (GLASS-BELL: an engraved ivory dome with a ribbon fringe, a hanging heart, a note-bubble)
export function gill(tex) {
  const C = cellsOf('gill'), HOVER = 1.2;
  return makeCreature(tex, (R) => {
    R.joint('body', null, [0, 0, 0]);
    const dome = R.prim('body', new THREE.SphereGeometry(0.62, 14, 8, 0, PI * 2, 0, PI / 2), C.dome, { pos: [0, 0.6, 0], scale: [1, 0.86, 1] });
    R.cyl('body', 0.62, 0.62, 0.05, 14, C.dome, { pos: [0, 0.6, 0] }); R.cyl('body', 0.5, 0.5, 0.03, 12, C.under, { pos: [0, 0.58, 0] });
    R.tor('body', 0.62, 0.035, 4, 16, C.bone, { pos: [0, 0.6, 0], rot: [PI / 2, 0, 0] });
    R.J.domeEchoes = R.echo(dome, 2, 0.1);
    for (let i = 0; i < 7; i++) { const a = -PI / 2 + (i - 3) * 0.55, len = 0.42 + 0.14 * ((i * 3) % 3); R.joint('fr' + i, 'body', [K(a) * 0.6, 0.6, S(a) * 0.6], [0, -a + PI / 2, 0]); R.rag('fr' + i, 0.14, len, 0.03, 0.4, i % 2 ? C.fringeB : C.fringeA, { pos: [0, -len / 2, 0.02] }); }
    R.lathe('body', V2([[0.02, 0.5], [0.05, 0.4], [0.08, 0.25], [0.1, 0.1], [0.1, 0.0]]), 6, C.heart, { pos: [0, 0.14, 0.02], name: 'heart' });                // the clapper: a hanging heart
    R.lump('body', 0.14, 1, 0.1, 21, C.sac, { pos: [0, 0.14, 0.0], name: 'sac' });                                                                       // the note-bubble spore sac
    for (let i = 0; i < 5; i++) R.sph('body', 0.035, 5, 4, 'glow', { pos: [(i - 2) * 0.2, 0.74 - Math.abs(i - 2) * 0.05, 0.57 - Math.abs(i - 2) * 0.05] });       // photophores along the front rim
    for (let i = 0; i < 3; i++) { R.joint('td' + i, 'body', [(i - 1) * 0.16, 0.5, 0.05 - (i % 2) * 0.12]); R.tube('td' + i, [[0, 0, 0], [0.02, -0.2, 0.01], [-0.01, -0.4, 0], [0.01, -0.55, 0]], [0.035, 0.026, 0.02, 0.008], 5, C.tendril); }
  }, (p, J, R) => {
    const t = p.t, d = ease(clamp01(p.dead)), w = p.walk, flap = S(t * 16 + p.phase * 0.5) * (0.35 + 0.5 * w) * (1 - d);
    for (let i = 0; i < 7; i++) J['fr' + i].rotation.x = flap * 0.35 * (1 + (i % 3) * 0.3) + d * 0.6;
    for (let i = 0; i < 3; i++) J['td' + i].rotation.set(S(t * 3 + i * 1.7) * 0.25 * (1 - d) - w * 0.35, 0, K(t * 2.3 + i) * 0.2 * (1 - d));
    const a = p.attack, swell = a > 0 ? (a < 0.5 ? ease(a / 0.5) : 1 - ease(clamp01((a - 0.5) / 0.4)) * 0.8) : 0;
    J.sac.scale.setScalar(1 + swell * 1.5); J.body.scale.set(1, 1 + 0.04 * S(t * 5) - 0.1 * swell, 1); R.ring(J.domeEchoes, swell);
    J.rig.rotation.x = -0.25 * w + (a > 0 ? -0.35 * swell : 0) + d * 0.9; J.rig.rotation.z = d * 1.3 + S(t * 1.9) * 0.05 * (1 - d);
  }, { afterGround: (p, J) => { const d = ease(clamp01(p.dead)); J.rig.position.y += (HOVER + (0.5 + 0.5 * S(p.t * 2.2)) * 0.05) * (1 - d); } });
}

// ------------------------------------------------------------------------------------------------------------------ CRADLE FEEDER (SAC: a captive hung in a tripod of pipes, a brass reed grown from the open mouth)
export function feeder(tex) {
  const C = cellsOf('feeder');
  return makeCreature(tex, (R) => {
    R.cyl(null, 0.66, 0.72, 0.14, 16, C.stand, { pos: [0, 0.07, 0] });                                                                                    // the base ring
    for (let i = 0; i < 6; i++) {                                                                                                                          // the cradle: six bone ribs grown from the base, bellying out and closing over the captive like a cage
      const a = (i / 6) * PI * 2 + 0.3, c = K(a), s = S(a), P = (r, y) => [s * r, y, c * r];
      R.tube(null, [P(0.64, 0.1), P(0.72, 0.5), P(0.7, 0.95), P(0.58, 1.45), P(0.33, 1.85), P(0.07, 2.05)], [0.075, 0.07, 0.065, 0.055, 0.045, 0.03], 6, i % 2 ? C.bone : C.bronze);
    }
    for (const [y, r] of [[0.55, 0.73], [1.2, 0.66]]) R.tor(null, r, 0.04, 4, 20, C.bronzeDk, { pos: [0, y, 0], rot: [PI / 2, 0, 0] });
    R.sph(null, 0.07, 5, 4, 'glow', { pos: [0, 2.08, 0] });
    R.joint('sac', null, [0, 0, 0]);
    // the captive: wrapped in amber membrane from the throat down, head fallen forward, arms bound across the chest, feet just off the base; hung by cables from the apex
    R.pleat('sac', V2([[0.17, 1.45], [0.3, 1.38], [0.34, 1.22], [0.27, 1.0], [0.2, 0.8], [0.22, 0.62], [0.15, 0.42], [0.1, 0.22], [0.08, 0.16]]), 10, 4, 0.05, C.wrapA, { name: 'shroud', hem: 0.3 });
    for (const [y, r, c] of [[1.28, 0.34, C.wrapB], [1.05, 0.28, C.wrapDk], [0.82, 0.22, C.wrapB], [0.58, 0.18, C.wrapDk]]) R.tor('sac', r, 0.03, 4, 12, c, { pos: [0, y, 0.0], rot: [PI / 2 + 0.35, 0, 0.0] });          // bands, tilted: the wrapping
    R.joint('hd', 'sac', [0, 1.46, 0.02], [0.55, 0, 0.18]);                                                                                                  // the head, fallen forward and aside
    R.lump('hd', 0.15, 1, 0.1, 31, C.skin, { pos: [0, 0.14, 0], scale: [0.85, 1.2, 1] }); R.tor('hd', 0.15, 0.025, 4, 10, C.wrapB, { pos: [0, 0.18, 0.01], rot: [PI / 2, 0.3, 0] });
    R.box('hd', 0.09, 0.07, 0.03, C.mouth, { pos: [0, 0.04, 0.14] });
    R.tube('hd', [[0, 0.04, 0.15], [0.02, 0.2, 0.3], [0.0, 0.5, 0.35]], [0.03, 0.025, 0.02], 5, C.bronze);                                                  // the brass reed grown from the mouth
    for (const s of [-1, 1]) R.tube('sac', [[s * 0.33, 1.3, 0.0], [s * 0.38, 1.05, 0.08], [s * 0.2, 0.9, 0.2]], [0.07, 0.065, 0.05], 5, C.wrapA);                  // the arms, bound across the chest
    R.tube('sac', [[-0.06, 1.46, 0.0], [-0.5, 1.8, -0.1], [-0.55, 1.98, -0.3]], 0.018, 4, C.cable); R.tube('sac', [[0.06, 1.46, 0.0], [0.5, 1.8, 0.1], [0.5, 1.98, 0.3]], 0.018, 4, C.cable);   // cables to the apex
    R.J.sacEchoes = R.echo(R.J.shroud, 1, 0.08);
  }, (p, J, R) => {
    const t = p.t, d = ease(clamp01(p.dead));
    J.sac.rotation.z = S(t * 0.9) * 0.025 * (1 - d); J.sac.rotation.x = S(t * 0.7) * 0.02; J.sac.scale.set(1 + 0.025 * S(t * 3) * (1 - d), (1 - 0.5 * d) * (1 + 0.02 * S(t * 3 + 1)), 1 + 0.025 * S(t * 3) * (1 - d)); J.sac.position.y = 0.15 - 0.15 * d;
    J.hd.rotation.x = 0.55 + 0.05 * S(t * 1.3); R.ring(J.sacEchoes, d > 0 ? 0 : Math.max(0, S(t * 2.2) - 0.7) * 3 + (p.flash || 0));
    J.rig.rotation.z = d * 0.1;
  });
}

// ------------------------------------------------------------------------------------------------------------------ GRAFT-MOTHER (ORGAN, boss: a walking church organ: three towers of pipes, a horn for a throat, cradle sacs underneath)
export function graftmother(tex) {
  const C = cellsOf('graftmother');
  return makeCreature(tex, (R) => {
    for (const [x, z] of [[-1, -0.6], [1, -0.6], [-1, 0.7], [1, 0.7]]) {                                                                                      // four insect legs: hip, knee flung out, a splayed foot
      const hx = x * 0.85, kx = x * 1.3, fx = x * 1.15;
      R.tube(null, [[hx, 1.75, z * 0.8], [kx * 0.9, 2.05, z * 1.0], [kx, 1.4, z * 1.05], [fx, 0.7, z * 1.05], [fx, 0.06, z * 1.05]], [0.2, 0.17, 0.15, 0.12, 0.1], 6, C.leg);
      R.cyl(null, 0.25, 0.3, 0.1, 6, C.iron, { pos: [fx, 0.05, z * 1.05] });
    }
    R.joint('body', null, [0, 2.2, 0]);
    R.box('body', 2.4, 1.3, 1.5, C.case, { pos: [0, 0, 0] });                                                                                                 // the organ case: ivory panels, engraved
    R.box('body', 2.0, 0.9, 0.05, C.flesh, { pos: [0, -0.05, 0.77] }); R.box('body', 0.5, 1.2, 0.06, C.fleshDk, { pos: [-0.9, 0.0, 0.78] });               // flesh grown through the front panels
    R.box('body', 2.6, 0.12, 1.7, C.bronze, { pos: [0, 0.69, 0] }); R.box('body', 2.6, 0.14, 1.7, C.bronzeDk, { pos: [0, -0.7, 0] });                      // cornice and plinth
    const towers = [{ x: -0.85, n: 5, top: 3.75 }, { x: 0, n: 7, top: 4.2 }, { x: 0.85, n: 5, top: 3.75 }];                                                  // three towers of pipes
    let pi = 0;
    for (const t of towers) for (let i = 0; i < t.n; i++, pi++) {
      const x = t.x + (i - (t.n - 1) / 2) * 0.17, mid = 1 - Math.abs(i - (t.n - 1) / 2) / t.n, top = t.top - 0.6 * (1 - mid) - 0.05 * (i % 2), h = top - 2.9;
      R.joint('p' + pi, 'body', [x, 0.7, -0.15]); R.cyl('p' + pi, 0.07, 0.09, h, 7, pi % 2 ? C.bone : C.bronze, { pos: [0, h / 2, 0] });
      R.cone('p' + pi, 0.1, 0.09, 7, C.bronzeDk, { pos: [0, h + 0.03, 0], rot: [PI, 0, 0] }); R.sph('p' + pi, 0.05, 5, 4, 'glow', { pos: [0, h + 0.05, 0], name: 'pm' + pi });
    }
    R.J.npipes = pi;
    R.joint('hornJ', 'body', [-0.45, -0.1, 0.85], [-0.2, 0.2, 0]);                                                                                            // the throat: a great bronze horn forward from the case, off-centre, dark inside
    const horn = R.lathe('hornJ', V2([[0.16, 0.0], [0.2, 0.15], [0.28, 0.3], [0.4, 0.45], [0.55, 0.58], [0.62, 0.62]]), 14, C.horn, { rot: [PI / 2, 0, 0], name: 'horn' });
    R.lathe('hornJ', V2([[0.15, 0.0], [0.19, 0.15], [0.27, 0.3], [0.39, 0.45], [0.53, 0.58], [0.6, 0.62]]), 14, C.sacDk, { rot: [PI / 2, 0, 0], inside: true }); R.tor('hornJ', 0.62, 0.055, 5, 20, C.bronzeDk, { pos: [0, 0, 0.62] });
    R.J.hornEchoes = R.echo(horn, 1, 0.12);
    for (let i = 0; i < 6; i++) { const x = 0.25 + i * 0.15; R.joint('sc' + i, 'body', [x, -0.7, 0.1 + ((i % 2) - 0.5) * 0.5]); R.cyl('sc' + i, 0.02, 0.02, 0.5, 4, C.bronze, { pos: [0, -0.1, 0] }); R.lump('sc' + i, 0.2, 1, 0.1, i + 40, i % 2 ? C.sac : C.sacDk, { pos: [0, -0.5 - (i % 3) * 0.1, 0], scale: [0.8, 1.7, 0.8] }); }       // cradle sacs hang beneath
    for (const [n, s] of [['armA', -1], ['armB', 1]]) {                                                                                                       // the grafting arms: pipes with needles
      R.limb('body', n, [s * 1.2, 0.3, 0.3], { a: 1.0, b: 1.0, r0: 0.16, r1: 0.13, r2: 0.1, cellA: C.bone, cellB: C.bronze, seg: 6 });
      for (let i = -1; i <= 1; i++) R.cone(n + 'M', 0.06, 0.45, 4, 'glow', { pos: [i * 0.11, -1.2, 0.05], rot: [PI, 0, 0] });
    }
  }, (p, J, R) => {
    const t = p.t, d = ease(clamp01(p.dead)), a = p.attack, br = S(t * 1.4);
    J.body.scale.set(1 + 0.015 * br * (1 - d), (1 - 0.5 * d) * (1 + 0.015 * S(t * 1.4 + 1)), 1 + 0.015 * br * (1 - d)); J.body.position.y = 2.2 * (1 - 0.3 * d);
    const up = a > 0 ? (a < 0.4 ? ease(a / 0.4) : 1) : 0, sl = a > 0.4 ? ease(clamp01((a - 0.4) / 0.2)) : 0;
    J.armA.rotation.x = -2.2 * up + 2.4 * sl + S(t * 0.9) * 0.05; J.armB.rotation.x = -2.2 * up + 2.4 * sl - S(t * 0.9) * 0.05; J.armA.rotation.z = -0.12 - d * 0.4; J.armB.rotation.z = 0.12 + d * 0.4; J.armAM.rotation.x = J.armBM.rotation.x = -0.4 + d * 0.8;
    for (let i = 0; i < J.npipes; i++) J['pm' + i].scale.setScalar(d > 0.1 ? 0.001 : 0.5 + (a > 0 ? 1.2 * (0.5 + 0.5 * S(t * 6 - i * 0.8)) : 0.3 * (0.5 + 0.5 * S(t * 2 + i))));
    for (let i = 0; i < 6; i++) J['sc' + i].rotation.z = S(t * 1.1 + i * 1.7) * 0.05; R.ring(J.hornEchoes, d > 0 ? 0 : a > 0 ? up : 0);
    J.rig.rotation.x = d * 0.25;
  }, { maxLift: 5 });
}

export const FACTORIES = { tollbearer, gaunt, bellhand, sexton, wardengraft, cantor, bellnode, gill, feeder, graftmother };
