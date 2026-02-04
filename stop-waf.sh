#!/bin/bash

# Web Hydra - Stop All Services

echo "Stopping Web Hydra services..."

# Stop services by their identifying patterns
pkill -f "uvicorn.*proxy.*app:app" 2>/dev/null && echo "✓ WAF Proxy stopped" || echo "• WAF Proxy not running"
pkill -f "uvicorn.*ml_service.*app:app" 2>/dev/null && echo "✓ ML Service stopped" || echo "• ML Service not running"
pkill -f "python.*HYDRA_Website/backend/app.py" 2>/dev/null && echo "✓ TI Backend stopped" || echo "• TI Backend not running"
pkill -f "python.*-m http.server 3000" 2>/dev/null && echo "✓ Frontend Server stopped" || echo "• Frontend Server not running"

echo ""
echo "All services stopped."
