from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RepositoryCreate(BaseModel):
    url: str
    branch: str = "main"

class RepositoryResponse(BaseModel):
    id: str
    name: str
    url: str
    owner_id: str
    default_branch: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
