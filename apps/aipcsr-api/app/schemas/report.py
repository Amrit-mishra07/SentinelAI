from pydantic import BaseModel
from datetime import datetime

class ReportResponse(BaseModel):
    id: str
    scan_id: str
    vulnerabilities_count: int
    severity: str
    created_at: datetime

    class Config:
        from_attributes = True
