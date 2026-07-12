from fastapi import APIRouter, HTTPException, status, Depends, Request
from sqlalchemy.orm import Session
from datetime import timedelta
from app.schemas.user import UserLogin, UserCreate, UserResponse
from app.security.jwt import create_access_token
from app.config.settings import settings
from app.dependencies.db import get_db
from app.services.auth_service import authenticate_user, register_user
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.user import UserUpdate, IntegrationsUpdate, IntegrationsResponse
from app.limiter import limiter

router = APIRouter()

@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, user: UserLogin, db: Session = Depends(get_db)):
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
@limiter.limit("10/minute")
async def register(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    new_user = register_user(db, user)
    return {
        "message": "User registered successfully", 
        "user": UserResponse.model_validate(new_user)
    }

@router.get("/me", response_model=UserResponse)
async def get_me(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/me", response_model=UserResponse)
async def update_me(update_data: UserUpdate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if update_data.email:
        user.email = update_data.email
    if update_data.password:
        user.set_password(update_data.password)
    
    db.commit()
    db.refresh(user)
    return user

@router.get("/integrations", response_model=IntegrationsResponse)
async def get_integrations(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "has_github_token": bool(user.github_token),
        "has_openai_key": bool(user.openai_api_key)
    }

@router.put("/integrations", response_model=IntegrationsResponse)
async def update_integrations(data: IntegrationsUpdate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if data.github_token is not None:
        user.github_token = data.github_token
    if data.openai_api_key is not None:
        user.openai_api_key = data.openai_api_key
        
    db.commit()
    db.refresh(user)
    return {
        "has_github_token": bool(user.github_token),
        "has_openai_key": bool(user.openai_api_key)
    }
