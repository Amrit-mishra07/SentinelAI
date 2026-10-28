# SentinelAI

SentinelAI (formerly AIpSCR) scans GitHub repositories with Bandit, Semgrep and ESLint, explains findings with optional OpenAI analysis, exports PDF reports and proposes validated Python fixes as draft pull requests.

The implementation and verification status is recorded in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md). The complete backend/frontend roadmap and acceptance criteria are in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Container runtime, sandbox support and live integrations must be verified on the deployment host before a public release.

## Current workflow

1. Register or sign in and connect a GitHub repository.
2. Select a branch and start a scan.
3. Follow actual stages: queued, cloning, scanning, analyzing and reporting.
4. Review findings, scanner coverage, the exact commit SHA and AI provenance.
5. Download the PDF when its artifact is ready.
6. For a supported Python suggestion, request a validated draft PR and review it in GitHub.

A failed clone or scanner produces an explicit failure. Missing AI credentials leave scanner results available with AI marked unavailable. PR creation requires a user GitHub token, a matching source commit, an exact unified diff, Python syntax validation and a successful security re-scan. A draft PR is a proposed change; it is not counted as a verified resolution or merged automatically.

JavaScript/TypeScript findings and AI suggestions can be reviewed in the UI. Automated draft PR validation currently supports Python files only.

## Architecture

| Location | Role |
|---|---|
| apps/aipcsr-web | Next.js, React, TypeScript and Tailwind UI |
| apps/aipcsr-api | FastAPI, authentication, ownership and job/report APIs |
| apps/aipcsr-worker | Celery scan, analysis, PDF and patch jobs |
| core/scanner-core | Pinned scanner adapters, controlled rules and isolated execution |
| core/ai-core | Versioned prompts, structured responses and exact patch validation |
| core/db-core | Shared database sessions and Alembic migrations |
| infrastructure | Docker images, Nginx routing and deployment configuration |

PostgreSQL stores application records. Redis provides the task broker and result backend. API and worker images use the same source layout and UID 10001, and share a reports volume. The browser uses the same-origin /api route through Nginx.

## Local container setup

Requirements: Docker Engine with Compose v2, Git, and enough memory for the bounded scanner container. Review the scanner-isolation section before scanning repositories.

```bash
git clone https://github.com/Amrit-mishra07/SentinelAI.git
cd SentinelAI
cp .env.example .env
```

Generate separate values for JWT_SECRET, SCANNER_SERVICE_TOKEN and SECRETS_ENCRYPTION_KEY, then put them in .env. Run the first command twice, once for each token:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
python3 -c "import base64,secrets; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())"
```

Keep the encryption key stable and backed up securely. Existing encrypted integration credentials cannot be recovered if it is lost. New credentials are encrypted at rest; legacy plaintext records remain readable temporarily and should be re-saved through Settings to encrypt them. An empty integration value revokes that credential.

MAX_AI_FINDINGS_PER_SCAN limits AI requests to 25 findings per scan by default, prioritized by severity. Remaining findings retain their scanner results and show why AI was skipped. Each request has bounded context, output and retries.

OPENAI_API_KEY is optional: a saved user key takes precedence over the server key. Configure a GitHub token in Settings for private cloning and draft PR creation. Never put credentials in repository URLs or tracked configuration.

```bash
docker compose config --quiet
docker compose up -d --build
docker compose logs -f api worker
```

Open [http://localhost:8080](http://localhost:8080). HTTP_PORT changes the local port. The local proxy binds only to 127.0.0.1; PostgreSQL and Redis are not published to the host.

The API runs Alembic migrations before starting Uvicorn. The worker waits for API health, which follows migration startup. PostgreSQL, Redis and reports use named volumes. API and worker must receive the same database URL, encryption key and REPORTS_DIR.

The API reference is available from inside its container at /docs; the normal application API routes begin with /api. For local host development, run Uvicorn on 8000 and open [http://localhost:8000/docs](http://localhost:8000/docs).

## Scanner isolation

Scanner tools are installed separately from application dependencies:

- Bandit 1.9.4 and Semgrep 1.99.0, with setuptools 80.10.2, in /opt/scanners/python.
- ESLint 9.39.4 and @typescript-eslint/parser 8.46.2 in /opt/scanners.
- Application-controlled configuration and offline baseline rules; repository ESLint configuration/plugins are not loaded.

Production and local Compose route scans through a dedicated scanner container on an internal Docker network. It receives a bounded source-only archive and its own RPC token. It receives no database, GitHub, OpenAI or SMTP credentials. The container has a read-only root filesystem, a temporary source workspace, no published port, dropped capabilities, and CPU, memory and process limits. Its internal network has no external egress and does not contain PostgreSQL or Redis.

Scanner subprocesses use a minimal environment and bounded time/output/address-space limits. Repository ESLint configuration and plugins are never loaded. Tar inputs reject traversal, symlinks, duplicate entries, unsupported files and excessive size/count. Failures are explicit and never become a clean result.

The optional local `SCANNER_SANDBOX=bwrap` runner remains available when unprivileged namespaces are supported. It fails closed when unavailable. `SCANNER_SANDBOX=process` is only for controlled fixtures; `container` mode is reserved for the isolated scanner service. Do not weaken container isolation or mount the Docker socket.

The included Semgrep rules are a baseline, not complete vulnerability coverage. Findings and a clean result are limited to the configured rules and successfully completed engines.

## Local source development

Use Python 3.12 and Node.js 22. Application and scanner dependencies are intentionally separate.

```bash
python3.12 -m venv .venv
.venv/bin/pip install -r apps/aipcsr-worker/requirements.txt
.venv/bin/pip install pytest pytest-asyncio "httpx<0.28"
npm --prefix apps/aipcsr-web ci
```

Set DATABASE_URL and REDIS_URL to reachable local services and REPORTS_DIR to a writable shared directory. Keep the same SECRETS_ENCRYPTION_KEY in API and worker environments. Run migrations, then launch API and worker in separate terminals:

```bash
export PYTHONPATH="$PWD/apps/aipcsr-api:$PWD/apps/aipcsr-worker:$PWD/core/db-core:$PWD/core/ai-core:$PWD/core/scanner-core"
.venv/bin/python -m alembic -c core/db-core/alembic.ini upgrade head
.venv/bin/uvicorn app.main:app --reload --port 8000
.venv/bin/celery -A celery_app worker --loglevel=info --concurrency=2
```

For the frontend development server, use NEXT_PUBLIC_API_URL=http://localhost:8000/api and include http://localhost:3000 in CORS_ORIGINS, then run npm --prefix apps/aipcsr-web run dev. In deployed images the API URL stays /api and Nginx provides routing.

## Verification

Use a dedicated disposable test database: API test fixtures delete test records. Install dependencies before running:

```bash
DATABASE_URL=postgresql://sentinel:test-only-password@127.0.0.1:5432/sentinel_test \
  PYTHON_BIN=.venv/bin/python bash run_ci_tests.sh
