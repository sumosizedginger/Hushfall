// PT-043: the findability lint (tools/dev/findable.mjs; design/ACTC.md section 0, law 1) holds the maps that were fixed for it, and says so when a lever is hidden. C2M13's winch (the owner: "it is impossible to find the switch") stands on the lane, has a lantern and
// a hint; C2M09's lever too. The lint also has to FAIL a map whose lever is off the lane, unlit and unmentioned (a copy of C2M13 with its winch moved, its lantern and its messages taken away).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './helpers.js';

const run = (args) => spawnSync(process.execPath, [path.join(ROOT, 'tools/dev/findable.mjs'), ...args], { cwd: ROOT, encoding: 'utf8' });

test('the maps that were fixed for it pass the findability lint', () => {
  const r = run(['C2M13', 'C2M09']); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /ok\s+C2M13/); assert.match(r.stdout, /ok\s+C2M09/);
});

test('a lever off the lane, unlit and unmentioned FAILS it', () => {
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps/C2M13.json'), 'utf8')), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'findable-'));
  src.atmosphere = { ...src.atmosphere, dark: false };                                            // not a dark place: a lamp is then needed within 4 cells
  src.messages = []; src.triggers = src.triggers.map((t) => ({ ...t, do: t.do.filter((a) => !a.objective && !a.message) })).filter((t) => t.do.length);
  src.objective = 'Go on.'; src.entities = src.entities.filter((e) => !(e.type === 'prop' && ['lamp', 'lantern', 'lamppost'].includes(e.kind)));
  const sw = src.entities.find((e) => e.type === 'switch'); assert.ok(sw); sw.at = [3, 3];
  fs.writeFileSync(path.join(dir, 'C2M13.json'), JSON.stringify(src));
  const r = run(['--dir=' + path.relative(ROOT, dir).replace(/\\/g, '/'), 'C2M13']); assert.equal(r.status, 1, r.stdout + r.stderr); assert.match(r.stdout, /LANE/); assert.match(r.stdout, /LIT/); assert.match(r.stdout, /HINT/);
});
