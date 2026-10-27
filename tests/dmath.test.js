// PT-076: src/engine/dmath.js gives the same bits on every engine (only IEEE double arithmetic), and those bits are Node's own (so the gates every map passed in the Node sim are what the browser now plays).
// Found when the real-game check disagreed with the Node sim on eight maps: headless Chrome 154's Math.sin, cos and atan2 differ from Node's in the last bit for about one argument in twenty.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as D from '../src/engine/dmath.js';
import { ROOT } from './helpers.js';

test('dmath: sin, cos, atan2, acos and exp are bit for bit Node\'s own Math over the ranges the simulation uses, and at the edges', () => {
  let s = 2463534242; const r = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  const bad = [];
  for (const span of [1e-9, 1, 3.2, 7, 40, 700, 5000, 80000, 800000]) for (let i = 0; i < 6000; i++) {
    const x = (r() * 2 - 1) * span, y = (r() * 2 - 1) * span;
    if (!Object.is(D.sin(x), Math.sin(x))) bad.push(['sin', x]); if (!Object.is(D.cos(x), Math.cos(x))) bad.push(['cos', x]); if (!Object.is(D.atan2(y, x), Math.atan2(y, x))) bad.push(['atan2', y, x]);
  }
  for (let i = 0; i < 20000; i++) { const a = r() * 2 - 1, e = (r() * 2 - 1) * 60; if (!Object.is(D.acos(a), Math.acos(a))) bad.push(['acos', a]); if (!Object.is(D.exp(e), Math.exp(e))) bad.push(['exp', e]); }
  for (let a = 0; a < 400; a++) for (let b = 0; b < 40; b++) { const x = a * 12.9898 + b * 78.233; if (!Object.is(D.sin(x), Math.sin(x))) bad.push(['sin (the folk\'s wander hash)', x]); }
  for (const x of [0, -0, 1, -1, Math.PI, -Math.PI, Math.PI / 2, 1e-300, Infinity, -Infinity, NaN]) for (const y of [0, -0, 1, -1, Infinity, -Infinity, NaN, 2.5]) if (!Object.is(D.atan2(y, x), Math.atan2(y, x))) bad.push(['atan2', y, x]);
  for (const x of [0, -0, Infinity, -Infinity, NaN, 1e-320, Math.PI, -Math.PI / 2]) if (!Object.is(D.sin(x), Math.sin(x)) || !Object.is(D.cos(x), Math.cos(x))) bad.push(['sin/cos', x]);
  assert.deepEqual(bad.slice(0, 5), [], `${bad.length} arguments differ from Node's Math (V8 ${process.versions.v8})`);
});

test('every simulation module goes through dmath for sin, cos, atan2, acos and exp (a Math call there is a number the browser computes differently)', () => {
  const dir = path.join(ROOT, 'src/engine'), off = [];
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.js') && n !== 'dmath.js')) { const s = fs.readFileSync(path.join(dir, f), 'utf8'); for (const m of s.matchAll(/\bMath\.(sin|cos|tan|atan2|atan|asin|acos|exp|log|log2|log10|expm1|log1p|cbrt|sinh|cosh|tanh)\(/g)) off.push(f + ': ' + m[0]); }
  assert.deepEqual(off, []);
});
