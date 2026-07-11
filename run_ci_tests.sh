docker run --rm --network host -v $(pwd):/workspace -w /workspace python:3.11-slim bash -c "
apt-get update && apt-get install -y libpq-dev gcc &&
pip install --upgrade pip &&
pip install -r apps/aipcsr-api/requirements.txt &&
pip install pytest 'httpx<0.28.0' pytest-asyncio alembic psycopg2-binary bandit semgrep &&
export DATABASE_URL=postgresql://aipcsr:aipcsr_dev@127.0.0.1:5432/aipcsr &&
export REDIS_URL=redis://127.0.0.1:6379 &&
cd core/db-core && PYTHONPATH=../../apps/aipcsr-api alembic upgrade head &&
cd ../../apps/aipcsr-api && PYTHONPATH=.:../../core pytest tests/ &&
cd ../../core && PYTHONPATH=../ pytest tests/
"
