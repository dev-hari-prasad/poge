"use client"

import { useState } from "react"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useQueryTabs } from "@/hooks/use-query-tabs"
import { useSavedQueries } from "@/hooks/use-saved-queries"

interface SaveQueryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SaveQueryDialog({ open, onOpenChange }: SaveQueryDialogProps) {
  const [queryName, setQueryName] = useState("")
  const [category, setCategory] = useState<"select" | "insert" | "update" | "delete" | undefined>(undefined)
  const { getActiveTab } = useQueryTabs()
  const { saveQuery } = useSavedQueries()

  const activeTab = getActiveTab()

  const handleSave = () => {
    if (!queryName.trim() || !activeTab?.content.trim()) return

    saveQuery(queryName.trim(), activeTab.content, category)
    setQueryName("")
    setCategory(undefined)
    onOpenChange(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setQueryName("")
      setCategory(undefined)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Save Query</DialogTitle>
          <DialogDescription>Save the current query with a custom name for easy access later.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="query-name">Query Name</Label>
            <Input
              id="query-name"
              placeholder="My Query"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          <div className="grid gap-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as any)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Optional: choose category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="select">Select</SelectItem>
                <SelectItem value="insert">Insert</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Query Preview</Label>
            <div className="bg-muted p-3 rounded text-sm font-mono max-h-32 overflow-auto">
              {activeTab?.content || "No query content"}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!queryName.trim() || !activeTab?.content.trim()}>
            Save Query
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
