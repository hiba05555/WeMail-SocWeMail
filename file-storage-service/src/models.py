from sqlalchemy import Column, String, Integer, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from src.database import Base

class File(Base):
    __tablename__ = "files"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id     = Column(UUID(as_uuid=True), nullable=False)
    owner_email  = Column(String, nullable=False)
    filename     = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    file_size    = Column(Integer, nullable=False)
    content_type = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    is_public    = Column(Boolean, default=False)
    created_at   = Column(DateTime, default=datetime.utcnow)
