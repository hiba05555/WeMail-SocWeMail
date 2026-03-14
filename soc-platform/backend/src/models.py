from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class LogEvent(BaseModel):
    service: str           # auth, email, files, chat, gateway
    event_type: str        # login_failed, login_success, email_sent...
    ip: Optional[str] = None
    user_id: Optional[str] = None
    email: Optional[str] = None
    details: Optional[Dict[str, Any]] = {}
    timestamp: Optional[datetime] = None

class Alert(BaseModel):
    rule: str              # brute_force, sqli, xss...
    severity: str          # low, medium, high, critical
    message: str
    ip: Optional[str] = None
    email: Optional[str] = None
    service: str
    timestamp: Optional[datetime] = None
