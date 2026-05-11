from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    company: str | None = None
    password: str


class UserUpdate(BaseModel):
    full_name: str | None = None
    company: str | None = None


class UserRead(BaseModel):
    id: UUID
    email: str
    full_name: str
    company: str | None
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
