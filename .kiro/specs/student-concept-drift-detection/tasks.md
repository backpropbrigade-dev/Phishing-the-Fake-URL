# Implementation Plan: Student Concept Drift Detection System

## Overview

This plan implements a real-time analytics platform that monitors student learning behavior to identify conceptual decline. The system uses Python/FastAPI for backend services, PostgreSQL for data storage, RabbitMQ for event-driven communication, and React/TypeScript for the frontend dashboard. Implementation follows a microservices architecture with incremental validation at each stage.

## Tasks

- [ ] 1. Set up project structure and core infrastructure
  - Create directory structure for microservices architecture
  - Set up Python virtual environment and install core dependencies (FastAPI, Pydantic, SQLAlchemy, asyncpg)
  - Configure PostgreSQL database connection and create initial migration setup
  - Set up RabbitMQ connection utilities and message publishing/consuming base classes
  - Create shared configuration management module with environment variable loading
  - Set up logging infrastructure with structured logging (JSON format)
  - _Requirements: All requirements depend on this foundation_

- [ ]* 1.1 Set up testing framework
  - Install pytest, pytest-asyncio, Hypothesis for property-based testing
  - Create test configuration with deterministic seeds
  - Set up test database fixtures and cleanup utilities
  - _Requirements: Testing infrastructure for all subsequent tasks_

- [ ] 2. Implement data models and database schema
  - [ ] 2.1 Create Pydantic domain models
    - Implement Interaction, BaselinePattern, BehavioralChange, DriftScore models with validation
    - Implement Alert, Feedback, Configuration models with enums and constraints
    - Add validators for timestamp UTC enforcement, range constraints, and weight summation
    - _Requirements: 1.1-1.7, 2.1-2.6, 3.1-3.6, 4.1-4.7_

  - [ ]* 2.2 Write property test for domain models
    - **Property 1: Interaction Data Completeness**
    - **Property 28: Data Encryption Round-Trip**
    - **Validates: Requirements 1.1-1.7, 10.1**

  - [ ] 2.3 Create database schema and migrations
    - Write SQL schema for all tables (interactions, baselines, behavioral_changes, drift_scores, alerts, feedback, configurations, audit_logs)
    - Add indexes for performance (student_id + timestamp, status + priority)
    - Implement Alembic migrations for schema versioning
    - _Requirements: 1.1-1.7, 2.1-2.6, 4.7, 10.5, 10.6_

  - [ ]* 2.4 Write unit tests for database operations
    - Test CRUD operations for each table
    - Test constraint violations and error handling
    - Test index usage with EXPLAIN queries
    - _Requirements: 1.1-1.7_

- [ ] 3. Implement encryption and security layer
  - [ ] 3.1 Create encryption service
    - Implement AES-256-GCM encryption/decryption functions
    - Add key management with versioning support
    - Create utilities for encrypting student_id and activity_id fields
    - _Requirements: 10.1_

  - [ ]* 3.2 Write property test for encryption
    - **Property 28: Data Encryption Round-Trip**
    - **Validates: Requirements 10.1**

  - [ ] 3.3 Implement authorization service
    - Integrate Casbin for policy-based access control
    - Create authorization policies for instructor-student relationships
    - Implement permission checking utilities (can_view_alerts, can_view_reports)
    - _Requirements: 10.2, 10.3_

  - [ ]* 3.4 Write unit tests for authorization
    - Test instructor can access only their students
    - Test admin can access all students
    - Test unauthorized access is rejected
    - _Requirements: 10.2, 10.3_

  - [ ] 3.5 Implement audit logging
    - Create audit log writer with user_id, action, resource tracking
    - Add middleware to automatically log all data access operations
    - _Requirements: 10.5_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Data Ingestion Service
  - [ ] 5.1 Create FastAPI application for ingestion
    - Set up FastAPI app with CORS, error handlers, and health check endpoint
    - Implement POST /api/v1/interactions endpoint with Pydantic validation
    - Implement GET /api/v1/interactions/{student_id} endpoint with pagination
    - Add rate limiting middleware (100 req/min per student)
    - _Requirements: 1.1-1.7_

  - [ ] 5.2 Implement interaction storage logic
    - Encrypt student_id and activity_id before database insertion
    - Store interaction in PostgreSQL interactions table
    - Publish interaction.created event to RabbitMQ
    - Add error handling for database failures with retry logic
    - _Requirements: 1.1-1.7, 10.1_

  - [ ]* 5.3 Write property test for ingestion
    - **Property 1: Interaction Data Completeness**
    - **Validates: Requirements 1.1-1.7**

  - [ ]* 5.4 Write unit tests for ingestion service
    - Test valid interaction submission returns 201
    - Test invalid data returns 400 with error details
    - Test rate limiting returns 429
    - Test event publishing to RabbitMQ
    - _Requirements: 1.1-1.7_

