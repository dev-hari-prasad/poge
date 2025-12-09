"use client"

import { useState, useEffect, useCallback } from "react"
import type { SavedQuery } from "@/types/query"

const STORAGE_KEY = "postgres-manager-saved-queries"

export function useSavedQueries() {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  // Load queries from localStorage
  const loadFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const queries = JSON.parse(stored).map((query: any) => ({
          ...query,
          createdAt: new Date(query.createdAt),
          lastModified: new Date(query.lastModified),
        }))
        setSavedQueries(queries)
      } else {
        setSavedQueries([])
      }
    } catch (error) {
      console.error("Failed to load saved queries:", error)
      setSavedQueries([])
    }
  }, [])

  // Initial load and refresh when key changes
  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage, refreshKey])

  // Refresh function to force reload from localStorage
  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  const saveQuery = useCallback((name: string, content: string, category?: SavedQuery["category"]) => {
    const newQuery: SavedQuery = {
      id: crypto.randomUUID(),
      name,
      content,
      createdAt: new Date(),
      lastModified: new Date(),
      category,
    }

    // Read current state from localStorage to avoid stale state issues
    let currentQueries: SavedQuery[] = []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        currentQueries = JSON.parse(stored).map((q: any) => ({
          ...q,
          createdAt: new Date(q.createdAt),
          lastModified: new Date(q.lastModified),
        }))
      }
    } catch {}

    const updatedQueries = [...currentQueries, newQuery]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueries))
    setSavedQueries(updatedQueries)
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('saved-queries-updated'))
    
    return newQuery
  }, [])

  const updateQuery = useCallback((id: string, name: string, content: string, category?: SavedQuery["category"]) => {
    // Read current state from localStorage
    let currentQueries: SavedQuery[] = []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        currentQueries = JSON.parse(stored).map((q: any) => ({
          ...q,
          createdAt: new Date(q.createdAt),
          lastModified: new Date(q.lastModified),
        }))
      }
    } catch {}

    const updatedQueries = currentQueries.map((query) =>
      query.id === id ? { ...query, name, content, category, lastModified: new Date() } : query,
    )
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueries))
    setSavedQueries(updatedQueries)
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('saved-queries-updated'))
  }, [])

  const deleteQuery = useCallback((id: string) => {
    // Read current state from localStorage
    let currentQueries: SavedQuery[] = []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        currentQueries = JSON.parse(stored).map((q: any) => ({
          ...q,
          createdAt: new Date(q.createdAt),
          lastModified: new Date(q.lastModified),
        }))
      }
    } catch {}

    const updatedQueries = currentQueries.filter((query) => query.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueries))
    setSavedQueries(updatedQueries)
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('saved-queries-updated'))
  }, [])

  // Listen for updates from other components
  useEffect(() => {
    const handleUpdate = () => {
      loadFromStorage()
    }
    window.addEventListener('saved-queries-updated', handleUpdate)
    return () => window.removeEventListener('saved-queries-updated', handleUpdate)
  }, [loadFromStorage])

  return {
    savedQueries,
    saveQuery,
    updateQuery,
    deleteQuery,
    refresh,
  }
}
