# TravelBook — fill every seat

Tour booking dashboard: seat inventory, bookings with capacity guard,
cancellations and revenue. Built to demo to real travel agencies.

## Run it

```bash
npm install
cp .env.example .env   # optional — MongoDB persistence
npm run dev            # http://localhost:3000
```

Without `MONGODB_URI` data lives in `.data/` (gitignored file store).

## Features (built feature-by-feature)

- **F1** — tours model with live seat counts + CRUD API
- **F2** — booking engine: confirmed seats can never exceed capacity + revenue
- **F3** — dashboard UI (seat bars, sold-out state, bookings) + demo seed
- **F4** — verified build + live tests (overbook rejected, exact-fit accepted)

## Notes

- `cacheComponents: false` + `dynamic = "force-dynamic"` so every number is live.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · Mongoose (optional)
