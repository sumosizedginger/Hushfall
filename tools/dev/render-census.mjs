// RENDER TRUTH census (PT-001 / PT-002). The sim gate proves where actors ARE; this proves where they are DRAWN.
// Runs inside a live game page (the dev-only __GAME_TEST__ hook): every enemy of every shipped map, in every state the view can draw, is
// compared with the sim's authoritative ground. A violation fails the browser check, so "enemy drawn under the floor" cannot pass the gate again.
//
// Per enemy (GameView.enemyBounds): sim x/y/z, ground = groundAt(world, x, z, radius) (the SAME contract the sim uses, not the centre-cell floor),
// rendered root world position, exact world-space vertex bounds of what is on screen, frozen/live. A row is judged on:
//   placement  root == sim (x, y, z)                      - the view puts the rig where the sim says it stands
//   sim        sim.y == ground                            - the sim's own actor height is not stale (corpses/stunned on moving floors)
//   footprint  the sim's x/z axis passes through the drawn body (a merged sleeper baked at the wrong scale/offset is metres away from where it stands)
//   contact    lowest rendered vertex within GROUND_BAND  - not buried, not hovering (src/render/ground-contract.js)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { GROUND_BAND, groundVerdict } from '../../src/render/ground-contract.js';

const EPS = 1e-3, RAISED = 0.25;
const r3 = (x) => Math.round(x * 1000) / 1000;

/** judge census rows; returns {n, raised, bad[], worstBuried, worstFloat} */
export function judge(rows, tag) {
  const bad = []; let worstBuried = 0, worstFloat = 0, raised = 0;
  for (const r of rows) {
    const v = groundVerdict(r.min[1], r.ground), problems = [];
    if (r.ground > RAISED) raised++;
    if (Math.hypot(r.root.x - r.sim.x, r.root.z - r.sim.z) > EPS || Math.abs(r.root.y - r.sim.y) > EPS) problems.push(`placement: root (${r3(r.root.x)}, ${r3(r.root.y)}, ${r3(r.root.z)}) != sim (${r3(r.sim.x)}, ${r3(r.sim.y)}, ${r3(r.sim.z)})`);
    { const pad = r.hit.radius + 0.1; if (r.sim.x < r.min[0] - pad || r.sim.x > r.max[0] + pad || r.sim.z < r.min[2] - pad || r.sim.z > r.max[2] + pad) problems.push(`footprint: the sim position (${r3(r.sim.x)}, ${r3(r.sim.z)}) is outside the drawn body (x ${r3(r.min[0])}..${r3(r.max[0])}, z ${r3(r.min[2])}..${r3(r.max[2])})`); }
    if (Math.abs(r.sim.y - r.ground) > EPS) problems.push(`sim: e.y ${r3(r.sim.y)} is stale, ground under the footprint is ${r3(r.ground)}`);
    if (!v.ok) problems.push(`contact: lowest vertex ${r3(r.min[1])} is ${v.off < 0 ? 'buried ' + r3(-v.off) : 'hovering ' + r3(v.off)} m (band -${GROUND_BAND.buried}/+${GROUND_BAND.floating})`);
    worstBuried = Math.min(worstBuried, v.off); worstFloat = Math.max(worstFloat, v.off);
    if (problems.length) bad.push({ tag, label: r.label, id: r.id, kind: r.kind, state: r.state, dead: r3(r.dead ?? 0), frozen: r.frozen, ground: r3(r.ground), problems });
  }
  return { n: rows.length, raised, bad, worstBuried: r3(worstBuried), worstFloat: r3(worstFloat) };
}

/** a point `dist` m from (ex, ez) with an unobstructed, same-height walk to it, and the yaw that looks back at the enemy (for screenshots) */
function vantage(m, ex, ez, dist = 5) {
  const S = m.cell, g0 = m.floor(Math.floor(ex / S), Math.floor(ez / S));
  for (let k = 0; k < 16; k++) {
    const a = k * Math.PI / 8; let ok = true;
    for (let d = 0.5; d <= dist && ok; d += 0.5) { const cx = Math.floor((ex + Math.cos(a) * d) / S), cz = Math.floor((ez + Math.sin(a) * d) / S); ok = ['floor', 'outdoor'].includes(m.kind(cx, cz)) && Math.abs(m.floor(cx, cz) - g0) < 0.5 && !m.props.some((p) => Math.hypot(p.x - (ex + Math.cos(a) * d), p.z - (ez + Math.sin(a) * d)) < 1.0); }
    if (ok) { const px = ex + Math.cos(a) * dist, pz = ez + Math.sin(a) * dist; return { x: px, z: pz, yaw: Math.atan2(-(ex - px), -(ez - pz)) }; }
  }
  return null;
}

