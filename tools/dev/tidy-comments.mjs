// The comments of a source file, kept readable (PT-083 K1, K4). Node only; it changes comments and nothing else (acorn says where they are, and the
// code tokens before and after must match).
//   node tools/dev/tidy-comments.mjs [--notes=<file.md>] <file...>
// 1. A trailing comment that pushes its line past LIMIT moves to a line of its own above the code (below it, if the line starts inside a template
// literal).
// 2. A comment line longer than LIMIT is wrapped; a one-line block comment that long becomes a block of lines.
// 3. With --notes: a comment that carries a work-order tag (PT-083, R20) or an owner's quote is appended to the notes file, keyed by file and
// enclosing top-level name, and the tag leaves the code.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/');
const acorn = require('acorn');

const LIMIT = 150;
const args = process.argv.slice(2);
const notesFile = args.find((a) => a.startsWith('--notes='))?.slice(8) ?? null;
const files = args.filter((a) => !a.startsWith('--'));

const parse = (text, extra = {}) => acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true, ...extra });

function codeTokens(text) {
  const out = [];
  for (const t of acorn.tokenizer(text, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true }))
    out.push(t.type.label + '\u0000' + (t.value?.pattern ?? t.value ?? ''));
  return out.join('\u0001');
}

function wrap(text, width) {
  const words = text.split(/\s+/).filter(Boolean),
    lines = [];
  let cur = '';
  for (const w of words) {
    if (cur && cur.length + 1 + w.length > width) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

const TAG = /\bPT-\d{3}(?:\s*(?:\/|and|to)\s*PT-\d{3})*(?:\s+(?:[A-Z]{1,2}\d{1,2}|step \d+|report \d+)(?:\s*[/,]\s*[A-Z]{1,2}\d{1,2})*)?/g;
const hasHistory = (s) => /\bPT-\d{3}\b/.test(s) || /\bowner\b.*['"]/.test(s);

function stripTags(s) {
  let t = s;
  t = t.replace(/\(\s*(?:the )?owner[^()]*\)/gi, ''); // (owner decision D7), (owner: 'quote')
  t = t.replace(new RegExp('\\(\\s*' + TAG.source + '[^()]{0,60}\\)', 'g'), ''); // (PT-071 R20: first run)
  t = t.replace(new RegExp(TAG.source + '\\s*(?:\\([^()]*\\))?\\s*[:,.]?\\s*', 'g'), ''); // PT-071 R20: ...
  t = t
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:)])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .trim();
  t = t.replace(/^[,:;.\-\s]+/, '');
  return t;
}

