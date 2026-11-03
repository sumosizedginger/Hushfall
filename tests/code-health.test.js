// PT-083 K1, K2, K3, K4, K5: the code stays readable. These hold what the mechanical pass made true.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { ROOT } from './helpers.js';

const require = createRequire(path.join(ROOT, 'package.json'));
const acorn = require('acorn');
const walkFiles = (dir) =>
  fs
    .readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .flatMap((d) => (d.isDirectory() ? walkFiles(dir + '/' + d.name) : d.name.endsWith('.js') ? [dir + '/' + d.name] : []));
const SRC = walkFiles('src');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('K1: no line of the source runs past 180 characters, except one that holds a text or a template the formatter cannot break', () => {
  const bad = [];
  const holdsText = (l) => l.includes('`') || (l.match(/'[^']*'|"[^"]*"/g) ?? []).reduce((n, s) => n + s.length, 0) > l.length * 0.25;
  for (const f of SRC) {
    let ticks = 0;
    read(f)
      .split('\n')
      .forEach((l, i) => {
        if (l.length > 180 && ticks % 2 === 0 && !holdsText(l)) bad.push(`${f}:${i + 1} (${l.length})`);
        ticks += (l.match(/`/g) ?? []).length;
      });
  }
  assert.deepEqual(bad, []);
});

// the longest functions of the simulation, by name. A function may leave this list or get shorter; it may not grow, and no other function may pass
// 150 lines.
const LONG = { validateKit: 568, updateEnemy: 347, tick: 270, validateMapChecks: 245, brainStep: 200, createWorld: 159 };
test('K2: no function of the simulation is over 150 lines but the few named here, and none of those grows; a tick is the ordered list of calls', () => {
  const bad = [];
  for (const f of SRC.filter((x) => x.startsWith('src/engine/'))) {
    const ast = acorn.parse(read(f), { ecmaVersion: 'latest', sourceType: 'module', locations: true });
    (function walk(n, name) {
      if (!n || typeof n !== 'object') return;
      if (Array.isArray(n)) return n.forEach((x) => walk(x, name));
      if (typeof n.type !== 'string') return;
      if (/Function/.test(n.type)) {
        const lines = n.loc.end.line - n.loc.start.line + 1,
          who = n.id?.name ?? name ?? '?';
        if (lines > (LONG[who] ?? 150)) bad.push(`${f} ${who}: ${lines} lines`);
      }
      for (const k of Object.keys(n))
        if (k !== 'loc')
          walk(
            n[k],
            n.type === 'VariableDeclarator' ? (n.id?.name ?? name) : n.type === 'Property' || n.type === 'MethodDefinition' ? (n.key?.name ?? name) : name,
          );
    })(ast);
  }
  assert.deepEqual(bad, []);
  const world = read('src/engine/world.js'),
    step = world.slice(world.indexOf('export function step('), world.indexOf('/** A fresh run'));
  assert.ok(step.split('\n').length < 80, 'step() stays a list of calls');
});

test('K3: every field of the shell state main.js and the hook use is declared and described in state.js', () => {
  const state = read('src/game/state.js'),
    declared = new Set([...state.matchAll(/^\s{4}([a-zA-Z]+)[:,]/gm)].map((m) => m[1])),
    used = new Set([...(read('src/game/main.js') + read('src/game/testhook.js')).matchAll(/\bg\.([a-zA-Z_]+)/g)].map((m) => m[1]));
  const missing = [...used].filter((n) => !declared.has(n));
  assert.deepEqual(missing, []);
});

test('K4: the history lives in design/history/CODE_NOTES.md, not in the source', () => {
  const bad = SRC.filter((f) => /\bPT-\d{3}\b/.test(read(f)));
  assert.deepEqual(bad, []);
  assert.ok(read('design/history/CODE_NOTES.md').length > 1000);
});

test('K5: the linter passes over the source', async () => {
  const { ESLint } = require('eslint');
  const results = await new ESLint({ cwd: ROOT }).lintFiles(['src/**/*.js']);
  const found = results.flatMap((r) => r.messages.map((m) => `${path.relative(ROOT, r.filePath)}:${m.line} ${m.ruleId} ${m.message}`));
  assert.deepEqual(found, []);
});

test('K5: the type checker passes over the simulation', () => {
  const tsc = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc'),
    r = spawnSync(process.execPath, [tsc, '-p', 'tsconfig.json'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout + r.stderr).slice(0, 2000));
});
