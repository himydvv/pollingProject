# PulseVote

Real-time collaborative polling app built as a monorepo for live demos and collaborative decision-making.

The project is intentionally opinionated:
- `React` renders the dashboard and live chart.
- `Node.js + Express + Socket.IO` own the realtime API surface.
- `Redis` handles the hot path for vote counts, duplicate-voter protection, and expiring live sessions.
- `Redis OM` indexes live session metadata like `shareCode -> pollId`.
- `Supabase` handles anonymous auth, durable poll metadata, and final result snapshots.

## Monorepo Layout
- `apps/client`: Vite + React frontend
- `apps/server`: Express API, Socket.IO gateway, Redis/Supabase integration
- `packages/shared`: shared poll rules and socket event names
- `supabase/migrations`: schema and RPC function
- `docs`: architecture notes and supporting documentation

## Why This Design
- The live vote path is server-authoritative. The browser never increments counts locally.
- One vote per user is enforced in Redis with a set keyed by poll id.
- Poll sessions are temporary by design, so Redis TTL is a natural fit.
- Durable metadata stays in Supabase, while the fast-changing live state stays in Redis.
- A single realtime mechanism is used in the MVP: `Socket.IO`. That keeps the architecture simpler than mixing multiple live transports.

## Prerequisites
- `Node.js 20.19+`
- `npm`
- A `Supabase` project
- `Redis`

For local Redis, this repo includes `docker-compose.yml`.

## Setup
1. Copy `apps/server/.env.example` to `apps/server/.env` and fill in your Supabase and Redis values.
2. Copy `apps/client/.env.example` to `apps/client/.env` and fill in the client values.
3. Apply `supabase/migrations/202604120001_init_polling_schema.sql` in Supabase SQL Editor or your migration flow.
4. Start Redis with `docker compose up redis -d`.
5. Install dependencies with `npm install`.
6. Start both frontend and backend together with `npm run dev`.

If you want to start them separately:
- `npm run dev:server`
- `npm run dev:client`

## Runtime Flow
1. The client anonymously signs in with Supabase to get a stable user id.
2. Poll creation goes through the backend, which calls a Supabase RPC to create the poll and options safely.
3. The backend seeds Redis live-session keys and a Redis OM searchable session record.
4. Viewers join the poll room over Socket.IO.
5. Voting hits the backend, which uses an atomic Redis script to:
   - reject duplicate voters
   - reject invalid options
   - reject expired or closed polls
   - add the user to the voter set
   - increment the selected option count
6. The backend emits the updated poll state to every connected viewer.
7. When a poll closes or expires, the final counts are snapshotted into Supabase.

## Tradeoff To Understand
Active votes are intentionally treated as ephemeral live session state in Redis and are snapshotted when the poll closes or expires. If Redis is lost mid-session, active in-memory votes are lost. That is acceptable for this MVP because temporary sessions are a feature of the design, but in production you would likely add a durable vote log or outbox pattern.

## Documentation
- Architecture notes: [docs/architecture.md](docs/architecture.md)
