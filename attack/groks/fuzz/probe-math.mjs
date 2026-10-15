// GROKS — throwaway numeric and prototype probes. Safe to re-run.
const ys = [1e16, 1e18, 1e20, 1e21, 1e308, Math.PI * 1e15, 1e308 * Math.PI];
for (const y of ys) console.log('sin', y, Math.sin(y), Math.cos(y));
console.log('hypot nan', Math.hypot(NaN, 0));
console.log('inf*0', Infinity * 0);
console.log('nan||0', (NaN || 0));
const o = JSON.parse('{"__proto__":{"pwn":1}}');
console.log('json proto own', Object.hasOwn(o, '__proto__'), 'o.pwn', o.pwn, 'fresh.pwn', ({}).pwn);
const o2 = { ['__proto__']: { pwn: 2 } };
console.log('computed keys', Object.keys(o2), 'o2.pwn', o2.pwn, 'fresh2', ({}).pwn);
const spread = { ...{ ['__proto__']: { pwn: 3 } } };
console.log('spread keys', Object.keys(spread), 'spread.pwn', spread.pwn, 'fresh3', ({}).pwn);
