import { NextResponse } from 'next/server'
import { queryCache } from '@/lib/query-cache'

export async function GET() {
  try {
    const stats = queryCache.getStats()
    const entries = queryCache.getCacheEntries()
    
    return NextResponse.json({ 
      stats,
      entries: entries.slice(0, 10) // Limit to 10 most recent entries
    })
  } catch (error: any) {
    console.error('Failed to get cache stats:', error)
    return NextResponse.json({ 
      error: 'Failed to retrieve cache statistics',
      stats: {
        totalQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
        hitRate: 0,
        avgExecutionTime: 0,
        cacheSize: 0
      },
      entries: []
    }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    queryCache.clear()
    return NextResponse.json({ success: true, message: 'Cache cleared successfully' })
  } catch (error: any) {
    console.error('Failed to clear cache:', error)
    return NextResponse.json({ 
      error: 'Failed to clear cache'
    }, { status: 500 })
  }
}