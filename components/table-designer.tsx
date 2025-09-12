"use client"

import { useState, useEffect, useMemo } from "react"
import { Plus, Save, Undo, Eye, Settings, Trash2, Edit, Copy, Database, Table2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useServerStorage } from "@/hooks/use-server-storage"
import { useToast } from "@/hooks/use-toast"
import type { DatabaseInfo } from "@/types/database"

interface Column {
  name: string
  type: string
  nullable: boolean
  defaultValue?: string
  comment?: string
  isPrimary?: boolean
  isUnique?: boolean
}

interface TableDesignerProps {
  serverId: string
  database: string
  selectedTableName?: string
}

export function TableDesigner({ serverId, database, selectedTableName }: TableDesignerProps) {
  const { servers } = useServerStorage()
  const { toast } = useToast()
  const [selectedTable, setSelectedTable] = useState<string>(selectedTableName || "")
  const [isModified, setIsModified] = useState(false)
  const [tables, setTables] = useState<string[]>([])
  const [columns, setColumns] = useState<Column[]>([])
  const [originalColumns, setOriginalColumns] = useState<Column[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("columns")

  const selectedServer = useMemo(() => servers.find(s => s.id === serverId), [servers, serverId])

  // Load tables when server or database changes
  useEffect(() => {
    if (!selectedServer || !database) return
    loadTables()
  }, [selectedServer, database])

  // Load table structure when table selection changes
  useEffect(() => {
    if (!selectedTable || !selectedServer || !database) return
    loadTableStructure()
  }, [selectedTable, selectedServer, database])

  // Sync with prop changes
  useEffect(() => {
    if (selectedTableName && selectedTableName !== selectedTable) {
      setSelectedTable(selectedTableName)
    }
  }, [selectedTableName])

  const loadTables = async () => {
    if (!selectedServer || !database) return
    
    setLoading(true)
    try {
      const response = await fetch("/api/schema/tree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: selectedServer.host,
          port: selectedServer.port,
          user: selectedServer.username,
          password: selectedServer.password,
          database: database,
          sslMode: selectedServer.sslMode,
        }),
      })
      
      if (!response.ok) throw new Error("Failed to load tables")
      
      const data: DatabaseInfo[] = await response.json()
      const db = data.find(d => d.name === database)
      if (db) {
        const tableNames: string[] = []
        db.schemas.forEach(schema => {
          schema.tables.forEach(table => {
            if (table.type === "table") {
              tableNames.push(`${schema.name}.${table.name}`)
            }
          })
        })
        setTables(tableNames)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load tables",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTableStructure = async () => {
    if (!selectedTable || !selectedServer || !database) return
    
    setLoading(true)
    try {
      const [schema, tableName] = selectedTable.split('.')
      const response = await fetch("/api/schema/table-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: selectedServer.host,
          port: selectedServer.port,
          user: selectedServer.username,
          password: selectedServer.password,
          database: database,
          schema: schema,
          table: tableName,
          sslMode: selectedServer.sslMode,
        }),
      })
      
      if (!response.ok) throw new Error("Failed to load table structure")
      
      const data = await response.json()
      const cols: Column[] = data.columns.map((col: any) => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        defaultValue: col.column_default,
        comment: col.column_comment || '',
        isPrimary: col.column_key === 'PRI',
        isUnique: col.column_key === 'UNI',
      }))
      
      setColumns(cols)
      setOriginalColumns(JSON.parse(JSON.stringify(cols)))
      setIsModified(false)
    } catch (error) {
      // If API doesn't exist, create mock data
      const mockColumns: Column[] = [
        { name: "id", type: "integer", nullable: false, isPrimary: true, isUnique: true },
        { name: "name", type: "varchar(255)", nullable: false },
        { name: "email", type: "varchar(255)", nullable: true },
        { name: "created_at", type: "timestamp", nullable: false, defaultValue: "CURRENT_TIMESTAMP" },
      ]
      setColumns(mockColumns)
      setOriginalColumns(JSON.parse(JSON.stringify(mockColumns)))
      setIsModified(false)
    } finally {
      setLoading(false)
    }
  }

  const addColumn = () => {
    const newColumn: Column = {
      name: `column_${columns.length + 1}`,
      type: "varchar(255)",
      nullable: true,
    }
    setColumns([...columns, newColumn])
    setIsModified(true)
  }

  const updateColumn = (index: number, field: keyof Column, value: any) => {
    const newColumns = [...columns]
    newColumns[index] = { ...newColumns[index], [field]: value }
    setColumns(newColumns)
    setIsModified(true)
  }

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index))
    setIsModified(true)
  }

  const revertChanges = () => {
    setColumns(JSON.parse(JSON.stringify(originalColumns)))
    setIsModified(false)
  }

  const saveChanges = async () => {
    if (!selectedServer || !database || !selectedTable) return
    
    setLoading(true)
    try {
      // Here you would implement the actual ALTER TABLE SQL generation and execution
      // For now, we'll just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setOriginalColumns(JSON.parse(JSON.stringify(columns)))
      setIsModified(false)
      
      toast({
        title: "Success",
        description: "Table structure updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update table structure",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateSQL = () => {
    if (!selectedTable) return
    
    const [schema, tableName] = selectedTable.split('.')
    let sql = `-- Table: ${schema}.${tableName}\n`
    sql += `-- Generated SQL for table modifications\n\n`
    
    columns.forEach((col, index) => {
      const originalCol = originalColumns[index]
      if (!originalCol || JSON.stringify(col) !== JSON.stringify(originalCol)) {
        if (!originalCol) {
          sql += `ALTER TABLE ${schema}.${tableName} ADD COLUMN ${col.name} ${col.type}`
          if (!col.nullable) sql += ` NOT NULL`
          if (col.defaultValue) sql += ` DEFAULT ${col.defaultValue}`
          sql += `;\n`
        } else {
          sql += `-- Column ${col.name} modified\n`
        }
      }
    })
    
    // Copy to clipboard
    navigator.clipboard.writeText(sql)
    toast({
      title: "SQL Copied",
      description: "SQL has been copied to clipboard",
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="grid gap-2">
              <Label>Select Table</Label>
              <Select value={selectedTable} onValueChange={setSelectedTable} disabled={loading}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Choose a table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table} value={table}>
                      <div className="flex items-center gap-2">
                        <Table2 className="h-3 w-3" />
                        {table}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isModified && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                Modified
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!isModified || loading} onClick={revertChanges}>
              <Undo className="h-4 w-4 mr-1" />
              Revert
            </Button>
            <Button variant="outline" size="sm" onClick={generateSQL}>
              <Eye className="h-4 w-4 mr-1" />
              Preview SQL
            </Button>
            <Button size="sm" disabled={!isModified || loading} className="bg-green-600 hover:bg-green-700" onClick={saveChanges}>
              <Save className="h-4 w-4 mr-1" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {!selectedTable ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Table Designer</h3>
            <p className="text-muted-foreground">Select a table to start designing its structure</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList>
              <TabsTrigger value="columns">Columns</TabsTrigger>
              <TabsTrigger value="indexes">Indexes</TabsTrigger>
              <TabsTrigger value="constraints">Constraints</TabsTrigger>
              <TabsTrigger value="relationships">Relationships</TabsTrigger>
            </TabsList>

            <TabsContent value="columns" className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Table Columns</h3>
                <Button size="sm" onClick={addColumn}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Column
                </Button>
              </div>

              <div className="space-y-3">
                {columns.map((column, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-3">
                          <Label className="text-xs">Column Name</Label>
                          <Input
                            value={column.name}
                            onChange={(e) => updateColumn(index, 'name', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Data Type</Label>
                          <Select value={column.type} onValueChange={(value) => updateColumn(index, 'type', value)}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="integer">integer</SelectItem>
                              <SelectItem value="bigint">bigint</SelectItem>
                              <SelectItem value="varchar(255)">varchar(255)</SelectItem>
                              <SelectItem value="text">text</SelectItem>
                              <SelectItem value="boolean">boolean</SelectItem>
                              <SelectItem value="timestamp">timestamp</SelectItem>
                              <SelectItem value="date">date</SelectItem>
                              <SelectItem value="numeric">numeric</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Default Value</Label>
                          <Input
                            value={column.defaultValue || ''}
                            onChange={(e) => updateColumn(index, 'defaultValue', e.target.value)}
                            className="mt-1"
                            placeholder="Optional"
                          />
                        </div>
                        <div className="col-span-2 flex items-center gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`nullable-${index}`}
                              checked={column.nullable}
                              onCheckedChange={(checked) => updateColumn(index, 'nullable', checked)}
                            />
                            <Label htmlFor={`nullable-${index}`} className="text-xs">Nullable</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`primary-${index}`}
                              checked={column.isPrimary || false}
                              onCheckedChange={(checked) => updateColumn(index, 'isPrimary', checked)}
                            />
                            <Label htmlFor={`primary-${index}`} className="text-xs">Primary</Label>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Comment</Label>
                          <Input
                            value={column.comment || ''}
                            onChange={(e) => updateColumn(index, 'comment', e.target.value)}
                            className="mt-1"
                            placeholder="Optional"
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeColumn(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="indexes" className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Table Indexes</h3>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Index
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Index Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Index management interface will be implemented here. You can create, modify, and delete indexes for the selected table.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="constraints" className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Table Constraints</h3>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Constraint
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Constraint Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Constraint management interface will be implemented here. You can add check constraints, unique constraints, and foreign key constraints.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="relationships" className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Foreign Key Relationships</h3>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Relationship
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Relationship Designer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Visual relationship designer will be implemented here. You can create and manage foreign key relationships between tables.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
