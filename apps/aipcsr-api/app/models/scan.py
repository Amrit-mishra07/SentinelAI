from sqlalchemy import Column, String, DateTime, Enum
from datetime import datetime
import enum
from app.models.base import Base

class ScanStatus(str, enum.Enum):
    PENDING = "pending"
    SCANNING = "scanning"
    COMPLETED = "completed"
    FAILED = "failed"

class Scan(Base):
    __tablename__ = "scans"

    id = Column(String, primary_key=True, index=True)
    repository_id = Column(String, index=True) # References the Repository model
    branch = Column(String, default="main")
    commit_hash = Column(String, nullable=True)
    status = Column(Enum(ScanStatus), default=ScanStatus.PENDING)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Scan {self.id} (Repo: {self.repository_id}) - {self.status}>"
