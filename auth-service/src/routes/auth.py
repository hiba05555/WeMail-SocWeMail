from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime
from src.database import get_db
from src.models import User
from src.schemas import UserRegister, UserLogin, Token, UserResponse
from src.security import hash_password, verify_password, create_access_token
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=201)
def register(payload: UserRegister, db: Session = Depends(get_db)):
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
    logger.info(f"New user registered: {user.email}")
    return user

@router.post("/login", response_model=Token)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        logger.warning(f"Failed login attempt for: {payload.email} from IP: {request.client.host}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")
    user.last_login = datetime.utcnow()
    user.login_ip = request.client.host
    db.commit()
    token = create_access_token({"sub": str(user.id), "email": user.email})
    logger.info(f"User logged in: {user.email} from {request.client.host}")
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}
