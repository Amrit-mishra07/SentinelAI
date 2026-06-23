import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin

def authenticate_user(db: Session, user_login: UserLogin) -> User:
    user = db.query(User).filter(User.email == user_login.email).first()
    if not user or not user.verify_password(user_login.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    return user

def register_user(db: Session, user_create: UserCreate) -> User:
    existing_user = db.query(User).filter(User.email == user_create.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user_id = str(uuid.uuid4())
    new_user = User(id=user_id, email=user_create.email)
    new_user.set_password(user_create.password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
