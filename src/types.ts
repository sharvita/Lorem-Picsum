/**
 * Shared TypeScript shapes for Picsum API responses (Step 2 will wire `fetch`).
 *
 * We define types up front so Step 2–5 can stay focused on behavior instead of
 * guessing JSON fields during the interview.
 */

/** One row from `GET https://picsum.photos/v2/list` */
export type PicsumListItem = {
  id: string
  author: string
  width: number
  height: number
  url: string
  download_url: string
}

/** Response from `GET https://picsum.photos/id/{id}/info` */
export type PicsumImageInfo = {
  id: string
  author: string
  width: number
  height: number
  url: string
  download_url: string
}
