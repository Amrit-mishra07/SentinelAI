from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.schemas.repository import RepositoryCreate, RepositoryResponse
from app.models.repository import Repository
import uuid

router = APIRouter()

@router.get("/list", response_model=list[RepositoryResponse])
async def list_repositories(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    repos = db.query(Repository).filter(Repository.owner_id == user_id).all()
    return repos

@router.post("/connect", response_model=RepositoryResponse)
async def connect_repository(
    repo_data: RepositoryCreate, 
    user_id: str = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Parse repo name from URL (e.g. https://github.com/owner/repo)
    parts = repo_data.url.strip("/").split("/")
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid repository URL")
    
    repo_name = parts[-1]
    if repo_name.endswith(".git"):
        repo_name = repo_name[:-4]

    repo = Repository(
        id=str(uuid.uuid4()),
        name=repo_name,
        url=repo_data.url,
        owner_id=user_id,
        default_branch=repo_data.branch
    )
    
    db.add(repo)
    db.commit()
    db.refresh(repo)
    
    return repo
