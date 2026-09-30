/* A FIT file -> a template's sample. Usage: pnpm sample <activity.fit|.zip> [template] (default: film) */
import fs from 'node:fs';
import { open } from '../src/lib/fit.js';
import { build } from '../src/lib/build.js';

const [IN, TEMPLATE = 'film'] = process.argv.slice(2);
if (!IN) { console.error('usage: pnpm sample <activity.fit|.zip> [film|story|square|poster|print]'); process.exit(1); }
const OUT = `src/lib/samples/${TEMPLATE}.json`;

const b = fs.readFileSync(IN), RUN = build(await open(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)));
fs.writeFileSync(OUT, JSON.stringify(RUN));
console.log(`${OUT}: ${(fs.statSync(OUT).size / 1024).toFixed(1)} KB, ${RUN.track.x.length} track points, ${RUN.splits.length} splits of ${RUN.meta.splitKm} km`);
