// A11b: take the canonical M05 route, delete the funicular ops (switch car-up, waitsector car) and play it. If it still completes, the car is optional.
// Run: node review/gate-2/audit/repro/a11b_m05_route_without_car.mjs
import fs from 'node:fs';
import { loadMapFile, runRoute } from '../../../../src/engine/harness.js';
const map = loadMapFile('maps/C1E1M05.json'), route = JSON.parse(fs.readFileSync('routes/C1E1M05.main.route.json', 'utf8'));
const idx = route.findIndex((o) => o.op === 'switch' && o.id === 'car-up');
console.log('canonical route: car ops at index', idx, JSON.stringify(route.slice(idx - 1, idx + 4)));
const base = runRoute(map, route, { seed: 1, difficulty: 'normal' });
console.log('canonical:', base.result, base.ticks, 'triggers fired', JSON.stringify(base.world.triggerState));
// the ops between the lift and the next terrace are goto ops with absolute targets; without the car the bot's pathfinder walks round on foot
const noCar = route.filter((o) => !((o.op === 'switch' && o.id === 'car-up') || (o.op === 'waitsector')));
const r = runRoute(map, noCar, { seed: 1, difficulty: 'normal' });
console.log('without car ops:', r.result, r.ticks, r.failure || '', 'triggers fired', JSON.stringify(r.world.triggerState), 'car h', r.world.sectors[0].h);
