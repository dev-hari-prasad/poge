"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"
import type { ServerFormData } from "@/types/server"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

interface AddServerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddServer: (server: ServerFormData) => void
}

export function AddServerDialog({ open, onOpenChange, onAddServer }: AddServerDialogProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<ServerFormData>({
    name: "",
    host: "",
    port: 5432,
    database: "",
    username: "",
    password: "",
    sslMode: "prefer",
  })
  const [connectionString, setConnectionString] = useState("")
  const [activeTab, setActiveTab] = useState<'credentials' | 'connectionString'>("credentials")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const parseConnectionString = (connectionString: string): Partial<ServerFormData> => {
    if (!connectionString || connectionString.trim() === '') {
      return {}
    }

    try {
      // Handle postgres:// format
      if (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://')) {
        const url = new URL(connectionString)
        const pathParts = url.pathname.slice(1).split('/')
        const database = pathParts[0] || 'postgres'
        
        return {
          host: url.hostname,
          port: url.port ? parseInt(url.port) : 5432,
          database: database,
          username: url.username,
          password: url.password,
          sslMode: (url.searchParams.get('sslmode') as "disable" | "require" | "prefer") || 'prefer'
        }
      }
      
      // Handle key=value format
      const params: Record<string, string> = {}
      const pairs = connectionString.split(' ')
      
      pairs.forEach(pair => {
        const [key, value] = pair.split('=')
        if (key && value) {
          params[key.toLowerCase()] = value
        }
      })
      
      return {
        host: params.host || params.hostaddr || '',
        port: params.port ? parseInt(params.port) : 5432,
        database: params.dbname || params.database || 'postgres',
        username: params.user || params.username || '',
        password: params.password || '',
        sslMode: (params.sslmode as "disable" | "require" | "prefer") || 'prefer'
      }
    } catch (error) {
      console.error('Error parsing connection string:', error)
      return {}
    }
  }

  // Parse connection string for preview
  const parsedPreview = connectionString ? parseConnectionString(connectionString) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if database name is filled
    if (!formData.name.trim()) {
      toast({
        title: "Database Name Required",
        description: "Please enter a name for your database.",
        variant: "destructive",
      })
      return
    }
    
    // First test the connection before adding the server
    setTesting(true)
    setTestResult(null)

    try {
      let testData: any
      let serverData: ServerFormData
      
      if (activeTab === "credentials") {
        if (!formData.host || !formData.username) {
          setTestResult({ success: false, message: "Please fill in all required fields (host, username)." })
          setTesting(false)
          return
        }
        testData = {
          host: formData.host,
          port: formData.port,
          user: formData.username,
          password: formData.password,
          database: formData.database || "postgres", // Use postgres as default for testing
          sslMode: formData.sslMode,
        }
        serverData = formData
      } else {
        if (!connectionString) {
          setTestResult({ success: false, message: "Please enter a connection string." })
          setTesting(false)
          return
        }
        const parsedData = parseConnectionString(connectionString)
        if (!parsedData.host || !parsedData.database || !parsedData.username) {
          setTestResult({ success: false, message: "Invalid connection string. Missing required fields." })
          setTesting(false)
          return
        }
        testData = {
          host: parsedData.host,
          port: parsedData.port || 5432,
          user: parsedData.username,
          password: parsedData.password,
          database: parsedData.database,
          sslMode: parsedData.sslMode || "prefer",
        }
        serverData = {
          name: formData.name,
          host: parsedData.host || "",
          port: parsedData.port || 5432,
          database: parsedData.database || "",
          username: parsedData.username || "",
          password: parsedData.password || "",
          sslMode: parsedData.sslMode || "prefer",
          connectionString,
        }
      }

      // Test connection first
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      })

      const result = await response.json()

      if (result.success) {
        // Connection successful, add the server
        onAddServer(serverData)
        onOpenChange(false)
        resetForm()
      } else {
        // Connection failed, show error
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

  const resetForm = () => {
    setFormData({
      name: "",
      host: "",
      port: 5432,
      database: "",
      username: "",
      password: "",
      sslMode: "prefer",
    })
    setConnectionString("")
    setTestResult(null)
  }

  

  const isFormValid =
    (activeTab === "credentials"
      ? formData.name && formData.host && formData.database && formData.username && formData.password
      : !!connectionString)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Database</DialogTitle>
         
        </DialogHeader>
        {/* Server Name field always visible */}
        <div className="mb-4">
          <Label htmlFor="name">Database Name</Label>
          <Input
            className="mt-[5px]"
            id="name"
            placeholder="My PostgreSQL Database"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="mb-4">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="credentials">User Credentials</TabsTrigger>
            <TabsTrigger value="connectionString">Connection String</TabsTrigger>
          </TabsList>
          <TabsContent value="credentials">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Label htmlFor="host">Host/IP Address</Label>
                    <Input
                      className="mt-[5px]"
                      id="host"
                      placeholder="localhost"
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="port">Port</Label>
                    <Input
                      className="mt-[5px]"
                      id="port"
                      type="number"
                      placeholder="5432"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: Number.parseInt(e.target.value) || 5432 })}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="database">Database Name</Label>
                  <Input
                    className="mt-[5px]"
                    id="database"
                    placeholder="postgres"
                    value={formData.database}
                    onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      className="mt-[5px]"
                      id="username"
                      placeholder="postgres"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      className="mt-[5px]"
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="ssl-mode"
                    checked={formData.sslMode === "require"}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, sslMode: checked ? "require" : "disable" })
                    }
                  />
                  <Label htmlFor="ssl-mode">Use SSL</Label>
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
                <Button type="submit" disabled={!isFormValid || testing} className="bg-green-600 hover:bg-green-700">
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing & Adding...
                    </>
                  ) : (
                    "Test & Add Database"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
          <TabsContent value="connectionString">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                {/* Server Name field for connection string mode (hidden, but value is always set above) */}
                <div className="grid gap-2">
                  <Label htmlFor="connectionString">Connection String</Label>
                  <Input
                    className="mt-[5px]"
                    id="connectionString"
                    placeholder="postgres://user:pass@host:port/dbname?sslmode=prefer"
                    value={connectionString}
                    onChange={e => setConnectionString(e.target.value)}
                    required
                  />
                </div>
                {/* Preview parsed values */}
                {parsedPreview && Object.keys(parsedPreview).length > 0 && (
                  <div className="p-3 bg-muted/30 rounded-md border">
                    <Label className="text-sm font-medium mb-2 block">Parsed Values:</Label>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {parsedPreview.host && (
                        <div><span className="font-medium">Host:</span> {parsedPreview.host}</div>
                      )}
                      {parsedPreview.port && (
                        <div><span className="font-medium">Port:</span> {parsedPreview.port}</div>
                      )}
                      {parsedPreview.database && (
                        <div><span className="font-medium">Database:</span> {parsedPreview.database}</div>
                      )}
                      {parsedPreview.username && (
                        <div><span className="font-medium">Username:</span> {parsedPreview.username}</div>
                      )}
                      {parsedPreview.password && (
                        <div><span className="font-medium">Password:</span> ••••••••</div>
                      )}
                      {parsedPreview.sslMode && (
                        <div><span className="font-medium">SSL Mode:</span> {parsedPreview.sslMode}</div>
                      )}
                    </div>
                  </div>
                )}
                
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
                <Button type="submit" disabled={!isFormValid || testing} className="bg-green-600 hover:bg-green-700">
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing & Adding...
                    </>
                  ) : (
                    "Test & Add Database"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
