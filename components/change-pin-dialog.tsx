"use client"

import type React from "react"

import { useState } from "react"
import { Key, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
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
import { useSecurity } from "@/contexts/security-context"
import { EncryptionService } from "@/utils/encryption"

interface ChangePinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePinDialog({ open, onOpenChange }: ChangePinDialogProps) {
  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [showPins, setShowPins] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const { changePin } = useSecurity()

  const resetForm = () => {
    setCurrentPin("")
    setNewPin("")
    setConfirmPin("")
    setError("")
    setSuccess(false)
    setShowPins(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  const generateSecurePin = () => {
    const securePin = EncryptionService.generateSecurePin()
    setNewPin(securePin)
    setConfirmPin(securePin)
  }

  const validateForm = () => {
    if (currentPin.length !== 6 || !/^\d{6}$/.test(currentPin)) {
      setError("Current PIN must be 6 digits")
      return false
    }
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setError("New PIN must be 6 digits")
      return false
    }
    if (newPin !== confirmPin) {
      setError("New PINs do not match")
      return false
    }
    if (currentPin === newPin) {
      setError("New PIN must be different from current PIN")
      return false
    }
    setError("")
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    try {
      const success = await changePin(currentPin, newPin)
      if (success) {
        setSuccess(true)
        setTimeout(() => {
          handleOpenChange(false)
        }, 2000)
      } else {
        setError("Current PIN is incorrect")
      }
    } catch (error) {
      setError("Failed to change PIN. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-center">PIN Changed Successfully</DialogTitle>
            <DialogDescription className="text-center">
              Your security PIN has been updated and all data has been re-encrypted.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Security PIN
          </DialogTitle>
          <DialogDescription>
            Enter your current PIN and choose a new 6-digit PIN. All your data will be re-encrypted with the new PIN.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="current-pin" className="text-sm font-medium">Current PIN</Label>
            <div className="relative">
              <Input
                id="current-pin"
                type={showPins ? "text" : "password"}
                placeholder="••••••"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-lg tracking-widest pr-10 h-12"
                maxLength={6}
                disabled={loading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setShowPins(!showPins)}
                disabled={loading}
              >
                {showPins ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="new-pin" className="text-sm font-medium">New PIN</Label>
            <Input
              id="new-pin"
              type={showPins ? "text" : "password"}
              placeholder="••••••"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center text-lg tracking-widest h-12"
              maxLength={6}
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="confirm-new-pin" className="text-sm font-medium">Confirm New PIN</Label>
            <Input
              id="confirm-new-pin"
              type={showPins ? "text" : "password"}
              placeholder="••••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center text-lg tracking-widest h-12"
              maxLength={6}
              disabled={loading}
            />
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={generateSecurePin}
              className="w-full bg-transparent h-10"
              disabled={loading}
            >
              Generate Secure PIN
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md mt-4">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="pt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !currentPin || !newPin || !confirmPin}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Changing PIN..." : "Change PIN"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
