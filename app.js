// Student Drift Detection System - Main Application
// Backend API URL
const API_URL = 'http://localhost:8000';

// Data Storage
let students = [];
let alerts = [];
let classHistory = [];
let charts = {};
let isLoading = false;

// Session Management
let currentUser = null;
let currentUserRole = null;

// Configuration
const CONFIG = {
    driftThreshold: 0.7,
    feedbackThreshold: 0.5,
    stdMultiplier: 2.0,
    slidingWindowSize: 10,
    baselineWindowSize: 20,
    metricWeights: {
        accuracy: 0.40,
        time_taken: 0.25,
        retry_count: 0.20,
        problem_solving_steps: 0.15
    },
    // New feature configurations
    guessingThreshold: 0.25, // Probability threshold for guessing detection
    speedChangeThreshold: 1.5, // Standard deviations for speed change detection
    earlyWarningThreshold: 0.6, // Threshold for early warning predictions
    topicDriftThreshold: 0.65 // Topic-specific drift threshold
};

// Enhanced data structures for new features
let topicPerformance = {}; // Topic-level performance tracking
let guessingPatterns = {}; // Guessing behavior detection
let learningSpeedAnalysis = {}; // Learning speed tracking
let earlyWarnings = []; // Early warning predictions
let learningRecommendations = {}; // Personalized recommendations

// Show loading spinner
function showLoading() {
    isLoading = true;
    const loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.innerHTML = `
        <div class="loader-overlay">
            <div class="loader-spinner"></div>
            <p>Loading...</p>
        </div>
    `;
    document.body.appendChild(loader);
}

// Hide loading spinner
function hideLoading() {
    isLoading = false;
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.remove();
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    // Setup role button switching for new login page
    setupRoleButtons();
    
    // Load test results and tests from localStorage
    loadTestResults();
    loadTests();
    
    showLoading();
    try {
        await initializeData();
        setupEventListeners();
        renderDashboard();
        renderStudents();
        renderAlerts();
        populateSimulatorStudents();
        
        // Initialize student performance chart if on student view
        setTimeout(() => {
            if (document.getElementById('studentPerformanceChart')) {
                renderStudentPerformanceChart();
            }
            // Generate activity heatmap
            generateActivityHeatmap();
        }, 500);
        
        hideLoading();
        showToast('Application loaded successfully!', 'success');
    } catch (error) {
        hideLoading();
        showToast('Failed to initialize application', 'error');
        console.error('Initialization error:', error);
    }
});

// Setup role button switching for new login page
function setupRoleButtons() {
    const roleButtons = document.querySelectorAll('.role-btn, .lp-role-tab');
    const studentForm = document.getElementById('student-login-new');
    const facultyForm = document.getElementById('faculty-login-new');
    const adminForm = document.getElementById('admin-login-new');
    
    if (!roleButtons.length || !studentForm || !facultyForm || !adminForm) return;
    
    roleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            roleButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            
            // Get the role from data attribute
            const role = btn.dataset.role;
            
            // Hide all forms first
            studentForm.classList.remove('active');
            facultyForm.classList.remove('active');
            adminForm.classList.remove('active');
            
            // Show the selected form
            if (role === 'student') {
                studentForm.classList.add('active');
            } else if (role === 'faculty') {
                facultyForm.classList.add('active');
            } else if (role === 'admin') {
                adminForm.classList.add('active');
            }
        });
    });
}

// Initialize data from API
async function initializeData() {
    try {
        // Fetch students from backend
        const response = await fetch(`${API_URL}/api/v1/students`);
        const data = await response.json();
        
        students = data.students.map(s => ({
            id: s.student_id,
            name: s.name,
            driftScore: s.drift_score,
            status: getStatusFromDriftScore(s.drift_score),
            interactionCount: s.interaction_count
        }));

        // Fetch alerts
        const alertsResponse = await fetch(`${API_URL}/api/v1/alerts`);
        const alertsData = await alertsResponse.json();
        alerts = alertsData.alerts;

        // Generate class history (mock for now, could be from API)
        generateClassHistory();

    } catch (error) {
        console.error('Failed to load data from API:', error);
        // Fallback to mock data
        initializeMockData();
    }
}

// Fallback mock data
function initializeMockData() {
    const studentNames = [
        'Alice Johnson', 'Bob Smith', 'Carol Williams', 'David Brown',
        'Emma Davis', 'Frank Miller', 'Grace Wilson', 'Henry Moore',
        'Iris Taylor', 'Jack Anderson', 'Kate Thomas', 'Liam Jackson'
    ];

    students = studentNames.map((name, index) => ({
        id: `student-${index + 1}`,
        name: name,
        interactions: [],
        baseline: null,
        driftScore: 0,
        status: 'healthy',
        interactionCount: 0
    }));

    // Generate initial interactions for each student
    students.forEach(student => {
        generateInitialInteractions(student);
        student.interactionCount = student.interactions.length;
    });

    // Generate class history for the chart
    generateClassHistory();
    
    // Create mock alerts for students with high drift scores
    const criticalStudents = students.filter(s => s.driftScore >= CONFIG.driftThreshold);
    criticalStudents.forEach(student => {
        const alert = {
            alert_id: `alert-${Date.now()}-${student.id}`,
            student_id: student.id,
            student_name: student.name,
            drift_score: student.driftScore,
            priority: student.driftScore >= 0.85 ? 'critical' : 'high',
            concern_metrics: ['accuracy', 'time_taken', 'retry_count'],
            timestamp: new Date(),
            status: 'pending'
        };
        alerts.push(alert);
    });
    
    // If no alerts were generated, create some sample alerts
    if (alerts.length === 0) {
        const sampleAlerts = [
            {
                alert_id: 'alert-1',
                student_id: 'student-2',
                student_name: 'Bob Smith',
                drift_score: 0.82,
                priority: 'high',
                concern_metrics: ['accuracy', 'time_taken', 'retry_count'],
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                status: 'pending'
            },
            {
                alert_id: 'alert-2',
                student_id: 'student-5',
                student_name: 'Emma Davis',
                drift_score: 0.89,
                priority: 'critical',
                concern_metrics: ['accuracy', 'retry_count', 'problem_solving_steps'],
                timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
                status: 'pending'
            },
            {
                alert_id: 'alert-3',
                student_id: 'student-8',
                student_name: 'Henry Moore',
                drift_score: 0.76,
                priority: 'high',
                concern_metrics: ['time_taken', 'problem_solving_steps'],
                timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
                status: 'pending'
            }
        ];
        alerts.push(...sampleAlerts);
    }
    
    console.log('Mock data initialized:', students.length, 'students', alerts.length, 'alerts');
}

// Helper function to determine status from drift score
function getStatusFromDriftScore(score) {
    if (score >= CONFIG.driftThreshold) return 'critical';
    if (score >= CONFIG.feedbackThreshold) return 'warning';
    return 'healthy';
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const view = e.target.dataset.view;
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById(`${view}-view`).classList.add('active');
        });
    });

    // Modal close - handle all modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeModal();
            }
        });
    });

    // Simulator controls
    document.getElementById('sim-accuracy').addEventListener('input', (e) => {
        document.getElementById('sim-accuracy-value').textContent = e.target.value + '%';
    });
    
    document.getElementById('sim-time').addEventListener('input', (e) => {
        document.getElementById('sim-time-value').textContent = e.target.value + 's';
    });
    
    document.getElementById('sim-retries').addEventListener('input', (e) => {
        document.getElementById('sim-retries-value').textContent = e.target.value;
    });
    
    document.getElementById('sim-steps').addEventListener('input', (e) => {
        document.getElementById('sim-steps-value').textContent = e.target.value;
    });
    
    document.getElementById('submit-activity').addEventListener('click', submitActivity);
    document.getElementById('simulate-decline').addEventListener('click', simulateDecline);
}

// Submit activity to backend
async function submitActivity() {
    const studentId = document.getElementById('sim-student').value;
    const accuracy = parseFloat(document.getElementById('sim-accuracy').value);
    const timeTaken = parseInt(document.getElementById('sim-time').value);
    const retries = parseInt(document.getElementById('sim-retries').value);
    const steps = parseInt(document.getElementById('sim-steps').value);
    
    if (!studentId) {
        showToast('Please select a student', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_URL}/api/v1/interactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                student_id: studentId,
                activity_id: `activity-${Date.now()}`,
                activity_type: 'coding_exercise',
                accuracy: accuracy,
                time_taken_seconds: timeTaken,
                retry_count: retries,
                problem_solving_steps: steps
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Activity submitted:', result);
            
            // Refresh data
            await initializeData();
            renderDashboard();
            renderStudents();
            renderAlerts();
            
            // Add to activity log
            addActivityToLog(studentId, accuracy, timeTaken, retries, steps);
            
            hideLoading();
            showToast('Activity submitted successfully!', 'success');
            
        } else {
            hideLoading();
            showToast('Failed to submit activity', 'error');
            console.error('Failed to submit activity');
        }
    } catch (error) {
        hideLoading();
        showToast('Error submitting activity', 'error');
        console.error('Error submitting activity:', error);
    }
}

