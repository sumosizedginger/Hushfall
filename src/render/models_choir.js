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

// ------------------------------------------------------------------------------------------------------------------ CHORISTER (PT-026, Episode 3: the voice; a grafted singer whose throat is a grown horn)
/** a tall figure in a cold, pleated surplice with a pearl chitin shoulder and a brass-ochre stole, one hand raised like a conductor's; a row of organ pipes grown up its back; the face is a small skull behind a long ivory HORN
 *  that points forward (the shape that tells it from the bell of a Tollbearer and the hat of a Bellhand at 20 m): a teal light burns in its throat and swells when it sings. */
export function chorister(tex) {
  const C = cellsOf('chorister');
  return makeCreature(tex, (R) => {
    R.joint('hips', null, [0, 0.92, 0]);
    legs(R, 'hips', 0.1, { a: 0.46, b: 0.44, r0: 0.085, r1: 0.066, r2: 0.05, cellA: C.robeDk, cellB: C.chitinDk }, C.chitinDk);
    R.joint('spine', 'hips', [0, 0.05, 0]);
    R.cyl('spine', 0.13, 0.16, 0.72, 8, C.skin, { pos: [0, 0.36, 0], scale: [1, 1, 0.75] });
    R.pleat('spine', V2([[0.13, 0.84], [0.19, 0.78], [0.235, 0.62], [0.27, 0.42], [0.34, 0.2], [0.46, -0.02], [0.6, -0.22]]), 14, 6, 0.06, C.robe, { scale: [1, 1, 0.78] });             // the surplice
    R.lump('spine', 0.14, 1, 0.14, 4, C.chitin, { pos: [0.27, 0.8, 0], scale: [1.35, 0.7, 1.1] });                                                                                          // a chitin pauldron on the screen-right shoulder
    R.lump('spine', 0.11, 0, 0.14, 2, C.robe, { pos: [-0.25, 0.77, 0], scale: [1.2, 0.8, 1] });
    for (let i = 0; i < 3; i++) R.lump('spine', 0.085, 0, 0.1, 5 + i, C.chitin, { pos: [0.02 * i, 0.5 + i * 0.12, 0.15], scale: [1.5 - i * 0.2, 0.55, 0.5] });                           // ribs of chitin through the linen
    R.cyl('spine', 0.06, 0.07, 0.86, 6, C.stole, { pos: [0, 0.3, 0.2], scale: [1, 1, 0.22] });                                                                                              // the stole, hanging down the front: a long round strip, not a card
    // organ pipes grown up the spine
    [[-0.3, 0.3, -0.1], [-0.2, 0.38, 0.06], [-0.1, 0.44, -0.06], [0, 0.46, 0.1], [0.1, 0.44, -0.06], [0.2, 0.38, 0.06], [0.3, 0.3, -0.1]].forEach(([x, h, lean], i) => {          // a fan of seven (a halo of pipes behind the head and shoulders: the Chorister's outline from the front, PT-028)
      R.joint('pipe' + i, 'spine', [x * 0.9, 0.78, -0.2], [-0.12 + lean * 0.5, 0, -x * 2.6]); R.cyl('pipe' + i, 0.028, 0.04, h, 6, C.horn, { pos: [0, h / 2, 0] }); R.tor('pipe' + i, 0.034, 0.012, 3, 8, C.chitinDk, { pos: [0, h * 0.45, 0], rot: [PI / 2, 0, 0] });
      R.cone('pipe' + i, 0.04, 0.06, 6, C.hornDk, { pos: [0, h + 0.02, 0] });
    });
    // arms: A (screen-left) raised and bent, the conductor's hand; B hangs forward at the hip
    R.limb('spine', 'armA', [-0.25, 0.76, 0], { a: 0.32, b: 0.36, r0: 0.062, r1: 0.054, r2: 0.046, cellA: C.robe, cellB: C.skin }); hand(R, C, 'armA', { len: 0.4, r: 0.06, finger: 0.17 });
    R.limb('spine', 'armB', [0.25, 0.76, 0], { a: 0.32, b: 0.38, r0: 0.062, r1: 0.054, r2: 0.046, cellA: C.chitin, cellB: C.skin }); hand(R, C, 'armB', { len: 0.42, r: 0.06, finger: 0.17 });
    // the head: a small skull, eyes lit, and THE HORN where the mouth and throat were
    R.joint('neck', 'spine', [0, 0.84, 0.05]); R.cyl('neck', 0.045, 0.055, 0.2, 6, C.skin, { pos: [0, 0.07, 0] });
    R.joint('head', 'neck', [0, 0.18, 0.02]); R.lump('head', 0.13, 1, 0.1, 3, C.skin, { pos: [0, 0.06, -0.01], scale: [0.85, 1.25, 1] });
    R.sph('head', 0.036, 5, 3, C.iron, { pos: [-0.052, 0.1, 0.1] }); R.sph('head', 0.036, 5, 3, C.iron, { pos: [0.052, 0.1, 0.1] });
    R.sph('head', 0.02, 4, 3, 'glow', { pos: [-0.052, 0.1, 0.125] }); R.sph('head', 0.02, 4, 3, 'glow', { pos: [0.052, 0.1, 0.125] });
    const flare = V2([[0.03, 0], [0.036, 0.06], [0.05, 0.16], [0.08, 0.27], [0.12, 0.37], [0.18, 0.44], [0.24, 0.48]]);                                                                        // radius by length: a throat that opens into a bell
    const horn = R.lathe('head', flare, 12, C.horn, { pos: [0, -0.06, 0.1], rot: [PI / 2 - 0.12, 0, 0], name: 'hornMesh' });
    R.lathe('head', V2(flare.map((q) => [Math.max(0.001, q.x - 0.012), q.y - 0.003])), 12, C.hornDk, { pos: [0, -0.06, 0.1], rot: [PI / 2 - 0.12, 0, 0], inside: true });                          // the dark inside of the bell
    R.tor('head', 0.24, 0.022, 4, 14, C.chitinDk, { pos: [0, -0.06 + 0.48 * Math.sin(0.12), 0.1 + 0.48 * Math.cos(0.12)], rot: [-0.12, 0, 0] });                                         // the lip
    R.sph('head', 0.055, 6, 4, 'glow', { pos: [0, -0.07, 0.38], name: 'throat' });                                                                                                            // the light in the throat
    R.J.hornEchoes = R.echo(horn, 1, 0.12);
  }, (p, J, R) => {
    const t = p.t, h = humanoidPose(p, J, { stoop: 0.07, lean: 0.03, headX: 0.12, headZ: 0, jawOpen: 0, hipY: 0.92, stride: 0.6 }), ring = h.raise * (1 - h.rec);
    J.armA.rotation.x = -1.2 + S(t * 1.4) * 0.06 - 0.45 * ring + S(p.phase) * 0.12 * p.walk; J.armA.rotation.z = -0.12; J.armAM.rotation.x = -0.95 - 0.2 * ring;                          // the conductor's arm, up
    J.armB.rotation.x = -0.4 + S(p.phase) * 0.35 * p.walk; J.armBM.rotation.x = -0.35; J.armB.rotation.z = 0.1;
    J.head.rotation.x = 0.04 - 0.5 * ring + S(t * 38) * 0.03 * ring; J.head.rotation.y = S(t * 0.7) * 0.12 * (1 - ring);                                                                    // it throws its head back to sing, the horn swings up
    J.throat.scale.setScalar(1 + 0.18 * S(t * 3) + 1.5 * ring); R.ring(J.hornEchoes, p.attack > 0 ? ring : 0);
    for (let i = 0; J['pipe' + i]; i++) J['pipe' + i].rotation.x = -0.12 + S(t * 1.5 + i * 1.7) * 0.05 + 0.18 * ring * S(t * 30 + i);                                                         // the pipes tremble as it sings
  });
}

