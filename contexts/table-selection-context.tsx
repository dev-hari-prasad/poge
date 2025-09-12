"use client"

import { createContext, useContext, useMemo, useState, ReactNode } from "react"
import type { SelectedTable } from "@/types/database"

interface TableSelectionContextValue {
  selectedTable: SelectedTable | null
  setSelectedTable: (table: SelectedTable | null) => void
}

const TableSelectionContext = createContext<TableSelectionContextValue | undefined>(undefined)

export function TableSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedTable, setSelectedTable] = useState<SelectedTable | null>(null)

  const value = useMemo(() => ({ selectedTable, setSelectedTable }), [selectedTable])

  return <TableSelectionContext.Provider value={value}>{children}</TableSelectionContext.Provider>
}

export function useTableSelection() {
  const ctx = useContext(TableSelectionContext)
  if (!ctx) {
    throw new Error("useTableSelection must be used within a TableSelectionProvider")
  }
  return ctx
}