// Simulate decline (submit multiple poor activities)
async function simulateDecline() {
    const studentId = document.getElementById('sim-student').value;
    
    if (!studentId) {
        alert('Please select a student');
        return;
    }
    
    // Submit 5 activities with declining performance
    for (let i = 0; i < 5; i++) {
        const accuracy = Math.max(20, 80 - i * 15 - Math.random() * 10);
        const timeTaken = 180 + i * 60 + Math.random() * 60;
        const retries = Math.min(8, 1 + i + Math.floor(Math.random() * 2));
        const steps = Math.max(1, 8 - i - Math.floor(Math.random() * 2));
        
        try {
            await fetch(`${API_URL}/api/v1/interactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    student_id: studentId,
                    activity_id: `decline-activity-${i}-${Date.now()}`,
                    activity_type: 'coding_exercise',
                    accuracy: accuracy,
                    time_taken_seconds: timeTaken,
                    retry_count: retries,
                    problem_solving_steps: steps
                })
            });
            
            // Add to activity log
            addActivityToLog(studentId, accuracy, timeTaken, retries, steps);
            
        } catch (error) {
            console.error('Error in decline simulation:', error);
        }
        
        // Small delay between submissions
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Refresh data
    await initializeData();
    renderDashboard();
    renderStudents();
    renderAlerts();
}

// Generate initial interactions for a student
function generateInitialInteractions(student) {
    const baseAccuracy = 75 + Math.random() * 20;
    const baseTime = 150 + Math.random() * 100;
    const baseRetries = Math.floor(Math.random() * 3);
    const baseSteps = 6 + Math.floor(Math.random() * 6);
    
    const topics = ['Data Structures', 'Algorithms', 'Database', 'Web Development', 'Mathematics'];

    for (let i = 0; i < 25; i++) {
        const daysAgo = 30 - i;
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const interaction = {
            timestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
            topic: topic,
            accuracy: Math.max(0, Math.min(100, baseAccuracy + (Math.random() - 0.5) * 15)),
            time_taken_seconds: Math.max(30, baseTime + (Math.random() - 0.5) * 60),
            retry_count: Math.max(0, baseRetries + Math.floor((Math.random() - 0.5) * 2)),
            problem_solving_steps: Math.max(1, baseSteps + Math.floor((Math.random() - 0.5) * 4))
        };
        student.interactions.push(interaction);
    }

    // Add some declining performance for certain students to trigger alerts
    if (student.id === 'student-2' || student.id === 'student-5' || student.id === 'student-8' || student.id === 'student-11') {
        // Add severe declining performance
        for (let i = 0; i < 10; i++) {
            const topic = topics[Math.floor(Math.random() * topics.length)];
            const interaction = {
                timestamp: new Date(Date.now() - i * 8 * 60 * 60 * 1000), // Every 8 hours
                topic: topic,
                accuracy: Math.max(15, 30 - Math.random() * 15), // Very low accuracy 15-30%
                time_taken_seconds: baseTime + 200 + Math.random() * 100, // Much longer time
                retry_count: baseRetries + 6 + Math.floor(Math.random() * 4), // Many retries 6-10
                problem_solving_steps: Math.max(1, 2 + Math.floor(Math.random() * 2)) // Very few steps 1-3
            };
            student.interactions.push(interaction);
        }
    }

    calculateBaseline(student);
    calculateDriftScore(student);
}

// Calculate baseline pattern
function calculateBaseline(student) {
    const recentInteractions = student.interactions.slice(-CONFIG.baselineWindowSize);
    
    if (recentInteractions.length < 5) {
        student.baseline = null;
        return;
    }

    const metrics = ['accuracy', 'time_taken_seconds', 'retry_count', 'problem_solving_steps'];
    const baseline = {};

    metrics.forEach(metric => {
        const values = recentInteractions.map(i => i[metric]);
        baseline[`${metric}_mean`] = mean(values);
        baseline[`${metric}_std`] = std(values);
    });

    student.baseline = baseline;
}

// Calculate drift score
function calculateDriftScore(student) {
    if (!student.baseline || student.interactions.length < 5) {
        student.driftScore = 0;
        student.status = 'healthy';
        return;
    }

    const recentInteractions = student.interactions.slice(-CONFIG.slidingWindowSize);
    const metricChangeCounts = {
        accuracy: 0,
        time_taken: 0,
        retry_count: 0,
        problem_solving_steps: 0
    };

    recentInteractions.forEach(interaction => {
        const changes = detectBehavioralChanges(interaction, student.baseline);
        changes.forEach(change => {
            metricChangeCounts[change.metric]++;
        });
    });

    let driftScore = 0;
    Object.keys(CONFIG.metricWeights).forEach(metric => {
        const metricKey = metric === 'time_taken' ? 'time_taken' : metric;
        const metricScore = metricChangeCounts[metricKey] / CONFIG.slidingWindowSize;
        driftScore += metricScore * CONFIG.metricWeights[metric];
    });

    student.driftScore = Math.min(Math.max(driftScore, 0), 1);
    
    if (student.driftScore >= CONFIG.driftThreshold) {
        student.status = 'critical';
        generateAlert(student);
    } else if (student.driftScore >= CONFIG.feedbackThreshold) {
        student.status = 'warning';
    } else {
        student.status = 'healthy';
    }
}

// Detect behavioral changes
function detectBehavioralChanges(interaction, baseline) {
    const changes = [];

    // Accuracy decrease
    const zAccuracy = (interaction.accuracy - baseline.accuracy_mean) / baseline.accuracy_std;
    if (zAccuracy < -CONFIG.stdMultiplier) {
        changes.push({ metric: 'accuracy', z_score: zAccuracy, severity: Math.abs(zAccuracy) });
    }

    // Time increase
    const zTime = (interaction.time_taken_seconds - baseline.time_taken_seconds_mean) / baseline.time_taken_seconds_std;
    if (zTime > CONFIG.stdMultiplier) {
        changes.push({ metric: 'time_taken', z_score: zTime, severity: zTime });
    }

    // Retry increase
    const zRetry = (interaction.retry_count - baseline.retry_count_mean) / baseline.retry_count_std;
    if (zRetry > CONFIG.stdMultiplier) {
        changes.push({ metric: 'retry_count', z_score: zRetry, severity: zRetry });
    }

    // Steps decrease
    const zSteps = (interaction.problem_solving_steps - baseline.problem_solving_steps_mean) / baseline.problem_solving_steps_std;
    if (zSteps < -CONFIG.stdMultiplier) {
        changes.push({ metric: 'problem_solving_steps', z_score: zSteps, severity: Math.abs(zSteps) });
    }

    return changes;
}

// Generate alert
function generateAlert(student) {
    const existingAlert = alerts.find(a => a.student_id === student.id && a.status === 'pending');
    if (existingAlert) return;

    const alert = {
        alert_id: `alert-${Date.now()}`,
        student_id: student.id,
        student_name: student.name,
        drift_score: student.driftScore,
        priority: student.driftScore >= 0.85 ? 'critical' : student.driftScore >= 0.75 ? 'high' : 'medium',
        concern_metrics: getConcernMetrics(student),
        timestamp: new Date(),
        status: 'pending'
    };

    alerts.unshift(alert);
}

// Get concern metrics
function getConcernMetrics(student) {
    const recentInteractions = student.interactions.slice(-CONFIG.slidingWindowSize);
    const concernMetrics = new Set();

    recentInteractions.forEach(interaction => {
        const changes = detectBehavioralChanges(interaction, student.baseline);
        changes.forEach(change => {
            if (change.severity > 2.5) {
                concernMetrics.add(change.metric);
            }
        });
    });

    return Array.from(concernMetrics);
}

// Generate class history
function generateClassHistory() {
    for (let i = 30; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const avgDrift = students.reduce((sum, s) => sum + s.driftScore, 0) / students.length;
        classHistory.push({
            date: date,
            avgDriftScore: avgDrift + (Math.random() - 0.5) * 0.1
        });
    }
}

// Statistical functions
function mean(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function std(values) {
    const avg = mean(values);
    const squareDiffs = values.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(mean(squareDiffs));
}

// Submit activity
async function submitActivity() {
    const studentId = document.getElementById('sim-student').value;
    const student = students.find(s => s.id === studentId);
    
    if (!student) return;

    const interaction = {
        student_id: studentId,
        activity_id: `ACT-${Date.now()}`,
        activity_type: 'quiz',
        accuracy: parseFloat(document.getElementById('sim-accuracy').value),
        time_taken_seconds: parseInt(document.getElementById('sim-time').value),
        retry_count: parseInt(document.getElementById('sim-retries').value),
        problem_solving_steps: parseInt(document.getElementById('sim-steps').value)
    };

    try {
        const response = await fetch(`${API_URL}/api/v1/interactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(interaction)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Activity submitted:', result);

            // Update local data
            const newInteraction = {
                timestamp: new Date(),
                accuracy: interaction.accuracy,
                time_taken_seconds: interaction.time_taken_seconds,
                retry_count: interaction.retry_count,
                problem_solving_steps: interaction.problem_solving_steps
            };

            student.interactions.push(newInteraction);
            calculateBaseline(student);
            calculateDriftScore(student);

            addActivityToLog(student, newInteraction);
            renderDashboard();
            renderStudents();
            renderAlerts();
        } else {
            console.error('Failed to submit activity:', response.statusText);
        }
    } catch (error) {
        console.error('Error submitting activity:', error);
    }
}

// Simulate decline
function simulateDecline() {
    const studentId = document.getElementById('sim-student').value;
    const student = students.find(s => s.id === studentId);
    
    if (!student || !student.baseline) return;

    for (let i = 0; i < 5; i++) {
        const interaction = {
            timestamp: new Date(Date.now() + i * 1000),
            accuracy: student.baseline.accuracy_mean - 25 - Math.random() * 10,
            time_taken_seconds: student.baseline.time_taken_seconds_mean + 150 + Math.random() * 50,
            retry_count: student.baseline.retry_count_mean + 4 + Math.floor(Math.random() * 2),
            problem_solving_steps: Math.max(1, student.baseline.problem_solving_steps_mean - 4)
        };

        student.interactions.push(interaction);
        addActivityToLog(student, interaction);
    }

    calculateBaseline(student);
    calculateDriftScore(student);
    renderDashboard();
    renderStudents();
    renderAlerts();
}

// Add activity to log
function addActivityToLog(studentId, accuracy, timeTaken, retries, steps) {
    const logContainer = document.getElementById('activity-log');
    
    if (logContainer.querySelector('.empty-state')) {
        logContainer.innerHTML = '';
    }

    const student = students.find(s => s.id === studentId);
    const statusClass = student ? (student.driftScore >= CONFIG.driftThreshold ? 'critical' : 
                       student.driftScore >= CONFIG.feedbackThreshold ? 'warning' : 'healthy') : 'healthy';
    
    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    
    activityItem.innerHTML = `
        <div class="activity-header">
            <span class="activity-time">${new Date().toLocaleTimeString()}</span>
            <span class="activity-drift drift-badge ${statusClass}">
                Drift: ${student ? student.driftScore.toFixed(2) : '0.00'}
            </span>
        </div>
        <div class="activity-metrics">
            <div>Accuracy: ${accuracy.toFixed(1)}%</div>
            <div>Time: ${timeTaken}s</div>
            <div>Retries: ${retries}</div>
            <div>Steps: ${steps}</div>
        </div>
    `;
    
    logContainer.insertBefore(activityItem, logContainer.firstChild);
}

// Populate simulator students
function populateSimulatorStudents() {
    const select = document.getElementById('sim-student');
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = student.name;
        select.appendChild(option);
    });
}

// Render dashboard
function renderDashboard() {
    const criticalCount = students.filter(s => s.status === 'critical').length;
    const warningCount = students.filter(s => s.status === 'warning').length;
    const healthyCount = students.filter(s => s.status === 'healthy').length;

    document.getElementById('critical-count').textContent = criticalCount;
    document.getElementById('warning-count').textContent = warningCount;
    document.getElementById('healthy-count').textContent = healthyCount;
    document.getElementById('total-students').textContent = students.length;

    renderClassTrendChart();
    renderRecentAlerts();
    renderTopPerformers();
    renderAttentionList();
}

