import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';
const [, , mapFile = 'maps/C1E1M01.json', routeFile = 'routes/C1E1M01.main.route.json', diff = 'normal', seed = '1'] = process.argv;
const map = loadMapFile(mapFile), route = loadRouteFile(routeFile);
const r = runRoute(map, route, { seed: Number(seed), difficulty: diff });
const p = r.world.player;
console.log(JSON.stringify({ result: r.result, failure: r.failure, ticks: r.ticks, seconds: +(r.ticks / 60).toFixed(1), opsDone: r.bot.i + '/' + route.length, hp: p.hp, armor: p.armor, ammo: p.ammo, keys: p.keys, pos: [+p.x.toFixed(1), +p.z.toFixed(1)], stats: r.world.stats, hash: r.hash }));
