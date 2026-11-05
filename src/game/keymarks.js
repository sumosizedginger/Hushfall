// The key a locked door wants, marked on both maps once the player has tried that door (the owner, on the Bell Tower: "I have been up and down this level 3
// times and haven't found a key"). Pure: the world in, plain data out. The simulation is not touched: which doors were tried is the shell's, for this attempt.
import { KEYS } from '../engine/defs.js';

const keyName = (key) => KEYS[key]?.name.toLowerCase() || 'key';

/** the keys still lying on the map that the player has been told they need: [{ x, z, key, color }], in metres */
export function keyMarks(world, asked) {
  if (!asked?.size) return [];
  const held = world.player.keys ?? [],
    marks = [];
  for (const it of world.pickups) {
    const key = /^key_(.+)$/.exec(it.kind)?.[1];
    if (key && asked.has(key) && !held.includes(key)) marks.push({ x: it.x, z: it.z, key, color: KEYS[key]?.color ?? '#c9a44c' });
  }
  return marks;
}

export const lockedPrompt = (key, marked) => `Locked: needs the ${keyName(key)}${marked ? ' (marked on your map)' : ''}`;
export const keyObjective = (key) => `Find the ${keyName(key)}: it is marked on your map`;
