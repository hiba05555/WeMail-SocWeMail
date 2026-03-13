from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
import uuid

class EmailSend(BaseModel):
    recipient_email: EmailStr
    subject: str
    body: str

class EmailResponse(BaseModel):
    id: uuid.UUID
    sender_email: str
    recipient_email: str
    subject: str
    body: str
    is_read: bool
    is_starred: bool
    is_spam: bool
    has_attachment: bool
    folder: str
    created_at: datetime

    class Config:
        from_attributes = True

class EmailList(BaseModel):
    emails: List[EmailResponse]
    total: int
    page: int
    per_page: int
