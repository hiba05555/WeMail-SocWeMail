from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://wemail:wemail123@postgres:5432/wemail"
    JWT_SECRET: str = "wemail-super-secret-jwt-key-2024"
    JWT_ALGORITHM: str = "HS256"
    MINIO_URL: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "wemail"
    MINIO_SECRET_KEY: str = "wemail123"
    MINIO_BUCKET: str = "wemail-files"

    class Config:
        env_file = ".env"

settings = Settings()