// Render recent alerts in dashboard
function renderRecentAlerts() {
    const container = document.getElementById('recent-alerts-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    const recentAlerts = alerts.slice(0, 3);
    
    if (recentAlerts.length === 0) {
        container.innerHTML = '<p class="empty-state-small no-alerts">No recent alerts - All students performing well!</p>';
        return;
    }
    
    recentAlerts.forEach(alert => {
        const alertItem = document.createElement('div');
        alertItem.className = 'alert-item-small';
        alertItem.onclick = () => viewStudent(alert.student_id);
        
        const timeAgo = getTimeAgo(alert.timestamp);
        
        alertItem.innerHTML = `
            <div class="alert-item-header">
                <span class="alert-item-name">${alert.student_name}</span>
                <span class="alert-item-score">${alert.drift_score.toFixed(2)}</span>
            </div>
            <div class="alert-item-time">${timeAgo}</div>
        `;
        
        container.appendChild(alertItem);
    });
}

// Render top performers
function renderTopPerformers() {
    const container = document.getElementById('top-performers-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    const topStudents = [...students]
        .filter(s => s.status === 'healthy')
        .sort((a, b) => a.driftScore - b.driftScore)
        .slice(0, 5);
    
    if (topStudents.length === 0) {
        container.innerHTML = '<p class="empty-state-small">No data available</p>';
        return;
    }
    
    topStudents.forEach((student, index) => {
        const performerItem = document.createElement('div');
        performerItem.className = 'performer-item';
        performerItem.onclick = () => openStudentModal(student);
        
        performerItem.innerHTML = `
            <div class="performer-rank">${index + 1}</div>
            <div class="performer-info">
                <div class="performer-name">${student.name}</div>
                <div class="performer-score">Score: ${(1 - student.driftScore).toFixed(2)}</div>
            </div>
        `;
        
        container.appendChild(performerItem);
    });
}

// Render attention list
function renderAttentionList() {
    const container = document.getElementById('attention-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    const needsAttention = students
        .filter(s => s.status === 'critical' || s.status === 'warning')
        .sort((a, b) => b.driftScore - a.driftScore)
        .slice(0, 5);
    
    if (needsAttention.length === 0) {
        container.innerHTML = '<p class="empty-state-small no-attention">All students performing excellently!</p>';
        return;
    }
    
    needsAttention.forEach(student => {
        const attentionItem = document.createElement('div');
        attentionItem.className = 'attention-item';
        attentionItem.onclick = () => openStudentModal(student);
        
        const issue = student.status === 'critical' ? 'Critical drift detected' : 'Performance declining';
        
        attentionItem.innerHTML = `
            <div class="attention-item-name">${student.name}</div>
            <div class="attention-item-issue">${issue} - Score: ${student.driftScore.toFixed(2)}</div>
        `;
        
        container.appendChild(attentionItem);
    });
}

// Helper function to get time ago
function getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// Navigation helper functions
function showStudentsView() {
    document.querySelectorAll('#faculty-content-area .view').forEach(v => v.classList.remove('active'));
    document.getElementById('students-view').classList.add('active');
    const btn = document.querySelector('#faculty-layout .sidebar-nav-btn[data-view="students"]');
    if (btn) { document.querySelectorAll('#faculty-layout .sidebar-nav-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
}

function showAlertsView() {
    document.querySelectorAll('#faculty-content-area .view').forEach(v => v.classList.remove('active'));
    document.getElementById('alerts-view').classList.add('active');
    const btn = document.querySelector('#faculty-layout .sidebar-nav-btn[data-view="alerts"]');
    if (btn) { document.querySelectorAll('#faculty-layout .sidebar-nav-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
}

function showSimulatorView() {
    document.querySelectorAll('#faculty-content-area .view').forEach(v => v.classList.remove('active'));
    document.getElementById('simulator-view').classList.add('active');
    const btn = document.querySelector('#faculty-layout .sidebar-nav-btn[data-view="simulator"]');
    if (btn) { document.querySelectorAll('#faculty-layout .sidebar-nav-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
}

// Render class trend chart
function renderClassTrendChart() {
    const ctx = document.getElementById('classTrendChart');
    
    if (charts.classTrend) {
        charts.classTrend.destroy();
    }

    const labels = classHistory.map(h => h.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const data = classHistory.map(h => h.avgDriftScore);

    charts.classTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average Drift Score',
                data: data,
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(1);
                        }
                    }
                }
            }
        }
    });
}

// Render students
function renderStudents() {
    const container = document.getElementById('students-grid');
    container.innerHTML = '';

    const sortedStudents = [...students].sort((a, b) => b.driftScore - a.driftScore);

    sortedStudents.forEach(student => {
        const card = document.createElement('div');
        card.className = `student-card status-${student.status}`;
        card.onclick = () => openStudentModal(student);

        const statusClass = student.status === 'critical' ? 'critical' : 
                           student.status === 'warning' ? 'warning' : 'healthy';

        card.innerHTML = `
            <div class="student-header">
                <div class="student-name">${student.name}</div>
                <div class="drift-badge ${statusClass}">${student.driftScore.toFixed(2)}</div>
            </div>
            <div class="student-metrics">
                <div class="metric-item">
                    <span class="metric-label">Interactions</span>
                    <span class="metric-value">${student.interactionCount}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Status</span>
                    <span class="metric-value status-${student.status}">${student.status}</span>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

// Render alerts
function renderAlerts() {
    const container = document.getElementById('alerts-list');
    container.innerHTML = '';

    if (alerts.length === 0) {
        container.innerHTML = '<p class="empty-state">No active alerts. All students are performing well!</p>';
        return;
    }

    alerts.forEach(alert => {
        const card = document.createElement('div');
        card.className = `alert-card priority-${alert.priority}`;

        card.innerHTML = `
            <div class="alert-header">
                <div class="alert-title">${alert.student_name}</div>
                <div class="alert-priority ${alert.priority}">${alert.priority}</div>
            </div>
            <div class="alert-body">
                Drift score of ${alert.drift_score.toFixed(2)} detected. Immediate attention recommended.
            </div>
            <div class="alert-metrics">
                ${alert.concern_metrics.map(m => `<span class="alert-metric-tag">${formatMetricName(m)}</span>`).join('')}
            </div>
            <div class="alert-actions">
                <button class="btn btn-primary btn-small" onclick="viewStudent('${alert.student_id}')">View Details</button>
                <button class="btn btn-secondary btn-small" onclick="acknowledgeAlert('${alert.alert_id}')">Acknowledge</button>
            </div>
        `;

        container.appendChild(card);
    });
}

// Format metric name
function formatMetricName(metric) {
    const names = {
        'accuracy': 'Accuracy',
        'time_taken': 'Time Taken',
        'retry_count': 'Retry Count',
        'problem_solving_steps': 'Problem-Solving Steps'
    };
    return names[metric] || metric;
}

// View student from alert
function viewStudent(studentId) {
    const student = students.find(s => s.id === studentId);
    if (student) {
        openStudentModal(student);
    }
}

// Acknowledge alert
function acknowledgeAlert(alertId) {
    const alert = alerts.find(a => a.alert_id === alertId);
    if (alert) {
        alert.status = 'acknowledged';
        alerts = alerts.filter(a => a.alert_id !== alertId);
        renderAlerts();
        renderDashboard();
    }
}

// Open student modal
// Enhanced openStudentModal function - merged with original
async function openStudentModal(student) {
    const modal = document.getElementById('student-modal');
    document.getElementById('modal-student-name').textContent = student.name;

    const scoreCircle = document.getElementById('modal-drift-score');
    const scoreValue = scoreCircle.querySelector('.drift-score-value');
    scoreValue.textContent = student.driftScore.toFixed(2);

    scoreCircle.className = 'drift-score-circle';
    if (student.driftScore >= CONFIG.driftThreshold) {
        scoreCircle.classList.add('critical');
    } else if (student.driftScore >= CONFIG.feedbackThreshold) {
        scoreCircle.classList.add('warning');
    } else {
        scoreCircle.classList.add('healthy');
    }
    
    // Perform comprehensive analysis for enhanced features
    const analysis = performComprehensiveAnalysis(student.id);
    
    // Render all enhanced analysis tabs
    if (analysis) {
        renderTopicAnalysis(analysis);
        renderBehaviorAnalysis(analysis);
        renderSpeedAnalysis(analysis);
        renderRecommendations(analysis);
    }

    // Fetch and render student data (original charts)
    await renderStudentTimelineChart(student);
    await renderStudentMetricsChart(student);
    await renderBaselineComparison(student);
    await renderFeedback(student);

    modal.classList.add('active');
    modal.style.display = 'block';
}

// Close modal - works for all modals
function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
        modal.style.display = 'none';
    });
}

// Render student timeline chart
async function renderStudentTimelineChart(student) {
    const ctx = document.getElementById('studentTimelineChart');
    
    if (charts.studentTimeline) {
        charts.studentTimeline.destroy();
    }

    try {
        const response = await fetch(`${API_URL}/api/v1/reports/student/${student.id}/drift-timeline`);
        const data = await response.json();
        
        const labels = data.data_points.map(p => new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        const scores = data.data_points.map(p => p.drift_score);

        charts.studentTimeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Drift Score',
                    data: scores,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1,
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1);
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Failed to load timeline:', error);
        // Fallback empty chart
        charts.studentTimeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: []
            }
        });
    }
}

// Render student metrics chart
async function renderStudentMetricsChart(student) {
    const ctx = document.getElementById('studentMetricsChart');
    
    if (charts.studentMetrics) {
        charts.studentMetrics.destroy();
    }

    try {
        const response = await fetch(`${API_URL}/api/v1/reports/student/${student.id}/metric-breakdown`);
        const data = await response.json();
        
        const contributions = data.contributions.map(c => c.contribution);
        const labels = data.contributions.map(c => formatMetricName(c.metric));

        charts.studentMetrics = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Contribution to Drift',
                    data: contributions,
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(59, 130, 246, 0.8)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 1,
                        ticks: {
                            callback: function(value) {
                                return (value * 100).toFixed(0) + '%';
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Failed to load metrics:', error);
        // Fallback empty chart
        charts.studentMetrics = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: []
            }
        });
    }
}

// Render baseline comparison
async function renderBaselineComparison(student) {    charts.studentMetrics = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Accuracy', 'Time Taken', 'Retry Count', 'Problem-Solving Steps'],
            datasets: [{
                label: 'Contribution to Drift Score',
                data: contributions,
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 0.5
                }
            }
        }
    });
}

// Render baseline comparison
async function renderBaselineComparison(student) {
    const container = document.getElementById('baseline-stats');
    
    try {
        const response = await fetch(`${API_URL}/api/v1/reports/student/${student.id}/baseline-comparison`);
        const data = await response.json();
        
        const metrics = [
            { key: 'accuracy', label: 'Accuracy', unit: '%', inverse: false },
            { key: 'time_taken_seconds', label: 'Time Taken', unit: 's', inverse: true },
            { key: 'retry_count', label: 'Retry Count', unit: '', inverse: true },
            { key: 'problem_solving_steps', label: 'Problem-Solving Steps', unit: '', inverse: false }
        ];

        container.innerHTML = metrics.map(metric => {
            const current = data.current[metric.key];
            const baseline = data.baseline[metric.key];
            const diff = current - baseline;
            const isWorse = metric.inverse ? diff > 0 : diff < 0;
            
            return `
                <div class="baseline-stat">
                    <div class="baseline-stat-label">${metric.label}</div>
                    <div class="baseline-comparison-values">
                        <span class="baseline-value">${current.toFixed(1)}${metric.unit}</span>
                        <span class="baseline-arrow ${isWorse ? 'up' : 'down'}">${isWorse ? '↑' : '↓'}</span>
                        <span class="baseline-value">${baseline.toFixed(1)}${metric.unit}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Failed to load baseline comparison:', error);
        container.innerHTML = '<p class="empty-state">Unable to load baseline comparison</p>';
    }
}

// Render feedback
async function renderFeedback(student) {
    const container = document.getElementById('feedback-section');
    
    try {
        const response = await fetch(`${API_URL}/api/v1/feedback/${student.id}`);
        const data = await response.json();
        
        if (data.feedback.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        
        const latestFeedback = data.feedback[data.feedback.length - 1];
        
        container.innerHTML = `
            <h3>Personalized Feedback</h3>
            <div class="feedback-message">
                ${latestFeedback.message}
            </div>
            ${latestFeedback.skill_gaps.length > 0 ? `
                <div class="feedback-resources">
                    <h4>Areas to Focus On:</h4>
                    <ul>
                        ${latestFeedback.skill_gaps.map(gap => `<li>${gap}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            ${latestFeedback.recommended_resources.length > 0 ? `
                <div class="feedback-resources">
                    <h4>Recommended Resources:</h4>
                    <ul>
                        ${latestFeedback.recommended_resources.map(resource => `<li><a href="${resource.url}">${resource.title}</a></li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
    } catch (error) {
        console.error('Failed to load feedback:', error);
        container.style.display = 'none';
    }
}

// Student Performance Chart
function renderStudentPerformanceChart() {
    const ctx = document.getElementById('studentPerformanceChart');
    if (!ctx) return;
    
    if (charts.studentPerformance) {
        charts.studentPerformance.destroy();
    }

    const labels = Array.from({length: 30}, (_, i) => `Day ${i+1}`);
    const data = Array.from({length: 30}, () => 70 + Math.random() * 25);

    charts.studentPerformance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Accuracy %',
                data: data,
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 60,
                    max: 100
                }
            }
        }
    });
}

// Initialize student performance chart when view is shown
setTimeout(() => {
    if (document.getElementById('student-performance-view')) {
        renderStudentPerformanceChart();
    }
}, 100);


// Search and Filter Functions
let currentFilter = 'all';

function setupStudentFilters() {
    // Search functionality
    const searchInput = document.getElementById('student-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterAndRenderStudents(e.target.value, currentFilter);
        });
    }
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            const searchValue = document.getElementById('student-search')?.value || '';
            filterAndRenderStudents(searchValue, currentFilter);
        });
    });
}

function filterAndRenderStudents(searchTerm, filter) {
    let filteredStudents = students;
    
    // Apply status filter
    if (filter !== 'all') {
        filteredStudents = filteredStudents.filter(s => s.status === filter);
    }
    
    // Apply search filter
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredStudents = filteredStudents.filter(s => 
            s.name.toLowerCase().includes(term) || 
            s.id.toLowerCase().includes(term)
        );
    }
    
    // Render filtered students
    const container = document.getElementById('students-grid');
    container.innerHTML = '';
    
    if (filteredStudents.length === 0) {
        container.innerHTML = '<p class="empty-state">No students found matching your criteria.</p>';
        return;
    }
    
    const sortedStudents = [...filteredStudents].sort((a, b) => b.driftScore - a.driftScore);
    
    sortedStudents.forEach(student => {
        const card = document.createElement('div');
        card.className = `student-card status-${student.status}`;
        card.onclick = () => openStudentModal(student);
        
        const statusClass = student.status === 'critical' ? 'critical' : 
                           student.status === 'warning' ? 'warning' : 'healthy';
        
        card.innerHTML = `
            <div class="student-header">
                <div class="student-name">${student.name}</div>
                <div class="drift-badge ${statusClass}">${student.driftScore.toFixed(2)}</div>
            </div>
            <div class="student-metrics">
                <div class="metric-item">
                    <span class="metric-label">Interactions</span>
                    <span class="metric-value">${student.interactionCount || 0}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Status</span>
                    <span class="metric-value status-${student.status}">${student.status}</span>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Export Report Function
function exportStudentReport() {
    const reportData = students.map(s => ({
        'Student ID': s.id,
        'Name': s.name,
        'Drift Score': s.driftScore.toFixed(2),
        'Status': s.status,
        'Interactions': s.interactionCount || 0
    }));
    
    // Convert to CSV
    const headers = Object.keys(reportData[0]);
    const csvContent = [
        headers.join(','),
        ...reportData.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Add notification badge to alerts button
function updateAlertsBadge() {
    const alertsBtn = document.querySelector('.nav-btn[data-view="alerts"]');
    if (alertsBtn && alerts.length > 0) {
        let badge = alertsBtn.querySelector('.notification-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notification-badge';
            alertsBtn.appendChild(badge);
        }
        badge.textContent = alerts.length;
    }
}

// Initialize filters when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        setupStudentFilters();
        updateAlertsBadge();
    }, 500);
});


// Test Management System
let tests = [];
let testResults = [];
let currentTest = null;
let testTimer = null;

// Load tests from localStorage on page load
function loadTests() {
    const saved = localStorage.getItem('tests');
    console.log('🔄 Loading tests from localStorage...');
    console.log('Raw localStorage data:', saved);
    
    if (saved) {
        try {
            tests = JSON.parse(saved);
            console.log('✅ Loaded tests from localStorage:', tests.length, 'tests');
            console.log('Tests:', tests);
        } catch (e) {
            console.error('❌ Failed to load tests:', e);
            tests = [];
        }
    } else {
        console.log('⚠️ No tests found in localStorage');
    }
}

// Save tests to localStorage
function saveTests() {
    try {
        const dataToSave = JSON.stringify(tests);
        localStorage.setItem('tests', dataToSave);
        console.log('💾 Saved tests to localStorage:', tests.length, 'tests');
        console.log('Saved data:', dataToSave);
    } catch (e) {
        console.error('❌ Failed to save tests:', e);
    }
}

// Load test results from localStorage on page load
function loadTestResults() {
    const saved = localStorage.getItem('testResults');
    console.log('🔄 Loading test results from localStorage...');
    console.log('Raw localStorage data:', saved);
    
    if (saved) {
        try {
            testResults = JSON.parse(saved);
            console.log('✅ Loaded test results from localStorage:', testResults.length, 'results');
            console.log('Test results:', testResults);
        } catch (e) {
            console.error('❌ Failed to load test results:', e);
            testResults = [];
        }
    } else {
        console.log('⚠️ No test results found in localStorage');
    }
}

// Save test results to localStorage
function saveTestResults() {
    try {
        const dataToSave = JSON.stringify(testResults);
        localStorage.setItem('testResults', dataToSave);
        console.log('💾 Saved test results to localStorage:', testResults.length, 'results');
        console.log('Saved data:', dataToSave);
    } catch (e) {
        console.error('❌ Failed to save test results:', e);
    }
}

// Initialize test data
function initializeTests() {
    // Load from localStorage first
    loadTests();
    loadTestResults();
    
    // Check if tests need difficulty field migration or all tests have expired
    const needsMigration = tests.length > 0 && tests.some(t => !t.difficulty);
    const allExpired = tests.length > 0 && tests.every(t => new Date(t.dueDate) <= new Date());
    
    // If no tests exist OR tests need migration OR all tests have expired, create fresh tests
    if (tests.length === 0 || needsMigration || allExpired) {
        console.log('Initializing tests with difficulty levels...');
        localStorage.removeItem('tests'); // Clear old tests
        tests = [
            // Easy Level Tests
            {
                id: 'test-easy-1',
                title: 'Introduction to Programming',
                subject: 'programming',
                difficulty: 'easy',
                duration: 20,
                totalMarks: 50,
                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active',
                questions: [
                    'What is a variable in programming?',
                    'Explain what a loop does.',
                    'What is the difference between = and == in programming?'
                ],
                createdAt: new Date().toISOString()
            },
            {
                id: 'test-easy-2',
                title: 'Basic Mathematics Quiz',
                subject: 'math',
                difficulty: 'easy',
                duration: 25,
                totalMarks: 50,
                dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active',
                questions: [
                    'What is 15 + 27?',
                    'Solve for x: 2x + 5 = 15',
                    'What is the area of a rectangle with length 5 and width 3?'
                ],
                createdAt: new Date().toISOString()
            },
            // Medium Level Tests
            {
                id: 'test-medium-1',
                title: 'Data Structures Quiz',
                subject: 'ds',
                difficulty: 'medium',
                duration: 30,
                totalMarks: 100,
                dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active',
                questions: [
                    'What is a binary search tree?',
                    'Explain the difference between stack and queue.',
                    'What is the time complexity of binary search?',
                    'How does a hash table work?'
                ],
                createdAt: new Date().toISOString()
            },
            {
                id: 'test-medium-2',
                title: 'Object-Oriented Programming',
                subject: 'programming',
                difficulty: 'medium',
                duration: 35,
                totalMarks: 100,
                dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active',
                questions: [
                    'What is inheritance in OOP?',
                    'Explain polymorphism with an example.',
                    'What is encapsulation?',
                    'Describe the difference between abstract class and interface.'
                ],
                createdAt: new Date().toISOString()
            },
            // Hard Level Tests
            {
                id: 'test-hard-1',
                title: 'Advanced Algorithms',
                subject: 'algo',
                difficulty: 'hard',
                duration: 60,
                totalMarks: 100,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active',
                questions: [
                    'Explain the merge sort algorithm and analyze its time complexity.',
                    'What is dynamic programming? Provide an example problem.',
                    'Compare BFS and DFS algorithms with use cases.',
                    'Implement Dijkstra\'s shortest path algorithm.',
                    'Explain the concept of NP-completeness.'
                ],
                createdAt: new Date().toISOString()
            },
            {
                id: 'test-hard-2',
                title: 'Advanced Data Structures',
                subject: 'ds',
                difficulty: 'hard',
                duration: 50,
                totalMarks: 100,
                dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active',
                questions: [
                    'Explain how a Red-Black tree maintains balance.',
                    'Implement a Trie data structure for string searching.',
                    'What is a B-tree and when is it used?',
                    'Describe the implementation of a Fibonacci heap.',
                    'Explain segment trees and their applications.'
                ],
                createdAt: new Date().toISOString()
            }
        ];
        
        // Save to localStorage
        saveTests();
    }
    
    // Sample test results (only if no results exist)
    if (testResults.length === 0) {
        testResults = [
            {
                id: 'result-1',
                testId: 'test-medium-1',
                testTitle: 'Data Structures Quiz',
                studentId: 'student-1',
                studentName: 'Alice Johnson',
                score: 85,
                totalMarks: 100,
                submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                answers: [],
                subject: 'ds'
            },
            {
                id: 'result-2',
                testId: 'test-easy-1',
                testTitle: 'Introduction to Programming',
                studentId: 'student-3',
                studentName: 'Carol Williams',
                score: 45,
                totalMarks: 50,
                submittedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                answers: [],
                subject: 'programming'
            }
        ];
        
        // Save to localStorage
        saveTestResults();
    }
    
    // Render the tests
    renderTestsList();
    renderStudentTests();
    renderRecentResults();
}

// Render tests list in faculty dashboard
function renderTestsList() {
    const container = document.getElementById('tests-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (tests.length === 0) {
        container.innerHTML = '<p class="empty-state-small">No tests created yet</p>';
        return;
    }
    
    tests.forEach(test => {
        const testItem = document.createElement('div');
        testItem.className = 'test-item';
        
        const dueDate = new Date(test.dueDate);
        const isOverdue = dueDate < new Date();
        const status = isOverdue ? 'closed' : 'active';
        
        // Difficulty badge colors
        const difficultyColors = {
            easy: '#10b981',
            medium: '#f59e0b',
            hard: '#ef4444'
        };
        
        const difficultyColor = difficultyColors[test.difficulty] || '#6b7280';
        const difficultyLabel = test.difficulty ? test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1) : 'N/A';
        
        testItem.innerHTML = `
            <div class="test-item-header">
                <div class="test-item-title">${test.title}</div>
                <div class="test-item-status ${status}">${status}</div>
            </div>
            <div class="test-item-details">
                <span>📚 ${test.subject.toUpperCase()}</span>
                <span style="background: ${difficultyColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${difficultyLabel}</span>
                <span>⏱️ ${test.duration} min</span>
                <span>📝 ${test.totalMarks} marks</span>
                <span>📅 Due: ${dueDate.toLocaleDateString()}</span>
            </div>
            <div class="test-item-actions">
                <button class="btn btn-primary btn-small" onclick="viewTestResults('${test.id}')">View Results</button>
                <button class="btn btn-secondary btn-small" onclick="editTest('${test.id}')">Edit</button>
            </div>
        `;
        
        container.appendChild(testItem);
    });
}

// Render recent test results
function renderRecentResults() {
    const container = document.getElementById('recent-results-list');
    if (!container) {
        console.log('❌ recent-results-list container not found');
        return;
    }
    
    console.log('📊 Faculty view - Total test results:', testResults.length);
    console.log('📋 All test results:', testResults);
    
    container.innerHTML = '';
    
    const recentResults = testResults.slice(0, 5);
    
    if (recentResults.length === 0) {
        console.log('⚠️ No test results to display');
        container.innerHTML = '<p class="empty-state-small">No test results yet</p>';
        return;
    }
    
    console.log('✅ Displaying', recentResults.length, 'recent results');
    
    recentResults.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.onclick = () => viewStudentResult(result.id);
        
        const percentage = ((result.score / result.totalMarks) * 100).toFixed(0);
        
        // Add color coding based on score
        let borderColor = '#10b981'; // green
        if (percentage < 60) borderColor = '#ef4444'; // red
        else if (percentage < 75) borderColor = '#f59e0b'; // orange
        else if (percentage < 90) borderColor = '#3b82f6'; // blue
        
        resultItem.style.borderLeftColor = borderColor;
        
        resultItem.innerHTML = `
            <div class="result-item-header">
                <span class="result-student-name">${result.studentName}</span>
                <span class="result-score" style="color: ${borderColor}">${percentage}%</span>
            </div>
            <div class="result-test-name">${result.testTitle} • ${getTimeAgo(result.submittedAt)}</div>
        `;
        
        container.appendChild(resultItem);
    });
}

// Open create test modal
function openCreateTestModal() {
    document.getElementById('create-test-modal').classList.add('active');
}

// Close create test modal
function closeCreateTestModal() {
    document.getElementById('create-test-modal').classList.remove('active');
    document.getElementById('create-test-form').reset();
}

// Create new test
function createTest(event) {
    event.preventDefault();
    
    const title = document.getElementById('test-title').value;
    const subject = document.getElementById('test-subject').value;
    const difficulty = document.getElementById('test-difficulty').value;
    const duration = parseInt(document.getElementById('test-duration').value);
    const totalMarks = parseInt(document.getElementById('test-marks').value);
    const dueDate = new Date(document.getElementById('test-due-date').value);
    const questionsText = document.getElementById('test-questions').value;
    const questions = questionsText.split('\n').filter(q => q.trim() !== '');
    
    const newTest = {
        id: `test-${Date.now()}`,
        title,
        subject,
        difficulty,
        duration,
        totalMarks,
        dueDate: dueDate.toISOString(), // Convert to ISO string for proper serialization
        status: 'active',
        questions,
        createdAt: new Date().toISOString() // Convert to ISO string
    };
    
    console.log('📝 Creating new test:', newTest);
    
    tests.unshift(newTest);
    
    // Save to localStorage
    saveTests();
    
    renderTestsList();
    closeCreateTestModal();
    showToast('Test created successfully!', 'success');
}

// Open take test modal (for students)
function openTakeTestModal(testId) {
    console.log('🔍 Opening test modal for ID:', testId);
    console.log('📚 Available tests:', tests);
    
    const test = tests.find(t => t.id === testId);
    
    if (!test) {
        console.error('❌ Test not found with ID:', testId);
        alert('Test not found. Please refresh the page and try again.');
        return;
    }
    
    console.log('✅ Test found:', test);
    
    currentTest = test;
    
    document.getElementById('take-test-title').textContent = test.title;
    document.getElementById('test-duration-display').textContent = `${test.duration} min`;
    document.getElementById('test-marks-display').textContent = test.totalMarks;
    
    // Render questions
    const container = document.getElementById('test-questions-container');
    container.innerHTML = '';
    
    if (!test.questions || test.questions.length === 0) {
        console.error('❌ No questions found in test');
        container.innerHTML = '<p style="padding: 1rem; color: #ef4444;">No questions available for this test.</p>';
    } else {
        console.log('📝 Rendering', test.questions.length, 'questions');
        test.questions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'test-question';
            questionDiv.innerHTML = `
                <div class="test-question-number">Question ${index + 1}</div>
                <div class="test-question-text">${question}</div>
                <textarea class="test-question-answer" name="answer-${index}" placeholder="Type your answer here..." required></textarea>
            `;
            container.appendChild(questionDiv);
        });
    }
    
    // Start timer
    startTestTimer(test.duration);
    
    document.getElementById('take-test-modal').classList.add('active');
    console.log('✅ Test modal opened');
}

// Close take test modal
function closeTakeTestModal() {
    document.getElementById('take-test-modal').classList.remove('active');
    if (testTimer) {
        clearInterval(testTimer);
        testTimer = null;
    }
    currentTest = null;
}

// Start test timer
function startTestTimer(durationMinutes) {
    let timeLeft = durationMinutes * 60; // Convert to seconds
    
    const updateTimer = () => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        document.getElementById('time-remaining').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(testTimer);
            alert('Time is up! Submitting your test...');
            document.getElementById('take-test-form').dispatchEvent(new Event('submit'));
        }
        
        timeLeft--;
    };
    
    updateTimer();
    testTimer = setInterval(updateTimer, 1000);
}

// Submit test
function submitTest(event) {
    event.preventDefault();
    
    if (!currentTest) return;
    
    const formData = new FormData(event.target);
    const answers = [];
    
    currentTest.questions.forEach((question, index) => {
        answers.push({
            question,
            answer: formData.get(`answer-${index}`)
        });
    });
    
    // Calculate score (mock - in real app, this would be done by backend)
    const score = Math.floor(Math.random() * 30) + 70; // Random score between 70-100
    
    // Get current student info from window.currentUser (set during login)
    const currentStudentId = window.currentUser?.id || 'student-1';
    const currentStudentName = window.currentUser?.name || 'Alice Johnson';
    
    console.log('🔍 Current User Object:', window.currentUser);
    console.log('📝 Submitting test for:', currentStudentName, 'ID:', currentStudentId);
    
    const result = {
        id: `result-${Date.now()}`,
        testId: currentTest.id,
        testTitle: currentTest.title,
        studentId: currentStudentId,
        studentName: currentStudentName,
        score,
        totalMarks: currentTest.totalMarks,
        submittedAt: new Date().toISOString(), // Convert to ISO string for proper serialization
        answers,
        subject: currentTest.subject
    };
    
    console.log('💾 Saving test result:', result);
    
    testResults.unshift(result);
    
    // Save to localStorage
    saveTestResults();
    
    console.log('✅ Test result saved. Total results:', testResults.length);
    
    // Update both faculty and student views
    renderRecentResults();
    renderStudentTestResults();
    
    closeTakeTestModal();
    
    showToast(`Test submitted successfully! Your score: ${score}/${currentTest.totalMarks} (${((score/currentTest.totalMarks)*100).toFixed(0)}%)`, 'success');
}

// View test results
function viewTestResults(testId) {
    showTestResultsView();
    // Filter results by test
    const testFilter = document.getElementById('test-filter');
    if (testFilter) {
        testFilter.value = testId;
        filterTestResults();
    }
}

// View student result
function viewStudentResult(resultId) {
    const result = testResults.find(r => r.id === resultId);
    if (!result) return;
    
    const percentage = ((result.score / result.totalMarks) * 100).toFixed(0);
    let grade = 'F';
    if (percentage >= 90) grade = 'A';
    else if (percentage >= 80) grade = 'B';
    else if (percentage >= 70) grade = 'C';
    else if (percentage >= 60) grade = 'D';
    
    const submittedDate = new Date(result.submittedAt);
    
    let detailsHTML = `
        <div style="padding: 1.5rem;">
            <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: #111827;">Test Result Details</h3>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 2rem;">
                <div style="padding: 1rem; background: #f9fafb; border-radius: 8px;">
                    <div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem;">Student</div>
                    <div style="font-weight: 700; color: #111827;">${result.studentName}</div>
                </div>
                <div style="padding: 1rem; background: #f9fafb; border-radius: 8px;">
                    <div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem;">Test</div>
                    <div style="font-weight: 700; color: #111827;">${result.testTitle}</div>
                </div>
                <div style="padding: 1rem; background: #f9fafb; border-radius: 8px;">
                    <div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem;">Score</div>
                    <div style="font-weight: 700; color: #111827; font-size: 1.5rem;">${result.score}/${result.totalMarks} (${percentage}%)</div>
                </div>
                <div style="padding: 1rem; background: #f9fafb; border-radius: 8px;">
                    <div style="color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem;">Grade</div>
                    <div style="font-weight: 700; color: #111827; font-size: 1.5rem;">${grade}</div>
                </div>
            </div>
            
            <div style="padding: 1rem; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; margin-bottom: 1rem;">
                <div style="font-weight: 700; color: #1e40af; margin-bottom: 0.5rem;">Submitted</div>
                <div style="color: #374151;">${submittedDate.toLocaleString()}</div>
            </div>
            
            ${result.answers && result.answers.length > 0 ? `
                <div style="margin-top: 2rem;">
                    <h4 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1rem; color: #111827;">Answers</h4>
                    ${result.answers.map((ans, idx) => `
                        <div style="padding: 1rem; background: white; border: 2px solid #e5e7eb; border-radius: 8px; margin-bottom: 1rem;">
                            <div style="font-weight: 600; color: #4f46e5; margin-bottom: 0.5rem;">Question ${idx + 1}</div>
                            <div style="color: #111827; margin-bottom: 0.75rem;">${ans.question}</div>
                            <div style="padding: 0.75rem; background: #f9fafb; border-radius: 6px;">
                                <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">Answer:</div>
                                <div style="color: #374151;">${ans.answer}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    // Create a temporary modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2>Test Result</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                ${detailsHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Show test results view
function showTestResultsView() {
    document.querySelectorAll('#faculty-content-area .view').forEach(v => v.classList.remove('active'));
    document.getElementById('test-results-view').classList.add('active');
    
    renderTestResultsView();
}

// Show dashboard view (back button)
function showDashboardView() {
    document.querySelectorAll('#faculty-content-area .view').forEach(v => v.classList.remove('active'));
    document.getElementById('dashboard-view').classList.add('active');
    const btn = document.querySelector('#faculty-layout .sidebar-nav-btn[data-view="dashboard"]');
    if (btn) { document.querySelectorAll('#faculty-layout .sidebar-nav-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
    
    // Reload test results from localStorage
    loadTestResults();
    
    // Refresh the results display
    renderRecentResults();
}

// Render test results view
function renderTestResultsView() {
    const container = document.getElementById('test-results-grid');
    if (!container) return;
    
    // Populate filters
    const testFilter = document.getElementById('test-filter');
    const studentFilter = document.getElementById('student-filter');
    
    if (testFilter && testFilter.options.length === 1) {
        tests.forEach(test => {
            const option = document.createElement('option');
            option.value = test.id;
            option.textContent = test.title;
            testFilter.appendChild(option);
        });
    }
    
    if (studentFilter && studentFilter.options.length === 1) {
        const uniqueStudents = [...new Set(testResults.map(r => r.studentId))];
        uniqueStudents.forEach(studentId => {
            const result = testResults.find(r => r.studentId === studentId);
            const option = document.createElement('option');
            option.value = studentId;
            option.textContent = result.studentName;
            studentFilter.appendChild(option);
        });
    }
    
    filterTestResults();
}

// Filter test results
function filterTestResults() {
    const container = document.getElementById('test-results-grid');
    if (!container) return;
    
    const testFilter = document.getElementById('test-filter').value;
    const studentFilter = document.getElementById('student-filter').value;
    
    let filteredResults = testResults;
    
    if (testFilter !== 'all') {
        filteredResults = filteredResults.filter(r => r.testId === testFilter);
    }
    
    if (studentFilter !== 'all') {
        filteredResults = filteredResults.filter(r => r.studentId === studentFilter);
    }
    
    container.innerHTML = '';
    
    if (filteredResults.length === 0) {
        container.innerHTML = '<p class="empty-state">No results found</p>';
        return;
    }
    
    filteredResults.forEach(result => {
        const percentage = ((result.score / result.totalMarks) * 100).toFixed(0);
        let scoreClass = 'poor';
        if (percentage >= 90) scoreClass = 'excellent';
        else if (percentage >= 75) scoreClass = 'good';
        else if (percentage >= 60) scoreClass = 'average';
        
        const card = document.createElement('div');
        card.className = 'test-result-card';
        card.innerHTML = `
            <div class="test-result-header">
                <div class="test-result-info">
                    <h4>${result.studentName}</h4>
                    <p>${result.testTitle}</p>
                </div>
                <div class="test-result-score-circle ${scoreClass}">
                    ${percentage}%
                </div>
            </div>
            <div class="test-result-details">
                <div class="test-result-detail-item">
                    <span class="test-result-detail-label">Score</span>
                    <span class="test-result-detail-value">${result.score}/${result.totalMarks}</span>
                </div>
                <div class="test-result-detail-item">
                    <span class="test-result-detail-label">Submitted</span>
                    <span class="test-result-detail-value">${getTimeAgo(result.submittedAt)}</span>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Edit test
function editTest(testId) {
    alert('Edit test functionality - Coming soon!');
}

// Initialize tests when dashboard loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initializeTests();
        
        // Add event listeners for filters
        const testFilter = document.getElementById('test-filter');
        const studentFilter = document.getElementById('student-filter');
        
        if (testFilter) {
            testFilter.addEventListener('change', filterTestResults);
        }
        
        if (studentFilter) {
            studentFilter.addEventListener('change', filterTestResults);
        }
    }, 1000);
});


// Render available tests for students
function renderStudentTests() {
    const container = document.getElementById('student-tests-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    const activeTests = tests.filter(t => t.status === 'active' && new Date(t.dueDate) > new Date());
    
    // Get selected difficulty filter
    const difficultyFilter = document.getElementById('difficulty-filter');
    const selectedDifficulty = difficultyFilter ? difficultyFilter.value : 'all';
    
    // Filter by difficulty if not 'all'
    const filteredTests = selectedDifficulty === 'all' 
        ? activeTests 
        : activeTests.filter(t => t.difficulty === selectedDifficulty);
    
    if (filteredTests.length === 0) {
        container.innerHTML = '<p class="empty-state-small">No tests available for this difficulty level</p>';
        return;
    }
    
    filteredTests.forEach(test => {
        const dueDate = new Date(test.dueDate);
        const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
        
        // Difficulty badge colors
        const difficultyColors = {
            easy: '#10b981',
            medium: '#f59e0b',
            hard: '#ef4444'
        };
        
        const difficultyColor = difficultyColors[test.difficulty] || '#6b7280';
        const difficultyLabel = test.difficulty ? test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1) : 'N/A';
        
        const testItem = document.createElement('div');
        testItem.className = 'schedule-item';
        testItem.style.cursor = 'pointer';
        testItem.onclick = () => openTakeTestModal(test.id);
        
        testItem.innerHTML = `
            <div class="schedule-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                </svg>
            </div>
            <div class="schedule-details">
                <h4>${test.title}</h4>
                <p>${test.duration} minutes • ${test.totalMarks} marks</p>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                    <span class="schedule-badge" style="background: ${difficultyColor}; color: white;">${difficultyLabel}</span>
                    <span class="schedule-badge">${daysLeft} day${daysLeft > 1 ? 's' : ''} left</span>
                </div>
            </div>
        `;
        
        container.appendChild(testItem);
    });
}

// Filter student tests by difficulty
function filterStudentTests() {
    renderStudentTests();
}

// Render student test results in student dashboard
function renderStudentTestResults() {
    const container = document.getElementById('student-test-results');
    if (!container) {
        console.log('❌ student-test-results container not found');
        return;
    }
    
    container.innerHTML = '';
    
    // Get current student's results from session
    const currentStudentId = currentUser?.id || 'student-1';
    console.log('🔍 Looking for test results for student ID:', currentStudentId);
    console.log('📊 Total test results in system:', testResults.length);
    console.log('📋 All test results:', testResults);
    
    const studentResults = testResults.filter(r => r.studentId === currentStudentId);
    console.log('✅ Found', studentResults.length, 'results for current student');
    
    if (studentResults.length === 0) {
        container.innerHTML = '<p class="empty-state-small">No test results yet. Complete a test to see your scores!</p>';
        return;
    }
    
    studentResults.forEach(result => {
        const percentage = ((result.score / result.totalMarks) * 100).toFixed(0);
        let scoreClass = 'poor';
        let feedback = 'Keep practicing! You can do better.';
        
        if (percentage >= 90) {
            scoreClass = 'excellent';
            feedback = 'Outstanding performance! Keep up the excellent work!';
        } else if (percentage >= 75) {
            scoreClass = 'good';
            feedback = 'Great job! You\'re doing well.';
        } else if (percentage >= 60) {
            scoreClass = 'average';
            feedback = 'Good effort! Review the topics and try again.';
        }
        
        const card = document.createElement('div');
        card.className = 'student-result-card';
        
        const submittedDate = new Date(result.submittedAt);
        
        card.innerHTML = `
            <div class="student-result-header">
                <div>
                    <div class="student-result-title">${result.testTitle}</div>
                    <div class="student-result-subject">${result.subject ? result.subject.toUpperCase() : 'General'}</div>
                </div>
                <div class="student-result-score-badge ${scoreClass}">
                    ${percentage}%
                    <div class="score-label">${scoreClass}</div>
                </div>
            </div>
            <div class="student-result-details">
                <div class="student-result-detail">
                    <span class="student-result-detail-label">Score</span>
                    <span class="student-result-detail-value">${result.score}/${result.totalMarks}</span>
                </div>
                <div class="student-result-detail">
                    <span class="student-result-detail-label">Submitted</span>
                    <span class="student-result-detail-value">${submittedDate.toLocaleDateString()}</span>
                </div>
                <div class="student-result-detail">
                    <span class="student-result-detail-label">Time</span>
                    <span class="student-result-detail-value">${submittedDate.toLocaleTimeString()}</span>
                </div>
            </div>
            <div class="student-result-feedback">
                <div class="student-result-feedback-title">Teacher's Feedback</div>
                <div class="student-result-feedback-text">${feedback}</div>
            </div>
        `;
        
        container.appendChild(card);
    });
}


// Drift Polls System
let polls = [];
let pollResponses = [];
let currentPoll = null;

// Initialize polls
function initializePolls() {
    // Sample polls
    polls = [
        {
            id: 'poll-1',
            question: 'Do you understand recursion?',
            topic: 'Recursion',
            type: 'understanding',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000),
            status: 'active',
            responses: []
        },
        {
            id: 'poll-2',
            question: 'How difficult did you find the sorting algorithms topic?',
            topic: 'Sorting Algorithms',
            type: 'difficulty',
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            status: 'closed',
            responses: []
        }
    ];
    
    // Sample responses
    pollResponses = [
        { pollId: 'poll-1', studentId: 'student-1', studentName: 'Alice Johnson', response: 4, timestamp: new Date() },
        { pollId: 'poll-1', studentId: 'student-2', studentName: 'Bob Smith', response: 2, timestamp: new Date() },
        { pollId: 'poll-1', studentId: 'student-3', studentName: 'Carol Williams', response: 5, timestamp: new Date() },
        { pollId: 'poll-1', studentId: 'student-4', studentName: 'David Brown', response: 3, timestamp: new Date() },
        { pollId: 'poll-1', studentId: 'student-5', studentName: 'Emma Davis', response: 2, timestamp: new Date() },
        { pollId: 'poll-2', studentId: 'student-1', studentName: 'Alice Johnson', response: 'Medium', timestamp: new Date() },
        { pollId: 'poll-2', studentId: 'student-2', studentName: 'Bob Smith', response: 'Hard', timestamp: new Date() },
        { pollId: 'poll-2', studentId: 'student-3', studentName: 'Carol Williams', response: 'Easy', timestamp: new Date() },
    ];
    
    renderPollsGrid();
}

