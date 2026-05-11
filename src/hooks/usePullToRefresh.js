import { useEffect, useState, useRef } from 'react'

/**
 * Pull-to-refresh: triggers onRefresh when user pulls down at top of page.
 * Returns {pulling, distance} for UI feedback.
 */
export function usePullToRefresh(onRefresh, threshold = 80) {
  const [pulling, setPulling] = useState(false)
  const [distance, setDistance] = useState(0)
  const startY = useRef(0)
  const isPulling = useRef(false)

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY > 0) return
      startY.current = e.touches[0].clientY
      isPulling.current = true
    }
    const onTouchMove = (e) => {
      if (!isPulling.current) return
      const dy = e.touches[0].clientY - startY.current
      if (dy > 0 && window.scrollY <= 0) {
        const eased = Math.min(dy * 0.5, threshold * 1.5)
        setDistance(eased)
        setPulling(eased > threshold * 0.4)
      }
    }
    const onTouchEnd = async () => {
      if (!isPulling.current) return
      isPulling.current = false
      if (distance > threshold) {
        await onRefresh?.()
      }
      setDistance(0)
      setPulling(false)
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [distance, onRefresh, threshold])

  return { pulling, distance }
}
