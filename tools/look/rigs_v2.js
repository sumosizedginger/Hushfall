// The refined creature designs as REAL rigs (design/LOOK_BIBLE.md v2): same factory shape as the shipped makeTollbearer(atlas) / makeDroneGill(atlas) -> { root, rig, pose, mat }, built with tools/look/rigkit.js on
// the prototype atlas. Hit volumes are the shipped ones (src/engine/defs.js: height, radius, hitRadius, hitForward): every rig is checked against them by tools/look/check-rigs.mjs.
// Front is +z (the view turns `root` to face the player). Asymmetric masses sit on the screen-right (+x) side as the player sees a creature facing them.
// Lessons from the first renders through the real post pass (tools/look/dev.js), applied here: no flat card-like panels (they read as paper labels); large masses must be mid-value, not near black (a dark
// coat vanishes in a dark hall); verdigris is olive, never teal (teal is the Hush); the hand-held and shoulder-mounted masses must sit to the SIDE of the body, not in front of the chest.
import * as THREE from 'three';
import { makeCreature, humanoidPose, bellProfile, CELL as C, ease, clamp01 } from './rigkit.js';

const S = Math.sin, K = Math.cos, PI = Math.PI;
const legs = (R, hipsName, x, spec, footCell = C.oil) => {
  for (const [n, s] of [['legA', -1], ['legB', 1]]) { R.limb(hipsName, n, [s * x, 0, 0], spec); R.box(n + 'M', spec.fw ?? 0.13, spec.fh ?? 0.08, spec.fl ?? 0.3, footCell, { pos: [0, -spec.b + 0.01, 0.06] }); }
};
const head = (R, { neckAt, r = 0.15, tall = 1.3, neck = 0.2, cell = C.skin, eyeX = 0.06 }) => {
  R.joint('neck', 'spine', neckAt); R.cyl('neck', 0.055, 0.065, neck, 6, cell, { pos: [0, neck / 2 - 0.03, 0] });
  R.joint('head', 'neck', [0, neck - 0.04, 0]); R.ico('head', r, 1, cell, { pos: [0, r * 0.55, 0], scale: [0.85, tall, 1] });
  R.joint('jaw', 'head', [0, -0.05, r * 0.2]); R.box('jaw', r * 0.72, r * 0.9, r * 0.8, cell, { pos: [0, -r * 0.45, r * 0.3] }); R.box('jaw', r * 0.62, r * 0.62, 0.02, C.ox, { pos: [0, r * 0.1, r * 0.64] });
  R.sph('head', r * 0.28, 5, 3, C.iron, { pos: [-eyeX, r * 0.72, r * 0.76] }); R.sph('head', r * 0.28, 5, 3, C.iron, { pos: [eyeX, r * 0.72, r * 0.76] }); R.sph('head', r * 0.14, 4, 3, 'glow', { pos: [-eyeX, r * 0.72, r * 0.93] });
};
const hand = (R, arm, { len, r = 0.075, finger = 0.2 }) => { R.ico(arm + 'M', r, 0, C.skin, { pos: [0, -len, 0], scale: [0.95, 1.5, 0.78] }); for (const d of [-1, 0, 1]) R.cone(arm + 'M', 0.018, finger, 4, C.bone, { pos: [d * r * 0.5, -len - r * 1.4 - finger / 2 + 0.03, 0.01], rot: [PI, 0, 0] }); };

