/**
 * Tidy text the model wrote before it is stored or shown: undo stray JSON escaping (\" and \'),
 * collapse spaces, and drop quote marks wrapped around a whole line (the UI adds its own).
 */
export function tidy(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/\\(["'])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function unquote(s: string | null | undefined): string {
  return tidy(s).replace(/^["“”'‘’]+/, '').replace(/["“”'‘’]+$/, '').trim();
}
