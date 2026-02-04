#!/bin/bash
BLUE='\033[1;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}[*] Checking status of WebHydra components...${NC}"
echo ""

check_port() {
    timeout 1 bash -c "echo > /dev/tcp/127.0.0.1/$1" >/dev/null 2>&1
    if [ $? -eq 0 ]; then echo "Running"; else echo "Not running"; fi
}

echo -e "${BLUE}Frontend (port 3000):${NC}"
check_port 3000

echo -e "${BLUE}Juice Shop (port 3001):${NC}"
check_port 3001

echo -e "${BLUE}WAF Proxy (uvicorn on 8080):${NC}"
check_port 8080

echo -e "${BLUE}ML Service (uvicorn on 9000):${NC}"
check_port 9000

echo -e "${BLUE}Threat Intelligence (flask on 5000):${NC}"
check_port 5000

echo ""
