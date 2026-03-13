from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routes import auth, users
from src.database import engine, Base
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def wait_for_db():
    max_retries = 10
    for i in range(max_retries):
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("✅ Database connected successfully!")
            return
        except Exception as e:
            logger.warning(f"⏳ Waiting for database... attempt {i+1}/{max_retries}")
            time.sleep(3)
    raise Exception("❌ Could not connect to database after max retries")

wait_for_db()

app = FastAPI(
    title="WeMail Auth Service",
    description="Authentication & Authorization for WeMail platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "auth-service",
        "version": "1.0.0"
    }
