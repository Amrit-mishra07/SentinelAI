from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config.settings import settings

options = {"pool_pre_ping": True, "echo": False}
if settings.DATABASE_URL.startswith("sqlite"):
    options["connect_args"] = {"check_same_thread": False}
else:
    options.update(pool_size=20, max_overflow=10, pool_timeout=30, pool_recycle=1800)
engine = create_engine(settings.DATABASE_URL, **options)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
