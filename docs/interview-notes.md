# Interview Notes

## 30-Second Project Summary
I built a real-time collaborative polling app in a monorepo using React on the frontend and Node.js with Express plus Socket.IO on the backend. Supabase handles anonymous auth and persistent poll metadata, while Redis handles the hot live-session state for vote counts, one-vote-per-user checks, and poll expiry.

## Questions You Should Expect

### Why use Redis here?
- Vote counts change frequently and need to update with very low latency.
- Redis hashes are a natural fit for option counters.
- Redis sets are a natural fit for one-vote-per-user restrictions.
- TTL makes temporary poll sessions easy to clean up automatically.

### Why not trust the frontend to block repeat votes?
- Frontend checks are easy to bypass.
- The backend is the authority, so duplicate-vote prevention must happen server-side.
- Redis lets the server check and mutate vote state atomically.

### Why use an atomic Redis script?
- If `SADD` and `HINCRBY` were separate calls, a race condition could allow inconsistent state.
- The script makes duplicate-check and count-increment part of one operation.

### Why use Supabase if Redis already stores the session?
- Redis is for fast, temporary live state.
- Supabase stores durable poll definitions and final result snapshots.
- Supabase Auth also gives each anonymous visitor a stable `userId`, which is useful for one-vote enforcement.

### Why anonymous auth?
- It gives every visitor a backend-verifiable identity without forcing sign-up friction.
- That identity becomes the voter key in Redis.

### Why use Redis OM if raw Redis already exists?
- Redis OM is used only for searchable session metadata like share-code lookup.
- Raw Redis is still used for the performance-critical vote path.

### Why Socket.IO?
- The app needs push updates when anyone votes.
- Polling over HTTP would be wasteful and feel less live.
- Socket.IO also makes poll-room fanout straightforward.

### What would you improve for production?
- Add durable event logging for votes in case Redis is lost mid-session.
- Add rate limiting and abuse protection.
- Add reconnect and recovery metrics.
- Add automated tests around the Redis vote script and poll expiry rules.

## Key Phrases To Use
- `server-authoritative vote path`
- `ephemeral live session state`
- `durable poll metadata`
- `atomic duplicate-check plus increment`
- `single realtime transport for a simpler MVP`
- `shared rules package in the monorepo to avoid drift`
