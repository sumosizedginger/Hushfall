// PT-057 (R9): put the weapon mods on the maps the plan names, as a block `PT-057 ... end PT-057` in each map source, appended after every other entity (no id shifts), before the roster line (or before `export default MAP` where the map has none).
// Idempotent: a source that already has the block is left alone. Cells are in the AUTHORING frame. Run `node tools/mapkit/compile.mjs <ID>` afterwards, then `verify-map`. Node only.
//   node tools/dev/place-mods.mjs
import fs from 'node:fs';

const PLACEMENTS = {
  // every mod lies OFF the road (the Director's law: rewards live off the lane, for people who look), in a bay or a corner with walls round it; cells are in the AUTHORING frame
  C1E3M06: { why: 'the rivet driver spin-up, in a corner of the choir loft off the aisle', pickups: [['mod_spinup', 14, 28]] },
  C1E4M05: { why: 'the arc lamp long chain, in a bay of the orchard off the road', pickups: [['mod_longchain', 43, 70]] },
  C2M01: { why: 'the scattergun double barrel, in a recess above the beach, off the road', pickups: [['mod_doublebarrel', 59, 37]] },
  C2M09: { why: 'the harpoon barbed bolt, in a niche of the sounding gate, off the road', pickups: [['mod_barbed', 61, 21]] },
  C2M13: { why: 'the flare cannon phosphor, in the far corner of the ossuary, off the road', pickups: [['mod_phosphor', 35, 72]] },
  C2M21: { why: 'the mortar airburst, in an alcove of the foundry, off the road', pickups: [['mod_airburst', 52, 16]] },
};
for (const [id, { why, pickups }] of Object.entries(PLACEMENTS)) {
  const file = `maps-src/${id}.level.mjs`; let s = fs.readFileSync(file, 'utf8'); const eol = s.includes('\r\n') ? '\r\n' : '\n';
  if (s.includes('PT-057')) { console.log(id + ': already placed'); continue; }
  const block = [`// ---- PT-057 (R9, weapon mods): ${why} ----`, 'MAP.entities ??= [];', `MAP.entities.push(...${JSON.stringify(pickups)}.map(([kind, x, z]) => ({ type: 'pickup', kind, at: [x, z] })));`, '// ---- end PT-057 ----', ''].join(eol);
  const anchor = s.includes('// ---- PT-052 R2: which kinds stand where') ? '// ---- PT-052 R2: which kinds stand where' : 'export default MAP;';
  const i = s.indexOf(anchor); if (i < 0 || s.indexOf(anchor, i + 1) >= 0) { console.error(id + ': no single anchor'); process.exit(1); }
  fs.writeFileSync(file, s.slice(0, i) + block + s.slice(i)); console.log(id + ': placed ' + pickups.length);
}
