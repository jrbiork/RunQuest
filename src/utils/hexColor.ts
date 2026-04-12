/** Darken a `#RRGGBB` hex for contrast on light-tinted pills (e.g. level accent). */
export function darkenHex(hex: string, factor = 0.62): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = Math.min(255, Math.round(parseInt(h.slice(0, 2), 16) * factor));
  const g = Math.min(255, Math.round(parseInt(h.slice(2, 4), 16) * factor));
  const b = Math.min(255, Math.round(parseInt(h.slice(4, 6), 16) * factor));
  return `#${[r, g, b]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')}`;
}
