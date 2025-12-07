"use client"

import { useState } from "react"
import { Plus, Server, Edit, Trash2, Power, PowerOff, MoreVertical, Play, Star, Table2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { AddServerDialog } from "@/components/add-server-dialog"
import { EditServerDialog } from "@/components/edit-server-dialog"
import { DeleteServerDialog } from "@/components/delete-server-dialog"
import { useServerStorage } from "@/hooks/use-server-storage"
import type { ServerConnection } from "@/types/server"
import type { ViewMode } from "@/components/postgres-manager"

interface ServerManagementProps {
  onViewChange?: (view: ViewMode) => void
}

export function ServerManagement({ onViewChange }: ServerManagementProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingServer, setEditingServer] = useState<ServerConnection | null>(null)
  const [deletingServer, setDeletingServer] = useState<ServerConnection | null>(null)
  const { servers, isLoading, addServer, updateServer, deleteServer, toggleConnection, toggleFavorite } = useServerStorage()

  const openQueryTool = (serverId: string) => {
    // Store the selected server ID in localStorage for the query tool to pick up
    localStorage.setItem("postgres-manager-selected-server", serverId)
    // Navigate to query tool using state
    onViewChange?.("query-tool")
  }

  const openTableViewer = (serverId: string) => {
    // Store the selected server ID in localStorage for the table viewer to pick up
    localStorage.setItem("postgres-manager-selected-server", serverId)
    // Navigate to table viewer using state
    onViewChange?.("table-viewer")
  }


  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-green-600" />
          <h1 className="text-lg font-semibold">Database Management</h1>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setShowAddDialog(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-0 " />
            Add Database
          </Button>
        </div>
      </header>

      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span className="text-sm text-muted-foreground">Loading databases...</span>
            </div>
          </div>
        ) : servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Server className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Databases Connected</h2>
            <p className="text-muted-foreground mb-4 max-w-md">
              Get started by adding your first PostgreSQL database connection. You can manage multiple databases from this
              interface.
            </p>
            <Button onClick={() => setShowAddDialog(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-0" />
              Add  Database
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {servers.map((server) => (
              <Card key={server.id} className="relative group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Server className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate">{server.name}</CardTitle>
                        <CardDescription className="text-sm truncate">
                          {server.host}:{server.port}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={server.connected ? "default" : "secondary"}
                        className={`flex-shrink-0 ${server.connected ? "bg-green-100 text-green-800" : ""}`}
                      >
                        {server.connected ? "Connected" : "Disconnected"}
                      </Badge>
                      {server.favorite && (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>Database: {server.database}</div>
                    <div>User: {server.username}</div>
                    {server.sslMode && <div>SSL: {server.sslMode}</div>}
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    {server.connected ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          onClick={() => openQueryTool(server.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Play className="h-3 w-3 mr-0.5" />
                          Query
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => openTableViewer(server.id)}
                          className="border border-green-600 text-green-600 hover:bg-transparent hover:text-green-600"
                        >
                          <Table2 className="h-3 w-3 mr-0.5" />
                          Tables
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="default"
                        onClick={() => toggleConnection(server.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Power className="h-3 w-3 mr-0.5" />
                        Connect
                      </Button>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => toggleFavorite(server.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Star className={`h-3 w-3 ${server.favorite ? 'text-yellow-500 fill-current' : ''}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="center" className="max-w-xs text-center">
                            Starring a database makes it auto-selected across pages (Query, Viewer).
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toggleConnection(server.id)}>
                            {server.connected ? (
                              <>
                                <PowerOff className="h-3 w-3 mr-2" />
                                Disconnect
                              </>
                            ) : (
                              <>
                                <Power className="h-3 w-3 mr-2" />
                                Connect
                              </>
                            )}
                          </DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => setEditingServer(server)}>
                          <Edit className="h-3 w-3 mr-2" />
                          Edit Database
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeletingServer(server)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Delete Database
                        </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddServerDialog open={showAddDialog} onOpenChange={setShowAddDialog} onAddServer={addServer} />

      {editingServer && (
        <EditServerDialog
          open={!!editingServer}
          onOpenChange={() => setEditingServer(null)}
          server={editingServer}
          onUpdateServer={updateServer}
        />
      )}

      {deletingServer && (
        <DeleteServerDialog
          open={!!deletingServer}
          onOpenChange={() => setDeletingServer(null)}
          server={deletingServer}
          onDeleteServer={deleteServer}
        />
      )}
    </div>
  )
}
