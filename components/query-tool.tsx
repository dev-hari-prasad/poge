"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from "motion/react"
import { PlayIcon, BookmarkIcon, FolderOpenIcon, ClockIcon, CircleStackIcon, ArrowPathIcon, PauseIcon, StopIcon, BoltIcon, TrashIcon, ChartBarIcon, EllipsisVerticalIcon, LockClosedIcon, LockOpenIcon, PencilIcon, PlusIcon, Squares2X2Icon, ViewColumnsIcon, ArrowDownTrayIcon, ArrowsPointingOutIcon, XCircleIcon, CheckCircleIcon } from "@heroicons/react/24/outline"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QueryEditor } from "@/components/query-editor"
import { QueryResults } from "@/components/query-results"
import { ScratchPad } from "@/components/scratch-pad"
import { VirtualTable, SimpleTable } from "@/components/virtual-table"
import { EditTableDialog } from "@/components/edit-table-dialog"
import { DeleteTableDialog } from "@/components/delete-table-dialog"
import { SaveQueryDialog } from "@/components/save-query-dialog"
import { LoadQueryDialog } from "@/components/load-query-dialog"
import { QueryHistoryDialog } from "@/components/query-history-dialog"
import { QueryTemplatesDialog } from "@/components/query-templates-dialog"
import { ConnectionStatsDialog } from "@/components/connection-stats-dialog"
import { SaveTableDialog } from "@/components/save-table-dialog"
import { useServerStorage } from "@/hooks/use-server-storage"
import { useToast } from "@/hooks/use-toast"
import { useQueryTabs } from "@/hooks/use-query-tabs"
import { useQueryHistory } from "@/hooks/use-query-history"
import { useKeyboardShortcuts, isMacOS, type KeyboardShortcut } from "@/hooks/use-keyboard-shortcuts"
import type { QueryResult, QueryExecution } from "@/types/query"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"

