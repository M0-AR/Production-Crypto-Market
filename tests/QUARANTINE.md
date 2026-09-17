# Quarantine log — flaky tests are defects with owners, not background noise.
#
# Policy (verified 2026 consensus):
# - A test that fails without a related code change is quarantined within 24h:
#   it keeps running and reporting, but stops blocking merges.
# - Owner has one week to fix or delete. Otherwise it is deleted automatically.
# - Retries are a safety net for genuinely non-deterministic externals
#   (CoinGecko shared pool, sandbox packet loss) — never a fix for order-dependence.
#
# Known-flaky surface (accepted, retried once inside helpers.mjs):
# - CoinGecko keyless pool: 200 on some attempts, 502-contract on others.
#   Mitigation: assertLiveOrDegraded (shape on 200, contract on 502), retry-once.
#
# | Date | Test | Symptom | Owner | Action | Status |
# |------|------|---------|-------|--------|--------|
# | — | — | — | — | — | Log is empty: no quarantined tests. |
