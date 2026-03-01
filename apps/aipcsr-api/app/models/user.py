from sqlalchemy import Column, String, Boolean, DateTime
from datetime import datetime
from app.models.base import Base
from app.security.passwords import hash_password, verify_password

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def set_password(self, password: str):
        self.hashed_password = hash_password(password)

    def verify_password(self, password: str) -> bool:
        return verify_password(password, self.hashed_password)

    def __repr__(self):
        return f"<User {self.email}>"
