"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
    if (!activeTab) {
      toast({
        title: "No Active Query",
        description: "Please write a query first to save table data.",
        variant: "destructive",
      })
      return
    }

    const tableName = extractTableNameFromQuery(activeTab.content)
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
    console.log("handleEditTable called")
    console.log("activeTab:", activeTab)
    console.log("activeTab.content:", activeTab?.content)
    
    if (!activeTab) {
      toast({
        title: "No Active Query",
        description: "Please write a query first to edit table data.",
        variant: "destructive",
      })
      return
    }

    const tableName = extractTableNameFromQuery(activeTab.content)
    console.log("extracted table name from activeTab.content:", tableName)
    
    if (!tableName) {
      toast({
        title: "No Table Identified",
        description: "Could not identify table name from the current query.",
        variant: "destructive",
      })
      return
    }

    console.log("Setting currentTableName to:", tableName)
    setCurrentTableName(tableName)
    setShowEditTableDialog(true)
  }

  // Handle delete table operation
  const handleDeleteTable = () => {
    if (!activeTab) {
      toast({
        title: "No Active Query",
        description: "Please write a query first to delete table data.",
        variant: "destructive",
      })
      return
    }

    const tableName = extractTableNameFromQuery(activeTab.content)
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
                      onClick={() => toast({ title: 'Add Row', description: 'Open row dialog from query tool' })}
                      disabled={!(currentTabResults.length > 0 && currentTabResults[0]?.type === "select")}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Row
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => toast({ title: 'Add Column', description: 'Open column dialog from query tool' })}
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
