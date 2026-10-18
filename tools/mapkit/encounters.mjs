// THE ENCOUNTER KIT (PT-052, R1 of the Director's Plan, workstream B): the scripted surprises of the ambush catalogue as calls, so a map source can say what it means instead of writing triggers by hand, and every one is checked
// against the level it goes in (a cell that is not floor, or that already holds an object, is an error at BUILD time, not a creature stuck in a wall at play time). Node only.
//   const E = new Encounters(L);                         L = the Level the map is drawn in (call BEFORE L.layers(): a closet carves a niche)
//   E.closet({ panel: [x, z], niche: [x0, z0, x1, z1], kinds: 't' | ['t', 'g'], when: { at: [x, z], radius } })   a wall panel slides back and a niche of sleepers wakes (CLOSET)
//   E.cage({ at: [x, z], radius, cells: [[x, z], ...], kind })                          stepping onto a spot spawns a pack round you (CAGE: the spot is where a reward lies)
//   E.dropIn({ at: [x, z], radius, cells, kind })                                        a pack drops in from the far side of a room as you cross it (DROP-IN)
//   E.lightsOut({ at: [x, z], radius, cells, kind, level })                              the room goes dark, a pack comes, the light returns when they are dead (LIGHTS OUT)
//   E.reinforce({ when: 'time:90' | 'dead:<group>', cells, kind })                      a second wave that always knows where you are (REINFORCEMENT)
//   E.apply(MAP)                                                                        append the groups, triggers and messages to the map definition
// A kind is a LEGEND character ('t' Tollbearer, 'g' Gaunt, 'b' Bellhand ...) in a closet and an enemy KIND name ('tollbearer') in a spawn: both accepted in either place. The flood (the tide) is not in the kit: it is a map field, not an encounter.
import { FLOOR_SKINS, ENEMIES } from '../../src/engine/defs.js';
import { LEGEND } from './compile.mjs';

const FLOOR = new Set(Object.keys(FLOOR_SKINS));
const kindOf = (k) => (ENEMIES[k] ? k : LEGEND[k]?.type === 'enemy' ? LEGEND[k].kind : null);
const charOf = (k) => (LEGEND[k]?.type === 'enemy' ? k : Object.keys(LEGEND).find((c) => LEGEND[c].type === 'enemy' && LEGEND[c].kind === k) ?? null);

