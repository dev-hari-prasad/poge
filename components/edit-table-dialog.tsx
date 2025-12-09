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
      const rows = results[0].rows || []
      setEditingData(JSON.parse(JSON.stringify(rows)))
      // Reset selected rows when dialog opens - select all by default for easier editing
      setSelectedRows(Array.from({ length: rows.length }, (_, i) => i))
    } else if (!open) {
      // Reset state when dialog closes
      setEditingData([])
      setSelectedRows([])
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
    const rowCount = editingData.length
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
            let escapedValue: string
            
            // Handle null, undefined, or empty string as NULL
            if (value === null || value === undefined || value === "") {
              escapedValue = "NULL"
            } else if (typeof value === "string") {
              escapedValue = `'${value.replace(/'/g, "''")}'`
            } else if (typeof value === "number" || typeof value === "boolean") {
              escapedValue = String(value)
            } else {
              // For any other type (objects, String objects, etc.), convert to string safely
              const strValue = String(value)
              escapedValue = strValue === "" ? "NULL" : `'${strValue.replace(/'/g, "''")}'`
            }
            
            changes.push(`"${column}" = ${escapedValue}`)
          }
        })

        if (changes.length > 0) {
          // Use the first column as primary key (simplified approach)
          const primaryKey = Object.keys(row)[0]
          const pkValue = originalRow[primaryKey]
          let primaryValue: string
          
          if (pkValue === null || pkValue === undefined) {
            primaryValue = "NULL"
          } else if (typeof pkValue === "string") {
            primaryValue = `'${pkValue.replace(/'/g, "''")}'`
          } else {
            primaryValue = String(pkValue)
          }
          
          // Quote table name and column names for PostgreSQL compatibility
          const quotedTable = tableName.includes('"') ? tableName : tableName.split('.').map(p => `"${p}"`).join('.')
          
          return `UPDATE ${quotedTable} SET ${changes.join(", ")} WHERE "${primaryKey}" = ${primaryValue}`
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
      <DialogContent className="max-w-[80vw] w-[80vw] max-h-[90vh] overflow-hidden flex flex-col" style={{ marginTop: '-5vh' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Table: {tableName}
          </DialogTitle>
          <DialogDescription>
            Edit the table data. Changes will be saved when you click Save.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="space-y-4 flex-shrink-0">
            <div className="flex justify-between items-center mb-3">
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
          </div>

          <div className="flex-1 overflow-auto border rounded-md min-h-0">
            <div className="inline-block min-w-full">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="p-2 text-left font-medium w-12 bg-muted/50">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === editingData.length && editingData.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    {columns.map((column) => (
                      <th key={column} className="p-2 text-left font-medium bg-muted/50 whitespace-nowrap min-w-[150px]">
                        {column}
                      </th>
                    ))}
                    <th className="p-2 text-left font-medium w-16 bg-muted/50">Actions</th>
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
                        <td key={column} className="p-2 whitespace-nowrap">
                          <Input
                            value={row[column] || ""}
                            onChange={(e) => handleCellEdit(rowIndex, column, e.target.value)}
                            className="h-8 text-xs min-w-[140px]"
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
          </div>

          {selectedRows.length > 0 && (
            <div className="text-sm text-muted-foreground mt-2 flex-shrink-0">
              {selectedRows.length} row(s) selected for editing
            </div>
          )}
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