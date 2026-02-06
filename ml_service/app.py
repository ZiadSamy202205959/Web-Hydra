"""
Zero-Day URL Attack Detection ML Service
Uses CharAutoencoder deep learning model trained on benign traffic.
Malicious requests produce high reconstruction errors.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, Optional
import torch
import torch.nn as nn
import json
import uvicorn
import os
import logging
from urllib.parse import urlparse

# Logging config
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ml_service")

# Paths to model artifacts (relative to app.py)
ARTIFACTS_DIR = "ae_artifacts"
BUNDLE_FILE = os.path.join(ARTIFACTS_DIR, "bundle.json")
VOCAB_FILE = os.path.join(ARTIFACTS_DIR, "char_vocab.json")
MODEL_FILE = os.path.join(ARTIFACTS_DIR, "char_ae_best.pt")

# Thresholds for classification
LOW_THRESHOLD = 3.80   
HIGH_THRESHOLD = 4.90  

# Device configuration
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class CharAutoencoder(nn.Module):
    """
    Character-level Autoencoder for URL anomaly detection.
    
    Architecture:
        - Embedding layer: Converts character indices to dense vectors
        - Encoder: Conv1d layers that compress the input sequence
        - Decoder: Conv1d layers that reconstruct the original sequence
        - Output: Projects decoder output back to vocabulary logits
    
    The model is trained on BENIGN HTTP requests only.
    During inference, malicious requests produce high reconstruction errors
    because the model hasn't learned to reconstruct attack patterns.
    """
    def __init__(self, vocab_size: int, emb_dim: int, latent_dim: int, pad_id: int = 0):
        super().__init__()
        self.emb = nn.Embedding(vocab_size, emb_dim, padding_idx=pad_id)
        
        # Encoder - Conv1d layers
        self.enc_conv1 = nn.Conv1d(emb_dim, 128, 5, padding=2)
        self.enc_conv2 = nn.Conv1d(128, 128, 5, padding=2)
        self.enc_fc = nn.Linear(128, latent_dim)
        
        # Decoder - Conv1d layers
        self.dec_fc = nn.Linear(latent_dim, 128)
        self.dec_conv1 = nn.Conv1d(128, 128, 5, padding=2)
        self.dec_out = nn.Conv1d(128, vocab_size, 1)
    
    def forward(self, x):
        e = self.emb(x).transpose(1, 2)            
        h = torch.relu(self.enc_conv1(e))          
        h = torch.relu(self.enc_conv2(h))           
        h_pool = torch.max(h, dim=2).values         
        z = self.enc_fc(h_pool)                    
        
        d = torch.relu(self.dec_fc(z))              
        d = d.unsqueeze(2).repeat(1, 1, x.size(1))  
        d = torch.relu(self.dec_conv1(d))           
        logits = self.dec_out(d)                    
        return logits, z


# Model and vocabulary (loaded on startup)
ae_model = None
stoi = {}           
itos = []           
pad_id = 0
unk_id = 1
vocab_size = 0
max_len = 256
ae_emb = 64
ae_latent = 128

# Cross-entropy loss for computing reconstruction error
ce_tok = None


app = FastAPI(
    title="Zero-Day URL Attack Detection API",
    description="Character-level Autoencoder for detecting novel attacks",
    version="2.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request models - support both old proxy format and new format
class URLRequest(BaseModel):
    """Single URL prediction request"""
    url: str
    method: str = "GET"

class ProxyRequest(BaseModel):
    """Request format from proxy (raw_request wrapper)"""
    raw_request: dict

class PredictionResponse(BaseModel):
    """Prediction result for a single URL"""
    url: str
    classification: Literal["BENIGN", "SUSPICIOUS", "MALICIOUS"]
    is_malicious: bool
    score: float
    confidence: str

class ThresholdConfig(BaseModel):
    """Threshold configuration for tuning"""
    low_threshold: float = 3.80
    high_threshold: float = 4.90


def load_model():
    """Load model artifacts on startup."""
    global ae_model, stoi, itos, pad_id, unk_id, vocab_size, max_len, ae_emb, ae_latent, ce_tok
    
    logger.info("=" * 60)
    logger.info(" Loading Zero-Day Detection Model...")
    logger.info("=" * 60)
    
    # Load bundle configuration
    if not os.path.exists(BUNDLE_FILE):
        raise FileNotFoundError(f"Bundle file not found: {BUNDLE_FILE}")
    
    with open(BUNDLE_FILE, "r", encoding="utf-8") as f:
        bundle = json.load(f)
    
    max_len = int(bundle["HYB_MAX_LEN"])
    ae_emb = int(bundle["AE_EMB"])
    ae_latent = int(bundle["AE_LATENT"])
    original_threshold = float(bundle["AE_T2"])
    
    logger.info(f"   Max Length: {max_len}")
    logger.info(f"   Embedding Dim: {ae_emb}")
    logger.info(f"   Latent Dim: {ae_latent}")
    logger.info(f"   Original Threshold: {original_threshold:.4f}")
    
    # Load vocabulary
    with open(VOCAB_FILE, "r", encoding="utf-8") as f:
        vocab_data = json.load(f)
    
    itos = vocab_data["itos"]
    stoi = {ch: i for i, ch in enumerate(itos)}
    pad_id = stoi.get("<PAD>", 0)
    unk_id = stoi.get("<UNK>", 1)
    vocab_size = len(itos)
    
    logger.info(f"   Vocabulary Size: {vocab_size}")
    
    # Load model
    ae_model = CharAutoencoder(vocab_size, ae_emb, ae_latent, pad_id).to(DEVICE)
    ae_model.load_state_dict(torch.load(MODEL_FILE, map_location=DEVICE, weights_only=True))
    ae_model.eval()
    
    # Initialize cross-entropy loss
    ce_tok = nn.CrossEntropyLoss(ignore_index=pad_id, reduction="none")
    
    logger.info(f"   Device: {DEVICE}")
    logger.info("=" * 60)
    logger.info(" Model loaded successfully!")
    logger.info(f"   LOW_THRESHOLD (suspicious): {LOW_THRESHOLD}")
    logger.info(f"   HIGH_THRESHOLD (malicious): {HIGH_THRESHOLD}")
    logger.info("=" * 60)

@app.on_event("startup")
async def startup_event():
    """Load model when server starts."""
    load_model()


def encode_text(text: str) -> torch.Tensor:
    """Convert text to tensor of character indices."""
    text = "" if text is None else str(text)
    ids = [stoi.get(ch, unk_id) for ch in text[:max_len]]
    if len(ids) < max_len:
        ids += [pad_id] * (max_len - len(ids))
    return torch.tensor(ids, dtype=torch.long)

def build_text(url: str, method: str = "GET") -> str:
    """
    Build input text from URL and method.
    Format: METHOD={method} | PATH={path_query}
    
    Note: Domain is intentionally excluded to focus purely on attack patterns.
    This improves accuracy from 93.5% to 99.5%!
    """
    try:
        parsed = urlparse(url)
        path_query = parsed.path + ("?" + parsed.query if parsed.query else "")
    except:
        path_query = url
    
    return f"METHOD={method} | PATH={path_query}"

@torch.no_grad()
def compute_ae_score(text: str) -> float:
    """
    Compute the Autoencoder reconstruction error for a given text.
    
    Higher scores indicate more anomalous (potentially malicious) inputs.
    The score represents the average per-character reconstruction loss.
    """
    x_ids = encode_text(text).unsqueeze(0).to(DEVICE)
    logits, _ = ae_model(x_ids)
    loss_pos = ce_tok(logits, x_ids)
    mask = (x_ids != pad_id).float()
    denom = mask.sum(dim=1).clamp(min=1.0)
    score = ((loss_pos * mask).sum(dim=1) / denom).item()
    return float(score)

def classify_score(score: float) -> tuple[str, bool, str]:
    """
    Classify a score using two-stage thresholds.
    
    Returns: (classification, is_malicious, confidence)
    """
    if score >= HIGH_THRESHOLD:
        return "MALICIOUS", True, "HIGH"
    elif score >= LOW_THRESHOLD:
        return "SUSPICIOUS", True, "MEDIUM"
    else:
        return "BENIGN", False, "HIGH"

def score_to_probability(ae_score: float) -> float:
    """
    Convert autoencoder reconstruction score to a 0-1 probability for proxy compatibility.
    
    The proxy expects a score between 0 and 1 where higher = more malicious.
    We use a sigmoid-like mapping centered around the thresholds.
    """
    # Map AE scores to 0-1 range
    # - Score < 2.0 -> ~0.0-0.2 (clearly benign)
    # - Score 2.0-3.8 -> ~0.2-0.5 (probably benign)
    # - Score 3.8-4.9 -> ~0.5-0.85 (suspicious)
    # - Score > 4.9 -> ~0.85-1.0 (malicious)
    
    if ae_score < 2.0:
        return ae_score / 10.0  # 0-0.2
    elif ae_score < LOW_THRESHOLD:
        return 0.2 + (ae_score - 2.0) / (LOW_THRESHOLD - 2.0) * 0.3  # 0.2-0.5
    elif ae_score < HIGH_THRESHOLD:
        return 0.5 + (ae_score - LOW_THRESHOLD) / (HIGH_THRESHOLD - LOW_THRESHOLD) * 0.35  # 0.5-0.85
    else:
        return min(0.85 + (ae_score - HIGH_THRESHOLD) / 5.0 * 0.15, 1.0)  # 0.85-1.0

def predict_url(url: str, method: str = "GET") -> dict:
    """Make a prediction for a single URL."""
    text = build_text(url, method)
    ae_score = compute_ae_score(text)
    classification, is_malicious, confidence = classify_score(ae_score)
    prob_score = score_to_probability(ae_score)
    
    return {
        "url": url,
        "classification": classification,
        "is_malicious": is_malicious,
        "score": round(prob_score, 4),  # Proxy-compatible 0-1 score
        "ae_score": round(ae_score, 4),  # Original AE reconstruction error
        "confidence": confidence
    }


@app.get("/")
async def root():
    """API root - health check and info."""
    return {
        "name": "Zero-Day URL Attack Detection API",
        "version": "2.0.0",
        "status": "running",
        "model": "CharAutoencoder",
        "feature_format": "METHOD + PATH (no domain)",
        "thresholds": {
            "low (suspicious)": LOW_THRESHOLD,
            "high (malicious)": HIGH_THRESHOLD
        }
    }

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy" if ae_model is not None else "not_ready",
        "model_loaded": ae_model is not None,
        "model_type": "CharAutoencoder",
        "device": str(DEVICE),
        "vocab_size": vocab_size,
        "max_len": max_len
    }

@app.post("/predict")
async def predict(request: ProxyRequest):
    """
    Predict if a request is malicious.
    
    Supports the proxy's raw_request format for backwards compatibility.
    Returns a score between 0 and 1 for proxy threshold comparison.
    """
    raw = request.raw_request
    url = raw.get("url", "/")
    method = raw.get("method", "GET")
    
    result = predict_url(url, method)
    
    # Return proxy-compatible format
    return {"score": result["score"]}

@app.post("/predict/url", response_model=PredictionResponse)
async def predict_single(request: URLRequest):
    """
    Predict if a single URL is malicious.
    
    **Example Request:**
    ```json
    {
        "url": "https://example.com/search?q=test",
        "method": "GET"
    }
    ```
    """
    result = predict_url(request.url, request.method)
    return PredictionResponse(**result)

@app.get("/config")
async def get_config():
    """Get current threshold configuration."""
    return {
        "low_threshold": LOW_THRESHOLD,
        "high_threshold": HIGH_THRESHOLD,
        "description": {
            "BENIGN": f"ae_score < {LOW_THRESHOLD}",
            "SUSPICIOUS": f"{LOW_THRESHOLD} <= ae_score < {HIGH_THRESHOLD}",
            "MALICIOUS": f"ae_score >= {HIGH_THRESHOLD}"
        }
    }

@app.post("/config")
async def update_config(config: ThresholdConfig):
    """
    Update threshold configuration on the fly.
    
    Use this to tune sensitivity without restarting the server.
    """
    global LOW_THRESHOLD, HIGH_THRESHOLD
    LOW_THRESHOLD = config.low_threshold
    HIGH_THRESHOLD = config.high_threshold
    
    return {
        "status": "updated",
        "low_threshold": LOW_THRESHOLD,
        "high_threshold": HIGH_THRESHOLD
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9000)
