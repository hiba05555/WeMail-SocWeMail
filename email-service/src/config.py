from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://wemail:wemail123@postgres:5432/wemail"
    REDIS_URL: str = "redis://redis:6379"
    JWT_SECRET: str = "wemail-super-secret-jwt-key-2024"
    JWT_ALGORITHM: str = "HS256"
    MINIO_URL: str = "http://minio:9000"
    MINIO_ACCESS_KEY: str = "wemail"
    MINIO_SECRET_KEY: str = "wemail123"
    MINIO_BUCKET: str = "wemail-attachments"

    class Config:
        env_file = ".env"

settings = Settings()
