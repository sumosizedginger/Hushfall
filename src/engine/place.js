// The place: doors, beams, breath and spores, falling loads, cars, pickups, messages, secrets, scripts, the end of the tick.
// Part of the deterministic simulation (world.js holds the order of a tick): nothing here touches DOM, Three, the clock or Math.random.
import { addLoad } from './ammoloads.js';
import { EXPLORE_EVERY_TICKS, updateExplored } from './automap.js';
import { nextRot, traceBeams } from './beams.js';
import { gateOpen, sporeState } from './breath.js';
import { carState } from './cars.js';
import { updateChimes } from './chimes.js';
import { takeCrate } from './crate.js';
import { ALL_WEAPONS, AMMO_LOADS, DIFFICULTY, DOOR, ENEMIES, LOADS, LOCK, PICKUPS, PLAYER, WEAPONS } from './defs.js';
import { trackFired, updateDrops } from './drops.js';
import { rangePhys } from './gravity.js';
import { inLoad, loadIndex, loadState } from './loads.js';
import { addMod } from './mods.js';
import { hurtPlayer, lockQueued } from './player.js';
import { ammoCap, armorCap } from './progress.js';
import { rangePlayer } from './range.js';
import { choiceHolds, messageHeld, updateTriggers } from './script.js';
import { doorAtCell, emit, isMelee } from './simcore.js';
import { floorAt } from './terrain.js';
import { damageEnemy } from './weapons.js';

/* * trace the beams again; a receiver that becomes lit or dark says so (the view and the audio read the events, a trigger reads `w.beams.lit`) */
export function updateBeams(w, silent = false) {
  const open = (cx, cz) => {
    const d = doorAtCell(w, cx, cz);
    return !!d && d.open >= 0.85;
  };
  const t = traceBeams(w.map, w.mirrors, open),
    was = w.beams.lit,
    cell = w.map.cell;
  if (!silent)
    for (const r of w.map.receivers) {
      const on = t.lit.includes(r.id),
        off = !was.includes(r.id);
      if (on && off) emit(w, 'receiver_lit', { id: r.id, x: (r.at[0] + 0.5) * cell, z: (r.at[1] + 0.5) * cell });
      else if (!on && !off) emit(w, 'receiver_dark', { id: r.id, x: (r.at[0] + 0.5) * cell, z: (r.at[1] + 0.5) * cell });
    }
  w.beams.lit = t.lit;
}

/* * Use on a mirror turns it a quarter step clockwise */
export function turnMirror(w, id) {
  const m = w.map.mirrors.find((q) => q.id === id);
  if (!m) return;
  w.mirrors[id] = nextRot(w.mirrors[id]);
  emit(w, 'mirror_turn', { id, rot: w.mirrors[id], x: (m.at[0] + 0.5) * w.map.cell, z: (m.at[1] + 0.5) * w.map.cell });
  if (w.beams) updateBeams(w);
}

/**
 * a BREATHING gate (breath.js): open while its clock says so, whatever anyone does; it never shuts on a body (anyone within the door clearance holds
 * it open), and it announces every change
 */
function breathGate(w, d, dt) {
  const cxw = (d.cx + 0.5) * w.map.cell,
    czw = (d.cz + 0.5) * w.map.cell;
  let want = gateOpen(d.breath, w.time);
  if (
    !want &&
    d.target === 1 &&
    [w.player, ...w.enemies.filter((e) => e.state !== 'dead')].some((o) => Math.hypot(o.x - cxw, o.z - czw) < DOOR.autoCloseClearance)
  )
    want = true;
  const goal = want ? 1 : 0;
  if (goal !== d.target) {
    d.target = goal;
    emit(w, goal ? 'door_open' : 'door_close', { cx: d.cx, cz: d.cz, x: cxw, z: czw, breath: true });
  }
  if (d.open < d.target) d.open = Math.min(d.target, d.open + dt * DOOR.speed);
  else if (d.open > d.target) d.open = Math.max(d.target, d.open - dt * DOOR.speed);
}

