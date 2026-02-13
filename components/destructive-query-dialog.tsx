"use client"

import { AlertTriangle } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { getDestructiveActionMessage } from "@/lib/detect-destructive-query"
import { useState } from "react"

interface DestructiveQueryDialogProps {
  open: boolean
  action?: string
  objectType?: string
  message?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function DestructiveQueryDialog({
  open,
  action = "Unknown",
  objectType = "",
  message = "Confirm this action",
  onConfirm,
  onCancel,
  isLoading = false,
}: DestructiveQueryDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  const handleConfirm = () => {
    onConfirm()
  }

  const detailedMessage = getDestructiveActionMessage(action, objectType)

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen: boolean) => {
      if (!nextOpen && !isLoading && !isConfirming) {
        onCancel()
      }
    }}>
      <AlertDialogContent className="sm:max-w-[420px]">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <AlertDialogTitle className="text-lg">
                Confirm {action} Operation
              </AlertDialogTitle>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogDescription className="text-sm space-y-2">
          <p>{detailedMessage}</p>
          <p className="text-xs text-muted-foreground">You cannot undo this action.</p>
        </AlertDialogDescription>
        <div className="flex gap-2 justify-end pt-4">
          <AlertDialogCancel disabled={isLoading || isConfirming}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading || isConfirming}
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Confirm & Execute
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
