# SentinelAI end-to-end implementation plan

Baseline: `b910017`, reviewed 27 October 2026. This plan covers backend, frontend, data, security, delivery and verification. Work proceeds in dependency order; status and evidence are recorded in `IMPLEMENTATION_STATUS.md`.

## Product outcome

A signed-in repository owner can connect a GitHub repository, select its branch, launch an authentic scan, inspect findings tied to a real commit, request a validated AI suggestion, open a real draft pull request, and download a report. Failures, unsupported operations and missing integrations are visible. No failed operation substitutes demonstration results.

## Architecture and scope

Preserve the Next.js App Router frontend, FastAPI API, PostgreSQL/SQLAlchemy storage, Celery/Redis jobs, shared scanner/AI cores, Docker Compose and Nginx. Keep long-running work outside API requests. Preserve existing API routes while extending their typed contracts. Human review remains required before merging generated changes.

The initial delivery implements and tests the existing manual repository-to-report/PR workflow. Continuous GitHub review, notification delivery and team policy features follow as explicit milestones below; they are not prerequisites for a truthful manual scan. Live service verification requires configured credentials and an accessible deployment environment.

## M1 — Shared contracts, data and authentication

Backend:
- Validate canonical HTTPS GitHub repository URLs, reject credentials/ports/query fragments and unsafe refs, authorize all repository/scan/report/patch operations by owner.
- Accept an optional scan branch; default to the repository's saved branch. Persist the resolved commit SHA.
- Keep scan states `pending`, `scanning`, `completed`, `failed`; expose an independent stage `pending`, `cloning`, `scanning`, `analyzing`, `reporting`, `completed`, `failed` and per-engine results.
- Return `repository_id`, branch/SHA, timestamps, finding count, stage, severity and errors. Retain legacy `repository` response for compatibility.
- Add report readiness/error state and immutable source/context for each finding. Use Alembic migrations compatible with existing PostgreSQL deployments and SQLite tests.
- Preserve legacy patch states and add `validating`, `pr_opened`, `failed`. A PR opened is not a vulnerability resolved.
- Encrypt saved integration credentials with Fernet and a configured encryption key, redact responses, support explicit credential removal, and document legacy-secret rotation.
- Handle broker dispatch failures explicitly and persist an accurate failed state.

Frontend:
- One typed API client, singular route names matching FastAPI, shared interfaces for scan/report/finding/integration responses.
- Correct session restoration, token expiration/401 handling and authenticated navigation.
- Repository connection validates URL and branch; scan dialog shows and submits the chosen branch.
- Never turn transport/auth/server errors into example data.

Exit: contract and ownership tests pass, unsafe input is rejected, queue failure is visible, stored secrets are encrypted, and the frontend type-checks against the implemented responses.

## M2 — Authentic and constrained scanning

Backend/worker:
- Clone with bounded time, an explicit branch, noninteractive Git and credentials scoped only to clone access. Disable target hooks/submodules and clean temporary directories on every outcome.
- Remove fallback demo files. Record the real commit and persist each scanner outcome, including errors and skipped engines.
- Use a common engine interface, controlled pinned configurations, no `npx` or target ESLint configs/plugins, bounded subprocess time/output/resources and a minimal environment.
- Run scanners inside a filesystem/network namespace sandbox in production. Fail closed if the sandbox is unavailable; provide an explicit local fixture-only process mode for development/tests.
- Normalize severity and scanner rule identity, deduplicate matching findings, reject out-of-repository file paths and symlink reads.
- Capture bounded source content/context before deleting the checkout. Do not persist known secret-file content or send it to the AI service.
- Prevent engine failure from becoming a clean report; make failure diagnostics available through the scan API.

Frontend:
- Show stages and engine outcomes from the backend, real branch/SHA, accurate totals and explicit failed/error states with retry.
- Stop polling only for terminal states; keep transient API failures visible without fabricating progress.

Exit: vulnerable and clean fixtures produce expected results; failed clone, malformed output, timeout, sandbox unavailability and mixed engine results cannot become success; cleanup is verified.

## M3 — Contextual AI suggestions and validated draft PRs

Backend/AI:
- Use the owning user's decrypted OpenAI key or an explicitly configured application key; missing credentials produce `unavailable` provenance with no fabricated patch.
- Supply finding details and bounded source context as untrusted data. Use schema-constrained JSON and validate output locally. Record provider/model, status, commit/hash and validation outcome.
- Bound network time, retries/backoff and input/output size. Avoid logging credentials or full source.
- Represent fixes as a single-file unified diff. Apply with exact context matching to the saved source, reject path traversal and malformed/multiple-file patches, validate supported syntax, and reject unsupported automatic validation safely.
- Verify the destination branch still references the scanned SHA, verify original file content, and use a deterministic branch plus verified GitHub responses for a real draft PR.
- No token or invalid patch produces an error. Concurrent/duplicate requests do not create competing patch operations. Never label PR creation as merged/resolved.