// ------------------------------------------------------------------------------------------------------------------ BULWARK SHELL (PT-028, Episode 3 Batch C: the shield-bearer)
/** a squat body on short legs behind a great conch it carries like a shield: pearl outside, ribbed, a bronze-bound lip, a spire on the crown; the creature peeps over its top with one lit eye. The carapace hangs from a hinge at the top
 *  (`shell`): when the Bulwark strikes the lower lip swings out and up, showing the nacre lining and the soft body, and the whole creature lurches forward; the lip is the tell the sim's `armor.opens` rule draws. */
export function bulwark(tex) {
  const C = cellsOf('bulwark');
  const PROFILE = [[0.12, 0], [0.38, -0.12], [0.65, -0.4], [0.85, -0.8], [0.98, -1.2], [1.04, -1.5], [0.96, -1.58]];       // the plate's radius by depth below the hinge: the whorl of a conch
  const radiusAt = (y) => { for (let i = 0; i < PROFILE.length - 1; i++) { const [r0, y0] = PROFILE[i], [r1, y1] = PROFILE[i + 1]; if (y <= y0 && y >= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return PROFILE[PROFILE.length - 1][0]; };
  const AX = -0.62;                                                                                                            // the lathe's axis lies this far behind the hinge, so the plate bulges ahead of the body
  const onPlate = (y, a, lift = 0.02) => { const r = radiusAt(y) + lift; return [S(a) * r, y, AX + K(a) * r]; };
  return makeCreature(tex, (R) => {
    // PT-028 repair: the first Bulwark was a tall dome like a Feeder or a Warden's chest (silhouette overlap 0.66 / 0.58). It is now LOW and WIDE: a crab-like carapace 2.4 m across and 1.8 m high on four stubs of legs, edged with a row of spikes.
    R.joint('hips', null, [0, 0.36, 0]);
    legs(R, 'hips', 0.55, { a: 0.18, b: 0.2, r0: 0.2, r1: 0.17, r2: 0.14, cellA: C.chitin, cellB: C.chitinDk, seg: 7, fw: 0.42, fh: 0.13, fl: 0.55 }, C.iron);
    R.joint('spine', 'hips', [0, 0.06, 0]);
    R.lump('spine', 0.5, 1, 0.1, 4, C.flesh, { pos: [0, 0.42, 0.0], scale: [1.55, 0.8, 0.9] });                                    // the soft body, that the shell covers
    R.cyl('spine', 0.5, 0.58, 0.2, 10, C.chitinDk, { pos: [0, 0.08, 0], scale: [1.5, 1, 0.8] });                                   // a belt of plate at the hips
    R.lump('spine', 0.46, 1, 0.1, 7, C.chitin, { pos: [0, 0.68, -0.32], scale: [1.7, 0.9, 0.45] });                                // the mantle on its back
    R.box('spine', 0.5, 0.17, 0.03, C.mouth, { pos: [0, 0.38, 0.4] }); for (const s of [-1, 1]) R.box('spine', 0.16, 0.035, 0.03, 'glow', { pos: [s * 0.24, 0.58, 0.38], rot: [0, 0, -s * 0.25] });     // a mouth and two slits of light in the belly
    for (const [n, s] of [['armA', -1], ['armB', 1]]) {                                                                              // thick arms that hold the grips behind the shell
      R.limb('spine', n, [s * 0.74, 0.8, 0.02], { a: 0.34, b: 0.36, r0: 0.15, r1: 0.12, r2: 0.1, cellA: C.chitin, cellB: C.skin, seg: 7 });
      R.lump(n + 'M', 0.13, 1, 0.14, s + 7, C.skin, { pos: [0, -0.42, 0], scale: [1, 1.2, 1] });
      for (const d of [-1, 0, 1]) R.cone(n + 'M', 0.026, 0.22, 4, C.bone, { pos: [d * 0.065, -0.62, 0.03], rot: [PI, 0, 0] });
    }
    head(R, C, { neckAt: [0, 0.78, 0.12], r: 0.17, tall: 1.25, neck: 0.22, cell: C.skin, eyes: 'one', eyeX: 0.065, seed: 9 });
    // THE SHELL, hinged at its crown just in front of the neck, widened and shortened (the joint's scale: a pose never writes it)
    R.joint('shell', 'spine', [0, 0.98, 0.64]); R.J.shell.scale.set(1.38, 0.84, 1);
    R.pleat('shell', V2(PROFILE), 18, 7, 0.05, C.shell, { pos: [0, 0, AX], phi: [-1.1, 2.2], hem: 0.5 });                          // the outside: a whorl, ridged
    R.pleat('shell', V2(PROFILE.map(([r, y]) => [r - 0.05, y])), 18, 7, 0.02, C.shellIn, { pos: [0, 0, AX], phi: [-1.1, 2.2], hem: 0.3, inside: true });         // the nacre lining, seen when it opens
    for (const [y, c] of [[-0.62, C.shellDk], [-1.02, C.shellDk]]) { const pts = Array.from({ length: 9 }, (_, i) => { const a = -1.05 + i * 0.26; return onPlate(y, a, 0.03); }); R.tube('shell', pts, [0.035, 0.05, 0.055, 0.058, 0.06, 0.058, 0.055, 0.05, 0.035], 5, c); }      // two growth ridges across the face
    { const pts = Array.from({ length: 10 }, (_, i) => { const a = -1.0 + i * 0.22; return onPlate(-1.5 + (i / 9) * 1.35, a, 0.04); }); R.tube('shell', pts, [0.03, 0.045, 0.055, 0.06, 0.065, 0.065, 0.06, 0.055, 0.045, 0.03], 5, C.bronze); }       // the spiral
    { const pts = Array.from({ length: 9 }, (_, i) => { const a = -1.05 + i * 0.26; return [S(a) * 1.0, -1.54, AX + K(a) * 1.0]; }); R.tube('shell', pts, 0.07, 6, C.bronze, { name: 'lip' }); }                              // the bound lip
    // the spikes: a jagged edge along the carapace's shoulders (a smooth dome was what a Feeder and a bell node are)
    for (let i = 0; i < 9; i++) { const a = -1.0 + i * 0.25, y = -0.9 - 0.05 * Math.abs(i - 4), p = onPlate(y, a, 0.0); R.joint('sp' + i, 'shell', p, [0, a, 0]); R.cone('sp' + i, 0.09, 0.42 - 0.03 * Math.abs(i - 4), 5, C.shellDk, { pos: [0, 0, 0.05], rot: [1.0, 0, 0] }); }
    R.cone('shell', 0.2, 0.7, 8, C.shell, { pos: [-0.32, 0.12, AX + 0.34], rot: [0.12, 0, 0.55] }); R.tor('shell', 0.17, 0.035, 4, 10, C.bronze, { pos: [-0.28, -0.02, AX + 0.34], rot: [PI / 2 + 0.12, 0.55, 0] });   // the spire, leaning off the crown (clear of the head)
    R.J.lipEchoes = R.echo(R.J.lip, 1, 0.5);
  }, (p, J, R) => {
    const t = p.t, w = p.walk, ph = p.phase, a = p.attack, d = ease(clamp01(p.dead));
    const sw = S(ph) * 0.5 * w; J.legA.rotation.x = sw; J.legB.rotation.x = -sw; J.legAM.rotation.x = 0.1 + Math.max(0, K(ph)) * 0.5 * w; J.legBM.rotation.x = 0.1 + Math.max(0, -K(ph)) * 0.5 * w;
    J.hips.position.y = 0.34 + Math.abs(S(ph)) * 0.04 * w; J.spine.rotation.z = S(ph) * 0.05 * w; J.spine.rotation.x = 0.04 + 0.03 * S(t * 1.2);
    const open = a > 0 ? ease(clamp01(a / 0.2)) * (1 - ease(clamp01((a - 0.86) / 0.14))) : 0, lurch = a > 0 ? ease(clamp01((a - 0.42) / 0.12)) * (1 - ease(clamp01((a - 0.62) / 0.2))) : 0;
    J.shell.rotation.x = -1.05 * open + 0.03 * S(t * 1.5) * (1 - d); J.shell.position.y = 0.98 + 0.1 * open;
    J.rig.position.z = 0.55 * lurch;                                                                                                // the bash: the whole creature lurches at you
    J.armA.rotation.x = -0.75 - 0.5 * open + 0.1 * S(ph) * w; J.armB.rotation.x = -0.75 - 0.5 * open - 0.1 * S(ph) * w; J.armA.rotation.z = -0.1 - 0.15 * open; J.armB.rotation.z = 0.1 + 0.15 * open; J.armAM.rotation.x = J.armBM.rotation.x = -0.55 - 0.3 * open;
    J.head.rotation.x = 0.1 + 0.05 * S(t * 0.9) - 0.4 * open; J.head.rotation.z = S(t * 0.6) * 0.06; J.jaw.rotation.x = 0.1 + 0.5 * open;
    R.ring(J.lipEchoes, open * (1 - lurch));
    J.shell.scale.z = 1 - 0.45 * d;                                                                                                     // the shell sags as it dies
    J.rig.rotation.x = -1.5 * d;                                                                                                       // dead: it topples backwards and lies on its back, shell up, like a turtle
  });
}

// ------------------------------------------------------------------------------------------------------------------ WEEPING MOTHER (PT-028, Episode 3 Batch C: the brood-mother, an organ throne hung with cradle sacs)
/** a seated mass in a pleated skirt of dark flesh, a hooded pale figure bowed over her lap with two lines of light running from her eyes, a fan of organ pipes grown up the back of the throne; cradle sacs (a captive in each)
 *  hang from rods round her skirt and swell before they drop their young; she bows and her tears run faster as she throws one. */
export function weeping(tex) {
  const C = cellsOf('weeping');
  return makeCreature(tex, (R) => {
    R.joint('body', null, [0, 0, 0]);
    // PT-028 repair: the first Mother was a smooth bell like the Cantor's robe (silhouette overlap 0.50). She is now THREE STEPPED DRUMS (a tiered throne) with sacs hung on arms that stand out from the middle tier, and a wide fan of pipes behind.
    R.pleat('body', V2([[0.98, 0.0], [1.0, 0.1], [0.96, 0.62], [0.9, 0.7]]), 16, 8, 0.06, C.robe, { scale: [1, 1, 0.92] });
    R.pleat('body', V2([[0.7, 0.62], [0.72, 0.7], [0.68, 1.3], [0.6, 1.38]]), 14, 7, 0.06, C.robeDk, { scale: [1, 1, 0.92] });
    R.pleat('body', V2([[0.5, 1.3], [0.5, 1.4], [0.46, 2.0], [0.36, 2.08]]), 12, 6, 0.05, C.robe, { scale: [1, 1, 0.92] });
    R.tor('body', 1.0, 0.07, 5, 26, C.bronzeDk, { pos: [0, 0.07, 0], rot: [PI / 2, 0, 0] });                                                                                    // the plinth ring
    for (const [y, r] of [[0.66, 0.94], [1.34, 0.66], [2.02, 0.44]]) R.tor('body', r, 0.05, 4, 22, C.bronze, { pos: [0, y, 0], rot: [PI / 2, 0, 0] });                       // a bronze band between the drums
    // THE PIPES: a wide fan of nine organ pipes grown up the back of the throne, mouths lit
    for (let i = 0; i < 9; i++) {
      const k = i - 4, x = k * 0.3, lean = k * 0.14, h = 1.5 - Math.abs(k) * 0.1 + (i % 2) * 0.08;
      R.joint('pipe' + i, 'body', [x * 0.8, 1.7, -0.42 - Math.abs(k) * 0.02], [-0.1, 0, -lean]);
      R.cyl('pipe' + i, 0.07, 0.1, h, 5, i % 2 ? C.bone : C.bronze, { pos: [0, h / 2, 0] }); R.cone('pipe' + i, 0.12, 0.1, 5, C.bronzeDk, { pos: [0, h + 0.03, 0], rot: [PI, 0, 0] });
      R.sph('pipe' + i, 0.065, 4, 3, 'glow', { pos: [0, h + 0.07, 0], name: 'pm' + i });
    }
    R.J.npipes = 9;
    // THE MOTHER: a pale figure in the throne, bowed
    R.joint('torso', 'body', [0, 1.95, 0.05]);
    R.lump('torso', 0.5, 1, 0.1, 3, C.skin, { pos: [0, 0.32, 0], scale: [1.05, 1.1, 0.8] });
    R.pleat('torso', V2([[0.34, 0.95], [0.48, 0.82], [0.6, 0.52], [0.6, 0.12]]), 12, 5, 0.04, C.robe, { scale: [1, 1, 0.8], phi: [-0.9, PI * 2 - 1.8] });                                  // a shawl over the shoulders
    for (const [n, s] of [['armA', -1], ['armB', 1]]) {                                                                                                                      // long arms that cradle the sac in her lap
      R.limb('torso', n, [s * 0.54, 0.76, 0.05], { a: 0.6, b: 0.6, r0: 0.15, r1: 0.12, r2: 0.09, cellA: C.skin, cellB: C.skin, seg: 5 });
      R.lump(n + 'M', 0.1, 1, 0.14, s + 5, C.skin, { pos: [0, -0.7, 0], scale: [0.9, 1.4, 0.8] }); for (const d of [-1, 0, 1]) R.cone(n + 'M', 0.02, 0.24, 4, C.bone, { pos: [d * 0.05, -0.92, 0.01], rot: [PI, 0, 0] });
    }
    R.lump('torso', 0.2, 1, 0.1, 71, C.sac, { pos: [0, -0.05, 0.62], scale: [0.9, 1.1, 0.9], name: 'babe' }); R.lump('torso', 0.09, 0, 0.1, 72, C.fleshDk, { pos: [0, -0.04, 0.7], scale: [0.8, 1, 0.8] });       // the one she holds in her lap
    R.joint('head', 'torso', [0, 0.86, 0.12], [0.4, 0, 0]);
    R.lump('head', 0.19, 1, 0.08, 6, C.skin, { pos: [0, 0.12, 0], scale: [0.85, 1.2, 1] });
    R.cone('head', 0.3, 0.62, 8, C.robeDk, { pos: [0, 0.2, -0.05], rot: [0.2, 0, 0] });                                                                                       // the cowl
    R.box('head', 0.15, 0.1, 0.03, C.mouth, { pos: [0, -0.04, 0.17] });
    for (const s of [-1, 1]) { R.sph('head', 0.03, 4, 3, 'glow', { pos: [s * 0.065, 0.15, 0.18] }); R.cyl('head', 0.012, 0.016, 0.34, 4, 'glow', { pos: [s * 0.075, -0.02, 0.19], name: s < 0 ? 'tearL' : 'tearR' }); }   // two lines of light down the face: the tears
    // THE SACS: six cradle sacs hung on bronze arms that stand out from the middle drum, a captive in each
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2 + 0.3, big = 0.26 + (i % 2) * 0.04, tx = S(a) * 1.4, tz = K(a) * 1.4;
      R.tube('body', [[S(a) * 0.62, 1.15, K(a) * 0.62], [S(a) * 1.0, 1.4, K(a) * 1.0], [tx, 1.32, tz]], [0.07, 0.055, 0.045], 5, C.bronze);
      R.joint('sc' + i, 'body', [tx, 1.32, tz], [0, a, 0]); R.cyl('sc' + i, 0.02, 0.02, 0.3, 5, C.iron, { pos: [0, -0.14, 0] });
      R.lump('sc' + i, big, 1, 0.1, i + 50, i % 2 ? C.sac : C.sacDk, { pos: [0, -0.52, 0], scale: [0.85, 1.55, 0.85], name: 'sac' + i }); R.lump('sc' + i, big * 0.55, 0, 0.1, i + 60, C.fleshDk, { pos: [0, -0.52, 0], scale: [0.7, 1.4, 0.7] });
    }
    R.J.nsacs = 6;
    R.J.echoSkirt = R.echo(R.J.sac0, 1, 0.3);
  }, (p, J, R) => {
    const t = p.t, d = ease(clamp01(p.dead)), a = p.attack, sw = p.swell ?? 0, we = p.weep ?? 0, br = S(t * 1.2);
    const slam = a > 0 ? (a < 0.5 ? ease(a / 0.5) : 1 - ease(clamp01((a - 0.5) / 0.3))) : 0;
    J.body.scale.set(1 + 0.012 * br * (1 - d), (1 - 0.66 * d) * (1 + 0.012 * S(t * 1.2 + 1)), 1 + 0.012 * br * (1 - d));
    J.torso.rotation.x = 0.1 + 0.06 * br + 0.35 * we + 0.5 * slam + 0.2 * d; J.torso.position.y = 1.95 - 0.5 * d;
    J.head.rotation.x = 0.4 + 0.25 * we + 0.15 * S(t * 0.8); J.head.rotation.z = S(t * 0.5) * 0.05;
    J.armA.rotation.x = -0.3 - 0.25 * sw - 1.5 * slam - 0.3 * we; J.armB.rotation.x = -0.3 - 0.25 * sw - 1.5 * slam - 0.3 * we; J.armA.rotation.z = 0.5 - 0.35 * slam; J.armB.rotation.z = -0.5 + 0.35 * slam; J.armAM.rotation.x = J.armBM.rotation.x = -1.35 - 0.25 * sw + 0.9 * slam - 0.25 * we;
    const drip = 0.7 + 0.4 * S(t * 3) + 1.2 * we; J.tearL.scale.set(1, drip * (d > 0.2 ? 0.01 : 1), 1); J.tearR.scale.set(1, (0.7 + 0.4 * S(t * 3 + 1.7) + 1.2 * we) * (d > 0.2 ? 0.01 : 1), 1);
    for (let i = 0; i < J.npipes; i++) J['pm' + i].scale.setScalar(d > 0.1 ? 0.001 : 0.5 + 0.3 * (0.5 + 0.5 * S(t * 1.8 + i)) + 1.1 * (we + sw) * (0.5 + 0.5 * S(t * 7 - i * 0.9)));
    for (let i = 0; i < J.nsacs; i++) { const swell = (i % 2 === 0 ? sw : sw * 0.4); J['sac' + i].scale.set(0.85 + 0.9 * swell, 1.55 + 0.7 * swell, 0.85 + 0.9 * swell); J['sc' + i].rotation.z = S(t * 1.1 + i * 1.7) * 0.04; }
    R.ring(J.echoSkirt, d > 0 ? 0 : sw);
    J.rig.rotation.x = d * 0.12;
  }, { maxLift: 5 });
}

// ------------------------------------------------------------------------------------------------------------------ CANTOR ACOLYTE (PT-029, Episode 3 Batch D: the Choir's attendant, a stilted figure with a wheel of bells behind its head)
/** a tall thin figure on bare stilt legs in a short saffron robe, a pointed mitre, both hands raised round a tuning fork; behind the head and shoulders a great bronze WHEEL (a ring, four spokes, six small bells hung from the rim) that turns and glows
 *  while it wards and flares when it sings its pulse. The outline is a thin line with a circle behind it: nothing else in the game is. */
export function acolyte(tex) {
  const C = cellsOf('acolyte');
  return makeCreature(tex, (R) => {
    R.joint('hips', null, [0, 1.16, 0]);
    legs(R, 'hips', 0.1, { a: 0.58, b: 0.56, r0: 0.075, r1: 0.058, r2: 0.045, cellA: C.bone, cellB: C.bone, seg: 5, fw: 0.1, fh: 0.06, fl: 0.24 }, C.bronzeDk);
    R.joint('spine', 'hips', [0, 0.05, 0]);
    R.cyl('spine', 0.1, 0.13, 0.78, 7, C.skin, { pos: [0, 0.46, 0], scale: [1, 1, 0.8] });
    R.pleat('spine', V2([[0.13, 0.9], [0.17, 0.78], [0.21, 0.5], [0.25, 0.12], [0.29, -0.2], [0.3, -0.3]]), 12, 6, 0.05, C.robe, { scale: [1, 1, 0.8] });        // the robe: a narrow cone to the knee
    R.tor('spine', 0.29, 0.03, 4, 14, C.trim, { pos: [0, -0.28, 0], rot: [PI / 2, 0, 0] });                                                                            // gold at the hem
    R.cyl('spine', 0.05, 0.06, 0.82, 6, C.trim, { pos: [0, 0.42, 0.14], scale: [1, 1, 0.25] });                                                                         // the stole down the front
    for (const s of [-1, 1]) R.lump('spine', 0.1, 0, 0.12, s + 20, C.robeDk, { pos: [s * 0.2, 0.88, 0], scale: [1.8, 0.8, 1.1] });                                      // broad dark shoulders
    for (const [n, s] of [['armA', -1], ['armB', 1]]) {                                                                                                                  // both arms raised in a V round a tuning fork
      R.limb('spine', n, [s * 0.17, 0.88, 0], { a: 0.34, b: 0.38, r0: 0.05, r1: 0.042, r2: 0.036, cellA: C.robe, cellB: C.skin, seg: 5 });
      R.lump(n + 'M', 0.05, 0, 0.1, s + 22, C.skin, { pos: [0, -0.42, 0], scale: [0.9, 1.3, 0.8] });
      for (const d of [-1, 1]) R.cyl(n + 'M', 0.014, 0.018, 0.3, 4, C.bone, { pos: [d * 0.03, -0.62, 0] });                                                             // the tines of a fork held in the hand
    }
    head(R, C, { neckAt: [0, 0.92, 0.03], r: 0.12, tall: 1.3, neck: 0.16, cell: C.skin, eyes: 'both', eyeX: 0.045, seed: 12 });
    R.cone('head', 0.15, 0.34, 7, C.robe, { pos: [0, 0.3, -0.01], rot: [-0.05, 0, 0] }); R.tor('head', 0.12, 0.018, 3, 10, C.trim, { pos: [0, 0.16, 0], rot: [PI / 2, 0, 0] });         // the mitre
    // THE WHEEL: a ring behind the head and shoulders, four spokes, six bells hung from the rim; it turns in its own plane
    R.joint('halo', 'spine', [0, 0.8, -0.24]);
    R.tor('halo', 0.9, 0.05, 5, 30, C.bronze, { name: 'ring' }); R.tor('halo', 0.7, 0.025, 4, 26, 'glow', { name: 'ringGlow' });
    for (let k = 0; k < 6; k++) { const a = k * PI / 3 + PI / 6; R.tube('halo', [[0, 0, 0], [K(a) * 0.45, S(a) * 0.45, 0], [K(a) * 0.88, S(a) * 0.88, 0]], [0.03, 0.022, 0.02], 4, C.bronzeDk); }
    R.sph('halo', 0.06, 5, 4, 'glow', { name: 'hub' });
    for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; R.joint('hb' + i, 'halo', [K(a) * 0.9, S(a) * 0.9, 0]); R.bell('hb' + i, 0.2, 0.09, C.bronze, C.bronzeDk, { pos: [0, -0.16, 0], seg: 6 }); }
    R.J.ringEchoes = R.echo(R.J.ring, 1, 0.18);
  }, (p, J, R) => {
    const t = p.t, h = humanoidPose(p, J, { stoop: 0.03, headX: 0.1, jawOpen: 0.1, hipY: 1.16, stride: 0.5 }), up = p.attack > 0 ? h.raise : 0, d = ease(clamp01(p.dead));
    J.legA.rotation.x *= 0.7; J.legB.rotation.x *= 0.7;
    J.armA.rotation.x = -2.3 - 0.4 * up + 0.05 * S(t * 1.1); J.armB.rotation.x = -2.3 - 0.4 * up - 0.05 * S(t * 1.1); J.armA.rotation.z = -0.5 - 0.25 * up; J.armB.rotation.z = 0.5 + 0.25 * up; J.armAM.rotation.x = J.armBM.rotation.x = -0.3;
    J.halo.rotation.z = t * (0.5 + 2.4 * up) * (1 - d); J.halo.rotation.y = 0.12 * S(t * 0.7);
    J.ringGlow.scale.setScalar(d > 0.1 ? 0.001 : 1 + 0.06 * S(t * 3) + 0.4 * up); J.hub.scale.setScalar(d > 0.1 ? 0.001 : 0.8 + 0.3 * S(t * 4) + 1.4 * up);
    for (let i = 0; i < 6; i++) J['hb' + i].rotation.z = -J.halo.rotation.z + S(t * 2.1 + i) * 0.12;                            // the bells hang true as the wheel turns
    R.ring(J.ringEchoes, up * (1 - h.rec));
  }, { maxLift: 3 });
}

