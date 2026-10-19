// THE TONE SHOULDER (PT-061, V4 of design/VISUAL_DIRECTION.md): the curve the post pass puts on the LINEAR colour before the sRGB encode and the painted value steps. The audit found the tone clip narrow (exit frames and the finale: 14.6% of the pixels in the top band): a
// hard clamp at 1 turned every bright pixel to the same white. A shoulder f(x) = x (1 + k) / (1 + k x) keeps f(0) = 0 and f(1) = 1 and rolls the top over (its slope at 1 is 1 / (1 + k)), and the exposure is trimmed by `pre` first so the MIDTONES stay where they were (a mean-luma change of
// more than a few per cent would be a different picture) while the pixel that used to clip at 1 now clips at 1 / pre. This is the node twin of `shoulder()` in the GLSL of post.js: NEVER edit one without the other (tests/tonecurve.test.js reads the numbers back out of the shader source).
export const SHOULDER = Object.freeze({ k: 0.6, pre: 0.72 });
/** the curve on one linear channel (x >= 0), exposure already applied */
export const shoulder = (x, k = SHOULDER.k, pre = SHOULDER.pre) => { const y = Math.max(0, x) * pre; return y * (1 + k) / (1 + k * y); };
/** the inverse of the curve on [0, 1): the linear input that gives output `v` (so a test can ask how much of the input range a band of the output covers) */
export const unshoulder = (v, k = SHOULDER.k, pre = SHOULDER.pre) => (v / (1 + k - k * v)) / pre;
