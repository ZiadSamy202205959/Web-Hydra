# 🛡️ Zero-Day URL Attack Detection System

## 📊 Performance Summary

| Metric        | Value                           |
| ------------- | ------------------------------- |
| **Accuracy**  | **99.5%**                       |
| **Precision** | **100%** (zero false positives) |
| **Recall**    | **99%**                         |
| **F1 Score**  | **99.5%**                       |

> **Key Improvement:** This model achieves 99.5% accuracy by focusing **purely on attack patterns** in the URL path/query, excluding domain information.

---

## 🧠 How It Works

This system uses a **Character-Level Autoencoder (AE)** trained exclusively on **benign HTTP requests** to detect zero-day attacks through **anomaly detection**.

### The Core Idea

```
┌─────────────────────────────────────────────────────────────────┐
│  1. TRAINING: Learn what "normal" looks like                    │
│     - Feed the model ONLY benign requests                       │
│     - Model learns to reconstruct normal patterns               │
│                                                                 │
│  2. DETECTION: Identify anomalies                               │
│     - Give model a new request                                  │
│     - Measure reconstruction error (how hard was it to rebuild) │
│     - High error = The model never saw this pattern = ANOMALY   │
│                                                                 │
│  3. WHY THIS CATCHES ZERO-DAY ATTACKS                           │
│     - Attack patterns (SQLi, XSS, etc.) are fundamentally       │
│       different from normal requests                            │
│     - Since model never trained on attacks, it struggles to     │
│       reconstruct them → HIGH SCORE → DETECTED                  │
└─────────────────────────────────────────────────────────────────┘
```

### Model Architecture

```
CharAutoencoder (Conv1d-based)
├── Embedding Layer (64 dim)     - Converts characters to vectors
├── Encoder Conv1d (128 filters) - Compresses sequence patterns
├── Max Pooling → FC (128 dim)   - Creates latent representation
├── Decoder FC → Conv1d          - Reconstructs from latent
└── Output Conv1d                - Projects back to vocabulary
```

---

## 🔄 Data Preprocessing

### Original Dataset

The raw dataset (`combined_dataset.csv`) contains **16 columns**:

| Column          | Dtype   | Status                            |
| --------------- | ------- | --------------------------------- |
| Method          | object  | ✅ **KEPT**                       |
| User-Agent      | object  | ❌ Dropped (unused)               |
| Pragma          | object  | ❌ Dropped (unused)               |
| Cache-Control   | object  | ❌ Dropped (unused)               |
| Accept          | object  | ❌ Dropped (unused)               |
| Accept-Encoding | float64 | ❌ Dropped (100% null)            |
| Accept-Charset  | float64 | ❌ Dropped (100% null)            |
| Accept-Language | float64 | ❌ Dropped (100% null)            |
| Host            | float64 | ❌ Dropped (100% null)            |
| Cookie          | float64 | ❌ Dropped (100% null)            |
| Connection      | float64 | ❌ Dropped (100% null)            |
| content-length  | float64 | ❌ Dropped (100% null)            |
| content         | object  | ❌ Dropped (61% null)             |
| URL             | object  | ✅ **KEPT**                       |
| type            | object  | ❌ Dropped (redundant with label) |
| label           | int64   | ✅ **KEPT**                       |

### Final Columns Used

After cleaning, we use only **3 columns**:

```
['URL', 'Method', 'label']
```

### Preprocessing Steps

1. **Load Dataset**: Read `combined_dataset.csv` (7,007,263 rows)
2. **Select Columns**: Keep only `URL`, `Method`, `label`
3. **Drop Duplicates**: Remove duplicate rows
4. **Drop NaN**: Remove rows with missing values
5. **Final Clean Shape**: 7,007,263 rows × 3 columns

### Class Distribution

| Label         | Count     | Percentage |
| ------------- | --------- | ---------- |
| 0 (Benign)    | 4,000,000 | 57.1%      |
| 1 (Malicious) | 3,007,263 | 42.9%      |

### Input Text Construction

For the Autoencoder, we construct input text as:

```
METHOD={method} | PATH={path_query}
```

**Example:**

```
URL: https://example.com/search?q=test&page=1
→ METHOD=GET | PATH=/search?q=test&page=1
```

> **Note:** Domain is intentionally **excluded** to focus on attack patterns, not domain memorization.

---

## 🎯 Two-Stage Classification

Instead of a single threshold, we use **two thresholds** for more nuanced classification:

| Classification | Score Range   | Action                     |
| -------------- | ------------- | -------------------------- |
| **BENIGN**     | `< 3.80`      | Allow request              |
| **SUSPICIOUS** | `3.80 - 4.90` | Log for review / Alert SOC |
| **MALICIOUS**  | `≥ 4.90`      | Block immediately          |

### Why Two Stages?

- **HIGH_THRESHOLD (4.90)**: 100% precision - when we flag something, we're certain
- **LOW_THRESHOLD (3.80)**: Higher recall - catches more attacks for manual review

---

## 📂 File Structure

```
ZeroDay_best_model (no domain)/
├── app.py                      # FastAPI server application
├── README.md                   # This file
├── ZeroDay_best_99%.ipynb      # Training notebook
└── ae_artifacts/               # Model files
    ├── bundle.json             # Configuration (thresholds, dimensions)
    ├── char_vocab.json         # Character vocabulary (123 chars)
    ├── char_ae_best.pt         # PyTorch model weights
    └── ae_threshold.json       # Saved threshold value
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install fastapi uvicorn torch
```

### 2. Start the Server

```bash
cd "ZeroDay_best_model (no domain)"
uvicorn app:app --reload
```

### 3. Test a URL

