// PORTABLE MATHS (PT-076). The simulation must compute the same bits wherever it runs: the headless Node sim that plays the route bot for the gates, the browser the player plays in, and the desktop wrapper. It did not: headless Chrome 154's
// Math.sin, cos and atan2 differ from Node's (V8 13.6) in the last bit for about one argument in twenty (a probe of 28 000 arguments, 2026-10-27: sin 1150, cos 1210, atan2 6693 differ; hypot and pow agree), so a route
// played in the real game drifted from the Node sim by 1e-12 m and the state hash, rounded to 1e-5, flipped on eight maps once the creatures' brain moved them more. These are ports of the fdlibm routines Node's V8 uses
// (`src/base/ieee754.cc`), written with nothing but IEEE double arithmetic (which JavaScript defines exactly: every operation rounded, no fused multiply-add), so every engine gives the same answer. `tests/dmath.test.js`
// holds them to Node's own Math bit for bit over millions of arguments, so the Node sim (and every gate the maps passed) is unchanged; only the browser moves, onto Node's numbers.
// Arguments past 2^19 pi / 2 (about 823 550) would need fdlibm's long reduction; the sim never comes near (its largest is a wander hash of a few thousand), so those fall back to Math.
const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
const HI = (x) => { f64[0] = x; return u32[1] | 0; }, LO = (x) => { f64[0] = x; return u32[0]; };
const WORDS = (h, l) => { u32[1] = h >>> 0; u32[0] = l >>> 0; return f64[0]; };

// ---- k_sin.c, k_cos.c
const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04, S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
function kSin(x, y, iy) {
  const ix = HI(x) & 0x7fffffff;
  if (ix < 0x3e400000 && (x | 0) === 0) return x;
  const z = x * x, v = z * x, r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  return iy === 0 ? x + v * (S1 + z * r) : x - ((z * (0.5 * y - v * r) - y) - v * S1);
}
const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05, C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;
function kCos(x, y) {
  const ix = HI(x) & 0x7fffffff;
  if (ix < 0x3e400000 && (x | 0) === 0) return 1;
  const z = x * x, r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  if (ix < 0x3fd33333) return 1 - (0.5 * z - (z * r - x * y));
  const qx = ix > 0x3fe90000 ? 0.28125 : WORDS(ix - 0x00200000, 0), hz = 0.5 * z - qx, a = 1 - qx;
  return a - (hz - (z * r - x * y));
}

// ---- e_rem_pio2.c (the small and medium cases); returns n, writes y0 / y1
const INVPIO2 = 6.36619772367581382433e-01, PIO2_1 = 1.57079632673412561417e+00, PIO2_1T = 6.07710050650619224932e-11, PIO2_2 = 6.07710050630396597660e-11, PIO2_2T = 2.02226624879595063154e-21, PIO2_3 = 2.02226624871116645580e-21, PIO2_3T = 8.47842766036889956997e-32;
const NPIO2_HW = [0x3FF921FB, 0x400921FB, 0x4012D97C, 0x401921FB, 0x401F6A7A, 0x4022D97C, 0x4025FDBB, 0x402921FB, 0x402C463A, 0x402F6A7A, 0x4031475C, 0x4032D97C, 0x40346B9C, 0x4035FDBB, 0x40378FDB, 0x403921FB,
  0x403AB41B, 0x403C463A, 0x403DD85A, 0x403F6A7A, 0x40407E4C, 0x4041475C, 0x4042106C, 0x4042D97C, 0x4043A28C, 0x40446B9C, 0x404534AC, 0x4045FDBB, 0x4046C6CB, 0x40478FDB, 0x404858EB, 0x404921FB];
let Y0 = 0, Y1 = 0;
function remPio2(x) {
  const hx = HI(x), ix = hx & 0x7fffffff;
  if (ix < 0x4002d97c) {                                                       // |x| < 3 pi / 4: n is +-1
    if (hx > 0) { let z = x - PIO2_1; if (ix !== 0x3ff921fb) { Y0 = z - PIO2_1T; Y1 = (z - Y0) - PIO2_1T; } else { z -= PIO2_2; Y0 = z - PIO2_2T; Y1 = (z - Y0) - PIO2_2T; } return 1; }
    let z = x + PIO2_1; if (ix !== 0x3ff921fb) { Y0 = z + PIO2_1T; Y1 = (z - Y0) + PIO2_1T; } else { z += PIO2_2; Y0 = z + PIO2_2T; Y1 = (z - Y0) + PIO2_2T; } return -1;
  }
  const t0 = Math.abs(x), n = (t0 * INVPIO2 + 0.5) | 0, fn = n;
  let r = t0 - fn * PIO2_1, w = fn * PIO2_1T;
  if (n < 32 && ix !== NPIO2_HW[n - 1]) Y0 = r - w;
  else {
    const j = ix >> 20; Y0 = r - w; let i = j - ((HI(Y0) >> 20) & 0x7ff);
    if (i > 16) {
      let t = r; w = fn * PIO2_2; r = t - w; w = fn * PIO2_2T - ((t - r) - w); Y0 = r - w; i = j - ((HI(Y0) >> 20) & 0x7ff);
      if (i > 49) { t = r; w = fn * PIO2_3; r = t - w; w = fn * PIO2_3T - ((t - r) - w); Y0 = r - w; }
    }
  }
  Y1 = (r - Y0) - w;
  if (hx < 0) { Y0 = -Y0; Y1 = -Y1; return -n; }
  return n;
}
const MEDIUM = 0x413921fb;

