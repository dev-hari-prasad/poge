"use client"

import { useState, useEffect } from "react"
import { Edit, Save, X, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import type { QueryResult } from "@/types/query"

interface EditTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableName: string
  results: QueryResult[]
  selectedServer: any
}

export function EditTableDialog({ open, onOpenChange, tableName, results, selectedServer }: EditTableDialogProps) {
  const { toast } = useToast()
  const [editingData, setEditingData] = useState<any[]>([])
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open && results.length > 0 && results[0].type === "select") {
      // Deep clone the data for editing
      setEditingData(JSON.parse(JSON.stringify(results[0].rows || [])))
    }
  }, [open, results])

  const handleCellEdit = (rowIndex: number, columnName: string, value: string) => {
    const newData = [...editingData]
    newData[rowIndex] = { ...newData[rowIndex], [columnName]: value }
    setEditingData(newData)
  }

  const handleAddRow = () => {
    if (results.length > 0 && results[0].columns) {
      const newRow: any = {}
      results[0].columns.forEach(col => {
        newRow[col] = ""
      })
      setEditingData([...editingData, newRow])
    }
  }

  const handleDeleteRow = (rowIndex: number) => {
    const newData = editingData.filter((_, index) => index !== rowIndex)
    setEditingData(newData)
  }

  const handleRowToggle = (rowIndex: number) => {
    setSelectedRows(prev => 
      prev.includes(rowIndex) 
        ? prev.filter(i => i !== rowIndex)
        : [...prev, rowIndex]
    )
  }

  const handleSelectAll = () => {
    const rowCount = results[0].rows?.length || 0
    if (selectedRows.length === rowCount) {
      setSelectedRows([])
    } else {
      setSelectedRows(Array.from({ length: rowCount }, (_, i) => i))
    }
  }

  const handleSave = async () => {
    if (!selectedServer) {
      toast({
        title: "No Server Selected",
        description: "Please select a server to save changes.",
        variant: "destructive",
      })
      return
    }

    if (selectedRows.length === 0) {
      toast({
        title: "No Rows Selected",
        description: "Please select at least one row to edit.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      // Generate UPDATE statements for modified rows (only selected rows)
      const updateStatements = selectedRows.map(rowIndex => {
        const row = editingData[rowIndex]
        const originalRow = results[0].rows?.[rowIndex]
        if (!originalRow) return null

        const changes: string[] = []
        Object.keys(row).forEach(column => {
          if (row[column] !== originalRow[column]) {
            const value = row[column]
            const escapedValue = typeof value === "string" 
              ? `'${value.replace(/'/g, "''")}'` 
              : (value === null || value === undefined ? "NULL" : String(value))
            changes.push(`${column} = ${escapedValue}`)
          }
        })

        if (changes.length > 0) {
          // Use the first column as primary key (simplified approach)
          const primaryKey = Object.keys(row)[0]
          const primaryValue = typeof originalRow[primaryKey] === "string"
            ? `'${originalRow[primaryKey].replace(/'/g, "''")}'`
            : String(originalRow[primaryKey])
          
          return `UPDATE ${tableName} SET ${changes.join(", ")} WHERE ${primaryKey} = ${primaryValue}`
        }
        return null
      }).filter(Boolean)

      if (updateStatements.length === 0) {
        toast({
          title: "No Changes",
          description: "No changes detected in the table data.",
          variant: "default",
        })
        setIsSaving(false)
        return
      }

      // Execute the UPDATE statements
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: selectedServer.host,
          port: selectedServer.port,
          user: selectedServer.username,
          password: selectedServer.password,
          database: selectedServer.database,
          sql: updateStatements.join('; '),
          sslMode: selectedServer.sslMode,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update table')
      }

      toast({
        title: "Rows Updated",
        description: `Successfully updated ${updateStatements.length} rows in ${tableName}.`,
        variant: "default",
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update table data.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!results.length || results[0].type !== "select") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Data to Edit</DialogTitle>
            <DialogDescription>
              Please execute a SELECT query first to edit table data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const columns = results[0].columns || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Table: {tableName}
          </DialogTitle>
          <DialogDescription>
            Edit the table data. Changes will be saved when you click Save.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Table Data ({editingData.length} rows)</Label>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleSelectAll}
                >
                  {selectedRows.length === editingData.length ? "Deselect All" : "Select All"}
                </Button>
                <Button size="sm" onClick={handleAddRow}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Row
                </Button>
              </div>
            </div>

            <div className="border rounded-md overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left font-medium w-12">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === editingData.length && editingData.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    {columns.map((column) => (
                      <th key={column} className="p-2 text-left font-medium">
                        {column}
                      </th>
                    ))}
                    <th className="p-2 text-left font-medium w-16">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editingData.map((row, rowIndex) => (
                    <tr key={rowIndex} className={`border-b hover:bg-muted/30 ${selectedRows.includes(rowIndex) ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}>
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(rowIndex)}
                          onChange={() => handleRowToggle(rowIndex)}
                          className="rounded"
                        />
                      </td>
                      {columns.map((column) => (
                        <td key={column} className="p-2">
                          <Input
                            value={row[column] || ""}
                            onChange={(e) => handleCellEdit(rowIndex, column, e.target.value)}
                            className="h-8 text-xs"
                            disabled={!selectedRows.includes(rowIndex)}
                          />
                        </td>
                      ))}
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRow(rowIndex)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedRows.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedRows.length} row(s) selected for editing
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 