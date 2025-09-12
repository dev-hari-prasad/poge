"use client"

import { useEffect, useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ServerManagement } from "@/components/server-management"
import { TableViewer } from "@/components/table-viewer"
import { QueryTool } from "@/components/query-tool"
import { SchemaManager } from "@/components/schema-manager"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useSecurity } from "@/contexts/security-context"
import { Settings } from "@/components/settings"
import { Notes } from "@/components/notes"
import { ScreenSizeOverlay } from "@/components/screen-size-overlay"
import { TableSelectionProvider } from "@/contexts/table-selection-context"
// Integrations and Governance removed
import { usePageTitle } from "@/hooks/use-page-title"

export type ViewMode = "servers" | "table-viewer" | "query-tool" | "schema-manager" | "notes" | "settings"

interface PostgresManagerProps {
  initialView?: ViewMode
  settingsInitialTab?: "general" | "security" | "appearance" | "data" | "about"
}

export function PostgresManager({ initialView = "servers", settingsInitialTab = "general" }: PostgresManagerProps) {
  const [currentView, setCurrentView] = useState<ViewMode>(initialView)
  const { resetSessionTimer } = useSecurity()
  const [currentSettingsTab, setCurrentSettingsTab] = useState<"general" | "security" | "appearance" | "data" | "about">(settingsInitialTab)
  
  // Sidebar state management with localStorage persistence
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("postgres-manager-sidebar-open")
      return stored !== null ? JSON.parse(stored) : true
    } catch {
      return true
    }
  })

  // Persist sidebar state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("postgres-manager-sidebar-open", JSON.stringify(sidebarOpen))
    } catch {}
  }, [sidebarOpen])

  // Set page title based on current view
  const getPageTitle = (view: ViewMode) => {
    switch (view) {
      case "servers":
        return "Manage your database"
      case "table-viewer":
        return "Table Viewer"
      case "query-tool":
        return "Query Tool"
      case "schema-manager":
        return "Schema Manager"
      case "notes":
        return "Notes"
      case "settings":
        return "Settings"
      default:
        return "Manage your database"
    }
  }

  usePageTitle(getPageTitle(currentView))

  const renderContent = () => {
    switch (currentView) {
      case "servers":
        return <ServerManagement onViewChange={setCurrentView} />
      case "table-viewer":
        return <TableViewer />
      case "query-tool":
        return <QueryTool />
      case "schema-manager":
        return <SchemaManager />
      case "notes":
        return <Notes />
      case "settings":
        return <Settings initialTab={currentSettingsTab} />
      default:
        return <ServerManagement onViewChange={setCurrentView} />
    }
  }

  
  // Reset session timer on any interaction
  const handleInteraction = () => {
    resetSessionTimer()
  }

  // Removed feedback launcher listeners

  return (
    <ScreenSizeOverlay>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <TableSelectionProvider>
          <div className="flex min-h-screen w-full overflow-hidden" onClick={handleInteraction} onKeyDown={handleInteraction}>
            <AppSidebar currentView={currentView} onViewChange={setCurrentView as (view: any) => void} />
            <SidebarInset className="overflow-hidden">{renderContent()}</SidebarInset>
          </div>
        </TableSelectionProvider>
      </SidebarProvider>
    </ScreenSizeOverlay>
  )
}
