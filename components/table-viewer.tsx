"use client"

import { Database, ChevronLeft, ChevronRight, ChevronDown, Search } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { TableDataViewer } from "@/components/table-data-viewer"
import type { TableDataViewerHandle } from "@/components/table-data-viewer"
import { useTableSelection } from "@/hooks/use-table-selection"
import { useServerStorage } from "@/hooks/use-server-storage"
import { DatabaseTree } from "@/components/database-tree"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Download, RefreshCw, Info, Plus, Trash2, Calendar as CalendarIcon, Columns, Edit, Maximize2 } from "lucide-react"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { SaveTableDialog } from "@/components/save-table-dialog"
import { DeleteTableDialog } from "@/components/delete-table-dialog"
import { EditTableDialog } from "@/components/edit-table-dialog"
import type { QueryResult } from "@/types/query"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { DatabaseInfo } from "@/types/database"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
            "h-10 text-sm justify-start text-left font-normal w-full",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
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

export function TableViewer() {
  const { selectedTable, setSelectedTable } = useTableSelection()
  const { servers } = useServerStorage()
  const connectedServers = servers.filter((server) => server.connected)
  const viewerRef = useRef<TableDataViewerHandle | null>(null)
  const [tableInfo, setTableInfo] = useState<{ type: string; rows: number; columns: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isTreeCollapsed, setIsTreeCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("postgres-manager-table-tree-collapsed") === "true" } catch { return false }
  })
  const [treeSize, setTreeSize] = useState<number>(() => {
    try { return Number(localStorage.getItem("postgres-manager-table-tree-size")) || 22 } catch { return 22 }
  })
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [downloadResults, setDownloadResults] = useState<QueryResult[] | null>(null)
  const [treeData, setTreeData] = useState<DatabaseInfo[] | null>(null)
  const [isTreeDataLoading, setIsTreeDataLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddRow, setShowAddRow] = useState(false)
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [showDeleteTableDialog, setShowDeleteTableDialog] = useState(false)
  const [showEditTableDialog, setShowEditTableDialog] = useState(false)
  const [addRowValues, setAddRowValues] = useState<Record<string, string>>({})
  const [addColumnForm, setAddColumnForm] = useState<{ name: string; type: string; length?: number; notNull: boolean; defaultValue?: string }>({ name: "", type: "varchar", length: undefined, notNull: false, defaultValue: undefined })
  const [submitting, setSubmitting] = useState(false)
  const [expandedResult, setExpandedResult] = useState<{open: boolean, result: QueryResult | null, index: number}>({open: false, result: null, index: 0})

  useEffect(() => {
    try { localStorage.setItem("postgres-manager-table-tree-collapsed", String(isTreeCollapsed)) } catch {}
  }, [isTreeCollapsed])
  useEffect(() => {
    try { localStorage.setItem("postgres-manager-table-tree-size", String(treeSize)) } catch {}
  }, [treeSize])

  // Load schema/table list for breadcrumb dropdowns when server changes
  useEffect(() => {
    const loadTree = async () => {
      if (!selectedTable) return
      const server = servers.find((s) => s.id === selectedTable.serverId)
      if (!server) return
      setIsTreeDataLoading(true)
      try {
        const response = await fetch('/api/schema/tree', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: server.host,
            port: server.port,
            user: server.username,
            password: server.password,
            database: server.database,
            sslMode: server.sslMode,
          })
        })
        if (!response.ok) throw new Error('Failed to load schema tree')
        const data: DatabaseInfo[] = await response.json()
        setTreeData(data)
      } catch {
        setTreeData(null)
      } finally {
        setIsTreeDataLoading(false)
      }
    }
    loadTree()
  }, [selectedTable?.serverId, servers])

  const selectedServer = (() => {
    if (!selectedTable) return null
    return servers.find((s) => s.id === selectedTable.serverId) || null
  })()

  const toSqlLiteral = (value: any): string => {
    if (value === null || value === undefined || value === "") return "NULL"
    if (value === "TRUE" || value === "FALSE") return value
    if (!isNaN(Number(value)) && value.trim() !== "") return String(Number(value))
    const escaped = String(value).replace(/'/g, "''")
    return `'${escaped}'`
  }

  const openAddRowDialog = () => {
    const data = viewerRef.current?.getCurrentData?.()
    if (!data) return
    
    const init: Record<string, string> = {}
    data.columns.forEach((col) => (init[col] = ""))
    setAddRowValues(init)
    setShowAddRow(true)
  }

  const getColumnType = (columnName: string) => {
    const data = viewerRef.current?.getCurrentData?.()
    return data?.columnTypes?.[columnName] || 'varchar'
  }

  const submitAddRow = async () => {
    if (!selectedServer || !selectedTable) return
    const columns = Object.keys(addRowValues)
    const values = columns.map((c) => toSqlLiteral(addRowValues[c]))
    const sql = `INSERT INTO "${selectedTable.schema}"."${selectedTable.table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${values.join(", ")})`
    try {
      setSubmitting(true)
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
      if (!res.ok || data?.error) throw new Error(data?.error || 'Insert failed')
      setShowAddRow(false)
      viewerRef.current?.reload?.()
    } finally {
      setSubmitting(false)
    }
  }

  const submitAddColumn = async () => {
    if (!selectedServer || !selectedTable || !addColumnForm.name.trim()) return
    const typeWithLen = addColumnForm.length ? `${addColumnForm.type}(${addColumnForm.length})` : addColumnForm.type
    const parts = [`ALTER TABLE "${selectedTable.schema}"."${selectedTable.table}" ADD COLUMN "${addColumnForm.name}" ${typeWithLen}`]
    if (addColumnForm.notNull) parts.push('NOT NULL')
    if (addColumnForm.defaultValue && addColumnForm.defaultValue.trim() !== '') parts.push(`DEFAULT ${toSqlLiteral(addColumnForm.defaultValue)}`)
    const sql = parts.join(' ')
    try {
      setSubmitting(true)
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
      if (!res.ok || data?.error) throw new Error(data?.error || 'Add column failed')
      setShowAddColumn(false)
      viewerRef.current?.reload?.()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="grid grid-cols-[auto_1fr_auto] h-14 shrink-0 items-center gap-2 border-b px-4">
        <div className="flex items-center gap-2">

          <div className="hidden md:block relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search rows..."
              className="pl-8 h-10 w-64"
            />
          </div>
        </div>
        <div className="overflow-hidden justify-self-center">
          <Breadcrumb>
            <BreadcrumbList>
              {selectedTable ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink>{selectedTable.serverName}</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <BreadcrumbLink className="cursor-pointer inline-flex items-center gap-1">
                          {selectedTable.database}
                          <ChevronDown className="h-3 w-3 opacity-70" />
                        </BreadcrumbLink>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {(treeData?.[0]?.name ? [treeData[0].name] : [selectedTable.database]).map((db) => (
                          <DropdownMenuItem key={db}>{db}</DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <BreadcrumbLink className="cursor-pointer inline-flex items-center gap-1">
                          {selectedTable.schema}
                          <ChevronDown className="h-3 w-3 opacity-70" />
                        </BreadcrumbLink>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="max-h-72 overflow-auto">
                        {treeData?.[0]?.schemas?.map((s) => (
                          <DropdownMenuItem
                            key={s.name}
                            onClick={() => {
                              const firstTable = s.tables[0]?.name
                              if (!firstTable || !selectedTable) return
                              setSelectedTable({
                                ...selectedTable,
                                schema: s.name,
                                table: firstTable,
                              })
                            }}
                          >
                            {s.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <BreadcrumbPage className="cursor-pointer inline-flex items-center gap-1">
                          {selectedTable.table}
                          <ChevronDown className="h-3 w-3 opacity-70" />
                        </BreadcrumbPage>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="max-h-72 overflow-auto">
                        {treeData?.[0]?.schemas?.find(s => s.name === selectedTable.schema)?.tables.map((t) => (
                          <DropdownMenuItem
                            key={t.name}
                            onClick={() => {
                              if (!selectedTable) return
                              setSelectedTable({
                                ...selectedTable,
                                table: t.name,
                                // keep type in sync
                                type: t.type,
                              })
                            }}
                          >
                            {t.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </BreadcrumbItem>
                </>
              ) : (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {connectedServers.length > 0 ? connectedServers[0]?.name || "Table Viewer" : "Table Viewer"}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-3 justify-self-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => viewerRef.current?.reload()} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-9 w-9 ${selectedTable ? "" : "opacity-50"}`}
                  onClick={() => {
                    if (!selectedTable) return
                    const data = viewerRef.current?.getCurrentData?.()
                    if (!data) return
                    const result: QueryResult = {
                      type: "select",
                      columns: data.columns,
                      rows: data.rows,
                      rowCount: data.rows.length,
                      affectedRows: 0,
                      executionTime: 0,
                      query: "",
                    }
                    setExpandedResult({open: true, result, index: 0})
                  }}
                  disabled={!selectedTable}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{selectedTable ? "Expand table to popup" : "Select a table to expand"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-6" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`h-9 w-9 ${selectedTable ? "" : "opacity-50"}`}
                title="Add"
                disabled={!selectedTable}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={openAddRowDialog} disabled={!selectedTable}>
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowAddColumn(true)} disabled={!selectedTable}>
                <Columns className="h-4 w-4 mr-2" />
                Add Column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className={`h-9 w-9 ${selectedTable ? "text-blue-600 border-blue-600/40 hover:text-blue-700 hover:border-blue-700/50" : "opacity-50"}`}
                  onClick={() => selectedTable && setShowEditTableDialog(true)}
                  disabled={!selectedTable}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{selectedTable ? "Edit Table" : "Select a table to edit"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Delete table */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-9 w-9 ${selectedTable ? "text-red-600 border-red-600/40 hover:text-red-700 hover:border-red-700/50" : "opacity-50"}`}
                  onClick={() => selectedTable && setShowDeleteTableDialog(true)}
                  disabled={!selectedTable}
                  title="Delete Table"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{selectedTable ? "Danger: Delete Table" : "Select a table to delete"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-9 w-9 ${selectedTable ? "" : "opacity-50"}`}
                  onClick={() => {
                    if (!selectedTable) return
                    const data = viewerRef.current?.getCurrentData?.()
                    if (!data) {
                      setShowDownloadDialog(true)
                       setDownloadResults([{ type: "select", columns: [], rows: [], rowCount: tableInfo?.rows ?? 0, affectedRows: 0, executionTime: 0, query: "" }])
                      return
                    }
                    const result: QueryResult = {
                      type: "select",
                      columns: data.columns,
                      rows: data.rows,
                      rowCount: data.rows.length,
                      affectedRows: 0,
                      executionTime: 0,
                      query: "",
                    }
                    setDownloadResults([result])
                    setShowDownloadDialog(true)
                  }}
                  disabled={!selectedTable || (tableInfo?.rows ?? 0) === 0}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{selectedTable ? "Download" : "Select a table to download"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      <div className="flex overflow-hidden min-h-0 h-[calc(100svh-3.5rem)] w-full relative">
        {connectedServers.length === 0 ? (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-[5] flex flex-col items-center justify-center text-center">
            <Database className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Connected Servers</h2>
            <p className="text-muted-foreground mb-4 max-w-md">
              Connect to a PostgreSQL server from the Servers section to browse tables and view data.
            </p>
          </div>
        ) : (
          <ResizablePanelGroup
            direction="horizontal"
            dir="ltr"
            className="h-full min-h-0"
            onLayout={(sizes) => {
              // Only update saved tree size when both panels are present
              if (Array.isArray(sizes) && sizes.length > 1) {
                setTreeSize(sizes[0] as number)
              }
            }}
          >
            {!isTreeCollapsed && (
              <ResizablePanel
                defaultSize={treeSize}
                minSize={15}
                maxSize={45}
                className="min-w-0 min-h-0"
                onResize={(size) => {
                  // Persist the size only when the tree panel is actually being resized
                  if (typeof size === "number") {
                    setTreeSize(size)
                  }
                }}
              >
                <aside className="h-full overflow-y-auto overflow-x-hidden border-r p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-muted-foreground">Database Objects</div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 border border-border shadow-sm"
                      onClick={() => setIsTreeCollapsed(true)}
                      title="Collapse"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                  <DatabaseTree servers={connectedServers} />
                </aside>
              </ResizablePanel>
            )}
            {!isTreeCollapsed && <ResizableHandle withHandle />}
            <ResizablePanel className="min-w-0 min-h-0">
              <main className="flex-1 h-full overflow-hidden min-h-0">
              {!selectedTable ? (
                <div className="flex flex-col items-center justify-center h-full w-full text-center">
                  <Database className="h-16 w-16 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Select a Table</h2>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    Choose a table from the database tree to view its data and structure.
                  </p>
                </div>
              ) : (
                <div className="h-full p-3">
                  <div className="h-full rounded-lg border bg-card shadow-sm overflow-hidden">
                <TableDataViewer
                      ref={viewerRef}
                      selectedTable={selectedTable!}
                      onInfoChange={setTableInfo}
                      onLoadingChange={setIsLoading}
                  searchTerm={searchTerm}
                    />
                  </div>
                </div>
              )}
                {isTreeCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 rounded-r-md bg-muted text-muted-foreground hover:bg-muted/80 border border-border shadow-sm"
                      onClick={() => setIsTreeCollapsed(false)}
                      title="Expand"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
            </main>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {selectedTable && (
        <SaveTableDialog
          open={showDownloadDialog}
          onOpenChange={setShowDownloadDialog}
          tableName={`${selectedTable.schema}.${selectedTable.table}`}
          results={downloadResults || [{ type: "select", columns: [], rows: [], rowCount: tableInfo?.rows ?? 0, affectedRows: 0, executionTime: 0, query: "" }]}
        />
      )}

      {selectedTable && (
        <DeleteTableDialog
          open={showDeleteTableDialog}
          onOpenChange={setShowDeleteTableDialog}
          tableName={`${selectedTable.schema}.${selectedTable.table}`}
           results={(function(){
            const d = viewerRef.current?.getCurrentData?.()
            if (!d) return [] as QueryResult[]
            return [{ type: 'select', columns: d.columns, rows: d.rows, rowCount: d.rows.length, affectedRows: 0, executionTime: 0, query: '' }] as QueryResult[]
          })()}
          selectedServer={selectedServer}
        />
      )}

      {/* Add Row Dialog */}
      <Dialog open={showAddRow} onOpenChange={setShowAddRow}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Row</DialogTitle>
            <DialogDescription>Insert a new row into {selectedTable ? `${selectedTable.schema}.${selectedTable.table}` : ''}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {Object.keys(addRowValues).length === 0 ? (
              <div className="text-sm text-muted-foreground">No columns found. Load the table first.</div>
            ) : (
              Object.keys(addRowValues).map((col) => {
                const dataType = getColumnType(col)
                const isDateField = dataType.includes('timestamp') || dataType.includes('date')
                
                return (
                  <div key={col} className="grid gap-1">
                    <Label>{col}</Label>
                    {isDateField ? (
                      <DateInput
                        value={addRowValues[col] ?? ''}
                        onChange={(value) => setAddRowValues((prev) => ({ ...prev, [col]: value }))}
                        dataType={dataType}
                      />
                    ) : (
                      <Input 
                        value={addRowValues[col] ?? ''} 
                        onChange={(e) => setAddRowValues((prev) => ({ ...prev, [col]: e.target.value }))} 
                        placeholder="Leave blank for NULL" 
                      />
                    )}
                  </div>
                )
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRow(false)}>Cancel</Button>
            <Button onClick={submitAddRow} disabled={submitting || !selectedServer}>
              <Plus className="h-4 w-4 mr-2" />
              {submitting ? 'Adding…' : 'Add Row'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Column Dialog */}
      <Dialog open={showAddColumn} onOpenChange={setShowAddColumn}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add Column</DialogTitle>
            <DialogDescription>Add a new column to {selectedTable ? `${selectedTable.schema}.${selectedTable.table}` : ''}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label>Column Name</Label>
              <Input value={addColumnForm.name} onChange={(e) => setAddColumnForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Data Type</Label>
                <Select value={addColumnForm.type} onValueChange={(v) => setAddColumnForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['integer','bigint','numeric','varchar','text','boolean','timestamp','date'].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Length (optional)</Label>
                <Input type="number" value={addColumnForm.length ?? ''} onChange={(e) => setAddColumnForm((p) => ({ ...p, length: e.target.value ? Number(e.target.value) : undefined }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Default (optional)</Label>
              <Input placeholder="e.g. 0, 'text', TRUE" value={addColumnForm.defaultValue ?? ''} onChange={(e) => setAddColumnForm((p) => ({ ...p, defaultValue: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="notnull" checked={addColumnForm.notNull} onCheckedChange={(c) => setAddColumnForm((p) => ({ ...p, notNull: !!c }))} />
              <Label htmlFor="notnull">NOT NULL</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddColumn(false)}>Cancel</Button>
            <Button onClick={submitAddColumn} disabled={submitting || !addColumnForm.name.trim() || !selectedServer}>
              <Columns className="h-4 w-4 mr-2" />
              {submitting ? 'Adding…' : 'Add Column'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedTable && (
        <EditTableDialog
          open={showEditTableDialog}
          onOpenChange={setShowEditTableDialog}
          tableName={`${selectedTable.schema}.${selectedTable.table}`}
          results={(() => {
            const data = viewerRef.current?.getCurrentData?.()
            if (!data) return []
            return [{ type: 'select', columns: data.columns, rows: data.rows, rowCount: data.rows.length, affectedRows: 0, executionTime: 0, query: '' }]
          })()}
          selectedServer={selectedServer}
        />
      )}

              {/* Expanded View Dialog */}
        <Dialog open={expandedResult.open} onOpenChange={(open) => setExpandedResult({...expandedResult, open})}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {expandedResult.result && (
                <>
                  <Database className="h-4 w-4" />
                  {selectedTable ? `${selectedTable.schema}.${selectedTable.table}` : 'Table Data'}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto min-h-0">
            {expandedResult.result?.type === "select" && expandedResult.result && (
              <div className="h-full" style={{ maxHeight: 'calc(95vh - 180px)' }}>
                <div className="p-4">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            {expandedResult.result.columns?.map((col, idx) => (
                              <th key={idx} className="px-3 py-2 text-left font-medium text-muted-foreground border-b">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {expandedResult.result.rows?.slice(0, 100).map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-b hover:bg-muted/30">
                              {expandedResult.result?.columns?.map((col, colIdx) => {
                                const currentData = viewerRef.current?.getCurrentData?.()
                                const dataType = currentData?.columnTypes?.[col] || 'varchar'
                                const isDateField = dataType && (dataType.includes('timestamp') || dataType.includes('date'))
                                
                                return (
                                  <td key={colIdx} className="px-3 py-2 text-left">
                                    {row[col] === null ? (
                                      <span className="text-muted-foreground italic text-xs">NULL</span>
                                    ) : isDateField ? (
                                      <DateInput
                                        value={row[col] ? String(row[col]) : ''}
                                        onChange={(value) => {
                                          // Handle date change if needed
                                          console.log(`Date changed for ${col}:`, value)
                                        }}
                                        dataType={dataType}
                                        className="h-8 text-xs"
                                      />
                                    ) : (
                                      <span className="text-xs">
                                        {String(row[col])}
                                      </span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {expandedResult.result.rows && expandedResult.result.rows.length > 100 && (
                      <div className="p-3 text-center text-sm text-muted-foreground border-t">
                        Showing first 100 rows of {expandedResult.result.rows.length} total rows
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setExpandedResult({open: false, result: null, index: 0})}>
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
