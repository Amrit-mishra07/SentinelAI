# Implementation status

Status of the end-to-end foundation against [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md), based on the implementation branch `implementation/end-to-end-foundation`.

## Delivered in this change

- **M1 — Contracts and ownership:** persisted scan stages, commit SHA and engine outcomes; branch-aware requests; owner-scoped endpoints; stricter repository/ref validation; JWT refresh/access separation; encrypted integration secrets; Alembic migrations; explicit queue-dispatch errors.
- **M2 — Authentic scans:** bounded noninteractive clone; scanner adapters with pinned offline rules; no demonstration fallback; explicit engine failure/skip states; bounded source capture and path checks; isolated scanner service with a credential-free internal network; accurate worker cleanup and failure reporting.
- **M3 — AI and proposed fixes:** schema-constrained, bounded AI requests; stored provenance and validation state; exact unified-diff application, path and syntax checks, re-scan; stale-commit checks; verified draft-PR workflow. Missing credentials remain visible as unavailable.
- **M4 — Reports and product UX:** authenticated owner-scoped PDF report readiness/download; escaped report content and shared storage; truthful stages, errors, pagination and settings; no silent mock data or fabricated terminal output; nonroot API/worker/frontend images; CI for migrations, Python suites, frontend checks and image smoke tests.
- **M5/M6 foundation:** signed, replay-deduplicated per-repository webhook receivers, durable notification preferences/outbox and delivery history are implemented. Full GitHub App installation lifecycle, PR check publishing, incremental/baseline scanning, team roles, policy/suppressions, additional scanner families and scheduled/cost-governed scans remain follow-on work.

## Verification completed

- API, shared core and worker test suites: **146 passed** using SQLite fixtures and pinned scanner tools.
- Frontend formatter test, TypeScript, lint and production build: passed locally (Next.js TypeScript CLI disabled in favor of its compiler API to avoid a host Node subprocess issue). `npm audit` could not refresh its advisory database in this restricted environment; an earlier dependency-lock audit completed with no findings.
- API dependency audit completed with no known vulnerabilities at the time of the audit.
- Local Docker Compose full-stack fixture: migrations applied; authenticated scan completed against a controlled local Git repository with five findings; Bandit, Semgrep and ESLint all ran; authenticated PDF report downloaded. No OpenAI credential was configured, and AI was correctly shown as unavailable.
- A separate public GitHub clone attempt timed out because this environment’s containers could not establish outbound connections to GitHub. The scan reported the failure rather than substituting fixture results. A live GitHub OAuth/webhook delivery, OpenAI request, SMTP delivery or external draft-PR mutation was not performed.

## Rollout requirements and remaining work

Configure production secrets and GitHub OAuth/webhook settings; allow worker outbound HTTPS to GitHub for public/private repository clones; provide scanner sandbox/runtime resources; rotate any pre-existing plaintext credentials; and run a deliberately authorized live scan and draft-PR check in a dedicated test repository. Back up production database/report storage and encryption key before applying migrations. Keep automatic fixes as draft PRs requiring human review.

The plan’s team and policy expansion remains future product work. The status here records code and evidence separately; simulated or fixture-backed work is not presented as a live third-party integration.