// ------------------------------------------------------------------------------------------------------------------ BROOD VAT (PT-030, Episode 3 Batch E: the Foundry's spawner, a riveted cistern on stilts under a membrane dome)
/** a water-tower: a riveted iron tank held 3 m up on four splayed legs braced by a ring, copper bands, a gauge, four pipes arching over its shoulder to vents that glow, a dome of yellow-green membrane on top with a dark shape stirring in it, and a long drain
 *  hanging from its belly to a flared spout at knee height, which is where the brood drops from. It is tall and mostly air below the tank, so it can be told from every creature (the low shell of the Bulwark, the stepped throne of the Mother) at a glance.
 *  `p.swell` (the sim's vat_swell, 0..1) is the dome bulging, the vents flaring and the whole tank shuddering; killed, the dome slumps, the vents go out and the tank sags on its legs. */
export function vat(tex) {
  const C = cellsOf('vat');
  return makeCreature(tex, (R) => {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      R.tube(null, [[sx * 1.0, 0.0, sz * 1.0], [sx * 0.82, 1.5, sz * 0.82], [sx * 0.62, 3.0, sz * 0.62]], [0.13, 0.11, 0.1], 5, C.ironDk);                                                    // a stilt
      R.box(null, 0.4, 0.12, 0.4, C.iron, { pos: [sx * 1.0, 0.06, sz * 1.0] });
    }
    for (const [x0, z0, x1, z1] of [[-0.82, -0.82, 0.82, -0.82], [0.82, -0.82, 0.82, 0.82], [0.82, 0.82, -0.82, 0.82], [-0.82, 0.82, -0.82, -0.82]]) R.tube(null, [[x0, 1.5, z0], [(x0 + x1) / 2, 1.5, (z0 + z1) / 2], [x1, 1.5, z1]], 0.045, 4, C.iron);       // the ring of braces
    R.tor(null, 0.9, 0.09, 3, 14, C.rust, { pos: [0, 3.0, 0], rot: [PI / 2, 0, 0] });                                                                                                     // the platform ring
    R.joint('tank', null, [0, 0, 0]);
    R.lathe('tank', V2([[0.45, 3.0], [0.8, 3.18], [0.98, 3.6], [0.96, 4.0], [0.8, 4.28], [0.6, 4.4]]), 14, C.iron);                                                                       // the tank
    R.tor('tank', 0.97, 0.055, 3, 16, C.copper, { pos: [0, 3.5, 0], rot: [PI / 2, 0, 0] }); R.tor('tank', 0.95, 0.055, 3, 16, C.copper, { pos: [0, 3.98, 0], rot: [PI / 2, 0, 0] });         // copper bands
    for (let i = 0; i < 4; i++) { const a = i * 1.7 + 0.6; R.lump('tank', 0.26, 0, 0.16, i + 3, C.rust, { pos: [S(a) * 0.96, 3.45 + i * 0.2, K(a) * 0.96], scale: [1, 1.1, 0.4], rot: [0, a, 0] }); }      // rust bleeding through
    R.cyl('tank', 0.19, 0.19, 0.07, 10, C.copper, { pos: [0, 3.65, 0.98], rot: [PI / 2, 0, 0] }); R.cyl('tank', 0.11, 0.11, 0.08, 8, C.ironDk, { pos: [0, 3.65, 1.02], rot: [PI / 2, 0, 0] });      // a gauge
    R.tube('tank', [[0, 3.05, 0], [0.02, 2.3, 0.05], [0.0, 1.5, 0.1], [0, 0.95, 0.12]], [0.2, 0.17, 0.15, 0.14], 6, C.pipe);                                                              // the drain
    R.cone('tank', 0.34, 0.34, 8, C.copper, { pos: [0, 0.78, 0.12], rot: [PI, 0, 0] }); R.sph('tank', 0.09, 5, 4, 'glow', { pos: [0, 0.52, 0.12], name: 'drip' });                          // the spout, and the light of what hangs from it
    R.joint('dome', 'tank', [0, 4.38, 0]);
    R.lump('dome', 0.64, 1, 0.1, 6, C.dome, { scale: [1, 0.74, 1], name: 'domeMesh' });                                                                                                   // the membrane
    R.lump('dome', 0.3, 0, 0.16, 9, C.domeDk, { pos: [0.28, 0.08, 0.2], scale: [1, 0.7, 1] }); R.lump('dome', 0.24, 0, 0.16, 12, C.slime, { pos: [-0.24, 0.1, -0.16], scale: [1, 0.7, 1] });
    R.tor('dome', 0.65, 0.06, 3, 16, C.copper, { pos: [0, -0.04, 0], rot: [PI / 2, 0, 0] });                                                                                              // the clamp ring
    for (let i = 0; i < 4; i++) {                                                                                                                                                         // pipes over the shoulder to vents
      const a = i * PI / 2 + PI / 4;
      R.tube('tank', [[S(a) * 0.9, 3.7, K(a) * 0.9], [S(a) * 1.06, 4.0, K(a) * 1.06], [S(a) * 0.9, 4.45, K(a) * 0.9], [S(a) * 0.6, 4.62, K(a) * 0.6]], [0.075, 0.07, 0.065, 0.055], 5, i % 2 ? C.copper : C.pipe);
      R.sph('tank', 0.075, 5, 4, 'glow', { pos: [S(a) * 0.6, 4.66, K(a) * 0.6], name: 'vent' + i });
    }
    R.J.nvents = 4;
  }, (p, J, R) => {
    const t = p.t, d = ease(clamp01(p.dead)), sw = p.swell ?? 0, br = S(t * 1.6);
    const sh = sw * 0.02 * S(t * 38);                                                                                       // the shudder of a vessel under pressure
    J.dome.scale.set((1 + 0.02 * br + 0.5 * sw + sh) * (1 + 0.15 * d), (1 + 0.03 * br + 0.85 * sw) * (1 - 0.88 * d), (1 + 0.02 * br + 0.5 * sw - sh) * (1 + 0.15 * d)); J.dome.position.y = 4.38 - 0.12 * d;
    for (let i = 0; i < J.nvents; i++) J['vent' + i].scale.setScalar(d > 0.1 ? 0.001 : 0.5 + 0.3 * (0.5 + 0.5 * S(t * 2.2 + i * 1.3)) + 1.5 * sw);
    J.drip.scale.setScalar(d > 0.1 ? 0.001 : 0.8 + 0.3 * S(t * 3 + 1) + 1.2 * sw);
    J.tank.position.x = sh * 0.6; J.tank.position.y = -0.35 * d; J.tank.rotation.z = 0.06 * d;
  }, { maxLift: 2 });
}