- [ ] 6. Implement baseline calculation logic
  - [ ] 6.1 Create baseline calculator module
    - Implement calculate_baseline function with rolling window (default 20 activities)
    - Calculate mean and standard deviation for all four metrics
    - Handle insufficient data case (< 5 interactions)
    - Store baseline in PostgreSQL baselines table with upsert logic
    - _Requirements: 2.1-2.6, 9.1_

  - [ ]* 6.2 Write property tests for baseline calculation
    - **Property 2: Baseline Calculation Threshold**
    - **Property 3: Baseline Statistical Completeness**
    - **Property 4: Baseline Rolling Window Update**
    - **Validates: Requirements 2.1-2.6, 9.1**

  - [ ]* 6.3 Write unit tests for baseline calculator
    - Test baseline with exactly 5 interactions
    - Test baseline with 20+ interactions uses only recent 20
    - Test baseline returns None for < 5 interactions
    - Test standard deviation calculation correctness
    - _Requirements: 2.1-2.6, 9.1_

- [ ] 7. Implement behavioral change detection
  - [ ] 7.1 Create behavioral change detector module
    - Implement detect_behavioral_changes function using z-score method
    - Check accuracy decrease, time increase, retry increase, steps decrease
    - Use configurable std_multiplier (default 2.0)
    - Store detected changes in behavioral_changes table
    - _Requirements: 3.1-3.6_

  - [ ]* 7.2 Write property tests for behavioral change detection
    - **Property 5: Behavioral Change Detection Invocation**
    - **Property 6: Z-Score Threshold Detection**
    - **Property 7: Behavioral Change Sliding Window**
    - **Validates: Requirements 3.1-3.6**

  - [ ]* 7.3 Write unit tests for behavioral change detector
    - Test change flagged at exactly 2.0 standard deviations
    - Test no change flagged at 1.9 standard deviations
    - Test all four metrics independently
    - Test zero standard deviation edge case
    - _Requirements: 3.1-3.6_

- [ ] 8. Implement drift score calculation
  - [ ] 8.1 Create drift score calculator module
    - Implement calculate_drift_score function with sliding window (default 10 activities)
    - Apply metric weights (accuracy 40%, time 25%, retry 20%, steps 15%)
    - Ensure score is clamped to [0.0, 1.0]
    - Store drift score with metric contributions in drift_scores table
    - _Requirements: 4.1-4.7, 8.4_

  - [ ]* 8.2 Write property tests for drift score calculation
    - **Property 8: Drift Score Range Constraint**
    - **Property 9: Drift Score Monotonicity**
    - **Property 10: Metric Weight Application**
    - **Property 11: Drift Score Persistence**
    - **Validates: Requirements 4.1-4.7, 8.4**

  - [ ]* 8.3 Write unit tests for drift score calculator
    - Test score with all metrics flagged equals 1.0
    - Test score with no changes equals 0.0
    - Test metric weight contributions sum correctly
    - Test insufficient data returns 0.0
    - _Requirements: 4.1-4.7_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement Drift Analysis Service
  - [ ] 10.1 Create FastAPI application for analysis
    - Set up FastAPI app with RabbitMQ consumer for interaction.created events
    - Implement event handler that triggers analysis pipeline
    - Add background job scheduler for baseline recalculation (every 6 hours)
    - _Requirements: 2.6, 3.1, 4.1_

  - [ ] 10.2 Implement analysis pipeline
    - On interaction.created event: fetch/update baseline, detect changes, calculate drift score
    - Publish drift.score_calculated event with score data
    - Publish drift.threshold_exceeded event if score > threshold
    - Add error handling with dead-letter queue for failed processing
    - _Requirements: 2.1-2.6, 3.1-3.6, 4.1-4.7_

  - [ ]* 10.3 Write integration tests for analysis service
    - Test end-to-end: interaction event → drift score calculated
    - Test threshold exceeded triggers alert event
    - Test insufficient data skips drift calculation
    - _Requirements: 2.1-4.7_

