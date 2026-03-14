from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://mongodb:27017/wemail-soc"
    JWT_SECRET: str = "wemail-soc-secret-key-2024"
    JWT_ALGORITHM: str = "HS256"
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM: str = ""
    ALERT_PHONE: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
