from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime
from src.database import get_db
from src.models import User
from src.schemas import UserRegister, UserLogin, Token, UserResponse
from src.security import hash_password, verify_password, create_access_token
import logging, httpx, os

logger = logging.getLogger(__name__)
router = APIRouter()
SOC_URL = os.getenv("SOC_URL", "http://soc-backend:8888")

async def log_to_soc(event_type: str, ip: str, email: str = "", details: dict = {}):
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(f"{SOC_URL}/api/logs", json={
                "service": "auth",
                "event_type": event_type,
                "ip": ip,
                "email": email,
                "details": details
            })
    except Exception:
        pass  # SOC down → on continue quand même

@router.post("/register", response_model=UserResponse, status_code=201)
async def register(payload: UserRegister, request: Request, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    user = User(
        email=payload.email,
        username=payload.username,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    await log_to_soc("register", request.client.host, payload.email, {
        "username": payload.username,
        "details": {"sqli_check": payload.email + payload.username}
    })
    logger.info(f"New user registered: {user.email}")
    return user

@router.post("/login", response_model=Token)
async def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        await log_to_soc("login_failed", request.client.host, payload.email, {
            "reason": "invalid credentials",
            "details": {"input": payload.email}
        })
        logger.warning(f"Failed login attempt for: {payload.email} from IP: {request.client.host}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")
    user.last_login = datetime.utcnow()
    user.login_ip = request.client.host
    db.commit()
    token = create_access_token({"sub": str(user.id), "email": user.email})
    await log_to_soc("login_success", request.client.host, user.email, {
        "user_id": str(user.id)
    })
    logger.info(f"User logged in: {user.email} from {request.client.host}")
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}
