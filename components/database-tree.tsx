"use client"

import { useState, useEffect } from "react"
import { ChevronRight, ChevronDown, Database, Table, Eye, Layers, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useServerStorage } from "@/hooks/use-server-storage"
import type { ServerConnection } from "@/types/server"
import type { DatabaseInfo, SelectedTable } from "@/types/database"
import { useTableSelection } from "@/hooks/use-table-selection"

interface DatabaseTreeProps {
  servers: ServerConnection[]
}

interface TreeState {
  [serverId: string]: {
    expanded: boolean
    databases?: DatabaseInfo[]
    loading?: boolean
    expandedDatabases: { [dbName: string]: boolean }
    expandedSchemas: { [key: string]: boolean }
  }
}

export function DatabaseTree({ servers }: DatabaseTreeProps) {
  const [treeState, setTreeState] = useState<TreeState>({})
  const { selectedTable, setSelectedTable } = useTableSelection()
  const { servers: storedServers } = useServerStorage()
  const STORAGE_KEY = "postgres-manager-db-tree-state"

  const persistTreeState = (state: TreeState) => {
    try {
      // Only persist expansion state, not loaded data
      const minimal: TreeState = {}
      Object.keys(state).forEach((serverId) => {
        const s = state[serverId]
        if (!s) return
        minimal[serverId] = {
          expanded: !!s.expanded,
          expandedDatabases: s.expandedDatabases || {},
          expandedSchemas: s.expandedSchemas || {},
        } as any
      })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal))
    } catch {}
  }

  useEffect(() => {
    // Merge servers with persisted expansion state
    setTreeState((prev) => {
      let persisted: TreeState = {}
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) persisted = JSON.parse(raw)
      } catch {}

      const next: TreeState = {}
      servers.forEach((server) => {
        const prevState = prev[server.id]
        const saved = persisted[server.id]
        next[server.id] = prevState
          ? prevState
          : saved
            ? { ...saved }
            : {
                expanded: false,
                expandedDatabases: {},
                expandedSchemas: {},
              }
      })
      return next
    })
  }, [servers])

  // Ensure expanded servers are hydrated (databases loaded) on mount/changes
  useEffect(() => {
    const loadIfNeeded = async (serverId: string) => {
      setTreeState((prev) => ({
        ...prev,
        [serverId]: { ...prev[serverId], loading: true },
      }))
      try {
        const server = storedServers.find((s) => s.id === serverId)
        if (!server) throw new Error("Server not found")
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
          }),
        })
        if (!response.ok) throw new Error('Failed to load schema tree')
        const databases = await response.json()
        setTreeState((prev) => {
          const next = {
            ...prev,
            [serverId]: { ...prev[serverId], databases, loading: false },
          }
          persistTreeState(next)
          return next
        })
      } catch (e) {
        setTreeState((prev) => {
          const next = {
            ...prev,
            [serverId]: { ...prev[serverId], loading: false },
          }
          persistTreeState(next)
          return next
        })
      }
    }

    servers.forEach((server) => {
      const state = treeState[server.id]
      if (state?.expanded && !state?.databases && !state?.loading) {
        loadIfNeeded(server.id)
      }
    })
  }, [servers, treeState, storedServers])

  const toggleServer = async (serverId: string) => {
    const currentState = treeState[serverId]
    const newExpanded = !currentState?.expanded

    if (newExpanded && !currentState?.databases) {
      // Load databases
      setTreeState((prev) => ({
        ...prev,
        [serverId]: { ...prev[serverId], loading: true, expanded: true },
      }))

      try {
        const server = storedServers.find(s => s.id === serverId)
        if (!server) throw new Error("Server not found")
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
        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(err?.error || `Failed to fetch schema tree (${response.status})`)
        }
        const databases = await response.json()
        setTreeState((prev) => {
          const next = {
            ...prev,
            [serverId]: { ...prev[serverId], databases, loading: false },
          }
          persistTreeState(next)
          return next
        })
      } catch (error) {
        console.error("Failed to load databases:", error)
        setTreeState((prev) => {
          const next = {
            ...prev,
            [serverId]: { ...prev[serverId], loading: false, expanded: false },
          }
          persistTreeState(next)
          return next
        })
      }
    } else {
      setTreeState((prev) => {
        const next = {
          ...prev,
          [serverId]: { ...prev[serverId], expanded: newExpanded },
        }
        persistTreeState(next)
        return next
      })
    }
  }

  const toggleDatabase = (serverId: string, dbName: string) => {
    setTreeState((prev) => {
      const next = {
        ...prev,
        [serverId]: {
          ...prev[serverId],
          expandedDatabases: {
            ...prev[serverId].expandedDatabases,
            [dbName]: !prev[serverId].expandedDatabases[dbName],
          },
        },
      }
      persistTreeState(next)
      return next
    })
  }

  const toggleSchema = (serverId: string, dbName: string, schemaName: string) => {
    const key = `${dbName}.${schemaName}`
    setTreeState((prev) => {
      const next = {
        ...prev,
        [serverId]: {
          ...prev[serverId],
          expandedSchemas: {
            ...prev[serverId].expandedSchemas,
            [key]: !prev[serverId].expandedSchemas[key],
          },
        },
      }
      persistTreeState(next)
      return next
    })
  }

  const selectTable = (
    serverId: string,
    serverName: string,
    database: string,
    schema: string,
    table: string,
    type: "table" | "view" | "materialized_view",
  ) => {
    const selection: SelectedTable = {
      serverId,
      serverName,
      database,
      schema,
      table,
      type,
    }
    setSelectedTable(selection)
  }

  const getTableIcon = (type: "table" | "view" | "materialized_view") => {
    switch (type) {
      case "view":
        return <Eye className="h-3 w-3 text-blue-600 dark:text-blue-400" />
      case "materialized_view":
        return <Layers className="h-3 w-3 text-purple-600 dark:text-purple-400" />
      default:
        return <Table className="h-3 w-3 text-green-600 dark:text-green-400" />
    }
  }

  return (
    <div className="space-y-1">
      {servers.map((server) => {
        const serverState = treeState[server.id]
        const isExpanded = serverState?.expanded || false
        const isLoading = serverState?.loading || false

        return (
          <div key={server.id} className="space-y-1">
             <Button
               variant="ghost"
               size="sm"
               className="w-full justify-start h-8 px-2"
               onClick={() => toggleServer(server.id)}
             >
              {isLoading ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <>{isExpanded ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}</>
              )}
              <Database className="h-3 w-3 mr-2 text-green-600" />
               <span className="text-xs truncate">{server.name}</span>
            </Button>

            {isExpanded && serverState?.databases && (
              <div className="ml-4 space-y-1">
                {serverState.databases.map((database) => {
                  const isDatabaseExpanded = serverState.expandedDatabases[database.name] || false

                  return (
                    <div key={database.name} className="space-y-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-7 px-2"
                        onClick={() => toggleDatabase(server.id, database.name)}
                      >
                        {isDatabaseExpanded ? (
                          <ChevronDown className="h-3 w-3 mr-1" />
                        ) : (
                          <ChevronRight className="h-3 w-3 mr-1" />
                        )}
                         <Database className="h-3 w-3 mr-2 text-blue-600" />
                        <span className="text-xs truncate">{database.name}</span>
                      </Button>

                      {isDatabaseExpanded && (
                        <div className="ml-4 space-y-1">
                          {database.schemas.map((schema) => {
                            const schemaKey = `${database.name}.${schema.name}`
                            const isSchemaExpanded = serverState.expandedSchemas[schemaKey] || false

                            return (
                              <div key={schema.name} className="space-y-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start h-7 px-2"
                                  onClick={() => toggleSchema(server.id, database.name, schema.name)}
                                >
                                  {isSchemaExpanded ? (
                                    <ChevronDown className="h-3 w-3 mr-1" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3 mr-1" />
                                  )}
                                  <span className="text-xs truncate">{schema.name}</span>
                                  <span className="text-xs text-muted-foreground ml-auto">
                                    ({schema.tables.length})
                                  </span>
                                </Button>

                                {isSchemaExpanded && (
                                  <div className="ml-4 space-y-1">
                                    {schema.tables.map((table) => {
                                      const isSelected =
                                        selectedTable?.serverId === server.id &&
                                        selectedTable?.database === database.name &&
                                        selectedTable?.schema === schema.name &&
                                        selectedTable?.table === table.name

                                      return (
                                        <Button
                                          key={table.name}
                                          variant="ghost"
                                          size="sm"
                                          className={`w-full justify-start h-6 px-2 ${
                                            isSelected
                                              ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-200 dark:hover:bg-green-900/60"
                                              : ""
                                          }`}
                                          onClick={() =>
                                            selectTable(
                                              server.id,
                                              server.name,
                                              database.name,
                                              schema.name,
                                              table.name,
                                              table.type,
                                            )
                                          }
                                        >
                                          {getTableIcon(table.type)}
                                          <span className="text-xs truncate ml-2">{table.name}</span>
                                        </Button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
