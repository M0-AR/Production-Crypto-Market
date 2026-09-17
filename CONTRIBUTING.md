# Contributing to Pro Screener

Thanks for stopping by. Small, reviewable PRs beat grand redesigns.

## Ground rules

1. **One concern per PR.** A bug fix is not a refactor.
2. **Green gates before review**: `./tests/run.sh` must print `ALL GREEN`
   (unit 15 + contract 22 + spike). Lint and typecheck are part of the build.
3. **Docs travel with code.** Behavior change without README/docs update gets sent back.
4. **No secrets, ever.** `secrets/*.txt` and `.env` are gitignored. If you accidentally
   stage one, stop and tell a maintainer — don't just `git reset` and hope.
5. **Quarantine, don't retry-loop.** A test failing without a related change goes to
   `tests/QUARANTINE.md` with an owner and a one-week deadline (see policy there).

## Local workflow

```bash
# 1. secrets (dev values only — never prod keys)
openssl rand -hex 32 > secrets/postgres_password.txt
openssl rand -hex 32 > secrets/jwt_secret.txt
openssl rand -hex 24 > secrets/redis_password.txt
echo -n "demo" > secrets/coingecko_key.txt
chmod 600 secrets/*.txt && cp .env.example .env

# 2. stack (prod images; dev HMR via compose.override.yml)
docker compose up -d --build --wait --wait-timeout 420

# 3. gates
./tests/run.sh                 # everything
(cd backend && npm test)       # backend unit only
(cd frontend && npm test)      # frontend unit only
```

On this shared dev host, ports 80/4000/5432/6379/8080 are taken — use the
local-port overlay: `docker compose -f docker-compose.yml -f compose.local.yml up -d --build`
(gateway on :18100). `compose.local.yml` is gitignored on purpose.

## Conventions

- TypeScript strict, ESLint `--max-warnings 0`, Prettier-formatted.
- Backend: stateless modules, DTO validation on every input, 502-contract on upstream failure.
- Frontend: server components by default, `"use client"` only on interactive leaves.
- Commits: short imperative subject (`fix movers null-sort`), body explains *why*.
- Be kind. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Security issues go to
  [SECURITY.md](SECURITY.md) — never a public issue.