export class Encounters {
  constructor(L, { prefix = 'amb' } = {}) { this.L = L; this.prefix = prefix; this.groups = []; this.triggers = []; this.messages = []; this.log = []; this.n = 0; }
  #name(kind) { return `${this.prefix}-${kind}-${++this.n}`; }
  #floor(x, z, what) {
    const c = this.L.get(x, z); if (!FLOOR.has(c)) throw new Error(`${what}: cell ${x},${z} is not floor ('${c}')`);
    if (this.L.ob[z][x] !== '.') throw new Error(`${what}: cell ${x},${z} already holds '${this.L.ob[z][x]}'`);
  }
  #spawns(what, cells, kind, group, extra = {}) {
    const k = kindOf(kind); if (!k) throw new Error(`${what}: unknown creature '${kind}'`);
    return cells.map(([x, z]) => { this.#floor(x, z, what); return { spawn: { kind: k, at: [x, z], group, facing: extra.facing ?? 'south', hunt: extra.hunt !== false } }; });
  }
  #trigger(id, when, at, radius, list) { const t = { id, when, ...(at ? { at, radius } : {}), do: list }; this.triggers.push(t); return t; }

  /** CLOSET: carve a niche (floor `floor`, walls `wall`), set a closet panel in the wall in front of it, put the sleepers in; `when` makes a trigger that opens it, or splice the returned `actions` into a switch's `do` */
  closet({ panel, niche, kinds, floor = 'f', wall = 'W', when = null, sound = 'bell_strike', message = null }) {
    const [x0, z0, x1, z1] = niche, cells = []; for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) cells.push([x, z]);
    const list = Array.isArray(kinds) ? kinds : cells.map(() => kinds); if (list.length !== cells.length) throw new Error(`closet: ${cells.length} niche cells but ${list.length} creatures`);
    for (const k of list) if (!charOf(k) || !kindOf(k)) throw new Error(`closet: unknown creature '${k}'`);
    const name = this.#name('closet'); this.L.room(niche, { floor, wall }); this.L.closet(panel[0], panel[1]);
    cells.forEach(([x, z], i) => this.L.put(x, z, charOf(list[i]) ?? list[i]));
    this.groups.push({ name, rect: niche });
    const actions = [{ open: [panel[0], panel[1]] }, { wake: name }, { sound }, { shake: 0.6 }];
    if (when) this.#trigger(name, 'enter', when.at, when.radius ?? 1.5, actions);
    if (message) this.messages.push({ id: name, at: when?.at ?? panel, radius: when?.radius ?? 1.5, ...message });
    this.log.push({ kind: 'closet', id: name, creatures: cells.length }); return { group: name, actions };
  }
  /** CAGE: a spot (where the reward lies) that, stepped on, spawns a pack round the player */
  cage({ at, radius = 1.6, cells, kind, sound = 'bell_strike', message = null, facing }) {
    const name = this.#name('cage'), list = [{ sound }, { shake: 1 }, ...this.#spawns('cage', cells, kind, name, { facing })]; this.#trigger(name, 'enter', at, radius, list);
    if (message) this.messages.push({ id: name, at, radius, ...message }); this.log.push({ kind: 'cage', id: name, creatures: cells.length }); return { group: name };
  }
  /** DROP-IN: the same, wider, with the pack dropping in at the far side of the room as the player crosses it */
  dropIn({ at, radius = 3, cells, kind, sound = 'creak', message = null, facing }) {
    const name = this.#name('dropin'), list = [{ sound }, { shake: 0.8 }, ...this.#spawns('dropIn', cells, kind, name, { facing })]; this.#trigger(name, 'enter', at, radius, list);
    if (message) this.messages.push({ id: name, at, radius, ...message }); this.log.push({ kind: 'dropin', id: name, creatures: cells.length }); return { group: name };
  }
  /** LIGHTS OUT: dim the room (`level`), send a pack, and give the light back when the pack is dead */
  lightsOut({ at, radius = 3, cells, kind, level = 0.3, sound = 'toll_alert', message = null, facing }) {
    const name = this.#name('dark'), list = [{ lights: level }, { sound }, ...this.#spawns('lightsOut', cells, kind, name, { facing })]; this.#trigger(name, 'enter', at, radius, list);
    this.#trigger(name + '-light', 'dead:' + name, null, 0, [{ lights: '__ambient' }]);
    if (message) this.messages.push({ id: name, at, radius, ...message }); this.log.push({ kind: 'lightsout', id: name, creatures: cells.length }); return { group: name };
  }
  /** REINFORCEMENT: a wave that always knows where the player stands, sent by a clock ('time:90') or by the death of another group ('dead:<group>') */
  reinforce({ when, cells, kind, sound = 'toll_alert', message = null, facing }) {
    if (!/^(time:\d+|dead:[\w-]+)$/.test(when)) throw new Error(`reinforce: when must be 'time:<seconds>' or 'dead:<group>' (got '${when}')`);
    const name = this.#name('wave'), list = [{ sound }, ...this.#spawns('reinforce', cells, kind, name, { facing, hunt: true })]; this.#trigger(name, when, null, 0, list);
    if (message) this.messages.push({ id: name, at: cells[0], radius: 1, ...message }); this.log.push({ kind: 'reinforce', id: name, creatures: cells.length }); return { group: name };
  }
  /** append everything to the map definition (call after MAP is built; the dark's restore level is the map's own ambient light) */
  apply(MAP) {
    const amb = MAP.atmosphere?.ambient ?? 1;
    MAP.groups = [...(MAP.groups ?? []), ...this.groups];
    MAP.triggers = [...(MAP.triggers ?? []), ...this.triggers.map((t) => ({ ...t, do: t.do.map((a) => (a.lights === '__ambient' ? { lights: amb } : a)) }))];
    if (this.messages.length) MAP.messages = [...(MAP.messages ?? []), ...this.messages];
    return MAP;
  }
}
