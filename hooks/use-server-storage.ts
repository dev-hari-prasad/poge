"use client"

import { useState, useEffect } from "react"
import type { ServerConnection, ServerFormData } from "@/types/server"

const STORAGE_KEY = "postgres-manager-servers"

export function useServerStorage() {
  const [servers, setServers] = useState<ServerConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load servers from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedServers = JSON.parse(stored).map((server: any) => ({
          ...server,
          createdAt: new Date(server.createdAt),
          lastConnected: server.lastConnected ? new Date(server.lastConnected) : undefined,
          favorite: server.favorite || false,
        }))
        // Sort servers: favorites first, then by creation date
        const sortedServers = parsedServers.sort((a, b) => {
          if (a.favorite && !b.favorite) return -1
          if (!a.favorite && b.favorite) return 1
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        })
        setServers(sortedServers)
      }
    } catch (error) {
      console.error("Failed to load servers from localStorage:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save servers to localStorage whenever servers change
  const saveServers = (newServers: ServerConnection[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newServers))
      setServers(newServers)
    } catch (error) {
      console.error("Failed to save servers to localStorage:", error)
    }
  }

  const addServer = (serverData: ServerFormData) => {
    const newServer: ServerConnection = {
      id: crypto.randomUUID(),
      ...serverData,
      connected: true, // Mark as connected since we test connection before adding
      createdAt: new Date(),
      lastConnected: new Date(),
    }
    const updatedServers = [...servers, newServer]
    saveServers(updatedServers)
  }

  const updateServer = (id: string, serverData: ServerFormData) => {
    const updatedServers = servers.map((server) => (server.id === id ? { ...server, ...serverData } : server))
    saveServers(updatedServers)
  }

  const deleteServer = (id: string) => {
    const updatedServers = servers.filter((server) => server.id !== id)
    saveServers(updatedServers)
  }

  const toggleConnection = (id: string) => {
    const updatedServers = servers.map((server) =>
      server.id === id
        ? {
            ...server,
            connected: !server.connected,
            lastConnected: !server.connected ? new Date() : server.lastConnected,
          }
        : server,
    )
    saveServers(updatedServers)
  }

  const toggleFavorite = (id: string) => {
    const updatedServers = servers.map((server) => ({
      ...server,
      favorite: server.id === id ? !server.favorite : false, // Only one server can be favorited
    }))
    // Sort servers: favorites first, then by creation date
    const sortedServers = updatedServers.sort((a, b) => {
      if (a.favorite && !b.favorite) return -1
      if (!a.favorite && b.favorite) return 1
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
    saveServers(sortedServers)
  }

  const testAndUpdateConnection = async (id: string): Promise<boolean> => {
    const server = servers.find(s => s.id === id)
    if (!server) return false

    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: server.host,
          port: server.port,
          user: server.username,
          password: server.password,
          database: server.database,
          sslMode: server.sslMode,
        }),
      })

      const result = await response.json()
      const isConnected = result.success

      // Update the server's connection status
      const updatedServers = servers.map((s) =>
        s.id === id
          ? {
              ...s,
              connected: isConnected,
              lastConnected: isConnected ? new Date() : s.lastConnected,
            }
          : s,
      )
      saveServers(updatedServers)

      return isConnected
    } catch (error) {
      // Mark as disconnected on error
      const updatedServers = servers.map((s) =>
        s.id === id ? { ...s, connected: false } : s,
      )
      saveServers(updatedServers)
      return false
    }
  }

  return {
    servers,
    isLoading,
    addServer,
    updateServer,
    deleteServer,
    toggleConnection,
    toggleFavorite,
    testAndUpdateConnection,
  }
}
