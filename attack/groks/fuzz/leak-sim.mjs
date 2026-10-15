// GROKS. Array lengths across a short sim soak. No browser. Writes attack/groks/fuzz/out/leak-sim.json.
import { TICK } from '../../../src/engine/defs.js';
import { damageEnemy } from '../../../src/engine/world.js';
import { loadMap, idle, createWorld, step, drainEvents, armEverything, writeOut } from './harness.mjs';

const fire = () => ({ ...idle(), fire: true });

function lens(w) {
  const enemies = w.enemies.length;
  const dead = w.enemies.filter((e) => e.state === 'dead').length;
  return {
    enemies, dead, living: enemies - dead,
    projectiles: w.projectiles.length,
    enemyShots: w.enemyShots.length,
    pickups: w.pickups.length,
    burns: w.burns.length,
    pulses: w.pulses.length,
    tears: w.tears?.length ?? 0,
    patches: w.patches?.length ?? 0,
    spikes: w.spikes?.length ?? 0,
    events: w.events.length,
  };
}

function soak(w, seconds, cmd, each) {
  const ticks = Math.round(seconds / TICK);
  const marks = [];
  let maxProj = 0, maxShots = 0, maxBurns = 0, maxPulses = 0, maxEvents = 0;
  for (let i = 0; i < ticks; i++) {
    if (each) each(w);
    if (w.status !== 'playing') break;
    step(w, cmd(i, w));
    maxEvents = Math.max(maxEvents, w.events.length);
    drainEvents(w);
    const L = lens(w);
    maxProj = Math.max(maxProj, L.projectiles);
    maxShots = Math.max(maxShots, L.enemyShots);
    maxBurns = Math.max(maxBurns, L.burns);
    maxPulses = Math.max(maxPulses, L.pulses);
    if (i === 0 || (i + 1) % Math.round(5 / TICK) === 0 || i + 1 === ticks) marks.push({ t: +((i + 1) * TICK).toFixed(2), ...L });
  }
  return { status: w.status, hp: w.player.hp, marks, maxProj, maxShots, maxBurns, maxPulses, maxEvents };
}

const quay = loadMap('C1E1M01');
const idleWorld = createWorld(quay, { seed: 1 });
const idleRun = { start: lens(idleWorld), ...soak(idleWorld, 20, idle) };

const gunWorld = createWorld(quay, { seed: 1 });
armEverything(gunWorld);
gunWorld.player.weapon = 'flare';
const gunRun = { start: lens(gunWorld), ...soak(gunWorld, 8, fire) };

const stuckWorld = createWorld(quay, { seed: 1 });
for (let i = 0; i < 5; i++) { step(stuckWorld, idle()); drainEvents(stuckWorld); }
stuckWorld.projectiles.push({ id: stuckWorld.nextId++, weapon: 'flare', x: stuckWorld.player.x, y: (stuckWorld.player.y ?? 0) + 1.2, z: stuckWorld.player.z, vx: 0, vy: 0, vz: 0, g: 0, life: 'long' });
let stuckThrew = null;
try { for (let i = 0; i < Math.round(3 / TICK); i++) { step(stuckWorld, idle()); drainEvents(stuckWorld); } }
catch (e) { stuckThrew = e.message; }

const foundry = loadMap('C1E3M07');
const vatMap = foundry.entities.filter((e) => e.type === 'enemy' && e.kind === 'vat');
const farm = createWorld(foundry, { seed: 1 });
const vat = farm.enemies.find((e) => e.kind === 'vat');
if (vat) { vat.state = 'chase'; farm.player.x = vat.x + 2; farm.player.z = vat.z; farm.player.y = 0; }
const farmRun = soak(farm, 40, idle, (w) => {
  w.player.hp = 500;
  for (const e of w.enemies) if (e.kind !== 'vat' && e.state !== 'dead' && e.hp > 0) damageEnemy(w, e, 1e6);
});

const report = {
  idleQuay20s: idleRun,
  flareHeld8s: gunRun,
  nonFiniteLifeProjectile: { threw: stuckThrew, projectiles: stuckWorld.projectiles.length, life: Object.is(stuckWorld.projectiles[0]?.life, NaN) ? 'NaN' : (stuckWorld.projectiles[0]?.life ?? null) },
  vatFarm40s: { vatsOnMap: vatMap.length, wokeOne: !!vat, ...farmRun },
};
writeOut('leak-sim.json', report);
console.log(JSON.stringify(report, null, 2));
