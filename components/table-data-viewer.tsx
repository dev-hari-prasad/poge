"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  Loader2,
  Check,
  X,
  Calendar as CalendarIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useServerStorage } from "@/hooks/use-server-storage"
import type { SelectedTable, TableData } from "@/types/database"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface TableDataViewerProps {
  selectedTable: SelectedTable
  onInfoChange?: (info: { type: string; rows: number; columns: number }) => void
  onLoadingChange?: (loading: boolean) => void
  searchTerm?: string
}

export interface TableDataViewerHandle {
  reload: () => void
  exportCsv: () => void
  getCurrentData: () => { columns: string[]; columnTypes: Record<string, string>; rows: any[] } | null
  startAddRow: () => void
  startAddColumn: () => void
}

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

interface SortState {
  column: string | null
  direction: "asc" | "desc"
}

export const TableDataViewer = forwardRef<TableDataViewerHandle, TableDataViewerProps>(function TableDataViewer(
  { selectedTable, onInfoChange, onLoadingChange, searchTerm = "" }: TableDataViewerProps,
  ref,
) {
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: "asc" })
  const { servers } = useServerStorage()
  const selectedServer = servers.find((s) => s.id === selectedTable.serverId)

  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)
  const [editedRowValues, setEditedRowValues] = useState<Record<string, any>>({})
  const [isRowSaving, setIsRowSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadTableData()
  }, [selectedTable, currentPage, pageSize, sortState])

  useEffect(() => {
    // Reset pagination and sorting when switching to a different table
    setCurrentPage(1)
    setSortState({ column: null, direction: "asc" })
  }, [selectedTable?.serverId, selectedTable?.database, selectedTable?.schema, selectedTable?.table])

  const loadTableData = async () => {
    if (!selectedTable) return

    setLoading(true)
    onLoadingChange?.(true)
    setError(null)

    try {
      const server = servers.find((s) => s.id === selectedTable.serverId)
      if (!server) {
        throw new Error("Server not found for selected table")
      }
      if (!server.connected) {
        throw new Error("Server is not connected")
      }

      const response = await fetch("/api/table-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: server.host,
          port: server.port,
          user: server.username,
          password: server.password,
          database: selectedTable.database,
          sslMode: server.sslMode,
          schema: selectedTable.schema,
          table: selectedTable.table,
          page: currentPage,
          pageSize,
          sortColumn: sortState.column || undefined,
          sortDirection: sortState.direction,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error || `Failed to fetch table data (${response.status})`)
      }

      const result: TableData = await response.json()
      setTableData(result)
      onInfoChange?.({ type: selectedTable.type, rows: result.totalRows, columns: result.columns.length })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load table data")
      onInfoChange?.({ type: selectedTable.type, rows: 0, columns: 0 })
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }

  const handleSort = (columnName: string) => {
    setSortState((prev) => {
      if (prev.column === columnName) {
        return {
          column: columnName,
          direction: prev.direction === "asc" ? "desc" : "asc",
        }
      } else {
        return {
          column: columnName,
          direction: "asc",
        }
      }
    })
    setCurrentPage(1) // Reset to first page when sorting
  }

  const getSortIcon = (columnName: string) => {
    if (sortState.column !== columnName) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    }
    return sortState.direction === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />
  }

  const toSqlLiteral = (value: any): string => {
    if (value === null || value === undefined) return "NULL"
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE"
    const escaped = String(value).replace(/'/g, "''")
    return `'${escaped}'`
  }

  const detectPrimaryKey = (): string | null => {
    const pkByFlag = tableData?.columns.find(c => (c as any).isPrimaryKey)?.name
    if (pkByFlag) return pkByFlag
    const names = tableData?.columns.map(c => c.name.toLowerCase()) || []
    const idx = names.indexOf("id")
    if (idx >= 0) return tableData!.columns[idx].name
    const idLike = tableData?.columns.find(c => c.name.toLowerCase().endsWith("_id"))?.name
    return idLike || null
  }

  const buildWhereClause = (row: any): string => {
    const pk = detectPrimaryKey()
    if (pk && row[pk] !== undefined) {
      return `"${pk}" = ${toSqlLiteral(row[pk])}`
    }
    // fallback: match on all column values
    const parts = tableData!.columns.map(c => {
      const v = row[c.name]
      if (v === null || v === undefined) return `"${c.name}" IS NULL`
      return `"${c.name}" = ${toSqlLiteral(v)}`
    })
    return parts.join(" AND ")
  }

  const startEditRow = (rowIndex: number, row: any) => {
    setEditingRowIndex(rowIndex)
    setEditedRowValues({ ...row })
  }

  const cancelEditRow = () => {
    setEditingRowIndex(null)
    setEditedRowValues({})
  }

  const saveEditRow = async (originalRow: any) => {
    if (!selectedServer || !tableData) return
    const setClauses = tableData.columns
      .filter(col => editedRowValues[col.name] !== originalRow[col.name])
      .map(col => `"${col.name}" = ${toSqlLiteral(editedRowValues[col.name])}`)
    if (setClauses.length === 0) {
      cancelEditRow()
      return
    }
    const where = buildWhereClause(originalRow)
    const sql = `UPDATE "${selectedTable.schema}"."${selectedTable.table}" SET ${setClauses.join(", ")} WHERE ${where}`
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
      const data = await res.json().catch(() => ({}))
      if (!res.ok || (data && data.error)) throw new Error(data?.error || 'Update failed')
      cancelEditRow()
      await loadTableData()
      toast({ title: 'Row updated' })
    } catch (e: any) {
      toast({ title: 'Update failed', description: e?.message || 'Could not update row', variant: 'destructive' })
    } finally {
      setIsRowSaving(false)
    }
  }

  const deleteRow = async (row: any) => {
    if (!selectedServer || !tableData) return
    const where = buildWhereClause(row)
    const sql = `DELETE FROM "${selectedTable.schema}"."${selectedTable.table}" WHERE ${where}`
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
      const data = await res.json().catch(() => ({}))
      if (!res.ok || (data && data.error)) throw new Error(data?.error || 'Delete failed')
      await loadTableData()
      toast({ title: 'Row deleted' })
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.message || 'Could not delete row', variant: 'destructive' })
    } finally {
      setIsRowSaving(false)
    }
  }

  const exportCsv = () => {
    if (!tableData) return
    const header = tableData.columns.map((c) => c.name)
    const lines: string[] = []
    lines.push(header.join(","))
    for (const row of tableData.rows) {
      const values = tableData.columns.map((c) => {
        const v = row[c.name]
        if (v === null || v === undefined) return ""
        const s = String(v)
        const needsQuotes = /[",\n]/.test(s)
        const escaped = s.replace(/"/g, '""')
        return needsQuotes ? `"${escaped}"` : escaped
      })
      lines.push(values.join(","))
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${selectedTable.schema}.${selectedTable.table}.page-${currentPage}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  useImperativeHandle(ref, () => ({
    reload: loadTableData,
    exportCsv,
    getCurrentData: () => {
      if (!tableData) return null
      return {
        columns: tableData.columns.map((c) => c.name),
        columnTypes: tableData.columns.reduce((acc, c) => ({ ...acc, [c.name]: c.dataType }), {}),
        rows: tableData.rows,
      }
    },
    startAddRow: () => {
      toast({ title: 'Add Row', description: 'Row creation UI coming soon.' })
    },
    startAddColumn: () => {
      toast({ title: 'Add Column', description: 'Column creation UI coming soon.' })
    },
  }))

  const formatCellValue = (value: any, dataType: string) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">NULL</span>
    }

    if (typeof value === "boolean") {
      return <Badge variant={value ? "default" : "secondary"}>{value.toString()}</Badge>
    }

    if (dataType.includes("timestamp") || dataType.includes("date")) {
      try {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          const formattedDate = dataType.includes('timestamp') 
            ? date.toLocaleString() // Include time for timestamps
            : date.toLocaleDateString() // Date only
          return (
            <span className="font-mono text-xs">
              {formattedDate}
            </span>
          )
        }
      } catch {
        return value
      }
    }

    return value.toString()
  }

  const totalPages = tableData ? Math.ceil(tableData.totalRows / pageSize) : 0
  const startRow = tableData
    ? tableData.totalRows === 0
      ? 0
      : (currentPage - 1) * pageSize + 1
    : 0
  const endRow = tableData ? Math.min(currentPage * pageSize, tableData.totalRows) : 0

  if (loading && !tableData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading table data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={loadTableData} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tableData) return null

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumbs and table info now live in the page header */}

      {/* Data Table */}
      <div className="flex-1 overflow-auto">
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            </div>
          )}

          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-background border-b">
              <tr>
                <th className="text-left p-2 border-r bg-muted/50 w-24 text-xs font-medium">Actions</th>
                <th className="text-left p-2 border-r bg-muted/50 w-16 text-xs font-medium">#</th>
                {tableData.columns.map((column) => (
                  <th key={column.name} className="text-left p-2 border-r bg-muted/50 min-w-32">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-medium text-xs hover:bg-transparent hover:scale-100"
                      onClick={() => handleSort(column.name)}
                    >
                      <div className="flex flex-col items-start">
                        <div className="flex items-center">
                          {column.name}
                          {getSortIcon(column.name)}
                        </div>
                        <div className="text-xs text-muted-foreground font-normal">
                          {column.dataType}
                          {column.isPrimaryKey && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              PK
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.rows.length === 0 ? (
                <tr>
                  <td className="p-4 text-center text-sm text-muted-foreground" colSpan={2 + tableData.columns.length}>
                    No rows found
                  </td>
                </tr>
              ) : (
                tableData.rows
                  .filter((row) => {
                    if (!searchTerm.trim()) return true
                    const lower = searchTerm.toLowerCase()
                    return tableData.columns.some(c => String(row[c.name] ?? '').toLowerCase().includes(lower))
                  })
                  .map((row, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2 border-r text-xs">
                    <div className="flex items-center gap-1">
                      {editingRowIndex === index ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 hover:bg-transparent hover:scale-100"
                            onClick={() => saveEditRow(row)}
                            disabled={isRowSaving}
                          >
                            <Check className="h-3 w-3 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 hover:bg-transparent hover:scale-100"
                            onClick={cancelEditRow}
                            disabled={isRowSaving}
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 hover:bg-transparent hover:scale-100"
                            onClick={() => startEditRow(index, row)}
                          >
                            {/* pencil */}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-muted-foreground">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 hover:bg-transparent hover:scale-100"
                            onClick={() => deleteRow(row)}
                            disabled={isRowSaving}
                          >
                            {/* trash */}
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
                  <td className="p-2 border-r text-xs text-muted-foreground bg-muted/20">{startRow + index}</td>
                  {tableData.columns.map((column) => (
                    <td key={column.name} className="p-2 border-r text-sm align-top whitespace-nowrap">
                      {editingRowIndex === index ? (
                        column.dataType.includes("timestamp") || column.dataType.includes("date") ? (
                          <DateInput
                            value={editedRowValues[column.name] ?? row[column.name] ?? ''}
                            onChange={(value) => setEditedRowValues(prev => ({ ...prev, [column.name]: value }))}
                            dataType={column.dataType}
                            className="h-7 text-xs"
                          />
                        ) : (
                          <Input
                            value={editedRowValues[column.name] ?? row[column.name] ?? ''}
                            onChange={(e) => setEditedRowValues(prev => ({ ...prev, [column.name]: e.target.value }))}
                            className="h-7 text-xs"
                          />
                        )
                      ) : (
                        formatCellValue(row[column.name], column.dataType)
                      )}
                    </td>
                  ))}
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer metadata + pagination */}
      <div className="border-t px-3 py-2 relative flex items-center justify-between bg-card">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div>
            Showing {startRow.toLocaleString()}–{endRow.toLocaleString()} of {tableData.totalRows.toLocaleString()} rows
          </div>
          <div className="flex items-center gap-1">
            <span>Rows/page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-16 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-3 text-xs text-muted-foreground pointer-events-none">
          <span className="inline-flex items-center gap-1"><span className="opacity-70">Rows:</span> <span className="font-mono">{tableData.totalRows.toLocaleString()}</span></span>
          <span className="inline-flex items-center gap-1"><span className="opacity-70">Columns:</span> <span className="font-mono">{tableData.columns.length}</span></span>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8 p-0 hover:bg-background hover:scale-100" onClick={() => setCurrentPage(1)} disabled={currentPage <= 1}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
                      <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 p-0 hover:bg-background hover:scale-100"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
            >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs px-2">
            Page {currentPage} of {totalPages}
          </span>
                      <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 p-0 hover:bg-background hover:scale-100"
              onClick={() => setCurrentPage((prev) => (totalPages === 0 ? 1 : Math.min(totalPages, prev + 1)))}
              disabled={totalPages <= 1 || currentPage >= (totalPages || 1)}
            >
            <ChevronRight className="h-4 w-4" />
          </Button>
                      <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 p-0 hover:bg-background hover:scale-100"
              onClick={() => setCurrentPage(totalPages === 0 ? 1 : totalPages)}
              disabled={totalPages <= 1 || currentPage >= (totalPages || 1)}
            >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
})
