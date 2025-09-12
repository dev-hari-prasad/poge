"use client"

import { useState } from "react"
import { Search, Grid, List, Database, Table, Eye, Layers, MoreHorizontal, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { DatabaseObject } from "@/types/schema"

interface SchemaObjectsViewProps {
  serverId: string
  database: string
  objects: DatabaseObject[]
  loading: boolean
  onRefresh?: () => void
  onViewData?: (object: DatabaseObject) => void
  onEditStructure?: (object: DatabaseObject) => void
  onEditDefinition?: (object: DatabaseObject) => void
}

export function SchemaObjectsView({ serverId, database, objects, loading, onViewData, onEditStructure, onEditDefinition }: SchemaObjectsViewProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")

  const filteredObjects = objects.filter((obj) => {
    const matchesSearch = obj.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === "all" || obj.type === filterType
    const matchesDatabase = !obj.database || obj.database === database
    return matchesSearch && matchesFilter && matchesDatabase
  })

  const getObjectIcon = (type: DatabaseObject["type"]) => {
    switch (type) {
      case "database":
        return <Database className="h-5 w-5 text-blue-600" />
      case "schema":
        return <Layers className="h-5 w-5 text-purple-600" />
      case "table":
        return <Table className="h-5 w-5 text-green-600" />
      case "view":
        return <Eye className="h-5 w-5 text-orange-600" />
      case "index":
        return <Database className="h-5 w-5 text-yellow-600" />
      default:
        return <Database className="h-5 w-5 text-gray-600" />
    }
  }

  const getObjectBadgeColor = (type: DatabaseObject["type"]) => {
    switch (type) {
      case "database":
        return "bg-blue-100 text-blue-800"
      case "schema":
        return "bg-purple-100 text-purple-800"
      case "table":
        return "bg-green-100 text-green-800"
      case "view":
        return "bg-orange-100 text-orange-800"
      case "index":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const renderObjectActions = (object: DatabaseObject) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {object.type === "table" && (
          <>
            <DropdownMenuItem onClick={() => onViewData?.(object)}>View Data</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditStructure?.(object)}>Edit Structure</DropdownMenuItem>
            <DropdownMenuItem>Export Data</DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {object.type === "view" && (
          <>
            <DropdownMenuItem onClick={() => onViewData?.(object)}>View Data</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditDefinition?.(object)}>Edit Definition</DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem>Rename</DropdownMenuItem>
        <DropdownMenuItem>Properties</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive">Drop {object.type}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading schema objects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search objects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Objects</SelectItem>
                <SelectItem value="database">Databases</SelectItem>
                <SelectItem value="schema">Schemas</SelectItem>
                <SelectItem value="table">Tables</SelectItem>
                <SelectItem value="view">Views</SelectItem>
                <SelectItem value="index">Indexes</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {filteredObjects.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Showing {filteredObjects.length} objects</span>
            {filterType !== "all" && <span>• Filtered by {filterType}</span>}
            {searchTerm && <span>• Search: "{searchTerm}"</span>}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {filteredObjects.length === 0 ? (
          <div className="text-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Objects Found</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterType !== "all"
                ? "Try adjusting your search or filter criteria"
                : "No database objects available"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-3 grid-cols-3">
            {filteredObjects.map((object) => (
              <Card key={object.id} className="hover:shadow-md transition-shadow p-3">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getObjectIcon(object.type)}
                      <div className="min-w-0">
                        <CardTitle className="text-xs truncate">{object.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-xs px-1.5 py-0.5 ${getObjectBadgeColor(object.type)}`}>
                            {object.type.toUpperCase()}
                          </Badge>
                          {object.schema && <span className="text-xs text-muted-foreground">{object.schema}</span>}
                        </div>
                      </div>
                    </div>
                    {renderObjectActions(object)}
                  </div>
                </CardHeader>
                {object.metadata && (
                  <CardContent className="pt-0">
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      {object.metadata.rowCount && <div>Rows: {object.metadata.rowCount.toLocaleString()}</div>}
                      {object.metadata.size && <div>Size: {object.metadata.size}</div>}
                      {object.metadata.encoding && <div>Encoding: {object.metadata.encoding}</div>}
                      {object.metadata.collation && <div>Collation: {object.metadata.collation}</div>}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredObjects.map((object) => (
              <div key={object.id} className="flex items-center justify-between p-3 hover:bg-muted/30 rounded-lg border border-border/50 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getObjectIcon(object.type)}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{object.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge className={`text-xs px-1.5 py-0.5 ${getObjectBadgeColor(object.type)}`}>
                        {object.type.toUpperCase()}
                      </Badge>
                      {object.schema && <span className="truncate">{object.schema}</span>}
                      {object.metadata?.rowCount && <span>• {object.metadata.rowCount} rows</span>}
                      {object.metadata?.size && <span>• {object.metadata.size}</span>}
                    </div>
                  </div>
                </div>
                {renderObjectActions(object)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
