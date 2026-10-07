# Student Concept Drift Detection System

A fully functional web-based system for detecting concept drift in student learning behavior. This system continuously analyzes how students interact with learning activities and identifies when their approach changes, helping instructors intervene early before performance drops.

## Features

### 🎯 Core Functionality
- **Real-time Drift Detection**: Monitors student interactions and calculates drift scores using statistical analysis
- **Baseline Pattern Establishment**: Automatically establishes personalized baseline patterns for each student
- **Behavioral Change Detection**: Uses z-score methodology to identify significant deviations
- **Alert System**: Generates prioritized alerts for instructors when drift thresholds are exceeded
- **Visual Dashboards**: Interactive charts and graphs for easy trend analysis
- **Activity Simulator**: Test the system by simulating student activities

### 📊 Dashboard Views

1. **Class Overview**
   - Real-time statistics (critical alerts, warnings, healthy students)
   - Class-wide drift score trend chart
   - Quick status overview

2. **Student List**
   - Individual student cards with current metrics
   - Color-coded status indicators (green/yellow/red)
   - Sortable by drift score
   - Click any student for detailed analysis

3. **Alerts**
   - Prioritized list of students needing intervention
   - Concern metrics highlighted
   - One-click acknowledgment
   - Direct link to student details

4. **Activity Simulator**
   - Submit individual activities for any student
   - Simulate declining performance (5 activities)
   - Real-time drift score updates
   - Activity log with timestamps

### 📈 Student Detail Modal

When you click on any student, you'll see:
- **Current Drift Score**: Large visual indicator with color coding
- **30-Day Timeline**: Line chart showing drift score evolution
- **Metric Breakdown**: Bar chart showing which metrics contribute most to drift
- **Baseline Comparison**: Current performance vs established baseline
- **Personalized Feedback**: Encouraging messages with recommended resources

## How to Use

### Getting Started

1. **Start the Backend Server**
   - Navigate to the `backend` folder
   - Run `python main.py` or use the provided `start_backend.bat`
   - Backend will be available at http://localhost:8000

2. **Start the Frontend Server**
   - In the root directory, run `python -m http.server 3000`
   - Frontend will be available at http://localhost:3000

3. **Open the Application**
   - Open http://localhost:3000 in a modern web browser
   - The frontend will connect to the backend API automatically

2. **Explore the Dashboard**
   - View the class overview with statistics
   - Check the drift score trend chart

3. **Browse Students**
   - Click "Students" in the navigation
   - Students are sorted by drift score (highest first)
   - Click any student card to see detailed analysis

4. **Check Alerts**
   - Click "Alerts" to see students needing attention
   - Alerts are prioritized: Critical > High > Medium
   - Click "View Details" to see student analysis
   - Click "Acknowledge" to dismiss an alert

### Using the Simulator

1. **Navigate to Simulator**
   - Click "Simulator" in the navigation

2. **Submit a Single Activity**
   - Select a student from the dropdown
   - Adjust the sliders:
     - **Accuracy**: 0-100% (how well they performed)
     - **Time Taken**: 30-600 seconds
     - **Retry Count**: 0-10 attempts
     - **Problem-Solving Steps**: 1-20 steps
   - Click "Submit Activity"
   - Watch the drift score update in real-time

3. **Simulate Declining Performance**
   - Select a student
   - Click "Simulate Decline (5 activities)"
   - This submits 5 poor-performing activities
   - Watch the drift score increase
   - Check if an alert is generated

## Understanding the System

### Drift Score Calculation

The system calculates a drift score (0.0 to 1.0) based on:
- **Accuracy** (40% weight): Lower accuracy increases drift
- **Time Taken** (25% weight): Longer time increases drift
- **Retry Count** (20% weight): More retries increase drift
- **Problem-Solving Steps** (15% weight): Fewer steps increase drift

### Status Indicators

- 🟢 **Healthy** (0.0 - 0.3): Student performing normally
- 🟡 **Warning** (0.3 - 0.7): Some concerns, feedback provided
- 🔴 **Critical** (0.7 - 1.0): Immediate intervention needed, alert generated

### Statistical Method

The system uses **z-score analysis**:
1. Establishes a baseline from recent 20 activities
2. Compares new activities against baseline
3. Flags deviations beyond 2 standard deviations
4. Calculates weighted drift score from flagged changes

## Sample Data

The system comes pre-loaded with 12 students:
- Most students have healthy patterns
- 2 students (Bob Smith, Emma Davis) show declining performance
- 30 days of historical data for each student
- Realistic variation in metrics

## Technical Details

### Files
- `index.html` - Main application structure
- `styles.css` - Complete styling and responsive design
- `app.js` - All application logic and data processing

### Dependencies
- **Chart.js** (v4.4.0) - For interactive charts
- No other external dependencies required!

### Browser Compatibility
- Chrome, Firefox, Safari, Edge (latest versions)
- Responsive design works on desktop and tablet

## Customization

You can modify the configuration in `app.js`:

```javascript
const CONFIG = {
    driftThreshold: 0.7,        // Alert threshold
    feedbackThreshold: 0.5,     // Feedback threshold
    stdMultiplier: 2.0,         // Z-score sensitivity
    slidingWindowSize: 10,      // Recent activities to analyze
    baselineWindowSize: 20,     // Activities for baseline
    metricWeights: {            // Contribution weights
        accuracy: 0.40,
        time_taken: 0.25,
        retry_count: 0.20,
        problem_solving_steps: 0.15
    }
};
```

## Use Cases

1. **Instructor Monitoring**: Track all students in a class
2. **Early Intervention**: Identify struggling students before grades drop
3. **Pattern Analysis**: Understand how learning behavior changes over time
4. **Resource Allocation**: Prioritize which students need help most
5. **System Testing**: Use simulator to validate drift detection algorithms

## Future Enhancements

This is a frontend demo. For production use, consider:
- Backend API with database storage
- Real LMS integration
- Email/SMS notifications
- Multi-class support
- Historical data export
- Advanced analytics and reporting

## License

This is a demonstration project for educational purposes.

---

**Built with ❤️ for educators and students**
