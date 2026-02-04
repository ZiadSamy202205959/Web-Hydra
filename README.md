# WebHydra - Web Application Firewall (WAF)

<div align="center">

**A hybrid Web Application Firewall combining signature-based detection and machine learning to protect web applications from malicious requests.**

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Quick Start](#quick-start)
- [Components](#components)
- [Detection Methods](#detection-methods)
- [Web Dashboard](#web-dashboard)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

WebHydra is a comprehensive Web Application Firewall that acts as a reverse proxy, analyzing incoming HTTP requests and blocking or logging suspicious activity. It combines:

- **Signature-Based Detection**: Regex patterns for known attack signatures
- **Machine Learning Detection**: Anomaly detection using ML models
- **Web Dashboard**: Real-time monitoring and management interface
- **Configurable Risk Thresholds**: Flexible response actions based on threat levels

---

## 🏗️ Architecture

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│ Client  │──────▶│  Proxy   │─────▶│   ML    │     │Upstream │
│         │        │  (WAF)   │      │ Service │     │   App   │
│         │◀───────│  :8080   │◀─────│  :9000  │     │  :8001  │
└─────────┘        └─────────┘      └─────────┘     └─────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Web Dashboard│
                    │   :3000     │
                    └─────────────┘
```

### Components

1. **Proxy/WAF Service** (Port 8080): Main entry point that intercepts all requests
2. **ML Service** (Port 9000): Machine learning model for anomaly detection
3. **Upstream App** (Port 8001): Protected backend application
4. **Web Dashboard** (Port 3000): Frontend interface for monitoring and management

---

## ✨ Features

### Security Features

- ✅ **Multi-layer Defense**: Signature + ML for comprehensive protection
- ✅ **URL Decoding**: Properly decodes URL-encoded parameters before checking
- ✅ **Body Analysis**: Analyzes both request body and query parameters
- ✅ **Entropy Calculation**: Detects obfuscated payloads
- ✅ **Configurable Actions**: Different responses based on risk level
- ✅ **Comprehensive Logging**: All suspicious requests logged for analysis

### Detection Capabilities

- 🛡️ SQL Injection attacks
- 🛡️ XSS (Cross-Site Scripting) attacks
- 🛡️ Command injection attempts
- 🛡️ Path traversal attacks
- 🛡️ Anomaly detection via ML
- 🛡️ Custom signature patterns

### Dashboard Features

- 📊 Real-time threat monitoring
- 📈 Traffic analytics and KPIs
- 📝 Security log viewer
- ⚙️ Rules and policies management
- 🔄 ML model retraining interface
- 💡 AI-powered security recommendations

---

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+ (for web dashboard)
- pip (Python package manager)

### Python Dependencies

Install the required packages for each service:

```bash
# Core dependencies (all services)
pip install fastapi uvicorn httpx pyyaml python-dotenv

# ML Service dependencies
pip install joblib numpy scikit-learn pandas

# Dashboard Backend dependencies
pip install flask flask-cors requests

# Optional: For model training (notebooks)
pip install jupyter matplotlib seaborn
```

Or install from requirements files:

```bash
pip install -r HYDRA_Website/backend/requirements.txt
```

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd web-hydra
   ```

2. **Clone external dependencies**:
   ```bash
   # OWASP Juice Shop (optional, for testing)
   git clone https://github.com/juice-shop/juice-shop.git
   cd juice-shop && npm install && cd ..

   # PayloadsAllTheThings (optional, for attack testing)
   git clone https://github.com/swisskyrepo/PayloadsAllTheThings.git
   ```

3. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up virtual environments**:
   ```bash
   # For proxy service
   cd proxy
   python3 -m venv .venv
   source .venv/bin/activate
   pip install fastapi uvicorn httpx pyyaml python-dotenv

   # For ML service
   cd ../ml_service
   python3 -m venv .venv
   source .venv/bin/activate
   pip install fastapi uvicorn joblib numpy scikit-learn pydantic
   ```

### Starting All Services

```bash
# Start all services (upstream, ML service, and proxy)
bash start-all.sh

# Check service status
bash status.sh

# View which ports are listening
ss -tlnp | grep -E ":(8001|8080|9000)"
```

### Starting the Web Dashboard

```bash
cd "WEB HYDRA Website"
python3 -m http.server 3000
```

Then open `http://localhost:3000` in your browser.

**Default Login Credentials:**
- **Admin**: `admin` / `admin123`
- **Viewer**: `user` / `user123`

### Stopping All Services

```bash
bash stop-all.sh
```

---

## 🧪 Running the Demo

The demo script tests all 4 scenarios:

```bash
bash demo.sh
```

### Demo Test Cases

#### 1. **PROXY - Malicious SQL Injection** (Should be BLOCKED)
```bash
GET /search?q=1%20union%20select%20*%20from%20users
```
- **Expected**: `403 Forbidden` - Blocked by signature detection
- **Detection**: Regex pattern matches `union select` in query string

#### 2. **PROXY - Safe Search Request** (Should be ALLOWED)
```bash
GET /search?q=weather
```
- **Expected**: `200 OK` - Request forwarded to upstream
- **Detection**: No signature match, low ML score

#### 3. **ML - Malicious Body POST** (Should be BLOCKED)
```bash
POST /upload
Body: "union select" repeated 200 times
```
- **Expected**: `403 Forbidden` - Blocked by ML (high risk score) or signature
- **Detection**: High content length + keyword frequency triggers high ML score

#### 4. **ML - Safe Body POST** (Should be ALLOWED)
```bash
POST /upload
Body: "status=ok&value=123"
```
- **Expected**: `200 OK` - Request forwarded to upstream
- **Detection**: Low ML score, no suspicious patterns

---

## 🔍 Detection Methods

### 1. Signature-Based Detection (Proxy)

Uses regex patterns to detect known attack signatures:
- Checks both request body and URL query parameters
- Immediate blocking for matched patterns
- Patterns include:
  - SQL Injection (`union select`, `or 1=1`, etc.)
  - XSS attacks (`<script>`, `onerror`, etc.)
  - Command injection (`cat`, `wget`, `curl`, etc.)
  - Path traversal (`../`)
  - And more (see `proxy/signatures.yml`)

### 2. Machine Learning Detection (ML Service)

Analyzes request features:
- Content length
- Body entropy
- Keyword frequency (e.g., `union`, `select`)
- Returns a risk score (0.0 - 1.0)
- Configurable thresholds for different risk levels

---

## 📊 Risk Thresholds

The proxy uses configurable risk thresholds:

| Risk Level | Threshold | Action |
|------------|-----------|--------|
| **VERY_HIGH_RISK** | ≥ 0.85 | Block + alert + decoy |
| **HIGH_RISK** | ≥ 0.7 | Block + alert |
| **MEDIUM_RISK** | ≥ 0.5 | Alert only (log + forward) |
| **LOW_RISK** | ≥ 0.3 | Silent log (forward quietly) |
| **LOW** | < 0.3 | Forward without logging |

---

## 🖥️ Web Dashboard

The Web Dashboard provides a comprehensive interface for managing and monitoring WebHydra.

### Features

- **Dashboard**: Overview of KPIs, traffic charts, and recent alerts
- **Threat Monitor**: Real-time anomaly detection and heatmap visualization
- **Threat Intelligence**: External threat feeds and intelligence
- **Rules & Policies**: Manage WAF rules and policies
- **Logs**: View and filter security logs
- **Learning Loop**: Retrain ML models
- **Recommendations**: AI-powered security recommendations
- **User Management**: Manage users and roles
- **Settings**: Configure API keys and preferences

### Configuration

The frontend connects to the WebHydra backend API at `http://127.0.0.1:8080/api`.

To change the API URL, edit `WEB HYDRA Website/assets/api.js`:

```javascript
const API_BASE_URL = 'http://your-backend-url:8080/api';
```

### API Endpoints Used

- `/api/kpis` - Dashboard KPIs
- `/api/logs` - Security logs
- `/api/alerts` - Recent alerts
- `/api/traffic` - Traffic data
- `/api/owasp` - OWASP threat distribution
- `/api/heatmap` - Anomaly heatmap

---

## 📁 Project Structure

```
web-hydra/
├── proxy/                  # WAF/Proxy service
│   ├── app.py             # Main proxy application
│   ├── signatures.yml     # Attack signature patterns
│   ├── dataset/           # Suspicious request logs
│   │   └── suspicious.jsonl
│   └── .venv/             # Virtual environment
├── ml_service/            # ML prediction service
│   ├── app.py             # ML service application
│   ├── ml_model.joblib    # Trained model (optional)
│   └── .venv/             # Virtual environment
├── upstream/              # Protected backend application
│   └── app.py             # Simple FastAPI app with /search and /upload
├── WEB HYDRA Website/     # Web dashboard frontend
│   ├── index.html         # Main dashboard
│   ├── assets/            # CSS, JS, images
│   ├── logs.html          # Log viewer
│   └── ...                # Other dashboard pages
├── dataset/               # Global suspicious request logs
│   └── suspicious.jsonl
├── notebooks/             # Jupyter notebooks for model training
│   ├── train_model.py
│   └── *.ipynb
├── demo.sh               # Demo script with 4 test cases
├── start-all.sh          # Start all services
├── stop-all.sh           # Stop all services
├── status.sh             # Check service status
└── retrain.sh            # Retrain ML model
```

---

## ⚙️ Configuration

### Signature Patterns

Edit `proxy/signatures.yml` to add or modify attack signatures:

```yaml
- id: SQL_UNION_SELECT
  regex: "union(?:\\s+all)?\\s+select"

- id: XSS_SCRIPT_TAG
  regex: "<script.*?>.*?</script>"
```

### ML Model

- Place a trained model at `ml_service/ml_model.joblib`
- If no model exists, the service uses a heuristic fallback
- Train a model using the notebooks in `notebooks/`

### Risk Thresholds

Modify thresholds in `proxy/app.py`:

```python
VERY_HIGH_RISK = 0.85
HIGH_RISK = 0.7
MEDIUM_RISK = 0.5
LOW_RISK = 0.3
```

---

## 📝 API Reference

### Proxy (Port 8080)

- `GET /health` - Health check
- `* /{path:path}` - All other requests are analyzed and forwarded

### ML Service (Port 9000)

- `POST /predict` - Get ML risk score
  ```json
  {
    "features": {
      "content_len": 100,
      "body_entropy": 3.5,
      "kw_union": 0
    }
  }
  ```
  Response:
  ```json
  {
    "score": 0.25
  }
  ```

### Upstream (Port 8001)

- `GET /search?q={query}` - Search endpoint
- `POST /upload` - Upload endpoint

---

## 🔄 Request Flow

1. **Client** sends request to Proxy (port 8080)
2. **Proxy** checks signatures against URL and body
   - If match → **BLOCK** (403) and log
3. **Proxy** extracts features from request body
4. **Proxy** sends features to **ML Service** (port 9000)
5. **ML Service** returns risk score (0.0 - 1.0)
6. **Proxy** evaluates score against thresholds:
   - High risk → **BLOCK** (403) and log
   - Medium risk → **LOG** and forward
   - Low risk → **FORWARD** (may log silently)
7. **Proxy** forwards allowed requests to **Upstream** (port 8001)
8. **Upstream** processes request and returns response

---

## 📊 Logging

Suspicious requests are logged to:
- `proxy/dataset/suspicious.jsonl` - JSON Lines format
- Each entry includes:
  - Timestamp
  - Method, URL, headers, body
  - Verdict (blocked/alert/logged)
  - Reason (signature ID or ML score)
  - ML risk score (if applicable)

Example log entry:
```json
{
  "ts": 1699999999.123,
  "method": "GET",
  "url": "http://127.0.0.1:8080/search?q=1 union select",
  "verdict": "blocked",
  "reason": "SIG:SQL_UNION_SELECT"
}
```

---

## 🛠️ Development

### Retraining the ML Model

```bash
bash retrain.sh
```

This will:
1. Use training data from `notebooks/`
2. Train a new model
3. Save to `ml_service/ml_model.joblib`

### Manual Testing

Test individual endpoints:

```bash
# Test proxy health
curl http://127.0.0.1:8080/health

# Test upstream directly
curl http://127.0.0.1:8001/search?q=test

# Test ML service
curl -X POST http://127.0.0.1:9000/predict \
  -H "Content-Type: application/json" \
  -d '{"features": {"content_len": 100, "body_entropy": 3.5, "kw_union": 0}}'
```

### Running Services Individually

```bash
# Proxy service
cd proxy
source .venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8080

# ML service
cd ml_service
source .venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 9000

# Upstream service
cd upstream
source ../proxy/.venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8001
```

---

## 🐛 Troubleshooting

### Services not starting

- Check if ports 8001, 8080, 9000 are already in use
- Verify virtual environments are activated
- Check log files: `upstream.log`, `proxy/waf.log`, `ml_service/ml_svc.log`

### Requests not being blocked

- Verify signatures are loaded: check `proxy/signatures.yml`
- Check URL decoding: ensure query parameters are properly decoded
- Verify ML service is running and responding

### ML scores always low/high

- Retrain the model with updated data
- Adjust feature extraction in `proxy/app.py`
- Modify thresholds in `proxy/app.py`

### Dashboard not connecting

- Verify proxy service is running on port 8080
- Check API endpoint configuration in `WEB HYDRA Website/assets/api.js`
- Verify CORS is enabled on the backend
- Check browser console for errors

---

## 📚 Notes

- The proxy uses CORS middleware to allow all origins (configure for production)
- ML service falls back to heuristics if no model is available
- All suspicious requests are logged for analysis and model retraining
- Services can be run independently for development
- The dashboard uses localStorage for authentication and user preferences
- Data refreshes automatically every 30 seconds on the dashboard
- Logs refresh every 10 seconds

---

## 📄 License

[Add your license here]

## 👥 Contributors

[Add contributors here]

---

<div align="center">

**Made with ❤️ for web security**

</div>
