# fe-hands-on-set3

Timed front-end interview exercise built with Vite, React, TypeScript, React Router and TanStack Query.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm test         # run the test suite once
npm run test:watch
npm run lint
npm run build
```

## Questions

| # | Question | PR link |
|---|----------|---------|
| 1 | Room Booking | (pending) |
| 2 | Find a Time | (pending) |

## Q2: Find a Time (`/find-a-time`)

Pick a date, a meeting length and attendees. The page shows each attendee's busy time
on a 09:00–18:00 timeline, plus an "Everyone free" row with the common free slots.
Date, duration and attendees live in the URL (`?date=&d=&people=a,b`).

- Click a free slot, or focus it and press Enter, to book it in a room that seats everyone.
- Arrow keys move between free slots.
- Availability refreshes every 10 seconds while the tab is visible.
- The mock API (`src/api/mockServer.ts`) waits 300–800 ms per call. A quarter of bookings
  fail with a simulated conflict, which shows how the page recovers.
- In dev mode, **Load 30×20 test data** adds 30 attendees with 20 bookings each.

Key files: `src/lib/freeSlots.ts` (pure slot calculation), `src/features/find-a-time/`,
`src/pages/FindATimePage.tsx`.
