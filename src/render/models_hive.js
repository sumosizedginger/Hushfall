// The creatures of Acts C and D (PT-043, the Preview): the RESONANT (a fused-human hulk with a ring of bells), the HIVE CANTOR (the conductor of the Hive: throat-pale, hovering, a crest of nerves, ten fingers that trail the choir's threads), the ROOT BELL'S
// CLAPPER (bronze wrapped in black root, a split with a heart behind it) and the ROOT ANCHOR (a root that clenches a pillar and holds the chain). Same contract as models_choir.js: the view owns `root`, `pose(p)` writes only the rig, the lowest vertex
// is lifted onto the contact plane by the grounder, a FLYER adds its hover after grounding, each wears its OWN baked atlas (`choir_<kind>`, cells by name in choir_cells.js).
// Front is +z. Pose inputs beyond the shipped ones: `beat` (0..1, the Hive light), `lift` (metres a hung body is above its floor), `tiltX` / `tiltZ` (a pendulum's lean in the rig's own axes), `last` (the Last Note), `charge` (the tell of a charge).
import * as THREE from 'three';
import { makeCreature, ease, clamp01 } from './choir_kit.js';
import { cellsOf } from './choir_cells.js';

const S = Math.sin, K = Math.cos, PI = Math.PI, V2 = (pts) => pts.map(([r, y]) => new THREE.Vector2(r, y));
const UP = new THREE.Vector3(0, 1, 0), TMP = new THREE.Vector3();