export function QueryTool() {
  const { servers, isLoading, updateServer } = useServerStorage()
  const { toast } = useToast()
  const connectedServers = servers.filter((server) => server.connected)
  const { getActiveTab, updateTab } = useQueryTabs()
  const { addToHistory } = useQueryHistory()

  const [selectedServerId, setSelectedServerId] = useState<string>("")
  
  // Auto-select server from localStorage, favorite server, or first connected server
  useEffect(() => {
    // Check if there's a server ID stored in localStorage (from server management)
    const storedServerId = localStorage.getItem("postgres-manager-selected-server")
    
    if (storedServerId && connectedServers.find(s => s.id === storedServerId)) {
      console.log("Setting server from localStorage:", storedServerId)
      setSelectedServerId(storedServerId)
      // Clear the stored server ID after using it
      localStorage.removeItem("postgres-manager-selected-server")
    } else if (!selectedServerId && connectedServers.length > 0) {
      // First try to find a favorite server
      const favoriteServer = connectedServers.find(s => s.favorite)
      if (favoriteServer) {
        console.log("Auto-selecting favorite server:", favoriteServer.name)
        setSelectedServerId(favoriteServer.id)
      } else if (connectedServers.length === 1) {
        console.log("Auto-selecting first connected server:", connectedServers[0].name)
        setSelectedServerId(connectedServers[0].id)
      }
    }
  }, [connectedServers, selectedServerId])
  const [selectedDatabase, setSelectedDatabase] = useState<string>("")
  const [queryResults, setQueryResults] = useState<Record<string, QueryResult[]>>({})
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionController, setExecutionController] = useState<AbortController | null>(null)

  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false)
  const [showConnectionStats, setShowConnectionStats] = useState(false)
  const [hasTextSelection, setHasTextSelection] = useState(false)
  const [sessionLocked, setSessionLocked] = useState(() => {
    // Check if session was locked on page load
    return localStorage.getItem("postgres-manager-session-locked") === "true"
  })
  const [currentTableName, setCurrentTableName] = useState<string>("")
  const [showSaveTableDialog, setShowSaveTableDialog] = useState(false)
  const [showEditTableDialog, setShowEditTableDialog] = useState(false)
  const [showDeleteTableDialog, setShowDeleteTableDialog] = useState(false)
  const [showAddRowDialog, setShowAddRowDialog] = useState(false)
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false)
  const [addRowValues, setAddRowValues] = useState<Record<string, string>>({})
  const [addColumnForm, setAddColumnForm] = useState<{ name: string; type: string; length?: number; notNull: boolean; defaultValue?: string }>({ name: "", type: "varchar", length: undefined, notNull: false, defaultValue: undefined })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentEditorContent, setCurrentEditorContent] = useState<string>("")
  const [layoutMode, setLayoutMode] = useState<"default" | "alt">(() => {
    try {
      const saved = localStorage.getItem("postgres-manager-layout-mode") as "default" | "alt" | null
      return saved ?? "alt"
    } catch {
      return "alt"
    }
  })
  const [expandedResult, setExpandedResult] = useState<{open: boolean, result: QueryResult | null, index: number}>({open: false, result: null, index: 0})
  const [showShortcutHint, setShowShortcutHint] = useState(false)
  
  // Force side-by-side (alt) as default while toggle is hidden
  useEffect(() => {
    if (layoutMode !== "alt") {
      setLayoutMode("alt")
      try { localStorage.setItem("postgres-manager-layout-mode", "alt") } catch {}
    }
  }, [])
  
  // Cleanup legacy autosave ids that caused cross-layout interference
  useEffect(() => {
    try {
      const legacyIds = [
        "query-tool-editor-results-split",
        "query-tool-editor-scratch-split",
        "query-tool-alt-root-split-v2",
        "query-tool-alt-left-vertical-v2",
      ]
      legacyIds.forEach((id) => {
        localStorage.removeItem(`react-resizable-panels:layout:${id}`)
        localStorage.removeItem(`react-resizable-panels:collapsed:${id}`)
      })
    } catch {}
  }, [])

  useEffect(() => {
    let timeoutId: number | undefined
    try {
      const key = "postgres-manager-query-tool-visits"
      const raw = localStorage.getItem(key)
      const visits = raw ? parseInt(raw, 10) || 0 : 0
      const next = visits + 1
      localStorage.setItem(key, String(next))
      if (visits < 3) {
        setShowShortcutHint(true)
        timeoutId = window.setTimeout(() => setShowShortcutHint(false), 6000)
      }
    } catch {}
    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [])

  // Rely on PanelGroup autoSaveId for persistence per layout

  const selectedServer = connectedServers.find((server) => server.id === selectedServerId)
  const activeTab = getActiveTab()

  // Get current tab's results
  const currentTabResults: QueryResult[] = activeTab ? queryResults[activeTab.id] || [] : []

  // Clear results when switching tabs
  useEffect(() => {
    if (activeTab && !queryResults[activeTab.id]) {
      setQueryResults(prev => ({
        ...prev,
        [activeTab.id]: []
      }))
    }
  }, [activeTab?.id, queryResults])

  // Set database when server changes
  useEffect(() => {
    if (selectedServer) {
      setSelectedDatabase(selectedServer.database)
    } else {
      setSelectedDatabase("")
    }
  }, [selectedServer])

  const executeQuery = async (queryText?: string, isRetry = false) => {
    if (!selectedServer) {
      toast({
        title: "⚠️ No Server Selected",
        description: "Please select a server from the dropdown above to execute queries.",
        variant: "destructive",
      })
      return
    }

    if (!selectedServer.database) {
      toast({
        title: "No Database Configured",
        description: "The selected server doesn't have a database configured.",
        variant: "destructive",
      })
      return
    }

    if (!activeTab) {
      toast({
        title: "No Query Tab",
        description: "Please create a query tab first.",
        variant: "destructive",
      })
      return
    }

    const query = (queryText ?? currentEditorContent ?? activeTab.content ?? "") as string
    if (!query.trim()) {
      toast({
        title: "Empty Query",
        description: "Please enter a SQL query to execute.",
        variant: "destructive",
      })
      return
    }

    setIsExecuting(true)
    // Clear results for current tab only
    setQueryResults(prev => ({
      ...prev,
      [activeTab.id]: []
    }))

    const controller = new AbortController()
    setExecutionController(controller)

    try {
      const startTime = Date.now()
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: selectedServer.host,
          port: selectedServer.port,
          user: selectedServer.username,
          password: selectedServer.password,
          database: selectedServer.database,
          sql: query,
          sslMode: selectedServer.sslMode,
        }),
        signal: controller.signal,
      })
      const data = await res.json();
      
      // Check for errors in the response (even with 200 status)
      if (data.error) {
        if (typeof data.error === 'object') {
          const dbError = data.error;
          throw new Error(`${dbError.message}${dbError.code ? ` (Code: ${dbError.code})` : ''}`);
        } else {
          throw new Error(data.error);
        }
      }
      
      if (!res.ok) {
        // Handle HTTP errors
        if (data.error && typeof data.error === 'object') {
          const dbError = data.error;
          throw new Error(`${dbError.message}${dbError.code ? ` (Code: ${dbError.code})` : ''}`);
        }
        throw new Error(data.error || 'Query failed');
      }
      let results: QueryResult[] = []
      
      // Handle new API response format
      if (data.multipleResults) {
        // Multiple statements response
        results = data.results.map((result: any) => ({
          type: result.command === 'SELECT' ? 'select' : result.command ? result.command.toLowerCase() : 'success',
          columns: result.fields ? result.fields.map((f: any) => f.name) : [],
          rows: result.rows || [],
          rowCount: result.rowCount || 0,
          affectedRows: result.rowCount || 0,
          executionTime: result.executionTime || 0,
          query: result.statement || query,
          fromCache: result.fromCache || false,
          cacheHits: result.cacheHits,
        }))
      } else {
        // Single statement response
        results = [
          {
            type: data.command === 'SELECT' ? 'select' : data.command ? data.command.toLowerCase() : 'success',
            columns: data.fields ? data.fields.map((f: any) => f.name) : [],
            rows: data.rows || [],
            rowCount: data.rowCount || 0,
            affectedRows: data.rowCount || 0,
            executionTime: data.executionTime || (Date.now() - startTime),
            query,
            fromCache: data.fromCache || false,
            cacheHits: data.cacheHits,
          },
        ]
      }

      // Store results for current tab only
      setQueryResults(prev => ({
        ...prev,
        [activeTab.id]: results
      }))

      // Add to history
      const totalExecutionTime = data.totalExecutionTime || results.reduce((sum, r) => sum + r.executionTime, 0)
      const execution: QueryExecution = {
        id: crypto.randomUUID(),
        query,
        results,
        executionTime: totalExecutionTime,
        timestamp: new Date(),
        serverId: selectedServerId,
        database: selectedServer.database,
      }
      addToHistory(execution)
    } catch (error) {
      // SSL-related error check
      if (error instanceof Error && error.message.includes("no pg_hba.conf entry") && !isRetry) {
        toast({
          title: "SSL Required",
          description: "The server may require an SSL connection. Automatically retrying with SSL enabled.",
        })
        
        // Update server settings to use SSL
        const updatedServer = { ...selectedServer, sslMode: "require" as const };
        updateServer(selectedServer.id, updatedServer);
        
        // Retry query with SSL
        executeQuery(query, true);
        return; // Exit to avoid double error handling
      }

      if (error instanceof Error && error.message === "Query cancelled") {
        setQueryResults(prev => ({
          ...prev,
          [activeTab.id]: [
          {
            type: "error",
            error: "Query execution was cancelled",
            executionTime: 0,
            query,
          },
          ]
        }))
      } else {
        // Format database errors to be more user-friendly
        let errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
        
        // Common database error patterns
        if (errorMessage.includes("column") && errorMessage.includes("does not exist")) {
          errorMessage = `Column not found: ${errorMessage.split('"')[1] || 'unknown column'}`
        } else if (errorMessage.includes("relation") && errorMessage.includes("does not exist")) {
          errorMessage = `Table not found: ${errorMessage.split('"')[1] || 'unknown table'}`
        } else if (errorMessage.includes("syntax error")) {
          errorMessage = `SQL Syntax Error: ${errorMessage}`
        }

        setQueryResults(prev => ({
          ...prev,
          [activeTab.id]: [
          {
            type: "error",
            error: errorMessage,
            executionTime: 0,
            query,
          },
          ]
        }))
      }
    } finally {
        setIsExecuting(false)
        setExecutionController(null)
    }
  }

  const cancelQuery = () => {
    if (executionController) {
      executionController.abort()
    }
  }

  const checkTextSelection = () => {
    const selection = window.getSelection()?.toString()
    setHasTextSelection(!!selection?.trim())
  }

  const executeSelectedText = () => {
    const selection = window.getSelection()?.toString()
    if (selection?.trim()) {
      executeQuery(selection)
    } else {
      executeQuery()
    }
  }

  const shortcuts: KeyboardShortcut[] = [
    { id: "run-query", keys: isMacOS ? ["meta", "Enter"] : ["ctrl", "Enter"], label: isMacOS ? "⌘ + Enter" : "Ctrl + Enter", handler: () => executeQuery() },
  ]
  useKeyboardShortcuts(shortcuts)

  

  const toggleSessionLock = () => {
    const newLockedState = !sessionLocked
    setSessionLocked(newLockedState)
    
    if (newLockedState) {
      localStorage.setItem("postgres-manager-session-locked", "true")
    } else {
      localStorage.removeItem("postgres-manager-session-locked")
    }
  }

  const toggleLayoutMode = () => {
    setLayoutMode(prev => {
      const next = prev === "default" ? "alt" : "default"
      try {
        localStorage.setItem("postgres-manager-layout-mode", next)
      } catch {}
      return next
    })
  }

  // Extract table name from current query
  const extractTableNameFromQuery = (query: string): string => {
    const normalized = query.trim()
    // Handle quoted identifiers and schema-qualified names. Capture the identifier following FROM/INTO/UPDATE/DELETE FROM
    const patterns = [
      /from\s+((?:"[^"]+"|[a-zA-Z_][\w$]*)(?:\.(?:"[^"]+"|[a-zA-Z_][\w$]*))?)/i,
      /insert\s+into\s+((?:"[^"]+"|[a-zA-Z_][\w$]*)(?:\.(?:"[^"]+"|[a-zA-Z_][\w$]*))?)/i,
      /update\s+((?:"[^"]+"|[a-zA-Z_][\w$]*)(?:\.(?:"[^"]+"|[a-zA-Z_][\w$]*))?)/i,
      /delete\s+from\s+((?:"[^"]+"|[a-zA-Z_][\w$]*)(?:\.(?:"[^"]+"|[a-zA-Z_][\w$]*))?)/i,
    ]
    for (const regex of patterns) {
      const match = normalized.match(regex)
      if (match) {
        // If schema-qualified, take the last part
        const ident = match[1]
        const last = ident.split('.').pop() || ident
        return last.replace(/^"|"$/g, '')
      }
    }
    return ""
  }

  // Handle save table operation
  const handleSaveTable = () => {
    // Use currentEditorContent which is kept in sync with the editor via onContentChange
    const queryContent = currentEditorContent || activeTab?.content || ""
    
    if (!queryContent.trim()) {
      toast({
        title: "No Active Query",
        description: "Please write a query first to save table data.",
        variant: "destructive",
      })
      return
    }

    const tableName = extractTableNameFromQuery(queryContent)
    if (!tableName) {
      toast({
        title: "No Table Identified",
        description: "Could not identify table name from the current query.",
        variant: "destructive",
      })
      return
    }

    setCurrentTableName(tableName)
    setShowSaveTableDialog(true)
  }

  // Handle edit table operation
  const handleEditTable = () => {
    // Use currentEditorContent which is kept in sync with the editor via onContentChange
    const queryContent = currentEditorContent || activeTab?.content || ""
    
    if (!queryContent.trim()) {
      toast({
        title: "No Active Query",
        description: "Please write a query first to edit table data.",
        variant: "destructive",
      })
      return
    }

    const tableName = extractTableNameFromQuery(queryContent)
    
    if (!tableName) {
      toast({
        title: "No Table Identified",
        description: "Could not identify table name from the current query.",
        variant: "destructive",
      })
      return
    }

    setCurrentTableName(tableName)
    setShowEditTableDialog(true)
  }

  // Handle delete table operation
  const handleDeleteTable = () => {
    // Use currentEditorContent which is kept in sync with the editor via onContentChange
    const queryContent = currentEditorContent || activeTab?.content || ""
    
    if (!queryContent.trim()) {
      toast({
        title: "No Active Query",
        description: "Please write a query first to delete table data.",
        variant: "destructive",
      })
      return
    }

    const tableName = extractTableNameFromQuery(queryContent)
    if (!tableName) {
      toast({
        title: "No Table Identified",
        description: "Could not identify table name from the current query.",
        variant: "destructive",
      })
      return
    }

    setCurrentTableName(tableName)
    setShowDeleteTableDialog(true)
  }

  // Handle add row operation
  const handleAddRow = () => {
    const queryContent = currentEditorContent || activeTab?.content || ""
    
    if (!queryContent.trim()) {
      toast({
        title: "No Active Query",
        description: "Please write a query first to add rows.",
        variant: "destructive",
      })
      return
    }

    const tableName = extractTableNameFromQuery(queryContent)
    if (!tableName) {
      toast({
        title: "No Table Identified",
        description: "Could not identify table name from the current query.",
        variant: "destructive",
      })
      return
    }

    // Initialize row values from current result columns
    if (currentTabResults.length > 0 && currentTabResults[0]?.columns) {
      const init: Record<string, string> = {}
      currentTabResults[0].columns.forEach((col) => (init[col] = ""))
      setAddRowValues(init)
    }

    setCurrentTableName(tableName)
    setShowAddRowDialog(true)
  }

  // Handle add column operation
  const handleAddColumn = () => {
    const queryContent = currentEditorContent || activeTab?.content || ""
    
    if (!queryContent.trim()) {
      toast({
        title: "No Active Query",
        description: "Please write a query first to add columns.",
        variant: "destructive",
      })
      return
    }

    const tableName = extractTableNameFromQuery(queryContent)
    if (!tableName) {
      toast({
        title: "No Table Identified",
        description: "Could not identify table name from the current query.",
        variant: "destructive",
      })
      return
    }

    setAddColumnForm({ name: "", type: "varchar", length: undefined, notNull: false, defaultValue: undefined })
    setCurrentTableName(tableName)
    setShowAddColumnDialog(true)
  }

  // Submit add row
  const submitAddRow = async () => {
    if (!selectedServer || !currentTableName) return
    
    const columns = Object.keys(addRowValues)
    const values = columns.map((col) => {
      const value = addRowValues[col]
      if (value === null || value === undefined || value === "") return "NULL"
      if (!isNaN(Number(value)) && value.trim() !== "") return String(Number(value))
      const escaped = String(value).replace(/'/g, "''")
      return `'${escaped}'`
    })
    
    const quotedTable = currentTableName.includes('"') ? currentTableName : currentTableName.split('.').map(p => `"${p}"`).join('.')
    const sql = `INSERT INTO ${quotedTable} (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${values.join(", ")})`
    
    try {
      setIsSubmitting(true)
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
      
      toast({
        title: "Row Added",
        description: `Successfully added row to ${currentTableName}.`,
      })
      setShowAddRowDialog(false)
      // Re-run query to refresh results
      executeQuery()
    } catch (error) {
      toast({
        title: "Insert Failed",
        description: error instanceof Error ? error.message : "Failed to add row.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit add column
  const submitAddColumn = async () => {
    if (!selectedServer || !currentTableName || !addColumnForm.name.trim()) return
    
    const typeWithLen = addColumnForm.length ? `${addColumnForm.type}(${addColumnForm.length})` : addColumnForm.type
    const quotedTable = currentTableName.includes('"') ? currentTableName : currentTableName.split('.').map(p => `"${p}"`).join('.')
    
    let sql = `ALTER TABLE ${quotedTable} ADD COLUMN "${addColumnForm.name}" ${typeWithLen}`
    if (addColumnForm.notNull) sql += ' NOT NULL'
    if (addColumnForm.defaultValue && addColumnForm.defaultValue.trim() !== '') {
      const defVal = addColumnForm.defaultValue
      const escaped = defVal === "NULL" ? "NULL" : (isNaN(Number(defVal)) ? `'${defVal.replace(/'/g, "''")}'` : defVal)
      sql += ` DEFAULT ${escaped}`
    }
    
    try {
      setIsSubmitting(true)
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
      
      toast({
        title: "Column Added",
        description: `Successfully added column "${addColumnForm.name}" to ${currentTableName}.`,
      })
      setShowAddColumnDialog(false)
      // Re-run query to refresh results
      executeQuery()
    } catch (error) {
      toast({
        title: "Add Column Failed",
        description: error instanceof Error ? error.message : "Failed to add column.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper functions for expanded view
  const getResultIcon = (type: string) => {
    switch (type) {
      case "select": return <CircleStackIcon className="h-4 w-4" />
      case "error": return <XCircleIcon className="h-4 w-4 text-red-600" />
      default: return <CheckCircleIcon className="h-4 w-4 text-green-600" />
    }
  }

  const getResultMessage = (result: QueryResult) => {
    if (result.type === "select") {
      return `${result.rowCount} rows, ${result.columns?.length || 0} columns`
    } else if (result.type === "error") {
      return "Query Error"
    } else {
      return `Query executed successfully${result.fromCache ? " (from cache)" : ""}`
    }
  }

  const getFilteredData = (index: number) => {
    const result = currentTabResults[index]
    if (!result || result.type !== "select") return []
    return result.rows || []
  }



  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <div className="flex items-center gap-2"> 
          <div className="flex items-center gap-2">
            {sessionLocked && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                <LockClosedIcon className="h-3 w-3 text-blue-600" />
                <span className="text-xs text-blue-600 font-medium">Session Locked</span>
              </div>
            )}


            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    onClick={() => {
                      console.log("Execute button clicked")
                      console.log("Selected server:", selectedServer?.name)
                      console.log("Active tab:", activeTab?.name)
                      console.log("Connected servers:", connectedServers.length)
                      executeQuery()
                    }} 
                    disabled={connectedServers.length === 0 || !selectedServer} 
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <PlayIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Execute Query</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    disabled={!isExecuting}
                    onClick={() => {
                      // TODO: Implement pause functionality
                      toast({
                        title: "Pause Not Implemented",
                        description: "Pause functionality is not yet implemented.",
                        variant: "default",
                      })
                    }}
                  >
                    <PauseIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Pause Query</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    disabled={!isExecuting}
                    onClick={() => {
                      console.log("Stop button clicked")
                      console.log("Is executing:", isExecuting)
                      console.log("Execution controller:", !!executionController)
                      cancelQuery()
                    }}
                  >
                    <StopIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Stop Query</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="outline" onClick={executeSelectedText} disabled={!hasTextSelection || connectedServers.length === 0 || !selectedServer}>
                    <BoltIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Execute Selection</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>


            
            <Separator orientation="vertical" className="h-6" />
            
            {connectedServers.length > 0 && (
              <Select value={selectedServerId} onValueChange={(value) => {
                console.log("Server selection changed to:", value)
                setSelectedServerId(value)
              }}>
                <SelectTrigger className="w-48">
                  <div className="flex items-center gap-2">
                    <CircleStackIcon className="h-4 w-4" />
                    <SelectValue placeholder="Select server" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {connectedServers.map((server) => (
                    <SelectItem key={server.id} value={server.id} className="text-ellipsis overflow-hidden whitespace-nowrap">
                      {server.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <TooltipProvider delayDuration={0}>
              <Tooltip open={showShortcutHint} onOpenChange={setShowShortcutHint}>
                <TooltipTrigger asChild>
                  <motion.span
                    className="flex items-center justify-center h-7 w-7 rounded bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted cursor-default select-none font-mono text-sm border"
                    animate={showShortcutHint ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }}
                    transition={showShortcutHint ? { duration: 0.5, ease: "easeInOut" } : { duration: 0.2 }}
                  >
                    <svg
                      viewBox="0 0 32 32"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path
                        d="M9 13h-.007m0 0A4 4 0 1113 9v14a4 4 0 11-4-4h14a4 4 0 11-4 4V9a4 4 0 114 4H8.993z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </motion.span>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="max-w-xs">
                  <p className="flex flex-row justify-between items-center gap-2 text-xs font-semibold mb-2">
                    <span>Shortcuts</span>
                    <span className="inline-flex items-center rounded-full border border-primary/60 bg-primary/10 px-1.5 py-0.3 text-[10px] font-medium text-primary shadow-sm">
                      New
                    </span>
                  </p>
                  {shortcuts.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-4 text-xs py-0.5">
                      <span className="text-muted-foreground">Run Query</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">{s.label}</kbd>
                    </div>
                  ))}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Refresh button (first) */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    if (currentTabResults.length > 0 && currentTabResults[0]?.type === "select") {
                      executeQuery()
                    }
                  }}
                  disabled={!(currentTabResults.length > 0 && currentTabResults[0]?.type === "select")}
                  className={!(currentTabResults.length > 0 && currentTabResults[0]?.type === "select") ? "opacity-50" : ""}
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{currentTabResults.length > 0 && currentTabResults[0]?.type === "select" ? "Refresh Query" : "Query first to refresh"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Expand button (second) */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    if (currentTabResults.length > 0 && currentTabResults[0]?.type === "select") {
                      setExpandedResult({open: true, result: currentTabResults[0], index: 0})
                    }
                  }}
                  disabled={!(currentTabResults.length > 0 && currentTabResults[0]?.type === "select")}
                  className={currentTabResults.length > 0 && currentTabResults[0]?.type === "select" ? "" : "opacity-50"}
                >
                  <ArrowsPointingOutIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{currentTabResults.length > 0 && currentTabResults[0]?.type === "select" ? "Expand to popup" : "Query first to expand"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-6" />

          {/* Add Row / Column dropdown */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      disabled={!(currentTabResults.length > 0 && currentTabResults[0]?.type === "select")}
                      className={currentTabResults.length > 0 && currentTabResults[0]?.type === "select" ? "" : "opacity-50"}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem 
                      onClick={handleAddRow}
                      disabled={!(currentTabResults.length > 0 && currentTabResults[0]?.type === "select")}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Row
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleAddColumn}
                      disabled={!(currentTabResults.length > 0 && currentTabResults[0]?.type === "select")}
                    >
                      <ViewColumnsIcon className="h-4 w-4 mr-2" />
                      Add Column
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent>
                <p>{currentTabResults.length > 0 && currentTabResults[0]?.type === "select" ? "Add Row/Column" : "Query first to add rows or columns"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={currentTabResults.length > 0 && currentTabResults[0]?.type === "select" ? handleEditTable : undefined}
                  disabled={!(currentTabResults.length > 0 && currentTabResults[0]?.type === "select")}
                  className={currentTabResults.length > 0 && currentTabResults[0]?.type === "select" ? "text-blue-600 border-blue-600/40 hover:text-blue-700 hover:border-blue-700/50" : "opacity-50"}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{currentTabResults.length > 0 && currentTabResults[0]?.type === "select" ? "Edit Table" : "Query first to edit table"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={currentTabResults.length > 0 && currentTabResults[0]?.type === "select" ? handleDeleteTable : undefined}
                  disabled={!(currentTabResults.length > 0 && currentTabResults[0]?.type === "select")}
                  className={currentTabResults.length > 0 && currentTabResults[0]?.type === "select" ? "text-red-600 border-red-600/40 hover:text-red-700 hover:border-red-700/50" : "opacity-50"}
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{currentTabResults.length > 0 && currentTabResults[0]?.type === "select" ? "Danger: Bulk Delete" : "Query first to delete table data"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={currentTabResults.length > 0 && currentTabResults[0]?.type === "select" ? handleSaveTable : undefined}
                  disabled={!(currentTabResults.length > 0 && currentTabResults[0]?.type === "select")}
                  className={currentTabResults.length > 0 && currentTabResults[0]?.type === "select" ? "" : "opacity-50"}
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{currentTabResults.length > 0 && currentTabResults[0]?.type === "select" ? "Download Table" : "Query first to download table"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="outline" onClick={() => setShowLoadDialog(true)}>
            <FolderOpenIcon className="h-4 w-4 mr-1" />
            Load
          </Button>
          
          <Button variant="outline" onClick={() => setShowSaveDialog(true)}>
            <BookmarkIcon className="h-4 w-4 mr-1" />
            Save
          </Button>

          {/**
           * Layout toggle hidden temporarily; keeping for future use
           * <TooltipProvider>
           *   <Tooltip>
           *     <TooltipTrigger asChild>
           *       <Button variant="outline" size="icon" onClick={toggleLayoutMode} title="Toggle layout">
           *         <LayoutGrid className="h-4 w-4" />
           *       </Button>
           *     </TooltipTrigger>
           *     <TooltipContent>
           *       <p>{layoutMode === "alt" ? "Switch to Stacked Layout" : "Switch to Side-by-Side Layout"}</p>
           *     </TooltipContent>
           *   </Tooltip>
           * </TooltipProvider>
           */}
          

        </div>
      </header>

      <div className="flex flex-col overflow-hidden min-h-0 h-[calc(100svh-3.5rem)] relative">
        {isLoading ? (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-[5] flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span className="text-sm text-muted-foreground">Loading servers...</span>
            </div>
          </div>
        ) : connectedServers.length === 0 ? (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-[5] flex items-center justify-center">
            <div className="text-center">
              <CircleStackIcon className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
              <h2 className="text-xl font-semibold mb-2">No Connected Database</h2>
              <p className="text-muted-foreground mb-4 max-w-sm">
                Connect to a PostgreSQL database from the Database section to start writing and executing queries.
              </p>
            </div>
          </div>
        ) : null}
        
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          {connectedServers.length > 0 && !selectedServer && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200 dark:border-yellow-800 p-3">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <CircleStackIcon className="h-4 w-4" />
                <span className="text-sm font-medium">No server selected</span>
                <span className="text-xs text-yellow-600 dark:text-yellow-400">
                  Select a server from the dropdown above to execute queries
                </span>
              </div>
            </div>
          )}
          {layoutMode === "default" ? (
            <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0 overflow-hidden" autoSaveId="query-tool-default-vertical">
              <ResizablePanel defaultSize={50} minSize={20} className="min-h-0">
                <div className="h-full min-h-0">
                  <ResizablePanelGroup direction="horizontal" className="h-full min-h-0 overflow-hidden" autoSaveId="query-tool-default-editor-scratch">
                    <ResizablePanel defaultSize={70} minSize={40} className="min-w-0">
                      <div className="h-full min-h-0">
                        <QueryEditor 
                          onSelectionChange={checkTextSelection}
                          onContentChange={setCurrentEditorContent}
                        />
                      </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={30} minSize={15} className="min-w-[220px] border-l">
                      <ScratchPad />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50} minSize={20} className="min-h-0">
                <div className="h-full border-t min-h-0 overflow-hidden">
                  <QueryResults 
                    results={currentTabResults} 
                    isExecuting={isExecuting} 
                    onRefresh={() => executeQuery()}
                    onSaveTable={handleSaveTable}
                    onEditTable={handleEditTable}
                    onDeleteTable={handleDeleteTable}
                    selectedServer={selectedServer}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0 overflow-hidden" autoSaveId="query-tool-alt-root-split">
              <ResizablePanel defaultSize={35} minSize={20} className="min-h-0 min-w-0">
                <div className="h-full min-h-0">
                  <ResizablePanelGroup direction="vertical" className="h-full min-h-0 overflow-hidden" autoSaveId="query-tool-alt-left-vertical">
                    <ResizablePanel defaultSize={65} minSize={20} className="min-h-0">
                      <div className="h-full min-h-0">
                        <QueryEditor 
                          onSelectionChange={checkTextSelection}
                          onContentChange={setCurrentEditorContent}
                        />
                      </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={35} minSize={15} className="min-h-0 border-t">
                      <ScratchPad />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={65} minSize={35} className="min-h-0 min-w-0">
                <div className="h-full min-h-0 border-l overflow-hidden">
                  <QueryResults 
                    results={currentTabResults} 
                    isExecuting={isExecuting} 
                    onRefresh={() => executeQuery()}
                    onSaveTable={handleSaveTable}
                    onEditTable={handleEditTable}
                    onDeleteTable={handleDeleteTable}
                    selectedServer={selectedServer}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </div>
      </div>

      <SaveQueryDialog open={showSaveDialog} onOpenChange={setShowSaveDialog} />
      <LoadQueryDialog open={showLoadDialog} onOpenChange={setShowLoadDialog} />
      <QueryHistoryDialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog} />
      <QueryTemplatesDialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog} />
      <ConnectionStatsDialog open={showConnectionStats} onOpenChange={setShowConnectionStats} />
      
      <SaveTableDialog 
        open={showSaveTableDialog} 
        onOpenChange={setShowSaveTableDialog}
        tableName={currentTableName}
        results={currentTabResults}
      />

      <EditTableDialog 
        open={showEditTableDialog}
        onOpenChange={setShowEditTableDialog}
        tableName={currentTableName}
        results={currentTabResults}
        selectedServer={selectedServer}
      />

      <DeleteTableDialog 
        open={showDeleteTableDialog}
        onOpenChange={setShowDeleteTableDialog}
        tableName={currentTableName}
        results={currentTabResults}
        selectedServer={selectedServer}
      />

      {/* Add Row Dialog */}
      <Dialog open={showAddRowDialog} onOpenChange={setShowAddRowDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Row</DialogTitle>
            <DialogDescription>Insert a new row into {currentTableName}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {Object.keys(addRowValues).length === 0 ? (
              <div className="text-sm text-muted-foreground">No columns found. Run a SELECT query first.</div>
            ) : (
              Object.keys(addRowValues).map((col) => (
                <div key={col} className="grid gap-1">
                  <label className="text-sm font-medium">{col}</label>
                  <input
                    type="text"
                    value={addRowValues[col] ?? ''}
                    onChange={(e) => setAddRowValues((prev) => ({ ...prev, [col]: e.target.value }))}
                    placeholder="Leave blank for NULL"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRowDialog(false)}>Cancel</Button>
            <Button onClick={submitAddRow} disabled={isSubmitting || !selectedServer || Object.keys(addRowValues).length === 0}>
              <PlusIcon className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Adding…' : 'Add Row'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Column Dialog */}
      <Dialog open={showAddColumnDialog} onOpenChange={setShowAddColumnDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add Column</DialogTitle>
            <DialogDescription>Add a new column to {currentTableName}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Column Name</label>
              <input
                type="text"
                value={addColumnForm.name}
                onChange={(e) => setAddColumnForm((p) => ({ ...p, name: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Data Type</label>
                <Select value={addColumnForm.type} onValueChange={(v) => setAddColumnForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['integer','bigint','numeric','varchar','text','boolean','timestamp','date','uuid','json','jsonb'].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Length (optional)</label>
                <input
                  type="number"
                  value={addColumnForm.length ?? ''}
                  onChange={(e) => setAddColumnForm((p) => ({ ...p, length: e.target.value ? Number(e.target.value) : undefined }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Default (optional)</label>
              <input
                type="text"
                placeholder="e.g. 0, 'text', TRUE"
                value={addColumnForm.defaultValue ?? ''}
                onChange={(e) => setAddColumnForm((p) => ({ ...p, defaultValue: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="notnull-query"
                checked={addColumnForm.notNull}
                onChange={(e) => setAddColumnForm((p) => ({ ...p, notNull: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="notnull-query" className="text-sm font-medium">NOT NULL</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddColumnDialog(false)}>Cancel</Button>
            <Button onClick={submitAddColumn} disabled={isSubmitting || !addColumnForm.name.trim() || !selectedServer}>
              <ViewColumnsIcon className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Adding…' : 'Add Column'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  onEditTable={() => handleEditTable && handleEditTable()}
                  onDeleteTable={handleDeleteTable}
                />
              </div>
            )}
            
            {expandedResult.result?.type === "error" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600 text-base">Query Error</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="font-mono text-sm text-red-800 bg-red-50 p-3 rounded border whitespace-pre-wrap break-words overflow-auto max-h-[60vh]">
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
              {expandedResult.result?.type === "select" && handleSaveTable && (
                <Button variant="outline" size="sm" onClick={handleSaveTable}>
                  <ArrowDownTrayIcon className="h-3 w-3 mr-2" />
                  Save as Table
                </Button>
              )}
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
