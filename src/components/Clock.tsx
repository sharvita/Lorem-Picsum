import { useClock } from '../hooks/useClock'
import styles from './Clock.module.css'

/**
 * Displays the current date and time, centered near the top of the page.
 *
 * Why a separate component for something this simple?
 * - The assignment explicitly requires "date and time centered near the top" —
 *   isolating it means we can restyle or swap the hook without touching App or the
 *   image grid at all.
 * - Keeps App.tsx as a pure layout composer (no hook calls, no formatting logic).
 *
 * `aria-live="polite"` tells screen readers to announce updates without
 * interrupting the user — appropriate for a clock that changes every second.
 */
export function Clock() {
  const dateTime = useClock()

  return (
    <header className={styles.clock}>
      <time aria-live="polite" className={styles.time}>
        {dateTime}
      </time>
    </header>
  )
}
