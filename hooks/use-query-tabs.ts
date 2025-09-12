"use client"

import { useState, useCallback, useEffect } from "react"
import type { QueryTab } from "@/types/query"

/**
 * Query Tabs Hook with Persistence and Lock Functionality
 * 
 * Features:
 * - Persists query tabs across browser sessions using localStorage
 * - Allows locking tabs to prevent accidental closure
 * - Maintains active tab state across sessions
 * - Auto-saves tab content and modifications
 */
const STORAGE_KEY = "postgres-manager-query-tabs"

export function useQueryTabs() {
  const [tabs, setTabs] = useState<QueryTab[]>([])
  const [activeTabId, setActiveTabId] = useState("")

  // Load tabs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedData = JSON.parse(stored) as { tabs?: unknown; activeTabId?: unknown }
        const loadedTabsRaw: Partial<QueryTab>[] = Array.isArray(parsedData.tabs)
          ? (parsedData.tabs as Partial<QueryTab>[])
          : []
        const loadedActiveId: string = typeof parsedData.activeTabId === 'string' ? parsedData.activeTabId : ""
        
        if (loadedTabsRaw.length > 0) {
          // Ensure all tabs have proper content as strings and required fields
          const validatedTabs: QueryTab[] = loadedTabsRaw.map((tab) => ({
            id: typeof tab.id === 'string' ? tab.id : crypto.randomUUID(),
            name: typeof tab.name === 'string' ? tab.name : 'Query 1',
            content: typeof tab.content === 'string' ? tab.content : "-- Write your SQL query here\n",
            locked: typeof tab.locked === 'boolean' ? tab.locked : false,
            isModified: typeof tab.isModified === 'boolean' ? tab.isModified : false,
            serverId: typeof tab.serverId === 'string' ? tab.serverId : undefined,
            database: typeof tab.database === 'string' ? tab.database : undefined,
          }))
          setTabs(validatedTabs)
          setActiveTabId(loadedActiveId || validatedTabs[0].id)
        } else {
          // Create default tab if no stored tabs
          const defaultTab: QueryTab = {
            id: "default",
            name: "Query 1",
            content: "-- Write your SQL query here\n",
            isModified: false,
            locked: false,
          }
          setTabs([defaultTab])
          setActiveTabId(defaultTab.id)
        }
      } else {
        // Create default tab if no stored data
        const defaultTab: QueryTab = {
          id: "default",
          name: "Query 1",
          content: "-- Write your SQL query here\n",
          isModified: false,
          locked: false,
        }
        setTabs([defaultTab])
        setActiveTabId(defaultTab.id)
      }
    } catch (error) {
      console.error("Failed to load query tabs from localStorage:", error)
      // Create default tab on error
      const defaultTab: QueryTab = {
        id: "default",
        name: "Query 1",
        content: "-- Write your SQL query here\n",
        isModified: false,
        locked: false,
      }
      setTabs([defaultTab])
      setActiveTabId(defaultTab.id)
    }
  }, [])

  // Save tabs to localStorage whenever tabs or activeTabId change
  const saveTabs = useCallback((newTabs: QueryTab[], newActiveId: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tabs: newTabs,
        activeTabId: newActiveId,
      }))
    } catch (error) {
      console.error("Failed to save query tabs to localStorage:", error)
    }
  }, [])

  // Update state and save to localStorage
  const updateTabsAndSave = useCallback((newTabs: QueryTab[], newActiveId: string) => {
    setTabs(newTabs)
    setActiveTabId(newActiveId)
    saveTabs(newTabs, newActiveId)
  }, [saveTabs])

  const createTab = useCallback((content?: string) => {
    const newTab: QueryTab = {
      id: crypto.randomUUID(),
      name: `Query ${tabs.length + 1}`,
      content: content || "-- Write your SQL query here\n",
      isModified: false,
      locked: false,
    }
    const newTabs = [...tabs, newTab]
    updateTabsAndSave(newTabs, newTab.id)
  }, [tabs.length, updateTabsAndSave])

  const closeTab = useCallback(
    (tabId: string) => {
      const tabToClose = tabs.find(tab => tab.id === tabId)
      
      // Prevent closing locked tabs
      if (tabToClose?.locked) {
        return false
      }

      const newTabs = tabs.filter((tab) => tab.id !== tabId)
      let newActiveId = activeTabId

      if (newTabs.length === 0) {
        // Always keep at least one tab
        const defaultTab: QueryTab = {
          id: crypto.randomUUID(),
          name: "Query 1",
          content: "-- Write your SQL query here\n",
          isModified: false,
          locked: false,
        }
        newTabs.push(defaultTab)
        newActiveId = defaultTab.id
      } else if (tabId === activeTabId) {
        // If closing active tab, switch to the first remaining tab
        newActiveId = newTabs[0].id
      }

      updateTabsAndSave(newTabs, newActiveId)
      return true
    },
    [tabs, activeTabId, updateTabsAndSave],
  )

  const updateTab = useCallback((tabId: string, updates: Partial<QueryTab>) => {
    const newTabs = tabs.map((tab) =>
      tab.id === tabId
        ? { ...tab, ...updates, isModified: updates.content !== undefined ? true : tab.isModified }
        : tab,
    )
    updateTabsAndSave(newTabs, activeTabId)
  }, [tabs, activeTabId, updateTabsAndSave])

  const renameTab = useCallback(
    (tabId: string, name: string) => {
      updateTab(tabId, { name })
    },
    [updateTab],
  )

  const toggleLock = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (tab) {
      updateTab(tabId, { locked: !tab.locked })
    }
  }, [tabs, updateTab])

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabId(tabId)
    saveTabs(tabs, tabId)
  }, [tabs, saveTabs])

  const getActiveTab = useCallback(() => {
    const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0]
    // Ensure the returned tab has valid content
    if (activeTab && typeof activeTab.content !== 'string') {
      return {
        ...activeTab,
        content: "-- Write your SQL query here\n"
      }
    }
    return activeTab
  }, [tabs, activeTabId])

  return {
    tabs,
    activeTabId,
    setActiveTabId: setActiveTab,
    createTab,
    closeTab,
    updateTab,
    renameTab,
    toggleLock,
    getActiveTab,
  }
}