// Update poll statistics cards
function updatePollBarGraph() {
    // Calculate statistics
    const totalPolls = polls.length;
    const activePolls = polls.filter(p => p.status === 'active' && new Date(p.expiresAt) > new Date()).length;
    const totalResponses = pollResponses.length;
    
    // Calculate average response rate
    let avgResponseRate = 0;
    if (polls.length > 0 && students.length > 0) {
        const totalPossibleResponses = polls.length * students.length;
        avgResponseRate = totalPossibleResponses > 0 ? (totalResponses / totalPossibleResponses) * 100 : 0;
    }
    
    // Calculate high drift count
    let highDriftCount = 0;
    polls.forEach(poll => {
        if (poll.type === 'understanding') {
            const responses = pollResponses.filter(r => r.pollId === poll.id);
            if (responses.length > 0) {
                const avgScore = responses.reduce((sum, r) => sum + r.response, 0) / responses.length;
                if (avgScore < 2.5) {
                    highDriftCount++;
                }
            }
        }
    });
    
    // Update card values with animation
    const stats = [
        { selector: '[data-stat="total-polls"]', value: totalPolls, suffix: '' },
        { selector: '[data-stat="active-polls"]', value: activePolls, suffix: '' },
        { selector: '[data-stat="total-responses"]', value: totalResponses, suffix: '' },
        { selector: '[data-stat="avg-response-rate"]', value: avgResponseRate.toFixed(0), suffix: '%' },
        { selector: '[data-stat="high-drift"]', value: highDriftCount, suffix: '' }
    ];
    
    stats.forEach(stat => {
        const element = document.querySelector(stat.selector);
        if (element) {
            // Animate the value change
            const currentValue = parseInt(element.textContent) || 0;
            const targetValue = parseInt(stat.value);
            
            if (currentValue !== targetValue) {
                animateValue(element, currentValue, targetValue, 800, stat.suffix);
            }
        }
    });
}

