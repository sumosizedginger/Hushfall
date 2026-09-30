// Renders AUDIT.md from findings.json plus the prose parts in audit_parts.json. Run: node review/gate-2/audit/build_audit.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const F = JSON.parse(fs.readFileSync(path.join(dir, 'findings.json'), 'utf8'));
const P = JSON.parse(fs.readFileSync(path.join(dir, 'audit_parts.json'), 'utf8'));
const order = { BLOCKER: 0, MAJOR: 1, MINOR: 2 };
F.sort((a, b) => order[a.severity] - order[b.severity] || a.id.localeCompare(b.id));
const count = (s) => F.filter((f) => f.severity === s).length;
let out = `# Independent audit of the Gate 2 bundle (HUSHFALL, Episode 1)\n\n`;
out += P.header.join('\n') + '\n\n';
out += `## Summary\n\nFindings: **${count('BLOCKER')} BLOCKER / ${count('MAJOR')} MAJOR / ${count('MINOR')} MINOR** (${F.filter((f) => f.status === 'CONFIRMED').length} CONFIRMED, ${F.filter((f) => f.status === 'PLAUSIBLE').length} PLAUSIBLE).\n\n`;
out += '| id | severity | status | title |\n|---|---|---|---|\n' + F.map((f) => `| ${f.id} | ${f.severity} | ${f.status} | ${f.title.replace(/\|/g, '/')} |`).join('\n') + '\n\n';
out += `## Method and commands run\n\n` + P.method.join('\n') + '\n\n';
for (const sev of ['BLOCKER', 'MAJOR', 'MINOR']) {
  out += `## ${sev} findings\n\n`;
  const list = F.filter((f) => f.severity === sev);
  if (!list.length) out += '_none_\n\n';
  for (const f of list) {
    out += `### ${f.id} [${f.status}] ${f.title}\n\n`;
    out += `- **Files:** ${f.files.map((x) => '`' + x + '`').join(', ')}\n`;
    out += `- **Evidence:** ${f.evidence}\n`;
    out += `- **Reproduce:** \`${f.repro}\`\n`;
    out += `- **Impact:** ${f.impact}\n`;
    out += `- **Suggested fix:** ${f.fix}\n\n`;
  }
}
out += `## Claims checked and found TRUE\n\n` + P.true.map((x) => '- ' + x).join('\n') + '\n\n';
out += `## Not audited / limits\n\n` + P.limits.map((x) => '- ' + x).join('\n') + '\n';
fs.writeFileSync(path.join(dir, 'AUDIT.md'), out);
console.log('AUDIT.md written:', F.length, 'findings');
