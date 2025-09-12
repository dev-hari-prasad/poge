"use client"

import { useState } from "react"
import { Clock, Database, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useQueryTabs } from "@/hooks/use-query-tabs"
import { useQueryHistory } from "@/hooks/use-query-history"
import { useServerStorage } from "@/hooks/use-server-storage"

interface QueryHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QueryHistoryDialog({ open, onOpenChange }: QueryHistoryDialogProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const { updateTab, getActiveTab, createTab, closeTab, tabs } = useQueryTabs()
  const { queryHistory, clearHistory } = useQueryHistory()
  const { servers } = useServerStorage()

  const activeTab = getActiveTab()

  const filteredHistory = queryHistory.filter((execution) =>
    execution.query.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const loadQuery = (query: string) => {
    if (activeTab) {
      updateTab(activeTab.id, { content: query })
      onOpenChange(false)
    }
  }

  const getServerName = (serverId: string) => {
    const server = servers.find((s) => s.id === serverId)
    return server?.name || "Unknown Server"
  }

  const handleClearAll = () => {
    // Clear query history
    clearHistory()
    
    // Close all existing tabs
    tabs.forEach(tab => {
      closeTab(tab.id)
    })
    
    // Create a new empty tab
    createTab("-- Write your SQL query here\n")
    
    // Close the dialog
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Query History</DialogTitle>
          <DialogDescription>View and reuse your recent query executions.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search query history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" onClick={handleClearAll} disabled={queryHistory.length === 0}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filteredHistory.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  {queryHistory.length === 0 ? "No query history yet" : "No queries match your search"}
                </div>
              ) : (
                filteredHistory.map((execution) => (
                  <div
                    key={execution.id}
                    className="border rounded-lg p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => loadQuery(execution.query)}
                  >
                    {/* Header with metadata */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{execution.timestamp.toLocaleDateString()}</span>
                          <span className="text-muted-foreground/60">•</span>
                          <span>{execution.timestamp.toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          <span>{getServerName(execution.serverId)}</span>
                          <span className="text-muted-foreground/60">•</span>
                          <span>{execution.database}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {execution.executionTime}ms
                      </Badge>
                    </div>

                    {/* Query preview */}
                    <div className="text-sm font-mono bg-muted/20 p-3 rounded border max-h-24 overflow-hidden">
                      <div className="text-xs text-muted-foreground mb-1">Query:</div>
                      {execution.query.slice(0, 150)}
                      {execution.query.length > 150 && "..."}
                    </div>

                    {/* Results summary */}
                    <div className="flex items-center gap-2 mt-3">
                      {execution.results.map((result, index) => (
                        <Badge 
                          key={index} 
                          variant={result.type === "error" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {result.type === "select" && `${result.rowCount} rows`}
                          {result.type === "insert" && `${result.affectedRows} inserted`}
                          {result.type === "update" && `${result.affectedRows} updated`}
                          {result.type === "delete" && `${result.affectedRows} deleted`}
                          {result.type === "error" && "Error"}
                          {result.type === "success" && "Success"}
                        </Badge>
                      ))}
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