// ------------------------------------------------------------------------------------------------------------------ TOLLBEARER (BELL)
/** o.stage: 0 = early graft (Episode 1), 2 = grown (Episode 2+). The drawn height is the shipped 2.25 m at every stage. */
export function tollbearer(tex, o = {}) {
  const stage = o.stage ?? 2, big = stage >= 2;
  return makeCreature(tex, (R) => {
    R.joint('hips', null, [0, 0.94, 0]);
    legs(R, 'hips', 0.11, { a: 0.46, b: 0.44, r0: 0.105, r1: 0.082, r2: 0.058, cellA: C.oil, cellB: C.skin });
    R.joint('spine', 'hips', [0, 0.05, 0]);
    R.cyl('spine', 0.16, 0.23, 0.82, 8, C.oil, { pos: [0, 0.37, 0], scale: [1, 1, 0.72] });        // the coat: dark oilskin (mid-value so it reads in a dark hall)
    R.cyl('spine', 0.23, 0.27, 0.2, 8, C.oil, { pos: [0, -0.1, 0], scale: [1, 1, 0.72] });
    R.cyl('spine', 0.09, 0.11, 0.5, 6, C.bruise, { pos: [0.02, 0.5, 0.17], scale: [1, 1, 0.5] });  // the coat torn open: skin and ribs showing through, not a card
    R.box('spine', 0.05, 0.76, 0.03, C.oilY, { pos: [-0.2, 0.36, 0.2] });                         // the last yellow: a remnant of trim
    const strips = big ? 6 : 3;                                                                    // the coat in strips below the hem: the strings of the instrument
    for (let i = 0; i < strips; i++) {
      const a = (i / strips) * PI * 2 + 0.3, len = 0.34 + 0.22 * ((i * 5) % 3) / 2;
      R.joint('tat' + i, 'spine', [K(a) * 0.24, -0.18, S(a) * 0.19], [0, -a + PI / 2, 0]); R.box('tat' + i, 0.11, len, 0.02, C.oil, { pos: [0, -len / 2, 0] });
    }
    for (const [n, s] of [['armA', -1], ['armB', 1]]) { R.limb('spine', n, [s * 0.27, 0.7, 0], { a: 0.36, b: 0.5, r0: 0.072, r1: 0.062, r2: 0.052, cellA: C.oil, cellB: C.skin }); hand(R, n, { len: 0.56 }); }
    head(R, { neckAt: [0, 0.82, 0.03], r: 0.165, tall: 1.28, neck: 0.22 });
    for (const x of [-0.025, 0.035]) R.cyl('spine', 0.015, 0.015, 0.36, 4, C.bronze, { pos: [x, 0.66, 0.15], rot: [0.28, 0, x * 3] });          // grown cables from the jaw into the chest
    // THE BELL on the screen-right shoulder, hung to the SIDE and a little behind, mouth down
    R.joint('bell', 'spine', [0.37, big ? 0.46 : 0.6, -0.1]);
    R.ico('bell', 0.15, 0, C.bronze, { pos: [-0.04, 0.0, 0.02], scale: [1, 0.8, 1] });
    for (const [x, r] of [[-0.14, 0.55], [0.0, -0.35]]) R.cone('bell', 0.055, 0.36, 4, C.bone, { pos: [x, -0.02, 0.1], rot: [0, 0, r] });         // roots into the shoulder
    const bh = big ? 0.74 : 0.5, rl = big ? 0.35 : 0.21;
    const bell = R.lathe('bell', bellProfile(bh, 0.055, rl, 2.2), 10, C.bronze, { pos: [0, 0.1, 0], name: 'bellMesh' });
    R.cyl('bell', rl * 0.92, rl * 0.92, 0.02, 10, C.bronzeDk, { pos: [0, 0.14, 0] });
    R.tor('bell', rl, 0.03, 4, 12, C.bronzeDk, { pos: [0, 0.11, 0], rot: [PI / 2, 0, 0] });
    if (big) R.cyl('bell', rl * 0.78, rl, 0.14, 10, C.verd, { pos: [0, 0.2, 0] });               // olive verdigris at the lip: the grown stage
    R.sph('bell', 0.045, 6, 4, 'glow', { pos: [0, 0.13, 0], name: 'clapper' });
    R.J.bellEchoes = R.echo(bell, 1, 0.16);
    if (big) R.cone('spine', 0.13, 0.62, 5, C.bone, { pos: [-0.36, 0.12, -0.05], rot: [0, 0, 1.15] });                                              // a bone outrigger grown from the other hip (the Bellhand raises ITS bell on that side, high)
  }, (p, J, R) => {
    const t = p.t, h = humanoidPose(p, J, big ? { stoop: 0.2, lean: 0.06, headX: 0.5, headZ: 0.32, jawOpen: 0.5, hipY: 0.94 } : { stoop: 0.14, lean: 0.03, headX: 0.35, headZ: 0.2, jawOpen: 0.4, hipY: 0.96 });
    const ring = h.raise * (1 - h.rec);
    J.bell.scale.setScalar(1 + 0.04 * S(t * 3) + 0.2 * ring); J.bell.rotation.z = S(t * 1.1) * 0.035 - 0.12 * h.slam;
    J.clapper.scale.setScalar(1 + 0.25 * S(t * 3) + 1.4 * ring); R.ring(J.bellEchoes, p.attack > 0 ? ring : 0);
    for (let i = 0; J['tat' + i]; i++) J['tat' + i].rotation.x = S(t * 1.6 + i * 1.3) * 0.12 + 0.35 * p.walk * S(p.phase + i);
  });
}

