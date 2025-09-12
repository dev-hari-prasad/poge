import { NextResponse } from 'next/server'
import { dbPool } from '@/lib/db-pool'

export async function GET() {
  try {
    const stats = dbPool.getPoolStats()
    return NextResponse.json({ stats })
  } catch (error: any) {
    console.error('Failed to get pool stats:', error)
    return NextResponse.json({ 
      error: 'Failed to retrieve pool statistics',
      stats: []
    }, { status: 500 })
  }
}