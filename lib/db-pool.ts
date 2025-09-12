import { Pool, PoolClient, PoolConfig } from 'pg'

interface PoolKey {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean
}

interface CachedPool {
  pool: Pool
  lastUsed: number
  inUse: number
}

class DatabasePoolManager {
  private pools: Map<string, CachedPool> = new Map()
  private readonly POOL_TIMEOUT = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_POOLS = 10
  private readonly CLEANUP_INTERVAL = 2 * 60 * 1000 // 2 minutes

  constructor() {
    // Clean up unused pools periodically
    setInterval(() => {
      this.cleanupUnusedPools()
    }, this.CLEANUP_INTERVAL)
  }

  private createPoolKey(config: PoolKey): string {
    return `${config.host}:${config.port}:${config.database}:${config.user}:${config.ssl}`
  }

  private createPool(config: PoolKey): Pool {
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      
      // Pool configuration for optimal performance
      max: 10, // Maximum number of connections
      min: 2, // Minimum number of connections
      idleTimeoutMillis: 30000, // 30 seconds idle timeout
      connectionTimeoutMillis: 5000, // 5 seconds connection timeout
      query_timeout: 30000, // 30 seconds query timeout
      
      // Performance optimizations
      allowExitOnIdle: true,
      
      // Connection validation
      application_name: 'PostgresManager'
    }

    const pool = new Pool(poolConfig)

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
    })

    pool.on('connect', (client) => {
      // Optimize client settings for performance
      client.query(`
        SET statement_timeout = '30s';
        SET lock_timeout = '10s';
        SET idle_in_transaction_session_timeout = '60s';
        SET application_name = 'PostgresManager';
      `).catch(err => {
        console.warn('Failed to set client optimizations:', err.message)
      })
    })

    return pool
  }

  async getPool(config: PoolKey): Promise<Pool> {
    const key = this.createPoolKey(config)
    let cachedPool = this.pools.get(key)

    if (!cachedPool) {
      // Remove oldest pool if we're at max capacity
      if (this.pools.size >= this.MAX_POOLS) {
        this.removeOldestPool()
      }

      const pool = this.createPool(config)
      cachedPool = {
        pool,
        lastUsed: Date.now(),
        inUse: 0
      }
      this.pools.set(key, cachedPool)
    }

    cachedPool.lastUsed = Date.now()
    return cachedPool.pool
  }

  async query(config: PoolKey, text: string, params?: any[]): Promise<any> {
    const pool = await this.getPool(config)
    const key = this.createPoolKey(config)
    const cachedPool = this.pools.get(key)!
    
    cachedPool.inUse++
    
    try {
      const start = Date.now()
      const result = await pool.query(text, params)
      const duration = Date.now() - start
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow query detected (${duration}ms):`, text.substring(0, 100))
      }
      
      return result
    } finally {
      cachedPool.inUse--
    }
  }

  async queryWithClient<T>(config: PoolKey, callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const pool = await this.getPool(config)
    const client = await pool.connect()
    
    try {
      return await callback(client)
    } finally {
      client.release()
    }
  }

  private removeOldestPool(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, cachedPool] of this.pools.entries()) {
      if (cachedPool.inUse === 0 && cachedPool.lastUsed < oldestTime) {
        oldestTime = cachedPool.lastUsed
        oldestKey = key
      }
    }

    if (oldestKey) {
      const cachedPool = this.pools.get(oldestKey)!
      cachedPool.pool.end().catch(err => {
        console.warn('Error closing pool:', err.message)
      })
      this.pools.delete(oldestKey)
    }
  }

  private cleanupUnusedPools(): void {
    const now = Date.now()
    const keysToRemove: string[] = []

    for (const [key, cachedPool] of this.pools.entries()) {
      const isExpired = now - cachedPool.lastUsed > this.POOL_TIMEOUT
      const notInUse = cachedPool.inUse === 0
      
      if (isExpired && notInUse) {
        keysToRemove.push(key)
      }
    }

    for (const key of keysToRemove) {
      const cachedPool = this.pools.get(key)!
      cachedPool.pool.end().catch(err => {
        console.warn('Error closing pool during cleanup:', err.message)
      })
      this.pools.delete(key)
      console.log(`Cleaned up unused pool: ${key}`)
    }
  }

  async closeAllPools(): Promise<void> {
    const promises: Promise<void>[] = []
    
    for (const [key, cachedPool] of this.pools.entries()) {
      promises.push(
        cachedPool.pool.end().catch(err => {
          console.warn(`Error closing pool ${key}:`, err.message)
        })
      )
    }
    
    await Promise.all(promises)
    this.pools.clear()
  }

  getPoolStats(): Array<{ key: string; totalCount: number; idleCount: number; waitingCount: number; inUse: number; lastUsed: Date }> {
    return Array.from(this.pools.entries()).map(([key, cachedPool]) => ({
      key,
      totalCount: cachedPool.pool.totalCount,
      idleCount: cachedPool.pool.idleCount,
      waitingCount: cachedPool.pool.waitingCount,
      inUse: cachedPool.inUse,
      lastUsed: new Date(cachedPool.lastUsed)
    }))
  }
}

// Create a singleton instance
export const dbPool = new DatabasePoolManager()

// Export types for use in other files
export type { PoolKey }