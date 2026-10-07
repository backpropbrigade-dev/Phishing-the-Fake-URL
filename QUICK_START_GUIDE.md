# Quick Start Guide - Student Concept Drift Detection

## 🎯 Goal

Add drift detection to your existing Student Learning Analytics Platform while maintaining the same modern design and user experience.

## 📋 What You Have

✅ Working student dashboard website
✅ Login system (Admin/Faculty/Student)
✅ Test management and taking
✅ Chart.js visualizations
✅ Modern navy blue design
✅ Python FastAPI backend

## 🚀 What You're Adding

🆕 AI-powered drift detection
🆕 Early warning alerts for faculty
🆕 Personalized student feedback
🆕 Advanced analytics dashboards
🆕 Statistical analysis algorithms

## 🏁 Getting Started

### Step 1: Review the Spec (5 minutes)

Open these files to understand what you're building:

1. **Requirements** (`.kiro/specs/student-concept-drift-detection/requirements.md`)
   - What the system should do
   - User stories and acceptance criteria

2. **Design** (`.kiro/specs/student-concept-drift-detection/design.md`)
   - How the system works
   - Architecture and algorithms

3. **Tasks** (`.kiro/specs/student-concept-drift-detection/tasks.md`)
   - Step-by-step implementation plan
   - 26 main tasks with sub-tasks

### Step 2: Set Up Your Environment (30 minutes)

#### Install Dependencies

```bash
# Navigate to your project directory
cd your-project-folder

# Install Python dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic numpy scipy pandas cryptography casbin pytest hypothesis

# Or use requirements.txt (create this file):
# fastapi==0.104.1
# uvicorn==0.24.0
# sqlalchemy==2.0.23
# psycopg2-binary==2.9.9
# pydantic==2.5.0
# numpy==1.26.2
# scipy==1.11.4
# pandas==2.1.3
# cryptography==41.0.7
# casbin==1.31.0
# pytest==7.4.3
# hypothesis==6.92.1

pip install -r requirements.txt
```

#### Set Up PostgreSQL Database

**Option 1: Local PostgreSQL**
```bash
# Install PostgreSQL (if not already installed)
# Windows: Download from https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt-get install postgresql

# Create database
psql -U postgres
CREATE DATABASE drift_detection;
CREATE USER drift_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE drift_detection TO drift_user;
\q
```

**Option 2: SQLite (for quick testing)**
```python
# Use SQLite instead of PostgreSQL for initial development
# Update database connection string in backend/main.py:
DATABASE_URL = "sqlite:///./drift_detection.db"
```

### Step 3: Start with Task 1 (1-2 hours)

#### Task 1: Set up project structure and core infrastructure

Create the following directory structure:

```
your-project/
├── backend/
│   ├── main.py (existing - will extend)
│   ├── config.py (NEW)
│   ├── database.py (NEW)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── interaction.py
│   │   ├── baseline.py
│   │   ├── drift_score.py
│   │   └── alert.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── drift_detector.py
│   │   ├── baseline_calculator.py
│   │   ├── alert_manager.py
│   │   └── feedback_generator.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── interactions.py
│   │   ├── alerts.py
│   │   └── reports.py
│   └── tests/
│       ├── __init__.py
│       └── test_drift_detector.py
├── index.html (existing)
├── styles.css (existing)
├── app.js (existing)
└── requirements.txt (NEW)
```

#### Create `backend/config.py`:

