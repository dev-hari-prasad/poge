"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, RefreshCw, Database, ChevronDown, FolderPlus, Layers, Table2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SchemaObjectsView } from "@/components/schema-objects-view"
import { TableDesigner } from "@/components/table-designer"
import { SchemaComparison } from "@/components/schema-comparison"
import { BackupRestore } from "@/components/backup-restore"
import { CreateDatabaseDialog } from "@/components/create-database-dialog"
import { CreateSchemaDialog } from "@/components/create-schema-dialog"
import { CreateTableDialog } from "@/components/create-table-dialog"
import { CreateViewDialog } from "@/components/create-view-dialog"
import { useServerStorage } from "@/hooks/use-server-storage"
import { DatabaseTree } from "@/components/database-tree"
import type { DatabaseInfo } from "@/types/database"
import type { DatabaseObject } from "@/types/schema"
import { useTableSelection } from "@/hooks/use-table-selection"

export function SchemaManager() {
  const { servers } = useServerStorage()
  const connectedServers = servers.filter((server) => server.connected)

  // Auto-select favorite server or first connected server
  const getInitialServerId = () => {
    try {
      const storedServerId = localStorage.getItem("postgres-manager-selected-server")
      if (storedServerId && connectedServers.find((s) => s.id === storedServerId)) {
        localStorage.removeItem("postgres-manager-selected-server")
        return storedServerId
      }
    } catch {}

    const favoriteServer = connectedServers.find((s) => s.favorite)
    if (favoriteServer) return favoriteServer.id
    return connectedServers[0]?.id || ""
  }

  const [selectedServerId, setSelectedServerId] = useState<string>(getInitialServerId())
  const [selectedDatabase, setSelectedDatabase] = useState<string>("")
  const [activeTab, setActiveTab] = useState("objects")

  // Load schema tree for the selected server (used to build objects for the right pane)
  const [treeData, setTreeData] = useState<DatabaseInfo[] | null>(null)
  const [treeLoading, setTreeLoading] = useState(false)
  const selectedServer = useMemo(
    () => connectedServers.find((server) => server.id === selectedServerId),
    [connectedServers, selectedServerId],
  )

  // Keep selectedServerId valid when connected servers change
  useEffect(() => {
    if (!selectedServerId || !connectedServers.find((s) => s.id === selectedServerId)) {
      const nextId = connectedServers[0]?.id || ""
      if (nextId !== selectedServerId) setSelectedServerId(nextId)
    }
  }, [connectedServers])

  // Sync selection context <-> Schema Manager controls
  const { selectedTable, setSelectedTable } = useTableSelection()
  useEffect(() => {
    if (!selectedTable) return
    if (selectedTable.serverId !== selectedServerId) {
      setSelectedServerId(selectedTable.serverId)
    }
    if (selectedTable.database && selectedTable.database !== selectedDatabase) {
      setSelectedDatabase(selectedTable.database)
    }
  }, [selectedTable])

  useEffect(() => {
    const loadTree = async () => {
      if (!selectedServer) {
        setTreeData(null)
        return
      }
      setTreeLoading(true)
      try {
        const response = await fetch("/api/schema/tree", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            host: selectedServer.host,
            port: selectedServer.port,
            user: selectedServer.username,
            password: selectedServer.password,
            database: selectedServer.database,
            sslMode: selectedServer.sslMode,
          }),
        })
        if (!response.ok) throw new Error("Failed to load schema tree")
        const data: DatabaseInfo[] = await response.json()
        setTreeData(data)
        // Initialize selectedDatabase if not set or not present
        const dbNames = (data || []).map((d) => d.name)
        setSelectedDatabase((prev) => (prev && dbNames.includes(prev) ? prev : dbNames[0] || ""))
      } catch {
        setTreeData(null)
        setSelectedDatabase("")
      } finally {
        setTreeLoading(false)
      }
    }
    loadTree()
  }, [selectedServer])

  // Build objects list for the right pane from treeData
  const objects: DatabaseObject[] = useMemo(() => {
    if (!treeData || !selectedDatabase || !selectedServerId) return []
    const db = treeData.find((d) => d.name === selectedDatabase)
    if (!db) return []

    const out: DatabaseObject[] = []
    for (const schema of db.schemas) {
      out.push({
        id: `${selectedServerId}:${db.name}:${schema.name}:schema`,
        name: schema.name,
        type: "schema",
        parent: `${selectedServerId}:${db.name}`,
        serverId: selectedServerId,
        database: db.name,
      })
      for (const t of schema.tables) {
        const isView = t.type === "view" || t.type === "materialized_view"
        out.push({
          id: `${selectedServerId}:${db.name}:${schema.name}:${t.name}:${t.type}`,
          name: t.name,
          type: isView ? "view" : "table",
          parent: `${selectedServerId}:${db.name}:${schema.name}:schema`,
          serverId: selectedServerId,
          database: db.name,
          schema: schema.name,
          metadata: { rowCount: t.rowCount },
        })
      }
    }
    return out
  }, [treeData, selectedDatabase, selectedServerId])

  const [showCreateDatabase, setShowCreateDatabase] = useState(false)
  const [showCreateSchema, setShowCreateSchema] = useState(false)
  const [showCreateTable, setShowCreateTable] = useState(false)
  const [showCreateView, setShowCreateView] = useState(false)
  const [designerTable, setDesignerTable] = useState<string | undefined>(undefined)

  return (
    <div className="flex flex-col h-full">
      {/* Content area */}
      {connectedServers.length === 0 ? (
        <div className="flex flex-col h-full">
          {/* Always show the topbar even when no servers */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-3">
              <div className="grid w-auto grid-cols-4 gap-1 rounded-lg bg-muted p-1">
                <div className="px-3 py-1.5 text-sm font-medium text-muted-foreground">Schema Objects</div>
                <div className="px-3 py-1.5 text-sm font-medium text-muted-foreground">Table Designer</div>
                <div className="px-3 py-1.5 text-sm font-medium text-muted-foreground">Compare Schemas</div>
                <div className="px-3 py-1.5 text-sm font-medium text-muted-foreground">Backup & Restore</div>
              </div>

              <Separator orientation="vertical" className="h-4" />

              {/* Server Selection */}
              <Select value={selectedServerId} onValueChange={setSelectedServerId} disabled={true}>
                <SelectTrigger className="w-40">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <SelectValue placeholder="No servers" />
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
            </div>

            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={true}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh database tree</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Separator orientation="vertical" className="h-4" />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={true}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled={true}>
                    <Database className="h-4 w-4 mr-2" />
                    Database
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={true}>
                    <Layers className="h-4 w-4 mr-2" />
                    Schema
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={true}>
                    <Table2 className="h-4 w-4 mr-2" />
                    Table
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={true}>
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* No servers message */}
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <Database className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Connected Servers</h2>
            <p className="text-muted-foreground max-w-md">
              Connect a server in the Servers section to manage schemas and objects.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <main className="flex-1 h-full overflow-hidden min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              {/* Topbar within Tabs context */}
              <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
                <div className="flex items-center gap-3">
                  <TabsList className="grid w-auto grid-cols-4">
                    <TabsTrigger value="objects">Schema Objects</TabsTrigger>
                    <TabsTrigger value="designer">Table Designer</TabsTrigger>
                    <TabsTrigger value="compare">Compare Schemas</TabsTrigger>
                    <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
                  </TabsList>

                  <Separator orientation="vertical" className="h-4" />

                  {/* Server Selection */}
                  <Select value={selectedServerId} onValueChange={setSelectedServerId}>
                    <SelectTrigger className="w-44">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
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
                </div>

                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => {
                            // Reload tree and thus objects
                            const s = selectedServer
                            if (!s) return
                            setTreeLoading(true)
                            fetch("/api/schema/tree", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                host: s.host,
                                port: s.port,
                                user: s.username,
                                password: s.password,
                                database: s.database,
                                sslMode: s.sslMode,
                              }),
                            })
                              .then((r) => (r.ok ? r.json() : Promise.reject()))
                              .then((d: DatabaseInfo[]) => {
                                setTreeData(d)
                                const dbNames = (d || []).map((dd) => dd.name)
                                setSelectedDatabase((prev) => (prev && dbNames.includes(prev) ? prev : dbNames[0] || ""))
                              })
                              .catch(() => {})
                              .finally(() => setTreeLoading(false))
                          }}
                          disabled={treeLoading}
                        >
                          <RefreshCw className={`h-4 w-4 ${treeLoading ? "animate-spin" : ""}`} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Refresh database tree</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Separator orientation="vertical" className="h-4" />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        Create
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowCreateDatabase(true)}>
                        <Database className="h-4 w-4 mr-2" />
                        Database
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowCreateSchema(true)}>
                        <Layers className="h-4 w-4 mr-2" />
                        Schema
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowCreateTable(true)}>
                        <Table2 className="h-4 w-4 mr-2" />
                        Table
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowCreateView(true)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <TabsContent value="objects" className="flex-1 m-0">
                <SchemaObjectsView
                  serverId={selectedServerId}
                  database={selectedDatabase}
                  objects={objects}
                  loading={treeLoading}
                  onRefresh={() => {
                    // Trigger the same refresh as the button
                    const s = selectedServer
                    if (!s) return
                    setTreeLoading(true)
                    fetch("/api/schema/tree", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        host: s.host,
                        port: s.port,
                        user: s.username,
                        password: s.password,
                        database: s.database,
                        sslMode: s.sslMode,
                      }),
                    })
                      .then((r) => (r.ok ? r.json() : Promise.reject()))
                      .then((d: DatabaseInfo[]) => {
                        setTreeData(d)
                        const dbNames = (d || []).map((dd) => dd.name)
                        setSelectedDatabase((prev) => (prev && dbNames.includes(prev) ? prev : dbNames[0] || ""))
                      })
                      .catch(() => {})
                      .finally(() => setTreeLoading(false))
                  }}
                  onViewData={(obj) => {
                    if (!selectedServer || !selectedDatabase || !obj.schema) return
                    // Prime selection context for Table Viewer
                    setSelectedTable({
                      serverId: selectedServer.id,
                      serverName: selectedServer.name,
                      database: selectedDatabase,
                      schema: obj.schema,
                      table: obj.name,
                      type: obj.type === "view" ? "view" : "table",
                    })
                  }}
                  onEditStructure={(obj) => {
                    setDesignerTable(obj.name)
                    setActiveTab("designer")
                  }}
                  onEditDefinition={() => {
                    // Could open a dialog/editor
                  }}
                />
              </TabsContent>

              <TabsContent value="designer" className="flex-1 m-0">
                <TableDesigner
                  serverId={selectedServerId}
                  database={selectedDatabase}
                  selectedTableName={designerTable}
                />
              </TabsContent>

              <TabsContent value="compare" className="flex-1 m-0">
                <SchemaComparison
                  servers={connectedServers}
                  selectedServerId={selectedServerId}
                  selectedDatabase={selectedDatabase}
                />
              </TabsContent>

              <TabsContent value="backup" className="flex-1 m-0">
                <BackupRestore serverId={selectedServerId} database={selectedDatabase} />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      )}

      <CreateDatabaseDialog open={showCreateDatabase} onOpenChange={setShowCreateDatabase} serverId={selectedServerId} />
      <CreateSchemaDialog
        open={showCreateSchema}
        onOpenChange={setShowCreateSchema}
        serverId={selectedServerId}
        database={selectedDatabase}
      />
      <CreateTableDialog
        open={showCreateTable}
        onOpenChange={setShowCreateTable}
        serverId={selectedServerId}
        database={selectedDatabase}
      />
      <CreateViewDialog
        open={showCreateView}
        onOpenChange={setShowCreateView}
        serverId={selectedServerId}
        database={selectedDatabase}
      />
    </div>
  )
}
