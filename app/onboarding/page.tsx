"use client"

import { useSecurity } from "@/contexts/security-context"
import { FirstTimeSetup } from "@/components/first-time-setup"
import { PinEntry } from "@/components/pin-entry"
import { Toaster } from "@/components/ui/toaster"
import { usePageTitle } from "@/hooks/use-page-title"

function OnboardingContent() {
  const { isAuthenticated, isFirstTimeSetup, isLoading } = useSecurity()
  
  usePageTitle("Setup")

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

  // If authenticated and setup is complete, redirect to main app
  if (typeof window !== 'undefined') {
    window.location.href = '/'
  }

  return null
}

export default function OnboardingPage() {
  return (
    <>
      <OnboardingContent />
      <Toaster />
    </>
  )
}
