# WebHydra - Web Application Firewall (WAF)

<div align="center">

**A hybrid Web Application Firewall combining signature-based detection and machine learning to protect web applications.**

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

WebHydra is a comprehensive Web Application Firewall designed to protect specialized upstream applications (like **OWASP Juice Shop**). It acts as a reverse proxy, analyzing incoming HTTP requests and blocking or logging suspicious activity. It combines:

- **Signature-Based Detection**: Regex patterns for known attack signatures
- **Machine Learning Detection**: Anomaly detection using Random Forest models
- **Web Dashboard**: Real-time monitoring and management interface
- **Threat Intelligence**: Integration with VirusTotal, AbuseIPDB, and OTX for IP/Domain reputation
- **Configurable Risk Thresholds**: Flexible response actions based on threat levels

---

## 🏗️ Architecture

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌──────────────┐
│ Client  │──────▶│  Proxy   │─────▶│   ML    │      │   Upstream   │
│         │        │  (WAF)   │      │ Service │      │ (Juice Shop) │
│         │◀───────│  :8080   │◀─────│  :9000  │      │    :3001     │
└─────────┘        └─────────┘      └─────────┘      └──────────────┘
                           │
                           ▼
                    ┌─────────────┐     ┌──────────────┐
                    │ Web Dashboard│     │ Threat Intel │
                    │ (Frontend)  │────▶│   Backend    │
                    │   :3000     │     │    :5000     │
                    └─────────────┘     └──────────────┘
```

### Components

1. **Proxy/WAF Service** (Port 8080): Main entry point. Intercepts requests, checks signatures, queries ML service, and forwards safe traffic to upstream.
2. **ML Service** (Port 9000): Machine learning model (Random Forest) to predict request maliciousness based on feature extraction.
3. **Upstream App** (Port 3001): The protected application (e.g., OWASP Juice Shop running in Docker).
4. **Web Dashboard** (Port 3000): Node.js frontend interface for monitoring KPIs, logs, and attacks.
5. **Threat Intel Backend** (Port 5000): Flask-based service for querying external Threat Intelligence APIs (VirusTotal, etc.) and LLM analysis.

---

## ✨ Features

### Security Features

- ✅ **Multi-layer Defense**: Signature + ML for comprehensive protection
- ✅ **URL Decoding**: Properly decodes URL-encoded parameters before checking
- ✅ **Body Analysis**: Analyzes both request body and query parameters via entropy and keyword frequency
- ✅ **Threat Intelligence**: Real-time IP and domain reputation checks
- ✅ **LLM Analysis**: AI-powered explanation of attacks and patch recommendations

### Detection Capabilities

- 🛡️ SQL Injection (SQLi)
- 🛡️ Cross-Site Scripting (XSS)
- 🛡️ Command Injection
- 🛡️ Path Traversal / LFI
- 🛡️ Anomaly detection via ML

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.12+**
- **Node.js 18+** (for Web Dashboard)
- **Docker** (optional, for running Juice Shop)
- **pip** (Python package manager)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd web-hydra
   ```

2. **Clone external dependencies**:
   ```bash
   # OWASP Juice Shop (for testing)
   git clone https://github.com/juice-shop/juice-shop.git
   cd juice-shop && npm install && cd ..

   # PayloadsAllTheThings (for attack payloads)
   git clone https://github.com/swisskyrepo/PayloadsAllTheThings.git
   ```

3. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API Keys (VirusTotal, AbuseIPDB, etc.)
   ```

### Dependency Installation

Install dependencies for each service using the created `requirements.txt` files:

#### 1. Proxy Service
```bash
cd proxy
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# (Includes: fastapi, uvicorn, httpx, pyyaml, python-dotenv)
deactivate
cd ..
```

#### 2. ML Service
```bash
cd ml_service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# (Includes: fastapi, uvicorn, pandas, numpy, scikit-learn, joblib)
# ensuring sklearn versions match trained model
deactivate
cd ..
```

#### 3. Dashboard Backend (Threat Intel)
```bash
cd HYDRA_Website/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# (Includes: flask, requests, python-dotenv, flask-cors)
deactivate
cd ../..
```

---

## 🏃 Starting Services

You can start all services using the provided script:

```bash
# Starts Proxy, ML Service, TI Backend, Dashboard (Node), and Juice Shop (Docker/Node)
bash start-all.sh
```

**Service Status Check:**
```bash
bash status.sh
```

**Access Points:**
- **Dashboard**: `http://localhost:3000`
- **WAF Proxy**: `http://localhost:8080` (Protecting Juice Shop)
- **Juice Shop**: `http://localhost:3001` (Direct access)

**Stopping Services:**
```bash
bash stop-all.sh
```

---

## 📁 Project Structure

```
web-hydra/
├── proxy/                      # WAF/Proxy service
│   ├── app.py                  # Main proxy application
│   ├── signatures.yml          # Attack signature patterns
│   ├── requirements.txt        # Python dependencies
│   ├── dataset/                # Suspicious request logs (jsonl)
│   └── .venv/                  # Virtual environment
├── ml_service/                 # ML prediction service
│   ├── app.py                  # ML service API
│   ├── feature_extractor.py    # Feature extraction logic
│   ├── ml_model.joblib         # Trained Random Forest model
│   ├── encoders.joblib         # (Optional) Feature encoders
│   ├── requirements.txt        # Python dependencies
│   └── .venv/                  # Virtual environment
├── HYDRA_Website/              # Web Dashboard & TI Backend
│   ├── server.js               # Node.js Frontend Server
│   ├── index.html              # Dashboard Entry Point
│   ├── assets/                 # CSS, JS, Images
│   └── backend/                # Threat Intelligence Backend (Flask)
│       ├── app.py              # Flask API for TI
│       ├── requirements.txt    # Backend dependencies
│       └── services/           # Service modules (Llama, etc.)
├── notebooks/                  # Jupyter notebooks for model training
│   ├── train_model.py          # Training script
│   └── *.ipynb                 # Analysis notebooks
├── juice-shop/                 # OWASP Juice Shop (Upstream App)
├── dataset/                    # Global/Shared datasets
├── start-all.sh                # Startup script
├── stop-all.sh                 # Shutdown script
└── README.md                   # Project Documentation
```

---

## ⚙️ Configuration

### Signature Patterns
Edit `proxy/signatures.yml` to minimize false positives or add new rules.

### ML Model
To retrain the model, use `notebooks/train_model.py`. Ensure `ml_service/feature_extractor.py` is synced if feature logic changes.

### Risk Thresholds
Modify thresholds in `proxy/app.py`:
```python
VERY_HIGH_RISK = 0.85
HIGH_RISK = 0.7
MEDIUM_RISK = 0.5
LOW_RISK = 0.3
```

---

## 🧪 Testing
The `demo.sh` script (if available) or manual curl commands can be used to test:

**Check Proxy Health:**
```bash
curl http://localhost:8080/health
```

**Test Attack Block:**
```bash
curl "http://localhost:8080/search?q=union+select"
# Should return 403 Forbidden
```

---

## 📄 License
[MIT License](LICENSE)

<div align="center">
Made with ❤️ for web security.
</div>