export async function runRenderCensus({ T, root, check, shot = null, log = console.log }) {
  const defs = await import(pathToFileURL(path.join(root, 'src/engine/defs.js')).href), { ENEMIES } = defs;
  const { parseMap } = await import(pathToFileURL(path.join(root, 'src/engine/mapformat.js')).href);
  const mapIds = fs.readdirSync(path.join(root, 'maps')).filter((f) => /^C\dE\d[MS]\d\d\.json$/.test(f)).map((f) => f.replace('.json', '')).sort();
  const rows = async () => T('t.enemyBounds()');
  const report = { band: GROUND_BAND, maps: {}, movingFloors: [], cantor: null, shots: [] };
  const all = { asleep: [], awake: [], matrix: [], dying: [], corpses: [] }, kindsSeen = new Set(), hitVolume = {}; let raisedEnemies = 0, totalEnemies = 0;

  for (const id of mapIds) {
    const m = parseMap(JSON.parse(fs.readFileSync(path.join(root, 'maps', id + '.json'), 'utf8'))), entry = report.maps[id] = {};
    await T(`t.newGame('normal', 3, { mapId: '${id}' })`); await T('t.setup_player({ hp: 100000 })'); await T('t.tick(2)');
    // 1. asleep: every sleeper is one merged mesh baked at the height it stands on
    let rs = await rows(); entry.enemies = rs.length; totalEnemies += rs.length; for (const r of rs) kindsSeen.add(r.kind); raisedEnemies += rs.filter((r) => r.ground > RAISED).length;
    entry.asleep = judge(rs, id + ' asleep'); entry.frozen = rs.filter((r) => r.frozen).length; all.asleep.push(entry.asleep);
    // 2. awake: wake everything and let it chase (states fall out of the real AI: walk, attack, lunge, charge...)
    await T('t.setup_wakeAll(); t.tick(45)'); rs = await rows(); entry.awake = judge(rs, id + ' awake'); all.awake.push(entry.awake);
    await T('t.tick(60)'); rs = await rows(); const a2 = judge(rs, id + ' awake+60'); entry.awake.n += a2.n; entry.awake.bad.push(...a2.bad); entry.awake.worstBuried = Math.min(entry.awake.worstBuried, a2.worstBuried); entry.awake.worstFloat = Math.max(entry.awake.worstFloat, a2.worstFloat);
    // 3. pose matrix: force every drawn state onto the highest and lowest floor of each kind (through the real view path), render without ticking
    await T(`t.newGame('normal', 3, { mapId: '${id}' })`); await T('t.setup_player({ hp: 100000 })'); await T('t.tick(2)'); rs = await rows();
    const pick = new Map(); for (const r of rs) { const k = r.kind, cur = pick.get(k) ?? { lo: r, hi: r }; if (r.ground > cur.hi.ground) cur.hi = r; if (r.ground < cur.lo.ground) cur.lo = r; pick.set(k, cur); }
    const matrixRows = [];
    for (const [kind, { lo, hi }] of pick) for (const sel of new Set([lo.id, hi.id])) {
      const d = ENEMIES[kind], reset = { state: 'chase', walk: 0, phase: 0, attackT: -1, lungeT: -1, chargeT: -1, channelT: -1, pulseT: -1, stunT: 0, dead: 0, flash: 0 };
      const states = [['stand', {}], ['walk', { walk: 1, phase: 1.1 }], ['walk-wide', { walk: 1, phase: 2.2 }], ['walk-late', { walk: 1, phase: 4.1 }], ['attack-windup', { attackT: 0.3 * d.attack.duration }], ['attack-slam', { attackT: 0.7 * d.attack.duration }], ['stunned', { stunT: 5 }], ['flash', { flash: 1 }]];
      if (d.lunge) states.push(['lunge-crouch', { lungeT: 0.5 * d.lunge.windup }], ['lunge-crouch-deep', { lungeT: 0.95 * d.lunge.windup }], ['lunge-dash', { lungeT: d.lunge.windup + 0.15, walk: 1 }]);
      if (d.charge) states.push(['charge-windup', { chargeT: 0.6 * d.charge.windup }]);
      if (d.support) states.push(['channel', { channelT: 0.4 }]);
      if (d.boss) states.push(['pulse-windup', { pulseT: 0.6 * d.pulse.windup }]);
      states.push(['dying 0.25', { state: 'dead', dead: 0.25 }], ['dying 0.5', { state: 'dead', dead: 0.5 }], ['dying 0.8', { state: 'dead', dead: 0.8 }], ['dead', { state: 'dead', dead: 1 }], ['resurrected', { ...reset }]);
      for (const [name, f] of states) {
        await T(`t.setup_enemy(${sel}, ${JSON.stringify({ ...reset, ...f })}); t.render()`);
        const row = (await rows()).find((x) => x.id === sel); row.label = `${kind}#${sel}@${r3(row.ground)}m ${name}`; matrixRows.push(row);
      }
    }
    entry.matrix = judge(matrixRows, id + ' pose'); all.matrix.push(entry.matrix);
    for (const r of matrixRows) if (r.label.endsWith(' stand') && !hitVolume[r.kind]) hitVolume[r.kind] = { drawnHeight: r3(r.max[1] - r.min[1]), hitHeight: r.hit.height, drawnAboveHit: r3(Math.max(0, r.max[1] - (r.sim.y + r.hit.height))), hitCoversFractionOfDrawn: r3(Math.min(1, r.hit.height / (r.max[1] - r.min[1]))), hitRadius: r.hit.radius, drawnWidthX: r3(r.max[0] - r.min[0]) };
    // 4. the death blend and the corpses it leaves, from the real AI/sim path (a body is drawn for the rest of the level)
    await T(`t.newGame('normal', 3, { mapId: '${id}' })`); await T('t.setup_player({ hp: 100000 })'); await T('t.tick(2)');
    await T(`for (const e of window.__GAME_TEST__.enemyBounds()) window.__GAME_TEST__.setup_enemy(e.id, { state: 'dead', hp: 0, attackT: -1, lungeT: -1, chargeT: -1, channelT: -1, pulseT: -1 });`);
    await T('t.tick(12)'); entry.dying = judge(await rows(), id + ' dying'); all.dying.push(entry.dying);
    await T('t.tick(40)'); rs = await rows(); entry.corpses = judge(rs, id + ' corpses'); all.corpses.push(entry.corpses); entry.corpseRaised = entry.corpses.raised;
    log(`census ${id}: ${entry.enemies} enemies (${rs.filter((r) => r.ground > RAISED).length} raised) asleep ${entry.asleep.bad.length} bad / awake ${entry.awake.bad.length} / poses ${entry.matrix.n} rows ${entry.matrix.bad.length} bad / corpses ${entry.corpses.bad.length} bad`);

    // screenshots of the encounters the owner reported: the highest floor with enemies, awake and chasing, then the corpse it leaves
    if (shot && ['C1E1M01', 'C1E1M02', 'C1E1M04', 'C1E1M05', 'C1E1M08'].includes(id)) {
      await T(`t.newGame('normal', 3, { mapId: '${id}' })`); await T('t.setup_player({ hp: 100000 })'); await T('t.tick(2)');
      const cand = (await rows()).filter((r) => r.kind !== 'bellnode' && (id !== 'C1E1M08' || r.kind === 'wardengraft' || r.kind === 'sexton')).sort((x, y) => y.ground - x.ground || x.id - y.id);
      for (const c of cand) { const vp = vantage(m, c.sim.x, c.sim.z, id === 'C1E1M01' ? 6 : 4.5); if (!vp) continue;
        await T(`t.setup_teleport(${vp.x}, ${vp.z}, ${vp.yaw}); t.setup_enemy(${c.id}, { state: 'chase', lastX: ${vp.x}, lastZ: ${vp.z} }); t.clearOverlays(); t.tick(14)`); report.shots.push(await shot(`${id}-${c.kind}-on-${r3(c.ground)}m-awake`));
        await T(`t.setup_enemy(${c.id}, { state: 'dead', hp: 0, attackT: -1, lungeT: -1 }); t.tick(45)`); report.shots.push(await shot(`${id}-${c.kind}-on-${r3(c.ground)}m-corpse`)); break; }
    }
  }

  // 5. MOVING FLOORS: sleepers, a staggered enemy, a corpse and a chaser stand on a lift while it travels both ways
  for (const [mapId, secId] of [['C1E1M05', 'car'], ['C1E1M06', 'ramp']]) {
    const src = JSON.parse(fs.readFileSync(path.join(root, 'maps', mapId + '.json'), 'utf8')), sec = src.sectors?.find((s) => s.id === secId); if (!sec) continue;
    const S = parseMap(src).cell, cells = sec.cells.slice(0, 4).map(([cx, cz]) => [(cx + 0.5) * S, (cz + 0.5) * S]), entry = { map: mapId, sector: secId, low: sec.low, high: sec.high, phases: [] };
    await T(`t.newGame('normal', 3, { mapId: '${mapId}' })`); await T('t.setup_player({ hp: 100000 })'); await T('t.tick(2)');
    const ids = {}; const kinds = ['idle', 'stunned', 'dead', 'chase'];
    for (let i = 0; i < kinds.length; i++) { const [x, z] = cells[i], k = kinds[i];
      ids[k] = await T(`t.setup_spawnEnemy('tollbearer', ${x}, ${z}, 3.14, '${k === 'idle' ? 'idle' : 'chase'}')`);
      if (k === 'stunned') await T(`t.setup_enemy(${ids[k]}, { stunT: 100000 })`);
      if (k === 'dead') await T(`t.setup_enemy(${ids[k]}, { state: 'dead', hp: 0, dead: 1 })`);
    }
    const mine = async (tag) => { const rs = (await rows()).filter((r) => Object.values(ids).includes(r.id)); for (const r of rs) r.label = `${mapId}/${secId} ${Object.keys(ids).find((k) => ids[k] === r.id)} ${tag}`; return rs; };
    await T('t.tick(4)'); let rs = await mine('at rest'); entry.phases.push(judge(rs, `${mapId} lift at rest`));
    for (const pos of ['high', 'low']) {
      await T(`t.setup_sectorTo('${secId}', '${pos}')`); await T('t.tick(12)'); rs = await mine(`moving to ${pos}`); entry.phases.push(judge(rs, `${mapId} lift moving to ${pos}`));
      const goal = pos === 'high' ? sec.high : sec.low;
      for (let i = 0; i < 60; i++) { rs = await mine(`arrived ${pos}`); if (Math.abs(rs.find((r) => r.id === ids.dead).ground - goal) < 1e-6) break; await T('t.tick(15)'); }
      await T('t.tick(3)'); rs = await mine(`arrived ${pos}`); entry.phases.push(judge(rs, `${mapId} lift arrived ${pos}`));
    }
    entry.moved = true; report.movingFloors.push(entry);
    log(`census moving floor ${mapId}/${secId}: ${entry.phases.map((p) => p.bad.length).join('/')} bad per phase`);
  }

  // 6. THE CANTOR: body, shield and ring occupy the same space; severing the ring takes the shield and the beams with it
  {
    await T(`t.newGame('normal', 3, { mapId: 'C1E1M08' })`); await T('t.setup_player({ hp: 100000 })'); await T('t.tick(3)');
    const rs = await rows(), boss = rs.find((r) => r.kind === 'cantor'), nodes = rs.filter((r) => r.kind === 'bellnode'), probe = await T('t.encounterProbe()'), c = { found: !!boss, nodes: nodes.length, problems: [] };
    if (boss) {
      const cx = (boss.min[0] + boss.max[0]) / 2, cz = (boss.min[2] + boss.max[2]) / 2; c.body = { min: boss.min.map(r3), max: boss.max.map(r3), height: r3(boss.max[1] - boss.min[1]), ground: boss.ground, hitHeight: boss.hit.height, hitRadius: boss.hit.radius };
      c.bodyCentreOffsetFromSim = r3(Math.hypot(cx - boss.sim.x, cz - boss.sim.z));
      if (c.bodyCentreOffsetFromSim > boss.hit.radius) c.problems.push(`rendered body centre is ${c.bodyCentreOffsetFromSim} m from the sim position (hit radius ${boss.hit.radius})`);
      if (!probe.shield) c.problems.push('no shield is drawn while the ring stands');
      else {
        const s = probe.shield; c.shield = { x: r3(s.x), y: r3(s.y), z: r3(s.z), r: r3(s.r) };
        if (Math.hypot(s.x - boss.sim.x, s.z - boss.sim.z) > 0.15) c.problems.push('shield is not centred on the body horizontally');
        if (s.y < boss.min[1] || s.y > boss.max[1]) c.problems.push(`shield centre y ${r3(s.y)} is outside the body ${r3(boss.min[1])}..${r3(boss.max[1])}`);
        let far = 0; for (const x of [boss.min[0], boss.max[0]]) for (const y of [boss.min[1], boss.max[1]]) for (const z of [boss.min[2], boss.max[2]]) far = Math.max(far, Math.hypot(x - s.x, y - s.y, z - s.z));
        c.farthestBodyCornerFromShieldCentre = r3(far); if (far > s.r * 1.1) c.problems.push(`the body pokes out of the shield (corner ${r3(far)} m from its centre, radius ${r3(s.r)})`);
      }
      const inside = (p, r, pad) => p[0] >= r.min[0] - pad && p[0] <= r.max[0] + pad && p[1] >= r.min[1] - pad && p[1] <= r.max[1] + pad && p[2] >= r.min[2] - pad && p[2] <= r.max[2] + pad;
      c.ring = nodes.map((n) => ({ id: n.id, distFromBoss: r3(Math.hypot(n.sim.x - boss.sim.x, n.sim.z - boss.sim.z)), groundDelta: r3(n.ground - boss.ground) }));
      for (const n of nodes) {
        const beam = probe.beams.find((b) => b.key === 'nk' + n.id); if (!beam) { c.problems.push(`node ${n.id} has no link drawn`); continue; }
        if (!inside(beam.b, boss, 0.2)) c.problems.push(`node ${n.id}'s link ends at (${beam.b.map(r3)}), outside the Cantor's drawn body`);
        if (!inside(beam.a, n, 0.2)) c.problems.push(`node ${n.id}'s link starts at (${beam.a.map(r3)}), outside that node's drawn body`);
      }
      if (nodes.length < 6) c.problems.push(`only ${nodes.length} ring nodes found`);
      const ringRows = judge(rs, 'C1E1M08 chamber'); c.contact = { bad: ringRows.bad.length, worstBuried: ringRows.worstBuried, worstFloat: ringRows.worstFloat }; if (ringRows.bad.length) c.problems.push(`${ringRows.bad.length} chamber enemies violate the ground contract`);
      if (shot) { const m = parseMap(JSON.parse(fs.readFileSync(path.join(root, 'maps/C1E1M08.json'), 'utf8'))), vp = vantage(m, boss.sim.x, boss.sim.z, 9);
        if (vp) { await T(`t.setup_teleport(${vp.x}, ${vp.z}, ${vp.yaw}); t.clearOverlays(); t.tick(4)`); report.shots.push(await shot('C1E1M08-cantor-body-shield-ring')); } }
      // severing the ring: shield and links go
      await T(`for (const n of window.__GAME_TEST__.enemyBounds().filter((r) => r.kind === 'bellnode')) window.__GAME_TEST__.setup_enemy(n.id, { state: 'dead', hp: 0 });`); await T('t.tick(30)');
      const after = await T('t.encounterProbe()'); c.afterSevering = { shield: after.shield, beams: after.beams.length };
      if (after.shield || after.beams.length) c.problems.push('the shield or ring links are still drawn after every node is severed');
      const rsAfter = await rows(), bossAfter = rsAfter.find((r) => r.kind === 'cantor'), nodesAfter = rsAfter.filter((r) => r.kind === 'bellnode'); const ja = judge([bossAfter, ...nodesAfter], 'C1E1M08 severed'); if (ja.bad.length) c.problems.push(`after severing, ${ja.bad.length} rigs violate the ground contract`);
    } else c.problems.push('no Cantor in C1E1M08');
    report.cantor = c; log(`census Cantor: ${c.problems.length ? c.problems.join(' | ') : 'body, shield and ring agree'}`);
  }

  // ---- verdicts -----------------------------------------------------------------------------------------------------------------------
  const sum = (list) => list.reduce((a, j) => ({ n: a.n + j.n, raised: a.raised + j.raised, bad: a.bad.concat(j.bad), worstBuried: Math.min(a.worstBuried, j.worstBuried), worstFloat: Math.max(a.worstFloat, j.worstFloat) }), { n: 0, raised: 0, bad: [], worstBuried: 0, worstFloat: 0 });
  const moving = sum(report.movingFloors.flatMap((f) => f.phases)), tot = Object.fromEntries(Object.entries(all).map(([k, v]) => [k, sum(v)]));
  const line = (s) => `${s.n} rows (${s.raised} on raised floors), ${s.bad.length} violations, deepest ${s.worstBuried} m, highest ${s.worstFloat} m` + (s.bad.length ? ' | e.g. ' + s.bad.slice(0, 2).map((b) => `${b.label ?? b.kind + '#' + b.id} ${b.problems[0]}`).join(' ; ') : '');
  const need = ['tollbearer', 'gaunt', 'bellhand', 'sexton', 'wardengraft', 'cantor', 'bellnode'];
  check(`render truth coverage: ${mapIds.length} maps, all 7 enemy kinds, ${raisedEnemies} enemies on raised floors (a census that saw nothing would pass vacuously)`, mapIds.length >= 9 && need.every((k) => kindsSeen.has(k)) && raisedEnemies >= 60 && tot.matrix.n >= 300, `kinds ${[...kindsSeen].join(',')}; raised ${raisedEnemies}; pose rows ${tot.matrix.n}`);
  check('render truth: every SLEEPING enemy (merged mesh) of every shipped map is drawn where the sim stands it, on its floor', tot.asleep.bad.length === 0 && tot.asleep.n === totalEnemies && totalEnemies > 0, line(tot.asleep) + `; every one of the ${totalEnemies} enemies was measured: ${tot.asleep.n === totalEnemies}`);
  check('render truth: every AWAKE enemy (chasing, attacking, lunging, charging) of every shipped map is drawn on its floor', tot.awake.bad.length === 0 && tot.awake.n === 2 * totalEnemies && totalEnemies > 0, line(tot.awake) + `; two samples of all ${totalEnemies} enemies: ${tot.awake.n === 2 * totalEnemies}`);
  check('render truth: every kind in every pose (stride, windups, crouch, dash, stagger, death blend, resurrection) on its highest and lowest floor stays inside the ground band', tot.matrix.bad.length === 0, line(tot.matrix));
  check('render truth: dying and dead enemies lie ON their floor on every map, flat and raised (no half-sunk corpses)', tot.dying.bad.length === 0 && tot.corpses.bad.length === 0 && tot.corpses.n >= totalEnemies && tot.dying.n >= totalEnemies, `dying: ${line(tot.dying)} || corpses: ${line(tot.corpses)}`);
  check('render truth: sleepers, a staggered enemy, a corpse and a chaser on a MOVING floor stay on it while it travels up and down (funicular car, ramp)', report.movingFloors.length >= 2 && moving.bad.length === 0 && moving.n >= 40, line(moving));
  check('render truth: the Cantor\'s body, shield and ring nodes occupy the same encounter space, and severing the ring removes the shield and links', !!report.cantor && report.cantor.problems.length === 0 && report.cantor.nodes === 6, report.cantor ? (report.cantor.problems.join(' | ') || `body ${report.cantor.body.height} m tall on ${report.cantor.body.ground} m, shield r ${report.cantor.shield?.r}, ${report.cantor.nodes} nodes`) : 'none');
  report.hitVolume = hitVolume;
  report.totals = Object.fromEntries(Object.entries(tot).map(([k, s]) => [k, { rows: s.n, raised: s.raised, violations: s.bad.length, deepest: s.worstBuried, highest: s.worstFloat }])); report.totals.movingFloors = { rows: moving.n, violations: moving.bad.length, deepest: moving.worstBuried, highest: moving.worstFloat };
  report.violations = [...Object.values(tot).flatMap((s) => s.bad), ...moving.bad].slice(0, 60); report.violationCount = [...Object.values(tot), moving].reduce((a, s) => a + s.bad.length, 0);
  return report;
}
