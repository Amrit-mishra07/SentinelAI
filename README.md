# AIpSCR - AI-Powered Security Code Review

Production-ready monorepo for automated security vulnerability scanning and AI-powered patching.

## Architecture

### Applications
- **aipcsr-web**: Next.js 14 frontend with App Router
- **aipcsr-api**: FastAPI backend with JWT authentication
- **aipcsr-worker**: Celery workers for async task processing
- **aipcsr-github-service**: GitHub integration service

### Core Modules
- **scanner-core**: Pluggable security scanning engines (Bandit, Semgrep, ESLint)
- **ai-core**: AI provider abstraction and response parsing
- **db-core**: SQLAlchemy ORM with migration support
- **observability**: Structured logging and metrics collection
- **policies**: Scoring rules and vulnerability classification

## Tech Stack

**Frontend**: Next.js 14, TypeScript, TailwindCSS
**Backend**: FastAPI, SQLAlchemy, PostgreSQL
**Workers**: Celery, Redis
**AI**: OpenAI provider abstraction
**Infrastructure**: Docker, Docker Compose, Nginx

## Getting Started

```bash
docker-compose up -d
```

### Default Credentials
- Email: test@example.com
- Password: any value (mock auth)

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register user

### Scans
- `POST /api/scan/create` - Create new scan
- `GET /api/scan/list` - List user scans
- `GET /api/scan/{scan_id}` - Get scan details

### Reports
- `GET /api/report/{scan_id}` - Get scan report
- `POST /api/report/{scan_id}/download` - Download report

## Development

### Frontend
```bash
cd apps/aipcsr-web
npm install
npm run dev
```

### Backend
```bash
cd apps/aipcsr-api
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Worker
```bash
cd apps/aipcsr-worker
pip install -r requirements.txt
celery -A celery_app worker --loglevel=info
```

## Production Deployment

Configure environment variables in `.env` and deploy using Docker Compose or Kubernetes.

## Security

- JWT token-based authentication
- CORS enabled for trusted origins
- SQL injection protection via SQLAlchemy
- Request validation with Pydantic
