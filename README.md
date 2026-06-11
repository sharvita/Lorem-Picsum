# Picsum Viewer

A React + TypeScript app that displays random photos from [Lorem Picsum](https://picsum.photos), built as a take-home assignment.

## Live demo

> (https://lorem-picsum-psi.vercel.app/#)

---

## What it does

- Shows the current **date and time**, ticking every second, centered at the top.
- Loads **3 random images in parallel** from the Lorem Picsum API on every page load. Each image appears as soon as it finishes — they do not wait for each other.
- Displays **above each image**: image ID, original pixel dimensions, and load time in milliseconds.
- Displays **below each image**: the photographer's name (when available).
- Each image has a **solid-color border** (coral / teal / amber, consistent per slot).
- **Click or tap any image** to replace just that one slot with a new random image. The other two stay unchanged.
- Images are always random and non-sequential — picked by shuffling a pool of 100 IDs.
- Content fills ≥ 80% of the viewport on every screen size.
- Responsive: 3-column grid on desktop, single column on mobile (≤ 900 px).

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + TypeScript | Component model maps cleanly to per-slot independent state |
| Build tool | Vite | Fast dev server, zero-config static output |
| Styling | CSS Modules | Scoped per component, no runtime, easy to explain line-by-line |
| Deploy | Vercel | Free, instant deploy from GitHub, no server config needed |
| No UI library | Hand-written layout | Demonstrates CSS / layout judgment directly |

---

## Project structure

```
src/
├── api/
│   └── picsum.ts          # All HTTP calls (list, info, image URL builder)
├── components/
│   ├── Clock.tsx           # Live date/time header
│   ├── Clock.module.css
│   ├── ImageCard.tsx       # Single image + meta + author
│   ├── ImageCard.module.css
│   ├── ImageGrid.tsx       # Responsive 3-column grid
│   └── ImageGrid.module.css
├── hooks/
│   ├── useClock.ts         # setInterval 1s → formatted date/time string
│   └── useImagePool.ts     # Pool fetch, random slot selection, parallel loading
├── types.ts                # Shared TypeScript shapes for Picsum API responses
├── App.tsx                 # Root layout composer
├── App.module.css
└── index.css               # Global reset + full-height root
```

---

## Running locally

**Requirements:** Node 18+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (hot-reload)
npm run dev
# → open http://localhost:5173
```

```bash
# Type-check + lint
npm run lint

# Production build (output in /dist)
npm run build

# Preview the production build locally
npm run preview
```

No environment variables required — the app talks directly to the public Picsum API.

---

## Key architectural decisions

### Why fetch `/v2/list` first instead of bare random URLs?

The `GET /v2/list?limit=100` call gives us 100 image objects with `id`, `author`, `width`, and `height` upfront. This lets us:
- Pick **3 distinct, non-sequential** IDs by shuffling the pool (Fisher–Yates).
- Display metadata (ID, dimensions, author) without extra round-trips.
- On click-to-replace, exclude the current 3 IDs so duplicates are impossible.

### Why independent per-slot loading instead of `Promise.all`?

Each slot has its own `useEffect` watching its `status`. When a slot flips to `'loading'`, it fires `fetchImageInfo` + sets `imageUrl` independently. The browser starts downloading all three images in parallel, and each `ImageCard` renders as soon as **its own** `<img onLoad>` fires — not when the slowest one finishes.

### How is load time measured?

`performance.now()` is recorded in the hook the moment `imageUrl` is set (= the moment the browser receives the URL to fetch). When `<img onLoad>` fires in `ImageCard`, `performance.now() - startTime` gives the elapsed milliseconds including network download and browser decode — the user-visible latency.

### Why CSS Modules over Tailwind / styled-components?

- No runtime overhead (unlike styled-components / emotion).
- No utility vocabulary to learn mid-project (unlike Tailwind).
- One `.module.css` file per component — scoped, portable, easy to walk through in a code review.

---

