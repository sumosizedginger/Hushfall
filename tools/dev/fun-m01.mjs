// PT-081 (design/FUN_CHECK.md, standard 7: two to four secrets of more than one kind): Marrow Quay (C1E1M01) has no map source (its JSON IS the
// source; see reshape-m01.mjs and rebuild-m01.mjs), so its
// second secret, a cracked wall, is made on the JSON, once, by this script with the same encounter kit as every other map through a stand-in for the
// Level it reads and writes (floor characters, heights,
// the cells already holding something, a room, a panel, a pickup). It refuses to run twice. After it: `node tools/dev/add-secret-route.mjs C1E1M01
// <id> --append`, `node tools/dev/map-check.mjs C1E1M01`, `npm run verify-map -- C1E1M01`.
import fs from 'node:fs';
import path from 'node:path';
import { Encounters } from '../mapkit/encounters.mjs';
import { LEGEND } from '../mapkit/legend.mjs';
import { laneOf } from '../mapkit/shape.mjs';

const ID = 'C1E1M01',
  SECRET = 'rope-store';
const file = path.resolve(import.meta.dirname, '../../maps/' + ID + '.json'),
  pretty = (m) => JSON.stringify(m, null, 1).replace(/\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]/g, '[$1, $2]');
const lane = laneOf(ID) ?? new Set();
const map = JSON.parse(fs.readFileSync(file, 'utf8'));
// the owner's first play (2026-11-01: "it tells me there are 2 secrets, but I only found 1"): a new KIND of secret is taught where it first appears.
// Ines names the crack when the player is near the nook.
const HINT = {
  id: SECRET + '-hint',
  at: [40, 7],
  radius: 3,
  speaker: 'INES',
  text: "That back wall's cracked right through. One good shot would bring it down.",
};
if ((map.secrets ?? []).some((s) => s.id === SECRET)) {
  if (!(map.messages ?? []).some((m) => m.id === HINT.id)) {
    map.messages = [...map.messages, HINT];
    fs.writeFileSync(file, pretty(map));
    console.log(ID + ': added the hint ' + HINT.id);
  } else console.log(ID + ' already has ' + SECRET + ' and its hint: nothing to do');
  process.exit(0);
}
const H = map.grid.length,
  W = map.grid[0].length,
  grid = map.grid.map((r) => [...r]),
  ob = Array.from({ length: H }, () => Array(W).fill('.')),
  added = [];
for (const e of map.entities) if (e.at) ob[Math.floor(e.at[1])][Math.floor(e.at[0])] = 'x';
const ht = Array.from({ length: H }, () => Array(W).fill(0));
if (map.heights)
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) {
      const c = map.heights[z][x];
      ht[z][x] = c === '.' ? 0 : c >= '0' && c <= '9' ? +c : c >= 'a' && c <= 'z' ? c.charCodeAt(0) - 87 : 0;
    }
const L = {
  w: W,
  h: H,
  ob,
  ht,
  get: (x, z) => grid[z]?.[x],
  room([x0, z0, x1, z1], { floor }) {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) grid[z][x] = floor;
  },
  secretPanel(x, z) {
    grid[z][x] = 'S';
  },
  put(x, z, c) {
    const d = LEGEND[c];
    if (!d || d.type !== 'pickup') throw new Error('not a pickup: ' + c);
    ob[z][x] = c;
    added.push({ type: 'pickup', kind: d.kind, at: [x, z] });
  },
};
const E = new Encounters(L);
const r = E.secretRoom({
  id: SECRET,
  search: { region: [2, 2, W - 3, H - 3], prefer: [40, 6], lane },
  open: 'shoot',
  rewards: ['v', 'H'],
  message: { speaker: 'INES', text: 'A rope store, bricked up when the bells started. Bad mortar. Whoever did it was in a hurry.' },
});
map.grid = grid.map((r) => r.join(''));
map.entities = [...map.entities, ...added]; // after every other entity
E.apply(map);
map.messages = [...map.messages, HINT];
fs.writeFileSync(file, pretty(map));
console.log(ID + ': added the cracked-wall secret', JSON.stringify(r), 'and', added.length, 'pickups');
