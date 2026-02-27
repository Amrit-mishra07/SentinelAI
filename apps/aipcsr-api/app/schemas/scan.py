from pydantic import BaseModel
from datetime import datetime

class ScanCreate(BaseModel):
    repository: str

class ScanResponse(BaseModel):
    id: str
    repository: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class ScanList(BaseModel):
    scans: list[ScanResponse]
