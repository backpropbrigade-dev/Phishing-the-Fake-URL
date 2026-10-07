# How to Start the Backend

## Quick Start

1. **Install Python dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

2. **Start the backend server:**
```bash
python main.py
```

Or use uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

3. **Verify it's running:**
Open your browser and go to:
- http://localhost:8000 - Should show API status
- http://localhost:8000/docs - FastAPI auto-generated documentation

4. **Open your website:**
Open `index.html` in your browser. The login page will appear exactly as it is now.

## What's Already Working

✅ Backend API is fully implemented
✅ Drift detection algorithms are ready
✅ All endpoints are functional
✅ Your login page stays exactly the same
✅ All your existing features work

## What Happens When You Login

1. Login page appears (same as now - no changes!)
2. You login as Student/Faculty/Admin
3. Backend starts tracking test results
4. Drift scores are calculated automatically
5. Alerts appear in faculty dashboard
6. Feedback appears in student dashboard

## Testing the System

1. **Start backend**: `python backend/main.py`
2. **Open website**: Open `index.html` in browser
3. **Login as student**: Use any student ID
4. **Take some tests**: Your existing test system works
5. **Backend tracks everything**: Drift scores calculated automatically
6. **View results**: Check student/faculty dashboards

## API Endpoints Available

- `POST /api/v1/interactions` - Submit test results
- `GET /api/v1/students` - Get all students with drift scores
- `GET /api/v1/alerts` - Get alerts for faculty
- `GET /api/v1/feedback/{student_id}` - Get student feedback
- `GET /api/v1/reports/student/{student_id}/drift-timeline` - 30-day timeline
- `GET /api/v1/reports/student/{student_id}/metric-breakdown` - Metric breakdown
- `GET /api/v1/reports/student/{student_id}/baseline-comparison` - Current vs baseline
- `GET /api/v1/config` - Get configuration
- `PUT /api/v1/config` - Update configuration

## Your Website Stays the Same!

- ✅ Same login page
- ✅ Same navy blue design
- ✅ Same dashboards
- ✅ Same test management
- ✅ Same everything!

The backend just adds drift detection intelligence behind the scenes.

## Next Steps

The backend is ready! Your website already has the login page and dashboards. The drift detection will work automatically once you:

1. Start the backend server
2. Open your website
3. Use it normally

No changes needed to your login page or design!
