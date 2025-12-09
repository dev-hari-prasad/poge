"use client"

import { useSecurity } from "@/contexts/security-context"
import { PostgresManager } from "@/components/postgres-manager"
import { Toaster } from "@/components/ui/sonner"
import { FirstTimeSetup } from "@/components/first-time-setup"
import { PinEntry } from "@/components/pin-entry"
import { useEffect, useState } from "react"
import { usePageTitle } from "@/hooks/use-page-title"

function SettingsContent() {
  const { isAuthenticated, isFirstTimeSetup, isLoading } = useSecurity()
  
  usePageTitle("Settings")

  // Get initial tab from URL parameters
  const [initialTab, setInitialTab] = useState<"general" | "security" | "appearance" | "data" | "feedback" | "about">("general")
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const tab = urlParams.get('tab') as "general" | "security" | "appearance" | "data" | "feedback" | "about"
      if (tab && ["general", "security", "appearance", "data", "feedback", "about"].includes(tab)) {
        setInitialTab(tab)
      }
    }
  }, [])

  // Show loading state while checking storage
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  if (isFirstTimeSetup) {
    return <FirstTimeSetup />
  }

  if (!isAuthenticated) {
    return <PinEntry />
  }

  return <PostgresManager initialView="settings" settingsInitialTab={initialTab} />
}

export default function SettingsPage() {
  return (
    <>
      <SettingsContent />
      <Toaster />
    </>
  )
}
