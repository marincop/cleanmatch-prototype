import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "CleanMatch Backend"
    API_V1_STR: str = "/api/v1"
    
    # DB URL - Fallback to local SQLite file if PostgreSQL is not active
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./cleanmatch.db"
    )
    
    # Redis URL for locks/geo caches
    REDIS_URL: str = os.getenv(
        "REDIS_URL",
        "redis://localhost:6379/0"
    )
    
    # Security Configurations
    JWT_SECRET: str = os.getenv(
        "JWT_SECRET", 
        "9cb02613ba58fc330e7fa38c823055375d0458ff626ec38ecfb9ef6a0767"
    )
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # OTP Expiry
    OTP_EXPIRY_MINUTES: int = 5
    
    class Config:
        case_sensitive = True

settings = Settings()
