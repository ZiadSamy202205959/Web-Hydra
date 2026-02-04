from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging
import joblib
import pandas as pd
import os
import sys

# Import feature extractor
try:
    from feature_extractor import extract_features
except ImportError:
    # Fallback if running from root or elsewhere, though usually runs from inside ml_service
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from feature_extractor import extract_features

app = FastAPI()

# Logging config
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ml_service")

class PredictRequest(BaseModel):
    raw_request: dict 

MODEL_PATH = "ml_model.joblib"
# ENCODERS_PATH is no longer needed for text fields

model = None

try:
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        logger.info(f"Loaded model from {MODEL_PATH}")
    else:
        logger.warning(f"Model not found at {MODEL_PATH}")

except Exception as e:
    logger.error(f"Failed to load model: {e}")

@app.post("/predict")
async def predict(req: PredictRequest):
    data = req.raw_request
    
    if model:
        try:
            # 1. Prepare DataFrame row (matching feature_extractor expectations)
            # Expects: ['Method', 'User-Agent', 'Accept', 'host', 'cookie', 'content-type', 'lenght', 'content', 'URL']
            
            input_dict = {
                'Method': data.get('method', 'GET'),
                'User-Agent': data.get('user_agent', ''),
                'Accept': data.get('accept', '*/*'),
                'host': data.get('host', 'localhost'),
                'cookie': data.get('cookie', ''),
                'content-type': data.get('content_type', ''),
                'lenght': int(data.get('content_length', 0)), 
                'content': data.get('body', ''),
                'URL': data.get('url', '/')  
            }
            
            df_input = pd.DataFrame([input_dict])

            # 2. Extract Features
            X = extract_features(df_input)
            
            # 3. Predict
            # predict_proba returns [prob_class_0, prob_class_1]
            score = float(model.predict_proba(X)[0][1]) 
            return {"score": score}

        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return {"score": 0.5, "error": str(e)}

    # Fallback
    return {"score": 0.0, "reason": "model_not_loaded"}

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}
