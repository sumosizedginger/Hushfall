// PT-070 (the story pass): a message may say `unless`. A reminder such as "the gate is shut" is not said once the gate is open. Lazy: a message without it behaves exactly as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMap, validateMap } from '../src/engine/mapformat.js';
import { createWorld, step, drainEvents, cellSolid } from '../src/engine/world.js';

const idle = (o = {}) => ({ move: [0, 0], yaw: 0, pitch: 0, fire: false, aim: false, sprint: false, use: false, weapon: null, weaponStep: 0, ...o });
const base = (messages) => ({
  format: 1, id: 'T9', version: 1, name: 'Say', ceilingHeight: 4, secrets: [], doors: [],
  grid: ['###########', '#.........#', '#.........#', '###########'],
  entities: [{ type: 'player', at: [2, 1], facing: 'east' }, { type: 'exit', at: [9, 2] }],
  messages,
});
const say = (messages, ticks = 40) => { const w = createWorld(parseMap(base(messages)), { seed: 1, difficulty: 'normal' }); const got = []; for (let i = 0; i < ticks; i++) { step(w, idle()); for (const e of drainEvents(w)) if (e.type === 'message') got.push(e.id); } return got; };

test('a message without unless is said as before; one whose unless already holds is silent', () => {
  const near = { at: [2, 1], radius: 3, speaker: 'HULL' };
  assert.deepEqual(say([{ id: 'a', ...near, text: 'Said.' }]), ['a']);
  assert.deepEqual(say([{ id: 'a', ...near, text: 'Said.' }, { id: 'b', ...near, text: 'Also said.', unless: 'msg:a' }]).sort(), ['a'], 'b is held once a has been said');
  assert.deepEqual(say([{ id: 'a', ...near, text: 'Said.' }, { id: 'b', ...near, text: 'Not held.', unless: 'msg:never' }].map((m) => (m.id === 'b' ? { ...m, unless: 'dead:nobody' } : m))).sort(), ['a', 'b'], 'a condition that is false holds nothing');
});

test('unless accepts a list: any condition that holds silences the message', () => {
  const near = { at: [2, 1], radius: 3, speaker: 'HULL' };
  const got = say([{ id: 'a', ...near, text: 'Said.' }, { id: 'b', ...near, text: 'Held.', unless: ['dead:nobody', 'msg:a'] }]);
  assert.ok(got.includes('a') && !got.includes('b'));
});

test('validation: unless must name a known message or one of the listed conditions', () => {
  const ok = validateMap(base([{ id: 'a', at: [2, 1], text: 'x' }, { id: 'b', at: [3, 1], text: 'y', unless: 'msg:a' }]));
  assert.equal(ok.ok, true, JSON.stringify(ok.errors));
  const bad1 = validateMap(base([{ id: 'b', at: [3, 1], text: 'y', unless: 'msg:ghost' }]));
  assert.equal(bad1.ok, false); assert.match(bad1.errors.join('\n'), /unknown message/);
  const bad2 = validateMap(base([{ id: 'b', at: [3, 1], text: 'y', unless: 'whenever' }]));
  assert.equal(bad2.ok, false); assert.match(bad2.errors.join('\n'), /must be msg:/);
  const bad3 = validateMap(base([{ id: 'b', at: [3, 1], text: 'y', unless: 7 }]));
  assert.equal(bad3.ok, false);
});

// ---- the shipped reminders (the story pass of PT-070): each is said to a player who comes early and is held when what it reminds of has happened
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile } from '../src/engine/harness.js';
import { conditionMet } from '../src/engine/script.js';
const ROOT = path.resolve(import.meta.dirname, '..');
/** the nearest open cell to a message's own cell that is inside its radius (a reminder about a wall stands on the wall's cell) */
const standNear = (w, m) => { const best = []; const R = Math.ceil(m.r / w.map.cell); for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) { const cx = m.at[0] + dx, cz = m.at[1] + dz; if (cx < 0 || cz < 0 || cx >= w.map.w || cz >= w.map.h || cellSolid(w, cx, cz)) continue; const x = (cx + 0.5) * w.map.cell, z = (cz + 0.5) * w.map.cell, d = Math.hypot(x - m.x, z - m.z); if (d <= m.r * 0.9) best.push({ x, z, d }); } best.sort((a, b) => a.d - b.d); return best.length ? best : [{ x: m.x, z: m.z }]; };
const shipped = fs.readdirSync(path.join(ROOT, 'maps')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).flatMap((id) => {
  const map = loadMapFile(path.join(ROOT, 'maps', id + '.json')); return map.messages.filter((m) => m.unless != null).map((m) => ({ id, map, m }));
});

test('every shipped message with unless is said to a player who stands there at the start', () => {
  assert.ok(shipped.length >= 14, `${shipped.length} reminders carry unless`);
  for (const { id, map, m } of shipped) {
    const spots = standNear(createWorld(map, { seed: 1, difficulty: 'normal' }), m).slice(0, 40); let said = false;      // a cell over a drop throws the player back: take the first cell the message can be heard from
    for (const at of spots) { const w = createWorld(map, { seed: 1, difficulty: 'normal' }); w.player.x = at.x; w.player.z = at.z; for (let i = 0; i < 40 && !said; i++) { step(w, idle()); for (const e of drainEvents(w)) if (e.type === 'message' && e.id === m.id) said = true; } if (said) break; }
    assert.ok(said, `${id}: ${m.id} is said when the player comes early`);
  }
});

test('every shipped message with unless is held once its condition holds (a world in which the anchor message is already seen)', () => {
  for (const { id, map, m } of shipped) {
    const w = createWorld(map, { seed: 1, difficulty: 'normal' });
    const terms = Array.isArray(m.unless) ? m.unless : [m.unless];
    const term = terms[0], conds = Array.isArray(term) ? term : [term];
    for (const c of conds) { if (c.startsWith('msg:')) w.messagesSeen.push(c.slice(4)); else if (c.startsWith('key:')) w.player.keys.push(c.slice(4)); }
    assert.equal(conditionMet(w, { when: terms[0] }), true, `${id}: ${m.id}: the condition can be met`);
    const at = standNear(w, m)[0]; w.player.x = at.x; w.player.z = at.z; const got = []; for (let i = 0; i < 40; i++) { step(w, idle()); for (const e of drainEvents(w)) if (e.type === 'message') got.push(e.id); }
    assert.ok(!got.includes(m.id), `${id}: ${m.id} is silent once ${JSON.stringify(m.unless)} holds`);
  }
});
