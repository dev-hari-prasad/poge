"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Cog6ToothIcon, ShieldCheckIcon, PaintBrushIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, InformationCircleIcon, KeyIcon, TrashIcon, CheckCircleIcon, SunIcon, MoonIcon, ComputerDesktopIcon, LockClosedIcon, CircleStackIcon, StarIcon } from "@heroicons/react/24/outline"
import { GitFork } from "lucide-react"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ChangePinDialog } from "@/components/change-pin-dialog"
import { ClearDataDialog } from "@/components/clear-data-dialog"
import { SessionTimeoutWarning } from "@/components/session-timeout-warning"

import { useSecurity } from "@/contexts/security-context"
import { useServerStorage } from "@/hooks/use-server-storage"
import { useSavedQueries } from "@/hooks/use-saved-queries"
import { useQueryHistory } from "@/hooks/use-query-history"
import { useToast } from "@/hooks/use-toast"
import EncryptionService from "@/utils/encryption"
// removed SupahubEmbed

interface SettingsProps {
  initialTab?: "general" | "security" | "appearance" | "data" | "about"
}

const PREFERENCES_STORAGE_KEY = "postgres-manager-preferences"

interface Preferences {
  defaultRowsPerPage: number
  queryTimeout: number
  autoSaveInterval: number
  connectionTimeout: number
}

const DEFAULT_PREFERENCES: Preferences = {
  defaultRowsPerPage: 50,
  queryTimeout: 30,
  autoSaveInterval: 5,
  connectionTimeout: 10,
}