/** sin(x), the same bits on every engine */
export function sin(x) {
  const ix = HI(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kSin(x, 0, 0);
  if (ix >= 0x7ff00000) return x - x;
  if (ix > MEDIUM) return Math.sin(x);
  const n = remPio2(x);
  switch (n & 3) { case 0: return kSin(Y0, Y1, 1); case 1: return kCos(Y0, Y1); case 2: return -kSin(Y0, Y1, 1); default: return -kCos(Y0, Y1); }
}
/** cos(x), the same bits on every engine */
export function cos(x) {
  const ix = HI(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kCos(x, 0);
  if (ix >= 0x7ff00000) return x - x;
  if (ix > MEDIUM) return Math.cos(x);
  const n = remPio2(x);
  switch (n & 3) { case 0: return kCos(Y0, Y1); case 1: return -kSin(Y0, Y1, 1); case 2: return -kCos(Y0, Y1); default: return kSin(Y0, Y1, 1); }
}

// ---- s_atan.c, e_atan2.c
const ATANHI = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00];
const ATANLO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
const AT = [3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01, -1.11111104054623557880e-01, 9.09088713343650656196e-02, -7.69187620504482999495e-02,
  6.66107313738753120669e-02, -5.83357013379057348645e-02, 4.97687799461593236017e-02, -3.65315727442169155270e-02, 1.62858201153657823623e-02];
/** atan(x), the same bits on every engine */
export function atan(x) {
  const hx = HI(x), ix = hx & 0x7fffffff; let id;
  if (ix >= 0x44100000) { if (ix > 0x7ff00000 || (ix === 0x7ff00000 && LO(x) !== 0)) return x + x; return hx > 0 ? ATANHI[3] + ATANLO[3] : -ATANHI[3] - ATANLO[3]; }
  if (ix < 0x3fdc0000) { if (ix < 0x3e400000) return x; id = -1; }
  else {
    x = Math.abs(x);
    if (ix < 0x3ff30000) { if (ix < 0x3fe60000) { id = 0; x = (2 * x - 1) / (2 + x); } else { id = 1; x = (x - 1) / (x + 1); } }
    else if (ix < 0x40038000) { id = 2; x = (x - 1.5) / (1 + 1.5 * x); } else { id = 3; x = -1 / x; }
  }
  const z = x * x, w = z * z;
  const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10]))))), s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
  if (id < 0) return x - x * (s1 + s2);
  const r = ATANHI[id] - ((x * (s1 + s2) - ATANLO[id]) - x);
  return hx < 0 ? -r : r;
}
const PI_O_4 = 7.8539816339744827900e-01, PI_O_2 = 1.5707963267948965580e+00, PI = 3.1415926535897931160e+00, PI_LO = 1.2246467991473531772e-16, TINY = 1.0e-300;
/** atan2(y, x), the same bits on every engine */
export function atan2(y, x) {
  const hx = HI(x), ix = hx & 0x7fffffff, lx = LO(x), hy = HI(y), iy = hy & 0x7fffffff, ly = LO(y);
  if (Number.isNaN(x) || Number.isNaN(y)) return x + y;
  if (((hx - 0x3ff00000) | lx) === 0) return atan(y);                          // x = 1
  const m = ((hy >> 31) & 1) | ((hx >> 30) & 2);
  if ((iy | ly) === 0) { switch (m) { case 0: case 1: return y; case 2: return PI + TINY; default: return -PI - TINY; } }
  if ((ix | lx) === 0) return hy < 0 ? -PI_O_2 - TINY : PI_O_2 + TINY;
  if (ix === 0x7ff00000) {
    if (iy === 0x7ff00000) { switch (m) { case 0: return PI_O_4 + TINY; case 1: return -PI_O_4 - TINY; case 2: return 3 * PI_O_4 + TINY; default: return -3 * PI_O_4 - TINY; } }
    switch (m) { case 0: return 0; case 1: return -0; case 2: return PI + TINY; default: return -PI - TINY; }
  }
  if (iy === 0x7ff00000) return hy < 0 ? -PI_O_2 - TINY : PI_O_2 + TINY;
  const k = (iy - ix) >> 20; let z;
  if (k > 60) z = PI_O_2 + 0.5 * PI_LO; else if (hx < 0 && k < -60) z = 0; else z = atan(Math.abs(y / x));
  switch (m) { case 0: return z; case 1: return -z; case 2: return PI - (z - PI_LO); default: return (z - PI_LO) - PI; }
}