// ------------------------------------------------------------------------------------------------------------------ REED (PT-030, Episode 3 Batch E: a bagpipe grown from the floor of the Throat, the Grand Cantor's shield node)
/** a verdigris stone, a tall bronze chanter with ivory collars and finger holes, a bladder of pale hide laced with cord held aloft round its top and a crook over it with a glowing mouth: a shepherd's staff that breathes. The bag swells and the pipe hums
 *  (the glow flares when it is struck); killed, the bag empties and the pipe leans over. 3.4 m, thin below and round above: the opposite of the Bulwark's low shell and of the Vat's barrel. */
export function reed(tex) {
  const C = cellsOf('reed');
  return makeCreature(tex, (R) => {
    R.cyl(null, 0.7, 0.78, 0.22, 10, C.stone, { pos: [0, 0.11, 0] });
    R.joint('pipes', null, [0, 0, 0]);
    R.cyl('pipes', 0.15, 0.2, 2.4, 8, C.bronze, { pos: [0, 1.4, 0] });                                                                                     // the chanter
    for (const y of [0.55, 1.1, 1.65]) R.tor('pipes', 0.2, 0.045, 3, 10, C.bone, { pos: [0, y, 0], rot: [PI / 2, 0, 0] });
    for (let i = 0; i < 4; i++) R.sph('pipes', 0.055, 4, 3, C.mouth, { pos: [0, 0.6 + i * 0.28, 0.17] });                                                    // finger holes
    R.joint('bag', 'pipes', [0, 2.62, 0]);
    R.lump('bag', 0.62, 1, 0.1, 5, C.flesh, { scale: [1, 0.92, 1] }); R.lump('bag', 0.34, 0, 0.14, 8, C.fleshDk, { pos: [0.38, -0.1, 0.26], scale: [1, 0.9, 0.7] });
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.4; R.tube('bag', [[S(a) * 0.4, 0.4, K(a) * 0.4], [S(a + 0.18) * 0.62, 0.0, K(a + 0.18) * 0.62], [S(a) * 0.4, -0.4, K(a) * 0.4]], 0.028, 4, C.cord); }      // the lacing, zig-zag
    R.tube('pipes', [[0, 3.1, 0], [0.22, 3.36, 0], [0.62, 3.4, 0], [0.9, 3.16, 0], [0.96, 2.86, 0]], [0.11, 0.1, 0.09, 0.08, 0.07], 5, C.bronzeDk);              // the crook
    R.cone('pipes', 0.2, 0.34, 7, C.bronze, { pos: [0.96, 2.7, 0], rot: [PI, 0, 0] }); R.sph('pipes', 0.075, 5, 4, 'glow', { pos: [0.96, 2.54, 0], name: 'mouthGlow' });
  }, (p, J, R) => {
    const t = p.t, d = ease(clamp01(p.dead)), br = S(t * 1.4), fl = p.flash || 0;
    J.bag.scale.set((1 + 0.05 * br) * (1 + 0.2 * d), (1 - 0.06 * br) * (1 - 0.8 * d), (1 + 0.05 * br) * (1 + 0.2 * d)); J.bag.position.y = 2.62 - 0.35 * d;
    J.pipes.rotation.z = 0.012 * S(t * 23) * (1 - d) + 0.5 * d; J.pipes.rotation.x = 0.004 * S(t * 31) * (1 - d);                                           // they hum; dead, they lean over
    J.mouthGlow.scale.setScalar(d > 0.1 ? 0.001 : 1 + 0.3 * S(t * 4) + 1.6 * fl);
  }, { maxLift: 2 });
}

