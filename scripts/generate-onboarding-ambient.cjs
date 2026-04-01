/**
 * Writes assets/sounds/onboarding_ambient.wav — layered low drones + subtle noise.
 * Run: node scripts/generate-onboarding-ambient.cjs
 */
const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const durationSec = 20;
const numSamples = sampleRate * durationSec;

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
}

const dataSize = numSamples * 2;
const buffer = Buffer.alloc(44 + dataSize);
const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

writeString(view, 0, 'RIFF');
view.setUint32(4, 36 + dataSize, true);
writeString(view, 8, 'WAVE');
writeString(view, 12, 'fmt ');
view.setUint32(16, 16, true);
view.setUint16(20, 1, true);
view.setUint16(22, 1, true);
view.setUint32(24, sampleRate, true);
view.setUint32(28, sampleRate * 2, true);
view.setUint16(32, 2, true);
view.setUint16(34, 16, true);
writeString(view, 36, 'data');
view.setUint32(40, dataSize, true);

let p1 = 0;
let p2 = 0;
let p3 = 0;
let p4 = 0;
const f1 = 48;
const f2 = 72;
const f3 = 32;
const f4 = 96;

let seed = 12345;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x7fffffff) * 2 - 1;
}

for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const breath = 0.55 + 0.45 * Math.sin((t * Math.PI * 2) / 18);
  const swell = 0.85 + 0.15 * Math.sin((t * Math.PI * 2) / 47);
  const grain = rnd() * 0.06;
  const v =
    breath *
    swell *
    (0.42 * Math.sin(p1) +
      0.32 * Math.sin(p2) +
      0.22 * Math.sin(p3) +
      0.12 * Math.sin(p4) +
      grain);

  p1 += (2 * Math.PI * f1) / sampleRate;
  p2 += (2 * Math.PI * f2) / sampleRate;
  p3 += (2 * Math.PI * f3) / sampleRate;
  p4 += (2 * Math.PI * f4) / sampleRate;

  const s = Math.max(-0.92, Math.min(0.92, v * 0.38)) * 32767;
  view.setInt16(44 + i * 2, s, true);
}

const out = path.join(__dirname, '..', 'assets', 'sounds', 'onboarding_ambient.wav');
fs.writeFileSync(out, buffer);
console.log('Wrote', out, `(${Math.round(buffer.length / 1024)} KB)`);
