# Architecture Notes

## High-Level Modules
- `apps/client`
  - Anonymous auth bootstrap
  - Poll creation screen
  - Poll room screen
  - Recharts live result board
  - Socket.IO subscription hook
- `apps/server`
  - Config and environment parsing
  - Supabase auth verification
  - Poll lifecycle module
  - Vote module
  - Redis live session storage
  - Redis OM session lookup
  - Socket.IO room broadcast layer
- `packages/shared`
  - Poll validation rules
  - Poll status values
  - Socket event names

## Data Model
- `public.polls`
  - durable poll metadata
  - owner id
  - share code
  - lifecycle status
  - expiry
- `public.poll_options`
  - durable option list and ordering
- `public.poll_results`
  - final snapshot after close or expiry

## Redis Key Design
- `poll:{pollId}:meta`
  - hash
  - fields: `pollId`, `ownerId`, `shareCode`, `question`, `status`, `expiresAtMs`
- `poll:{pollId}:counts`
  - hash
  - field per `optionId`
  - value is integer vote count
- `poll:{pollId}:voters`
  - set
  - contains `userId`
  - used for one-vote-per-user enforcement

## Redis OM Role
Redis OM is used for searchable live session metadata so the backend can resolve `shareCode -> pollId` without scanning raw keys. The hot vote path still uses raw Redis commands because counters, sets, TTL, and Lua/EVAL are a better fit there.

## Vote Flow
1. Client sends `POST /api/polls/:pollId/votes` with bearer token and `optionId`.
2. Backend verifies the Supabase access token and gets `userId`.
3. Backend loads durable poll definition from Supabase.
4. Backend ensures the Redis live session exists.
5. Backend runs one atomic Redis script that:
   - checks whether the session exists
   - checks whether the poll is still active
   - checks whether the poll is expired
   - checks whether the option exists
   - checks whether the user already voted
   - adds the user to the voter set
   - increments the option counter
6. Backend reloads the latest poll state and emits it to the Socket.IO room.

## Close / Expiry Flow
1. The backend reads the Redis counts.
2. It computes totals, percentages, and leading option.
3. It updates the poll status in Supabase.
4. It stores a final JSON snapshot in `public.poll_results`.
5. It updates Redis metadata and keeps keys alive briefly for post-close reads.
6. It emits `poll:closed` to room subscribers.

## Why Socket.IO Instead Of Supabase Realtime For Live Votes
- The vote path already depends on Redis for duplicate-vote protection and hot counters.
- Socket.IO gives explicit room semantics for each poll.
- Keeping one realtime transport in the MVP makes the architecture easier to explain and debug.

## Main Risks
- Redis restart during an active session loses in-memory vote state.
- Socket reconnect should always be able to refetch current state from the HTTP API.
- Viewer-specific fields like `hasVoted` are preserved client-side when anonymous socket broadcasts arrive.
