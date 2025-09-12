"use client"

import { useState } from "react"
import { Plus, Trash2, Key } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MockSchemaService } from "@/services/mock-schema-service"
import type { TableDefinition, ColumnDefinition } from "@/types/schema"

interface CreateTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverId: string
  database: string
}

export function CreateTableDialog({ open, onOpenChange, serverId, database }: CreateTableDialogProps) {
  const [formData, setFormData] = useState<TableDefinition>({
    name: "",
    schema: "public",
    columns: [
      {
        name: "id",
        dataType: "integer",
        isNullable: false,
        isPrimaryKey: true,
        isUnique: false,
        isAutoIncrement: true,
      },
    ],
    indexes: [],
    constraints: [],
  })
  const [loading, setLoading] = useState(false)
  const [previewSql, setPreviewSql] = useState("")

  const dataTypes = MockSchemaService.getPostgreSQLDataTypes()

  const addColumn = () => {
    const newColumn: ColumnDefinition = {
      name: "",
      dataType: "varchar",
      length: 255,
      isNullable: true,
      isPrimaryKey: false,
      isUnique: false,
      isAutoIncrement: false,
    }
    setFormData({
      ...formData,
      columns: [...formData.columns, newColumn],
    })
  }

  const removeColumn = (index: number) => {
    setFormData({
      ...formData,
      columns: formData.columns.filter((_, i) => i !== index),
    })
  }

  const updateColumn = (index: number, updates: Partial<ColumnDefinition>) => {
    const updatedColumns = formData.columns.map((col, i) => (i === index ? { ...col, ...updates } : col))
    setFormData({ ...formData, columns: updatedColumns })
  }

  const generatePreview = async () => {
    if (!formData.name || formData.columns.length === 0) return

    try {
      const operation = await MockSchemaService.createTable(serverId, database, formData)
      setPreviewSql(operation.sql)
    } catch (error) {
      console.error("Failed to generate preview:", error)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim() || formData.columns.length === 0) return

    setLoading(true)
    try {
      const operation = await MockSchemaService.createTable(serverId, database, formData)
      console.log("Table created:", operation)
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error("Failed to create table:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      schema: "public",
      columns: [
        {
          name: "id",
          dataType: "integer",
          isNullable: false,
          isPrimaryKey: true,
          isUnique: false,
          isAutoIncrement: true,
        },
      ],
      indexes: [],
      constraints: [],
    })
    setPreviewSql("")
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Table</DialogTitle>
          <DialogDescription>Create a new table with columns and constraints.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="columns">Columns</TabsTrigger>
            <TabsTrigger value="preview">SQL Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="table-name">Table Name *</Label>
                  <Input
                    id="table-name"
                    placeholder="my_table"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="table-schema">Schema</Label>
                  <Select
                    value={formData.schema}
                    onValueChange={(value) => setFormData({ ...formData, schema: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">public</SelectItem>
                      <SelectItem value="analytics">analytics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="columns" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Columns</h3>
              <Button onClick={addColumn} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Column
              </Button>
            </div>

            <div className="space-y-6">
              {formData.columns.map((column, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Column {index + 1}</CardTitle>
                      {formData.columns.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeColumn(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>Column Name *</Label>
                        <Input
                          placeholder="column_name"
                          value={column.name}
                          onChange={(e) => updateColumn(index, { name: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Data Type *</Label>
                        <Select
                          value={column.dataType}
                          onValueChange={(value) => updateColumn(index, { dataType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {dataTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Length/Precision</Label>
                        <Input
                          type="number"
                          placeholder="255"
                          value={column.length || ""}
                          onChange={(e) =>
                            updateColumn(index, { length: e.target.value ? Number(e.target.value) : undefined })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Default Value</Label>
                      <Input
                        placeholder="NULL, 'default_value', CURRENT_TIMESTAMP, etc."
                        value={column.defaultValue || ""}
                        onChange={(e) => updateColumn(index, { defaultValue: e.target.value || undefined })}
                      />
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`nullable-${index}`}
                          checked={!column.isNullable}
                          onCheckedChange={(checked) => updateColumn(index, { isNullable: !checked })}
                        />
                        <Label htmlFor={`nullable-${index}`} className="text-sm">
                          NOT NULL
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`primary-${index}`}
                          checked={column.isPrimaryKey}
                          onCheckedChange={(checked) => updateColumn(index, { isPrimaryKey: !!checked })}
                        />
                        <Label htmlFor={`primary-${index}`} className="text-sm flex items-center gap-1">
                          <Key className="h-3 w-3" />
                          Primary Key
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`unique-${index}`}
                          checked={column.isUnique}
                          onCheckedChange={(checked) => updateColumn(index, { isUnique: !!checked })}
                        />
                        <Label htmlFor={`unique-${index}`} className="text-sm">
                          Unique
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`auto-${index}`}
                          checked={column.isAutoIncrement}
                          onCheckedChange={(checked) => updateColumn(index, { isAutoIncrement: !!checked })}
                        />
                        <Label htmlFor={`auto-${index}`} className="text-sm">
                          Auto Increment
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">SQL Preview</h3>
              <Button onClick={generatePreview} variant="outline" disabled={!formData.name}>
                Generate Preview
              </Button>
            </div>

            {previewSql ? (
              <Card>
                <CardContent className="p-4">
                  <pre className="text-sm bg-muted p-4 rounded font-mono whitespace-pre-wrap overflow-auto max-h-96">
                    {previewSql}
                  </pre>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Click "Generate Preview" to see the SQL statement
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={generatePreview} variant="outline" disabled={!formData.name}>
            Preview SQL
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!formData.name.trim() || formData.columns.length === 0 || loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? "Creating..." : "Create Table"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