// ------------------------------------------------------------------------------------------------------------------ GAUNT (UNTUNED: the screamer)
export function gaunt(tex) {
  return makeCreature(tex, (R) => {
    R.joint('hips', null, [0, 0.72, 0]);
    for (const [n, s] of [['legA', -1], ['legB', 1]]) { R.limb('hips', n, [s * 0.1, 0, 0], { a: 0.38, b: 0.38, r0: 0.1, r1: 0.075, r2: 0.05, cellA: C.skin, cellB: C.skin, seg: 6 }); R.box(n + 'M', 0.12, 0.06, 0.26, C.bone, { pos: [0, -0.38, 0.07] }); }
    R.joint('spine', 'hips', [0, 0.04, 0]);
    R.cyl('spine', 0.2, 0.24, 0.6, 7, C.skin, { pos: [0, 0.3, 0], scale: [1, 1, 0.85] });
    R.cyl('spine', 0.11, 0.13, 0.36, 6, C.ox, { pos: [0.04, 0.34, 0.15], scale: [1, 1, 0.45] });                 // the open chest: raw, not tuned
    for (let i = 0; i < 4; i++) R.cone('spine', 0.045, 0.2, 4, C.bone, { pos: [0, 0.12 + i * 0.14, -0.2 - i * 0.01], rot: [-0.75, 0, 0] });         // a ridge of bone down the back
    for (const [n, s] of [['armA', -1], ['armB', 1]]) {
      R.limb('spine', n, [s * 0.27, 0.52, 0], { a: 0.36, b: 0.4, r0: 0.085, r1: 0.07, r2: 0.055, cellA: C.skin, cellB: C.skin, seg: 6 });
      R.ico(n + 'M', 0.085, 0, C.skin, { pos: [0, -0.43, 0], scale: [1, 1.25, 0.85] });
      for (const d of [-1, 0, 1]) R.cone(n + 'M', 0.022, 0.22, 4, C.bone, { pos: [d * 0.04, -0.62, 0.02], rot: [PI, 0, 0] });                  // bone claws
    }
    R.joint('neck', 'spine', [0, 0.5, 0.04]); R.cyl('neck', 0.06, 0.07, 0.12, 6, C.skin, { pos: [0, 0.03, 0] });
    R.joint('head', 'neck', [0, 0.1, 0]); R.ico('head', 0.16, 1, C.skin, { pos: [0, 0.08, 0], scale: [0.9, 1.0, 1.1] });
    R.box('head', 0.12, 0.1, 0.05, C.ox, { pos: [0, -0.02, 0.15] });                                                   // the throat: a red slot in the face, the horn
    R.joint('jaw', 'head', [0, -0.02, 0.08]);                                                                        // the jaw has come off its hinge: it hangs DOWN, long, bone, where the player sees it
    R.box('jaw', 0.11, 0.34, 0.07, C.bone, { pos: [0, -0.17, 0.02], name: 'jawBone' });
    R.sph('head', 0.03, 6, 4, 'glow', { pos: [-0.07, 0.13, 0.14] }); R.sph('head', 0.03, 6, 4, 'glow', { pos: [0.07, 0.13, 0.14] });
  }, (p, J, R) => {
    const w = p.walk, ph = p.phase, t = p.t, cr = Math.max(0, -p.lunge), ex = Math.max(0, p.lunge), swing = S(ph) * 1.0 * w;
    J.legA.rotation.x = swing * (1 - ex) - ex * 0.9; J.legB.rotation.x = -swing * (1 - ex) - ex * 0.9;
    J.legAM.rotation.x = 0.4 + Math.max(0, K(ph)) * 1.0 * w + cr * 1.1 + ex * 0.2; J.legBM.rotation.x = 0.4 + Math.max(0, -K(ph)) * 1.0 * w + cr * 1.1 + ex * 0.2;
    J.hips.position.y = 0.72 - cr * 0.38 - ex * 0.12 + Math.abs(S(ph)) * 0.05 * w;
    J.spine.rotation.x = 0.7 + 0.1 * w + cr * 0.5 + ex * 0.45 + S(t * 1.8) * 0.03; J.spine.rotation.y = -S(ph) * 0.15 * w; J.spine.rotation.z = S(ph) * 0.06 * w + S(t * 38) * 0.08 * cr;
    J.armA.rotation.x = -0.85 - S(ph) * 0.7 * w; J.armB.rotation.x = -0.85 + S(ph) * 0.7 * w; J.armA.rotation.z = -0.05; J.armB.rotation.z = 0.05; J.armAM.rotation.x = J.armBM.rotation.x = -0.2;
    if (cr > 0) { J.armA.rotation.x = J.armB.rotation.x = -0.4; J.armAM.rotation.x = J.armBM.rotation.x = -1.4; }
    if (ex > 0) { J.armA.rotation.x = J.armB.rotation.x = -2.6; J.armAM.rotation.x = J.armBM.rotation.x = 0; }
    const a = p.attack; if (a > 0) { const up = a < 0.4 ? ease(a / 0.4) : 1, sl = a < 0.4 ? 0 : ease(clamp01((a - 0.4) / 0.2)); J.armB.rotation.x = -2.9 * up + 1.8 * sl; J.armA.rotation.x = -2.9 * up * 0.6 + 1.4 * sl; }
    J.head.rotation.x = -0.6 + S(t * 2.4) * 0.05; J.head.rotation.z = S(t * 1.3) * 0.08;
    J.jaw.rotation.x = -(0.12 + Math.max(cr, ex) * 0.5 + (a > 0 ? 0.3 : 0) + S(t * 5) * 0.03);                        // the scream: the jaw drops further on the crouch tell
    J.rig.rotation.z = ease(clamp01(p.dead)) * 1.5;
  });
}

// ------------------------------------------------------------------------------------------------------------------ BELLHAND (CLAPPER)
export function bellhand(tex) {
  return makeCreature(tex, (R) => {
    R.joint('hips', null, [0, 1.12, 0]);
    legs(R, 'hips', 0.1, { a: 0.58, b: 0.54, r0: 0.09, r1: 0.07, r2: 0.05, cellA: C.oil, cellB: C.skin });
    R.joint('spine', 'hips', [0, 0.05, 0]);
    R.cyl('spine', 0.17, 0.25, 0.7, 8, C.oil, { pos: [0, 0.3, 0], scale: [1, 1, 0.72] }); R.cyl('spine', 0.25, 0.3, 0.14, 8, C.oil, { pos: [0, -0.05, 0], scale: [1, 1, 0.72] });
    R.box('spine', 0.05, 0.62, 0.03, C.oilY, { pos: [-0.15, 0.3, 0.2] });
    // the collar-bell: a bronze bell worn over the shoulders, mouth down
    const col = R.lathe('spine', bellProfile(0.5, 0.1, 0.36, 1.25, 7), 10, C.bronze, { pos: [0, 0.34, 0], name: 'collar' }); R.tor('spine', 0.36, 0.03, 4, 12, C.bronzeDk, { pos: [0, 0.35, 0], rot: [PI / 2, 0, 0] });
    R.J.collarEchoes = R.echo(col, 1, 0.1);
    // armA (screen-left): grown long, a hammer-limb to the knee ending in a bronze clapper on a chain
    R.limb('spine', 'armA', [0.25, 0.66, 0], { a: 0.5, b: 0.8, r0: 0.07, r1: 0.07, r2: 0.085, cellA: C.oil, cellB: C.skin });
    R.cyl('armAM', 0.02, 0.02, 0.18, 4, C.iron, { pos: [0, -0.88, 0] }); R.ico('armAM', 0.16, 0, C.bronze, { pos: [0, -1.04, 0], name: 'clapper' }); R.sph('armAM', 0.035, 5, 3, 'glow', { pos: [0, -1.04, 0.14] });
    // armB (screen-right): normal, raised, holding a bronze cup like a hand-bell
    R.limb('spine', 'armB', [-0.24, 0.66, 0], { a: 0.36, b: 0.4, r0: 0.075, r1: 0.065, r2: 0.055, cellA: C.oil, cellB: C.skin });
    R.ico('armBM', 0.07, 0, C.bronze, { pos: [0, -0.43, 0] });
    const cup = R.lathe('armBM', bellProfile(0.24, 0.05, 0.16, 1.8, 5), 8, C.bronze, { pos: [0, -0.67, 0], name: 'cup' }); R.cyl('armBM', 0.14, 0.14, 0.02, 8, C.ox, { pos: [0, -0.66, 0] });   // crown at the wrist, the mouth toward the target
    R.J.cupEchoes = R.echo(cup, 1, 0.16);
    head(R, { neckAt: [0, 0.78, 0.03], r: 0.16, tall: 1.25, neck: 0.16 });
  }, (p, J, R) => {
    const t = p.t, h = humanoidPose(p, J, { stoop: 0.18, lean: 0.07, headX: 0.3, headZ: 0.1, jawOpen: 0.3, hipY: 1.12, stride: 0.6 });
    J.armA.rotation.z = 0.05 + S(t * 1.3) * 0.02; J.armAM.rotation.x = -0.05 - 0.05 * p.walk; J.clapper.position.x = S(t * 1.7 + p.phase) * 0.03 * (1 + 3 * p.walk);
    if (p.attack === 0) { J.armB.rotation.x = -0.1 + S(p.phase) * 0.15 * p.walk; J.armBM.rotation.x = -2.95; J.armB.rotation.z = -0.04; }       // the bell-mouth is carried up beside the head; the tell raises it overhead and swings it down
    const ring = h.raise * (1 - h.rec); J.cup.scale.setScalar(1 + 0.2 * ring); R.ring(J.cupEchoes, p.attack > 0 ? ring : 0); R.ring(J.collarEchoes, p.attack > 0 ? ring * 0.8 : 0);
  });
}

