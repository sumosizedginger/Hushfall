// THE PROGRESSION AUDIT (PT-059, the first half of R9's "generated floors"; read-only): for every campaign in manifest order, what the MAIN route of each map leaves the player holding (guns found), against the entry loadout (`entryLoadout.weapons`) the NEXT main map of the campaign
// starts a cold start with. A cold start (verify-map, the bot gates, "Retry from the title") must be what a player who played the maps before it would have, so:
//   MISSING: a gun the main routes have already found that the next map's entry loadout does not list (a cold start is weaker than the campaign);
//   EXTRA: a gun the entry loadout lists that no earlier main route has found (a cold start is stronger than the campaign: the gates would be judged against a gun the player does not have yet).
// Node only (it plays every main route once, normal, seed 1). `node tools/dev/progression-audit.mjs [--json]`; `PROG_MAPS=C1E2M04,C1E2M05` limits it.
import fs from 'node:fs';
import path from 'node:path';
import { loadMapFile, loadRouteFile, runRoute } from '../../src/engine/harness.js';
import { ALL_WEAPONS } from '../../src/engine/defs.js';

const root = path.resolve(import.meta.dirname, '../..'), manifest = JSON.parse(fs.readFileSync(path.join(root, 'CAMPAIGN_MANIFEST.json'), 'utf8'));
const only = process.env.PROG_MAPS?.split(',');
const GUNS = new Set(ALL_WEAPONS.filter((id) => id !== 'fists'));
export function audit() {
  const rows = [];
  for (const c of [1, 2]) {
    const mains = manifest.maps.filter((m) => m.campaign === c && m.kind === 'main').sort((a, b) => a.order - b.order); let have = new Set(['flare']);
    for (let i = 0; i < mains.length; i++) {
      const m = mains[i]; if (only && !only.includes(m.id) && !only.includes(mains[i + 1]?.id)) { continue; }
      const map = loadMapFile(path.join(root, 'maps', m.id + '.json')), entry = new Set((map.entryLoadout?.weapons ?? ['flare']).filter((w) => GUNS.has(w)));
      const missing = [...have].filter((w) => !entry.has(w)), extra = [...entry].filter((w) => !have.has(w));
      const route = loadRouteFile(path.join(root, 'routes', m.id + '.main.route.json')), r = runRoute(map, route, { seed: 1, difficulty: 'normal' }), left = new Set(r.world.player.weapons.filter((w) => GUNS.has(w)));
      const found = [...left].filter((w) => !entry.has(w));
      rows.push({ id: m.id, entry: [...entry], missing, extra, found, result: r.result }); for (const w of left) have.add(w);
    }
  }
  return rows;
}
if (process.argv[1]?.endsWith('progression-audit.mjs')) {
  const rows = audit();
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
  else { for (const r of rows) console.log(`${r.id.padEnd(8)} entry [${r.entry.join(' ')}]${r.found.length ? '  finds ' + r.found.join(' ') : ''}${r.missing.length ? '  MISSING ' + r.missing.join(' ') : ''}${r.extra.length ? '  EXTRA ' + r.extra.join(' ') : ''}${r.result !== 'complete' ? '  (' + r.result + ')' : ''}`); const bad = rows.filter((r) => r.missing.length || r.extra.length); console.log(`${rows.length} maps, ${bad.length} with a floor that differs from the campaign`); }
}
