
from fastapi import FastAPI

from src.routes import files

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

app = FastAPI(title="WeMail File Storage Service", version="1.0.0")

app.include_router(files.router, prefix="/api/files", tags=["Files"])

@app.get("/health")

def health():

    return {"status": "healthy", "service": "file-storage-service", "version": "1.0.0"}