```python
"""
Configuration management for drift detection system
"""
from pydantic_settings import BaseSettings
from typing import Dict

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://drift_user:your_password@localhost/drift_detection"
    
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
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ENCRYPTION_KEY: str = "your-encryption-key-change-in-production"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

#### Create `backend/database.py`:

```python
"""
Database connection and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=True  # Set to False in production
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### Update `backend/main.py`:

```python
"""
Main FastAPI application - Extended with drift detection
"""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import engine, Base, get_db
from .config import settings

# Create FastAPI app
app = FastAPI(
    title="Student Learning Analytics Platform",
    description="AI-powered drift detection for student learning",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "drift_detection": "enabled"
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Student Learning Analytics Platform API",
        "docs": "/docs",
        "health": "/health"
    }

# Import and include routers (will add these in later tasks)
# from .routes import interactions, alerts, reports
# app.include_router(interactions.router, prefix="/api/v1", tags=["interactions"])
# app.include_router(alerts.router, prefix="/api/v1", tags=["alerts"])
# app.include_router(reports.router, prefix="/api/v1", tags=["reports"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

#### Test Your Setup:

```bash
# Start the backend server
cd backend
python main.py

# Or use uvicorn directly:
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Open browser and test:
# http://localhost:8000/health
# http://localhost:8000/docs (FastAPI auto-generated docs)
```

You should see:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "drift_detection": "enabled"
}
```

### Step 4: Implement Task 2 (2-3 hours)

#### Task 2.1: Create Pydantic domain models

Create `backend/models/interaction.py`:

```python
"""
Interaction data model - represents a student's test attempt
"""
from pydantic import BaseModel, Field, validator
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum
from typing import Optional

class ActivityType(str, Enum):
    QUIZ = "quiz"
    CODING_EXERCISE = "coding_exercise"
    ASSIGNMENT = "assignment"

class InteractionCreate(BaseModel):
    """Model for creating a new interaction"""
    student_id: str
    activity_id: str
    activity_type: ActivityType
    accuracy: float = Field(ge=0.0, le=100.0, description="Accuracy percentage (0-100)")
    time_taken_seconds: int = Field(gt=0, description="Time taken in seconds")
    retry_count: int = Field(ge=0, description="Number of retry attempts")
    problem_solving_steps: int = Field(ge=0, description="Number of problem-solving steps")
    timestamp: Optional[datetime] = None
    
    @validator('timestamp', pre=True, always=True)
    def set_timestamp(cls, v):
        return v or datetime.utcnow()
    
    @validator('timestamp')
    def timestamp_must_be_utc(cls, v):
        if v.tzinfo is None:
            # Assume UTC if no timezone
            return v.replace(tzinfo=None)
        return v

class Interaction(InteractionCreate):
    """Complete interaction model with ID"""
    interaction_id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True
```

Create `backend/models/baseline.py`:

```python
"""
Baseline pattern model - represents a student's normal behavior
"""
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID, uuid4

class BaselinePattern(BaseModel):
    """Student's baseline learning pattern"""
    baseline_id: UUID = Field(default_factory=uuid4)
    student_id: str
    
    # Accuracy metrics
    accuracy_mean: float = Field(ge=0.0, le=100.0)
    accuracy_std: float = Field(ge=0.0)
    
    # Time metrics
    time_taken_seconds_mean: float = Field(gt=0.0)
    time_taken_seconds_std: float = Field(ge=0.0)
    
    # Retry metrics
    retry_count_mean: float = Field(ge=0.0)
    retry_count_std: float = Field(ge=0.0)
    
    # Problem-solving metrics
    problem_solving_steps_mean: float = Field(ge=0.0)
    problem_solving_steps_std: float = Field(ge=0.0)
    
    # Metadata
    sample_size: int = Field(ge=5, description="Number of interactions used")
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True
```

Create `backend/models/drift_score.py`:

```python
"""
Drift score model - represents calculated drift risk
"""
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID, uuid4

class DriftScore(BaseModel):
    """Calculated drift score for a student"""
    score_id: UUID = Field(default_factory=uuid4)
    student_id: str
    
    # Overall drift score
    drift_score: float = Field(ge=0.0, le=1.0, description="Drift score (0.0-1.0)")
    
    # Metric contributions
    accuracy_contribution: float = Field(ge=0.0, le=1.0)
    time_taken_contribution: float = Field(ge=0.0, le=1.0)
    retry_count_contribution: float = Field(ge=0.0, le=1.0)
    problem_solving_steps_contribution: float = Field(ge=0.0, le=1.0)
    
    # Time window
    window_start: datetime
    window_end: datetime
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True
```

#### Test Your Models:

Create `backend/tests/test_models.py`:

```python
"""
Tests for Pydantic models
"""
import pytest
from datetime import datetime
from backend.models.interaction import InteractionCreate, ActivityType
from backend.models.baseline import BaselinePattern
from backend.models.drift_score import DriftScore

