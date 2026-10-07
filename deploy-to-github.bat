@echo off
echo ========================================
echo GitHub Deployment Script
echo ========================================
echo.

REM Check if Git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed!
    echo Please install Git from: https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

echo Git is installed. Proceeding...
echo.

REM Get repository name from user
set /p REPO_NAME="Enter repository name (default: student-learning-analytics-platform): "
if "%REPO_NAME%"=="" set REPO_NAME=student-learning-analytics-platform

echo.
echo Repository name: %REPO_NAME%
echo.

REM Initialize git repository
echo [1/6] Initializing Git repository...
git init
if errorlevel 1 (
    echo ERROR: Failed to initialize Git repository
    pause
    exit /b 1
)

REM Add files
echo [2/6] Adding files to Git...
git add index.html app.js styles.css enhanced-features.css student-studying.jpg education-hero.svg LOGIN_CREDENTIALS.md IMPLEMENTATION_SUMMARY.md WEBSITE_FEATURES.md README_GITHUB.md
if errorlevel 1 (
    echo ERROR: Failed to add files
    pause
    exit /b 1
)

REM Commit
echo [3/6] Creating commit...
git commit -m "Initial commit - Student Learning Analytics Platform"
if errorlevel 1 (
    echo ERROR: Failed to create commit
    pause
    exit /b 1
)

REM Rename branch to main
echo [4/6] Renaming branch to main...
git branch -M main

REM Add remote
echo [5/6] Adding GitHub remote...
git remote add origin https://github.com/thirumalasettyharshinipriya-crypto/%REPO_NAME%.git
if errorlevel 1 (
    echo WARNING: Remote might already exist, continuing...
    git remote set-url origin https://github.com/thirumalasettyharshinipriya-crypto/%REPO_NAME%.git
)

REM Push to GitHub
echo [6/6] Pushing to GitHub...
echo.
echo IMPORTANT: You will be asked to login to GitHub
echo Please enter your GitHub credentials when prompted
echo.
pause
git push -u origin main
if errorlevel 1 (
    echo.
    echo ERROR: Failed to push to GitHub
    echo.
    echo Possible reasons:
    echo 1. Repository doesn't exist yet - Create it first at: https://github.com/new
    echo 2. Authentication failed - Check your credentials
    echo 3. Network issues - Check your internet connection
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Deployment Complete!
echo ========================================
echo.
echo Your code has been pushed to GitHub!
echo.
echo Next steps:
echo 1. Go to: https://github.com/thirumalasettyharshinipriya-crypto/%REPO_NAME%
echo 2. Click "Settings" ^> "Pages"
echo 3. Under "Source", select "main" branch and "/" root
echo 4. Click "Save"
echo 5. Wait 2-3 minutes
echo 6. Visit: https://thirumalasettyharshinipriya-crypto.github.io/%REPO_NAME%/
echo.
echo ========================================
pause