Frontend:
- Explain AI availability and validation results, render proposed diff and source location, allow a deliberate draft-PR request and dismiss action.
- Display real `validating`, `pr_opened`, `failed`, `rejected` states, preserve errors, poll pending actions, and link only to verified returned PR URLs.

Exit: deterministic tests cover valid/invalid diff, stale commit, missing credentials, unsupported validation, API refusal/rate limits, GitHub errors and real draft-PR payloads without external mutations.

## M4 — Reports, daily UX and operational delivery

Backend:
- Generate escaped PDF text without interpolating executable HTML; write atomically to a single configured report directory shared by API and worker.
- Mark completion only after report generation succeeds. Expose PDF readiness and errors; serve authenticated downloads scoped to the owner.
- Correct global severity counts, pagination and dashboard aggregates. Avoid treating an empty incomplete result as clean.
- Export correlated stage/engine errors through structured logs; document queue recovery and failed-job handling.

Frontend:
- Implement paginated findings with whole-report counts, severity filtering, real empty/error states and authenticated PDF downloads.
- Refresh displayed credentials after save/remove. Explain unavailable notification delivery instead of presenting a working toggle.
- Keep existing visual design, accessible controls, loading states and responsive layouts. Remove fake terminal output and all silent mock fallbacks.
- Enable TypeScript/lint build checks and align lint dependency versions with Next.js.

Delivery:
- Repair worker image imports and include API/shared modules using stable paths. Run containers as unprivileged users.
- Share report storage and encryption/configuration across services. Use health dependencies, persistent Redis queue data, migrations before API startup and relative same-origin API routing.
- Pin scanner tooling, bundle offline rules, and document sandbox host prerequisites and fail-closed behavior.
- CI runs API/core/worker suites, migration smoke tests, frontend types/lint/build and deterministic end-to-end fixture tests. Include container verification where Docker is available.

Exit: a fresh supported setup completes register → connect → scan → findings → PDF and the controlled patch → draft-PR flow; intentional worker/TypeScript errors fail checks. External calls stay mocked in CI.

## M5 — Continuous GitHub review

Dependencies: M1–M4 complete; owner supplies GitHub App registration credentials and a public callback URL.

Backend: installation-based least-privilege GitHub access; signed webhook verification; unique delivery IDs and replay prevention; repository-to-installation ownership mapping; push/PR event dispatch tied to SHA; cancellation of superseded work; bounded retries; status/check updates; incremental changed-file scans with a full baseline; webhook audit and revocation.

Frontend: connect/revoke installation flow, repository selection, automatic-scan settings, delivery health and links from findings to exact PR diff/commit. Do not expose private installation tokens.

Exit: valid events queue once; invalid signatures and replayed deliveries are rejected; revoked installations lose access; PR check results identify the exact analyzed commit. Test locally with signed fixture payloads before live installation.

## M6 — Notifications, policy and team expansion

Dependencies: stable findings/provenance and configured outbound provider.

Backend: persisted notification preferences; transactional outbox and idempotent email delivery; scan-completed/high-severity templates; unsubscribe and retries. Then introduce organizations/roles, audited suppressions with reasons/expiry, configurable severity gates, dependency and secret scanner adapters, versioned rule packs, baseline comparison, scheduled scans and cost budgets.

Frontend: working preference forms, event history, role-aware team settings, suppression review, policy configuration, baseline/new/fixed finding views and clear quota usage. Implement each capability alongside its service and tests.

Exit: preference changes persist; events deliver at most once per user/event policy; users cannot access another tenant's data; policy decisions remain traceable to rule and commit versions.

## Verification and rollout

1. Use Python 3.11/3.12, isolated dependencies, SQLite for fast API/worker fixtures and PostgreSQL for migration/enum smoke checks.
2. Test success and failure paths at engine, worker, API and frontend contract boundaries; include real local fixture code and subprocess parsing where practical.
3. Run frontend typecheck, lint and production compilation with checks enabled.
4. Build/start the production stack, migrate an existing database copy, verify worker imports, sandbox availability, one real fixture scan and an authenticated report download.
5. With configured credentials, run a deliberately authorized live scan and draft PR against a dedicated test repository. Review and merge remain separate actions.
6. Release only after acceptance checks pass. Back up the database and report volume first. Keep previous images; prefer forward corrective migrations over destructive schema rollback. Rotate any previously plaintext credentials.

## Definition of done

The status document distinguishes implemented code, passing automated checks, unverified runtime behavior and future milestones. Documentation must match shipped behavior. A green build, mock PR response or completed checklist alone never proves the end-to-end product works.
