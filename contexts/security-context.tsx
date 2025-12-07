"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import EncryptionService from "@/utils/encryption"

interface SecurityContextType {
  isAuthenticated: boolean
  isFirstTimeSetup: boolean
  isLoading: boolean
  theme: "light" | "dark" | "system"
  login: (pin: string) => Promise<boolean>
  logout: () => void
  setupPin: (pin: string) => Promise<void>
  changePin: (oldPin: string, newPin: string) => Promise<boolean>
  toggleTheme: () => void
  setTheme: (theme: "light" | "dark" | "system") => void
  encryptAndStore: (key: string, data: any) => Promise<void>
  decryptAndRetrieve: (key: string) => Promise<any>
  clearAllData: (pin: string) => Promise<boolean>
  sessionTimeLeft: number
  resetSessionTimer: () => void
  autoLockTimeout: number
  setAutoLockTimeout: (timeout: number) => void
  lockOnRefresh: boolean
  setLockOnRefresh: (value: boolean) => void
}

const SecurityContext = createContext<SecurityContextType | null>(null)

const STORAGE_KEYS = {
  PIN_HASH: "postgres-manager-pin-hash",
  THEME: "postgres-manager-theme",
  AUTO_LOCK_TIMEOUT: "postgres-manager-auto-lock-timeout",
  SETUP_COMPLETE: "postgres-manager-setup-complete",
  LOCK_ON_REFRESH: "postgres-manager-lock-on-refresh",
  PREFERENCES: "postgres-manager-preferences",
}

