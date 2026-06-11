import { Clock } from './components/Clock'
import { ImageGrid } from './components/ImageGrid'
import { useImagePool } from './hooks/useImagePool'
import styles from './App.module.css'

/**
 * App root — thin orchestrator that wires the hook to the components.
 *
 * Why handle onImageLoad here instead of inside ImageCard?
 * - `updateSlot` lives in the hook; lifting the callback to App keeps the data
 *   update path: hook → App → ImageGrid → ImageCard → back up to App → hook.
 *   Each layer only knows what it needs to know.
 */
function App() {
  const { slots, replaceSlot, updateSlot } = useImagePool()

  /**
   * Called by ImageCard's <img onLoad> event.
   *
   * Why write loadMs into slot state rather than keeping it local to the card?
   * - The assignment says "present load time ABOVE the image" — that text is in
   *   the meta block which renders before the image. Storing loadMs in slot state
   *   causes a re-render of the meta block as soon as the image finishes, so the
   *   final ms value appears at the right moment.
   * - A loadMs of -1 means the image errored; we surface that via slot.status
   *   already, so we just ignore the -1 case here.
   */
  function handleImageLoad(index: number, loadMs: number) {
    if (loadMs >= 0) {
      updateSlot(index, { loadMs })
    }
  }

  return (
    <div className={styles.app}>
      <Clock />
      <ImageGrid
        slots={slots}
        onReplace={replaceSlot}
        onImageLoad={handleImageLoad}
      />
    </div>
  )
}

export default App
