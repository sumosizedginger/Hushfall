// What the scene graph holds, group by group (PT-054): for each top-level child of the scene, how many objects and meshes live under it, how many of them still recompute their matrix every frame (matrixAutoUpdate), and how many draw calls the map costs at the spawn.
// Node only: a real GameView on stand-in renderer and textures (tests/stubs.js), the world as it is at tick 0.
//   node tools/dev/scene-census.mjs <ID> ...
import fs from 'node:fs';
import path from 'node:path';
import { parseMap } from '../../src/engine/mapformat.js';
import { createWorld } from '../../src/engine/world.js';
import { GameView } from '../../src/render/view.js';
import { texProxy, stubRenderer } from '../../tests/stubs.js';

const root = path.resolve(import.meta.dirname, '../..');
for (const id of process.argv.slice(2)) {
  const map = parseMap(JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8'))), w = createWorld(map, { seed: 1, difficulty: 'normal' }), view = new GameView(stubRenderer(), texProxy(), map, w);
  view.setSize(640, 360, 640); view.render(w, 1, 0.016);
  const rows = []; let all = 0, auto = 0;
  for (const c of view.scene.children) { let n = 0, meshes = 0, a = 0; c.traverse((o) => { n++; if (o.isMesh) meshes++; if (o.matrixAutoUpdate) a++; }); all += n; auto += a; rows.push({ what: `${c.type}${c.name ? ' ' + c.name : ''}${c.isMesh ? ' (' + (c.geometry?.type ?? '') + ')' : ''}`, n, meshes, auto: a }); }
  rows.sort((a, b) => b.n - a.n);
  console.log(`${id}: ${all} objects, ${auto} recompute their matrix every frame; enemies ${w.enemies.length}, enemy views ${view.enemyViews.size}`);
  for (const r of rows.slice(0, 12)) console.log(`   ${String(r.n).padStart(5)} objects ${String(r.meshes).padStart(5)} meshes ${String(r.auto).padStart(5)} auto   ${r.what}`);
}
