"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { FixedSizeList as List } from 'react-window'
import { FixedSizeGrid as Grid } from 'react-window'
import { Badge } from '@/components/ui/badge'

interface VirtualTableProps {
  columns: string[]
  rows: any[]
  height?: number
  rowHeight?: number
  columnWidth?: number
  showLineNumbers?: boolean
  onEditTable?: () => void
  onDeleteTable?: () => void
}

interface CellProps {
  columnIndex: number
  rowIndex: number
  style: React.CSSProperties
  data: {
    columns: string[]
    rows: any[]
    showLineNumbers: boolean
    columnWidth: number
    onEditTable?: () => void
    onDeleteTable?: () => void
  }
}

interface HeaderCellProps {
  index: number
  style: React.CSSProperties
  data: {
    columns: string[]
    showLineNumbers: boolean
    columnWidth: number
  }
}

const formatCellValue = (value: any) => {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic text-xs">NULL</span>
  }
  if (typeof value === "boolean") {
    return <Badge variant={value ? "default" : "secondary"} className="text-xs">{value.toString()}</Badge>
  }
  if (typeof value === "object") {
    return <span className="text-xs font-mono">{JSON.stringify(value)}</span>
  }
  return <span className="text-xs">{value.toString()}</span>
}

const Cell = React.memo(({ columnIndex, rowIndex, style, data }: CellProps) => {
  const { columns, rows, showLineNumbers, columnWidth, onEditTable, onDeleteTable } = data
  
  // Handle line number column
  if (showLineNumbers && columnIndex === 0) {
    return (
      <div
        style={style}
        className="flex items-center justify-end px-2 py-1 border-r bg-muted/20 text-muted-foreground font-mono text-xs"
      >
        {rowIndex + 1}
      </div>
    )
  }
  
  const actualColumnIndex = showLineNumbers ? columnIndex - 1 : columnIndex
  const column = columns[actualColumnIndex]
  
  // Handle Actions column
  if (column === "Actions") {
    return (
      <div
        style={style}
        className="flex items-center gap-2 px-2 py-1 border-r border-b hover:bg-muted/30"
      >
        {onEditTable && (
          <button 
            onClick={onEditTable} 
            className="p-1 hover:bg-muted rounded"
            title="Edit table"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        )}
        {onDeleteTable && (
          <button 
            onClick={onDeleteTable} 
            className="p-1 hover:bg-muted rounded"
            title="Delete table"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        )}
      </div>
    )
  }
  
  const value = rows[rowIndex]?.[column]
  
  return (
    <div
      style={style}
      className="flex items-start px-2 py-1 border-r border-b hover:bg-muted/30 whitespace-pre-wrap break-words"
      title={value?.toString() || 'NULL'}
    >
      {formatCellValue(value)}
    </div>
  )
})

Cell.displayName = 'VirtualTableCell'

const HeaderCell = React.memo(({ index, style, data }: HeaderCellProps) => {
  const { columns, showLineNumbers } = data
  
  // Handle line number header
  if (showLineNumbers && index === 0) {
    return (
      <div
        style={style}
                className="flex items-center justify-center px-2 py-2 border-r bg-muted font-medium text-xs"
      >
        #
      </div>
    )
  }
  
  const actualIndex = showLineNumbers ? index - 1 : index
  const column = columns[actualIndex]
  
  return (
    <div
      style={style}
      className="flex items-start px-2 py-2 border-r bg-muted font-medium text-xs whitespace-pre-wrap break-words"
      title={column}
    >
      {column}
    </div>
  )
})

HeaderCell.displayName = 'VirtualTableHeaderCell'