// Animate number counting
function animateValue(element, start, end, duration, suffix = '') {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.round(current) + suffix;
    }, 16);
}

// Render polls grid
function renderPollsGrid() {
    const container = document.getElementById('polls-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (polls.length === 0) {
        container.innerHTML = '<p class="empty-state">No polls created yet</p>';
        updatePollBarGraph(); // Update bar graph even when empty
        return;
    }
    
    polls.forEach(poll => {
        const responses = pollResponses.filter(r => r.pollId === poll.id);
        const responseCount = responses.length;
        const totalStudents = students.length;
        const responseRate = totalStudents > 0 ? ((responseCount / totalStudents) * 100).toFixed(0) : 0;
        
        // Calculate drift indicator
        let driftLevel = 'low';
        let driftText = 'Students are understanding well';
        
        if (poll.type === 'understanding') {
            const avgScore = responses.length > 0 
                ? responses.reduce((sum, r) => sum + r.response, 0) / responses.length 
                : 0;
            
            if (avgScore < 2.5) {
                driftLevel = 'high';
                driftText = 'High drift detected - Many students struggling';
            } else if (avgScore < 3.5) {
                driftLevel = 'medium';
                driftText = 'Moderate drift - Some students need help';
            }
        }
        
        const isActive = poll.status === 'active' && new Date(poll.expiresAt) > new Date();
        const status = isActive ? 'active' : 'closed';
        
        const card = document.createElement('div');
        card.className = 'poll-card';
        
        card.innerHTML = `
            <div class="poll-card-header">
                <div class="poll-question-text">${poll.question}</div>
                <div class="poll-meta">
                    <span class="poll-topic-badge">${poll.topic}</span>
                    <span class="poll-status-badge ${status}">${status}</span>
                </div>
            </div>
            
            <div class="poll-stats">
                <div class="poll-stat-item">
                    <div class="poll-stat-value">${responseCount}</div>
                    <div class="poll-stat-label">Responses</div>
                </div>
                <div class="poll-stat-item">
                    <div class="poll-stat-value">${responseRate}%</div>
                    <div class="poll-stat-label">Response Rate</div>
                </div>
            </div>
            
            ${responses.length > 0 ? `
                <div class="poll-drift-indicator ${driftLevel}">
                    <div class="poll-drift-label">Drift Analysis</div>
                    <div class="poll-drift-text">${driftText}</div>
                </div>
            ` : ''}
            
            <div class="poll-actions">
                <button class="btn btn-primary btn-small" onclick="viewPollResults('${poll.id}')">
                    View Results
                </button>
                ${isActive ? `
                    <button class="btn btn-secondary btn-small" onclick="closePoll('${poll.id}')">
                        Close Poll
                    </button>
                ` : ''}
            </div>
        `;
        
        container.appendChild(card);
    });
    
    // Update bar graph with statistics
    updatePollBarGraph();
}

// Open create poll modal
function openCreatePollModal() {
    document.getElementById('create-poll-modal').classList.add('active');
    
    // Add event listener for poll type change
    document.getElementById('poll-type').addEventListener('change', function() {
        const optionsField = document.getElementById('poll-options-field');
        if (this.value === 'multiple') {
            optionsField.style.display = 'block';
        } else {
            optionsField.style.display = 'none';
        }
    });
}

// Close create poll modal
function closeCreatePollModal() {
    document.getElementById('create-poll-modal').classList.remove('active');
    document.getElementById('create-poll-form').reset();
    document.getElementById('poll-options-field').style.display = 'none';
}

