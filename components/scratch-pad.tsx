"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

interface ScratchPadProps {
  className?: string
}

export function ScratchPad({ className }: ScratchPadProps) {
  const storageKey = "postgres-manager-scratch-pad"
  const [text, setText] = useState<string>("")

  // Load once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved !== null) setText(saved)
    } catch {
      // ignore
    }
  }, [])

  // Persist immediately on change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, text)
    } catch {
      // ignore
    }
  }, [text])

  return (
    <div className={`flex h-full min-h-0 flex-col ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b px-2 h-[39px] bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground select-none">Scratch Pad</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setText("")}
          >
            Clear
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-full w-full resize-none p-2 font-mono text-sm outline-none bg-background text-foreground"
          placeholder="Quick notes..."
        />
      </div>
    </div>
  )
}


