// GROKS — static and idle-stand scans over every shipped map.
// One command: node attack/groks/fuzz/scan-logic.mjs
import { mapList, loadMap, createWorld, step, drainEvents, idle, writeOut } from './harness.mjs';

const findings = [];
function note(id, severity, title, detail) { findings.push({ id, severity, title, detail }); console.log(severity, id, title, detail ? '— ' + detail : ''); }

const choiceWrites = []; // { map, id, value }
const choiceReads = [];

for (const id of mapList()) {
  let map;
  try { map = loadMap(id); }
  catch (e) { note('parse-' + id, 'BLOCKER', id + ' does not parse', e.message); continue; }

  const enemies = map.entities.filter((e) => e.type === 'enemy');
  const groups = new Set(enemies.map((e) => e.group).filter(Boolean));
  const spawnedGroups = new Set();
  for (const t of map.triggers) for (const a of t.do || []) if (a.spawn?.group) spawnedGroups.add(a.spawn.group);
  for (const sw of map.switches) for (const a of sw.do || []) if (a.spawn?.group) spawnedGroups.add(a.spawn.group);

  const whens = [];
  const collect = (owner, when) => { if (Array.isArray(when)) when.forEach((w) => collect(owner, w)); else whens.push({ owner, when: String(when) }); };
  for (const t of map.triggers) collect(t.id, t.when);

  for (const { owner, when } of whens) {
    if (when.startsWith('not:not:')) note('notnot-' + id, 'MINOR', id + ' ' + owner + ' has a double not:', when);
    if (when.startsWith('choice:')) choiceReads.push({ map: id, owner, when });
    if (when.startsWith('lit:')) {
      const rid = when.slice(4);
      if (!(map.receivers || []).some((r) => r.id === rid)) note('lit-' + id + '-' + rid, 'MAJOR', id + ' lights a receiver that does not exist', owner + ' ' + when);
    }
  }
  for (const t of map.triggers) for (const a of t.do || []) if (a.choose) choiceWrites.push({ map: id, id: a.choose.id, value: a.choose.value, trigger: t.id });
  for (const sw of map.switches) for (const a of sw.do || []) if (a.choose) choiceWrites.push({ map: id, id: a.choose.id, value: a.choose.value, trigger: sw.id });

  // interlock partners
  for (const d of map.doors.values()) {
    if (!d.interlock) continue;
    const p = map.doorAt(d.interlock[0], d.interlock[1]);
    if (!p) note('lock-' + id, 'MAJOR', id + ' interlock door has no partner', d.cx + ',' + d.cz + ' -> ' + d.interlock);
    else if (!p.interlock || p.interlock[0] !== d.cx || p.interlock[1] !== d.cz) note('lock-back-' + id, 'MAJOR', id + ' interlock does not point back', d.cx + ',' + d.cz);
  }

  // vents
  for (const v of map.vents || []) {
    const [tx, tz] = v.to;
    if (tx < 0 || tz < 0 || tx >= map.w || tz >= map.h) note('vent-oob-' + id, 'MAJOR', id + ' vent lands outside the map', JSON.stringify(v.to));
    else if (map.kind(tx, tz) === 'void' || map.kind(tx, tz) === 'wall') note('vent-bad-' + id, 'MAJOR', id + ' vent lands on ' + map.kind(tx, tz), JSON.stringify(v.at) + ' -> ' + JSON.stringify(v.to));
  }

  // idle stand: 3 seconds, no input. Flag death, an exit, a big hp drop, and any trigger that is not `start`.
  try {
    const w = createWorld(map, { seed: 1, difficulty: 'normal' });
    const hp0 = w.player.hp;
    const fired = [];
    for (let i = 0; i < 180 && w.status === 'playing'; i++) {
      step(w, idle());
      for (const e of drainEvents(w)) if (e.type === 'trigger') fired.push(e.id);
    }
    const surprise = fired.filter((tid) => map.triggers.find((t) => t.id === tid)?.when !== 'start');
    if (w.status === 'dead') note('idle-dead-' + id, 'MAJOR', id + ' kills a player who does not move', 'hp ' + hp0 + ' -> 0 in 3s, triggers ' + surprise.join(','));
    else if (w.status === 'complete') note('idle-exit-' + id, 'BLOCKER', id + ' is completed by standing still', 'triggers ' + fired.join(','));
    else if (hp0 - w.player.hp >= 40) note('idle-hurt-' + id, 'MAJOR', id + ' deals ' + (hp0 - w.player.hp) + ' damage to a player who does not move', 'triggers ' + surprise.join(','));
    if (surprise.length) {
      const interesting = surprise.filter((tid) => {
        const t = map.triggers.find((x) => x.id === tid);
        const acts = JSON.stringify(t?.do || []);
        return /exit|spawn|seal|unlock|open|choose/.test(acts);
      });
      if (interesting.length) note('idle-trigger-' + id, 'MAJOR', id + ' fires a non-start trigger while the player stands on the spawn', interesting.join(',') + ' (all surprise: ' + surprise.join(',') + ')');
      else console.log('idle-benign', id, surprise.join(','));
    }
  } catch (e) {
    note('idle-throw-' + id, 'BLOCKER', id + ' threw while standing still', e.stack?.split('\n').slice(0, 4).join(' | '));
  }
}

// cross-map choices: a read of choice:id=value should have a writer of that id somewhere in the campaign
const written = new Set(choiceWrites.map((c) => c.id + '=' + c.value));
const writtenIds = new Set(choiceWrites.map((c) => c.id));
for (const r of choiceReads) {
  const body = r.when.slice(7);
  const neg = body.includes('!=');
  const [cid, val] = body.split(neg ? '!=' : '=');
  if (!writtenIds.has(cid)) note('choice-orphan-' + r.map, 'MAJOR', r.map + ' reads a choice nobody ever writes', r.when);
  else if (!neg && !written.has(cid + '=' + val)) note('choice-mismatch-' + r.map, 'MINOR', r.map + ' expects a choice value that is never written', r.when + ' writers=' + choiceWrites.filter((c) => c.id === cid).map((c) => c.map + ':' + c.value).join('|'));
}
console.log('choice writes', choiceWrites.map((c) => c.map + ':' + c.id + '=' + c.value).join(' ; '));

console.log('\nFINDINGS', findings.length);
writeOut('scan-logic.json', { findings, choiceWrites, choiceReads });
if (findings.some((f) => f.severity === 'BLOCKER' || f.severity === 'MAJOR')) process.exitCode = 2;
