// PT-082: a map whose source exports `waypoints` gets its routes from tools/dev/write-routes.mjs, so a detour that tools/dev/add-secret-route.mjs --append put into routes/<ID>.secret.route.json is lost the
// next time the routes are written. This finds where the detour sits among the waypoints (by counting the ops each waypoint makes) and writes a splice into the source after `export const waypoints`,
// then checks that write-routes gives back exactly the route file it read.
//   node tools/dev/keep-detour.mjs <ID> [<op name>=crack]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const root = path.resolve(import.meta.dirname, '../..'), [id, opName = 'crack'] = process.argv.slice(2);
const srcFile = path.join(root, 'maps-src', id + '.level.mjs'), routeFile = path.join(root, 'routes', id + '.secret.route.json');
const route = JSON.parse(fs.readFileSync(routeFile, 'utf8')), ci = route.findIndex((o) => o.op === opName && !o._kept);
if (ci < 0) { console.log(id + ': no ' + opName + ' in the secret route'); process.exit(0); }
const mod = await import(pathToFileURL(srcFile).href + '?t=' + Date.now()), list = mod.waypoints.secret;
if (mod.default?.squeeze) { console.error(id + ': a squeezed map: add the detour in the authoring frame by hand'); process.exit(2); }
// the detour is the ops from the goto just before the crack to the first op after it that a waypoint made; find the waypoint whose ops end right before the detour starts
const ends = []; let n = 0; for (const w of list) { n += Array.isArray(w) ? (w[2] === 0 ? 1 : 2) : 1; ends.push(n); }
let start = ci; while (start > 0 && route[start - 1].op === 'goto' && !ends.includes(start - 1 + 1) ) start--;
const after = ends.indexOf(start); if (after < 0) { console.error(id + ': the detour does not start at a waypoint boundary (op ' + start + ')'); process.exit(2); }
let end = ci + 1; while (end < route.length && route[end].op === 'goto') end++;           // the gotos after the crack (in, out) belong to the detour, up to the next waypoint's first op
// how many of those trailing gotos are the detour's own: the route after them must be what the waypoints make from waypoint `after + 1` on
const expand = (ws) => ws.flatMap((w) => (Array.isArray(w) ? (w[2] === 0 ? [{ op: 'goto', at: [w[0], w[1]] }] : [{ op: 'goto', at: [w[0], w[1]] }, { op: 'kill' }]) : [w]));
const rest = JSON.stringify(expand(list.slice(after + 1)));
let cut = -1; for (let e = ci + 1; e <= end; e++) if (JSON.stringify(route.slice(e)) === rest) { cut = e; break; }
if (cut < 0) { console.error(id + ': cannot match the route after the detour to the waypoints'); process.exit(2); }
const detour = route.slice(start, cut).map((o) => (o.op === 'goto' ? [o.at[0], o.at[1], 0] : o));
const line = `{ const s = waypoints.secret; s.splice(${after + 1}, 0, ...${JSON.stringify(detour).replace(/"(\w+)":/g, '$1: ').replace(/"/g, "'").replace(/,/g, ', ')}); }          // PT-082: the ${opName} detour (add-secret-route.mjs), kept in the source so write-routes keeps it\n`;
let src = fs.readFileSync(srcFile, 'utf8'); const at = src.indexOf('\nexport default MAP;'); if (at < 0) throw new Error('no export default');
src = src.slice(0, at + 1) + line + src.slice(at + 1); fs.writeFileSync(srcFile, src);
const before = fs.readFileSync(routeFile, 'utf8'); execFileSync(process.execPath, ['tools/dev/write-routes.mjs', id], { cwd: root, stdio: 'ignore' });
const now = fs.readFileSync(routeFile, 'utf8'); console.log(id + ': detour of ' + detour.length + ' ops kept after waypoint ' + after + (now === before ? '; write-routes gives the same route' : '; WARNING: write-routes gives a different route'));
