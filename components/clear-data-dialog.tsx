"use client"

import type React from "react"

import { useState } from "react"
import { Trash2, AlertTriangle, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useSecurity } from "@/contexts/security-context"

interface ClearDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClearDataDialog({ open, onOpenChange }: ClearDataDialogProps) {
  const [pin, setPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [confirmationChecked, setConfirmationChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const { clearAllData } = useSecurity()

  const resetForm = () => {
    setPin("")
    setShowPin(false)
    setConfirmationChecked(false)
    setError("")
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!confirmationChecked) {
      setError("Please confirm that you understand this action cannot be undone")
      return
    }

    if (pin.length !== 6) {
      setError("PIN must be 6 digits")
      return
    }

    setLoading(true)
    setError("")

    try {
      const success = await clearAllData(pin)
      if (success) {
        // Data cleared successfully, app will reset
        window.location.reload()
      } else {
        setError("Invalid PIN. Please try again.")
        setPin("")
      }
    } catch (error) {
      setError("Failed to clear data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <DialogTitle className="text-center text-red-800">Clear All Data</DialogTitle>
          <DialogDescription className="text-center">
            This will permanently delete all your data including server connections, saved queries, and settings. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">⚠️ Data to be deleted:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• All server connections and credentials</li>
              <li>• Saved queries and query history</li>
              <li>• Application settings and preferences</li>
              <li>• Theme preferences</li>
              <li>• Security PIN and encryption keys</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-pin">Enter your PIN to confirm</Label>
            <div className="relative">
              <Input
                id="confirm-pin"
                type={showPin ? "text" : "password"}
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-lg tracking-widest pr-10"
                maxLength={6}
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setShowPin(!showPin)}
                disabled={loading}
              >
                {showPin ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="confirm-action"
              checked={confirmationChecked}
              onCheckedChange={(checked) => setConfirmationChecked(!!checked)}
              disabled={loading}
            />
            <Label htmlFor="confirm-action" className="text-sm leading-5">
              I understand that this action will permanently delete all my data and cannot be undone. I will need to set
              up the application again from scratch.
            </Label>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</div>}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={loading || !pin || !confirmationChecked}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Clearing Data...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Data
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