- [ ] 11. Implement Alert Manager Service
  - [ ] 11.1 Create alert generation logic
    - Implement create_alert function that consumes drift.threshold_exceeded events
    - Extract concern metrics (high severity behavioral changes)
    - Calculate priority (critical ≥0.85, high ≥0.75, medium otherwise)
    - Store alert in alerts table with pending status
    - _Requirements: 5.1-5.6_

  - [ ] 11.2 Implement alert authorization and delivery
    - Query authorized instructors using Casbin policies
    - Publish notification events to RabbitMQ for each authorized instructor
    - Implement retry logic with 5-minute delivery SLA
    - _Requirements: 5.7, 10.2_

  - [ ] 11.3 Create alert management API endpoints
    - Implement GET /api/v1/alerts with filtering by status and priority
    - Implement PATCH /api/v1/alerts/{alert_id} for acknowledgment
    - Add authorization checks to ensure instructors see only their students
    - _Requirements: 5.1-5.7, 10.2_

  - [ ]* 11.4 Write property tests for alert manager
    - **Property 12: Alert Generation Threshold**
    - **Property 13: Alert Data Completeness**
    - **Property 14: Alert Prioritization**
    - **Property 15: Alert Delivery Timeliness**
    - **Property 29: Alert Authorization**
    - **Validates: Requirements 5.1-5.7, 10.2**

  - [ ]* 11.5 Write unit tests for alert manager
    - Test alert created at exactly threshold (0.7)
    - Test no alert created below threshold
    - Test priority assignment for different scores
    - Test unauthorized instructor cannot access alert
    - _Requirements: 5.1-5.7, 10.2_

- [ ] 12. Implement Feedback Generator Service
  - [ ] 12.1 Create feedback generation logic
    - Implement generate_feedback function that consumes drift.score_calculated events (threshold 0.5)
    - Implement identify_skill_gaps function based on behavioral changes
    - Implement recommend_resources function with resource mapping
    - Implement suggest_practice_activities function
    - _Requirements: 6.1-6.4_

  - [ ] 12.2 Implement feedback message composition
    - Create compose_feedback_message function with positive framing templates
    - Ensure no negative keywords (failing, struggling, poor, bad, inadequate)
    - Randomize template selection for variety
    - Store feedback in feedback table
    - _Requirements: 6.5_

  - [ ] 12.3 Implement feedback delivery
    - Publish notification events to RabbitMQ for students
    - Implement retry logic with 10-minute delivery SLA
    - Create GET /api/v1/feedback/{student_id} endpoint
    - _Requirements: 6.6_

  - [ ]* 12.4 Write property tests for feedback generator
    - **Property 16: Feedback Generation Threshold**
    - **Property 17: Feedback Content Completeness**
    - **Property 18: Feedback Positive Framing**
    - **Property 19: Feedback Delivery Timeliness**
    - **Validates: Requirements 6.1-6.6**

  - [ ]* 12.5 Write unit tests for feedback generator
    - Test feedback created at score 0.5
    - Test no feedback created at score 0.49
    - Test message contains no negative keywords
    - Test all required fields present
    - _Requirements: 6.1-6.6_

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Implement Configuration Service
  - [ ] 14.1 Create configuration management logic
    - Implement configuration CRUD operations with validation
    - Validate drift_threshold ∈ [0.1, 0.9], std_multiplier ∈ [1.5, 3.0], sliding_window_size ∈ [5, 30]
    - Validate metric weights sum to 1.0 with floating point tolerance
    - Store configurations in configurations table with versioning
    - _Requirements: 8.1-8.4, 8.6_

  - [ ] 14.2 Create configuration API endpoints
    - Implement GET /api/v1/config for retrieving current configuration
    - Implement PUT /api/v1/config for updating configuration (admin only)
    - Implement GET /api/v1/config/courses/{course_id} for course-specific overrides
    - _Requirements: 8.1-8.6_

  - [ ] 14.3 Implement configuration propagation
    - Publish config.updated event to RabbitMQ on configuration save
    - Implement configuration reload in all services (consume config.updated events)
    - Ensure propagation within 1 minute using timestamps
    - _Requirements: 8.5_

  - [ ]* 14.4 Write property tests for configuration service
    - **Property 24: Configuration Range Validation**
    - **Property 25: Configuration Propagation Timeliness**
    - **Validates: Requirements 8.1-8.6**

  - [ ]* 14.5 Write unit tests for configuration service
    - Test boundary values accepted (0.1, 0.9 for threshold)
    - Test out-of-range values rejected
    - Test weights summing to 0.99 accepted (tolerance)
    - Test weights summing to 0.95 rejected
    - _Requirements: 8.1-8.6_

