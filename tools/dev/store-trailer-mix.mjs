// FREEZE F17, the trailer's assembly (design/store/SHOTS.md): the clips captured by tools/dev/store-trailer.mjs become one video (a title card from the key art, the clips with half-second crossfades and a caption each, an end card), and the SOUND is the game's own:
// every event the sim emitted in a clip goes through the game's event-to-sound mapping (src/audio/events.js `soundsForEvent`, so a shot is the sound the game plays for that shot), placed where it happened (the game's own pan rule and an inverse-distance fall-off, as the engine's
// panner has: reference distance 3, roll-off 1.1) and mixed over two of the game's own rendered score excerpts (review/audio/music_calm.wav and music_combat.wav, from `npm run audio-qa`). Mixed in node, one stereo wav, then ffmpeg. Nothing is sampled, stock or recorded.
//   node tools/dev/store-trailer-mix.mjs <workDir> <outFile.mp4>        (workDir holds <clip>/%05d.png and <clip>/events.json from store-trailer.mjs; ffmpeg must be on the path)
// The seams of the looped score excerpts are crossfaded, not composed: this is a first cut for a store page, not a finished trailer.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { soundsForEvent, panFor } from '../../src/audio/events.js';

const root = path.resolve(import.meta.dirname, '../..'), [workArg, outArg] = process.argv.slice(2);
if (!workArg || !outArg) { console.error('usage: store-trailer-mix.mjs <workDir> <outFile.mp4>'); process.exit(2); }
const work = path.resolve(workArg), outFile = path.resolve(outArg), AUDIO = path.join(root, 'review', 'audio'), SR = 48000, FPS = 30, X = 0.5;
const KEYART = 'D:/Doom_release/store/title/key-art-1920x1080.png', FONT = 'C\\:/Windows/Fonts/consola.ttf';
const ORDER = [['quay', 'MARROW QUAY'], ['nave', 'THE MARROW NAVE'], ['foundry', 'THE PULSE FOUNDRY'], ['stair', 'THE HOLLOW STAIR'], ['warden', 'THE GATE WARDEN']].filter(([c]) => fs.existsSync(path.join(work, c, 'events.json')));
if (!ORDER.length) { console.error('no clips in', work); process.exit(1); }
fs.mkdirSync(path.join(work, 'build'), { recursive: true });
const REUSE = process.argv.includes('--reuse') && fs.existsSync(path.join(work, 'build', 'video.mp4'));          // --reuse: the video segments are already built; only the sound is made again
const vff = (args) => { if (!REUSE) ff(args); };
const ff = (args) => { const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: ['ignore', 'inherit', 'inherit'] }); if (r.status !== 0) { console.error('ffmpeg failed:', args.slice(0, 12).join(' ')); process.exit(1); } };
const dt = (n, text, extra = '') => `drawtext=fontfile='${FONT}':text='${text}':fontcolor=0xe8e2d0:${extra}`;