const notes = [];
let changedFiles = 0;

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  const comments = [];
  let ast;
  try {
    ast = parse(original, { onComment: comments, locations: true });
  } catch (e) {
    console.error(file + ': not parsed: ' + e.message);
    process.exitCode = 1;
    continue;
  }
  const tops = ast.body.map((n) => {
    const d = n.declaration ?? n,
      name =
        d.id?.name ??
        d.declarations?.[0]?.id?.name ??
        (n.type === 'ImportDeclaration' ? '(imports)' : n.type === 'ClassDeclaration' ? d.id?.name : '(top level)');
    return { start: n.start, end: n.end, name };
  });
  const nameAt = (pos) => tops.find((t) => pos >= t.start && pos <= t.end)?.name ?? '(top level)';
  const templates = [];
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (typeof n.type === 'string') {
      if (n.type === 'TemplateLiteral') templates.push([n.start, n.end]);
      for (const k of Object.keys(n)) if (k !== 'loc') walk(n[k]);
    }
  })(ast);
  const inTemplate = (pos) => templates.some(([a, b]) => pos > a && pos < b);

  // work from the end of the file so earlier offsets stay true
  let text = original;
  for (const c of [...comments].sort((a, b) => b.start - a.start)) {
    let body = c.value;
    if (notesFile && hasHistory(body)) {
      notes.push({ file, name: nameAt(c.start), text: body.replace(/\s+/g, ' ').trim() });
      if (c.type === 'Line') body = ' ' + stripTags(body);
      else
        body = body.includes('\n')
          ? body
              .split('\n')
              .map((l) => l.replace(new RegExp(TAG.source + '\\s*[:,.]?\\s*', 'g'), '').replace(/\(\s*\)/g, ''))
              .join('\n')
          : ' ' + stripTags(body) + ' ';
    }
    const lineStart = text.lastIndexOf('\n', c.start - 1) + 1;
    let lineEnd = text.indexOf('\n', c.end);
    if (lineEnd < 0) lineEnd = text.length;
    const before = text.slice(lineStart, c.start),
      after = text.slice(c.end, lineEnd),
      indent = before.match(/^\s*/)[0],
      ownLine = before.trim() === '';
    const emptied = !body.replace(/[*\s]/g, '').length;
    const lineComment = (s) =>
      wrap(s, LIMIT - indent.length - 3)
        .map((l) => indent + '// ' + l)
        .join('\n');
    if (c.type === 'Line') {
      const textOf = body.trim();
      if (ownLine) {
        if (emptied) text = text.slice(0, lineStart) + text.slice(Math.min(text.length, lineEnd + 1));
        else if (before.length + 2 + body.length > LIMIT) text = text.slice(0, lineStart) + lineComment(textOf) + text.slice(lineEnd);
        else text = text.slice(0, c.start) + '//' + body + text.slice(c.end);
      } else if (emptied) text = text.slice(0, c.start).replace(/[ \t]+$/, '') + text.slice(c.end);
      else if (before.length + 2 + body.length > LIMIT) {
        const code = before.replace(/[ \t]+$/, '');
        if (inTemplate(lineStart)) text = text.slice(0, lineStart) + code + after + '\n' + lineComment(textOf) + text.slice(lineEnd);
        else text = text.slice(0, lineStart) + lineComment(textOf) + '\n' + code + after + text.slice(lineEnd);
      } else text = text.slice(0, c.start) + '//' + body + text.slice(c.end);
    } else if (
      ownLine &&
      after.trim() === '' &&
      (body.includes('\n') ? body.split('\n').some((l) => l.length + indent.length > LIMIT) : before.length + 4 + body.length > LIMIT)
    ) {
      const doc = body.startsWith('*');
      const paras = body
        .replace(/^\*/, '')
        .split('\n')
        .map((l) => l.replace(/^\s*\*?\s?/, ''));
      const lines = paras.flatMap((p) => (p.trim() ? wrap(p, LIMIT - indent.length - 3) : []));
      text =
        text.slice(0, lineStart) +
        indent +
        (doc ? '/**' : '/*') +
        '\n' +
        lines.map((l) => indent + ' * ' + l).join('\n') +
        '\n' +
        indent +
        ' */' +
        text.slice(lineEnd);
    } else if (body !== c.value) {
      if (emptied) text = text.slice(0, c.start).replace(/[ \t]+$/, '') + text.slice(c.end);
      else text = text.slice(0, c.start) + '/*' + body + '*/' + text.slice(c.end);
    }
  }
  if (text !== original) {
    if (codeTokens(text) !== codeTokens(original)) {
      console.error(file + ': the code tokens changed: left as it was');
      process.exitCode = 1;
      continue;
    }
    fs.writeFileSync(file, text);
    changedFiles++;
  }
}

if (notesFile && notes.length) {
  const byFile = new Map();
  for (const n of notes) {
    if (!byFile.has(n.file)) byFile.set(n.file, []);
    byFile.get(n.file).push(n);
  }
  const out = [];
  for (const [f, list] of [...byFile].sort(([a], [b]) => a.localeCompare(b))) {
    out.push(`\n## ${f.replace(/\\/g, '/')}\n`);
    for (const n of list.reverse()) out.push(`- \`${n.name}\`: ${n.text}`);
  }
  fs.appendFileSync(notesFile, out.join('\n') + '\n');
}
console.log(`${changedFiles} file(s) changed of ${files.length}; ${notes.length} comment(s) noted`);
