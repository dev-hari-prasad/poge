"use client"

import { useState, useEffect } from "react"
import { Clock, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { useSecurity } from "@/contexts/security-context"

export function SessionTimeoutWarning() {
  const { sessionTimeLeft, resetSessionTimer, logout } = useSecurity()
  const [showWarning, setShowWarning] = useState(false)

  const WARNING_THRESHOLD = 10 * 1000 // Show warning 10 seconds before timeout

  useEffect(() => {
    if (sessionTimeLeft > 0 && sessionTimeLeft <= WARNING_THRESHOLD && !showWarning) {
      setShowWarning(true)
    } else if (sessionTimeLeft > WARNING_THRESHOLD && showWarning) {
      setShowWarning(false)
    }
  }, [sessionTimeLeft, showWarning])

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const getProgressValue = () => {
    return Math.max(0, (sessionTimeLeft / WARNING_THRESHOLD) * 100)
  }

  const handleExtendSession = () => {
    resetSessionTimer()
    setShowWarning(false)
  }

  const handleLogout = () => {
    logout()
    setShowWarning(false)
  }

  if (!showWarning || sessionTimeLeft <= 0) {
    return null
  }

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <DialogTitle className="text-center">Session Timeout Warning</DialogTitle>
          <DialogDescription className="text-center">
            Your session will expire soon due to inactivity. The application will automatically lock to protect your
            data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-yellow-600 mb-2">{formatTime(sessionTimeLeft)}</div>
            <p className="text-sm text-muted-foreground">Time remaining</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Session Progress</span>
              <span>{Math.round(getProgressValue())}%</span>
            </div>
            <Progress value={getProgressValue()} className="h-2" />
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Security Feature</p>
                <p>Automatic session timeout helps protect your data when you're away from your device.</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleLogout}>
            Lock Now
          </Button>
          <Button onClick={handleExtendSession} className="bg-green-600 hover:bg-green-700">
            Extend Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
