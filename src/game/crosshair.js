// PT-048 / V2 (the owner, 2026-10-14: "we need to make the cross hair stand out a bit more, the hallow circle is hard to see. A cross or a solid dot would be better."): the crosshair's settings, PURE.
// The default is a CROSS of four ticks round a centre dot, near white with a dark outline (index.html #cross), sized in viewport units so it does not shrink on a big screen. The player can pick a style, a size, a colour and an opacity.
// Measured on the 2026-10-14 baseline, the old 7 px hollow teal ring differed from the ground behind it by a median 17.8 luma of 255 (under 10 in a third of the frames): `node tools/dev/crosshair-contrast.mjs`.
export const CROSSHAIR_STYLES = Object.freeze(['crossdot', 'cross', 'dot', 'circle']);
export const CROSSHAIR_SIZES = Object.freeze({ small: 0.8, medium: 1, large: 1.35 });                               // a factor on the base sizes in index.html
export const CROSSHAIR_COLORS = Object.freeze({ white: '#f4f1e8', teal: '#3fffe0', amber: '#ffb347', red: '#ff5a4a', green: '#7be05a' });
export const OPACITY_RANGE = Object.freeze([0.3, 1]);

export const defaultCrosshair = () => ({ style: 'crossdot', size: 'medium', color: 'white', opacity: 0.95 });

/** repair a stored crosshair field by field (a missing one, an old save, a foreign value all fall back to the default); never throws, never trusts a key name (`toString`, `__proto__`) */
export function sanitizeCrosshair(raw) {
  const d = defaultCrosshair(); if (!raw || typeof raw !== 'object') return d;
  const own = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);
  return {
    style: CROSSHAIR_STYLES.includes(raw.style) ? raw.style : d.style,
    size: own(CROSSHAIR_SIZES, raw.size) ? raw.size : d.size,
    color: own(CROSSHAIR_COLORS, raw.color) ? raw.color : d.color,
    opacity: Number.isFinite(raw.opacity) ? Math.min(OPACITY_RANGE[1], Math.max(OPACITY_RANGE[0], raw.opacity)) : d.opacity,
  };
}

/** what index.html needs: the `data-style` of #cross and three CSS variables (--xc colour, --xk size factor, --xo opacity). The shapes and the states (guard, riposte, suppressed, the fork's grab) are CSS. */
export function crosshairCss(ch) {
  const c = sanitizeCrosshair(ch);
  return { style: c.style, vars: { '--xc': CROSSHAIR_COLORS[c.color], '--xk': String(CROSSHAIR_SIZES[c.size]), '--xo': String(c.opacity) } };
}
