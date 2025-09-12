"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle } from "lucide-react"
import type { ServerConnection } from "@/types/server"

interface DeleteServerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  server: ServerConnection
  onDeleteServer: (id: string) => void
}

export function DeleteServerDialog({ open, onOpenChange, server, onDeleteServer }: DeleteServerDialogProps) {
  const handleDelete = () => {
    onDeleteServer(server.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <DialogTitle>Delete Server</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to delete the server connection "{server.name}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="text-sm text-red-800">
            <div className="font-medium">Server Details:</div>
            <div>Name: {server.name}</div>
            <div>
              Host: {server.host}:{server.port}
            </div>
            <div>Database: {server.database}</div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete}>
            Delete Server
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
