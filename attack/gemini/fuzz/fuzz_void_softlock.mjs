// GEMINI ATTACK FUZZER: Void Floor Softlock in Maps without Cars
import fs from 'node:fs';
import { createWorld, step } from '../../../src/engine/world.js';
import { parseMap } from '../../../src/engine/mapformat.js';

console.log('=== GEMINI FUZZER: Void Floor Inversion & Softlock Probe ===');

// Test all shipping void maps without cars
const voidMaps = ['C1E4M01', 'C1E4M02', 'C1E4M06', 'C1E4M07', 'C1E4M08'];

for (const mapId of voidMaps) {
  const map = parseMap(JSON.parse(fs.readFileSync(`maps/${mapId}.json`, 'utf8')));
  if (!map.hasVoid || map.cars.length > 0) continue;
  
  // Find a void cell
  let vx = -1, vz = -1;
  for (let cz = 0; cz < map.h && vx < 0; cz++) {
    for (let cx = 0; cx < map.w; cx++) {
      if (map.kind(cx, cz) === 'void') { vx = cx; vz = cz; break; }
    }
  }
  if (vx < 0) continue;

  const w = createWorld(map);
  // Simulate body dropped into void without air (e.g. LOWG.maxAir timeout)
  w.player.x = (vx + 0.5) * map.cell;
  w.player.z = (vz + 0.5) * map.cell;
  w.player.y = 0;
  
  step(w, { move: [0, 0] });
  
  const isCorrupted = w.player.y === -6 && w.player.lastSafe && w.player.lastSafe.x === w.player.x && w.player.lastSafe.z === w.player.z;
  console.log(`Map ${mapId}: Player at void (${vx}, ${vz}): y=${w.player.y}, hp=${w.player.hp}, lastSafe=(${w.player.lastSafe?.x}, ${w.player.lastSafe?.z}) -> SOFTLOCK: ${isCorrupted}`);
}
