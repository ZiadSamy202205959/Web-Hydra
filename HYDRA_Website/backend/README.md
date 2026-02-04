# WebHydra Threat Intelligence Backend

This is a Flask-based backend service for the WebHydra dashboard. It provides threat intelligence API endpoints by proxying requests to VirusTotal, AlienVault OTX, and AbuseIPDB.

## Setup

1.  **Install Python 3.9+**
2.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Configure Environment**:
    - Copy `.env.example` to `.env`
    - Add your API keys:
      - [VirusTotal API Key](https://www.virustotal.com/gui/user/apikey)
      - [AlienVault OTX API Key](https://otx.alienvault.com/api)
      - [AbuseIPDB API Key](https://www.abuseipdb.com/account/api)

## Running the Server

```bash
python app.py
```

The server will start on `http://localhost:5000`.

## API Endpoints

### 1. VirusTotal
`GET /api/ti/virustotal`

Parameters:
- `type`: `ip`, `domain`, or `hash`
- `value`: The actual IP, domain, or hash

### 2. AlienVault OTX
`GET /api/ti/otx`

Parameters:
- `type`: `ip`, `domain`, or `hash`
- `value`: The actual IP, domain, or hash

### 3. AbuseIPDB
`GET /api/ti/abuseipdb`

Parameters:
- `value`: The IP address (only IP is supported)

## Caching
All successful responses are cached for 30 minutes.

### 4. Recommendations & Patching (LLaMA)
`POST /api/patch/recommend`

Generates defensive security analysis and mitigation recommendations using LLaMA.

**Request Body:**
```json
{
  "attack_description": "SQL Injection in login form payload 1 OR 1=1",
  "context": {
    "source_ip": "192.168.1.100",
    "path": "/login"
  }
}
```

**Response:**
Returns a structured JSON object containing:
- `attack_type`: Classification of the attack.
- `root_cause`: Explanation of the vulnerability.
- `risk_level`: Assessment (low/medium/high/critical).
- `mitigations`: List of remediation steps.
- `virtual_patches`: Suggested WAF rules.
- `references`: OWASP/CWE references.

**Configuration:**
Set `LLM_PROVIDER=remote` in `.env` and provide `LLM_API_KEY` (e.g., Groq API Key).