// Create poll
function createPoll(event) {
    event.preventDefault();
    
    const question = document.getElementById('poll-question').value;
    const topic = document.getElementById('poll-topic').value;
    const type = document.getElementById('poll-type').value;
    const duration = parseInt(document.getElementById('poll-duration').value);
    
    let options = null;
    if (type === 'multiple') {
        const optionsText = document.getElementById('poll-options').value;
        options = optionsText.split('\n').filter(o => o.trim() !== '');
    }
    
    const newPoll = {
        id: `poll-${Date.now()}`,
        question,
        topic,
        type,
        options,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + duration * 60 * 60 * 1000),
        status: 'active',
        responses: []
    };
    
    polls.unshift(newPoll);
    renderPollsGrid();
    renderStudentPolls(); // Update student polls list
    closeCreatePollModal();
    showToast('Poll created successfully!', 'success');
}

// Open take poll modal
function openTakePollModal(pollId) {
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;
    
    currentPoll = poll;
    
    document.getElementById('take-poll-question').textContent = poll.question;
    document.getElementById('poll-topic-display').textContent = poll.topic;
    
    const expiresDate = new Date(poll.expiresAt);
    const hoursLeft = Math.ceil((expiresDate - new Date()) / (1000 * 60 * 60));
    document.getElementById('poll-expires-display').textContent = `Expires in ${hoursLeft} hours`;
    
    // Render response options
    const container = document.getElementById('poll-response-container');
    container.innerHTML = '';
    
    if (poll.type === 'understanding') {
        container.innerHTML = `
            <div class="poll-rating-scale">
                ${[1, 2, 3, 4, 5].map(num => `
                    <div class="poll-rating-btn" onclick="selectPollRating(${num})">
                        <div class="poll-rating-number">${num}</div>
                        <div class="poll-rating-label">${num === 1 ? 'Not at all' : num === 5 ? 'Completely' : ''}</div>
                    </div>
                `).join('')}
            </div>
            <input type="hidden" name="poll-response" id="poll-response-value" required>
        `;
    } else if (poll.type === 'yesno') {
        container.innerHTML = `
            <div class="poll-response-options">
                <button type="button" class="poll-option-btn" onclick="selectPollOption('Yes')">Yes</button>
                <button type="button" class="poll-option-btn" onclick="selectPollOption('No')">No</button>
            </div>
            <input type="hidden" name="poll-response" id="poll-response-value" required>
        `;
    } else if (poll.type === 'difficulty') {
        container.innerHTML = `
            <div class="poll-response-options">
                <button type="button" class="poll-option-btn" onclick="selectPollOption('Easy')">Easy</button>
                <button type="button" class="poll-option-btn" onclick="selectPollOption('Medium')">Medium</button>
                <button type="button" class="poll-option-btn" onclick="selectPollOption('Hard')">Hard</button>
            </div>
            <input type="hidden" name="poll-response" id="poll-response-value" required>
        `;
    } else if (poll.type === 'multiple' && poll.options) {
        container.innerHTML = `
            <div class="poll-response-options">
                ${poll.options.map(opt => `
                    <button type="button" class="poll-option-btn" onclick="selectPollOption('${opt}')">${opt}</button>
                `).join('')}
            </div>
            <input type="hidden" name="poll-response" id="poll-response-value" required>
        `;
    }
    
    document.getElementById('take-poll-modal').classList.add('active');
}

// Close take poll modal
function closeTakePollModal() {
    document.getElementById('take-poll-modal').classList.remove('active');
    currentPoll = null;
}

// Select poll rating
function selectPollRating(rating) {
    document.querySelectorAll('.poll-rating-btn').forEach(btn => btn.classList.remove('selected'));
    event.target.closest('.poll-rating-btn').classList.add('selected');
    document.getElementById('poll-response-value').value = rating;
}

// Select poll option
function selectPollOption(option) {
    document.querySelectorAll('.poll-option-btn').forEach(btn => btn.classList.remove('selected'));
    event.target.classList.add('selected');
    document.getElementById('poll-response-value').value = option;
}

// Submit poll response
function submitPollResponse(event) {
    event.preventDefault();
    
    if (!currentPoll) return;
    
    const response = document.getElementById('poll-response-value').value;
    if (!response) {
        showToast('Please select an option', 'warning');
        return;
    }
    
    const pollResponse = {
        pollId: currentPoll.id,
        studentId: currentUser?.id || 'student-1',
        studentName: currentUser?.name || 'Alice Johnson',
        response: currentPoll.type === 'understanding' ? parseInt(response) : response,
        timestamp: new Date()
    };
    
    pollResponses.push(pollResponse);
    renderPollsGrid();
    renderStudentPolls(); // Update student polls list
    closeTakePollModal();
    showToast('Response submitted successfully!', 'success');
}

// View poll results
function viewPollResults(pollId) {
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;
    
    const responses = pollResponses.filter(r => r.pollId === pollId);
    const responseCount = responses.length;
    const totalStudents = students.length;
    const responseRate = totalStudents > 0 ? ((responseCount / totalStudents) * 100).toFixed(0) : 0;
    
    let resultsHTML = `
        <div class="poll-results-summary">
            <div class="poll-result-stat">
                <div class="poll-result-stat-value">${responseCount}</div>
                <div class="poll-result-stat-label">Total Responses</div>
            </div>
            <div class="poll-result-stat">
                <div class="poll-result-stat-value">${responseRate}%</div>
                <div class="poll-result-stat-label">Response Rate</div>
            </div>
            <div class="poll-result-stat">
                <div class="poll-result-stat-value">${poll.status === 'active' ? 'Active' : 'Closed'}</div>
                <div class="poll-result-stat-label">Status</div>
            </div>
        </div>
        
        <h3 style="margin-bottom: 1rem; color: #111827;">${poll.question}</h3>
        <div style="margin-bottom: 2rem; color: #6b7280;">Topic: ${poll.topic}</div>
    `;
    
    if (responses.length > 0) {
        if (poll.type === 'understanding') {
            const avgScore = responses.reduce((sum, r) => sum + r.response, 0) / responses.length;
            const distribution = [1, 2, 3, 4, 5].map(num => ({
                value: num,
                count: responses.filter(r => r.response === num).length
            }));
            
            resultsHTML += `
                <div class="poll-results-chart">
                    <h4 style="margin-bottom: 1rem; color: #111827;">Understanding Distribution</h4>
                    ${distribution.map(d => {
                        const percentage = (d.count / responses.length * 100).toFixed(0);
                        return `
                            <div class="poll-result-bar">
                                <div class="poll-result-bar-label">
                                    <span>Level ${d.value}</span>
                                    <span>${d.count} responses (${percentage}%)</span>
                                </div>
                                <div class="poll-result-bar-fill-container">
                                    <div class="poll-result-bar-fill" style="width: ${percentage}%">${percentage}%</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="poll-drift-analysis ${avgScore < 2.5 ? 'high' : avgScore < 3.5 ? 'medium' : 'low'}">
                    <h3>Drift Analysis</h3>
                    <p><strong>Average Understanding Level:</strong> ${avgScore.toFixed(2)}/5</p>
                    <p>${avgScore < 2.5 
                        ? '⚠️ High drift detected! Many students are struggling with this concept.' 
                        : avgScore < 3.5 
                        ? '⚡ Moderate drift detected. Some students need additional support.' 
                        : '✅ Low drift. Students are understanding the concept well.'
                    }</p>
                    
                    <div class="poll-drift-recommendations">
                        <h4>Recommendations:</h4>
                        <ul>
                            ${avgScore < 2.5 ? `
                                <li>Schedule a review session for this topic</li>
                                <li>Provide additional learning resources</li>
                                <li>Consider one-on-one tutoring for struggling students</li>
                                <li>Break down the concept into smaller parts</li>
                            ` : avgScore < 3.5 ? `
                                <li>Offer optional practice sessions</li>
                                <li>Share supplementary materials</li>
                                <li>Create study groups for peer learning</li>
                            ` : `
                                <li>Continue with current teaching approach</li>
                                <li>Consider moving to more advanced topics</li>
                                <li>Use this as a foundation for complex concepts</li>
                            `}
                        </ul>
                    </div>
                </div>
            `;
        } else {
            const responseCounts = {};
            responses.forEach(r => {
                responseCounts[r.response] = (responseCounts[r.response] || 0) + 1;
            });
            
            resultsHTML += `
                <div class="poll-results-chart">
                    <h4 style="margin-bottom: 1rem; color: #111827;">Response Distribution</h4>
                    ${Object.entries(responseCounts).map(([option, count]) => {
                        const percentage = (count / responses.length * 100).toFixed(0);
                        return `
                            <div class="poll-result-bar">
                                <div class="poll-result-bar-label">
                                    <span>${option}</span>
                                    <span>${count} responses (${percentage}%)</span>
                                </div>
                                <div class="poll-result-bar-fill-container">
                                    <div class="poll-result-bar-fill" style="width: ${percentage}%">${percentage}%</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
    } else {
        resultsHTML += '<p class="empty-state">No responses yet</p>';
    }
    
    document.getElementById('poll-results-content').innerHTML = resultsHTML;
    document.getElementById('poll-results-modal').classList.add('active');
}

// Close poll results modal
function closePollResultsModal() {
    document.getElementById('poll-results-modal').classList.remove('active');
}

// Close poll
function closePoll(pollId) {
    const poll = polls.find(p => p.id === pollId);
    if (poll) {
        poll.status = 'closed';
        renderPollsGrid();
        renderStudentPolls(); // Update student polls list
        showToast('Poll closed successfully', 'success');
    }
}

// Render student polls list
function renderStudentPolls() {
    const container = document.getElementById('student-polls-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Get active polls that haven't expired
    const activePolls = polls.filter(poll => {
        const isActive = poll.status === 'active' && new Date(poll.expiresAt) > new Date();
        return isActive;
    });
    
    if (activePolls.length === 0) {
        container.innerHTML = '<p class="empty-state-small">No active polls available</p>';
        return;
    }
    
    activePolls.forEach(poll => {
        // Check if current student has already responded
        const currentStudentId = currentUser?.id || 'student-1';
        const hasResponded = pollResponses.some(r => r.pollId === poll.id && r.studentId === currentStudentId);
        
        // Calculate time remaining
        const now = new Date();
        const expiresAt = new Date(poll.expiresAt);
        const hoursRemaining = Math.max(0, Math.floor((expiresAt - now) / (1000 * 60 * 60)));
        
        const card = document.createElement('div');
        card.className = 'student-poll-card';
        
        card.innerHTML = `
            <div class="student-poll-header">
                <h4 class="student-poll-title">${poll.topic}</h4>
                <span class="student-poll-status ${hasResponded ? 'completed' : 'active'}">
                    ${hasResponded ? 'Completed' : 'Active'}
                </span>
            </div>
            <div class="student-poll-info">
                <div class="student-poll-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>${hoursRemaining}h remaining</span>
                </div>
                <div class="student-poll-info-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span>${poll.question}</span>
                </div>
            </div>
            <div class="student-poll-action">
                <button class="student-poll-btn" 
                        onclick="openTakePollModal('${poll.id}')" 
                        ${hasResponded ? 'disabled' : ''}>
                    ${hasResponded ? 'Already Responded' : 'Take Poll'}
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Initialize polls when app loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initializePolls();
        renderStudentPolls(); // Render polls for students
    }, 1500);
});


// ============================================
// ENHANCED FEATURES IMPLEMENTATION
// ============================================

// 1. TOPIC-LEVEL DRIFT DETECTION
function analyzeTopicDrift(studentId, topic) {
    const student = students.find(s => s.id === studentId);
    if (!student || !student.interactions) return null;
    
    // Filter interactions by topic
    const topicInteractions = student.interactions.filter(i => i.topic === topic);
    
    if (topicInteractions.length < 5) return null;
    
    // Calculate topic-specific baseline
    const recentTopicInteractions = topicInteractions.slice(-CONFIG.baselineWindowSize);
    const topicBaseline = calculateTopicBaseline(recentTopicInteractions);
    
    // Calculate topic drift score
    const slidingWindow = topicInteractions.slice(-CONFIG.slidingWindowSize);
    const topicDriftScore = calculateTopicDriftScore(slidingWindow, topicBaseline);
    
    return {
        topic,
        driftScore: topicDriftScore,
        interactionCount: topicInteractions.length,
        baseline: topicBaseline,
        status: topicDriftScore >= CONFIG.topicDriftThreshold ? 'at-risk' : 'healthy'
    };
}

function calculateTopicBaseline(interactions) {
    const metrics = ['accuracy', 'time_taken_seconds', 'retry_count'];
    const baseline = {};
    
    metrics.forEach(metric => {
        const values = interactions.map(i => i[metric]);
        baseline[`${metric}_mean`] = mean(values);
        baseline[`${metric}_std`] = std(values);
    });
    
    return baseline;
}

function calculateTopicDriftScore(interactions, baseline) {
    let driftScore = 0;
    let changeCount = 0;
    
    interactions.forEach(interaction => {
        // Check accuracy drop
        const zAccuracy = (interaction.accuracy - baseline.accuracy_mean) / baseline.accuracy_std;
        if (zAccuracy < -CONFIG.stdMultiplier) changeCount++;
        
        // Check time increase
        const zTime = (interaction.time_taken_seconds - baseline.time_taken_seconds_mean) / baseline.time_taken_seconds_std;
        if (zTime > CONFIG.stdMultiplier) changeCount++;
    });
    
    driftScore = changeCount / interactions.length;
    return Math.min(Math.max(driftScore, 0), 1);
}

// 2. GUESSING BEHAVIOR DETECTION
function detectGuessingBehavior(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student || !student.interactions) return null;
    
    const recentInteractions = student.interactions.slice(-10);
    if (recentInteractions.length < 5) return null;
    
    let guessingIndicators = 0;
    let totalChecks = 0;
    
    recentInteractions.forEach(interaction => {
        totalChecks++;
        
        // Indicator 1: Very fast completion with low accuracy
        if (interaction.time_taken_seconds < 30 && interaction.accuracy < 40) {
            guessingIndicators++;
        }
        
        // Indicator 2: Random accuracy pattern (high variance)
        const accuracyVariance = calculateVariance(recentInteractions.map(i => i.accuracy));
        if (accuracyVariance > 400) { // High variance suggests randomness
            guessingIndicators += 0.5;
        }
        
        // Indicator 3: Low problem-solving steps with low accuracy
        if (interaction.problem_solving_steps < 3 && interaction.accuracy < 50) {
            guessingIndicators++;
        }
    });
    
    const guessingProbability = guessingIndicators / (totalChecks * 2); // Normalize to 0-1
    
    return {
        isGuessing: guessingProbability > CONFIG.guessingThreshold,
        probability: guessingProbability,
        confidence: guessingProbability > 0.4 ? 'high' : guessingProbability > 0.25 ? 'medium' : 'low',
        indicators: Math.round(guessingIndicators)
    };
}

function calculateVariance(values) {
    const avg = mean(values);
    const squareDiffs = values.map(val => Math.pow(val - avg, 2));
    return mean(squareDiffs);
}

// 3. LEARNING SPEED ANALYSIS
function analyzeLearningSpeed(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student || !student.interactions) return null;
    
    const interactions = student.interactions;
    if (interactions.length < 10) return null;
    
    // Split into early and recent periods
    const midPoint = Math.floor(interactions.length / 2);
    const earlyPeriod = interactions.slice(0, midPoint);
    const recentPeriod = interactions.slice(midPoint);
    
    const earlyAvgTime = mean(earlyPeriod.map(i => i.time_taken_seconds));
    const recentAvgTime = mean(recentPeriod.map(i => i.time_taken_seconds));
    
    const speedChange = ((recentAvgTime - earlyAvgTime) / earlyAvgTime) * 100;
    
    let speedStatus = 'stable';
    let interpretation = 'Learning speed is consistent';
    
    if (speedChange > 30) {
        speedStatus = 'slowing';
        interpretation = 'Student is taking longer - may indicate confusion or deeper thinking';
    } else if (speedChange < -30) {
        speedStatus = 'accelerating';
        interpretation = 'Student is getting faster - may indicate mastery or shortcuts';
    }
    
    return {
        earlyAvgTime: earlyAvgTime.toFixed(1),
        recentAvgTime: recentAvgTime.toFixed(1),
        speedChange: speedChange.toFixed(1),
        status: speedStatus,
        interpretation
    };
}

