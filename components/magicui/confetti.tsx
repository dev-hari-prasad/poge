"use client"

import React, { useEffect, useRef } from "react"
import confetti from "canvas-confetti"

interface ConfettiProps {
  particleCount?: number
  angle?: number
  spread?: number
  startVelocity?: number
  decay?: number
  gravity?: number
  drift?: number
  flat?: boolean
  ticks?: number
  origin?: { x: number; y: number }
  colors?: string[]
  shapes?: string[]
  zIndex?: number
  disableForReducedMotion?: boolean
  useWorker?: boolean
  resize?: boolean
  canvas?: HTMLCanvasElement | null
  scalar?: number
}

interface ConfettiButtonProps {
  options?: ConfettiProps
  children: React.ReactNode
}

export function Confetti({
  particleCount = 50,
  angle = 90,
  spread = 45,
  startVelocity = 45,
  decay = 0.9,
  gravity = 1,
  drift = 0,
  flat = false,
  ticks = 200,
  origin = { x: 0.5, y: 0.5 },
  colors = ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"],
  shapes = ["square", "circle", "star"],
  zIndex = 100,
  disableForReducedMotion = false,
  useWorker = true,
  resize = true,
  canvas = null,
  scalar = 1,
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (disableForReducedMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const myConfetti = confetti.create(canvas, {
      resize,
      useWorker,
    })

    myConfetti({
      particleCount,
      angle,
      spread,
      startVelocity,
      decay,
      gravity,
      drift,
      flat,
      ticks,
      origin,
      colors,
      shapes,
      zIndex,
      scalar,
    })

    return () => {
      myConfetti.reset()
    }
  }, [
    particleCount,
    angle,
    spread,
    startVelocity,
    decay,
    gravity,
    drift,
    flat,
    ticks,
    origin,
    colors,
    shapes,
    zIndex,
    disableForReducedMotion,
    useWorker,
    resize,
    scalar,
  ])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex,
      }}
    />
  )
}

export function ConfettiButton({ options = {}, children }: ConfettiButtonProps) {
  const [isAnimating, setIsAnimating] = React.useState(false)

  const handleClick = () => {
    if (isAnimating) return

    setIsAnimating(true)
    confetti({
      ...options,
      particleCount: options.particleCount || 50,
      angle: options.angle || 90,
      spread: options.spread || 45,
      startVelocity: options.startVelocity || 45,
      decay: options.decay || 0.9,
      gravity: options.gravity || 1,
      drift: options.drift || 0,
      flat: options.flat || false,
      ticks: options.ticks || 200,
      origin: options.origin || { x: 0.5, y: 0.5 },
      colors: options.colors || ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"],
      shapes: options.shapes || ["square", "circle", "star"],
      zIndex: options.zIndex || 100,
      scalar: options.scalar || 1,
    })

    setTimeout(() => setIsAnimating(false), 1000)
  }

  return (
    <button onClick={handleClick} disabled={isAnimating}>
      {children}
    </button>
  )
}

// Utility function to trigger confetti programmatically
export function triggerConfetti(options: ConfettiProps = {}) {
  confetti({
    particleCount: options.particleCount || 50,
    angle: options.angle || 90,
    spread: options.spread || 45,
    startVelocity: options.startVelocity || 45,
    decay: options.decay || 0.9,
    gravity: options.gravity || 1,
    drift: options.drift || 0,
    flat: options.flat || false,
    ticks: options.ticks || 200,
    origin: options.origin || { x: 0.5, y: 0.5 },
    colors: options.colors || ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"],
    shapes: options.shapes || ["square", "circle", "star"],
    zIndex: options.zIndex || 100,
    scalar: options.scalar || 1,
  })
}
