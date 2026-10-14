@echo off
echo Installing backend dependencies...
python -m pip install --upgrade pip
python -m pip install fastapi uvicorn pydantic numpy python-multipart
echo.
echo Installation complete!
echo.
echo To start the backend server, run: start_backend.bat
pause