// ------------------------------------------------------------------------------------------------------------------ GRAND CANTOR (PT-030, Episode 3 Batch E: the Choir's voice, four legs and a horn the size of a doorway)
/** a trumpet flare as a lathe profile, lip (r0) at y = 0 up to the throat (r1) at y = h, ascending in y so it faces outward; `k` > 1 flares it late */
const trumpet = (h, r0, r1, k, n) => Array.from({ length: n + 1 }, (_, i) => new THREE.Vector2(Math.max(0.001, r1 + (r0 - r1) * Math.pow(1 - i / n, k)), (h * i) / n));
/** a low heavy four-legged body of oxblood flesh under black chitin plates; a neck that rises and bends over it, ending in a great brass HORN (green at the seams, its throat raw and red) that faces the player and takes the place of a face; a crest of seven ivory
 *  organ pipes along the back; three bells slung under the belly and a tail with one more. Its pulse is the horn drawing breath: the body rears, the horn lifts, the pipes light and the throat glows; the slam drops the horn on you. Dead, it folds onto its knees and
 *  lets the horn down. Seen from the front it is a round brass mouth on four spread legs, from the side a long arch: nothing else is a horn. */
export function grandcantor(tex) {
  const C = cellsOf('grandcantor'), HL = 1.55, TILT = 0.6;
  return makeCreature(tex, (R) => {
    R.joint('body', null, [0, 2.5, 0]);
    for (const [n, x, z] of [['legFA', -0.95, 1.05], ['legFB', 0.95, 1.05], ['legBA', -0.95, -1.05], ['legBB', 0.95, -1.05]]) {                                // four legs, splayed
      R.limb('body', n, [x, -0.2, z], { a: 1.07, b: 1.07, r0: 0.24, r1: 0.19, r2: 0.15, cellA: C.leg, cellB: C.chitinDk, seg: 7 });
      R.box(n + 'M', 0.6, 0.14, 0.8, C.iron, { pos: [0, -1.12, 0.12] }); R.J[n].rotation.z = -Math.sign(x) * 0.22;
    }
    R.lump('body', 1.0, 1, 0.1, 3, C.flesh, { scale: [1.0, 0.8, 1.7], name: 'torso' });
    for (let i = 0; i < 4; i++) R.lump('body', 0.55, 0, 0.12, 10 + i, C.chitin, { pos: [0, 0.55, -1.0 + i * 0.7], scale: [1.2, 0.45, 0.75] });                  // plates down the back
    for (let i = 0; i < 3; i++) R.tor('body', 0.76 + 0.06 * (i % 2), 0.05, 3, 14, C.bronzeDk, { pos: [0, 0, -0.85 + i * 0.85], rot: [0, PI / 2, 0], scale: [0.8, 0.8, 1] });    // hoops round the belly
    // THE NECK AND THE HORN
    R.tube('body', [[0, 0.1, 1.05], [0, 0.6, 1.25], [0, 1.2, 1.15], [0, 1.75, 0.95]], [0.58, 0.48, 0.4, 0.34], 7, C.fleshDk, { name: 'neck' });
    for (const s of [-1, 1]) { R.sph('body', 0.1, 4, 3, C.iron, { pos: [s * 0.38, 1.0, 1.4] }); R.sph('body', 0.05, 4, 3, 'glow', { pos: [s * 0.38, 1.0, 1.5] }); }       // two small eyes on the neck: the horn is the face
    R.joint('horn', 'body', [0, 1.75, 0.95], [-(PI / 2 + TILT), 0, 0]);
    const P = trumpet(HL, 1.2, 0.2, 2.0, 10), rAt = (y) => 0.2 + (1.2 - 0.2) * Math.pow(1 - y / HL, 2.0);
    R.lathe('horn', P, 14, C.horn, { pos: [0, -HL, 0], name: 'hornMesh' });
    R.lathe('horn', P.map((v) => new THREE.Vector2(Math.max(0.001, v.x - 0.05), v.y)), 14, C.hornIn, { pos: [0, -HL, 0], inside: true });                    // the throat: raw and ridged
    R.tor('horn', 1.2, 0.09, 4, 18, C.bronze, { pos: [0, -HL, 0], rot: [PI / 2, 0, 0] });
    for (const y of [0.4, 0.8, 1.2]) R.tor('horn', rAt(y) + 0.015, 0.045, 3, 14, C.trim, { pos: [0, y - HL, 0], rot: [PI / 2, 0, 0] });
    R.cyl('horn', 0.4, 0.2, 0.06, 10, 'glow', { pos: [0, 0.5 - HL, 0], name: 'plug' });                                                                    // the light deep in the throat
    R.J.hornEchoes = R.echo(R.J.hornMesh, 1, 0.1);
    // THE CREST: seven ivory and bronze organ pipes along the back, mouths lit
    const HS = [1.1, 1.5, 1.9, 2.2, 1.9, 1.5, 1.2];
    for (let i = 0; i < 7; i++) {
      const h = HS[i], z = -1.2 + i * 0.4;
      R.joint('pipe' + i, 'body', [0, 0.62, z], [-0.22, 0, 0]); R.cyl('pipe' + i, 0.09, 0.13, h, 6, i % 2 ? C.bronze : C.bone, { pos: [0, h / 2, 0] }); R.cone('pipe' + i, 0.15, 0.12, 6, C.bronzeDk, { pos: [0, h + 0.04, 0], rot: [PI, 0, 0] });
      R.sph('pipe' + i, 0.075, 4, 3, 'glow', { pos: [0, h + 0.1, 0], name: 'pm' + i });
    }
    R.J.npipes = 7;
    // THE BELLS: three slung under the belly, one on the tail
    for (let i = 0; i < 3; i++) { R.joint('bb' + i, 'body', [(i - 1) * 0.45, -0.62, 0.5 - i * 0.2]); R.bell('bb' + i, 0.6, 0.27, C.bronze, C.bronzeDk, { pos: [0, -0.6, 0], seg: 6 }); }
    R.tube('body', [[0, 0.1, -1.7], [0, -0.1, -2.2], [0, -0.45, -2.55], [0, -0.9, -2.65]], [0.3, 0.22, 0.16, 0.1], 6, C.fleshDk, { name: 'tail' });
    R.joint('tb', 'body', [0, -0.9, -2.65]); R.bell('tb', 0.5, 0.22, C.bronze, C.bronzeDk, { pos: [0, -0.5, 0], seg: 6 });
  }, (p, J, R) => {
    const t = p.t, w = p.walk, ph = p.phase, a = p.attack, d = ease(clamp01(p.dead)), br = S(t * 1.1);
    const rear = a > 0 ? ease(clamp01(a / 0.55)) * (1 - ease(clamp01((a - 0.8) / 0.2))) : 0, slam = a > 0.55 ? ease(clamp01((a - 0.55) / 0.12)) * (1 - ease(clamp01((a - 0.7) / 0.3))) : 0;
    const sw = S(ph) * 0.5 * w; J.legFA.rotation.x = J.legBB.rotation.x = sw * (1 - d); J.legFB.rotation.x = J.legBA.rotation.x = -sw * (1 - d);
    for (const [n, s] of [['legFAM', 1], ['legBBM', 1], ['legFBM', -1], ['legBAM', -1]]) J[n].rotation.x = (0.1 + Math.max(0, K(ph) * s) * 0.5 * w) * (1 - d) + 1.2 * d;
    J.body.position.y = 2.5 + Math.abs(S(ph)) * 0.06 * w + 0.025 * br - 1.0 * d; J.rig.rotation.z = 1.3 * d;                  // dead: it goes over onto its side, legs out J.body.rotation.x = -0.2 * rear + 0.05 * S(ph) * w + 0.12 * slam; J.body.rotation.z = 0.04 * S(ph) * w + 0.05 * d;
    J.horn.rotation.x = -(PI / 2 + TILT) - 0.4 * rear + 0.85 * slam + 0.9 * d;
    J.plug.scale.setScalar(d > 0.1 ? 0.001 : 1 + 0.25 * S(t * 3.3) + 1.3 * rear); R.ring(J.hornEchoes, d > 0 ? 0 : rear);
    for (let i = 0; i < J.npipes; i++) J['pm' + i].scale.setScalar(d > 0.1 ? 0.001 : 0.5 + 0.3 * (0.5 + 0.5 * S(t * 1.8 + i)) + 1.2 * rear * (0.5 + 0.5 * S(t * 9 - i)));
    for (let i = 0; i < 3; i++) J['bb' + i].rotation.z = S(t * 1.7 + i * 2) * 0.12 * (1 - d) + 0.3 * S(ph + i) * w;
    J.tb.rotation.z = S(t * 1.3) * 0.15 * (1 - d) + 0.3 * S(ph * 0.5) * w; J.tb.rotation.x = 0.1 * S(t * 0.9);
  }, { maxLift: 6 });
}

