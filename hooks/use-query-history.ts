"use client"

import { useState, useEffect } from "react"
import type { QueryExecution } from "@/types/query"

const STORAGE_KEY = "postgres-manager-query-history"
const MAX_HISTORY_ITEMS = 100

export function useQueryHistory() {
  const [queryHistory, setQueryHistory] = useState<QueryExecution[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const history = JSON.parse(stored).map((execution: any) => ({
          ...execution,
          timestamp: new Date(execution.timestamp),
        }))
        setQueryHistory(history)
      }
    } catch (error) {
      console.error("Failed to load query history:", error)
    }
  }, [])

  const addToHistory = (execution: QueryExecution) => {
    const updatedHistory = [execution, ...queryHistory].slice(0, MAX_HISTORY_ITEMS)
    setQueryHistory(updatedHistory)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory))
  }

  const clearHistory = () => {
    setQueryHistory([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    queryHistory,
    addToHistory,
    clearHistory,
  }
}
