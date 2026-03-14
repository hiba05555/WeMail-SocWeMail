from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://mongodb:27017/wemail-soc"
    JWT_SECRET: str = "wemail-soc-secret-key-2024"
    JWT_ALGORITHM: str = "HS256"
    ALERT_EMAIL_FROM: str = "hibachagdaly19@gmail.com"
    ALERT_EMAIL_TO: str = "hibachagdaly19@gmail.com"
    ALERT_EMAIL_PASSWORD: str = "qqyxxmjsvurxsvdy"

    class Config:
        env_file = ".env"

settings = Settings()
