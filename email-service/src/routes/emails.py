from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from src.database import get_db
from src.models import Email
from src.schemas import EmailSend, EmailResponse, EmailList
from src.security import decode_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token_data = decode_token(credentials.credentials)
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return token_data

@router.post("/send", response_model=EmailResponse, status_code=201)
def send_email(payload: EmailSend, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # Sent copy for sender
    sent_email = Email(
        sender_id=uuid.UUID(current_user["sub"]),
        sender_email=current_user["email"],
        recipient_email=payload.recipient_email,
        subject=payload.subject,
        body=payload.body,
        folder="sent"
    )
    db.add(sent_email)

    # Inbox copy for recipient
    inbox_email = Email(
        sender_id=uuid.UUID(current_user["sub"]),
        sender_email=current_user["email"],
        recipient_email=payload.recipient_email,
        subject=payload.subject,
        body=payload.body,
        folder="inbox"
    )
    db.add(inbox_email)
    db.commit()
    db.refresh(sent_email)
    logger.info(f"Email sent: {current_user['email']} → {payload.recipient_email}")
    return sent_email

@router.get("/inbox", response_model=EmailList)
def get_inbox(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query = db.query(Email).filter(
        Email.recipient_email == current_user["email"],
        Email.folder == "inbox",
        Email.is_deleted == False
    ).order_by(Email.created_at.desc())
    total = query.count()
    emails = query.offset((page - 1) * per_page).limit(per_page).all()
    return {"emails": emails, "total": total, "page": page, "per_page": per_page}

@router.get("/sent", response_model=EmailList)
def get_sent(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query = db.query(Email).filter(
        Email.sender_email == current_user["email"],
        Email.folder == "sent",
        Email.is_deleted == False
    ).order_by(Email.created_at.desc())
    total = query.count()
    emails = query.offset((page - 1) * per_page).limit(per_page).all()
    return {"emails": emails, "total": total, "page": page, "per_page": per_page}

@router.get("/starred", response_model=EmailList)
def get_starred(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    emails = db.query(Email).filter(
        Email.recipient_email == current_user["email"],
        Email.is_starred == True,
        Email.is_deleted == False
    ).order_by(Email.created_at.desc()).all()
    return {"emails": emails, "total": len(emails), "page": 1, "per_page": 100}

@router.get("/spam", response_model=EmailList)
def get_spam(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    emails = db.query(Email).filter(
        Email.recipient_email == current_user["email"],
        Email.is_spam == True,
        Email.is_deleted == False
    ).order_by(Email.created_at.desc()).all()
    return {"emails": emails, "total": len(emails), "page": 1, "per_page": 100}

@router.get("/search")
def search_emails(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    emails = db.query(Email).filter(
        Email.recipient_email == current_user["email"],
        Email.is_deleted == False,
        Email.subject.ilike(f"%{q}%")
    ).order_by(Email.created_at.desc()).limit(20).all()
    return {"emails": emails, "total": len(emails)}

@router.get("/{email_id}", response_model=EmailResponse)
def get_email(email_id: uuid.UUID, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    email = db.query(Email).filter(Email.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return email

@router.patch("/{email_id}/read")
def mark_as_read(email_id: uuid.UUID, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    email = db.query(Email).filter(Email.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    email.is_read = True
    db.commit()
    return {"message": "Marked as read"}

@router.patch("/{email_id}/star")
def toggle_star(email_id: uuid.UUID, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    email = db.query(Email).filter(Email.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    email.is_starred = not email.is_starred
    db.commit()
    return {"message": "Star toggled", "is_starred": email.is_starred}

@router.delete("/{email_id}")
def delete_email(email_id: uuid.UUID, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    email = db.query(Email).filter(Email.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    email.is_deleted = True
    db.commit()
    return {"message": "Email moved to trash"}
