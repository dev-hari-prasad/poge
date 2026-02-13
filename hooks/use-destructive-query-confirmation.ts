"use client"

import { useState, useCallback } from 'react'
import { detectDestructiveQuery } from '@/lib/detect-destructive-query'

export interface PendingDestructiveQuery {
  sql: string
  action?: string
  objectType?: string
  message?: string
}

export function useDestructiveQueryConfirmation() {
  const [pendingQuery, setPendingQuery] = useState<PendingDestructiveQuery | null>(null)

  const checkAndWait = useCallback((sql: string): boolean => {
    const destructiveInfo = detectDestructiveQuery(sql)
    return destructiveInfo.isDestructive
  }, [])

  const showConfirmation = useCallback((sql: string) => {
    const destructiveInfo = detectDestructiveQuery(sql)
    if (!destructiveInfo.isDestructive) return null

    setPendingQuery({
      sql,
      action: destructiveInfo.action,
      objectType: destructiveInfo.objectType,
      message: destructiveInfo.message,
    })
    return destructiveInfo
  }, [])

  const clearPendingQuery = useCallback(() => {
    setPendingQuery(null)
  }, [])

  return {
    pendingQuery,
    checkAndWait,
    showConfirmation,
    clearPendingQuery,
    setPendingQuery,
  }
}
