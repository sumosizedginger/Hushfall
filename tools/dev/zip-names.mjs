// the entry names of a zip (used by package-web.mjs and its test)
import fs from 'node:fs';

/** the entry names of a zip, read from its central directory by hand (no dependency) */
export function zipNames(file) {
  const b = fs.readFileSync(file); let e = b.length - 22; while (e >= 0 && b.readUInt32LE(e) !== 0x06054b50) e--; if (e < 0) return [];
  const n = b.readUInt16LE(e + 10); let p = b.readUInt32LE(e + 16); const out = [];
  for (let i = 0; i < n && b.readUInt32LE(p) === 0x02014b50; i++) { const len = b.readUInt16LE(p + 28), ex = b.readUInt16LE(p + 30), cm = b.readUInt16LE(p + 32); out.push(b.toString('utf8', p + 46, p + 46 + len)); p += 46 + len + ex + cm; }
  return out;
}
