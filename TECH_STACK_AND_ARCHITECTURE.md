# AIpSCR - Complete Tech Stack & System Architecture

## 📋 Table of Contents
1. [Tech Stack Overview](#tech-stack-overview)
2. [Detailed Technology Breakdown](#detailed-technology-breakdown)
3. [System Architecture](#system-architecture)
4. [Data Flow](#data-flow)
5. [Component Interactions](#component-interactions)

---

## 🏗️ Tech Stack Overview

### **Frontend Stack**
- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript 5.3
- **Styling**: TailwindCSS 3.3
- **Package Manager**: npm

### **Backend Stack**
- **Framework**: FastAPI 0.104.1
- **Server**: Uvicorn 0.24.0
- **Language**: Python 3.x
- **ORM**: SQLAlchemy 2.0.23
- **Database**: PostgreSQL 16 (Alpine)
- **Authentication**: JWT with python-jose, passlib

### **Worker/Task Queue Stack**
- **Task Queue**: Celery 5.3.4
- **Message Broker**: Redis 7 (Alpine)
- **Result Backend**: Redis
- **Database for Tasks**: PostgreSQL

### **AI & Analysis Stack**
- **AI Provider**: OpenAI (GPT-4)
- **Security Scanners**:
  - Bandit (Python security scanner)
  - Semgrep (Static analysis)
  - ESLint (JavaScript/TypeScript)

### **Infrastructure Stack**
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Reverse Proxy**: Nginx (Alpine)
- **Version Control**: Git

---

## 📦 Detailed Technology Breakdown

### **FRONTEND: Next.js 14**

**Location**: `apps/aipcsr-web/`

**What it does**:
- Server-side rendered React application with App Router
- Modern UI with responsive design
- Client-side state management and API integration

**Key Libraries**:
```json
{
  "next": "^14.0.0",          // Framework & build tool
  "react": "^18.2.0",         // UI library
  "react-dom": "^18.2.0",     // React DOM rendering
  "tailwindcss": "^3.3.0",    // Utility-first CSS styling
  "typescript": "^5.3.0"      // Type safety
}
```

**Features**:
- TypeScript strict mode enabled
- Path aliases configured (`@/*` for imports)
- TailwindCSS for responsive design
- Authentication with JWT token storage
- Login page with email/password
- Dashboard with scan management
- Report viewing interface

**Build Process**:
```bash
npm run dev    # Development server on port 3000
npm run build  # Production build
npm run start  # Production server
npm run lint   # Code linting
```

---

### **BACKEND: FastAPI**

**Location**: `apps/aipcsr-api/`

**What it does**:
- RESTful API server for all frontend/worker requests
- JWT-based authentication
- Database models & ORM operations
- Business logic orchestration

**Core Dependencies**:
```
fastapi==0.104.1              // Web framework
uvicorn[standard]==0.24.0     // ASGI server (async)
sqlalchemy==2.0.23            // ORM for database
psycopg2-binary==2.9.9        // PostgreSQL adapter
pydantic==2.5.0               // Data validation
pydantic-settings==2.1.0      // Configuration management
python-jose[cryptography]     // JWT token handling
passlib[bcrypt]==1.7.4        // Password hashing
python-multipart==0.0.6       // Form data parsing
alembic==1.13.0               // Database migrations
celery==5.3.4                 // Task queue client
redis==5.0.1                  // Redis client
requests==2.31.0              // HTTP requests
```

**Key Routers** (`app/routers/`):
- **auth.py**: Login, register, token refresh
- **scan.py**: Create/list/get scans
- **repository.py**: Repository management
- **report.py**: Generate and download reports

**Configuration** (`app/config/settings.py`):
```python
DATABASE_URL         # PostgreSQL connection string
JWT_SECRET          # Secret key for token signing
JWT_ALGORITHM       # HS256 for tokens
ACCESS_TOKEN_EXPIRE # Token validity (30 minutes)
REDIS_URL           # Redis connection
CORS_ORIGINS        # Allowed frontend origins
OPENAI_API_KEY      # OpenAI integration key
```

**Middleware**:
- CORS (Cross-Origin Resource Sharing) enabled
- Middleware stack for request processing

**API Endpoints**:
```
GET  /health                      # Health check
POST /api/auth/login              # User authentication
POST /api/auth/register           # New user registration
POST /api/scan/create             # Create security scan
GET  /api/scan/list               # List user's scans
GET  /api/scan/{scan_id}          # Get scan details
GET  /api/report/{scan_id}        # Generate report
POST /api/report/{scan_id}/download # Download report PDF
```

---

### **DATABASE: PostgreSQL 16**

**Location**: Docker service
**Port**: 5432

**What it does**:
- Persistent data storage for users, scans, reports
- Structured data with relationships
- ACID compliance for transactions

**Features**:
- Alpine image for lightweight deployment
- Health checks enabled
- Data persists in Docker volume `postgres_data`
- Credentials: `aipcsr:aipcsr_dev`
- Database: `aipcsr`

**Tables** (inferred from models):
- `users` - User accounts & authentication
- `scans` - Security scan records
- `reports` - Generated vulnerability reports
- `repositories` - GitHub repositories

---

### **WORKER: Celery + Redis**

**Location**: `apps/aipcsr-worker/`

**What it does**:
- Asynchronous task processing
- Long-running jobs (scanning, AI analysis)
- Background workers independent from API

**Task Queue Dependencies**:
```
celery==5.3.4          // Distributed task queue
redis==5.0.1           // Broker & result backend
sqlalchemy==2.0.23     // Database access
psycopg2-binary==2.9.9 // PostgreSQL adapter
requests==2.31.0       // HTTP requests
```

**Tasks** (`tasks/` directory):
1. **scan_task.py**: Execute security scanners on code
2. **ai_analysis_task.py**: Send vulnerabilities to OpenAI for analysis
3. **report_task.py**: Generate final security reports

**Configuration** (`celery_app.py`):
```python
broker = Redis URL           # Message queue
backend = Redis URL          # Result storage
task_serializer = "json"     # JSON for messages
timezone = "UTC"             # Timezone for scheduling
```

**Execution Flow**:
```
API Request → Task Queued → Redis → Celery Worker → Execute → Store Result
```

---

### **REDIS: In-Memory Data Store**

**Location**: Docker service
**Port**: 6379

**What it does**:
- Message broker for Celery task queue
- Result backend for task status & results
- Session caching (optional)

**Services**:
- Alpine image for lightweight container
- Health checks enabled
- High performance key-value store

**Data Stored**:
- Celery task messages
- Celery result data
- Optional user sessions
- Optional cache data

---

### **SECURITY SCANNERS: Core Module**

**Location**: `core/scanner-core/`

**What it does**:
- Pluggable architecture for multiple security engines
- Unified vulnerability reporting
- Severity classification

**Scanner Engines**:

#### 1. **Bandit Engine** (`bandit_engine.py`)
- **Purpose**: Python security vulnerability scanner
- **Detects**: SQL injection, hardcoded passwords, weak cryptography
- **Files**: `.py` files
- **Output**: Security issues with severity levels

#### 2. **Semgrep Engine** (`semgrep_engine.py`)
- **Purpose**: Static analysis tool (multi-language)
- **Detects**: Logic errors, code smells, security patterns
- **Files**: Multiple languages
- **Output**: Pattern-matched vulnerabilities

#### 3. **ESLint Engine** (`eslint_engine.py`)
- **Purpose**: JavaScript/TypeScript security linting
- **Detects**: Code quality issues, security vulnerabilities
- **Files**: `.js`, `.ts`, `.jsx`, `.tsx`
- **Output**: Security and quality issues

**Scanner Orchestrator** (`orchestrator.py`):
```python
class ScannerOrchestrator:
    - Initializes all engines
    - Runs sequential scans
    - Aggregates results
    - Handles errors gracefully
    - Returns unified vulnerability list
```

**Output Format**:
```python
{
    "repository": "repo_name",
    "vulnerabilities": [
        {
            "file": "path/to/file.py",
            "line": 42,
            "issue": "SQL Injection vulnerability",
            "severity": "HIGH",
            "engine": "bandit"
        }
    ],
    "engines_results": {
        "BanditEngine": {...},
        "SemgrepEngine": {...},
        "ESLintEngine": {...}
    }
}
```

---

### **AI ANALYSIS: OpenAI Integration**

**Location**: `core/ai-core/providers/`

**What it does**:
- Analyzes detected vulnerabilities
- Generates patch suggestions
- Provides security recommendations

**OpenAI Provider** (`openai_provider.py`):
```python
class OpenAIProvider(AIProvider):
    - Model: GPT-4
    - Analyzes each vulnerability
    - Generates fix suggestions
    - Provides detailed explanations
```

**Analysis Process**:
1. Receives vulnerability data (file, line, issue, severity)
2. Creates contextual prompt with vulnerability details
3. Sends to OpenAI API
4. Parses response for analysis & patches
5. Returns formatted recommendations

**API Integration**:
```
POST https://api.openai.com/v1/chat/completions
- Model: gpt-4
- Max tokens: 300
- Auth: Bearer {OPENAI_API_KEY}
```

---

### **INFRASTRUCTURE: Docker & Nginx**

**Containerization**:
- Each service has its own Dockerfile
- Multi-stage builds for optimization
- Alpine base images for minimal size

**Dockerfiles**:
- `Dockerfile.api`: FastAPI application container
- `Dockerfile.worker`: Celery worker container
- `Dockerfile.frontend`: Next.js frontend container

**Nginx Reverse Proxy** (`infrastructure/nginx/nginx.conf`):
```
Port 80 (HTTP)
├─ /api          → FastAPI backend (port 8000)
├─ /            → Next.js frontend (port 3000)
└─ Health checks
```

**Purpose**:
- Single entry point for frontend & API
- Load balancing (if scaled)
- Request routing
- SSL/TLS termination (production)

---

## 🏛️ System Architecture

### **High-Level Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER                              │
└────────────────────────────┬────────────────────────────────┘
                             │
                    HTTP/HTTPS (Port 80)
                             │
         ┌───────────────────▼───────────────────┐
         │       NGINX REVERSE PROXY             │
         │       (Port 80 → Routes traffic)      │
         └───────┬───────────────────┬───────────┘
                 │                   │
         ┌───────▼────────┐  ┌──────▼─────────┐
         │  NEXT.JS WEB   │  │   FASTAPI API  │
         │  (Port 3000)   │  │  (Port 8000)   │
         │                │  │                │
         │ • Login UI     │  │ • Auth Router  │
         │ • Dashboard    │  │ • Scan Router  │
         │ • Reports      │  │ • Report API   │
         └────────┬───────┘  └────────┬───────┘
                  │                   │
                  │      ┌────────────┘
                  │      │
                  └──────┼────────────────────┐
                         │                    │
              ┌──────────▼──────┐  ┌─────────▼───────┐
              │   POSTGRESQL    │  │     REDIS       │
              │   DATABASE      │  │   (Broker &     │
              │   (Port 5432)   │  │    Results)     │
              │                 │  │   (Port 6379)   │
              │ • Users         │  │                 │
              │ • Scans         │  │ Message Queue   │
              │ • Reports       │  │ Task Results    │
              └────────┬────────┘  └────────┬────────┘
                       │                    │
                       └──────────┬─────────┘
                                  │
                         ┌────────▼─────────┐
                         │  CELERY WORKER   │
                         │  (Async Tasks)   │
                         │                  │
                         │ • Scan Task      │
                         │ • AI Analysis    │
                         │ • Report Gen     │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
            ┌───────▼──────┐ ┌───▼────────┐ ┌─▼──────────┐
            │   BANDIT     │ │  SEMGREP   │ │  ESLINT    │
            │   SCANNER    │ │  SCANNER   │ │  SCANNER   │
            │  (Python)    │ │  (Multi)   │ │   (TS/JS)  │
            └──────────────┘ └────────────┘ └────────────┘
                    │             │             │
                    └─────────────┼─────────────┘
                                  │
                         ┌────────▼────────┐
                         │  OPENAI GPT-4   │
                         │                 │
                         │ • Analyze vulns │
                         │ • Generate fix  │
                         │ • Recommendations
                         └─────────────────┘
```

---

## 📊 Data Flow

### **Authentication Flow**
```
1. User enters credentials on Login page
2. Frontend sends POST /api/auth/login
3. FastAPI validates credentials
4. JWT token generated (HS256, expires in 30 min)
5. Token returned to frontend
6. Frontend stores token in localStorage
7. Subsequent requests include Authorization header
8. FastAPI validates JWT before processing
```

### **Security Scan Flow**
```
1. User clicks "Create Scan" on dashboard
2. Frontend sends POST /api/scan/create with repo URL
3. FastAPI creates scan record in PostgreSQL
4. FastAPI queues task in Redis (Celery)
5. Celery worker picks up task
6. Worker runs ScannerOrchestrator
7. All 3 scanners execute in parallel
8. Results aggregated
9. Celery stores results in Redis
10. Frontend polls /api/scan/{id} for status
11. Once complete, user can view results
```

### **AI Analysis Flow**
```
1. After scanning, vulnerabilities queued for AI analysis
2. Worker receives ai_analysis_task
3. For each vulnerability:
   a. Create detailed prompt
   b. Call OpenAI API with vulnerability data
   c. Parse response for analysis & patch
   d. Store analysis in database
4. Generate comprehensive security report
5. User can view analysis & suggested fixes
```

### **Report Generation Flow**
```
1. User requests report for scan
2. FastAPI retrieves scan data + analysis from DB
3. report_task generates formatted report
4. Report cached or stored
5. Sent to user as PDF/JSON download
```

---

## 🔄 Component Interactions

### **1. Frontend ↔ Backend API**
- **Protocol**: HTTP/REST
- **Port**: 80 (via Nginx) → 8000 (API)
- **Authentication**: JWT tokens in Authorization header
- **Content-Type**: application/json
- **CORS**: Enabled for localhost:3000

### **2. Backend ↔ Database**
- **Protocol**: PostgreSQL wire protocol
- **Port**: 5432
- **Pooling**: SQLAlchemy connection pooling
- **Transactions**: ACID-compliant
- **ORM**: SQLAlchemy models for type safety

### **3. Backend ↔ Celery Worker**
- **Protocol**: Redis wire protocol
- **Port**: 6379
- **Serialization**: JSON
- **Task Queue**: Celery task broking
- **Results**: Stored in Redis backend
- **Status**: Can be polled via API

### **4. Worker ↔ Security Scanners**
- **Protocol**: Subprocess execution
- **Method**: Direct Python imports
- **Data**: In-process data structures
- **Error Handling**: Try-catch with fallbacks

### **5. Worker ↔ OpenAI API**
- **Protocol**: HTTPS/REST
- **Port**: 443
- **Authentication**: API key in headers
- **Model**: GPT-4
- **Timeout**: Default request timeout
- **Rate Limiting**: OpenAI API limits apply

### **6. All Components ↔ Logging**
- **Logger**: Core observability module
- **Format**: Structured logging
- **Destination**: Console (Docker logs)

---

## 📁 File Structure Summary

```
AIpSCR/
├── apps/
│   ├── aipcsr-web/              # Next.js 14 Frontend
│   │   ├── app/                 # App Router pages
│   │   ├── components/          # React components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Utilities (API client)
│   │   ├── types/               # TypeScript types
│   │   └── package.json         # Dependencies
│   │
│   ├── aipcsr-api/              # FastAPI Backend
│   │   ├── app/
│   │   │   ├── main.py          # App entry point
│   │   │   ├── routers/         # API endpoints
│   │   │   ├── models/          # SQLAlchemy models
│   │   │   ├── schemas/         # Pydantic schemas
│   │   │   ├── services/        # Business logic
│   │   │   ├── config/          # Settings
│   │   │   └── security/        # JWT handling
│   │   ├── tests/               # Unit tests
│   │   └── requirements.txt     # Dependencies
│   │
│   └── aipcsr-worker/           # Celery Worker
│       ├── celery_app.py        # Celery configuration
│       ├── tasks/               # Async task definitions
│       └── requirements.txt     # Dependencies
│
├── core/
│   ├── scanner-core/            # Security Scanning
│   │   ├── orchestrator.py      # Scanner orchestrator
│   │   ├── engines/             # Scanner engines
│   │   │   ├── bandit_engine.py
│   │   │   ├── semgrep_engine.py
│   │   │   └── eslint_engine.py
│   │   └── report_builder.py    # Report generation
│   │
│   ├── ai-core/                 # AI Integration
│   │   └── providers/           # AI providers
│   │       └── openai_provider.py
│   │
│   ├── db-core/                 # Database utilities
│   ├── observability/           # Logging & metrics
│   └── policies/                # Security rules
│
├── infrastructure/
│   ├── docker/                  # Dockerfiles
│   ├── nginx/                   # Nginx config
│   ├── ci-cd/                   # CI/CD setup
│   └── deployment/              # Deployment configs
│
└── docker-compose.yml           # Service orchestration
```

---

## 🚀 Technology Justification

| Technology | Why Used | Benefit |
|------------|----------|---------|
| **Next.js 14** | Modern React framework | SSR, optimized builds, built-in routing |
| **FastAPI** | High-performance Python framework | Async, auto-docs (Swagger), fast development |
| **PostgreSQL** | Enterprise database | ACID compliance, relationships, reliability |
| **Redis** | In-memory data store | Fast message queuing, caching, real-time data |
| **Celery** | Distributed task queue | Async processing, scaling workers, monitoring |
| **SQLAlchemy** | ORM layer | Type-safe DB access, migrations, relationships |
| **JWT** | Token authentication | Stateless, scalable, secure |
| **Docker** | Containerization | Consistency, deployment, isolation |
| **Nginx** | Reverse proxy | Single entry point, routing, SSL termination |
| **OpenAI** | AI analysis | Advanced vulnerability analysis, patch suggestions |

---

## 📈 Scalability Architecture

The system is designed to scale:

- **Horizontal Scaling**: Multiple Celery workers for parallel task processing
- **Load Balancing**: Nginx can distribute traffic across multiple API instances
- **Database Scaling**: PostgreSQL read replicas for query scaling
- **Cache Layer**: Redis can be extended for session/result caching
- **Async Processing**: Celery ensures non-blocking operations
- **Microservices Ready**: Each component can be deployed independently

---

## 🔒 Security Features

- **Authentication**: JWT tokens with expiration
- **Authorization**: Role-based access (extensible)
- **Password Security**: Bcrypt hashing with passlib
- **Data Validation**: Pydantic schema validation
- **SQL Injection Prevention**: SQLAlchemy parameterized queries
- **CORS**: Configurable cross-origin access
- **Secret Management**: Environment variables for sensitive data
- **API Documentation**: Auto-generated Swagger docs

---

## 🎯 Summary

**AIpSCR** is a **production-ready security scanning platform** built with:
- Modern frontend (Next.js 14 + TypeScript)
- Robust backend (FastAPI + PostgreSQL)
- Scalable worker system (Celery + Redis)
- Pluggable security scanners (Bandit, Semgrep, ESLint)
- AI-powered analysis (OpenAI GPT-4)
- Professional infrastructure (Docker, Nginx)

All components work together to provide automated security vulnerability detection and AI-powered remediation suggestions.
