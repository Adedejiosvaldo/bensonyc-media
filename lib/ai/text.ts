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

/**
 * Drop one pair of quote marks wrapped around the whole line, and only then: a title like
 * "What is Benson YC?" 45s montage, or a hook ending in a quoted line, keeps its own quotes.
 */
export function unquote(s: string | null | undefined): string {
  const t = tidy(s);
  if (t.length > 1 && /^["“”]/.test(t) && /["“”]$/.test(t)) {
    const inner = t.slice(1, -1);
    if ((inner.match(/["“”]/g) ?? []).length % 2 === 0) return inner.trim();
  }
  return t;
}