- [ ] 15. Implement inactivity detection and data lifecycle
  - [ ] 15.1 Create inactivity detection logic
    - Implement background job to flag students inactive after 14 days
    - Implement baseline recalculation for returning students (60-day window)
    - _Requirements: 9.3, 9.5_

  - [ ] 15.2 Implement data deletion and retention
    - Implement DELETE /api/v1/students/{student_id}/data endpoint
    - Create background job to delete all student data within 24 hours of request
    - Implement automatic deletion of data older than 2 years (730 days)
    - _Requirements: 10.4, 10.6_

  - [ ]* 15.3 Write property tests for data lifecycle
    - **Property 26: Inactivity Detection**
    - **Property 27: Baseline Recalculation After Inactivity**
    - **Property 31: Data Deletion Timeliness**
    - **Property 33: Data Retention Policy**
    - **Validates: Requirements 9.3, 9.5, 10.4, 10.6**

  - [ ]* 15.4 Write unit tests for data lifecycle
    - Test student flagged inactive at exactly 14 days
    - Test baseline uses 60-day window after inactivity
    - Test all related data deleted on request
    - _Requirements: 9.3, 9.5, 10.4, 10.6_

- [ ] 16. Implement Reporting Service
  - [ ] 16.1 Create report data query functions
    - Implement query for drift timeline (30-day time series)
    - Implement query for metric breakdown (current contributions)
    - Implement query for baseline comparison (current vs baseline)
    - Implement query for class dashboard (all students in class)
    - Add PostgreSQL indexes optimization and Redis caching (5-minute TTL)
    - _Requirements: 7.1-7.5_

  - [ ] 16.2 Create reporting API endpoints
    - Implement GET /api/v1/reports/student/{student_id}/drift-timeline
    - Implement GET /api/v1/reports/student/{student_id}/metric-breakdown
    - Implement GET /api/v1/reports/student/{student_id}/baseline-comparison
    - Implement GET /api/v1/reports/class/{class_id}/dashboard with pagination
    - Add authorization checks for all endpoints
    - _Requirements: 7.1-7.5, 10.3_

  - [ ] 16.3 Implement color coding and insufficient data handling
    - Add color coding logic (green <0.3, yellow 0.3-0.7, red >0.7)
    - Return "insufficient data" message when student has < 5 interactions
    - _Requirements: 7.6, 9.2_

  - [ ]* 16.4 Write property tests for reporting service
    - **Property 20: Report Data Completeness**
    - **Property 21: Class Dashboard Completeness**
    - **Property 22: Color Coding Consistency**
    - **Property 23: Report Rendering Performance**
    - **Property 30: Report Authorization**
    - **Validates: Requirements 7.1-7.7, 9.2, 10.3**

  - [ ]* 16.5 Write unit tests for reporting service
    - Test timeline includes all data points for period
    - Test metric breakdown sums to drift score
    - Test color coding at boundary values (0.3, 0.7)
    - Test unauthorized user cannot access report
    - Test insufficient data message displayed
    - _Requirements: 7.1-7.7, 9.2, 10.3_

