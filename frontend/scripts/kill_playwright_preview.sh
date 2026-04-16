#!/usr/bin/env bash

set -euo pipefail

for port in "$@"; do
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti tcp:${port} || true)"
    if [[ -n "${pids}" ]]; then
      echo "[playwright-cleanup] stopping processes on tcp:${port}"
      kill ${pids} >/dev/null 2>&1 || true
      sleep 1
      kill -9 ${pids} >/dev/null 2>&1 || true
    fi

    for _ in 1 2 3 4 5; do
      if [[ -z "$(lsof -ti tcp:${port} || true)" ]]; then
        break
      fi
      sleep 1
    done
    continue
  fi

  if command -v fuser >/dev/null 2>&1; then
    if fuser "${port}/tcp" >/dev/null 2>&1; then
      echo "[playwright-cleanup] stopping processes on tcp:${port}"
      fuser -k "${port}/tcp" >/dev/null 2>&1 || true
    fi

    for _ in 1 2 3 4 5; do
      if ! fuser "${port}/tcp" >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done
  fi
done
