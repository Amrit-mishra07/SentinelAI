from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from datetime import timedelta
from app.schemas.user import UserLogin, UserCreate, UserResponse
from app.security.jwt import create_access_token
from app.config.settings import settings
from app.dependencies.db import get_db
from app.services.auth_service import authenticate_user, register_user

router = APIRouter()

@router.post("/login")
async def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = authenticate_user(db, user)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.id},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(db_user)
    }

@router.post("/register")
async def register(user: UserCreate, db: Session = Depends(get_db)):
    new_user = register_user(db, user)
    return {
        "message": "User registered successfully", 
        "user": UserResponse.model_validate(new_user)
    }
