// GEMINI ATTACK FUZZER: Mortar Wall Penetration & Geometry Piercing
import fs from 'node:fs';
import { createWorld } from '../../../src/engine/world.js';
import { designate, aimPoint } from '../../../src/engine/mortar.js';
import { WEAPONS } from '../../../src/engine/defs.js';
import { parseMap } from '../../../src/engine/mapformat.js';

console.log('=== GEMINI FUZZER: Mortar Wall Penetration Probe ===');

const map = parseMap(JSON.parse(fs.readFileSync('tests/fixtures/C1E1M01.json', 'utf8')));
const w = createWorld(map);

// Test across various yaw angles facing nearby walls (1m away)
w.player.x = 2;
w.player.z = 2;
w.player.pitch = 0;

const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
for (const yaw of angles) {
  w.player.yaw = yaw;
  const aim = aimPoint(w, w.player, WEAPONS.mortar.designate);
  const des = designate(w, w.player, WEAPONS.mortar);
  const targetKind = map.kind(Math.floor(des.x / map.cell), Math.floor(des.z / map.cell));
  console.log(`Yaw: ${yaw.toFixed(2)} | Aim stopped by: ${aim.what} | Target: (${des.x.toFixed(1)}, ${des.z.toFixed(1)}) in tile '${targetKind}' | Pierced wall: ${targetKind === 'wall'}`);
}