export function VirtualTable({
  columns,
  rows,
  height = 400,
  rowHeight = 30,
  columnWidth = 150,
  showLineNumbers = true,
  onEditTable,
  onDeleteTable,
}: VirtualTableProps) {
  const [containerWidth, setContainerWidth] = useState(800)
  const [containerHeight, setContainerHeight] = useState(height)
  
  // Calculate dimensions
  const lineNumberWidth = showLineNumbers ? 60 : 0
  const totalColumns = showLineNumbers ? columns.length + 1 : columns.length
  const totalWidth = lineNumberWidth + (columns.length * columnWidth)
  
  // Memoize the data for the grid
  const gridData = useMemo(() => ({
    columns,
    rows,
    showLineNumbers,
    columnWidth,
    onEditTable,
    onDeleteTable
  }), [columns, rows, showLineNumbers, columnWidth, onEditTable, onDeleteTable])
  
  const headerData = useMemo(() => ({
    columns,
    showLineNumbers,
    columnWidth
  }), [columns, showLineNumbers, columnWidth])
  
  // Custom column width function
  const getColumnWidth = useCallback((index: number) => {
    if (showLineNumbers && index === 0) {
      return lineNumberWidth
    }
    return columnWidth
  }, [showLineNumbers, lineNumberWidth, columnWidth])
  
  // Resize observer to track container dimensions
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
        setContainerHeight(entry.contentRect.height - 40) // Subtract header height
      }
    })
    
    const container = document.getElementById('virtual-table-container')
    if (container) {
      resizeObserver.observe(container)
    }
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [])
  
  if (columns.length === 0 || rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No data to display
      </div>
    )
  }
  
  return (
    <div 
      id="virtual-table-container" 
      className="border rounded-md bg-background h-full min-h-0 overflow-hidden table-scroll-container"
      style={{ height: 'calc(100vh - 14rem)' }}
    >
      {/* Header */}
      <div className="border-b bg-muted">
        <List
          height={40}
          itemCount={totalColumns}
          itemSize={getColumnWidth}
          layout="horizontal"
          itemData={headerData}
          style={{ overflow: 'hidden' }}
        >
          {HeaderCell}
        </List>
      </div>
      
      {/* Data Grid */}
      <Grid
        columnCount={totalColumns}
        columnWidth={getColumnWidth}
        height={containerHeight}
        rowCount={rows.length}
        rowHeight={rowHeight}
        itemData={gridData}
        overscanRowCount={5}
        overscanColumnCount={2}
        style={{
          overflowY: 'auto',
          overflowX: 'auto'
        }}
        className="table-scroll-container"
      >
        {Cell}
      </Grid>
      
      {/* Stats */}
      <div className="border-t bg-muted/10 px-3 py-1 text-xs text-muted-foreground">
        Showing {rows.length.toLocaleString()} rows × {columns.length} columns
        {rows.length > 1000 && (
          <span className="ml-2 text-green-600">
            • Virtualized for performance
          </span>
        )}
      </div>
    </div>
  )
}

// Export a lighter version for smaller datasets
export function SimpleTable({ 
  columns, 
  rows, 
  onEditTable, 
  onDeleteTable 
}: { 
  columns: string[]; 
  rows: any[]; 
  onEditTable?: () => void; 
  onDeleteTable?: () => void; 
}) {
  if (rows.length > 500) {
    return <VirtualTable columns={columns} rows={rows} onEditTable={onEditTable} onDeleteTable={onDeleteTable} />
  }
  
  return (
    <div className="overflow-auto h-full min-h-0 max-h-full table-scroll-container" style={{ height: 'calc(100vh - 8.5rem)' }}>
      <div className="inline-block border rounded-md">
      <table className="min-w-max border-collapse">
        <thead className="sticky top-0 bg-muted z-10">
          <tr>
            {columns.map((column) => (
              <th key={column} className="text-left p-2 border-r font-medium text-sm whitespace-nowrap">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b hover:bg-muted/30">
              {columns.map((column) => (
                <td key={column} className="p-2 border-r text-sm whitespace-nowrap">
                  {column === "Actions" ? (
                    <div className="flex items-center gap-2">
                      {onEditTable && (
                        <button 
                          onClick={onEditTable} 
                          className="p-1 hover:bg-muted rounded"
                          title="Edit table"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                      )}
                      {onDeleteTable && (
                        <button 
                          onClick={onDeleteTable} 
                          className="p-1 hover:bg-muted rounded"
                          title="Delete table"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    formatCellValue(row[column])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}