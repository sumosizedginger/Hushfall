// Writes `MAP.squeeze` into a map source (before `export default MAP`). Used by squeeze-map.mjs.   node tools/dev/squeeze-add.mjs <ID> '<json: a spec or a list of specs>' "<comment>"
import fs from 'node:fs';
import path from 'node:path';
const [id, json, comment] = process.argv.slice(2), f = `${path.resolve(import.meta.dirname, '../..')}/maps-src/${id}.level.mjs`; let s = fs.readFileSync(f, 'utf8'); const eol = s.includes('\r\n') ? '\r\n' : '\n';
if (s.includes('MAP.squeeze')) { console.error(id + ' already has a squeeze'); process.exit(1); }
const a = 'export default MAP;'; if (s.split(a).length !== 2) { console.error('no export default MAP (once)'); process.exit(1); }
const specs = JSON.parse(json), txt = JSON.stringify(specs).replace(/\},\{/g, '}, {').replace(/"axis"/g, 'axis').replace(/"cuts"/g, 'cuts').replace(/"([xz])"/g, "'$1'").replace(/\],\[/g, '], [');
const blk = [`// ---- PT-052 Level B: THE SQUEEZE (tools/mapkit/squeeze.mjs). ${comment}`, "// Everything above this line is in the AUTHORING frame; the shipped map is narrower and its routes are the waypoints with the same cuts (`node tools/dev/write-routes.mjs " + id + "`). Kit calls and the lane file stay in the authoring frame.", `MAP.squeeze = ${txt};`, "// ---- end PT-052 Level B squeeze ----", "", ""].join(eol);
s = s.replace(a, () => blk + a); fs.writeFileSync(f, s); console.log('squeeze added to', id);
