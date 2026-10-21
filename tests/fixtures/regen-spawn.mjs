// Run the real regeneration CLI with controlled child outcomes, without starting a browser or changing evidence.
import child from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { syncBuiltinESMExports } from 'node:module';

const scenario = process.env.HUSHFALL_REGEN_SCENARIO;
const read = fs.readFileSync;
fs.readFileSync = function (file, ...args) {
  if (String(file).replaceAll('\\', '/').endsWith('/validation/browser-check.json')) {
    if (scenario === 'malformed-browser-evidence') return '{';
    if (scenario === 'empty-browser-checks') return JSON.stringify({ checks: [], errors: [] });
    if (scenario === 'failed-browser-check') return JSON.stringify({ checks: [{ ok: false }], errors: [] });
    if (scenario === 'browser-page-error') return JSON.stringify({ checks: [{ ok: true }], errors: ['controlled page error'] });
    return JSON.stringify({ checks: [{ ok: true }], errors: [] });
  }
  return read.call(this, file, ...args);
};
child.spawnSync = (command, args) => {
  if (command === 'git') return { status: 0, stdout: args[0] === 'rev-parse' ? 'fixture\n' : '', stderr: '' };
  let step, output = '', log;
  if (command === 'powershell') {
    log = args[3]; step = args[4].endsWith('browser-check.mjs') ? 1 : 2;
    output = step === 1 ? '1/1 checks passed\n' : fs.readdirSync('maps').filter((f) => f.endsWith('.json')).map((f) => `${path.basename(f, '.json')}: 1/1 real-game checks passed (1s)`).join('\n');
    if (scenario === 'incomplete-browser-maps') output = '';
    if (step === 2 && scenario === 'duplicate-browser-maps') output = output.split('\n').map((line, i, rows) => i === 1 ? rows[0] : line).join('\n');
    if (step === 2 && scenario === 'failed-browser-map') output = output.replace('1/1', '0/1');
    fs.writeFileSync(log, output);
  } else if (args[0] === '--test') { step = 5; output = '# pass 1\n# fail 0\n'; }
  else if (args[0].endsWith('verify-map.mjs')) { step = 3; output = 'PASS fixture\n'; }
  else if (args[0].endsWith('validate.mjs')) { step = args.includes('--status') ? 'status' : 4; output = 'OK\n'; }
  else throw new Error('Unexpected child: ' + command + ' ' + args.join(' '));
  if (scenario === `fail-${step}`) return { status: 7, stdout: output, stderr: 'controlled failure\n' };
  if (scenario === 'signal-browser' && step === 1) return { status: null, signal: 'SIGTERM', stdout: '', stderr: '' };
  if (scenario === 'missing-browser-log' && step === 1) { fs.unlinkSync(log); return { status: null, error: new Error('controlled launch failure') }; }
  if (scenario === 'test-fail-count' && step === 5) output = '# pass 1\n# fail 1\n';
  if (scenario === 'missing-test-totals' && step === 5) output = 'interrupted before totals\n';
  if (scenario === 'verify-fail-line' && step === 3) output = 'FAIL controlled gate failure\n';
  return { status: 0, stdout: output, stderr: '' };
};
syncBuiltinESMExports();