```

The script applies migrations, runs API/core/worker tests, and checks frontend types, lint and production build. Fixture security scans use explicit process mode; external AI and GitHub mutations are mocked.

GitHub Actions additionally uses PostgreSQL/Redis service containers, checks migration idempotence, builds all production images, verifies API/worker imports as nonroot, and checks frontend startup. A green check verifies only its stated scope. Consult the status document for checks actually executed on the current change.

## Production configuration

docker-compose.prod.yml is a standalone configuration. Provide DATABASE_URL, POSTGRES_PASSWORD, JWT_SECRET, SECRETS_ENCRYPTION_KEY, SCANNER_SERVICE_TOKEN and an explicit HTTPS CORS_ORIGINS value. The database credentials must match DATABASE_URL.

The existing infrastructure/nginx/nginx.prod.conf is a template: replace localhost with the deployment domain and configure its certificate paths before starting it. Obtain the initial certificate through a controlled ACME/bootstrap workflow; the certbot service renews existing certificates and does not provision the first one.

```bash
docker compose -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.prod.yml up -d --build
```

Back up PostgreSQL, the report volume and the encryption key. Confirm migration behavior, volume ownership, sandbox execution, report download and credential revocation before accepting external users. Live OpenAI analysis and real GitHub draft PR creation require their own authorized integration checks; mocked tests do not verify account access.

## GitHub and notification setup

Settings supports encrypted personal access tokens or OAuth authorization with one-time state and PKCE. To enable OAuth, configure GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET and GITHUB_OAUTH_REDIRECT_URL (the /api/integrations/github/oauth/callback endpoint). Credentials are never returned to the browser. Expiring OAuth grants can be refreshed; removing a saved token also clears its refresh grant.

To enable continuous review, configure a connected repository in Settings. The server verifies repository administrator access before issuing a per-repository webhook URL and one-time secret. Add them in GitHub repository Settings > Webhooks using application/json, push and pull_request events. Signed events are deduplicated and tied to the requested commit. Fork PRs and deleted branches are ignored. Disabling a receiver stops processing; remove the remote webhook separately.

Email notifications are opt-in. Configure SMTP_HOST, SMTP_PORT, SMTP_FROM, optional SMTP_USERNAME/SMTP_PASSWORD and SMTP_USE_TLS. PUBLIC_BASE_URL must match the frontend origin for report links and OAuth redirects. Preferences and delivery history are available in Settings. The durable outbox is recovered by Celery beat. Ambiguous SMTP acceptance is shown as unknown and requires an explicit duplicate-risk confirmation before manual resend.

Application-owned GitHub App installation management, PR check publishing, incremental scanning, team roles, suppression/policy administration and scheduled scans remain separate product expansion milestones; they are not represented as working features in the UI.