// ------------------------------------------------------------------------------------------------------------------ GATE WARDEN (PT-033, Episode 4 Batch E: the Campaign One boss, an arch in the mouth of the Gate)
/** A tall stilted arch of ivory bone standing in two great brass bells on stone plinths, plated in white bell-chitin and hooped in brass, with a RING OF LIGHT standing behind it (a ring is nothing else's silhouette) and one great EYE hanging from the keystone in a
 *  socket with a lid. Two long arms hang in front of the legs and end in bells for fists; two small bells hang inside the arch; a crest of bone spines crowns it. The eye is the sweep: the lid lifts through the tell and the eye turns after the beam (`p.sweep`: 0 none,
 *  0..1 the tell, 1..2 the beam; `p.aim`: the beam's angle relative to the Warden's own). The pulse is the arms going up and the ring flaring; the slam brings the fists down. Dead, the arch goes over forward, the ring out. It never walks. */
export function gatewarden(tex) {
  const C = cellsOf('gatewarden'), A = 1.55, YS = 4.45, LEG = 5, ARC = 9, YB = 0.8;
  const pts = [], rad = [];
  for (let i = 0; i <= LEG; i++) { pts.push([-A, YB + (YS - YB) * i / LEG, 0]); rad.push(0.42 - 0.04 * i / LEG); }
  for (let i = 1; i < ARC; i++) { const th = PI - PI * i / ARC; pts.push([A * K(th), YS + A * S(th), 0]); rad.push(0.38 - 0.02 * S(th)); }
  for (let i = LEG; i >= 0; i--) { pts.push([A, YB + (YS - YB) * i / LEG, 0]); rad.push(0.42 - 0.04 * i / LEG); }
  return makeCreature(tex, (R) => {
    for (const s of [-1, 1]) {
      R.box(null, 1.7, 0.26, 1.5, C.stone, { pos: [s * A, 0.13, 0] });
      R.bell(null, 1.1, 0.64, C.bronze, C.bronzeDk, { pos: [s * A, 0.24, 0], seg: 8 });                                                                  // each leg stands in a great bell
      R.tor(null, 0.64, 0.05, 3, 10, C.trim, { pos: [s * A, 0.3, 0], rot: [PI / 2, 0, 0] });
      for (let i = 0; i < 3; i++) R.lump(null, 0.3, 0, 0.12, 4 + i + (s > 0 ? 3 : 0), C.chitin, { pos: [s * A, 1.7 + i * 1.05, 0.26 - 0.06 * i], scale: [0.95, 1.45, 0.7] });     // plates of bell-chitin up the leg
      for (const y of [1.45, 2.65, 3.85]) R.tor(null, 0.44, 0.06, 3, 8, C.bronze, { pos: [s * A, y, 0], rot: [PI / 2, 0, 0] });
    }
    R.tube(null, pts, rad, 7, C.bone, { name: 'arch' });
    for (let i = 0; i < 5; i++) { const th = PI * (0.12 + 0.19 * i); R.lump(null, 0.26, 0, 0.12, 12 + i, C.chitin, { pos: [A * K(th), YS + A * S(th) + 0.02, 0.2], scale: [0.9, 0.8, 0.7] }); }       // and plates along the curve
    R.box(null, 0.8, 0.62, 0.95, C.stone, { pos: [0, YS + A + 0.2, 0] }); R.tor(null, 0.42, 0.05, 3, 8, C.trim, { pos: [0, YS + A + 0.2, 0.48], rot: [0, 0, 0], scale: [1, 0.7, 1] });
    for (const [x, tilt, h] of [[0, 0, 0.62], [-0.38, 0.45, 0.46], [0.38, -0.45, 0.46], [-0.7, 0.85, 0.34], [0.7, -0.85, 0.34]]) R.cone(null, 0.09, h, 5, C.bone, { pos: [x, YS + A + 0.5 + h / 2 - 0.18 * Math.abs(x), 0], rot: [0, 0, tilt] });          // the crest
    // THE RING OF LIGHT, behind: a halo of teal light with beads travelling round it
    R.joint('ring', null, [0, 3.85, -0.95]);
    R.tor('ring', 2.05, 0.09, 5, 28, 'glow', { name: 'halo' });
    R.tor('ring', 2.05, 0.05, 3, 20, C.iron, { pos: [0, 0, -0.1] });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; R.sph('ring', 0.15, 4, 3, 'glow', { pos: [S(a) * 2.05, K(a) * 2.05, 0.02], name: 'bead' + i }); }
    // THE EYE, hung from the keystone by a thick cord, in a socket with a lid
    R.tube(null, [[0, YS + A - 0.1, 0.02], [0, YS + A - 0.7, 0.06], [0, YS + 0.1, 0.1]], 0.16, 6, C.boneDk);
    R.joint('eyeG', null, [0, 3.7, 0.1]);
    R.sph('eyeG', 0.58, 10, 7, C.bone); R.sph('eyeG', 0.27, 8, 6, 'glow', { pos: [0, 0, 0.42], name: 'iris' }); R.box('eyeG', 0.06, 0.42, 0.05, C.iron, { pos: [0, 0, 0.7], name: 'slit' });
    R.prim('eyeG', new THREE.SphereGeometry(0.66, 10, 4, 0, PI * 2, 0, PI / 2), C.chitinDk, { rot: [PI, 0, 0] });                                                // the socket: a bowl under the eye
    R.joint('lid', 'eyeG', [0, 0, 0]); R.prim('lid', new THREE.SphereGeometry(0.66, 10, 4, 0, PI * 2, 0, PI / 2), C.chitin);                                       // the lid: a dome that lifts back
    R.tor('lid', 0.5, 0.05, 3, 10, C.trim, { pos: [0, 0.3, 0.3], rot: [0.9, 0, 0], scale: [1, 0.7, 1] });
    // two small bells inside the arch
    for (const s of [-1, 1]) { R.joint('hb' + (s > 0 ? 'B' : 'A'), null, [s * 0.95, 5.2, 0]); R.bell('hb' + (s > 0 ? 'B' : 'A'), 0.7, 0.27, C.bronze, C.bronzeDk, { pos: [0, -0.7, 0], seg: 7 }); }
    // THE ARMS: long, in front of the legs, bells for fists
    for (const [n, s] of [['armA', -1], ['armB', 1]]) {
      R.limb(null, n, [s * (A + 0.05), 3.9, 0.66], { a: 1.4, b: 1.5, r0: 0.23, r1: 0.19, r2: 0.15, cellA: C.boneDk, cellB: C.bone, seg: 6 });
      R.lump(n, 0.3, 0, 0.12, 20 + s, C.chitinDk, { pos: [0, 0.05, 0], scale: [1.1, 0.9, 1] });
      R.bell(n + 'M', 0.62, 0.3, C.bronze, C.bronzeDk, { pos: [0, -1.5 - 0.62, 0], seg: 6 }); R.tor(n + 'M', 0.3, 0.04, 3, 8, C.trim, { pos: [0, -1.5 - 0.6, 0], rot: [PI / 2, 0, 0] });
    }
  }, (p, J, R) => {
    const t = p.t, d = ease(clamp01(p.dead)), a = p.attack, sw = p.sweep || 0, fl = p.flash || 0, awake = p.awake !== false;
    const rear = a > 0 ? ease(clamp01(a / 0.55)) * (1 - ease(clamp01((a - 0.8) / 0.2))) : 0, slam = a > 0.55 ? ease(clamp01((a - 0.55) / 0.12)) * (1 - ease(clamp01((a - 0.7) / 0.3))) : 0;
    const open = d > 0 ? 0 : sw > 0 ? ease(clamp01(sw / 0.55)) : awake ? 0.22 + 0.06 * S(t * 0.9) : 0;
    J.lid.rotation.x = -open * 1.3; J.eyeG.rotation.y = sw > 1 ? Math.max(-1.3, Math.min(1.3, p.aim || 0)) : (sw > 0 ? (p.aim || 0) * ease(clamp01(sw)) * 0.9 : 0.1 * S(t * 0.6)) * (1 - d);
    J.iris.scale.setScalar(d > 0.05 || open < 0.12 ? 0.001 : (0.55 + 0.45 * open) * (1 + 0.1 * S(t * 3) + 0.9 * fl + (sw > 1 ? 0.35 : 0))); J.slit.scale.set(1, open < 0.12 || d > 0.05 ? 0.001 : 1, 1);
    J.armA.rotation.x = -2.4 * rear + 1.95 * slam + 0.04 * S(t * 0.8) - 0.1 * d + 0.5 * d; J.armB.rotation.x = -2.4 * rear + 1.95 * slam + 0.04 * S(t * 0.8 + 1) - 0.1 * d + 0.5 * d;
    J.armA.rotation.z = 0.12 * rear + 0.06 * S(t * 0.7); J.armB.rotation.z = -0.12 * rear - 0.06 * S(t * 0.7 + 1);
    J.armAM.rotation.x = -0.5 * rear - 0.1 * S(t * 1.1); J.armBM.rotation.x = -0.5 * rear - 0.1 * S(t * 1.1 + 1);
    J.hbA.rotation.z = S(t * 1.5) * 0.1 * (1 - d) + 0.2 * rear * S(t * 9); J.hbB.rotation.z = S(t * 1.3 + 2) * 0.1 * (1 - d) - 0.2 * rear * S(t * 9 + 1);
    J.ring.rotation.z = t * (0.35 + 0.9 * rear + 0.5 * Math.min(1, sw)); J.ring.scale.setScalar(d > 0.1 ? 0.001 : 1 + 0.03 * S(t * 2) + 0.14 * rear + 0.05 * Math.min(1, sw));
    for (let i = 0; i < 8; i++) J['bead' + i].scale.setScalar(d > 0.1 ? 0.001 : 0.7 + 0.5 * (0.5 + 0.5 * S(t * 3 - i)) + 1.0 * rear);
    J.halo.scale.setScalar(d > 0.1 ? 0.001 : 1);
    J.rig.rotation.x = 0.08 * slam + 1.5 * d; J.rig.position.z = 0.15 * slam;                                                       // it leans into the blow; dead, the arch goes over forward
  }, { maxLift: 8 });
}

