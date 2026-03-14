
from fastapi import FastAPI

from src.routes import auth, users

from src.database import engine, Base

import time, logging

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)

def wait_for_db():

    for i in range(10):

        try:

            Base.metadata.create_all(bind=engine)

            logger.info("✅ Database connected successfully!")

            return

        except Exception:

            logger.warning(f"⏳ Waiting for database... attempt {i+1}/10")

            time.sleep(3)

    raise Exception("❌ Could not connect to database")

wait_for_db()

app = FastAPI(title="WeMail Auth Service", version="1.0.0")

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])

app.include_router(users.router, prefix="/api/users", tags=["Users"])

@app.get("/health")

def health_check():

    return {"status": "healthy", "service": "auth-service", "version": "1.0.0"}

