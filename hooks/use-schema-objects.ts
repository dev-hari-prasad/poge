"use client"

import { useState, useEffect, useCallback } from "react"
import { MockSchemaService } from "@/services/mock-schema-service"
import type { DatabaseObject } from "@/types/schema"

export function useSchemaObjects(serverId: string) {
  const [objects, setObjects] = useState<DatabaseObject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshObjects = useCallback(async () => {
    if (!serverId) return

    setLoading(true)
    setError(null)

    try {
      const data = await MockSchemaService.getDatabaseObjects(serverId)
      setObjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schema objects")
    } finally {
      setLoading(false)
    }
  }, [serverId])

  useEffect(() => {
    refreshObjects()
  }, [refreshObjects])

  return {
    objects,
    loading,
    error,
    refreshObjects,
  }
}
