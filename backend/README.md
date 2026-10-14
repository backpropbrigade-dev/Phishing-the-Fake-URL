# Student Concept Drift Detection - Backend

A simplified FastAPI backend for the Student Concept Drift Detection System.

## Features

- Student interaction tracking
- Baseline pattern calculation
- Drift score calculation using statistical methods
- Alert generation for instructors
- Feedback generation for students
- RESTful API endpoints

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Key Endpoints

- `POST /api/v1/interactions` - Submit student interaction
- `GET /api/v1/students` - Get all students with drift scores
- `GET /api/v1/alerts` - Get active alerts
- `GET /api/v1/feedback/{student_id}` - Get student feedback
- `GET /api/v1/reports/student/{student_id}/drift-timeline` - Get drift timeline
- `GET /api/v1/reports/student/{student_id}/metric-breakdown` - Get metric breakdown

## Testing

You can test the API using the Swagger UI or with curl:

```bash
# Submit an interaction
curl -X POST "http://localhost:8000/api/v1/interactions" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STU001",
    "activity_id": "ACT001",
    "activity_type": "quiz",
    "accuracy": 85.0,
    "time_taken_seconds": 180,
    "retry_count": 1,
    "problem_solving_steps": 8
  }'
```

## Next Steps

This is a simplified version using in-memory storage. To upgrade:
1. Add PostgreSQL database integration
2. Add RabbitMQ for event-driven architecture
3. Split into microservices
4. Add authentication and authorization
5. Add encryption for sensitive data
