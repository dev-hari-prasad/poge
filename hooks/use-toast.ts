"use client"

// Wrapper around Sonner to maintain compatibility with existing toast API
import { toast as sonnerToast } from "sonner"
import type React from "react"

type ToastOptions = {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive" | "success" | "warning" | "info"
  duration?: number
  action?: React.ReactNode
}

function toast({ title, description, variant = "default", duration, action }: ToastOptions) {
  const message = title || description || ""
  const descriptionText = title && description ? String(description) : undefined

  // Map variant to Sonner's toast types
  switch (variant) {
    case "destructive":
      return sonnerToast.error(String(message), {
        description: descriptionText,
        duration,
        action,
      })
    case "success":
      return sonnerToast.success(String(message), {
        description: descriptionText,
        duration,
        action,
      })
    case "warning":
      return sonnerToast.warning(String(message), {
        description: descriptionText,
        duration,
        action,
      })
    case "info":
      return sonnerToast.info(String(message), {
        description: descriptionText,
        duration,
        action,
      })
    default:
      return sonnerToast(String(message), {
        description: descriptionText,
        duration,
        action,
      })
  }
}

// Maintain compatibility - return a hook-like object
function useToast() {
  return {
    toast,
    dismiss: (toastId?: string | number) => {
      if (toastId) {
        sonnerToast.dismiss(toastId)
      } else {
        sonnerToast.dismiss()
      }
    },
    // For backwards compatibility
    toasts: [],
  }
}

export { useToast, toast }
