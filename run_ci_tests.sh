#!/usr/bin/env bash
# Run against a disposable test database: API fixtures delete test records.
set -euo pipefail
cd -- "$(dirname -- "$0")"
task_root="$PWD"
task_python="$task_root/${PYTHON_BIN:-.venv/bin/python}"
if [[ -n "${PYTHON_BIN:-}" && "${PYTHON_BIN}" = /* ]]; then
  task_python="$PYTHON_BIN"
fi
if [[ ! -x "$task_python" ]]; then
  task_python="$(command -v python3)"
fi

: "${DATABASE_URL:?Set DATABASE_URL to a disposable migrated test database}"
export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379/0}"
export REPORTS_DIR="${REPORTS_DIR:-$task_root/reports/test}"
export OPENAI_API_KEY=""
export PYTHONPATH="$task_root/apps/aipcsr-api:$task_root/apps/aipcsr-worker:$task_root/core/db-core:$task_root/core/ai-core:$task_root/core/scanner-core${PYTHONPATH:+:$PYTHONPATH}"
# Controlled fixture files only. Production Compose always uses bwrap.
export SCANNER_SANDBOX="${SCANNER_SANDBOX:-process}"

"$task_python" -m alembic -c core/db-core/alembic.ini upgrade head
"$task_python" -m pytest apps/aipcsr-api/tests core/tests apps/aipcsr-worker/tests -q
if [[ "${SKIP_FRONTEND:-0}" != "1" ]]; then
  npm --prefix apps/aipcsr-web test
  npm --prefix apps/aipcsr-web run typecheck
  npm --prefix apps/aipcsr-web run lint
  npm --prefix apps/aipcsr-web run build
fi