// 4. EARLY WARNING SYSTEM
function generateEarlyWarning(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student || !student.interactions) return null;
    
    const recentInteractions = student.interactions.slice(-15);
    if (recentInteractions.length < 10) return null;
    
    // Calculate trend indicators
    const accuracyTrend = calculateTrend(recentInteractions.map(i => i.accuracy));
    const timeTrend = calculateTrend(recentInteractions.map(i => i.time_taken_seconds));
    const retryTrend = calculateTrend(recentInteractions.map(i => i.retry_count));
    
    // Predict risk score
    let riskScore = 0;
    
    if (accuracyTrend < -5) riskScore += 0.3; // Declining accuracy
    if (timeTrend > 20) riskScore += 0.2; // Increasing time
    if (retryTrend > 1) riskScore += 0.2; // Increasing retries
    
    // Check current performance
    const recentAvgAccuracy = mean(recentInteractions.slice(-5).map(i => i.accuracy));
    if (recentAvgAccuracy < 70) riskScore += 0.3;
    
    const isAtRisk = riskScore >= CONFIG.earlyWarningThreshold;
    
    return {
        studentId,
        studentName: student.name,
        riskScore: Math.min(riskScore, 1),
        isAtRisk,
        riskLevel: riskScore >= 0.8 ? 'high' : riskScore >= 0.6 ? 'medium' : 'low',
        indicators: {
            accuracyTrend: accuracyTrend.toFixed(1),
            timeTrend: timeTrend.toFixed(1),
            retryTrend: retryTrend.toFixed(1)
        },
        recommendation: isAtRisk ? 'Immediate intervention recommended' : 'Continue monitoring'
    };
}

function calculateTrend(values) {
    if (values.length < 2) return 0;
    
    // Simple linear regression slope
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = mean(values);
    
    let numerator = 0;
    let denominator = 0;
    
    values.forEach((y, x) => {
        numerator += (x - xMean) * (y - yMean);
        denominator += Math.pow(x - xMean, 2);
    });
    
    return denominator === 0 ? 0 : numerator / denominator;
}

// 5. PERSONALIZED LEARNING RECOMMENDATIONS
function generateLearningRecommendations(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return null;
    
    const recommendations = [];
    
    // Analyze topic performance
    const topics = ['Data Structures', 'Algorithms', 'Database', 'Web Development', 'Mathematics'];
    const weakTopics = [];
    
    topics.forEach(topic => {
        const topicDrift = analyzeTopicDrift(studentId, topic);
        if (topicDrift && topicDrift.status === 'at-risk') {
            weakTopics.push(topic);
        }
    });
    
    // Check guessing behavior
    const guessingAnalysis = detectGuessingBehavior(studentId);
    if (guessingAnalysis && guessingAnalysis.isGuessing) {
        recommendations.push({
            type: 'behavior',
            priority: 'high',
            title: 'Focus on Understanding',
            description: 'Detected guessing patterns. Take time to understand concepts before answering.',
            actions: ['Review fundamental concepts', 'Practice with guided examples', 'Ask questions when confused']
        });
    }
    
    // Check learning speed
    const speedAnalysis = analyzeLearningSpeed(studentId);
    if (speedAnalysis && speedAnalysis.status === 'slowing') {
        recommendations.push({
            type: 'pace',
            priority: 'medium',
            title: 'Learning Pace Adjustment',
            description: speedAnalysis.interpretation,
            actions: ['Break down complex problems', 'Review prerequisite topics', 'Practice similar problems']
        });
    }
    
    // Topic-specific recommendations
    weakTopics.forEach(topic => {
        recommendations.push({
            type: 'topic',
            priority: 'high',
            title: `Strengthen ${topic}`,
            description: `Performance declining in ${topic}. Focused practice recommended.`,
            actions: [
                `Review ${topic} fundamentals`,
                `Complete 5-10 practice problems`,
                `Watch tutorial videos`,
                `Attend office hours for clarification`
            ],
            resources: [
                { title: `${topic} Tutorial`, url: '#' },
                { title: `${topic} Practice Problems`, url: '#' },
                { title: `${topic} Video Lectures`, url: '#' }
            ]
        });
    });
    
    // General recommendations based on drift score
    if (student.driftScore >= CONFIG.driftThreshold) {
        recommendations.push({
            type: 'general',
            priority: 'high',
            title: 'Comprehensive Review Needed',
            description: 'Overall performance shows significant drift. Comprehensive review recommended.',
            actions: [
                'Schedule meeting with instructor',
                'Join study group',
                'Review all recent topics',
                'Complete diagnostic assessment'
            ]
        });
    }
    
    return {
        studentId,
        studentName: student.name,
        recommendationCount: recommendations.length,
        recommendations: recommendations.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        })
    };
}

// Update student analysis to include all new features
function performComprehensiveAnalysis(studentId) {
    const student = students.find(s => s.id === studentId);
    if (!student) return null;
    
    return {
        studentId,
        studentName: student.name,
        overallDriftScore: student.driftScore,
        topicAnalysis: ['Data Structures', 'Algorithms', 'Database', 'Web Development', 'Mathematics']
            .map(topic => analyzeTopicDrift(studentId, topic))
            .filter(a => a !== null),
        guessingBehavior: detectGuessingBehavior(studentId),
        learningSpeed: analyzeLearningSpeed(studentId),
        earlyWarning: generateEarlyWarning(studentId),
        recommendations: generateLearningRecommendations(studentId)
    };
}

console.log('Enhanced Drift Detection System loaded with 5 advanced features');


// ============================================
// UI RENDERING FOR ENHANCED FEATURES
// ============================================

// Setup tab switching
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('analysis-tab')) {
            const tabName = e.target.dataset.tab;
            switchAnalysisTab(tabName);
        }
    });
});

function switchAnalysisTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.analysis-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Render Topic Analysis
function renderTopicAnalysis(analysis) {
    const container = document.getElementById('topic-analysis-container');
    container.innerHTML = '';
    
    if (!analysis.topicAnalysis || analysis.topicAnalysis.length === 0) {
        container.innerHTML = '<div class="empty-analysis"><p>No topic-specific data available yet. Complete more activities to see topic analysis.</p></div>';
        return;
    }
    
    analysis.topicAnalysis.forEach(topic => {
        const card = document.createElement('div');
        card.className = `topic-card ${topic.status}`;
        
        card.innerHTML = `
            <div class="topic-card-header">
                <div class="topic-name">${topic.topic}</div>
                <div class="topic-status-badge ${topic.status}">${topic.status}</div>
            </div>
            <div class="topic-drift-score">${topic.driftScore.toFixed(2)}</div>
            <div class="topic-interactions">${topic.interactionCount} interactions</div>
        `;
        
        container.appendChild(card);
    });
}

// Render Behavior Analysis
function renderBehaviorAnalysis(analysis) {
    const container = document.getElementById('behavior-analysis-container');
    container.innerHTML = '';
    
    // Guessing Behavior Card
    const guessingCard = document.createElement('div');
    guessingCard.className = 'analysis-card';
    
    const guessing = analysis.guessingBehavior;
    const guessingIcon = guessing && guessing.isGuessing ? 'danger' : 'success';
    
    guessingCard.innerHTML = `
        <div class="analysis-card-title">
            <div class="analysis-icon ${guessingIcon}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>
            Guessing Behavior Detection
        </div>
        ${guessing ? `
            <div class="analysis-metric">
                <span class="metric-label">Status</span>
                <span class="metric-value ${guessing.isGuessing ? 'high' : 'low'}">
                    ${guessing.isGuessing ? 'Guessing Detected' : 'Normal Behavior'}
                </span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Probability</span>
                <span class="metric-value">${(guessing.probability * 100).toFixed(1)}%</span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Confidence</span>
                <span class="metric-value ${guessing.confidence}">${guessing.confidence.toUpperCase()}</span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Indicators Found</span>
                <span class="metric-value">${guessing.indicators}</span>
            </div>
        ` : '<p class="empty-analysis">Insufficient data for guessing analysis</p>'}
    `;
    
    // Early Warning Card
    const warningCard = document.createElement('div');
    warningCard.className = 'analysis-card';
    
    const warning = analysis.earlyWarning;
    const warningIcon = warning && warning.isAtRisk ? 'danger' : 'success';
    
    warningCard.innerHTML = `
        <div class="analysis-card-title">
            <div class="analysis-icon ${warningIcon}">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
            </div>
            Early Warning System
        </div>
        ${warning ? `
            <div class="analysis-metric">
                <span class="metric-label">Risk Level</span>
                <span class="metric-value ${warning.riskLevel}">${warning.riskLevel.toUpperCase()}</span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Risk Score</span>
                <span class="metric-value">${(warning.riskScore * 100).toFixed(0)}%</span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Accuracy Trend</span>
                <span class="metric-value">${warning.indicators.accuracyTrend}%</span>
            </div>
            <div class="analysis-metric">
                <span class="metric-label">Recommendation</span>
                <span class="metric-value">${warning.recommendation}</span>
            </div>
        ` : '<p class="empty-analysis">Insufficient data for early warning analysis</p>'}
    `;
    
    container.appendChild(guessingCard);
    container.appendChild(warningCard);
}

// Render Speed Analysis
function renderSpeedAnalysis(analysis) {
    const container = document.getElementById('speed-analysis-container');
    container.innerHTML = '';
    
    const speed = analysis.learningSpeed;
    
    if (!speed) {
        container.innerHTML = '<div class="empty-analysis"><p>Insufficient data for learning speed analysis. Complete more activities to see trends.</p></div>';
        return;
    }
    
    container.innerHTML = `
        <div class="speed-comparison">
            <div class="speed-metric-card">
                <div class="speed-metric-label">Early Period Avg</div>
                <div class="speed-metric-value">${speed.earlyAvgTime}<span class="speed-metric-unit">s</span></div>
            </div>
            <div class="speed-metric-card">
                <div class="speed-metric-label">Recent Period Avg</div>
                <div class="speed-metric-value">${speed.recentAvgTime}<span class="speed-metric-unit">s</span></div>
            </div>
            <div class="speed-metric-card">
                <div class="speed-metric-label">Speed Change</div>
                <div class="speed-metric-value">${speed.speedChange}<span class="speed-metric-unit">%</span></div>
            </div>
        </div>
        <div class="speed-interpretation">
            <div class="speed-interpretation-title">Interpretation</div>
            <div class="speed-interpretation-text">${speed.interpretation}</div>
        </div>
    `;
}

// Render Recommendations
function renderRecommendations(analysis) {
    const container = document.getElementById('recommendations-container');
    container.innerHTML = '';
    
    const recommendations = analysis.recommendations;
    
    if (!recommendations || recommendations.recommendationCount === 0) {
        container.innerHTML = '<div class="empty-analysis"><p>Great job! No specific recommendations at this time. Keep up the good work!</p></div>';
        return;
    }
    
    recommendations.recommendations.forEach(rec => {
        const card = document.createElement('div');
        card.className = `recommendation-card priority-${rec.priority}`;
        
        const resourcesHTML = rec.resources ? `
            <div class="recommendation-resources">
                <div class="recommendation-resources-title">Recommended Resources:</div>
                ${rec.resources.map(r => `<a href="${r.url}" class="resource-link">${r.title}</a>`).join('')}
            </div>
        ` : '';
        
        card.innerHTML = `
            <div class="recommendation-header">
                <div class="recommendation-title">${rec.title}</div>
                <div class="recommendation-priority ${rec.priority}">${rec.priority}</div>
            </div>
            <div class="recommendation-description">${rec.description}</div>
            <div class="recommendation-actions">
                <div class="recommendation-actions-title">Action Steps:</div>
                <ul class="recommendation-actions-list">
                    ${rec.actions.map(action => `<li>${action}</li>`).join('')}
                </ul>
            </div>
            ${resourcesHTML}
        `;
        
        container.appendChild(card);
    });
}

