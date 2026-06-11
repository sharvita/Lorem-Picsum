import type { ImageSlot } from '../hooks/useImagePool'
import { ImageCard } from './ImageCard'
import styles from './ImageGrid.module.css'

type Props = {
  slots: ImageSlot[]
  onReplace: (index: number) => void
  onImageLoad: (index: number, loadMs: number) => void
}

/**
 * Renders the three image slots in a responsive grid.
 *
 * Why does ImageGrid receive all three callbacks from App instead of owning
 * its own state?
 * - ImageGrid is a pure layout component — it knows nothing about API calls or
 *   timing. Keeping it data-free means the entire data flow is in one place
 *   (useImagePool → App → here) and easy to trace in the interview.
 */
export function ImageGrid({ slots, onReplace, onImageLoad }: Props) {
  return (
    <main className={styles.grid} aria-label="Image grid">
      {slots.map((slot, i) => (
        <ImageCard
          key={i}
          slot={slot}
          index={i}
          onClick={() => onReplace(i)}
          onImageLoad={(loadMs) => onImageLoad(i, loadMs)}
        />
      ))}
    </main>
  )
}
