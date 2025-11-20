#!/bin/bash

# Start GraphFusionVulDetect services

echo "Starting GraphFusionVulDetect services..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Virtual environment not found. Please create one first."
    exit 1
fi

# Function to cleanup background processes
cleanup() {
    echo "Stopping services..."
    kill $API_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

# Start the API server
echo "Starting API server on http://0.0.0.0:8000..."
source .venv/bin/activate
python -m src.api.app &
API_PID=$!

# Give the API time to start
sleep 5

# Start the React frontend
echo "Starting React frontend on http://localhost:8080..."
cd web_react
npm run dev &
FRONTEND_PID=$!

echo "Services started!"
echo "API: http://0.0.0.0:8000"
echo "Frontend: http://localhost:8080"
echo "API Docs: http://0.0.0.0:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for processes
wait
