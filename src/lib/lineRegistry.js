/**
 * Shared registry of split text lines.
 *
 * `Line` components populate this during their own effects, which React runs
 * before the parent `Film` effect. The copy director then reads real element
 * references from here instead of resolving selector strings.
 *
 * This matters: GSAP resolves a selector string to elements when the tween is
 * *created*, so a timeline built before the split DOM exists would capture an
 * empty target list and silently animate nothing.
 *
 * Lines are published per *owner* (one `Line` instance). SplitText's autoSplit
 * tears the lines down and rebuilds them whenever fonts finish loading or the
 * container is resized; the owner simply publishes again and its previous set is
 * replaced, so the registry never holds reverted, detached elements. Listeners
 * are told which key changed so the director can re-settle that beat.
 */

/** key -> Map(owner -> elements[]) */
const byOwner = new Map();

/** key -> flat elements[]. Kept in sync for anything that reads it directly. */
export const lineRegistry = new Map();

const listeners = new Set();
const DEFAULT_OWNER = "default";

function flatten(key) {
  const owners = byOwner.get(key);
  const flat = owners ? [...owners.values()].flat() : [];
  if (flat.length) lineRegistry.set(key, flat);
  else lineRegistry.delete(key);
}

/** Publish (replace) the lines owned by `owner` under `key`. */
export function registerLines(key, elements, owner = DEFAULT_OWNER) {
  if (!key) return;
  let owners = byOwner.get(key);
  if (!owners) byOwner.set(key, (owners = new Map()));
  owners.set(owner, [...elements]);
  flatten(key);
  listeners.forEach((fn) => fn(key));
}

export function getLines(key) {
  return lineRegistry.get(key) || [];
}

/** Drop one owner's lines under `key`, or everything under `key`/the registry. */
export function clearLines(key, owner) {
  if (!key) {
    byOwner.clear();
    lineRegistry.clear();
    return;
  }
  const owners = byOwner.get(key);
  if (owner !== undefined && owners) {
    owners.delete(owner);
    if (!owners.size) byOwner.delete(key);
  } else {
    byOwner.delete(key);
  }
  flatten(key);
}

/** Be told when a key's lines are (re)published. Returns an unsubscribe. */
export function subscribeLines(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