// ------------------------------------------------------------------------------------------------------------------ RESONANT
/** Three Tollbearers fused at the hip into one body: a wide low barrel bound in rust-brown hide, three torsos on it with a head at a different height each, four long arms, and a ring of eight small bells welded round the waist: the ring is what rings (the teal shell round it flares on the beat). 2.0 m tall, 2 m wide. */
export function resonant(tex) {
  const C = cellsOf('resonant');
  return makeCreature(tex, (R) => {
    R.joint('hips', null, [0, 0.7, 0]);
    for (const [n, x] of [['legA', -0.45], ['legB', 0.45]]) { R.limb('hips', n, [x, 0, 0], { a: 0.36, b: 0.34, r0: 0.17, r1: 0.14, r2: 0.11, cellA: C.skinDk, cellB: C.skinDk }); R.box(n + 'M', 0.26, 0.1, 0.4, C.skinDk, { pos: [0, -0.34, 0.08] }); }
    // the fused hip: three flared coats overlapping into one tent of hide, ragged at the hem; the legs are under it and a ring of bells hangs round the waist
    R.joint('spine', 'hips', [0, 0.56, 0]);
    for (const [n, x, h, lean] of [['L', -0.8, 0.7, 0.2], ['M', 0, 0.9, 0], ['R', 0.8, 0.6, -0.2]]) {
      R.pleat('spine', V2([[0.13, h - 0.02], [0.24, h - 0.14], [0.3, 0.2], [0.28, -0.16], [0.26, -0.5]]), 10, 5, 0.1, n === 'M' ? C.wrap : C.wrapDk, { pos: [x, 0, 0], scale: [1, 1, 0.8] });
      R.joint('t' + n, 'spine', [x, 0, 0], [0, 0, lean]);
      R.joint('neck' + n, 't' + n, [0, h - 0.04, 0.03]); R.cyl('neck' + n, 0.07, 0.09, 0.14, 6, C.skin, { pos: [0, 0.05, 0] });
      R.joint('head' + n, 'neck' + n, [0, 0.1, 0]); R.lump('head' + n, 0.15, 1, 0.1, 5 + x * 3, C.skin, { pos: [0, 0.07, 0.01], scale: [0.85, 1.25, 1] });
      R.box('head' + n, 0.1, 0.06, 0.02, C.mouth, { pos: [0, -0.02, 0.12] }); R.sph('head' + n, 0.034, 5, 4, 'glow', { pos: [-0.05, 0.09, 0.115] }); R.sph('head' + n, 0.034, 5, 4, 'glow', { pos: [0.05, 0.09, 0.115] });
      R.lump('spine', 0.17, 0, 0.14, 3 + x * 5, C.skin, { pos: [x - 0.2, h - 0.12, 0], scale: [1.1, 0.8, 0.9] }); R.lump('spine', 0.17, 0, 0.14, 4 + x * 5, C.skin, { pos: [x + 0.2, h - 0.12, 0], scale: [1.1, 0.8, 0.9] });          // the shoulders
    }
    R.lump('hips', 0.5, 1, 0.08, 9, C.wrapDk, { pos: [0, 0.14, 0], scale: [2.0, 0.78, 1.0] });                                                                 // the fused hips: one block of hide under all three
    const ring = R.tor('hips', 0.5, 0.06, 5, 24, C.bronzeDk, { pos: [0, 0.3, 0], rot: [PI / 2, 0, 0], scale: [1.9, 0.9, 1] }); R.J.ringEchoes = R.echo(ring, 1, 0.1);
    R.joint('bells', 'hips', [0, 0.3, 0]);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2 + 0.3; R.lathe('bells', V2([[0.001, 0.3], [0.07, 0.28], [0.1, 0.16], [0.145, 0.0]]), 6, C.bronze, { pos: [S(a) * 0.95, -0.3, K(a) * 0.45] }); }          // six small bells welded round the waist
    for (const [n, a0] of [['hemA', 0.2], ['hemB', PI + 0.2]]) { R.joint(n, 'hips', [0, -0.14, 0]); for (let i = 0; i < 4; i++) { const a = a0 + (i - 1.5) * 0.5, len = 0.28 + 0.16 * ((i * 5) % 3) / 2; R.rag(n, 0.14, len, 0.05, 0.5, i % 2 ? C.wrap : C.wrapDk, { pos: [S(a) * 0.7, -len / 2, K(a) * 0.4], rot: [0, a, 0] }); } }          // the hem in strips
    for (const [n, x, y] of [['armA', -1.1, 0.34], ['armB', -0.5, 0.42], ['armC', 0.5, 0.42], ['armD', 1.1, 0.34]]) {
      R.limb('spine', n, [x, y, 0.02], { a: 0.34, b: 0.4, r0: 0.085, r1: 0.07, r2: 0.058, cellA: C.skin, cellB: C.skinDk });
      R.lump(n + 'M', 0.09, 0, 0.14, 7, C.flesh, { pos: [0, -0.46, 0], scale: [1, 1.3, 0.85] });
      for (const d of [-1, 0, 1]) R.cone(n + 'M', 0.02, 0.2, 4, C.bone, { pos: [d * 0.045, -0.64, 0.01], rot: [PI, 0, 0] });
    }
    R.cone('spine', 0.12, 0.4, 5, C.bone, { pos: [-0.9, -0.1, -0.05], rot: [0, 0, 1.25] }); R.cone('spine', 0.1, 0.34, 5, C.bone, { pos: [0.86, 0.0, -0.05], rot: [0, 0, -1.2] });          // spurs grown through the hide
  }, (p, J, R) => {
    const t = p.t, w = p.walk, ph = p.phase, beat = p.beat ?? 0, a = p.attack, d = ease(clamp01(p.dead)), sw = S(ph) * 0.5 * w;
    J.legA.rotation.x = sw; J.legB.rotation.x = -sw; J.legAM.rotation.x = 0.1 + Math.max(0, K(ph)) * 0.5 * w; J.legBM.rotation.x = 0.1 + Math.max(0, -K(ph)) * 0.5 * w;
    J.hips.position.y = 0.7 + Math.abs(S(ph)) * 0.035 * w - beat * 0.015; J.hips.rotation.z = S(ph) * 0.05 * w;
    J.spine.rotation.z = S(t * 0.8) * 0.03 + S(ph) * 0.04 * w; J.spine.rotation.x = 0.1 + 0.05 * w;
    J.headL.rotation.set(0.35 + S(t * 1.1) * 0.05, 0.25 * S(t * 0.7), 0.1); J.headM.rotation.set(0.3 + S(t * 0.9 + 1) * 0.05, -0.15 * S(t * 0.6), 0); J.headR.rotation.set(0.4 + S(t * 1.3 + 2) * 0.05, 0.2 * S(t * 0.8 + 1), -0.12);
    let raise = 0, slam = 0, rec = 0;
    if (a > 0) { raise = a < 0.55 ? ease(a / 0.55) : 1; slam = a < 0.55 ? 0 : ease(clamp01((a - 0.55) / 0.12)); rec = a < 0.7 ? 0 : ease(clamp01((a - 0.7) / 0.3)); }
    const hit = slam * (1 - rec);
    for (const [n, side, inner] of [['armA', -1, 0], ['armB', -1, 1], ['armC', 1, 1], ['armD', 1, 0]]) {
      J[n].rotation.x = -S(ph + side) * 0.4 * w + S(t * 1.1 + side) * 0.05 - (inner ? (2.45 * raise - 2.4 * hit) : 0.9 * raise); J[n].rotation.z = side * (0.1 + (inner ? 0.05 : 0.35) * raise); J[n + 'M'].rotation.x = -0.25 - 0.5 * raise * (1 - hit);
    }
    J.bells.rotation.z = S(t * 2.1) * 0.06 + beat * 0.08 * S(t * 11); J.bells.rotation.y = beat * 0.12;
    J.hemA.rotation.x = S(t * 1.6) * 0.12 + 0.3 * w * S(ph); J.hemB.rotation.x = S(t * 1.6 + 2) * 0.12 + 0.3 * w * S(ph + 2);
    J.hips.scale.set(1 + 0.025 * beat, 1, 1 + 0.025 * beat); R.ring(J.ringEchoes, p.awake === false ? 0 : beat);
    J.rig.rotation.x = -d * 1.5 + (p.dead > 0.85 ? S((p.dead - 0.85) * 40) * 0.02 : 0);                                          // it falls on its back, all three of it
  }, { maxLift: 5 });
}

