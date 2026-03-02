"use client"

import { useEffect, useRef } from "react"

export interface KeyboardShortcut {
  id: string
  keys: string[]
  label: string
  handler: () => void
}

export const isMacOS =
  typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

function matchesShortcut(e: KeyboardEvent, keys: string[]): boolean {
  const pressed = new Set<string>()
  if (e.ctrlKey) pressed.add("ctrl")
  if (e.metaKey) pressed.add("meta")
  if (e.altKey) pressed.add("alt")
  if (e.shiftKey) pressed.add("shift")
  pressed.add(e.key.toLowerCase())

  const expected = new Set(keys.map((k) => k.toLowerCase()))
  if (expected.size !== pressed.size) return false
  for (const k of expected) {
    if (!pressed.has(k)) return false
  }
  return true
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const ref = useRef(shortcuts)
  ref.current = shortcuts

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const s of ref.current) {
        if (matchesShortcut(e, s.keys)) {
          e.preventDefault()
          e.stopPropagation()
          s.handler()
          return
        }
      }
    }
    window.addEventListener("keydown", handler, true)
    return () => window.removeEventListener("keydown", handler, true)
  }, [])
}
