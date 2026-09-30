// Debug aid (env: HITS=1 lists every hit, AMMOSCALE=0.75, TREMOR=0.03): run a route and attribute the player's damage to enemy kinds (nearest awake enemy within 3 m = melee, else nearest Bellhand/Cantor = ranged), plus where and when.
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';
const [, , mapFile, routeFile, diff = 'normal', seed = '1'] = process.argv;
const map = loadMapFile(mapFile), route = loadRouteFile(routeFile);
let last = null; const by = {}; const where = [];
const r = runRoute(map, route, { seed: Number(seed), difficulty: diff, ...(process.env.AMMOSCALE ? { ammoScale: Number(process.env.AMMOSCALE) } : {}), ...(process.env.TREMOR ? { tremor: Number(process.env.TREMOR) } : {}), onTick: (w, t) => {
  const p = w.player, hp = p.hp + p.armor;
  if (last != null && hp < last) {
    const live = w.enemies.filter((e) => e.state !== 'dead' && e.state !== 'idle');
    const melee = live.filter((e) => Math.hypot(e.x - p.x, e.z - p.z) < 3.2).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    const ranged = live.filter((e) => ['bellhand', 'cantor'].includes(e.kind)).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    const src = melee ? melee.kind + '(melee)' : ranged ? ranged.kind + '(shot)' : 'other';
    by[src] = (by[src] || 0) + (last - hp); if (process.env.HITS) console.log('hit', (t / 60).toFixed(1) + 's', src, (last - hp).toFixed(0), 'cell', (p.x / map.cell).toFixed(0) + ',' + (p.z / map.cell).toFixed(0));
  }
  if (t % 300 === 0) where.push(`${(t / 60).toFixed(0)}s op${'?'} cell ${(p.x / map.cell).toFixed(0)},${(p.z / map.cell).toFixed(0)} hp ${p.hp | 0}`);
  last = hp;
} });
const w = r.world;
console.log(r.result, r.failure || '', 'opsDone', r.bot.i, '/', route.length, JSON.stringify(route[r.bot.i]), 'kills', w.stats.kills);
console.log('damage by source', JSON.stringify(by));
console.log(where.join('\n'));
const p = w.player;
const near = w.enemies.filter((e) => e.state !== 'dead' && Math.hypot(e.x - p.x, e.z - p.z) < 20).map((e) => `${e.kind}@${(e.x / map.cell).toFixed(0)},${(e.z / map.cell).toFixed(0)} y${(e.y || 0).toFixed(1)} ${e.state}`);
console.log('near at end:', near.join(' | '));
console.log('ammo', JSON.stringify(w.player.ammo), 'weapon', w.player.weapon, 'hp', w.player.hp | 0, 'pos', (p.x / map.cell).toFixed(1), (p.z / map.cell).toFixed(1));