const DEFAULT_AUTO_LOCK_TIMEOUT = 60 * 60 * 1000 // 1 hour

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPin, setCurrentPin] = useState<string>("")
  const [theme, setThemeState] = useState<"light" | "dark" | "system">("system")
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0)
  const [autoLockTimeout, setAutoLockTimeoutState] = useState(DEFAULT_AUTO_LOCK_TIMEOUT)
  const [lockOnRefresh, setLockOnRefreshState] = useState(true)
  // Use ref for session timer to avoid stale closure issues
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Check if setup is complete on mount
  useEffect(() => {
    const setupComplete = localStorage.getItem(STORAGE_KEYS.SETUP_COMPLETE)
    const pinHash = localStorage.getItem(STORAGE_KEYS.PIN_HASH)
    console.log("Setup complete:", setupComplete)
    console.log("PIN hash exists:", !!pinHash)
    console.log("Setting isFirstTimeSetup to:", !setupComplete || !pinHash)
    setIsFirstTimeSetup(!setupComplete || !pinHash)

    // Load auto-lock timeout with validation
    const savedTimeout = localStorage.getItem(STORAGE_KEYS.AUTO_LOCK_TIMEOUT)
    if (savedTimeout) {
      const parsedTimeout = Number.parseInt(savedTimeout, 10)
      // Validate: must be a valid number and either -1 (never), 0 (manual), or positive
      if (!Number.isNaN(parsedTimeout) && (parsedTimeout === -1 || parsedTimeout >= 0)) {
        setAutoLockTimeoutState(parsedTimeout)
      } else {
        // Invalid value, reset to default
        console.warn("Invalid auto-lock timeout in localStorage, resetting to default")
        localStorage.setItem(STORAGE_KEYS.AUTO_LOCK_TIMEOUT, DEFAULT_AUTO_LOCK_TIMEOUT.toString())
      }
    }

    // Load lock on refresh setting
    const savedLockOnRefresh = localStorage.getItem(STORAGE_KEYS.LOCK_ON_REFRESH)
    if (savedLockOnRefresh !== null) {
      setLockOnRefreshState(savedLockOnRefresh === "true")
    }

    // Load theme
    loadTheme()
    
    // Mark as loaded after a brief delay to ensure all storage is checked
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // Apply theme
  useEffect(() => {
    applyTheme()
  }, [theme])

  // Lock on page refresh/close handler
  useEffect(() => {
    if (!isAuthenticated || !lockOnRefresh) return

    const handleBeforeUnload = () => {
      // When lock on refresh is enabled and user is authenticated,
      // we mark the session as needing re-authentication on return
      // This is done by NOT storing any session state
      // The app will require PIN entry on next load
      console.log("Page unloading with lock on refresh enabled")
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [isAuthenticated, lockOnRefresh])

  // Session timer management - uses ref to avoid stale closure issues
  const startSessionTimer = useCallback(() => {
    console.log("Starting session timer with timeout:", autoLockTimeout)
    
    // Clear existing timer using ref
    if (sessionTimerRef.current) {
      console.log("Clearing existing session timer")
      clearInterval(sessionTimerRef.current)
      sessionTimerRef.current = null
    }

    // Don't start timer if auto-lock is disabled or set to never
    if (autoLockTimeout === 0 || autoLockTimeout === -1) {
      console.log("Auto-lock disabled, not starting timer")
      setSessionTimeLeft(0)
      return
    }

    setSessionTimeLeft(autoLockTimeout)

    const timer = setInterval(() => {
      setSessionTimeLeft((prev) => {
        if (prev <= 1000) {
          // Session expired - clear the interval and lock the app once
          console.log("Session expired, locking and clearing timer")
          if (sessionTimerRef.current) {
            clearInterval(sessionTimerRef.current)
            sessionTimerRef.current = null
          }
          setIsAuthenticated(false)
          setCurrentPin("")
          return 0
        }
        return prev - 1000
      })
    }, 1000)

    sessionTimerRef.current = timer
    console.log("Session timer started")
  }, [autoLockTimeout])

  const resetSessionTimer = useCallback(() => {
    if (isAuthenticated) {
      startSessionTimer()
    }
  }, [isAuthenticated, startSessionTimer])

  // User activity detection to reset session timer
  useEffect(() => {
    if (!isAuthenticated || autoLockTimeout === 0 || autoLockTimeout === -1) return

    let lastActivity = Date.now()
    const ACTIVITY_THROTTLE = 30000 // Only reset timer every 30 seconds max

    const handleUserActivity = () => {
      const now = Date.now()
      if (now - lastActivity > ACTIVITY_THROTTLE) {
        lastActivity = now
        resetSessionTimer()
      }
    }

    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true)
      })
    }
  }, [isAuthenticated, autoLockTimeout, resetSessionTimer])

  // Start session timer when authenticated
  useEffect(() => {
    if (isAuthenticated && autoLockTimeout > 0 && autoLockTimeout !== -1) {
      startSessionTimer()
    }
  }, [isAuthenticated, autoLockTimeout, startSessionTimer])

  // Load theme from storage
  const loadTheme = async () => {
    try {
      // First try to load from encrypted storage if authenticated
      if (isAuthenticated && currentPin) {
        const encryptedTheme = localStorage.getItem(STORAGE_KEYS.THEME)
        if (encryptedTheme) {
          try {
            const decryptedTheme = await EncryptionService.decrypt(encryptedTheme, currentPin)
            setThemeState(decryptedTheme as "light" | "dark" | "system")
            return
          } catch (decryptError) {
            console.error("Failed to decrypt theme, falling back to system:", decryptError)
          }
        }
      }

      // If no encrypted theme or not authenticated, check for unencrypted theme (fallback)
      const unencryptedTheme = localStorage.getItem(STORAGE_KEYS.THEME)
      if (unencryptedTheme && ["light", "dark", "system"].includes(unencryptedTheme)) {
        setThemeState(unencryptedTheme as "light" | "dark" | "system")
        return
      }

      // Default to system theme
      setThemeState("system")
    } catch (error) {
      console.error("Failed to load theme:", error)
      setThemeState("system")
    }
  }

  // Apply theme to document
  const applyTheme = () => {
    const root = document.documentElement

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      if (systemTheme === "dark") {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    } else {
      if (theme === "dark") {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    }
  }

  const login = async (pin: string): Promise<boolean> => {
    try {
      console.log("Security context login called with PIN:", pin)
      const pinHash = localStorage.getItem(STORAGE_KEYS.PIN_HASH)
      console.log("PIN hash found:", !!pinHash)
      if (!pinHash) return false

      const isValid = await EncryptionService.verifyPin(pin, pinHash)
      console.log("PIN verification result:", isValid)
      if (isValid) {
        console.log("Setting authentication to true")
        console.log("Auto-lock timeout:", autoLockTimeout)
        setIsAuthenticated(true)
        setCurrentPin(pin)
        // Don't start timer here - let the useEffect handle it
        await loadTheme()
        return true
      }
      return false
    } catch (error) {
      console.error("Login failed:", error)
      return false
    }
  }

  const logout = () => {
    console.log("Logout called")
    setIsAuthenticated(false)
    setCurrentPin("")
    setSessionTimeLeft(0)
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current)
      sessionTimerRef.current = null
    }
    console.log("Logout completed")
  }

  const setupPin = async (pin: string): Promise<void> => {
    try {
      console.log("Setting up PIN:", pin)
      const pinHash = await EncryptionService.hashPin(pin)
      localStorage.setItem(STORAGE_KEYS.PIN_HASH, pinHash)
      localStorage.setItem(STORAGE_KEYS.SETUP_COMPLETE, "true")
      console.log("Setup complete flag set to true")

      setIsFirstTimeSetup(false)
      setIsAuthenticated(true)
      setCurrentPin(pin)
      startSessionTimer()
      console.log("Authentication state set to true")

      // Encrypt existing data if any
      await migrateExistingData(pin)
    } catch (error) {
      console.error("Setup failed:", error)
      throw error
    }
  }

  const changePin = async (oldPin: string, newPin: string): Promise<boolean> => {
    try {
      const pinHash = localStorage.getItem(STORAGE_KEYS.PIN_HASH)
      if (!pinHash) return false

      const isOldPinValid = await EncryptionService.verifyPin(oldPin, pinHash)
      if (!isOldPinValid) return false

      // Re-encrypt all data with new PIN
      await reencryptAllData(oldPin, newPin)

      // Update PIN hash
      const newPinHash = await EncryptionService.hashPin(newPin)
      localStorage.setItem(STORAGE_KEYS.PIN_HASH, newPinHash)
      setCurrentPin(newPin)

      return true
    } catch (error) {
      console.error("PIN change failed:", error)
      return false
    }
  }

  const toggleTheme = () => {
    const themes: ("light" | "dark" | "system")[] = ["light", "dark", "system"]
    const currentIndex = themes.indexOf(theme)
    const nextTheme = themes[(currentIndex + 1) % themes.length]
    setTheme(nextTheme)
  }

  const setTheme = async (newTheme: "light" | "dark" | "system") => {
    setThemeState(newTheme)

    // Always store theme in unencrypted format for persistence across sessions
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme)

    // Also store encrypted version if authenticated for security
    if (isAuthenticated && currentPin) {
      try {
        const encryptedTheme = await EncryptionService.encrypt(newTheme, currentPin)
        // Store encrypted version with a different key to avoid conflicts
        localStorage.setItem(STORAGE_KEYS.THEME + "_encrypted", encryptedTheme)
      } catch (error) {
        console.error("Failed to save encrypted theme:", error)
      }
    }
  }

  const setAutoLockTimeout = (timeout: number) => {
    // Validate timeout value
    if (Number.isNaN(timeout) || (timeout !== -1 && timeout < 0)) {
      console.warn("Invalid auto-lock timeout value:", timeout)
      return
    }
    setAutoLockTimeoutState(timeout)
    localStorage.setItem(STORAGE_KEYS.AUTO_LOCK_TIMEOUT, timeout.toString())
    if (isAuthenticated) {
      startSessionTimer()
    }
  }

  const setLockOnRefresh = (value: boolean) => {
    setLockOnRefreshState(value)
    localStorage.setItem(STORAGE_KEYS.LOCK_ON_REFRESH, value.toString())
  }

  const encryptAndStore = async (key: string, data: any): Promise<void> => {
    if (!isAuthenticated || !currentPin) {
      throw new Error("Not authenticated")
    }

    try {
      const jsonData = JSON.stringify(data)
      const encryptedData = await EncryptionService.encrypt(jsonData, currentPin)
      localStorage.setItem(key, encryptedData)
    } catch (error) {
      console.error("Failed to encrypt and store data:", error)
      throw error
    }
  }

  const decryptAndRetrieve = async (key: string): Promise<any> => {
    if (!isAuthenticated || !currentPin) {
      throw new Error("Not authenticated")
    }

    try {
      const encryptedData = localStorage.getItem(key)
      if (!encryptedData) return null

      const decryptedData = await EncryptionService.decrypt(encryptedData, currentPin)
      return JSON.parse(decryptedData)
    } catch (error) {
      console.error("Failed to decrypt and retrieve data:", error)
      return null
    }
  }

  const clearAllData = async (pin: string): Promise<boolean> => {
    try {
      const pinHash = localStorage.getItem(STORAGE_KEYS.PIN_HASH)
      if (!pinHash) return false

      const isValid = await EncryptionService.verifyPin(pin, pinHash)
      if (!isValid) return false

      // Clear all localStorage data
      localStorage.clear()

      // Reset state
      setIsAuthenticated(false)
      setCurrentPin("")
      setIsFirstTimeSetup(true)
      setThemeState("system")
      setAutoLockTimeoutState(DEFAULT_AUTO_LOCK_TIMEOUT)
      setLockOnRefreshState(true)

      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current)
        sessionTimerRef.current = null
      }

      return true
    } catch (error) {
      console.error("Failed to clear data:", error)
      return false
    }
  }

  // Migrate existing unencrypted data
  // Note: We intentionally do NOT encrypt primary app data keys because the rest of the app
  // expects plaintext JSON for these keys. Encrypting them causes parsing failures.
  const migrateExistingData = async (_pin: string) => {
    return
  }

  // Re-encrypt all data with new PIN
  const reencryptAllData = async (_oldPin: string, _newPin: string) => {
    // Skip re-encryption of app data; not stored encrypted.
    return
  }

  const value: SecurityContextType = {
    isAuthenticated,
    isFirstTimeSetup,
    isLoading,
    theme,
    login,
    logout,
    setupPin,
    changePin,
    toggleTheme,
    setTheme,
    encryptAndStore,
    decryptAndRetrieve,
    clearAllData,
    sessionTimeLeft,
    resetSessionTimer,
    autoLockTimeout,
    setAutoLockTimeout,
    lockOnRefresh,
    setLockOnRefresh,
  }

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>
}

export function useSecurity() {
  const context = useContext(SecurityContext)
  if (!context) {
    throw new Error("useSecurity must be used within a SecurityProvider")
  }
  return context
}