// ------------------------------------------------------------------------------------------------------------------ SEXTON (PIPE)
export function sexton(tex) {
  return makeCreature(tex, (R) => {
    R.joint('hips', null, [0, 0.62, 0]);
    legs(R, 'hips', 0.1, { a: 0.31, b: 0.3, r0: 0.08, r1: 0.065, r2: 0.05, cellA: C.oil, cellB: C.skin, fw: 0.12, fl: 0.34 });
    R.lathe('hips', bellProfile(1.02, 0.11, 0.42, 0.9, 7), 10, C.oil, { pos: [0, -0.6, 0], name: 'skirt' });                  // the robe: a bell-skirt to the floor
    R.tor('hips', 0.42, 0.03, 4, 12, C.oilY, { pos: [0, -0.58, 0], rot: [PI / 2, 0, 0] });                                // the yellow hem remnant
    for (const [y, r] of [[-0.3, 0.355], [0.1, 0.24]]) R.tor('hips', r, 0.04, 4, 12, C.bone, { pos: [0, y, 0], rot: [PI / 2, 0, 0] });
    R.joint('spine', 'hips', [0, 0.35, 0]);
    R.cyl('spine', 0.11, 0.16, 0.7, 8, C.oil, { pos: [0, 0.3, 0], scale: [1, 1, 0.78] });
    // the pipes: five, fanned, grown from the back; bone and bronze alternate; the mouths glow in sequence on the channel
    const lens = [0.74, 0.9, 1.0, 0.9, 0.74], fan = [0.26, 0.13, 0, -0.13, -0.26];
    for (let i = 0; i < 5; i++) {
      R.joint('pipe' + i, 'spine', [fan[i] * 0.3, 0.3, -0.16], [-0.18, 0, -fan[i] * 0.5]);
      R.cyl('pipe' + i, 0.085, 0.105, lens[i], 7, i % 2 ? C.bone : C.bronze, { pos: [0, lens[i] / 2, 0] }); R.tor('pipe' + i, 0.09, 0.025, 4, 8, C.bronzeDk, { pos: [0, lens[i], 0], rot: [PI / 2, 0, 0] });
      R.sph('pipe' + i, 0.06, 5, 4, 'glow', { pos: [0, lens[i] + 0.02, 0.0], name: 'mouth' + i });
    }
    for (const [n, s] of [['armA', -1], ['armB', 1]]) { R.limb('spine', n, [s * 0.21, 0.58, 0], { a: 0.34, b: 0.42, r0: 0.065, r1: 0.055, r2: 0.047, cellA: C.oil, cellB: C.skin }); hand(R, n, { len: 0.48, finger: 0.16 }); }
    R.ico('armAM', 0.1, 0, C.bronze, { pos: [0, -0.74, 0.06], name: 'censer' });                                           // a censer on a chain
    head(R, { neckAt: [0, 0.66, 0.04], r: 0.15, tall: 1.2, neck: 0.16 });
    R.cone('head', 0.2, 0.4, 7, C.oil, { pos: [0, 0.2, -0.06], rot: [0.25, 0, 0] });                                  // the hood
  }, (p, J, R) => {
    const t = p.t, h = humanoidPose(p, J, { stoop: 0.38, headX: 0.7, jawOpen: 0.25, hipY: 0.62, stride: 0.45 });
    J.legA.rotation.x *= 0.5; J.legB.rotation.x *= 0.5;
    for (let i = 0; i < 5; i++) { const seq = p.attack > 0 ? 0.5 + 0.5 * S(t * 7 - i * 1.1) : 0.15 + 0.1 * S(t * 2 + i); J['mouth' + i].scale.setScalar(0.4 + 1.3 * seq); J['pipe' + i].rotation.z = -[0.26, 0.13, 0, -0.13, -0.26][i] * 0.5 + S(t * 1.2 + i) * 0.01; }
    J.censer.rotation.z = S(t * 1.5) * 0.15;
  });
}

