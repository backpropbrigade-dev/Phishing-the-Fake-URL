"""
Configuration management for drift detection system
"""
from pydantic_settings import BaseSettings
from typing import Dict

class Settings(BaseSettings):
    # Database - Using SQLite for simplicity (can switch to PostgreSQL later)
    DATABASE_URL: str = "sqlite:///./drift_detection.db"
    
    # Drift Detection Parameters
    DRIFT_THRESHOLD: float = 0.7
    FEEDBACK_THRESHOLD: float = 0.5
    STD_MULTIPLIER: float = 2.0
    SLIDING_WINDOW_SIZE: int = 10
    BASELINE_WINDOW_SIZE: int = 20
    
    # Metric Weights
    METRIC_WEIGHTS: Dict[str, float] = {
        "accuracy": 0.40,
        "time_taken": 0.25,
        "retry_count": 0.20,
        "problem_solving_steps": 0.15
    }
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"

settings = Settings()
