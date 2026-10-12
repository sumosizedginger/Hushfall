// flat-colour stand-in atlases so the node rasteriser (rast-creature.mjs --atlas=<dir>) can show a new rig COMPOSITION before its real bake (PT-028): node tools/dev/placeholder-atlas.mjs <outDir>; never written into assets/baked
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { CHOIR_CELLS } from '../../src/render/choir_cells.js';
const COL = {
  bulwark: { skin: '#8f9a86', flesh: '#b0585e', shell: '#e9dcc0', shellDk: '#8a7a8e', shellIn: '#d9b0cc', chitin: '#cfc7b0', chitinDk: '#7e7a68', bone: '#e8e0c0', iron: '#4a505a', mouth: '#2a0c12', bronze: '#c58a40' },
  weeping: { skin: '#cfc6b4', flesh: '#a8484c', fleshDk: '#5e1e28', robe: '#4b4668', robeDk: '#2a263f', bone: '#e8e0c0', boneDk: '#a99d78', bronze: '#c58a40', bronzeDk: '#6a4018', iron: '#4a505a', sac: '#d8a850', sacDk: '#8a5a24', mouth: '#2a0c12', verd: '#78883a' },
  vat: { iron: '#4e4842', ironDk: '#322e28', rust: '#c8682a', dome: '#c8d84c', domeDk: '#7c8c22', copper: '#e68c4c', verd: '#78883a', pipe: '#70745e', slime: '#a8c428' },
  reed: { flesh: '#c88480', fleshDk: '#723a3e', stone: '#7e7e6a', bronze: '#c58a40', bronzeDk: '#6a4018', bone: '#e8e0c0', verd: '#78883a', mouth: '#2a0c12', cord: '#9c8a58' },
  zealot: { skin: '#c4bcb8', hood: '#7a2a30', hoodDk: '#44161a', plate: '#d6a04e', plateDk: '#3c3a40', bronze: '#d89244', bronzeDk: '#7a4418', bone: '#eee4c8', iron: '#3e4048', cord: '#b83a38', mouth: '#2a0c12' },
  subcantor: { skin: '#c8c8c0', robe: '#7a8a78', robeDk: '#4a5a4c', sash: '#e8e2cc', bone: '#eee4c8', bronze: '#d89244', bronzeDk: '#7a4418', iron: '#565c66', mouth: '#1c1014', verd: '#6f9a7c' },
  grandcantor: { skin: '#bcaca2', flesh: '#a0404a', fleshDk: '#56222c', chitin: '#40405a', chitinDk: '#22222e', bone: '#e8e0c0', boneDk: '#a99d78', bronze: '#c58a40', bronzeDk: '#6a4018', iron: '#4a4e58', mouth: '#2a0a10', verd: '#78883a', horn: '#e4b454', hornIn: '#661e28', trim: '#f6e4a4', leg: '#5e544a' },
};
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
for (const kind of Object.keys(COL)) {
  const png = new PNG({ width: 256, height: 256 });
  CHOIR_CELLS[kind].forEach((n, i) => {
    const hex = COL[kind][n], r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16), X = (i % 4) * 64, Y = Math.floor(i / 4) * 64;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const o = ((Y + y) * 256 + X + x) * 4, k = 1 - 0.35 * (y / 64); png.data[o] = r * k; png.data[o + 1] = g * k; png.data[o + 2] = b * k; png.data[o + 3] = 255; }
  });
  fs.writeFileSync(`${out}/choir_${kind}.png`, PNG.sync.write(png));
}
console.log('ok', out);