// ------------------------------------------------------------------------------------------------------------------ WARDEN-GRAFT (DRUM / SHELL)
export function wardengraft(tex) {
  return makeCreature(tex, (R) => {
    R.joint('hips', null, [0, 1.06, 0]);
    legs(R, 'hips', 0.24, { a: 0.54, b: 0.52, r0: 0.21, r1: 0.18, r2: 0.15, cellA: C.oil, cellB: C.oil, seg: 8, fw: 0.34, fh: 0.14, fl: 0.46 }, C.iron);
    R.joint('spine', 'hips', [0, 0.05, 0]);
    R.cyl('spine', 0.4, 0.35, 1.5, 9, C.oil, { pos: [0, 0.75, 0], scale: [1, 1, 0.78] });
    // the shell on the back: three overlapping bone-and-bronze plates humping above the shoulders (tortoise from the side)
    for (let i = 0; i < 3; i++) R.sph('spine', 0.52 - i * 0.05, 9, 6, i % 2 ? C.bronze : C.bone, { pos: [0, 1.28 + i * 0.12, -0.3 - i * 0.04], scale: [0.95, 0.55, 0.5], rot: [-0.5 + i * 0.1, 0, 0] });
    // the DRUM on the chest: a grown drum-shell, radial tension and a bronze hoop (this is the plate that takes a third from the front)
    R.cyl('spine', 0.47, 0.47, 0.22, 20, C.drum, { pos: [0, 0.9, 0.28], rot: [PI / 2, 0, 0], name: 'drum' }); R.tor('spine', 0.48, 0.05, 4, 18, C.bronze, { pos: [0, 0.9, 0.39] });
    for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; R.cone('spine', 0.04, 0.1, 3, C.bronzeDk, { pos: [K(a) * 0.48, 0.9 + S(a) * 0.48, 0.32], rot: [PI / 2, 0, 0] }); }
    R.sph('spine', 0.09, 6, 4, 'glow', { pos: [0, 0.9, 0.42], name: 'drumCore' });
    R.J.drumEchoes = R.echo(R.J.drum, 1, 0.12);
    for (const [n, s] of [['armA', -1], ['armB', 1]]) { R.limb('spine', n, [s * 0.4, 1.38, 0], { a: 0.66, b: 0.7, r0: 0.16, r1: 0.135, r2: 0.12, cellA: C.oil, cellB: C.skin, seg: 7 }); R.ico(n + 'M', 0.19, 0, C.skin, { pos: [0, -0.85, 0], scale: [1, 0.95, 1] }); }
    // the head: a faceless bone plate sunk between the shoulders
    R.joint('neck', 'spine', [0, 1.46, 0.16]); R.cyl('neck', 0.13, 0.17, 0.14, 6, C.skin, { pos: [0, 0.03, 0] });
    R.joint('head', 'neck', [0, 0.1, 0.02]); R.ico('head', 0.2, 1, C.bone, { pos: [0, 0.1, 0], scale: [0.9, 1.15, 1] }); R.box('head', 0.04, 0.3, 0.05, C.iron, { pos: [0, 0.1, 0.2] });
  }, (p, J, R) => {
    const t = p.t, h = humanoidPose(p, J, { stoop: 0.12, headX: 0.5, hipY: 1.06, stride: 0.5 });
    const charge = p.attack > 0 ? h.raise : 0; J.drumCore.scale.setScalar(1 + 0.2 * S(t * 3) + 1.2 * charge); R.ring(J.drumEchoes, charge * (1 - h.rec));
    J.armA.rotation.z = -0.06; J.armB.rotation.z = 0.06;
  });
}

// ------------------------------------------------------------------------------------------------------------------ CANTOR (CHOIR-MASTER, boss)
export function cantor(tex) {
  return makeCreature(tex, (R) => {
    R.joint('hips', null, [0, 1.0, 0]);
    legs(R, 'hips', 0.14, { a: 0.5, b: 0.5, r0: 0.13, r1: 0.1, r2: 0.08, cellA: C.oil, cellB: C.oil, seg: 6 });
    R.lathe('hips', bellProfile(3.4, 0.2, 0.84, 1.9), 16, C.oil, { pos: [0, -1.0, 0], name: 'robe' });                      // the body IS a bell
    R.tor('hips', 0.84, 0.05, 4, 20, C.oilY, { pos: [0, -0.98, 0], rot: [PI / 2, 0, 0] });
    for (const [y, r] of [[0.5, 0.69], [1.4, 0.45], [2.3, 0.295]]) R.tor('hips', r, 0.055, 4, 20, C.bone, { pos: [0, y - 1.0, 0], rot: [PI / 2, 0, 0] });       // ivory bands: the engraved rings of a great bell
    R.joint('spine', 'hips', [0, 2.45, 0]);
    R.cyl('spine', 0.26, 0.34, 0.62, 8, C.oil, { pos: [0, 0.22, 0], scale: [1, 1, 0.8] });
    R.cone('spine', 0.5, 0.2, 10, C.bone, { pos: [0, 0.58, 0], rot: [PI, 0, 0] });                                        // a bone ruff at the shoulders
    for (const [n, s] of [['armA', -1], ['armB', 1]]) {                                                                   // the arms end in tuning forks
      R.limb('spine', n, [s * 0.36, 0.5, 0], { a: 0.7, b: 0.7, r0: 0.12, r1: 0.1, r2: 0.08, cellA: C.oil, cellB: C.skin, seg: 7 });
      R.cyl(n + 'M', 0.08, 0.08, 0.14, 6, C.bronzeDk, { pos: [0, -0.77, 0] });
      for (const d of [-1, 1]) R.box(n + 'M', 0.1, 0.7, 0.1, C.bone, { pos: [d * 0.15, -1.13, 0] }); R.box(n + 'M', 0.4, 0.1, 0.1, C.bone, { pos: [0, -0.81, 0] });
    }
    R.joint('neck', 'spine', [0, 0.62, 0.03]); R.cyl('neck', 0.08, 0.1, 0.24, 6, C.skin, { pos: [0, 0.08, 0] });
    R.joint('head', 'neck', [0, 0.22, 0]); R.ico('head', 0.22, 1, C.skin, { pos: [0, 0.14, 0], scale: [0.85, 1.28, 1] });
    R.joint('jaw', 'head', [0, -0.02, 0.06]); R.box('jaw', 0.14, 0.16, 0.13, C.skin, { pos: [0, -0.1, 0.07] }); R.box('jaw', 0.1, 0.07, 0.02, C.ox, { pos: [0, 0.02, 0.14] });
    R.sph('head', 0.04, 6, 4, 'glow', { pos: [-0.08, 0.2, 0.18] }); R.sph('head', 0.04, 6, 4, 'glow', { pos: [0.08, 0.2, 0.18] });
    // the choir: six bronze bells orbit the head (a ring that turns); the Cantor sings through them
    R.joint('halo', 'head', [0, 0.15, 0]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; R.joint('hb' + i, 'halo', [K(a) * 0.66, 0, S(a) * 0.66]); R.lathe('hb' + i, bellProfile(0.34, 0.035, 0.17, 2, 5), 7, C.bronze, { pos: [0, -0.22, 0], name: 'bellm' + i }); R.sph('hb' + i, 0.035, 5, 4, 'glow', { pos: [0, -0.2, 0] }); }
    R.tor('halo', 0.66, 0.025, 4, 24, 'glow', { rot: [PI / 2, 0, 0], name: 'haloRing' });
  }, (p, J, R) => {
    const t = p.t, h = humanoidPose(p, J, { stoop: 0.05, headX: 0.12, hipY: 1.0, stride: 0.35, jawOpen: 0.2 });
    const open = p.attack > 0 ? h.raise : 0;
    J.armA.rotation.z = -0.3 - 0.6 * open; J.armB.rotation.z = 0.3 + 0.6 * open; J.armA.rotation.x = -0.1 - 0.5 * open; J.armB.rotation.x = -0.1 - 0.5 * open; J.armAM.rotation.x = J.armBM.rotation.x = -0.35;
    J.halo.rotation.y = t * 0.7 + open * 2; J.halo.scale.setScalar(1 + 0.6 * open); J.haloRing.scale.setScalar(1 + 0.05 * S(t * 4));
    for (let i = 0; i < 6; i++) J['hb' + i].rotation.z = S(t * 2.1 + i) * 0.12;
  }, { maxLift: 5 });
}

