"use client"

import { useState, useEffect } from "react"
import type { SavedQuery } from "@/types/query"

const STORAGE_KEY = "postgres-manager-saved-queries"

export function useSavedQueries() {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const queries = JSON.parse(stored).map((query: any) => ({
          ...query,
          createdAt: new Date(query.createdAt),
          lastModified: new Date(query.lastModified),
        }))
        setSavedQueries(queries)
      }
    } catch (error) {
      console.error("Failed to load saved queries:", error)
    }
  }, [])

  const saveQuery = (name: string, content: string, category?: SavedQuery["category"]) => {
    const newQuery: SavedQuery = {
      id: crypto.randomUUID(),
      name,
      content,
      createdAt: new Date(),
      lastModified: new Date(),
      category,
    }

    const updatedQueries = [...savedQueries, newQuery]
    setSavedQueries(updatedQueries)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueries))
    return newQuery
  }

  const updateQuery = (id: string, name: string, content: string, category?: SavedQuery["category"]) => {
    const updatedQueries = savedQueries.map((query) =>
      query.id === id ? { ...query, name, content, category, lastModified: new Date() } : query,
    )
    setSavedQueries(updatedQueries)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueries))
  }

  const deleteQuery = (id: string) => {
    const updatedQueries = savedQueries.filter((query) => query.id !== id)
    setSavedQueries(updatedQueries)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedQueries))
  }

  return {
    savedQueries,
    saveQuery,
    updateQuery,
    deleteQuery,
  }
}
