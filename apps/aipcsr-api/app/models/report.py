from sqlalchemy import Column, String, Integer, DateTime, Enum
from datetime import datetime
import enum
from app.models.base import Base

class SeverityLevel(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, index=True)
    scan_id = Column(String, index=True)
    vulnerabilities_count = Column(Integer, default=0)
    severity = Column(Enum(SeverityLevel), default=SeverityLevel.LOW)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Report {self.scan_id}>"
