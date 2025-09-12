"use client"

import { useState, useEffect } from "react"

const MIN_WIDTH = 1208
const MIN_HEIGHT = 422
// Temporarily lower for testing
// const MIN_WIDTH = 1400
// const MIN_HEIGHT = 800
const CACHE_KEY = "poge-screen-size-check"

interface ScreenSizeOverlayProps {
  children: React.ReactNode
}

export function ScreenSizeOverlay({ children }: ScreenSizeOverlayProps) {
  const [showOverlay, setShowOverlay] = useState(false)
  const [currentSize, setCurrentSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const isTooSmall = width < MIN_WIDTH || height < MIN_HEIGHT
      
      setCurrentSize({ width, height })
      setShowOverlay(isTooSmall)
      
      console.log("Screen size check:", {
        width,
        height,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
        isTooSmall
      })
    }

    // Check on mount
    checkScreenSize()

    // Check on resize
    const handleResize = () => {
      checkScreenSize()
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  if (!showOverlay) {
    return <>{children}</>
  }

  return (
    <>
      {children}
      <div className="fixed inset-0 bg-green-600/10 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-background/95 backdrop-blur-sm rounded-lg p-8 max-w-md mx-4 text-center shadow-lg">
          <div className="text-green-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            For an optimal experience with Poge, please resize your screen a little larger
          </h3>
          <p className="text-sm text-muted-foreground">
            Minimum requirement: Width: 1208px, Height: 422px
          </p>
          <div className="mt-4 text-xs text-muted-foreground">
            Current size: {currentSize.width}px × {currentSize.height}px
          </div>
          <button 
            onClick={() => setShowOverlay(false)}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    </>
  )
} 