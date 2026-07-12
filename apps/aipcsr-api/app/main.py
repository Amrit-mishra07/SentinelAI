from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.routers import auth, scan, repository, report, dashboard
from app.config.settings import settings
from app.limiter import limiter

app = FastAPI(title="AIpSCR API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(scan.router, prefix="/api/scan", tags=["scan"])
app.include_router(repository.router, prefix="/api/repository", tags=["repository"])
app.include_router(report.router, prefix="/api/report", tags=["report"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
import sys
import os

db_core_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'core', 'db-core'))
if db_core_path not in sys.path:
    sys.path.insert(0, db_core_path)

from session import engine
from app.models.base import Base
# Import all models to ensure they are registered with Base
from app import models

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
