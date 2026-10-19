// THE LICENCE AUDIT (PT-058, M2 of the commercial workstream; design/COMMERCIAL_AND_USAGE_PLAN.md): what ships in the game, whose it is, and under what terms. Node only, no network.
//   node tools/dev/license-audit.mjs [--json]
// It checks, from package-lock.json and the installed packages: (1) every PRODUCTION dependency (not marked dev in the lock) carries a permissive licence; (2) THIRD_PARTY_NOTICES.md names every one of them with its version;
// (3) package.json says UNLICENSED (proprietary) and a LICENSE file exists; (4) nothing in src/ imports a dev-only package (p5, p5.brush, pngjs, puppeteer, vite): the baker and the tools may, the shipped game may not; (5) index.html, look.html and pad.html load nothing from a CDN or a font host.
// Exit code 1 if any check fails. `auditLicences(root)` is the same thing as data, for tests/licences.test.js.
import fs from 'node:fs';
import path from 'node:path';

export const PERMISSIVE = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'CC0-1.0', 'Unlicense', 'BlueOak-1.0.0', 'Python-2.0']);
const DEV_ONLY = ['p5', 'p5.brush', 'pngjs', 'puppeteer', 'vite'];

const read = (p) => fs.readFileSync(p, 'utf8');
/** a licence field as one SPDX-ish string: "MIT", "(MIT OR Apache-2.0)" -> every alternative must be permissive for the package to pass only if at least one is: we take OR as "the user chooses", AND as "all apply" */
function permissive(expr) {
  if (!expr || typeof expr !== 'string') return false;
  const e = expr.replace(/[()]/g, ' ').trim();
  if (/\sAND\s/i.test(e)) return e.split(/\sAND\s/i).every((x) => PERMISSIVE.has(x.trim()));
  return e.split(/\sOR\s/i).some((x) => PERMISSIVE.has(x.trim()));
}
export function productionPackages(root) {
  const lock = JSON.parse(read(path.join(root, 'package-lock.json'))), out = [];
  for (const [key, p] of Object.entries(lock.packages ?? {})) {
    if (!key.startsWith('node_modules/') || p.dev || p.devOptional) continue;
    const name = key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length), file = path.join(root, key, 'package.json');
    const meta = fs.existsSync(file) ? JSON.parse(read(file)) : {};
    out.push({ name, version: p.version ?? meta.version, license: meta.license ?? p.license ?? null });
  }
  return out;
}
export function auditLicences(root) {
  const problems = [], prod = productionPackages(root), notices = fs.existsSync(path.join(root, 'THIRD_PARTY_NOTICES.md')) ? read(path.join(root, 'THIRD_PARTY_NOTICES.md')) : null;
  if (!prod.length) problems.push('no production dependency found in package-lock.json (three is expected)');
  for (const p of prod) {
    if (!permissive(p.license)) problems.push(`production dependency ${p.name}@${p.version} has licence ${JSON.stringify(p.license)}, which is not on the permissive list`);
    if (notices == null) continue;
    if (!notices.includes(p.name) || !notices.includes(String(p.version))) problems.push(`THIRD_PARTY_NOTICES.md does not name ${p.name}@${p.version}`);
  }
  if (notices == null) problems.push('THIRD_PARTY_NOTICES.md is missing');
  const pkg = JSON.parse(read(path.join(root, 'package.json')));
  if (pkg.license !== 'UNLICENSED') problems.push(`package.json licence is ${JSON.stringify(pkg.license)}; a proprietary game says UNLICENSED`);
  if (!fs.existsSync(path.join(root, 'LICENSE'))) problems.push('LICENSE is missing');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') || e.name.endsWith('.mjs') ? [path.join(d, e.name)] : []));
  const imp = /(?:^|\n)\s*(?:import\s[^;]*?from\s*|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
  for (const f of walk(path.join(root, 'src'))) {
    const s = read(f); let m; imp.lastIndex = 0;
    while ((m = imp.exec(s))) { const spec = m[1]; if (spec.startsWith('.') || spec.startsWith('/')) continue; const pkgName = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]; if (DEV_ONLY.includes(pkgName)) problems.push(`${path.relative(root, f)} imports the dev-only package ${pkgName}`); }
  }
  for (const h of ['index.html', 'look.html', 'pad.html']) { const f = path.join(root, h); if (fs.existsSync(f) && /https?:\/\/[^"')\s]*(googleapis|gstatic|cdn|unpkg|jsdelivr|cloudflare)/i.test(read(f))) problems.push(`${h} loads something from a CDN or a font host`); }
  return { production: prod, problems };
}
if (import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href || process.argv[1]?.endsWith('license-audit.mjs')) {
  const root = path.resolve(import.meta.dirname, '../..'), r = auditLicences(root);
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 1));
  else { console.log('production dependencies: ' + r.production.map((p) => `${p.name}@${p.version} (${p.license})`).join(', ')); console.log(r.problems.length ? r.problems.map((p) => 'FAIL ' + p).join('\n') : 'licence audit: OK'); }
  process.exit(r.problems.length ? 1 : 0);
}
