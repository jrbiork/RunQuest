/**
 * Generates `assets/voice/cue_00.mp3` … from OpenAI TTS (same order as `bundledRunCueStrings`).
 *
 * Usage (repo root):
 *   OPENAI_API_KEY=sk-... npx tsx scripts/generate-run-cue-mp3s.ts
 *
 * Voice/model match `src/constants/openaiConfig.ts` (TTS_VOICE, TTS_MODEL).
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { bundledRunCueStrings } from '../src/audio/bundledRunCueStrings';
import { TTS_MODEL, TTS_VOICE } from '../src/constants/openaiConfig';

const root = process.cwd();
const outDir = join(root, 'assets/voice');

async function synthesize(text: string, apiKey: string): Promise<Uint8Array> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: text,
      response_format: 'mp3',
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI speech ${response.status}: ${err}`);
  }
  const buf = await response.arrayBuffer();
  return new Uint8Array(buf);
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.error('Set OPENAI_API_KEY in the environment.');
    process.exit(1);
  }

  mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < bundledRunCueStrings.length; i++) {
    const text = bundledRunCueStrings[i]!;
    const name = `cue_${String(i).padStart(2, '0')}.mp3`;
    const path = join(outDir, name);
    // eslint-disable-next-line no-console
    console.log(`${i + 1}/${bundledRunCueStrings.length} ${name}`);
    const bytes = await synthesize(text, apiKey);
    writeFileSync(path, bytes);
    await new Promise((r) => setTimeout(r, 200));
  }
  // eslint-disable-next-line no-console
  console.log('Done.');
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
