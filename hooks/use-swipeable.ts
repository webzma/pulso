"use client"

import { useRef, useState, useCallback, type PointerEvent } from "react"

/**
 * Simple horizontal swipe-to-action hook for cards.
 *
 * - Touch / pointer drag only horizontally
 * - Tracks dragX (px), -ve = swiping left, +ve = swiping right
 * - Calls onSwipeLeft / onSwipeRight when threshold passed on release
 * - Rejects gestures that started as vertical scrolls
 */
export function useSwipeable({
  threshold = 80,
  onSwipeLeft,
  onSwipeRight,
  disabled,
}: {
  threshold?: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  disabled?: boolean
}) {
  const [dragX, setDragX] = useState(0)
  const [active, setActive] = useState(false)
  const startRef = useRef<{ x: number; y: number; locked: "h" | "v" | null } | null>(null)
  const pointerIdRef = useRef<number | null>(null)

  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    if (disabled) return
    if (e.pointerType === "mouse") return // mobile-first; mouse users have buttons
    startRef.current = { x: e.clientX, y: e.clientY, locked: null }
    pointerIdRef.current = e.pointerId
  }, [disabled])

  const onPointerMove = useCallback((e: PointerEvent<HTMLElement>) => {
    if (!startRef.current || pointerIdRef.current !== e.pointerId) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y

    if (startRef.current.locked === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      startRef.current.locked = Math.abs(dx) > Math.abs(dy) ? "h" : "v"
    }
    if (startRef.current.locked !== "h") return

    // Capture pointer once we've decided it's a horizontal gesture
    if (!active) {
      try {
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      } catch {}
      setActive(true)
    }
    e.preventDefault()
    // Soft clamp via square-root easing so it feels rubbery past threshold
    const clamped =
      Math.sign(dx) * Math.min(Math.abs(dx), threshold + Math.sqrt(Math.max(0, Math.abs(dx) - threshold)) * 6)
    setDragX(clamped)
  }, [active, threshold])

  const reset = useCallback(() => {
    setDragX(0)
    setActive(false)
    startRef.current = null
    pointerIdRef.current = null
  }, [])

  const onPointerUp = useCallback((e: PointerEvent<HTMLElement>) => {
    if (!startRef.current || pointerIdRef.current !== e.pointerId) {
      reset()
      return
    }
    const dx = dragX
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
    reset()
    if (dx <= -threshold) onSwipeLeft?.()
    else if (dx >= threshold) onSwipeRight?.()
  }, [dragX, onSwipeLeft, onSwipeRight, reset, threshold])

  return {
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: () => reset(),
      style: {
        touchAction: active ? "pan-y" : ("auto" as const),
      },
    },
    dragX,
    active,
    threshold,
  }
}
