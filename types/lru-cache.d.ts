declare module 'lru-cache' {
  interface LRUCacheOptions<K, V> {
    max?: number;
    ttl?: number;
    maxSize?: number;
    sizeCalculation?: (value: V, key: K) => number;
    dispose?: (value: V, key: K, reason: string) => void;
    disposeAfter?: (value: V, key: K, reason: string) => void;
    noDisposeOnSet?: boolean;
    noUpdateTTL?: boolean;
    allowStale?: boolean;
    updateAgeOnGet?: boolean;
    updateAgeOnHas?: boolean;
    fetchMethod?: (key: K, staleValue: V | undefined, options: { signal: AbortSignal }) => Promise<V>;
  }

  class LRUCache<K = string, V = unknown> {
    constructor(options: LRUCacheOptions<K, V>);
    get(key: K): V | undefined;
    set(key: K, value: V, options?: { ttl?: number }): this;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    entries(): IterableIterator<[K, V]>;
    forEach(fn: (value: V, key: K, cache: this) => void): void;
    size: number;
  }

  export default LRUCache;
  export { LRUCache };
}