// ------------------------------------------------------------------------------------------------------------------ BELL NODE (RESONATOR)
export function bellnode(tex) {
  return makeCreature(tex, (R) => {
    R.cyl(null, 0.62, 0.7, 0.26, 10, C.iron, { pos: [0, 0.13, 0] });
    for (const s of [-1, 1]) R.cyl(null, 0.11, 0.18, 2.2, 7, C.bone, { pos: [s * 0.5, 1.35, 0], rot: [0, 0, -s * 0.24] });          // two tines of a fork struck into the ground
    R.joint('bell', null, [0, 1.0, 0]);
    const b = R.lathe('bell', bellProfile(0.9, 0.06, 0.32, 2), 10, C.bronze, { pos: [0, 0, 0] }); R.cyl('bell', 0.29, 0.29, 0.02, 10, C.bronzeDk, { pos: [0, 0.04, 0] });
    R.tor('bell', 0.32, 0.03, 4, 12, C.bronzeDk, { pos: [0, 0.01, 0], rot: [PI / 2, 0, 0] }); R.sph('bell', 0.05, 6, 4, 'glow', { pos: [0, 0.0, 0], name: 'clapper' });
    R.J.bellEchoes = R.echo(b, 1, 0.14);
    R.tor('bell', 0.62, 0.03, 6, 26, 'glow', { pos: [0, 0.55, 0], rot: [PI / 2, 0, 0], name: 'ring' });
  }, (p, J, R) => {
    const t = p.t, d = ease(clamp01(p.dead));
    J.bell.position.y = 1.0 + 0.04 * S(t * 2.2) - 0.55 * d; J.bell.rotation.z = S(t * 1.4) * 0.03 * (1 - d); J.clapper.scale.setScalar(d > 0 ? 0.001 : 1 + 0.3 * S(t * 4) + 0.8 * (p.flash || 0));
    J.ring.scale.setScalar(d > 0.1 ? 0.001 : 1 + 0.12 * S(t * 3)); R.ring(J.bellEchoes, d > 0 ? 0 : 0.5 + 0.5 * S(t * 2));
    J.rig.rotation.z = d * 0.1;
  });
}

