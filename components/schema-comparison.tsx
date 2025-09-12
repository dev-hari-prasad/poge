"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Database, 
  Table, 
  Eye, 
  Layers, 
  Plus, 
  Minus, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
  RefreshCw
} from "lucide-react"
import type { Server } from "@/types/server"
import type { DatabaseInfo } from "@/types/database"

interface SchemaComparisonProps {
  servers: Server[]
  selectedServerId: string
  selectedDatabase: string
}

interface ComparisonResult {
  added: string[]
  removed: string[]
  modified: string[]
  unchanged: string[]
}

interface TableComparison {
  name: string
  status: 'added' | 'removed' | 'modified' | 'unchanged'
  differences?: {
    columns: {
      added: string[]
      removed: string[]
      modified: string[]
    }
    indexes: {
      added: string[]
      removed: string[]
    }
    constraints: {
      added: string[]
      removed: string[]
    }
  }
}

export function SchemaComparison({ servers, selectedServerId, selectedDatabase }: SchemaComparisonProps) {
  const [sourceServerId, setSourceServerId] = useState(selectedServerId)
  const [sourceDatabase, setSourceDatabase] = useState(selectedDatabase)
  const [targetServerId, setTargetServerId] = useState(selectedServerId)
  const [targetDatabase, setTargetDatabase] = useState(selectedDatabase)
  
  const [sourceSchema, setSourceSchema] = useState<DatabaseInfo[] | null>(null)
  const [targetSchema, setTargetSchema] = useState<DatabaseInfo[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null)
  const [tableComparisons, setTableComparisons] = useState<TableComparison[]>([])
  const [error, setError] = useState<string | null>(null)

  // Load schemas when selection changes
  useEffect(() => {
    if (sourceServerId && sourceDatabase) {
      loadSchema(sourceServerId, sourceDatabase, 'source')
    }
  }, [sourceServerId, sourceDatabase])

  useEffect(() => {
    if (targetServerId && targetDatabase) {
      loadSchema(targetServerId, targetDatabase, 'target')
    }
  }, [targetServerId, targetDatabase])

  const loadSchema = async (serverId: string, database: string, type: 'source' | 'target') => {
    const server = servers.find(s => s.id === serverId)
    if (!server) return

    setIsLoading(true)
    try {
      // Try to use the existing schema tree data from the parent component first
      // If that's not available, we'll use a mock approach for now
      let data: DatabaseInfo[] = []
      
      // For now, let's create a mock schema structure to demonstrate the comparison
      // In a real implementation, this would come from the actual database
      data = [
        {
          name: database || 'defaultdb',
          schemas: [
            {
              name: 'public',
              tables: [
                {
                  name: 'users',
                  type: 'table',
                  columns: [
                    { name: 'id', type: 'integer' },
                    { name: 'name', type: 'varchar' },
                    { name: 'email', type: 'varchar' }
                  ],
                  indexes: [
                    { name: 'users_pkey', type: 'primary' }
                  ],
                  constraints: [
                    { name: 'users_pkey', type: 'primary' }
                  ]
                },
                {
                  name: 'posts',
                  type: 'table',
                  columns: [
                    { name: 'id', type: 'integer' },
                    { name: 'title', type: 'varchar' },
                    { name: 'content', type: 'text' }
                  ],
                  indexes: [
                    { name: 'posts_pkey', type: 'primary' }
                  ],
                  constraints: [
                    { name: 'posts_pkey', type: 'primary' }
                  ]
                }
              ]
            }
          ]
        }
      ]

      if (type === 'source') {
        setSourceSchema(data)
      } else {
        setTargetSchema(data)
      }
    } catch (error) {
      console.error(`Failed to load ${type} schema:`, error)
      setError(`Failed to load ${type} schema: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const compareSchemas = () => {
    if (!sourceSchema || !targetSchema) return

    const sourceTables = sourceSchema.flatMap(db => 
      db.schemas?.flatMap(schema => 
        schema.tables?.map(table => ({
          name: `${db.name}.${schema.name}.${table.name}`,
          type: table.type,
          columns: table.columns || [],
          indexes: table.indexes || [],
          constraints: table.constraints || []
        })) || []
      ) || []
    )

    const targetTables = targetSchema.flatMap(db => 
      db.schemas?.flatMap(schema => 
        schema.tables?.map(table => ({
          name: `${db.name}.${schema.name}.${table.name}`,
          type: table.type,
          columns: table.columns || [],
          indexes: table.indexes || [],
          constraints: table.constraints || []
        })) || []
      ) || []
    )

    const sourceTableNames = sourceTables.map(t => t.name)
    const targetTableNames = targetTables.map(t => t.name)

    const added = targetTableNames.filter(name => !sourceTableNames.includes(name))
    const removed = sourceTableNames.filter(name => !targetTableNames.includes(name))
    const common = sourceTableNames.filter(name => targetTableNames.includes(name))

    const modified: string[] = []
    const unchanged: string[] = []

    common.forEach(tableName => {
      const sourceTable = sourceTables.find(t => t.name === tableName)
      const targetTable = targetTables.find(t => t.name === tableName)
      
      if (sourceTable && targetTable) {
        const hasChanges = compareTableDetails(sourceTable, targetTable)
        if (hasChanges) {
          modified.push(tableName)
        } else {
          unchanged.push(tableName)
        }
      }
    })

    setComparisonResult({ added, removed, modified, unchanged })
    generateTableComparisons(sourceTables, targetTables)
  }

  const compareTableDetails = (source: any, target: any): boolean => {
    // Compare columns
    const sourceColumns = source.columns.map((c: any) => `${c.name}:${c.type}`).sort()
    const targetColumns = target.columns.map((c: any) => `${c.name}:${c.type}`).sort()
    
    if (JSON.stringify(sourceColumns) !== JSON.stringify(targetColumns)) {
      return true
    }

    // Compare indexes
    const sourceIndexes = source.indexes.map((i: any) => i.name).sort()
    const targetIndexes = target.indexes.map((i: any) => i.name).sort()
    
    if (JSON.stringify(sourceIndexes) !== JSON.stringify(targetIndexes)) {
      return true
    }

    return false
  }

  const generateTableComparisons = (sourceTables: any[], targetTables: any[]) => {
    const comparisons: TableComparison[] = []
    
    // Process all tables
    const allTableNames = [...new Set([
      ...sourceTables.map(t => t.name),
      ...targetTables.map(t => t.name)
    ])]

    allTableNames.forEach(tableName => {
      const sourceTable = sourceTables.find(t => t.name === tableName)
      const targetTable = targetTables.find(t => t.name === tableName)

      if (!sourceTable && targetTable) {
        comparisons.push({
          name: tableName,
          status: 'added',
          differences: {
            columns: { added: targetTable.columns.map((c: any) => c.name), removed: [], modified: [] },
            indexes: { added: targetTable.indexes.map((i: any) => i.name), removed: [] },
            constraints: { added: targetTable.constraints.map((c: any) => c.name), removed: [] }
          }
        })
      } else if (sourceTable && !targetTable) {
        comparisons.push({
          name: tableName,
          status: 'removed',
          differences: {
            columns: { added: [], removed: sourceTable.columns.map((c: any) => c.name), modified: [] },
            indexes: { added: [], removed: sourceTable.indexes.map((i: any) => i.name) },
            constraints: { added: [], removed: sourceTable.constraints.map((c: any) => c.name) }
          }
        })
      } else if (sourceTable && targetTable) {
        const hasChanges = compareTableDetails(sourceTable, targetTable)
        if (hasChanges) {
          comparisons.push({
            name: tableName,
            status: 'modified',
            differences: {
              columns: { added: [], removed: [], modified: [] },
              indexes: { added: [], removed: [] },
              constraints: { added: [], removed: [] }
            }
          })
        } else {
          comparisons.push({
            name: tableName,
            status: 'unchanged'
          })
        }
      }
    })

    setTableComparisons(comparisons)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added': return <Plus className="h-4 w-4 text-green-500" />
      case 'removed': return <Minus className="h-4 w-4 text-red-500" />
      case 'modified': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'unchanged': return <CheckCircle className="h-4 w-4 text-blue-500" />
      default: return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'added': return <Badge variant="default" className="bg-green-500">Added</Badge>
      case 'removed': return <Badge variant="destructive">Removed</Badge>
      case 'modified': return <Badge variant="secondary" className="bg-yellow-500">Modified</Badge>
      case 'unchanged': return <Badge variant="outline">Unchanged</Badge>
      default: return null
    }
  }

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Schema Comparison</h2>
        <Button 
          onClick={compareSchemas} 
          disabled={isLoading || !sourceSchema || !targetSchema}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Compare Schemas
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Source Schema Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Source Schema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">Server</label>
              <Select value={sourceServerId} onValueChange={setSourceServerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select server" />
                </SelectTrigger>
                <SelectContent>
                  {servers.map((server) => (
                    <SelectItem key={server.id} value={server.id}>
                      {server.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Database</label>
              <Select value={sourceDatabase} onValueChange={setSourceDatabase}>
                <SelectTrigger>
                  <SelectValue placeholder="Select database" />
                </SelectTrigger>
                <SelectContent>
                  {sourceSchema?.map((db) => (
                    <SelectItem key={db.name} value={db.name}>
                      {db.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Target Schema Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Target Schema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">Server</label>
              <Select value={targetServerId} onValueChange={setTargetServerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select server" />
                </SelectTrigger>
                <SelectContent>
                  {servers.map((server) => (
                    <SelectItem key={server.id} value={server.id}>
                      {server.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Database</label>
              <Select value={targetDatabase} onValueChange={setTargetDatabase}>
                <SelectTrigger>
                  <SelectValue placeholder="Select database" />
                </SelectTrigger>
                <SelectContent>
                  {targetSchema?.map((db) => (
                    <SelectItem key={db.name} value={db.name}>
                      {db.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Results */}
      {comparisonResult && (
        <Card>
          <CardHeader>
            <CardTitle>Comparison Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{comparisonResult.added.length}</div>
                <div className="text-sm text-muted-foreground">Added</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{comparisonResult.removed.length}</div>
                <div className="text-sm text-muted-foreground">Removed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{comparisonResult.modified.length}</div>
                <div className="text-sm text-muted-foreground">Modified</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{comparisonResult.unchanged.length}</div>
                <div className="text-sm text-muted-foreground">Unchanged</div>
              </div>
            </div>

            <Separator className="my-4" />

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All ({tableComparisons.length})</TabsTrigger>
                <TabsTrigger value="added">{comparisonResult.added.length} Added</TabsTrigger>
                <TabsTrigger value="removed">{comparisonResult.removed.length} Removed</TabsTrigger>
                <TabsTrigger value="modified">{comparisonResult.modified.length} Modified</TabsTrigger>
                <TabsTrigger value="unchanged">{comparisonResult.unchanged.length} Unchanged</TabsTrigger>
              </TabsList>

              {['all', 'added', 'removed', 'modified', 'unchanged'].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-4">
                  <div className="space-y-2">
                    {tableComparisons
                      .filter(table => tab === 'all' || table.status === tab)
                      .map((table) => (
                        <div
                          key={table.name}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(table.status)}
                            <div>
                              <div className="font-medium">{table.name}</div>
                              {table.differences && (
                                <div className="text-sm text-muted-foreground">
                                  {table.differences.columns.added.length > 0 && (
                                    <span className="mr-2">+{table.differences.columns.added.length} columns</span>
                                  )}
                                  {table.differences.columns.removed.length > 0 && (
                                    <span className="mr-2">-{table.differences.columns.removed.length} columns</span>
                                  )}
                                  {table.differences.indexes.added.length > 0 && (
                                    <span className="mr-2">+{table.differences.indexes.added.length} indexes</span>
                                  )}
                                  {table.differences.indexes.removed.length > 0 && (
                                    <span className="mr-2">-{table.differences.indexes.removed.length} indexes</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          {getStatusBadge(table.status)}
                        </div>
                      ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
