/**
 * Shared registry of split text lines.
 *
 * `Line` components populate this during their own effects, which React runs
 * before the parent `Film` effect. The film timeline then reads real element
 * references from here instead of resolving selector strings.
 *
 * This matters: GSAP resolves a selector string to elements when the tween is
 * *created*, so a timeline built before the split DOM exists would capture an
 * empty target list and silently animate nothing.
 */
export const lineRegistry = new Map();

export function registerLines(key, elements) {
  if (!key) return;
  const existing = lineRegistry.get(key) || [];
  lineRegistry.set(key, [...existing, ...elements]);
}

export function getLines(key) {
  return lineRegistry.get(key) || [];
}

export function clearLines(key) {
  if (key) lineRegistry.delete(key);
  else lineRegistry.clear();
}