/** the spore regions announce their blooms (audio and the view; the damage itself is just fxAt): lazy state, so a map without pulses is untouched */
export function updateSpores(w) {
  const st =
    w.spores ??
    (w.spores = w.map.pulses.map((p) => {
      const s = sporeState(p, w.time);
      return { on: s.on, warned: s.warn > 0 };
    }));
  w.map.pulses.forEach((p, i) => {
    const s = sporeState(p, w.time),
      o = st[i],
      x = ((p.rect[0] + p.rect[2] + 1) / 2) * w.map.cell,
      z = ((p.rect[1] + p.rect[3] + 1) / 2) * w.map.cell;
    if (s.on && !o.on) emit(w, 'spore_bloom', { i, x, z, r: (Math.hypot(p.rect[2] - p.rect[0] + 1, p.rect[3] - p.rect[1] + 1) * w.map.cell) / 2 });
    else if (!s.on && o.on) emit(w, 'spore_fade', { i, x, z });
    else if (s.warn > 0 && !o.warned && !s.on) emit(w, 'spore_warn', { i, x, z });
    o.on = s.on;
    o.warned = s.warn > 0;
  });
}

// falling loads
/**
 * a load lands at the start of each of its cycles (loads.js): a warning event as it starts to fall, and at the impact whoever is on the ground inside
 * its rect is struck (the player hurt, a walker crushed). Lazy state: only a map with loads has `w.loadSeen`.
 */
export function updateLoads(w) {
  const st = w.loadSeen ?? (w.loadSeen = w.map.loads.map((L) => ({ idx: loadIndex(L, w.time), warned: false })));
  const p = w.player,
    S = w.map.cell,
    diff = DIFFICULTY[w.difficulty];
  w.map.loads.forEach((L, i) => {
    const o = st[i],
      idx = loadIndex(L, w.time),
      x = ((L.rect[0] + L.rect[2] + 1) / 2) * S,
      z = ((L.rect[1] + L.rect[3] + 1) / 2) * S;
    if (idx > o.idx) {
      o.idx = idx;
      o.warned = false;
      emit(w, 'load_land', { i, x, y: floorAt(w, x, z), z });
      if (p.hp > 0 && !p.air && inLoad(L, p.x, p.z, S, PLAYER.radius)) {
        emit(w, 'load_hit', { x: p.x, z: p.z });
        hurtPlayer(w, Math.round(LOADS.damage * diff.enemyDamage), null, 'hazard:load');
      }
      for (const e of w.enemies) {
        const d = ENEMIES[e.kind];
        if (e.state !== 'dead' && !d.flying && !d.node && !d.boss && inLoad(L, e.x, e.z, S, 0)) damageEnemy(w, e, LOADS.enemyDamage);
      }
    } else if (!o.warned && loadState(L, w.time).warn > 0) {
      o.warned = true;
      emit(w, 'load_warn', { i, x, z });
      if (L.tremor) {
        emit(w, 'shake', { amount: L.tremor });
        emit(w, 'tremor', { amount: L.tremor });
      }
    } // (a strip of a collapse front that says `tremor` shakes the view as it begins to fall)
  });
}

// cars
/** a car pulling out or coming to rest makes the sound of a lift (events only; lazy state: only a map with cars has `w.carSeen`) */
export function updateCars(w) {
  const seen = w.carSeen ?? (w.carSeen = w.map.cars.map((c) => carState(c, w.time).moving));
  w.map.cars.forEach((car, i) => {
    const s = carState(car, w.time);
    if (s.moving !== seen[i]) {
      seen[i] = s.moving;
      emit(w, s.moving ? 'car_depart' : 'car_arrive', { i, x: s.x, y: s.y, z: s.z });
    }
  });
}