// ------------------------------------------------------------------------------------------------------------------ HIVE CANTOR
const HC_HOVER = 1.1;
/** The conductor of the Hive: nothing like the Cantor's coat, the Grand Cantor's horn or the Sub-Cantor's bell robe. A long pale body with no legs, ending in a comet of nerve strands that hang to the floor; arms flung out in a cross, each hand with five long fingers whose tips are anchors for the choir's threads (the view draws them); a tall flayed head with
 *  three eyes in a column, an open vertical throat, and a crest of nerves that swells with the beat. 3.7 m from the end of its strands to the top of the crest, hovering 1.1 m above the podium. */
export function hivecantor(tex) {
  const C = cellsOf('hivecantor');
  return makeCreature(tex, (R) => {
    R.joint('body', null, [0, 0, 0]);
    R.joint('waist', 'body', [0, 1.4, 0]);
    // the comet of strands under the waist: lengths between 1.0 and 1.5 m, so the lowest tip is the foot of the figure
    for (let i = 0; i < 11; i++) { const a = (i / 11) * PI * 2 + 0.4, r = 0.13 + 0.05 * ((i * 5) % 3), L = 1.0 + 0.5 * ((i * 7) % 5) / 4; R.joint('st' + i, 'waist', [S(a) * r * 0.6, 0, K(a) * r * 0.6]); R.tube('st' + i, [[0, 0.02, 0], [S(a) * r * 0.5, -L * 0.35, K(a) * r * 0.5], [S(a) * r * 0.2, -L * 0.7, K(a) * r * 0.2], [0, -L, 0]], [0.04, 0.034, 0.024, 0.006], 5, i % 3 ? C.nerve : C.shroud); }
    // the body: a long thin column of pale skin, waist to throat, ribbed with nerves
    R.lathe('waist', V2([[0.08, -0.06], [0.2, 0.1], [0.26, 0.5], [0.32, 0.95], [0.4, 1.28], [0.38, 1.46], [0.2, 1.6], [0.11, 1.7]]), 16, C.skin, { scale: [1, 1, 0.8] });
    for (const s of [-1, 1]) R.tube('waist', [[s * 0.12, 1.66, 0.04], [s * 0.34, 1.52, 0.1], [s * 0.46, 1.34, 0.04]], [0.045, 0.05, 0.04], 5, C.bone);          // collar bones, not a collar
    for (let i = 0; i < 6; i++) { const a = (i / 6) * PI * 2; R.tube('waist', [[S(a) * 0.26, 0.2, K(a) * 0.2], [S(a) * 0.33, 0.7, K(a) * 0.26], [S(a) * 0.42, 1.2, K(a) * 0.3], [S(a) * 0.22, 1.56, K(a) * 0.16]], [0.035, 0.035, 0.035, 0.026], 4, C.nerve); }
    for (let i = 0; i < 7; i++) R.cone('waist', 0.04, 0.18 - i * 0.012, 4, C.bone, { pos: [0, 0.2 + i * 0.2, -0.28 - i * 0.004], rot: [-1.2, 0, 0] });                       // a ridge of vertebrae down the back
    R.joint('neck', 'waist', [0, 1.62, 0]); R.cyl('neck', 0.08, 0.1, 0.2, 6, C.skinDk, { pos: [0, 0.08, 0] });
    R.joint('head', 'neck', [0, 0.14, 0]); R.lump('head', 0.24, 1, 0.07, 41, C.skin, { pos: [0, 0.18, 0], scale: [0.66, 1.25, 0.82] });
    R.box('head', 0.085, 0.3, 0.03, C.mouth, { pos: [0, 0.1, 0.16] });                                                                                                   // the open throat: one vertical slit
    for (const y of [0.16, 0.28, 0.4]) R.sph('head', 0.032, 5, 4, 'glow', { pos: [0, y, 0.165 - (y - 0.16) * 0.1] });                                                 // three eyes in a column
    // PT-065 (V10, the climax creatures read as props: a pale cross "reads as a scarecrow"): the crest is a HALO. A ring of bone behind the head, twelve spokes of nerve from the skull to it and an amber bead on every spoke's end; the ring is the tell the eye finds at 30 m, and it swells with the beat.
    R.joint('crest', 'head', [0, 0.2, -0.16]);
    R.tor('crest', 0.46, 0.032, 5, 28, C.bone);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * PI * 2, c = i % 2 ? C.nerve : C.nerveDk; R.cone('crest', 0.026, 0.42, 4, c, { pos: [S(a) * 0.23, K(a) * 0.23, 0], rot: [0, 0, -a] }); R.sph('crest', 0.042, 5, 4, 'amber', { pos: [S(a) * 0.47, K(a) * 0.47, 0] }); }
    R.sph('crest', 0.06, 5, 4, 'amber', { pos: [0, 0, -0.04] });
    // the cross: two long thin arms, ten long fingers
    for (const [n, s] of [['armA', -1], ['armB', 1]]) {
      R.limb('waist', n, [s * 0.34, 1.3, 0], { a: 0.88, b: 0.88, r0: 0.1, r1: 0.075, r2: 0.06, cellA: C.skin, cellB: C.skinDk, seg: 4 });
      R.lump(n + 'M', 0.1, 0, 0.1, 9, C.skin, { pos: [0, -0.9, 0], scale: [0.9, 1.3, 0.7] });
      R.rag(n, 0.6, 1.62, 0.2, 0.18, C.nerveDk, { pos: [0, -0.12, 0.02] });                                                           // the sleeve of a coat hangs below the arm and falls to a point
      for (let f = 0; f < 5; f++) { const sp = (f - 2) * 0.06, L = 0.55 + 0.1 * (2 - Math.abs(f - 2)), end = [sp * 1.4, -0.94 - L, 0.07 * (f - 2) - 0.02]; R.tube(n + 'M', [[sp * 0.4, -0.94, 0], end], [0.024, 0.008], 3, C.bone); R.joint('tip' + (s < 0 ? 'A' : 'B') + f, n + 'M', end); }          // (the tips are joints, not meshes: the choir's threads are drawn from them by the view, and a mesh each would make the arms most of the vertices)
    }
  }, (p, J, R) => {
    const t = p.t, d = ease(clamp01(p.dead)), a = p.attack, beat = p.beat ?? 0, up = a > 0 ? (a < 0.55 ? ease(a / 0.55) : 1) : 0;
    J.body.position.y = S(t * 0.9) * 0.03 * (1 - d);
    for (let i = 0; i < 11; i++) J['st' + i].rotation.set(S(t * 1.3 + i * 1.7) * 0.1 + 0.05 * S(t * 4 + i), 0, K(t * 1.1 + i) * 0.1);
    const lift = 1.08 + 1.05 * up + 0.12 * S(t * 7) * up;                                                                                                                   // the cross rises to a V as it draws a ring and trembles
    J.armA.rotation.z = -lift - 0.04 * S(t * 1.2); J.armB.rotation.z = lift + 0.04 * S(t * 1.2 + 1);
    J.armA.rotation.x = 0.1 + 0.05 * S(t * 0.8); J.armB.rotation.x = 0.1 + 0.05 * S(t * 0.8 + 2); J.armAM.rotation.z = -0.06 - 0.12 * up; J.armBM.rotation.z = 0.06 + 0.12 * up;
    J.head.rotation.set(0.15 - 0.2 * up + S(t * 0.7) * 0.04, S(t * 0.4) * 0.15, S(t * 0.5) * 0.04); J.crest.scale.setScalar(1 + 0.18 * beat + 0.25 * up);
    J.waist.rotation.x = 0.05; J.rig.rotation.x = -d * 1.5;
  }, { maxLift: 5, afterGround: (p, J) => { const d = ease(clamp01(p.dead)); J.rig.position.y += (HC_HOVER + 0.02 * S(p.t * 1.7)) * (1 - d); } });
}

