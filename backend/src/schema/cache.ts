import { SchemaInfo } from './types.js';

interface CacheEntry {
  schema: SchemaInfo;
  expiresAt: number;
}

export class SchemaCache {
  private cache = new Map<string, CacheEntry>();
  private ttlMs: number;

  constructor(ttlMs: number = 5 * 60 * 1000) {
    this.ttlMs = ttlMs;
  }

  get(connectionId: string, database: string): SchemaInfo | null {
    const key = `${connectionId}:${database}`;
    const entry = this.cache.get(key);

    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.schema;
  }

  set(connectionId: string, database: string, schema: SchemaInfo): void {
    const key = `${connectionId}:${database}`;
    this.cache.set(key, {
      schema,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  invalidate(connectionId: string, database?: string): void {
    if (database) {
      this.cache.delete(`${connectionId}:${database}`);
    } else {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${connectionId}:`)) {
          this.cache.delete(key);
        }
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
