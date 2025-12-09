"use client"

import {
  CircleStackIcon,
  PlayIcon,
  ServerIcon,
  Cog6ToothIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  LockClosedIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  PlusIcon,
  TableCellsIcon,
  CommandLineIcon,
  FolderIcon,
  QuestionMarkCircleIcon
} from "@heroicons/react/24/outline"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
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
// Note: DatabaseTree is rendered inside Table Viewer page
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
    icon: ServerIcon,
  },
  {
    id: "query-tool" as ViewMode,
    title: "Query Tool",
    icon: CommandLineIcon,
  },
  {
    id: "table-viewer" as ViewMode,
    title: "Table Viewer",
    icon: TableCellsIcon,
  },
  // Removed Integrations item
  {
    id: "notes" as ViewMode,
    title: "Notes",
    icon: DocumentTextIcon,
  },
]

const settingsItem = {
  id: "settings" as ViewMode,
  title: "Settings",
  icon: Cog6ToothIcon,
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

  // Refs for tracking active indicator position
  const menuItemRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [mainIndicatorStyle, setMainIndicatorStyle] = useState<{ top: number; height: number; opacity: number }>({
    top: 0,
    height: 0,
    opacity: 0
  })
  const [settingsIndicatorStyle, setSettingsIndicatorStyle] = useState<{ top: number; height: number; opacity: number }>({
    top: 0,
    height: 0,
    opacity: 0
  })

  // Update indicator position when currentView changes
  useEffect(() => {
    if (isCollapsed) {
      setMainIndicatorStyle({ top: 0, height: 0, opacity: 0 })
      setSettingsIndicatorStyle({ top: 0, height: 0, opacity: 0 })
      return
    }

    const activeItem = menuItemRefs.current[currentView]
    if (activeItem) {
      const menuContainer = activeItem.closest('[data-sidebar="menu"]')
      if (menuContainer) {
        const containerRect = menuContainer.getBoundingClientRect()
        const itemRect = activeItem.getBoundingClientRect()
        const top = itemRect.top - containerRect.top
        const height = itemRect.height

        const isSettings = currentView === settingsItem.id
        if (isSettings) {
          setSettingsIndicatorStyle({ top, height, opacity: 1 })
          setMainIndicatorStyle({ top: 0, height: 0, opacity: 0 })
        } else {
          setMainIndicatorStyle({ top, height, opacity: 1 })
          setSettingsIndicatorStyle({ top: 0, height: 0, opacity: 0 })
        }
      }
    } else {
      setMainIndicatorStyle({ top: 0, height: 0, opacity: 0 })
      setSettingsIndicatorStyle({ top: 0, height: 0, opacity: 0 })
    }
  }, [currentView, isCollapsed])

  // Reset session timer on any interaction
  const handleInteraction = () => {
    resetSessionTimer()
  }

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <SunIcon className="h-4 w-4" />
      case "dark":
        return <MoonIcon className="h-4 w-4" />
      default:
        return <ComputerDesktopIcon className="h-4 w-4" />
    }
  }

  return (
    <Sidebar className="border-r border-sidebar-border group/sidebar" collapsible="icon" onClick={handleInteraction}>
      <SidebarHeader className="border-b border-sidebar-border">
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
                  <span className="font-semibold text-lg text-foreground">Poge</span>
                  {/* <span className="text-[12px] mb-0 text-muted-foreground">Database Administration</span> */}
                </div>
              </>
            )}
          </div>
          {!isCollapsed && <SidebarTrigger className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" />}
        </div>

        {/* Separate expand button overlay for collapsed sidebar */}
        {isCollapsed && (
          <div className="absolute top-[8px] left-0 w-full h-[39px] flex items-center justify-center pointer-events-none group/sidebar">
            <SidebarTrigger className="h-7 w-7 p-0 bg-background hover:bg-accent text-muted-foreground hover:text-foreground rounded flex items-center justify-center pointer-events-auto opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
              <PlusIcon className="h-5 w-5" />
            </SidebarTrigger>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className="flex flex-col h-full">
        {/* Main Navigation */}
        <SidebarGroup className="pt-3">
          <SidebarGroupContent>
            <SidebarMenu className="relative">
              {/* Animated active indicator */}
              {!isCollapsed && (
                <div
                  className="absolute left-0 w-0.5 bg-primary transition-all duration-300 ease-out rounded-r z-10"
                  style={{
                    top: `${mainIndicatorStyle.top}px`,
                    height: `${mainIndicatorStyle.height}px`,
                    opacity: mainIndicatorStyle.opacity,
                  }}
                />
              )}
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={item.id === currentView}
                    className={item.id === currentView
                      ? "bg-primary/10 text-primary font-bold pl-2 relative"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}
                    tooltip={item.title}
                  >
                    <button
                      ref={(el) => {
                        menuItemRefs.current[item.id] = el
                      }}
                      onClick={() => navigateToView(item.id)}
                    >
                      <item.icon className="h-5 w-5" />
                      {!isCollapsed && (
                        <span className="flex items-center gap-1">
                          {item.title}
                        </span>
                      )}
                      {!isCollapsed && false && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-muted-foreground/20">Coming Soon</span>
                      )}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  tooltip="Report Issue"
                >
                  <button
                    onClick={() => window.open("https://github.com/dev-hari-prasad/poge/issues", "_blank")}
                  >
                    <QuestionMarkCircleIcon className="h-5 w-5" />
                    {!isCollapsed && (
                      <span className="flex items-center gap-1">
                        Report Issue
                      </span>
                    )}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dynamic Content */}
        {/* Intentionally not showing DatabaseTree here for table viewer; it renders inside the Table Viewer page now. */}


        {/* Settings at the bottom */}
        <div className="flex-1" />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="relative">
              {/* Animated active indicator for settings */}
              {!isCollapsed && (
                <div
                  className="absolute left-0 w-0.5 bg-primary transition-all duration-300 ease-out rounded-r z-10"
                  style={{
                    top: `${settingsIndicatorStyle.top}px`,
                    height: `${settingsIndicatorStyle.height}px`,
                    opacity: settingsIndicatorStyle.opacity,
                  }}
                />
              )}
              {/* Settings Item */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={settingsItem.id === currentView}
                  className={settingsItem.id === currentView
                    ? "bg-primary/10 text-primary font-bold pl-2 relative"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}
                  tooltip={settingsItem.title}
                >
                  <button
                    ref={(el) => {
                      menuItemRefs.current[settingsItem.id] = el
                    }}
                    onClick={() => navigateToView(settingsItem.id)}
                    className="flex items-center justify-between w-full"
                  >
                    <div className="flex items-center gap-2">
                      <settingsItem.icon className="h-5 w-5" />
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
                            className="h-6 w-6 p-0 hover:bg-accent text-muted-foreground hover:text-foreground rounded flex items-center justify-center cursor-pointer"
                          >
                            <LockClosedIcon className="h-4 w-4" />
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