// ------------------------------------------------------------------------------------------------------------------ ROOT BELL (the clapper)
/** The Bell's heart: a great cage of bronze ribs and black root, 3.4 m through, round as a cannonball and open between the ribs, with the heart (a copper-white sphere) burning inside it, a flared collar at the top where the ribs meet and a chain of black links above. Nothing else in the game is a
 *  ball on a chain, or open between its ribs, so its outline is its own; the heart is the glow the Last Note opens (the cage spreads). 4.3 m with its chain stub. */
export function rootbell(tex) {
  const C = cellsOf('rootbell'), R0 = 1.7, CY = 1.85, BODY = 3.7;
  return makeCreature(tex, (R) => {
    R.joint('swing', null, [0, 2.15, 0]); R.joint('bell', 'swing', [0, -2.15, 0]);
    R.joint('cage', 'bell', [0, CY, 0]);
    const arc = (a, r, ph0 = -80, ph1 = 80, n = 10, twist = 0) => { const pts = []; for (let k = 0; k <= n; k++) { const ph = (ph0 + (ph1 - ph0) * k / n) * PI / 180, aa = a + twist * (k / n), rr = r * K(ph); pts.push([S(aa) * rr, S(ph) * r, K(aa) * rr]); } return pts; };
    for (let i = 0; i < 5; i++) { const a = (i / 5) * PI * 2 + 0.2; R.tube('cage', arc(a, R0), [0.07, 0.1, 0.13, 0.15, 0.15, 0.15, 0.15, 0.13, 0.1, 0.08, 0.06], 5, i % 2 ? C.bronze : C.bronzeDk); }          // five bronze meridians: the cage is open between them
    for (const ph of [-40, 40]) R.tor('cage', R0 * K(ph * PI / 180) + 0.02, 0.09, 4, 24, C.bronzeDk, { pos: [0, R0 * S(ph * PI / 180), 0], rot: [PI / 2, 0, 0] });                                                // two hoops
    for (let i = 0; i < 3; i++) R.tube('cage', arc((i / 3) * PI * 2 + 0.6, R0 + 0.16, -75, 75, 12, 1.9 + 0.5 * i), [0.03, 0.05, 0.07, 0.07, 0.07, 0.07, 0.07, 0.07, 0.07, 0.07, 0.06, 0.04, 0.02], 5, i % 2 ? C.root : C.rootDk);          // black root wound round the cage
    R.cone('cage', 0.7, 0.8, 12, C.bronzeDk, { pos: [0, R0 + 0.15, 0] }); R.sph('cage', 0.34, 8, 6, C.bronze, { pos: [0, -R0 - 0.05, 0] });                                                            // the flared collar where the ribs meet; a boss underneath
    R.joint('heart', 'cage', [0, 0, 0]); R.sph('heart', 0.8, 12, 9, 'amber', {});
    R.joint('chain', 'bell', [0, BODY - 0.1, 0]);
    for (let i = 0; i < 6; i++) R.tor('chain', 0.11, 0.032, 4, 10, C.chain, { pos: [0, 0.08 + i * 0.12, 0], rot: [i % 2 ? 0 : PI / 2, i % 2 ? PI / 2 : 0, 0], scale: [1, 1.35, 1] });
    R.cyl('chain', 0.14, 0.2, 0.08, 8, C.rootDk, { pos: [0, 0.02, 0] });
  }, (p, J, R) => {
    const t = p.t, w = p.walk, ph = p.phase, d = ease(clamp01(p.dead)), a = p.attack, last = p.last ?? 0, charge = a > 0 ? Math.min(1, a / 0.55) : 0;
    J.swing.rotation.z = S(ph) * 0.04 * w + S(t * 0.9) * 0.012; J.swing.rotation.x = 0.0 - 0.28 * charge + 0.03 * w * S(ph * 2);
    const open = ease(clamp01(last)) * (1 - d), glow = (0.6 + 0.4 * S(t * 3.1)) * (1 - d) * (0.7 + 0.9 * last + 0.7 * charge);
    J.heart.scale.setScalar(Math.max(0.001, glow * (0.8 + 0.35 * open))); J.cage.scale.set(1 + 0.16 * open, 1 + 0.04 * open, 1 + 0.16 * open); J.cage.rotation.y = t * 0.12 * (1 + 2 * open) * (1 - d);
    J.chain.rotation.z = S(t * 1.4) * 0.03;
  }, { maxLift: 6, afterGround: (p, J) => { J.rig.position.y += p.lift ?? 0; const tx = p.tiltX ?? 0, tz = p.tiltZ ?? 0; if (tx || tz) { TMP.set(-tx, Math.cos(Math.hypot(tx, tz)), -tz).normalize(); J.swing.quaternion.multiply(new THREE.Quaternion().setFromUnitVectors(UP, TMP)); } } });
}