console.log('Enhanced UI rendering functions loaded');


// Render Admin Dashboard
function renderAdminDashboard() {
    // Update admin stats
    document.getElementById('admin-total-students').textContent = students.length;
    document.getElementById('admin-total-faculty').textContent = '12'; // Mock data
    document.getElementById('admin-total-tests').textContent = tests.length;
    
    // Render students list for admin
    const studentsListContainer = document.getElementById('admin-students-list');
    if (students.length === 0) {
        studentsListContainer.innerHTML = '<p class="empty-state-small">No students registered</p>';
    } else {
        studentsListContainer.innerHTML = students.map(student => `
            <div class="user-item">
                <div class="user-info">
                    <div class="user-avatar">${student.name.charAt(0).toUpperCase()}</div>
                    <div class="user-details">
                        <h4>${student.name}</h4>
                        <p>ID: ${student.id} • ${student.class || 'No class assigned'}</p>
                    </div>
                </div>
                <div class="user-actions">
                    <button class="btn-icon-small" title="Edit" onclick="editUser('${student.id}', 'student')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="btn-icon-small" title="Delete" onclick="deleteUser('${student.id}', 'student')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // Render faculty list for admin (mock data)
    const facultyListContainer = document.getElementById('admin-faculty-list');
    const mockFaculty = [
        { id: 'fac-1', name: 'Dr. John Smith', department: 'Computer Science' },
        { id: 'fac-2', name: 'Prof. Sarah Johnson', department: 'Mathematics' },
        { id: 'fac-3', name: 'Dr. Michael Brown', department: 'Physics' }
    ];
    
    facultyListContainer.innerHTML = mockFaculty.map(faculty => `
        <div class="user-item">
            <div class="user-info">
                <div class="user-avatar">${faculty.name.charAt(0).toUpperCase()}</div>
                <div class="user-details">
                    <h4>${faculty.name}</h4>
                    <p>ID: ${faculty.id} • ${faculty.department}</p>
                </div>
            </div>
            <div class="user-actions">
                <button class="btn-icon-small" title="Edit" onclick="editUser('${faculty.id}', 'faculty')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="btn-icon-small" title="Delete" onclick="deleteUser('${faculty.id}', 'faculty')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

// Show user tab (students or faculty)
function showUserTab(tab) {
    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.user-tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab
    event.target.classList.add('active');
    document.getElementById(`${tab}-tab`).classList.add('active');
}

// Open create user modal (placeholder)
function openCreateUserModal() {
    document.getElementById('create-user-modal').style.display = 'flex';
    // Reset form
    document.getElementById('create-user-form').reset();
    document.getElementById('department-field').style.display = 'none';
    document.getElementById('class-field').style.display = 'none';
}

// Close create user modal
function closeCreateUserModal() {
    document.getElementById('create-user-modal').style.display = 'none';
}

// Toggle user fields based on user type
function toggleUserFields() {
    const userType = document.getElementById('user-type').value;
    const departmentField = document.getElementById('department-field');
    const classField = document.getElementById('class-field');
    const userIdLabel = document.getElementById('user-id-label');
    const userIdInput = document.getElementById('user-id');
    const userDepartmentSelect = document.getElementById('user-department');
    const userClassInput = document.getElementById('user-class');
    
    if (userType === 'student') {
        userIdLabel.textContent = 'Student ID';
        userIdInput.placeholder = 'e.g., STU001';
        departmentField.style.display = 'none';
        classField.style.display = 'block';
        userDepartmentSelect.removeAttribute('required');
        userClassInput.setAttribute('required', 'required');
    } else if (userType === 'faculty') {
        userIdLabel.textContent = 'Faculty ID';
        userIdInput.placeholder = 'e.g., FAC001';
        departmentField.style.display = 'block';
        classField.style.display = 'none';
        userDepartmentSelect.setAttribute('required', 'required');
        userClassInput.removeAttribute('required');
    } else {
        departmentField.style.display = 'none';
        classField.style.display = 'none';
        userDepartmentSelect.removeAttribute('required');
        userClassInput.removeAttribute('required');
    }
}

// Create user
function createUser(event) {
    event.preventDefault();
    
    const userType = document.getElementById('user-type').value;
    const userName = document.getElementById('user-name').value.trim();
    const userId = document.getElementById('user-id').value.trim();
    const userEmail = document.getElementById('user-email').value.trim();
    const password = document.getElementById('user-password').value;
    const passwordConfirm = document.getElementById('user-password-confirm').value;
    
    // Validate passwords match
    if (password !== passwordConfirm) {
        alert('Passwords do not match!');
        return;
    }
    
    if (userType === 'student') {
        const userClass = document.getElementById('user-class').value.trim();
        
        // Create new student object
        const newStudent = {
            id: userId,
            name: userName,
            email: userEmail,
            class: userClass,
            accuracy: 0,
            timeSpent: 0,
            retries: 0,
            status: 'healthy',
            driftScore: 0,
            lastActivity: new Date().toISOString()
        };
        
        // Add to students array
        students.push(newStudent);
        
        // Save to localStorage
        localStorage.setItem('students', JSON.stringify(students));
        
        alert(`Student ${userName} created successfully!`);
        
    } else if (userType === 'faculty') {
        const userDepartment = document.getElementById('user-department').value;
        
        // Create new faculty object (you can store this in a faculty array)
        const newFaculty = {
            id: userId,
            name: userName,
            email: userEmail,
            department: userDepartment
        };
        
        // For now, just show success message
        // In a real app, you'd store this in a faculty array and localStorage
        alert(`Faculty ${userName} created successfully!`);
    }
    
    // Close modal and refresh admin dashboard
    closeCreateUserModal();
    
    // Refresh admin dashboard if the function exists
    if (typeof renderAdminDashboard === 'function') {
        renderAdminDashboard();
    }
}

// Edit user (placeholder)
function editUser(userId, userType) {
    if (userType === 'student') {
        const student = students.find(s => s.id === userId);
        if (student) {
            const newName = prompt(`Edit Student Name:`, student.name);
            if (newName && newName.trim()) {
                student.name = newName.trim();
                localStorage.setItem('students', JSON.stringify(students));
                renderAdminDashboard();
                alert('Student updated successfully!');
            }
        }
    } else {
        alert(`Edit ${userType}: ${userId}\nFull edit functionality coming soon.`);
    }
}

// Delete user
function deleteUser(userId, userType) {
    if (confirm(`Are you sure you want to delete this ${userType}?`)) {
        if (userType === 'student') {
            const index = students.findIndex(s => s.id === userId);
            if (index !== -1) {
                students.splice(index, 1);
                localStorage.setItem('students', JSON.stringify(students));
                renderAdminDashboard();
                alert('Student deleted successfully!');
            }
        } else {
            alert(`User ${userId} deleted.\nFull delete functionality for faculty coming soon.`);
        }
    }
}

// Open system settings (placeholder)
function openSystemSettings() {
    alert('System Settings Modal\nThis feature will allow admins to configure system-wide settings like drift thresholds, notifications, and backup schedules.');
}


// ============================================
// PROFESSIONAL ENHANCEMENTS
// ============================================

// Toast Notification System
function showToast(message, type = 'info', title = '') {
    // Create toast container if it doesn't exist
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon based on type
    const icons = {
        success: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Loading Overlay
function showLoading(message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner large"></div>
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// Password Strength Checker
function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    
    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
}

function updatePasswordStrength(inputId, strengthBarId) {
    const input = document.getElementById(inputId);
    const strengthBar = document.getElementById(strengthBarId);
    
    if (!input || !strengthBar) return;
    
    input.addEventListener('input', function() {
        const password = this.value;
        const strength = checkPasswordStrength(password);
        
        strengthBar.className = `password-strength-bar ${strength}`;
        
        const strengthText = strengthBar.nextElementSibling;
        if (strengthText) {
            const texts = {
                weak: 'Weak password',
                medium: 'Medium strength',
                strong: 'Strong password'
            };
            strengthText.textContent = password ? texts[strength] : '';
        }
    });
}

// Form Validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateField(input, validationFn, errorMessage) {
    const formField = input.closest('.form-field');
    const value = input.value.trim();
    
    if (!value) {
        formField.classList.remove('success', 'error');
        return true;
    }
    
    if (validationFn(value)) {
        formField.classList.remove('error');
        formField.classList.add('success');
        
        // Remove error message if exists
        const existingError = formField.querySelector('.field-error');
        if (existingError) existingError.remove();
        
        return true;
    } else {
        formField.classList.remove('success');
        formField.classList.add('error');
        
        // Add error message if doesn't exist
        let errorDiv = formField.querySelector('.field-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15" stroke="white" stroke-width="2"/><line x1="9" y1="9" x2="15" y2="15" stroke="white" stroke-width="2"/></svg> ${errorMessage}`;
            input.parentElement.appendChild(errorDiv);
        }
        
        return false;
    }
}

// Confirmation Dialog
function showConfirmDialog(title, message, onConfirm, onCancel) {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
        <div class="confirm-dialog-content">
            <h3 class="confirm-dialog-title">${title}</h3>
            <p class="confirm-dialog-message">${message}</p>
            <div class="confirm-dialog-actions">
                <button class="btn btn-secondary" onclick="this.closest('.confirm-dialog').remove(); ${onCancel ? 'onCancel()' : ''}">Cancel</button>
                <button class="btn btn-primary" onclick="this.closest('.confirm-dialog').remove(); (${onConfirm})()">Confirm</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
}

// Enhanced User Creation with Validation
const originalCreateUser = createUser;
createUser = function(event) {
    event.preventDefault();
    
    // Validate all fields
    const userType = document.getElementById('user-type').value;
    const userName = document.getElementById('user-name').value.trim();
    const userId = document.getElementById('user-id').value.trim();
    const userEmail = document.getElementById('user-email').value.trim();
    const password = document.getElementById('user-password').value;
    const passwordConfirm = document.getElementById('user-password-confirm').value;
    
    // Email validation
    if (!validateEmail(userEmail)) {
        showToast('Please enter a valid email address', 'error', 'Invalid Email');
        return;
    }
    
    // Password validation
    if (password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error', 'Weak Password');
        return;
    }
    
    if (password !== passwordConfirm) {
        showToast('Passwords do not match!', 'error', 'Password Mismatch');
        return;
    }
    
    // Check for duplicate user ID
    if (userType === 'student') {
        const existingStudent = students.find(s => s.id === userId);
        if (existingStudent) {
            showToast('A student with this ID already exists', 'error', 'Duplicate ID');
            return;
        }
    }
    
    // Show loading
    showLoading('Creating user...');
    
    // Simulate async operation
    setTimeout(() => {
        try {
            if (userType === 'student') {
                const userClass = document.getElementById('user-class').value.trim();
                
                const newStudent = {
                    id: userId,
                    name: userName,
                    email: userEmail,
                    class: userClass,
                    accuracy: 0,
                    timeSpent: 0,
                    retries: 0,
                    status: 'healthy',
                    driftScore: 0,
                    lastActivity: new Date().toISOString()
                };
                
                students.push(newStudent);
                localStorage.setItem('students', JSON.stringify(students));
                
                showToast(`Student ${userName} has been created successfully!`, 'success', 'User Created');
                
            } else if (userType === 'faculty') {
                const userDepartment = document.getElementById('user-department').value;
                
                showToast(`Faculty ${userName} has been created successfully!`, 'success', 'User Created');
            }
            
            closeCreateUserModal();
            
            if (typeof renderAdminDashboard === 'function') {
                renderAdminDashboard();
            }
        } catch (error) {
            showToast('An error occurred while creating the user', 'error', 'Error');
        } finally {
            hideLoading();
        }
    }, 1000);
};

// Enhanced Delete with Confirmation
const originalDeleteUser = deleteUser;
deleteUser = function(userId, userType) {
    const student = students.find(s => s.id === userId);
    const userName = student ? student.name : userId;
    
    showConfirmDialog(
        'Delete User',
        `Are you sure you want to delete ${userName}? This action cannot be undone.`,
        function() {
            if (userType === 'student') {
                const index = students.findIndex(s => s.id === userId);
                if (index !== -1) {
                    students.splice(index, 1);
                    localStorage.setItem('students', JSON.stringify(students));
                    renderAdminDashboard();
                    showToast(`${userName} has been deleted successfully`, 'success', 'User Deleted');
                }
            }
        }
    );
};

// Initialize professional features on page load
document.addEventListener('DOMContentLoaded', function() {
    // Add password strength indicators to password fields
    const passwordFields = document.querySelectorAll('input[type="password"]');
    passwordFields.forEach(field => {
        if (field.id && field.id.includes('password') && !field.id.includes('confirm')) {
            const strengthBar = document.createElement('div');
            strengthBar.className = 'password-strength';
            strengthBar.innerHTML = '<div class="password-strength-bar"></div><div class="password-strength-text"></div>';
            field.parentElement.appendChild(strengthBar);
            
            field.addEventListener('input', function() {
                const password = this.value;
                const strength = checkPasswordStrength(password);
                const bar = strengthBar.querySelector('.password-strength-bar');
                const text = strengthBar.querySelector('.password-strength-text');
                
                bar.className = `password-strength-bar ${strength}`;
                
                const texts = {
                    weak: 'Weak password',
                    medium: 'Medium strength',
                    strong: 'Strong password'
                };
                text.textContent = password ? texts[strength] : '';
            });
        }
    });
    
    console.log('Professional features initialized');
});

// ---- Activity Heatmap Generator ----
function generateActivityHeatmap() {
    const container = document.getElementById('activity-heatmap');
    if (!container) return;
    container.innerHTML = '';
    const levels = [0,1,2,3,4];
    for (let i = 0; i < 35; i++) {
        const cell = document.createElement('div');
        cell.className = 'hm-cell';
        // Weighted random: more 0s and 1s, fewer 4s
        const rand = Math.random();
        let level = 0;
        if (rand > 0.55) level = 1;
        if (rand > 0.72) level = 2;
        if (rand > 0.85) level = 3;
        if (rand > 0.94) level = 4;
        cell.classList.add('hm-level-' + level);
        cell.title = `Activity level: ${level}`;
        container.appendChild(cell);
    }
}
