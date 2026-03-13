from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routes import emails
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
            logger.info("✅ Database connected!")
            return
        except Exception as e:
            logger.warning(f"⏳ Waiting for database... attempt {i+1}/{max_retries}")
            time.sleep(3)
    raise Exception("❌ Could not connect to database")

wait_for_db()

app = FastAPI(
    title="WeMail Email Service",
    description="Core email sending, receiving and management",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(emails.router, prefix="/api/emails", tags=["Emails"])

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "email-service",
        "version": "1.0.0"
    }