// ------------------------------------------------------------------------------------------------------------------ DRONE-GILL (GLASS-BELL)
export function gill(tex) {
  const HOVER = 1.2;
  return makeCreature(tex, (R) => {
    R.joint('body', null, [0, 0, 0]);
    const dome = R.prim('body', new THREE.SphereGeometry(0.62, 14, 8, 0, PI * 2, 0, PI / 2), C.glass, { pos: [0, 0.6, 0], scale: [1, 0.86, 1] });     // the pale engraved mantle: a bell by shape and by logic
    R.cyl('body', 0.62, 0.62, 0.05, 14, C.glass, { pos: [0, 0.6, 0] }); R.cyl('body', 0.5, 0.5, 0.03, 12, C.membDk, { pos: [0, 0.58, 0] });          // the dark underside
    R.tor('body', 0.62, 0.035, 4, 16, C.bone, { pos: [0, 0.6, 0], rot: [PI / 2, 0, 0] });
    R.J.domeEchoes = R.echo(dome, 2, 0.1);
    for (let i = 0; i < 7; i++) { const a = -PI / 2 + (i - 3) * 0.55, len = 0.42 + 0.14 * ((i * 3) % 3); R.joint('fr' + i, 'body', [K(a) * 0.6, 0.6, S(a) * 0.6], [0, -a + PI / 2, 0]); R.box('fr' + i, 0.14, len, 0.035, i % 2 ? C.bone : C.memb, { pos: [0, -len / 2, 0.02] }); }   // a fringe of chunky ribbon tines
    R.lathe('body', bellProfile(0.5, 0.02, 0.1, 1.5), 6, C.membDk, { pos: [0, 0.14, 0.02], name: 'heart' });                   // the clapper: a hanging heart
    R.sph('body', 0.14, 8, 6, C.lamp, { pos: [0, 0.14, 0.0], name: 'sac' });                                                    // the note-bubble spore sac
    for (let i = 0; i < 5; i++) R.sph('body', 0.035, 5, 4, 'glow', { pos: [(i - 2) * 0.2, 0.74 - Math.abs(i - 2) * 0.05, 0.57 - Math.abs(i - 2) * 0.05] });      // photophores along the front rim
    for (let i = 0; i < 3; i++) { R.joint('td' + i, 'body', [(i - 1) * 0.16, 0.5, 0.05 - (i % 2) * 0.12]); R.cyl('td' + i, 0.035, 0.015, 0.55, 5, C.membDk, { pos: [0, -0.275, 0] }); }
  }, (p, J, R) => {
    const t = p.t, d = ease(clamp01(p.dead)), w = p.walk, flap = S(t * 16 + p.phase * 0.5) * (0.35 + 0.5 * w) * (1 - d);
    for (let i = 0; i < 7; i++) J['fr' + i].rotation.x = flap * 0.35 * (1 + (i % 3) * 0.3) + d * 0.6;
    for (let i = 0; i < 3; i++) J['td' + i].rotation.set(S(t * 3 + i * 1.7) * 0.25 * (1 - d) - w * 0.35, 0, K(t * 2.3 + i) * 0.2 * (1 - d));
    const a = p.attack, swell = a > 0 ? (a < 0.5 ? ease(a / 0.5) : 1 - ease(clamp01((a - 0.5) / 0.4)) * 0.8) : 0;
    J.sac.scale.setScalar(1 + swell * 1.5); J.body.scale.set(1, 1 + 0.04 * S(t * 5) - 0.1 * swell, 1); R.ring(J.domeEchoes, swell);
    J.rig.rotation.x = -0.25 * w + (a > 0 ? -0.35 * swell : 0) + d * 0.9; J.rig.rotation.z = d * 1.3 + S(t * 1.9) * 0.05 * (1 - d);
  }, { afterGround: (p, J) => { const d = ease(clamp01(p.dead)); J.rig.position.y += (HOVER + (0.5 + 0.5 * S(p.t * 2.2)) * 0.05) * (1 - d); } });
}

// ------------------------------------------------------------------------------------------------------------------ CRADLE FEEDER (SAC)
export function feeder(tex) {
  return makeCreature(tex, (R) => {
    R.box(null, 1.95, 0.18, 1.1, C.iron, { pos: [0, 0.09, 0] });
    for (const s of [-1, 1]) { R.cyl(null, 0.08, 0.1, 1.66, 6, C.iron, { pos: [s * 0.76, 0.93, 0], rot: [0, 0, -s * 0.03] }); R.cyl(null, 0.045, 0.055, 0.95, 5, C.bronze, { pos: [s * 0.86, 0.62, 0.0], rot: [0, 0, s * 0.62] }); }     // posts, and a brace to the base each side
    R.prim(null, new THREE.TorusGeometry(0.76, 0.055, 6, 24, PI), C.bronze, { pos: [0, 1.76, 0], scale: [1, 0.24, 1] });                                            // the harp's arch
    for (const [x, i] of [[-0.3, 0], [0, 1], [0.3, 0]]) { R.cyl(null, 0.08, 0.1, 0.2, 6, i ? C.bone : C.bronze, { pos: [x, 1.9, 0] }); R.sph(null, 0.05, 5, 4, 'glow', { pos: [x, 2.0, 0] }); }
    R.joint('sac', null, [0, 0, 0]);
    // the shroud: a wrapped person hanging in the rack (head, shoulders, a body that tapers to bound feet): NOT an egg
    const prof = [[0.001, 0.36], [0.1, 0.38], [0.13, 0.5], [0.15, 0.72], [0.2, 0.9], [0.23, 1.0], [0.34, 1.15], [0.39, 1.26], [0.36, 1.36], [0.2, 1.42], [0.09, 1.46], [0.08, 1.52], [0.15, 1.58], [0.17, 1.68], [0.14, 1.76], [0.001, 1.8]].map(([x, y]) => new THREE.Vector2(x, y));     // legs together, waist, SHOULDERS, a neck, a head
    const shroud = R.lathe('sac', prof, 12, C.memb, { name: 'shroud' }); R.J.sacEchoes = R.echo(shroud, 1, 0.08);
    for (const [y, r] of [[0.55, 0.15], [0.85, 0.2], [1.15, 0.34]]) R.tor('sac', r, 0.025, 4, 14, C.bronze, { pos: [0, y, 0], rot: [PI / 2, 0, 0] });      // straps
    for (const s of [-1, 1]) { R.cyl('sac', 0.075, 0.06, 0.62, 6, C.memb, { pos: [s * 0.37, 1.0, 0.02], rot: [0, 0, s * 0.06] }); R.ico('sac', 0.07, 0, C.memb, { pos: [s * 0.38, 0.66, 0.04], scale: [1, 1.3, 1] }); }       // the arms, bound to the sides
    R.ico('sac', 0.045, 0, C.membDk, { pos: [0, 1.6, 0.15], scale: [1.4, 0.7, 0.5] });                                                                       // a mouth pressed against the skin
    for (const s of [-1, 1]) R.cyl(null, 0.02, 0.02, 0.65, 4, C.bronze, { pos: [s * 0.2, 1.74, 0], rot: [0, 0, s * 0.35] });                                                      // cables up to the top bar: strung like a harp
  }, (p, J, R) => {
    const t = p.t, d = ease(clamp01(p.dead));
    J.sac.scale.set(1 + 0.03 * S(t * 3) * (1 - d), (1 - 0.5 * d) * (1 + 0.025 * S(t * 3 + 1)), 1 + 0.03 * S(t * 3) * (1 - d)); J.sac.position.y = -0.02 - 0.3 * d; R.ring(J.sacEchoes, d > 0 ? 0 : Math.max(0, S(t * 2.2) - 0.7) * 3 + (p.flash || 0));
    J.rig.rotation.z = d * 0.1;
  });
}

