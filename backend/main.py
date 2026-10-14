from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from enum import Enum
import numpy as np
from collections import defaultdict
import uuid

app = FastAPI(title="Student Concept Drift Detection API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enums
class ActivityType(str, Enum):
    QUIZ = "quiz"
    CODING_EXERCISE = "coding_exercise"
    ASSIGNMENT = "assignment"

class AlertPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"

# Models
class InteractionCreate(BaseModel):
    student_id: str
    activity_id: str
    activity_type: ActivityType
    accuracy: float = Field(ge=0.0, le=100.0)
    time_taken_seconds: int = Field(gt=0)
    retry_count: int = Field(ge=0)
    problem_solving_steps: int = Field(ge=0)

class Interaction(InteractionCreate):
    interaction_id: str
    timestamp: datetime

class BaselinePattern(BaseModel):
    student_id: str
    accuracy_mean: float
    accuracy_std: float
    time_taken_seconds_mean: float
    time_taken_seconds_std: float
    retry_count_mean: float
    retry_count_std: float
    problem_solving_steps_mean: float
    problem_solving_steps_std: float
    sample_size: int
    last_updated: datetime

class DriftScore(BaseModel):
    score_id: str
    student_id: str
    drift_score: float
    accuracy_contribution: float
    time_taken_contribution: float
    retry_count_contribution: float
    problem_solving_steps_contribution: float
    window_start: datetime
    window_end: datetime
    calculated_at: datetime

class Alert(BaseModel):
    alert_id: str
    student_id: str
    student_name: str
    drift_score: float
    concern_metrics: List[str]
    priority: AlertPriority
    status: str
    created_at: datetime

class Feedback(BaseModel):
    feedback_id: str
    student_id: str
    drift_score: float
    message: str
    skill_gaps: List[str]
    recommended_resources: List[Dict[str, str]]
    created_at: datetime

# In-memory storage
interactions_db: Dict[str, List[Interaction]] = defaultdict(list)
baselines_db: Dict[str, BaselinePattern] = {}
drift_scores_db: Dict[str, List[DriftScore]] = defaultdict(list)
alerts_db: List[Alert] = []
feedback_db: Dict[str, List[Feedback]] = defaultdict(list)

# Mock student data
students_db = {
    "student-1": {"name": "Alice Johnson", "class": "Computer Science - Year 2"},
    "student-2": {"name": "Bob Smith", "class": "Computer Science - Year 2"},
    "student-3": {"name": "Carol Williams", "class": "Computer Science - Year 2"},
    "student-4": {"name": "David Brown", "class": "Computer Science - Year 2"},
    "student-5": {"name": "Emma Davis", "class": "Computer Science - Year 2"},
    "student-6": {"name": "Frank Miller", "class": "Computer Science - Year 2"},
    "student-7": {"name": "Grace Wilson", "class": "Computer Science - Year 2"},
    "student-8": {"name": "Henry Moore", "class": "Computer Science - Year 2"},
    "student-9": {"name": "Iris Taylor", "class": "Computer Science - Year 2"},
    "student-10": {"name": "Jack Anderson", "class": "Computer Science - Year 2"},
    "student-11": {"name": "Kate Thomas", "class": "Computer Science - Year 2"},
    "student-12": {"name": "Liam Jackson", "class": "Computer Science - Year 2"},
}

# Configuration
config = {
    "drift_threshold": 0.7,
    "std_multiplier": 2.0,
    "sliding_window_size": 10,
    "baseline_window_size": 20,
    "metric_weights": {
        "accuracy": 0.40,
        "time_taken": 0.25,
        "retry_count": 0.20,
        "problem_solving_steps": 0.15
    },
    "feedback_threshold": 0.5
}

# Helper functions
def calculate_baseline(student_id: str) -> Optional[BaselinePattern]:
    """Calculate baseline from recent interactions"""
    interactions = interactions_db.get(student_id, [])
    
    if len(interactions) < 5:
        return None
    
    recent = interactions[-config["baseline_window_size"]:]
    
    accuracies = [i.accuracy for i in recent]
    times = [i.time_taken_seconds for i in recent]
    retries = [i.retry_count for i in recent]
    steps = [i.problem_solving_steps for i in recent]
    
    baseline = BaselinePattern(
        student_id=student_id,
        accuracy_mean=float(np.mean(accuracies)),
        accuracy_std=float(np.std(accuracies, ddof=1)),
        time_taken_seconds_mean=float(np.mean(times)),
        time_taken_seconds_std=float(np.std(times, ddof=1)),
        retry_count_mean=float(np.mean(retries)),
        retry_count_std=float(np.std(retries, ddof=1)),
        problem_solving_steps_mean=float(np.mean(steps)),
        problem_solving_steps_std=float(np.std(steps, ddof=1)),
        sample_size=len(recent),
        last_updated=datetime.utcnow()
    )
    
    baselines_db[student_id] = baseline
    return baseline

def detect_behavioral_changes(interaction: Interaction, baseline: BaselinePattern) -> List[str]:
    """Detect behavioral changes using z-score method"""
    changes = []
    std_mult = config["std_multiplier"]
    
    # Accuracy decrease
    if baseline.accuracy_std > 0:
        z_accuracy = (interaction.accuracy - baseline.accuracy_mean) / baseline.accuracy_std
        if z_accuracy < -std_mult:
            changes.append("accuracy")
    
    # Time increase
    if baseline.time_taken_seconds_std > 0:
        z_time = (interaction.time_taken_seconds - baseline.time_taken_seconds_mean) / baseline.time_taken_seconds_std
        if z_time > std_mult:
            changes.append("time_taken")
    
    # Retry increase
    if baseline.retry_count_std > 0:
        z_retry = (interaction.retry_count - baseline.retry_count_mean) / baseline.retry_count_std
        if z_retry > std_mult:
            changes.append("retry_count")
    
    # Steps decrease
    if baseline.problem_solving_steps_std > 0:
        z_steps = (interaction.problem_solving_steps - baseline.problem_solving_steps_mean) / baseline.problem_solving_steps_std
        if z_steps < -std_mult:
            changes.append("problem_solving_steps")
    
    return changes

def calculate_drift_score(student_id: str) -> Optional[DriftScore]:
    """Calculate drift score from recent interactions"""
    interactions = interactions_db.get(student_id, [])
    baseline = baselines_db.get(student_id)
    
    if not baseline or len(interactions) < 5:
        return None
    
    recent = interactions[-config["sliding_window_size"]:]
    
    metric_change_counts = {
        "accuracy": 0,
        "time_taken": 0,
        "retry_count": 0,
        "problem_solving_steps": 0
    }
    
    for interaction in recent:
        changes = detect_behavioral_changes(interaction, baseline)
        for change in changes:
            metric_change_counts[change] += 1
    
    weights = config["metric_weights"]
    window_size = len(recent)
    
    accuracy_contrib = (metric_change_counts["accuracy"] / window_size) * weights["accuracy"]
    time_contrib = (metric_change_counts["time_taken"] / window_size) * weights["time_taken"]
    retry_contrib = (metric_change_counts["retry_count"] / window_size) * weights["retry_count"]
    steps_contrib = (metric_change_counts["problem_solving_steps"] / window_size) * weights["problem_solving_steps"]
    
    drift_score = min(max(accuracy_contrib + time_contrib + retry_contrib + steps_contrib, 0.0), 1.0)
    
    score = DriftScore(
        score_id=str(uuid.uuid4()),
        student_id=student_id,
        drift_score=drift_score,
        accuracy_contribution=accuracy_contrib,
        time_taken_contribution=time_contrib,
        retry_count_contribution=retry_contrib,
        problem_solving_steps_contribution=steps_contrib,
        window_start=recent[0].timestamp,
        window_end=recent[-1].timestamp,
        calculated_at=datetime.utcnow()
    )
    
    drift_scores_db[student_id].append(score)
    return score

def generate_alert(student_id: str, drift_score: DriftScore):
    """Generate alert if threshold exceeded"""
    if drift_score.drift_score < config["drift_threshold"]:
        return
    
    student = students_db.get(student_id, {"name": "Unknown Student"})
    
    concern_metrics = []
    if drift_score.accuracy_contribution > 0.15:
        concern_metrics.append("accuracy")
    if drift_score.time_taken_contribution > 0.10:
        concern_metrics.append("time_taken")
    if drift_score.retry_count_contribution > 0.08:
        concern_metrics.append("retry_count")
    if drift_score.problem_solving_steps_contribution > 0.06:
        concern_metrics.append("problem_solving_steps")
    
    if drift_score.drift_score >= 0.85:
        priority = AlertPriority.CRITICAL
    elif drift_score.drift_score >= 0.75:
        priority = AlertPriority.HIGH
    else:
        priority = AlertPriority.MEDIUM
    
    alert = Alert(
        alert_id=str(uuid.uuid4()),
        student_id=student_id,
        student_name=student["name"],
        drift_score=drift_score.drift_score,
        concern_metrics=concern_metrics,
        priority=priority,
        status="pending",
        created_at=datetime.utcnow()
    )
    
    alerts_db.append(alert)

def generate_feedback(student_id: str, drift_score: DriftScore):
    """Generate feedback if threshold exceeded"""
    if drift_score.drift_score < config["feedback_threshold"]:
        return
    
    skill_gaps = []
    if drift_score.accuracy_contribution > 0.15:
        skill_gaps.append("problem accuracy")
    if drift_score.time_taken_contribution > 0.10:
        skill_gaps.append("time management")
    if drift_score.retry_count_contribution > 0.08:
        skill_gaps.append("problem-solving efficiency")
    
    message = f"We've noticed some changes in your recent learning activities. "
    if skill_gaps:
        message += f"Focusing on {', '.join(skill_gaps)} will help strengthen your understanding. "
    message += "You've got this! Small adjustments can make a big difference."
    
    resources = [
        {"title": "Practice Problems", "url": "/resources/practice"},
        {"title": "Video Tutorials", "url": "/resources/videos"},
        {"title": "Study Guide", "url": "/resources/guide"}
    ]
    
    feedback = Feedback(
        feedback_id=str(uuid.uuid4()),
        student_id=student_id,
        drift_score=drift_score.drift_score,
        message=message,
        skill_gaps=skill_gaps,
        recommended_resources=resources,
        created_at=datetime.utcnow()
    )
    
    feedback_db[student_id].append(feedback)

# API Endpoints
@app.get("/")
def read_root():
    return {"message": "Student Concept Drift Detection API", "status": "running"}

@app.post("/api/v1/interactions", status_code=201)
def create_interaction(interaction: InteractionCreate):
    """Submit new student interaction"""
    new_interaction = Interaction(
        **interaction.dict(),
        interaction_id=str(uuid.uuid4()),
        timestamp=datetime.utcnow()
    )
    
    interactions_db[interaction.student_id].append(new_interaction)
    
    # Calculate baseline
    baseline = calculate_baseline(interaction.student_id)
    
    # Calculate drift score
    if baseline:
        drift_score = calculate_drift_score(interaction.student_id)
        if drift_score:
            generate_alert(interaction.student_id, drift_score)
            generate_feedback(interaction.student_id, drift_score)
    
    return {"interaction_id": new_interaction.interaction_id, "message": "Interaction recorded"}

@app.get("/api/v1/interactions/{student_id}")
def get_interactions(student_id: str):
    """Get interaction history for student"""
    interactions = interactions_db.get(student_id, [])
    return {"student_id": student_id, "interactions": interactions, "count": len(interactions)}

@app.get("/api/v1/students")
def get_students():
    """Get all students with their current drift scores"""
    result = []
    for student_id, student_info in students_db.items():
        scores = drift_scores_db.get(student_id, [])
        current_score = scores[-1].drift_score if scores else 0.0
        
        result.append({
            "student_id": student_id,
            "name": student_info["name"],
            "class": student_info["class"],
            "drift_score": current_score,
            "interaction_count": len(interactions_db.get(student_id, []))
        })
    
    return {"students": result}

@app.get("/api/v1/alerts")
def get_alerts():
    """Get all active alerts"""
    return {"alerts": alerts_db, "count": len(alerts_db)}

@app.get("/api/v1/feedback/{student_id}")
def get_feedback(student_id: str):
    """Get feedback for student"""
    feedback = feedback_db.get(student_id, [])
    return {"student_id": student_id, "feedback": feedback, "count": len(feedback)}

@app.get("/api/v1/reports/student/{student_id}/drift-timeline")
def get_drift_timeline(student_id: str, days: int = 30):
    """Get drift score timeline"""
    scores = drift_scores_db.get(student_id, [])
    cutoff = datetime.utcnow() - timedelta(days=days)
    recent_scores = [s for s in scores if s.calculated_at >= cutoff]
    
    data_points = [
        {
            "date": s.calculated_at.isoformat(),
            "drift_score": s.drift_score
        }
        for s in recent_scores
    ]
    
    return {
        "student_id": student_id,
        "period_days": days,
        "data_points": data_points
    }

@app.get("/api/v1/reports/student/{student_id}/metric-breakdown")
def get_metric_breakdown(student_id: str):
    """Get metric contribution breakdown"""
    scores = drift_scores_db.get(student_id, [])
    if not scores:
        raise HTTPException(status_code=404, detail="No drift scores found")
    
    latest = scores[-1]
    
    contributions = [
        {"metric": "accuracy", "contribution": latest.accuracy_contribution},
        {"metric": "time_taken", "contribution": latest.time_taken_contribution},
        {"metric": "retry_count", "contribution": latest.retry_count_contribution},
        {"metric": "problem_solving_steps", "contribution": latest.problem_solving_steps_contribution}
    ]
    
    return {
        "student_id": student_id,
        "current_drift_score": latest.drift_score,
        "contributions": contributions
    }

@app.get("/api/v1/reports/student/{student_id}/baseline-comparison")
def get_baseline_comparison(student_id: str):
    """Get current vs baseline comparison"""
    baseline = baselines_db.get(student_id)
    interactions = interactions_db.get(student_id, [])
    
    if not baseline or not interactions:
        raise HTTPException(status_code=404, detail="Insufficient data")
    
    recent = interactions[-5:]
    
    current_stats = {
        "accuracy": np.mean([i.accuracy for i in recent]),
        "time_taken_seconds": np.mean([i.time_taken_seconds for i in recent]),
        "retry_count": np.mean([i.retry_count for i in recent]),
        "problem_solving_steps": np.mean([i.problem_solving_steps for i in recent])
    }
    
    baseline_stats = {
        "accuracy": baseline.accuracy_mean,
        "time_taken_seconds": baseline.time_taken_seconds_mean,
        "retry_count": baseline.retry_count_mean,
        "problem_solving_steps": baseline.problem_solving_steps_mean
    }
    
    return {
        "student_id": student_id,
        "current": current_stats,
        "baseline": baseline_stats
    }

@app.get("/api/v1/config")
def get_config():
    """Get current configuration"""
    return config

@app.put("/api/v1/config")
def update_config(new_config: dict):
    """Update configuration"""
    config.update(new_config)
    return {"message": "Configuration updated", "config": config}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
