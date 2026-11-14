// design/VISUAL_AWE_PLAN.md, sessions A4 and A5: haze by distance and glow, in the final pass. No node test can COMPILE a shader, so this holds
// what it can: the numbers, the shader text built from them, that every name the shader uses is declared, and that its brackets close.
import test from 'node:test';
import assert from 'node:assert/strict';
import { HAZE, GLOW, hazeAt, hazeFor, glowFor, easeHaze, HAZE_GLSL, GLOW_GLSL, HAZE_UNIFORMS } from '../src/render/haze.js';
import { POST_FRAG, PostPass } from '../src/render/post.js';
import { LOOKS } from '../src/engine/defs.js';
import { stubRenderer } from './stubs.js';

test('haze: none up close, the most at the far distance, and it never passes the place`s maximum', () => {
  const h = hazeFor(LOOKS.harbour, { fog: '#2a2244' }, false);
  assert.equal(hazeAt(2, 1, h), 0);
  assert.equal(hazeAt(h.near, 1, h), 0);
  assert.ok(Math.abs(hazeAt(h.far, 1, h) - h.max) < 1e-9);
  assert.ok(Math.abs(hazeAt(500, 1, h) - h.max) < 1e-9);
  let prev = 0;
  for (let d = 0; d <= 100; d += 2) {
    const a = hazeAt(d, 1, h);
    assert.ok(a >= prev - 1e-12 && a <= h.max + 1e-12);
    prev = a;
  }
});

test('haze: thinner and nearer under a roof than under the sky; the far colour is the map`s fog colour unless the look names one', () => {
  const out = hazeFor(LOOKS.harbour, { fog: '#804020' }, false),
    inn = hazeFor(LOOKS.harbour, { fog: '#804020' }, true);
  assert.ok(inn.max < out.max && inn.far < out.far);
  assert.deepEqual(
    out.color.map((c) => Math.round(c * 255)),
    [128, 64, 32],
  );
  assert.deepEqual(
    hazeFor({ haze: { color: 0x102030, out: { max: 0.2 } } }, { fog: '#ffffff' }, false).color.map((c) => Math.round(c * 255)),
    [16, 32, 48],
  );
  assert.equal(hazeFor({ haze: { out: { max: 0.2 } } }, {}, false).max, 0.2);
});

test('haze: over open sky, what lies under the deck fades; a map with no open sky below has none of that', () => {
  const v = hazeFor(LOOKS.harbour, {}, false, true),
    n = hazeFor(LOOKS.harbour, {}, false, false);
  assert.equal(n.belowMax, 0);
  assert.ok(v.belowMax > 0);
  assert.ok(hazeAt(12, -8, v) > hazeAt(12, 2, v), 'a ledge 8 m down is hazier than the deck at the same distance');
  assert.equal(hazeAt(2, -8, v), 0, 'never right under your feet');
});

test('the haze eases toward what is wanted and gets there', () => {
  const want = hazeFor(LOOKS.harbour, { fog: '#804020' }, true),
    cur = { ...hazeFor(LOOKS.harbour, { fog: '#102030' }, false) };
  cur.color = [...cur.color];
  const start = cur.max;
  easeHaze(cur, want, 0.05);
  assert.ok(cur.max < start && cur.max > want.max, 'one frame moves it part of the way');
  for (let i = 0; i < 200; i++) easeHaze(cur, want, 0.05);
  assert.ok(Math.abs(cur.max - want.max) < 1e-6 && Math.abs(cur.color[0] - want.color[0]) < 1e-6);
});

test('glow: a look may name its own, and the effects rung turns it off', () => {
  assert.deepEqual(glowFor(LOOKS.harbour), { threshold: GLOW.threshold, strength: GLOW.strength });
  assert.equal(glowFor(LOOKS.harbour, false).strength, 0);
  assert.deepEqual(glowFor({ glow: { threshold: 2, strength: 0.1 } }), { threshold: 2, strength: 0.1 });
});

test('the shader carries the haze and the glow built from these numbers, and the level`s ink fades with the haze while a creature`s does not', () => {
  assert.ok(POST_FRAG.includes(HAZE_GLSL) && POST_FRAG.includes(GLOW_GLSL) && POST_FRAG.includes(HAZE_UNIFORMS));
  assert.ok(POST_FRAG.includes(`(1.0 - haze * ${HAZE.ink} * (1.0 - ent))`));
  assert.ok(POST_FRAG.indexOf(HAZE_GLSL) < POST_FRAG.indexOf('if (uOutline > 0.5)'), 'the haze is laid before the ink is drawn');
  assert.ok(HAZE_GLSL.includes(`mix(${HAZE.entity}, 1.0, step(0.5, texture2D(tColor, vUv).a))`), 'a creature (alpha under 0.5) takes less haze');
  assert.ok(HAZE_GLSL.includes('dRaw < 0.99999'), 'the sky is never hazed');
});

test('the shader text is sound as far as text can tell: brackets close, and every uniform and sampler it names is declared and given a value', () => {
  const code = POST_FRAG.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [a, b] of ['()', '{}', '[]']) assert.equal(code.split(a).length, code.split(b).length, `${a}${b} balance`);
  const declared = new Set();
  for (const m of code.matchAll(/uniform\s+\w+\s+([^;]+);/g)) for (const n of m[1].split(',')) declared.add(n.trim().replace(/\[.*$/, ''));
  const used = new Set([...code.matchAll(/\b(u[A-Z]\w*|t[A-Z]\w*)\b/g)].map((m) => m[1]));
  assert.deepEqual(
    [...used].filter((n) => !declared.has(n)),
    [],
    'used but never declared',
  );
  const post = new PostPass(stubRenderer(), null, 0.1, 400);
  assert.deepEqual(
    [...declared].filter((n) => !(n in post.uniforms)),
    [],
    'declared but the pass gives it no value',
  );
  assert.ok(!/\bgl\b/.test(code) && !/smoothstep\(([^,]+),\s*\1\s*,/.test(code));
  post.setHaze(hazeFor(LOOKS.harbour, {}, false, true), glowFor(LOOKS.harbour));
  assert.equal(post.uniforms.uHaze.value.z, HAZE.out.max);
  assert.equal(post.uniforms.uGlow.value, GLOW.strength);
});
