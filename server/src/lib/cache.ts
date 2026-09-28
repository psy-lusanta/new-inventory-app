import Redis from 'ioredis'

// ─── In-memory fallback ───────────────────────────────────────────────────────
interface MemCacheEntry {
  value: unknown
  expiresAt: number
}
const memCache = new Map<string, MemCacheEntry>()

// ─── Redis instance ───────────────────────────────────────────────────────────
let redis: Redis | null = null
let redisReady = false

const initRedis = () => {
  if (!process.env.REDIS_URL) {
    console.log('⚠️  No REDIS_URL — using in-memory cache (not suitable for PM2 cluster)')
    return
  }

  try {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      commandTimeout: 2000,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('⚠️  Redis retry limit reached — falling back to in-memory cache')
          redis = null
          return null // stop retrying
        }
        return Math.min(times * 200, 1000)
      },
    })

    redis.on('connect', () => {
      redisReady = true
      console.log('✅ Redis connected')
    })

    redis.on('ready', () => {
      redisReady = true
    })

    redis.on('error', (err: Error) => {
      redisReady = false
      // Only warn once — not on every retry
      if (err.message.includes('ECONNREFUSED')) {
        console.warn('⚠️  Redis not reachable — using in-memory cache fallback')
      }
    })

    redis.on('close', () => {
      redisReady = false
    })
  } catch (err) {
    console.warn('⚠️  Redis init failed — using in-memory cache:', (err as Error).message)
    redis = null
  }
}

// Initialize on module load — no top-level await needed
initRedis()

// ─── Unified cache interface ──────────────────────────────────────────────────
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    // Try Redis first
    if (redis && redisReady) {
      try {
        const raw = await redis.get(key)
        return raw ? (JSON.parse(raw) as T) : null
      } catch {
        // Redis failed this request — fall through to memory
      }
    }

    // In-memory fallback
    const entry = memCache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      memCache.delete(key)
      return null
    }
    return entry.value as T
  },

  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    // Try Redis first
    if (redis && redisReady) {
      try {
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
        return
      } catch {
        // Redis failed — fall through to memory
      }
    }

    // In-memory fallback
    memCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  },

  async invalidate(key: string): Promise<void> {
    if (redis && redisReady) {
      try {
        await redis.del(key)
      } catch {}
    }
    memCache.delete(key)
  },

  async invalidatePattern(pattern: string): Promise<void> {
    if (redis && redisReady) {
      try {
        const keys = await redis.keys(`*${pattern}*`)
        if (keys.length > 0) {
          await redis.del(...keys)
        }
        return
      } catch {}
    }
    // In-memory fallback
    for (const key of memCache.keys()) {
      if (key.includes(pattern)) memCache.delete(key)
    }
  },

  // ─── Health check for /api/health endpoint ──────────────────────────────────
  isRedisConnected(): boolean {
    return redis !== null && redisReady
  },

  // ─── Dev/debug — see what's in memory cache ─────────────────────────────────
  debugMemCache(): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [key, entry] of memCache.entries()) {
      if (Date.now() <= entry.expiresAt) {
        result[key] = entry.value
      }
    }
    return result
  },
}