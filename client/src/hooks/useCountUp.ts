import { useEffect, useRef, useState } from 'react'

export const useCountUp = (target: number, duration = 1200, start = true) => {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number>()
  const startTimeRef = useRef<number>()

  useEffect(() => {
    if (!start || target === 0) { setCount(target); return }

    const startTime = performance.now()
    startTimeRef.current = startTime

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration, start])

  return count
}