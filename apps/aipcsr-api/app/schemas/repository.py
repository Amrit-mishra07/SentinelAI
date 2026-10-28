from pydantic import BaseModel, field_validator
from app.schemas.git import normalize_github_url, validate_branch
from typing import Optional
from datetime import datetime

class RepositoryCreate(BaseModel):
    url: str
    branch: str = "main"

    _normalize_url = field_validator("url")(normalize_github_url)
    _validate_branch = field_validator("branch")(validate_branch)

class RepositoryResponse(BaseModel):
    id: str
    name: str
    url: str
    owner_id: str
    default_branch: str
    last_scan_at: Optional[datetime] = None
    last_scan_severity: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
