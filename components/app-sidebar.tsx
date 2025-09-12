"use client"

import { Database, Play, Server, Settings, TreePine, Sun, Moon, Monitor, Lock, FileText, Shapes, Shield, ChevronRight, PanelRightOpen, Plus } from "lucide-react"
import Image from "next/image"
import { HugeiconsIcon, CloudServerIcon, TableIcon, SearchList01Icon, Tree01Icon } from "hugeicons-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
// Note: DatabaseTree is rendered inside Table Viewer and Schema Manager pages
// keeping the sidebar lean.
// import { DatabaseTree } from "@/components/database-tree"
import { useServerStorage } from "@/hooks/use-server-storage"
import { useSecurity } from "@/contexts/security-context"
import { Button } from "@/components/ui/button"
import type { ViewMode } from "@/components/postgres-manager"

interface AppSidebarProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
}

const mainMenuItems = [
  {
    id: "servers" as ViewMode,
    title: "Databases",
    icon: CloudServerIcon,
  },
  {
    id: "query-tool" as ViewMode,
    title: "Query Tool",
    icon: SearchList01Icon,
  },
  {
    id: "table-viewer" as ViewMode,
    title: "Table Viewer",
    icon: TableIcon,
  },
  {
    id: "schema-manager" as ViewMode,
    title: "Schema Manager",
    icon: Tree01Icon,
  },
  // Removed Integrations item
  {
    id: "notes" as ViewMode,
    title: "Notes",
    icon: FileText,
  },
]

const settingsItem = {
  id: "settings" as ViewMode,
  title: "Settings",
  icon: Settings,
}

export function AppSidebar({ currentView, onViewChange }: AppSidebarProps) {
  const navigateToView = (view: ViewMode) => {
    // Use state-based navigation instead of window.location.href
    onViewChange(view)
  }
  const { servers } = useServerStorage()
  const { theme, toggleTheme, resetSessionTimer, logout } = useSecurity()
  const { state } = useSidebar()
  const connectedServers = servers.filter((server) => server.connected)
  const isCollapsed = state === "collapsed"

  // Reset session timer on any interaction
  const handleInteraction = () => {
    resetSessionTimer()
  }

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-4 w-4" />
      case "dark":
        return <Moon className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  return (
    <Sidebar className="border-r group/sidebar" collapsible="icon" onClick={handleInteraction}>
      <SidebarHeader className="border-b">
        <div className={`flex items-center justify-between ${isCollapsed ? "px-2" : "px-2"} h-[39px]`}>
          <div className="flex items-center gap-2">
            {isCollapsed ? (
              <div className="relative">
                <Image src="/Pogo Brand mark.png" alt="Pogo" width={28} height={28} className="h-7 w-7 object-contain" />
              </div>
            ) : (
              <>
                <Image src="/Pogo Brand mark.png" alt="Pogo" width={28} height={28} className="h-7 w-7 object-contain" />
                <div className="flex flex-col">
                  <span className="font-semibold text-lg">Poge</span>
                  {/* <span className="text-[12px] mb-0 text-muted-foreground">Database Administration</span> */}
                </div>
              </>
            )}
          </div>
          {!isCollapsed && <SidebarTrigger className="h-6 w-6 p-0" />}
        </div>
        
        {/* Separate expand button overlay for collapsed sidebar */}
        {isCollapsed && (
          <div className="absolute top-[8px] left-0 w-full h-[39px] flex items-center justify-center pointer-events-none group/sidebar">
            <SidebarTrigger className="h-7 w-7 p-0 bg-background hover:bg-accent rounded flex items-center justify-center pointer-events-auto opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
              <Plus className="h-5 w-5" />
            </SidebarTrigger>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className="flex flex-col h-full">
        {/* Main Navigation */}
        <SidebarGroup className="pt-3">
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.id === currentView}
                    className={item.id === currentView ? "bg-green-50 text-green-700 hover:bg-green-100" : ""}
                    tooltip={item.title}
                  >
                    <button
                      onClick={() => navigateToView(item.id)}
                    >
                      <item.icon className="h-7 w-7" />
                      {!isCollapsed && (
                        <span className="flex items-center gap-1">
                          {item.title}
                        </span>
                      )}
                      {!isCollapsed && item.soon && false && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-muted-foreground/20">Coming Soon</span>
                      )}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dynamic Content */}
        {/* Intentionally not showing DatabaseTree here for table viewer; it renders inside the Table Viewer page now. */}

        {false && isCollapsed && currentView === "schema-manager" && connectedServers.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Schema Objects</SidebarGroupLabel>
            <SidebarGroupContent>
              {/* Tree is rendered inside Schema Manager page now */}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Settings at the bottom */}
        <div className="flex-1" />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Settings Item */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={settingsItem.id === currentView}
                  className={settingsItem.id === currentView ? "bg-green-50 text-green-700 hover:bg-green-100" : ""}
                  tooltip={settingsItem.title}
                >
                  <button
                    onClick={() => navigateToView(settingsItem.id)}
                    className="flex items-center justify-between w-full"
                  >
                    <div className="flex items-center gap-2">
                      <settingsItem.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{settingsItem.title}</span>}
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              console.log("Lock button clicked")
                              logout()
                            }}
                            className="h-6 w-6 p-0 hover:bg-accent rounded flex items-center justify-center cursor-pointer"
                          >
                            <Lock className="h-4 w-4" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Lock App</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
