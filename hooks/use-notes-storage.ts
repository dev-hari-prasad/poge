"use client"

import { useState, useEffect } from "react"

export interface Note {
  id: string
  title: string
  content: string
  createdAt: Date
  lastModified: Date
  pinned?: boolean
}

const STORAGE_KEY = "postgres-manager-notes"

export function useNotesStorage() {
  const [notes, setNotes] = useState<Note[]>([])

  // Load notes from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedNotes = JSON.parse(stored).map((note: any) => ({
          ...note,
          createdAt: new Date(note.createdAt),
          lastModified: new Date(note.lastModified),
          pinned: note.pinned ?? false,
        })) as Note[]
        // Ensure a consistent sort order on load
        setNotes(sortNotes(parsedNotes))
      }
    } catch (error) {
      console.error("Failed to load notes from localStorage:", error)
    }
  }, [])

  // Save notes to localStorage whenever notes change
  const saveNotes = (newNotes: Note[]) => {
    try {
      const sorted = sortNotes(newNotes)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted))
      setNotes(sorted)
    } catch (error) {
      console.error("Failed to save notes to localStorage:", error)
    }
  }

  const sortNotes = (list: Note[]) =>
    [...list].sort((a, b) => {
      const aPinned = a.pinned ? 1 : 0
      const bPinned = b.pinned ? 1 : 0
      if (aPinned !== bPinned) return bPinned - aPinned
      return b.lastModified.getTime() - a.lastModified.getTime()
    })

  const addNote = (title: string, content: string = "") => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title,
      content,
      createdAt: new Date(),
      lastModified: new Date(),
      pinned: false,
    }
    const updatedNotes = [newNote, ...notes]
    saveNotes(updatedNotes)
    return newNote
  }

  const updateNote = (id: string, title: string, content: string) => {
    const updatedNotes = notes.map((note) =>
      note.id === id ? { ...note, title, content, lastModified: new Date() } : note
    )
    saveNotes(updatedNotes)
  }

  const deleteNote = (id: string) => {
    const updatedNotes = notes.filter((note) => note.id !== id)
    saveNotes(updatedNotes)
  }

  const togglePinned = (id: string) => {
    const updatedNotes = notes.map((note) =>
      note.id === id ? { ...note, pinned: !note.pinned } : note
    )
    saveNotes(updatedNotes)
  }

  const exportNotes = () => {
    try {
      const serialized = JSON.stringify(notes)
      return serialized
    } catch (error) {
      console.error("Failed to export notes:", error)
      return "[]"
    }
  }

  const importNotes = (json: string) => {
    try {
      const imported = (JSON.parse(json) as any[]).map((n) => ({
        id: n.id ?? crypto.randomUUID(),
        title: String(n.title ?? "Untitled"),
        content: String(n.content ?? ""),
        createdAt: new Date(n.createdAt ?? Date.now()),
        lastModified: new Date(n.lastModified ?? Date.now()),
        pinned: Boolean(n.pinned ?? false),
      })) as Note[]
      saveNotes([...
        imported,
      ])
    } catch (error) {
      console.error("Failed to import notes:", error)
    }
  }

  return {
    notes,
    addNote,
    updateNote,
    deleteNote,
    togglePinned,
    exportNotes,
    importNotes,
  }
}