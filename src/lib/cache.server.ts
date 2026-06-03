/**
 * Tiny in-memory TTL cache for LLM-heavy operations.
 *
 * - Default TTL: 5 minutes (LLM extraction is deterministic enough at
 *   temperature 0.2 that re-running within the same process is wasteful).
 * - LRU-ish: bounded at 500 entries to keep memory reasonable.
 * - Per-process: cleared on server restart. For multi-instance deploys
 *   we'd want Redis, but Vercel serverless functions are short-lived
 *   enough that this is fine.
 */

interface Entry<V> {
  value: V;
  expiresAt: number;
}

const stores = new Map<string, Map<string, Entry<unknown>>>();

export function memCache<V>(
  namespace: string,
  defaultTtlMs = 5 * 60_000,
  maxSize = 500
) {
  let store = stores.get(namespace) as Map<string, Entry<V>> | undefined;
  if (!store) {
    store = new Map<string, Entry<V>>();
    stores.set(namespace, store as Map<string, Entry<unknown>>);
  }

  function get(key: string): V | undefined {
    const e = store!.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expiresAt) {
      store!.delete(key);
      return undefined;
    }
    return e.value;
  }

  function set(key: string, value: V, ttlMs = defaultTtlMs): void {
    if (store!.size >= maxSize) {
      // Drop the oldest entry to keep memory bounded
      const firstKey = store!.keys().next().value;
      if (firstKey !== undefined) store!.delete(firstKey);
    }
    store!.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  function del(key: string): void {
    store!.delete(key);
  }

  function clear(): void {
    store!.clear();
  }

  return { get, set, del, clear };
}
