from sqlalchemy import Column, String, DateTime
from datetime import datetime
from app.models.base import Base

class Repository(Base):
    __tablename__ = "repositories"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    url = Column(String)
    owner_id = Column(String, index=True) # References the User who added it or owns it
    default_branch = Column(String, default="main")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Repository {self.name}>"
