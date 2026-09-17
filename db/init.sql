# Progressive scale-up order (verified 2026 consensus — do NOT skip steps):
# 1. Vertical first: bigger box ($20/mo handles 100s RPS, millions/day). No code change.
# 2. Horizontal stateless: 2+ backend replicas behind nginx (this file). JWT + Redis sessions, no sticky.
# 3. DB connections: PgBouncer / pooler (pool_size 10, max_overflow 20, pre_ping). Fixes "too many clients".
# 4. Read replicas: writes -> primary, reads -> replicas. Accept replication lag (usually <200ms).
#    Only exception: read-your-own-write (e.g. just-posted item) reads from primary.
# 5. Cache-aside Redis: check cache -> DB on miss -> populate with TTL+jitter. Target hit ratio >80%.
#    Allowed stale 30s: follower counts, market lists. NEVER cache: balances, auth, inventory decrement.
# 6. Queue + worker: slow work (email, video, 3rd-party API) -> BullMQ -> worker. Respond fast, process later.
#    Jobs need: retries with backoff+jitter, DLQ, idempotency keys.
# 7. Sharding LAST: only when data won't fit on one machine or writes exceed one primary.
#    Pick shard key so 99% queries hit one shard. Cross-shard queries = scatter-gather = slow.

# Connection-pool guard (Prisma): keep pool small, let PgBouncer multiplex.
# DATABASE_URL="postgresql://app:pass@postgres:5432/appdb?connection_limit=10&pool_timeout=10"
