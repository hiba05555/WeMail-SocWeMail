from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://wemail:wemail123@postgres:5432/wemail"
    REDIS_URL: str = "redis://redis:6379"
    JWT_SECRET: str = "wemail-super-secret-jwt-key-2024"
    JWT_EXPIRE_MINUTES: int = 60
    JWT_ALGORITHM: str = "HS256"

    class Config:
        env_file = ".env"

settings = Settings()
