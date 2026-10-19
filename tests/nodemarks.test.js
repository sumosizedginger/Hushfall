// PT-061 (V9): ONE cue for every node of every boss: a ring of white-cyan light round its body, drawn for every `node: true` kind (checked in node on the real fx module), pulsing while a shielded boss stands and steady after.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { parseMap } from '../src/engine/mapformat.js';
import { createWorld } from '../src/engine/world.js';
import { ENEMIES } from '../src/engine/defs.js';
import { makeCreatureFx } from '../src/render/creaturefx.js';

const NODES = Object.keys(ENEMIES).filter((k) => ENEMIES[k].node);
const hall = (kinds) => ({ format: 1, id: 'NM', version: 1, name: 'NM', cellSize: 2, grid: ['#'.repeat(60), ...Array.from({ length: 5 }, () => '#' + '.'.repeat(58) + '#'), '#'.repeat(60)], doors: [], secrets: [], messages: [],
  entities: [{ type: 'player', at: [2, 3], facing: 'east' }, { type: 'exit', at: [58, 3] }, ...kinds.map((k, i) => ({ type: 'enemy', kind: k, at: [8 + i * 4, 3] }))] });
test('every node kind has the marker, a dead node loses it, and it stops pulsing when no shielded boss stands', () => {
  assert.ok(NODES.length >= 6, 'bell node, feeder, vat, reed, seal, root anchor: ' + NODES.join(','));
  const w = createWorld(parseMap(hall([...NODES, 'cantor'])), { seed: 1 }), scene = new THREE.Scene(), fx = makeCreatureFx(scene);
  fx.update(w, new Map(), 1, 1 / 60); const ring = (e) => fx.group.children.find((c) => Math.abs(c.position.x - e.x) < 1e-6 && c.geometry?.type === 'TorusGeometry');
  for (const e of w.enemies.filter((q) => ENEMIES[q.kind].node)) assert.ok(ring(e), 'a marker on the ' + e.kind);
  const n0 = w.enemies.find((q) => q.kind === NODES[0]); const s1 = ring(n0).scale.x; fx.update(w, new Map(), 1.2, 1 / 60); assert.notEqual(ring(n0).scale.x, s1, 'pulsing while the Cantor holds its shield');
  for (const e of w.enemies) if (e.kind === 'cantor') e.state = 'dead'; fx.update(w, new Map(), 2, 1 / 60); const s2 = ring(n0).scale.x; fx.update(w, new Map(), 2.3, 1 / 60); assert.equal(ring(n0).scale.x, s2, 'steady once nothing holds a shield');
  n0.state = 'dead'; fx.update(w, new Map(), 3, 1 / 60); assert.equal(ring(n0), undefined, 'a severed node loses its marker'); fx.dispose();
});

test('an awake boss is lit from behind and stands in a ring of its own reach; a sleeping or dead one is not staged', () => {
  const w = createWorld(parseMap(hall(['cantor'])), { seed: 1 }), scene = new THREE.Scene(), fx = makeCreatureFx(scene), b = w.enemies[0], rim = () => fx.group.children.find((c) => c.isPointLight);
  fx.update(w, new Map(), 1, 1 / 60); assert.equal(rim().intensity, 0, 'asleep: no staging'); b.state = 'chase'; fx.update(w, new Map(), 1.1, 1 / 60);
  assert.ok(rim().intensity > 3, 'a rim light'); assert.ok(rim().position.x > b.x, 'on the far side of the boss from the player (who stands to its west)');
  const ring = fx.group.children.find((c) => c.geometry?.type === 'TorusGeometry' && Math.abs(c.scale.x - ENEMIES.cantor.attack.reach) < 1e-9); assert.ok(ring, 'the reach ring is as wide as the blow reaches');
  b.state = 'dead'; fx.update(w, new Map(), 1.2, 1 / 60); assert.equal(rim().intensity, 0); assert.equal(fx.group.children.some((c) => c.geometry?.type === 'TorusGeometry' && Math.abs(c.scale.x - ENEMIES.cantor.attack.reach) < 1e-9), false); fx.dispose();
});
