// When the game keeps a checkpoint by itself: a gate opened, a key taken, a bell silenced, a secret found; never in a fight it would trap you in.
// Pure: the shell writes the save.
import { PICKUPS } from '../engine/defs.js';

export const CHECKPOINT = {
  every: 25, // seconds of play at least between two
  minHp: 25, // never save a player about to die
  safeR: 7, // metres: nothing hunting this close
};

/** did something happen this tick that earns a checkpoint? */
export const earnsCheckpoint = (events) =>
  events.some(
    (e) =>
      (e.type === 'door_open' && !e.breath && !e.secret) || (e.type === 'pickup' && !!PICKUPS[e.kind]?.key) || e.type === 'node_severed' || e.type === 'secret',
  );

/** is this a moment that can be saved? */
export function safeToSave(world, lastAt) {
  const p = world.player;
  if (world.map.range || world.status !== 'playing' || p.hp < CHECKPOINT.minHp || p.air) return false;
  if (world.time - lastAt < CHECKPOINT.every) return false;
  return !world.enemies.some(
    (e) => e.state !== 'dead' && e.state !== 'idle' && e.state !== 'calm' && e.state !== 'flee' && Math.hypot(e.x - p.x, e.z - p.z) < CHECKPOINT.safeR,
  );
}
