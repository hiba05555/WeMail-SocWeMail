
from fastapi import FastAPI

from src.routes import emails

from src.database import engine, Base

import time, logging

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)

def wait_for_db():

    for i in range(10):

        try:

            Base.metadata.create_all(bind=engine)

            logger.info("✅ Database connected!")

            return

        except Exception:

            logger.warning(f"⏳ Waiting for database... attempt {i+1}/10")

            time.sleep(3)

    raise Exception("❌ Could not connect to database")

wait_for_db()

app = FastAPI(title="WeMail Email Service", version="1.0.0")

app.include_router(emails.router, prefix="/api/emails", tags=["Emails"])

@app.get("/health")

def health_check():

    return {"status": "healthy", "service": "email-service", "version": "1.0.0"}

