from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException
from app.services.auth_service import authenticate_user, register_user
from app.schemas.user import UserCreate, UserLogin
from app.models.user import User

def test_register_user_success():
    db = MagicMock()
    # Mock that email doesn't exist
    db.query().filter().first.return_value = None
    
    user_create = UserCreate(email="new@example.com", password="password123")
    new_user = register_user(db, user_create)
    
    assert new_user.email == "new@example.com"
    assert new_user.verify_password("password123") is True
    db.add.assert_called_once_with(new_user)
    db.commit.assert_called_once()

def test_register_user_duplicate_email():
    db = MagicMock()
    # Mock that email already exists
    existing_user = User(id="1", email="exist@example.com")
    db.query().filter().first.return_value = existing_user
    
    user_create = UserCreate(email="exist@example.com", password="password123")
    
    with pytest.raises(HTTPException) as exc:
        register_user(db, user_create)
    
    assert exc.value.status_code == 400
    assert exc.value.detail == "Email already registered"

def test_authenticate_user_success():
    db = MagicMock()
    existing_user = User(id="1", email="exist@example.com")
    existing_user.set_password("correct-password")
    db.query().filter().first.return_value = existing_user
    
    user_login = UserLogin(email="exist@example.com", password="correct-password")
    user = authenticate_user(db, user_login)
    
    assert user.id == "1"
    assert user.email == "exist@example.com"