- [ ] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Implement Notification Service
  - [ ] 18.1 Create notification dispatcher
    - Implement RabbitMQ consumer for notification events
    - Create email notification sender using SMTP
    - Create in-app notification storage in database
    - Implement retry logic with exponential backoff
    - _Requirements: 5.7, 6.6_

  - [ ]* 18.2 Write integration tests for notification service
    - Test alert notification delivered to instructor
    - Test feedback notification delivered to student
    - Test retry on failure
    - _Requirements: 5.7, 6.6_

- [ ] 19. Implement API Gateway
  - [ ] 19.1 Create unified API gateway
    - Set up FastAPI application as single entry point
    - Configure CORS for frontend access
    - Add authentication middleware (OAuth 2.0 / OpenID Connect integration)
    - Add request logging and tracing (request_id generation)
    - Route requests to appropriate backend services
    - _Requirements: All API requirements_

  - [ ] 19.2 Implement health check and monitoring endpoints
    - Create GET /health endpoint with service status checks
    - Create GET /metrics endpoint for Prometheus scraping
    - Add circuit breaker status exposure
    - _Requirements: System reliability_

  - [ ]* 19.3 Write integration tests for API gateway
    - Test authentication required for protected endpoints
    - Test CORS headers present
    - Test request routing to services
    - _Requirements: All API requirements_

- [ ] 20. Implement frontend dashboard (Vanilla JavaScript with modern UI)
  - [ ] 20.1 Integrate with existing website structure
    - Extend current index.html with drift detection views
    - Reuse existing styles.css and enhanced-features.css
    - Extend app.js with drift detection functionality
    - Maintain existing login system and role-based access
    - _Requirements: 7.1-7.7, 11.1-11.7, 12.1-12.7, 13.1-13.5, 14.1-14.5_

  - [ ] 20.2 Implement student drift timeline view
    - Create DriftTimelineChart using Chart.js (already integrated)
    - Fetch data from /api/v1/reports/student/{student_id}/drift-timeline
    - Display 30-day time series with color zones (green/yellow/red)
    - Highlight behavioral change markers
    - Handle insufficient data state
    - Add to student dashboard view
    - _Requirements: 7.1, 7.4, 7.6, 9.2_

  - [ ] 20.3 Implement metric breakdown view
    - Create MetricBreakdownChart component (pie or bar chart using Chart.js)
    - Fetch data from /api/v1/reports/student/{student_id}/metric-breakdown
    - Display contribution percentages for each metric
    - Show current drift score prominently
    - Add to student dashboard
    - _Requirements: 7.2, 7.6_

  - [ ] 20.4 Implement baseline comparison view
    - Create BaselineComparisonChart using Chart.js
    - Fetch data from /api/v1/reports/student/{student_id}/baseline-comparison
    - Display current performance vs baseline for all metrics
    - Use visual indicators for deviations
    - Add to student dashboard
    - _Requirements: 7.3_

  - [ ] 20.5 Implement class dashboard view for faculty
    - Create ClassDashboard section in faculty view
    - Fetch data from /api/v1/reports/class/{class_id}/dashboard
    - Display all students with drift scores and color coding
    - Implement sorting by drift score (highest first)
    - Add pagination for large classes
    - Reuse existing card-based layout style
    - _Requirements: 7.5, 7.6_

  - [ ] 20.6 Implement instructor alerts view
    - Create AlertsList section in faculty dashboard
    - Fetch data from GET /api/v1/alerts
    - Display alerts sorted by priority and drift score
    - Implement alert acknowledgment (PATCH /api/v1/alerts/{alert_id})
    - Add filtering by status and priority
    - Use existing toast notification system
    - _Requirements: 5.1-5.7_

  - [ ] 20.7 Implement student feedback view
    - Create FeedbackView section in student dashboard
    - Fetch data from GET /api/v1/feedback/{student_id}
    - Display feedback message with encouraging tone
    - Show skill gaps and recommended resources
    - Display practice activity suggestions
    - Use existing card design
    - _Requirements: 6.1-6.6_

  - [ ] 20.8 Implement admin configuration view
    - Create ConfigurationPanel in admin dashboard
    - Fetch data from GET /api/v1/config
    - Create form for updating configuration with validation
    - Submit updates to PUT /api/v1/config
    - Display validation errors for out-of-range values
    - Reuse existing form styling
    - _Requirements: 8.1-8.6_

  - [ ]* 20.9 Write frontend tests
    - Test charts render with valid data
    - Test insufficient data message displayed
    - Test color coding applied correctly
    - Test alert acknowledgment updates UI
    - Test configuration validation
    - _Requirements: 7.1-7.7, 8.1-8.6_

