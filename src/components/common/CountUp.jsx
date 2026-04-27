import { useState, useEffect, useRef } from 'react'

/**
 * A lightweight count-up animation component.
 * @param {number} end - The target value to count up to.
 * @param {number} duration - Animation duration in ms.
 * @param {string} prefix - String to prepend (e.g., "RM ").
 * @param {string} suffix - String to append (e.g., "%").
 * @param {number} decimals - Number of decimal places.
 */
export default function CountUp({ end, duration = 1500, prefix = '', suffix = '', decimals = 0 }) {
  const [count, setCount] = useState(0)
  const countRef = useRef(0)
  const startTimeRef = useRef(null)
  const frameRef = useRef(null)

  useEffect(() => {
    // Reset and start animation whenever 'end' changes
    startTimeRef.current = null
    const startValue = countRef.current
    const endValue = Number(end) || 0
    
    function animate(currentTime) {
      if (!startTimeRef.current) startTimeRef.current = currentTime
      const elapsed = currentTime - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function: easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      
      const currentCount = startValue + (endValue - startValue) * easeProgress
      countRef.current = currentCount
      setCount(currentCount)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [end, duration])

  return (
    <span>
      {prefix}
      {count.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  )
}
