import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchImageList, fetchImageInfo, buildImageUrl } from '../api/picsum'
import type { PicsumListItem } from '../types'

/**
 * Slot status enum — drives what each ImageCard renders.
 *
 * idle     → not yet started
 * loading  → info + image are in flight; show a skeleton/spinner
 * loaded   → everything ready; show the real card
 * error    → something failed; show an error message
 */
export type SlotStatus = 'idle' | 'loading' | 'loaded' | 'error'

/**
 * Shape of one image slot.
 *
 * Why store `startTime` here?
 * - We record `performance.now()` the moment we kick off the image URL load.
 *   When `<img onLoad>` fires we subtract to get the user-visible load time.
 *   Keeping it in slot state means ImageCard can compute elapsed ms without
 *   needing access to the hook internals.
 */
export type ImageSlot = {
  status: SlotStatus
  id: string          // Picsum image ID
  startTime: number   // performance.now() at which image fetch was started
  author: string
  width: number       // original pixel width from /id/{id}/info
  height: number      // original pixel height from /id/{id}/info
  imageUrl: string    // sized URL built with buildImageUrl()
  loadMs: number      // milliseconds from startTime to onLoad; 0 until loaded
  error: string       // error message if status === 'error'
}

/** Return value of the hook — everything App and ImageGrid need. */
export type UseImagePoolReturn = {
  slots: ImageSlot[]
  replaceSlot: (index: number) => void
  updateSlot: (index: number, patch: Partial<ImageSlot>) => void
}

/**
 * Fisher–Yates shuffle (in-place, returns the array for convenience).
 *
 * Why Fisher–Yates instead of `.sort(() => Math.random() - 0.5)`?
 * - The sort trick is biased because comparison-based sorts do not call the
 *   comparator the same number of times for every element position.
 *   Fisher–Yates is O(n) and provably unbiased — the textbook correct answer.
 */
function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Pick `count` distinct items from `pool` whose IDs are not in `excludeIds`.
 *
 * Why exclude current IDs on replace?
 * - Prevents the same image reappearing in the slot, and prevents duplicating
 *   one of the other two currently-visible images.
 */
function pickDistinct(pool: PicsumListItem[], excludeIds: string[], count: number): PicsumListItem[] {
  const candidates = pool.filter((item) => !excludeIds.includes(item.id))
  shuffleInPlace(candidates)
  return candidates.slice(0, count)
}

/** Default (empty) slot shape — used to initialise state before data arrives. */
export function makeEmptySlot(): ImageSlot {
  return {
    status: 'idle',
    id: '',
    startTime: 0,
    author: '',
    width: 0,
    height: 0,
    imageUrl: '',
    loadMs: 0,
    error: '',
  }
}

/**
 * Card display dimensions (pixels).
 *
 * Why not use the original image dimensions?
 * - Originals can be 5000×3333 px — loading those over the network would be
 *   slow and waste bandwidth. We request a display-sized version from Picsum's
 *   resize API so the load time metric reflects what users actually experience.
 * - These values match the 4:3 aspect ratio used in ImageCard.module.css.
 */
const DISPLAY_WIDTH = 800
const DISPLAY_HEIGHT = 600

/**
 * useImagePool — manages the pool of available Picsum images and the three
 * visible slots.
 *
 * Responsibilities:
 * 1. Fetch the full image list once on mount.
 * 2. Pick 3 distinct, non-sequential random IDs and mark each slot 'loading'.
 * 3. For each 'loading' slot: fetch info + build image URL independently
 *    (no Promise.all — each card appears as soon as its own data is ready).
 * 4. Expose `replaceSlot(index)` so click-to-replace (Step 7) can swap one card.
 */
