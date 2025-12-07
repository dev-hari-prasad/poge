"use client"

import { useState, useRef } from "react"
import { ShieldCheckIcon, KeyIcon, PaintBrushIcon, ArrowLeftIcon, ArrowRightIcon, LockClosedIcon, CircleStackIcon, ExclamationTriangleIcon, StarIcon, SunIcon, MoonIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline"
import { GitFork } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import EncryptionService from "@/utils/encryption"
import { useSecurity } from "@/contexts/security-context"
import { DotPattern } from "@/components/magicui/dot-pattern"
import { triggerConfetti } from "@/components/magicui/confetti"

export function FirstTimeSetup() {
  const [currentStep, setCurrentStep] = useState(0)
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [confirmPinDigits, setConfirmPinDigits] = useState<string[]>(["", "", "", "", "", ""])
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const confirmPinInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | "system">("system")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [importPassword, setImportPassword] = useState("")
  const [isImporting, setIsImporting] = useState(false)


  const { setupPin, setTheme } = useSecurity()

  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!importPassword.trim()) {
      setError("Please enter the backup password")
      return
    }

    setIsImporting(true)
    try {
      const fileContent = await file.text()

      // Decrypt the data
      const decryptedData = await EncryptionService.decrypt(fileContent, importPassword)
      const importData = JSON.parse(decryptedData)

      // Validate the import data structure
      if (!importData.data || !importData.version) {
        throw new Error("Invalid backup file format")
      }

      // Import settings
      if (importData.data.settings) {
        if (importData.data.settings.theme) {
          setSelectedTheme(importData.data.settings.theme)
        }
      }

      // Import PIN (if available in the backup)
      if (importData.data.settings?.pin) {
        setPin(importData.data.settings.pin)
        setConfirmPin(importData.data.settings.pin)
      }

      setError("")

      // Complete the setup process with imported data
      setLoading(true)
      try {
        // Set up the PIN first
        await setupPin(importData.data.settings?.pin || pin)

        // Set the theme
        await setTheme(importData.data.settings?.theme || selectedTheme)

        // Import all the data (servers, queries, etc.)
        if (importData.data.servers) {
          // Import servers
          importData.data.servers.forEach((server: any) => {
            localStorage.setItem("postgres-manager-servers", JSON.stringify([server]))
          })
        }

        if (importData.data.savedQueries) {
          // Import saved queries
          localStorage.setItem("postgres-manager-saved-queries", JSON.stringify(importData.data.savedQueries))
        }

        if (importData.data.queryHistory) {
          // Import query history
          localStorage.setItem("postgres-manager-query-history", JSON.stringify(importData.data.queryHistory))
        }

        try { localStorage.removeItem("postgres-manager-session-locked") } catch { }

        // Trigger confetti for successful import onboarding
        triggerConfetti({
          particleCount: 200,
          spread: 80,
          origin: { x: 0.5, y: 0.4 },
          colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"]
        })
      } catch (error) {
        setError("Failed to complete setup with imported data. Please try again.")
      } finally {
        setLoading(false)
      }
    } catch (error) {
      console.error("Import failed:", error)
      setError("Failed to import backup. Please check your password and file format.")
    } finally {
      setIsImporting(false)
      // Reset the file input
      event.target.value = ""
    }
  }

  const steps = [
    {
      title: "",
      description: "Let's set up your secure database management environment",
      icon: ShieldCheckIcon,
    },
    {
      title: "Create Your Security PIN",
      description: "Choose a 6-digit PIN to protect your data",
      icon: KeyIcon,
    },
    {
      title: "Choose Your Theme",
      description: "Select your preferred appearance",
      icon: PaintBrushIcon,
    },
  ]



  const validatePin = () => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError("PIN must be exactly 6 digits")
      return false
    }
    if (pin !== confirmPin) {
      setError("PINs do not match")
      return false
    }
    setError("")
    return true
  }

  const handleDigitChange = (
    index: number,
    value: string,
    digits: string[],
    setDigits: (d: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    setString: (s: string) => void,
  ) => {
    const sanitized = value.replace(/\D/g, "").slice(0, 1)
    const updated = [...digits]
    updated[index] = sanitized
    setDigits(updated)
    setString(updated.join(""))

    if (sanitized && index < 5) {
      refs.current[index + 1]?.focus()
    }
  }

  const handleDigitKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    digits: string[],
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  ) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  const handlePasteDigits = (
    e: React.ClipboardEvent<HTMLDivElement>,
    setDigits: (d: string[]) => void,
    setString: (s: string) => void,
  ) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    const arr = pasted.split("")
    const filled = [arr[0] || "", arr[1] || "", arr[2] || "", arr[3] || "", arr[4] || "", arr[5] || ""]
    setDigits(filled)
    setString(filled.join(""))
    e.preventDefault()
  }

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!validatePin()) return
    }

    // If this is the last step, complete setup and start the app
    if (currentStep === steps.length - 1) {
      setLoading(true)
      try {
        await setupPin(pin)
        await setTheme(selectedTheme)

        // Trigger confetti for successful 3-step onboarding
        triggerConfetti({
          particleCount: 200,
          spread: 80,
          origin: { x: 0.5, y: 0.4 },
          colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"]
        })
      } catch (error) {
        setError("Setup failed. Please try again.")
      } finally {
        setLoading(false)
      }
      return
    }

    setCurrentStep(currentStep + 1)
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      setError("")
    }
  }

  // Ensure finalization actually happens when clicking "Start Using App"
  const handleStartUsingApp = async () => {
    // If we're on the last defined step, finalize setup (save PIN + theme), and switch without reload
    if (currentStep === steps.length - 1) {
      setLoading(true)
      try {
        await setupPin(pin)
        await setTheme(selectedTheme)

        // Trigger confetti for successful 3-step onboarding
        triggerConfetti({
          particleCount: 200,
          spread: 80,
          origin: { x: 0.5, y: 0.4 },
          colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"]
        })

        // No reload: SecurityProvider will render the main app once authenticated
      } catch (error) {
        setError("Setup failed. Please try again.")
      } finally {
        setLoading(false)
      }
      return
    }

    // If we reached here via import, setup is already done; no reload needed
    return
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <ShieldCheckIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-3">
              <p className="text-base text-muted-foreground">
                Manage PostgreSQL from your browser.
              </p>
            </div>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="text-sm">Connect to multiple databases.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="text-sm">Run SQL with results, history, and saved templates</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="text-sm">Visually create and edit tables, views, and schema objects</span>
              </div>
            </div>

            {/* Subtle import option */}
            <div className="pt-4 border-t border-dashed border-muted-foreground/20">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Have a backup?</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="password"
                    placeholder="Password"
                    value={importPassword}
                    onChange={(e) => setImportPassword(e.target.value)}
                    className="w-24 h-7 text-xs"
                  />
                  <input
                    type="file"
                    accept=".enc"
                    onChange={importBackup}
                    className="hidden"
                    id="import-backup-setup"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => document.getElementById("import-backup-setup")?.click()}
                    disabled={isImporting || !importPassword.trim()}
                    className="h-7 px-2 text-xs"
                  >
                    {isImporting ? "..." : "Import"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <KeyIcon className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold">Create Your Security PIN</h2>
              <p className="text-base text-muted-foreground">
                This PIN will encrypt all your data and is required every time you access the application.
              </p>
            </div>

            <div className="space-y-4 max-w-sm">
              <div className="space-y-2">
                <Label htmlFor="pin">Enter 6-digit PIN</Label>
                <div
                  className="relative"
                  onPaste={(e) => handlePasteDigits(e, setPinDigits, setPin)}
                >
                  <div className="flex gap-2 justify-start">
                    {pinDigits.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => {
                          pinInputRefs.current[index] = el
                        }}
                        type="password"
                        value={digit}
                        onChange={(e) =>
                          handleDigitChange(index, e.target.value, pinDigits, setPinDigits, pinInputRefs, setPin)
                        }
                        onKeyDown={(e) => handleDigitKeyDown(index, e, pinDigits, pinInputRefs)}
                        className="w-12 h-12 text-center text-lg font-mono border focus:border-green-500 focus:ring-0"
                        maxLength={1}
                        autoComplete="one-time-code"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-pin">Confirm PIN</Label>
                <div
                  className="relative"
                  onPaste={(e) => handlePasteDigits(e, setConfirmPinDigits, setConfirmPin)}
                >
                  <div className="flex gap-2 justify-start">
                    {confirmPinDigits.map((digit, index) => (
                      <Input
                        key={index}
                        ref={(el) => {
                          confirmPinInputRefs.current[index] = el
                        }}
                        type="password"
                        value={digit}
                        onChange={(e) =>
                          handleDigitChange(
                            index,
                            e.target.value,
                            confirmPinDigits,
                            setConfirmPinDigits,
                            confirmPinInputRefs,
                            setConfirmPin,
                          )
                        }
                        onKeyDown={(e) => handleDigitKeyDown(index, e, confirmPinDigits, confirmPinInputRefs)}
                        className="w-12 h-12 text-center text-lg font-mono border focus:border-green-500 focus:ring-0"
                        maxLength={1}
                        autoComplete="one-time-code"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <PaintBrushIcon className="h-8 w-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold">Choose Your Theme</h2>
              <p className="text-base text-muted-foreground">
                Select your preferred appearance. You can change this later in settings.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setSelectedTheme("system")}
                className={`flex-1 flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${selectedTheme === "system"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border hover:border-primary/20 hover:bg-accent"
                  }`}
              >
                <ComputerDesktopIcon className={`h-6 w-6 mb-2 ${selectedTheme === "system" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">System</span>
              </button>

              <button
                onClick={() => setSelectedTheme("light")}
                className={`flex-1 flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${selectedTheme === "light"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border hover:border-primary/20 hover:bg-accent"
                  }`}
              >
                <SunIcon className={`h-6 w-6 mb-2 ${selectedTheme === "light" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">Light</span>
              </button>

              <button
                onClick={() => setSelectedTheme("dark")}
                className={`flex-1 flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${selectedTheme === "dark"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border hover:border-primary/20 hover:bg-accent"
                  }`}
              >
                <MoonIcon className={`h-6 w-6 mb-2 ${selectedTheme === "dark" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium">Dark</span>
              </button>
            </div>
          </div>
        )

      // No case 3: process completes immediately on finishing step 3

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center">

      {/* Background */}
      <div className="absolute inset-0">
        <DotPattern width={20} height={20} cr={1} className="text-green-200/30" glow={true} />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-7 lg:px-11 py-9 lg:py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-stretch">
          {/* Left column - content */}
          <div className="flex flex-col">

            <Card className="bg-background/80 backdrop-blur-sm border-border/50 flex-1 rounded-none lg:rounded-l-xl lg:rounded-r-none lg:border-r-0">
              <CardHeader className="px-6 py-7 lg:px-8 lg:py-8">
                <div className="flex items-center gap-2 mb-4">
                  {steps.map((step, index) => (
                    <div key={index} className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${index <= currentStep ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {index < currentStep ? "✓" : index + 1}
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`w-8 h-0.5 mx-2 ${index < currentStep ? "bg-green-600" : "bg-muted"}`} />
                      )}
                    </div>
                  ))}
                </div>
                {/* Removed duplicate step title to avoid repeating the heading shown in the content area */}
              </CardHeader>
              <CardContent className="space-y-7 px-7 pb-8 lg:px-8 lg:pb-9">
                {renderStepContent()}

                <div className="flex justify-between pt-6">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 0 || currentStep === steps.length - 1}
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-1" />
                    Back
                  </Button>

                  {currentStep < steps.length - 1 ? (
                    <Button
                      onClick={handleNext}
                      disabled={loading || (currentStep === 1 && (!pin || !confirmPin))}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {loading ? "Setting up..." : "Next"}
                      <ArrowRightIcon className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button onClick={handleStartUsingApp} className="bg-green-600 hover:bg-green-700">
                      Start Using App
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>


          </div>

          {/* Right column - gradient with logo */}
          <Card className="bg-muted/30 border-border/50 overflow-hidden rounded-none lg:rounded-r-xl lg:rounded-l-none lg:border-l-0">
            <CardContent className="p-0 h-[400px] md:h-full">
              <div className="relative h-full w-full">
                {/* Base gradient - balanced dark */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950" />
                {/* Radial accents for depth */}
                <div className="absolute -top-16 -left-16 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-950/45 blur-3xl" />

                {/* Centered logo and headline */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-6">
                  <div className="flex items-center gap-4">
                    <Image
                      src="/Pogo%20Brand%20mark.png"
                      alt="Poge logo"
                      width={96}
                      height={96}
                      className="drop-shadow"
                      priority
                    />
                    <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                      Poge
                    </h1>
                  </div>
                  <h2 className="mt-6 text-xl md:text-2xl font-normal leading-snug max-w-[70%] mx-auto">
                    Your journey to better Postgres management starts here.
                  </h2>

                  <div className="flex items-center justify-center gap-3 mt-6">
                    <Button
                      variant="outline"
                      className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                      onClick={() => window.open("https://github.com/dev-hari-prasad/poge", "_blank")}
                    >
                      <StarIcon className="h-4 w-4" />
                      Star on GitHub
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                      onClick={() => window.open("https://github.com/dev-hari-prasad/poge/fork", "_blank")}
                    >
                      <GitFork className="h-4 w-4" />
                      Fork on GitHub
                    </Button>
                  </div>
                </div>

                {/* Bottom-centered encryption note */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <TooltipProvider delayDuration={300} skipDelayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="px-3 py-1 rounded-full text-[11px] md:text-xs text-white bg-emerald-950/50 border border-white/10 shadow-sm backdrop-blur-sm whitespace-nowrap hover:bg-emerald-950/70 transition-colors cursor-help underline decoration-dotted">
                          All data is stored locally with AES-256 military grade encryption
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="center"
                        className="p-0 border-0 bg-transparent shadow-none"
                        sideOffset={10}
                      >
                        <div className="bg-background rounded-xl border border-border max-w-4xl w-[500px] shadow-2xl">


                          <div className="space-y-0">
                            {/* Encryption Algorithm */}
                            <div className="border-b border-dashed border-muted-foreground/30 p-6">
                              <div className="flex gap-3">
                                <LockClosedIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                                <div>
                                  <h4 className="text-lg font-semibold">Encryption Algorithm</h4>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    AES-256-GCM encryption with 256-bit keys
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Local Storage */}
                            <div className="border-b border-dashed border-muted-foreground/30 p-6">
                              <div className="flex gap-3">
                                <CircleStackIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                                <div>
                                  <h4 className="text-lg font-semibold">Local Storage</h4>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    All data encrypted locally, never transmitted to servers
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* PIN Security */}
                            <div className="border-b border-dashed border-muted-foreground/30 p-6">
                              <div className="flex gap-3">
                                <ShieldCheckIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                                <div>
                                  <h4 className="text-lg font-semibold">PIN Security</h4>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    6-digit PIN with 1,000,000 combinations × 100,000 iterations
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Threat Level */}
                            <div className="p-6">
                              <div className="flex gap-3">
                                <ExclamationTriangleIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                                <div>
                                  <h4 className="text-lg font-semibold">Threat Level</h4>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    Breaking encryption takes longer than the universe's age.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
