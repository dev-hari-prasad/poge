"use client"

import type React from "react"

import { useState } from "react"
import { Trash2, Calendar, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQueryTabs } from "@/hooks/use-query-tabs"
import { useSavedQueries } from "@/hooks/use-saved-queries"

interface LoadQueryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoadQueryDialog({ open, onOpenChange }: LoadQueryDialogProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const { updateTab, getActiveTab } = useQueryTabs()
  const { savedQueries, deleteQuery, updateQuery } = useSavedQueries()

  const activeTab = getActiveTab()

  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const filteredQueries = savedQueries
    .filter((query) =>
      query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.content.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .filter((q) => (categoryFilter === "all" ? true : q.category === categoryFilter))

  const loadQuery = (content: string) => {
    if (activeTab) {
      updateTab(activeTab.id, { content })
      onOpenChange(false)
    }
  }

  const handleDelete = (queryId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteQuery(queryId)
  }

  const handleRename = (queryId: string, newName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const q = savedQueries.find((s) => s.id === queryId)
    if (!q || !newName.trim()) return
    updateQuery(queryId, newName.trim(), q.content, q.category)
  }

  const handleChangeCategory = (queryId: string, newCat: "select" | "insert" | "update" | "delete", e: React.MouseEvent) => {
    e.stopPropagation()
    const q = savedQueries.find((s) => s.id === queryId)
    if (!q) return
    updateQuery(queryId, q.name, q.content, newCat)
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
                    className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer group"
                    onClick={() => loadQuery(query.content)}
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
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                        <InlineRename queryId={query.id} initialName={query.name} onRename={handleRename} />
                        <InlineCategory queryId={query.id} initialCategory={query.category} onChangeCategory={handleChangeCategory} />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => handleDelete(query.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
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

function InlineRename({ queryId, initialName, onRename }: { queryId: string; initialName: string; onRename: (id: string, newName: string, e: React.MouseEvent) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialName)
  return editing ? (
    <div className="flex items-center gap-1">
      <Input value={value} onChange={(e) => setValue(e.target.value)} className="h-7 w-40 text-xs" />
      <Button size="sm" variant="outline" className="h-7 px-2" onClick={(e) => { onRename(queryId, value, e); setEditing(false) }}>Save</Button>
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={(e) => { e.stopPropagation(); setEditing(false); setValue(initialName) }}>Cancel</Button>
    </div>
  ) : (
    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={(e) => { e.stopPropagation(); setEditing(true) }}>
      <Pencil className="h-4 w-4" />
    </Button>
  )
}

function InlineCategory({ queryId, initialCategory, onChangeCategory }: { queryId: string; initialCategory?: "select" | "insert" | "update" | "delete"; onChangeCategory: (id: string, cat: any, e: React.MouseEvent) => void }) {
  return (
    <Select defaultValue={initialCategory} onValueChange={() => {}}>
      <SelectTrigger className="h-7 w-28 text-xs" onClick={(e) => e.stopPropagation()}>
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {(["select", "insert", "update", "delete"] as const).map((c) => (
          <SelectItem key={c} value={c} onClick={(e) => onChangeCategory(queryId, c, e)}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
