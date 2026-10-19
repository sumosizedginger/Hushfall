// PT-056 (R9): put the ammunition-load caches on the four maps the plan names, as a block `PT-056 ... end PT-056` in each map source, appended after every other entity (no id shifts), before the roster line (or before `export default MAP` where the map has none).
// Idempotent: a source that already has the block is left alone. Cells are in the AUTHORING frame. Run `node tools/mapkit/compile.mjs <ID>` afterwards, then `verify-map`. Node only.
//   node tools/dev/place-loads.mjs
import fs from 'node:fs';

const PLACEMENTS = {
  // slag (fire): the first of it, in a pocket of Kiln Row off the road (the kilns made it)
  C1E2M04: { why: 'slag shells and kiln rivets, in a pocket of the kiln row off the road', pickups: [['ld_slag_scattergun', 20, 33], ['ld_slag_rivet', 22, 33]] },
  // rime (cold): the Rime Vault itself, the first cache of it
  C1E2S01: { why: 'the first rime: shells, bolts and flares for the cold, in the vault', pickups: [['ld_rime_scattergun', 33, 21], ['ld_rime_harpoon', 33, 11], ['ld_rime_flare', 44, 17]] },
  // the penetrator: the Wreck Belt, for whoever looks off the road
  C1E4M02: { why: 'the first penetrators: rivets, bolts and rounds with a hardened tip, off the road in the wreck belt', pickups: [['ld_pen_rivet', 75, 37], ['ld_pen_harpoon', 75, 42], ['ld_pen_carbine', 67, 54]] },
  // rime again, ON the road: a main-path cache in the hub of Cold Dock (the airlocks are why it is cold)
  C1E4M03: { why: 'rime for the scattergun and the flare, in the hub of the cold dock, on the road', pickups: [['ld_rime_scattergun', 46, 52], ['ld_rime_flare', 46, 54]] },
};
for (const [id, { why, pickups }] of Object.entries(PLACEMENTS)) {
  const file = `maps-src/${id}.level.mjs`; let s = fs.readFileSync(file, 'utf8'); const eol = s.includes('\r\n') ? '\r\n' : '\n';
  if (s.includes('PT-056')) { console.log(id + ': already placed'); continue; }
  const block = [`// ---- PT-056 (R9, ammunition loads): ${why} ----`, 'MAP.entities ??= [];', `MAP.entities.push(...${JSON.stringify(pickups)}.map(([kind, x, z]) => ({ type: 'pickup', kind, at: [x, z] })));`, '// ---- end PT-056 ----', ''].join(eol);
  const anchor = s.includes('// ---- PT-052 R2: which kinds stand where') ? '// ---- PT-052 R2: which kinds stand where' : 'export default MAP;';
  const i = s.indexOf(anchor); if (i < 0 || s.indexOf(anchor, i + 1) >= 0) { console.error(id + ': no single anchor'); process.exit(1); }
  fs.writeFileSync(file, s.slice(0, i) + block + s.slice(i)); console.log(id + ': placed ' + pickups.length);
}
