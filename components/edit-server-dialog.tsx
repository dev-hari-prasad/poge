"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { Switch } from "@/components/ui/switch"
import { Loader2, TestTube } from "lucide-react"
import type { ServerConnection, ServerFormData } from "@/types/server"

interface EditServerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: ServerConnection
  onUpdateServer: (id: string, server: ServerFormData) => void
}

export function EditServerDialog({ open, onOpenChange, server, onUpdateServer }: EditServerDialogProps) {
  const [formData, setFormData] = useState<ServerFormData>({
    name: "",
    host: "",
    port: 5432,
    database: "",
    username: "",
    password: "",
    sslMode: "prefer",
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    if (server) {
      setFormData({
        name: server.name,
        host: server.host,
        port: server.port,
        database: server.database,
        username: server.username,
        password: server.password,
        sslMode: server.sslMode,
      })
    }
  }, [server])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdateServer(server.id, formData)
    onOpenChange(false)
    setTestResult(null)
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      if (!formData.host || !formData.database || !formData.username) {
        setTestResult({ success: false, message: "Please fill in all required fields (host, database, username)." })
        setTesting(false)
        return
      }

      const testData = {
        host: formData.host,
        port: formData.port,
        user: formData.username,
        password: formData.password,
        database: formData.database,
        sslMode: formData.sslMode,
      }

      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      })

      const result = await response.json()

      if (result.success) {
        setTestResult({ success: true, message: result.message })
      } else {
        const errorMessage = result.details 
          ? `${result.error}: ${result.details}` 
          : result.error
        setTestResult({ success: false, message: errorMessage })
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: "Failed to test connection. Please check your network connection and try again." 
      })
    } finally {
      setTesting(false)
    }
  }

  const isFormValid = formData.name && formData.host && formData.database && formData.username && formData.password

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit database</DialogTitle>
          <DialogDescription>Update the configuration for this PostgreSQL database connection.</DialogDescription>
        </DialogHeader>
        {/* Server Name field always visible */}
        <div className="mb-4">
          <Label htmlFor="edit-name">Database Name</Label>
          <Input
            id="edit-name"
            placeholder="My PostgreSQL Database"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label htmlFor="edit-host">Host/IP Address</Label>
                <Input
                  id="edit-host"
                  placeholder="localhost"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-port">Port</Label>
                <Input
                  id="edit-port"
                  type="number"
                  placeholder="5432"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: Number.parseInt(e.target.value) || 5432 })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-database">Database Name</Label>
              <Input
                id="edit-database"
                placeholder="postgres"
                value={formData.database}
                onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  placeholder="postgres"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-password">Password</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-ssl-mode"
                checked={formData.sslMode === "require"}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, sslMode: checked ? "require" : "disable" })
                }
              />
              <Label htmlFor="edit-ssl-mode">Use SSL</Label>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={testConnection}
                disabled={testing || !isFormValid}
                className="flex-1 bg-transparent"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-md text-sm ${
                  testResult.success
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {testResult.message}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid} className="bg-green-600 hover:bg-green-700">
              Update Database
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