// ------------------------------------------------------------------------------------------------------------------ GRAFT-MOTHER (PIPE-ORGAN BODY, boss)
export function graftmother(tex) {
  return makeCreature(tex, (R) => {
    for (const [x, z] of [[-1.0, -0.6], [1.0, -0.6], [-1.0, 0.7], [1.0, 0.7]]) R.cyl(null, 0.2, 0.32, 1.5, 6, C.iron, { pos: [x * 1.18, 0.75, z], rot: [0, 0, -x * 0.25] });
    R.joint('body', null, [0, 2.1, 0]);
    R.sph('body', 1.1, 14, 9, C.bone, { pos: [0, 0, 0], scale: [1.32, 0.98, 0.95] });                                         // the organ case: ivory, engraved
    R.cyl('body', 1.0, 1.1, 0.14, 16, C.bronze, { pos: [0, 0.85, 0], scale: [1, 1, 0.85] });
    const N = 9, tops = [3.55, 3.7, 3.9, 4.05, 4.1, 4.05, 3.9, 3.7, 3.55];                                                     // nine ranks of pipes in a fan above the case
    for (let i = 0; i < N; i++) {
      const x = (i - 4) * 0.27, h = tops[i] - 2.95;
      R.joint('p' + i, 'body', [x, 0.85, -0.05], [0, 0, -(i - 4) * 0.05]); R.cyl('p' + i, 0.11, 0.14, h, 7, i % 2 ? C.bone : C.bronze, { pos: [0, h / 2, 0] }); R.tor('p' + i, 0.12, 0.03, 4, 8, C.bronzeDk, { pos: [0, h, 0], rot: [PI / 2, 0, 0] });
      R.sph('p' + i, 0.07, 5, 4, 'glow', { pos: [0, h + 0.03, 0], name: 'pm' + i });
    }
    // the throat: a great bronze horn forward from the case, dark inside (it spits the spores)
    R.joint('hornJ', 'body', [-0.55, 0.0, 0.85], [-0.3, 0.25, 0]);
    const horn = R.lathe('hornJ', bellProfile(0.95, 0.16, 0.52, 1.7), 14, C.bronze, { pos: [0, 0, 0.0], rot: [PI / 2, 0, 0], name: 'horn' });
    R.cyl('hornJ', 0.45, 0.45, 0.02, 14, C.ox, { pos: [0, 0, 0.0], rot: [PI / 2, 0, 0] }); R.tor('hornJ', 0.52, 0.055, 5, 20, C.bronzeDk, { pos: [0, 0, 0.0] });
    R.J.hornEchoes = R.echo(horn, 1, 0.12);
    // the cradle sacs hang under the case between her legs (a cluster of shrouds, not a face)
    for (let i = 0; i < 6; i++) { const x = 0.15 + i * 0.16; R.joint('sc' + i, 'body', [x, -0.85, 0.1 + ((i % 2) - 0.5) * 0.5]); R.cyl('sc' + i, 0.02, 0.02, 0.5, 4, C.bronze, { pos: [0, -0.1, 0] }); R.ico('sc' + i, 0.2, 0, C.memb, { pos: [0, -0.5 - (i % 3) * 0.1, 0], scale: [0.8, 1.7, 0.8] }); }
    for (const [n, s] of [['armA', -1], ['armB', 1]]) {                                                                         // the grafting arms: pipes with needles
      R.limb('body', n, [s * 1.2, 0.45, 0.3], { a: 1.1, b: 1.1, r0: 0.17, r1: 0.14, r2: 0.1, cellA: C.bone, cellB: C.bronze, seg: 6 });
      for (let i = -1; i <= 1; i++) R.cone(n + 'M', 0.06, 0.45, 4, 'glow', { pos: [i * 0.11, -1.35, 0.05], rot: [PI, 0, 0] });
    }
  }, (p, J, R) => {
    const t = p.t, d = ease(clamp01(p.dead)), a = p.attack, br = S(t * 1.4);
    J.body.scale.set(1 + 0.02 * br * (1 - d), (1 - 0.5 * d) * (1 + 0.02 * S(t * 1.4 + 1)), 1 + 0.02 * br * (1 - d)); J.body.position.y = 2.1 * (1 - 0.3 * d);
    const up = a > 0 ? (a < 0.4 ? ease(a / 0.4) : 1) : 0, sl = a > 0.4 ? ease(clamp01((a - 0.4) / 0.2)) : 0;
    J.armA.rotation.x = -2.2 * up + 2.4 * sl + S(t * 0.9) * 0.05; J.armB.rotation.x = -2.2 * up + 2.4 * sl - S(t * 0.9) * 0.05; J.armA.rotation.z = -0.12 - d * 0.4; J.armB.rotation.z = 0.12 + d * 0.4; J.armAM.rotation.x = J.armBM.rotation.x = -0.4 + d * 0.8;
    for (let i = 0; i < 9; i++) J['pm' + i].scale.setScalar(d > 0.1 ? 0.001 : 0.5 + (a > 0 ? 1.2 * (0.5 + 0.5 * S(t * 6 - i * 0.8)) : 0.3 * (0.5 + 0.5 * S(t * 2 + i))));
    for (let i = 0; i < 6; i++) J['sc' + i].rotation.z = S(t * 1.1 + i * 1.7) * 0.05; R.ring(J.hornEchoes, d > 0 ? 0 : a > 0 ? up : 0);
    J.rig.rotation.x = d * 0.25;
  }, { maxLift: 5 });
}

export const FACTORIES = { tollbearer, gaunt, bellhand, sexton, wardengraft, cantor, bellnode, gill, feeder, graftmother };
