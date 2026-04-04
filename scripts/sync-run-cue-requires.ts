/**
 * Regenerates `src/audio/runCueRequires.ts` from `bundledRunCueStrings` (same index order).
 * Run from repo root: `npx tsx scripts/sync-run-cue-requires.ts`
 */
import { writeFileSync } from 'fs';
import { join } from 'path';
import { bundledRunCueStrings } from '../src/audio/bundledRunCueStrings';

const root = process.cwd();

const lines = bundledRunCueStrings
  .map(
    (_, i) =>
      `  require('../../assets/voice/cue_${String(i).padStart(2, '0')}.mp3')`,
  )
  .join(',\n');

const out = `/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Metro: static requires only — order must match \`bundledRunCueStrings\` in bundledRunCueStrings.ts.
 * Regenerate: \`npx tsx scripts/sync-run-cue-requires.ts\`
 */
export const RUN_CUE_REQUIRES = [
${lines},
] as const;
`;

writeFileSync(join(root, 'src/audio/runCueRequires.ts'), out, 'utf8');
// eslint-disable-next-line no-console
console.log(`Wrote src/audio/runCueRequires.ts (${bundledRunCueStrings.length} requires)`);
