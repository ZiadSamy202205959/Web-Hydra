import uvicorn
import secrets
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx
import hashlib
import json
import os
import re
import time
import yaml
from math import log2
from urllib.parse import unquote
from datetime import datetime, timedelta
from collections import defaultdict

# Security Scheme
security = HTTPBearer()

# In-memory token store (Simple implementation for remediation)
# In production, use a database or Redis
VALID_TOKENS = set()

# ML Result Cache (LRU-ish via size limit)
ML_CACHE = {}

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify that the Bearer token is valid"""
    token = credentials.credentials
    if token not in VALID_TOKENS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load signatures
with open("signatures.yml", "r") as f:
    RAW_SIGS = yaml.safe_load(f)

# Build SIGS list (compiled regexes)
SIGS = [(s["id"], re.compile(s["regex"], re.IGNORECASE)) for s in RAW_SIGS]

# Rules state management (for frontend control)
RULES_STATE = {
    s["id"]: {
        "id": s["id"],
        "name": s["id"].replace("_", " ").title(),
        "description": f"Pattern: {s['regex'][:50]}..." if len(s['regex']) > 50 else f"Pattern: {s['regex']}",
        "enabled": True
    }
    for s in RAW_SIGS
}

# WAF Settings (configurable via API)
WAF_SETTINGS = {
    "very_high_risk": 0.85,
    "high_risk": 0.70,
    "medium_risk": 0.50,
    "low_risk": 0.30,
    "upstream_url": "http://127.0.0.1:3001", # Points to Juice Shop now
    "ml_service_url": "http://127.0.0.1:9000/predict",
    "log_safe_traffic": True
}

# Training state
TRAINING_STATE = {
    "in_progress": False,
    "progress": 0,
    "logs": [],
    "last_trained": None
}

# Configurable thresholds and actions
VERY_HIGH_RISK = 0.85  # Block + alert + decoy
HIGH_RISK = 0.7        # Block + alert
MEDIUM_RISK = 0.5      # Alert only (log + forward)
LOW_RISK = 0.3         # Silent log (forward quietly)

# ML service URL
ML_SERVICE = "http://127.0.0.1:9000/predict"

# Upstream app URL
UPSTREAM = "http://127.0.0.1:3001" # Default to Juice Shop, prefer WAF_SETTINGS

# Dataset log location
os.makedirs("dataset", exist_ok=True)
LOG_PATH = "dataset/suspicious.jsonl"
REQUEST_COUNTER = 0  # Simple counter for total requests



def entropy(s):
    if not s:
        return 0.0
    prob = [float(s.count(c)) / len(s) for c in dict.fromkeys(list(s))]
    return -sum([p * log2(p) for p in prob])


def extract_features(body: str, url: str = "") -> dict:
    combined = body + " " + url
    return {
        "content_len": len(body),
        "body_entropy": round(entropy(body), 2),
        "url_entropy": round(entropy(url), 2) if url else 0,
        "kw_union": combined.lower().count("union"),
        "kw_select": combined.lower().count("select"),
        "kw_script": combined.lower().count("script"),
        "kw_alert": combined.lower().count("alert"),
        "kw_exec": combined.lower().count("exec"),
        "kw_eval": combined.lower().count("eval"),
        "kw_or": combined.lower().count(" or "),
        "special_chars": sum(1 for c in combined if c in "<>'\";(){}[]"),
        "url_length": len(url)
    }


async def forward_upstream(req: Request):
    async with httpx.AsyncClient() as client:
        body = await req.body()
        headers = dict(req.headers)
        headers.pop("host", None)
        try:
            # Use configured upstream URL
            upstream_url = WAF_SETTINGS.get("upstream_url", UPSTREAM)
            target_url = f"{upstream_url}{req.url.path}"
            if req.url.query:
                target_url += f"?{req.url.query}"

            resp = await client.request(
                req.method,
                target_url,
                content=body,
                headers=headers
            )
            return JSONResponse(content=resp.text, status_code=resp.status_code)
        except httpx.RequestError as e:
            return JSONResponse(status_code=502, content={"detail": "Upstream unavailable", "error": str(e)})


@app.get("/health")
async def health():
    return {"status": "ok"}


def load_logs():
    """Load all log entries from the suspicious.jsonl file"""
    logs = []
    if os.path.exists(LOG_PATH):
        try:
            with open(LOG_PATH, "r") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            logs.append(json.loads(line))
                        except json.JSONDecodeError:
                            continue
        except Exception:
            pass
    return logs


def get_attack_type_from_reason(reason: str) -> str:
    """Extract attack type from reason string"""
    if not reason:
        return "Unknown"
    if reason.startswith("SIG:"):
        sig_id = reason.replace("SIG:", "")
        # Map signature IDs to attack types
        if "SQL" in sig_id:
            return "SQLi"
        elif "XSS" in sig_id:
            return "XSS"
        elif "CMD" in sig_id or "COMMAND" in sig_id:
            return "Command Injection"
        elif "TRAVERSAL" in sig_id or "LFI" in sig_id:
            return "Path Traversal"
        elif "CSRF" in sig_id:
            return "CSRF"
        elif "SSRF" in sig_id:
            return "SSRF"
        else:
            return sig_id
    elif reason.startswith("ML:"):
        return "ML Detected"
    return "Unknown"


@app.get("/api/kpis")
async def get_kpis():
    """Get KPI metrics"""
    logs = load_logs()
    blocked = sum(1 for log in logs if log.get("verdict") == "blocked")
    total_requests = REQUEST_COUNTER if REQUEST_COUNTER > 0 else len(logs) * 10  # Estimate if counter not available
    false_positives = 0  # Would need manual marking
    model_confidence = 0.87  # Could be calculated from ML scores
    
    return {
        "totalRequests": total_requests,
        "blockedAttacks": blocked,
        "falsePositives": false_positives,
        "modelConfidence": model_confidence
    }


@app.get("/api/logs")
async def get_logs(limit: int = 100, offset: int = 0):
    """Get logs with pagination"""
    logs = load_logs()
    # Sort by timestamp descending (most recent first)
    logs.sort(key=lambda x: x.get("ts", 0), reverse=True)
    
    # Convert to frontend format
    result = []
    for i, log in enumerate(logs[offset:offset+limit]):
        reason = log.get("reason", "Unknown")
        attack_type = get_attack_type_from_reason(reason)
        
        # Determine severity from score or verdict
        score = log.get("score", 0)
        if score >= 0.85:
            severity = "Critical"
        elif score >= 0.7:
            severity = "High"
        elif score >= 0.5:
            severity = "Medium"
        else:
            severity = "Low"
        
        # Determine log type
        if log.get("verdict") == "blocked":
            log_type = "Attack"
        elif log.get("verdict") == "alert":
            log_type = "Warning"
        else:
            log_type = "Info"
        
        result.append({
            "id": offset + i + 1,
            "type": log_type,
            "severity": severity,
            "message": f"{log.get('method', 'UNKNOWN')} {log.get('url', '')} - {reason}",
            "timestamp": int(log.get("ts", time.time()) * 1000)  # Convert to milliseconds
        })
    
    return {"logs": result, "total": len(logs)}


@app.get("/api/alerts")
async def get_alerts(limit: int = 10):
    """Get recent alerts"""
    logs = load_logs()
    # Filter for blocked or alerted requests
    alerts = [log for log in logs if log.get("verdict") in ["blocked", "alert"]]
    alerts.sort(key=lambda x: x.get("ts", 0), reverse=True)
    
    result = []
    for i, log in enumerate(alerts[:limit]):
        reason = log.get("reason", "Unknown")
        attack_type = get_attack_type_from_reason(reason)
        
        score = log.get("score", 0)
        if score >= 0.85 or "Critical" in reason:
            severity = "Critical"
        elif score >= 0.7 or "High" in reason:
            severity = "High"
        elif score >= 0.5:
            severity = "Medium"
        else:
            severity = "Low"
        
        result.append({
            "id": i + 1,
            "type": attack_type,
            "severity": severity,
            "description": f"{log.get('method', 'UNKNOWN')} {log.get('url', '')} - {reason}",
            "timestamp": int(log.get("ts", time.time()) * 1000)
        })
    
    return {"alerts": result}


@app.get("/api/traffic")
async def get_traffic():
    """Get traffic data for last 30 days"""
    logs = load_logs()
    # Group by day (simplified - would need proper date parsing)
    # For now, return estimated data
    traffic_data = []
    for i in range(30):
        # Count logs from roughly that day (simplified)
        day_logs = [log for log in logs if log.get("ts", 0) > time.time() - (30-i)*86400]
        count = len([l for l in day_logs if l.get("ts", 0) > time.time() - (30-i+1)*86400])
        traffic_data.append(max(500, count * 10))  # Estimate with minimum
    
    return {"trafficData": traffic_data}


@app.get("/api/owasp")
async def get_owasp():
    """Get OWASP threat distribution"""
    logs = load_logs()
    counts = defaultdict(int)
    
    for log in logs:
        if log.get("verdict") == "blocked":
            reason = log.get("reason", "")
            attack_type = get_attack_type_from_reason(reason)
            if attack_type == "SQLi":
                counts["SQLi"] += 1
            elif attack_type == "XSS":
                counts["XSS"] += 1
            elif attack_type == "Command Injection":
                counts["Command Injection"] += 1
            elif attack_type == "Path Traversal":
                counts["Path Traversal"] += 1
            elif attack_type == "CSRF":
                counts["CSRF"] += 1
    
    # Ensure all categories exist with at least 0
    result = {
        "SQLi": counts.get("SQLi", 0),
        "XSS": counts.get("XSS", 0),
        "CSRF": counts.get("CSRF", 0),
        "Command Injection": counts.get("Command Injection", 0),
        "Path Traversal": counts.get("Path Traversal", 0)
    }
    
    return result


@app.get("/api/heatmap")
async def get_heatmap():
    """Get heatmap data for last 7 days (7 days x 24 hours = 168 cells)"""
    logs = load_logs()
    heatmap = []
    current_time = time.time()
    
    # Only count blocked/alerted requests for anomaly heatmap
    anomaly_logs = [log for log in logs if log.get("verdict") in ["blocked", "alert"]]
    
    for day in range(7):
        day_data = []
        day_start = current_time - (7 - day) * 86400
        
        for hour in range(24):
            hour_start = day_start - (24 - hour) * 3600
            hour_end = day_start - (23 - hour) * 3600
            
            # Count anomalies in this hour
            count = len([log for log in anomaly_logs 
                        if hour_start <= log.get("ts", 0) < hour_end])
            
            # Normalize: 0-1 scale, where 1 = 10+ anomalies in that hour
            normalized = min(1.0, count / 10.0) if count > 0 else 0.0
            day_data.append(normalized)
        
        heatmap.append(day_data)
    
    return {"heatmap": heatmap}


@app.get("/api/stats")
async def get_stats():
    """Get real-time WAF statistics"""
    logs = load_logs()
    recent_logs = [log for log in logs if log.get("ts", 0) > time.time() - 3600]  # Last hour
    
    return {
        "totalRequests": REQUEST_COUNTER,
        "blockedLastHour": sum(1 for log in recent_logs if log.get("verdict") == "blocked"),
        "allowedLastHour": sum(1 for log in recent_logs if log.get("verdict") not in ["blocked", "alert"]),
        "alertsLastHour": sum(1 for log in recent_logs if log.get("verdict") == "alert"),
        "totalBlocked": sum(1 for log in logs if log.get("verdict") == "blocked"),
        "totalAlerts": sum(1 for log in logs if log.get("verdict") == "alert")
    }


# ==================== AUTH ENDPOINT ====================

@app.post("/api/login")
async def login(creds: dict):
    """Simple login generating a random token"""
    # Load credentials from environment or use default
    admin_user = os.getenv("ADMIN_USER", "admin")
    admin_pass = os.getenv("ADMIN_PASSWORD", "admin123")
    
    username = creds.get("username")
    password = creds.get("password")
    
    if username == admin_user and password == admin_pass:
        token = secrets.token_hex(32)
        VALID_TOKENS.add(token)
        return {"success": True, "token": token, "user": {"username": "admin", "role": "admin"}}
    
    return JSONResponse(status_code=401, content={"success": False, "message": "Invalid credentials"})

# ==================== NEW ENDPOINTS FOR FRONTEND ====================

@app.get("/api/health")
async def api_health():
    """Health check endpoint (matches frontend expectation)"""
    return {"status": "ok", "service": "waf-proxy"}


@app.get("/api/rules")
async def list_rules():
    """List all signature rules with enabled status"""
    return {"rules": list(RULES_STATE.values())}


@app.put("/api/rules/{rule_id}")
async def toggle_rule(rule_id: str, enabled: bool = True, token: str = Depends(verify_token)):
    """Enable or disable a signature rule"""
    if rule_id in RULES_STATE:
        RULES_STATE[rule_id]["enabled"] = enabled
        return {"success": True, "rule": RULES_STATE[rule_id]}
    return JSONResponse(status_code=404, content={"detail": f"Rule {rule_id} not found"})


@app.get("/api/settings")
async def get_settings():
    """Get WAF configuration settings"""
    return WAF_SETTINGS


@app.put("/api/settings")
async def update_settings(settings: dict, token: str = Depends(verify_token)):
    """Update WAF configuration settings"""
    global WAF_SETTINGS
    # Only update allowed keys
    allowed_keys = ["very_high_risk", "high_risk", "medium_risk", "low_risk", 
                    "upstream_url", "ml_service_url", "log_safe_traffic"]
    for key in allowed_keys:
        if key in settings:
            WAF_SETTINGS[key] = settings[key]
    return {"success": True, "settings": WAF_SETTINGS}


@app.post("/api/train")
async def trigger_training(token: str = Depends(verify_token)):
    """Trigger ML model retraining"""
    global TRAINING_STATE
    
    if TRAINING_STATE["in_progress"]:
        return JSONResponse(status_code=409, content={"detail": "Training already in progress"})
    
    TRAINING_STATE["in_progress"] = True
    TRAINING_STATE["progress"] = 0
    TRAINING_STATE["logs"] = ["Training started..."]
    
    # In a real implementation, this would trigger an async training job
    # For now, we simulate the training state
    return {"success": True, "message": "Training initiated", "state": TRAINING_STATE}


@app.get("/api/train/status")
async def get_training_status():
    """Get current training status"""
    return TRAINING_STATE


@app.post("/api/train/complete")
async def complete_training():
    """Mark training as complete (called by training script)"""
    global TRAINING_STATE
    TRAINING_STATE["in_progress"] = False
    TRAINING_STATE["progress"] = 100
    TRAINING_STATE["last_trained"] = time.time()
    TRAINING_STATE["logs"].append("Training completed successfully")
    return {"success": True, "state": TRAINING_STATE}


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def waf_entry(req: Request, path: str):
    global REQUEST_COUNTER
    
    # Skip API endpoints from WAF processing - they're handled by their own routes
    if path.startswith("api/"):
        return JSONResponse(status_code=404, content={"detail": "API endpoint not found"})
    
    REQUEST_COUNTER += 1
    body = await req.body()
    body_text = body.decode("utf-8", errors="ignore")

    log_entry = {
        "ts": time.time(),
        "method": req.method,
        "url": str(req.url),
        "headers": dict(req.headers),
        "body": body_text
    }

    # Decode URL for signature checking - construct full URL with query string
    full_url = str(req.url.path)
    if req.url.query:
        full_url += "?" + req.url.query
    url_decoded = unquote(full_url)
    url_and_body = body_text + " " + url_decoded

    for sig_id, regex in SIGS:
        if regex.search(body_text) or regex.search(url_decoded):
            log_entry["verdict"] = "blocked"
            log_entry["reason"] = f"SIG:{sig_id}"
            with open(LOG_PATH, "a") as f:
                f.write(json.dumps(log_entry) + "\n")
            return JSONResponse(status_code=403, content={"detail": "Blocked by signature", "id": sig_id})

    # Updated to support new ML Service schema (Notebook replication)
    # We send raw attributes so ML service can encode them
    # Check Cache for ML Score
    if url_and_body in ML_CACHE:
        score = ML_CACHE[url_and_body]
    else:
        # Updated to support new ML Service schema (Notebook replication)
        # We send raw attributes so ML service can encode them
        raw_payload = {
            "raw_request": {
                "method": req.method,
                "url": str(req.url),   # Or url_decoded if trained on that
                "headers": dict(req.headers), # Headers dict
                "user_agent": req.headers.get("user-agent", ""),
                "accept": req.headers.get("accept", ""),
                "host": req.headers.get("host", ""),
                "cookie": req.headers.get("cookie", ""),
                "content_type": req.headers.get("content-type", ""),
                "content_length": len(body),
                "body": body_text # Truncate if necessary, but notebook used full
            }
        }

        try:
            async with httpx.AsyncClient() as client:
                r = await client.post(ML_SERVICE, json=raw_payload, timeout=2)
                if r.status_code == 200:
                    score = r.json().get("score", 0.0)
                else:
                    score = 0.0
        except Exception as e:
            # Fallback if ML service is down
            score = 0.0
        
        # Update Cache (manage size)
        if len(ML_CACHE) > 1000:
            ML_CACHE.clear()
        ML_CACHE[url_and_body] = score

    log_entry["score"] = round(score, 2)

    if score >= VERY_HIGH_RISK:
        log_entry["verdict"] = "blocked"
        log_entry["reason"] = f"ML:{score:.2f} (very high)"
        with open(LOG_PATH, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
        try:
            httpx.post("http://127.0.0.1:5000/api/ingest_log", json={**log_entry, "severity": "Critical" if score >= 0.85 else "High" if score >= 0.7 else "Medium", "detection_source": "ML"}, timeout=2)
        except:
            pass
        return JSONResponse(status_code=403, content={"detail": "Blocked and reported", "score": score})

    elif score >= HIGH_RISK:
        log_entry["verdict"] = "blocked"
        log_entry["reason"] = f"ML:{score:.2f} (high)"
        with open(LOG_PATH, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
        try:
            httpx.post("http://127.0.0.1:5000/api/ingest_log", json={**log_entry, "severity": "Critical" if score >= 0.85 else "High" if score >= 0.7 else "Medium", "detection_source": "ML"}, timeout=2)
        except:
            pass
        return JSONResponse(status_code=403, content={"detail": "Blocked by ML", "score": score})

    elif score >= MEDIUM_RISK:
        log_entry["verdict"] = "alert"
        log_entry["reason"] = f"ML:{score:.2f} (medium)"
        with open(LOG_PATH, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
        try:
            httpx.post("http://127.0.0.1:5000/api/ingest_log", json={**log_entry, "severity": "Critical" if score >= 0.85 else "High" if score >= 0.7 else "Medium", "detection_source": "ML"}, timeout=2)
        except:
            pass
        return await forward_upstream(req)

    elif score >= LOW_RISK:
        log_entry["verdict"] = "logged"
        log_entry["reason"] = f"ML:{score:.2f} (low)"
        with open(LOG_PATH, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
        return await forward_upstream(req)

    else:
        # Log SAFE traffic for dataset generation
        log_entry["verdict"] = "safe"
        log_entry["reason"] = f"ML:{score:.2f} (safe)"
        with open(LOG_PATH, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
        return await forward_upstream(req)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)

