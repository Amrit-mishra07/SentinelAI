from pydantic import BaseModel, field_validator
from typing import Any
from app.schemas.git import validate_branch
from datetime import datetime

class ScanCreate(BaseModel):
    repository: str
    branch: str | None = None

    @field_validator("branch")
    @classmethod
    def branch_is_valid(cls, value: str | None) -> str | None:
        return validate_branch(value) if value is not None else None

class ScanResponse(BaseModel):
    id: str
    repository: str
    repository_id: str
    repository_name: str | None = None
    branch: str | None = None
    severity: str | None = None
    status: str
    stage: str
    commit_hash: str | None = None
    engine_results: dict[str, Any] | None = None
    vulnerabilities_count: int = 0
    created_at: datetime
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    updated_at: datetime

    class Config:
        from_attributes = True

class ScanList(BaseModel):
    scans: list[ScanResponse]