// ------------------------------------------------------------------------------------------------------------------ ROOT ANCHOR
/** One of four roots that clench the top of a pillar and hold the Bell's chain: a bronze collar, four twisted roots that rise into a clasp, an amber bud, a cord that climbs out of sight. 3.4 m. When it is cut the roots slump and the bud goes dark. */
export function rootanchor(tex) {
  const C = cellsOf('rootanchor');
  return makeCreature(tex, (R) => {
    R.cyl(null, 0.9, 1.0, 0.4, 10, C.stone, { pos: [0, 0.2, 0] }); R.tor(null, 0.88, 0.08, 5, 18, C.bronze, { pos: [0, 0.42, 0], rot: [PI / 2, 0, 0] });
    R.joint('roots', null, [0, 0.4, 0]);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * PI * 2 + 0.4, tw = 0.9 + 0.2 * (i % 2); R.tube('roots', [0, 0.25, 0.55, 0.95, 1.4, 1.9, 2.4].map((y, k) => { const r = 0.12 + 0.85 * Math.pow(Math.abs(k - 3) / 3, 1.3); return [S(a + k * tw * 0.35) * r, y, K(a + k * tw * 0.35) * r]; }), [0.17, 0.15, 0.13, 0.11, 0.09, 0.075, 0.06], 6, i % 2 ? C.root : C.rootDk); }
    R.tor('roots', 0.6, 0.08, 5, 16, C.bronzeDk, { pos: [0, 2.3, 0], rot: [PI / 2, 0, 0] });
    R.joint('bud', 'roots', [0, 2.55, 0]); R.sph('bud', 0.3, 8, 6, 'amber', {}); R.cone('bud', 0.1, 0.34, 6, C.bone, { pos: [0, 0.3, 0] });
    R.tube('roots', [[0, 2.7, 0], [0.04, 3.0, 0.02], [0, 3.3, 0]], [0.04, 0.034, 0.02], 5, C.rootDk);
    R.tube('roots', [[0.3, 0.4, 0.2], [0.8, 0.55, 0.4], [1.1, 0.5, 0.7]], [0.1, 0.07, 0.03], 5, C.root);            // a root crawling off over the stone
  }, (p, J, R) => {
    const t = p.t, d = ease(clamp01(p.dead)), f = p.flash || 0;
    J.roots.scale.set(1 + 0.04 * f, Math.max(0.35, 1 - 0.55 * d), 1 + 0.04 * f); J.roots.rotation.z = S(t * 1.2) * 0.02 * (1 - d) + d * 0.2; J.bud.scale.setScalar(d > 0.1 ? 0.001 : 1 + 0.15 * S(t * 3) + 0.4 * f);
  });
}
