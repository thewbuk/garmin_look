/* Which run a page draws: the visitor's own (kept in sessionStorage) or the template's sample. */
import { open } from './fit';
import { build } from './build';
import FILM from './samples/film.json';
import STORY from './samples/story.json';
import SQUARE from './samples/square.json';
import POSTER from './samples/poster.json';
import PRINT from './samples/print.json';

// made up by tools/mock.mts (pnpm mock)
const SAMPLES = { film: FILM, story: STORY, square: SQUARE, poster: POSTER, print: PRINT };

const KEY = 'garminLook.run', OPTS = 'garminLook.opts', WX = 'garminLook.weather';
const store = () => { try { return window.sessionStorage; } catch { return null; } };
const read = k => { try { return JSON.parse(store()?.getItem(k) || 'null'); } catch { return null; } };
const MESSAGES = {
  'not-fit': 'That is not a FIT file. Export the original file from your watch app, or the .zip Garmin Connect gives you.',
  'no-gps': 'This activity has no GPS track, so there is no route to draw.',
  'bad-zip': 'Could not read that zip file.', 'no-fit-in-zip': 'There is no .fit file inside that zip.', 'bad-fit': 'That FIT file looks damaged.',
  other: 'Could not read that file.',
};

export const isSample = () => !read(KEY);
export const sample = (template = 'film') => structuredClone(SAMPLES[template] || FILM);
export const opts = () => read(OPTS) || {};
export const setOpts = o => store()?.setItem(OPTS, JSON.stringify(o));
export const weather = () => read(WX);
export function setWeather(w) { store()?.setItem(WX, JSON.stringify(w)); dispatchEvent(new Event('garminlook:look')); }
export function current(template) {
  const mine = read(KEY), run = mine || sample(template), w = weather();
  if (mine) { const o = opts(); if (o.name) mine.meta.name = o.name; if (o.place) mine.meta.place = o.place; }
  if (w) run.meta.weather = { ...run.meta.weather, ...w };
  return run;
}
export async function load(file) { const run = build(await open(await file.arrayBuffer())); store()?.setItem(KEY, JSON.stringify(run)); return run; }
export function clear() { store()?.removeItem(KEY); store()?.removeItem(OPTS); store()?.removeItem(WX); }
export const message = err => MESSAGES[err && err.message] || MESSAGES.other;
/** @param {{ button?: HTMLElement | null, signal?: AbortSignal, onError?: (msg: string) => void, onLoad?: () => void }} [o] */
export function attach({ button, signal, onError = msg => alert(msg), onLoad = () => location.reload() } = {}) {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.fit,.zip' });
  const take = async file => { if (!file) return; try { await load(file); onLoad(); } catch (e) { console.warn(e); onError(message(e)); } };
  input.addEventListener('change', () => take(input.files[0]));
  if (button) button.addEventListener('click', () => { input.value = ''; input.click(); }, { signal });
  addEventListener('dragover', e => e.preventDefault(), { signal });
  addEventListener('drop', e => { e.preventDefault(); take(e.dataTransfer.files[0]); }, { signal });
  return { pick: () => { input.value = ''; input.click(); } };
}
