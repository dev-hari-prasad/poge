"use client"

import { useState, useEffect } from "react"
import {
  ChevronRight,
  ChevronDown,
  Database,
  Table,
  Eye,
  Layers,
  Loader2,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  Copy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MockSchemaService } from "@/services/mock-schema-service"
import type { ServerConnection } from "@/types/server"
import type { DatabaseObject } from "@/types/schema"

interface SchemaTreeProps {
  servers: ServerConnection[]
}

interface TreeState {
  [serverId: string]: {
    expanded: boolean
    objects?: DatabaseObject[]
    loading?: boolean
    expandedObjects: { [objectId: string]: boolean }
  }
}

export function SchemaTree({ servers }: SchemaTreeProps) {
  const [treeState, setTreeState] = useState<TreeState>({})

  useEffect(() => {
    const initialState: TreeState = {}
    servers.forEach((server) => {
      initialState[server.id] = {
        expanded: false,
        expandedObjects: {},
      }
    })
    setTreeState(initialState)
  }, [servers])

  const toggleServer = async (serverId: string) => {
    const currentState = treeState[serverId]
    const newExpanded = !currentState?.expanded

    if (newExpanded && !currentState?.objects) {
      setTreeState((prev) => ({
        ...prev,
        [serverId]: { ...prev[serverId], loading: true, expanded: true },
      }))

      try {
        const objects = await MockSchemaService.getDatabaseObjects(serverId)
        setTreeState((prev) => ({
          ...prev,
          [serverId]: { ...prev[serverId], objects, loading: false },
        }))
      } catch (error) {
        console.error("Failed to load schema objects:", error)
        setTreeState((prev) => ({
          ...prev,
          [serverId]: { ...prev[serverId], loading: false, expanded: false },
        }))
      }
    } else {
      setTreeState((prev) => ({
        ...prev,
        [serverId]: { ...prev[serverId], expanded: newExpanded },
      }))
    }
  }

  const toggleObject = (serverId: string, objectId: string) => {
    setTreeState((prev) => ({
      ...prev,
      [serverId]: {
        ...prev[serverId],
        expandedObjects: {
          ...prev[serverId].expandedObjects,
          [objectId]: !prev[serverId].expandedObjects[objectId],
        },
      },
    }))
  }

  const getObjectIcon = (type: DatabaseObject["type"]) => {
    switch (type) {
      case "database":
        return <Database className="h-3 w-3 text-blue-600" />
      case "schema":
        return <Layers className="h-3 w-3 text-purple-600" />
      case "table":
        return <Table className="h-3 w-3 text-green-600" />
      case "view":
        return <Eye className="h-3 w-3 text-orange-600" />
      case "index":
        return <Database className="h-3 w-3 text-yellow-600" />
      default:
        return <Database className="h-3 w-3 text-gray-600" />
    }
  }

  const renderContextMenu = (object: DatabaseObject) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
          <MoreHorizontal className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {object.type === "database" && (
          <>
            <DropdownMenuItem>
              <Plus className="h-3 w-3 mr-2" />
              Create Schema
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="h-3 w-3 mr-2" />
              Backup Database
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Edit className="h-3 w-3 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="h-3 w-3 mr-2" />
              Drop Database
            </DropdownMenuItem>
          </>
        )}
        {object.type === "schema" && (
          <>
            <DropdownMenuItem>
              <Plus className="h-3 w-3 mr-2" />
              Create Table
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Plus className="h-3 w-3 mr-2" />
              Create View
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Edit className="h-3 w-3 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="h-3 w-3 mr-2" />
              Drop Schema
            </DropdownMenuItem>
          </>
        )}
        {object.type === "table" && (
          <>
            <DropdownMenuItem>
              <Eye className="h-3 w-3 mr-2" />
              View Data
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="h-3 w-3 mr-2" />
              Edit Structure
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="h-3 w-3 mr-2" />
              Duplicate Table
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Edit className="h-3 w-3 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="h-3 w-3 mr-2" />
              Drop Table
            </DropdownMenuItem>
          </>
        )}
        {object.type === "view" && (
          <>
            <DropdownMenuItem>
              <Eye className="h-3 w-3 mr-2" />
              View Data
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="h-3 w-3 mr-2" />
              Edit Definition
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Edit className="h-3 w-3 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="h-3 w-3 mr-2" />
              Drop View
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const renderObject = (object: DatabaseObject, serverId: string, level = 0) => {
    const serverState = treeState[serverId]
    const isExpanded = serverState?.expandedObjects[object.id] || false
    const hasChildren = serverState?.objects?.some((obj) => obj.parent === object.id) || false

    return (
      <div key={object.id} style={{ marginLeft: `${level * 16}px` }}>
        <div className="flex items-center gap-1 py-1 px-2 hover:bg-muted/50 rounded group">
          {hasChildren ? (
            <Button variant="ghost" size="sm" className="h-4 w-4 p-0" onClick={() => toggleObject(serverId, object.id)}>
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          ) : (
            <div className="w-4" />
          )}

          {getObjectIcon(object.type)}
          <span className="text-xs truncate flex-1">{object.name}</span>
          {renderContextMenu(object)}
        </div>

        {isExpanded &&
          hasChildren &&
          serverState?.objects
            ?.filter((obj) => obj.parent === object.id)
            .map((childObject) => renderObject(childObject, serverId, level + 1))}
      </div>
    )
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

            {isExpanded &&
              serverState?.objects &&
              serverState.objects
                .filter((obj) => !obj.parent) // Root level objects
                .map((object) => renderObject(object, server.id, 1))}
          </div>
        )
      })}
    </div>
  )
}
