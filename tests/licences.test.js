// PT-058 (M2 of the commercial workstream): the shipped game carries only permissive third-party code, says so in THIRD_PARTY_NOTICES.md, is itself marked proprietary, and imports no dev-only package (tools/dev/license-audit.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { auditLicences, productionPackages, PERMISSIVE } from '../tools/dev/license-audit.mjs';
import { ROOT } from './helpers.js';

test('the licence audit passes: permissive production dependencies, noticed, proprietary package, no dev-only import in src, no CDN in a page', () => {
  const r = auditLicences(ROOT); assert.deepEqual(r.problems, []);
  assert.deepEqual(r.production.map((p) => p.name).sort(), ['sql.js', 'three'], 'three and sql.js (PT-077, the stats database) are what ships'); for (const p of r.production) assert.ok(PERMISSIVE.has(p.license), p.name);
});
test('the audit does fail when it should: an unknown licence, a missing notice and an import of a dev-only package are each a problem', async () => {
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path'); const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lic-'));
  try {
    fs.mkdirSync(path.join(dir, 'src')); fs.mkdirSync(path.join(dir, 'node_modules/leftpad'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', license: 'ISC' })); fs.writeFileSync(path.join(dir, 'package-lock.json'), JSON.stringify({ packages: { '': {}, 'node_modules/leftpad': { version: '1.0.0' } } }));
    fs.writeFileSync(path.join(dir, 'node_modules/leftpad/package.json'), JSON.stringify({ name: 'leftpad', version: '1.0.0', license: 'GPL-3.0' })); fs.writeFileSync(path.join(dir, 'src/a.js'), "import p5 from 'p5';\nimport { x } from './b.js';\n");
    const r = auditLicences(dir).problems.join('\n'); assert.match(r, /leftpad@1.0.0 has licence "GPL-3.0"/); assert.match(r, /THIRD_PARTY_NOTICES.md is missing/); assert.match(r, /UNLICENSED/); assert.match(r, /LICENSE is missing/); assert.match(r, /imports the dev-only package p5/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  assert.ok(productionPackages(ROOT).length >= 1);
});

test('the credits box on the title and the pause screen carries three.js\'s and sql.js\'s MIT notices word for word (the licences ask for the notice to travel with the game)', async () => {
  const fs = await import('node:fs'), path = await import('node:path'), lf = (t) => t.replace(/\r\n/g, '\n');   // a Windows checkout turns line endings into CRLF: the words are what is compared
  const html = lf(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')), notices = lf(fs.readFileSync(path.join(ROOT, 'THIRD_PARTY_NOTICES.md'), 'utf8'));
  const mit = notices.slice(notices.indexOf('The MIT License')).trim(), esc = mit.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  for (const id of ['credits-box', 'credits-box-pause']) assert.ok(html.includes(`id="${id}"`), id);
  assert.equal(html.split(esc).length - 1, 2, 'the whole notice, once in each box'); assert.match(html, /Two pieces of outside software are inside it\. It draws its 3D with three\.js/);
  const sq = notices.slice(notices.indexOf('## sql.js') + '## sql.js'.length, notices.indexOf('sql.js contains SQLite')).trim().replace(/&/g, '&amp;').replace(/</g, '&lt;');
  assert.ok(sq.startsWith('MIT license')); assert.equal(html.split(sq).length - 1, 2, 'sql.js\'s notice, once in each box (PT-077)');
});
