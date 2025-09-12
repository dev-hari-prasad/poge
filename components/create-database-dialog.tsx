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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MockSchemaService } from "@/services/mock-schema-service"
import type { DatabaseDefinition } from "@/types/schema"

interface CreateDatabaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverId: string
}

export function CreateDatabaseDialog({ open, onOpenChange, serverId }: CreateDatabaseDialogProps) {
  const [formData, setFormData] = useState<DatabaseDefinition>({
    name: "",
    encoding: "UTF8",
    collation: "en_US.UTF-8",
    template: "template0",
    owner: "postgres",
    comment: "",
  })
  const [loading, setLoading] = useState(false)
  const [previewSql, setPreviewSql] = useState("")

  const generatePreview = async () => {
    if (!formData.name) return

    try {
      const operation = await MockSchemaService.createDatabase(serverId, formData)
      setPreviewSql(operation.sql)
    } catch (error) {
      console.error("Failed to generate preview:", error)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) return
    
    if (formData.name.length > 15) {
      console.error("Database name too long")
      return
    }

    setLoading(true)
    try {
      const operation = await MockSchemaService.createDatabase(serverId, formData)
      console.log("Database created:", operation)
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error("Failed to create database:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      encoding: "UTF8",
      collation: "en_US.UTF-8",
      template: "template0",
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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Database</DialogTitle>
          <DialogDescription>Create a new PostgreSQL database with custom settings.</DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="db-name">Database Name *</Label>
              <Input
                id="db-name"
                placeholder="my_database"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onBlur={generatePreview}
                maxLength={15}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Maximum 15 characters</span>
                <span>{formData.name.length}/15</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="encoding">Encoding</Label>
                <Select
                  value={formData.encoding}
                  onValueChange={(value) => setFormData({ ...formData, encoding: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTF8">UTF8</SelectItem>
                    <SelectItem value="LATIN1">LATIN1</SelectItem>
                    <SelectItem value="SQL_ASCII">SQL_ASCII</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="collation">Collation</Label>
                <Select
                  value={formData.collation}
                  onValueChange={(value) => setFormData({ ...formData, collation: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_US.UTF-8">en_US.UTF-8</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="POSIX">POSIX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="template">Template</Label>
                <Select
                  value={formData.template}
                  onValueChange={(value) => setFormData({ ...formData, template: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="template0">template0</SelectItem>
                    <SelectItem value="template1">template1</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="owner">Owner</Label>
                <Input
                  id="owner"
                  placeholder="postgres"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                placeholder="Optional description for the database"
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
            {loading ? "Creating..." : "Create Database"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