/** every door: hand-opened, breathing, interlocked */
export function updateDoors(w, dt) {
  const p = w.player,
    map = w.map;
  // doors
  for (const d of w.doors) {
    if (d.breath) {
      breathGate(w, d, dt);
      continue;
    }
    if (d.want) lockQueued(w, d); // a Use that came while the airlock was cycling is kept
    if (d.target === 1 && d.open < 1) {
      d.open = Math.min(1, d.open + dt * DOOR.speed);
    } else if (d.target === 1 && d.open >= 1 && !d.secret) {
      const cxw = (d.cx + 0.5) * map.cell,
        czw = (d.cz + 0.5) * map.cell;
      const occupied = [p, ...w.enemies.filter((e) => e.state !== 'dead')].some((o) => Math.hypot(o.x - cxw, o.z - czw) < DOOR.autoCloseClearance);
      d.hold = occupied ? 0 : d.hold + dt;
      if (d.hold >= (d.interlock ? LOCK.hold : DOOR.holdOpen)) {
        d.target = 0;
        emit(w, 'door_close', { cx: d.cx, cz: d.cz, x: cxw, z: czw });
      }
    } else if (d.target === 0 && d.open > 0) {
      d.open = Math.max(0, d.open - dt * DOOR.speed);
      if (d.open === 0 && d.interlock) d.closedAt = w.time;
    }
  }
}

/** boxes from the dead */
export function updateAmmoDrops(w, dt) {
  // ammunition drops: the guns fired this tick are noted and a box that has dropped slides toward the player; both do nothing on a map without
  // `drops`
  if (w.map.drops) {
    trackFired(w);
    updateDrops(w, dt);
  }
}

/** what the player walks over */
export function takePickups(w, diff) {
  const p = w.player,
    map = w.map;
  // pickups
  for (let i = w.pickups.length - 1; i >= 0; i--) {
    const it = w.pickups[i],
      def = PICKUPS[it.kind];
    if (Math.hypot(p.x - it.x, p.z - it.z) > 0.9 || Math.abs((it.y ?? 0) - p.y) > 1.0) continue;
    let took = false;
    const aCap = def.type === 'armor' ? armorCap(w.upgrades) : 0,
      mCap = def.ammo ? ammoCap(def.ammo, w.upgrades) : 0; // the caps rise with the persistent upgrades (progress.js)
    if (def.type === 'health' && p.hp < PLAYER.maxHp) {
      p.hp = Math.min(PLAYER.maxHp, p.hp + def.amount);
      took = true;
    } else if (def.type === 'armor' && p.armor < aCap) {
      p.armor = Math.min(aCap, p.armor + def.amount);
      took = true;
    } else if (def.type === 'ammo' && (p.ammo[def.ammo] || 0) < mCap) {
      const was = p.ammo[def.ammo] || 0;
      p.ammo[def.ammo] = Math.min(mCap, was + Math.round(def.amount * diff.ammoPickup * (w.ammoScale ?? 1)));
      (w.stats.gained ??= {})[def.ammo] = (w.stats.gained[def.ammo] || 0) + p.ammo[def.ammo] - was;
      took = true;
    } else if (def.type === 'key' && !p.keys.includes(def.key)) {
      p.keys.push(def.key);
      took = true;
    } else if (def.type === 'mod')
      took = addMod(p, def.mod); // a found mod stays with the gun for good
    else if (def.type === 'load' && p.weapons.includes(def.gun)) {
      const got = addLoad(
        p,
        def.gun,
        def.load,
        Math.round(def.amount * diff.ammoPickup * (w.ammoScale ?? 1)),
        Math.floor(ammoCap(WEAPONS[def.gun].ammo, w.upgrades) * AMMO_LOADS[def.load].cap),
      );
      took = got > 0;
    } else if (def.type === 'crate')
      took = takeCrate(w, p, def, (t) => ammoCap(t, w.upgrades), diff.ammoPickup * (w.ammoScale ?? 1)); // FREEZE F8
    else if (def.type === 'oil' && p.lamp && p.lamp.oil < p.lamp.max) {
      p.lamp.oil = Math.min(p.lamp.max, p.lamp.oil + def.amount);
      took = true;
    } // lamp oil (only where there is a lantern, and not past its tank)
    else if (def.type === 'weapon' && (!p.weapons.includes(def.weapon) || (def.ammo && (p.ammo[def.ammo] || 0) < mCap))) {
      if (!p.weapons.includes(def.weapon)) {
        p.weapons.push(def.weapon);
        p.weapons.sort((a, b) => ALL_WEAPONS.indexOf(a) - ALL_WEAPONS.indexOf(b));
        p.lastWeapon = p.weapon;
        p.weapon = def.weapon;
        if (isMelee(def.weapon)) p.meleeWeapon = def.weapon;
        p.switchT = WEAPONS[def.weapon].switchTime;
        p.charge = 0;
        p.swingT = -1;
      }
      if (def.ammo) {
        const was = p.ammo[def.ammo] || 0;
        p.ammo[def.ammo] = Math.min(mCap, was + Math.round(def.amount * diff.ammoPickup * (w.ammoScale ?? 1)));
        (w.stats.gained ??= {})[def.ammo] = (w.stats.gained[def.ammo] || 0) + p.ammo[def.ammo] - was;
      }
      took = true;
    }
    if (took) {
      w.pickups.splice(i, 1);
      if (def.type !== 'key' && !it.drop) w.stats.items++;
      emit(
        w,
        def.type === 'weapon' || def.type === 'mod' ? 'weapon_pickup' : 'pickup',
        def.type === 'key' && map.keyLabels?.[def.key] ? { kind: it.kind, label: map.keyLabels[def.key] } : { kind: it.kind },
      );
    }
  }
}