- [ ] 21. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Implement error handling and resilience
  - [ ] 22.1 Add circuit breakers for external dependencies
    - Implement circuit breaker for database connections (5 failures, 30s open)
    - Implement circuit breaker for RabbitMQ connections
    - Implement circuit breaker for notification service
    - _Requirements: System reliability_

  - [ ] 22.2 Implement comprehensive error handling
    - Add error handlers for all API endpoints with consistent JSON format
    - Implement dead-letter queue processing for failed messages
    - Add timeout handling for long-running operations
    - Create error response format with request_id and timestamp
    - _Requirements: All requirements (error scenarios)_

  - [ ]* 22.3 Write error handling tests
    - Test 400 Bad Request for invalid input
    - Test 403 Forbidden for unauthorized access
    - Test 429 Too Many Requests for rate limiting
    - Test 503 Service Unavailable for circuit breaker open
    - Test dead-letter queue processing
    - _Requirements: All requirements (error scenarios)_

- [ ] 23. Implement monitoring and observability
  - [ ] 23.1 Set up Prometheus metrics
    - Add metrics for request counts, latencies, error rates
    - Add metrics for drift score calculations, alert generations
    - Add metrics for queue depths and processing times
    - Expose metrics at /metrics endpoint
    - _Requirements: System observability_

  - [ ] 23.2 Set up structured logging
    - Configure JSON logging with correlation IDs
    - Add log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    - Implement audit logging for all data access
    - _Requirements: 10.5_

  - [ ]* 23.3 Write monitoring tests
    - Test metrics incremented correctly
    - Test audit logs created for data access
    - Test correlation IDs propagated through services
    - _Requirements: 10.5_

- [ ] 24. Create deployment configuration
  - [ ] 24.1 Create Docker containers
    - Write Dockerfile for each service (ingestion, analysis, alert, feedback, reporting, config, notification, gateway)
    - Create docker-compose.yml for local development
    - Configure environment variables and secrets management
    - _Requirements: Deployment_

  - [ ] 24.2 Create Kubernetes manifests
    - Write Deployment manifests for each service with resource limits
    - Write Service manifests for internal communication
    - Write StatefulSet manifests for PostgreSQL, Redis, RabbitMQ
    - Write Ingress manifest for external access
    - Configure horizontal pod autoscaling
    - _Requirements: Deployment_

  - [ ] 24.3 Create CI/CD pipeline configuration
    - Write GitHub Actions / GitLab CI configuration
    - Add stages: lint, test, build, deploy
    - Configure automated testing on pull requests
    - Configure blue-green deployment to production
    - _Requirements: Deployment_

- [ ] 25. Final integration and end-to-end testing
  - [ ]* 25.1 Write end-to-end tests
    - Test complete flow: submit interaction → drift detected → alert delivered → instructor views dashboard
    - Test complete flow: drift detected → feedback generated → student views feedback
    - Test configuration change propagates to all services
    - Test data deletion removes all student data
    - _Requirements: All requirements_

  - [ ] 25.2 Perform load and performance testing
    - Test 1000 concurrent interactions processed within SLA
    - Test report generation under high load completes within 3 seconds
    - Test 24-hour soak test for memory leaks
    - _Requirements: 5.7, 6.6, 7.7_

  - [ ] 25.3 Perform security testing
    - Test encrypted data is not human-readable in database
    - Test unauthorized access attempts are logged and rejected
    - Test SQL injection and XSS vulnerabilities
    - _Requirements: 10.1-10.6_

- [ ] 26. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests validate service boundaries and end-to-end flows
- The system uses Python/FastAPI for backend, React/TypeScript for frontend
- Microservices architecture with event-driven communication via RabbitMQ
- PostgreSQL for data storage, Redis for caching
- All services are containerized and deployed on Kubernetes
