# Security Policy

## Threat model (what we actually defend)

Pro Screener is a self-hosted, single-tenant market terminal: `nginx` is the only
public surface; Postgres/Redis live on an internal-only Docker network; secrets are
mounted files, never env vars; containers run non-root with dropped capabilities.
We care about: auth bypass, remote code execution, secret exfiltration, SSRF via the
CoinGecko proxy, dependency CVEs, and container-escape hardening regressions.

Out of scope: operator misconfiguration (weak `secrets/*.txt` on a public host),
CoinGecko/Alternative.me availability or data accuracy, and denial-of-wallet via
someone else's API keys.

## Supported versions

| Version | Supported |
| ------- | --------- |
| `main` (pre-1.0) | Best effort — report it, we'll triage fast |
| Tagged `v*` releases | Security fixes for the latest minor |

## Reporting (private only)

**Do not open a public issue.** Use GitHub's **Private vulnerability reporting**
(Security tab → Report a vulnerability) once the repo is public. Until then, contact
the maintainer directly (see git log / README for the current contact).

Include: affected version/commit, reproduction steps, impact assessment, and (ideally)
a failing test or PoC. Please give us a reasonable coordinated-disclosure window.

## Response targets

- Acknowledgement: **≤ 3 days**
- Triage + severity: **≤ 7 days**
- Fix for critical (RCE, auth bypass, secret leak): **≤ 30 days**

## Hardening already in place

Non-root images, `no-new-privileges`, `cap_drop: ALL` (minimal add-backs), internal
data network, secrets-as-files, Redis `requirepass`, rate limits that speak 429,
graceful shutdown with drain budgets, Dependabot (see `.github/dependabot.yml`).
