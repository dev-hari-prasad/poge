"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Eye, EyeOff, AlertCircle, Trash2 } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DotPattern } from "@/components/magicui/dot-pattern"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useSecurity } from "@/contexts/security-context"


export function PinEntry() {
  const [pin, setPin] = useState(["", "", "", "", "", ""])
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [attempts, setAttempts] = useState(0)
  const [lockoutTime, setLockoutTime] = useState(0)

  const [showResetDialog, setShowResetDialog] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const { login, isFirstTimeSetup } = useSecurity()

  const handleResetApplication = () => {
    // Clear all localStorage data
    localStorage.clear()
    // Reload the page to restart the application
    window.location.reload()
  }

  const MAX_ATTEMPTS = 5
  const LOCKOUT_DURATION = 5 * 60 * 1000 // 5 minutes

  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setInterval(() => {
        setLockoutTime((prev) => {
          if (prev <= 1000) {
            setAttempts(0)
            setError("")
            return 0
          }
          return prev - 1000
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [lockoutTime])

  

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return // Prevent multiple characters
    
    const newPin = [...pin]
    newPin[index] = value
    setPin(newPin)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (lockoutTime > 0) return
    
    const pinString = pin.join("")
    if (pinString.length !== 6) {
      setError("PIN must be 6 digits")
      return
    }

    setLoading(true)
    setError("")

    try {
      console.log("Attempting login with PIN:", pinString)
      const success = await login(pinString)
      console.log("Login result:", success)
      if (success) {
        console.log("Login successful")
        
        setPin(["", "", "", "", "", ""])
        setAttempts(0)
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)

        if (newAttempts >= MAX_ATTEMPTS) {
          setLockoutTime(LOCKOUT_DURATION)
          setError(`Too many failed attempts. Locked out for 5 minutes.`)
        } else {
          setError(`Invalid PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`)
        }
        setPin(["", "", "", "", "", ""])
        inputRefs.current[0]?.focus()
      }
    } catch (error) {
      setError("Authentication failed. Please try again.")
      setPin(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const formatLockoutTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const pinString = pin.join("")

  return (
    <>

      <div className="min-h-screen relative flex items-center justify-center p-4">
        {/* Dot Pattern Background */}
        <div className="absolute inset-0">
          <DotPattern
            width={20}
            height={20}
            cr={1}
            className="text-green-300/40 dark:text-green-200/30"
            glow={true}
          />
        </div>
        
        {/* Content */}
        <Card className="w-full max-w-md relative z-10 bg-background/80 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <Image 
                src="/Pogo Brand mark.png" 
                alt="Poge" 
                width={32} 
                height={32} 
                className="h-8 w-8 object-contain"
              />
            </div>
            <CardTitle className="text-2xl">Poge</CardTitle>
            <p className="text-muted-foreground">Enter your PIN</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <div className="relative">
                  <div className="flex gap-2 justify-center">
                    {pin.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => {
                          inputRefs.current[index] = el
                        }}
                        type={showPin ? "text" : "password"}
                        value={showPin ? digit : digit ? "•" : ""}
                        onChange={(e) => handlePinChange(index, e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-12 h-12 text-center text-lg font-mono border focus:border-green-500 focus:ring-0 bg-background/90 backdrop-blur-sm"
                        maxLength={1}
                        disabled={loading || lockoutTime > 0}
                        autoFocus={index === 0}
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowPin(!showPin)}
                    disabled={loading || lockoutTime > 0}
                  >
                    {showPin ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="flex items-center justify-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {lockoutTime > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-mono font-bold text-red-600">{formatLockoutTime(lockoutTime)}</div>
                  <p className="text-sm text-muted-foreground">Time remaining until unlock</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={loading || pinString.length !== 6 || lockoutTime > 0}
              >
                {loading ? "Authenticating..." : lockoutTime > 0 ? "Locked Out" : "Unlock"}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t text-center text-xs text-muted-foreground">
              <p>🔒 Your data is stored locally with  AES-256 encryption</p>
              <p className="mt-1">
                If you forgot your PIN, you'll need to{" "}
                <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="text-green-700 underline hover:text-green-900 font-medium"
                    >
                      reset the application
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-red-600" />
                        Reset Application
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all your locally stored data including saved server connections, 
                        saved queries, query history, and application settings. This only affects data stored in your 
                        browser - your actual PostgreSQL databases and servers will remain completely untouched.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleResetApplication}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Reset Application
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