```bash
curl -X POST "http://localhost:8000/predict" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com/search?q=test"}'
```

---

## 🔌 API Endpoints

### `POST /predict` - Single URL Prediction

**Request:**

```json
{
  "url": "https://example.com/admin?id=1' OR '1'='1",
  "method": "GET"
}
```

**Response:**

```json
{
  "url": "https://example.com/admin?id=1' OR '1'='1",
  "classification": "MALICIOUS",
  "is_malicious": true,
  "score": 5.82,
  "confidence": "HIGH"
}
```

### `POST /predict/batch` - Batch Prediction

**Request:**

```json
{
  "urls": [
    "https://example.com/home",
    "https://example.com/search?q=<script>alert(1)</script>",
    "https://example.com/api/users"
  ],
  "method": "GET"
}
```

**Response:**

```json
{
  "predictions": [...],
  "summary": {
    "total": 3,
    "benign": 2,
    "suspicious": 0,
    "malicious": 1,
    "detection_rate": "33.3%"
  }
}
```

### `GET /health` - Health Check

```json
{
  "status": "healthy",
  "model_loaded": true,
  "device": "cuda",
  "vocab_size": 123,
  "max_len": 256
}
```

### `POST /config` - Tune Thresholds (Live)

```json
{
  "low_threshold": 3.8,
  "high_threshold": 4.9
}
```

---

## 📈 Training Details

### Dataset

- **Source**: `combined_dataset.csv`
- **Training Split**: Benign requests only (for autoencoder)
- **Test Split**: Mixed benign + malicious URLs

### Hyperparameters

| Parameter      | Value          |
| -------------- | -------------- |
| Max Length     | 256 characters |
| Embedding Dim  | 64             |
| Latent Dim     | 128            |
| Epochs         | 30             |
| Early Stopping | 5 patience     |
| Batch Size     | 1024           |
| Learning Rate  | 0.001          |

### Input Format

The model receives requests in this format:

```
METHOD=GET | PATH=/search?q=test
```

---

## 🔬 Attack Types Detected

The model successfully detects various zero-day attack patterns:

| Attack Type           | Example                     | Detection     |
| --------------------- | --------------------------- | ------------- |
| **SQL Injection**     | `?id=1' OR '1'='1`          | ✅ High Score |
| **XSS**               | `<script>alert(1)</script>` | ✅ High Score |
| **Path Traversal**    | `../../../etc/passwd`       | ✅ High Score |
| **Command Injection** | `; cat /etc/passwd`         | ✅ High Score |
| **SSRF/LFI**          | `php://filter/...`          | ✅ High Score |
| **Encoded Attacks**   | `%2e%2e%2f` (../)           | ✅ High Score |
| **JNDI Injection**    | `${jndi:ldap://...}`        | ✅ High Score |

---

## 📊 Test Results Breakdown

From evaluation on 200 test payloads:

### Single Threshold (3.80)

```
Accuracy:  99.5%
Precision: 100.0%
Recall:    99.0%
F1 Score:  99.5%

Confusion Matrix:
              Predicted
           Benign  Malicious
Actual
Benign      100        0     (100% True Negative)
Malicious     1       99     (99% detected)
```

---

## 🔧 Tuning Guide

### Increase Recall (Catch More Attacks)

Lower the thresholds → More false positives but fewer attacks slip through

```bash
curl -X POST "http://localhost:8000/config" \
     -H "Content-Type: application/json" \
     -d '{"low_threshold": 3.70, "high_threshold": 4.50}'
```

### Increase Precision (Reduce False Positives)

Raise the thresholds → Fewer alerts but some attacks may slip through

```bash
curl -X POST "http://localhost:8000/config" \
     -H "Content-Type: application/json" \
     -d '{"low_threshold": 4.00, "high_threshold": 5.00}'
```

---

## 🏗️ Integration Examples

### Python

```python
import requests

response = requests.post(
    "http://localhost:8000/predict",
    json={"url": "https://example.com/page?id=1", "method": "GET"}
)
result = response.json()

if result["is_malicious"]:
    print(f"⚠️ BLOCKED: {result['classification']}")
else:
    print("✅ Allowed")
```

### JavaScript

```javascript
async function checkURL(url) {
  const response = await fetch("http://localhost:8000/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: url, method: "GET" }),
  });
  return await response.json();
}
```

### Nginx (WAF Integration)

```nginx
location / {
    auth_request /auth-check;
    proxy_pass http://backend;
}

location = /auth-check {
    internal;
    proxy_pass http://localhost:8000/predict;
    proxy_set_header Content-Type "application/json";
    proxy_set_body '{"url": "$request_uri"}';
}
```

---

## 📝 Changelog

### v1.0.0 (Current - No Domain)

- **99.5% accuracy** by focusing on attack patterns only
- Removed domain from feature extraction
- Conv1d-based architecture
- Two-stage threshold classification
- FastAPI REST API with batch support
- Live threshold tuning

### Previous Versions

| Version       | Accuracy | Precision | Recall | Notes                    |
| ------------- | -------- | --------- | ------ | ------------------------ |
| **99% (new)** | 99.5%    | 100%      | 99%    | Path-only (no domain)    |
| 93%           | 93.5%    | 100%      | 87%    | Domain+Path features     |
| 83%           | 83.0%    | 95.8%     | 69%    | Path-only, early version |
| 80%           | 79.5%    | 76.6%     | 85%    | Path-only, early version |

---

## 🤝 Credits

Developed as part of the **Taqi** cybersecurity project for zero-day attack detection.

**Model**: CharAutoencoder (PyTorch)  
**API**: FastAPI + Uvicorn  
**Training**: Jupyter Notebook (`ZeroDay_best_99%.ipynb`)
