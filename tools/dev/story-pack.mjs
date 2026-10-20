// THE READER PACK (PT-070, R18): one file for an outside reader (Gemini, Grok) to read the story: the prompt, the canon, the continuity sheet and the Record in play order. Run tools/dev/story-export.mjs first.
//   node tools/dev/story-pack.mjs [out]      default design/story/READER_PACK.md
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..'), out = path.resolve(root, process.argv[2] ?? 'design/story/READER_PACK.md');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
const prompt = read('design/audits/STORY_READ_PROMPT.md'), body = prompt.slice(prompt.indexOf('\n---\n') + 5);
const part = (title, text) => `\n\n==================================================================================\nFILE: ${title}\n==================================================================================\n\n${text.trim()}\n`;
const pack = `HUSHFALL, THE STORY READ: ONE FILE FOR THE READER\n\nThis file holds four things in order: the instructions (file 1), the canon (file 2), the continuity sheet (file 3) and the story itself in play order (file 4). Read all four; report as file 1 says.\n`
  + part('1 of 4, THE INSTRUCTIONS (design/audits/STORY_READ_PROMPT.md)', body)
  + part('2 of 4, THE CANON (design/LORE.md)', read('design/LORE.md'))
  + part('3 of 4, THE CONTINUITY SHEET (design/story/CONTINUITY.md)', read('design/story/CONTINUITY.md'))
  + part('4 of 4, THE STORY IN PLAY ORDER (design/story/RECORD.md)', read('design/story/RECORD.md'));
fs.writeFileSync(out, pack);
console.log(`wrote ${path.relative(root, out)}: ${(pack.length / 1024).toFixed(0)} KB, about ${Math.round(pack.length / 4000)}k tokens`);
