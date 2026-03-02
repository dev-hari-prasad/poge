"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { ShieldCheckIcon, KeyIcon, PaintBrushIcon, ArrowLeftIcon, ArrowRightIcon, LockClosedIcon, CircleStackIcon, ExclamationTriangleIcon, SunIcon, MoonIcon, ComputerDesktopIcon, StarIcon } from "@heroicons/react/24/outline"
import { GitFork } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import EncryptionService from "@/utils/encryption"
import { useSecurity } from "@/contexts/security-context"
import { triggerConfetti } from "@/components/magicui/confetti"

const GitHubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 16 16"
    aria-hidden="true"
    {...props}
  >
    <path
      fill="currentColor"
      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8"
    />
  </svg>
)

const featureSlides = [
  {
    image: "/Images/query-tool.png",
    title: "A blazing-fast editor built for every query",
    subtitle: "",
  },
  {
    image: "/Images/table-viewer.png",
    title: "Navigate tables, schemas, and relationships",
    subtitle: "",
  },
  {
    image: "/Images/password.png",
    title: "AES-256 encryption for every connection",
    subtitle: "",
  },
  {
    image: "/Images/save.png",
    title: "Export, import, and pick up where you left off",
    subtitle: "",
  },
]

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
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % featureSlides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

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
      description: "Poge is a lightweight PostgreSQL database interaction tool that runs entirely in your browser, built for developers who just want to check their tables, run quick queries, and get back to work.",
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
            <div className="w-16 h-16 bg-green-100 dark:bg-green-950/50 rounded-full flex items-center justify-center">
              <ShieldCheckIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Welcome to Poge</h2>
              <p className="text-base text-muted-foreground">
                Poge is a lightweight PostgreSQL database interaction tool that runs entirely in your browser, for developers who just want to check their tables, run queries, and get back to work.
              </p>
            </div>

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
                This PIN will encrypt all your data and is required to access the application.
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
    <div className="min-h-screen relative flex flex-col lg:flex-row">

      {/* Absolute positioned encryption note */}
      <div className="absolute top-6 right-6 z-50">
        <TooltipProvider delayDuration={300} skipDelayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-help underline decoration-dotted">
                <LockClosedIcon className="h-3.5 w-3.5" />
                AES-256 Encrypted
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="end"
              className="p-0 border-0 bg-transparent shadow-none"
              sideOffset={8}
            >
              <div className="bg-background rounded-lg border border-border w-[380px] shadow-2xl">
                <div className="space-y-0">
                  <div className="border-b border-dashed border-muted-foreground/30 px-4 py-3">
                    <div className="flex gap-2.5">
                      <LockClosedIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold">Encryption Algorithm</h4>
                        <p className="text-xs text-muted-foreground">AES-256-GCM with 256-bit keys</p>
                      </div>
                    </div>
                  </div>
                  <div className="border-b border-dashed border-muted-foreground/30 px-4 py-3">
                    <div className="flex gap-2.5">
                      <CircleStackIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold">Local Storage</h4>
                        <p className="text-xs text-muted-foreground">Encrypted locally, never transmitted</p>
                      </div>
                    </div>
                  </div>
                  <div className="border-b border-dashed border-muted-foreground/30 px-4 py-3">
                    <div className="flex gap-2.5">
                      <ShieldCheckIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold">PIN Security</h4>
                        <p className="text-xs text-muted-foreground">1,000,000 combinations x 100,000 iterations</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex gap-2.5">
                      <ExclamationTriangleIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold">Threat Level</h4>
                        <p className="text-xs text-muted-foreground">Breaking takes longer than the universe&apos;s age</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Left side - Onboarding steps */}
      <div className="w-full lg:w-[40%] flex flex-col min-h-screen">
        {/* Logo */}
        <div className="p-6 lg:p-8 flex items-center">
          <div className="flex items-center gap-3">
            <Image
              src="/Pogo%20Brand%20mark.png"
              alt="Poge logo"
              width={28}
              height={28}
              priority
            />
            <span className="text-lg font-semibold">Poge</span>
          </div>
        </div>

        {/* Step content centered */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-12 pb-8">
          <div className="w-full max-w-md mb-22">
            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-8">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index <= currentStep ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"
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
          </div>
        </div>

      </div>

      {/* Right side - Feature showcase */}
      <div className="hidden lg:flex lg:w-[60%] items-center justify-end bg-background">
        <div className="w-[95%] max-w-[1000px] p-6 pr-5 bg-muted/30 rounded-l-2xl rounded-r-none border-y border-l border-border/50 border-r-0">
          {/* App window */}
          <div className="flex flex-col w-full h-[520px] max-h-[580px] rounded-xl overflow-hidden border border-border/70 bg-[#1e1e1e]">
          {/* Title bar */}
          <div className="flex items-center justify-between h-9 px-4 shrink-0 bg-[#1c1c1c] border-b border-white/10">
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>
            <div className="flex items-center gap-3 pr-1">
              <button
                onClick={() => window.open("https://github.com/dev-hari-prasad/poge", "_blank")}
                className="flex items-center gap-1.5 text-[11px] font-medium text-white/60 hover:text-white transition-colors"
              >
                <GitHubIcon className="h-3.5 w-3.5" />
                Star on GitHub
              </button>
              <button
                onClick={() => window.open("https://github.com/dev-hari-prasad/poge/fork", "_blank")}
                className="flex items-center gap-1.5 text-[11px] font-medium text-white/60 hover:text-white transition-colors"
              >
                <GitFork className="h-3.5 w-3.5" />
                Fork on GitHub
              </button>
            </div>
          </div>
          {/* Screen */}
          <div className="relative flex-1 overflow-hidden bg-[#1e1e1e]">
            {featureSlides.map((slide, index) => (
              <div
                key={index}
                className="absolute inset-0"
                style={{
                  opacity: index === activeSlide ? 1 : 0,
                  transform: `scale(${index === activeSlide ? 1 : 1.04})`,
                  transition:
                    "opacity 900ms cubic-bezier(0.4, 0, 0.2, 1), transform 900ms cubic-bezier(0.4, 0, 0.2, 1)",
                  zIndex: index === activeSlide ? 2 : 1,
                }}
              >
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  className={`object-cover ${slide.image.includes("password") || slide.image.includes("save") ? "object-center" : "object-left"}`}
                  priority={index === 0}
                  sizes="(min-width: 1024px) 55vw, 0vw"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(2,26,19,0.95) 0%, rgba(2,26,19,0.55) 20%, rgba(2,26,19,0.08) 40%, transparent 100%)",
                  }}
                />
                <div
                  className="absolute bottom-0 left-0 right-0 p-6 pb-5 pr-14"
                  style={{
                    opacity: index === activeSlide ? 1 : 0,
                    transform: `translateY(${index === activeSlide ? 0 : 10}px)`,
                    transition:
                      "opacity 650ms cubic-bezier(0.4, 0, 0.2, 1) 200ms, transform 650ms cubic-bezier(0.4, 0, 0.2, 1) 200ms",
                  }}
                >
                  <h3 className="text-[22px] font-semibold text-white tracking-tight leading-tight">
                    {slide.title}
                  </h3>
                  <p className="text-[13px] text-white/50 mt-1.5 font-medium tracking-wide">
                    {slide.subtitle}
                  </p>
                </div>
              </div>
            ))}
            {/* Countdown ring */}
            <div className="absolute bottom-4 right-4 z-10">
              <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="white" strokeWidth="1.5" opacity="0.1" />
                <circle
                  key={activeSlide}
                  cx="12" cy="12" r="10"
                  fill="none" stroke="white" strokeWidth="1.5"
                  strokeDasharray="62.832"
                  strokeLinecap="round"
                  opacity="0.4"
                  className="slide-countdown"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
