from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    # Paths
    EMBEDDING_MODEL_PATH: str
    GRAPH_VUL_MODEL_PATH: str
    NODE_VUL_MODEL_PATH: str
    
    # LLM
    MODEL_NAME: str
    BASE_URL: str
    GEMINI_API_KEY1: str
    CHATBOT_TEMPERATURE: float = 0.7
    CHATBOT_MAX_TOKENS: int = 4096

    # Database
    MONGODB_URL: str
    MONGODB_DATABASE: str

    # Security
    SECRET_KEY: str
    JWT_SECRET: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Other configs
    DEVICE: str = "cpu"
    SEED: int = 42

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow"      
    )


settings = Settings()
