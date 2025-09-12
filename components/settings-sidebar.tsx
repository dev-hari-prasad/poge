"use client"

import React from "react"
import { 
  SettingsIcon, 
  Shield, 
  Palette, 
  Database, 
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SettingsSidebarProps {
  activeSection: string
  onSectionChange: (section: "general" | "security" | "appearance" | "data" | "about") => void
}

const settingsSections: Array<{
  id: "general" | "security" | "appearance" | "data" | "about"
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  {
    id: "general",
    label: "General Settings",
    icon: SettingsIcon
  },
  {
    id: "security",
    label: "Security",
    icon: Shield
  },
  {
    id: "appearance",
    label: "Theme & Appearance",
    icon: Palette
  },
  {
    id: "data",
    label: "Data Management",
    icon: Database
  },
  {
    id: "about",
    label: "About Poge",
    icon: Info
  }
]

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <div className="w-64 border-r bg-muted/30 h-full overflow-y-auto">
      <nav className="p-2">
        <ul className="space-y-1">
          {settingsSections.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            
            return (
              <li key={section.id}>
                <button
                  onClick={() => onSectionChange(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors hover:bg-muted/50",
                    isActive && "bg-primary/10 text-primary border border-primary/20"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-md",
                    isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{section.label}</div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t mt-auto">
        <div className="text-xs text-muted-foreground text-center">
          <div className="font-medium">Poge v0.2</div>
          <div>PostgreSQL Manager</div>
        </div>
      </div>
    </div>
  )
}
