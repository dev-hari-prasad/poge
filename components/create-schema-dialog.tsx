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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MockSchemaService } from "@/services/mock-schema-service"
import type { SchemaDefinition } from "@/types/schema"

interface CreateSchemaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverId: string
  database: string
}

export function CreateSchemaDialog({ open, onOpenChange, serverId, database }: CreateSchemaDialogProps) {
  const [formData, setFormData] = useState<SchemaDefinition>({
    name: "",
    database,
    owner: "postgres",
    comment: "",
  })
  const [loading, setLoading] = useState(false)
  const [previewSql, setPreviewSql] = useState("")

  const generatePreview = async () => {
    if (!formData.name) return

    try {
      const operation = await MockSchemaService.createSchema(serverId, database, formData)
      setPreviewSql(operation.sql)
    } catch (error) {
      console.error("Failed to generate preview:", error)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) return

    setLoading(true)
    try {
      const operation = await MockSchemaService.createSchema(serverId, database, formData)
      console.log("Schema created:", operation)
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error("Failed to create schema:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      database,
      owner: "postgres",
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Schema</DialogTitle>
          <DialogDescription>Create a new schema in database "{database}".</DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="schema-name">Schema Name *</Label>
              <Input
                id="schema-name"
                placeholder="my_schema"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onBlur={generatePreview}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="schema-owner">Owner</Label>
              <Input
                id="schema-owner"
                placeholder="postgres"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="schema-comment">Comment</Label>
              <Textarea
                id="schema-comment"
                placeholder="Optional description for the schema"
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          {previewSql && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">SQL Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-3 rounded font-mono whitespace-pre-wrap">{previewSql}</pre>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={generatePreview} variant="outline" disabled={!formData.name}>
            Preview SQL
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!formData.name.trim() || loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? "Creating..." : "Create Schema"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
