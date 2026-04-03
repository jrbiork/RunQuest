/**
 * Removes emoji / pictographic symbols from UI copy (mission titles, briefings, etc.).
 * Keeps letters, numbers, punctuation, and most accented Latin.
 *
 * Also strips variation selectors / ZWJ and replacement chars left behind when
 * partial emoji sequences were removed — those can render as "?" or tofu in the UI.
 */
export function stripEmojis(text: string): string {
  if (!text) return text;
  let s = text
    // Full emoji / pictographic (Unicode 15+) — catches most sequences in one pass
    .replace(/\p{Extended_Pictographic}/gu, '')
    // Fallback ranges for engines / patterns that miss edge cases
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{27BF}]+/gu,
      '',
    )
    // Zero-width joiner + variant selectors (often orphaned after stripping emoji)
    .replace(/\u200D/g, '')
    .replace(/[\uFE0E\uFE0F]/g, '')
    // Replacement character from broken UTF-16 pairs
    .replace(/\uFFFD/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return s;
}
