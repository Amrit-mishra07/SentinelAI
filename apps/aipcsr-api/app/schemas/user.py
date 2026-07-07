from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    password: str | None = None

class IntegrationsUpdate(BaseModel):
    github_token: str | None = None
    openai_api_key: str | None = None

class IntegrationsResponse(BaseModel):
    has_github_token: bool
    has_openai_key: bool
