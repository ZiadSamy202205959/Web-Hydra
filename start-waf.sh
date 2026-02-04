#!/bin/bash

# Web Hydra - Unified Startup Script
# Starts all services needed for the HYDRA Website dashboard

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    Web Hydra - WAF Dashboard                    ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local port=$1
    local name=$2
    local max_wait=30
    local count=0
    
    while ! check_port $port; do
        sleep 1
        count=$((count + 1))
        if [ $count -ge $max_wait ]; then
            echo -e "${RED}✗ $name failed to start on port $port${NC}"
            return 1
        fi
    done
    echo -e "${GREEN}✓ $name is running on port $port${NC}"
    return 0
}

# Kill existing services if requested
if [ "$1" == "--restart" ]; then
    echo -e "${YELLOW}Stopping existing services...${NC}"
    pkill -f "uvicorn.*proxy.*app:app" 2>/dev/null || true
    pkill -f "uvicorn.*ml_service.*app:app" 2>/dev/null || true
    pkill -f "python.*HYDRA_Website/backend/app.py" 2>/dev/null || true
    pkill -f "python.*-m http.server 3000" 2>/dev/null || true
    sleep 2
fi

echo ""
echo -e "${YELLOW}Starting services...${NC}"
echo ""

# 1. Start ML Service (port 9000)
if check_port 9000; then
    echo -e "${GREEN}✓ ML Service already running on port 9000${NC}"
else
    echo -e "${BLUE}→ Starting ML Service on port 9000...${NC}"
    cd "$SCRIPT_DIR/ml_service"
    if [ -d ".venv" ]; then
        source .venv/bin/activate
    fi
    nohup python -m uvicorn app:app --host 0.0.0.0 --port 9000 > ml_svc.log 2>&1 &
    cd "$SCRIPT_DIR"
    wait_for_service 9000 "ML Service"
fi

# 2. Start WAF Proxy (port 8080)
if check_port 8080; then
    echo -e "${GREEN}✓ WAF Proxy already running on port 8080${NC}"
else
    echo -e "${BLUE}→ Starting WAF Proxy on port 8080...${NC}"
    cd "$SCRIPT_DIR/proxy"
    if [ -d ".venv" ]; then
        source .venv/bin/activate
    fi
    nohup python -m uvicorn app:app --host 0.0.0.0 --port 8080 > waf.log 2>&1 &
    cd "$SCRIPT_DIR"
    wait_for_service 8080 "WAF Proxy"
fi

# 3. Start Threat Intelligence Backend (port 5000)
if check_port 5000; then
    echo -e "${GREEN}✓ TI Backend already running on port 5000${NC}"
else
    echo -e "${BLUE}→ Starting Threat Intelligence Backend on port 5000...${NC}"
    cd "$SCRIPT_DIR/HYDRA_Website/backend"
    if [ -d ".venv" ]; then
        source .venv/bin/activate
    fi
    # Use explicit python path from venv if active, or just python
    if [ -f ".venv/bin/python" ]; then
        nohup .venv/bin/python app.py > ti_backend.log 2>&1 &
    else
        nohup python app.py > ti_backend.log 2>&1 &
    fi
    cd "$SCRIPT_DIR"
    wait_for_service 5000 "TI Backend"
fi

# 4. Start Frontend Server (port 3000)
if check_port 3000; then
    echo -e "${GREEN}✓ Frontend Server already running on port 3000${NC}"
else
    echo -e "${BLUE}→ Starting Frontend Server on port 3000...${NC}"
    cd "$SCRIPT_DIR/HYDRA_Website"
    nohup python -m http.server 3000 > frontend.log 2>&1 &
    cd "$SCRIPT_DIR"
    wait_for_service 3000 "Frontend Server"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}All services started successfully!${NC}"
echo ""
echo -e "${YELLOW}Access Points:${NC}"
echo -e "  Dashboard:  ${GREEN}http://localhost:3000${NC}"
echo -e "  WAF API:    ${GREEN}http://localhost:8080/api${NC}"
echo -e "  ML Service: ${GREEN}http://localhost:9000${NC}"
echo -e "  TI Backend: ${GREEN}http://localhost:5000${NC}"
echo ""
echo -e "${YELLOW}Default Login:${NC}"
echo -e "  Username: admin"
echo -e "  Password: admin123"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}To stop all services:${NC}"
echo -e "  ./stop-waf.sh"
echo ""
