"use client"

import { useState } from "react"
import { Download, Upload, Database, FileText, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MockSchemaService } from "@/services/mock-schema-service"

interface BackupRestoreProps {
  serverId: string
  database: string
}

export function BackupRestore({ serverId, database }: BackupRestoreProps) {
  const [activeView, setActiveView] = useState<"backup" | "restore">("backup")
  const [backupOptions, setBackupOptions] = useState({
    includeData: true,
    includeSchema: true,
    format: "sql",
    compression: false,
    selectedTables: [] as string[],
  })
  const [loading, setLoading] = useState(false)
  const [backupScript, setBackupScript] = useState("")

  const generateBackup = async () => {
    setLoading(true)
    try {
      const script = await MockSchemaService.generateBackupScript(
        serverId,
        database,
        backupOptions.includeData,
        backupOptions.selectedTables.length > 0 ? backupOptions.selectedTables : undefined,
      )
      setBackupScript(script)
    } catch (error) {
      console.error("Failed to generate backup:", error)
    } finally {
      setLoading(false)
    }
  }

  const downloadBackup = () => {
    if (!backupScript) return

    const blob = new Blob([backupScript], { type: "text/sql" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${database}_backup_${new Date().toISOString().split("T")[0]}.sql`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-start bg-0 px-0 py-0 pb-5">
            <div className="flex items-center border rounded-md">
              <Button 
                variant="ghost"
                size="sm" 
                onClick={() => setActiveView("backup")} 
                className={`rounded-r-none ${activeView === "backup" ? "bg-primary/10 text-primary border-primary/20" : ""}`}
              >
                Backup Database
              </Button>
              <Button 
                variant="ghost"
                size="sm" 
                onClick={() => setActiveView("restore")} 
                className={`rounded-l-none ${activeView === "restore" ? "bg-primary/10 text-primary border-primary/20" : ""}`}
              >
                Restore Database
              </Button>
            </div>
          </div>

          {activeView === "backup" && (
            <div className="flex-1 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Backup Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-schema"
                          checked={backupOptions.includeSchema}
                          onCheckedChange={(checked) => setBackupOptions({ ...backupOptions, includeSchema: !!checked })}
                        />
                        <Label htmlFor="include-schema">Include Schema (Structure)</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-data"
                          checked={backupOptions.includeData}
                          onCheckedChange={(checked) => setBackupOptions({ ...backupOptions, includeData: !!checked })}
                        />
                        <Label htmlFor="include-data">Include Data</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="compression"
                          checked={backupOptions.compression}
                          onCheckedChange={(checked) => setBackupOptions({ ...backupOptions, compression: !!checked })}
                        />
                        <Label htmlFor="compression">Enable Compression</Label>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Output Format</Label>
                      <Select
                        value={backupOptions.format}
                        onValueChange={(value) => setBackupOptions({ ...backupOptions, format: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sql">SQL Script</SelectItem>
                          <SelectItem value="custom">Custom Format</SelectItem>
                          <SelectItem value="tar">TAR Archive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={generateBackup} disabled={loading} className="flex-1">
                        <Database className="h-4 w-4 mr-2" />
                        {loading ? "Generating..." : "Generate Backup"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Backup Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {backupScript ? (
                      <div className="space-y-4">
                        <Textarea
                          value={backupScript}
                          readOnly
                          className="font-mono text-xs h-64 resize-none"
                          placeholder="Generated backup script will appear here..."
                        />
                        <Button onClick={downloadBackup} className="w-full bg-green-600 hover:bg-green-700">
                          <Download className="h-4 w-4 mr-2" />
                          Download Backup File
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Generate a backup to see the preview</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeView === "restore" && (
            <div className="flex-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Restore Database
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-12 text-muted-foreground">
                    <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Restore Functionality</h3>
                    <p>Database restore interface would be implemented here</p>
                    <p className="text-sm">Upload SQL files or backup archives to restore database structure and data</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}


        </div>
      </div>
    </div>
  )
}