// ------------------------------------------------------------------------------------------------------------------ SEAL (PT-033: a seal on the Warden's arch; a node: an ARMILLARY, three crossed rings of old brass round a diamond of light, on a bone post and a stone plinth)
export function seal(tex) {
  const C = cellsOf('seal');
  return makeCreature(tex, (R) => {
    R.cyl(null, 0.42, 0.5, 0.2, 8, C.stone, { pos: [0, 0.1, 0] });
    R.cyl(null, 0.1, 0.17, 0.5, 6, C.bone, { pos: [0, 0.45, 0] }); R.tor(null, 0.17, 0.04, 3, 8, C.bronzeDk, { pos: [0, 0.68, 0], rot: [PI / 2, 0, 0] });
    R.joint('gem', null, [0, 1.56, 0]);
    R.prim('gem', new THREE.OctahedronGeometry(0.3, 0), 'glow', { scale: [1, 1.5, 1], name: 'core' });
    for (let i = 0; i < 3; i++) R.tor('gem', 0.95, 0.09, 3, 20, i === 0 ? C.trim : C.bronze, { rot: [0, (i * PI) / 3, 0] });                 // three vertical rings, a third of a turn apart: round from every side
    R.tor('gem', 0.95, 0.07, 3, 20, C.bronzeDk, { rot: [PI / 2, 0, 0] });                                                                      // and the equator
  }, (p, J, R) => {
    const t = p.t, d = ease(clamp01(p.dead));
    J.gem.position.y = 1.56 + 0.05 * S(t * 1.6) * (1 - d) - 0.8 * d; J.gem.rotation.y = t * 0.5; J.gem.rotation.z = 0.9 * d; J.gem.scale.setScalar(1 - 0.55 * d);          // dead: the rings fold in as the cage drops
    J.core.scale.set(1, 1.5, 1).multiplyScalar(d > 0.1 ? 0.001 : 1 + 0.1 * S(t * 3) + 0.8 * (p.flash || 0));
    J.rig.rotation.z = 1.5 * d;
  });
}

export const FACTORIES = { tollbearer, gaunt, bellhand, sexton, wardengraft, cantor, bellnode, gill, chorister, bulwark, weeping, acolyte, vat, reed, grandcantor, gatewarden, seal, feeder, graftmother };
