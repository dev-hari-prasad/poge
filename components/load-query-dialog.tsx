"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Trash2, Calendar, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQueryTabs } from "@/hooks/use-query-tabs"
import { useSavedQueries } from "@/hooks/use-saved-queries"
import { useToast } from "@/hooks/use-toast"

interface LoadQueryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoadQueryDialog({ open, onOpenChange }: LoadQueryDialogProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const { updateTab, getActiveTab, activeTabId } = useQueryTabs()
  const { savedQueries, deleteQuery, refresh } = useSavedQueries()
  const { toast } = useToast()

  const activeTab = getActiveTab()

  // Refresh queries when dialog opens
  useEffect(() => {
    if (open) {
      refresh()
    }
  }, [open, refresh])

  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const filteredQueries = savedQueries
    .filter((query) =>
      query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.content.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .filter((q) => (categoryFilter === "all" ? true : q.category === categoryFilter))

  const loadQuery = (content: string, queryName: string) => {
    if (activeTab && activeTabId) {
      // Update the tab content
      updateTab(activeTabId, { content, isModified: true })
      
      toast({
        title: "Query Loaded",
        description: `"${queryName}" has been loaded into the editor.`,
      })
      
      onOpenChange(false)
    } else {
      toast({
        title: "No Active Tab",
        description: "Please open a query tab first.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = (queryId: string, queryName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    deleteQuery(queryId)
    toast({
      title: "Query Deleted",
      description: `"${queryName}" has been deleted.`,
    })
  }



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Load Saved Query</DialogTitle>
          <DialogDescription>Select a saved query to load into the current tab.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input placeholder="Search queries..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="select">Select</SelectItem>
                <SelectItem value="insert">Insert</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-96">
            <div className="space-y-2">
              {filteredQueries.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {savedQueries.length === 0 ? "No saved queries yet" : "No queries match your search"}
                </div>
              ) : (
                filteredQueries.map((query) => (
                  <div
                    key={query.id}
                    className="border rounded-lg p-3 hover:bg-muted/50 group relative pr-20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{query.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>Modified {query.lastModified.toLocaleDateString()}</span>
                          {query.category && (
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-muted text-xs uppercase">{query.category}</span>
                          )}
                        </div>
                        <div className="mt-2 text-sm font-mono bg-muted/30 p-2 rounded text-muted-foreground max-h-20 overflow-hidden">
                          {query.content.slice(0, 150)}
                          {query.content.length > 150 && "..."}
                        </div>
                      </div>
                      {/* Delete button positioned at top right, visible only on hover */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                          onClick={(e) => handleDelete(query.id, query.name, e)}
                          title="Delete query"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Load button positioned at bottom right, visible only on hover */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity border-primary bg-primary/20 text-primary hover:bg-primary/30 hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        loadQuery(query.content, query.name)
                      }}
                    >
                      <FolderOpen className="h-4 w-4 mr-1" />
                      Load
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}