export function useImagePool(): UseImagePoolReturn {
  // The full list from /v2/list — stored so replaceSlot can draw new picks later.
  // We use a ref (not state) because changing the pool should not trigger a
  // re-render — only slot state changes drive renders.
  const poolRef = useRef<PicsumListItem[]>([])

  const [slots, setSlots] = useState<ImageSlot[]>([
    makeEmptySlot(),
    makeEmptySlot(),
    makeEmptySlot(),
  ])

  /**
   * Update a single slot immutably.
   *
   * Why a helper instead of spreading inline everywhere?
   * - Prevents off-by-one bugs when multiple async callbacks update different
   *   slots concurrently; each callback patches only its own index.
   */
  const updateSlot = useCallback((index: number, patch: Partial<ImageSlot>) => {
    setSlots((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }, [])

  // ── 1. Fetch pool + seed three initial slots ───────────────────────────────
  useEffect(() => {
    fetchImageList(100)
      .then((list) => {
        poolRef.current = list

        const picks = pickDistinct(list, [], 3)

        // All three setState calls are inside a Promise callback (async
        // boundary) so they are batched by React and do not cascade.
        setSlots(
          picks.map((item) => ({
            ...makeEmptySlot(),
            status: 'loading' as SlotStatus,
            id: item.id,
          }))
        )
      })
      .catch((err) => {
        console.error('Failed to load image pool:', err)
      })
  }, []) // runs once on mount

  // ── 2. Load info + image URL for every slot that transitions to 'loading' ──
  //
  // `loadSlotIfNeeded` is a useCallback so it can be listed as a stable dep in
  // the three per-slot effects below without causing infinite re-render loops.
  //
  // Why watch each slot individually instead of a single useEffect on all slots?
  // - A single effect on the slots array would re-run whenever *any* slot
  //   changes, which could double-trigger loads. Watching slot[i].id and
  //   slot[i].status per index keeps each card's lifecycle independent.
  //
  // Why fetch info AND set imageUrl in the same async chain?
  // - We need author + dimensions from `/id/{id}/info` before the card can
  //   display them. We start building the image URL immediately after we have
  //   the ID (using display dimensions) so the browser begins downloading the
  //   image as soon as the info response arrives — not after a separate await.
  //
  // Why record `startTime = performance.now()` here?
  // - This is the moment we hand the URL to the browser. `onLoad` in ImageCard
  //   subtracts this value to get the true browser download + decode time.
  const loadSlotIfNeeded = useCallback((index: number, id: string, status: SlotStatus) => {
    if (status !== 'loading' || !id) return

    fetchImageInfo(id)
      .then((info) => {
        // Record start time just before we set the image URL so the timer
        // reflects when the browser first receives the URL to fetch.
        const startTime = performance.now()
        const imageUrl = buildImageUrl(id, DISPLAY_WIDTH, DISPLAY_HEIGHT, startTime)

        updateSlot(index, {
          status: 'loaded',
          author: info.author,
          width: info.width,
          height: info.height,
          imageUrl,
          startTime,
        })
      })
      .catch((err) => {
        console.error(`Failed to load slot ${index} (id=${id}):`, err)
        updateSlot(index, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      })
  }, [updateSlot])

  useEffect(() => { loadSlotIfNeeded(0, slots[0].id, slots[0].status) }, [slots[0].id, slots[0].status, loadSlotIfNeeded]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadSlotIfNeeded(1, slots[1].id, slots[1].status) }, [slots[1].id, slots[1].status, loadSlotIfNeeded]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadSlotIfNeeded(2, slots[2].id, slots[2].status) }, [slots[2].id, slots[2].status, loadSlotIfNeeded]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3. replaceSlot — pick a new random image for one slot on click ─────────
  const replaceSlot = useCallback(
    (index: number) => {
      const pool = poolRef.current
      if (pool.length === 0) return

      // Read current IDs directly from state via the functional updater to
      // avoid stale closure issues — we exclude all three visible IDs.
      setSlots((prev) => {
        const currentIds = prev.map((s) => s.id).filter(Boolean)
        const [pick] = pickDistinct(pool, currentIds, 1)
        if (!pick) return prev

        const next = [...prev]
        next[index] = {
          ...makeEmptySlot(),
          status: 'loading',
          id: pick.id,
        }
        return next
      })
    },
    [] // poolRef is a ref — no deps needed
  )

  return { slots, replaceSlot, updateSlot }
}
