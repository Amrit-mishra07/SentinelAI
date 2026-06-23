# AIpSCR Agent Rules

This file defines the project-scoped rules and guidelines for AI agents working in the AIpSCR (AI-Powered Security Code Review) monorepo. 

## 🏗️ Architecture & Boundaries
- **Monorepo Structure**: Respect the strict boundary between `apps/` (services) and `core/` (shared logic).
- **Imports**: 
  - Use **relative imports** within core modules to maintain portability.
  - Python workers (`apps/aipcsr-worker`) must securely extend `sys.path` to import from `apps/aipcsr-api` and `core/`.
- **Infrastructure**: All new services must have a corresponding Dockerfile and be added to `docker-compose.yml`.

## 🎨 Frontend (Next.js 14) Guidelines
- **Location**: `apps/aipcsr-web/`
- **Framework**: Use Next.js App Router paradigm (`app/` directory). Do not use the deprecated `pages/` router.
- **Styling**: strictly use TailwindCSS. Do not write vanilla CSS unless absolutely necessary.
- **TypeScript**: Adhere to strict type-safety. Avoid using `any`; define robust interfaces in `types/`.
- **State & Data**: Use React Server Components by default. Add `'use client'` only when utilizing client-side hooks (e.g., `useState`, `useEffect`).

## ⚙️ Backend (FastAPI) Guidelines
- **Location**: `apps/aipcsr-api/`
- **Typing**: Use standard Python type hinting across all functions and methods. 
- **Validation**: Rely heavily on Pydantic schemas (`schemas/`) for request/response validation.
- **Database**: Use SQLAlchemy 2.0+ syntax. Do not write raw SQL unless it's an extreme edge case for performance.
- **Auth**: Always enforce JWT authentication on sensitive endpoints via FastAPI dependencies.

## 🚀 Worker (Celery) Guidelines
- **Location**: `apps/aipcsr-worker/`
- **Asynchronous Work**: Never perform long-running blocking tasks (like Security Scanning or OpenAI calls) inside the FastAPI request cycle. Queue them via Celery.
- **Resilience**: Ensure Celery tasks handle API rate limits (especially for the OpenAI provider) gracefully with retries.

## 🤖 AI & Scanners (Core Modules)
- **Extensibility**: When adding a new security scanner to `core/scanner-core`, it must inherit from the base engine class and map its output to the unified vulnerability format.
- **Prompts**: Keep OpenAI prompts managed and versioned in `core/ai-core/prompt_manager.py`.

## 📜 General Code Standards
- **Documentation**: Provide clear, concise docstrings for new Python classes and complex functions.
- **No Hallucinations**: If you need to fix a bug across the frontend and backend, explicitly verify the API contract before modifying the frontend client.
