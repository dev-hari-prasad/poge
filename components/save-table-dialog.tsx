"use client"

import { useState } from "react"
import { Save, Download, FileText, Database, Table, Braces } from "lucide-react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { QueryResult } from "@/types/query"

interface SaveTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableName: string
  results: QueryResult[]
}

export function SaveTableDialog({ open, onOpenChange, tableName, results }: SaveTableDialogProps) {
  const { toast } = useToast()
  const [fileName, setFileName] = useState(tableName)
  const [format, setFormat] = useState<"csv" | "json" | "sql" | "excel">("csv")

  const handleSave = () => {
    if (!results.length || results[0].type !== "select") {
      toast({
        title: "No Data to Save",
        description: "Please execute a SELECT query first to download table data.",
        variant: "destructive",
      })
      return
    }

    const result = results[0]
    const data = result.rows || []
    const columns = result.columns || []

    let content = ""
    let mimeType = ""
    let extension = ""

    switch (format) {
      case "csv":
        // Create CSV content
        const csvHeaders = columns.join(",")
        const csvRows = data.map(row => 
          columns.map(col => {
            const value = row[col]
            // Escape quotes and wrap in quotes if contains comma or quote
            const escaped = String(value || "").replace(/"/g, '""')
            return escaped.includes(",") || escaped.includes('"') ? `"${escaped}"` : escaped
          }).join(",")
        ).join("\n")
        content = `${csvHeaders}\n${csvRows}`
        mimeType = "text/csv"
        extension = "csv"
        break

      case "json":
        // Create JSON content
        content = JSON.stringify(data, null, 2)
        mimeType = "application/json"
        extension = "json"
        break

      case "excel":
        // Create Excel file
        const workbook = XLSX.utils.book_new()
        const worksheet = XLSX.utils.json_to_sheet(data)
        XLSX.utils.book_append_sheet(workbook, worksheet, "Table Data")
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
        const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${fileName}.xlsx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast({
          title: "Table Saved",
          description: `${data.length} rows saved as Excel file.`,
          variant: "default",
        })
        onOpenChange(false)
        return

      case "sql":
        // Create SQL INSERT statements
        const insertStatements = data.map(row => {
          const values = columns.map(col => {
            const value = row[col]
            if (value === null || value === undefined) return "NULL"
            if (typeof value === "string") return `'${String(value).replace(/'/g, "''")}'`
            return String(value)
          }).join(", ")
          return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${values});`
        }).join("\n")
        content = insertStatements
        mimeType = "text/plain"
        extension = "sql"
        break
    }

    // Create and download file
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${fileName}.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Table Saved",
      description: `${data.length} rows saved as ${format.toUpperCase()} file.`,
      variant: "default",
    })

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Table Data
          </DialogTitle>
          <DialogDescription>
            Download the current table data in your preferred format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fileName">File Name</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter file name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select value={format} onValueChange={(value: "csv" | "json" | "sql") => setFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    CSV
                  </div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    Excel
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <Braces className="h-4 w-4" />
                    JSON
                  </div>
                </SelectItem>
                <SelectItem value="sql">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    SQL INSERT
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {results.length > 0 && results[0].type === "select" && (
            <div className="text-sm text-muted-foreground">
              {results[0].rows?.length || 0} rows will be saved
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!fileName.trim()}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 