from fastapi import APIRouter, HTTPException, status
from datetime import timedelta
from app.schemas.user import UserLogin, UserResponse
from app.security.jwt import create_access_token
from app.config.settings import settings

router = APIRouter()

# Mock user database
users_db = {
    "test@example.com": {
        "id": "user1",
        "email": "test@example.com",
        "hashed_password": "$2b$12$fake_hash"
    }
}

@router.post("/login")
async def login(user: UserLogin):
    db_user = users_db.get(user.email)
    
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user["id"]},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(id=db_user["id"], email=db_user["email"])
    }

@router.post("/register")
async def register(user: UserLogin):
    if user.email in users_db:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    return {"message": "User registered"}
