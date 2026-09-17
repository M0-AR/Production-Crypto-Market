-- Drop dead prototype table (stateless app keeps cache in Redis, jobs in BullMQ)
DROP TABLE IF EXISTS "cached_markets";
