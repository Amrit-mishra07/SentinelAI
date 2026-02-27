from fastapi import APIRouter, Depends
from app.dependencies.auth import get_current_user

router = APIRouter()

@router.get("/list")
async def list_repositories(user_id: str = Depends(get_current_user)):
    return {
        "repositories": [
            {"id": "1", "name": "repo1", "url": "https://github.com/user/repo1"},
        ]
    }

@router.post("/connect")
async def connect_repository(user_id: str = Depends(get_current_user)):
    return {"message": "Repository connected"}
