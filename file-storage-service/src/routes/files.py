from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from src.database import get_db
from src.models import File
from src.config import settings
from jose import JWTError, jwt
from minio import Minio
from minio.error import S3Error
import uuid
import io
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()

minio_client = Minio(
    settings.MINIO_URL,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=False
)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def ensure_bucket():
    try:
        if not minio_client.bucket_exists(settings.MINIO_BUCKET):
            minio_client.make_bucket(settings.MINIO_BUCKET)
            logger.info(f"✅ Bucket '{settings.MINIO_BUCKET}' created!")
    except S3Error as e:
        logger.error(f"MinIO error: {e}")

@router.post("/upload")
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    ensure_bucket()
    content = await file.read()
    file_id = str(uuid.uuid4())
    storage_path = f"{current_user['sub']}/{file_id}/{file.filename}"

    minio_client.put_object(
        settings.MINIO_BUCKET,
        storage_path,
        io.BytesIO(content),
        length=len(content),
        content_type=file.content_type or "application/octet-stream"
    )

    db_file = File(
        owner_id=uuid.UUID(current_user["sub"]),
        owner_email=current_user["email"],
        filename=file_id,
        original_name=file.filename,
        file_size=len(content),
        content_type=file.content_type or "application/octet-stream",
        storage_path=storage_path
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    logger.info(f"📁 File uploaded: {file.filename} by {current_user['email']}")
    return {
        "id": str(db_file.id),
        "filename": db_file.original_name,
        "file_size": db_file.file_size,
        "content_type": db_file.content_type,
        "created_at": db_file.created_at
    }

@router.get("/")
def list_files(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    files = db.query(File).filter(File.owner_id == uuid.UUID(current_user["sub"])).all()
    return {"files": [
        {
            "id": str(f.id),
            "filename": f.original_name,
            "file_size": f.file_size,
            "content_type": f.content_type,
            "created_at": f.created_at
        } for f in files
    ]}

@router.get("/download/{file_id}")
def download_file(file_id: uuid.UUID, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    file = db.query(File).filter(File.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    response = minio_client.get_object(settings.MINIO_BUCKET, file.storage_path)
    return StreamingResponse(
        response,
        media_type=file.content_type,
        headers={"Content-Disposition": f"attachment; filename={file.original_name}"}
    )

@router.delete("/{file_id}")
def delete_file(file_id: uuid.UUID, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    file = db.query(File).filter(File.id == file_id, File.owner_id == uuid.UUID(current_user["sub"])).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        minio_client.remove_object(settings.MINIO_BUCKET, file.storage_path)
    except S3Error:
        pass
    db.delete(file)
    db.commit()
    return {"message": "File deleted"}
