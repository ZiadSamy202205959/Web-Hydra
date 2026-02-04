#!/bin/bash
# Stop all Web Hydra services
kill_port() {
    local port=$1
    local name=$2
    pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pid" ]; then
        kill -9 $pid >/dev/null 2>&1
        echo "✓ Stopped $name (Port $port)"
    else
        echo "  $name (Port $port) was not running"
    fi
}

echo "Stopping all Web Hydra services..."

kill_port 8080 "WAF Proxy"
kill_port 9000 "ML Service"
kill_port 5000 "TI Backend"
kill_port 3000 "Frontend"

# Stop Juice Shop (Docker or Local)
if [ -n "$(docker ps -aq -f name=juice-shop)" ]; then
    docker rm -f juice-shop >/dev/null && echo "✓ Stopped Juice Shop (Docker)"
else
    # Fallback for local node
    kill_port 3001 "Juice Shop (Local)"
fi

echo "Done."
