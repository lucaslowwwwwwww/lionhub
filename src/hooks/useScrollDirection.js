import { useState, useEffect } from 'react'

/**
 * useScrollDirection
 * Returns 'up' or 'down' based on window scroll direction.
 * Includes thresholding and requestAnimationFrame for performance.
 */
export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState('up')
  const [prevOffset, setPrevOffset] = useState(0)

  useEffect(() => {
    let requestRunning = false
    const threshold = 10

    const updateScrollDirection = () => {
      const currentOffset = window.pageYOffset

      // Ensure header is visible at the very top
      if (currentOffset <= 0) {
        setScrollDirection('up')
        setPrevOffset(0)
        requestRunning = false
        return
      }

      // Only change direction if the moved distance is greater than the threshold
      if (Math.abs(currentOffset - prevOffset) < threshold) {
        requestRunning = false
        return
      }

      const newDirection = currentOffset > prevOffset ? 'down' : 'up'
      
      // Update state if direction changed
      if (newDirection !== scrollDirection) {
        setScrollDirection(newDirection)
      }

      setPrevOffset(currentOffset)
      requestRunning = false
    }

    const onScroll = () => {
      if (!requestRunning) {
        requestRunning = true
        requestAnimationFrame(updateScrollDirection)
      }
    }

    window.addEventListener('scroll', onScroll)

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [scrollDirection, prevOffset])

  return scrollDirection
}
