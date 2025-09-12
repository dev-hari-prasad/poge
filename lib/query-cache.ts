interface CacheEntry {
  result: any
  timestamp: number
  hits: number
  executionTime: number
  queryHash: string
  originalSql: string
  tableNames: string[]
  lastWriteTime?: number
}

interface CacheStats {
  totalQueries: number
  cacheHits: number
  cacheMisses: number
  hitRate: number
  avgExecutionTime: number
  cacheSize: number
}

class QueryCache {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly MAX_CACHE_SIZE = 100
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly STALE_THRESHOLD = 2 * 60 * 1000 // 2 minutes - consider cache stale after writes
  private readonly CLEANUP_INTERVAL = 2 * 60 * 1000 // 2 minutes
  
  private stats = {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    staleHits: 0
  }

  constructor() {
    // Periodic cleanup of expired entries
    setInterval(() => {
      this.cleanup()
    }, this.CLEANUP_INTERVAL)
  }

  private generateCacheKey(sql: string, params?: any[]): string {
    // Create a deterministic hash of the query and parameters
    const normalizedSql = sql.trim().toLowerCase()
    const paramsStr = params ? JSON.stringify(params) : ''
    return btoa(normalizedSql + paramsStr).slice(0, 32) // Use base64 and truncate
  }

  private shouldCache(sql: string, executionTime: number): boolean {
    const normalizedSql = sql.trim().toLowerCase()
    
    // Don't cache write operations
    if (normalizedSql.startsWith('insert') || 
        normalizedSql.startsWith('update') || 
        normalizedSql.startsWith('delete') ||
        normalizedSql.startsWith('create') ||
        normalizedSql.startsWith('alter') ||
        normalizedSql.startsWith('drop')) {
      return false
    }

    // Don't cache queries with current timestamp functions
    if (normalizedSql.includes('now()') || 
        normalizedSql.includes('current_timestamp') ||
        normalizedSql.includes('current_date') ||
        normalizedSql.includes('current_time') ||
        normalizedSql.includes('random()')) {
      return false
    }

    // Don't cache very fast queries (likely simple lookups)
    if (executionTime < 50) {
      return false
    }

    // Don't cache very slow queries (likely one-time complex operations)
    if (executionTime > 30000) {
      return false
    }

    return true
  }

  get(sql: string, params?: any[]): any | null {
    this.stats.totalQueries++
    
    const key = this.generateCacheKey(sql, params)
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.cacheMisses++
      return null
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key)
      this.stats.cacheMisses++
      return null
    }

    // Check if cache might be stale
    const isStale = this.isCacheStale(entry)
    if (isStale) {
      this.stats.staleHits++
      console.log(`Cache HIT (STALE) for query: ${sql.substring(0, 50)}... (${entry.hits} hits)`)
    } else {
      console.log(`Cache HIT for query: ${sql.substring(0, 50)}... (${entry.hits} hits)`)
    }

    // Update stats and hit count
    entry.hits++
    this.stats.cacheHits++
    
    return {
      ...entry.result,
      fromCache: true,
      cacheHits: entry.hits,
      originalExecutionTime: entry.executionTime,
      isStale,
      cacheAge: Date.now() - entry.timestamp,
      tableNames: entry.tableNames
    }
  }

  set(sql: string, result: any, executionTime: number, params?: any[], tableNames?: string[]): void {
    if (!this.shouldCache(sql, executionTime)) {
      return
    }

    const key = this.generateCacheKey(sql, params)
    
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest()
    }

    const entry: CacheEntry = {
      result: this.cloneResult(result),
      timestamp: Date.now(),
      hits: 0,
      executionTime,
      queryHash: key,
      originalSql: sql,
      tableNames: tableNames || this.extractTableNames(sql)
    }

    this.cache.set(key, entry)
    console.log(`Cached query result: ${sql.substring(0, 50)}... (${executionTime}ms)`)
  }

  private extractTableNames(sql: string): string[] {
    const tableNames: string[] = []
    const normalizedSql = sql.toLowerCase()
    
    // Simple regex to extract table names from SELECT, FROM, JOIN clauses
    const tableRegex = /(?:from|join|update|insert into|delete from)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi
    let match
    
    while ((match = tableRegex.exec(normalizedSql)) !== null) {
      const tableName = match[1]
      if (!tableNames.includes(tableName)) {
        tableNames.push(tableName)
      }
    }
    
    return tableNames
  }

  private cloneResult(result: any): any {
    // Deep clone the result to prevent mutations
    try {
      return JSON.parse(JSON.stringify(result))
    } catch (error) {
      console.warn('Failed to clone query result for caching:', error)
      return result
    }
  }

  private evictOldest(): void {
    if (this.cache.size === 0) return

    // Find the oldest entry (least recently used)
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      console.log('Evicted oldest cache entry')
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key)
    }

    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} expired cache entries`)
    }
  }

  // Track write operations and invalidate related caches
  trackWriteOperation(tableNames: string[]): void {
    const now = Date.now()
    let invalidatedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      // Check if this cache entry involves any of the modified tables
      const hasOverlap = entry.tableNames.some(tableName => 
        tableNames.some(modifiedTable => 
          tableName.toLowerCase() === modifiedTable.toLowerCase()
        )
      )

      if (hasOverlap) {
        this.cache.delete(key)
        invalidatedCount++
      }
    }

    if (invalidatedCount > 0) {
      console.log(`Invalidated ${invalidatedCount} cache entries due to write operations on tables: ${tableNames.join(', ')}`)
    }
  }

  // Check if cache entry might be stale
  private isCacheStale(entry: CacheEntry): boolean {
    if (!entry.lastWriteTime) return false
    
    const timeSinceWrite = Date.now() - entry.lastWriteTime
    return timeSinceWrite < this.STALE_THRESHOLD
  }

  clear(): void {
    this.cache.clear()
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0
    }
    console.log('Query cache cleared')
  }

  getStats(): CacheStats {
    const totalExecutionTime = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.executionTime, 0)
    
    return {
      totalQueries: this.stats.totalQueries,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      hitRate: this.stats.totalQueries > 0 ? this.stats.cacheHits / this.stats.totalQueries : 0,
      avgExecutionTime: this.cache.size > 0 ? totalExecutionTime / this.cache.size : 0,
      cacheSize: this.cache.size
    }
  }

  getCacheEntries(): Array<{key: string, timestamp: Date, hits: number, executionTime: number}> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      timestamp: new Date(entry.timestamp),
      hits: entry.hits,
      executionTime: entry.executionTime
    }))
  }

  invalidatePattern(pattern: RegExp): number {
    let invalidated = 0
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      // This is a simplified approach - in a real implementation,
      // you'd want to store the original SQL for pattern matching
      if (pattern.test(key)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key)
      invalidated++
    }

    if (invalidated > 0) {
      console.log(`Invalidated ${invalidated} cache entries matching pattern`)
    }

    return invalidated
  }
}

// Create a singleton instance
export const queryCache = new QueryCache()

// Export types
export type { CacheStats }