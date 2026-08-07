/** Simple in-memory response cache so remounted list pages can paint instantly. */

const store = new Map();

export function cacheGet(key) {
  return store.has(key) ? store.get(key) : undefined;
}

export function cacheSet(key, value) {
  store.set(key, value);
}

export function cacheHas(key) {
  return store.has(key);
}
