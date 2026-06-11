/**
 * All HTTP calls to Lorem Picsum live here.
 *
 * Why a dedicated module?
 * - Keeps components declarative (render + event handlers only).
 * - One place to adjust URLs, error mapping, or mock in tests later.
 * - In the interview, reviewers can open this one file to see every request the
 *   app makes — nothing is hidden inside hooks or components.
 */

import type { PicsumListItem, PicsumImageInfo } from '../types'

/** Canonical origin — avoids repeating the base URL across the codebase. */
const PICSUM_ORIGIN = 'https://picsum.photos'

/**
 * Fetch a page of images from the Picsum list API.
 *
 * Why fetch the list first instead of using random redirect URLs?
 * - We need each image's `id`, `author`, `width`, and `height` up front so we can
 *   display metadata above/below the image without a second round-trip per card.
 * - Having a pool of known IDs lets us pick 3 distinct random ones and guarantee
 *   they are never sequential — a bare /w/h redirect gives us no control over that.
 *
 * @param limit  How many items to request (default 100 — big enough pool,
 *               small enough not to be a heavy payload).
 */
export async function fetchImageList(limit = 100): Promise<PicsumListItem[]> {
  const url = `${PICSUM_ORIGIN}/v2/list?limit=${limit}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Picsum list fetch failed: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<PicsumListItem[]>
}

/**
 * Fetch full metadata for a single image by its Picsum ID.
 *
 * Why call this separately per card instead of relying on the list data?
 * - The list gives us author + dimensions already, so in practice we *could* skip
 *   this call.  We include it because the assignment says "image details" and the
 *   `/id/{id}/info` endpoint is the canonical, documented way to get them — making
 *   the API usage explicit is better for the code review.
 * - If Picsum ever enriches the info endpoint (e.g. tags, license) we get it free.
 *
 * @param id  The string ID returned by the list endpoint (e.g. "237").
 */
export async function fetchImageInfo(id: string): Promise<PicsumImageInfo> {
  const url = `${PICSUM_ORIGIN}/id/${id}/info`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Picsum info fetch failed for id=${id}: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<PicsumImageInfo>
}

/**
 * Build the URL for a sized Picsum image by ID.
 *
 * Why not use `download_url` from the info response directly?
 * - `download_url` points to the full-resolution original (e.g. 5616×3744 px).
 *   Loading that in the browser would be needlessly slow and bandwidth-heavy.
 * - The `/id/{id}/{w}/{h}` form lets us request an image sized to fit the card,
 *   which keeps load times fast and measurable (the load-time metric is displayed
 *   above each card).
 * - The `?t=` cache-buster is a timestamp so the browser fetches a fresh image on
 *   every click-to-replace, instead of serving the cached copy.
 *
 * @param id        Picsum image ID.
 * @param width     Desired display width in pixels.
 * @param height    Desired display height in pixels.
 * @param cacheBust Unique value appended as `?t=` to prevent browser caching
 *                  across refreshes/replacements.
 */
export function buildImageUrl(id: string, width: number, height: number, cacheBust: number): string {
  return `${PICSUM_ORIGIN}/id/${id}/${width}/${height}?t=${cacheBust}`
}