/** what the player has seen and found: the automap, messages, secrets */
export function noticePlace(w) {
  const p = w.player,
    map = w.map;
  if (w.tick === 1 || w.tick % EXPLORE_EVERY_TICKS === 0) {
    updateExplored(w);
    // in-world messages (transmissions, notes): shown once, the first time the player comes within range
    for (const m of map.messages)
      if (!w.messagesSeen.includes(m.id) && Math.hypot(p.x - m.x, p.z - m.z) <= m.r && (!m.choice || choiceHolds(w, m.choice)) && !messageHeld(w, m)) {
        w.messagesSeen.push(m.id);
        emit(w, 'message', { id: m.id, speaker: m.speaker || '', text: m.text });
      }
  } // automap: remember what has been seen

  // secrets: found when the player stands in one of the secret's cells
  const pcx = Math.floor(p.x / map.cell),
    pcz = Math.floor(p.z / map.cell);
  for (const s of map.secrets)
    if (!w.secretsFound.includes(s.id) && s.cells.some(([cx, cz]) => cx === pcx && cz === pcz)) {
      w.secretsFound.push(s.id);
      w.stats.secrets++;
      emit(w, 'secret', { id: s.id });
    }
}

/** the chimes, the beams, the triggers and the range */
export function updateScripts(w, dt) {
  const map = w.map;
  if (w.chimes) updateChimes(w, dt, emit); // the chime tree's phrase goes on
  if (w.beams) updateBeams(w); // the beams follow the mirrors and the doors
  updateTriggers(w);
  if (map.range) {
    rangePlayer(w, dt);
    rangePhys(w, dt);
  } // the dev range: you cannot die, run dry or stay hurt (range.js)
}

/** damage is settled first, so a player who dies this tick cannot also exit */
export function settleTick(w) {
  const p = w.player,
    map = w.map;
  // resolution order matters: damage is settled first, so a player who dies this tick cannot also exit
  if (p.hp <= 0) {
    p.hp = 0;
    w.status = 'dead';
    emit(w, 'player_died');
  } else {
    const near = map.exits.find((x) => Math.hypot(p.x - x.x, p.z - x.z) < 1.4 && Math.abs(floorAt(w, x.x, x.z) - p.y) < 1.5);
    if (near && w.exitLocked[near.id]) {
      if (w.tick % 90 === 0) emit(w, 'exit_locked', { x: near.x, z: near.z });
    } else if (near) {
      w.status = 'complete';
      w.endStats = {
        time: w.time,
        kills: w.stats.kills,
        items: w.stats.items,
        secrets: w.stats.secrets,
        total: w.stats.total,
        damageTaken: w.stats.damageTaken,
        dest: near.dest,
        ...(w.stats.innocents ? { innocents: w.stats.innocents } : {}),
      };
      emit(w, 'level_complete', { dest: near.dest });
    }
  }
}
