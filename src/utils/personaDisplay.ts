/** Title-case persona label (e.g. SCOUT → Scout). */
export function personaLabelTitleCase(upperLabel: string): string {
  return upperLabel
    .toLowerCase()
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