// ---- e_acos.c
const PIO2_HI = 1.57079632679489655800e+00, PIO2_LO = 6.12323399573676603587e-17, PS0 = 1.66666666666666657415e-01, PS1 = -3.25565818622400915405e-01, PS2 = 2.01212532134862925881e-01, PS3 = -4.00555345006794114027e-02,
  PS4 = 7.91534994289814532176e-04, PS5 = 3.47933107596021167570e-05, QS1 = -2.40339491173441421878e+00, QS2 = 2.02094576023350569471e+00, QS3 = -6.88283971605453293030e-01, QS4 = 7.70381505559019352791e-02;
const PQ = (z) => (z * (PS0 + z * (PS1 + z * (PS2 + z * (PS3 + z * (PS4 + z * PS5)))))) / (1 + z * (QS1 + z * (QS2 + z * (QS3 + z * QS4))));
/** acos(x), the same bits on every engine */
export function acos(x) {
  const hx = HI(x), ix = hx & 0x7fffffff;
  if (ix >= 0x3ff00000) { if (((ix - 0x3ff00000) | LO(x)) === 0) return hx > 0 ? 0 : PI + 2 * PIO2_LO; return (x - x) / (x - x); }
  if (ix < 0x3fe00000) { if (ix <= 0x3c600000) return PIO2_HI + PIO2_LO; const r = PQ(x * x); return PIO2_HI - (x - (PIO2_LO - x * r)); }
  if (hx < 0) { const z = (1 + x) * 0.5, s = Math.sqrt(z), r = PQ(z), w = r * s - PIO2_LO; return PI - 2 * (s + w); }
  const z = (1 - x) * 0.5, s = Math.sqrt(z), df = WORDS(HI(s), 0), c = (z - df * df) / (s + df), r = PQ(z), w = r * s + c;
  return 2 * (df + w);
}

// ---- e_exp.c
const HALF = [0.5, -0.5], LN2HI = [6.93147180369123816490e-01, -6.93147180369123816490e-01], LN2LO = [1.90821492927058770002e-10, -1.90821492927058770002e-10], INVLN2 = 1.44269504088896338700e+00,
  P1 = 1.66666666666666019037e-01, P2 = -2.77777777770155933842e-03, P3 = 6.61375632143793436117e-05, P4 = -1.65339022054652515390e-06, P5 = 4.13813679705723846039e-08, TWOM1000 = 9.33263618503218878990e-302;
/** exp(x), the same bits on every engine */
export function exp(x) {
  let hx = HI(x); const xsb = (hx >> 31) & 1; hx &= 0x7fffffff; let hi = 0, lo = 0, k = 0;
  if (hx >= 0x40862e42) {
    if (hx >= 0x7ff00000) { if (((hx & 0xfffff) | LO(x)) !== 0) return x + x; return xsb === 0 ? x : 0; }
    if (x > 7.09782712893383973096e+02) return Infinity;
    if (x < -7.45133219101941108420e+02) return 0;
  }
  if (hx > 0x3fd62e42) {
    if (hx < 0x3ff0a2b2) { hi = x - LN2HI[xsb]; lo = LN2LO[xsb]; k = 1 - xsb - xsb; }
    else { k = (INVLN2 * x + HALF[xsb]) | 0; const t = k; hi = x - t * LN2HI[0]; lo = t * LN2LO[0]; }
    x = hi - lo;
  } else if (hx < 0x3e300000) return 1 + x;
  const t = x * x, c = x - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  if (k === 0) return 1 - ((x * c) / (c - 2) - x);
  const y = 1 - ((lo - (x * c) / (2 - c)) - hi);
  if (k >= -1021) return WORDS(HI(y) + (k << 20), LO(y));
  return WORDS(HI(y) + ((k + 1000) << 20), LO(y)) * TWOM1000;
}
