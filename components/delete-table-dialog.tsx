"use client"

import { useState } from "react"
import { Trash2, Database, AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DestructiveQueryDialog } from "@/components/destructive-query-dialog"
import { useToast } from "@/hooks/use-toast"
import type { QueryResult } from "@/types/query"

interface DeleteTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableName: string
  results: QueryResult[]
  selectedServer: any | null
}

export function DeleteTableDialog({ open, onOpenChange, tableName, results, selectedServer }: DeleteTableDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState<"truncate" | "drop" | null>(null)
  const [showConfirmation, setShowConfirmation] = useState<"truncate" | "drop" | null>(null)

  const getQuotedTable = () => {
    if (!tableName) return ""
    if (tableName.includes("\"")) return tableName
    const parts = tableName.split(".")
    if (parts.length === 2) {
      const [schema, table] = parts
      return `"${schema}"."${table}"`
    }
    return `"${tableName}"`
  }

  const handleTruncate = () => {
    setShowConfirmation("truncate")
  }

  const handleTruncateConfirm = async () => {
    if (!selectedServer) return
    setIsSubmitting("truncate")
    const quoted = getQuotedTable()
    const sql = `TRUNCATE TABLE ${quoted}`
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: selectedServer.host,
          port: selectedServer.port,
          user: selectedServer.username,
          password: selectedServer.password,
          database: selectedServer.database,
          sql,
          sslMode: selectedServer.sslMode,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.error) throw new Error(data?.error || 'Failed to delete rows')
      toast({ title: 'Rows deleted', description: `All rows removed from ${tableName}.` })
      onOpenChange(false)
      setShowConfirmation(null)
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e?.message || 'Could not delete rows', variant: 'destructive' })
    } finally {
      setIsSubmitting(null)
    }
  }

  const handleDrop = () => {
    setShowConfirmation("drop")
  }

  const handleDropConfirm = async () => {
    if (!selectedServer) return
    setIsSubmitting("drop")
    const quoted = getQuotedTable()
    const sql = `DROP TABLE ${quoted}`
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: selectedServer.host,
          port: selectedServer.port,
          user: selectedServer.username,
          password: selectedServer.password,
          database: selectedServer.database,
          sql,
          sslMode: selectedServer.sslMode,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.error) throw new Error(data?.error || 'Failed to drop table')
      toast({ title: 'Table dropped', description: `${tableName} has been dropped.` })
      onOpenChange(false)
      setShowConfirmation(null)
    } catch (e: any) {
      toast({ title: 'Drop failed', description: e?.message || 'Could not drop table', variant: 'destructive' })
    } finally {
      setIsSubmitting(null)
    }
  }

  const rowsCount = (() => {
    const r = results?.[0]
    return r && r.type === 'select' ? (r.rows?.length || 0) : 0
  })()

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Danger Zone
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Choose how you want to proceed for {tableName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 rounded-md border">
              <div className="font-medium mb-1">Delete all rows</div>
              <div className="text-sm text-muted-foreground mb-3">Remove all data from the table without dropping the table structure.</div>
              {rowsCount > 0 && (
                <div className="text-xs text-muted-foreground mb-2">Approx. {rowsCount.toLocaleString()} rows will be removed.</div>
              )}
              <Button variant="destructive" onClick={handleTruncate} disabled={!selectedServer || !!isSubmitting}>
                {isSubmitting === 'truncate' ? 'Deleting…' : 'Delete Rows'}
              </Button>
            </div>

            <div className="p-3 rounded-md border">
              <div className="font-medium mb-1">Drop table</div>
              <div className="text-sm text-muted-foreground mb-3">Permanently remove the table and all its data.</div>
              <Button variant="outline" className="text-red-600 border-red-600/40 hover:text-red-700 hover:border-red-700/50" onClick={handleDrop} disabled={!selectedServer || !!isSubmitting}>
                {isSubmitting === 'drop' ? 'Dropping…' : 'Drop Table'}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={!!isSubmitting}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DestructiveQueryDialog
        open={showConfirmation === "truncate"}
        action="TRUNCATE"
        objectType="table"
        message={`Confirm you want to delete all rows from ${tableName}. This action cannot be undone.`}
        onConfirm={handleTruncateConfirm}
        onCancel={() => setShowConfirmation(null)}
        isLoading={isSubmitting === "truncate"}
      />

      <DestructiveQueryDialog
        open={showConfirmation === "drop"}
        action="DROP"
        objectType="table"
        message={`Confirm you want to permanently delete ${tableName}. This action cannot be undone.`}
        onConfirm={handleDropConfirm}
        onCancel={() => setShowConfirmation(null)}
        isLoading={isSubmitting === "drop"}
      />
    </>
  )
}


