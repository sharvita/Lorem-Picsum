import { useState, useEffect } from 'react'

/**
 * Returns a live date/time string that updates every second.
 *
 * Why `setInterval` at 1 000 ms?
 * - The assignment only asks for seconds precision ("date and time"), so firing
 *   more often (e.g. with requestAnimationFrame at 60 fps) would waste CPU for
 *   no visible benefit.
 *
 * Why initialize state with `formatDateTime()` immediately?
 * - Avoids a brief blank flash on first render before the first interval fires.
 *   Without this the clock would show nothing for ~1 second on mount.
 *
 * Why return a string instead of a Date object?
 * - The component only needs to display text; keeping formatting logic inside the
 *   hook means the component stays a pure display layer with no formatting code.
 */

function formatDateTime(date: Date): string {
  // `toLocaleDateString` gives us "Tuesday, June 9, 2026"
  const datePart = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // `toLocaleTimeString` gives us "09:02:34 AM"
  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return `${datePart}  ${timePart}`
}

export function useClock(): string {
  // Initialize with the current time so the display is correct on first render
  const [dateTime, setDateTime] = useState(() => formatDateTime(new Date()))

  useEffect(() => {
    // Tick every second and update the displayed string
    const interval = setInterval(() => {
      setDateTime(formatDateTime(new Date()))
    }, 1000)

    // Cleanup: cancel the interval when the component unmounts to prevent
    // memory leaks and stale state updates on a removed component.
    return () => clearInterval(interval)
  }, []) // empty deps — this effect runs once on mount and never needs to re-run

  return dateTime
}
