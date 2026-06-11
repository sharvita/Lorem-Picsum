import type { ImageSlot } from '../hooks/useImagePool'
import styles from './ImageCard.module.css'

/**
 * Solid border colors per slot index (0, 1, 2).
 *
 * Why a fixed palette instead of random colors?
 * - Consistent, visually distinct borders every render — no color thrashing on
 *   click-to-replace. Easy to explain: "index 0 is coral, 1 is teal, 2 is amber."
 */
const BORDER_COLORS = ['#f87171', '#2dd4bf', '#fbbf24'] as const

type Props = {
  slot: ImageSlot
  index: number
  onImageLoad: (loadMs: number) => void
  onClick: () => void
}

/**
 * ImageCard — renders one image with its metadata.
 *
 * Layout (per assignment):
 *   1. Meta block ABOVE the image: ID · width×height · load time
 *   2. Image with a solid-color border (color = index in BORDER_COLORS palette)
 *   3. Author name BELOW the image (when API provides it)
 *
 * Click-to-replace (Step 7):
 * - The click target is the image wrapper (not the whole card), matching the
 *   assignment wording "clicking or tapping any image should load a new image."
 * - The error state is also clickable so the user can retry a failed load.
 * - `onKeyDown` for Enter makes it keyboard-accessible.
 *
 * Why does this component receive `onImageLoad` as a prop?
 * - The timer starts in the hook when the slot transitions to 'loading', so the
 *   elapsed time covers the full round-trip (request kick-off → browser paint).
 *   If the card measured it internally it would only see decode time after the
 *   URL was already built, under-reporting real network latency.
 */
export function ImageCard({ slot, index, onImageLoad, onClick }: Props) {
  const borderColor = BORDER_COLORS[index % BORDER_COLORS.length]

  // ── Loading / idle state ───────────────────────────────────────────────────
  if (slot.status === 'idle' || slot.status === 'loading') {
    return (
      <article
        className={styles.card}
        style={{ border: `4px solid ${borderColor}` }}
        aria-label={`Image slot ${index + 1} loading`}
      >
        <div className={styles.skeleton}>
          <div className={styles.spinner} />
          <span>Loading…</span>
        </div>
      </article>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (slot.status === 'error') {
    return (
      <article
        className={styles.card}
        style={{ border: `4px solid ${borderColor}` }}
        aria-label={`Image slot ${index + 1} failed — click to retry`}
      >
        {/*
          The error card is also a click target so the user can retry.
          We reuse `onClick` (= replaceSlot) which picks a brand new ID,
          rather than retrying the same failed ID.
        */}
        <div
          className={styles.errorState}
          onClick={onClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onClick()}
        >
          <span>Failed to load. Click to try another.</span>
        </div>
      </article>
    )
  }

  // ── Loaded state ───────────────────────────────────────────────────────────
  return (
    <article
      className={styles.card}
      style={{ border: `4px solid ${borderColor}` }}
      aria-label={`Image ${slot.id} by ${slot.author}`}
    >
      {/* ── Meta block (ABOVE the image — assignment requirement) ── */}
      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>ID:</span>
          {slot.id}
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Size:</span>
          {slot.width} × {slot.height} px
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Load time:</span>
          {/* loadMs is 0 until onLoad fires; show a dash until then */}
          {slot.loadMs > 0 ? `${slot.loadMs} ms` : '—'}
        </div>
      </div>

      {/* ── Image (click target for replace) ── */}
      <div
        className={styles.imageWrapper}
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label="Click to load a new random image"
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
      >
        <img
          src={slot.imageUrl}
          alt={`Photo by ${slot.author}`}
          className={styles.image}
          onLoad={() => {
            /*
             * `performance.now() - slot.startTime` = elapsed ms from when we
             * handed the URL to the browser (in the hook) to when the browser
             * finished decoding and painting the image.
             * This is the user-visible load time displayed in the meta block above.
             */
            const elapsed = Math.round(performance.now() - slot.startTime)
            onImageLoad(elapsed)
          }}
          onError={() => {
            /*
             * Image network/decode error — signal -1 so App can ignore the
             * loadMs update (error state is already set by the hook).
             */
            onImageLoad(-1)
          }}
        />
      </div>

      {/* ── Author (BELOW the image — assignment requirement) ── */}
      {/*
        The API returns author for all known images, but we guard for empty
        strings rather than rendering a blank row.
      */}
      {slot.author && (
        <div className={styles.author} title={slot.author}>
          {slot.author}
        </div>
      )}
    </article>
  )
}
