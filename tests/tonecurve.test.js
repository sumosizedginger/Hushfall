// PT-061 (V4): the tone shoulder's node twin (src/render/tonecurve.js) is monotonic, pins 0 and the white point, keeps the midtones where they were, and covers little of the input range with its top step; and the GLSL in post.js carries the SAME constants and the same formula (read back out of the shader source, so one cannot change without the other).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SHOULDER, shoulder, unshoulder } from '../src/render/tonecurve.js';
import { ROOT } from './helpers.js';

test('the curve: f(0) = 0, monotonic, an inverse that round-trips, the white point is out of reach of the old clamp (it clips at 1 / pre, not at 1), and the top 5% of the output is a small slice of the input range', () => {
  assert.equal(shoulder(0), 0); let prev = -1; for (let x = 0; x <= 4; x += 0.01) { const y = shoulder(x); assert.ok(y > prev - 1e-12, 'monotonic at ' + x); prev = y; }
  for (const v of [0.1, 0.5, 0.9, 0.99]) assert.ok(Math.abs(shoulder(unshoulder(v)) - v) < 1e-9, 'round trip ' + v);
  assert.ok(Math.abs(shoulder(1 / SHOULDER.pre) - 1) < 1e-9, 'f reaches 1 at 1 / pre'); assert.ok(shoulder(1) < 0.9, 'the old clip point is no longer white');
  const lo = unshoulder(0.95), hi = 1 / SHOULDER.pre; assert.ok((hi - lo) / hi <= 0.12, `the top step covers ${(100 * (hi - lo) / hi).toFixed(1)}% of the input range`);
});
test('the midtones stay put: the output of the sRGB-encoded curve at linear 0.18 and 0.4 is within 6% of the old straight encode (a different mean luma would be a different picture)', () => {
  const enc = (x) => Math.pow(Math.min(1, Math.max(0, x)), 1 / 2.2);
  for (const x of [0.12, 0.18, 0.25, 0.4]) { const old = enc(x), now = enc(shoulder(x)); assert.ok(Math.abs(now - old) / old < 0.06, `${x}: ${old.toFixed(3)} -> ${now.toFixed(3)}`); }
});
test('the shader and the twin agree: post.js declares the shoulder, applies it before the sRGB encode, and its default uniforms are SHOULDER.k and SHOULDER.pre', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/render/post.js'), 'utf8');
  assert.match(src, /vec3 shoulder\(vec3 x\) \{ vec3 y = max\(x, vec3\(0\.0\)\) \* uShoulderPre; return y \* \(1\.0 \+ uShoulder\) \/ \(1\.0 \+ uShoulder \* y\); \}/); assert.match(src, /toSRGB\(shoulder\(texture2D\(tColor, vUv\)\.rgb \* uExposure\)\)/);
  assert.match(src, new RegExp(`uShoulder: \{ value: ${String(SHOULDER.k).replace('.', '\.')} \}, uShoulderPre: \{ value: ${String(SHOULDER.pre).replace('.', '\.')} \}`));
});