export function Settings({ initialTab = "general" }: SettingsProps) {
  const { theme, setTheme, sessionTimeLeft, autoLockTimeout, setAutoLockTimeout, lockOnRefresh, setLockOnRefresh, logout } = useSecurity()
  const { servers, addServer, updateServer, deleteServer } = useServerStorage()
  const { savedQueries, saveQuery, updateQuery, deleteQuery } = useSavedQueries()
  const { queryHistory, addToHistory, clearHistory } = useQueryHistory()
  const { toast } = useToast()

  const [activeSection, setActiveSection] = useState(initialTab)
  const [showChangePinDialog, setShowChangePinDialog] = useState(false)
  const [showClearDataDialog, setShowClearDataDialog] = useState(false)
  const [exportPassword, setExportPassword] = useState("")
  const [importPassword, setImportPassword] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES)

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem(PREFERENCES_STORAGE_KEY)
      if (savedPreferences) {
        const parsed = JSON.parse(savedPreferences)
        // Validate and merge with defaults to ensure all keys exist
        setPreferences({
          defaultRowsPerPage: parsed.defaultRowsPerPage ?? DEFAULT_PREFERENCES.defaultRowsPerPage,
          queryTimeout: parsed.queryTimeout ?? DEFAULT_PREFERENCES.queryTimeout,
          autoSaveInterval: parsed.autoSaveInterval ?? DEFAULT_PREFERENCES.autoSaveInterval,
          connectionTimeout: parsed.connectionTimeout ?? DEFAULT_PREFERENCES.connectionTimeout,
        })
      }
    } catch (error) {
      console.error("Failed to load preferences:", error)
    }
  }, [])

  const savePreferences = () => {
    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
      toast({
        title: "Preferences Saved",
        description: "Your preferences have been saved successfully.",
        variant: "default",
      })
    } catch (error) {
      console.error("Failed to save preferences:", error)
      toast({
        title: "Save Failed",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatSessionTime = (ms: number) => {
    if (ms <= 0) return "Session expired"
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const getAutoLockLabel = (timeout: number) => {
    if (timeout === -1) return "Never"
    if (timeout === 0) return "When I lock"
    const minutes = timeout / (60 * 1000)
    if (minutes < 60) return `${minutes} minutes`
    return `${minutes / 60} hour${minutes / 60 > 1 ? "s" : ""}`
  }

  const exportAllData = async () => {
    if (!exportPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter a password to encrypt your exported data.",
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)
    try {
      // Prepare all data for export
      const exportData = {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        data: {
          servers: servers,
          savedQueries: savedQueries,
          queryHistory: queryHistory,
          settings: {
            preferences,
            theme,
            autoLockTimeout,
          },
        },
      }

      // Encrypt the data with the provided password
      const encryptedData = await EncryptionService.encrypt(JSON.stringify(exportData), exportPassword)

      // Create and download the file
      const blob = new Blob([encryptedData], { type: "application/octet-stream" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `postgresql-manager-backup-${new Date().toISOString().split("T")[0]}.enc`
      a.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: "All your data has been encrypted and exported successfully.",
        variant: "default",
      })

      setExportPassword("")
    } catch (error) {
      console.error("Export failed:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const importAllData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!importPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter the password used to encrypt this backup.",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    try {
      const fileContent = await file.text()

      // Decrypt the data
      const decryptedData = await EncryptionService.decrypt(fileContent, importPassword)
      const importData = JSON.parse(decryptedData)

      // Validate the import data structure
      if (!importData.data || !importData.version) {
        throw new Error("Invalid backup file format")
      }

      // Import servers
      if (importData.data.servers) {
        // Clear existing servers and add imported ones
        servers.forEach(server => deleteServer(server.id))
        importData.data.servers.forEach((server: any) => {
          addServer({
            name: server.name,
            host: server.host,
            port: server.port,
            database: server.database,
            username: server.username,
            password: server.password,
          })
        })
      }

      // Import saved queries
      if (importData.data.savedQueries) {
        // Clear existing queries and add imported ones
        savedQueries.forEach(query => deleteQuery(query.id))
        importData.data.savedQueries.forEach((query: any) => {
          saveQuery(query.name, query.content)
        })
      }

      // Import query history
      if (importData.data.queryHistory) {
        clearHistory()
        importData.data.queryHistory.forEach((execution: any) => {
          addToHistory(execution)
        })
      }

      // Import settings
      if (importData.data.settings) {
        if (importData.data.settings.preferences) {
          setPreferences(importData.data.settings.preferences)
        }
        if (importData.data.settings.theme) {
          setTheme(importData.data.settings.theme)
        }
        if (importData.data.settings.autoLockTimeout !== undefined) {
          setAutoLockTimeout(importData.data.settings.autoLockTimeout)
        }
      }

      toast({
        title: "Import Successful",
        description: "All your data has been imported successfully.",
        variant: "default",
      })

      try {
        // Ensure any stale UI lock is cleared after a full import
        localStorage.removeItem("postgres-manager-session-locked")
      } catch { }

      setImportPassword("")
      // Reset the file input
      event.target.value = ""
    } catch (error) {
      console.error("Import failed:", error)
      toast({
        title: "Import Failed",
        description: "Failed to import data. Please check your password and file format.",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const exportSettings = async () => {
    try {
      const settings = {
        preferences,
        theme,
        autoLockTimeout,
        exportDate: new Date().toISOString(),
        version: "1.0.0",
      }

      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `postgresql-manager-settings-${new Date().toISOString().split("T")[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export settings:", error)
    }
  }

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string)
        if (settings.preferences) setPreferences(settings.preferences)
        if (settings.theme) setTheme(settings.theme)
        if (settings.autoLockTimeout) setAutoLockTimeout(settings.autoLockTimeout)
      } catch (error) {
        console.error("Failed to import settings:", error)
      }
    }
    reader.readAsText(file)
  }

  const renderGeneralSettings = () => (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Cog6ToothIcon className="h-6 w-6 text-muted-foreground" />
        <h2 className="text-xl font-semibold">General Settings</h2>
      </div>
      <Card className="dark:bg-muted/60 dark:border">
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Rows Per Page</Label>
              <Select
                value={preferences.defaultRowsPerPage.toString()}
                onValueChange={(value) =>
                  setPreferences({ ...preferences, defaultRowsPerPage: Number.parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                  <SelectItem value="100">100 rows</SelectItem>
                  <SelectItem value="200">200 rows</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Query Timeout (seconds)</Label>
              <Input
                type="number"
                value={preferences.queryTimeout}
                onChange={(e) =>
                  setPreferences({ ...preferences, queryTimeout: Number.parseInt(e.target.value) || 30 })
                }
                min="5"
                max="300"
              />
            </div>

            <div className="space-y-2">
              <Label>Auto-save Interval (minutes)</Label>
              <Input
                type="number"
                value={preferences.autoSaveInterval}
                onChange={(e) =>
                  setPreferences({ ...preferences, autoSaveInterval: Number.parseInt(e.target.value) || 5 })
                }
                min="1"
                max="60"
              />
            </div>

            <div className="space-y-2">
              <Label>Connection Timeout (seconds)</Label>
              <Input
                type="number"
                value={preferences.connectionTimeout}
                onChange={(e) =>
                  setPreferences({ ...preferences, connectionTimeout: Number.parseInt(e.target.value) || 10 })
                }
                min="5"
                max="120"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button className="bg-green-600 hover:bg-green-700" onClick={savePreferences}>
              <CheckCircleIcon className="h-4 w-4 mr-0" />
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSecuritySettings = () => (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheckIcon className="h-6 w-6 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Security Settings</h2>
      </div>
      <Card className="dark:bg-muted/60 dark:border-muted-800">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Change Security PIN</h3>
                <p className="text-sm text-muted-foreground">Update your 6-digit security PIN</p>
              </div>
              <Button variant="outline" onClick={() => setShowChangePinDialog(true)}>
                <KeyIcon className="h-4 w-4 mr-0" />
                Change PIN
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Auto-lock Timeout</h3>
                <p className="text-sm text-muted-foreground">Automatically lock the app after inactivity</p>
              </div>
              <Select
                value={autoLockTimeout.toString()}
                onValueChange={(value) => setAutoLockTimeout(Number.parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="300000">5 minutes</SelectItem>
                  <SelectItem value="900000">15 minutes</SelectItem>
                  <SelectItem value="1800000">30 minutes</SelectItem>
                  <SelectItem value="3600000">1 hour</SelectItem>
                  <SelectItem value="7200000">2 hours</SelectItem>
                  <SelectItem value="-1">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Lock on Page Refresh</h3>
                <p className="text-sm text-muted-foreground">Automatically lock the app when the page is refreshed</p>
              </div>
              <Select
                value={lockOnRefresh ? "true" : "false"}
                onValueChange={(value) => setLockOnRefresh(value === "true")}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enabled</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
              <div>
                <h3 className="font-medium text-red-800 dark:text-red-200">Clear All Data</h3>
                <p className="text-sm text-red-600 dark:text-red-300">Permanently delete all application data (factory reset)</p>
              </div>
              <Button variant="destructive" onClick={() => setShowClearDataDialog(true)}>
                <TrashIcon className="h-4 w-4 mr-0" />
                Clear Data
              </Button>
            </div>
          </div>

          {/* <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg mt-6">
            <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-2">Security Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>All data encrypted with AES-256-GCM</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>PIN-based key derivation (PBKDF2)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>Auto-lock: {getAutoLockLabel(autoLockTimeout)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span>Lock on refresh: {lockOnRefresh ? "Enabled" : "Disabled"}</span>
              </div>
            </div>
          </div> */}
        </CardContent>
      </Card>
    </div>
  )

  const renderAppearanceSettings = () => (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <PaintBrushIcon className="h-6 w-6 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Theme & Apperance</h2>
      </div>
      <Card className="dark:bg-muted/60 dark:border-muted-800">
        <CardContent className="p-6">
          <div className="space-y-6">
            <div>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { value: "light", label: "Light", icon: SunIcon },
                  { value: "dark", label: "Dark", icon: MoonIcon },
                  { value: "system", label: "System", icon: ComputerDesktopIcon },
                ].map((option) => (
                  <Card
                    key={option.value}
                    className={`cursor-pointer transition-colors ${theme === option.value ? "ring-2 ring-green-600 bg-green-50 dark:bg-green-950" : "hover:bg-muted/50"
                      }`}
                    onClick={() => setTheme(option.value as any)}
                  >
                    <CardContent className="p-4 text-center">
                      <option.icon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <div className="font-medium">{option.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderDataManagement = () => (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <CircleStackIcon className="h-6 w-6 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Data Management</h2>
      </div>
      <Card className="dark:bg-muted/60 dark:border-muted-800">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Export and Import All Data Group */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Export All Data</h3>
                <p className="text-sm text-muted-foreground">Export servers, queries, history, and settings with encryption</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={exportPassword}
                  onChange={(e) => setExportPassword(e.target.value)}
                  className="w-48"
                />
                <Button
                  onClick={exportAllData}
                  disabled={isExporting || !exportPassword.trim()}
                  variant="outline"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                      Export
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Import All Data</h3>
                <p className="text-sm text-muted-foreground">Restore complete backup with password verification</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={importPassword}
                  onChange={(e) => setImportPassword(e.target.value)}
                  className="w-48"
                />
                <div>
                  <input
                    type="file"
                    accept=".enc"
                    onChange={importAllData}
                    className="hidden"
                    id="import-backup"
                  />
                  <Button
                    onClick={() => document.getElementById("import-backup")?.click()}
                    disabled={isImporting || !importPassword.trim()}
                    variant="outline"
                  >
                    {isImporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Importing...
                      </>
                    ) : (
                      <>
                        <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                        Import
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Export and Import Settings Group */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Export Settings</h3>
                <p className="text-sm text-muted-foreground">Download preferences and configuration only</p>
              </div>
              <Button variant="outline" onClick={exportSettings}>
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-medium">Import Settings</h3>
                <p className="text-sm text-muted-foreground">Restore preferences from a backup file</p>
              </div>
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={importSettings}
                  className="hidden"
                  id="import-settings"
                />
                <Button variant="outline" onClick={() => document.getElementById("import-settings")?.click()}>
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )



  // removed Feedback & Support section

  const renderAbout = () => (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <InformationCircleIcon className="h-6 w-6 text-muted-foreground" />
        <h2 className="text-xl font-semibold">About Poge</h2>
      </div>
      <Card className="dark:bg-muted/60 dark:border-muted-800">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <img
                src="/Pogo Brand mark.png"
                alt="Poge Logo"
                className="h-10 w-10 object-contain"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Poge</h2>
            </div>
          </div>

          <div className="w-full mt-6">
            <div className="font-mono text-base text-muted-foreground leading-relaxed text-center max-w-3xl mx-auto">
              <p>
                Poge is your quick database tool — for those moments when you just need to peek at tables, run a few queries, and get back to building awesome stuff. Skip the heavy tools (pgAdmin, DBeaver), skip the wait. Just open, connect, and you're off! 🚀
              </p>

            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mt-6">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open("https://github.com/dev-hari-prasad/poge", "_blank")}
            >
              <StarIcon className="h-4 w-4" />
              Star on GitHub
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open("https://github.com/dev-hari-prasad/poge/fork", "_blank")}
            >
              <GitFork className="h-4 w-4" />
              Fork on GitHub
            </Button>
          </div>

          <div className="text-center pt-4 border-t mt-6">
            <div className="flex items-center justify-center gap-3 px-8">
              <Badge className="border">Version 0.2.5</Badge>
              <Badge className="border">MIT License</Badge>
              <Badge className="border">Open Source</Badge>

            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderActiveSection = () => {
    switch (activeSection) {
      case "general":
        return renderGeneralSettings()
      case "security":
        return renderSecuritySettings()
      case "appearance":
        return renderAppearanceSettings()
      case "data":
        return renderDataManagement()
      case "about":
        return renderAbout()
      default:
        return renderGeneralSettings()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <div className="flex items-center gap-2">
          <Cog6ToothIcon className="h-5 w-5 text-green-600" />
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <Button variant="outline" size="default" onClick={logout}>
            <LockClosedIcon className="h-4 w-4 mr-0" />
            Lock App
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex gap-8">
            {/* Left Side Navigation */}
            <div className="w-64 shrink-0">
              <div className="bg-muted/30 rounded-lg border p-2">
                <nav>
                  <ul className="space-y-2">
                    {[
                      { id: "general", label: "General Settings", icon: Cog6ToothIcon },
                      { id: "appearance", label: "Theme", icon: PaintBrushIcon },
                      { id: "security", label: "Security", icon: ShieldCheckIcon },
                      { id: "data", label: "Data Management", icon: CircleStackIcon },
                      { id: "about", label: "About Poge", icon: InformationCircleIcon }
                    ].map((section) => {
                      const Icon = section.icon
                      const isActive = activeSection === section.id

                      return (
                        <li key={section.id}>
                          <button
                            onClick={() => setActiveSection(section.id as any)}
                            className={`w-full flex items-center gap-0 px-2 py-2 rounded-lg text-left transition-colors hover:bg-muted/50 relative ${isActive
                              ? "text-primary bg-muted/50"
                              : "text-muted-foreground hover:text-foreground"
                              }`}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="active-dash"
                                className="absolute left-0 top-[20%] w-0.5 h-3/5 bg-primary rounded-r z-10"
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              />
                            )}
                            <div className={`p-1.5 rounded-md ${isActive ? "text-primary" : "text-muted-foreground"
                              }`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-sm">{section.label}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              </div>
            </div>

            {/* Right Side Content */}
            <div className="flex-1 min-w-0">
              {renderActiveSection()}
            </div>
          </div>
        </div>
      </div>

      <ChangePinDialog open={showChangePinDialog} onOpenChange={setShowChangePinDialog} />
      <ClearDataDialog open={showClearDataDialog} onOpenChange={setShowClearDataDialog} />
      <SessionTimeoutWarning />
    </div>
  )
}