// ---- video segments ----
const segs = [];
vff(['-loop', '1', '-framerate', '30', '-t', '4', '-i', KEYART, '-vf', `zoompan=z='1+0.0007*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=120:s=1920x1080:fps=30,fade=t=in:st=0:d=1,format=yuv420p`, '-c:v', 'libx264', '-crf', '17', path.join(work, 'build', 'intro.mp4')]); segs.push({ file: 'intro.mp4', d: 4, kind: 'intro' });
for (const [clip, caption] of ORDER) {
  const meta = JSON.parse(fs.readFileSync(path.join(work, clip, 'events.json'), 'utf8')), n = meta.frames.length, d = n / FPS;
  const alpha = `alpha='if(lt(t,0.7),t/0.7,if(gt(t,${(d - 0.9).toFixed(2)}),(${d.toFixed(2)}-t)/0.9,1))'`;
  vff(['-framerate', String(FPS), '-i', path.join(work, clip, '%05d.png'), '-vf', `scale=1920:1080,${dt(0, caption, `fontsize=30:x=(w-text_w)/2:y=h-96:box=1:boxcolor=0x05060a@0.55:boxborderw=14:${alpha}`)},format=yuv420p`, '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-r', String(FPS), path.join(work, 'build', clip + '.mp4')]);
  segs.push({ file: clip + '.mp4', d, kind: 'clip', clip, meta });
}
const END = [['HUSHFALL', 'fontsize=110:y=(h/2)-150'], ['68 maps in two campaigns. 15 weapons. 21 kinds of creature.', 'fontsize=34:y=(h/2)-10'], ['Every picture painted by code, every sound synthesised.', 'fontsize=34:y=(h/2)+50'], ['Plays in the browser.', 'fontsize=34:y=(h/2)+110']];
vff(['-f', 'lavfi', '-i', 'color=c=0x05060a:s=1920x1080:d=6:r=30', '-vf', END.map(([t, e], i) => dt(0, t, `${e}:x=(w-text_w)/2:alpha='min(1,max(0,(t-${(0.4 + i * 0.5).toFixed(1)})/0.6))'`)).join(',') + ',fade=t=out:st=5:d=1,format=yuv420p', '-c:v', 'libx264', '-crf', '17', path.join(work, 'build', 'outro.mp4')]); segs.push({ file: 'outro.mp4', d: 6, kind: 'outro' });
const S = []; segs.forEach((s, i) => { S[i] = i === 0 ? 0 : S[i - 1] + segs[i - 1].d - X; }); const total = S.at(-1) + segs.at(-1).d;
let chain = '', last = '[0:v]'; for (let i = 1; i < segs.length; i++) { const out = i === segs.length - 1 ? '[v]' : `[v${i}]`; chain += `${last}[${i}:v]xfade=transition=fade:duration=${X}:offset=${S[i].toFixed(3)}${out};`; last = out; }
vff([...segs.flatMap((s) => ['-i', path.join(work, 'build', s.file)]), '-filter_complex', chain.replace(/;$/, ''), '-map', '[v]', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', path.join(work, 'build', 'video.mp4')]);

// ---- sound: the game's own, mixed in node ----
function readWav(file) {                                                                                                        // 16-bit PCM or 32-bit float, mono or stereo -> { l, r } Float32Array at SR (linear resampling)
  const b = fs.readFileSync(file); if (b.toString('ascii', 0, 4) !== 'RIFF') throw new Error('not a wav: ' + file);
  let p = 12, fmt = null, data = null; while (p + 8 <= b.length) { const id = b.toString('ascii', p, p + 4), sz = b.readUInt32LE(p + 4); if (id === 'fmt ') fmt = { tag: b.readUInt16LE(p + 8), ch: b.readUInt16LE(p + 10), rate: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) }; else if (id === 'data') { data = b.subarray(p + 8, p + 8 + sz); break; } p += 8 + sz + (sz & 1); }
  const bytes = fmt.bits / 8, n = Math.floor(data.length / bytes / fmt.ch), chan = Array.from({ length: fmt.ch }, () => new Float32Array(n));
  for (let i = 0; i < n; i++) for (let c = 0; c < fmt.ch; c++) { const o = (i * fmt.ch + c) * bytes; chan[c][i] = fmt.tag === 3 ? data.readFloatLE(o) : fmt.bits === 16 ? data.readInt16LE(o) / 32768 : fmt.bits === 24 ? data.readIntLE(o, 3) / 8388608 : 0; }
  const rs = (a) => { if (fmt.rate === SR) return a; const m = Math.floor(a.length * SR / fmt.rate), o = new Float32Array(m); for (let i = 0; i < m; i++) { const t = i * fmt.rate / SR, j = Math.floor(t), f = t - j; o[i] = a[j] * (1 - f) + (a[Math.min(a.length - 1, j + 1)] ?? 0) * f; } return o; };
  const l = rs(chan[0]), r = fmt.ch > 1 ? rs(chan[1]) : l; return { l, r };
}
const cache = new Map(), wav = (id) => { if (!cache.has(id)) { const f = path.join(AUDIO, id + '.wav'); cache.set(id, fs.existsSync(f) ? readWav(f) : null); } return cache.get(id); };
const N = Math.ceil((total + 1) * SR), L = new Float32Array(N), R = new Float32Array(N);
const mixIn = (w, at, gl, gr = gl, from = 0, len = Infinity) => { const s0 = Math.max(0, Math.round(at * SR)); const n = Math.min(w.l.length - from, len, N - s0); for (let i = 0; i < n; i++) { L[s0 + i] += w.l[from + i] * gl; R[s0 + i] += w.r[from + i] * gr; } };
// the score: the calm excerpt under the title, the combat excerpt from the first clip on, each looped with a crossfade at its seam, equal-power
const env = (t, pts) => { if (t <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + (v1 - v0) * (t - t0) / (t1 - t0); } return pts.at(-1)[1]; };
const loopTrack = (w, from, to, gain, pts) => { const len = w.l.length / SR, step = len - 1.5; for (let at = from; at < to; at += step) for (let i = 0; i < w.l.length; i++) { const t = at + i / SR, s = Math.round(t * SR); if (s < 0 || s >= N || t > to) break; const fin = Math.min(1, i / (1.5 * SR)), fout = Math.min(1, (w.l.length - i) / (1.5 * SR)), g = gain * env(t, pts) * Math.sin(fin * Math.PI / 2) * Math.sin(fout * Math.PI / 2); L[s] += w.l[i] * g; R[s] += w.r[i] * g; } };
const calm = wav('music_calm'), combat = wav('music_combat');
if (calm) loopTrack(calm, 0, S[1] + 6, 0.55, [[0, 0], [2.5, 1], [S[1] - 0.5, 1], [S[1] + 5, 0]]);
if (combat) loopTrack(combat, S[1] - 1, total, 0.5, [[S[1] - 1, 0], [S[1] + 2, 1], [total - 7, 1], [total - 1.5, 0.35], [total, 0]]);
const bell = wav('bell_strike'), chord = wav('gate_chord'); if (bell) mixIn(bell, 0.35, 0.8); if (chord) mixIn(chord, total - 6 + 0.3, 0.6);        // the title's bell and the end card's chord
// the sim's own sounds, where they happened
let placed = 0, missing = new Set();
for (const s of segs) if (s.kind === 'clip') for (const fr of s.meta.frames) for (const e of fr.events) for (const snd of soundsForEvent(e) ?? []) {
  const w = wav(snd.id); if (!w) { missing.add(snd.id); continue; }
  let g = snd.gain ?? 1, pan = 0; if (snd.pos) { const [x, z] = snd.pos, dx = x - fr.player.x, dz = z - fr.player.z, d = Math.hypot(dx, dz); g *= d <= 3 ? 1 : 3 / (3 + 1.1 * (d - 3)); if (d > 70) continue; pan = panFor(fr.player.x, fr.player.z, fr.player.yaw, x, z); }
  const th = (pan + 1) * Math.PI / 4;                                                                                                 // equal-power pan
  mixIn(w, S[segs.indexOf(s)] + fr.f / FPS + (snd.delay ?? 0), 0.85 * g * Math.cos(th) * 1.4142, 0.85 * g * Math.sin(th) * 1.4142); placed++;
}
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
// a 32-bit float wav, NOT scaled to its peak: forty bursts of rivets pile up to several times full scale and the score is far under that, so a peak scale would bury the score. ffmpeg's compressor and loudness normaliser (below) bring the whole to a level.
const pcm = Buffer.alloc(N * 8); for (let i = 0; i < N; i++) { pcm.writeFloatLE(L[i], i * 8); pcm.writeFloatLE(R[i], i * 8 + 4); }
const hdr = Buffer.alloc(44); hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(3, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 8, 28); hdr.writeUInt16LE(8, 32); hdr.writeUInt16LE(32, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
fs.writeFileSync(path.join(work, 'build', 'mix.wav'), Buffer.concat([hdr, pcm]));
console.log(`sound: ${placed} sim sounds placed, raw peak ${peak.toFixed(2)}, no file for: ${[...missing].join(', ') || 'none'}`);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
ff(['-i', path.join(work, 'build', 'video.mp4'), '-i', path.join(work, 'build', 'mix.wav'), '-c:v', 'libx264', '-crf', '25', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-af', `acompressor=threshold=0.1:ratio=8:attack=3:release=120:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.8:level=disabled,afade=t=out:st=${(total - 1.2).toFixed(2)}:d=1.2`, '-t', total.toFixed(2), '-movflags', '+faststart', outFile]);
console.log(`trailer: ${outFile} (${total.toFixed(1)} s, ${segs.length} segments)`);
