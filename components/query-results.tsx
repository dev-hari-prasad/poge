"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Download, Copy, CheckCircle, XCircle, AlertCircle, Loader2, Zap, Timer, RefreshCw, Search, Maximize2, Check, X, Edit, Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { VirtualTable, SimpleTable } from "@/components/virtual-table"
import { DestructiveQueryDialog } from "@/components/destructive-query-dialog"
import { useToast } from "@/hooks/use-toast"
import type { QueryResult } from "@/types/query"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

// DateInput component for date/timestamp fields
interface DateInputProps {
  value: string | null
  onChange: (value: string) => void
  dataType: string
  className?: string
}

const DateInput = ({ value, onChange, dataType, className }: DateInputProps) => {
  const [date, setDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  )

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    if (selectedDate) {
      // Format based on data type
      if (dataType.includes('timestamp')) {
        // For timestamp, include time
        onChange(selectedDate.toISOString())
      } else {
        // For date only, format as YYYY-MM-DD
        onChange(format(selectedDate, 'yyyy-MM-dd'))
      }
    } else {
      onChange('')
    }
  }

  const displayValue = date ? format(date, dataType.includes('timestamp') ? 'PPpp' : 'PP') : ''

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-7 text-xs justify-start text-left font-normal w-full",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-1 h-3 w-3" />
          {displayValue || "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

interface QueryResultsProps {
  results: QueryResult[]
  isExecuting: boolean
  onRefresh?: () => void
  onSaveTable?: () => void
  onEditTable?: (tableName?: string) => void
  onDeleteTable?: () => void
  selectedServer?: any
}

export function QueryResults({ results, isExecuting, onRefresh, onSaveTable, onEditTable, onDeleteTable, selectedServer }: QueryResultsProps) {
  const { toast } = useToast()
  const [pageSize, setPageSize] = useState(50)
  const [currentPages, setCurrentPages] = useState<Record<number, number>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [copied, setCopied] = useState<Record<number, boolean>>({})
  const [expandedResult, setExpandedResult] = useState<{open: boolean, result: QueryResult | null, index: number}>({open: false, result: null, index: 0})
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)
  const [editedRowValues, setEditedRowValues] = useState<Record<string, any>>({})
  const [isRowSaving, setIsRowSaving] = useState(false)
  const [rowToDelete, setRowToDelete] = useState<any>(null)

  // Show execution time toast when results are received
  useEffect(() => {
    if (results.length > 0 && !isExecuting) {
      const totalExecutionTime = results.reduce((sum, result) => sum + (result.executionTime || 0), 0)
      const hasStaleCache = results.some(result => result.isStale)
      
      if (totalExecutionTime > 0) {
        if (hasStaleCache) {
          toast({
            title: "⚠️ Stale Cache Detected",
            description: "Results may be outdated due to recent database changes. Consider refreshing.",
            variant: "destructive",
          })
        } else {
          toast({
            title: `${totalExecutionTime}ms`,
            variant: "default",
          })
        }
      }
    }
  }, [results, isExecuting, toast])

  // Memoize expensive calculations
  const processedResults = useMemo(() => {
    return results.map((result, index) => ({
      ...result,
      index,
      isLargeDataset: (result.rows?.length || 0) > 1000
    }))
  }, [results])



  const copyToClipboard = useCallback(async (result: QueryResult, resultIndex: number) => {
    if (result.type !== "select" || !result.rows) return

    const text = result.rows.map((row) => result.columns!.map((col) => row[col] ?? "NULL").join("\t")).join("\n")

    try {
      await navigator.clipboard.writeText(text)
      setCopied(prev => ({ ...prev, [resultIndex]: true }))
      setTimeout(() => setCopied(prev => ({ ...prev, [resultIndex]: false })), 1200)
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
    }
  }, [])

  const formatCellValue = (value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">NULL</span>
    }
    if (typeof value === "boolean") {
      return <Badge variant={value ? "default" : "secondary"}>{value.toString()}</Badge>
    }
    
    // Check if it's a date field
    if (typeof value === 'string') {
      const isDateField = value.match(/^\d{4}-\d{2}-\d{2}/) || // YYYY-MM-DD format
                         value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) // ISO timestamp format
      
      if (isDateField) {
        try {
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            const formattedDate = value.includes('T') 
              ? date.toLocaleString() // Include time for timestamps
              : date.toLocaleDateString() // Date only
            return (
              <span className="font-mono text-xs">
                {formattedDate}
              </span>
            )
          }
        } catch (e) {
          // Fall through to default string rendering
        }
      }
    }
    
    return value.toString()
  }

  const getResultIcon = (type: QueryResult["type"]) => {
    switch (type) {
      case "select":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "insert":
      case "update":
      case "delete":
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
    }
  }

  const getResultMessage = useCallback((result: QueryResult) => {
    let message = ""
    switch (result.type) {
      case "select":
        const rowCount = result.rowCount || 0
        const columnCount = result.columns?.length || 0
        message = `${rowCount} rows with ${columnCount} columns returned`
        break
      case "insert":
        message = `${result.affectedRows} rows inserted`
        break
      case "update":
        message = `${result.affectedRows} rows updated`
        break
      case "delete":
        message = `${result.affectedRows} rows deleted`
        break
      case "success":
        message = "Query executed successfully"
        break
      case "error":
        message = result.error || "Unknown error"
        break
      default:
        message = "Query completed"
    }
    
    // Add cache indicator
    if (result.fromCache) {
      message += ` (from cache)`
      if (result.cacheHits) {
        message += ` • ${result.cacheHits} hits`
      }
    }
    
    return message
  }, [])

  // Filter data based on search term
  const getFilteredData = useCallback((resultIndex: number) => {
    const data = results[resultIndex]?.rows || []
    if (!searchTerm.trim()) return data

    return data.filter(row => {
      return Object.values(row).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
  }, [results, searchTerm])

  const renderSelectResult = useCallback((result: QueryResult, resultIndex: number) => {
    if (!result.columns || !result.rows) return null

    const isLargeDataset = result.rows.length > 1000
    const currentData = getFilteredData(resultIndex)

    const extractTableNameFromQuery = (query?: string): string => {
      if (!query) return ""
      const patterns = [
        /from\s+((?:"[^"]+"|[a-zA-Z_][\w$]*)(?:\.(?:"[^"]+"|[a-zA-Z_][\w$]*))?)/i,
        /insert\s+into\s+((?:"[^"]+"|[a-zA-Z_][\w$]*)(?:\.(?:"[^"]+"|[a-zA-Z_][\w$]*))?)/i,
        /update\s+((?:"[^"]+"|[a-zA-Z_][\w$]*)(?:\.(?:"[^"]+"|[a-zA-Z_][\w$]*))?)/i,
        /delete\s+from\s+((?:"[^"]+"|[a-zA-Z_][\w$]*)(?:\.(?:"[^"]+"|[a-zA-Z_][\w$]*))?)/i,
      ]
      for (const regex of patterns) {
        const match = query.match(regex)
        if (match) {
          const ident = match[1]
          const last = ident.split('.').pop() || ident
          return last.replace(/^"|"$/g, '')
        }
      }
      return ""
    }

    const toSqlLiteral = (value: any): string => {
      if (value === null || value === undefined) return "NULL"
      if (typeof value === "number" && Number.isFinite(value)) return String(value)
      if (typeof value === "boolean") return value ? "TRUE" : "FALSE"
      const escaped = String(value).replace(/'/g, "''")
      return `'${escaped}'`
    }

    const detectPrimaryKey = (columns: string[], row: any): string | null => {
      if (columns.includes("id") && row["id"] !== undefined) return "id"
      const candidate = columns.find(c => c.toLowerCase().endsWith("_id") && row[c] !== undefined)
      return candidate || null
    }

    const buildWhereClause = (columns: string[], row: any): string => {
      const pk = detectPrimaryKey(columns, row)
      if (pk && row[pk] !== undefined) {
        return `"${pk}" = ${toSqlLiteral(row[pk])}`
      }
      const parts = columns.map(col => {
        const val = row[col]
        if (val === null || val === undefined) {
          return `"${col}" IS NULL`
        }
        return `"${col}" = ${toSqlLiteral(val)}`
      })
      return parts.join(" AND ")
    }

    const startEditRow = (row: any) => {
      setEditedRowValues({ ...row })
      setEditingRowIndex(row.__rowIndex)
    }

    const cancelEditRow = () => {
      setEditingRowIndex(null)
      setEditedRowValues({})
    }

    const saveEditRow = async (originalRow: any) => {
      if (!selectedServer) {
        toast({ title: "No server selected", variant: "destructive" })
        return
      }
      const tableName = extractTableNameFromQuery(result.query)
      if (!tableName) {
        toast({ title: "Table not identified", description: "Could not infer table name from the query.", variant: "destructive" })
        return
      }
      const columns = result.columns || []
      const setClauses = columns
        .filter(col => editedRowValues[col] !== originalRow[col])
        .map(col => `"${col}" = ${toSqlLiteral(editedRowValues[col])}`)

      if (setClauses.length === 0) {
        cancelEditRow()
        return
      }

      const where = buildWhereClause(columns, originalRow)
      const sql = `UPDATE "${tableName}" SET ${setClauses.join(", ")} WHERE ${where}`

      try {
        setIsRowSaving(true)
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: selectedServer.host,
            port: selectedServer.port,
            user: selectedServer.username,
            password: selectedServer.password,
            database: selectedServer.database,
            sql,
            sslMode: selectedServer.sslMode,
          }),
        })
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error || 'Update failed')
        toast({ title: "Row updated" })
        cancelEditRow()
        onRefresh && onRefresh()
      } catch (e: any) {
        toast({ title: "Update failed", description: e?.message || String(e), variant: "destructive" })
      } finally {
        setIsRowSaving(false)
      }
    }

    const deleteRow = (row: any) => {
      setRowToDelete({ row, resultIndex: resultIndex })
    }

    const confirmDeleteRow = async (row: any) => {
      if (!selectedServer) {
        toast({ title: "No server selected", variant: "destructive" })
        return
      }
      const tableName = extractTableNameFromQuery(result.query)
      if (!tableName) {
        toast({ title: "Table not identified", description: "Could not infer table name from the query.", variant: "destructive" })
        return
      }
      const columns = result.columns || []
      const where = buildWhereClause(columns, row)
      const sql = `DELETE FROM "${tableName}" WHERE ${where}`

      try {
        setIsRowSaving(true)
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: selectedServer.host,
            port: selectedServer.port,
            user: selectedServer.username,
            password: selectedServer.password,
            database: selectedServer.database,
            sql,
            sslMode: selectedServer.sslMode,
          }),
        })
        const data = await res.json()
        if (!res.ok || data.error) throw new Error(data.error || 'Delete failed')
        toast({ title: "Row deleted" })
        cancelEditRow()
        onRefresh && onRefresh()
        setRowToDelete(null)
      } catch (e: any) {
        toast({ title: "Delete failed", description: e?.message || String(e), variant: "destructive" })
      } finally {
        setIsRowSaving(false)
      }
    }
    }

    return (
      <div className="h-full flex flex-col">
          <div className="flex items-center gap-2">
            {result.isStale && onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} className="text-orange-600 hover:text-orange-700">
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            )}
          </div>

        <div className="flex-1 min-h-0 overflow-hidden h-full">
          {result.type === "select" ? (
            isLargeDataset ? (
              <VirtualTable 
                columns={["Actions", ...(result.columns || [])]} 
                rows={currentData}
                height={600}
                rowHeight={28}
                columnWidth={120}
                showLineNumbers={true}
                onEditTable={() => {
                  console.log("VirtualTable onEditTable called")
                  console.log("result.query:", result.query)
                  const tableName = extractTableNameFromQuery(result.query)
                  console.log("extracted table name:", tableName)
                  console.log("onEditTable callback exists:", !!onEditTable)
                  if (onEditTable) {
                    onEditTable(tableName)
                  }
                }}
                onDeleteTable={onDeleteTable}
              />
            ) : (
              <div className="overflow-auto h-full min-h-0 max-h-full table-scroll-container" style={{ maxHeight: 'calc(100vh - 8.5rem)' }}>
                <div className="inline-block border rounded-md">
                <table className="min-w-max border-collapse">
                  <thead className="sticky top-0 bg-muted z-10">
                    <tr>
                      <th className="text-left p-2 border-r font-medium text-sm whitespace-nowrap w-20">
                        Actions
                      </th>
                      {result.columns?.map((column) => (
                        <th key={column} className="text-left p-2 border-r font-medium text-sm whitespace-nowrap">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.map((row, rowIndex) => {
                      const rowWithIndex = { ...row, __rowIndex: rowIndex }
                      const isEditing = editingRowIndex === rowIndex
                      return (
                        <tr key={rowIndex} className="border-b hover:bg-muted/30">
                          <td className="p-2 border-r text-sm">
                            <div className="flex items-center gap-1">
                              {isEditing ? (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => saveEditRow(row)} disabled={isRowSaving} className="h-6 w-6 p-0">
                                    <Check className="h-3 w-3 text-green-600" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={cancelEditRow} disabled={isRowSaving} className="h-6 w-6 p-0">
                                    <X className="h-3 w-3 text-muted-foreground" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button variant="ghost" size="icon" onClick={() => startEditRow(rowWithIndex)} className="h-6 w-6 p-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-muted-foreground">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => deleteRow(row)} className="h-6 w-6 p-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-muted-foreground">
                                      <path d="M3 6h18" />
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                      <line x1="10" y1="11" x2="10" y2="17" />
                                      <line x1="14" y1="11" x2="14" y2="17" />
                                    </svg>
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                          {result.columns?.map((column) => (
                            <td key={column} className="p-2 border-r text-sm align-top whitespace-pre-wrap break-words">
                              {isEditing ? (
                                (() => {
                                  const value = row[column]
                                  const isDateField = typeof value === 'string' && (
                                    value.match(/^\d{4}-\d{2}-\d{2}/) || // YYYY-MM-DD format
                                    value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) // ISO timestamp format
                                  )
                                  
                                  if (isDateField) {
                                    return (
                                      <DateInput
                                        value={editedRowValues[column] ?? value ?? ''}
                                        onChange={(newValue) => setEditedRowValues(prev => ({ ...prev, [column]: newValue }))}
                                        dataType={value.includes('T') ? 'timestamp' : 'date'}
                                        className="h-7 text-xs"
                                      />
                                    )
                                  }
                                  
                                  return (
                                    <Input
                                      value={editedRowValues[column] ?? value ?? ''}
                                      onChange={(e) => setEditedRowValues(prev => ({ ...prev, [column]: e.target.value }))}
                                      className="h-7 text-xs"
                                    />
                                  )
                                })()
                              ) : (
                                formatCellValue(row[column])
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )
          ) : result.type === "error" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600 text-base">Query Error</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-red-800 bg-red-50 p-3 rounded border whitespace-pre-wrap break-words overflow-auto max-h-64">
                  {result.error}
                </pre>
              </CardContent>
            </Card>
          ) : (
            <div className="text-sm text-muted-foreground">
              Query executed successfully
              {result.fromCache && <span className="text-green-600 ml-2">(from cache)</span>}
            </div>
          )}
        </div>
      </div>
    )
  }, [copyToClipboard, results, searchTerm, onRefresh, onDeleteTable])

  let mainContent: React.ReactNode = null;

  if (results.length === 0 && !isExecuting) {
    mainContent = (
      <div className="flex-1 flex flex-col items-center justify-center border-t bg-muted/20 h-full">
        <div className="text-center text-muted-foreground">
          <p>No results to display</p>
          <p className="text-sm">Execute a query to see results here</p>
        </div>
      </div>
    );
  } else if (processedResults.length === 1) {
    const result = processedResults[0]
    const resultIndex = 0
    mainContent = (
      <div className="flex-1 border-t overflow-hidden relative z-10">
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center mb-4 flex-shrink-0 w-full">
            {/* Search Bar on the left */}
            <div className="flex-shrink-0">
              {result.type === "select" && (
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search table..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-10 w-80 text-xs"
                  />
                </div>
              )}
            </div>
            {/* Spacer */}
            <div className="flex-1" />
            {/* Edit/Download/Copy buttons and row/col info on the right (only for select) */}
            {result.type === "select" && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                  {getResultIcon(result.type)}
                  <span className="font-medium text-sm">{getResultMessage(result)}</span>
                </div>




              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden h-full relative">
            {isExecuting && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Executing query...</span>
                </div>
              </div>
            )}
            {result.type === "select" ? (
              renderSelectResult(result, 0)
            ) : result.type === "error" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600 text-base">Query Error</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-red-800 bg-red-50 p-3 rounded border whitespace-pre-wrap break-words overflow-auto max-h-64">
                    {result.error}
                  </pre>
                </CardContent>
              </Card>
            ) : (
              <div className="text-sm text-muted-foreground">
                Query executed successfully
                {result.fromCache && <span className="text-green-600 ml-2">(from cache)</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } else {
    mainContent = (
      <div className="flex-1 border-t overflow-hidden relative z-10">
        {isExecuting && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Executing query...</span>
            </div>
          </div>
        )}
        <Tabs defaultValue="0" className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 flex-shrink-0">
            {processedResults.map((result, index) => (
              <TabsTrigger key={index} value={index.toString()} className="flex items-center gap-2">
                {getResultIcon(result.type)}
                Result {index + 1}
                {result.fromCache && (
                  <Zap className="h-3 w-3 text-green-600" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {processedResults.map((result, index) => (
            <TabsContent key={index} value={index.toString()} className="flex-1 m-0 p-4 min-h-0 overflow-hidden">
              <div className="flex items-center mb-4 flex-shrink-0 w-full">
                {/* Search Bar on the left */}
                <div className="flex-shrink-0">
                  {result.type === "select" && (
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        placeholder="Search table..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-10 w-80 text-xs"
                      />
                    </div>
                  )}
                </div>
                {/* Spacer */}
                <div className="flex-1" />
                {/* Edit/Download/Copy buttons and row/col info on the right (only for select) */}
                {result.type === "select" && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      {getResultIcon(result.type)}
                      <span className="font-medium text-sm">{getResultMessage(result)}</span>
                    </div>




                  </div>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-hidden h-full">
                {result.type === "select" ? (
                  renderSelectResult(result, index)
                ) : result.type === "error" ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600 text-base">Query Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-sm text-red-800 bg-red-50 p-3 rounded border whitespace-pre-wrap break-words overflow-auto max-h-64">
                        {result.error}
                      </pre>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Query executed successfully
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  return (
    <>
      {mainContent}
      
      {/* Expanded View Dialog */}
      <Dialog open={expandedResult.open} onOpenChange={(open) => setExpandedResult({...expandedResult, open})}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] w-[90vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {expandedResult.result && getResultIcon(expandedResult.result.type)}
              {expandedResult.result && getResultMessage(expandedResult.result)}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto min-h-0">
            {expandedResult.result?.type === "select" && (
              <div className="h-full" style={{ maxHeight: 'calc(90vh - 150px)' }}>
                <SimpleTable 
                  columns={["Actions", ...(expandedResult.result.columns || [])]} 
                  rows={getFilteredData(expandedResult.index)}
                  onEditTable={() => onEditTable && onEditTable()}
                  onDeleteTable={onDeleteTable}
                />
              </div>
            )}
            
            {expandedResult.result?.type === "error" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600 text-base">Query Error</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-red-800 bg-red-50 p-3 rounded border whitespace-pre-wrap break-words overflow-auto max-h-[60vh]">
                    {expandedResult.result.error}
                  </pre>
                </CardContent>
              </Card>
            )}
            
            {expandedResult.result?.type !== "select" && expandedResult.result?.type !== "error" && (
              <div className="text-sm text-muted-foreground p-4">
                Query executed successfully
                {expandedResult.result?.fromCache && <span className="text-green-600 ml-2">(from cache)</span>}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <div className="flex items-center gap-2">
              {expandedResult.result?.type === "select" && onSaveTable && (
                <Button variant="outline" size="sm" onClick={onSaveTable}>
                  <Download className="h-3 w-3 mr-2" />
                  Save as Table
                </Button>
              )}
              {expandedResult.result && (
                <Button variant="outline" size="sm" onClick={() => expandedResult.result && copyToClipboard(expandedResult.result as any, expandedResult.index)}>
                  {copied[expandedResult.index] ? (
                    <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3 mr-2" />
                  )}
                  Copy to Clipboard
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setExpandedResult({open: false, result: null, index: 0})}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DestructiveQueryDialog
        open={!!rowToDelete}
        action="DELETE"
        objectType="row"
        onConfirm={() => rowToDelete && confirmDeleteRow(rowToDelete.row)}
        onCancel={() => setRowToDelete(null)}
        isLoading={isRowSaving}
      />
    </>
  )
}