def test_interaction_creation():
    """Test creating a valid interaction"""
    interaction = InteractionCreate(
        student_id="student123",
        activity_id="test456",
        activity_type=ActivityType.QUIZ,
        accuracy=85.5,
        time_taken_seconds=300,
        retry_count=2,
        problem_solving_steps=10
    )
    
    assert interaction.student_id == "student123"
    assert interaction.accuracy == 85.5
    assert interaction.timestamp is not None

def test_interaction_validation():
    """Test interaction validation"""
    # Test invalid accuracy (> 100)
    with pytest.raises(ValueError):
        InteractionCreate(
            student_id="student123",
            activity_id="test456",
            activity_type=ActivityType.QUIZ,
            accuracy=150.0,  # Invalid!
            time_taken_seconds=300,
            retry_count=2,
            problem_solving_steps=10
        )
    
    # Test invalid time (≤ 0)
    with pytest.raises(ValueError):
        InteractionCreate(
            student_id="student123",
            activity_id="test456",
            activity_type=ActivityType.QUIZ,
            accuracy=85.0,
            time_taken_seconds=0,  # Invalid!
            retry_count=2,
            problem_solving_steps=10
        )

def test_baseline_creation():
    """Test creating a valid baseline"""
    baseline = BaselinePattern(
        student_id="student123",
        accuracy_mean=85.0,
        accuracy_std=5.2,
        time_taken_seconds_mean=300.0,
        time_taken_seconds_std=45.0,
        retry_count_mean=1.5,
        retry_count_std=0.8,
        problem_solving_steps_mean=8.0,
        problem_solving_steps_std=2.1,
        sample_size=10
    )
    
    assert baseline.student_id == "student123"
    assert baseline.sample_size == 10

def test_drift_score_creation():
    """Test creating a valid drift score"""
    drift = DriftScore(
        student_id="student123",
        drift_score=0.75,
        accuracy_contribution=0.32,
        time_taken_contribution=0.18,
        retry_count_contribution=0.15,
        problem_solving_steps_contribution=0.10,
        window_start=datetime.utcnow(),
        window_end=datetime.utcnow()
    )
    
    assert drift.drift_score == 0.75
    assert 0.0 <= drift.drift_score <= 1.0

# Run tests:
# pytest backend/tests/test_models.py -v
```

Run the tests:
```bash
pytest backend/tests/test_models.py -v
```

### Step 5: Continue with Remaining Tasks

Once you've completed Tasks 1 and 2, continue with:

- **Task 3**: Encryption and security
- **Task 5**: Data ingestion service
- **Task 6**: Baseline calculation
- **Task 7**: Behavioral change detection
- **Task 8**: Drift score calculation

Each task builds on the previous one, and you can test as you go!

## 📚 Resources

- **Full Spec**: `.kiro/specs/student-concept-drift-detection/`
- **Integration Plan**: `DRIFT_DETECTION_INTEGRATION_PLAN.md`
- **Roadmap**: `IMPLEMENTATION_ROADMAP.md`
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Pydantic Docs**: https://docs.pydantic.dev/
- **SQLAlchemy Docs**: https://docs.sqlalchemy.org/

## 🎯 Success Criteria

After completing the first few tasks, you should have:

✅ Backend server running on http://localhost:8000
✅ Database connection working
✅ Pydantic models defined and tested
✅ Health check endpoint responding
✅ FastAPI docs accessible at http://localhost:8000/docs

## 💡 Tips

1. **Test as you go**: Run tests after each task
2. **Use FastAPI docs**: Visit `/docs` to test endpoints interactively
3. **Start simple**: Use SQLite instead of PostgreSQL for initial development
4. **Commit often**: Save your progress with git commits
5. **Ask for help**: Review the spec files if you get stuck

## 🚀 Ready to Build!

You now have everything you need to start implementing the drift detection system. The spec is complete, the integration plan is clear, and you have step-by-step guidance.

**Start with Task 1 and work your way through the tasks.md file!**

Good luck! 🎓
