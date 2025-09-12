"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Database, Activity, Timer, BarChart3, Trash2 } from 'lucide-react'

interface ConnectionStatsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectionStatsDialog({ open, onOpenChange }: ConnectionStatsDialogProps) {
  const [poolStats, setPoolStats] = useState<any[]>([])
  const [cacheStats, setCacheStats] = useState<any>({})
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      
      // Fetch pool stats
      const poolResponse = await fetch('/api/stats/pools')
      const poolData = await poolResponse.json()
      setPoolStats(poolData.stats || [])
      
      // Fetch cache stats
      const cacheResponse = await fetch('/api/stats/cache')
      const cacheData = await cacheResponse.json()
      setCacheStats(cacheData.stats || {
        totalQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
        hitRate: 0,
        avgExecutionTime: 0,
        cacheSize: 0
      })
    } catch (error) {
      console.error('Failed to fetch connection stats:', error)
      // Fallback to empty stats on error
      setPoolStats([])
      setCacheStats({
        totalQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
        hitRate: 0,
        avgExecutionTime: 0,
        cacheSize: 0
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchStats()
      const interval = setInterval(fetchStats, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [open])

  const clearCache = async () => {
    try {
      await fetch('/api/stats/cache', { method: 'DELETE' })
      fetchStats()
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Connection & Performance Statistics
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="connections" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="cache">Query Cache</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Pools</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{poolStats.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Connection pools currently active
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {poolStats.reduce((sum, pool) => sum + pool.totalCount, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across all pools
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Idle Connections</CardTitle>
                  <Timer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {poolStats.reduce((sum, pool) => sum + pool.idleCount, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available for use
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Connection Pool Details</h3>
              {poolStats.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Database className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No active connection pools</p>
                  <p className="text-sm">Pools are created automatically when queries are executed</p>
                </div>
              ) : (
                poolStats.map((pool, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-base">{pool.key}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Total</div>
                          <div className="text-lg font-semibold">{pool.totalCount}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Idle</div>
                          <div className="text-lg font-semibold">{pool.idleCount}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Waiting</div>
                          <div className="text-lg font-semibold">{pool.waitingCount}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">In Use</div>
                          <div className="text-lg font-semibold">{pool.inUse}</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-sm text-muted-foreground">Last Used</div>
                        <div className="text-sm">{pool.lastUsed.toLocaleString()}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="cache" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Query Cache Statistics</h3>
              <Button variant="destructive" size="sm" onClick={clearCache}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(cacheStats.hitRate * 100).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {cacheStats.cacheHits} hits, {cacheStats.cacheMisses} misses
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cache Size</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{cacheStats.cacheSize}</div>
                  <p className="text-xs text-muted-foreground">
                    Cached query results
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Execution Time</CardTitle>
                  <Timer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {cacheStats.avgExecutionTime?.toFixed(0) || 0}ms
                  </div>
                  <p className="text-xs text-muted-foreground">
                    For cached queries
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cache Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Queries</span>
                    <Badge variant="outline">{cacheStats.totalQueries}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Cache Hits</span>
                    <Badge variant="default" className="bg-green-600">
                      {cacheStats.cacheHits}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Cache Misses</span>
                    <Badge variant="secondary">{cacheStats.cacheMisses}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="text-center text-muted-foreground py-8">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Performance metrics will be available here</p>
              <p className="text-sm">Query execution times, optimization suggestions, etc.</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Statistics refresh every 5 seconds while open
          </p>
          <Button variant="outline" onClick={fetchStats} disabled={isLoading}>
            {isLoading ? "Refreshing..." : "Refresh Now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}