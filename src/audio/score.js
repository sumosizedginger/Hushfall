// THE SCORE: the themes as DATA and the pure functions that turn a theme, a bar and a fight's level into
// note events. No WebAudio here: `music.js` performs what this returns, and the node tests read it directly.
// A theme has a CALM version (the place's tune) and a BATTLE version of the same tune (darker, twice as fast), and a fight has four
// levels: 0 calm, 1 noticed (a pulse and a held low note), 2 fighting (the band and the tune), 3 overwhelmed (sixteenths, toms,
// the tune an octave up, a choir). Every tune here is original. An event: { at, dur (beats), voice, f (Hz, pitched voices), gain, pan, glide (Hz it
// slides from), vib (cents) }.

const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** 'D3', 'Bb1', 'C#4' -> Hz (A4 = 440, equal temperament) */
export function NOTE(n) {
  const m = /^([A-G])(b|#)?(-?\d)$/.exec(n);
  if (!m) throw new Error('bad note ' + n);
  const semi = NAMES[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0) + 12 * (Number(m[3]) + 1);
  return 440 * 2 ** ((semi - 69) / 12);
}

// ---- the instruments: a spectrum each (harmonic number k at frequency f -> amplitude), performed as one PeriodicWave per note ----
const res = (f, fc, bw, g) => g / (1 + ((f - fc) / (bw / 2)) ** 2);
export const SPECTRA = {
  cello: (f, k) => (1 / k ** 0.9) * (res(f, 420, 380, 1) + res(f, 1500, 700, 0.45) + res(f, 2900, 600, 0.12) + 0.03),
  harmonium: (f, k) => (1 / k ** 0.75) * (res(f, 320, 400, 0.7) + res(f, 1150, 900, 0.5) + 0.04),
  brass: (f, k) => (1 / k ** 0.45) * (res(f, 650, 500, 0.8) + res(f, 1350, 900, 0.7) + res(f, 2600, 1200, 0.25) + 0.05),
  choir: (f, k) => (1 / k ** 0.6) * (res(f, 700, 160, 1) + res(f, 1150, 180, 0.6) + res(f, 2700, 300, 0.15) + 0.01),
  bass: (f, k) => 1 / k ** 1.1,
  // a glass harmonica: nearly a sine, a few high partials
  glass: (f, k) => (k === 1 ? 1 : k === 2 ? 0.22 : k === 3 ? 0.1 : k === 4 ? 0.05 : k === 6 ? 0.03 : 0) * (f < 5000 ? 1 : 0.2),
};
/** the voices that are pitched notes (the rest are drums and the bell) and how each one moves */
export const VOICES = {
  cello: { att: 0.12, rel: 0.35, bus: 'clean' },
  harmonium: { att: 0.35, rel: 0.9, bus: 'clean', trem: 0.05 },
  choir: { att: 0.25, rel: 0.3, bus: 'clean' },
  brass: { att: 0.03, rel: 0.1, bus: 'drive' },
  bass: { att: 0.004, rel: 0.05, bus: 'drive' },
  chordBrass: { att: 0.06, rel: 0.12, bus: 'drive', spectrum: 'brass' },
  horn: { att: 0.16, rel: 0.45, bus: 'clean', spectrum: 'brass' },
  // the Gate's voice: slow to speak, long to die // a band's horn, played soft: the calm voice of the works
  glass: { att: 0.3, rel: 1.2, bus: 'clean' },
};
export const DRUMS = ['kick', 'snare', 'hat', 'tomH', 'tomL', 'anvil', 'crash', 'boom', 'bell'];

/** the imaginary coefficients of a PeriodicWave for `voice` at `f0` (index 0 is the DC term, always 0); harmonics stop at maxHz */
export function harmonics(voice, f0, maxHz = 6000) {
  const spec = SPECTRA[VOICES[voice]?.spectrum ?? voice];
  if (!spec) throw new Error('no spectrum ' + voice);
  const n = Math.max(1, Math.min(96, Math.floor(maxHz / f0))),
    im = new Float32Array(n + 1);
  for (let k = 1; k <= n; k++) im[k] = spec(k * f0, k);
  return im;
}

// ---- THE THEMES ----
// HARBOUR (Campaign 1, Episode 1): the Tollbearers' hymn. Calm: D Dorian, 63 bpm in three, a cello over a pump organ, a far bell
// (tuned so D, F and A are its own partials) at each phrase. Battle: the same tune in D Aeolian (B becomes Bb), 126 bpm in four, on brass.
export const THEMES = {
  harbour: {
    name: 'harbour',
    calm: {
      bpm: 63,
      meter: 3,
      bell: 'D3',
      phrases: [
        {
          mel: [
            ['D3', 1],
            ['F3', 1],
            ['A3', 1],
            ['G3', 1.5],
            ['F3', 0.5],
            ['E3', 1],
            ['F3', 1],
            ['E3', 1],
            ['C3', 1],
            ['D3', 3],
          ],
          chords: [
            ['D2', 'D3', 'F3', 'A3'],
            ['G2', 'G3', 'B3', 'D4'],
            ['F2', 'F3', 'A3', 'C4'],
            ['D2', 'D3', 'F3', 'A3'],
          ],
        },
        {
          mel: [
            ['A3', 1],
            ['B3', 1],
            ['C4', 1],
            ['D4', 2],
            ['A3', 1],
            ['B3', 1],
            ['A3', 1],
            ['G3', 1],
            ['A3', 3],
          ],
          chords: [
            ['A2', 'E3', 'A3', 'C4'],
            ['G2', 'G3', 'B3', 'D4'],
            ['E2', 'E3', 'G3', 'B3'],
            ['A2', 'E3', 'A3', 'C4'],
          ],
        },
      ],
      rest: 2, // beats of breath between phrases
    },
    battle: {
      bpm: 126,
      meter: 4,
      roots: ['D2', 'C2', 'F2', 'D2', 'Bb1', 'D2', 'G1', 'A1'],
      chords: {
        D2: ['D3', 'F3', 'A3'],
        C2: ['C3', 'E3', 'G3'],
        F2: ['F3', 'A3', 'C4'],
        Bb1: ['Bb2', 'D3', 'F3'],
        G1: ['G2', 'Bb2', 'D3'],
        A1: ['A2', 'C#3', 'E3'],
      },
      lead: [
        [
          ['D4', 2],
          ['F4', 1],
          ['A4', 1],
        ],
        [
          ['G4', 1.5],
          ['F4', 0.5],
          ['E4', 2],
        ],
        [
          ['F4', 1],
          ['E4', 1],
          ['C4', 2],
        ],
        [['D4', 4]],
        [
          ['A4', 1],
          ['Bb4', 1],
          ['C5', 2],
        ],
        [
          ['D5', 3],
          ['A4', 1],
        ],
        [
          ['Bb4', 1],
          ['A4', 1],
          ['G4', 2],
        ],
        [['A4', 4]],
      ],
      bell: 'D2',
      killBell: 'A2',
      clear: ['D2', 'A2', 'D3', 'F3', 'A3'],
    },
  },
  // THE WORKS (Campaign 1, Episode 2: the salt pans, the kilns, the rail yard, the pumps): a colliery band's slow chorale in E minor on soft horns
  // over the organ, an anvil keeping time on two and
  // four. Battle: the same tune twice as fast in E Phrygian (F sharp becomes F), on brass, the bass walking down to a B major turn.
  works: {
    name: 'works',
    calm: {
      bpm: 66,
      meter: 4,
      bell: null,
      voices: { mel: 'horn', pad: 'harmonium', melGain: 0.11 },
      tick: { voice: 'anvil', beats: [1, 3], gain: 0.025, pan: 0.45 },
      phrases: [
        {
          mel: [
            ['E3', 2],
            ['G3', 1],
            ['A3', 1],
            ['B3', 2],
            ['A3', 1],
            ['G3', 1],
            ['A3', 1],
            ['G3', 1],
            ['F#3', 1],
            ['D3', 1],
            ['E3', 4],
          ],
          chords: [
            ['E2', 'E3', 'G3', 'B3'],
            ['G2', 'G3', 'B3', 'D4'],
            ['D2', 'D3', 'F#3', 'A3'],
            ['E2', 'E3', 'G3', 'B3'],
          ],
        },
        {
          mel: [
            ['G3', 1],
            ['A3', 1],
            ['B3', 2],
            ['D4', 2],
            ['C4', 1],
            ['B3', 1],
            ['A3', 2],
            ['G3', 1],
            ['F#3', 1],
            ['E3', 4],
          ],
          chords: [
            ['G2', 'G3', 'B3', 'D4'],
            ['C2', 'C3', 'E3', 'G3'],
            ['D2', 'D3', 'F#3', 'A3'],
            ['E2', 'E3', 'G3', 'B3'],
          ],
        },
      ],
      rest: 2,
    },
    battle: {
      bpm: 132,
      meter: 4,
      roots: ['E2', 'E2', 'C2', 'D2', 'E2', 'A1', 'B1', 'E2'],
      chords: { E2: ['E3', 'G3', 'B3'], C2: ['C3', 'E3', 'G3'], D2: ['D3', 'F3', 'A3'], A1: ['A2', 'C3', 'E3'], B1: ['B2', 'D#3', 'F#3'] },
      lead: [
        [
          ['E4', 2],
          ['G4', 1],
          ['A4', 1],
        ],
        [
          ['B4', 2],
          ['A4', 1],
          ['G4', 1],
        ],
        [
          ['A4', 1],
          ['G4', 1],
          ['F4', 1],
          ['D4', 1],
        ],
        [['E4', 4]],
        [
          ['G4', 1],
          ['A4', 1],
          ['B4', 2],
        ],
        [
          ['D5', 2],
          ['C5', 1],
          ['B4', 1],
        ],
        [
          ['A4', 2],
          ['G4', 1],
          ['F4', 1],
        ],
        [['E4', 4]],
      ],
      bell: 'E2',
      killBell: 'B1',
      ringBell: 'E3',
      clear: ['E2', 'B2', 'E3', 'G3', 'B3'],
    },
  },
  // THE CHOIR (Campaign 1, Episode 3: inside the choir ships): a slow chant for a wordless choir in A Lydian (bright, and wrong: the raised fourth),
  // the choir on the chords too, a deep ship's bell
  // at each phrase. Battle: the chant darkened into A minor at 120, on brass, ending on an E major turn.
  choir: {
    name: 'choir',
    calm: {
      bpm: 58,
      meter: 3,
      bell: 'A2',
      voices: { mel: 'choir', pad: 'choir', melGain: 0.12 },
      phrases: [
        {
          mel: [
            ['A3', 2],
            ['B3', 1],
            ['C#4', 1],
            ['D#4', 1],
            ['E4', 1],
            ['D#4', 2],
            ['C#4', 1],
            ['B3', 3],
          ],
          chords: [
            ['A2', 'E3', 'A3', 'C#4'],
            ['B2', 'F#3', 'B3', 'D#4'],
            ['E2', 'B2', 'E3', 'G#3'],
            ['B2', 'F#3', 'B3', 'D#4'],
          ],
        },
        {
          mel: [
            ['E4', 1],
            ['F#4', 1],
            ['G#4', 1],
            ['A4', 2],
            ['G#4', 1],
            ['F#4', 1],
            ['E4', 1],
            ['D#4', 1],
            ['E4', 3],
          ],
          chords: [
            ['E2', 'B2', 'E3', 'G#3'],
            ['A2', 'E3', 'A3', 'C#4'],
            ['B2', 'F#3', 'B3', 'D#4'],
            ['E2', 'B2', 'E3', 'G#3'],
          ],
        },
      ],
      rest: 3,
    },
    battle: {
      bpm: 120,
      meter: 4,
      roots: ['A1', 'A1', 'F1', 'G1', 'C2', 'D2', 'E2', 'A1'],
      chords: {
        A1: ['A2', 'C3', 'E3'],
        F1: ['F2', 'A2', 'C3'],
        G1: ['G2', 'B2', 'D3'],
        C2: ['C3', 'E3', 'G3'],
        D2: ['D3', 'F3', 'A3'],
        E2: ['E3', 'G#3', 'B3'],
      },
      lead: [
        [
          ['A4', 2],
          ['B4', 1],
          ['C5', 1],
        ],
        [
          ['D5', 1],
          ['E5', 1],
          ['D5', 2],
        ],
        [
          ['C5', 2],
          ['B4', 1],
          ['A4', 1],
        ],
        [['B4', 4]],
        [
          ['E5', 1],
          ['F5', 1],
          ['G5', 1],
          ['A5', 1],
        ],
        [
          ['G5', 2],
          ['F5', 1],
          ['E5', 1],
        ],
        [
          ['D5', 1],
          ['C5', 1],
          ['B4', 2],
        ],
        [['A4', 4]],
      ],
      bell: 'A2',
      killBell: 'E2',
      ringBell: 'A2',
      clear: ['A1', 'E2', 'A2', 'C3', 'E3'],
    },
  },
  // THE GATE (Campaign 1, Episode 4: the tether, the wreck belt, the docks in vacuum, the Gate itself): a slow processional in C minor on a glass
  // harmonica over a quiet choir, a gold bell at each
  // phrase; the second phrase turns on the minor key's G major. Battle: the processional at 138 on brass, the same turn.
  gate: {
    name: 'gate',
    calm: {
      bpm: 54,
      meter: 4,
      bell: 'C3',
      voices: { mel: 'glass', pad: 'choir', melGain: 0.16 },
      phrases: [
        {
          mel: [
            ['C4', 3],
            ['D4', 1],
            ['Eb4', 2],
            ['G4', 2],
            ['F4', 1],
            ['Eb4', 1],
            ['D4', 2],
            ['C4', 4],
          ],
          chords: [
            ['C2', 'C3', 'Eb3', 'G3'],
            ['Eb2', 'Eb3', 'G3', 'Bb3'],
            ['Bb1', 'Bb2', 'D3', 'F3'],
            ['C2', 'C3', 'Eb3', 'G3'],
          ],
        },
        {
          mel: [
            ['G4', 2],
            ['Ab4', 1],
            ['G4', 1],
            ['F4', 2],
            ['Eb4', 2],
            ['D4', 1],
            ['Eb4', 1],
            ['F4', 1],
            ['D4', 1],
            ['C4', 4],
          ],
          chords: [
            ['Ab1', 'Ab2', 'C3', 'G3'],
            ['F1', 'F2', 'Ab2', 'C3'],
            ['G1', 'G2', 'B2', 'D3'],
            ['C2', 'C3', 'Eb3', 'G3'],
          ],
        },
      ],
      rest: 2,
    },
    battle: {
      bpm: 138,
      meter: 4,
      roots: ['C2', 'C2', 'Eb2', 'Bb1', 'Ab1', 'F1', 'G1', 'C2'],
      chords: {
        C2: ['C3', 'Eb3', 'G3'],
        Eb2: ['Eb3', 'G3', 'Bb3'],
        Bb1: ['Bb2', 'D3', 'F3'],
        Ab1: ['Ab2', 'C3', 'Eb3'],
        F1: ['F2', 'Ab2', 'C3'],
        G1: ['G2', 'B2', 'D3'],
      },
      lead: [
        [
          ['C5', 2],
          ['D5', 1],
          ['Eb5', 1],
        ],
        [
          ['G5', 2],
          ['F5', 1],
          ['Eb5', 1],
        ],
        [
          ['D5', 1],
          ['Eb5', 1],
          ['F5', 1],
          ['D5', 1],
        ],
        [['C5', 4]],
        [
          ['G5', 2],
          ['Ab5', 1],
          ['G5', 1],
        ],
        [
          ['F5', 2],
          ['Eb5', 2],
        ],
        [
          ['D5', 2],
          ['B4', 2],
        ],
        [['C5', 4]],
      ],
      bell: 'C3',
      killBell: 'G2',
      ringBell: 'C3',
      clear: ['C2', 'G2', 'C3', 'Eb3', 'G3'],
    },
  },
  // CAMPAIGN TWO. THRESHOLD (Act A: the land beyond the Gate, the glass steppe, the forks, the graves of other worlds): a lone cello over chords on
  // glass in F Dorian, slow and open, a low bell;
  // the second phrase climbs and turns on C major, the one leading note in the place. Battle: F minor at 132 on brass, the bass falling through D
  // flat and E flat to the C turn.
  threshold: {
    name: 'threshold',
    calm: {
      bpm: 52,
      meter: 3,
      bell: 'F2',
      voices: { mel: 'cello', pad: 'glass', melGain: 0.13 },
      phrases: [
        {
          mel: [
            ['F3', 2],
            ['C4', 1],
            ['Bb3', 1.5],
            ['Ab3', 0.5],
            ['G3', 1],
            ['Ab3', 1],
            ['Bb3', 1],
            ['C4', 1],
            ['F3', 3],
          ],
          chords: [
            ['F2', 'C3', 'F3', 'Ab3'],
            ['Bb1', 'F2', 'Bb2', 'D3'],
            ['Ab1', 'Eb2', 'Ab2', 'C3'],
            ['F2', 'C3', 'F3', 'Ab3'],
          ],
        },
        {
          mel: [
            ['C4', 1],
            ['D4', 1],
            ['Eb4', 1],
            ['F4', 2],
            ['Eb4', 1],
            ['D4', 1],
            ['C4', 1],
            ['Bb3', 1],
            ['C4', 3],
          ],
          chords: [
            ['C2', 'G2', 'C3', 'Eb3'],
            ['Bb1', 'F2', 'Bb2', 'D3'],
            ['G1', 'D2', 'G2', 'Bb2'],
            ['C2', 'G2', 'C3', 'E3'],
          ],
        },
      ],
      rest: 3,
    },
    battle: {
      bpm: 132,
      meter: 4,
      roots: ['F1', 'F1', 'Db2', 'Eb2', 'F1', 'Bb1', 'C2', 'C2'],
      chords: { F1: ['F2', 'Ab2', 'C3'], Db2: ['Db3', 'F3', 'Ab3'], Eb2: ['Eb3', 'G3', 'Bb3'], Bb1: ['Bb2', 'Db3', 'F3'], C2: ['C3', 'E3', 'G3'] },
      lead: [
        [
          ['F4', 2],
          ['C5', 1],
          ['Ab4', 1],
        ],
        [
          ['Bb4', 1.5],
          ['Ab4', 0.5],
          ['G4', 2],
        ],
        [
          ['Ab4', 1],
          ['Bb4', 1],
          ['C5', 2],
        ],
        [
          ['Bb4', 2],
          ['G4', 2],
        ],
        [
          ['F4', 1],
          ['Ab4', 1],
          ['C5', 1],
          ['F5', 1],
        ],
        [
          ['Eb5', 2],
          ['Db5', 1],
          ['Bb4', 1],
        ],
        [
          ['C5', 2],
          ['E5', 1],
          ['G5', 1],
        ],
        [
          ['E5', 2],
          ['C5', 2],
        ],
      ],
      bell: 'F2',
      killBell: 'C3',
      ringBell: 'F2',
      clear: ['F1', 'C2', 'F2', 'Ab2', 'C3'],
    },
  },
  // THE SOUNDING DEEP (Act B: caves, the echo markets, the drowned choir, the lantern): a low cello and a low choir in D Phrygian, very slow, with
  // long breaths between phrases for the caves to
  // answer; the second phrase ends on the Phrygian cadence (E flat to D minor). Battle: 120 in four, the flattened second in the bass, an A major
  // turn at the end of the round.
  deep: {
    name: 'deep',
    calm: {
      bpm: 46,
      meter: 4,
      bell: 'D2',
      voices: { mel: 'cello', pad: 'choir', melGain: 0.12 },
      phrases: [
        {
          mel: [
            ['D3', 3],
            ['Eb3', 1],
            ['D3', 2],
            ['C3', 1],
            ['Bb2', 1],
            ['A2', 2],
            ['Bb2', 1],
            ['C3', 1],
            ['D3', 4],
          ],
          chords: [
            ['D2', 'A2', 'D3', 'F3'],
            ['Bb1', 'F2', 'Bb2', 'D3'],
            ['F1', 'C2', 'F2', 'A2'],
            ['D2', 'A2', 'D3', 'F3'],
          ],
        },
        {
          mel: [
            ['F3', 2],
            ['G3', 1],
            ['A3', 1],
            ['Bb3', 3],
            ['A3', 1],
            ['G3', 2],
            ['F3', 1],
            ['Eb3', 1],
            ['D3', 4],
          ],
          chords: [
            ['F1', 'C2', 'F2', 'A2'],
            ['Bb1', 'F2', 'Bb2', 'D3'],
            ['Eb2', 'Bb2', 'Eb3', 'G3'],
            ['D2', 'A2', 'D3', 'F3'],
          ],
        },
      ],
      rest: 4,
    },
    battle: {
      bpm: 120,
      meter: 4,
      roots: ['D2', 'D2', 'Eb2', 'D2', 'C2', 'Bb1', 'Eb2', 'A1'],
      chords: { D2: ['D3', 'F3', 'A3'], Eb2: ['Eb3', 'G3', 'Bb3'], C2: ['C3', 'Eb3', 'G3'], Bb1: ['Bb2', 'D3', 'F3'], A1: ['A2', 'C#3', 'E3'] },
      lead: [
        [
          ['D4', 2],
          ['Eb4', 1],
          ['D4', 1],
        ],
        [
          ['A4', 2],
          ['G4', 1],
          ['F4', 1],
        ],
        [
          ['G4', 1],
          ['F4', 1],
          ['Eb4', 2],
        ],
        [['D4', 4]],
        [
          ['C5', 2],
          ['Bb4', 1],
          ['G4', 1],
        ],
        [
          ['F4', 1],
          ['G4', 1],
          ['F4', 1],
          ['D4', 1],
        ],
        [
          ['Eb4', 2],
          ['G4', 2],
        ],
        [
          ['E4', 2],
          ['C#4', 2],
        ],
      ],
      bell: 'D2',
      killBell: 'A2',
      ringBell: 'D2',
      clear: ['D2', 'A2', 'D3', 'F3', 'A3'],
    },
  },
  // THE HIVE-SONG (Act C: the hive's beat is one and a half seconds): a choir in G harmonic minor over the harmonium, a soft low drum on one and
  // three, so at 80 a bar is two of the hive's beats;
  // the second phrase ends on D major, never at home. Battle: in THREE at 120, so a bar is exactly one of the hive's beats.
  hive: {
    name: 'hive',
    calm: {
      bpm: 80,
      meter: 4,
      bell: 'G2',
      voices: { mel: 'choir', pad: 'harmonium', melGain: 0.12 },
      tick: { voice: 'tomL', beats: [0, 2], gain: 0.05, pan: -0.2 },
      phrases: [
        {
          mel: [
            ['G3', 1],
            ['A3', 1],
            ['Bb3', 2],
            ['C4', 1],
            ['D4', 1],
            ['Eb4', 2],
            ['D4', 1],
            ['C4', 1],
            ['Bb3', 1],
            ['A3', 1],
            ['G3', 4],
          ],
          chords: [
            ['G2', 'D3', 'G3', 'Bb3'],
            ['C2', 'G2', 'C3', 'Eb3'],
            ['D2', 'A2', 'D3', 'F#3'],
            ['G2', 'D3', 'G3', 'Bb3'],
          ],
        },
        {
          mel: [
            ['D4', 2],
            ['Eb4', 1],
            ['D4', 1],
            ['F#4', 2],
            ['G4', 2],
            ['Eb4', 1],
            ['D4', 1],
            ['C4', 1],
            ['Bb3', 1],
            ['A3', 2],
            ['F#3', 2],
          ],
          chords: [
            ['Eb2', 'Bb2', 'Eb3', 'G3'],
            ['D2', 'A2', 'D3', 'F#3'],
            ['C2', 'G2', 'C3', 'Eb3'],
            ['D2', 'A2', 'D3', 'F#3'],
          ],
        },
      ],
      rest: 2,
    },
    battle: {
      bpm: 120,
      meter: 3,
      roots: ['G1', 'G1', 'Eb2', 'D2', 'G1', 'C2', 'Eb2', 'D2'],
      chords: { G1: ['G2', 'Bb2', 'D3'], Eb2: ['Eb3', 'G3', 'Bb3'], D2: ['D3', 'F#3', 'A3'], C2: ['C3', 'Eb3', 'G3'] },
      lead: [
        [
          ['G4', 1],
          ['Bb4', 1],
          ['D5', 1],
        ],
        [
          ['C5', 1.5],
          ['Bb4', 0.5],
          ['A4', 1],
        ],
        [
          ['Bb4', 1],
          ['G4', 1],
          ['Eb5', 1],
        ],
        [
          ['D5', 2],
          ['F#4', 1],
        ],
        [
          ['G4', 1],
          ['A4', 1],
          ['Bb4', 1],
        ],
        [
          ['C5', 2],
          ['Eb5', 1],
        ],
        [
          ['D5', 1],
          ['C5', 1],
          ['Bb4', 1],
        ],
        [
          ['A4', 2],
          ['F#4', 1],
        ],
      ],
      bell: 'G2',
      killBell: 'D3',
      ringBell: 'G2',
      clear: ['G1', 'D2', 'G2', 'Bb2', 'D3'],
    },
  },
  // THE ROOT BELL (Act D, the end): the harbour's hymn from the first map comes back, a tone lower and slower, on a soft horn over the harmonium,
  // under the deepest bell in the game; its second
  // phrase stops on G, a long way from home. Battle: the harbour's battle tune, a tone lower, an octave higher and faster.
  root: {
    name: 'root',
    calm: {
      bpm: 44,
      meter: 3,
      bell: 'C2',
      voices: { mel: 'horn', pad: 'harmonium', melGain: 0.12 },
      phrases: [
        {
          mel: [
            ['C3', 1],
            ['Eb3', 1],
            ['G3', 1],
            ['F3', 1.5],
            ['Eb3', 0.5],
            ['D3', 1],
            ['Eb3', 1],
            ['D3', 1],
            ['Bb2', 1],
            ['C3', 3],
          ],
          chords: [
            ['C2', 'C3', 'Eb3', 'G3'],
            ['F2', 'F3', 'A3', 'C4'],
            ['Eb2', 'Eb3', 'G3', 'Bb3'],
            ['C2', 'C3', 'Eb3', 'G3'],
          ],
        },
        {
          mel: [
            ['G3', 1],
            ['A3', 1],
            ['Bb3', 1],
            ['C4', 2],
            ['G3', 1],
            ['A3', 1],
            ['G3', 1],
            ['F3', 1],
            ['G3', 3],
          ],
          chords: [
            ['G2', 'D3', 'G3', 'Bb3'],
            ['F2', 'F3', 'A3', 'C4'],
            ['D2', 'D3', 'F3', 'A3'],
            ['G2', 'D3', 'G3', 'Bb3'],
          ],
        },
      ],
      rest: 3,
    },
    battle: {
      bpm: 144,
      meter: 4,
      roots: ['C2', 'Bb1', 'Eb2', 'C2', 'Ab1', 'C2', 'F1', 'G1'],
      chords: {
        C2: ['C3', 'Eb3', 'G3'],
        Bb1: ['Bb2', 'D3', 'F3'],
        Eb2: ['Eb3', 'G3', 'Bb3'],
        Ab1: ['Ab2', 'C3', 'Eb3'],
        F1: ['F2', 'Ab2', 'C3'],
        G1: ['G2', 'B2', 'D3'],
      },
      lead: [
        [
          ['C5', 2],
          ['Eb5', 1],
          ['G5', 1],
        ],
        [
          ['F5', 1.5],
          ['Eb5', 0.5],
          ['D5', 2],
        ],
        [
          ['Eb5', 1],
          ['D5', 1],
          ['Bb4', 2],
        ],
        [['C5', 4]],
        [
          ['G5', 1],
          ['Ab5', 1],
          ['Bb5', 2],
        ],
        [
          ['C6', 3],
          ['G5', 1],
        ],
        [
          ['Ab5', 1],
          ['G5', 1],
          ['F5', 2],
        ],
        [['G5', 4]],
      ],
      bell: 'C2',
      killBell: 'G2',
      ringBell: 'C3',
      clear: ['C2', 'G2', 'C3', 'Eb3', 'G3'],
    },
  },
};

/** which theme a map plays (null = the older generative score, until that place has its own theme) */
export function themeFor(mapId, map) {
  const named = map?.atmosphere?.music;
  if (named !== undefined) return named && THEMES[named] ? named : null;
  if (/^C1E1/.test(mapId ?? '')) return 'harbour';
  if (/^C1E2/.test(mapId ?? '')) return 'works';
  if (/^C1E3/.test(mapId ?? '')) return 'choir';
  if (/^C1E4/.test(mapId ?? '')) return 'gate';
  const m = /^C2([MS])(\d+)$/.exec(mapId ?? '');
  if (m) {
    const n = Number(m[2]);
    if (m[1] === 'S') return n === 1 ? 'deep' : 'hive';
    return n <= 8 ? 'threshold' : n <= 16 ? 'deep' : n <= 24 ? 'hive' : 'root';
  } // Campaign Two, a theme an act (the secrets take their act's)
  return null;
}
/** the seconds a beat lasts in a section */
export const beatSeconds = (section) => 60 / section.bpm;

/** CALM: every event of phrase `i` (beats from the phrase's start) and the phrase's length in beats */
export function calmPhrase(theme, i) {
  const C = THEMES[theme].calm,
    P = C.phrases[i % C.phrases.length],
    V = { mel: 'cello', pad: 'harmonium', melGain: 0.13, ...C.voices },
    ev = C.bell ? [{ at: 0, voice: 'bell', f: NOTE(C.bell), gain: 0.07, pan: -0.5 }] : [];
  P.chords.forEach((ch, b) =>
    ch.forEach((n, j) =>
      ev.push({ at: b * C.meter, dur: C.meter + 0.05, voice: V.pad, f: NOTE(n), gain: j === 0 ? 0.05 : 0.032, pan: [0, -0.35, 0.1, 0.35][j] }),
    ),
  );
  if (C.tick)
    for (let b = 0; b < P.chords.length * C.meter; b++)
      // the works keep time: an anvil on two and four
      if (C.tick.beats.includes(b % C.meter)) ev.push({ at: b, voice: C.tick.voice, gain: C.tick.gain, pan: C.tick.pan ?? 0.4 });
  let t = 0,
    prev = 0;
  for (const [n, b] of P.mel) {
    const f = NOTE(n);
    ev.push({ at: t, dur: b - 0.02, voice: V.mel, f, gain: V.melGain, pan: 0.15, vib: 16, glide: prev });
    prev = f;
    t += b;
  }
  return { events: ev, beats: P.chords.length * C.meter + C.rest };
}

/** BATTLE, one beat: the drums and the bass of beat `q` of bar `bar` at `level` (beats from the beat's start) */
export function battleBeat(theme, bar, q, level) {
  const B = THEMES[theme].battle,
    root = NOTE(B.roots[bar % B.roots.length]),
    ev = [];
  if (level === 1) {
    ev.push({ at: 0, voice: 'kick', gain: q % 2 ? 0.25 : 0.45 }, { at: 0.5, voice: 'anvil', gain: 0.035, pan: 0.6 });
    if (q === 0) ev.push({ at: 0, dur: B.meter - 0.1, voice: 'bass', f: root, gain: 0.07, pan: 0, held: true });
  }
  if (level >= 2) {
    ev.push({ at: 0, voice: 'kick', gain: q % 2 ? 0.45 : 0.75 }, { at: 0.5, voice: 'anvil', gain: 0.06, pan: 0.55 });
    if (q % 2) ev.push({ at: 0, voice: 'snare', gain: 0.32, pan: -0.1 });
    for (const e of [0, 0.5]) {
      const acc = (q === 0 && e === 0) || (q === 2 && e === 0.5) ? 1 : 0.6;
      ev.push(
        { at: e, dur: 0.27, voice: 'bass', f: root, gain: 0.11 * acc, pan: 0 },
        { at: e, dur: 0.27, voice: 'bass', f: root * 2, gain: 0.035 * acc, pan: 0.2 },
      );
    }
  }
  if (level === 3) {
    ev.push(
      { at: 0, voice: 'hat', gain: 0.12, pan: -0.4 },
      { at: 0.25, voice: 'hat', gain: 0.09, pan: 0.4 },
      { at: 0.75, voice: 'hat', gain: 0.09, pan: 0.4 },
      { at: 0, voice: 'kick', gain: 0.3 },
    );
    if (q === B.meter - 1) [0, 0.25, 0.5, 0.75].forEach((s, i) => ev.push({ at: s, voice: i < 2 ? 'tomH' : 'tomL', gain: 0.3, pan: i < 2 ? 0.3 : -0.3 }));
  }
  return ev;
}

/**
 * BATTLE, one bar's long notes (chords, the tune, the choir, the bell of an overwhelmed bar): only from level 2; `prevF` is the tune's last note (it
 * slides from it)
 */
export function battleBar(theme, bar, level, prevF = 0) {
  const B = THEMES[theme].battle,
    ev = [];
  if (level < 2) return { events: ev, lastF: prevF };
  const root = B.roots[bar % B.roots.length];
  B.chords[root].forEach((n, j) => ev.push({ at: 0, dur: B.meter - 0.1, voice: 'chordBrass', f: NOTE(n), gain: 0.03, pan: [-0.5, 0, 0.5][j] }));
  let t = 0,
    last = prevF;
  for (const [n, b] of B.lead[bar % B.lead.length]) {
    const f = NOTE(n);
    ev.push(
      { at: t, dur: b - 0.06, voice: 'brass', f, gain: 0.085, pan: -0.05, vib: 12, glide: last },
      { at: t, dur: b - 0.06, voice: 'cello', f: f / 2, gain: 0.05, pan: 0.25 },
    );
    if (level === 3) ev.push({ at: t, dur: b - 0.06, voice: 'brass', f: f * 2, gain: 0.04, pan: 0.3, vib: 12 });
    last = f;
    t += b;
  }
  if (level === 3) {
    B.chords[root].forEach((n, j) => ev.push({ at: 0, dur: B.meter, voice: 'choir', f: NOTE(n) * 2, gain: 0.03, pan: [-0.7, 0, 0.7][j], vib: 20 }));
    ev.push({ at: 0, voice: 'bell', f: NOTE(B.ringBell ?? 'D3'), gain: 0.12, pan: -0.4 });
  }
  return { events: ev, lastF: last };
}

/** STINGERS: 'start' (something noticed you), 'up3' (overwhelmed), 'up2' (the band comes in), 'kill' (a big one died), 'clear' (the room is clear) */
export function stinger(theme, kind) {
  const B = THEMES[theme].battle;
  if (kind === 'start')
    return [
      { at: 0, voice: 'bell', f: NOTE(B.bell), gain: 0.32, pan: 0 },
      { at: 0, voice: 'boom', gain: 0.35 },
    ];
  if (kind === 'up2') return [{ at: 0, voice: 'crash', gain: 0.2, pan: 0.3 }];
  if (kind === 'up3')
    return [
      { at: 0, voice: 'crash', gain: 0.2, pan: 0.3 },
      { at: 0, voice: 'boom', gain: 0.45 },
      { at: 0, voice: 'bell', f: NOTE(B.bell), gain: 0.3, pan: 0.2 },
    ];
  if (kind === 'kill')
    return [
      { at: 0, voice: 'bell', f: NOTE(B.killBell), gain: 0.4, pan: -0.2 },
      { at: 0, voice: 'crash', gain: 0.18, pan: -0.3 },
    ];
  if (kind === 'clear')
    return [
      { at: 0, voice: 'bell', f: NOTE(B.ringBell ?? 'D3'), gain: 0.3 },
      { at: 0, voice: 'kick', gain: 0.6 },
      { at: 0, voice: 'crash', gain: 0.18, pan: -0.2 },
      ...B.clear.map((n, j) => ({ at: 0, dur: 3.4, voice: 'chordBrass', f: NOTE(n), gain: j ? 0.04 : 0.07, pan: [0, -0.4, 0.4, -0.2, 0.2][j], rel: 1.8 })),
    ];
  throw new Error('no stinger ' + kind);
}
