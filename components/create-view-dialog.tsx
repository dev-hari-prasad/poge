"use client"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MockSchemaService } from "@/services/mock-schema-service"
import type { ViewDefinition } from "@/types/schema"

interface CreateViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverId: string
  database: string
}

export function CreateViewDialog({ open, onOpenChange, serverId, database }: CreateViewDialogProps) {
  const [formData, setFormData] = useState<ViewDefinition>({
    name: "",
    schema: "public",
    definition: "SELECT * FROM table_name;",
    comment: "",
  })
  const [loading, setLoading] = useState(false)
  const [previewSql, setPreviewSql] = useState("")

  const generatePreview = async () => {
    if (!formData.name || !formData.definition) return

    try {
      const operation = await MockSchemaService.createView(serverId, database, formData)
      setPreviewSql(operation.sql)
    } catch (error) {
      console.error("Failed to generate preview:", error)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.definition.trim()) return

    setLoading(true)
    try {
      const operation = await MockSchemaService.createView(serverId, database, formData)
      console.log("View created:", operation)
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error("Failed to create view:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      schema: "public",
      definition: "SELECT * FROM table_name;",
      comment: "",
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
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create View</DialogTitle>
          <DialogDescription>Create a new view with a custom SQL definition.</DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="view-name">View Name *</Label>
                <Input
                  id="view-name"
                  placeholder="my_view"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="view-schema">Schema</Label>
                <Select value={formData.schema} onValueChange={(value) => setFormData({ ...formData, schema: value })}>
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

            <div className="grid gap-2">
              <Label htmlFor="view-definition">SQL Definition *</Label>
              <Textarea
                id="view-definition"
                placeholder="SELECT column1, column2 FROM table_name WHERE condition;"
                value={formData.definition}
                onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Enter the SELECT statement that defines the view. Do not include CREATE VIEW.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="view-comment">Comment</Label>
              <Textarea
                id="view-comment"
                placeholder="Optional description for the view"
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {previewSql && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">SQL Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-3 rounded font-mono whitespace-pre-wrap overflow-auto max-h-48">
                  {previewSql}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={generatePreview} variant="outline" disabled={!formData.name || !formData.definition}>
            Preview SQL
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!formData.name.trim() || !formData.definition.trim() || loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? "Creating..." : "Create View"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
