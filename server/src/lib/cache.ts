interface CacheEntry {
  data: any
  expires: number
}

class SimpleCache {
  private store = new Map<string, CacheEntry>()

  get(key: string): any | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.expires < Date.now()) {
      this.store.delete(key)
      return null
    }
    return entry.data
  }

  set(key: string, data: any, ttlSeconds = 60): void {
    this.store.set(key, { data, expires: Date.now() + ttlSeconds * 1000 })
  }

  invalidate(key: string): void {
    this.store.delete(key)
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) this.store.delete(key)
    }
  }
}

export const cache = new SimpleCache()