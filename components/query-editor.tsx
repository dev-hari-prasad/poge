"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, X, Lock, Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { SQLEditor } from "@/components/sql-editor"
import { useQueryTabs } from "@/hooks/use-query-tabs"

interface QueryEditorProps {
  onSelectionChange?: () => void
  onContentChange?: (value: string) => void
}

export function QueryEditor({ onSelectionChange, onContentChange }: QueryEditorProps) {
  const { tabs, activeTabId, setActiveTabId, createTab, closeTab, updateTab, renameTab, toggleLock, getActiveTab } = useQueryTabs()
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const activeTab = getActiveTab()
  const lineCount = (activeTab?.content && typeof activeTab.content === 'string' ? activeTab.content.split("\n").length : 1) || 1
  const maxDigits = Math.max(1, Math.floor(Math.log10(lineCount)) + 1)
  const lineNumbersWidth = Math.max(48, maxDigits * 12 + 16) // Minimum 48px, 12px per digit + 16px padding

  const handleTabRename = (tabId: string, currentName: string) => {
    setEditingTabId(tabId)
    setEditingName(currentName)
  }

  const saveTabName = () => {
    if (editingTabId && editingName.trim()) {
      renameTab(editingTabId, editingName.trim())
    }
    setEditingTabId(null)
    setEditingName("")
  }

  const cancelTabRename = () => {
    setEditingTabId(null)
    setEditingName("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveTabName()
    } else if (e.key === "Escape") {
      cancelTabRename()
    }
  }

  // Notify parent of current content when the active tab or its content changes
  // Ensures the parent always has the latest content, even before the first user keystroke
  useEffect(() => {
    if (onContentChange) {
      const current = (activeTab?.content && typeof activeTab.content === 'string') ? activeTab.content : ""
      onContentChange(current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.id, activeTab?.content])

  // Don't render until we have valid tabs
  if (!tabs.length || !activeTab) {
    return (
      <div className="flex flex-col border-b">
        <div className="flex items-center bg-muted/30 border-b p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
            <span className="text-sm text-muted-foreground">Loading query tabs...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col border-b">
      {/* Query Tabs */}
      <div className="flex items-center bg-muted/30 border-b">
        <div className="flex items-center overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center gap-1 px-3 py-2 border-r cursor-pointer hover:bg-muted/50 ${
                tab.id === activeTabId ? "bg-background border-b-2 border-green-600" : ""
              } ${tab.locked ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              {editingTabId === tab.id ? (
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={saveTabName}
                  onKeyDown={handleKeyDown}
                  className="h-6 w-24 text-xs"
                  autoFocus
                />
              ) : (
                <>
                  <span className="text-sm select-none whitespace-nowrap overflow-hidden text-ellipsis" onDoubleClick={() => handleTabRename(tab.id, tab.name)}>
                    {tab.name}
                    {tab.isModified && "*"}
                  </span>
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-green-500 hover:text-green-50 ml-3"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleLock(tab.id)
                          }}
                        >
                          {tab.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{tab.locked ? "Unlock tab (prevents accidental closing)" : "Lock tab (prevents accidental closing)"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      closeTab(tab.id)
                    }}
                    disabled={tab.locked}
                    title={tab.locked ? "Cannot close locked tab" : "Close tab"}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2" onClick={() => createTab()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* SQL Editor */}
      <div className="flex-1 relative z-0">
        <div className="absolute inset-0 flex">
          {/* Line Numbers */}
          <div 
            className="bg-muted/20 border-r flex flex-col text-xs text-muted-foreground font-mono"
            style={{ width: `${lineNumbersWidth}px` }}
          >
                         {(activeTab?.content && typeof activeTab.content === 'string' ? activeTab.content.split("\n") : [""]).map((_, index) => (
               <div key={index} className="px-2 text-right" style={{ 
                 lineHeight: "24px",
                 height: "24px",
                 display: "flex",
                 alignItems: "center",
                 justifyContent: "flex-end"
               }}>
                 {index + 1}
               </div>
             ))}
          </div>

          {/* Editor */}
          <div className="flex-1 relative">
            <SQLEditor
              value={(activeTab?.content && typeof activeTab.content === 'string') ? activeTab.content : ""}
              onChange={(value) => {
                updateTab(activeTabId, { content: value })
                onContentChange?.(value)
              }}
              onSelect={onSelectionChange}
              onMouseUp={onSelectionChange}
              onKeyUp={onSelectionChange}
              placeholder="-- Write your SQL query here"
              style={{
                minHeight: "300px",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
