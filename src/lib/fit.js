/* Minimal FIT decoder for browser and Node. Only the messages in MSG; unknown fields of non-record messages are kept as f<number>. */
const EPOCH = 631065600;                                  // FIT time starts 1989-12-31T00:00:00Z
const SEMI = 180 / 2147483648;                            // semicircles -> degrees
// base type (low 5 bits) -> [bytes, DataView getter, invalid value]
const BASE = { 0: [1, 'getUint8', 0xFF], 1: [1, 'getInt8', 0x7F], 2: [1, 'getUint8', 0xFF], 3: [2, 'getInt16', 0x7FFF], 4: [2, 'getUint16', 0xFFFF],
  5: [4, 'getInt32', 0x7FFFFFFF], 6: [4, 'getUint32', 0xFFFFFFFF], 7: [1, 'string'], 8: [4, 'getFloat32'], 9: [8, 'getFloat64'],
  10: [1, 'getUint8', 0], 11: [2, 'getUint16', 0], 12: [4, 'getUint32', 0], 13: [1, 'getUint8', 0xFF], 14: [8], 15: [8], 16: [8] };
// message number -> [name, { field number: [name, scale, offset] }]; value = raw / scale - offset
const MSG = {
  20: ['record', { 253: ['timestamp'], 0: ['lat', 1 / SEMI], 1: ['lon', 1 / SEMI], 2: ['altitude', 5, 500], 78: ['altitude', 5, 500], 3: ['heartRate'], 4: ['cadence'],
    53: ['fractionalCadence', 128], 5: ['distance', 100], 6: ['speed', 1000], 73: ['speed', 1000], 7: ['power'], 13: ['temperature'] }],
  18: ['session', { 253: ['timestamp'], 2: ['startTime'], 5: ['sport'], 6: ['subSport'], 7: ['elapsed', 1000], 8: ['timer', 1000], 9: ['distance', 100], 10: ['cycles'],
    11: ['calories'], 16: ['avgHeartRate'], 17: ['maxHeartRate'], 18: ['avgCadence'], 20: ['avgPower'], 22: ['ascent'], 23: ['descent'], 24: ['trainingEffect', 10],
    92: ['avgFractionalCadence', 128], 168: ['trainingLoad', 65536] }],
  34: ['activity', { 253: ['timestamp'], 5: ['localTimestamp'] }],
  21: ['event', { 253: ['timestamp'], 0: ['event'], 1: ['eventType'] }],
  12: ['sport', { 0: ['sport'], 1: ['subSport'], 3: ['name'] }],
  216: ['timeInZone', { 0: ['referenceMesg'], 2: ['timeInHrZone', 1000], 6: ['hrZoneHigh'], 11: ['maxHeartRate'], 12: ['restingHeartRate'] }],
};
const TIME = new Set(['timestamp', 'startTime']);

function decode(buffer) {
  const dv = new DataView(buffer instanceof ArrayBuffer ? buffer : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  const out = { record: [], session: [], activity: [], sport: [], event: [], timeInZone: [] }, td = new TextDecoder();
  let pos = 0;
  try {                                                                                  // a cut-off file keeps what decoded
  while (pos + 12 <= dv.byteLength) {                                                   // a file may be several FIT files chained
    const hs = dv.getUint8(pos), size = dv.getUint32(pos + 4, true);
    if (td.decode(new Uint8Array(dv.buffer, pos + 8, 4)) !== '.FIT') { if (pos === 0) throw new Error('not-fit'); break; }
    const end = Math.min(dv.byteLength, pos + hs + size), defs = {}; let p = pos + hs, lastTime = 0;
    while (p < end) {
      const hdr = dv.getUint8(p++), compressed = hdr & 0x80;
      if (!compressed && hdr & 0x40) {                                                  // definition message
        const le = dv.getUint8(p + 1) === 0, num = dv.getUint16(p + 2, le), nf = dv.getUint8(p + 4); p += 5;
        const fields = []; for (let i = 0; i < nf; i++, p += 3) fields.push([dv.getUint8(p), dv.getUint8(p + 1), dv.getUint8(p + 2) & 0x1F]);
        let dev = 0; if (hdr & 0x20) { const nd = dv.getUint8(p++); for (let i = 0; i < nd; i++, p += 3) dev += dv.getUint8(p + 1); }
        defs[hdr & 0x0F] = { le, num, fields, dev };
        continue;
      }
      const def = defs[compressed ? (hdr >> 5) & 3 : hdr & 0x0F];
      if (!def) throw new Error('bad-fit');
      if (p + def.fields.reduce((s, f) => s + f[1], 0) + def.dev > end) break;
      const spec = MSG[def.num], m = spec ? {} : null;
      for (const [fnum, fsize, bt] of def.fields) {
        if (!m && fnum === 253 && fsize === 4) lastTime = dv.getUint32(p, def.le);     // compressed timestamps count from any message
        if (m) {
          const base = BASE[bt] || BASE[13], known = spec[1][fnum];
          if (known || (spec[0] !== 'record' && spec[0] !== 'event')) {
            let v;
            if (base[1] === 'string') v = td.decode(new Uint8Array(dv.buffer, p, fsize)).split('\0')[0];
            else if (base[1]) {
              const n = fsize / base[0], vals = [];
              for (let i = 0; i < n; i++) { let x = dv[base[1]](p + i * base[0], def.le); if (x === base[2] || Number.isNaN(x)) x = null; vals.push(x); }
              v = n === 1 ? vals[0] : vals;
            }
            if (v != null) {
              if (known) { const [name, scale, offset] = known, f = x => (x == null ? null : (scale ? x / scale : x) - (offset || 0));
                v = Array.isArray(v) ? v.map(f) : f(v); if (TIME.has(name)) v += EPOCH; if (fnum === 253) lastTime = v - EPOCH; m[name] = v; }
              else m['f' + fnum] = v;
            }
          }
        }
        p += fsize;
      }
      p += def.dev;
      if (m) {
        if (compressed) { const off = hdr & 0x1F; lastTime = (lastTime & ~0x1F) + off + (off < (lastTime & 0x1F) ? 32 : 0); m.timestamp = lastTime + EPOCH; }
        out[spec[0]].push(m);
      }
    }
    pos = end + 2;                                                                       // the 2-byte CRC
  }
  } catch (e) { if (!(e instanceof RangeError) || !out.record.length) throw e; }
  if (out.activity[0]?.localTimestamp != null) out.activity[0].localTimestamp += EPOCH;
  return out;
}

// first .fit inside a zip (stored or deflated)
async function unzip(buffer) {
  const dv = new DataView(buffer), u8 = new Uint8Array(buffer), td = new TextDecoder();
  let e = dv.byteLength - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('bad-zip');
  let p = dv.getUint32(e + 16, true); const count = dv.getUint16(e + 10, true);
  for (let i = 0; i < count; i++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), local = dv.getUint32(p + 42, true);
    const name = td.decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
    if (!/\.fit$/i.test(name) || /(^|\/)(__MACOSX\/|\._)/.test(name)) continue;
    const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true), data = u8.slice(start, start + csize);
    if (method === 0) return data.buffer;
    if (method !== 8) throw new Error('bad-zip');
    return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
  }
  throw new Error('no-fit-in-zip');
}

async function open(buffer) {
  const sig = new DataView(buffer).getUint32(0, true);
  return decode(sig === 0x04034b50 ? await unzip(buffer) : buffer);
}

export const FIT = { decode, open, unzip };
export { decode, open, unzip };
