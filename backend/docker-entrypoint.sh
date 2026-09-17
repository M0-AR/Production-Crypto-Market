#!/bin/sh
# Compose-secret -> env plumbing (verified 2026 pattern): images without native
# *_FILE support read the mounted file here, once, before node starts.
# Secrets never appear in `docker inspect`, only in the process env of this pid.
set -eu
if [ -n "${REDIS_PASSWORD_FILE:-}" ] && [ -f "$REDIS_PASSWORD_FILE" ]; then
  _pw="$(cat "$REDIS_PASSWORD_FILE")"
  if [ -n "$_pw" ]; then
    case "${REDIS_URL:-}" in
      redis://*:*@*) ;; # already carries auth — leave it
      redis://*) REDIS_URL="redis://:${_pw}@${REDIS_URL#redis://}" ;;
    esac
    export REDIS_URL
  fi
  unset _pw
fi
exec "$@"
